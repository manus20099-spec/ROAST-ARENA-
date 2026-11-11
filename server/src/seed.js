import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { checkPitchSanity } from './ai/sanity.js';
import { config } from './config.js';
import { computeScore, pickRankedPitch, voteEligibleAt } from './lib/rules.js';
import { Comment } from './models/Comment.js';
import { Idea } from './models/Idea.js';
import { Notification } from './models/Notification.js';
import { Pitch } from './models/Pitch.js';
import { Report } from './models/Report.js';
import { Roast } from './models/Roast.js';
import { User } from './models/User.js';
import { Vote } from './models/Vote.js';

export async function seed({ disconnect = true } = {}) {
  if (mongoose.connection.readyState === 0) {
    console.log('[seed] Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
  }

  console.log('[seed] Dropping existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Idea.deleteMany({}),
    Pitch.deleteMany({}),
    Roast.deleteMany({}),
    Vote.deleteMany({}),
    Comment.deleteMany({}),
    Notification.deleteMany({}),
    Report.deleteMany({}),
  ]);

  console.log('[seed] Creating 6 seed users (older than 1 hour)...');
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const passwordHash = await bcrypt.hash('Test1234!', 10);

  const usersData = [
    { email: 'ali@example.com', displayName: 'Ali_Founder', bio: 'CS student building consumer apps.' },
    { email: 'sara@example.com', displayName: 'Sara_Founder', bio: 'HealthTech & EdTech enthusiast.' },
    { email: 'hamza@example.com', displayName: 'Hamza_Founder', bio: 'AgriTech and hardware hacker.' },
    { email: 'zara@example.com', displayName: 'Zara_Investor', bio: 'Angel scout looking for bold ideas.' },
    { email: 'bilal@example.com', displayName: 'Bilal_Voter', bio: 'Final year software engineering student.' },
    { email: 'maryam@example.com', displayName: 'Maryam_Voter', bio: 'Designer & product reviewer.' },
  ];

  const users = {};
  for (const u of usersData) {
    const user = await User.create({
      email: u.email,
      passwordHash,
      displayName: u.displayName,
      bio: u.bio,
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
    });
    users[u.displayName] = user;
  }

  console.log('[seed] Creating 6 ideas and versioned pitches...');

  // Ideas definitions
  const seedIdeas = [
    {
      key: 'CampusEats',
      founder: users.Ali_Founder,
      title: 'CampusEats',
      tags: ['E-commerce', 'AI/ML'],
      pitches: [
        {
          version: 1,
          roastLevel: 'spicy',
          problem: 'Students waste 40 minutes queuing up for lunch during short 15-minute lecture breaks across 4 campus canteens.',
          solution: 'A peer-to-peer pre-order network where students walking to canteens pick up and deliver meals to lecture halls.',
          customer: 'University students and faculty across major urban university campuses in Lahore and Karachi.',
          roasts: [
            {
              investor: 'strict',
              score: 5,
              roast: 'Canteen food margins are wafer-thin, and your student couriers will vanish during exam weeks.',
              tip: 'Charge canteens a monthly SaaS fee instead of taking a cut from students.',
              offer: { amountLakh: 5, equityPercent: 20 },
            },
            {
              investor: 'funny',
              score: 6,
              roast: 'Ah, turning students into delivery riders between calculus classes. What could possibly go wrong with spilled chai?',
              tip: 'Limit delivery to dry snacks first before soups and biryani ruin someone’s laptop.',
              offer: { amountLakh: 8, equityPercent: 15 },
            },
            {
              investor: 'dreamer',
              score: 7,
              roast: 'Hyper-local logistics inside private campuses is an untouched goldmine with captive density.',
              tip: 'Expand from food to textbooks, stationery, and lab equipment on-demand.',
              offer: { amountLakh: 15, equityPercent: 12 },
            },
          ],
        },
        {
          version: 2,
          roastLevel: 'spicy',
          problem: 'Peak-hour canteen queues create 45-minute bottlenecks, leaving 2,000 students hungry per campus daily.',
          solution: 'Campus locker pickup pods integrated with canteens; batch orders delivered every 15 minutes with automated PINs.',
          customer: 'Over 50,000 commuter university students across 8 universities in Pakistan.',
          roasts: [
            {
              investor: 'strict',
              score: 8,
              roast: 'Lockers eliminate courier chaos. Now we are talking about dependable unit economics and real turnover.',
              tip: 'Secure exclusive contracts with campus administration for locker real estate.',
              offer: { amountLakh: 25, equityPercent: 12 },
            },
            {
              investor: 'funny',
              score: 8,
              roast: 'Lockers for biryani! Finally, technology solving real Pakistani student priorities.',
              tip: 'Add heating elements to the lockers or prepare for lukewarm samosa complaints.',
              offer: { amountLakh: 20, equityPercent: 10 },
            },
            {
              investor: 'dreamer',
              score: 9,
              roast: 'This transforms campus micro-hubs into smart logistics pods that Amazon would envy.',
              tip: 'Partner with multinational beverage brands to sponsor temperature-controlled pods.',
              offer: { amountLakh: 35, equityPercent: 8 },
            },
          ],
        },
      ],
    },
    {
      key: 'StudySync',
      founder: users.Ali_Founder,
      title: 'StudySync',
      tags: ['EdTech', 'AI/ML'],
      pitches: [
        {
          version: 1,
          roastLevel: 'medium',
          problem: 'Students struggle finding study partners who match their learning pace and course syllabus requirements.',
          solution: 'An AI-powered matchmaking platform that groups students based on course grades, study habits, and free schedules.',
          customer: 'Undergraduate STEM students who study in groups and need peer accountability.',
          roasts: [
            {
              investor: 'strict',
              score: 6,
              roast: 'Free WhatsApp groups already exist. Why will broke students pay for matchmaking?',
              tip: 'Monetize through verified peer tutors rather than generic matching.',
              offer: { amountLakh: 7, equityPercent: 18 },
            },
            {
              investor: 'funny',
              score: 7,
              roast: 'Tinder for nerds studying organic chemistry. Just admit 80% of matches will end in procrastination.',
              tip: 'Add a timer that locks student phones until practice problems are solved.',
              offer: { amountLakh: 10, equityPercent: 15 },
            },
            {
              investor: 'dreamer',
              score: 8,
              roast: 'Decentralized peer-to-peer university learning communities can disrupt private academies.',
              tip: 'Incorporate collaborative note synthesis using open source LLMs.',
              offer: { amountLakh: 18, equityPercent: 10 },
            },
          ],
        },
      ],
    },
    {
      key: 'MedConnect',
      founder: users.Sara_Founder,
      title: 'MedConnect',
      tags: ['HealthTech'],
      pitches: [
        {
          version: 1,
          roastLevel: 'mild',
          problem: 'Rural clinics lack specialist doctors, forcing low-income families to travel 100+ km for basic consultations.',
          solution: 'Low-bandwidth telemedicine kiosk software allowing village pharmacists to connect patients directly to urban specialists.',
          customer: 'Semi-urban and rural pharmacies serving over 40 million underserved citizens.',
          roasts: [
            {
              investor: 'strict',
              score: 9,
              roast: 'Crucial market need with strong distribution leverage through existing local pharmacies.',
              tip: 'Ensure strict compliance with medical licensing and pharmacy commission structures.',
              offer: { amountLakh: 35, equityPercent: 15 },
            },
            {
              investor: 'funny',
              score: 8,
              roast: 'No jokes here; if this keeps patients away from unqualified quacks, it deserves every rupee.',
              tip: 'Add voice notes in regional dialects like Punjabi and Sindhi for prescriptions.',
              offer: { amountLakh: 25, equityPercent: 12 },
            },
            {
              investor: 'dreamer',
              score: 9,
              roast: 'The definitive blueprint for primary healthcare access across South Asia and emerging markets.',
              tip: 'Integrate drone delivery for essential prescription medications to rural kiosks.',
              offer: { amountLakh: 45, equityPercent: 10 },
            },
          ],
        },
      ],
    },
    {
      key: 'CropGuard',
      founder: users.Hamza_Founder,
      title: 'CropGuard',
      tags: ['AgriTech', 'AI/ML'],
      pitches: [
        {
          version: 1,
          roastLevel: 'spicy',
          problem: 'Smallholder farmers lose up to 35% of cotton crop yields each season due to late detection of pest infestations.',
          solution: 'Offline-capable mobile computer vision app that identifies crop diseases from leaf photos and prescribes local remedies.',
          customer: '5 million smallholder farmers across Punjab and Sindh farming cash crops.',
          roasts: [
            {
              investor: 'strict',
              score: 7,
              roast: 'Farmers do not pay for apps. Your only real customer is pesticide and fertilizer companies.',
              tip: 'Charge pesticide distributors for verified pest outbreak analytics.',
              offer: { amountLakh: 15, equityPercent: 16 },
            },
            {
              investor: 'funny',
              score: 7,
              roast: 'Taking selfies with sick cotton plants in 45-degree heat. Better make sure the app works with greasy fingers.',
              tip: 'Build an Urdu audio interface because reading text on sun-glared screens is impossible.',
              offer: { amountLakh: 12, equityPercent: 15 },
            },
            {
              investor: 'dreamer',
              score: 9,
              roast: 'Agricultural food security is the greatest existential challenge. Computer vision at the edge is the answer.',
              tip: 'Partner with satellite imagery providers to warn entire districts before swarms spread.',
              offer: { amountLakh: 30, equityPercent: 10 },
            },
          ],
        },
      ],
    },
    {
      key: 'SkillBridge',
      founder: users.Sara_Founder,
      title: 'SkillBridge',
      tags: ['EdTech', 'E-commerce'],
      pitches: [
        {
          version: 1,
          roastLevel: 'medium',
          problem: 'University graduates graduate with theoretical knowledge and zero portfolio projects, leading to 40% youth underemployment.',
          solution: 'Micro-internship platform where SMEs post paid 1-week deliverables and hire top-rated student contributors directly.',
          customer: 'Early-stage local startups and 500,000 university students looking for their first career break.',
          roasts: [
            {
              investor: 'strict',
              score: 7,
              roast: 'SMEs will try to exploit students for free labor unless you escrow payments upfront.',
              tip: 'Require 100% upfront escrow deposit before students start work on any micro-task.',
              offer: { amountLakh: 14, equityPercent: 14 },
            },
            {
              investor: 'funny',
              score: 8,
              roast: 'A 1-week internship? That is barely enough time to figure out where the office coffee machine is.',
              tip: 'Standardize project templates (e.g., Figma audit, Python scraper) so students deliver fast.',
              offer: { amountLakh: 18, equityPercent: 12 },
            },
            {
              investor: 'dreamer',
              score: 8,
              roast: 'Replacing obsolete 4-year degree requirements with proof-of-work reputation scores.',
              tip: 'Issue on-chain verified credential badges for each completed deliverable.',
              offer: { amountLakh: 22, equityPercent: 10 },
            },
          ],
        },
      ],
    },
    {
      key: 'PayEasy',
      founder: users.Hamza_Founder,
      title: 'PayEasy',
      tags: ['FinTech'],
      pitches: [
        {
          version: 1,
          roastLevel: 'mild',
          problem: 'Campus vendors refuse debit cards due to high POS terminal fees, while cash change shortages delay lines.',
          solution: 'Zero-fee QR soundbox payments connected directly to Raast instant bank transfers for campus vendors.',
          customer: 'Campus cafeterias, print shops, and stationery stores across 100+ colleges.',
          roasts: [
            {
              investor: 'strict',
              score: 8,
              roast: 'Raast penetration is accelerating rapidly, and merchant QR adoption is prime for disruption.',
              tip: 'Monetize through micro-working-capital loans based on transaction history.',
              offer: { amountLakh: 28, equityPercent: 15 },
            },
            {
              investor: 'funny',
              score: 7,
              roast: 'Those audio soundboxes shouting "Fifty Rupees Received!" will drown out professor lectures.',
              tip: 'Add a mute button during exam hours before deans ban your hardware.',
              offer: { amountLakh: 16, equityPercent: 12 },
            },
            {
              investor: 'dreamer',
              score: 8,
              roast: 'Cashless campuses today, complete student neo-banking tomorrow.',
              tip: 'Issue student virtual debit cards with built-in cashback discounts at campus vendors.',
              offer: { amountLakh: 30, equityPercent: 10 },
            },
          ],
        },
      ],
    },
  ];

  const createdIdeas = [];

  for (const ideaDef of seedIdeas) {
    const idea = await Idea.create({
      founder: ideaDef.founder._id,
      title: ideaDef.title,
      tags: ideaDef.tags,
      pitchCount: ideaDef.pitches.length,
      previewProblem: ideaDef.pitches[ideaDef.pitches.length - 1].problem,
    });

    const pitches = [];
    for (const pitchDef of ideaDef.pitches) {
      const pitch = await Pitch.create({
        idea: idea._id,
        founder: ideaDef.founder._id,
        version: pitchDef.version,
        problem: pitchDef.problem,
        solution: pitchDef.solution,
        customer: pitchDef.customer,
        roastLevel: pitchDef.roastLevel,
        status: 'complete',
        completedAt: new Date(Date.now() - 30 * 60 * 1000),
      });

      // Roasts
      const roastDocs = [];
      for (const r of pitchDef.roasts) {
        const roast = await Roast.create({
          pitch: pitch._id,
          idea: idea._id,
          investor: r.investor,
          score: r.score,
          roast: r.roast,
          tip: r.tip,
          offer: r.offer,
          source: 'seed',
          attempts: 1,
        });
        roastDocs.push(roast);
      }

      const aiAvg = roastDocs.reduce((sum, r) => sum + r.score, 0) / roastDocs.length;
      const { flagged, reason } = checkPitchSanity(pitch, roastDocs);

      pitch.aiAverage = Math.round(aiAvg * 100) / 100;
      pitch.flagged = flagged;
      pitch.flagReason = reason;
      await pitch.save();

      pitches.push(pitch);
    }

    // Rank pitch & score
    const ranked = pickRankedPitch(pitches);
    if (ranked) {
      idea.rankedPitch = ranked._id;
      idea.rankedAt = ranked.completedAt;
      idea.aiScore = ranked.aiAverage;
      idea.score = computeScore({ aiAverage: ranked.aiAverage, eligibleVotes: 0 });
    }
    await idea.save();
    createdIdeas.push(idea);
  }

  console.log('[seed] Creating votes from eligible voters...');
  const voters = [users.Zara_Investor, users.Bilal_Voter, users.Maryam_Voter];

  for (const idea of createdIdeas) {
    for (const voter of voters) {
      if (String(idea.founder) !== String(voter._id)) {
        await Vote.create({
          idea: idea._id,
          user: voter._id,
          eligibleAt: voteEligibleAt(voter.createdAt),
          createdAt: twoHoursAgo,
        });
      }
    }

    // Update vote stats & score
    const now = new Date();
    const [voteCount, eligibleVotes] = await Promise.all([
      Vote.countDocuments({ idea: idea._id }),
      Vote.countDocuments({ idea: idea._id, eligibleAt: { $lte: now } }),
    ]);

    idea.voteCount = voteCount;
    idea.eligibleVoteCount = eligibleVotes;
    if (idea.aiScore != null) {
      idea.score = computeScore({ aiAverage: idea.aiScore, eligibleVotes });
    }
    await idea.save();
  }

  console.log('[seed] Adding comments...');
  const sampleComments = [
    { author: users.Zara_Investor, body: 'Solid unit economics here. Would love to see the prototype in action!' },
    { author: users.Bilal_Voter, body: 'As a student, I would use this every single day on our campus.' },
    { author: users.Maryam_Voter, body: 'The user flow is super clean. Looking forward to the beta release!' },
  ];

  for (const idea of createdIdeas) {
    for (const c of sampleComments) {
      if (String(idea.founder) !== String(c.author._id)) {
        await Comment.create({
          idea: idea._id,
          author: c.author._id,
          body: c.body,
        });
      }
    }
    const count = await Comment.countDocuments({ idea: idea._id, deletedAt: null, hiddenBy: null });
    idea.commentCount = count;
    await idea.save();
  }

  console.log('\n=========================================');
  console.log('✅ SEED COMPLETED SUCCESSFULLY!');
  console.log('=========================================');
  console.log('Seed summary:');
  console.log(`- Users: ${Object.keys(users).length}`);
  console.log(`- Ideas: ${createdIdeas.length}`);
  console.log('- Total pitches: 7 (CampusEats has v1 + v2 re-pitch)');
  console.log('- All roasts set with source="seed"');
  console.log('- Community votes & comments created & score computed');
  console.log('=========================================\n');

  if (disconnect) {
    await mongoose.disconnect();
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed({ disconnect: true }).catch((err) => {
    console.error('[seed] Fatal error:', err);
    process.exit(1);
  });
}
