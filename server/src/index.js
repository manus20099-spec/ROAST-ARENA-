import http from 'node:http';
import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';
import { closeRealtime, initRealtime } from './realtime.js';
import { sweepEligibleVotes } from './services/ideaScore.js';
import { recoverPendingPitches } from './services/pitches.js';

const server = http.createServer(app);

// Connect real-time socket layer
initRealtime(server);

// Database connection & startup jobs
async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log(`[db] Connected to MongoDB at ${config.mongoUri}`);

    // AI Provider status
    console.log(`[ai] Active AI provider: ${config.ai.provider}`);

    // Recover pending pitches on boot
    const recovered = await recoverPendingPitches({ olderThanMs: 0 });
    if (recovered > 0) {
      console.log(`[boot] Triggered recovery for ${recovered} stuck pending pitches`);
    }

    // Periodic tasks
    // 1. Recover pending pitches older than 2 minutes
    setInterval(async () => {
      try {
        await recoverPendingPitches({ olderThanMs: 2 * 60 * 1000 });
      } catch (err) {
        console.error('[cron] Pending pitch recovery failed:', err.message);
      }
    }, 2 * 60 * 1000);

    // 2. Sweep eligible votes every 5 minutes
    setInterval(async () => {
      try {
        await sweepEligibleVotes();
      } catch (err) {
        console.error('[cron] Vote sweep failed:', err.message);
      }
    }, 5 * 60 * 1000);

    server.listen(config.port, () => {
      console.log(`[server] Startup Roast Arena listening on port ${config.port}`);
    });
  } catch (err) {
    console.error('[server] Fatal startup error:', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('[server] Shutting down gracefully...');
  closeRealtime();
  server.close(async () => {
    try {
      await mongoose.disconnect();
      console.log('[server] Mongoose disconnected. Goodbye!');
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
