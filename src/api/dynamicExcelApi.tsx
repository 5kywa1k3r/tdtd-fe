import { baseApi } from "./base/baseApi";
import { type PagedResult } from '../types/pagedResult';

export type DynamicExcelRow = {
  id: string;
  code: string;
  name: string;
  headerKind?: DynamicExcelHeaderKind | null;
  tableMode: DynamicExcelTableMode;
  contractVersion: number;
  createdByUsername: string;
  createdAtUtc: string;
};

export type DynamicExcelHeaderKind = "TOP" | "LEFT" | "MATRIX";
export type DynamicExcelTableMode = "FIXED_GRID" | "APPEND_ROWS" | "APPEND_COLUMNS";

export type DynamicExcelDetail = DynamicExcelRow & {
  rawWorkbookDataJson: string;
  specJson: string;
  dataRect: { r0: number; c0: number; r1: number; c1: number };
  w: number;
  h: number;
};

export type DynamicExcelSearchReq = {
  q?: string;
  code?: string;
  name?: string;
  createdBy?: string;
  createdFromUtc?: string | null;
  createdToUtc?: string | null;

  page: number;
  pageSize: number;
  sortField?: "code" | "name" | "createdAtUtc" | "createdByUsername";
  sortDirection?: "asc" | "desc";
};

export type NextCodeResp = { prefix: string; year: number; nextSeq: number; nextCode: string };

export type CreateDynamicExcelReq = {
  code?: string | null;
  name: string;
  tableMode: DynamicExcelTableMode;
  contractVersion?: number | null;

  rawWorkbookDataJson: string;
  specJson: string;

  dataRect?: { r0: number; c0: number; r1: number; c1: number } | null;
  w: number;
  h: number;
};

export type UpdateDynamicExcelReq = {
  name: string;
  tableMode?: DynamicExcelTableMode | null;
  contractVersion?: number | null;
  rawWorkbookDataJson?: string | null;
  specJson?: string | null;
  dataRect?: { r0: number; c0: number; r1: number; c1: number } | null;
  w?: number | null;
  h?: number | null;
};

export const dynamicExcelApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // ✅ axiosBaseQuery => query must return { url, method, data, params }
    searchDynamicExcel: b.mutation<PagedResult<DynamicExcelRow>, DynamicExcelSearchReq>({
      query: (data) => ({
        url: "/dynamic-excel/search",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "DynamicExcel", id: "SEARCH" }],
    }),

    // ✅ FIX #1: previously returned string
    getDynamicExcel: b.query<DynamicExcelDetail, { id: string }>({
      query: ({ id }) => ({
        url: `/dynamic-excel/${id}`,
        method: "GET",
      }),
      providesTags: (_r, _e, arg) => [{ type: "DynamicExcel", id: arg.id }],
    }),

    // ✅ FIX #2: previously returned string
    nextDynamicExcelCode: b.query<NextCodeResp, { year?: number }>({
      query: ({ year }) => ({
        url: "/dynamic-excel/next-code",
        method: "GET",
        params: year ? { year } : undefined,
      }),
    }),

    createDynamicExcel: b.mutation<DynamicExcelDetail, CreateDynamicExcelReq>({
      query: (data) => ({
        url: "/dynamic-excel",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "DynamicExcel", id: "SEARCH" }],
    }),

    updateDynamicExcel: b.mutation<DynamicExcelDetail, { id: string; body: UpdateDynamicExcelReq }>({
      query: ({ id, body }) => ({
        url: `/dynamic-excel/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "DynamicExcel", id: "SEARCH" },
        { type: "DynamicExcel", id: arg.id },
      ],
    }),

    deleteDynamicExcel: b.mutation<void, { id: string }>({
      query: ({ id }) => ({
        url: `/dynamic-excel/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "DynamicExcel", id: "SEARCH" }],
    }),
  }),
});

export const {
  useSearchDynamicExcelMutation,
  useGetDynamicExcelQuery,
  useLazyGetDynamicExcelQuery,
  useNextDynamicExcelCodeQuery,
  useCreateDynamicExcelMutation,
  useUpdateDynamicExcelMutation,
  useDeleteDynamicExcelMutation,
} = dynamicExcelApi;
