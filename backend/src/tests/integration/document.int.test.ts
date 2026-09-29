import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { Types } from 'mongoose';
import { app, startTestDb, stopTestDb, clearDb, createUser, defaultFirmId, uploadedFileCount, TestUser } from '../helpers/test-app.js';
import { ENV } from '../../config/env.config.js';
import { DocumentRecord } from '../../models/document.model.js';
import { AuditLog } from '../../models/audit-log.model.js';

const pdf = (label: string) => Buffer.from(`%PDF-1.4\n% ${label}\n`);

// supertest does not buffer arbitrary binary bodies by default.
const binary = (res: any, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('Documents: upload, secure download, version history (integration)', () => {
  let admin: TestUser;
  let manager: TestUser;
  let viewer: TestUser;
  let firmId: string;

  const upload = (user: TestUser, label = 'original', filename = 'contract.pdf', contentType = 'application/pdf') =>
    request(app).post('/api/v1/documents/upload').set(user.auth)
      .field('title', 'Work order contract').field('folder', 'Contracts').field('tags', 'contract, 2026').field('firms', firmId)
      .attach('file', pdf(label), { filename, contentType });
  const replace = (id: string, user: TestUser, label: string) =>
    request(app).post(`/api/v1/documents/${id}/replace`).set(user.auth).attach('file', pdf(label), { filename: `${label}.pdf`, contentType: 'application/pdf' });
  const download = (id: string, user?: TestUser) => {
    const req = request(app).get(`/api/v1/documents/${id}/download`).buffer(true).parse(binary);
    return user ? req.set(user.auth) : req;
  };

  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => {
    await clearDb();
    admin = await createUser('Admin');
    manager = await createUser('Manager');
    viewer = await createUser('Viewer');
    firmId = await defaultFirmId();
  });

  it('uploads a document and lists it with the real field names, without leaking server paths', async () => {
    const res = await upload(manager);
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Work order contract');
    expect(res.body.data.versionNumber).toBe(1);
    expect(res.body.data.filePath).toBeUndefined();
    expect(res.body.data.tags).toEqual(['contract', '2026']);

    const list = await request(app).get('/api/v1/documents').set(viewer.auth);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data[0].originalFileName).toBe('contract.pdf');
    expect(list.body.data[0].filePath).toBeUndefined();
    expect(list.body.meta.total).toBe(1);
  });

  it('no longer serves uploaded files publicly; download requires authentication', async () => {
    const res = await upload(manager);
    const stored = await DocumentRecord.findById(res.body.data._id).lean();

    expect((await request(app).get(`/uploads/${stored!.storedFileName}`)).status).toBe(404);
    expect((await download(res.body.data._id)).status).toBe(401);

    const ok = await download(res.body.data._id, viewer);
    expect(ok.status).toBe(200);
    expect(ok.headers['content-disposition']).toContain('contract.pdf');
    expect(ok.body.toString()).toContain('original');
  });

  it('replaces a document: v2 becomes current, v1 stays retrievable, and the replacement is audited', async () => {
    const v1 = (await upload(manager)).body.data;
    const res = await replace(v1._id, manager, 'second');
    expect(res.status).toBe(201);
    expect(res.body.data.versionNumber).toBe(2);
    expect(res.body.data.isLatestVersion).toBe(true);
    expect(res.body.data.parentDoc).toBe(v1._id);

    const list = await request(app).get('/api/v1/documents').set(viewer.auth);
    expect(list.body.data.map((d: any) => d.versionNumber)).toEqual([2]);

    const versions = await request(app).get(`/api/v1/documents/${res.body.data._id}/versions`).set(viewer.auth);
    expect(versions.body.data.map((d: any) => [d.versionNumber, d.isLatestVersion])).toEqual([[1, false], [2, true]]);
    expect(versions.body.data[0].uploadedBy.name).toBeDefined();

    const oldFile = await download(v1._id, viewer);
    expect(oldFile.status).toBe(200);
    expect(oldFile.body.toString()).toContain('original');
    const newFile = await download(res.body.data._id, viewer);
    expect(newFile.body.toString()).toContain('second');

    const audit = await AuditLog.findOne({ module: 'DOCUMENTS', action: 'UPDATE' }).lean();
    expect(audit!.oldValues).toMatchObject({ documentId: v1._id, versionNumber: 1 });
    expect(audit!.newValues).toMatchObject({ documentId: res.body.data._id, versionNumber: 2 });
    expect(await AuditLog.countDocuments({ module: 'DOCUMENTS', action: 'DOWNLOAD' })).toBe(2);
  });

  it('replaces a legacy document that has no version fields at all', async () => {
    const storedFileName = 'legacy-file.pdf';
    fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(ENV.UPLOAD_DIR, storedFileName), pdf('legacy'));
    const { insertedId } = await DocumentRecord.collection.insertOne({
      title: 'Legacy doc', folder: 'General', category: 'General', originalFileName: 'legacy.pdf', storedFileName,
      filePath: path.join(ENV.UPLOAD_DIR, storedFileName), fileSize: 20, mimeType: 'application/pdf',
      uploadedBy: new Types.ObjectId(admin.id), entityType: 'General', isArchived: false,
      createdAt: new Date(), updatedAt: new Date(),
    });

    const listed = await request(app).get('/api/v1/documents').set(viewer.auth);
    expect(listed.body.data).toHaveLength(1);

    const res = await replace(insertedId.toString(), manager, 'legacy-v2');
    expect(res.status).toBe(201);
    expect(res.body.data.versionNumber).toBe(2);
    const root = await DocumentRecord.collection.findOne({ _id: insertedId });
    expect(root!.versionNumber).toBe(1);
    expect(root!.isLatestVersion).toBe(false);
  });

  it('replaces a document that is already at version 2 or higher', async () => {
    const v1 = (await upload(manager)).body.data;
    const v2 = (await replace(v1._id, manager, 'v2')).body.data;
    const v3 = await replace(v2._id, manager, 'v3');
    expect(v3.status).toBe(201);
    expect(v3.body.data.versionNumber).toBe(3);
    expect(v3.body.data.parentDoc).toBe(v1._id);
    const chain = await DocumentRecord.find({ $or: [{ _id: v1._id }, { parentDoc: v1._id }] }).lean();
    expect(chain.filter((d) => d.isLatestVersion)).toHaveLength(1);
  });

  it('rejects replacing a superseded version with 409 and removes the orphaned upload', async () => {
    const v1 = (await upload(manager)).body.data;
    await replace(v1._id, manager, 'v2');
    const before = uploadedFileCount();
    const stale = await replace(v1._id, manager, 'stale');
    expect(stale.status).toBe(409);
    await new Promise((r) => setTimeout(r, 200));
    expect(uploadedFileCount()).toBe(before);
  });

  it('allows exactly one of two concurrent replacements of the same version', async () => {
    const v1 = (await upload(manager)).body.data;
    const before = uploadedFileCount();
    const results = await Promise.all([replace(v1._id, manager, 'race-a'), replace(v1._id, admin, 'race-b')]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);

    const chain = await DocumentRecord.find({ $or: [{ _id: v1._id }, { parentDoc: v1._id }] }).lean();
    expect(chain).toHaveLength(2);
    expect(chain.filter((d) => d.isLatestVersion)).toHaveLength(1);
    expect(chain.map((d) => d.versionNumber).sort()).toEqual([1, 2]);
    await new Promise((r) => setTimeout(r, 200));
    expect(uploadedFileCount()).toBe(before + 1);
  });

  it('enforces upload permission on replacement and writes no file for a rejected user', async () => {
    const v1 = (await upload(manager)).body.data;
    const before = uploadedFileCount();
    expect((await replace(v1._id, viewer, 'nope')).status).toBe(403);
    expect((await request(app).post(`/api/v1/documents/${v1._id}/replace`).attach('file', pdf('x'), 'x.pdf')).status).toBe(401);
    expect(uploadedFileCount()).toBe(before);
    expect(await DocumentRecord.countDocuments()).toBe(1);
  });

  it('rejects disallowed file types with 400 (not 500) and keeps nothing on disk', async () => {
    const before = uploadedFileCount();
    const html = await upload(manager, 'x', 'evil.html', 'text/html');
    expect(html.status).toBe(400);
    const spoofed = await upload(manager, 'x', 'evil.html', 'application/pdf');
    expect(spoofed.status).toBe(400);
    expect(uploadedFileCount()).toBe(before);
  });

  it('rejects oversized uploads with 400', async () => {
    const big = Buffer.alloc(ENV.MAX_FILE_SIZE_MB * 1024 * 1024 + 10, 1);
    const res = await request(app).post('/api/v1/documents/upload').set(manager.auth).attach('file', big, { filename: 'big.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
  });

  it('archives (never deletes) a document that has version history; deletes standalone ones', async () => {
    const v1 = (await upload(manager)).body.data;
    const v2 = (await replace(v1._id, manager, 'v2')).body.data;
    const standalone = (await upload(manager, 'solo', 'solo.pdf')).body.data;

    expect((await request(app).delete(`/api/v1/documents/${v2._id}`).set(manager.auth)).status).toBe(403);
    expect((await request(app).delete(`/api/v1/documents/${v2._id}`).set(admin.auth)).status).toBe(200);
    const chain = await DocumentRecord.find({ _id: { $in: [v1._id, v2._id] } }).lean();
    expect(chain).toHaveLength(2);
    expect(chain.every((d) => d.isArchived)).toBe(true);
    expect((await download(v1._id, viewer)).status).toBe(404);

    expect((await request(app).delete(`/api/v1/documents/${standalone._id}`).set(admin.auth)).status).toBe(200);
    expect(await DocumentRecord.findById(standalone._id)).toBeNull();
  });

  it('returns 400 for malformed ids and 404 for unknown documents', async () => {
    expect((await download('../../etc/passwd', viewer)).status).toBe(404);
    expect((await request(app).get('/api/v1/documents/not-an-id/versions').set(viewer.auth)).status).toBe(400);
    expect((await download('64b000000000000000000000', viewer)).status).toBe(404);
  });
});
