import { baseApi } from "./base/baseApi";
import type {
  WorkAssignmentResponse,
  SaveWorkAssignmentReq,
} from "../types/workAssignment";

export const workAssignmentApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getWorkAssignmentsByWork: b.query<WorkAssignmentResponse[], { workId: string }>({
      query: ({ workId }) => ({
        url: `/works/${workId}/assignments`,
        method: "GET",
      }),
      providesTags: (_r, _e, arg) => [
        { type: "WorkAssignment", id: `WORK:${arg.workId}` },
      ],
      keepUnusedDataFor: 30,
    }),

    getWorkAssignment: b.query<WorkAssignmentResponse, { id: string }>({
      query: ({ id }) => ({
        url: `/work-assignments/${id}`,
        method: "GET",
      }),
      providesTags: (_r, _e, arg) => [{ type: "WorkAssignment", id: arg.id }],
      keepUnusedDataFor: 30,
    }),

    createWorkAssignment: b.mutation<
      WorkAssignmentResponse,
      { workId: string; body: SaveWorkAssignmentReq }
    >({
      query: ({ workId, body }) => ({
        url: `/works/${workId}/assignments`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkAssignment", id: `WORK:${arg.workId}` },
        { type: "Work", id: arg.workId },
      ],
    }),

    updateWorkAssignment: b.mutation<
      WorkAssignmentResponse,
      { id: string; body: SaveWorkAssignmentReq; workId: string }
    >({
      query: ({ id, body }) => ({
        url: `/work-assignments/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkAssignment", id: arg.id },
        { type: "WorkAssignment", id: `WORK:${arg.workId}` },
        { type: "Work", id: arg.workId },
      ],
    }),

    deleteWorkAssignment: b.mutation<void, { id: string; workId: string }>({
      query: ({ id }) => ({
        url: `/work-assignments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkAssignment", id: arg.id },
        { type: "WorkAssignment", id: `WORK:${arg.workId}` },
        { type: "Work", id: arg.workId },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetWorkAssignmentsByWorkQuery,
  useGetWorkAssignmentQuery,
  useCreateWorkAssignmentMutation,
  useUpdateWorkAssignmentMutation,
  useDeleteWorkAssignmentMutation,
} = workAssignmentApi;