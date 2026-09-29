/**
 * Firm setup & migration tool for the multi-firm portal.
 *
 * NOTHING IS WRITTEN unless both --execute and --confirm-db=<database name>
 * are given. Without them every step only reports what it would change.
 *
 *   npx tsx src/scripts/firm-setup.ts --report
 *   npx tsx src/scripts/firm-setup.ts --create-firms              (dry run)
 *   npx tsx src/scripts/firm-setup.ts --copy-legacy               (dry run)
 *   npx tsx src/scripts/firm-setup.ts --derive-financial          (dry run)
 *   npx tsx src/scripts/firm-setup.ts --map assignments.json      (dry run)
 *   ...add  --execute --confirm-db=<db name>  to apply
 *   npx tsx src/scripts/firm-setup.ts --undo logs/firm-setup-undo-<ts>.json --execute --confirm-db=<db name>
 *
 * Rules (from the client requirements):
 *  - Only the two firm NAMES are known. --create-firms creates "Satish Bohidar"
 *    (primary) and "Dadamani" with name, internal code and primary flag only —
 *    no GST/PAN/address/bank details are invented.
 *  - Operational records (tenders, contracts, vehicles, workforce, documents) are
 *    NEVER assigned a firm by guessing. They are assigned only through an
 *    explicit mapping file the client has approved (--map).
 *  - --derive-financial only fills in firms that are already implied: an award
 *    takes its tender's firm; invoices/advances/GEM fees take their contract's
 *    firm; an adjustment takes its advance's firm.
 *  - --copy-legacy copies the old, never-populated `entity`/`homeEntity` fields
 *    to `firm`/`ownerFirm` if any record has them (it leaves the old fields in place).
 *  - A field that already has a firm is never overwritten.
 *  - Every write is recorded in an undo log (logs/firm-setup-undo-*.json).
 *
 * Mapping file format (firm referenced by code, e.g. "SB" or "DM"):
 *   {
 *     "tenders":    { "<tenderId>": "SB" },
 *     "workOrders": { "<workOrderId>": "DM" },
 *     "vehicles":   { "<vehicleId>": "SB" },
 *     "workforce":  { "<workforceId>": "DM" },
 *     "documents":  { "<documentId>": ["SB", "DM"] }
 *   }
 */
import fs from 'fs';
import path from 'path';
import mongoose, { Types } from 'mongoose';
import { ENV } from '../config/env.config.js';

type UndoEntry = { collection: string; _id: string; field: string; previous: unknown };

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const inline = args.find((a) => a.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const FIRMS_TO_CREATE = [
  { name: 'Satish Bohidar', code: 'SB', isPrimary: true },
  { name: 'Dadamani', code: 'DM', isPrimary: false },
];

// collection -> firm field(s) checked by --report
const FIRM_FIELDS: Record<string, string> = {
  tenders: 'firm',
  awardedtenders: 'firm',
  workorders: 'firm',
  invoices: 'firm',
  contractadvances: 'firm',
  advanceadjustments: 'firm',
  gemfees: 'firm',
  workforces: 'firm',
  vehicles: 'ownerFirm',
  documentrecords: 'firms',
};

const MAP_TARGETS: Record<string, { collection: string; field: string; multi?: boolean }> = {
  tenders: { collection: 'tenders', field: 'firm' },
  workOrders: { collection: 'workorders', field: 'firm' },
  vehicles: { collection: 'vehicles', field: 'ownerFirm' },
  workforce: { collection: 'workforces', field: 'firm' },
  documents: { collection: 'documentrecords', field: 'firms', multi: true },
};

const unset = (field: string) => ({ $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: { $size: 0 } }] });
const unsetScalar = (field: string) => ({ [field]: null });

