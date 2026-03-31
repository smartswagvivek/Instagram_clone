import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const fallbackDbPath = path.join(backendRoot, '.mongodb-data');

const ensureFallbackDirectory = () => {
  if (!fs.existsSync(fallbackDbPath)) {
    fs.mkdirSync(fallbackDbPath, { recursive: true });
  }
};

const connectWithUri = async (uri, options = {}) =>
  mongoose.connect(uri, {
    dbName: process.env.DB_NAME,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    waitQueueTimeoutMS: 10000,
    family: 4,
    ...options,
  });

const shouldUseFallback = () =>
  process.env.NODE_ENV !== 'production' && process.env.MONGO_FALLBACK_DISABLED !== 'true';

const connectFallbackDatabase = async () => {
  ensureFallbackDirectory();

  memoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: process.env.DB_NAME || 'instagram-clone',
      dbPath: fallbackDbPath,
      storageEngine: 'wiredTiger',
    },
    binary: {
      version: '7.0.14',
    },
  });

  const uri = memoryServer.getUri(process.env.DB_NAME || 'instagram-clone');
  const connection = await connectWithUri(uri);
  console.log(`MongoDB fallback connected: ${connection.connection.host}`);

  if (process.env.AUTO_SEED_ON_FALLBACK !== 'false') {
    const { default: User } = await import('../models/User.js');
    const usersCount = await User.countDocuments();

    if (usersCount === 0) {
      const { seedDatabase } = await import('../scripts/seed.js');
      const result = await seedDatabase({ reset: false });
      console.log(
        `Fallback database seeded automatically with ${result.users} users and ${result.posts} posts.`
      );
    }
  }

  return connection;
};

export const connectDB = async () => {
  try {
    const connection = await connectWithUri(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    if (!shouldUseFallback()) {
      throw error;
    }

    console.warn(
      `Primary MongoDB connection failed (${error.code || error.name}). Starting local fallback database for development.`
    );

    return connectFallbackDatabase();
  }
};

export const closeDB = async () => {
  await mongoose.disconnect();

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};
