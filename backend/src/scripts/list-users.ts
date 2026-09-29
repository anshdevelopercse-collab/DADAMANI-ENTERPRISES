import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const users = await mongoose.connection.db!.collection('users').find(
    {},
    { projection: { email: 1, name: 1, role: 1, isActive: 1, firmAccessMode: 1, firmAccess: 1 } }
  ).toArray();
  console.log(JSON.stringify(users, null, 2));

  // Also list companies
  const companies = await mongoose.connection.db!.collection('companies').find(
    {},
    { projection: { name: 1, code: 1, isPrimary: 1, isActive: 1 } }
  ).toArray();
  console.log('--- COMPANIES ---');
  console.log(JSON.stringify(companies, null, 2));

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
