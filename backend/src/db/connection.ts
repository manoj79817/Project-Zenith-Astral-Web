import mongoose from 'mongoose';
import { config } from '../config';

let isConnected = false;
let useMockStore = false;

export const connectDatabase = async (): Promise<boolean> => {
  if (isConnected) return true;

  if (!config.mongoUri) {
    console.log('[DB] No MONGODB_URI provided — using in-memory mock store');
    useMockStore = true;
    return false;
  }

  try {
    await mongoose.connect(config.mongoUri);
    isConnected = true;
    console.log('[DB] ✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('[DB] ❌ MongoDB connection failed, falling back to mock store:', error);
    useMockStore = true;
    return false;
  }
};

export const isMockStore = (): boolean => useMockStore;
export const isDbConnected = (): boolean => isConnected;
