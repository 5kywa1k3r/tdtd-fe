import { baseApi } from "./base/baseApi";
import type { PagedResult } from "../types/pagedResult";

export type P8StatConfigStatus =
  | "DRAFT"
  | "ACTIVE"
  | "INACTIVE"
  | "LOCKED"
  | "ARCHIVED"
  | "TOMBSTONED";

export type P8StatConfigIdentity = {
  ownerKind: string;
  ownerId: string;
  configId: string;
  versionId: string;
  versionNo: number;
  revision: number;
  status: P8StatConfigStatus | string;
  configHash: string;
  dependencyPins: string[];
};

export type P8StatConfigPermissionSet = {
  canReadConfig: boolean;
  canManageDraft: boolean;
  canLockVersion: boolean;
  canViewResult: boolean;
  canReadDiagnostics: boolean;
};

export type P8StatConfigMutationEnvelope<TPayload> = {
  commandId: string;
  expectedRevision: number;
  expectedConfigHash: string;
  payload: TPayload;
};

export type P8StatConfigEmptyCommandPayload = Record<string, never>;

export type P8StatConfigSourceScopePayload = {
  mode?: string | null;
  flowInstanceId?: string | null;
  flowStepId?: string | null;
  flowBranchId?: string | null;
  flowEffectiveStatus?: string | null;
};

export type P8DynamicFormStatisticSettingsPayload = {
  aggregateOps?: string[] | null;
  bucketMode?: string | null;
  showInDetail?: boolean | null;
  showInTree?: boolean | null;
};

export type P8DynamicFormStatisticFieldPayload = {
  fieldId?: string | null;
  isStatistic?: boolean | null;
  statistic?: P8DynamicFormStatisticSettingsPayload | null;
  statisticLabelCodes?: string[] | null;
};

export type P8DynamicFormStatisticMetricPayload = {
  metricKey?: string | null;
  dataType?: string | null;
  aggregateOps?: string[] | null;
};

export type P8DynamicFormMetricLabelTargetPayload = {
  metricKey?: string | null;
  statisticLabelCode?: string | null;
};

export type P8DynamicFormStatisticTablePayload = {
  blockId?: string | null;
  tableMode?: string | null;
  statisticsDisabled?: boolean | null;
  metrics?: P8DynamicFormStatisticMetricPayload[] | null;
  metricLabelTargets?: P8DynamicFormMetricLabelTargetPayload[] | null;
  allowedRowLabelCodes?: string[] | null;
};

export type P8DynamicFormStatisticsMutationPayload =
  | { fields: P8DynamicFormStatisticFieldPayload[]; tables?: never }
  | { fields?: never; tables: P8DynamicFormStatisticTablePayload[] };

export type P8DynamicFormStatisticLabelSnapshot = {
  labelId: string;
  code: string;
  dataType: string;
  usage: string;
  scopeType: string;
  scopeId?: string | null;
  isActive: boolean;
  versionNo: number;
  versionId: string;
  configHash: string;
};

export type P8DynamicFormStatisticFieldConfig = {
  fieldId: string;
  fieldType: string;
  isStatistic: boolean;
  statistic?: P8DynamicFormStatisticSettingsPayload | null;
  statisticLabelCodes: string[];
  labelSnapshots: P8DynamicFormStatisticLabelSnapshot[];
  structureHash: string;
};

export type P8DynamicFormStatisticTableMetricConfig = {
  metricKey: string;
  dataType: string;
  aggregateOps: string[];
};

export type P8DynamicFormMetricLabelTargetConfig = {
  metricKey: string;
  statisticLabelCode: string;
  dataType: string;
  labelSnapshot: P8DynamicFormStatisticLabelSnapshot;
};

export type P8DynamicFormStatisticTableConfig = {
  blockId: string;
  tableMode: string;
  statisticsDisabled: boolean;
  statisticsInputCellCount?: number | null;
  statisticsInputCellLimit?: number | null;
  statisticsDisabledReason?: string | null;
  rowLabelDataType: string;
  metrics: P8DynamicFormStatisticTableMetricConfig[];
  metricLabelTargets: P8DynamicFormMetricLabelTargetConfig[];
  allowedRowLabelCodes: string[];
  rowLabelSnapshots: P8DynamicFormStatisticLabelSnapshot[];
  structureHash: string;
  schemaSource: string;
};

