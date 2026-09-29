import mongoose from 'mongoose';
import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dada_mani';

// Collections to PRESERVE
const PRESERVE_COLLECTIONS = ['companies', 'users', 'roles', 'settings'];

export async function resetProductionData() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB host:', mongoose.connection.host);
  const db = mongoose.connection.db;

  if (!db) {
    console.error('No DB connection');
    process.exit(1);
  }

  const collections = await db.listCollections().toArray();
  console.log('\n=== PURGING DEMO/SAMPLE OPERATIONAL DATA ===\n');

  for (const col of collections) {
    if (PRESERVE_COLLECTIONS.includes(col.name)) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`[PRESERVED] ${col.name.padEnd(30)} : ${count} documents remaining`);
    } else {
      const deleted = await db.collection(col.name).deleteMany({});
      console.log(`[DELETED]   ${col.name.padEnd(30)} : ${deleted.deletedCount} documents deleted`);
    }
  }

  console.log('\n=== RESET COMPLETE. SYSTEM CLEAN. ===\n');
  await mongoose.disconnect();
}

if (process.argv.includes('--execute')) {
  resetProductionData().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
