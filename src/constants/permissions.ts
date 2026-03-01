export const Permission = {
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_SOFT_DELETE: 'USER_SOFT_DELETE',
  USER_RESET_PASSWORD: 'USER_RESET_PASSWORD',

  UNIT_CREATE: 'UNIT_CREATE',
  UNIT_UPDATE: 'UNIT_UPDATE',
  UNIT_SOFT_DELETE: 'UNIT_SOFT_DELETE',

  // add more if needed
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];