import { baseApi } from "./base/baseApi";
import type {
  DashboardOverviewRequest,
  DashboardOverviewResponse,
  DashboardReportAssignmentOptionDto,
  DashboardReportAssignmentOptionsRequest,
  MyWorksDashboardRequest,
  MyWorksDashboardResponse,
  WorkDashboardDetailDto,
  WorkDashboardDetailRequest,
} from "../types/dashboard";

function buildDetailQueryString(req?: WorkDashboardDetailRequest): string {
  if (!req) return "";

  const params = new URLSearchParams();

  if (req.fromUtc) params.set("fromUtc", req.fromUtc);
  if (req.toUtc) params.set("toUtc", req.toUtc);

  for (const unitId of req.unitIds ?? []) {
    const v = unitId?.trim();
    if (v) params.append("unitIds", v);
  }

  if (typeof req.includeRootAssignments === "boolean") {
    params.set("includeRootAssignments", String(req.includeRootAssignments));
  }

  if (typeof req.includeReportSummary === "boolean") {
    params.set("includeReportSummary", String(req.includeReportSummary));
  }

  return params.toString();
}

function buildReportAssignmentOptionsQueryString(
  req?: DashboardReportAssignmentOptionsRequest | void
): string {
  if (!req) return "";

  const params = new URLSearchParams();

  if (req.fromUtc) params.set("fromUtc", req.fromUtc);
  if (req.toUtc) params.set("toUtc", req.toUtc);

  for (const unitId of req.unitIds ?? []) {
    const v = unitId?.trim();
    if (v) params.append("unitIds", v);
  }

  return params.toString();
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboardOverview: build.query<
      DashboardOverviewResponse,
      DashboardOverviewRequest
    >({
      query: (req) => ({
        url:
          req?.forceRefresh === true
            ? "dashboard/overview/refresh"
            : "dashboard/overview",
        method: "POST",
        data: {
          mode: req.mode,
          fromUtc: req.fromUtc ?? null,
          toUtc: req.toUtc ?? null,
          unitIds: req.unitIds ?? [],
          assignmentId: req.assignmentId?.trim() || null,
          topUnitCount: req.topUnitCount ?? 3,
        },
      }),
    }),

    getDashboardReportAssignmentOptions: build.query<
      DashboardReportAssignmentOptionDto[],
      DashboardReportAssignmentOptionsRequest | void
    >({
      query: (req) => {
        const actualReq: DashboardReportAssignmentOptionsRequest | undefined = req ?? undefined;
        const qs = buildReportAssignmentOptionsQueryString(actualReq);
        return {
          url: qs
            ? `dashboard/report-assignment-options?${qs}`
            : "dashboard/report-assignment-options",
          method: "GET",
        };
      },
    }),

    getMyWorksSummary: build.query<
      MyWorksDashboardResponse,
      MyWorksDashboardRequest | void
    >({
      query: (req) => ({
        url:
          req?.forceRefresh === true
            ? "dashboard/my-works/summary/refresh"
            : "dashboard/my-works/summary",
        method: "POST",
        data: {
          fromUtc: req?.fromUtc ?? null,
          toUtc: req?.toUtc ?? null,
          keyword: req?.keyword?.trim() || null,
          unitIds: req?.unitIds ?? [],
        },
      }),
    }),

    getWorkDashboardDetail: build.query<
      WorkDashboardDetailDto,
      { workId: string; req?: WorkDashboardDetailRequest }
    >({
      query: ({ workId, req }) => {
        const qs = buildDetailQueryString(req);
        const baseUrl =
          req?.forceRefresh === true
            ? `dashboard/works/${workId}/refresh`
            : `dashboard/works/${workId}`;

        return {
          url: qs ? `${baseUrl}?${qs}` : baseUrl,
          method: "GET",
        };
      },
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetDashboardOverviewQuery,
  useLazyGetDashboardOverviewQuery,
  useGetDashboardReportAssignmentOptionsQuery,
  useGetMyWorksSummaryQuery,
  useLazyGetMyWorksSummaryQuery,
  useGetWorkDashboardDetailQuery,
  useLazyGetWorkDashboardDetailQuery,
} = dashboardApi;
