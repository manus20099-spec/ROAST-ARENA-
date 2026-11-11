import mongoose from 'mongoose';
import { afterAll, beforeAll } from 'vitest';

const testMongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roast-arena-test';
let memoryServer = null;

beforeAll(async () => {
  try {
    await mongoose.connect(testMongoUri, {
      serverSelectionTimeoutMS: 1500, // Fail-fast if local mongod is not running
    });
  } catch (err) {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      await mongoose.connect(memoryServer.getUri());
    } catch (memErr) {
      console.warn('[setup] Test MongoDB not available:', memErr.message);
    }
  }
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (memoryServer) {
      await memoryServer.stop();
    }
  } catch (err) {
    console.error('Error disconnecting test MongoDB:', err.message);
  }
});
