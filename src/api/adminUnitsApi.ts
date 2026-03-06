import { baseApi } from './base/baseApi';

// ===== Types =====
export type UnitDto = {
  id: string;
  fullName: string;

  /** Tên viết tắt */
  shortName?: string | null;

  /** Ký hiệu (mới) */
  symbol?: string | null;

  parentUnitId?: string | null;
  code: string; // "" is system root
  level: number;
  version?: number;
  unitTypeCodes?: string[];
  note?: string | null;

  /** Soft delete flags (tuỳ BE trả field nào) */
  isDeleted?: boolean;
  deletedAt?: string | null;
};

export type CreateUnitReq = {
  fullName: string;
  shortName?: string | null;
  symbol?: string | null;
  parentUnitId?: string | null;
  unitTypeCodes?: string[];
};

/**
 *  Update chỉ đổi tên/viết tắt/ký hiệu (bỏ move)
 * - Không còn parentUnitId/unitTypeIds/saveHistoryForWholeSubtree
 */
export type UpdateUnitReq = {
  fullName: string;
  shortName?: string | null;
  symbol?: string | null;
  note?: string | null;
};

export type UnitPickNode = {
  id: string;
  fullName: string;
  code: string;
  level: number;
  shortName: string;
  symbol: string;
};

export type UnitHistoryDto = {
  version: number;
  changedAt: string;
  changedBy?: { id: string; username: string; fullName?: string };
  snapshot: UnitDto;
};

type Tag =
  | { type: 'Units'; id: string }
  | { type: 'UnitHistory'; id: string };

// ===== Helper filters =====

// FE filter system root (code=="") nếu BE vẫn trả
const filterSystemRoot = (xs: UnitDto[]) => xs.filter((x) => x.code !== '');

// FE filter soft-deleted (hỗ trợ cả isDeleted hoặc deletedAt)
const filterSoftDeleted = (xs: UnitDto[]) =>
  xs.filter((x) => !(x.isDeleted === true) && !x.deletedAt);

// gộp filter
const filterVisible = (xs: UnitDto[]) => filterSoftDeleted(filterSystemRoot(xs));

// ===== API =====
export const adminUnitsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getUnitRoots: b.query<UnitDto[], void>({
      query: () => ({ url: '/admin/units/roots', method: 'GET' }),
      transformResponse: (res: UnitDto[]) => filterVisible(res),
      providesTags: (res): Tag[] =>
        res
          ? [
              { type: 'Units', id: 'ROOTS' },
              ...res.map((u) => ({ type: 'Units', id: u.id } as const)),
            ]
          : [{ type: 'Units', id: 'ROOTS' }],
    }),

    //  backend-driven lazy children
    getUnitChildren: b.query<UnitPickNode[], { parentId?: string | null }>({
      query: ({ parentId }) => ({
        url: '/admin/units/children',
        method: 'GET',
        params: { parentId: parentId ?? '' }, //  '' = level 0
      }),
      transformResponse: (res: any[]): UnitPickNode[] =>
        (res ?? []).map((x) => ({
          id: x.id,
          fullName: x.fullName,
          code: x.code ?? '',
          level: x.level ?? 0,
          shortName: x.shortName ?? '',
          symbol: x.symbol ?? '',
        })),
      providesTags: (_res, _err, arg) => [
        { type: 'Units', id: `CHILDREN:${arg.parentId ?? 'ROOT'}` },
      ],
      keepUnusedDataFor: 300,
    }),

    searchSubtreeByCodePrefix: b.query<UnitDto[], string>({
      query: (prefix) => ({
        url: '/admin/units/search-by-code-prefix',
        method: 'GET',
        params: { prefix },
      }),
      transformResponse: (res: UnitDto[]) => filterVisible(res),

      //  thêm TREE để create/update invalidates TREE thì query này refetch
      providesTags: (_res, _err, prefix): Tag[] => [
        { type: 'Units', id: 'TREE' },
        { type: 'Units', id: prefix ? `PREFIX:${prefix}` : 'TREE' },
      ],
    }),

    createUnit: b.mutation<UnitDto, CreateUnitReq>({
      query: (body) => ({ url: '/admin/units', method: 'POST', data: body }),
      invalidatesTags: (_res, _err, body): Tag[] => {
        const tags: Tag[] = [
          { type: 'Units', id: 'TREE' }, // nếu có view tree/prefix cache
        ];

        if (body.parentUnitId) {
          tags.push({ type: 'Units', id: `CHILDREN:${body.parentUnitId}` });
        } else {
          tags.push({ type: 'Units', id: 'ROOTS' });
        }

        return tags;
      },
    }),

    updateUnit: b.mutation<UnitDto, { unitId: string; body: UpdateUnitReq }>({
      query: ({ unitId, body }) => ({
        url: `/admin/units/${unitId}`,
        method: 'PUT',
        data: body,
      }),
      invalidatesTags: (_res, _err, arg): Tag[] => [
        { type: 'Units', id: arg.unitId },
        { type: 'UnitHistory', id: arg.unitId },
        { type: 'Units', id: 'ROOTS' },
        { type: 'Units', id: 'TREE' },
        // NOTE: nếu UI đang đứng ở parent children list thì parent invalidation nên do component biết parentId
      ],
    }),

    //  đúng route soft delete
    softDeleteUnit: b.mutation<void, { unitId: string; parentUnitId?: string | null }>({
      query: ({ unitId }) => ({
        url: `/admin/units/${unitId}/soft-delete`,
        method: 'PATCH',
      }),
      invalidatesTags: (_res, _err, arg): Tag[] => {
        const tags: Tag[] = [
          { type: 'Units', id: arg.unitId },
          { type: 'UnitHistory', id: arg.unitId },
          { type: 'Units', id: 'ROOTS' },
          { type: 'Units', id: 'TREE' },
        ];

        if (arg.parentUnitId) {
          tags.push({ type: 'Units', id: `CHILDREN:${arg.parentUnitId}` });
        }

        return tags;
      },
    }),

    getUnitHistory: b.query<UnitHistoryDto[], { unitId: string; take?: number }>({
      query: ({ unitId, take = 50 }) => ({
        url: `/admin/units/${unitId}/history`,
        method: 'GET',
        params: { take },
      }),
      transformResponse: (res: any[]): UnitHistoryDto[] =>
        (res ?? []).map((h) => ({
          version: h.version ?? h.Version,
          changedAt: h.createdAtUtc ?? h.CreatedAtUtc, // BE dùng CreatedAtUtc
          snapshot: {
            id: h.unitId ?? h.UnitId,
            fullName: h.fullName,
            shortName: h.shortName ?? null,
            symbol: h.symbol ?? null,
            parentUnitId: h.parentUnitId ?? null,
            code: h.code ?? '',
            level: h.level ?? 0,
            unitTypeCodes: h.unitTypeCodes ?? [],
            note: h.note ?? null,
          } as any,
        })),
      providesTags: (_res, _err, arg) => [{ type: 'UnitHistory', id: arg.unitId }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetUnitRootsQuery,
  useGetUnitChildrenQuery,
  useSearchSubtreeByCodePrefixQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useSoftDeleteUnitMutation,
  useGetUnitHistoryQuery,
} = adminUnitsApi;