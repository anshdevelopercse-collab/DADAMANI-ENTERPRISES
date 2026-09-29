import request from 'supertest';
import { app, startTestDb, stopTestDb, clearDb, createUser, createWorkOrder, TestUser } from '../helpers/test-app.js';
import { GemFee } from '../../models/gem-fee.model.js';

describe('GEM portal fees (integration)', () => {
  let admin: TestUser;
  let manager: TestUser;
  let viewer: TestUser;
  let workOrderId: string;

  const fee = (extra: Record<string, unknown> = {}) => ({
    workOrder: workOrderId,
    feeType: 'GEM Portal Fee',
    amount: 12345.67,
    paymentDate: '2026-02-10',
    ...extra,
  });
  const create = (extra: Record<string, unknown> = {}, user: TestUser = manager) =>
    request(app).post('/api/v1/gem-fees').set(user.auth).send(fee(extra));

  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => {
    await clearDb();
    admin = await createUser('Admin');
    manager = await createUser('Manager');
    viewer = await createUser('Viewer');
    workOrderId = (await createWorkOrder(admin.id))._id.toString();
  });

  it('records the actual amount with no percentage at all', async () => {
    const res = await create();
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(12345.67);
    expect(res.body.data.ratePercent).toBeUndefined();
  });

  it('stores the actual amount independently of any percentage given (never derived)', async () => {
    const res = await create({ ratePercent: 0.5, amount: 999.99 });
    expect(res.status).toBe(201);
    const stored = await GemFee.findById(res.body.data._id).lean();
    expect(stored!.amount).toBe(999.99);
    expect(stored!.ratePercent).toBe(0.5);
  });

  it.each([
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -100 }],
    ['missing amount', { amount: undefined }],
    ['rate above 100%', { ratePercent: 150 }],
    ['negative rate', { ratePercent: -1 }],
    ['invalid payment date', { paymentDate: 'yesterday' }],
    ['malformed contract id', { workOrder: 'x' }],
    ['unknown tender reference', { tenderRef: '64b000000000000000000000' }],
  ])('rejects %s', async (_l, extra) => {
    expect((await create(extra)).status).toBe(400);
    expect(await GemFee.countDocuments()).toBe(0);
  });

  it('enforces authentication and gemfee permissions', async () => {
    expect((await request(app).post('/api/v1/gem-fees').send(fee())).status).toBe(401);
    expect((await create({}, viewer)).status).toBe(403);
    expect((await request(app).get('/api/v1/gem-fees').set(viewer.auth)).status).toBe(200);

    const created = await create();
    expect((await request(app).delete(`/api/v1/gem-fees/${created.body.data._id}`).set(manager.auth)).status).toBe(403);
    expect((await request(app).delete(`/api/v1/gem-fees/${created.body.data._id}`).set(admin.auth)).status).toBe(200);
  });

  it('filters by fee type (previously ignored by the API)', async () => {
    await create({ feeType: 'GEM Portal Fee' });
    await create({ feeType: 'Transaction Charge', amount: 100 });
    await create({ feeType: 'Transaction Charge', amount: 200 });

    const res = await request(app).get('/api/v1/gem-fees').query({ feeType: 'Transaction Charge' }).set(viewer.auth);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data.every((f: any) => f.feeType === 'Transaction Charge')).toBe(true);

    const all = await request(app).get('/api/v1/gem-fees').set(viewer.auth);
    expect(all.body.meta.total).toBe(3);
  });
});
