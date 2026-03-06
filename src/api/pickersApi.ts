import { baseApi } from './base/baseApi';
import { type PagedResult } from '../types/pagedResult';

export type SortDirection = 'asc' | 'desc';

export type UnitPickRow = {
  id: string;
  code: string;
  fullName: string;
  shortName?: string | null;
  symbol?: string | null;
  level: number;
  parentId?: string | null;
};

export type UserPickRow = {
  id: string;
  username: string;
  fullName: string;
  unitId?: string | null;
  positionCode?: string | null;
};

type Tag =
  | { type: 'PickersUnits'; id: string }
  | { type: 'PickersLeaders'; id: string }
  | { type: 'PickersAssignees'; id: string };

// ===== shared query options (tối ưu refetch) =====
const pickerQueryDefaults = {
  keepUnusedDataFor: 900, // ✅ 15 phút
  refetchOnMountOrArgChange: false,
  refetchOnFocus: false,
  refetchOnReconnect: false,
} as const;

function normStr(s?: string | null) {
  const t = (s ?? '').trim();
  return t;
}

function normUsername(s?: string | null) {
  return normStr(s).toLowerCase();
}

function normParentId(parentId?: string | null) {
  const p = normStr(parentId);
  if (!p) return ''; // root
  if (p.toLowerCase() === 'null') return '';
  return p;
}

