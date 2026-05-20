import { baseApi } from "./base/baseApi";

export type TableStatisticSummaryRequest = {
  workId: string;
  scopeType?: "WORK" | "ROOT" | "ASSIGNMENT" | string | null;
  scopeId?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicExcelTemplateId?: string | null;
  blockId?: string | null;
  tableMode?: string | null;
  metricKey?: string | null;
  metricLabelCode?: string | null;
  dataType?: string | null;
  bucketKey?: string | null;
  periodKey?: string | null;
  periodInstanceKey?: string | null;
  reportStatus?: number | null;
  page?: number;
  pageSize?: number;
};

export type TableStatisticSummaryRow = {
  workId: string;
  scopeType: string;
  scopeId: string;
  rootAssignmentId?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  dynamicExcelTemplateId?: string | null;
  blockId: string;
  tableMode: string;
  metricKey: string;
  metricLabelCode?: string | null;
  rowKey: string;
  columnKey: string;
  dataType: string;
  bucketKey?: string | null;
  bucketLabel?: string | null;
  periodKey: string;
  periodInstanceKey: string;
  periodKind: string;
  reportStatus: number;
  valueCount: number;
  numericValueCount: number;
  sum?: number | null;
  min?: number | null;
  max?: number | null;
  average?: number | null;
  trueCount: number;
  falseCount: number;
  earliestDateUtc?: string | null;
  latestDateUtc?: string | null;
  reportCount: number;
  updatedAtUtc: string;
};

export type TableStatisticSummaryResponse = {
  rows: TableStatisticSummaryRow[];
  totalRows: number;
  totalValueCount: number;
  totalSum: number;
  totalReportCount: number;
};

export type RebuildTableStatisticRequest = {
  workId: string;
  periodInstanceKey?: string | null;
  dynamicFormTemplateId?: string | null;
};

export type RebuildTableStatisticResponse = {
  workId: string;
  periodInstanceKey?: string | null;
  dynamicFormTemplateId?: string | null;
  reportCount: number;
};

export const tableStatisticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchTableStatisticSummary: build.mutation<
      TableStatisticSummaryResponse,
      TableStatisticSummaryRequest
    >({
      query: (data) => ({
        url: "work-report-table-statistics/summary",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "TableStatisticSummary", id: "SEARCH" }],
    }),

    rebuildTableStatistics: build.mutation<
      RebuildTableStatisticResponse,
      RebuildTableStatisticRequest
    >({
      query: (data) => ({
        url: "work-report-table-statistics/rebuild",
        method: "POST",
        data,
      }),
      invalidatesTags: [
        { type: "TableStatisticSummary", id: "SEARCH" },
        { type: "DashboardMindMapNode" },
      ],
    }),
  }),
});

export const {
  useSearchTableStatisticSummaryMutation,
  useRebuildTableStatisticsMutation,
} = tableStatisticsApi;
