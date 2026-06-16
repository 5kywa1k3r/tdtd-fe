import { baseApi } from "./base/baseApi";
import { type PagedResult } from "../types/pagedResult";

export type LabelEnumOption = {
  code: string;
  label: string;
  order?: number;
  isActive?: boolean;
};

export type LabelEnumCatalogRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  scopeType: "GLOBAL" | "LEVEL" | "UNIT";
  scopeId?: string | null;
  scopeUnitCode?: string | null;
  scopeLevel?: number | null;
  activeOptionCount: number;
  totalOptionCount: number;
  isActive: boolean;
  canManage: boolean;
  createdByUsername: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type LabelEnumCatalogDetail = LabelEnumCatalogRow & {
  options: LabelEnumOption[];
};

export type LabelEnumCatalogSearchReq = {
  q?: string | null;
  code?: string | null;
  name?: string | null;
  scopeType?: "GLOBAL" | "LEVEL" | "UNIT" | null;
  scopeId?: string | null;
  isActive?: boolean | null;
  page: number;
  pageSize: number;
  sortField?: "code" | "name" | "createdAtUtc" | "updatedAtUtc";
  sortDirection?: "asc" | "desc";
};

export type CreateLabelEnumCatalogReq = {
  code?: string | null;
  name: string;
  description?: string | null;
  options?: LabelEnumOption[] | null;
  scopeType?: "GLOBAL" | "LEVEL" | "UNIT" | null;
  scopeId?: string | null;
  isActive?: boolean;
};

export type UpdateLabelEnumCatalogReq = {
  name: string;
  description?: string | null;
  options?: LabelEnumOption[] | null;
  isActive?: boolean;
};

export type QuickCreateLabelEnumCatalogReq = {
  code?: string | null;
  name: string;
  description?: string | null;
  sourceFeature: "DYNAMIC_FORM" | "DYNAMIC_EXCEL" | "LABEL_ADMIN" | string;
  sourcePath: string;
  options?: LabelEnumOption[] | null;
  scopeType?: "GLOBAL" | "LEVEL" | "UNIT" | null;
  scopeId?: string | null;
};

export type LabelEnumOptionPickRow = {
  id: string;
  catalogId: string;
  catalogCode: string;
  code: string;
  label: string;
  order: number;
};

export const labelEnumCatalogApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    searchLabelEnumCatalogs: b.mutation<PagedResult<LabelEnumCatalogRow>, LabelEnumCatalogSearchReq>({
      query: (data) => ({
        url: "/label-enum-catalogs/search",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "LabelEnumCatalog", id: "SEARCH" }],
    }),

    getLabelEnumCatalog: b.query<LabelEnumCatalogDetail, { id: string }>({
      query: ({ id }) => ({
        url: `/label-enum-catalogs/${id}`,
        method: "GET",
      }),
      providesTags: (_r, _e, arg) => [{ type: "LabelEnumCatalog", id: arg.id }],
    }),

    createLabelEnumCatalog: b.mutation<LabelEnumCatalogDetail, CreateLabelEnumCatalogReq>({
      query: (data) => ({
        url: "/label-enum-catalogs",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "LabelEnumCatalog", id: "SEARCH" }],
    }),

    quickCreateLabelEnumCatalog: b.mutation<LabelEnumCatalogDetail, QuickCreateLabelEnumCatalogReq>({
      query: (data) => ({
        url: "/label-enum-catalogs/quick-create",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "LabelEnumCatalog", id: "SEARCH" }],
    }),

    updateLabelEnumCatalog: b.mutation<LabelEnumCatalogDetail, { id: string; body: UpdateLabelEnumCatalogReq }>({
      query: ({ id, body }) => ({
        url: `/label-enum-catalogs/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "LabelEnumCatalog", id: "SEARCH" },
        { type: "LabelEnumCatalog", id: arg.id },
      ],
    }),

    deleteLabelEnumCatalog: b.mutation<void, { id: string }>({
      query: ({ id }) => ({
        url: `/label-enum-catalogs/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "LabelEnumCatalog", id: "SEARCH" }],
    }),

    searchLabelEnumOptions: b.query<
      PagedResult<LabelEnumOptionPickRow>,
      { catalogId: string; q?: string; page?: number; pageSize?: number }
    >({
      query: ({ catalogId, q, page = 0, pageSize = 20 }) => ({
        url: `/label-enum-catalogs/${catalogId}/options/search`,
        method: "GET",
        params: { q: q?.trim() || undefined, page, pageSize },
      }),
      providesTags: (_r, _e, arg) => [{ type: "LabelEnumCatalog", id: `OPTIONS:${arg.catalogId}` }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useSearchLabelEnumCatalogsMutation,
  useGetLabelEnumCatalogQuery,
  useCreateLabelEnumCatalogMutation,
  useQuickCreateLabelEnumCatalogMutation,
  useUpdateLabelEnumCatalogMutation,
  useDeleteLabelEnumCatalogMutation,
  useLazySearchLabelEnumOptionsQuery,
} = labelEnumCatalogApi;