export type P8DynamicFormStatisticsVersion = {
  versionId: string;
  previousVersionId?: string | null;
  versionNo: number;
  revision: number;
  status: P8StatConfigStatus | string;
  configHash: string;
  dependencyPins: string[];
  fields: P8DynamicFormStatisticFieldConfig[];
  tableConfig: P8DynamicFormStatisticTableConfig[];
  fieldSectionHash: string;
  tableSectionHash: string;
  createdAtUtc: string;
};

export type P8DynamicFormStatisticsReadback = P8StatConfigIdentity & {
  permissions: P8StatConfigPermissionSet;
  fields: P8DynamicFormStatisticFieldConfig[];
  tableConfig: P8DynamicFormStatisticTableConfig[];
  fieldSectionHash: string;
  tableSectionHash: string;
  versions: P8DynamicFormStatisticsVersion[];
  receiptId?: string | null;
};

export type P8BasicSummaryPeriodRulePayload = {
  mode?: string | null;
  periodKey?: string | null;
  periodKeyFrom?: string | null;
  periodKeyTo?: string | null;
};

export type P8BasicSummaryDetailHintsPayload = {
  includeSourceRows?: boolean | null;
  maxTextChars?: number | null;
};

export type P8BasicSummaryTargetPayload = {
  conceptKind?: string | null;
  conceptKey?: string | null;
  dataType?: string | null;
  operation?: string | null;
};

export type P8BasicSummaryConfigPayload = {
  sourceScope?: P8StatConfigSourceScopePayload | null;
  periodRule?: P8BasicSummaryPeriodRulePayload | null;
  groupingHints?: string[] | null;
  detailHints?: P8BasicSummaryDetailHintsPayload | null;
  targets?: P8BasicSummaryTargetPayload[] | null;
};

export type P8BasicSummaryConfigVersion = {
  versionId: string;
  previousVersionId?: string | null;
  versionNo: number;
  revision: number;
  status: P8StatConfigStatus | string;
  configHash: string;
  dependencyPins: string[];
  payload: P8BasicSummaryConfigPayload;
  createdAtUtc: string;
  lockedAtUtc?: string | null;
};

export type P8BasicSummaryConfigReadback = {
  identity: P8StatConfigIdentity;
  payload: P8BasicSummaryConfigPayload;
  permissions: P8StatConfigPermissionSet;
  runtimeEligibility: string;
  isVirtualEmpty: boolean;
  previousVersionId?: string | null;
  meanContract: { formula: string; metadataOnly: boolean };
  versions: P8BasicSummaryConfigVersion[];
  receiptId?: string | null;
};

export type P8BasicSummaryConfigVersionsResult = {
  items: P8BasicSummaryConfigVersion[];
};

export type P8AdvancedSummaryTargetPayload = {
  fieldId?: string | null;
  dataType?: string | null;
  operation?: string | null;
};

export type P8AdvancedSummarySectionPayload = {
  sectionId?: string | null;
  isCumulative?: boolean | null;
  targets?: P8AdvancedSummaryTargetPayload[] | null;
};

export type P8AdvancedSummaryOrderingPayload = {
  fieldId?: string | null;
  direction?: string | null;
};

export type P8AdvancedSummaryConfigPayload = {
  sourceScope?: P8StatConfigSourceScopePayload | null;
  sections?: P8AdvancedSummarySectionPayload[] | null;
  hierarchyGrains?: string[] | null;
  grouping?: string[] | null;
  ordering?: P8AdvancedSummaryOrderingPayload[] | null;
  description?: string | null;
};

