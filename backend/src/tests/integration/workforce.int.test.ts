import request from 'supertest';
import { app, startTestDb, stopTestDb, clearDb, createUser, defaultFirmId, TestUser } from '../helpers/test-app.js';
import { Workforce } from '../../models/workforce.model.js';
import { Driver } from '../../models/driver.model.js';

describe('Workforce (integration)', () => {
  let admin: TestUser;
  let manager: TestUser;
  let viewer: TestUser;
  let firmId: string;

  const create = (body: Record<string, unknown>, user: TestUser = manager) =>
    request(app).post('/api/v1/workforce').set(user.auth).send({ firm: firmId, ...body });
  const update = (id: string, body: Record<string, unknown>, user: TestUser = manager) =>
    request(app).put(`/api/v1/workforce/${id}`).set(user.auth).send(body);

  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => {
    await clearDb();
    admin = await createUser('Admin');
    manager = await createUser('Manager');
    viewer = await createUser('Viewer');
    firmId = await defaultFirmId();
  });

  it.each(['Driver', 'Operator', 'Mechanic', 'Supervisor', 'Other'])('creates and retrieves a %s', async (type) => {
    const res = await create({ name: `Test ${type}`, type, phone: '9000000000' });
    expect(res.status).toBe(201);
    const got = await request(app).get(`/api/v1/workforce/${res.body.data._id}`).set(viewer.auth);
    expect(got.status).toBe(200);
    expect(got.body.data.type).toBe(type);
  });

  it('rejects types outside the five supported categories', async () => {
    expect((await create({ name: 'Someone', type: 'Accountant' })).status).toBe(400);
  });

  it('filters the list by type and ignores unknown type values', async () => {
    expect((await create({ name: 'Anil', type: 'Driver' })).status).toBe(201);
    expect((await create({ name: 'Bikash', type: 'Mechanic' })).status).toBe(201);
    const drivers = await request(app).get('/api/v1/workforce').query({ type: 'Driver' }).set(viewer.auth);
    expect(drivers.body.data.map((w: any) => w.name)).toEqual(['Anil']);
    const bogus = await request(app).get('/api/v1/workforce').query({ type: { $ne: 'x' } }).set(viewer.auth);
    expect(bogus.status).toBe(200);
    expect(bogus.body.meta.total).toBe(2);
  });

  describe('PUT /workforce/:id validation', () => {
    let id: string;
    beforeEach(async () => {
      id = (await create({ name: 'Edit Me', type: 'Driver', licenseNumber: 'od1234' })).body.data._id;
    });

    it('updates allowed fields', async () => {
      const res = await update(id, { phone: '9111111111', status: 'On Leave', type: 'Operator' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('On Leave');
      expect(res.body.data.type).toBe('Operator');
    });

    it.each([
      ['invalid type', { type: 'Pilot' }],
      ['invalid status', { status: 'Fired' }],
      ['system field legacyDriverId', { legacyDriverId: '64b000000000000000000000' }],
      ['system field createdBy', { createdBy: '64b000000000000000000000' }],
      ['unknown field', { salary: 1 }],
      ['empty body', {}],
      ['rating out of range', { rating: 9 }],
      ['unknown firm', { firm: '64b000000000000000000000' }],
    ])('rejects %s', async (_l, patch) => {
      expect((await update(id, patch)).status).toBe(400);
      const stored = await Workforce.findById(id).lean();
      expect(stored!.type).toBe('Driver');
      expect((stored as any).legacyDriverId).toBeUndefined();
    });

    it('rejects a license number already used by someone else', async () => {
      await create({ name: 'Other', type: 'Driver', licenseNumber: 'OD9999' });
      expect((await update(id, { licenseNumber: 'od9999' })).status).toBe(409);
    });

    it('returns 400/404 for malformed/unknown ids and 403 without workforce:update', async () => {
      expect((await update('nope', { phone: '1' })).status).toBe(400);
      expect((await update('64b000000000000000000000', { phone: '1' })).status).toBe(404);
      expect((await update(id, { phone: '1' }, viewer)).status).toBe(403);
    });
  });

  it('leaves the legacy Driver module untouched and working', async () => {
    await create({ name: 'Generic Driver', type: 'Driver', licenseNumber: 'GEN-1' });
    expect(await Driver.countDocuments()).toBe(0);

    const created = await request(app)
      .post('/api/v1/vehicles/drivers/create')
      .set(manager.auth)
      .send({ name: 'Legacy Driver', licenseNumber: 'LEG-1', licenseExpiry: '2030-01-01', phone: '9222222222' });
    expect(created.status).toBe(201);

    const list = await request(app).get('/api/v1/vehicles/drivers/list').set(viewer.auth);
    expect(list.status).toBe(200);
    expect(list.body.data.map((d: any) => d.name)).toEqual(['Legacy Driver']);
    expect(await Workforce.countDocuments({ name: 'Legacy Driver' })).toBe(0);
  });
});
