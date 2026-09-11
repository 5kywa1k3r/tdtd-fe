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
  grain?: string;
  workId?: string;
  workAssignmentId?: string;
  workReportPeriodId?: string;
  dynamicFormTemplateId?: string;
  flowInstanceId?: string;
  flowEffectiveStatus?: string;
  periodInstanceKey?: string;
  sectionId?: string;
  configId?: string;
  configHash?: string;
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
  scopeKind: string;
  workId?: string | null;
  workAssignmentId?: string | null;
  flowInstanceId?: string | null;
  flowEffectiveStatus?: string | null;
  periodInstanceKey?: string | null;
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

export type StatisticRebuildJobResetResponse = {
  ok: boolean;
  jobId: string;
  queuedAtUtc: string;
  job?: StatisticRebuildJobRow | null;
};

export type FlowStatisticProjectionDiagnosticsRequest = {
  workId?: string;
  flowInstanceId?: string;
  dynamicFormTemplateId?: string;
  flowEffectiveStatus?: string;
  periodInstanceKey?: string;
  limit?: number;
};

export type FlowStatisticProjectionDiagnosticRow = {
  workAssignmentReportId: string;
  workAssignmentId: string;
  periodKey: string;
  periodInstanceKey: string;
  reportStatus: number;
  payloadRevision: number;
  payloadHash?: string | null;
  fieldProjectionRows: number;
  tableProjectionRows: number;
  labelProjectionRows: number;
  fieldProjectionFresh: boolean;
  tableProjectionFresh: boolean;
  labelProjectionFresh: boolean;
  flowMetadataMatches: boolean;
  issueTypes: string[];
};

export type FlowStatisticProjectionDiagnosticsResponse = {
  checkedAtUtc: string;
  workId: string;
  flowInstanceId: string;
  dynamicFormTemplateId?: string | null;
  flowEffectiveStatus?: string | null;
  periodInstanceKey?: string | null;
  limit: number;
  assignmentCount: number;
  matchingReportCount: number;
  scannedReportCount: number;
  fieldProjectionRowCount: number;
  tableProjectionRowCount: number;
  labelProjectionRowCount: number;
  noProjectionReportCount: number;
  staleProjectionReportCount: number;
  flowMetadataMismatchReportCount: number;
  truncated: boolean;
  rows: FlowStatisticProjectionDiagnosticRow[];
  issueCountsByType: Record<string, number>;
};

