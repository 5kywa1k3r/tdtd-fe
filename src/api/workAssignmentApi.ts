import { baseApi } from "./base/baseApi";
import type {
  SaveWorkAssignmentRequest,
  WorkAssignmentListResponse,
  WorkAssignmentResponse,
} from "../types/workAssignment";

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

  }),
  overrideExisting: true,
});

export const {
  useGetWorkAssignmentsByWorkQuery,
  useGetWorkAssignmentByIdQuery,
  useGetChildrenAssignmentsQuery,
  useGetMyParentCandidatesQuery,
  useCreateWorkAssignmentMutation,
  useDeactivateWorkAssignmentMutation,
  useActivateWorkAssignmentMutation,
} = workAssignmentApi;