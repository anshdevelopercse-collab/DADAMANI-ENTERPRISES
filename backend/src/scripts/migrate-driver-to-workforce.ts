/**
 * Driver -> Workforce copy migration (architecture doc §8, step 5).
 *
 * STATUS: written and dry-run-tested, but NOT executed against real data.
 * Per explicit instruction, this must not run until entity details are
 * provided and the migration is separately approved.
 *
 * What it does:
 *  - Reads every Driver document.
 *  - For each one without a matching Workforce record (matched by
 *    legacyDriverId), creates a new Workforce document with type: 'Driver',
 *    copying the relevant fields, and legacyDriverId pointing back at the
 *    source Driver.
 *  - Does NOT touch, modify, or delete any existing Driver document.
 *  - Does NOT assign `entity` on the new Workforce records (left undefined
 *    until real entity data exists — this script does not decide that).
 *  - Writes one row per copy to a `migration-log` collection so the run is
 *    auditable and can be reviewed before/after.
 *
 * Usage (once approved):
 *   npx tsx src/scripts/migrate-driver-to-workforce.ts --dry-run   # prints what it would do, writes nothing
 *   npx tsx src/scripts/migrate-driver-to-workforce.ts             # executes for real
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env.config.js';
import { Driver } from '../models/driver.model.js';
import { Workforce } from '../models/workforce.model.js';

interface MigrationLogEntry {
  model: string;
  sourceId: string;
  targetId?: string;
  action: 'created' | 'skipped-existing' | 'dry-run-would-create';
  ranAt: Date;
}

const MigrationLog = mongoose.model(
  'MigrationLog',
  new mongoose.Schema({}, { strict: false, timestamps: false, collection: 'migration-log' })
);

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  await mongoose.connect(ENV.MONGODB_URI);
  console.log(`[migrate-driver-to-workforce] connected. dryRun=${dryRun}`);

  const drivers = await Driver.find({}).exec();
  console.log(`[migrate-driver-to-workforce] found ${drivers.length} Driver document(s)`);

  const log: MigrationLogEntry[] = [];
  let created = 0;
  let skipped = 0;

  for (const driver of drivers) {
    const existing = await Workforce.findOne({ legacyDriverId: driver._id }).exec();
    if (existing) {
      skipped += 1;
      log.push({ model: 'Driver->Workforce', sourceId: driver._id.toString(), targetId: existing._id.toString(), action: 'skipped-existing', ranAt: new Date() });
      continue;
    }

    if (dryRun) {
      created += 1;
      log.push({ model: 'Driver->Workforce', sourceId: driver._id.toString(), action: 'dry-run-would-create', ranAt: new Date() });
      continue;
    }

    const workforce = await Workforce.create({
      name: driver.name,
      type: 'Driver',
      phone: driver.phone,
      emergencyContact: driver.emergencyContact,
      address: driver.address,
      status: driver.status,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry,
      experienceYears: driver.experienceYears,
      rating: driver.rating,
      legacyDriverId: driver._id,
      // entity intentionally left unset — see header comment.
    });
    created += 1;
    log.push({ model: 'Driver->Workforce', sourceId: driver._id.toString(), targetId: workforce._id.toString(), action: 'created', ranAt: new Date() });
  }

  if (!dryRun && log.length) {
    await MigrationLog.insertMany(log);
  }

  console.log(`[migrate-driver-to-workforce] ${dryRun ? 'would create' : 'created'}: ${created}, skipped (already migrated): ${skipped}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[migrate-driver-to-workforce] failed:', err);
  process.exit(1);
});
