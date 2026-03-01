import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosError, AxiosRequestConfig } from 'axios';
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
    { status?: number; data?: any }
  > =>
  async ({ url, method = 'GET', data, params, headers }) => {
    try {
      const result = await api.request({ url, method, data, params, headers });
      return { data: result.data };
    } catch (err) {
      const e = err as AxiosError;
      return {
        error: { status: e.response?.status, data: e.response?.data ?? e.message },
      };
    }
  };