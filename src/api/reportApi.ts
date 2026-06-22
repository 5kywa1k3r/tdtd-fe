import { baseApi } from "./base/baseApi";
import type {
  MyReportTemplateDetailResponse,
  MyReportTemplateRow,
  MyReportTemplateSearchRequest,
  PagedResult,
  SaveWorkAssignmentReportDraftPatchRequest,
  SaveWorkAssignmentReportDraftRequest,
  ApplyDynamicFormAggregateDraftRequest,
  DynamicFlowMappingPreviewResponse,
  DynamicFlowMappingRequest,
  SubmitWorkAssignmentReportRequest,
  ReturnWorkAssignmentReportRequest,
  WorkAssignmentReportListRow,
  WorkAssignmentReportLogRow,
  WorkAssignmentReportResponse,
  WorkAssignmentReportSectionDetailResponse,
  WorkAssignmentReportSectionSummaryRow,
  WorkAssignmentReportSearchRequest,
} from "../types/report";

import type {
  AggregateTableRequest,
  AggregateTableResponse,
  DynamicFormAggregateRequest,
  DynamicFormAggregateResponse,
  LockWorkAssignmentAdvancedSummaryConfigRequest,
  PreviewWorkAssignmentAdvancedSummaryConfigRequest,
  SaveWorkAssignmentAggregateConfigRequest,
  SaveWorkAssignmentAdvancedSummaryDraftRequest,
  SaveWorkAssignmentBasicSummaryConfigRequest,
  WorkAssignmentAdvancedSummaryConfigDto,
  WorkAssignmentBasicSummaryRequest,
  WorkAssignmentBasicSummaryConfigDto,
  WorkAssignmentBasicSummaryResponse,
  WorkAssignmentAggregateConfigDto,
} from "../types/reportAggregate";

import type {
  ApproveReportRequest,
  ReturnReportRequest,
  RecallApprovedReportRequest,
  ReportActiveRequest,
  ReviewReportFlatRowDto,
  ReviewReportFlatSearchRequest,
  ReviewSummaryRowDto,
  ReviewSummarySearchRequest,
} from "../types/reportReview";

import type { WorkAssignmentEvaluationLogRow } from "./workAssignmentApi";
import type {EvaluateAssignmentRequest} from '../types/evaluation';
import type { DynamicExcelDetail } from "./dynamicExcelApi";