export type P8AdvancedSummaryValidationReceipt = {
  receiptId: string;
  contractVersion: string;
  validationMode: string;
  ownerId: string;
  configId: string;
  versionId: string;
  versionNo: number;
  revision: number;
  configHash: string;
  dependencyPins: string[];
  sectionId: string;
  sourceScopeMode: string;
  isCumulative: boolean;
  targetCount: number;
  targetLimit: number;
  hierarchyGrains: string[];
  hierarchyDepth: number;
  maxHierarchyDepth: number;
  canonicalPayloadBytes: number;
  maxCanonicalPayloadBytes: number;
  runtimeEligibility: string;
  previewRead: boolean;
  previewWrite: boolean;
  hierarchyRead: boolean;
  hierarchyWrite: boolean;
};

export type P8AdvancedSummaryConfigVersion = {
  identity: P8StatConfigIdentity;
  payload: P8AdvancedSummaryConfigPayload;
  previousVersionId?: string | null;
  validationReceipt?: P8AdvancedSummaryValidationReceipt | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  lockedAtUtc?: string | null;
  lockedByUserId?: string | null;
  archivedAtUtc?: string | null;
  archivedByUserId?: string | null;
};

export type P8AdvancedSummaryConfigReadback = {
  identity: P8StatConfigIdentity;
  payload: P8AdvancedSummaryConfigPayload;
  permissions: P8StatConfigPermissionSet;
  runtimeEligibility: string;
  isVirtualEmpty: boolean;
  previousVersionId?: string | null;
  versions: P8AdvancedSummaryConfigVersion[];
  validationReceipt?: P8AdvancedSummaryValidationReceipt | null;
  commandReceiptId?: string | null;
};

export type P8AdvancedSummaryConfigVersionsResult = {
  ownerKind: string;
  ownerId: string;
  configId: string;
  versions: P8AdvancedSummaryConfigVersion[];
};

export type P8DiffSelectorPayload = {
  conceptKind?: string | null;
  conceptKey?: string | null;
  conceptCode?: string | null;
  dataType?: string | null;
};

export type P8DiffPeriodPayload = {
  mode?: string | null;
  periodKey?: string | null;
  periodKeyFrom?: string | null;
  periodKeyTo?: string | null;
};

export type P8DiffSidePayload = {
  selector?: P8DiffSelectorPayload | null;
  period?: P8DiffPeriodPayload | null;
  sourceScope?: P8StatConfigSourceScopePayload | null;
};

export type P8DiffConfigPayload = {
  name?: string | null;
  left?: P8DiffSidePayload | null;
  right?: P8DiffSidePayload | null;
  direction?: string | null;
  missingPolicy?: string | null;
  emptyPolicy?: string | null;
};

export type P8DiffConfigVersion = {
  identity: P8StatConfigIdentity;
  payload: P8DiffConfigPayload;
  previousVersionId?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  lockedAtUtc?: string | null;
  lockedByUserId?: string | null;
};

export type P8DiffConfigReadback = {
  identity: P8StatConfigIdentity;
  payload: P8DiffConfigPayload;
  permissions: P8StatConfigPermissionSet;
  runtimeEligibility: string;
  isVirtualEmpty: boolean;
  previousVersionId?: string | null;
  versions: P8DiffConfigVersion[];
  receiptId?: string | null;
};

export type P8DiffConfigVersionsResult = {
  ownerKind: string;
  ownerId: string;
  configId: string;
  items: P8DiffConfigVersion[];
};

export type P8StatConfigValidationEnqueuePayload = {
  configId?: string | null;
  versionId?: string | null;
  versionNo?: number | null;
};

