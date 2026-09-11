import { baseApi } from "./base/baseApi";
import type {
  MyReportTemplateDetailResponse,
  MyReportTemplateRow,
  MyReportTemplateSearchRequest,
  PagedResult,
  DynamicFlowMappingPreviewResponse,
  DynamicFlowMappingRequest,
  SaveWorkAssignmentReportDraftPatchRequest,
  SaveWorkAssignmentReportDraftRequest,
  ApplyDynamicFormAggregateDraftRequest,
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

export const DYNAMIC_FLOW_MAPPING_APPLY_RESPONSE_INVALID =
  "DYNAMIC_FLOW_MAPPING_APPLY_RESPONSE_INVALID";

export type DynamicFlowMappingApplyResponseExpectation = {
  targetReportId: string;
  targetAssignmentId: string | null | undefined;
  targetPayloadRevision: number | null | undefined;
  targetLifecycleRevision: number | null | undefined;
  commandId: string | null | undefined;
  resultSemanticHash: string | null | undefined;
};

function isDynamicFlowMappingApplyRecord(
  value: unknown,
): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasDynamicFlowMappingApplyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDynamicFlowMappingApplySha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function isDynamicFlowMappingApplyNonNegativeInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

const DYNAMIC_FLOW_MAPPING_APPLY_STATES = new Set([
  "COMMITTED",
  "PARTIAL",
  "RETRYING",
  "RECONCILED",
]);

/**
 * Validate the full report core that the editor mutates from after mapping.
 * A 2xx transport status is not sufficient authority to clear local command
 * or conflict state.
 */
export function sanitizeDynamicFlowMappingApplyResponse(
  value: unknown,
  expected: DynamicFlowMappingApplyResponseExpectation,
): WorkAssignmentReportResponse | null {
  if (
    !isDynamicFlowMappingApplyRecord(value) ||
    !hasDynamicFlowMappingApplyText(expected.targetReportId) ||
    !hasDynamicFlowMappingApplyText(expected.targetAssignmentId) ||
    !isDynamicFlowMappingApplyNonNegativeInteger(
      expected.targetPayloadRevision,
    ) ||
    Number(expected.targetPayloadRevision) >= Number.MAX_SAFE_INTEGER ||
    !isDynamicFlowMappingApplyNonNegativeInteger(
      expected.targetLifecycleRevision,
    ) ||
    !hasDynamicFlowMappingApplyText(expected.commandId) ||
    !isDynamicFlowMappingApplySha256(expected.resultSemanticHash) ||
    value.id !== expected.targetReportId ||
    value.workAssignmentId !== expected.targetAssignmentId ||
    value.dynamicFlowMappingCommandId !== expected.commandId ||
    value.dynamicFlowMappingResultSemanticHash !== expected.resultSemanticHash ||
    !hasDynamicFlowMappingApplyText(value.workId) ||
    !hasDynamicFlowMappingApplyText(value.workReportPeriodId) ||
    !hasDynamicFlowMappingApplyText(value.periodKey) ||
    typeof value.specJson !== "string" ||
    !hasDynamicFlowMappingApplyText(value.createdAtUtc) ||
    !hasDynamicFlowMappingApplyText(value.updatedAtUtc) ||
    !Number.isFinite(Date.parse(value.createdAtUtc)) ||
    !Number.isFinite(Date.parse(value.updatedAtUtc)) ||
    value.status !== 0 ||
    !isDynamicFlowMappingApplyNonNegativeInteger(value.payloadRevision) ||
    value.payloadRevision !== Number(expected.targetPayloadRevision) + 1 ||
    !isDynamicFlowMappingApplyNonNegativeInteger(value.lifecycleRevision) ||
    value.lifecycleRevision !== expected.targetLifecycleRevision ||
    !isDynamicFlowMappingApplySha256(value.payloadHash) ||
    !isDynamicFlowMappingApplyNonNegativeInteger(value.dataRectR0) ||
    !isDynamicFlowMappingApplyNonNegativeInteger(value.dataRectC0) ||
    !isDynamicFlowMappingApplyNonNegativeInteger(value.dataRectR1) ||
    !isDynamicFlowMappingApplyNonNegativeInteger(value.dataRectC1) ||
    !isDynamicFlowMappingApplyNonNegativeInteger(value.w) ||
    !isDynamicFlowMappingApplyNonNegativeInteger(value.h) ||
    !Number.isInteger(value.versionNo) ||
    Number(value.versionNo) < 1 ||
    typeof value.canEditPayload !== "boolean" ||
    typeof value.canSubmit !== "boolean" ||
    typeof value.canWithdraw !== "boolean" ||
    typeof value.isLateSubmission !== "boolean" ||
    value.isCurrent !== true ||
    value.isActive !== true ||
    !hasDynamicFlowMappingApplyText(value.lifecycleCommitState) ||
    (
      value.lifecycleCommitState !== "COMMITTED" &&
      value.lifecycleCommitState !== "COMMITTED_PENDING_PROJECTION"
    ) ||
    typeof value.lifecycleProjectionPending !== "boolean" ||
    (
      value.lifecycleProjectionPending !==
      (value.lifecycleCommitState === "COMMITTED_PENDING_PROJECTION")
    ) ||
    !hasDynamicFlowMappingApplyText(value.dynamicFlowMappingApplyState) ||
    !DYNAMIC_FLOW_MAPPING_APPLY_STATES.has(value.dynamicFlowMappingApplyState) ||
    !hasDynamicFlowMappingApplyText(value.dynamicFlowMappingReceiptId) ||
    !isDynamicFlowMappingApplySha256(
      value.dynamicFlowMappingResultSemanticHash,
    ) ||
    value.dataOrigin !== "PARTIAL_MAPPING" ||
    value.cumulativeContributionMode !== "EXCLUDE"
  ) {
    return null;
  }

  return value as unknown as WorkAssignmentReportResponse;
}

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

    previewDynamicFlowMappingDraft: build.mutation<
      DynamicFlowMappingPreviewResponse,
      { id: string; data: DynamicFlowMappingRequest }
    >({
      query: ({ id, data }) => ({
        url: `work-assignment-reports/${id}/draft/preview-dynamic-flow-mapping`,
        method: "POST",
        data,
      }),
    }),

    applyDynamicFlowMappingDraft: build.mutation<
      WorkAssignmentReportResponse,
      { id: string; data: DynamicFlowMappingRequest }
    >({
      query: ({ id, data }) => ({
        url: `work-assignment-reports/${id}/draft/apply-dynamic-flow-mapping`,
        method: "POST",
        data,
      }),
      transformResponse: (
        response: unknown,
        _meta,
        { id, data },
      ) => {
        const decoded = sanitizeDynamicFlowMappingApplyResponse(response, {
          targetReportId: id,
          targetAssignmentId: data.targetAssignmentId,
          targetPayloadRevision: data.expectedPayloadRevision,
          targetLifecycleRevision: data.expectedLifecycleRevision,
          commandId: data.commandId,
          resultSemanticHash: data.resultSemanticHash,
        });
        if (!decoded) {
          throw new Error(DYNAMIC_FLOW_MAPPING_APPLY_RESPONSE_INVALID);
        }
        return decoded;
      },
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
  usePreviewDynamicFlowMappingDraftMutation,
  useApplyDynamicFlowMappingDraftMutation,
  useSaveWorkAssignmentReportDraftMutation,
  useSaveWorkAssignmentReportDraftPatchMutation,
  useApplyDynamicFormAggregateDraftMutation,
  usePreviewDynamicFormAggregateDraftMutation,
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
