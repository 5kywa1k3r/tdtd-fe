import { baseApi } from './base/baseApi';

export type UnitTypeDto = {
  id: string;
  code: string;
  name: string;
  isDeleted: boolean;
  version: number;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CreateUnitTypeRequest = {
  code: string;
  name: string;
};

export type UpdateUnitTypeRequest = {
  name: string;
  note?: string | null;
};

export type PositionDto = {
  id: string;
  code: string;
  name: string;
  order: number;
  rank: number;
  unitTypeCodes: string[];
  isDeleted: boolean;
  version: number;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export const adminCatalogApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listUnitTypes: b.query<UnitTypeDto[], { isDeleted?: boolean } | void>({
      query: (arg) => ({
        url: '/admin/unit-types',
        method: 'GET',
        params: { isDeleted: arg && 'isDeleted' in arg ? arg.isDeleted : false },
      }),
      providesTags: [{ type: 'UnitTypes', id: 'LIST' }],
    }),

    createUnitType: b.mutation<UnitTypeDto, CreateUnitTypeRequest>({
      query: (data) => ({
        url: '/admin/unit-types',
        method: 'POST',
        data,
      }),
      invalidatesTags: [{ type: 'UnitTypes', id: 'LIST' }],
    }),

    updateUnitType: b.mutation<UnitTypeDto, { id: string; data: UpdateUnitTypeRequest }>({
      query: ({ id, data }) => ({
        url: `/admin/unit-types/${id}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: [{ type: 'UnitTypes', id: 'LIST' }],
    }),

    deleteUnitType: b.mutation<void, string>({
      query: (id) => ({
        url: `/admin/unit-types/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'UnitTypes', id: 'LIST' }],
    }),

    listPositions: b.query<PositionDto[], { unitTypeCode?: string | null; isDeleted?: boolean } | void>({
      query: (arg) => ({
        url: '/admin/positions',
        method: 'GET',
        params: {
          unitTypeCode: arg && 'unitTypeCode' in arg ? arg.unitTypeCode || undefined : undefined,
          isDeleted: arg && 'isDeleted' in arg ? arg.isDeleted : false,
        },
      }),
      providesTags: [{ type: 'Positions', id: 'LIST' }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useListUnitTypesQuery,
  useCreateUnitTypeMutation,
  useUpdateUnitTypeMutation,
  useDeleteUnitTypeMutation,
  useListPositionsQuery,
} = adminCatalogApi;