export type P8StatConfigValidationJobStatus = {
  jobId: string;
  correlationId: string;
  ownerKind: string;
  ownerId: string;
  configId: string;
  versionId: string;
  versionNo: number;
  configRevision: number;
  configHash: string;
  bundleHash: string;
  status: "QUEUED" | "RUNNING" | "RETRYING" | "DONE" | "FAILED" | "CANCELLED" | "RESET" | string;
  retryCount: number;
  maxRetryCount: number;
  safeCode?: string | null;
  safeMessage?: string | null;
  nextRetryAtUtc?: string | null;
  lastRunAtUtc?: string | null;
  completedAtUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type P8StatConfigValidationJobDiagnostics = {
  safeStatus: P8StatConfigValidationJobStatus;
  stateRevision: number;
  stateHash: string;
  dependencyPinsHash: string;
  requestedByUserId: string;
  leaseActive: boolean;
  leaseUntilUtc?: string | null;
  lastHeartbeatAtUtc?: string | null;
  failedAtUtc?: string | null;
  resetAtUtc?: string | null;
  resetByUserId?: string | null;
  resetCount: number;
  diagnosticCode?: string | null;
  diagnosticMessage?: string | null;
  failureFingerprint?: string | null;
  expiresAtUtc?: string | null;
};

export type P8StatConfigReadinessAdminSearchRequest = {
  status?: string;
  ownerKind?: string;
  ownerId?: string;
  configId?: string;
  correlationId?: string;
  q?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
};

export type P8StatConfigValidationProcessResponse = {
  claimed: number;
  completed: number;
  retrying: number;
  failed: number;
  jobs: P8StatConfigValidationJobStatus[];
};

export type P8StatConfigValidationCleanupPayload = {
  completedBeforeUtc?: string | null;
  limit?: number;
  dryRun?: boolean;
};

export type P8StatConfigValidationCleanupResponse = {
  ok: boolean;
  dryRun: boolean;
  commandId: string;
  limit: number;
  matchedCount: number;
  selectedCount: number;
  deletedCount: number;
  hasMore: boolean;
  jobIds: string[];
};

export type P8StatConfigIndexDefinition = {
  collection: string;
  name: string;
  keyJson: string;
  unique: boolean;
  partialFilterJson?: string | null;
  expireAfterSeconds?: number | null;
  isExact: boolean;
};

export type P8StatConfigIndexReadiness = {
  ready: boolean;
  contractHash: string;
  checkedAtUtc: string;
  indexes: P8StatConfigIndexDefinition[];
};

export type P8StatConfigBundleDependencyReference = {
  kind?: string | null;
  ownerId?: string | null;
  configId?: string | null;
  versionId?: string | null;
  versionNo?: number | null;
  revision?: number | null;
  configHash?: string | null;
  contributionHash?: string | null;
};

export type P8StatConfigBundleReadRequest = {
  ownerKind?: string | null;
  ownerId?: string | null;
  dependencyPins?: P8StatConfigBundleDependencyReference[] | null;
};

export type P8StatConfigBundleValidateRequest = {
  commandId?: string | null;
  expectedBundleHash?: string | null;
  bundle?: P8StatConfigBundleReadRequest | null;
};

export type P8StatConfigBundleDependencyPin = {
  kind: string;
  ownerKind: string;
  ownerId: string;
  configId: string;
  versionId: string;
  versionNo: number;
  revision: number;
  status: P8StatConfigStatus | string;
  configHash: string;
  contributionHash: string;
  dependencyPins: string[];
};

export type P8StatConfigBundleReadback = {
  schemaVersion: string;
  ownerKind: string;
  ownerId: string;
  isEmpty: boolean;
  pins: P8StatConfigBundleDependencyPin[];
  eligibility: {
    configuration: string;
    futureResult: string;
    executor: string;
    targetPhase: string;
  };
  freshness: string;
  canonicalJson: string;
  bundleHash: string;
};

type AssignmentTemplateRoute = {
  assignmentId: string;
  dynamicFormTemplateId: string;
};

type AdvancedRoute = AssignmentTemplateRoute & { sectionId: string };
type VersionRoute<TRoute> = TRoute & { versionNo: number };
type MutationRoute<TRoute, TPayload> = TRoute & {
  body: P8StatConfigMutationEnvelope<TPayload>;
};

const segment = (value: string) => encodeURIComponent(value);

const cleanParams = <T extends Record<string, unknown>>(params: T) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  );

const assignmentTemplatePath = (
  prefix: string,
  route: AssignmentTemplateRoute,
) => `${prefix}/assignments/${segment(route.assignmentId)}/templates/${segment(route.dynamicFormTemplateId)}`;

const advancedPath = (route: AdvancedRoute) =>
  `${assignmentTemplatePath("/work-assignment-advanced-summary", route)}/sections/${segment(route.sectionId)}`;

