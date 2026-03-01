import { baseApi } from '../base/baseApi';
import type { LoginResponse, RefreshResponse } from '../../dtos/auth';
import { setTokenToActiveStorage, setMeSnapshot } from '../../stores/authStorage';
import { setAuthenticated } from '../../stores/authSlice';

export type LoginRequest = { username: string; password: string };

export const authApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    login: b.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', data: body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        setTokenToActiveStorage(data.accessToken);
        setMeSnapshot(data.user);
        dispatch(setAuthenticated(true));
        dispatch(baseApi.util.invalidateTags(['Me']));
      },
    }),

    // refresh endpoint không cần gọi trực tiếp (axios interceptor lo), để đây nếu  muốn manual
    refresh: b.mutation<RefreshResponse, void>({
      query: () => ({ url: '/auth/refresh', method: 'POST', data: {} }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        const { data } = await queryFulfilled;
        setTokenToActiveStorage(data.accessToken);
        setMeSnapshot(data.user);
      },
    }),
  }),
});

export const { useLoginMutation, useRefreshMutation } = authApi;