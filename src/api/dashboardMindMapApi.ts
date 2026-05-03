import { baseApi } from "./base/baseApi";
import type {
  DashboardMindMapCursorNodeResult,
  DashboardMindMapFieldMetricReportsResult,
  DashboardMindMapFieldMetricReportsSearchRequest,
  DashboardMindMapNodeChildrenSearchRequest,
  DashboardMindMapNodeChildrenResult,
  DashboardMindMapNodeReportsResult,
  DashboardMindMapNodeReportsSearchRequest,
  DashboardMindMapNodeSummaryDto,
  DashboardMindMapNodeUnitsResult,
  DashboardMindMapNodeUnitsSearchRequest,
  DashboardMindMapScopeRequest,
  DashboardMindMapTemplateGroupDto,
  DashboardMindMapTemplateReportsResult,
  DashboardMindMapTemplateReportsSearchRequest,
  DashboardMindMapTemplateUsersResult,
  DashboardMindMapTableMetricReportsResult,
  DashboardMindMapTableMetricReportsSearchRequest,
  DashboardMindMapWorkResponse,
} from "../types/dashboardMindMap";

function buildMindMapScopeQueryString(
  scope?: DashboardMindMapScopeRequest | null,
  extras?: Record<string, string | number | null | undefined>,
): string {
  const params = new URLSearchParams();

  if (scope?.fromUtc) params.set("fromUtc", scope.fromUtc);
  if (scope?.toUtc) params.set("toUtc", scope.toUtc);

  for (const unitId of scope?.unitIds ?? []) {
    const value = unitId?.trim();
    if (value) params.append("unitIds", value);
  }

  for (const [key, value] of Object.entries(extras ?? {})) {
    if (value == null || value === "") continue;
    params.set(key, String(value));
  }

  return params.toString();
}

