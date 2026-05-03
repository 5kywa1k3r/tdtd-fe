import { baseApi } from "./base/baseApi";

export type LabelStatisticSummaryRequest = {
  workId: string;
  scopeType?: "WORK" | "ROOT" | "ASSIGNMENT" | string | null;
  scopeId?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicExcelTemplateId?: string | null;
  labelCode?: string | null;
  periodKey?: string | null;
  periodInstanceKey?: string | null;
  reportStatus?: number | null;
  page?: number;
  pageSize?: number;
};

export type LabelStatisticSummaryRow = {
  workId: string;
  scopeType: string;
  scopeId: string;
  rootAssignmentId?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  dynamicExcelTemplateId?: string | null;
  blockId: string;
  labelCode: string;
  labelName?: string | null;
  labelColor?: string | null;
  periodKey: string;
  periodInstanceKey: string;
  periodKind: string;
  reportStatus: number;
  rowCount: number;
  reportCount: number;
  updatedAtUtc: string;
};

export type LabelStatisticSummaryResponse = {
  rows: LabelStatisticSummaryRow[];
  totalRows: number;
  totalRowCount: number;
  totalReportCount: number;
};

export const labelStatisticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchLabelStatisticSummary: build.mutation<
      LabelStatisticSummaryResponse,
      LabelStatisticSummaryRequest
    >({
      query: (data) => ({
        url: "work-report-label-statistics/summary",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "LabelStatisticSummary", id: "SEARCH" }],
    }),
  }),
});

export const { useSearchLabelStatisticSummaryMutation } = labelStatisticsApi;
