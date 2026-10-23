import dns from 'dns';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './index';

// Fix for Windows Node.js querySrv ECONNREFUSED with MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if not permitted
}

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Try standard connection first if configured
  if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'mongodb://127.0.0.1:27017/bizpockethub') {
    try {
      console.log('Connecting to external MongoDB Atlas...');
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 2000,
      });
      console.log(`Connected to MongoDB Atlas: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.warn('External MongoDB connection failed, falling back to embedded database');
    }
  }

  // Try local MongoDB with short timeout
  try {
    const conn = await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 1500,
    });
    console.log(`Connected to local MongoDB at ${config.mongodb.uri}`);
    return conn;
  } catch {
    if (process.env.USE_MEMORY_DB === 'false') {
      console.log('USE_MEMORY_DB=false: Running without active MongoDB connection (Standalone fallback mode active).');
      return mongoose;
    }

    try {
      console.log('Local MongoDB not running. Attempting embedded in-memory MongoDB...');
      mongoMemoryServer = await MongoMemoryServer.create();
      const uri = mongoMemoryServer.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`Connected to embedded MongoDB at ${uri}`);
      return conn;
    } catch (err: any) {
      console.warn('⚠️ Embedded MongoDB binary download unavailable / timed out.');
      console.log('⚡ Biz List Place is running in Zero-Config Standalone Mock Mode.');
      mongoose.set('bufferCommands', false);
      mongoose.set('bufferTimeoutMS', 1000);
      return mongoose;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
}
