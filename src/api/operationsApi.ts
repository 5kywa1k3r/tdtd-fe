import { baseApi } from "./base/baseApi";
import type { PagedResult } from "../types/pagedResult";

export type UserActionLogUserDto = {
  userId: string;
  username?: string | null;
  fullName?: string | null;
  unitId?: string | null;
  unitCode?: string | null;
  unitName?: string | null;
  unitLevel?: number | null;
};

export type UserActionLogUnitDto = {
  unitId: string;
  unitCode?: string | null;
  unitName?: string | null;
  unitLevel: number;
};

export type UserActionLogRow = {
  id: string;
  action: string;
  scope: string;
  result: string;
  occurredAtUtc: string;
  actor?: UserActionLogUserDto | null;
  targetUser?: UserActionLogUserDto | null;
  fromUser?: UserActionLogUserDto | null;
  toUser?: UserActionLogUserDto | null;
  users: UserActionLogUserDto[];
  unitScopes: UserActionLogUnitDto[];
  workId?: string | null;
  workAutoCode?: string | null;
  workCode?: string | null;
  workName?: string | null;
  workType?: string | null;
  workAssignmentId?: string | null;
  workAssignmentCode?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  workReportPeriodId?: string | null;
  periodKey?: string | null;
  periodInstanceKey?: string | null;
  periodStatus?: string | null;
  workAssignmentReportId?: string | null;
  reportStatus?: string | null;
  summary?: string | null;
  data?: Record<string, string> | null;
  createdAtUtc: string;
};

export type UserActionLogSearchReq = {
  action?: string;
  scope?: string;
  result?: string;
  workId?: string;
  workAssignmentId?: string;
  workReportPeriodId?: string;
  workAssignmentReportId?: string;
  actorUserId?: string;
  unitId?: string;
  userId?: string;
  fromUtc?: string;
  toUtc?: string;
  q?: string;
  page: number;
  pageSize: number;
};

export type WorkStatusOperationLogRow = {
  id: string;
  operation: string;
  scope: string;
  result: string;
  workId?: string | null;
  workAssignmentId?: string | null;
  workReportPeriodId?: string | null;
  workAssignmentReportId?: string | null;
  actorUserId?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  periodFromStatus?: string | null;
  periodToStatus?: string | null;
  assignmentFromStatus?: string | null;
  assignmentToStatus?: string | null;
  workFromStatus?: string | null;
  workToStatus?: string | null;
  summary?: string | null;
  errorType?: string | null;
  errorMessage?: string | null;
  errorStackTrace?: string | null;
  startedAtUtc: string;
  completedAtUtc: string;
  durationMs: number;
  createdAtUtc: string;
};

export type JobRunSearchReq = {
  status?: string;
  action?: string;
  operation?: string;
  result?: string;
  workId?: string;
  workAssignmentId?: string;
  workReportPeriodId?: string;
  dynamicFormTemplateId?: string;
  userId?: string;
  q?: string;
  includeInactive?: boolean;
  page: number;
  pageSize: number;
};

