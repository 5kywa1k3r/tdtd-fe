import { Permission } from '../constants/permissions';
import { Role, isManagerUnitRole } from '../constants/roles';

/**
 * Static role -> permissions.
 * Dynamic roles (MANAGER_UNIT:{unitId}) are handled separately.
 */
const STATIC_ROLE_PERMS: Record<string, readonly string[]> = {
  [Role.SYSTEM_ADMIN]: [
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_SOFT_DELETE,
    Permission.USER_RESET_PASSWORD,

    Permission.UNIT_CREATE,
    Permission.UNIT_UPDATE,
    Permission.UNIT_SOFT_DELETE,
  ],

  // 🔴 ADMIN: chỉ create SYSTEM_ADMIN + search/view user (theo doc)
  // FE-side: usually map to "canOpenCreateDialog" etc.
  // Nếu ADMIN chỉ được "create SYSTEM_ADMIN" thì permission cụ thể hơn sẽ đặt ở layer user-editor (allowedRolesToAssign).
  [Role.ADMIN]: [
    Permission.USER_CREATE,
    // intentionally NOT include update/delete/reset
  ],

  // 🟡 MANAGER_LEVEL: subtree scope enforce by BE
  [Role.MANAGER_LEVEL]: [
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_SOFT_DELETE,
    // reset password tuỳ policy, nếu có thì add:
    Permission.USER_RESET_PASSWORD,
  ],

  // MANAGER_UNIT base role name not used directly; dynamic MANAGER_UNIT:{unitId} will match below
};

/**
 * Does user have a given permission (coarse FE gating)?
 * NOTE: Scope checks (subtree) must be done by BE.
 */
export function hasPermission(roles: string[] | undefined, perm: string): boolean {
  if (!roles?.length) return false;

  for (const r of roles) {
    // dynamic scoped role
    if (isManagerUnitRole(r)) {
      // 🟢 MANAGER_UNIT:{unitId}
      if (
        perm === Permission.USER_CREATE ||
        perm === Permission.USER_UPDATE ||
        perm === Permission.USER_SOFT_DELETE ||
        perm === Permission.USER_RESET_PASSWORD
      ) {
        return true;
      }
      continue;
    }

    // static role
    const perms = STATIC_ROLE_PERMS[r];
    if (perms?.includes(perm)) return true;
  }

  return false;
}

export function hasAnyPermission(roles: string[] | undefined, perms: readonly string[]): boolean {
  return perms.some((p) => hasPermission(roles, p));
}

/**
 * Useful for UI gating: user can manage users if any of these perms exist.
 */
export function canManageUsers(roles: string[] | undefined): boolean {
  return hasAnyPermission(roles, [
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_SOFT_DELETE,
    Permission.USER_RESET_PASSWORD,
  ]);
}