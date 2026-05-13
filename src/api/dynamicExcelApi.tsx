import { baseApi } from "./base/baseApi";
import { type PagedResult } from '../types/pagedResult';

export type DynamicExcelRow = {
  id: string;
  code: string;
  name: string;
  labels: string[];
  createdByUsername: string;
  createdAtUtc: string;
  tableKind?: DynamicExcelTableKind;
};

export type DynamicExcelDetail = DynamicExcelRow & {
  recordTableSpecJson?: string | null;
  rawWorkbookDataJson: string;
  specJson: string;
  dataRect: { r0: number; c0: number; r1: number; c1: number };
  w: number;
  h: number;
};

export type DynamicExcelTableKind = "NUMERIC_GRID" | "RECORD_TABLE";
export type DynamicExcelRecordDataType = "text" | "number" | "date" | "boolean";
export type DynamicExcelRecordOrientation = "ROWS" | "COLUMNS";

export type DynamicExcelRecordExpression =
  | { col: string }
  | { input: string; dataType: DynamicExcelRecordDataType }
  | { value: unknown; dataType?: DynamicExcelRecordDataType }
  | { const: unknown; dataType?: DynamicExcelRecordDataType }
  | { op: string; args?: DynamicExcelRecordExpression[]; left?: DynamicExcelRecordExpression; right?: DynamicExcelRecordExpression };

export type DynamicExcelRecordColumn = {
  key: string;
  label: string;
  dataType: DynamicExcelRecordDataType;
  required?: boolean;
};

export type DynamicExcelRecordCalculatedOutput = {
  key: string;
  label: string;
  dataType: DynamicExcelRecordDataType;
  expression: DynamicExcelRecordExpression;
  includeInUpstream?: false;
};

export type DynamicExcelRecordValidationRule = {
  key: string;
  message?: string;
  condition: DynamicExcelRecordExpression;
  when?: DynamicExcelRecordExpression;
};

export type DynamicExcelRecordTableSpec = {
  orientation?: DynamicExcelRecordOrientation;
  columns: DynamicExcelRecordColumn[];
  calculatedColumns?: DynamicExcelRecordCalculatedOutput[];
  calculatedRows?: DynamicExcelRecordCalculatedOutput[];
  aggregateColumns?: DynamicExcelRecordCalculatedOutput[];
  aggregateRows?: DynamicExcelRecordCalculatedOutput[];
  validationRules?: DynamicExcelRecordValidationRule[];
};

export type DynamicExcelSearchReq = {
  q?: string;
  code?: string;
  name?: string;
  createdBy?: string;
  createdFromUtc?: string | null;
  createdToUtc?: string | null;
  labels?: string[] | null;

  page: number;
  pageSize: number;
  sortField?: "code" | "name" | "createdAtUtc" | "createdByUsername";
  sortDirection?: "asc" | "desc";
};

export type NextCodeResp = { prefix: string; year: number; nextSeq: number; nextCode: string };

export type CreateDynamicExcelReq = {
  code?: string | null;
  name: string;
  labels?: string[] | null;
  tableKind?: DynamicExcelTableKind | null;
  recordTableSpecJson?: string | null;

  rawWorkbookDataJson: string;
  specJson: string;

  dataRect?: { r0: number; c0: number; r1: number; c1: number } | null;
  w: number;
  h: number;
};

export type UpdateDynamicExcelReq = Omit<CreateDynamicExcelReq, "code">;

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