export type BasicSummaryJobRow = {
  id: string;
  workId: string;
  scopeAssignmentId: string;
  dynamicFormTemplateId: string;
  requestHash: string;
  sourceSignatureHash?: string | null;
  sourceAssignmentCount: number;
  sourceReportCount: number;
  snapshotDirty: boolean;
  snapshotDirtyAtUtc?: string | null;
  snapshotRefreshedAtUtc?: string | null;
  refreshStatus?: string | null;
  refreshJobId?: string | null;
  refreshCorrelationId?: string | null;
  refreshRequestedByUserId?: string | null;
  refreshResetByUserId?: string | null;
  refreshQueuedAtUtc?: string | null;
  refreshStartedAtUtc?: string | null;
  refreshFinishedAtUtc?: string | null;
  refreshResetAtUtc?: string | null;
  refreshError?: string | null;
  isDeleted: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type BasicSummaryJobResetResponse = {
  ok: boolean;
  job?: BasicSummaryJobRow | null;
  snapshotId: string;
  jobId: string;
  correlationId: string;
  queuedAtUtc: string;
};

export type AdvancedSummaryNodeRow = {
  id: string;
  grain: string;
  grainKey: string;
  workId: string;
  assignmentId: string;
  dynamicFormTemplateId: string;
  sectionId: string;
  configId: string;
  configVersionNo: number;
  configHash: string;
  status: string;
  isDirty: boolean;
  dirtyReason?: string | null;
  sourceSignatureHash?: string | null;
  sourceReportCount: number;
  valueHash?: string | null;
  builtAtUtc?: string | null;
  buildJobId?: string | null;
  buildCorrelationId?: string | null;
  buildError?: string | null;
  windowStartUtc: string;
  windowEndExclusiveUtc: string;
  isDeleted: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type AdvancedSummaryNodeResetResponse = {
  ok: boolean;
  grain: string;
  nodeId: string;
  configId: string;
  grainKey: string;
  jobId: string;
  correlationId: string;
  queuedAtUtc: string;
  node?: AdvancedSummaryNodeRow | null;
};

export type AdvancedSummaryNodeCleanupRequest = {
  grain?: string;
  status?: string;
  workId?: string;
  workAssignmentId?: string;
  dynamicFormTemplateId?: string;
  sectionId?: string;
  configId?: string;
  configVersionNo?: number;
  configHash?: string;
  sourceSignatureHash?: string;
  updatedBeforeUtc?: string;
  builtBeforeUtc?: string;
  dryRun?: boolean;
  limit?: number;
};

export type AdvancedSummaryNodeCleanupResponse = {
  ok: boolean;
  dryRun: boolean;
  limit: number;
  matchedCount: number;
  selectedCount: number;
  softDeletedCount: number;
  hasMore: boolean;
  sampleRows: AdvancedSummaryNodeRow[];
};

export type AdvancedSummaryDayDiagnosticsRequest = {
  configId: string;
  dayKey: string;
  includeValueJson?: boolean;
};

export type AdvancedSummaryMonthDiagnosticsRequest = {
  configId: string;
  monthKey: string;
  includeValueJson?: boolean;
};

export type AdvancedSummaryYearDiagnosticsRequest = {
  configId: string;
  yearKey: string;
  includeValueJson?: boolean;
};

export type AdvancedSummaryDayDiagnosticSnapshot = {
  nodeId?: string | null;
  status: string;
  isDirty: boolean;
  sourceReportCount: number;
  sourceReportIds?: string[];
  inputNodeKeys?: string[];
  sourceSignatureHash?: string | null;
  valueHash?: string | null;
  comparableValueHash?: string | null;
  comparableValueError?: string | null;
  builtAtUtc?: string | null;
  buildJobId?: string | null;
  buildCorrelationId?: string | null;
  buildError?: string | null;
  windowStartUtc: string;
  windowEndExclusiveUtc: string;
  valueJson?: string | null;
};

export type AdvancedSummaryDayDiagnosticsResponse = {
  configId: string;
  configHash: string;
  dayKey: string;
  status: string;
  matches: boolean;
  diagnosticActorUserId: string;
  checkedAtUtc: string;
  differences: string[];
  cache?: AdvancedSummaryDayDiagnosticSnapshot | null;
  direct: AdvancedSummaryDayDiagnosticSnapshot;
};

export type AdvancedSummaryMonthDiagnosticsResponse = {
  configId: string;
  configHash: string;
  monthKey: string;
  status: string;
  matches: boolean;
  diagnosticActorUserId: string;
  checkedAtUtc: string;
  differences: string[];
  cache?: AdvancedSummaryDayDiagnosticSnapshot | null;
  direct: AdvancedSummaryDayDiagnosticSnapshot;
};

export type AdvancedSummaryYearDiagnosticsResponse = {
  configId: string;
  configHash: string;
  yearKey: string;
  status: string;
  matches: boolean;
  diagnosticActorUserId: string;
  checkedAtUtc: string;
  differences: string[];
  cache?: AdvancedSummaryDayDiagnosticSnapshot | null;
  direct: AdvancedSummaryDayDiagnosticSnapshot;
};

export type WorkSummaryTokenQuotaQuery = {
  ownerUnitId?: string;
  tokenKind?: string;
  periodMonthKey?: string;
};

export type WorkSummaryTokenQuotaResponse = {
  ownerUnitId: string;
  tokenKind: string;
  periodMonthKey: string;
  baseMonthlyQuota: number;
  grantedUnits: number;
  usedUnits: number;
  monthlyQuota: number;
  remainingUnits: number;
};

export type WorkSummaryTokenGrantRequest = {
  ownerUnitId: string;
  units: number;
  tokenKind?: string;
  periodMonthKey?: string;
  reason?: string;
};

export type WorkSummaryTokenGrantResponse = {
  ledgerId: string;
  ownerUnitId: string;
  issuerUserId: string;
  tokenKind: string;
  periodMonthKey: string;
  units: number;
  quota: WorkSummaryTokenQuotaResponse;
  createdAtUtc: string;
};

export type WorkSummaryTokenLedgerRow = {
  id: string;
  ownerUserId?: string | null;
  ownerUnitId?: string | null;
  actorUserId: string;
  issuerUserId?: string | null;
  tokenKind: string;
  direction: string;
  units: number;
  monthlyQuota: number;
  periodMonthKey: string;
  requestTokenId?: string | null;
  workId?: string | null;
  workAssignmentId?: string | null;
  dynamicFormTemplateId?: string | null;
  sectionId?: string | null;
  configId?: string | null;
  configVersionNo?: number | null;
  configHash?: string | null;
  jobId?: string | null;
  reason: string;
  outcome: string;
  error?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type WorkSummaryTokenLedgerSearchReq = {
  ownerUnitId?: string;
  ownerUserId?: string;
  actorUserId?: string;
  issuerUserId?: string;
  tokenKind?: string;
  direction?: string;
  outcome?: string;
  periodMonthKey?: string;
  configId?: string;
  jobId?: string;
  q?: string;
  page: number;
  pageSize: number;
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

    resetStatisticRebuildJob: build.mutation<StatisticRebuildJobResetResponse, string>({
      query: (jobId) => ({
        url: `admin/operations/job-runs/statistic-rebuild-jobs/${jobId}/reset`,
        method: "POST",
      }),
      invalidatesTags: [
        { type: "JobRun" as const, id: "STATISTIC_REBUILD" },
        { type: "JobRun" as const, id: "OPERATION_LOGS" },
      ],
    }),

    diagnoseFlowStatisticProjections: build.query<
      FlowStatisticProjectionDiagnosticsResponse,
      FlowStatisticProjectionDiagnosticsRequest
    >({
      query: (req) => ({
        url: "admin/operations/job-runs/flow-statistics/diagnostics",
        method: "GET",
        params: cleanParams(req),
      }),
    }),

    searchBasicSummaryJobs: build.query<PagedResult<BasicSummaryJobRow>, JobRunSearchReq>({
      query: (req) => ({
        url: "admin/operations/job-runs/basic-summary-jobs",
        method: "GET",
        params: cleanParams(req),
      }),
      providesTags: [{ type: "JobRun" as const, id: "BASIC_SUMMARY" }],
    }),

    resetBasicSummaryJob: build.mutation<BasicSummaryJobResetResponse, string>({
      query: (snapshotId) => ({
        url: `admin/operations/job-runs/basic-summary-jobs/${snapshotId}/reset`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "JobRun" as const, id: "BASIC_SUMMARY" }],
    }),

    searchAdvancedSummaryNodes: build.query<PagedResult<AdvancedSummaryNodeRow>, JobRunSearchReq>({
      query: (req) => ({
        url: "admin/operations/job-runs/advanced-summary-nodes",
        method: "GET",
        params: cleanParams(req),
      }),
      providesTags: [{ type: "JobRun" as const, id: "ADVANCED_SUMMARY" }],
    }),

    resetAdvancedSummaryNode: build.mutation<
      AdvancedSummaryNodeResetResponse,
      { grain: string; nodeId: string }
    >({
      query: ({ grain, nodeId }) => ({
        url: `admin/operations/job-runs/advanced-summary-nodes/${grain}/${nodeId}/reset`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "JobRun" as const, id: "ADVANCED_SUMMARY" }],
    }),

    cleanupAdvancedSummaryNodes: build.mutation<
      AdvancedSummaryNodeCleanupResponse,
      AdvancedSummaryNodeCleanupRequest
    >({
      query: (req) => ({
        url: "admin/operations/job-runs/advanced-summary-nodes/cleanup",
        method: "POST",
        data: cleanParams(req),
      }),
      invalidatesTags: [
        { type: "JobRun" as const, id: "ADVANCED_SUMMARY" },
        { type: "JobRun" as const, id: "OPERATION_LOGS" },
      ],
    }),

    diagnoseAdvancedSummaryDayNode: build.mutation<
      AdvancedSummaryDayDiagnosticsResponse,
      AdvancedSummaryDayDiagnosticsRequest
    >({
      query: (req) => ({
        url: "admin/operations/job-runs/advanced-summary-nodes/diagnostics/day",
        method: "POST",
        data: cleanParams(req),
      }),
    }),

    diagnoseAdvancedSummaryMonthNode: build.mutation<
      AdvancedSummaryMonthDiagnosticsResponse,
      AdvancedSummaryMonthDiagnosticsRequest
    >({
      query: (req) => ({
        url: "admin/operations/job-runs/advanced-summary-nodes/diagnostics/month",
        method: "POST",
        data: cleanParams(req),
      }),
    }),

    diagnoseAdvancedSummaryYearNode: build.mutation<
      AdvancedSummaryYearDiagnosticsResponse,
      AdvancedSummaryYearDiagnosticsRequest
    >({
      query: (req) => ({
        url: "admin/operations/job-runs/advanced-summary-nodes/diagnostics/year",
        method: "POST",
        data: cleanParams(req),
      }),
    }),

    getWorkSummaryTokenQuota: build.query<WorkSummaryTokenQuotaResponse, WorkSummaryTokenQuotaQuery>({
      query: (req) => ({
        url: "work-summary-tokens/quota",
        method: "GET",
        params: cleanParams(req),
      }),
      providesTags: (_result, _error, req) => [
        { type: "SummaryToken" as const, id: "QUOTA" },
        {
          type: "SummaryToken" as const,
          id: `quota:${req.ownerUnitId || "self"}:${req.tokenKind || "default"}:${req.periodMonthKey || "current"}`,
        },
      ],
    }),

    searchWorkSummaryTokenLedger: build.query<
      PagedResult<WorkSummaryTokenLedgerRow>,
      WorkSummaryTokenLedgerSearchReq
    >({
      query: (req) => ({
        url: "work-summary-tokens/ledger",
        method: "GET",
        params: cleanParams(req),
      }),
      providesTags: [{ type: "SummaryToken" as const, id: "LEDGER" }],
    }),

    grantWorkSummaryTokenQuota: build.mutation<
      WorkSummaryTokenGrantResponse,
      WorkSummaryTokenGrantRequest
    >({
      query: (req) => ({
        url: "work-summary-tokens/grants",
        method: "POST",
        data: cleanParams(req),
      }),
      invalidatesTags: [
        { type: "SummaryToken" as const, id: "LEDGER" },
        { type: "SummaryToken" as const, id: "QUOTA" },
      ],
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
  useResetStatisticRebuildJobMutation,
  useLazyDiagnoseFlowStatisticProjectionsQuery,
  useSearchBasicSummaryJobsQuery,
  useResetBasicSummaryJobMutation,
  useSearchAdvancedSummaryNodesQuery,
  useResetAdvancedSummaryNodeMutation,
  useCleanupAdvancedSummaryNodesMutation,
  useDiagnoseAdvancedSummaryDayNodeMutation,
  useDiagnoseAdvancedSummaryMonthNodeMutation,
  useDiagnoseAdvancedSummaryYearNodeMutation,
  useGetWorkSummaryTokenQuotaQuery,
  useSearchWorkSummaryTokenLedgerQuery,
  useGrantWorkSummaryTokenQuotaMutation,
  useCheckReportPayloadDiagnosticsQuery,
  useRepairReportPayloadDiagnosticsMutation,
} = operationsApi;
