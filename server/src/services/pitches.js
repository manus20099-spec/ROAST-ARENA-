import { generateAllRoasts } from '../ai/roastPipeline.js';
import { checkPitchSanity } from '../ai/sanity.js';
import { INVESTOR_KEYS, PITCH_RULES } from '../lib/constants.js';
import { AppError, badRequest, conflict, notFound } from '../lib/errors.js';
import { findBlockedTerm } from '../lib/moderation.js';
import { assertCanRepitch, assertCanSubmitPitch } from '../lib/rules.js';
import { Idea } from '../models/Idea.js';
import { Pitch } from '../models/Pitch.js';
import { Roast } from '../models/Roast.js';
import { emitToIdea, emitToUser } from '../realtime.js';
import { recomputeAndNotify } from './ideaScore.js';
import { notify } from './notifications.js';

const inFlight = new Set(); // pitch ids currently being roasted by this process

function assertCleanText(...texts) {
  const term = findBlockedTerm(...texts);
  if (term) {
    throw badRequest(
      'Your pitch contains language we do not allow. Please rewrite it and try again.',
      'BLOCKED_LANGUAGE'
    );
  }
}

async function submissionCounts(founderId) {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [pendingCount, pitchesLastHour] = await Promise.all([
    Pitch.countDocuments({ founder: founderId, status: 'pending' }),
    Pitch.countDocuments({ founder: founderId, createdAt: { $gte: hourAgo } }),
  ]);
  return { pendingCount, pitchesLastHour };
}

/** Run the roast job in the background; the HTTP request returns immediately. */
export function startRoasting(pitchId, options = {}) {
  setImmediate(() => {
    processPitch(pitchId, options).catch((err) =>
      console.error(`[pitch ${pitchId}] roasting failed:`, err.message)
    );
  });
}

/** Create a brand-new Idea together with its first Pitch (v1). */
export async function createIdea({ founderId, title, tags, problem, solution, customer, roastLevel }) {
  assertCleanText(title, problem, solution, customer);
  assertCanSubmitPitch(await submissionCounts(founderId));

  const idea = await Idea.create({
    founder: founderId,
    title,
    tags,
    pitchCount: 1,
    previewProblem: problem,
  });

  try {
    const pitch = await Pitch.create({
      idea: idea._id,
      founder: founderId,
      version: 1,
      problem,
      solution,
      customer,
      roastLevel,
    });
    startRoasting(pitch._id);
    return { idea, pitch };
  } catch (err) {
    await Idea.deleteOne({ _id: idea._id }); // do not leave an idea with no pitch
    throw err;
  }
}

/** Re-pitch: add the next Pitch to an existing Idea. */
export async function addPitch({ ideaId, userId, problem, solution, customer, roastLevel }) {
  assertCleanText(problem, solution, customer);

  const existing = await Idea.findById(ideaId);
  assertCanRepitch({ idea: existing, userId, ...(await submissionCounts(userId)) });

  // Atomic: two simultaneous re-pitches cannot both take the same version number.
  const idea = await Idea.findOneAndUpdate(
    { _id: ideaId, founder: userId, deletedAt: null, pitchCount: { $lt: PITCH_RULES.maxPitchesPerIdea } },
    { $inc: { pitchCount: 1 }, $set: { previewProblem: problem } },
    { new: true }
  );
  if (!idea) throw conflict('This idea can no longer accept a new pitch.', 'PITCH_LIMIT');

  try {
    const pitch = await Pitch.create({
      idea: idea._id,
      founder: userId,
      version: idea.pitchCount,
      problem,
      solution,
      customer,
      roastLevel,
    });
    startRoasting(pitch._id);
    return { idea, pitch };
  } catch (err) {
    await Idea.updateOne({ _id: idea._id }, { $inc: { pitchCount: -1 } });
    if (err?.code === 11000) throw conflict('Another pitch was just submitted. Try again.', 'PITCH_RACE');
    throw err;
  }
}

