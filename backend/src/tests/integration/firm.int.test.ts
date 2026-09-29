import request from 'supertest';
import {
  app, startTestDb, stopTestDb, clearDb, createUser, createRestrictedUser, createPortalFirms,
  createWorkOrder, createVehicle, createInvoiceDoc, createAdvanceDoc, TestUser,
} from '../helpers/test-app.js';
import { WorkOrder } from '../../models/work-order.model.js';
import { Invoice } from '../../models/invoice.model.js';
import { ContractAdvance } from '../../models/contract-advance.model.js';
import { AdvanceAdjustment } from '../../models/advance-adjustment.model.js';
import { GemFee } from '../../models/gem-fee.model.js';
import { Tender } from '../../models/tender.model.js';
import { Company } from '../../models/company.model.js';
import { VehicleAllocation } from '../../models/vehicle-allocation.model.js';
import { DocumentRecord } from '../../models/document.model.js';

const SCOPE = 'X-Firm-Scope';

describe('Multi-firm portal: Satish Bohidar + Dadamani (integration)', () => {
  let admin: TestUser;
  let manager: TestUser; // access to all firms (default)
  let sbOnly: TestUser; // manager restricted to Satish Bohidar
  let dmOnly: TestUser; // manager restricted to Dadamani
  let sbId: string;
  let dmId: string;
  let sbWo: string;
  let dmWo: string;

  const tenderBody = (firm: string, n: string) => ({
    tenderNumber: `TND-${n}`, title: `Tender ${n}`, clientName: 'Client', estimatedValue: 1000,
    submissionDeadline: '2026-12-01', location: 'Odisha', firm,
  });
  const invoiceBody = (workOrder: string, n: string, amount = 100000) => ({
    workOrder, billingMonth: '2026-01', invoiceNumber: `INV-${n}`, invoiceDate: '2026-01-31', amount,
  });

  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => {
    await clearDb();
    ({ sbId, dmId } = await createPortalFirms());
    admin = await createUser('Admin');
    manager = await createUser('Manager');
    sbOnly = await createRestrictedUser('Manager', [sbId]);
    dmOnly = await createRestrictedUser('Manager', [dmId]);
    sbWo = (await createWorkOrder(admin.id, { firm: sbId }))._id.toString();
    dmWo = (await createWorkOrder(admin.id, { firm: dmId }))._id.toString();
  });

  describe('firm registry and context', () => {
    it('keeps exactly one primary firm (Satish Bohidar) and lists it first', async () => {
      const ctx = await request(app).get('/api/v1/companies/context').set(manager.auth);
      expect(ctx.status).toBe(200);
      expect(ctx.body.data.firms.map((f: any) => f.name)).toEqual(['Satish Bohidar', 'Dadamani']);
      expect(ctx.body.data.primaryFirmId).toBe(sbId);
      expect(ctx.body.data.accessMode).toBe('All');

      const made = await request(app).put(`/api/v1/companies/${dmId}`).set(admin.auth).send({ isPrimary: true });
      expect(made.status).toBe(200);
      expect(await Company.countDocuments({ isPrimary: true })).toBe(1);
      expect((await Company.findById(dmId))!.isPrimary).toBe(true);
    });

    it('shows a restricted user only their own firm and no "unassigned" view', async () => {
      const ctx = await request(app).get('/api/v1/companies/context').set(dmOnly.auth);
      expect(ctx.body.data.firms.map((f: any) => f.name)).toEqual(['Dadamani']);
      expect(ctx.body.data.accessMode).toBe('Restricted');
      expect(ctx.body.data.canViewUnassigned).toBe(false);
    });

    it('creates a firm with only name and code — no legal details required', async () => {
      const res = await request(app).post('/api/v1/companies').set(admin.auth).send({ name: 'Third Firm', code: 'TF' });
      expect(res.status).toBe(201);
      expect(res.body.data.gstNumber).toBeUndefined();
      expect(res.body.data.address).toBeUndefined();
    });

    it('refuses to delete the primary firm or a firm that records reference', async () => {
      expect((await request(app).delete(`/api/v1/companies/${sbId}`).set(admin.auth)).status).toBe(400);
      expect((await request(app).delete(`/api/v1/companies/${dmId}`).set(admin.auth)).status).toBe(409);
    });

    it('validates user firm access', async () => {
      const bad = await request(app).post('/api/v1/users').set(admin.auth).send({ name: 'R U', email: 'r@test.invalid', role: 'Viewer', firmAccessMode: 'Restricted' });
      expect(bad.status).toBe(400);
      const unknown = await request(app).post('/api/v1/users').set(admin.auth)
        .send({ name: 'R U', email: 'r2@test.invalid', role: 'Viewer', firmAccessMode: 'Restricted', firmAccess: ['64b000000000000000000000'] });
      expect(unknown.status).toBe(400);
      const ok = await request(app).post('/api/v1/users').set(admin.auth)
        .send({ name: 'R U', email: 'r3@test.invalid', role: 'Viewer', firmAccessMode: 'Restricted', firmAccess: [dmId] });
      expect(ok.status).toBe(201);
    });
  });

  describe('creating records for each firm', () => {
    it('creates a Satish Bohidar tender and a Dadamani tender, and requires an explicit firm', async () => {
      const sb = await request(app).post('/api/v1/tenders').set(manager.auth).send(tenderBody(sbId, 'SB1'));
      const dm = await request(app).post('/api/v1/tenders').set(manager.auth).send(tenderBody(dmId, 'DM1'));
      expect(sb.status).toBe(201);
      expect(dm.status).toBe(201);
      expect(sb.body.data.firm).toBe(sbId);
      expect(dm.body.data.firm).toBe(dmId);

      const { firm, ...noFirm } = tenderBody(sbId, 'X1');
      expect((await request(app).post('/api/v1/tenders').set(manager.auth).send(noFirm)).status).toBe(400);
    });

    it('rejects malformed and unknown firm ids', async () => {
      expect((await request(app).post('/api/v1/tenders').set(manager.auth).send(tenderBody('not-an-id', 'B1'))).status).toBe(400);
      expect((await request(app).post('/api/v1/tenders').set(manager.auth).send(tenderBody('64b000000000000000000000', 'B2'))).status).toBe(400);
      expect((await request(app).get('/api/v1/tenders').set(manager.auth).set(SCOPE, 'garbage')).status).toBe(400);
      expect((await request(app).get('/api/v1/tenders').set(manager.auth).set(SCOPE, '64b000000000000000000000')).status).toBe(400);
    });

    it('rejects creating records in an inactive firm', async () => {
      const inactive = await Company.create({ name: 'Dormant', code: 'DOR', isActive: false });
      expect((await request(app).post('/api/v1/tenders').set(manager.auth).send(tenderBody(inactive.id, 'IN1'))).status).toBe(400);
    });
  });

  describe('firm filtering and combined views', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/tenders').set(manager.auth).send(tenderBody(sbId, 'SB1'));
      await request(app).post('/api/v1/tenders').set(manager.auth).send(tenderBody(sbId, 'SB2'));
      await request(app).post('/api/v1/tenders').set(manager.auth).send(tenderBody(dmId, 'DM1'));
      await Tender.create({ ...tenderBody(sbId, 'LEGACY'), firm: undefined, submissionDeadline: new Date('2026-12-01'), createdBy: admin.id });
    });

    it('filters by firm via header or query string', async () => {
      const sb = await request(app).get('/api/v1/tenders').set(manager.auth).set(SCOPE, sbId);
      expect(sb.body.data.map((t: any) => t.tenderNumber).sort()).toEqual(['TND-SB1', 'TND-SB2']);
      expect(sb.body.data[0].firm.name).toBe('Satish Bohidar');
      const dm = await request(app).get('/api/v1/tenders').query({ firmScope: dmId }).set(manager.auth);
      expect(dm.body.data.map((t: any) => t.tenderNumber)).toEqual(['TND-DM1']);
    });

    it('shows combined data (including legacy records without a firm) to all-firm users', async () => {
      const all = await request(app).get('/api/v1/tenders').set(manager.auth).set(SCOPE, 'all');
      expect(all.body.meta.total).toBe(4);
      const legacy = await request(app).get('/api/v1/tenders').set(manager.auth).set(SCOPE, 'unassigned');
      expect(legacy.body.data.map((t: any) => t.tenderNumber)).toEqual(['TND-LEGACY']);
    });

    it('limits a restricted user\'s combined view to their firm and hides legacy records', async () => {
      const all = await request(app).get('/api/v1/tenders').set(dmOnly.auth);
      expect(all.body.data.map((t: any) => t.tenderNumber)).toEqual(['TND-DM1']);
      expect((await request(app).get('/api/v1/tenders').set(dmOnly.auth).set(SCOPE, 'unassigned')).status).toBe(403);
      expect((await request(app).get('/api/v1/tenders').set(dmOnly.auth).set(SCOPE, sbId)).status).toBe(403);
    });
  });

  describe('cross-firm access attempts', () => {
    it('hides another firm\'s records by id (404, not 403) and blocks writes', async () => {
      const sbInvoice = await createInvoiceDoc(sbWo, admin.id, 5000);
      expect((await request(app).get(`/api/v1/invoices/${sbInvoice._id}`).set(dmOnly.auth)).status).toBe(404);
      expect((await request(app).put(`/api/v1/invoices/${sbInvoice._id}`).set(dmOnly.auth).send({ notes: 'x' })).status).toBe(404);
      expect((await request(app).get(`/api/v1/work-orders/${sbWo}`).set(dmOnly.auth)).status).toBe(404);
      expect((await request(app).get(`/api/v1/invoices/${sbInvoice._id}`).set(sbOnly.auth)).status).toBe(200);
    });

    it('does not let a restricted user create records in a firm they cannot access', async () => {
      expect((await request(app).post('/api/v1/tenders').set(dmOnly.auth).send(tenderBody(sbId, 'SNEAK'))).status).toBe(403);
      expect((await request(app).post('/api/v1/invoices').set(dmOnly.auth).send(invoiceBody(sbWo, 'SNEAK'))).status).toBe(404);
      expect(await Invoice.countDocuments()).toBe(0);
    });

    it('never lets a request body override the contract firm of a financial record', async () => {
      const res = await request(app).post('/api/v1/invoices').set(manager.auth).send({ ...invoiceBody(sbWo, 'MISMATCH'), firm: dmId });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FIRM_002');
      const ok = await request(app).post('/api/v1/invoices').set(manager.auth).send({ ...invoiceBody(sbWo, 'OK'), firm: sbId });
      expect(ok.status).toBe(201);
      expect(ok.body.data.firm).toBe(sbId);
    });
  });

  describe('financial isolation', () => {
    it('invoices take their contract\'s firm and are listed only within that firm', async () => {
      const sb = await request(app).post('/api/v1/invoices').set(manager.auth).send(invoiceBody(sbWo, 'SB'));
      const dm = await request(app).post('/api/v1/invoices').set(manager.auth).send(invoiceBody(dmWo, 'DM', 50000));
      expect(sb.body.data.firm).toBe(sbId);
      expect(dm.body.data.firm).toBe(dmId);

      const sbList = await request(app).get('/api/v1/invoices').set(manager.auth).set(SCOPE, sbId);
      expect(sbList.body.data.map((i: any) => i.invoiceNumber)).toEqual(['INV-SB']);
      const dmUserList = await request(app).get('/api/v1/invoices').set(dmOnly.auth);
      expect(dmUserList.body.data.map((i: any) => i.invoiceNumber)).toEqual(['INV-DM']);
    });

    it('advances take their contract\'s firm; an advance can never be adjusted against another firm\'s invoice', async () => {
      const advance = await request(app).post('/api/v1/contract-advances').set(manager.auth).send({
        workOrder: dmWo, recipientType: 'External', recipientName: 'DM site lead', amount: 60000, date: '2026-01-05', reason: 'Mobilisation',
      });
      expect(advance.status).toBe(201);
      expect(advance.body.data.firm).toBe(dmId);

      // Tampered data: an invoice on the same contract but stamped with the other firm.
      const tampered = await Invoice.create({ ...invoiceBody(dmWo, 'TAMPER'), firm: sbId, invoiceDate: new Date('2026-01-31'), createdBy: admin.id });
      const res = await request(app).post(`/api/v1/contract-advances/${advance.body.data._id}/adjustments`).set(manager.auth)
        .send({ invoice: tampered._id.toString(), amountAdjusted: 1000 });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FIRM_004');
      expect(await AdvanceAdjustment.countDocuments()).toBe(0);

      const proper = await createInvoiceDoc(dmWo, admin.id, 100000);
      const ok = await request(app).post(`/api/v1/contract-advances/${advance.body.data._id}/adjustments`).set(manager.auth)
        .send({ invoice: proper._id.toString(), amountAdjusted: 60000 });
      expect(ok.status).toBe(201);
      expect(ok.body.data.firm).toBe(dmId);
    });

    it('does not let a user of one firm adjust another firm\'s advance', async () => {
      const adv = await createAdvanceDoc(sbWo, admin.id, 10000);
      const inv = await createInvoiceDoc(sbWo, admin.id, 10000);
      const res = await request(app).post(`/api/v1/contract-advances/${adv._id}/adjustments`).set(dmOnly.auth)
        .send({ invoice: inv._id.toString(), amountAdjusted: 1000 });
      expect(res.status).toBe(404);
      expect((await ContractAdvance.findById(adv._id))!.totalAdjusted).toBe(0);
    });

    it('GEM fees take the contract\'s firm and reject a tender of the other firm', async () => {
      const dmTender = await Tender.create({ ...tenderBody(dmId, 'GT'), submissionDeadline: new Date('2026-12-01'), createdBy: admin.id });
      const cross = await request(app).post('/api/v1/gem-fees').set(manager.auth)
        .send({ workOrder: sbWo, tenderRef: dmTender.id, feeType: 'GEM Portal Fee', amount: 500, paymentDate: '2026-02-01' });
      expect(cross.status).toBe(400);
      const ok = await request(app).post('/api/v1/gem-fees').set(manager.auth)
        .send({ workOrder: dmWo, tenderRef: dmTender.id, feeType: 'GEM Portal Fee', amount: 500, paymentDate: '2026-02-01' });
      expect(ok.status).toBe(201);
      expect(ok.body.data.firm).toBe(dmId);
      expect((await request(app).get('/api/v1/gem-fees').set(sbOnly.auth)).body.meta.total).toBe(0);
    });

    it('reports totals per firm, and a combined total only as the sum of labelled per-firm rows', async () => {
      await createInvoiceDoc(sbWo, admin.id, 100000);
      await createInvoiceDoc(sbWo, admin.id, 20000, { invoiceNumber: 'INV-SB-2', billingMonth: '2026-02' });
      await createInvoiceDoc(dmWo, admin.id, 70000, { invoiceNumber: 'INV-DM-1' });
      await createInvoiceDoc(dmWo, admin.id, 99999, { invoiceNumber: 'INV-DM-X', status: 'Cancelled' });

      const all = await request(app).get('/api/v1/invoices/summary').set(manager.auth);
      const rows = Object.fromEntries(all.body.data.byFirm.map((r: any) => [r.firm.name, r.totalAmount]));
      expect(rows).toEqual({ 'Satish Bohidar': 120000, Dadamani: 70000 });
      expect(all.body.data.byFirm[0].firm.isPrimary).toBe(true);
      expect(all.body.data.combined.totalAmount).toBe(190000);

      const dmOnlySummary = await request(app).get('/api/v1/invoices/summary').set(dmOnly.auth);
      expect(dmOnlySummary.body.data.byFirm.map((r: any) => r.firm.name)).toEqual(['Dadamani']);
      expect(dmOnlySummary.body.data.combined.totalAmount).toBe(70000);

      const report = await request(app).get('/api/v1/reports').set(manager.auth).set(SCOPE, sbId);
      expect(report.status).toBe(200);
      expect(report.body.data.scopeLabel).toBe('Satish Bohidar');
      expect(report.body.data.financialByFirm.invoices.map((r: any) => [r.firm.name, r.totalInvoiced])).toEqual([['Satish Bohidar', 120000]]);
    });

    it('dashboard counts and money respect the firm scope and never contain placeholder figures', async () => {
      await request(app).post('/api/v1/tenders').set(manager.auth).send(tenderBody(sbId, 'D1'));
      await request(app).post('/api/v1/tenders').set(manager.auth).send(tenderBody(dmId, 'D2'));
      const sb = await request(app).get('/api/v1/dashboard/metrics').set(manager.auth).set(SCOPE, sbId);
      expect(sb.body.data.cards.totalTenders).toBe(1);
      expect(sb.body.data.cards.totalWorkOrders).toBe(1);
      expect(sb.body.data.charts.monthlyRevenue.every((m: any) => m.revenue === 0 && m.profit === 0)).toBe(true);
      const all = await request(app).get('/api/v1/dashboard/metrics').set(manager.auth);
      expect(all.body.data.cards.totalTenders).toBe(2);
    });
  });

  describe('vehicles: ownership vs contract firm', () => {
    it('records a cross-firm deployment with both firms and keeps ownership separate', async () => {
      const sbVehicle = (await createVehicle(admin.id, sbId))._id.toString();
      const res = await request(app).post(`/api/v1/vehicles/${sbVehicle}/allocations`).set(manager.auth)
        .send({ workOrder: dmWo, startDate: '2026-03-01', endDate: '2026-03-31' });
      expect(res.status).toBe(201);
      const alloc = await VehicleAllocation.findById(res.body.data._id).lean();
      expect(alloc!.ownerFirm!.toString()).toBe(sbId);
      expect(alloc!.contractFirm!.toString()).toBe(dmId);

      const dmVehicles = await request(app).get('/api/v1/vehicles').set(manager.auth).set(SCOPE, dmId);
      expect(dmVehicles.body.meta.total).toBe(0);

      const history = await request(app).get(`/api/v1/vehicles/${sbVehicle}/allocations`).set(manager.auth);
      expect(history.body.data[0].ownerFirm.name).toBe('Satish Bohidar');
      expect(history.body.data[0].contractFirm.name).toBe('Dadamani');
    });

    it('needs access to the owning firm to deploy a vehicle', async () => {
      const sbVehicle = (await createVehicle(admin.id, sbId))._id.toString();
      const res = await request(app).post(`/api/v1/vehicles/${sbVehicle}/allocations`).set(dmOnly.auth)
        .send({ workOrder: dmWo, startDate: '2026-03-01', endDate: '2026-03-31' });
      expect(res.status).toBe(404);
      expect(await VehicleAllocation.countDocuments()).toBe(0);
    });

    it('requires an owner firm when registering a vehicle', async () => {
      const body = {
        registrationNumber: 'OD02ZZ0001', chassisNumber: 'CH1', engineNumber: 'EN1', make: 'Tata', model: 'Signa',
        yearOfManufacture: 2022, vehicleType: 'Dumper / Tipper', fuelType: 'Diesel', capacityTonnes: 25, currentLocation: 'Yard',
        insurance: { expiryDate: '2030-01-01' }, fitness: { expiryDate: '2030-01-01' }, permit: { expiryDate: '2030-01-01' },
        tax: { expiryDate: '2030-01-01' }, puc: { expiryDate: '2030-01-01' },
      };
      expect((await request(app).post('/api/v1/vehicles').set(manager.auth).send(body)).status).toBe(400);
      const ok = await request(app).post('/api/v1/vehicles').set(manager.auth).send({ ...body, ownerFirm: dmId });
      expect(ok.status).toBe(201);
      expect(ok.body.data.ownerFirm).toBe(dmId);
    });
  });

  describe('workforce belongs to one firm', () => {
    it('blocks assigning a person to another firm\'s contract', async () => {
      const person = await request(app).post('/api/v1/workforce').set(manager.auth).send({ name: 'Sunil', type: 'Operator', firm: sbId });
      expect(person.status).toBe(201);
      const cross = await request(app).post(`/api/v1/workforce/${person.body.data._id}/assign`).set(manager.auth).send({ workOrder: dmWo });
      expect(cross.status).toBe(409);
      const same = await request(app).post(`/api/v1/workforce/${person.body.data._id}/assign`).set(manager.auth).send({ workOrder: sbWo });
      expect(same.status).toBe(201);
    });
  });

  describe('documents: the one record type that may be shared by both firms', () => {
    const pdf = Buffer.from('%PDF-1.4 shared');
    const upload = (user: TestUser, firms: string[]) => {
      const req = request(app).post('/api/v1/documents/upload').set(user.auth).field('title', 'Shared compliance cert');
      firms.forEach((f) => req.field('firms', f));
      return req.attach('file', pdf, { filename: 'cert.pdf', contentType: 'application/pdf' });
    };

    it('lets a shared document be seen by both firms but changed only by someone with access to both', async () => {
      const shared = await upload(manager, [sbId, dmId]);
      expect(shared.status).toBe(201);
      expect(shared.body.data.firms.sort()).toEqual([sbId, dmId].sort());

      expect((await request(app).get('/api/v1/documents').set(sbOnly.auth)).body.meta.total).toBe(1);
      expect((await request(app).get('/api/v1/documents').set(dmOnly.auth)).body.meta.total).toBe(1);
      const replace = await request(app).post(`/api/v1/documents/${shared.body.data._id}/replace`).set(dmOnly.auth)
        .attach('file', pdf, { filename: 'cert-v2.pdf', contentType: 'application/pdf' });
      expect(replace.status).toBe(404);
    });

    it('requires a firm on upload and rejects firms the user cannot access', async () => {
      expect((await upload(manager, [])).status).toBe(400);
      expect((await upload(dmOnly, [sbId])).status).toBe(403);
    });

    it('lets a legacy document without firms be filed under a firm intentionally', async () => {
      const legacy = await DocumentRecord.create({
        title: 'Old doc', folder: 'General', originalFileName: 'old.pdf', storedFileName: 'old.pdf', filePath: '/x/old.pdf',
        fileSize: 10, mimeType: 'application/pdf', uploadedBy: admin.id,
      });
      expect((await request(app).get('/api/v1/documents').set(dmOnly.auth)).body.meta.total).toBe(0);
      expect((await request(app).patch(`/api/v1/documents/${legacy.id}/firms`).set(dmOnly.auth).send({ firms: [dmId] })).status).toBe(404);
      const filed = await request(app).patch(`/api/v1/documents/${legacy.id}/firms`).set(manager.auth).send({ firms: [dmId] });
      expect(filed.status).toBe(200);
      expect((await request(app).get('/api/v1/documents').set(dmOnly.auth)).body.meta.total).toBe(1);
    });
  });

  describe('existing records without a firm', () => {
    let legacyWo: string;
    beforeEach(async () => {
      legacyWo = (await createWorkOrder(admin.id, { firm: undefined }))._id.toString();
    });

    it('stay visible to all-firm users, hidden from restricted users, and are listed under "unassigned"', async () => {
      const unassigned = await request(app).get('/api/v1/work-orders').set(manager.auth).set(SCOPE, 'unassigned');
      expect(unassigned.body.data.map((w: any) => w._id)).toEqual([legacyWo]);
      expect((await request(app).get(`/api/v1/work-orders/${legacyWo}`).set(manager.auth)).status).toBe(200);
      expect((await request(app).get(`/api/v1/work-orders/${legacyWo}`).set(dmOnly.auth)).status).toBe(404);
    });

    it('cannot carry new financial records until a firm is assigned', async () => {
      const res = await request(app).post('/api/v1/invoices').set(manager.auth).send(invoiceBody(legacyWo, 'LEG'));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FIRM_001');
    });

    it('when a firm is assigned intentionally, its legacy financial records inherit it; afterwards the firm is fixed', async () => {
      const legacyInvoice = await Invoice.create({ ...invoiceBody(legacyWo, 'OLD'), invoiceDate: new Date('2026-01-31'), createdBy: admin.id });
      const legacyFee = await GemFee.create({ workOrder: legacyWo, feeType: 'GEM Portal Fee', amount: 100, paymentDate: new Date(), createdBy: admin.id });

      const assign = await request(app).put(`/api/v1/work-orders/${legacyWo}`).set(manager.auth).send({ firm: dmId });
      expect(assign.status).toBe(200);
      expect((await WorkOrder.findById(legacyWo))!.firm!.toString()).toBe(dmId);
      expect((await Invoice.findById(legacyInvoice._id))!.firm!.toString()).toBe(dmId);
      expect((await GemFee.findById(legacyFee._id))!.firm!.toString()).toBe(dmId);

      const change = await request(app).put(`/api/v1/work-orders/${legacyWo}`).set(manager.auth).send({ firm: sbId });
      expect(change.status).toBe(409);
      expect((await WorkOrder.findById(legacyWo))!.firm!.toString()).toBe(dmId);
    });

    it('are never assigned a firm implicitly by other edits', async () => {
      const edit = await request(app).put(`/api/v1/work-orders/${legacyWo}`).set(manager.auth).send({ title: 'Renamed contract' });
      expect(edit.status).toBe(200);
      expect((await WorkOrder.findById(legacyWo))!.firm).toBeUndefined();
    });
  });

  it('blocks deleting a contract that has financial records', async () => {
    await createInvoiceDoc(sbWo, admin.id, 1000);
    expect((await request(app).delete(`/api/v1/work-orders/${sbWo}`).set(admin.auth)).status).toBe(409);
    expect(await WorkOrder.countDocuments({ _id: sbWo })).toBe(1);
  });

  it('does not let a tender change firm once it has an award', async () => {
    const t = await request(app).post('/api/v1/tenders').set(manager.auth).send(tenderBody(sbId, 'AW'));
    const award = await request(app).post('/api/v1/awarded-tenders').set(manager.auth).send({
      tender: t.body.data._id, tenderNumber: 'TND-AW', clientName: 'C', title: 'T', awardValue: 500000, estimatedCost: 400000,
      awardedDate: '2026-01-01', startDate: '2026-01-10', completionDeadline: '2026-06-30', contractNumber: 'CN-AW-1',
    });
    expect(award.status).toBe(201);
    expect(award.body.data.firm).toBe(sbId);
    expect((await request(app).put(`/api/v1/tenders/${t.body.data._id}`).set(manager.auth).send({ firm: dmId })).status).toBe(409);
    expect((await Tender.findById(t.body.data._id))!.firm!.toString()).toBe(sbId);
  });
});
