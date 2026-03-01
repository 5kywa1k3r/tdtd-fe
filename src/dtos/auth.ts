import type { AppUser } from './appUser';

export type LoginResponse = {
  accessToken: string;
  expiresInSeconds: number;
  user: AppUser;
};

export type RefreshResponse = {
  accessToken: string;
  user: AppUser;
  expiresInSeconds?: number;
};
