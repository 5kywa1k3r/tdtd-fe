import type { ApiErrorCodeValue } from '../constants/errorCodes';

export type ApiErrorPayload = {
  errorCode?: ApiErrorCodeValue | string;
  service?: string;
  message?: string;
  details?: unknown;
  traceId?: string;
  error?: string;
};

export type ApiError = {
  status?: number;
  errorCode?: ApiErrorCodeValue | string;
  service?: string;
  message: string;
  details?: unknown;
  traceId?: string;
  raw?: unknown;
};
