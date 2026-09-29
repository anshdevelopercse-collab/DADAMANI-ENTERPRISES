import { Model } from 'mongoose';
import { getRemainingAmount } from './finance-validation.util.js';

export interface FirmRef {
  _id: string;
  name: string;
  code: string;
  isPrimary: boolean;
}

export type FirmTotalsRow<K extends string> = { firm: FirmRef | null } & Record<K, number> & { count: number };

/**
 * Totals grouped by firm — money is never summed across firms without also
 * being reported per firm. Rows for records with no firm yet come back with
 * firm = null ("Unassigned") instead of being folded into a firm's totals.
 * The primary firm is listed first.
 */
export async function totalsByFirm<K extends string>(
  model: Model<any>,
  match: Record<string, unknown>,
  sums: Record<K, unknown>,
  firmField = 'firm'
): Promise<FirmTotalsRow<K>[]> {
  const group: any = { _id: `$${firmField}`, count: { $sum: 1 } };
  for (const [key, expr] of Object.entries(sums)) group[key] = { $sum: expr };

  const rows = await model.aggregate([
    { $match: match },
    { $group: group },
    { $lookup: { from: 'companies', localField: '_id', foreignField: '_id', as: 'firmDoc' } },
    { $addFields: { firmDoc: { $first: '$firmDoc' } } },
    { $sort: { 'firmDoc.isPrimary': -1, 'firmDoc.name': 1 } },
  ]);

  return rows.map((row: any) => {
    const out: any = {
      firm: row.firmDoc
        ? { _id: row.firmDoc._id.toString(), name: row.firmDoc.name, code: row.firmDoc.code, isPrimary: !!row.firmDoc.isPrimary }
        : null,
      count: row.count,
    };
    for (const key of Object.keys(sums)) out[key] = getRemainingAmount(row[key] ?? 0, 0);
    return out as FirmTotalsRow<K>;
  });
}

/** Sums a per-firm breakdown into one combined row — only for an explicit combined view. */
export function combineRows<K extends string>(rows: FirmTotalsRow<K>[], keys: K[]): Record<K | 'count', number> {
  const total: any = { count: rows.reduce((s, r) => s + r.count, 0) };
  for (const key of keys) total[key] = getRemainingAmount(rows.reduce((s, r) => s + (r[key] as number), 0), 0);
  return total;
}
