import { baseApi } from "./base/baseApi";
import { type PagedResult } from "../types/pagedResult";

export type LabelScopeType = "GLOBAL" | "LEVEL" | "UNIT";
export type LabelDataType = "NUMBER" | "SHORT_TEXT" | "STRING_LIST" | "LONG_TEXT" | "DATE" | "BOOLEAN";
export type LabelUsage = "CLASSIFICATION" | "STATISTIC" | "TABLE_TARGET";

export type LabelRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  color?: string | null;
  groupCode?: string | null;
  usage: LabelUsage;
  dataType: LabelDataType;
  scopeType: LabelScopeType;
  scopeId?: string | null;
  isSystem: boolean;
  isActive: boolean;
  canManage: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type LabelSearchReq = {
  q?: string | null;
  code?: string | null;
  name?: string | null;
  groupCode?: string | null;
  usage?: LabelUsage | null;
  scopeType?: LabelScopeType | null;
  scopeId?: string | null;
  isActive?: boolean | null;
  page: number;
  pageSize: number;
  sortField?: "code" | "name" | "groupCode" | "usage" | "createdAtUtc" | "updatedAtUtc";
  sortDirection?: "asc" | "desc";
};

export type CreateLabelReq = {
  code: string;
  name: string;
  description?: string | null;
  color?: string | null;
  groupCode?: string | null;
  usage?: LabelUsage | null;
  dataType?: LabelDataType | null;
  scopeType?: LabelScopeType | null;
  scopeId?: string | null;
  isActive?: boolean;
};

export type UpdateLabelReq = {
  name: string;
  description?: string | null;
  color?: string | null;
  groupCode?: string | null;
  usage?: LabelUsage | null;
  dataType?: LabelDataType | null;
  isActive?: boolean;
};

export const labelApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    searchLabels: b.mutation<PagedResult<LabelRow>, LabelSearchReq>({
      query: (data) => ({
        url: "/labels/search",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "Label", id: "SEARCH" }],
    }),

    getLabel: b.query<LabelRow, { id: string }>({
      query: ({ id }) => ({
        url: `/labels/${id}`,
        method: "GET",
      }),
      providesTags: (_r, _e, arg) => [{ type: "Label", id: arg.id }],
    }),

    createLabel: b.mutation<LabelRow, CreateLabelReq>({
      query: (data) => ({
        url: "/labels",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "Label", id: "SEARCH" }],
    }),

    updateLabel: b.mutation<LabelRow, { id: string; body: UpdateLabelReq }>({
      query: ({ id, body }) => ({
        url: `/labels/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Label", id: "SEARCH" },
        { type: "Label", id: arg.id },
      ],
    }),

    deleteLabel: b.mutation<void, { id: string }>({
      query: ({ id }) => ({
        url: `/labels/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Label", id: "SEARCH" }],
    }),
  }),
});

export const {
  useSearchLabelsMutation,
  useGetLabelQuery,
  useCreateLabelMutation,
  useUpdateLabelMutation,
  useDeleteLabelMutation,
} = labelApi;
