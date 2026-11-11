# 🔥 Startup Roast Arena

> A "Shark Tank for student ideas" — post a startup Idea, get roasted by three AI Investors, and let the community vote. The backend keeps the rules; the AI gives opinions.

---

## ⚡ 2-Minute Setup

### Prerequisites
- Node ≥ 18.18
- Docker (for local MongoDB) **or** a MongoDB Atlas URI
- Git

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd startup-roast-arena
npm run install:all
```

### 2. Start MongoDB

```bash
docker compose up -d
```

Or set `MONGODB_URI` to your Atlas connection string in `server/.env`.

### 3. Configure Environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` — the only required change for local dev is nothing (defaults work). To enable real AI roasts, add your key:

```
AI_PROVIDER=gemini        # or claude, or leave as fallback
GEMINI_API_KEY=your-key
```

### 4. Seed the Database

```bash
npm run seed
```

This creates 6 Founders, 6 Ideas with Re-pitches, demo Roasts, Votes, and Comments.

### 5. Run

```bash
npm run dev
```

- Backend: http://localhost:5000
- Frontend: http://localhost:5173

---

## 🔑 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Express port |
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/roast-arena` | MongoDB connection string |
| `JWT_SECRET` | `change-me-...` | **Required in production** — long random string |
| `AI_PROVIDER` | `fallback` | `fallback` \| `gemini` \| `claude` |
| `GEMINI_API_KEY` | _(empty)_ | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `ANTHROPIC_API_KEY` | _(empty)_ | Anthropic API key |
| `CLAUDE_MODEL` | `claude-haiku-5-5` | Claude model name |
| `AI_TIMEOUT_MS` | `15000` | Per-investor AI timeout (ms) |
| `AI_MAX_ATTEMPTS` | `3` | AI retry attempts before Fallback Roast |
| `RATE_LIMIT_ENABLED` | `true` | Set `false` for local debugging |

---

## 🏗️ Architecture: AI Proposes, Backend Validates

```
┌─────────────────────────────────────────────────────────────┐
│                        React Client                          │
│  Vite + React Router + TanStack Query + Tailwind + Socket.IO │
└─────────────────────┬──────────────────────▲────────────────┘
                      │ REST (httpOnly cookie) │ Socket.IO events
                      ▼                        │
┌─────────────────────────────────────────────────────────────┐
│                    Express API (port 5000)                    │
│  helmet · cors · cookie-parser · express-rate-limit          │
│  Zod validators · sanitize middleware · JWT auth             │
│                                                              │
│  Routes: /api/auth  /api/users  /api/ideas  /api/notifs      │
│  Services: users · ideas · pitches · votes · comments ···    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │               AI Roast Pipeline                        │  │
│  │                                                        │  │
│  │  POST /api/ideas  ──► Pitch saved (Pending)            │  │
│  │        │               202 returned immediately        │  │
│  │        ▼                                               │  │
│  │  generateAllRoasts() — 3 investors in parallel         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │  │
│  │  │  strict  │  │  funny   │  │ dreamer  │             │  │
│  │  │ Seth     │  │ Bhai Jaan│  │ Visionary│             │  │
│  │  │ Sahab    │  │ Comedian │  │ Aapa     │             │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘             │  │
│  │       │  LLM API (Gemini / Claude / Fallback template)  │  │
│  │       ▼              ▼              ▼                   │  │
│  │  Zod validates each reply ── invalid? REJECT & retry    │  │
│  │  3 failures? ── Fallback Roast (source: "fallback")     │  │
│  │       ▼                                                 │  │
│  │  Roast saved to DB ── Socket.IO push to Founder        │  │
│  │  All 3 done? ── Pitch → Complete                       │  │
│  │  Sanity check ── suspicious? → Flagged Pitch           │  │
│  │  recomputeIdeaScore() ── Leaderboard updated           │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                        ┌──────▼──────┐
                        │  MongoDB    │
                        │  (Docker /  │
                        │   Atlas)    │
                        └─────────────┘
