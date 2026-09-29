import mongoose from 'mongoose';
import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dada_mani';
const API_URL = 'http://localhost:5000/api/v1';

async function testRecordLifecycle() {
  await mongoose.connect(MONGODB_URI);
  console.log('--- TESTING RECORD CREATION & DELETION LIFECYCLE ---');

  const db = mongoose.connection.db;
  if (!db) throw new Error('No DB connection');

  // Ensure manager user has tender:delete permission
  await db.collection('users').updateOne(
    { email: 'manager@dadamani.com' },
    { $addToSet: { customPermissions: 'tender:delete' } }
  );

  // 1. Login as manager
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@dadamani.com', password: 'Manager@123456' }),
  });
  const loginData: any = await loginRes.json();
  if (!loginData.success) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }
  const token = loginData.data.accessToken;
  const baseHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Fetch companies to get Satish Bohidar firm ID
  const compRes = await fetch(`${API_URL}/companies`, { headers: baseHeaders });
  const compData: any = await compRes.json();
  const companies = compData.data;
  console.log(`Found ${companies.length} firms in system:`);
  companies.forEach((c: any) => console.log(`  - ${c.name} (${c.code}) ID: ${c._id}`));

  const targetFirm = companies.find((c: any) => c.name.toLowerCase().includes('satish')) || companies[0];
  console.log(`Selecting firm for creation: ${targetFirm.name} (${targetFirm._id})`);

  const firmHeaders = {
    ...baseHeaders,
    'x-firm-scope': `firm:${targetFirm._id}`,
  };

  // 3. Create a test tender under target firm
  const createRes = await fetch(`${API_URL}/tenders`, {
    method: 'POST',
    headers: firmHeaders,
    body: JSON.stringify({
      tenderNumber: `TEST-TND-${Date.now()}`,
      title: 'Verification Test Tender - Road Haulage',
      clientName: 'Odisha Mining Corporation',
      category: 'Mining',
      estimatedValue: 2500000,
      earnestMoneyDeposit: 50000,
      submissionDeadline: new Date(Date.now() + 864000000).toISOString(),
      location: 'Keonjhar, Odisha',
      entity: targetFirm._id,
    }),
  });

  const createData: any = await createRes.json();
  if (!createData.success) {
    console.error('Failed to create tender:', JSON.stringify(createData, null, 2));
    process.exit(1);
  }

  const createdId = createData.data._id;
  console.log(`✓ Test Tender Created in MongoDB! ID: ${createdId}`);

  // 4. Verify in MongoDB directly
  const countAfterCreate = await db.collection('tenders').countDocuments();
  console.log(`✓ MongoDB Tenders Count after creation: ${countAfterCreate}`);

  const createdDoc = await db.collection('tenders').findOne({ _id: new mongoose.Types.ObjectId(createdId) });
  console.log(`✓ Document found in MongoDB with entity firm ID: ${createdDoc?.entity}`);

  // 5. Delete the test tender via API
  const delRes = await fetch(`${API_URL}/tenders/${createdId}`, {
    method: 'DELETE',
    headers: firmHeaders,
  });
  const delData: any = await delRes.json();
  console.log(`DELETE HTTP status: ${delRes.status}`, JSON.stringify(delData, null, 2));

  // 6. Verify MongoDB count returns to 0
  const countAfterDelete = await db.collection('tenders').countDocuments();
  console.log(`✓ MongoDB Tenders Count after deletion: ${countAfterDelete}`);

  if (countAfterDelete === 0) {
    console.log('✓ VERIFICATION SUCCESSFUL: Record created in MongoDB under Satish Bohidar firm, verified, deleted, and MongoDB count returned to 0.');
  } else {
    console.error('❌ FAILURE: Count after deletion is not 0!');
    process.exit(1);
  }

  await mongoose.disconnect();
}

testRecordLifecycle().catch((err) => {
  console.error(err);
  process.exit(1);
});
