import request from 'supertest';
import { app, startTestDb, stopTestDb, clearDb, createUser, createWorkOrder, createVehicle, TestUser } from '../helpers/test-app.js';
import { VehicleAllocation } from '../../models/vehicle-allocation.model.js';

describe('Vehicle allocation double-booking guard (integration, real transactions)', () => {
  let admin: TestUser;
  let manager: TestUser;
  let viewer: TestUser;
  let vehicleId: string;
  let wo1: string;
  let wo2: string;

  const allocate = (workOrder: string, startDate: string, endDate?: string | null, user: TestUser = manager, vehicle = vehicleId) =>
    request(app).post(`/api/v1/vehicles/${vehicle}/allocations`).set(user.auth).send({ workOrder, startDate, endDate });

  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => {
    await clearDb();
    admin = await createUser('Admin');
    manager = await createUser('Manager');
    viewer = await createUser('Viewer');
    vehicleId = (await createVehicle(admin.id))._id.toString();
    wo1 = (await createWorkOrder(admin.id))._id.toString();
    wo2 = (await createWorkOrder(admin.id))._id.toString();
  });

  it('rejects an overlapping allocation with 409 and accepts a non-overlapping one', async () => {
    expect((await allocate(wo1, '2026-01-01', '2026-03-31')).status).toBe(201);

    const overlap = await allocate(wo2, '2026-03-01', '2026-05-31');
    expect(overlap.status).toBe(409);
    expect(overlap.body.message).toMatch(/overlapping/i);

    expect((await allocate(wo2, '2026-04-01', '2026-05-31')).status).toBe(201);

    const history = await request(app).get(`/api/v1/vehicles/${vehicleId}/allocations`).set(viewer.auth);
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(2);
    expect(history.body.data[0].workOrder.orderNumber).toBeDefined();
  });

  it('treats an open-ended allocation as blocking until it is ended, and keeps history when it ends', async () => {
    const first = await allocate(wo1, '2026-01-01', null);
    expect(first.status).toBe(201);
    expect((await allocate(wo2, '2027-01-01', '2027-02-01')).status).toBe(409);

    const ended = await request(app).patch(`/api/v1/vehicles/allocations/${first.body.data._id}/end`).set(manager.auth);
    expect(ended.status).toBe(200);
    expect(ended.body.data.status).toBe('Ended');

    expect((await allocate(wo2, '2027-01-01', '2027-02-01')).status).toBe(201);
    const all = await VehicleAllocation.find({ vehicle: vehicleId }).lean();
    expect(all).toHaveLength(2);
    expect(all.find((a) => a._id.toString() === first.body.data._id)!.status).toBe('Ended');
  });

  it('lets exactly one of several concurrent conflicting requests win', async () => {
    const results = await Promise.all(
      [wo1, wo2, wo1, wo2, wo1].map((wo) => allocate(wo, '2026-06-01', '2026-06-30'))
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    expect(await VehicleAllocation.countDocuments({ vehicle: vehicleId, status: { $in: ['Active', 'Scheduled'] } })).toBe(1);
  });

  it('rejects allocations to unknown work orders, reversed date ranges and malformed input', async () => {
    expect((await allocate('64b000000000000000000000', '2026-01-01', '2026-01-31')).status).toBe(404);
    expect((await allocate(wo1, '2026-03-01', '2026-02-01')).status).toBe(400);
    expect((await allocate('bad-id', '2026-01-01')).status).toBe(400);
    expect((await allocate(wo1, 'not-a-date')).status).toBe(400);
    expect(await VehicleAllocation.countDocuments()).toBe(0);
  });

  it('enforces allocation permissions', async () => {
    expect((await allocate(wo1, '2026-01-01', '2026-01-31', viewer)).status).toBe(403);
    expect((await request(app).post(`/api/v1/vehicles/${vehicleId}/allocations`).send({ workOrder: wo1, startDate: '2026-01-01' })).status).toBe(401);
    expect((await request(app).get(`/api/v1/vehicles/${vehicleId}/allocations`)).status).toBe(401);
  });
});