export type MaterializeJobRow = {
  id: string;
  workId: string;
  workAssignmentId: string;
  status: string;
  retryCount: number;
  nextRetryAtUtc?: string | null;
  leaseUntilUtc?: string | null;
  lastHeartbeatAtUtc?: string | null;
  lastRunAtUtc?: string | null;
  completedAtUtc?: string | null;
  lastError?: string | null;
  cursorAssigneeIndex: number;
  cursorDueIndex: number;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type ProjectionRetryJobRow = {
  id: string;
  dedupeKey: string;
  action: string;
  status: string;
  workId?: string | null;
  assignmentId?: string | null;
  workReportPeriodId?: string | null;
  dynamicExcelId?: string | null;
  userId?: string | null;
  docType?: string | null;
  docId?: string | null;
  byUserId: string;
  reason?: string | null;
  retryCount: number;
  nextRetryAtUtc?: string | null;
  leaseUntilUtc?: string | null;
  lastRunAtUtc?: string | null;
  completedAtUtc?: string | null;
  lastErrorType?: string | null;
  lastError?: string | null;
  lastErrorAtUtc?: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type UserActionLogRetryJobRow = {
  id: string;
  dedupeKey: string;
  action: string;
  status: string;
  retryCount: number;
  nextRetryAtUtc?: string | null;
  leaseUntilUtc?: string | null;
  lastRunAtUtc?: string | null;
  completedAtUtc?: string | null;
  lastErrorType?: string | null;
  lastError?: string | null;
  lastErrorAtUtc?: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type StatisticRebuildJobRow = {
  id: string;
  dedupeKey: string;
  dynamicFormTemplateId: string;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  status: string;
  requestedByUserId: string;
  priority: string;
  totalReportCount: number;
  processedReportCount: number;
  failedReportCount: number;
  lastReportId?: string | null;
  retryCount: number;
  nextRetryAtUtc?: string | null;
  leaseUntilUtc?: string | null;
  lastRunAtUtc?: string | null;
  completedAtUtc?: string | null;
  lastErrorType?: string | null;
  lastError?: string | null;
  lastErrorAtUtc?: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type ProcessJobRunResponse = {
  ok: boolean;
  processed: number;
  maxJobs: number;
  batchSize?: number;
};

export type ReportPayloadDiagnosticsRequest = {
  workId?: string;
  workAssignmentId?: string;
  workReportPeriodId?: string;
  workAssignmentReportId?: string;
  limit?: number;
};

export type ReportPayloadDiagnosticsRepairRequest = ReportPayloadDiagnosticsRequest & {
  dryRun?: boolean;
  softDeleteOrphanPayloadRows?: boolean;
  softDeleteOrphanTableValueRows?: boolean;
  enqueueStatisticRebuilds?: boolean;
  highPriorityStatisticRebuilds?: boolean;
};

export type ReportPayloadDiagnosticIssue = {
  type: string;
  key: string;
  workId?: string | null;
  workAssignmentId?: string | null;
  workReportPeriodId?: string | null;
  workAssignmentReportId?: string | null;
  payloadId?: string | null;
  tableValueId?: string | null;
  statValueId?: string | null;
  statCollection?: string | null;
  message: string;
  recommendedAction: string;
  fields: Record<string, string | null>;
};

export type ReportPayloadDiagnosticsResult = {
  checkedAtUtc: string;
  workId?: string | null;
  workAssignmentId?: string | null;
  workReportPeriodId?: string | null;
  workAssignmentReportId?: string | null;
  limit: number;
  scannedReportCount: number;
  scannedPayloadRowCount: number;
  scannedTableValueRowCount: number;
  scannedStatValueRowCount: number;
  issues: ReportPayloadDiagnosticIssue[];
  issueCount: number;
  hasIssues: boolean;
  issueCountsByType: Record<string, number>;
};

export type ReportPayloadDiagnosticsRepairResult = {
  dryRun: boolean;
  limit: number;
  softDeleteOrphanPayloadRows: boolean;
  softDeleteOrphanTableValueRows: boolean;
  enqueueStatisticRebuilds: boolean;
  highPriorityStatisticRebuilds: boolean;
  diagnostics: ReportPayloadDiagnosticsResult;
  plannedOrphanPayloadRows: number;
  softDeletedPayloadRows: number;
  plannedOrphanTableValueRows: number;
  softDeletedTableValueRows: number;
  plannedStatisticTemplateRebuilds: number;
  enqueuedStatisticTemplateRebuilds: number;
  statisticRebuildJobs: unknown[];
  errors: string[];
  failedCount: number;
};

const cleanParams = <T extends Record<string, unknown>>(params: T) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  );

export const operationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchActionLogs: build.query<PagedResult<UserActionLogRow>, UserActionLogSearchReq>({
      query: (req) => ({
        url: "admin/operations/action-logs",
        method: "GET",
        params: cleanParams(req),
      }),
      providesTags: [{ type: "UserActionLog" as const, id: "LIST" }],
    }),

    getActionLog: build.query<UserActionLogRow, string>({
      query: (id) => ({
        url: `admin/operations/action-logs/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "UserActionLog" as const, id }],
    }),

    searchJobOperationLogs: build.query<PagedResult<WorkStatusOperationLogRow>, JobRunSearchReq>({
      query: (req) => ({
        url: "admin/operations/job-runs/operation-logs",
        method: "GET",
        params: cleanParams({
          operation: req.operation ?? req.action,
          result: req.result ?? req.status,
          workId: req.workId,
          workAssignmentId: req.workAssignmentId,
          workReportPeriodId: req.workReportPeriodId,
          actorUserId: req.userId,
          q: req.q,
          page: req.page,
          pageSize: req.pageSize,
        }),
      }),
      providesTags: [{ type: "JobRun" as const, id: "OPERATION_LOGS" }],
    }),

    searchMaterializeJobs: build.query<PagedResult<MaterializeJobRow>, JobRunSearchReq>({
      query: (req) => ({
        url: "admin/operations/job-runs/materialize-jobs",
        method: "GET",
        params: cleanParams(req),
      }),
      providesTags: [{ type: "JobRun" as const, id: "MATERIALIZE" }],
    }),

    searchProjectionRetryJobs: build.query<PagedResult<ProjectionRetryJobRow>, JobRunSearchReq>({
      query: (req) => ({
        url: "admin/operations/job-runs/projection-retry-jobs",
        method: "GET",
        params: cleanParams(req),
      }),
      providesTags: [{ type: "JobRun" as const, id: "PROJECTION_RETRY" }],
    }),

    processProjectionRetryJobs: build.mutation<ProcessJobRunResponse, number | void>({
      query: (maxJobs = 20) => ({
        url: "admin/operations/job-runs/projection-retry-jobs/process",
        method: "POST",
        params: { maxJobs },
      }),
      invalidatesTags: [{ type: "JobRun" as const, id: "PROJECTION_RETRY" }],
    }),

    searchActionLogRetryJobs: build.query<PagedResult<UserActionLogRetryJobRow>, JobRunSearchReq>({
      query: (req) => ({
        url: "admin/operations/job-runs/action-log-retry-jobs",
        method: "GET",
        params: cleanParams(req),
      }),
      providesTags: [{ type: "JobRun" as const, id: "ACTION_LOG_RETRY" }],
    }),

    processActionLogRetryJobs: build.mutation<ProcessJobRunResponse, number | void>({
      query: (maxJobs = 20) => ({
        url: "admin/operations/job-runs/action-log-retry-jobs/process",
        method: "POST",
        params: { maxJobs },
      }),
      invalidatesTags: [{ type: "JobRun" as const, id: "ACTION_LOG_RETRY" }],
    }),

    searchStatisticRebuildJobs: build.query<PagedResult<StatisticRebuildJobRow>, JobRunSearchReq>({
      query: (req) => ({
        url: "admin/operations/job-runs/statistic-rebuild-jobs",
        method: "GET",
        params: cleanParams(req),
      }),
      providesTags: [{ type: "JobRun" as const, id: "STATISTIC_REBUILD" }],
    }),

    processStatisticRebuildJobs: build.mutation<
      ProcessJobRunResponse,
      { maxJobs?: number; batchSize?: number } | void
    >({
      query: (req) => ({
        url: "admin/operations/job-runs/statistic-rebuild-jobs/process",
        method: "POST",
        params: {
          maxJobs: req?.maxJobs ?? 3,
          batchSize: req?.batchSize ?? 25,
        },
      }),
      invalidatesTags: [{ type: "JobRun" as const, id: "STATISTIC_REBUILD" }],
    }),

    checkReportPayloadDiagnostics: build.query<ReportPayloadDiagnosticsResult, ReportPayloadDiagnosticsRequest>({
      query: (req) => ({
        url: "admin/operations/report-payloads/diagnostics",
        method: "GET",
        params: cleanParams(req),
      }),
      providesTags: [{ type: "ReportPayloadDiagnostics" as const, id: "CURRENT" }],
    }),

    repairReportPayloadDiagnostics: build.mutation<
      ReportPayloadDiagnosticsRepairResult,
      ReportPayloadDiagnosticsRepairRequest
    >({
      query: (req) => ({
        url: "admin/operations/report-payloads/diagnostics/repair",
        method: "POST",
        params: cleanParams(req),
      }),
      invalidatesTags: [
        { type: "ReportPayloadDiagnostics" as const, id: "CURRENT" },
        { type: "JobRun" as const, id: "OPERATION_LOGS" },
        { type: "JobRun" as const, id: "STATISTIC_REBUILD" },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useSearchActionLogsQuery,
  useSearchJobOperationLogsQuery,
  useSearchMaterializeJobsQuery,
  useSearchProjectionRetryJobsQuery,
  useProcessProjectionRetryJobsMutation,
  useSearchActionLogRetryJobsQuery,
  useProcessActionLogRetryJobsMutation,
  useSearchStatisticRebuildJobsQuery,
  useProcessStatisticRebuildJobsMutation,
  useCheckReportPayloadDiagnosticsQuery,
  useRepairReportPayloadDiagnosticsMutation,
} = operationsApi;
