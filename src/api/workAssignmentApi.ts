import { baseApi } from "./base/baseApi";
import type {
  CompleteWorkAssignmentRequest,
  HandoverWorkAssignmentRequest,
  SaveWorkAssignmentRequest,
  UpdateWorkAssignmentAutoApproveConditionRequest,
  UpdateWorkAssignmentDataSourceRulesRequest,
  WorkAssignmentHandoverResponse,
  WorkAssignmentListResponse,
  WorkAssignmentResponse,
} from "../types/workAssignment";
import type { PagedResult } from "../types/pagedResult";
import type { UserRefDTO } from "../types/userRefDto";

export type WorkAssignmentParentCandidateDto = WorkAssignmentListResponse;

export type WorkAssignmentEvaluationLogRow = {
  id: string;
  assignmentId: string;
  evaluationCode?: string | null;
  evaluationLabel?: string | null;
  comment?: string | null;
  reason?: string | null;
  createdAtUtc?: string | null;
  createdByUserId?: string | null;
  createdByUserName?: string | null;
};

export type WorkAssignmentHandoverHistorySearchRequest = {
  workAssignmentId?: string | null;
  page: number;
  pageSize: number;
};

export type WorkAssignmentHandoverHistoryRow = {
  id: string;
  workId: string;
  workAssignmentId: string;
  assignmentCode: string;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  fromAssignee?: UserRefDTO | null;
  toAssignee?: UserRefDTO | null;
  actor?: UserRefDTO | null;
  reason?: string | null;
  comment?: string | null;
  workTemplateAssigneeId?: string | null;
  periodCount: number;
  reportCount: number;
  queueItemCount: number;
  result: string;
  createdAtUtc: string;
};

