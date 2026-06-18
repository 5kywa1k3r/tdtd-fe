import axios from 'axios';
import { getTokenFromStorage, setTokenToActiveStorage, setMeSnapshot } from '../../stores/authStorage';
import type { RefreshResponse } from '../../dtos/auth';
import { performLogout } from '../../utils/AuthEvents';
import { ApiErrorCode } from '../../constants/errorCodes';
import { normalizeApiError } from '../../utils/apiError';

const baseURL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'https://localhost:7232/api' : '/api');

function isAuthRequest(url: string, path: string): boolean {
  return url === path || url.endsWith(path) || url.includes(path);
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const responseStatus = (error as { response?: { status?: unknown } }).response?.status;
  if (typeof responseStatus === 'number') return responseStatus;

  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

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

  if (!newToken) {
    throw {
      response: {
        status: 401,
        data: {
          errorCode: ApiErrorCode.AuthMeNotAvailable,
          service: 'AUTH',
          message: 'Không lấy được thông tin người dùng.',
        },
      },
    };
  }
  setTokenToActiveStorage(newToken);
  setMeSnapshot(res.data.user);

  return newToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config;

    if (!original) return Promise.reject(normalizeApiError(error));

    const status = error?.response?.status;
    const url = String(original.url ?? '');

    // Nếu refresh itself chết -> logout luôn (không retry)
    if (status === 401 && isAuthRequest(url, '/auth/refresh')) {
      performLogout();
      return Promise.reject(normalizeApiError(error));
    }

    if (status === 401 && isAuthRequest(url, '/auth/login')) {
      return Promise.reject(normalizeApiError(error));
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
        if (getErrorStatus(e) === 401) {
          performLogout();
        }
        return Promise.reject(normalizeApiError(e));
      }
    }

    // Nếu đã retry rồi mà vẫn 401 => logout để khỏi kẹt
    if (status === 401 && original._retry) {
      performLogout();
    }

    return Promise.reject(normalizeApiError(error));
  }
);
