import fs from 'fs';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../../app.js';
import { ENV } from '../../config/env.config.js';
import { User } from '../../models/user.model.js';
import { WorkOrder } from '../../models/work-order.model.js';
import { Vehicle } from '../../models/vehicle.model.js';
import { Invoice } from '../../models/invoice.model.js';
import { ContractAdvance } from '../../models/contract-advance.model.js';
import { Company } from '../../models/company.model.js';
import { JwtUtil } from '../../utils/jwt.util.js';
import { FuelType, UserRole } from '../../constants/status.constant.js';

export const app = createApp();

let replSet: MongoMemoryReplSet | null = null;

// A single-node replica set, so MongoDB transactions behave exactly as in production.
export async function startTestDb(): Promise<void> {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const uri = replSet.getUri();
  if (!uri.startsWith('mongodb://127.0.0.1')) {
    throw new Error(`Refusing to run integration tests against non-local MongoDB: ${uri}`);
  }
  await mongoose.connect(uri);
  // Build every index (unique invoiceNumber, etc.) before tests rely on them.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
}

export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
  replSet = null;
  fs.rmSync(ENV.UPLOAD_DIR, { recursive: true, force: true });
}

export async function clearDb(): Promise<void> {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

// --- Firms ---
export async function createFirm(name: string, code: string, isPrimary = false) {
  return Company.create({ name, code, isPrimary });
}

/** The two firms of the portal, as they would be registered in production (names only). */
export async function createPortalFirms() {
  const sb = await createFirm('Satish Bohidar', 'SB', true);
  const dm = await createFirm('Dadamani', 'DM');
  return { sb, dm, sbId: sb._id.toString(), dmId: dm._id.toString() };
}

/** Default firm for tests that do not care which firm a record belongs to. */
export async function defaultFirmId(): Promise<string> {
  const existing = await Company.findOne({ code: 'TST' });
  return (existing ?? (await createFirm('Test Firm', 'TST'))).id;
}

export interface TestUser {
  id: string;
  token: string;
  auth: { Authorization: string };
}

let userCounter = 0;
/** A user restricted to the given firms (firm-level authorization tests). */
export async function createRestrictedUser(role: 'Manager' | 'Viewer', firmIds: string[]): Promise<TestUser> {
  return createUser(role, { firmAccessMode: 'Restricted', firmAccess: firmIds });
}

export async function createUser(role: UserRole | 'Admin' | 'Manager' | 'Viewer', extra: Record<string, unknown> = {}): Promise<TestUser> {
  userCounter += 1;
  const user = await User.create({
    name: `${role} Tester ${userCounter}`,
    email: `${String(role).toLowerCase()}${userCounter}@test.invalid`,
    password: 'Test@123456',
    role,
    isActive: true,
    ...extra,
  });
  const { accessToken } = JwtUtil.generateTokens(user);
  return { id: user._id.toString(), token: accessToken, auth: { Authorization: `Bearer ${accessToken}` } };
}

let woCounter = 0;
export async function createWorkOrder(createdBy: string, extra: Record<string, unknown> = {}) {
  woCounter += 1;
  const firm = 'firm' in extra ? extra.firm : await defaultFirmId();
  return WorkOrder.create({
    firm,
    orderNumber: `WO-TEST-${woCounter}`,
    title: `Test contract ${woCounter}`,
    clientName: 'Test Client',
    assignedProject: 'Test Project',
    siteLocation: 'Test Site',
    assignedManager: createdBy,
    startDate: new Date('2026-01-01'),
    targetEndDate: new Date('2026-12-31'),
    contractValue: 1000000,
    createdBy,
    ...extra,
  });
}

let vehicleCounter = 0;
export async function createVehicle(createdBy: string, ownerFirm?: string | null) {
  vehicleCounter += 1;
  const owner = ownerFirm === undefined ? await defaultFirmId() : ownerFirm;
  const doc = (n: string) => ({ documentNumber: `${n}-${vehicleCounter}`, expiryDate: new Date('2030-01-01') });
  return Vehicle.create({
    registrationNumber: `OD02TEST${vehicleCounter}`,
    chassisNumber: `CHS${vehicleCounter}`,
    engineNumber: `ENG${vehicleCounter}`,
    make: 'Tata',
    model: 'Signa',
    yearOfManufacture: 2022,
    vehicleType: 'Dumper / Tipper',
    fuelType: FuelType.DIESEL,
    capacityTonnes: 25,
    currentLocation: 'Test Yard',
    insurance: doc('INS'),
    fitness: doc('FIT'),
    permit: doc('PER'),
    tax: doc('TAX'),
    puc: doc('PUC'),
    ownerFirm: owner,
    createdBy,
  });
}

let invoiceCounter = 0;
export async function createInvoiceDoc(workOrder: string, createdBy: string, amount: number, extra: Record<string, unknown> = {}) {
  invoiceCounter += 1;
  const wo = await WorkOrder.findById(workOrder).select('firm').lean();
  return Invoice.create({
    workOrder,
    firm: wo?.firm,
    billingMonth: '2026-01',
    invoiceNumber: `INV-FIX-${invoiceCounter}`,
    invoiceDate: new Date('2026-01-31'),
    amount,
    createdBy,
    ...extra,
  });
}

export async function createAdvanceDoc(workOrder: string, createdBy: string, amount: number) {
  const wo = await WorkOrder.findById(workOrder).select('firm').lean();
  return ContractAdvance.create({
    workOrder,
    firm: wo?.firm,
    recipientType: 'External',
    recipientName: 'Site Contractor',
    amount,
    date: new Date('2026-01-05'),
    reason: 'Pre-bill mobilisation advance',
    createdBy,
  });
}

export function uploadedFileCount(): number {
  return fs.existsSync(ENV.UPLOAD_DIR) ? fs.readdirSync(ENV.UPLOAD_DIR).length : 0;
}
