import { baseApi } from './base/baseApi';
import { type PagedResult } from '../types/pagedResult';

export type SortDirection = 'asc' | 'desc';

export type UserSearchRow = {
  id: string;
  username: string;
  fullName: string;
  unitId?: string | null;
  unitShortName?: string | null;
  unitSymbol?: string | null;
  unitCode?: string | null;
  positionCode?: string | null;
  isDeleted: boolean;
  roles: string[]; //  NEW: dùng để disable nút theo target role
};

export type UserDto = {
  id: string;
  username: string;
  fullName: string;
  unitId: string;
  unitName: string;
  roles: string[];
  positionCode: string; // ✅ giữ nguyên (required)
  note?: string;
  createdAtUtc?: string;
  updatedAtUtc?: string;
};

export type CreateUserReq = {
  username: string;
  password: string;
  fullName: string;
  unitId: string;
  positionCode: string; // ✅ giữ nguyên
  roles: string[];
};

export type UpdateUserReq = {
  username?: string;
  fullName: string;
  roles?: string[];
  positionCode: string; // ✅ giữ nguyên
  note?: string;
};

export type ResetPasswordReq = {
  newPassword: string;
};

type Tag =
  | { type: 'Users'; id: string }
  | { type: 'Me'; id: string };

export type SearchUsersArg = {
  q?: string;
  isDeleted?: boolean;
  /** search theo mã đơn vị cha (prefix)*/
  unitCodePrefix?: string;
  positionCode?: string;
  page?: number; // 0-based
  pageSize?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
};

export const adminUsersApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // GET /admin/users/search?q=&isDeleted=&unitCodePrefix=&page=&pageSize=&sortField=&sortDirection=
    searchUsers: b.query<PagedResult<UserSearchRow>, SearchUsersArg>({
      query: ({
        q,
        isDeleted,
        unitCodePrefix,
        positionCode,
        page = 0,
        pageSize = 10,
        sortField,
        sortDirection,
      }) => ({
        url: '/admin/users/search',
        method: 'GET',
        params: {
          q,
          isDeleted,
          unitCodePrefix: unitCodePrefix?.trim() || undefined,
          positionCode: positionCode?.trim() || undefined, // ✅ NEW
          page,
          pageSize,
          sortField,
          sortDirection,
        },
      }),

      transformResponse: (res: any): PagedResult<UserSearchRow> => ({
        rows: (res?.rows ?? []).map((r: any) => ({
          id: r.id,
          username: r.username,
          fullName: r.fullName,

          unitId: r.unitId ?? null,
          unitShortName: r.unitShortName ?? null,
          unitSymbol: r.unitSymbol ?? null,
          unitCode: r.unitCode ?? r._unitCode ?? null,

          // ✅ NEW
          positionCode: r.positionCode ?? r._positionCode ?? null,

          isDeleted: !!r.isDeleted,
          roles: Array.isArray(r.roles) ? r.roles : [],
        })),
        totalRows: Number(res?.totalRows ?? 0),
        page: Number(res?.page ?? 0),
        pageSize: Number(res?.pageSize ?? 10),
      }),
    }),

    // GET /admin/users/{userId}
    getUserById: b.query<UserDto, { userId: string }>({
      query: ({ userId }) => ({ url: `/admin/users/${userId}`, method: 'GET' }),
      providesTags: (_res, _err, arg): Tag[] => [{ type: 'Users', id: arg.userId }],
      keepUnusedDataFor: 60,
    }),

    // POST /admin/users
    createUser: b.mutation<UserDto, CreateUserReq>({
      query: (body) => ({ url: '/admin/users', method: 'POST', data: body }),
      invalidatesTags: (): Tag[] => [{ type: 'Users', id: 'SEARCH_ALL' }],
    }),

    // PUT /admin/users/{userId}
    updateUser: b.mutation<UserDto, { userId: string; body: UpdateUserReq; mayAffectMe?: boolean }>({
      query: ({ userId, body }) => ({ url: `/admin/users/${userId}`, method: 'PUT', data: body }),
      invalidatesTags: (_res, _err, arg): Tag[] => {
        const tags: Tag[] = [
          { type: 'Users', id: arg.userId },
          { type: 'Users', id: 'SEARCH_ALL' },
        ];
        if (arg.mayAffectMe) tags.push({ type: 'Me', id: 'ME' });
        return tags;
      },
    }),

    // DELETE /admin/users/{userId}  (soft delete)
    softDeleteUser: b.mutation<void, { userId: string; mayAffectMe?: boolean }>({
      query: ({ userId }) => ({ url: `/admin/users/${userId}`, method: 'DELETE' }),
      invalidatesTags: (_res, _err, arg): Tag[] => {
        const tags: Tag[] = [
          { type: 'Users', id: arg.userId },
          { type: 'Users', id: 'SEARCH_ALL' },
        ];
        if (arg.mayAffectMe) tags.push({ type: 'Me', id: 'ME' });
        return tags;
      },
    }),

    // POST /admin/users/{userId}/reset-password
    resetPassword: b.mutation<void, { userId: string; body: ResetPasswordReq; mayAffectMe?: boolean }>({
      query: ({ userId, body }) => ({
        url: `/admin/users/${userId}/reset-password`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: (_res, _err, arg): Tag[] => {
        const tags: Tag[] = [{ type: 'Users', id: arg.userId }];
        if (arg.mayAffectMe) tags.push({ type: 'Me', id: 'ME' });
        return tags;
      },
    }),
  }),
  overrideExisting: true,
});

export const {
  useSearchUsersQuery,
  useLazySearchUsersQuery,
  useGetUserByIdQuery,
  useLazyGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useSoftDeleteUserMutation,
  useResetPasswordMutation,
} = adminUsersApi;