async function main() {
  const execute = flag('--execute');
  const confirmDb = option('--confirm-db');

  await mongoose.connect(ENV.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db!;
  const dbName = mongoose.connection.name;
  const host = mongoose.connection.host;
  console.log(`Connected to database "${dbName}" on ${host}`);

  if (execute && confirmDb !== dbName) {
    throw new Error(`Refusing to write: pass --confirm-db=${dbName} together with --execute to confirm the target database.`);
  }
  console.log(execute ? '*** EXECUTE MODE — changes will be written ***' : 'Dry run — nothing will be written.');

  const undo: UndoEntry[] = [];
  const write = async (collection: string, filter: Record<string, unknown>, field: string, value: unknown, label: string) => {
    const docs = await db.collection(collection).find(filter).project({ _id: 1, [field]: 1 }).toArray();
    console.log(`  ${label}: ${docs.length} record(s) in ${collection}.${field}`);
    if (!execute || docs.length === 0) return;
    for (const d of docs) {
      const res = await db.collection(collection).updateOne({ _id: d._id, ...filter }, { $set: { [field]: value } });
      if (res.modifiedCount === 1) undo.push({ collection, _id: d._id.toString(), field, previous: d[field] ?? null });
    }
  };

  if (flag('--undo')) {
    const file = option('--undo');
    if (!file) throw new Error('--undo needs the path of an undo log');
    const entries: UndoEntry[] = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`Undo log ${file}: ${entries.length} change(s) to revert`);
    if (execute) {
      for (const e of entries.reverse()) {
        const _id = new Types.ObjectId(e._id);
        if (e.field === '__created__') {
          await db.collection(e.collection).deleteOne({ _id });
          continue;
        }
        const update = e.previous === null ? { $unset: { [e.field]: '' } } : { $set: { [e.field]: e.previous } };
        await db.collection(e.collection).updateOne({ _id }, update);
      }
      console.log('Reverted.');
    }
  }

  if (flag('--report') || args.length === 0) {
    console.log('\nFirm association report');
    const firms = await db.collection('companies').find().project({ name: 1, code: 1, isPrimary: 1, isActive: 1 }).toArray();
    console.log(`  Firms registered: ${firms.length ? firms.map((f) => `${f.name} (${f.code}${f.isPrimary ? ', primary' : ''})`).join(', ') : 'none'}`);
    for (const [collection, field] of Object.entries(FIRM_FIELDS)) {
      const total = await db.collection(collection).countDocuments();
      const missing = await db.collection(collection).countDocuments(unset(field));
      console.log(`  ${collection.padEnd(20)} total ${String(total).padStart(6)}   without firm ${String(missing).padStart(6)}`);
    }
    for (const [collection, legacy] of [['workorders', 'entity'], ['invoices', 'entity'], ['gemfees', 'entity'], ['workforces', 'entity'], ['vehicles', 'homeEntity']]) {
      const n = await db.collection(collection).countDocuments({ [legacy]: { $exists: true, $ne: null } });
      if (n) console.log(`  legacy ${collection}.${legacy} populated on ${n} record(s) (see --copy-legacy)`);
    }
  }

  if (flag('--create-firms')) {
    console.log('\nCreate firms (names only; no legal details)');
    for (const firm of FIRMS_TO_CREATE) {
      const exists = await db.collection('companies').findOne({ $or: [{ code: firm.code }, { name: { $regex: `^${firm.name}$`, $options: 'i' } }] });
      if (exists) {
        console.log(`  ${firm.name}: already exists (${exists.code}) — unchanged`);
        continue;
      }
      if (firm.isPrimary && (await db.collection('companies').findOne({ isPrimary: true }))) {
        console.log(`  ${firm.name}: another firm is already primary — creating it as non-primary`);
        firm.isPrimary = false;
      }
      console.log(`  ${firm.name}: would be created as ${firm.code}${firm.isPrimary ? ' (primary)' : ''}`);
      if (execute) {
        const now = new Date();
        const res = await db.collection('companies').insertOne({ ...firm, isActive: true, createdAt: now, updatedAt: now });
        undo.push({ collection: 'companies', _id: res.insertedId.toString(), field: '__created__', previous: null });
      }
    }
  }

  if (flag('--copy-legacy')) {
    console.log('\nCopy legacy entity fields (only where the referenced firm exists)');
    const firmIds = (await db.collection('companies').find().project({ _id: 1 }).toArray()).map((f) => f._id);
    for (const [collection, from, to] of [['workorders', 'entity', 'firm'], ['invoices', 'entity', 'firm'], ['gemfees', 'entity', 'firm'], ['workforces', 'entity', 'firm'], ['vehicles', 'homeEntity', 'ownerFirm']]) {
      const docs = await db.collection(collection).find({ [from]: { $in: firmIds }, ...unsetScalar(to) }).project({ _id: 1, [from]: 1 }).toArray();
      console.log(`  ${collection}.${from} -> ${to}: ${docs.length} record(s)`);
      if (!execute) continue;
      for (const d of docs) {
        const res = await db.collection(collection).updateOne({ _id: d._id, ...unsetScalar(to) }, { $set: { [to]: d[from] } });
        if (res.modifiedCount === 1) undo.push({ collection, _id: d._id.toString(), field: to, previous: null });
      }
    }
  }

  if (flag('--derive-financial')) {
    console.log('\nDerive firms that are already implied by a parent record');
    const derive = async (collection: string, parentCollection: string, parentField: string, parentFirmField: string) => {
      const parents = await db.collection(parentCollection).find({ [parentFirmField]: { $ne: null } }).project({ _id: 1, [parentFirmField]: 1 }).toArray();
      let count = 0;
      for (const p of parents) {
        const filter = { [parentField]: p._id, ...unsetScalar('firm') };
        const n = await db.collection(collection).countDocuments(filter);
        if (!n) continue;
        count += n;
        if (execute) await write(collection, filter, 'firm', p[parentFirmField], `${collection} of ${parentCollection} ${p._id}`);
      }
      console.log(`  ${collection}: ${count} record(s) would take their ${parentCollection} firm`);
    };
    await derive('awardedtenders', 'tenders', 'tender', 'firm');
    await derive('invoices', 'workorders', 'workOrder', 'firm');
    await derive('contractadvances', 'workorders', 'workOrder', 'firm');
    await derive('gemfees', 'workorders', 'workOrder', 'firm');
    await derive('advanceadjustments', 'contractadvances', 'advance', 'firm');
  }

  if (flag('--map')) {
    const file = option('--map');
    if (!file) throw new Error('--map needs the path of an assignments JSON file');
    const mapping = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, Record<string, string | string[]>>;
    const firms = await db.collection('companies').find().project({ _id: 1, code: 1 }).toArray();
    const byCode = new Map(firms.map((f) => [String(f.code).toUpperCase(), f._id]));
    const resolve = (code: string) => {
      const id = byCode.get(String(code).toUpperCase());
      if (!id) throw new Error(`Unknown firm code "${code}" in mapping file`);
      return id;
    };
    console.log(`\nApply explicit firm assignments from ${file}`);
    for (const [key, target] of Object.entries(MAP_TARGETS)) {
      const entries = Object.entries(mapping[key] ?? {});
      let applied = 0;
      let skipped = 0;
      for (const [id, codes] of entries) {
        if (!Types.ObjectId.isValid(id)) throw new Error(`Invalid id "${id}" in ${key}`);
        const value = target.multi ? (Array.isArray(codes) ? codes : [codes]).map(resolve) : resolve(Array.isArray(codes) ? codes[0] : codes);
        const filter = { _id: new Types.ObjectId(id), ...(target.multi ? unset(target.field) : unsetScalar(target.field)) };
        const exists = await db.collection(target.collection).countDocuments(filter);
        if (!exists) {
          skipped++;
          continue;
        }
        applied++;
        if (execute) await write(target.collection, filter, target.field, value, `${key} ${id}`);
      }
      if (entries.length) console.log(`  ${key}: ${applied} to assign, ${skipped} skipped (not found or already assigned — never overwritten)`);
    }
  }

  if (execute && undo.length) {
    const dir = path.resolve(__dirname, '../../logs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `firm-setup-undo-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(undo, null, 2));
    console.log(`\n${undo.length} change(s) written. Undo log: ${file}`);
  } else if (!execute) {
    console.log('\nDry run complete. Re-run with --execute --confirm-db=' + dbName + ' to apply.');
  }
}

main()
  .catch((err) => {
    console.error(`firm-setup failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
