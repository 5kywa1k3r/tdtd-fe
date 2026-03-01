import { baseApi } from './baseApi';

export type MeDto = {
  id: string;
  username: string;
  fullName: string;
  unitId: string;
  unitName: string;
  unitCode: string;
  roles: string[];
  isDeleted: boolean;
};

export const meApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getMe: b.query<MeDto, void>({
      query: () => ({ url: '/auth/me' }),
      providesTags: [{ type: 'Me', id: 'ME' }],
    }),
  }),
});

export const { useGetMeQuery } = meApi;