export const reportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchMyReportTemplates: build.query<
      PagedResult<MyReportTemplateRow>,
      { workId: string; req: MyReportTemplateSearchRequest }
    >({
      query: ({ workId, req }) => ({
        url: `works/${workId}/my-report-templates/search`,
        method: "POST",
        data: req,
      }),
    }),

    getMyReportTemplateDetail: build.query<
      MyReportTemplateDetailResponse,
      { workId: string; dynamicFormTemplateId: string; scopeAssignmentId?: string | null }
    >({
      query: ({ workId, dynamicFormTemplateId, scopeAssignmentId }) => ({
        url: `works/${workId}/my-report-templates/${dynamicFormTemplateId}${
          scopeAssignmentId ? `?scopeAssignmentId=${encodeURIComponent(scopeAssignmentId)}` : ""
        }`,
        method: "GET",
      }),
    }),

    openWorkReportPeriod: build.mutation<
      WorkAssignmentReportResponse,
      { workReportPeriodId: string }
    >({
      query: ({ workReportPeriodId }) => ({
        url: `work-report-periods/${workReportPeriodId}/open`,
        method: "POST",
      }),
    }),

    getWorkAssignmentReport: build.query<WorkAssignmentReportResponse, string>({
      query: (id) => ({
        url: `work-assignment-reports/${id}`,
        method: "GET",
      }),
    }),

    getWorkAssignmentReportSections: build.query<
      WorkAssignmentReportSectionSummaryRow[],
      string
    >({
      query: (id) => ({
        url: `work-assignment-reports/${id}/sections`,
        method: "GET",
      }),
    }),

    getWorkAssignmentReportSectionDetail: build.query<
      WorkAssignmentReportSectionDetailResponse,
      { id: string; sectionId: string }
    >({
      query: ({ id, sectionId }) => ({
        url: `work-assignment-reports/${id}/sections/${encodeURIComponent(sectionId)}`,
        method: "GET",
      }),
    }),

    getWorkAssignmentReportTemplateWorkbook: build.query<
      DynamicExcelDetail,
      { id: string; dynamicExcelTemplateId: string }
    >({
      query: ({ id, dynamicExcelTemplateId }) => ({
        url: `work-assignment-reports/${id}/template-workbook/${dynamicExcelTemplateId}`,
        method: "GET",
      }),
    }),

    saveWorkAssignmentReportDraft: build.mutation<
      WorkAssignmentReportResponse,
      {
        id: string;
        data: SaveWorkAssignmentReportDraftRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `work-assignment-reports/${id}/draft`,
        method: "PUT",
        data,
      }),
    }),

    applyDynamicFormAggregateDraft: build.mutation<
      WorkAssignmentReportResponse,
      {
        id: string;
        data: ApplyDynamicFormAggregateDraftRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `work-assignment-reports/${id}/draft/apply-dynamic-form-aggregate`,
        method: "POST",
        data,
      }),
    }),

    previewDynamicFormAggregateDraft: build.mutation<
      WorkAssignmentReportResponse,
      {
        id: string;
        data: ApplyDynamicFormAggregateDraftRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `work-assignment-reports/${id}/draft/preview-dynamic-form-aggregate`,
        method: "POST",
        data,
      }),
    }),

    previewDynamicFlowMapping: build.mutation<
      DynamicFlowMappingPreviewResponse,
      {
        id: string;
        data: DynamicFlowMappingRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `work-assignment-reports/${id}/draft/preview-dynamic-flow-mapping`,
        method: "POST",
        data,
      }),
    }),

    applyDynamicFlowMapping: build.mutation<
      WorkAssignmentReportResponse,
      {
        id: string;
        data: DynamicFlowMappingRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `work-assignment-reports/${id}/draft/apply-dynamic-flow-mapping`,
        method: "POST",
        data,
      }),
    }),

    submitWorkAssignmentReport: build.mutation<
      WorkAssignmentReportResponse,
      {
        id: string;
        data: SubmitWorkAssignmentReportRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `work-assignment-reports/${id}/submit`,
        method: "POST",
        data,
      }),
    }),

    getWorkAssignmentReportLogs: build.query<
      WorkAssignmentReportLogRow[],
      { id: string }
    >({
      query: ({ id }) => ({
        url: `work-assignment-reports/${id}/logs`,
        method: "GET",
      }),
    }),


    withdrawSubmittedReport: build.mutation<
      WorkAssignmentReportResponse,
      {
        id: string;
        data: ReturnWorkAssignmentReportRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `work-assignment-reports/${id}/withdraw-submitted`,
        method: "POST",
        data,
      }),
    }),

    searchWorkAssignmentReports: build.query<
      PagedResult<WorkAssignmentReportListRow>,
      WorkAssignmentReportSearchRequest
    >({
      query: (req) => ({
        url: `work-assignment-reports/search`,
        method: "POST",
        data: req,
      }),
    }),

    getReportsByAssignment: build.query<
      WorkAssignmentReportListRow[],
      { workAssignmentId: string }
    >({
      query: ({ workAssignmentId }) => ({
        url: `work-assignments/${workAssignmentId}/reports`,
        method: "GET",
      }),
    }),

    searchReviewSummary: build.mutation<
      PagedResult<ReviewSummaryRowDto>,
      ReviewSummarySearchRequest
    >({
      query: (data) => ({
        url: `work-assignment-review/summary/search`,
        method: "POST",
        data,
      }),
    }),

    searchReviewReports: build.mutation<
      PagedResult<ReviewReportFlatRowDto>,
      ReviewReportFlatSearchRequest
    >({
      query: (data) => ({
        url: `work-assignment-review/reports/search`,
        method: "POST",
        data,
      }),
    }),

    approveReviewReport: build.mutation<
      void,
      { reportId: string; data: ApproveReportRequest }
    >({
      query: ({ reportId, data }) => ({
        url: `work-assignment-review/reports/${reportId}/approve`,
        method: "POST",
        data,
      }),
    }),

    returnReviewReport: build.mutation<
      void,
      { reportId: string; data: ReturnReportRequest }
    >({
      query: ({ reportId, data }) => ({
        url: `work-assignment-review/reports/${reportId}/return`,
        method: "POST",
        data,
      }),
    }),


    recallApprovedReviewReport: build.mutation<
      void,
      { reportId: string; data: RecallApprovedReportRequest }
    >({
      query: ({ reportId, data }) => ({
        url: `work-assignment-review/reports/${reportId}/recall-approved`,
        method: "POST",
        data,
      }),
    }),

    deactivateReviewReport: build.mutation<
      void,
      { reportId: string; data: ReportActiveRequest }
    >({
      query: ({ reportId, data }) => ({
        url: `work-assignment-review/reports/${reportId}/deactivate`,
        method: "POST",
        data,
      }),
    }),

    reactivateReviewReport: build.mutation<
      void,
      { reportId: string; data: ReportActiveRequest }
    >({
      query: ({ reportId, data }) => ({
        url: `work-assignment-review/reports/${reportId}/reactivate`,
        method: "POST",
        data,
      }),
    }),

    getAggregateTable: build.mutation<
      AggregateTableResponse,
      AggregateTableRequest
    >({
      query: (data) => ({
        url: `work-assignment-aggregate-table/table`,
        method: "POST",
        data,
      }),
    }),

    getDynamicFormAggregateTable: build.mutation<
      DynamicFormAggregateResponse,
      DynamicFormAggregateRequest
    >({
      query: (data) => ({
        url: `work-assignment-aggregate-table/dynamic-form/table`,
        method: "POST",
        data,
      }),
    }),

    saveWorkAssignmentReportDraftPatch: build.mutation<
      WorkAssignmentReportResponse,
      {
        id: string;
        data: SaveWorkAssignmentReportDraftPatchRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `work-assignment-reports/${id}/draft/patch`,
        method: "PATCH",
        data,
      }),
    }),

    getWorkAssignmentAggregateConfig: build.query<
      WorkAssignmentAggregateConfigDto | null,
      string
    >({
      query: (assignmentId) => ({
        url: `work-assignment-aggregate-table/assignments/${assignmentId}/config`,
        method: "GET",
      }),
    }),

    saveWorkAssignmentAggregateConfig: build.mutation<
      WorkAssignmentAggregateConfigDto,
      { assignmentId: string; data: SaveWorkAssignmentAggregateConfigRequest }
    >({
      query: ({ assignmentId, data }) => ({
        url: `work-assignment-aggregate-table/assignments/${assignmentId}/config`,
        method: "PUT",
        data,
      }),
    }),

    getWorkAssignmentBasicSummary: build.mutation<
      WorkAssignmentBasicSummaryResponse,
      WorkAssignmentBasicSummaryRequest
    >({
      query: (data) => ({
        url: `work-assignment-basic-summary/summary`,
        method: "POST",
        data,
      }),
    }),

    getWorkAssignmentBasicSummaryConfig: build.query<
      WorkAssignmentBasicSummaryConfigDto | null,
      { assignmentId: string; dynamicFormTemplateId: string }
    >({
      query: ({ assignmentId, dynamicFormTemplateId }) => ({
        url: `work-assignment-basic-summary/assignments/${assignmentId}/templates/${dynamicFormTemplateId}/config`,
        method: "GET",
      }),
    }),

    saveWorkAssignmentBasicSummaryConfig: build.mutation<
      WorkAssignmentBasicSummaryConfigDto,
      {
        assignmentId: string;
        dynamicFormTemplateId: string;
        data: SaveWorkAssignmentBasicSummaryConfigRequest;
      }
    >({
      query: ({ assignmentId, dynamicFormTemplateId, data }) => ({
        url: `work-assignment-basic-summary/assignments/${assignmentId}/templates/${dynamicFormTemplateId}/config`,
        method: "PUT",
        data,
      }),
    }),

    listWorkAssignmentAdvancedSummaryConfigs: build.query<
      WorkAssignmentAdvancedSummaryConfigDto[],
      { assignmentId: string; dynamicFormTemplateId: string; sectionId: string }
    >({
      query: ({ assignmentId, dynamicFormTemplateId, sectionId }) => ({
        url: `work-assignment-advanced-summary/assignments/${assignmentId}/templates/${dynamicFormTemplateId}/sections/${encodeURIComponent(sectionId)}/configs`,
        method: "GET",
      }),
      providesTags: (_result, _error, arg) => [
        {
          type: "AdvancedSummaryConfig" as const,
          id: `${arg.assignmentId}:${arg.dynamicFormTemplateId}:${arg.sectionId}`,
        },
      ],
    }),

    saveWorkAssignmentAdvancedSummaryDraft: build.mutation<
      WorkAssignmentAdvancedSummaryConfigDto,
      {
        assignmentId: string;
        dynamicFormTemplateId: string;
        sectionId: string;
        data: SaveWorkAssignmentAdvancedSummaryDraftRequest;
      }
    >({
      query: ({ assignmentId, dynamicFormTemplateId, sectionId, data }) => ({
        url: `work-assignment-advanced-summary/assignments/${assignmentId}/templates/${dynamicFormTemplateId}/sections/${encodeURIComponent(sectionId)}/draft`,
        method: "PUT",
        data,
      }),
      invalidatesTags: (_result, _error, arg) => [
        {
          type: "AdvancedSummaryConfig" as const,
          id: `${arg.assignmentId}:${arg.dynamicFormTemplateId}:${arg.sectionId}`,
        },
      ],
    }),

    lockWorkAssignmentAdvancedSummaryConfig: build.mutation<
      WorkAssignmentAdvancedSummaryConfigDto,
      { configId: string; data?: LockWorkAssignmentAdvancedSummaryConfigRequest }
    >({
      query: ({ configId, data }) => ({
        url: `work-assignment-advanced-summary/configs/${configId}/lock`,
        method: "POST",
        data: data ?? {},
      }),
      invalidatesTags: [{ type: "AdvancedSummaryConfig" as const }],
    }),

    requestWorkAssignmentAdvancedSummaryPreview: build.mutation<
      WorkAssignmentAdvancedSummaryConfigDto,
      { configId: string; data?: PreviewWorkAssignmentAdvancedSummaryConfigRequest }
    >({
      query: ({ configId, data }) => ({
        url: `work-assignment-advanced-summary/configs/${configId}/preview`,
        method: "POST",
        data: data ?? {},
      }),
      invalidatesTags: [{ type: "AdvancedSummaryConfig" as const }],
    }),

    evaluateAssignment: build.mutation<
      void,
      { assignmentId: string; data: EvaluateAssignmentRequest }
    >({
      query: ({ assignmentId, data }) => ({
        url: `work-assignment-review/assignments/${assignmentId}/evaluate`,
        method: "POST",
        data,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkAssignment" as const, id: arg.assignmentId },
        { type: "ReviewSummary" as const, id: "LIST" },
        { type: "ReviewReport" as const, id: "LIST" },
        { type: "AssignmentEvaluationLog" as const, id: arg.assignmentId },
      ],
    }),

    getEvaluationLogs: build.query<
      PagedResult<WorkAssignmentEvaluationLogRow>,
      { assignmentId: string; page?: number; pageSize?: number }
    >({
      query: ({ assignmentId, page = 0, pageSize = 20 }) => ({
        url: `work-assignment-review/assignments/${assignmentId}/evaluation-logs`,
        method: "GET",
        params: { page, pageSize },
      }),
      providesTags: (_r, _e, arg) => [
        { type: "AssignmentEvaluationLog" as const, id: arg.assignmentId },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useSearchMyReportTemplatesQuery,
  useLazySearchMyReportTemplatesQuery,

  useGetMyReportTemplateDetailQuery,
  useLazyGetMyReportTemplateDetailQuery,

  useOpenWorkReportPeriodMutation,

  useGetWorkAssignmentReportQuery,
  useGetWorkAssignmentReportSectionsQuery,
  useGetWorkAssignmentReportSectionDetailQuery,
  useLazyGetWorkAssignmentReportSectionDetailQuery,
  useGetWorkAssignmentReportTemplateWorkbookQuery,
  useSaveWorkAssignmentReportDraftMutation,
  useSaveWorkAssignmentReportDraftPatchMutation,
  useApplyDynamicFormAggregateDraftMutation,
  usePreviewDynamicFormAggregateDraftMutation,
  usePreviewDynamicFlowMappingMutation,
  useApplyDynamicFlowMappingMutation,
  useSubmitWorkAssignmentReportMutation,
  useWithdrawSubmittedReportMutation,
  useGetWorkAssignmentReportLogsQuery,
  useLazyGetWorkAssignmentReportLogsQuery,

  useSearchWorkAssignmentReportsQuery,
  useGetReportsByAssignmentQuery,

  useSearchReviewSummaryMutation,
  useSearchReviewReportsMutation,
  useApproveReviewReportMutation,
  useReturnReviewReportMutation,
  useRecallApprovedReviewReportMutation,
  useDeactivateReviewReportMutation,
  useReactivateReviewReportMutation,
  useGetAggregateTableMutation,
  useGetDynamicFormAggregateTableMutation,
  useGetWorkAssignmentAggregateConfigQuery,
  useGetWorkAssignmentBasicSummaryConfigQuery,
  useGetWorkAssignmentBasicSummaryMutation,
  useListWorkAssignmentAdvancedSummaryConfigsQuery,
  useLockWorkAssignmentAdvancedSummaryConfigMutation,
  useRequestWorkAssignmentAdvancedSummaryPreviewMutation,
  useSaveWorkAssignmentAdvancedSummaryDraftMutation,
  useSaveWorkAssignmentBasicSummaryConfigMutation,
  useSaveWorkAssignmentAggregateConfigMutation,

  useEvaluateAssignmentMutation,
  useGetEvaluationLogsQuery,
  useLazyGetEvaluationLogsQuery,
} = reportApi;
