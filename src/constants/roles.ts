export const Role = {
  ADMIN: 'ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  MANAGER_LEVEL: 'MANAGER_LEVEL',
  MANAGER_UNIT: 'MANAGER_UNIT',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_PREFIX = {
  MANAGER_UNIT: 'MANAGER_UNIT:',
  MANAGER_LEVEL: 'MANAGER_LEVEL:',
} as const;

export type RolePrefix = (typeof ROLE_PREFIX)[keyof typeof ROLE_PREFIX];

// Helpers for dynamic roles
export const makeManagerUnitRole = (unitId: string) => `${ROLE_PREFIX.MANAGER_UNIT}${unitId}`;

export const isManagerUnitRole = (r: string) => r.startsWith(ROLE_PREFIX.MANAGER_UNIT);

export const getManagerUnitId = (r: string) =>
  isManagerUnitRole(r) ? r.slice(ROLE_PREFIX.MANAGER_UNIT.length) : null;

export const makeManagerLevelRole = (level: number | string) =>
  `${ROLE_PREFIX.MANAGER_LEVEL}${level}`;

export const isManagerLevelRole = (r: string) => r.startsWith(ROLE_PREFIX.MANAGER_LEVEL);

export const getManagerLevel = (r: string) =>
  isManagerLevelRole(r) ? r.slice(ROLE_PREFIX.MANAGER_LEVEL.length) : null;