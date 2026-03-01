import { Role } from '../constants/roles';

export function getAssignableTopRoles(meRoles: string[] | undefined): string[] {
  // SYSTEM_ADMIN: assign anything (tuỳ policy)
  if (meRoles?.includes(Role.SYSTEM_ADMIN)) return [Role.SYSTEM_ADMIN, Role.ADMIN, Role.MANAGER_LEVEL];

  // ADMIN: chỉ được tạo SYSTEM_ADMIN (theo doc )
  if (meRoles?.includes(Role.ADMIN)) return [Role.SYSTEM_ADMIN];

  // managers: không được assign ADMIN/SYSTEM_ADMIN
  if (meRoles?.includes(Role.MANAGER_LEVEL)) return [Role.MANAGER_LEVEL];
  // MANAGER_UNIT:{unitId} -> assign manager_unit? thường không cho assign role quản trị, hoặc chỉ role thường (USER)
  return [];
}