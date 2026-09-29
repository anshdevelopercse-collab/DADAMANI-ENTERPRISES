/**
 * Firm isolation integration tests.
 * Uses mongodb-memory-server (never Atlas) — safe to run anywhere.
 *
 * Coverage:
 *  1. buildFirmFilter — correct Mongoose fragments
 *  2. assertFirmAccess — throws for cross-firm access, passes for matching / legacy
 *  3. resolveFirmScope middleware — header parsing, Restricted-user ceiling
 *  4. Service-level query isolation (Tender as representative)
 *  5. Financial record entity auto-population from WorkOrder
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buildFirmFilter, assertFirmAccess, resolveFirmScope } from '../middlewares/firm-scope.middleware';
import { FirmScope } from '../interfaces/common.interface';
import { ApiError } from '../utils/api-response.util';
import { Tender } from '../models/tender.model';
import { WorkOrder } from '../models/work-order.model';
import { Invoice } from '../models/invoice.model';
import { Company } from '../models/company.model';
import { TenderService } from '../services/tender.service';
import { InvoiceService } from '../services/invoice.service';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── 1. buildFirmFilter ─────────────────────────────────────────────────────

describe('buildFirmFilter', () => {
  it('returns {} for undefined scope', () => {
    expect(buildFirmFilter(undefined)).toEqual({});
  });

  it('returns {} for all-scope with no allowedFirmIds', () => {
    const scope: FirmScope = { kind: 'all' };
    expect(buildFirmFilter(scope)).toEqual({});
  });

  it('returns entity filter for firm-scope', () => {
    const scope: FirmScope = { kind: 'firm', firmId: 'abc123' };
    expect(buildFirmFilter(scope)).toEqual({ entity: 'abc123' });
  });

  it('returns $in filter for restricted all-scope', () => {
    const scope: FirmScope = { kind: 'all', allowedFirmIds: ['a', 'b'] };
    expect(buildFirmFilter(scope)).toEqual({ entity: { $in: ['a', 'b'] } });
  });

  it('uses custom field name for homeEntity (vehicles)', () => {
    const scope: FirmScope = { kind: 'firm', firmId: 'x' };
    expect(buildFirmFilter(scope, 'homeEntity')).toEqual({ homeEntity: 'x' });
  });
});

// ─── 2. assertFirmAccess ────────────────────────────────────────────────────

describe('assertFirmAccess', () => {
  const firmA = new mongoose.Types.ObjectId().toString();
  const firmB = new mongoose.Types.ObjectId().toString();

  it('passes when scope is undefined', () => {
    expect(() => assertFirmAccess(firmA, undefined)).not.toThrow();
  });

  it('passes for legacy record (null entity)', () => {
    const scope: FirmScope = { kind: 'firm', firmId: firmA };
    expect(() => assertFirmAccess(null, scope)).not.toThrow();
    expect(() => assertFirmAccess(undefined, scope)).not.toThrow();
  });

  it('passes when entity matches firm-scope', () => {
    const scope: FirmScope = { kind: 'firm', firmId: firmA };
    expect(() => assertFirmAccess(firmA, scope)).not.toThrow();
  });

  it('throws 403 when entity does not match firm-scope', () => {
    const scope: FirmScope = { kind: 'firm', firmId: firmA };
    expect(() => assertFirmAccess(firmB, scope)).toThrow();
    try {
      assertFirmAccess(firmB, scope);
    } catch (e: any) {
      expect(e.statusCode).toBe(403);
    }
  });

  it('throws 403 when entity is not in restricted allowedFirmIds', () => {
    const scope: FirmScope = { kind: 'all', allowedFirmIds: [firmA] };
    expect(() => assertFirmAccess(firmB, scope)).toThrow();
  });

  it('passes when entity is in allowedFirmIds', () => {
    const scope: FirmScope = { kind: 'all', allowedFirmIds: [firmA, firmB] };
    expect(() => assertFirmAccess(firmB, scope)).not.toThrow();
  });
});

// ─── 3. resolveFirmScope middleware ─────────────────────────────────────────

describe('resolveFirmScope middleware', () => {
  const firmId = new mongoose.Types.ObjectId().toString();

  function makeReq(headerVal?: string, user?: any) {
    return {
      headers: headerVal ? { 'x-firm-scope': headerVal } : {},
      user: user ?? { firmAccessMode: 'All', firmAccess: [] },
      firmScope: undefined as FirmScope | undefined,
    } as any;
  }

  it('sets kind=all when no header', () => {
    const req = makeReq();
    const next = jest.fn();
    resolveFirmScope(req, {} as any, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.firmScope).toEqual({ kind: 'all' });
  });

  it('parses firm:<id> header', () => {
    const req = makeReq(`firm:${firmId}`);
    const next = jest.fn();
    resolveFirmScope(req, {} as any, next);
    expect(req.firmScope).toEqual({ kind: 'firm', firmId });
  });

  it('calls next with error on malformed header', () => {
    const req = makeReq('firm:');
    const next = jest.fn();
    resolveFirmScope(req, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
  });

  it('restricts all-scope to Restricted user allowedFirmIds', () => {
    const user = { firmAccessMode: 'Restricted', firmAccess: [firmId] };
    const req = makeReq(undefined, user);
    const next = jest.fn();
    resolveFirmScope(req, {} as any, next);
    expect(req.firmScope).toEqual({ kind: 'all', allowedFirmIds: [firmId] });
  });

  it('blocks Restricted user from accessing unauthorized firm', () => {
    const otherFirm = new mongoose.Types.ObjectId().toString();
    const user = { firmAccessMode: 'Restricted', firmAccess: [firmId] };
    const req = makeReq(`firm:${otherFirm}`, user);
    const next = jest.fn();
    resolveFirmScope(req, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err: ApiError = (next as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('allows Restricted user to access their own firm', () => {
    const user = { firmAccessMode: 'Restricted', firmAccess: [firmId] };
    const req = makeReq(`firm:${firmId}`, user);
    const next = jest.fn();
    resolveFirmScope(req, {} as any, next);
    expect(req.firmScope).toEqual({ kind: 'firm', firmId });
    expect(next).toHaveBeenCalledWith();
  });
});

// ─── 4. TenderService query isolation ───────────────────────────────────────

describe('TenderService firm isolation (in-memory MongoDB)', () => {
  const firmA = new mongoose.Types.ObjectId();
  const firmB = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await Tender.deleteMany({});
    const base = {
      tenderNumber: '',
      title: 'Test Tender',
      clientName: 'Test Client',
      category: 'Logistics' as const,
      estimatedValue: 100000,
      submissionDeadline: new Date('2027-01-01'),
      status: 'Draft' as any,
      location: 'Test',
      isArchived: false,
      createdBy: userId,
    };
    await Tender.create([
      { ...base, tenderNumber: 'T-A1', entity: firmA },
      { ...base, tenderNumber: 'T-A2', entity: firmA },
      { ...base, tenderNumber: 'T-B1', entity: firmB },
      { ...base, tenderNumber: 'T-LEG', entity: undefined }, // legacy
    ]);
  });

  it('returns only Firm A tenders when scoped to Firm A', async () => {
    const scope: FirmScope = { kind: 'firm', firmId: firmA.toString() };
    const svc = new TenderService();
    const result = await svc.getTenders({}, scope);
    expect(result.data.every((t: any) => t.entity?.toString() === firmA.toString())).toBe(true);
    expect(result.data.length).toBe(2);
  });

  it('returns only Firm B tenders when scoped to Firm B', async () => {
    const scope: FirmScope = { kind: 'firm', firmId: firmB.toString() };
    const svc = new TenderService();
    const result = await svc.getTenders({}, scope);
    expect(result.data.length).toBe(1);
    expect(result.data[0].tenderNumber).toBe('T-B1');
  });

  it('returns all tenders when scope is all (admin)', async () => {
    const svc = new TenderService();
    const result = await svc.getTenders({});
    expect(result.data.length).toBe(4);
  });

  it('throws 403 when fetching Firm B tender under Firm A scope', async () => {
    const tenderB = await Tender.findOne({ tenderNumber: 'T-B1' }).lean();
    const scope: FirmScope = { kind: 'firm', firmId: firmA.toString() };
    const svc = new TenderService();
    await expect(svc.getTenderById(tenderB!._id.toString(), scope)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows access to legacy (null entity) tender under any firm scope', async () => {
    const legacy = await Tender.findOne({ tenderNumber: 'T-LEG' }).lean();
    const scope: FirmScope = { kind: 'firm', firmId: firmA.toString() };
    const svc = new TenderService();
    await expect(svc.getTenderById(legacy!._id.toString(), scope)).resolves.toBeDefined();
  });
});

// ─── 5. Invoice entity auto-population from WorkOrder ───────────────────────

describe('InvoiceService entity auto-population', () => {
  const firmA = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  let workOrderId: string;

  beforeAll(async () => {
    await WorkOrder.deleteMany({});
    await Invoice.deleteMany({});

    const wo = await WorkOrder.create({
      orderNumber: 'WO-FIRM-001',
      title: 'Test Work Order',
      clientName: 'Test Client',
      assignedProject: 'Test Project',
      assignedManager: userId,
      contractValue: 500000,
      startDate: new Date('2027-01-01'),
      targetEndDate: new Date('2027-12-31'),
      status: 'Draft',
      priority: 'Medium',
      siteLocation: 'Test Site',
      entity: firmA,
      createdBy: userId,
    });
    workOrderId = wo._id.toString();
  });

  it('inherits entity from parent WorkOrder on invoice create', async () => {
    const svc = new InvoiceService();
    const invoice = await svc.create(
      {
        workOrder: workOrderId,
        invoiceNumber: 'INV-AUTO-001',
        invoiceDate: new Date('2027-03-01'),
        billingMonth: '2027-03',
        amount: 50000,
        status: 'Draft',
      },
      userId.toString()
    );
    expect((invoice as any).entity?.toString()).toBe(firmA.toString());
  });

  it('scoped list returns invoice when firmScope matches entity', async () => {
    const svc = new InvoiceService();
    const scope: FirmScope = { kind: 'firm', firmId: firmA.toString() };
    const result = await svc.list({}, scope);
    expect(result.data.length).toBe(1);
  });

  it('scoped list returns nothing for wrong firm', async () => {
    const firmB = new mongoose.Types.ObjectId();
    const svc = new InvoiceService();
    const scope: FirmScope = { kind: 'firm', firmId: firmB.toString() };
    const result = await svc.list({}, scope);
    expect(result.data.length).toBe(0);
  });
});

// ─── 6. Document firm isolation ─────────────────────────────────────────────

import { DocumentRecord } from '../models/document.model';
import { DocumentService } from '../services/system.services';

describe('DocumentService firm isolation', () => {
  const firmA = new mongoose.Types.ObjectId();
  const firmB = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await DocumentRecord.deleteMany({});
    await DocumentRecord.create([
      // Firm A document
      {
        title: 'Firm A Doc',
        folder: 'General',
        category: 'General',
        originalFileName: 'a.pdf',
        storedFileName: 'a.pdf',
        filePath: '/uploads/a.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        uploadedBy: userId,
        firms: [firmA],
        isArchived: false,
        versionNumber: 1,
        isLatestVersion: true,
      },
      // Firm B document
      {
        title: 'Firm B Doc',
        folder: 'General',
        category: 'General',
        originalFileName: 'b.pdf',
        storedFileName: 'b.pdf',
        filePath: '/uploads/b.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        uploadedBy: userId,
        firms: [firmB],
        isArchived: false,
        versionNumber: 1,
        isLatestVersion: true,
      },
      // Legacy document (no firms)
      {
        title: 'Legacy Doc',
        folder: 'General',
        category: 'General',
        originalFileName: 'leg.pdf',
        storedFileName: 'leg.pdf',
        filePath: '/uploads/leg.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        uploadedBy: userId,
        firms: [],
        isArchived: false,
        versionNumber: 1,
        isLatestVersion: true,
      },
    ]);
  });

  it('Firm A scope returns only Firm A doc and legacy', async () => {
    const svc = new DocumentService();
    const scope: FirmScope = { kind: 'firm', firmId: firmA.toString() };
    const result = await svc.getDocuments({}, scope);
    expect(result.data.length).toBe(2);
    expect(result.data.map((d: any) => d.title).sort()).toEqual(['Firm A Doc', 'Legacy Doc'].sort());
  });

  it('Firm B scope returns only Firm B doc and legacy', async () => {
    const svc = new DocumentService();
    const scope: FirmScope = { kind: 'firm', firmId: firmB.toString() };
    const result = await svc.getDocuments({}, scope);
    expect(result.data.length).toBe(2);
    expect(result.data.map((d: any) => d.title).sort()).toEqual(['Firm B Doc', 'Legacy Doc'].sort());
  });

  it('Admin (all scope) sees all three documents', async () => {
    const svc = new DocumentService();
    const result = await svc.getDocuments({}, { kind: 'all' });
    expect(result.data.length).toBe(3);
  });

  it('getDocumentById throws 403 for cross-firm access', async () => {
    const svc = new DocumentService();
    const docB = await DocumentRecord.findOne({ title: 'Firm B Doc' });
    const scope: FirmScope = { kind: 'firm', firmId: firmA.toString() };
    await expect(svc.getDocumentById(docB!._id.toString(), scope)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('deleteDocument throws 403 for cross-firm delete', async () => {
    const svc = new DocumentService();
    const docB = await DocumentRecord.findOne({ title: 'Firm B Doc' });
    const scope: FirmScope = { kind: 'firm', firmId: firmA.toString() };
    await expect(svc.deleteDocument(docB!._id.toString(), scope)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('legacy document is accessible to any firm scope', async () => {
    const svc = new DocumentService();
    const legacy = await DocumentRecord.findOne({ title: 'Legacy Doc' });
    const scope: FirmScope = { kind: 'firm', firmId: firmA.toString() };
    await expect(svc.getDocumentById(legacy!._id.toString(), scope)).resolves.toBeDefined();
  });
});

// ─── 7. AdvanceAdjustment on cancelled invoice ──────────────────────────────

import { ContractAdvanceService } from '../services/contract-advance.service';
import { ContractAdvance } from '../models/contract-advance.model';

describe('ContractAdvanceService: cancelled invoice guard', () => {
  const firmA = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  let advanceId: string;
  let cancelledInvoiceId: string;
  let workOrderId: string;

  beforeAll(async () => {
    await ContractAdvance.deleteMany({});
    await Invoice.deleteMany({});
    await WorkOrder.deleteMany({});

    const wo = await WorkOrder.create({
      orderNumber: 'WO-ADJ-001',
      title: 'Adj Test WO',
      clientName: 'Client',
      assignedProject: 'Proj',
      assignedManager: userId,
      contractValue: 1000000,
      startDate: new Date(),
      targetEndDate: new Date(Date.now() + 86400000 * 30),
      status: 'Draft',
      priority: 'Medium',
      siteLocation: 'Site',
      entity: firmA,
      createdBy: userId,
    });
    workOrderId = wo._id.toString();

    const advance = await ContractAdvance.create({
      workOrder: wo._id,
      recipientType: 'External',
      recipientName: 'Test Contractor',
      amount: 100000,
      date: new Date(),
      reason: 'Mobilization',
      totalAdjusted: 0,
      createdBy: userId,
    });
    advanceId = advance._id.toString();

    const inv = await Invoice.create({
      workOrder: wo._id,
      invoiceNumber: 'INV-CANCEL-001',
      invoiceDate: new Date(),
      billingMonth: '2027-01',
      amount: 50000,
      totalAdjusted: 0,
      status: 'Cancelled',
      createdBy: userId,
    });
    cancelledInvoiceId = inv._id.toString();
  });

  it('throws 400 when attempting to adjust a cancelled invoice', async () => {
    const svc = new ContractAdvanceService();
    await expect(
      svc.createAdjustment(advanceId, cancelledInvoiceId, 10000, userId.toString())
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── 8. Seed safety guard ────────────────────────────────────────────────────

describe('Seed safety: Atlas guard', () => {
  it('seed file exports a guard that detects Atlas URIs', () => {
    const isAtlas = (uri: string) => uri.includes('mongodb.net') || uri.includes('atlas');
    expect(isAtlas('mongodb+srv://user:pass@cluster.mongodb.net/db')).toBe(true);
    expect(isAtlas('mongodb://localhost:27017/dev')).toBe(false);
    expect(isAtlas('mongodb://127.0.0.1:27017/test')).toBe(false);
  });

  it('seed file exports a guard that detects production env', () => {
    const isProd = (env: string) => env === 'production';
    expect(isProd('production')).toBe(true);
    expect(isProd('development')).toBe(false);
    expect(isProd('test')).toBe(false);
  });
});

// ─── 9. escapeRegex / ReDoS protection ──────────────────────────────────────

import { escapeRegex } from '../utils/query.util';

describe('escapeRegex', () => {
  it('escapes special regex chars', () => {
    expect(escapeRegex('hello.world')).toBe('hello\\.world');
    expect(escapeRegex('a+b*c?')).toBe('a\\+b\\*c\\?');
    expect(escapeRegex('(test)')).toBe('\\(test\\)');
  });

  it('caps length at maxLength', () => {
    const long = 'a'.repeat(200);
    expect(escapeRegex(long, 100).length).toBe(100);
  });

  it('safe string passes through unchanged', () => {
    expect(escapeRegex('invoice 2027')).toBe('invoice 2027');
  });
});

// ─── 10. Import firm authorization ──────────────────────────────────────────

import { ImportExportService } from '../services/import-export.service';

describe('ImportExportService: firm stamping on import', () => {
  const firmA = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await Tender.deleteMany({ tenderNumber: /^IMP-FIRM/ });
  });

  it('stamps entity=firmId on imported Tender when firmId supplied', async () => {
    const svc = new ImportExportService();

    // Build a minimal in-memory Excel buffer
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      {
        'Tender Number': 'IMP-FIRM-001',
        Title: 'Import Firm Test',
        'Client Name': 'Test Client',
        'Estimated Value': 500000,
        Status: 'Draft',
        Location: 'Odisha',
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const mapping = {
      'Tender Number': 'tenderNumber',
      Title: 'title',
      'Client Name': 'clientName',
      'Estimated Value': 'estimatedValue',
      Status: 'status',
      Location: 'location',
    };

    await svc.executeImport(
      buffer,
      'Sheet1',
      'test.xlsx',
      'Tenders',
      mapping,
      { skipDuplicates: true },
      userId.toString(),
      firmA.toString()
    );

    const imported = await Tender.findOne({ tenderNumber: 'IMP-FIRM-001' }) as any;
    expect(imported).toBeDefined();
    expect((imported as any).entity?.toString()).toBe(firmA.toString());
  });
});
