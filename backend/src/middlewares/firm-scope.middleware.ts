import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest, FirmScope } from '../interfaces/common.interface.js';
import { ApiError } from '../utils/api-response.util.js';
import { Company } from '../models/company.model.js';

/**
 * Resolves the active firm scope for a request.
 *
 * Priority:
 * 1. If user has firmAccessMode='Restricted', their allowed firms are the ceiling.
 *    - Header requests a specific firm → allowed only if it's in their firmAccess list.
 *    - No header (all) → scope becomes allowedFirmIds restricted to their list.
 * 2. Admin / All-access users pass through the header as-is.
 *
 * Attaches req.firmScope for downstream controllers and services.
 * Does NOT throw when no firm scope header is present — absence means "all firms".
 */
export const resolveFirmScope = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const user = req.user;
    if (!user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const scopeHeader = req.headers['x-firm-scope'] as string | undefined;

    // Parse the requested scope from the header.
    let requested: FirmScope;
    if (scopeHeader && scopeHeader.startsWith('firm:')) {
      const firmId = scopeHeader.slice(5).trim();
      if (!firmId) {
        return next(ApiError.badRequest('Malformed X-Firm-Scope header — expected "firm:<id>"'));
      }
      requested = { kind: 'firm', firmId };
    } else {
      requested = { kind: 'all' };
    }

    const isRestricted =
      user.firmAccessMode === 'Restricted' &&
      Array.isArray(user.firmAccess) &&
      user.firmAccess.length > 0;

    if (!isRestricted) {
      // Admin or All-access user: honour the header verbatim.
      req.firmScope = requested;
      return next();
    }

    const allowedIds = (user.firmAccess as any[]).map((f: any) =>
      typeof f === 'string' ? f : f.toString()
    );

    if (requested.kind === 'firm') {
      if (!allowedIds.includes(requested.firmId!)) {
        return next(
          ApiError.forbidden(
            'You do not have access to this firm. Check your firm access settings.'
          )
        );
      }
      req.firmScope = requested;
    } else {
      // User asked for "all firms" but is restricted — give them their subset.
      req.firmScope = { kind: 'all', allowedFirmIds: allowedIds };
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Builds a Mongoose filter fragment that scopes a query to the active firm.
 *
 * @param firmScope  The resolved scope from req.firmScope.
 * @param field      The entity field name on the model (default: "entity").
 */
export function buildFirmFilter(firmScope: FirmScope | undefined, field = 'entity'): Record<string, any> {
  if (!firmScope) return {};

  if (firmScope.kind === 'firm' && firmScope.firmId) {
    return { [field]: firmScope.firmId };
  }

  if (firmScope.kind === 'all' && firmScope.allowedFirmIds?.length) {
    return { [field]: { $in: firmScope.allowedFirmIds } };
  }

  return {};
}

async function assertAssignableFirm(firmId: string, firmScope: FirmScope | undefined): Promise<void> {
  if (!mongoose.isValidObjectId(firmId)) {
    throw ApiError.badRequest('Invalid firm id.');
  }
  if (firmScope?.kind === 'firm' && firmScope.firmId !== firmId) {
    throw ApiError.forbidden('Records can only be created for the firm you are currently viewing.');
  }
  if (firmScope?.kind === 'all' && firmScope.allowedFirmIds?.length && !firmScope.allowedFirmIds.includes(firmId)) {
    throw ApiError.forbidden('You do not have access to this firm.');
  }
  if (!(await Company.exists({ _id: firmId, isActive: true }))) {
    throw ApiError.badRequest('Unknown or inactive firm.');
  }
}

/**
 * Decides which firm a new record belongs to. A requested firm must be inside
 * the caller's scope; otherwise the firm being viewed is used. Restricted users
 * must always end up with a firm so their records never become unscoped.
 */
export async function resolveFirmForCreate(requested: unknown, firmScope: FirmScope | undefined): Promise<string | undefined> {
  let firmId = typeof requested === 'string' && requested ? requested : undefined;
  if (!firmId && firmScope?.kind === 'firm') firmId = firmScope.firmId;
  if (!firmId && firmScope?.kind === 'all' && firmScope.allowedFirmIds?.length) {
    if (firmScope.allowedFirmIds.length > 1) {
      throw ApiError.badRequest('Select the firm this record belongs to.');
    }
    firmId = firmScope.allowedFirmIds[0];
  }
  if (!firmId) return undefined;
  await assertAssignableFirm(firmId, firmScope);
  return firmId;
}

/**
 * Firm ownership is fixed once set. A legacy record without a firm may be
 * assigned one (within the caller's scope); any other change is rejected.
 * Returns the firm to write, or undefined to leave the field untouched.
 */
export async function resolveFirmForUpdate(current: unknown, requested: unknown, firmScope: FirmScope | undefined): Promise<string | undefined> {
  if (requested === undefined || requested === null || requested === '') return undefined;
  const next = String(requested);
  const existing = (current as any)?._id?.toString?.() ?? (current as any)?.toString?.() ?? null;
  if (existing) {
    if (existing === next) return undefined;
    throw ApiError.conflict("A record's firm cannot be changed once it is set.");
  }
  await assertAssignableFirm(next, firmScope);
  return next;
}

/**
 * Verifies that a fetched record is accessible under the current firm scope.
 * Throws a 403 if the record's entity field does not match.
 *
 * Legacy records (entity = null / undefined) are always allowed — they
 * pre-date firm tracking and must remain accessible until a data backfill is run.
 *
 * @param recordEntity  The entity/homeEntity value from the fetched document.
 * @param firmScope     The resolved scope from req.firmScope.
 */
export function assertFirmAccess(
  recordEntity: any,
  firmScope: FirmScope | undefined
): void {
  if (!firmScope) return;

  // Legacy records without an entity are accessible to everyone.
  const entityId = recordEntity?.toString?.() ?? null;
  if (!entityId) return;

  if (firmScope.kind === 'firm') {
    if (entityId !== firmScope.firmId) {
      throw ApiError.forbidden('This record belongs to a different firm.');
    }
  }

  if (firmScope.kind === 'all' && firmScope.allowedFirmIds?.length) {
    if (!firmScope.allowedFirmIds.includes(entityId)) {
      throw ApiError.forbidden('You do not have access to this record.');
    }
  }
}
