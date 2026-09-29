import { Types } from 'mongoose';
import { ApiError } from './api-response.util.js';
import { Company } from '../models/company.model.js';
import { UserRole } from '../constants/status.constant.js';

/**
 * The firm scope a request operates in, resolved server-side from the
 * requested view (X-Firm-Scope header / ?firmScope=) and the user's own firm
 * access. `access === null` means the user may see every firm (and legacy
 * records that have no firm yet); otherwise it is the explicit allow-list.
 */
export type FirmAccess = string[] | null;

export type FirmScope =
  | { kind: 'all'; access: FirmAccess }
  | { kind: 'firm'; firmId: string; access: FirmAccess }
  | { kind: 'unassigned'; access: null };

type FirmRef = Types.ObjectId | string | null | undefined;

const toId = (v: FirmRef): string | null => (v ? v.toString() : null);

export function getUserFirmAccess(user: { role?: string; firmAccessMode?: string; firmAccess?: FirmRef[] }): FirmAccess {
  if (user.role === UserRole.ADMIN) return null;
  if (user.firmAccessMode !== 'Restricted') return null;
  return (user.firmAccess || []).map(toId).filter((id): id is string => !!id);
}

export function canAccessFirm(access: FirmAccess, firm: FirmRef): boolean {
  if (access === null) return true;
  const id = toId(firm);
  return !!id && access.includes(id);
}

/** Mongo filter restricting a query to the scope. `arrayField` for multi-firm fields (documents). */
export function firmFilter(scope: FirmScope | undefined, field: string, arrayField = false): Record<string, unknown> {
  if (!scope) return {};
  if (scope.kind === 'firm') return { [field]: new Types.ObjectId(scope.firmId) };
  if (scope.kind === 'unassigned') return { [field]: arrayField ? { $in: [null, []] } : null };
  if (scope.access === null) return {};
  return { [field]: { $in: scope.access.map((id) => new Types.ObjectId(id)) } };
}

/**
 * Read access to an existing record. Not-found (not 403) so a user restricted
 * to one firm cannot probe whether another firm's record ids exist.
 * For multi-firm records (documents) read access needs any one of its firms.
 */
export function assertCanRead(scope: FirmScope | undefined, firms: FirmRef | FirmRef[], label = 'Record'): void {
  const access = scope?.access ?? null;
  if (access === null) return;
  const list = Array.isArray(firms) ? firms : [firms];
  if (!list.some((f) => canAccessFirm(access, f))) throw ApiError.notFound(`${label} not found`);
}

/** Write access to an existing record: every firm it belongs to must be accessible. */
export function assertCanWrite(scope: FirmScope | undefined, firms: FirmRef | FirmRef[], label = 'Record'): void {
  const access = scope?.access ?? null;
  if (access === null) return;
  const list = Array.isArray(firms) ? firms : [firms];
  if (list.length === 0 || !list.every((f) => canAccessFirm(access, f))) throw ApiError.notFound(`${label} not found`);
}

/**
 * Validates a firm id supplied for a new/changed record: well-formed, an
 * existing active firm, and one the user is allowed to write to.
 */
export async function requireWritableFirm(scope: FirmScope | undefined, firmId: unknown, label = 'firm'): Promise<string> {
  if (firmId === undefined || firmId === null || firmId === '') {
    throw ApiError.badRequest(`A ${label} must be selected (Satish Bohidar, Dadamani, …)`);
  }
  const id = String(firmId);
  if (!Types.ObjectId.isValid(id) || String(new Types.ObjectId(id)) !== id.toLowerCase()) {
    throw ApiError.badRequest(`Invalid ${label} identifier`);
  }
  const firm = await Company.findById(id).select('isActive').lean();
  if (!firm) throw ApiError.badRequest(`Unknown ${label}`);
  if (!firm.isActive) throw ApiError.badRequest(`The selected ${label} is inactive`);
  if (!canAccessFirm(scope?.access ?? null, id)) throw ApiError.forbidden(`You do not have access to the selected ${label}`);
  return id;
}

/** In-memory equivalent of firmFilter for results that were not queried by firm. */
export function matchesScope(scope: FirmScope | undefined, firm: FirmRef): boolean {
  if (!scope) return true;
  const id = toId(firm);
  if (scope.kind === 'firm') return id === scope.firmId;
  if (scope.kind === 'unassigned') return !id;
  return canAccessFirm(scope.access, firm);
}

export const sameFirm =(a: FirmRef, b: FirmRef): boolean => !!a && !!b && a.toString() === b.toString();
