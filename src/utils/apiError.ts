import type { AxiosError } from 'axios';
import { ApiErrorCode } from '../constants/errorCodes';
import { API_ERROR_MESSAGES, DEFAULT_ERROR_MESSAGE } from '../constants/errorMessages';
import type { ApiError, ApiErrorPayload } from '../types/apiError';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAxiosLikeError(value: unknown): value is AxiosError<unknown> {
  return isObject(value) && value.isAxiosError === true;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return isObject(value);
}

function messageFor(errorCode: string | undefined, payloadMessage: string | undefined): string {
  if (errorCode === ApiErrorCode.CommonValidationFailed && payloadMessage) {
    return payloadMessage;
  }
  if (errorCode && errorCode in API_ERROR_MESSAGES) {
    return API_ERROR_MESSAGES[errorCode as keyof typeof API_ERROR_MESSAGES] ?? payloadMessage ?? DEFAULT_ERROR_MESSAGE;
  }
  return payloadMessage ?? DEFAULT_ERROR_MESSAGE;
}

function toSerializableValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value == null) return value;

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') return value;
  if (valueType === 'bigint') return value.toString();
  if (valueType === 'undefined' || valueType === 'function' || valueType === 'symbol') return undefined;
  if (depth > 5) return '[MaxDepth]';

  if (value instanceof Date) return value.toISOString();

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof File !== 'undefined' && value instanceof File) {
    return {
      name: value.name,
      size: value.size,
      type: value.type,
      lastModified: value.lastModified,
    };
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return {
      size: value.size,
      type: value.type,
    };
  }

  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return '[FormData]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSerializableValue(item, depth + 1, seen));
  }

  if (isObject(value)) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (isAxiosLikeError(value)) {
      return {
        name: value.name,
        message: value.message,
        code: value.code,
        status: value.response?.status,
        responseData: toSerializableValue(value.response?.data, depth + 1, seen),
      };
    }

    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      const serialized = toSerializableValue(child, depth + 1, seen);
      if (serialized !== undefined) output[key] = serialized;
    }
    return output;
  }

  return String(value);
}

export function normalizeApiError(error: unknown): ApiError {
  const maybeAxios = error as AxiosError<unknown>;
  const status = maybeAxios?.response?.status;
  const data = maybeAxios?.response?.data;

  if (isAxiosLikeError(error)) {
    if (isApiErrorPayload(data)) {
      const errorCode = typeof data.errorCode === 'string' ? data.errorCode : typeof data.error === 'string' ? data.error : undefined;
      const payloadMessage = typeof data.message === 'string' ? data.message : undefined;
      return {
        status,
        errorCode,
        service: typeof data.service === 'string' ? data.service : undefined,
        message: messageFor(errorCode, payloadMessage),
        details: toSerializableValue(data.details),
        traceId: typeof data.traceId === 'string' ? data.traceId : undefined,
        raw: toSerializableValue(data),
      };
    }

    if (typeof data === 'string') {
      return {
        status,
        message: data || DEFAULT_ERROR_MESSAGE,
        raw: data,
      };
    }

    return {
      status,
      message: error.message || DEFAULT_ERROR_MESSAGE,
      raw: toSerializableValue(error),
    };
  }

  if (isObject(error) && typeof error.message === 'string') {
    return {
      status: typeof error.status === 'number' ? error.status : undefined,
      errorCode: typeof error.errorCode === 'string' ? error.errorCode : undefined,
      service: typeof error.service === 'string' ? error.service : undefined,
      message: error.message,
      details: toSerializableValue(error.details),
      traceId: typeof error.traceId === 'string' ? error.traceId : undefined,
      raw: toSerializableValue(error.raw ?? error),
    };
  }

  if (isApiErrorPayload(data)) {
    const errorCode = typeof data.errorCode === 'string' ? data.errorCode : typeof data.error === 'string' ? data.error : undefined;
    const payloadMessage = typeof data.message === 'string' ? data.message : undefined;
    return {
      status,
      errorCode,
      service: typeof data.service === 'string' ? data.service : undefined,
      message: messageFor(errorCode, payloadMessage),
      details: toSerializableValue(data.details),
      traceId: typeof data.traceId === 'string' ? data.traceId : undefined,
      raw: toSerializableValue(data),
    };
  }

  if (typeof data === 'string') {
    return {
      status,
      message: data || DEFAULT_ERROR_MESSAGE,
      raw: data,
    };
  }

  if (error instanceof Error) {
    return {
      status,
      message: error.message || DEFAULT_ERROR_MESSAGE,
      raw: toSerializableValue(error),
    };
  }

  return {
    status,
    message: DEFAULT_ERROR_MESSAGE,
    raw: toSerializableValue(error),
  };
}

export function getApiErrorMessage(error: unknown): string {
  return normalizeApiError(error).message;
}
