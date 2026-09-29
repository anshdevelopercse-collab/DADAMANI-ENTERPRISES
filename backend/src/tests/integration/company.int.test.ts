import request from 'supertest';
import { app, startTestDb, stopTestDb, clearDb, createUser, TestUser } from '../helpers/test-app.js';
import { Company } from '../../models/company.model.js';
import { Workforce } from '../../models/workforce.model.js';
import { AuditLog } from '../../models/audit-log.model.js';

describe('Company / legal entity API (integration)', () => {
  let admin: TestUser;
  let manager: TestUser;
  let viewer: TestUser;

  const validCompany = {
    name: 'Test Entity Pvt Ltd',
    code: 'te-01',
    gstNumber: '21abcde1234f1z5',
    panNumber: 'ABCDE1234F',
    address: '1 Test Road',
    city: 'Testpur',
    state: 'Odisha',
  };

  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => {
    await clearDb();
    admin = await createUser('Admin');
    manager = await createUser('Manager');
    viewer = await createUser('Viewer');
  });

  it('works with zero configured entities (empty list, no placeholders)', async () => {
    const res = await request(app).get('/api/v1/companies').set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
    expect(await Company.countDocuments()).toBe(0);
  });

  it('creates a company without email/phone (contact details not yet confirmed) and normalises codes', async () => {
    const res = await request(app).post('/api/v1/companies').set(admin.auth).send(validCompany);
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('TE-01');
    expect(res.body.data.gstNumber).toBe('21ABCDE1234F1Z5');
    expect(res.body.data.email).toBeUndefined();
  });

  it('reads, updates and deletes a company, writing audit entries', async () => {
    const created = await request(app).post('/api/v1/companies').set(admin.auth).send(validCompany);
    const id = created.body.data._id;

    const read = await request(app).get(`/api/v1/companies/${id}`).set(viewer.auth);
    expect(read.status).toBe(200);
    expect(read.body.data.name).toBe(validCompany.name);

    const updated = await request(app).put(`/api/v1/companies/${id}`).set(admin.auth).send({ city: 'Cuttack', email: 'accounts@test.invalid' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.city).toBe('Cuttack');
    expect(updated.body.data.email).toBe('accounts@test.invalid');

    const deleted = await request(app).delete(`/api/v1/companies/${id}`).set(admin.auth);
    expect(deleted.status).toBe(200);
    expect(await Company.findById(id)).toBeNull();

    const actions = (await AuditLog.find({ entityId: id }).lean()).map((a) => a.action).sort();
    expect(actions).toEqual(['CREATE', 'DELETE', 'UPDATE'].sort());
  });

  it.each([
    ['missing name', { ...validCompany, name: '' }],
    ['invalid GSTIN', { ...validCompany, gstNumber: '12345' }],
    ['invalid PAN', { ...validCompany, panNumber: 'NOTAPAN' }],
    ['invalid email', { ...validCompany, email: 'not-an-email' }],
    ['invalid code characters', { ...validCompany, code: 'bad code!' }],
    ['missing code', { ...validCompany, code: undefined }],
  ])('rejects invalid company data: %s', async (_label, body) => {
    const res = await request(app).post('/api/v1/companies').set(admin.auth).send(body);
    expect(res.status).toBe(400);
    expect(await Company.countDocuments()).toBe(0);
  });

  it('strips non-schema fields instead of persisting them (no mass assignment)', async () => {
    const res = await request(app)
      .post('/api/v1/companies')
      .set(admin.auth)
      .send({ ...validCompany, isAdmin: true, createdAt: '1999-01-01', $where: '1' });
    expect(res.status).toBe(201);
    const stored = await Company.findById(res.body.data._id).lean();
    expect((stored as any).isAdmin).toBeUndefined();
    expect(new Date((stored as any).createdAt).getFullYear()).not.toBe(1999);
  });

  it('rejects a duplicate entity code with 409', async () => {
    await request(app).post('/api/v1/companies').set(admin.auth).send(validCompany);
    const dup = await request(app).post('/api/v1/companies').set(admin.auth).send({ ...validCompany, name: 'Other' });
    expect(dup.status).toBe(409);
  });

  it('refuses to delete an entity that records still reference', async () => {
    const created = await request(app).post('/api/v1/companies').set(admin.auth).send(validCompany);
    await Workforce.create({ name: 'Ravi', type: 'Driver', firm: created.body.data._id });
    const res = await request(app).delete(`/api/v1/companies/${created.body.data._id}`).set(admin.auth);
    expect(res.status).toBe(409);
    expect(await Company.countDocuments()).toBe(1);
  });

  it('returns 401 without a token and 403 without company:manage', async () => {
    expect((await request(app).get('/api/v1/companies')).status).toBe(401);
    expect((await request(app).post('/api/v1/companies').send(validCompany)).status).toBe(401);
    expect((await request(app).post('/api/v1/companies').set(manager.auth).send(validCompany)).status).toBe(403);
    expect((await request(app).post('/api/v1/companies').set(viewer.auth).send(validCompany)).status).toBe(403);
    expect(await Company.countDocuments()).toBe(0);
  });

  it('returns 400 for malformed ids and 404 for unknown ids', async () => {
    expect((await request(app).get('/api/v1/companies/not-an-id').set(admin.auth)).status).toBe(400);
    expect((await request(app).get('/api/v1/companies/64b000000000000000000000').set(admin.auth)).status).toBe(404);
    expect((await request(app).put('/api/v1/companies/64b000000000000000000000').set(admin.auth).send({ city: 'X' })).status).toBe(404);
  });

  it('treats search input as literal text (no regex injection)', async () => {
    await request(app).post('/api/v1/companies').set(admin.auth).send(validCompany);
    const wildcard = await request(app).get('/api/v1/companies').query({ search: '.*' }).set(admin.auth);
    expect(wildcard.status).toBe(200);
    expect(wildcard.body.data).toHaveLength(0);
    const redos = await request(app).get('/api/v1/companies').query({ search: '(a+)+$' }).set(admin.auth);
    expect(redos.status).toBe(200);
    const literal = await request(app).get('/api/v1/companies').query({ search: 'test entity' }).set(admin.auth);
    expect(literal.body.data).toHaveLength(1);
  });
});
