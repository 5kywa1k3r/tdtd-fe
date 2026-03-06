import { baseApi } from "./base/baseApi";
import type { SortDirection } from "../components/common/AppTable";
import type {
  WorkDetail,
  WorkListRow,
  WorkPriorityCore,
  WorkStatusCore,
  WorkTypeCore,
} from "../types/work";
import type { PagedResult } from "../types/pagedResult";

export type WorkSearchReq = {
  q?: string;
  status?: WorkStatusCore | null;
  priority?: WorkPriorityCore | null;
  leaderDirectiveUserId?: string | null;
  type: WorkTypeCore;
  page: number;
  pageSize: number;
  sortField?: "createdAtUtc" | "dueDate" | "autoCode" | "name" | "priority";
  sortDirection?: SortDirection;
};

export type WorkCreateReq = {
  name: string;
  description?: string | null;
  note?: string | null;
  leaderDirectiveUserId: string;
  leaderWatchUserIds?: string[];
  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;
  code?: string | null;
  priority?: WorkPriorityCore | null;
  type: WorkTypeCore;
};

export type WorkUpdateReq = Partial<Omit<WorkCreateReq, "type">>;

export const workApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchWorks: build.query<PagedResult<WorkListRow>, WorkSearchReq>({
      query: (req) => ({
        url: "works",
        method: "GET",
        params: {
          q: req.q || undefined,
          status: req.status == null ? undefined : Number(req.status),
          priority: req.priority == null ? undefined : Number(req.priority),
          type: Number(req.type),
          leaderDirectiveUserId: req.leaderDirectiveUserId || undefined,
          page: req.page,
          pageSize: req.pageSize,
          sortField: req.sortField || "createdAtUtc",
          sortDirection: req.sortDirection || "desc",
        },
      }),
      providesTags: (result) => [
        ...((result?.rows ?? []).map((x) => ({ type: "Work" as const, id: x.id }))),
        { type: "Work" as const, id: "LIST" },
      ],
    }),

    getWork: build.query<WorkDetail, string>({
      query: (id) => ({
        url: `works/${id}`,
        method: "GET",
      }),
      providesTags: (_r, _e, id) => [{ type: "Work" as const, id }],
    }),

    createWork: build.mutation<WorkDetail, WorkCreateReq>({
      query: (data) => ({
        url: "works",
        method: "POST",
        data: {
          ...data,
          priority: data.priority == null ? undefined : Number(data.priority),
          type: Number(data.type),
        },
      }),
      invalidatesTags: [{ type: "Work" as const, id: "LIST" }],
    }),

    updateWork: build.mutation<WorkDetail, { id: string; data: WorkUpdateReq }>({
      query: ({ id, data }) => ({
        url: `works/${id}`,
        method: "PUT",
        data: {
          ...data,
          priority: data.priority == null ? undefined : Number(data.priority),
        },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Work" as const, id: "LIST" },
        { type: "Work" as const, id: arg.id },
      ],
    }),

    deleteWork: build.mutation<void, string>({
      query: (id) => ({
        url: `works/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Work" as const, id: "LIST" },
        { type: "Work" as const, id },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useSearchWorksQuery,
  useGetWorkQuery,
  useCreateWorkMutation,
  useUpdateWorkMutation,
  useDeleteWorkMutation,
} = workApi;