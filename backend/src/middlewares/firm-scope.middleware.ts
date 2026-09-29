import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, FirmScope } from '../interfaces/common.interface.js';
import { ApiError } from '../utils/api-response.util.js';

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
