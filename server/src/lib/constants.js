// Every rule number in the app lives here, so tuning never means hunting through code.

export const ROAST_LEVELS = ['mild', 'medium', 'spicy'];

export const TAGS = [
  'EdTech',
  'FinTech',
  'HealthTech',
  'AI/ML',
  'E-commerce',
  'Social',
  'Gaming',
  'AgriTech',
  'Other',
];
export const MAX_TAGS_PER_IDEA = 3;

export const INVESTOR_KEYS = ['strict', 'funny', 'dreamer'];

export const INVESTORS = {
  strict: {
    key: 'strict',
    name: 'Seth Sahab',
    title: 'The Strict Investor',
    emoji: '🧐',
    focus: 'money and the market',
    rubric:
      'Score on market size, a believable way to make money, and whether customers would really pay. Always ask one hard question the pitch does not answer.',
    style:
      'Stern and numbers-driven, like an old-school businessman who has seen a thousand pitches. Talks about margins, customers, and cash.',
  },
  funny: {
    key: 'funny',
    name: 'Bhai Jaan Comedian',
    title: 'The Funny Investor',
    emoji: '😂',
    focus: 'jokes with one real point',
    rubric:
      'Score on originality and how memorable the idea is. Roast the idea with jokes, but include exactly one genuinely useful point.',
    style:
      'A stand-up comedian who happens to hold a chequebook. Jokes target the IDEA only, never the person.',
  },
  dreamer: {
    key: 'dreamer',
    name: 'Visionary Aapa',
    title: 'The Dreamer',
    emoji: '🌈',
    focus: 'the big vision',
    rubric:
      'Score on scalability and how big this could become. Suggest one bold extension the founder has not considered.',
    style:
      'An optimistic visionary who sees the biggest possible version of every idea and pushes the founder to think bigger.',
  },
};

// Pitch field limits
export const LIMITS = {
  problem: { min: 20, max: 600 },
  solution: { min: 20, max: 600 },
  customer: { min: 20, max: 300 },
  title: { min: 3, max: 80 },
  comment: { min: 1, max: 500 },
  bio: { max: 160 },
  displayName: { min: 3, max: 20 },
  password: { min: 8, max: 72 },
};

// Roast output limits (validated on every AI reply)
export const ROAST_LIMITS = {
  scoreMin: 1,
  scoreMax: 10,
  roastMin: 10,
  roastMax: 280,
  tipMin: 5,
  tipMax: 160,
  amountLakhMin: 1,
  amountLakhMax: 50,
  equityMin: 5,
  equityMax: 25,
};

// Leaderboard score: final = 100 * (weightAi * ai/10 + weightVotes * v/(v+voteK))
export const SCORE = {
  weightAi: 0.6,
  weightVotes: 0.4,
  voteK: 5,
};

export const PITCH_RULES = {
  maxPitchesPerIdea: 5,
  maxPitchesPerHour: 10,
};

// A vote counts toward the score only once the voter's account is this old.
export const VOTE_ELIGIBLE_AFTER_MS = 60 * 60 * 1000;

export const VOTE_MILESTONES = [10, 25, 50, 100];
export const TOP_N = 10;
export const LEADERBOARD_MAX = 50;
export const PAGE_SIZE = 12;

export const COMMENT_RULES = {
  reportsToHide: 3,
};

export const NOTIFICATIONS_KEPT = 50;

export const DISPLAY_NAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export const UPLOAD = {
  maxBytes: 2 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

export const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'throwawaymail.com',
  'dispostable.com',
  'maildrop.cc',
  'fakeinbox.com',
  'mintemail.com',
  'tempinbox.com',
];