export const statConfigApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getP8DynamicFormStatistics: build.query<P8DynamicFormStatisticsReadback, { id: string }>({
      query: ({ id }) => ({
        url: `/dynamic-forms/${segment(id)}/statistics`,
        method: "GET",
      }),
      providesTags: (_result, _error, { id }) => [
        { type: "DynamicForm" as const, id: `P8_STATS:${id}` },
      ],
    }),
    putP8DynamicFormStatistics: build.mutation<
      P8DynamicFormStatisticsReadback,
      MutationRoute<{ id: string }, P8DynamicFormStatisticsMutationPayload>
    >({
      query: ({ id, body }) => ({
        url: `/dynamic-forms/${segment(id)}/statistics`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: (result, _error, { id }) => result
        ? [
            { type: "DynamicForm" as const, id: `P8_STATS:${id}` },
            { type: "DynamicForm" as const, id },
          ]
        : [],
    }),

    getP8BasicSummaryConfig: build.query<P8BasicSummaryConfigReadback, AssignmentTemplateRoute>({
      query: (route) => ({
        url: `${assignmentTemplatePath("/work-assignment-basic-summary", route)}/config`,
        method: "GET",
      }),
      providesTags: (_result, _error, route) => [
        { type: "WorkAssignment" as const, id: `P8_BASIC:${route.assignmentId}:${route.dynamicFormTemplateId}` },
      ],
    }),
    listP8BasicSummaryConfigVersions: build.query<P8BasicSummaryConfigVersionsResult, AssignmentTemplateRoute>({
      query: (route) => ({
        url: `${assignmentTemplatePath("/work-assignment-basic-summary", route)}/config/versions`,
        method: "GET",
      }),
    }),
    getP8BasicSummaryConfigVersion: build.query<
      P8BasicSummaryConfigReadback,
      VersionRoute<AssignmentTemplateRoute>
    >({
      query: (route) => ({
        url: `${assignmentTemplatePath("/work-assignment-basic-summary", route)}/config/versions/${route.versionNo}`,
        method: "GET",
      }),
    }),
    putP8BasicSummaryConfig: build.mutation<
      P8BasicSummaryConfigReadback,
      MutationRoute<AssignmentTemplateRoute, P8BasicSummaryConfigPayload>
    >({
      query: ({ body, ...route }) => ({
        url: `${assignmentTemplatePath("/work-assignment-basic-summary", route)}/config`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (result, _error, route) => result
        ? [{ type: "WorkAssignment" as const, id: `P8_BASIC:${route.assignmentId}:${route.dynamicFormTemplateId}` }]
        : [],
    }),
    lockP8BasicSummaryConfig: build.mutation<
      P8BasicSummaryConfigReadback,
      MutationRoute<AssignmentTemplateRoute, P8StatConfigEmptyCommandPayload>
    >({
      query: ({ body, ...route }) => ({
        url: `${assignmentTemplatePath("/work-assignment-basic-summary", route)}/config/lock`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result, _error, route) => result
        ? [{ type: "WorkAssignment" as const, id: `P8_BASIC:${route.assignmentId}:${route.dynamicFormTemplateId}` }]
        : [],
    }),
    createNextP8BasicSummaryDraft: build.mutation<
      P8BasicSummaryConfigReadback,
      MutationRoute<AssignmentTemplateRoute, P8StatConfigEmptyCommandPayload>
    >({
      query: ({ body, ...route }) => ({
        url: `${assignmentTemplatePath("/work-assignment-basic-summary", route)}/config/next-draft`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result, _error, route) => result
        ? [{ type: "WorkAssignment" as const, id: `P8_BASIC:${route.assignmentId}:${route.dynamicFormTemplateId}` }]
        : [],
    }),

    getP8AdvancedSummaryConfig: build.query<P8AdvancedSummaryConfigReadback, AdvancedRoute>({
      query: (route) => ({ url: `${advancedPath(route)}/config`, method: "GET" }),
      providesTags: (_result, _error, route) => [
        { type: "AdvancedSummaryConfig" as const, id: `P8_ADV:${route.assignmentId}:${route.dynamicFormTemplateId}:${route.sectionId}` },
      ],
    }),
    listP8AdvancedSummaryConfigVersions: build.query<
      P8AdvancedSummaryConfigVersionsResult,
      AdvancedRoute
    >({
      query: (route) => ({ url: `${advancedPath(route)}/config/versions`, method: "GET" }),
    }),
    getP8AdvancedSummaryConfigVersion: build.query<
      P8AdvancedSummaryConfigVersion,
      VersionRoute<AdvancedRoute>
    >({
      query: (route) => ({
        url: `${advancedPath(route)}/config/versions/${route.versionNo}`,
        method: "GET",
      }),
    }),
    putP8AdvancedSummaryConfig: build.mutation<
      P8AdvancedSummaryConfigReadback,
      MutationRoute<AdvancedRoute, P8AdvancedSummaryConfigPayload>
    >({
      query: ({ body, ...route }) => ({ url: `${advancedPath(route)}/config`, method: "PUT", data: body }),
      invalidatesTags: (result, _error, route) => result
        ? [{ type: "AdvancedSummaryConfig" as const, id: `P8_ADV:${route.assignmentId}:${route.dynamicFormTemplateId}:${route.sectionId}` }]
        : [],
    }),
    lockP8AdvancedSummaryConfig: build.mutation<
      P8AdvancedSummaryConfigReadback,
      MutationRoute<AdvancedRoute, P8StatConfigEmptyCommandPayload>
    >({
      query: ({ body, ...route }) => ({ url: `${advancedPath(route)}/config/lock`, method: "POST", data: body }),
      invalidatesTags: (result, _error, route) => result
        ? [{ type: "AdvancedSummaryConfig" as const, id: `P8_ADV:${route.assignmentId}:${route.dynamicFormTemplateId}:${route.sectionId}` }]
        : [],
    }),
    createNextP8AdvancedSummaryDraft: build.mutation<
      P8AdvancedSummaryConfigReadback,
      MutationRoute<AdvancedRoute, P8StatConfigEmptyCommandPayload>
    >({
      query: ({ body, ...route }) => ({ url: `${advancedPath(route)}/config/next-draft`, method: "POST", data: body }),
      invalidatesTags: (result, _error, route) => result
        ? [{ type: "AdvancedSummaryConfig" as const, id: `P8_ADV:${route.assignmentId}:${route.dynamicFormTemplateId}:${route.sectionId}` }]
        : [],
    }),
    archiveP8AdvancedSummaryConfig: build.mutation<
      P8AdvancedSummaryConfigReadback,
      MutationRoute<AdvancedRoute, P8StatConfigEmptyCommandPayload>
    >({
      query: ({ body, ...route }) => ({ url: `${advancedPath(route)}/config/archive`, method: "POST", data: body }),
      invalidatesTags: (result, _error, route) => result
        ? [{ type: "AdvancedSummaryConfig" as const, id: `P8_ADV:${route.assignmentId}:${route.dynamicFormTemplateId}:${route.sectionId}` }]
        : [],
    }),

    getP8DiffConfig: build.query<P8DiffConfigReadback, AssignmentTemplateRoute>({
      query: (route) => ({
        url: `${assignmentTemplatePath("/work-report-statistic-diffs", route)}/config`,
        method: "GET",
      }),
      providesTags: (_result, _error, route) => [
        { type: "StatisticDiffConfig" as const, id: `P8_DIFF:${route.assignmentId}:${route.dynamicFormTemplateId}` },
      ],
    }),
    listP8DiffConfigVersions: build.query<P8DiffConfigVersionsResult, AssignmentTemplateRoute>({
      query: (route) => ({
        url: `${assignmentTemplatePath("/work-report-statistic-diffs", route)}/config/versions`,
        method: "GET",
      }),
    }),
    getP8DiffConfigVersion: build.query<P8DiffConfigReadback, VersionRoute<AssignmentTemplateRoute>>({
      query: (route) => ({
        url: `${assignmentTemplatePath("/work-report-statistic-diffs", route)}/config/versions/${route.versionNo}`,
        method: "GET",
      }),
    }),
    putP8DiffConfig: build.mutation<
      P8DiffConfigReadback,
      MutationRoute<AssignmentTemplateRoute, P8DiffConfigPayload>
    >({
      query: ({ body, ...route }) => ({
        url: `${assignmentTemplatePath("/work-report-statistic-diffs", route)}/config`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (result, _error, route) => result
        ? [{ type: "StatisticDiffConfig" as const, id: `P8_DIFF:${route.assignmentId}:${route.dynamicFormTemplateId}` }]
        : [],
    }),
    lockP8DiffConfig: build.mutation<
      P8DiffConfigReadback,
      MutationRoute<AssignmentTemplateRoute, P8StatConfigEmptyCommandPayload>
    >({
      query: ({ body, ...route }) => ({
        url: `${assignmentTemplatePath("/work-report-statistic-diffs", route)}/config/lock`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result, _error, route) => result
        ? [{ type: "StatisticDiffConfig" as const, id: `P8_DIFF:${route.assignmentId}:${route.dynamicFormTemplateId}` }]
        : [],
    }),
    createNextP8DiffDraft: build.mutation<
      P8DiffConfigReadback,
      MutationRoute<AssignmentTemplateRoute, P8StatConfigEmptyCommandPayload>
    >({
      query: ({ body, ...route }) => ({
        url: `${assignmentTemplatePath("/work-report-statistic-diffs", route)}/config/next-draft`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result, _error, route) => result
        ? [{ type: "StatisticDiffConfig" as const, id: `P8_DIFF:${route.assignmentId}:${route.dynamicFormTemplateId}` }]
        : [],
    }),

    enqueueStatConfigReadiness: build.mutation<
      P8StatConfigValidationJobStatus,
      MutationRoute<{ ownerKind: string; ownerId: string }, P8StatConfigValidationEnqueuePayload>
    >({
      query: ({ ownerKind, ownerId, body }) => ({
        url: `/stat-config/owners/${segment(ownerKind)}/${segment(ownerId)}/readiness-jobs`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result) => result
        ? [
            { type: "JobRun" as const, id: "P8_READINESS" },
            { type: "JobRun" as const, id: `P8_READINESS:${result.jobId}` },
          ]
        : [],
    }),
    getStatConfigReadiness: build.query<P8StatConfigValidationJobStatus, { jobId: string }>({
      query: ({ jobId }) => ({ url: `/stat-config/readiness/jobs/${segment(jobId)}`, method: "GET" }),
      providesTags: (_result, _error, { jobId }) => [
        { type: "JobRun" as const, id: `P8_READINESS:${jobId}` },
      ],
    }),
    searchStatConfigReadinessAdmin: build.query<
      PagedResult<P8StatConfigValidationJobDiagnostics>,
      P8StatConfigReadinessAdminSearchRequest | void
    >({
      query: (request) => ({
        url: "/admin/operations/job-runs/stat-config-readiness-jobs",
        method: "GET",
        params: cleanParams({ ...(request ?? {}) }),
      }),
      providesTags: [{ type: "JobRun" as const, id: "P8_READINESS" }],
    }),
    getStatConfigReadinessAdmin: build.query<P8StatConfigValidationJobDiagnostics, { jobId: string }>({
      query: ({ jobId }) => ({
        url: `/admin/operations/job-runs/stat-config-readiness-jobs/${segment(jobId)}`,
        method: "GET",
      }),
      providesTags: (_result, _error, { jobId }) => [
        { type: "JobRun" as const, id: `P8_READINESS:${jobId}` },
      ],
    }),
    processStatConfigReadinessAdmin: build.mutation<P8StatConfigValidationProcessResponse, { maxJobs?: number } | void>({
      query: (request) => ({
        url: "/admin/operations/job-runs/stat-config-readiness-jobs/process",
        method: "POST",
        params: { maxJobs: request?.maxJobs ?? 10 },
      }),
      invalidatesTags: (result) => result
        ? [{ type: "JobRun" as const, id: "P8_READINESS" }]
        : [],
    }),
    resetStatConfigReadinessAdmin: build.mutation<
      P8StatConfigValidationJobStatus,
      MutationRoute<{ jobId: string }, { reason?: string | null }>
    >({
      query: ({ jobId, body }) => ({
        url: `/admin/operations/job-runs/stat-config-readiness-jobs/${segment(jobId)}/reset`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result, _error, { jobId }) => result
        ? [
            { type: "JobRun" as const, id: "P8_READINESS" },
            { type: "JobRun" as const, id: `P8_READINESS:${jobId}` },
          ]
        : [],
    }),
    cancelStatConfigReadinessAdmin: build.mutation<
      P8StatConfigValidationJobStatus,
      MutationRoute<{ jobId: string }, { reason?: string | null }>
    >({
      query: ({ jobId, body }) => ({
        url: `/admin/operations/job-runs/stat-config-readiness-jobs/${segment(jobId)}/cancel`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result, _error, { jobId }) => result
        ? [
            { type: "JobRun" as const, id: "P8_READINESS" },
            { type: "JobRun" as const, id: `P8_READINESS:${jobId}` },
          ]
        : [],
    }),
    cleanupStatConfigReadinessAdmin: build.mutation<
      P8StatConfigValidationCleanupResponse,
      P8StatConfigMutationEnvelope<P8StatConfigValidationCleanupPayload>
    >({
      query: (body) => ({
        url: "/admin/operations/job-runs/stat-config-readiness-jobs/cleanup",
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result) => result
        ? [{ type: "JobRun" as const, id: "P8_READINESS" }]
        : [],
    }),
    getStatConfigReadinessIndexes: build.query<P8StatConfigIndexReadiness, void>({
      query: () => ({
        url: "/admin/operations/job-runs/stat-config-readiness-jobs/indexes",
        method: "GET",
      }),
    }),

    getEmptyStatConfigBundle: build.query<P8StatConfigBundleReadback, { ownerKind: string; ownerId: string }>({
      query: ({ ownerKind, ownerId }) => ({
        url: "/stat-config/bundle",
        method: "GET",
        params: { ownerKind, ownerId },
      }),
    }),
    readStatConfigBundle: build.mutation<P8StatConfigBundleReadback, P8StatConfigBundleReadRequest>({
      query: (body) => ({ url: "/stat-config/bundle/readback", method: "POST", data: body }),
    }),
    validateStatConfigBundle: build.mutation<P8StatConfigBundleReadback, P8StatConfigBundleValidateRequest>({
      query: (body) => ({ url: "/stat-config/bundle/validate", method: "POST", data: body }),
    }),
  }),
});

export const {
  useGetP8DynamicFormStatisticsQuery,
  usePutP8DynamicFormStatisticsMutation,
  useGetP8BasicSummaryConfigQuery,
  useListP8BasicSummaryConfigVersionsQuery,
  useGetP8BasicSummaryConfigVersionQuery,
  usePutP8BasicSummaryConfigMutation,
  useLockP8BasicSummaryConfigMutation,
  useCreateNextP8BasicSummaryDraftMutation,
  useGetP8AdvancedSummaryConfigQuery,
  useListP8AdvancedSummaryConfigVersionsQuery,
  useGetP8AdvancedSummaryConfigVersionQuery,
  usePutP8AdvancedSummaryConfigMutation,
  useLockP8AdvancedSummaryConfigMutation,
  useCreateNextP8AdvancedSummaryDraftMutation,
  useArchiveP8AdvancedSummaryConfigMutation,
  useGetP8DiffConfigQuery,
  useListP8DiffConfigVersionsQuery,
  useGetP8DiffConfigVersionQuery,
  usePutP8DiffConfigMutation,
  useLockP8DiffConfigMutation,
  useCreateNextP8DiffDraftMutation,
  useEnqueueStatConfigReadinessMutation,
  useGetStatConfigReadinessQuery,
  useSearchStatConfigReadinessAdminQuery,
  useGetStatConfigReadinessAdminQuery,
  useProcessStatConfigReadinessAdminMutation,
  useResetStatConfigReadinessAdminMutation,
  useCancelStatConfigReadinessAdminMutation,
  useCleanupStatConfigReadinessAdminMutation,
  useGetStatConfigReadinessIndexesQuery,
  useGetEmptyStatConfigBundleQuery,
  useReadStatConfigBundleMutation,
  useValidateStatConfigBundleMutation,
} = statConfigApi;
