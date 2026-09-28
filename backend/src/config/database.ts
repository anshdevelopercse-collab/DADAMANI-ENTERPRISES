import dns from 'node:dns';
import mongoose from 'mongoose';
import { ENV } from './env.config.js';
import { logger } from './logger.config.js';

// Fix MongoDB Atlas SRV DNS resolution on this system
dns.setServers(['8.8.8.8', '8.8.4.4']);

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    logger.info(
      `Enterprise Database Connected Successfully: ${mongoose.connection.host}`
    );
  } catch (error: any) {
    logger.error(`Database connection failed: ${error.message}`);

    // Non-fatal in dev mode to allow app launch with graceful fallback
    if (ENV.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  });
};