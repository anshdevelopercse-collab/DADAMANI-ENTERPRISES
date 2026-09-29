import mongoose from 'mongoose';
import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dada_mani';

async function countAll() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB host:', mongoose.connection.host);
  const db = mongoose.connection.db;

  if (!db) {
    console.error('No DB connection');
    process.exit(1);
  }

  const collections = await db.listCollections().toArray();
  console.log('\n=== CURRENT COLLECTION DOCUMENT COUNTS ===\n');
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`${col.name.padEnd(30)} : ${count} documents`);
  }

  console.log('\n==========================================\n');
  await mongoose.disconnect();
}

countAll().catch(err => {
  console.error(err);
  process.exit(1);
});
