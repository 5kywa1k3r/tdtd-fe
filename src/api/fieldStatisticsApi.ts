import { baseApi } from "./base/baseApi";
import { api } from "./base/axios";

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

export type FieldTextConcatRequest = {
  workId: string;
  scopeType?: "WORK" | "ROOT" | "ASSIGNMENT" | string | null;
  scopeId?: string | null;
  dynamicFormTemplateId: string;
  fieldId?: string | null;
  fieldKey?: string | null;
  q?: string | null;
  periodKey?: string | null;
  periodKeyFrom?: string | null;
  periodKeyTo?: string | null;
  periodInstanceKey?: string | null;
  reportStatus?: number | null;
  page?: number;
  pageSize?: number;
  maxChars?: number;
  maxRowChars?: number;
  scanLimit?: number;
};

export type FieldTextConcatRow = {
  workAssignmentReportId: string;
  workReportPeriodId: string;
  assignmentId: string;
  assignmentCode?: string | null;
  assignmentName: string;
  assigneeUserId?: string | null;
  assigneeFullName?: string | null;
  assigneeUsername?: string | null;
  unitId?: string | null;
  unitLabel?: string | null;
  periodKey: string;
  periodInstanceKey: string;
  periodKind: string;
  reportStatus: number;
  text: string;
  charCount: number;
  rowTruncated: boolean;
  submittedAtUtc?: string | null;
  approvedAtUtc?: string | null;
};

export type FieldTextConcatResponse = {
  workId: string;
  scopeType: string;
  scopeId?: string | null;
  dynamicFormTemplateId: string;
  fieldId: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  concatenatedText: string;
  rows: FieldTextConcatRow[];
  page: number;
  pageSize: number;
  totalRows: number;
  returnedRows: number;
  totalChars: number;
  maxChars: number;
  truncated: boolean;
  matchingReportCount: number;
  scannedReportCount: number;
  scanLimit: number;
  hasMoreReportsThanScanLimit: boolean;
};

export async function exportFieldTextConcatCsv(request: FieldTextConcatRequest) {
  const response = await api.post(
    "work-report-field-statistics/text-concat/export",
    request,
    { responseType: "blob" }
  );
  const disposition = String(response.headers["content-disposition"] ?? "");
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
  const fileName = match?.[1]
    ? decodeURIComponent(match[1].replace(/"$/g, ""))
    : "text-concat.csv";

  return {
    blob: response.data as Blob,
    fileName,
  };
}

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

    searchFieldTextConcat: build.mutation<
      FieldTextConcatResponse,
      FieldTextConcatRequest
    >({
      query: (data) => ({
        url: "work-report-field-statistics/text-concat",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "FieldStatisticSummary", id: "TEXT_CONCAT" }],
    }),
  }),
});

export const {
  useSearchFieldStatisticSummaryMutation,
  useRebuildFieldStatisticsMutation,
  useSearchFieldTextConcatMutation,
} = fieldStatisticsApi;