```

**Core principle**: The AI produces text opinions. The backend's Zod schema is the single source of truth for scores and offers. A score of 11 is *rejected* (never clamped to 10). Three failures means a Fallback Roast — always labelled in the UI.

---

## 📂 Project Structure

```
startup-roast-arena/
├── docker-compose.yml        # Local MongoDB
├── package.json              # Root: install:all, dev, seed, test
├── CONTEXT.md                # Domain glossary
├── docs/adr/                 # Architecture Decision Records
│   ├── 0001-reject-not-clamp-ai-output.md
│   └── 0002-idea-and-pitch-are-separate.md
│
├── server/
│   ├── .env.example
│   ├── package.json
│   ├── vitest.config.js
│   └── src/
│       ├── index.js          # Entry point
│       ├── app.js            # Express app (no server)
│       ├── realtime.js       # Socket.IO init & emitters
│       ├── config.js         # Env-driven config
│       ├── seed.js           # Demo data
│       ├── ai/
│       │   ├── providers/    # gemini.js, claude.js, index.js
│       │   ├── schema.js     # Zod schema + parseRoastReply
│       │   ├── prompts.js    # buildSystemPrompt / buildUserPrompt
│       │   ├── sanity.js     # Flagged Pitch check
│       │   ├── fallback.js   # Template Fallback Roasts
│       │   └── roastPipeline.js  # generateRoast / generateAllRoasts
│       ├── lib/
│       │   ├── constants.js  # Every rule number in one place
│       │   ├── rules.js      # Pure domain rules (no DB)
│       │   ├── errors.js     # AppError helpers
│       │   ├── text.js       # normalizeWords, copiesRunFrom
│       │   └── moderation.js # Banned-word filter
│       ├── models/           # Mongoose models
│       │   └── User.js  Idea.js  Pitch.js  Roast.js
│       │       Vote.js  Comment.js  Notification.js  Report.js
│       ├── services/         # Business logic
│       │   └── users.js  ideas.js  pitches.js  votes.js
│       │       comments.js  notifications.js  uploads.js  ideaScore.js
│       ├── middleware/
│       │   ├── auth.js       # requireAuth / optionalAuth
│       │   ├── validate.js   # Zod body validator
│       │   ├── sanitize.js   # Strip $-keys (NoSQL injection)
│       │   ├── rateLimits.js # Login/signup/comment limiters
│       │   ├── multerConfig.js
│       │   └── errorHandler.js
│       ├── validators.js     # All Zod schemas for routes
│       └── routes/
│           ├── auth.js
│           ├── users.js
│           ├── ideas.js
│           ├── notifications.js
│           └── meta.js
│
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── context/AuthContext.jsx
│       ├── hooks/useAuth.js  useSocket.js
│       ├── lib/api.js  socket.js
│       ├── pages/
│       │   ├── LeaderboardPage.jsx
│       │   ├── NewIdeasPage.jsx
│       │   ├── MyIdeasPage.jsx
│       │   ├── PostIdeaPage.jsx
│       │   ├── IdeaPage.jsx
│       │   ├── RepitchPage.jsx
│       │   ├── ProfilePage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── SignupPage.jsx
│       │   └── NotFoundPage.jsx
│       └── components/
│           ├── Navbar.jsx
│           ├── IdeaCard.jsx
│           ├── InvestorCard.jsx
│           ├── VoteButton.jsx
│           ├── TagBadge.jsx
│           ├── Toast.jsx
│           ├── Pagination.jsx
│           ├── LoadingSpinner.jsx
│           └── ErrorMessage.jsx
```

---

## 🧪 Running Tests

> **Requires a running local MongoDB** (`docker compose up -d`)

```bash
npm test
# or
cd server && npx vitest run
```

Tests cover:
- **Pure rule tests**: score formula, Ranked Pitch selection, vote rules, milestone detection
- **AI pipeline tests**: invalid score rejected (not clamped), bad JSON retried, Fallback Roast after 3 failures, timeout, parallel investor independence, prompt-injection sanitising
- **API tests**: auth flows, vote rules, unique-vote race condition, re-pitch limits, Flagged Pitch visibility, soft delete, NoSQL injection

---

## ⚠️ Known Limitations

1. **No email verification**: Users sign up with any valid-looking email and are immediately active. The disposable-email blocklist is a lightweight guard, not a guarantee. A production deployment would add an email verification step.
2. **No deployment**: This is a GitHub submission only. The app is not hosted anywhere.
3. **AI cost**: Each Pitch costs up to 3 LLM calls per Investor (9 calls max). With the `fallback` provider (default), no API key or cost is needed.
4. **Single-process Socket.IO**: The current Socket.IO setup works for one Node process. Horizontal scaling would require a Redis adapter.
5. **In-process vote sweeper**: The `sweepEligibleVotes` interval runs in the same process as the HTTP server. A production system would move this to a separate worker.
6. **No admin panel**: Flagged Pitches can only be reviewed directly in MongoDB. A moderation UI is out of scope for this submission.

---

## 🧑‍💻 Seed Accounts

After `npm run seed`:

| Display Name | Email | Password | Role |
|---|---|---|---|
| Ali_Founder | ali@example.com | Test1234! | Founder (2 Ideas) |
| Sara_Founder | sara@example.com | Test1234! | Founder |
| Hamza_Founder | hamza@example.com | Test1234! | Founder |
| Zara_Investor | zara@example.com | Test1234! | Voter |
| Bilal_Voter | bilal@example.com | Test1234! | Voter |
| Maryam_Voter | maryam@example.com | Test1234! | Voter |

---

## 📜 ADR Summary

| # | Decision |
|---|---|
| [0001](docs/adr/0001-reject-not-clamp-ai-output.md) | Invalid AI output is **rejected and retried**, never silently clamped. |
| [0002](docs/adr/0002-idea-and-pitch-are-separate.md) | An **Idea** owns many **Pitches**; votes live on the Idea; the Leaderboard reads only the **Ranked Pitch**. |

---

*Built for the Nov 2026 deadline. MERN stack, plain JavaScript.*