export const dashboardMindMapApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboardMindMapWorkTree: build.query<
      DashboardMindMapWorkResponse,
      {
        workId: string;
        page?: number;
        pageSize?: number;
        scope?: DashboardMindMapScopeRequest | null;
      }
    >({
      query: ({ workId, page = 0, pageSize = 20, scope }) => {
        const qs = buildMindMapScopeQueryString(scope, { page, pageSize });
        return {
          url: qs ? `dashboard-mindmap/works/${workId}?${qs}` : `dashboard-mindmap/works/${workId}`,
          method: "GET",
        };
      },
      keepUnusedDataFor: 180,
      providesTags: (_result, _error, arg) => [
        {
          type: "DashboardMindMap" as const,
          id: `WORK_${arg.workId}_${arg.page ?? 0}_${arg.pageSize ?? 20}_${JSON.stringify(arg.scope ?? {})}`,
        },
        { type: "DashboardMindMap" as const, id: `WORK_${arg.workId}` },
      ],
    }),

    getDashboardMindMapRootAssignments: build.query<
      DashboardMindMapCursorNodeResult,
      { workId: string; cursor?: string | null; limit?: number }
    >({
      query: ({ workId, cursor, limit = 20 }) => {
        const params = new URLSearchParams();
        if (cursor) params.set("cursor", cursor);
        params.set("limit", String(limit));
        return {
          url: `dashboard-mindmap/works/${workId}/root-assignments?${params.toString()}`,
          method: "GET",
        };
      },
      keepUnusedDataFor: 300,
      providesTags: (_result, _error, arg) => [
        { type: "DashboardMindMap" as const, id: `ROOTS_${arg.workId}_${arg.cursor ?? "0"}` },
      ],
    }),

    getDashboardMindMapChildren: build.query<
      DashboardMindMapCursorNodeResult,
      { assignmentId: string; cursor?: string | null; limit?: number }
    >({
      query: ({ assignmentId, cursor, limit = 20 }) => {
        const params = new URLSearchParams();
        if (cursor) params.set("cursor", cursor);
        params.set("limit", String(limit));
        return {
          url: `dashboard-mindmap/nodes/${assignmentId}/children?${params.toString()}`,
          method: "GET",
        };
      },
      keepUnusedDataFor: 300,
      providesTags: (_result, _error, arg) => [
        { type: "DashboardMindMapNode" as const, id: `CHILDREN_${arg.assignmentId}_${arg.cursor ?? "0"}` },
      ],
    }),

    searchDashboardMindMapNodeChildren: build.query<
      DashboardMindMapNodeChildrenResult,
      { assignmentId: string; req?: DashboardMindMapNodeChildrenSearchRequest }
    >({
      query: ({ assignmentId, req }) => ({
        url: `dashboard-mindmap/nodes/${assignmentId}/children/search`,
        method: "POST",
        data: req ?? { unitIds: [] },
      }),
      keepUnusedDataFor: 300,
      providesTags: (_result, _error, arg) => [
        { type: "DashboardMindMapNode" as const, id: arg.assignmentId },
      ],
    }),

    getDashboardMindMapTemplateGroups: build.query<
      DashboardMindMapTemplateGroupDto[],
      { assignmentId: string }
    >({
      query: ({ assignmentId }) => ({
        url: `dashboard-mindmap/nodes/${assignmentId}/template-groups`,
        method: "GET",
      }),
      keepUnusedDataFor: 300,
      providesTags: (_result, _error, arg) => [
        { type: "DashboardMindMapNode" as const, id: `TEMPLATES_${arg.assignmentId}` },
      ],
    }),

    getDashboardMindMapTemplateUsers: build.query<
      DashboardMindMapTemplateUsersResult,
      {
        assignmentId: string;
        dynamicExcelId: string;
        q?: string | null;
        cursor?: string | null;
        limit?: number;
      }
    >({
      query: ({ assignmentId, dynamicExcelId, q, cursor, limit = 5 }) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (cursor) params.set("cursor", cursor);
        params.set("limit", String(limit));
        return {
          url: `dashboard-mindmap/nodes/${assignmentId}/templates/${dynamicExcelId}/users?${params.toString()}`,
          method: "GET",
        };
      },
      keepUnusedDataFor: 300,
      providesTags: (_result, _error, arg) => [
        {
          type: "DashboardMindMapNode" as const,
          id: `USERS_${arg.assignmentId}_${arg.dynamicExcelId}_${arg.cursor ?? "0"}_${arg.q ?? ""}`,
        },
      ],
    }),

    searchDashboardMindMapTemplateReports: build.query<
      DashboardMindMapTemplateReportsResult,
      {
        assignmentId: string;
        dynamicExcelId: string;
        req?: DashboardMindMapTemplateReportsSearchRequest;
      }
    >({
      query: ({ assignmentId, dynamicExcelId, req }) => ({
        url: `dashboard-mindmap/nodes/${assignmentId}/templates/${dynamicExcelId}/reports/search`,
        method: "POST",
        data: req ?? { assigneeUserIds: [], limit: 5 },
      }),
      keepUnusedDataFor: 300,
      providesTags: (_result, _error, arg) => [
        {
          type: "DashboardMindMapReports" as const,
          id: `TEMPLATE_REPORTS_${arg.assignmentId}_${arg.dynamicExcelId}_${arg.req?.cursor ?? "0"}_${(arg.req?.assigneeUserIds ?? []).join(",")}_${(arg.req?.statusBuckets ?? []).join(",")}_${arg.req?.fromUtc ?? ""}_${arg.req?.toUtc ?? ""}_${arg.req?.q ?? ""}`,
        },
      ],
    }),

    getDashboardMindMapNodeSummary: build.query<
      DashboardMindMapNodeSummaryDto,
      { assignmentId: string; scope?: DashboardMindMapScopeRequest | null }
    >({
      query: ({ assignmentId, scope }) => {
        const qs = buildMindMapScopeQueryString(scope);
        return {
          url: qs
            ? `dashboard-mindmap/nodes/${assignmentId}/summary?${qs}`
            : `dashboard-mindmap/nodes/${assignmentId}/summary`,
          method: "GET",
        };
      },
      keepUnusedDataFor: 300,
      providesTags: (_result, _error, arg) => [
        { type: "DashboardMindMapNode" as const, id: arg.assignmentId },
      ],
    }),

    searchDashboardMindMapNodeUnits: build.query<
      DashboardMindMapNodeUnitsResult,
      { assignmentId: string; req: DashboardMindMapNodeUnitsSearchRequest }
    >({
      query: ({ assignmentId, req }) => ({
        url: `dashboard-mindmap/nodes/${assignmentId}/units/search`,
        method: "POST",
        data: req,
      }),
      keepUnusedDataFor: 180,
      providesTags: (_result, _error, arg) => [
        {
          type: "DashboardMindMapUnits" as const,
          id: `${arg.assignmentId}_${arg.req.bucket ?? "ALL"}_${arg.req.page ?? 0}_${arg.req.pageSize ?? 10}_${JSON.stringify({
            fromUtc: arg.req.fromUtc ?? null,
            toUtc: arg.req.toUtc ?? null,
            unitIds: arg.req.unitIds ?? [],
          })}`,
        },
      ],
    }),

    searchDashboardMindMapNodeReports: build.query<
      DashboardMindMapNodeReportsResult,
      { assignmentId: string; req: DashboardMindMapNodeReportsSearchRequest }
    >({
      query: ({ assignmentId, req }) => ({
        url: `dashboard-mindmap/nodes/${assignmentId}/reports/search`,
        method: "POST",
        data: req,
      }),
      keepUnusedDataFor: 180,
      providesTags: (_result, _error, arg) => [
        {
          type: "DashboardMindMapReports" as const,
          id: `${arg.assignmentId}_${arg.req.bucket ?? "ALL"}_${arg.req.page ?? 0}_${arg.req.pageSize ?? 10}_${JSON.stringify({
            fromUtc: arg.req.fromUtc ?? null,
            toUtc: arg.req.toUtc ?? null,
            unitIds: arg.req.unitIds ?? [],
          })}`,
        },
      ],
    }),

    searchDashboardMindMapTableMetricReports: build.query<
      DashboardMindMapTableMetricReportsResult,
      { assignmentId: string; req: DashboardMindMapTableMetricReportsSearchRequest }
    >({
      query: ({ assignmentId, req }) => ({
        url: `dashboard-mindmap/nodes/${assignmentId}/table-metrics/reports/search`,
        method: "POST",
        data: req,
      }),
      keepUnusedDataFor: 180,
      providesTags: (_result, _error, arg) => [
        {
          type: "DashboardMindMapReports" as const,
          id: `TABLE_METRIC_${arg.assignmentId}_${arg.req.metricKey}_${arg.req.blockId ?? ""}_${arg.req.tableMode ?? ""}_${arg.req.page ?? 0}_${arg.req.pageSize ?? 10}_${JSON.stringify({
            fromUtc: arg.req.fromUtc ?? null,
            toUtc: arg.req.toUtc ?? null,
            unitIds: arg.req.unitIds ?? [],
          })}`,
        },
      ],
    }),

    searchDashboardMindMapFieldMetricReports: build.query<
      DashboardMindMapFieldMetricReportsResult,
      { assignmentId: string; req: DashboardMindMapFieldMetricReportsSearchRequest }
    >({
      query: ({ assignmentId, req }) => ({
        url: `dashboard-mindmap/nodes/${assignmentId}/field-metrics/reports/search`,
        method: "POST",
        data: req,
      }),
      keepUnusedDataFor: 180,
      providesTags: (_result, _error, arg) => [
        {
          type: "DashboardMindMapReports" as const,
          id: `FIELD_METRIC_${arg.assignmentId}_${arg.req.fieldId}_${arg.req.bucketKey ?? ""}_${arg.req.page ?? 0}_${arg.req.pageSize ?? 10}_${JSON.stringify({
            fromUtc: arg.req.fromUtc ?? null,
            toUtc: arg.req.toUtc ?? null,
            unitIds: arg.req.unitIds ?? [],
          })}`,
        },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetDashboardMindMapWorkTreeQuery,
  useLazyGetDashboardMindMapRootAssignmentsQuery,
  useLazyGetDashboardMindMapChildrenQuery,
  useLazySearchDashboardMindMapNodeChildrenQuery,
  useLazyGetDashboardMindMapTemplateGroupsQuery,
  useLazyGetDashboardMindMapTemplateUsersQuery,
  useLazySearchDashboardMindMapTemplateReportsQuery,
  useGetDashboardMindMapNodeSummaryQuery,
  useSearchDashboardMindMapNodeUnitsQuery,
  useSearchDashboardMindMapNodeReportsQuery,
  useSearchDashboardMindMapTableMetricReportsQuery,
  useSearchDashboardMindMapFieldMetricReportsQuery,
} = dashboardMindMapApi;
