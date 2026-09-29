import request from 'supertest';
import {
  app, startTestDb, stopTestDb, clearDb, createUser, createWorkOrder, createInvoiceDoc, createAdvanceDoc, TestUser,
} from '../helpers/test-app.js';
import { ContractAdvance } from '../../models/contract-advance.model.js';
import { AdvanceAdjustment } from '../../models/advance-adjustment.model.js';
import { Invoice } from '../../models/invoice.model.js';
import { Workforce } from '../../models/workforce.model.js';
import { AuditLog } from '../../models/audit-log.model.js';

describe('Contract advances and adjustments (integration, real transactions)', () => {
  let admin: TestUser;
  let manager: TestUser;
  let viewer: TestUser;
  let workOrderId: string;

  const adjust = (advanceId: string, invoiceId: string, amountAdjusted: number, user: TestUser = manager) =>
    request(app).post(`/api/v1/contract-advances/${advanceId}/adjustments`).set(user.auth).send({ invoice: invoiceId, amountAdjusted });

  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => {
    await clearDb();
    admin = await createUser('Admin');
    manager = await createUser('Manager');
    viewer = await createUser('Viewer');
    workOrderId = (await createWorkOrder(admin.id))._id.toString();
  });

  describe('creating advances', () => {
    const base = () => ({ workOrder: workOrderId, recipientType: 'External', recipientName: 'Suresh (site in-charge)', amount: 60000, date: '2026-01-05', reason: 'Mobilisation before first bill' });

    it('records an external advance', async () => {
      const res = await request(app).post('/api/v1/contract-advances').set(manager.auth).send(base());
      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(60000);
      expect(res.body.data.totalAdjusted).toBe(0);
      expect(res.body.data.recipientRef).toBeUndefined();
    });

    it.each([
      ['zero', 0],
      ['negative', -500],
      ['more than 2 decimals', 100.123],
      ['non-numeric', '60000'],
    ])('rejects a %s amount', async (_l, amount) => {
      const res = await request(app).post('/api/v1/contract-advances').set(manager.auth).send({ ...base(), amount });
      expect(res.status).toBe(400);
      expect(await ContractAdvance.countDocuments()).toBe(0);
    });

    it('rejects an external advance without a recipient name, or with a recipientRef', async () => {
      expect((await request(app).post('/api/v1/contract-advances').set(manager.auth).send({ ...base(), recipientName: '' })).status).toBe(400);
      expect((await request(app).post('/api/v1/contract-advances').set(manager.auth).send({ ...base(), recipientRef: admin.id })).status).toBe(400);
    });

    it('requires a real recipientRef for Workforce and User recipients and uses the referenced name', async () => {
      const member = await Workforce.create({ name: 'Ramesh Das', type: 'Supervisor' });

      const missingRef = await request(app).post('/api/v1/contract-advances').set(manager.auth).send({ ...base(), recipientType: 'Workforce', recipientName: undefined });
      expect(missingRef.status).toBe(400);

      const unknownRef = await request(app).post('/api/v1/contract-advances').set(manager.auth)
        .send({ ...base(), recipientType: 'Workforce', recipientRef: '64b000000000000000000000' });
      expect(unknownRef.status).toBe(400);

      const wrongKind = await request(app).post('/api/v1/contract-advances').set(manager.auth)
        .send({ ...base(), recipientType: 'Workforce', recipientRef: admin.id });
      expect(wrongKind.status).toBe(400);

      const ok = await request(app).post('/api/v1/contract-advances').set(manager.auth)
        .send({ ...base(), recipientType: 'Workforce', recipientRef: member._id.toString(), recipientName: 'Spoofed Name' });
      expect(ok.status).toBe(201);
      expect(ok.body.data.recipientName).toBe('Ramesh Das');

      const userOk = await request(app).post('/api/v1/contract-advances').set(manager.auth)
        .send({ ...base(), recipientType: 'User', recipientRef: viewer.id });
      expect(userOk.status).toBe(201);
    });

    it('rejects advances to a terminated workforce member', async () => {
      const member = await Workforce.create({ name: 'Former Staff', type: 'Driver', status: 'Terminated' });
      const res = await request(app).post('/api/v1/contract-advances').set(manager.auth)
        .send({ ...base(), recipientType: 'Workforce', recipientRef: member._id.toString() });
      expect(res.status).toBe(400);
    });

    it('enforces authentication and advance:create permission', async () => {
      expect((await request(app).post('/api/v1/contract-advances').send(base())).status).toBe(401);
      expect((await request(app).post('/api/v1/contract-advances').set(viewer.auth).send(base())).status).toBe(403);
      expect(await ContractAdvance.countDocuments()).toBe(0);
    });
  });

  describe('adjusting advances against invoices', () => {
    it('business example: ₹60,000 advance against a ₹1,00,000 invoice leaves ₹40,000 payable and ₹0 advance', async () => {
      const advance = await createAdvanceDoc(workOrderId, admin.id, 60000);
      const invoice = await createInvoiceDoc(workOrderId, admin.id, 100000);

      const res = await adjust(advance._id.toString(), invoice._id.toString(), 60000);
      expect(res.status).toBe(201);

      const inv = await Invoice.findById(invoice._id).lean();
      const adv = await ContractAdvance.findById(advance._id).lean();
      expect(inv!.amount).toBe(100000);
      expect(inv!.totalAdjusted).toBe(60000);
      expect(inv!.amount - inv!.totalAdjusted).toBe(40000);
      expect(inv!.status).toBe('Partially Paid');
      expect(adv!.amount - adv!.totalAdjusted).toBe(0);

      const viaApi = await request(app).get(`/api/v1/invoices/${invoice._id}/adjustments`).set(viewer.auth);
      expect(viaApi.status).toBe(200);
      expect(viaApi.body.data).toHaveLength(1);
      expect(viaApi.body.data[0].amountAdjusted).toBe(60000);

      const audit = await AuditLog.findOne({ entityId: res.body.data._id }).lean();
      expect(audit?.description).toContain('60000');
    });

    it('supports partial adjustments across several month-wise invoices, then blocks over-adjustment', async () => {
      const advance = await createAdvanceDoc(workOrderId, admin.id, 50000);
      const jan = await createInvoiceDoc(workOrderId, admin.id, 30000, { billingMonth: '2026-01' });
      const feb = await createInvoiceDoc(workOrderId, admin.id, 40000, { billingMonth: '2026-02' });
      const advId = advance._id.toString();

      expect((await adjust(advId, jan._id.toString(), 30000)).status).toBe(201);
      expect((await adjust(advId, feb._id.toString(), 20000)).status).toBe(201);

      expect((await Invoice.findById(jan._id))!.status).toBe('Paid');
      const febDoc = (await Invoice.findById(feb._id))!;
      expect(febDoc.status).toBe('Partially Paid');
      expect(febDoc.amount - febDoc.totalAdjusted).toBe(20000);

      const exceeded = await adjust(advId, feb._id.toString(), 1);
      expect(exceeded.status).toBe(400);
      expect(exceeded.body.message).toMatch(/remaining advance/i);

      const timeline = await request(app).get(`/api/v1/contract-advances/${advId}/adjustments`).set(viewer.auth);
      expect(timeline.body.data).toHaveLength(2);
    });

    it('rejects an adjustment larger than the invoice outstanding amount', async () => {
      const advance = await createAdvanceDoc(workOrderId, admin.id, 100000);
      const invoice = await createInvoiceDoc(workOrderId, admin.id, 20000);
      const res = await adjust(advance._id.toString(), invoice._id.toString(), 25000);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/remaining payable/i);
      expect(await AdvanceAdjustment.countDocuments()).toBe(0);
    });

    it('rejects adjustments against a cancelled invoice', async () => {
      const advance = await createAdvanceDoc(workOrderId, admin.id, 10000);
      const invoice = await createInvoiceDoc(workOrderId, admin.id, 10000, { status: 'Cancelled' });
      const res = await adjust(advance._id.toString(), invoice._id.toString(), 5000);
      expect(res.status).toBe(400);
      expect((await Invoice.findById(invoice._id))!.status).toBe('Cancelled');
      expect(await AdvanceAdjustment.countDocuments()).toBe(0);
    });

    it('rejects adjustments across different contracts', async () => {
      const otherWo = await createWorkOrder(admin.id);
      const advance = await createAdvanceDoc(workOrderId, admin.id, 10000);
      const invoice = await createInvoiceDoc(otherWo._id.toString(), admin.id, 10000);
      expect((await adjust(advance._id.toString(), invoice._id.toString(), 5000)).status).toBe(400);
    });

    it.each([[0], [-10], [10.555]])('rejects an invalid adjustment amount %p', async (amount) => {
      const advance = await createAdvanceDoc(workOrderId, admin.id, 10000);
      const invoice = await createInvoiceDoc(workOrderId, admin.id, 10000);
      expect((await adjust(advance._id.toString(), invoice._id.toString(), amount)).status).toBe(400);
    });

    it('enforces advance:adjust permission', async () => {
      const advance = await createAdvanceDoc(workOrderId, admin.id, 10000);
      const invoice = await createInvoiceDoc(workOrderId, admin.id, 10000);
      expect((await adjust(advance._id.toString(), invoice._id.toString(), 100, viewer)).status).toBe(403);
      expect((await request(app).post(`/api/v1/contract-advances/${advance._id}/adjustments`).send({ invoice: invoice._id, amountAdjusted: 1 })).status).toBe(401);
    });

    it('serialises concurrent adjustments so the advance is never over-drawn', async () => {
      const advance = await createAdvanceDoc(workOrderId, admin.id, 10000);
      const invoice = await createInvoiceDoc(workOrderId, admin.id, 100000);

      const results = await Promise.all(
        Array.from({ length: 5 }, () => adjust(advance._id.toString(), invoice._id.toString(), 4000))
      );
      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 201, 400, 400, 400]);

      const ledgerTotal = (await AdvanceAdjustment.find({ advance: advance._id }).lean()).reduce((s, a) => s + a.amountAdjusted, 0);
      const adv = await ContractAdvance.findById(advance._id).lean();
      const inv = await Invoice.findById(invoice._id).lean();
      expect(ledgerTotal).toBe(8000);
      expect(adv!.totalAdjusted).toBe(8000);
      expect(inv!.totalAdjusted).toBe(8000);
    });

    it('rolls back the ledger row and advance total when a later step of the transaction fails', async () => {
      const advance = await createAdvanceDoc(workOrderId, admin.id, 10000);
      const invoice = await createInvoiceDoc(workOrderId, admin.id, 10000);

      const spy = jest.spyOn(Invoice.prototype, 'save').mockRejectedValueOnce(new Error('simulated failure after ledger write'));
      try {
        const res = await adjust(advance._id.toString(), invoice._id.toString(), 4000);
        expect(res.status).toBe(500);
      } finally {
        spy.mockRestore();
      }

      expect(await AdvanceAdjustment.countDocuments()).toBe(0);
      expect((await ContractAdvance.findById(advance._id).lean())!.totalAdjusted).toBe(0);
      expect((await Invoice.findById(invoice._id).lean())!.totalAdjusted).toBe(0);

      // And the same adjustment succeeds once the failure is gone.
      expect((await adjust(advance._id.toString(), invoice._id.toString(), 4000)).status).toBe(201);
    });
  });

  describe('summary and deletion', () => {
    it('summarises every matching advance, not just the current page', async () => {
      const a1 = await createAdvanceDoc(workOrderId, admin.id, 60000);
      await createAdvanceDoc(workOrderId, admin.id, 25000);
      await createAdvanceDoc(workOrderId, admin.id, 15000);
      const invoice = await createInvoiceDoc(workOrderId, admin.id, 100000);
      await adjust(a1._id.toString(), invoice._id.toString(), 60000);

      const page = await request(app).get('/api/v1/contract-advances').query({ limit: 2 }).set(viewer.auth);
      expect(page.body.data).toHaveLength(2);
      expect(page.body.meta.total).toBe(3);

      const summary = await request(app).get('/api/v1/contract-advances/summary').set(viewer.auth);
      expect(summary.status).toBe(200);
      expect(summary.body.data.combined).toEqual({ count: 3, totalAmount: 100000, totalAdjusted: 60000, totalUnadjusted: 40000, fullyAdjustedCount: 1 });
      expect(summary.body.data.byFirm).toHaveLength(1);

      const filtered = await request(app).get('/api/v1/contract-advances/summary').query({ workOrder: workOrderId }).set(viewer.auth);
      expect(filtered.body.data.combined.count).toBe(3);
      const otherWo = await createWorkOrder(admin.id);
      const empty = await request(app).get('/api/v1/contract-advances/summary').query({ workOrder: otherWo._id.toString() }).set(viewer.auth);
      expect(empty.body.data.combined.count).toBe(0);
    });

    it('allows deleting an unadjusted advance but never one with ledger entries', async () => {
      const used = await createAdvanceDoc(workOrderId, admin.id, 5000);
      const unused = await createAdvanceDoc(workOrderId, admin.id, 5000);
      const invoice = await createInvoiceDoc(workOrderId, admin.id, 5000);
      await adjust(used._id.toString(), invoice._id.toString(), 1000);

      expect((await request(app).delete(`/api/v1/contract-advances/${used._id}`).set(admin.auth)).status).toBe(400);
      expect((await request(app).delete(`/api/v1/contract-advances/${unused._id}`).set(manager.auth)).status).toBe(403);
      expect((await request(app).delete(`/api/v1/contract-advances/${unused._id}`).set(admin.auth)).status).toBe(200);
      expect(await ContractAdvance.countDocuments()).toBe(1);
    });
  });
});