/**
 * Produce the missing Roasts for a Pitch, then complete it.
 * Safe to run twice: Roasts are unique per (pitch, investor), and only missing
 * Investors are asked, so a restart resumes instead of starting over.
 */
export async function processPitch(pitchId, options = {}) {
  const id = String(pitchId);
  if (inFlight.has(id)) return null;
  inFlight.add(id);

  try {
    const pitch = await Pitch.findById(pitchId).lean();
    if (!pitch || pitch.status === 'complete') return pitch;

    const done = await Roast.find({ pitch: pitchId }).select('investor').lean();
    const have = new Set(done.map((r) => r.investor));
    const missing = INVESTOR_KEYS.filter((k) => !have.has(k));

    await generateAllRoasts({
      pitch,
      investors: missing,
      ...options,
      onRoast: async (result) => {
        try {
          const { investor, ...fields } = result;
          const saved = await Roast.create({ pitch: pitch._id, idea: pitch.idea, investor, ...fields });
          emitToUser(String(pitch.founder), 'roast:created', {
            pitchId: id,
            ideaId: String(pitch.idea),
            roast: saved.toObject(),
          });
        } catch (err) {
          if (err?.code !== 11000) throw err; // already saved by an earlier run
        }
      },
    });

    const roasts = await Roast.find({ pitch: pitchId }).lean();
    if (roasts.length < INVESTOR_KEYS.length) {
      throw new AppError(500, 'Roasts are still missing for this pitch.', 'ROASTS_INCOMPLETE');
    }

    const aiAverage = roasts.reduce((sum, r) => sum + r.score, 0) / roasts.length;
    const { flagged, reason } = checkPitchSanity(pitch, roasts);

    await Pitch.updateOne(
      { _id: pitchId },
      {
        $set: {
          status: 'complete',
          completedAt: new Date(),
          aiAverage: Math.round(aiAverage * 100) / 100,
          flagged,
          flagReason: reason,
        },
      }
    );

    if (flagged) {
      const idea = await Idea.findById(pitch.idea).select('title').lean();
      await notify({
        user: pitch.founder,
        type: 'pitch_flagged',
        idea: pitch.idea,
        data: { title: idea?.title ?? '', version: pitch.version, reason },
      });
    }

    await recomputeAndNotify(pitch.idea);

    emitToUser(String(pitch.founder), 'pitch:complete', {
      pitchId: id,
      ideaId: String(pitch.idea),
      flagged,
    });
    emitToIdea(String(pitch.idea), 'idea:updated', { ideaId: String(pitch.idea) });

    return Pitch.findById(pitchId).lean();
  } finally {
    inFlight.delete(id);
  }
}

/**
 * After a restart (or a crash), finish pitches that were left pending.
 * `olderThanMs = 0` at boot picks up everything; the periodic check uses 2 minutes.
 */
export async function recoverPendingPitches({ olderThanMs = 0, options = {} } = {}) {
  const cutoff = new Date(Date.now() - olderThanMs);
  const stuck = await Pitch.find({ status: 'pending', createdAt: { $lte: cutoff } })
    .select('_id')
    .lean();
  for (const { _id } of stuck) startRoasting(_id, options);
  return stuck.length;
}

export async function getPitchForViewer(pitchId, viewerId) {
  const pitch = await Pitch.findById(pitchId).lean();
  if (!pitch) throw notFound('Pitch not found.');
  const idea = await Idea.findById(pitch.idea).lean();
  if (!idea || idea.deletedAt) throw notFound('Pitch not found.');

  const isFounder = viewerId && String(pitch.founder) === String(viewerId);
  // Pending and flagged pitches are visible to their founder only.
  if (!isFounder && (pitch.status !== 'complete' || pitch.flagged)) throw notFound('Pitch not found.');

  const roasts = await Roast.find({ pitch: pitchId }).lean();
  roasts.sort((a, b) => INVESTOR_KEYS.indexOf(a.investor) - INVESTOR_KEYS.indexOf(b.investor));
  return { pitch, roasts, idea };
}
