import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { Comment } from '../../src/models/Comment.js';
import { Idea } from '../../src/models/Idea.js';
import { Pitch } from '../../src/models/Pitch.js';
import { Roast } from '../../src/models/Roast.js';
import { User } from '../../src/models/User.js';
import { Vote } from '../../src/models/Vote.js';
import { signToken } from '../../src/services/users.js';

describe('Ideas & Pitches API (/api/ideas)', () => {
  let founder;
  let voter;
  let founderCookie;
  let voterCookie;

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Idea.deleteMany({}),
      Pitch.deleteMany({}),
      Roast.deleteMany({}),
      Vote.deleteMany({}),
      Comment.deleteMany({}),
    ]);

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const passwordHash = await bcrypt.hash('Test1234!', 10);

    founder = await User.create({
      email: 'founder@test.com',
      passwordHash,
      displayName: 'FounderOne',
      createdAt: twoHoursAgo,
    });

    voter = await User.create({
      email: 'voter@test.com',
      passwordHash,
      displayName: 'VoterOne',
      createdAt: twoHoursAgo,
    });

    founderCookie = `token=${signToken(founder._id)}`;
    voterCookie = `token=${signToken(voter._id)}`;
  });

  it('POST /api/ideas without auth returns 401', async () => {
    await request(app)
      .post('/api/ideas')
      .send({
        title: 'New Idea',
        tags: ['EdTech'],
        problem: 'This is a sufficiently long problem description.',
        solution: 'This is a sufficiently long solution description.',
        customer: 'University students and faculty.',
        roastLevel: 'spicy',
      })
      .expect(401);
  });

  it('POST /api/ideas with valid data returns 202 and pending Pitch', async () => {
    const res = await request(app)
      .post('/api/ideas')
      .set('Cookie', founderCookie)
      .send({
        title: 'Campus Laundry',
        tags: ['E-commerce'],
        problem: 'Students have no clean clothes during exams due to overloaded machines.',
        solution: 'A scheduled pickup and wash fold service managed by students on campus.',
        customer: 'Hostel residents and commuter college students.',
        roastLevel: 'spicy',
      })
      .expect(202);

    expect(res.body.idea).toBeDefined();
    expect(res.body.pitch).toBeDefined();
    expect(res.body.pitch.status).toBe('pending');
    expect(res.body.pitch.version).toBe(1);
  });

  it('rejects blocked language in title with 400 BLOCKED_LANGUAGE', async () => {
    const res = await request(app)
      .post('/api/ideas')
      .set('Cookie', founderCookie)
      .send({
        title: 'This is a bitch title for testing',
        tags: ['EdTech'],
        problem: 'A totally valid problem description of sufficient length.',
        solution: 'A totally valid solution description of sufficient length.',
        customer: 'Target customer segment description.',
        roastLevel: 'mild',
      })
      .expect(400);

    expect(res.body.error.code).toBe('BLOCKED_LANGUAGE');
  });

  it('cannot re-pitch while a pitch is pending (409 PITCH_PENDING)', async () => {
    const postRes = await request(app)
      .post('/api/ideas')
      .set('Cookie', founderCookie)
      .send({
        title: 'Pending Idea',
        tags: ['AgriTech'],
        problem: 'A sufficiently long problem statement for agricultural farmers.',
        solution: 'A sufficiently long solution statement for agricultural farmers.',
        customer: 'Rural smallholder farming families.',
        roastLevel: 'medium',
      })
      .expect(202);

    const ideaId = postRes.body.idea.id;

    // Immediately try to re-pitch while the first one is still pending
    const repitchRes = await request(app)
      .post(`/api/ideas/${ideaId}/pitches`)
      .set('Cookie', founderCookie)
      .send({
        problem: 'An improved problem statement for agricultural farmers.',
        solution: 'An improved solution statement for agricultural farmers.',
        customer: 'Rural smallholder farming families.',
        roastLevel: 'spicy',
      });

    expect(repitchRes.status).toBe(409);
    expect(repitchRes.body.error.code).toBe('PITCH_PENDING');
  });

  describe('Voting rules', () => {
    it('founder cannot vote on own idea (403)', async () => {
      const idea = await Idea.create({
        founder: founder._id,
        title: 'Own Idea',
        pitchCount: 1,
        rankedPitch: '507f1f77bcf86cd799439011',
      });

      const res = await request(app)
        .post(`/api/ideas/${idea._id}/vote`)
        .set('Cookie', founderCookie)
        .expect(403);

      expect(res.body.error.message).toMatch(/cannot vote on your own/i);
    });

    it('cannot vote on idea with no ranked pitch (400 NOT_VOTABLE)', async () => {
      const idea = await Idea.create({
        founder: founder._id,
        title: 'Unranked Idea',
        pitchCount: 1,
        rankedPitch: null, // No ranked pitch yet!
      });

      const res = await request(app)
        .post(`/api/ideas/${idea._id}/vote`)
        .set('Cookie', voterCookie)
        .expect(400);

      expect(res.body.error.code).toBe('NOT_VOTABLE');
    });

    it('toggles vote on and off for eligible voter', async () => {
      // Create pitch & roasts
      const pitch = await Pitch.create({
        idea: null,
        founder: founder._id,
        version: 1,
        problem: 'Test problem description with minimum length requirements.',
        solution: 'Test solution description with minimum length requirements.',
        customer: 'Test customer description with minimum length.',
        roastLevel: 'mild',
        status: 'complete',
        completedAt: new Date(),
        aiAverage: 8,
      });

      const idea = await Idea.create({
        founder: founder._id,
        title: 'Votable Idea',
        pitchCount: 1,
        rankedPitch: pitch._id,
        rankedAt: pitch.completedAt,
        aiScore: 8,
        score: 48,
      });

      pitch.idea = idea._id;
      await pitch.save();

      // Vote ON
      const voteOnRes = await request(app)
        .post(`/api/ideas/${idea._id}/vote`)
        .set('Cookie', voterCookie)
        .expect(200);

      expect(voteOnRes.body.voted).toBe(true);
      expect(voteOnRes.body.voteCount).toBe(1);

      // Vote OFF (toggle)
      const voteOffRes = await request(app)
        .post(`/api/ideas/${idea._id}/vote`)
        .set('Cookie', voterCookie)
        .expect(200);

      expect(voteOffRes.body.voted).toBe(false);
      expect(voteOffRes.body.voteCount).toBe(0);
    });
  });

  describe('Soft Delete & Visibility', () => {
    it('soft deletes idea and excludes from get detail', async () => {
      const idea = await Idea.create({
        founder: founder._id,
        title: 'Deletable Idea',
        pitchCount: 1,
      });

      await request(app)
        .delete(`/api/ideas/${idea._id}`)
        .set('Cookie', founderCookie)
        .expect(200);

      const deleted = await Idea.findById(idea._id);
      expect(deleted.deletedAt).not.toBeNull();

      // Subsequent fetch should return 404
      await request(app).get(`/api/ideas/${idea._id}`).expect(404);
    });

    it('flagged pitch is hidden from non-founder viewer (404)', async () => {
      const idea = await Idea.create({
        founder: founder._id,
        title: 'Flagged Pitch Idea',
        pitchCount: 1,
      });

      const pitch = await Pitch.create({
        idea: idea._id,
        founder: founder._id,
        version: 1,
        problem: 'A suspicious pitch text with minimum characters.',
        solution: 'A suspicious solution text with minimum characters.',
        customer: 'A suspicious customer text with minimum characters.',
        roastLevel: 'spicy',
        status: 'complete',
        flagged: true,
        flagReason: 'Suspiciously high scores on thin pitch.',
      });

      // Voter (non-founder) tries to fetch this pitch
      await request(app)
        .get(`/api/ideas/${idea._id}/pitches/${pitch._id}`)
        .set('Cookie', voterCookie)
        .expect(404);

      // Founder can fetch it
      const founderRes = await request(app)
        .get(`/api/ideas/${idea._id}/pitches/${pitch._id}`)
        .set('Cookie', founderCookie)
        .expect(200);

      expect(founderRes.body.pitch.flagged).toBe(true);
    });
  });
});
