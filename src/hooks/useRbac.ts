import { useMemo } from 'react';
import { Permission } from '../constants/permissions';
import { hasPermission } from '../utils/rbac';
import { getMeSnapshot } from '../stores/authStorage';

export function useRbac() {
  const me = getMeSnapshot();

  return useMemo(() => {
    const roles = me?.roles ?? [];

    return {
      roles,
      canCreateUser: hasPermission(roles, Permission.USER_CREATE),
      canUpdateUser: hasPermission(roles, Permission.USER_UPDATE),
      canSoftDeleteUser: hasPermission(roles, Permission.USER_SOFT_DELETE),
      canResetPassword: hasPermission(roles, Permission.USER_RESET_PASSWORD),

      canCreateUnit: hasPermission(roles, Permission.UNIT_CREATE),
      canUpdateUnit: hasPermission(roles, Permission.UNIT_UPDATE),
      canSoftDeleteUnit: hasPermission(roles, Permission.UNIT_SOFT_DELETE),
    };
  }, [me?.roles]);
}