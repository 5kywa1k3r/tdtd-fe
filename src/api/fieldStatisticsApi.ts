import { baseApi } from "./base/baseApi";

export type FieldStatisticSummaryRequest = {
  workId: string;
  scopeType?: "WORK" | "ROOT" | "ASSIGNMENT" | string | null;
  scopeId?: string | null;
  dynamicFormTemplateId?: string | null;
  fieldId?: string | null;
  fieldKey?: string | null;
  fieldType?: string | null;
  bucketKey?: string | null;
  showInTree?: boolean | null;
  showInDetail?: boolean | null;
  periodKey?: string | null;
  periodKeyFrom?: string | null;
  periodKeyTo?: string | null;
  periodInstanceKey?: string | null;
  reportStatus?: number | null;
  page?: number;
  pageSize?: number;
};

export type FieldStatisticSummaryRow = {
  workId: string;
  scopeType: string;
  scopeId: string;
  rootAssignmentId?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  fieldId: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  showInTree: boolean;
  showInDetail: boolean;
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
  latestDateUtc?: string | null;
  reportCount: number;
  updatedAtUtc: string;
};

export type FieldStatisticSummaryResponse = {
  rows: FieldStatisticSummaryRow[];
  totalRows: number;
  totalValueCount: number;
  totalSum: number;
  totalReportCount: number;
};

export type RebuildFieldStatisticRequest = {
  workId: string;
  periodInstanceKey?: string | null;
  dynamicFormTemplateId?: string | null;
};

export type RebuildFieldStatisticResponse = {
  workId: string;
  periodInstanceKey?: string | null;
  dynamicFormTemplateId?: string | null;
  reportCount: number;
};

export const fieldStatisticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchFieldStatisticSummary: build.mutation<
      FieldStatisticSummaryResponse,
      FieldStatisticSummaryRequest
    >({
      query: (data) => ({
        url: "work-report-field-statistics/summary",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "FieldStatisticSummary", id: "SEARCH" }],
    }),

    rebuildFieldStatistics: build.mutation<
      RebuildFieldStatisticResponse,
      RebuildFieldStatisticRequest
    >({
      query: (data) => ({
        url: "work-report-field-statistics/rebuild",
        method: "POST",
        data,
      }),
      invalidatesTags: [
        { type: "FieldStatisticSummary", id: "SEARCH" },
        { type: "DashboardMindMapNode" },
      ],
    }),
  }),
});

export const {
  useSearchFieldStatisticSummaryMutation,
  useRebuildFieldStatisticsMutation,
} = fieldStatisticsApi;