export const workAssignmentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWorkAssignmentsByWork: build.query<WorkAssignmentListResponse[], { workId: string }>({
      query: ({ workId }) => ({
        url: `works/${workId}/assignments`,
        method: "GET",
      }),
      providesTags: (_result, _error, arg) => [
        { type: "WorkAssignment" as const, id: `WORK_${arg.workId}` },
      ],
    }),

    getWorkAssignmentById: build.query<WorkAssignmentResponse, { id: string }>({
      query: ({ id }) => ({
        url: `work-assignments/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, arg) => [
        { type: "WorkAssignment" as const, id: arg.id },
      ],
    }),

    getChildrenAssignments: build.query<
      WorkAssignmentListResponse[],
      { parentAssignmentId: string }
    >({
      query: ({ parentAssignmentId }) => ({
        url: `work-assignments/${parentAssignmentId}/children`,
        method: "GET",
      }),
      providesTags: (_result, _error, arg) => [
        { type: "WorkAssignmentChildren" as const, id: arg.parentAssignmentId },
      ],
    }),

    getMyParentCandidates: build.query<
      WorkAssignmentParentCandidateDto[],
      { workId: string }
    >({
      query: ({ workId }) => ({
        url: `works/${workId}/assignment-parent-candidates`,
        method: "GET",
      }),
      providesTags: (_result, _error, arg) => [
        { type: "WorkAssignment" as const, id: `PARENT_CANDIDATES_${arg.workId}` },
      ],
    }),

    createWorkAssignment: build.mutation<
      WorkAssignmentResponse,
      { workId: string; body: SaveWorkAssignmentRequest }
    >({
      query: ({ workId, body }) => ({
        url: `works/${workId}/assignments`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "WorkAssignment" as const, id: `WORK_${arg.workId}` },
        { type: "WorkAssignment" as const, id: `PARENT_CANDIDATES_${arg.workId}` },
      ],
    }),

    updateWorkAssignmentDataSourceRules: build.mutation<
      WorkAssignmentResponse,
      { id: string; workId: string; body: UpdateWorkAssignmentDataSourceRulesRequest }
    >({
      query: ({ id, body }) => ({
        url: `work-assignments/${id}/dynamic-form-data-source-rules`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "WorkAssignment" as const, id: `WORK_${arg.workId}` },
        { type: "WorkAssignment" as const, id: arg.id },
        { type: "WorkAssignmentChildren" as const, id: arg.id },
        { type: "WorkAssignment" as const, id: `MY_REPORT_${arg.workId}` },
      ],
    }),

    updateWorkAssignmentAutoApproveCondition: build.mutation<
      WorkAssignmentResponse,
      { id: string; workId: string; body: UpdateWorkAssignmentAutoApproveConditionRequest }
    >({
      query: ({ id, body }) => ({
        url: `work-assignments/${id}/auto-approve-condition`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "WorkAssignment" as const, id: `WORK_${arg.workId}` },
        { type: "WorkAssignment" as const, id: arg.id },
        { type: "WorkAssignmentChildren" as const, id: arg.id },
        { type: "WorkAssignment" as const, id: `MY_REPORT_${arg.workId}` },
      ],
    }),

    completeWorkAssignment: build.mutation<
      WorkAssignmentResponse,
      { id: string; workId: string; body: CompleteWorkAssignmentRequest }
    >({
      query: ({ id, body }) => ({
        url: `work-assignments/${id}/complete`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "WorkAssignment" as const, id: `WORK_${arg.workId}` },
        { type: "WorkAssignment" as const, id: arg.id },
        { type: "WorkAssignmentChildren" as const, id: arg.id },
        { type: "Work" as const, id: arg.workId },
        { type: "WorkAssignmentReportList" as const, id: "LIST" },
        { type: "ReviewReport" as const, id: "LIST" },
      ],
    }),

    deactivateWorkAssignment: build.mutation<void, { id: string; workId: string }>({
      query: ({ id }) => ({
        url: `work-assignments/${id}/deactivate`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "WorkAssignment" as const, id: `WORK_${arg.workId}` },
        { type: "WorkAssignment" as const, id: arg.id },
        { type: "Work" as const, id: arg.workId },
        { type: "ReviewSummary" as const, id: "LIST" },
        { type: "ReviewReport" as const, id: "LIST" },
      ],
    }),

    activateWorkAssignment: build.mutation<void, { id: string; workId: string }>({
      query: ({ id }) => ({
        url: `work-assignments/${id}/activate`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "WorkAssignment" as const, id: `WORK_${arg.workId}` },
        { type: "WorkAssignment" as const, id: arg.id },
        { type: "Work" as const, id: arg.workId },
        { type: "ReviewSummary" as const, id: "LIST" },
        { type: "ReviewReport" as const, id: "LIST" },
      ],
    }),

    getMyReportAssignmentsByWork: build.query<WorkAssignmentListResponse[], { workId: string }>({
      query: ({ workId }) => ({
        url: `works/${workId}/my-report-assignments`,
        method: "GET",
      }),
      providesTags: (_result, _error, arg) => [
        { type: "WorkAssignment" as const, id: `MY_REPORT_${arg.workId}` },
      ],
    }),

    handoverWorkAssignment: build.mutation<
      WorkAssignmentHandoverResponse,
      { id: string; workId: string; body: HandoverWorkAssignmentRequest }
    >({
      query: ({ id, body }) => ({
        url: `work-assignments/${id}/handover`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "WorkAssignment" as const, id: `WORK_${arg.workId}` },
        { type: "WorkAssignment" as const, id: arg.id },
        { type: "Work" as const, id: arg.workId },
        { type: "WorkAssignmentReportList" as const, id: "LIST" },
        { type: "ReportTemplateGroup" as const, id: "LIST" },
        { type: "ReviewReport" as const, id: "LIST" },
        { type: "WorkAssignmentHandoverHistory" as const, id: `WORK_${arg.workId}` },
      ],
    }),

    searchWorkAssignmentHandoverHistory: build.mutation<
      PagedResult<WorkAssignmentHandoverHistoryRow>,
      { workId: string; body: WorkAssignmentHandoverHistorySearchRequest }
    >({
      query: ({ workId, body }) => ({
        url: `works/${workId}/assignment-handovers`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "WorkAssignmentHandoverHistory" as const, id: `WORK_${arg.workId}` },
      ],
    }),

  }),
  overrideExisting: true,
});

export const {
  useGetWorkAssignmentsByWorkQuery,
  useGetMyReportAssignmentsByWorkQuery,
  useGetWorkAssignmentByIdQuery,
  useGetChildrenAssignmentsQuery,
  useGetMyParentCandidatesQuery,
  useCreateWorkAssignmentMutation,
  useUpdateWorkAssignmentDataSourceRulesMutation,
  useUpdateWorkAssignmentAutoApproveConditionMutation,
  useCompleteWorkAssignmentMutation,
  useDeactivateWorkAssignmentMutation,
  useActivateWorkAssignmentMutation,
  useHandoverWorkAssignmentMutation,
  useSearchWorkAssignmentHandoverHistoryMutation,
} = workAssignmentApi;
