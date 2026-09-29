import request from 'supertest';
import {
  app, startTestDb, stopTestDb, clearDb, createUser, createWorkOrder, createAdvanceDoc, TestUser,
} from '../helpers/test-app.js';
import { Invoice } from '../../models/invoice.model.js';
import { WorkOrder } from '../../models/work-order.model.js';

describe('Invoices (integration)', () => {
  let admin: TestUser;
  let manager: TestUser;
  let viewer: TestUser;
  let workOrderId: string;

  const body = (extra: Record<string, unknown> = {}) => ({
    workOrder: workOrderId,
    billingMonth: '2026-01',
    invoiceNumber: 'INV-2026-001',
    invoiceDate: '2026-01-31',
    amount: 100000,
    ...extra,
  });
  const create = (extra: Record<string, unknown> = {}, user: TestUser = manager) =>
    request(app).post('/api/v1/invoices').set(user.auth).send(body(extra));
  const update = (id: string, patch: Record<string, unknown>, user: TestUser = manager) =>
    request(app).put(`/api/v1/invoices/${id}`).set(user.auth).send(patch);

  async function invoiceWithAdjustment(amount: number, adjusted: number) {
    const inv = await create({ invoiceNumber: `INV-ADJ-${Date.now()}-${Math.random()}`, amount });
    const adv = await createAdvanceDoc(workOrderId, admin.id, adjusted);
    const res = await request(app)
      .post(`/api/v1/contract-advances/${adv._id}/adjustments`)
      .set(manager.auth)
      .send({ invoice: inv.body.data._id, amountAdjusted: adjusted });
    expect(res.status).toBe(201);
    return inv.body.data._id as string;
  }

  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => {
    await clearDb();
    admin = await createUser('Admin');
    manager = await createUser('Manager');
    viewer = await createUser('Viewer');
    workOrderId = (await createWorkOrder(admin.id))._id.toString();
  });

  it('keeps each billing month as a distinct invoice record for the same contract', async () => {
    expect((await create({ billingMonth: '2026-01', invoiceNumber: 'INV-JAN' })).status).toBe(201);
    expect((await create({ billingMonth: '2026-02', invoiceNumber: 'INV-FEB', amount: 90000 })).status).toBe(201);

    const all = await request(app).get('/api/v1/invoices').query({ workOrder: workOrderId }).set(viewer.auth);
    expect(all.body.meta.total).toBe(2);
    const feb = await request(app).get('/api/v1/invoices').query({ billingMonth: '2026-02' }).set(viewer.auth);
    expect(feb.body.data.map((i: any) => i.invoiceNumber)).toEqual(['INV-FEB']);
  });

  it('rejects duplicate invoice numbers, including two concurrent creates', async () => {
    expect((await create()).status).toBe(201);
    expect((await create({ billingMonth: '2026-02' })).status).toBe(409);

    const racing = await Promise.all([create({ invoiceNumber: 'INV-RACE' }), create({ invoiceNumber: 'INV-RACE' })]);
    expect(racing.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await Invoice.countDocuments({ invoiceNumber: 'INV-RACE' })).toBe(1);
  });

  it.each([
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -1 }],
    ['bad billing month', { billingMonth: '2026-13' }],
    ['bad invoice date', { invoiceDate: 'not-a-date' }],
    ['malformed contract id', { workOrder: 'abc' }],
    ['starting as Paid', { status: 'Paid' }],
  ])('rejects invalid invoice creation: %s', async (_l, extra) => {
    expect((await create(extra)).status).toBe(400);
  });

  it('returns 404 for an unknown contract and enforces invoice:create', async () => {
    expect((await create({ workOrder: '64b000000000000000000000' })).status).toBe(404);
    expect((await create({}, viewer)).status).toBe(403);
    expect((await request(app).post('/api/v1/invoices').send(body())).status).toBe(401);
  });

  describe('PUT /invoices/:id', () => {
    it('updates allowed fields', async () => {
      const inv = await create();
      const res = await update(inv.body.data._id, { amount: 120000, status: 'Sent', notes: 'revised' });
      expect(res.status).toBe(200);
      expect(res.body.data.amount).toBe(120000);
      expect(res.body.data.status).toBe('Sent');
    });

    it('refuses to move an invoice to another contract or write ledger/system fields', async () => {
      const inv = await create();
      const other = await createWorkOrder(admin.id);
      expect((await update(inv.body.data._id, { workOrder: other._id.toString() })).status).toBe(400);
      expect((await update(inv.body.data._id, { totalAdjusted: 5000 })).status).toBe(400);
      expect((await update(inv.body.data._id, { createdBy: viewer.id })).status).toBe(400);
      const stored = await Invoice.findById(inv.body.data._id).lean();
      expect(stored!.workOrder.toString()).toBe(workOrderId);
      expect(stored!.totalAdjusted).toBe(0);
    });

    it('never lets the amount drop below what has already been adjusted (no negative payable)', async () => {
      const id = await invoiceWithAdjustment(100000, 60000);
      const res = await update(id, { amount: 50000 });
      expect(res.status).toBe(400);
      expect((await Invoice.findById(id).lean())!.amount).toBe(100000);
      expect((await update(id, { amount: 60000 })).status).toBe(200);
    });

    it('does not allow cancelling an invoice that has advance adjustments', async () => {
      const id = await invoiceWithAdjustment(100000, 60000);
      expect((await update(id, { status: 'Cancelled' })).status).toBe(400);
      expect((await Invoice.findById(id).lean())!.status).toBe('Partially Paid');
    });

    it('allows cancelling an unadjusted invoice, after which only notes can change', async () => {
      const inv = await create();
      const id = inv.body.data._id;
      expect((await update(id, { status: 'Cancelled' })).status).toBe(200);
      expect((await update(id, { amount: 5 })).status).toBe(400);
      expect((await update(id, { status: 'Sent' })).status).toBe(400);
      expect((await update(id, { notes: 'cancelled: duplicate billing' })).status).toBe(200);
    });

    it.each([
      ['empty body', {}],
      ['zero amount', { amount: 0 }],
      ['bad billing month', { billingMonth: '26-1' }],
      ['unknown status', { status: 'Refunded' }],
    ])('rejects invalid updates: %s', async (_l, patch) => {
      const inv = await create();
      expect((await update(inv.body.data._id, patch)).status).toBe(400);
    });

    it('rejects renaming to an existing invoice number, and enforces invoice:update', async () => {
      await create({ invoiceNumber: 'INV-A' });
      const b = await create({ invoiceNumber: 'INV-B' });
      expect((await update(b.body.data._id, { invoiceNumber: 'INV-A' })).status).toBe(409);
      expect((await update(b.body.data._id, { notes: 'x' }, viewer)).status).toBe(403);
    });
  });

  it('refuses to delete an invoice that has adjustments', async () => {
    const id = await invoiceWithAdjustment(1000, 500);
    expect((await request(app).delete(`/api/v1/invoices/${id}`).set(admin.auth)).status).toBe(400);
    expect(await Invoice.countDocuments({ _id: id })).toBe(1);
  });

  it('keeps the legacy WorkOrder invoice endpoint working alongside the Invoice model', async () => {
    const legacy = await request(app)
      .post(`/api/v1/work-orders/${workOrderId}/invoice`)
      .set(manager.auth)
      .send({ invoiceNumber: 'LEGACY-001', invoicedAmount: 250000, invoiceStatus: 'Sent' });
    expect(legacy.status).toBe(200);

    const wo = await WorkOrder.findById(workOrderId).lean();
    expect(wo!.invoiceNumber).toBe('LEGACY-001');
    expect(wo!.invoicedAmount).toBe(250000);
    expect(await Invoice.countDocuments()).toBe(0);

    expect((await create({ invoiceNumber: 'INV-NEW-001' })).status).toBe(201);
    expect((await WorkOrder.findById(workOrderId).lean())!.invoiceNumber).toBe('LEGACY-001');
  });
});