export const pickersApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // ===== UNITS =====
    getPickerUnitChildren: b.query<UnitPickRow[], { parentId?: string | null }>({
      query: ({ parentId }) => {
        const pid = normParentId(parentId);
        return {
          url: '/pickers/units/children',
          method: 'GET',
          // ✅ root => không gửi parentId=
          params: pid ? { parentId: pid } : {},
        };
      },

      // ✅ cache key ổn định (tránh null/undefined/"")
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const pid = normParentId(queryArgs.parentId);
        return `${endpointName}|${pid || 'ROOT'}`;
      },

      transformResponse: (res: any): UnitPickRow[] =>
        (res ?? []).map((x: any) => ({
          id: x.id,
          code: x.code,
          fullName: x.fullName,
          shortName: x.shortName ?? null,
          symbol: x.symbol ?? null,
          level: Number(x.level ?? 0),
          parentId: x.parentId ?? null,
        })),

      providesTags: (_res, _err, arg): Tag[] => [
        { type: 'PickersUnits', id: `CHILDREN:${normParentId(arg.parentId) || 'ROOT'}` },
      ],

      ...pickerQueryDefaults,
    }),

    searchPickerUnitsByCode: b.query<
      PagedResult<UnitPickRow>,
      { code?: string; page?: number; pageSize?: number }
    >({
      query: ({ code, page = 0, pageSize = 20 }) => ({
        url: '/pickers/units/search',
        method: 'GET',
        params: { code: normStr(code) || undefined, page, pageSize },
      }),

      // ✅ cache key ổn định (trim + default page/pageSize)
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const code = normStr(queryArgs.code);
        const page = queryArgs.page ?? 0;
        const pageSize = queryArgs.pageSize ?? 20;
        return `${endpointName}|${code}|${page}|${pageSize}`;
      },

      transformResponse: (res: any): PagedResult<UnitPickRow> => ({
        rows: (res?.rows ?? []).map((x: any) => ({
          id: x.id,
          code: x.code,
          fullName: x.fullName,
          shortName: x.shortName ?? null,
          symbol: x.symbol ?? null,
          level: Number(x.level ?? 0),
          parentId: x.parentId ?? null,
        })),
        totalRows: Number(res?.totalRows ?? 0),
        page: Number(res?.page ?? 0),
        pageSize: Number(res?.pageSize ?? 20),
      }),

      providesTags: (): Tag[] => [{ type: 'PickersUnits', id: 'SEARCH' }],

      ...pickerQueryDefaults,
    }),

    // ===== LEADERS =====
    searchPickerLeadersByUnit: b.query<
      PagedResult<UserPickRow>,
      { unitId: string; username?: string; page?: number; pageSize?: number }
    >({
      query: ({ unitId, username, page = 0, pageSize = 20 }) => ({
        url: '/pickers/leaders/by-unit',
        method: 'GET',
        params: {
          unitId: unitId.trim(),
          username: normUsername(username) || undefined,
          page,
          pageSize,
        },
      }),

      // ✅ cache key ổn định (unitId + username + page + pageSize)
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const unitId = normStr(queryArgs.unitId);
        const username = normUsername(queryArgs.username);
        const page = queryArgs.page ?? 0;
        const pageSize = queryArgs.pageSize ?? 20;
        return `${endpointName}|${unitId}|${username}|${page}|${pageSize}`;
      },

      transformResponse: (res: any): PagedResult<UserPickRow> => ({
        rows: (res?.rows ?? []).map((x: any) => ({
          id: x.id,
          username: x.username,
          fullName: x.fullName,
          unitId: x.unitId ?? null,
          positionCode: x.positionCode ?? null,
        })),
        totalRows: Number(res?.totalRows ?? 0),
        page: Number(res?.page ?? 0),
        pageSize: Number(res?.pageSize ?? 20),
      }),

      // tag coarse cũng OK; nếu sau này invalidate, có thể refine theo query key
      providesTags: (_res, _err, arg): Tag[] => [{ type: 'PickersLeaders', id: `UNIT:${arg.unitId}` }],

      ...pickerQueryDefaults,
    }),

    lookupPickerLeaderByUsername: b.query<UserPickRow | null, { username: string; unitId?: string }>({
      query: ({ username, unitId }) => ({
        url: '/pickers/leaders/lookup',
        method: 'GET',
        params: {
          username: username.trim(),
          unitId: normStr(unitId) || undefined,
        },
      }),

      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const username = normUsername(queryArgs.username);
        const unitId = normStr(queryArgs.unitId);
        return `${endpointName}|${username}|${unitId}`;
      },

      transformResponse: (x: any): UserPickRow | null =>
        x
          ? {
              id: x.id,
              username: x.username,
              fullName: x.fullName,
              unitId: x.unitId ?? null,
              positionCode: x.positionCode ?? null,
            }
          : null,

      providesTags: (): Tag[] => [{ type: 'PickersLeaders', id: 'LOOKUP' }],

      ...pickerQueryDefaults,
    }),

    // ===== ASSIGNEES =====
    searchPickerAssigneesByUnit: b.query<
      PagedResult<UserPickRow>,
      { unitId: string; username?: string; page?: number; pageSize?: number }
    >({
      query: ({ unitId, username, page = 0, pageSize = 20 }) => ({
        url: '/pickers/assignees/by-unit',
        method: 'GET',
        params: {
          unitId: unitId.trim(),
          username: normUsername(username) || undefined,
          page,
          pageSize,
        },
      }),

      // ✅ cache key ổn định (unitId + username + page + pageSize)
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const unitId = normStr(queryArgs.unitId);
        const username = normUsername(queryArgs.username);
        const page = queryArgs.page ?? 0;
        const pageSize = queryArgs.pageSize ?? 20;
        return `${endpointName}|${unitId}|${username}|${page}|${pageSize}`;
      },

      transformResponse: (res: any): PagedResult<UserPickRow> => ({
        rows: (res?.rows ?? []).map((x: any) => ({
          id: x.id,
          username: x.username,
          fullName: x.fullName,
          unitId: x.unitId ?? null,
          positionCode: x.positionCode ?? null,
        })),
        totalRows: Number(res?.totalRows ?? 0),
        page: Number(res?.page ?? 0),
        pageSize: Number(res?.pageSize ?? 20),
      }),

      providesTags: (_res, _err, arg): Tag[] => [
        { type: 'PickersAssignees', id: `UNIT:${arg.unitId}` },
      ],

      ...pickerQueryDefaults,
    }),

    lookupPickerAssigneeByUsername: b.query<UserPickRow | null, { username: string; unitId?: string }>({
      query: ({ username, unitId }) => ({
        url: '/pickers/assignees/lookup',
        method: 'GET',
        params: {
          username: username.trim(),
          unitId: normStr(unitId) || undefined,
        },
      }),

      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const username = normUsername(queryArgs.username);
        const unitId = normStr(queryArgs.unitId);
        return `${endpointName}|${username}|${unitId}`;
      },

      transformResponse: (x: any): UserPickRow | null =>
        x
          ? {
              id: x.id,
              username: x.username,
              fullName: x.fullName,
              unitId: x.unitId ?? null,
              positionCode: x.positionCode ?? null,
            }
          : null,

      providesTags: (): Tag[] => [{ type: 'PickersAssignees', id: 'LOOKUP' }],

      ...pickerQueryDefaults,
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetPickerUnitChildrenQuery,
  useLazySearchPickerUnitsByCodeQuery,
  useLazySearchPickerLeadersByUnitQuery,
  useLazyLookupPickerLeaderByUsernameQuery,
  useLazySearchPickerAssigneesByUnitQuery,
  useLazyLookupPickerAssigneeByUsernameQuery,
} = pickersApi;