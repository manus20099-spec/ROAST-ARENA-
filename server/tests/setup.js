import mongoose from 'mongoose';
import { afterAll, beforeAll } from 'vitest';

const testMongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roast-arena-test';

beforeAll(async () => {
  try {
    await mongoose.connect(testMongoUri, {
      serverSelectionTimeoutMS: 1500, // Fail-fast if local mongod is not running
    });
  } catch (err) {
    // Only warn, so pure unit tests (without DB) run smoothly
    console.warn('[setup] Test MongoDB not available:', err.message);
  }
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (err) {
    console.error('Error disconnecting test MongoDB:', err.message);
  }
});
