import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from '../constants/permissions.constant.js';
import { UserRole } from '../constants/status.constant.js';

/**
 * Same rule as User.hasPermission() on the model, but returns the full
 * effective permission set rather than checking one key — this is what lets
 * the frontend gate nav/buttons on real permissions instead of the previous
 * "Manager/Viewer always see everything" stub in AuthContext.hasPermission.
 */
export function computeEffectivePermissions(user: { role: string; customPermissions?: string[] }): string[] {
  if (user.role === UserRole.ADMIN) return Object.values(PERMISSIONS);
  const rolePerms = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  const custom = user.customPermissions || [];
  return Array.from(new Set([...rolePerms, ...custom]));
}
