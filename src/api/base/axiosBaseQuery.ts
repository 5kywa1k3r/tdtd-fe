import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig } from 'axios';
import type { ApiError } from '../../types/apiError';
import { normalizeApiError } from '../../utils/apiError';
import { api } from './axios';

export const axiosBaseQuery =
  (): BaseQueryFn<
    {
      url: string;
      method?: AxiosRequestConfig['method'];
      data?: any;
      params?: any;
      headers?: any;
    },
    unknown,
    ApiError
  > =>
  async ({ url, method = 'GET', data, params, headers }) => {
    try {
      const result = await api.request({ url, method, data, params, headers });
      return { data: result.data };
    } catch (err) {
      return {
        error: normalizeApiError(err),
      };
    }
  };
