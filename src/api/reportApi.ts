// src/api/reportApi.ts
import { baseApi } from "./base/baseApi";
import type {
  PagedResult,
  MyReportTemplateRow,
  MyReportTemplateSearchRequest,
  WorkAssignmentReportListRow,
  WorkAssignmentReportResponse,
  WorkAssignmentReportSearchRequest,
  InitWorkAssignmentReportRequest,
  SaveWorkAssignmentReportDraftRequest,
} from "../types/report";

export const reportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchMyReportTemplates: build.query<
      PagedResult<MyReportTemplateRow>,
      { workId: string; req: MyReportTemplateSearchRequest }
    >({
      query: ({ workId, req }) => ({
        url: `works/${workId}/my-report-templates/search`,
        method: "POST",
        data: {
          page: req.page,
          pageSize: req.pageSize,
          q: req.q || undefined,
          isActive: req.isActive ?? undefined,
          hasReport: req.hasReport ?? undefined,
          sortField: req.sortField || "latestUpdatedAtUtc",
          sortDirection: req.sortDirection || "desc",
        },
      }),
      providesTags: (result, _e, arg) => [
        ...((result?.rows ?? []).map((x) => ({
          type: "ReportTemplateGroup" as const,
          id: x.dynamicExcelId,
        }))),
        { type: "ReportTemplateGroup" as const, id: `WORK_${arg.workId}` },
      ],
    }),

    getAssignmentReports: build.query<WorkAssignmentReportListRow[], string>({
      query: (workAssignmentId) => ({
        url: `work-assignments/${workAssignmentId}/reports`,
        method: "GET",
      }),
      providesTags: (result, _e, workAssignmentId) => [
        ...((result ?? []).map((x) => ({
          type: "WorkAssignmentReport" as const,
          id: x.id,
        }))),
        { type: "WorkAssignmentReportList" as const, id: workAssignmentId },
      ],
    }),

    searchWorkAssignmentReports: build.query<
      PagedResult<WorkAssignmentReportListRow>,
      WorkAssignmentReportSearchRequest
    >({
      query: (req) => ({
        url: "work-assignment-reports/search",
        method: "POST",
        data: {
          page: req.page,
          pageSize: req.pageSize,
          workId: req.workId || undefined,
          workAssignmentId: req.workAssignmentId || undefined,
          q: req.q || undefined,
          periodKey: req.periodKey || undefined,
          status: req.status ?? undefined,
          isCurrent: req.isCurrent ?? undefined,
          sortField: req.sortField || "updatedAtUtc",
          sortDirection: req.sortDirection || "desc",
        },
      }),
      providesTags: (result) => [
        ...((result?.rows ?? []).map((x) => ({
          type: "WorkAssignmentReport" as const,
          id: x.id,
        }))),
        { type: "WorkAssignmentReportSearch" as const, id: "LIST" },
      ],
    }),

    getWorkAssignmentReport: build.query<WorkAssignmentReportResponse, string>({
      query: (id) => ({
        url: `work-assignment-reports/${id}`,
        method: "GET",
      }),
      providesTags: (_r, _e, id) => [
        { type: "WorkAssignmentReport" as const, id },
      ],
    }),

    initWorkAssignmentReport: build.mutation<
      WorkAssignmentReportResponse,
      { workAssignmentId: string; data: InitWorkAssignmentReportRequest }
    >({
      query: ({ workAssignmentId, data }) => ({
        url: `work-assignments/${workAssignmentId}/reports/init`,
        method: "POST",
        data: {
          periodKey: data.periodKey,
          periodStart: data.periodStart || undefined,
          periodEnd: data.periodEnd || undefined,
          note: data.note || undefined,
        },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkAssignmentReportList" as const, id: arg.workAssignmentId },
        { type: "WorkAssignmentReportSearch" as const, id: "LIST" },
      ],
    }),

    saveWorkAssignmentReportDraft: build.mutation<
      WorkAssignmentReportResponse,
      { id: string; data: SaveWorkAssignmentReportDraftRequest }
    >({
      query: ({ id, data }) => ({
        url: `work-assignment-reports/${id}/draft`,
        method: "PUT",
        data: {
          rawWorkbookDataJson: data.rawWorkbookDataJson,
          values1D: data.values1D,
          note: data.note || undefined,
        },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkAssignmentReport" as const, id: arg.id },
        { type: "WorkAssignmentReportSearch" as const, id: "LIST" },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useSearchMyReportTemplatesQuery,
  useLazySearchMyReportTemplatesQuery,

  useGetAssignmentReportsQuery,
  useLazyGetAssignmentReportsQuery,

  useSearchWorkAssignmentReportsQuery,
  useLazySearchWorkAssignmentReportsQuery,

  useGetWorkAssignmentReportQuery,
  useLazyGetWorkAssignmentReportQuery,

  useInitWorkAssignmentReportMutation,
  useSaveWorkAssignmentReportDraftMutation,
} = reportApi;