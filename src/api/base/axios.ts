import axios from 'axios';
import { getTokenFromStorage, setTokenToActiveStorage, setMeSnapshot } from '../../stores/authStorage';
import type { RefreshResponse } from '../../dtos/auth';
import { performLogout } from '../../utils/AuthEvents';

const baseURL = import.meta.env.VITE_API_URL ?? 'https://localhost:7232/api';

// main api
export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// refresh client (NO auth header, NO 401 retry)
const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

// attach access token
api.interceptors.request.use((config) => {
  const token = getTokenFromStorage();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// chống spam refresh song song
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const res = await refreshClient.post<RefreshResponse>('/auth/refresh', {});
  const newToken = res.data.accessToken;

  if (!newToken) throw new Error('Refresh succeeded but missing accessToken');
  setTokenToActiveStorage(newToken);
  setMeSnapshot(res.data.user);

  return newToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config;

    if (!original) return Promise.reject(error);

    const status = error?.response?.status;
    const url = String(original.url ?? '');

    // Nếu refresh itself chết -> logout luôn (không retry)
    if (status === 401 && url.includes('/auth/refresh')) {
      performLogout();
      return Promise.reject(error);
    }

    // Retry 1 lần khi 401
    if (status === 401 && !original._retry) {
      original._retry = true;

      try {
        if (!refreshing) {
          refreshing = refreshAccessToken().finally(() => {
            refreshing = null;
          });
        }

        const newToken = await refreshing;

        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;

        return api.request(original);
      } catch (e) {
        performLogout();
        return Promise.reject(e);
      }
    }

    // Nếu đã retry rồi mà vẫn 401 => logout để khỏi kẹt
    if (status === 401 && original._retry) {
      performLogout();
    }

    return Promise.reject(error);
  }
);