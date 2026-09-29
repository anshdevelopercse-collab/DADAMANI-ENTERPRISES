import request from 'supertest';
import { app, startTestDb, stopTestDb, clearDb, createUser, createWorkOrder, TestUser } from '../helpers/test-app.js';
import { Tender } from '../../models/tender.model.js';

describe('Security regressions (integration)', () => {
  let admin: TestUser;
  let viewer: TestUser;

  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => {
    await clearDb();
    admin = await createUser('Admin');
    viewer = await createUser('Viewer');
  });

  it.each([
    ['get', '/api/v1/companies'],
    ['get', '/api/v1/invoices'],
    ['get', '/api/v1/invoices/64b000000000000000000000/adjustments'],
    ['put', '/api/v1/invoices/64b000000000000000000000'],
    ['get', '/api/v1/contract-advances'],
    ['get', '/api/v1/contract-advances/summary'],
    ['get', '/api/v1/gem-fees'],
    ['get', '/api/v1/workforce'],
    ['put', '/api/v1/workforce/64b000000000000000000000'],
    ['get', '/api/v1/documents'],
    ['get', '/api/v1/documents/64b000000000000000000000/versions'],
    ['get', '/api/v1/documents/64b000000000000000000000/download'],
    ['get', '/api/v1/vehicles/64b000000000000000000000/allocations'],
  ])('%s %s requires authentication', async (method, url) => {
    const res = await (request(app) as any)[method](url);
    expect(res.status).toBe(401);
  });

  it('rejects forged / wrongly signed tokens', async () => {
    const forged = viewer.token.slice(0, -4) + 'abcd';
    expect((await request(app).get('/api/v1/invoices').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
  });

  it('never exposes password hashes from /auth/me or login', async () => {
    const me = await request(app).get('/api/v1/auth/me').set(viewer.auth);
    expect(me.status).toBe(200);
    expect(JSON.stringify(me.body)).not.toMatch(/password|\$2[aby]\$/);

    const manager = await createUser('Manager', { email: 'login-check@test.invalid' });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'login-check@test.invalid', password: 'Test@123456' });
    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeDefined();
    expect(JSON.stringify(login.body)).not.toMatch(/\$2[aby]\$/);
    expect(manager.id).toBeDefined();
  });

  it('neutralises MongoDB operator injection in login bodies', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
    expect(res.body.data?.accessToken).toBeUndefined();
  });

  it('ignores operator objects and arrays in query filters instead of passing them to MongoDB', async () => {
    const wo = await createWorkOrder(admin.id);
    const objectSearch = await request(app).get('/api/v1/invoices?search[$regex]=.*&status[$ne]=Draft').set(viewer.auth);
    expect(objectSearch.status).toBe(200);
    const arraySearch = await request(app).get('/api/v1/invoices?search=a&search=b').set(viewer.auth);
    expect(arraySearch.status).toBe(200);
    const badId = await request(app).get('/api/v1/invoices').query({ workOrder: 'not-an-id' }).set(viewer.auth);
    expect(badId.status).toBe(400);
    const goodId = await request(app).get('/api/v1/invoices').query({ workOrder: wo._id.toString() }).set(viewer.auth);
    expect(goodId.status).toBe(200);
  });

  it('escapes regex metacharacters in every search box, including pre-existing modules', async () => {
    await Tender.create({
      tenderNumber: 'TND-1', title: 'Coal transport', clientName: 'MCL', category: 'Logistics', estimatedValue: 1,
      submissionDeadline: new Date('2026-12-01'), location: 'Talcher', createdBy: admin.id,
    });
    for (const url of ['/api/v1/tenders', '/api/v1/work-orders', '/api/v1/vehicles', '/api/v1/workforce', '/api/v1/gem-fees', '/api/v1/contract-advances']) {
      const res = await request(app).get(url).query({ search: '(a+)+$' }).set(admin.auth);
      expect(res.status).toBe(200);
    }
    const wildcard = await request(app).get('/api/v1/tenders').query({ search: '.*' }).set(admin.auth);
    expect(wildcard.body.data).toHaveLength(0);
    const literal = await request(app).get('/api/v1/tenders').query({ search: 'coal' }).set(admin.auth);
    expect(literal.body.data).toHaveLength(1);
  });

  it('clamps pagination and ignores unsafe sort fields', async () => {
    const huge = await request(app).get('/api/v1/tenders').query({ limit: 100000, page: -5 }).set(admin.auth);
    expect(huge.status).toBe(200);
    expect(huge.body.meta.limit).toBe(100);
    expect(huge.body.meta.page).toBe(1);

    const junk = await request(app).get('/api/v1/tenders').query({ limit: 'abc', page: 'xyz' }).set(admin.auth);
    expect(junk.status).toBe(200);

    const sortInjection = await request(app).get('/api/v1/tenders').query({ sortBy: '$where' }).set(admin.auth);
    expect(sortInjection.status).toBe(200);
    const sortObject = await request(app).get('/api/v1/tenders?sortBy[$gt]=1').set(admin.auth);
    expect(sortObject.status).toBe(200);
  });

  it('keeps existing RBAC: viewers cannot manage users or settings', async () => {
    expect((await request(app).get('/api/v1/users').set(viewer.auth)).status).toBe(403);
    expect((await request(app).put('/api/v1/settings').set(viewer.auth).send({ companyName: 'x' })).status).toBe(403);
    expect((await request(app).get('/api/v1/users').set(admin.auth)).status).toBe(200);
  });

  it('health endpoint responds', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.environment).toBe('test');
  });
});
