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
  isVirtual?: boolean;
};

export type UserPickRow = {
  id: string;
  username: string;
  fullName: string;
  unitId?: string | null;
  positionCode?: string | null;
};

export type CatalogPickRow = {
  id: string;
  code: string;
  name: string;
};

export type LabelEnumOptionPickRow = {
  id: string;
  catalogId: string;
  catalogCode: string;
  code: string;
  label: string;
  order: number;
};

type Tag =
  | { type: 'PickersUnits'; id: string }
  | { type: 'PickersUsers'; id: string }
  | { type: 'PickersCatalog'; id: string }
  | { type: 'LabelEnumCatalog'; id: string }
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

function isHiddenRootUnit(x: Pick<UnitPickRow, 'code' | 'fullName' | 'shortName' | 'symbol'>) {
  const code = (x.code ?? '').trim().toUpperCase();
  const fullName = (x.fullName ?? '').trim().toUpperCase();
  const shortName = (x.shortName ?? '').trim().toUpperCase();
  const symbol = (x.symbol ?? '').trim().toUpperCase();

  if (!code || code === 'ROOT') return true;
  return [fullName, shortName, symbol].some((value) => value === 'ROOT' || value === 'ROOT UNIT');
}

function mapUnitPickRow(x: any): UnitPickRow {
  return {
    id: x.id,
    code: x.code,
    fullName: x.fullName,
    shortName: x.shortName ?? null,
    symbol: x.symbol ?? null,
    level: Number(x.level ?? 0),
    parentId: x.parentId ?? null,
    isVirtual: !!x.isVirtual,
  };
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
        (res ?? [])
          .map((x: any) => mapUnitPickRow(x))
          .filter((row: UnitPickRow) => !isHiddenRootUnit(row)),

      providesTags: (_res, _err, arg): Tag[] => [
        { type: 'PickersUnits', id: 'TREE' },
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
        rows: (res?.rows ?? [])
          .map((x: any) => mapUnitPickRow(x))
          .filter((row: UnitPickRow) => !isHiddenRootUnit(row)),
        totalRows: Number(res?.totalRows ?? 0),
        page: Number(res?.page ?? 0),
        pageSize: Number(res?.pageSize ?? 20),
      }),

      providesTags: (): Tag[] => [
        { type: 'PickersUnits', id: 'TREE' },
        { type: 'PickersUnits', id: 'SEARCH' },
      ],

      ...pickerQueryDefaults,
    }),

    searchPickerUsers: b.query<
      PagedResult<UserPickRow>,
      { q?: string; unitId?: string | null; page?: number; pageSize?: number }
    >({
      query: ({ q, unitId, page = 0, pageSize = 20 }) => ({
        url: '/pickers/users/search',
        method: 'GET',
        params: {
          q: normStr(q) || undefined,
          unitId: normStr(unitId) || undefined,
          page,
          pageSize,
        },
      }),
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
      providesTags: (): Tag[] => [{ type: 'PickersUsers', id: 'SEARCH' }],
      ...pickerQueryDefaults,
    }),

    searchPickerPositions: b.query<
      PagedResult<CatalogPickRow>,
      { q?: string; page?: number; pageSize?: number }
    >({
      query: ({ q, page = 0, pageSize = 20 }) => ({
        url: '/pickers/positions/search',
        method: 'GET',
        params: { q: normStr(q) || undefined, page, pageSize },
      }),
      transformResponse: (res: any): PagedResult<CatalogPickRow> => ({
        rows: (res?.rows ?? []).map((x: any) => ({
          id: x.id,
          code: x.code,
          name: x.name,
        })),
        totalRows: Number(res?.totalRows ?? 0),
        page: Number(res?.page ?? 0),
        pageSize: Number(res?.pageSize ?? 20),
      }),
      providesTags: (): Tag[] => [{ type: 'PickersCatalog', id: 'POSITIONS' }],
      ...pickerQueryDefaults,
    }),

    searchPickerUnitTypes: b.query<
      PagedResult<CatalogPickRow>,
      { q?: string; page?: number; pageSize?: number }
    >({
      query: ({ q, page = 0, pageSize = 20 }) => ({
        url: '/pickers/unit-types/search',
        method: 'GET',
        params: { q: normStr(q) || undefined, page, pageSize },
      }),
      transformResponse: (res: any): PagedResult<CatalogPickRow> => ({
        rows: (res?.rows ?? []).map((x: any) => ({
          id: x.id,
          code: x.code,
          name: x.name,
        })),
        totalRows: Number(res?.totalRows ?? 0),
        page: Number(res?.page ?? 0),
        pageSize: Number(res?.pageSize ?? 20),
      }),
      providesTags: (): Tag[] => [{ type: 'PickersCatalog', id: 'UNIT_TYPES' }],
      ...pickerQueryDefaults,
    }),

    searchPickerLabelEnumOptions: b.query<
      PagedResult<LabelEnumOptionPickRow>,
      { catalogId: string; q?: string; page?: number; pageSize?: number }
    >({
      query: ({ catalogId, q, page = 0, pageSize = 20 }) => ({
        url: `/pickers/label-enums/${catalogId}/options/search`,
        method: 'GET',
        params: { q: normStr(q) || undefined, page, pageSize },
      }),
      transformResponse: (res: any): PagedResult<LabelEnumOptionPickRow> => ({
        rows: (res?.rows ?? []).map((x: any) => ({
          id: x.id,
          catalogId: x.catalogId,
          catalogCode: x.catalogCode,
          code: x.code,
          label: x.label,
          order: Number(x.order ?? 0),
        })),
        totalRows: Number(res?.totalRows ?? 0),
        page: Number(res?.page ?? 0),
        pageSize: Number(res?.pageSize ?? 20),
      }),
      providesTags: (_res, _err, arg): Tag[] => [{ type: 'LabelEnumCatalog', id: `OPTIONS:${arg.catalogId}` }],
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
  useLazySearchPickerUsersQuery,
  useLazySearchPickerPositionsQuery,
  useLazySearchPickerUnitTypesQuery,
  useLazySearchPickerLabelEnumOptionsQuery,
  useLazySearchPickerLeadersByUnitQuery,
  useLazyLookupPickerLeaderByUsernameQuery,
  useLazySearchPickerAssigneesByUnitQuery,
  useLazyLookupPickerAssigneeByUsernameQuery,
} = pickersApi;
