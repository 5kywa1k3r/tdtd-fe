const TOKEN_KEY = 'tdtd_access_token';
const ME_KEY = 'tdtd_me_snapshot';

export function getTokenFromStorage(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setTokenToActiveStorage(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthStorage() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ME_KEY);
}

export type MeSnapshot = {
  id: string;
  username: string;
  fullName?: string;
  roles: string[];
  unitId?: string;
  unitCode?: string;
  unitName?: string;
  cachedAt: number;
};

export function parseMeSnapshot(raw: string | null): MeSnapshot | null {
  if (!raw) return null;

  try {
    const obj = JSON.parse(raw);

    // validate tối thiểu
    if (!obj || typeof obj !== 'object') return null;
    if (!Array.isArray(obj.roles)) return null;
    if (typeof obj.id !== 'string') return null;

    return obj as MeSnapshot;
  } catch {
    return null;
  }
}

export function getMeSnapshot(): MeSnapshot | null {
  return parseMeSnapshot(sessionStorage.getItem(ME_KEY));
}

export function setMeSnapshot(me: Omit<MeSnapshot, 'cachedAt'>) {
  sessionStorage.setItem(ME_KEY, JSON.stringify({ ...me, cachedAt: Date.now() }));
}