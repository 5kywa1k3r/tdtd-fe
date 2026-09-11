import { baseApi } from "./base/baseApi";

export const DYNAMIC_FLOW_RUNTIME_ELIGIBILITIES = [
  "ELIGIBLE_CANDIDATE",
  "BLOCKED_CATALOG",
  "BLOCKED_PHASE",
] as const;

export type DynamicFlowRuntimeEligibility =
  (typeof DYNAMIC_FLOW_RUNTIME_ELIGIBILITIES)[number];

export const DYNAMIC_FLOW_RUNTIME_CONFIRM_STATUSES = [
  "BLOCKED_UNTIL_TARGET_PHASE",
  "PENDING_MATERIALIZATION_NOT_READY",
  "MATERIALIZING",
  "RECOVERY_REQUIRED",
  "FAILED",
  "SUCCEEDED",
] as const;

export type DynamicFlowRuntimeConfirmStatus =
  (typeof DYNAMIC_FLOW_RUNTIME_CONFIRM_STATUSES)[number];

export const DYNAMIC_FLOW_RUNTIME_INSTANCE_STATES = [
  "PENDING",
  "MATERIALIZING",
  "ACTIVE",
  "PARTIAL",
  "RETRYING",
  "RECONCILED",
  "COMPLETED",
  "FINALIZED",
  "FAILED",
  "TERMINATED",
] as const;

export type DynamicFlowRuntimeInstanceState =
  (typeof DYNAMIC_FLOW_RUNTIME_INSTANCE_STATES)[number];

export const DYNAMIC_FLOW_RUNTIME_STEP_STATES = [
  "PENDING",
  "MATERIALIZING",
  "ASSIGNED",
  "IN_PROGRESS",
  "SUBMITTED",
  "RETURNED",
  "APPROVED",
  "COMPLETED",
  "WAITING_CHILD",
  "CANCELLED_BY_GATEWAY",
  "PARTIAL",
  "RETRYING",
  "RECONCILED",
  "FAILED",
  "TERMINATED",
] as const;

export type DynamicFlowRuntimeStepState =
  (typeof DYNAMIC_FLOW_RUNTIME_STEP_STATES)[number];

export const DYNAMIC_FLOW_RUNTIME_RECONCILE_STATUSES = [
  "IDLE",
  "RUNNING",
  "RECONCILED",
] as const;

export type DynamicFlowRuntimeReconcileStatus =
  (typeof DYNAMIC_FLOW_RUNTIME_RECONCILE_STATUSES)[number];

export const DYNAMIC_FLOW_RUNTIME_NEXT_ACTIONS = [
  "NONE",
  "WAIT_FOR_RECONCILE",
  "WAIT_FOR_RETRY",
  "REFRESH",
  "CONTACT_SYSTEM_ADMIN",
] as const;

export type DynamicFlowRuntimeNextAction =
  (typeof DYNAMIC_FLOW_RUNTIME_NEXT_ACTIONS)[number];

export type DynamicFlowRuntimeTargetPhase = "P5" | "P6";
export type DynamicFlowRuntimeWorkType = "TASK" | "INDICATOR";
export type DynamicFlowRuntimeRecoveryState =
  | DynamicFlowRuntimeInstanceState
  | DynamicFlowRuntimeStepState;

export type DynamicFlowRuntimeArchetypeId =
  | "FLOW-T01"
  | "FLOW-T02"
  | "FLOW-T03"
  | "FLOW-T04"
  | "FLOW-T05"
  | "FLOW-T06"
  | "FLOW-T07"
  | "FLOW-T08"
  | "FLOW-T09"
  | "FLOW-T10"
  | "FLOW-T11"
  | "FLOW-T12";

export type DynamicFlowPreflightRequest = {
  flowTemplateVersionId: string;
  commandId: string;
  targetUnitIds: string[];
  periodKey: string;
  scheduleIdentityJson: string;
};

export type DynamicFlowConfirmRequest = DynamicFlowPreflightRequest & {
  snapshotToken: string;
};

export type DynamicFlowRuntimeExactPin = {
  flowTemplateId: string;
  flowTemplateVersionId: string;
  flowTemplateVersionNo: number;
  payloadHash: string;
  catalogVersion: string;
  catalogSemanticHash: string;
  archetypeId: DynamicFlowRuntimeArchetypeId;
  definitionRevision: string;
  topologyHash: string;
};

export type DynamicFlowRuntimeEntryStep = {
  stepId: string;
  stepCode: string;
  stepOrder: number;
  formNodeId: string;
  nextStepIds: string[];
  isTerminalNode: boolean;
};

export type DynamicFlowRuntimeFormPin = {
  formNodeId: string;
  dynamicFormTemplateId: string;
  dynamicFormFamilyId: string;
  dynamicFormVersionNo: number;
  dynamicFormSchemaHash: string;
  dynamicFormSnapshotHash: string;
};

export type DynamicFlowRuntimeParticipantSnapshot = {
  userId: string;
  username: string;
  fullName: string;
  unitId: string;
  unitSymbol: string | null;
  unitShortName: string | null;
  unitName: string | null;
  positionCode: string | null;
  positionName: string | null;
};

export type DynamicFlowRuntimeTargetSnapshot = {
  targetUnitId: string;
  assigneeUserIds: string[];
  participants: DynamicFlowRuntimeParticipantSnapshot[];
};

export type DynamicFlowPreflightResponse = {
  workId: string;
  workType: DynamicFlowRuntimeWorkType;
  commandId: string;
  issuerUserId: string;
  issuerUnitId: string;
  commandIdentityHash: string;
  requestHash: string;
  snapshotToken: string;
  eligibility: DynamicFlowRuntimeEligibility;
  blockedUntilPhase: DynamicFlowRuntimeTargetPhase | null;
  flowPin: DynamicFlowRuntimeExactPin;
  entryStep: DynamicFlowRuntimeEntryStep;
  formPins: DynamicFlowRuntimeFormPin[];
  targets: DynamicFlowRuntimeTargetSnapshot[];
  targetTotal: number;
  targetLimit: number;
  targetHasMore: boolean;
  targetNextCursor: string | null;
  periodKey: string;
  scheduleIdentityJson: string;
  scheduleIdentityHash: string;
};

export type DynamicFlowConfirmResponse = {
  commandId: string;
  requestHash: string;
  snapshotToken: string;
  status: DynamicFlowRuntimeConfirmStatus;
  businessWritePerformed: boolean;
  flowInstanceId: string | null;
  instanceState: DynamicFlowRuntimeInstanceState | null;
  stepInstanceIds: string[];
  assignmentIds: string[];
};

export type DynamicFlowForwardRequest = {
  commandId: string;
  expectedInstanceRevision: number;
  expectedStepRevision: number;
};

export type DynamicFlowForwardResponse = {
  commandId: string;
  status: "ACCEPTED_PENDING_MATERIALIZATION";
  businessWritePerformed: boolean;
  replayed: boolean;
  flowInstanceId: string;
  executionEpoch: number;
  instanceRevision: number;
  stepInstanceId: string;
  nextStepInstanceId: string;
  nextAssignmentId: string;
  activatedTransitionId: string;
  gatewayInstanceId: string | null;
  activatedBranches: DynamicFlowActivatedBranch[];
  eventId: string;
  inputSnapshotHash?: string | null;
  evaluatorVersion?: string | null;
  selectedEdgeId?: string | null;
  decisionReasonCode?: string | null;
};

export type DynamicFlowActivatedBranch = {
  stepInstanceId: string;
  assignmentId: string;
  branchId: string;
  parentBranchId: string;
  gatewayInstanceId: string;
  gatewayVersion: number;
  contributionId: string;
  transitionId: string;
  nodeId: string;
  nodeCode: string;
};

export type DynamicFlowRuntimePage<T> = {
  items: T[];
  total: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type DynamicFlowRuntimeCapabilities = {
  canViewOverview: boolean;
  canViewTimeline: boolean;
  canViewAllBranches: boolean;
  canOpenAssignment: boolean;
  canOpenReport: boolean;
  canSubmitReport: boolean;
  canReviewReport: boolean;
  canRetry: boolean;
  canReconcile: boolean;
  canForward: boolean;
  canLaunchSubflow: boolean;
  canManageSupplemental?: boolean;
  canCancelSupplemental?: boolean;
  canFinalize: boolean;
  canRollback?: boolean;
  canTerminate?: boolean;
  canRestart?: boolean;
  expectedRevision: number;
};

export type DynamicFlowRuntimeRecovery = {
  state: DynamicFlowRuntimeRecoveryState;
  recoveryRequired: boolean;
  statusText: string;
  reasonCode: string;
  nextAction: DynamicFlowRuntimeNextAction;
  attemptCount: number;
  lastAttemptAtUtc: string | null;
  nextAttemptAtUtc: string | null;
  reconcileStatus: DynamicFlowRuntimeReconcileStatus;
  expectedRevision: number;
  revisionToken: string;
  canRetry: boolean;
  canReconcile: boolean;
};

export type DynamicFlowRuntimeInstanceRow = {
  workId: string;
  flowInstanceId: string;
  flowTemplateId: string;
  flowTemplateVersionId: string;
  flowTemplateVersionNo: number;
  archetypeId: DynamicFlowRuntimeArchetypeId;
  definitionRevision: string;
  topologySnapshotHash: string;
  executionEpoch: number;
  finalizedExecutionEpoch?: number | null;
  finalizedAtUtc?: string | null;
  entryFlowStepId: string;
  parentInstanceId: string | null;
  parentStepInstanceId: string | null;
  rootInstanceId: string | null;
  ancestryPath: string[];
  periodKey: string;
  scheduleIdentityHash: string;
  periodicScheduleId?: string | null;
  periodicOccurrenceId?: string | null;
  timeZoneId?: string | null;
  schedulePolicyVersion?: string | null;
  state: DynamicFlowRuntimeInstanceState;
  revision: number;
  runtimeRecoveryEpoch: number;
  revisionToken: string;
  updatedAtUtc: string;
  visibilityScopes: string[];
  capabilities: DynamicFlowRuntimeCapabilities;
  recovery: DynamicFlowRuntimeRecovery;
};

export type DynamicFlowRuntimeInstanceListRow = DynamicFlowRuntimeInstanceRow;

export type DynamicFlowRuntimeInstanceOverview = {
  workId: string;
  flowInstanceId: string;
  flowTemplateId: string;
  flowTemplateVersionId: string;
  flowTemplateVersionNo: number;
  archetypeId: DynamicFlowRuntimeArchetypeId;
  definitionRevision: string;
  topologySnapshotHash: string;
  executionEpoch: number;
  finalizedExecutionEpoch?: number | null;
  finalizedAtUtc?: string | null;
  finalizedByUserId?: string | null;
  finalizedByEventId?: string | null;
  entryFlowStepId: string;
  parentInstanceId: string | null;
  parentStepInstanceId: string | null;
  rootInstanceId: string | null;
  ancestryPath: string[];
  periodKey: string;
  scheduleIdentityHash: string;
  periodicScheduleId?: string | null;
  periodicOccurrenceId?: string | null;
  timeZoneId?: string | null;
  schedulePolicyVersion?: string | null;
  participantSnapshotId: string;
  state: DynamicFlowRuntimeInstanceState;
  revision: number;
  runtimeRecoveryEpoch: number;
  revisionToken: string;
  visibleStepCount: number;
  gateways: DynamicFlowRuntimeGatewayRow[];
  epochs?: DynamicFlowExecutionEpoch[];
  updatedAtUtc: string;
  visibilityScopes: string[];
  capabilities: DynamicFlowRuntimeCapabilities;
  recovery: DynamicFlowRuntimeRecovery;
};

export type DynamicFlowExecutionEpoch = {
  epochId: string;
  executionEpoch: number;
  state: "ACTIVE" | "FINALIZED" | "ROLLED_BACK" | "TERMINATED" | "RESTARTED";
  checkpointNodeId: string;
  isCanonical: boolean;
  openedByCommandId: string;
  closedByCommandId: string | null;
  terminalEventId: string | null;
  replacedByExecutionEpoch: number | null;
  openedAtUtc: string;
  closedAtUtc: string | null;
};

export type DynamicFlowRuntimeGatewayRow = {
  gatewayNodeId: string;
  gatewayInstanceId: string;
  gatewayVersion: number;
  gatewayKind: string;
  state: "COLLECTING" | "SATISFIED" | "IMPOSSIBLE" | string;
  isCanonicalEpoch?: boolean;
  invalidatedByFlowEventId?: string | null;
  invalidatedAtUtc?: string | null;
  revision: number;
  downstreamNodeId: string;
  expectedContributionIds: string[];
  arrivedContributionIds: string[];
  missingContributionIds: string[];
  requiredContributionCount: number;
  cancelledContributionIds: string[];
  lateContributionIds: string[];
  winnerContributionId: string | null;
  inputSnapshotHash?: string | null;
  evaluatorVersion?: string | null;
  selectedEdgeId?: string | null;
  decisionReasonCode?: string | null;
  releasedAtUtc: string | null;
  updatedAtUtc: string;
};

export type DynamicFlowRuntimeStepRow = {
  workId: string;
  flowInstanceId: string;
  flowStepDefinitionId: string;
  flowStepCode: string;
  stepOrder: number;
  executionEpoch: number;
  definitionRevision: string;
  stepInstanceId: string;
  branchId: string;
  parentBranchId: string | null;
  attemptNo: number;
  reviewCycleNo: number;
  maxReviewCycles: number | null;
  previousAttemptStepInstanceId: string | null;
  previousAttemptAssignmentId: string | null;
  supersededByStepInstanceId: string | null;
  isCanonicalAttempt: boolean;
  activatedByTransitionId: string | null;
  gatewayInstanceId: string | null;
  gatewayVersion: number | null;
  contributionId: string | null;
  nextNodeIds: string[];
  isTerminalNode: boolean;
  isCanonicalEpoch?: boolean;
  invalidatedByFlowEventId?: string | null;
  invalidatedAtUtc?: string | null;
  isSupplemental?: boolean;
  supplementalStepId?: string | null;
  requestedByUserId?: string | null;
  completionRequired?: boolean;
  isSupplementalCancelled?: boolean;
  supplementalCancelledAtUtc?: string | null;
  supplementalCancelledByUserId?: string | null;
  supplementalCancelReason?: string | null;
  resultOwnerIdentity: string;
  statisticOwnerIdentity: string;
  targetUnitId: string;
  assignmentId: string | null;
  childInstanceId: string | null;
  childFlowTemplateId: string | null;
  childFlowVersionId: string | null;
  childState: DynamicFlowRuntimeInstanceState | null;
  childOutcomeCode: string | null;
  childLinkedAtUtc: string | null;
  reportId: string | null;
  reportIds: string[];
  submitReportId: string | null;
  reviewReportId: string | null;
  formNodeId: string;
  formFamilyId: string;
  formVersionId: string;
  formVersionNo: number;
  formSchemaHash: string;
  formSnapshotHash: string;
  state: DynamicFlowRuntimeStepState;
  revision: number;
  revisionToken: string;
  updatedAtUtc: string;
  visibilityScopes: string[];
  capabilities: DynamicFlowRuntimeCapabilities;
  recovery: DynamicFlowRuntimeRecovery;
};

export type DynamicFlowSupplementalAddRequest = {
  commandId: string;
  expectedInstanceRevision: number;
  formNodeId: string;
  targetUnitId: string;
  participantUserIds?: string[];
  completionRequired?: boolean;
};

export type DynamicFlowEpochAction =
  | "finalize"
  | "rollback"
  | "terminate"
  | "restart";

export type DynamicFlowEpochCommandRequest = {
  commandId: string;
  expectedExecutionEpoch: number;
  expectedInstanceRevision: number;
  checkpointNodeId?: string | null;
  reason?: string | null;
};

export type DynamicFlowEpochCommandResponse = {
  commandId: string;
  action: "EPOCH_FINALIZE" | "EPOCH_ROLLBACK" | "EPOCH_TERMINATE" | "EPOCH_RESTART";
  flowInstanceId: string;
  previousExecutionEpoch: number;
  executionEpoch: number;
  instanceRevision: number;
  instanceState: DynamicFlowRuntimeInstanceState;
  eventId: string;
  rebuildIntentId: string | null;
  invalidatedStepCount: number;
  invalidatedGatewayCount: number;
  invalidatedAssignmentCount: number;
  invalidatedReportCount: number;
  businessWritePerformed: boolean;
  replayed: boolean;
};

export type DynamicFlowEpochCommandArgs = {
  workId: string;
  instanceId: string;
  action: DynamicFlowEpochAction;
  body: DynamicFlowEpochCommandRequest;
};

export type DynamicFlowSupplementalCancelRequest = {
  commandId: string;
  expectedInstanceRevision: number;
  expectedStepRevision: number;
  reason?: string | null;
};

export type DynamicFlowSupplementalCommandResponse = {
  commandId: string;
  status: "SUPPLEMENTAL_STEP_ADDED" | "SUPPLEMENTAL_STEP_CANCELLED" | string;
  businessWritePerformed: boolean;
  replayed: boolean;
  flowInstanceId: string;
  executionEpoch: number;
  instanceRevision: number;
  supplementalStepId: string;
  stepInstanceId: string;
  assignmentId: string | null;
  completionRequired: boolean;
  state: DynamicFlowRuntimeStepState;
  eventId: string;
};

export type DynamicFlowRuntimeTimelineRow = {
  workId: string;
  flowInstanceId: string;
  eventId: string;
  stepInstanceId: string | null;
  flowStepDefinitionId: string | null;
  executionEpoch: number;
  branchId: string | null;
  gatewayInstanceId: string | null;
  gatewayVersion: number | null;
  contributionId: string | null;
  attemptNo: number | null;
  reviewCycleNo: number | null;
  targetUnitId: string | null;
  assignmentId: string | null;
  reportId: string | null;
  formVersionId: string | null;
  formVersionNo: number | null;
  sequence: number;
  eventType: string;
  commandId: string;
  fromState: string | null;
  toState: string | null;
  fromRevision: number | null;
  toRevision: number | null;
  reasonCode: string | null;
  actorUserId: string;
  affectedRefs: string[];
  occurredAtUtc: string;
};

export type DynamicFlowRuntimeInstanceListQuery = {
  workId: string;
  state?: DynamicFlowRuntimeInstanceState;
  limit?: number;
  cursor?: string | null;
};

export type DynamicFlowRuntimeInstanceQuery = {
  workId: string;
  instanceId: string;
};

export type DynamicFlowRuntimeInstancePageQuery = DynamicFlowRuntimeInstanceQuery & {
  limit?: number;
  cursor?: string | null;
};

export type DynamicFlowRuntimeInboxQuery = {
  state?: DynamicFlowRuntimeStepState;
  limit?: number;
  cursor?: string | null;
};

export type DynamicFlowRuntimePreflightArgs = {
  workId: string;
  body: DynamicFlowPreflightRequest;
  limit?: number;
  cursor?: string | null;
};

export type DynamicFlowRuntimeConfirmArgs = {
  workId: string;
  body: DynamicFlowConfirmRequest;
};

export type DynamicFlowRuntimeForwardArgs = {
  workId: string;
  instanceId: string;
  assignmentId: string;
  body: DynamicFlowForwardRequest;
};

export type DynamicFlowSubflowLaunchRequest = {
  commandId: string;
  expectedParentInstanceRevision: number;
  expectedParentStepRevision: number;
};

export type DynamicFlowSubflowLaunchResponse = {
  commandId: string;
  status: DynamicFlowRuntimeConfirmStatus;
  businessWritePerformed: boolean;
  replayed: boolean;
  parentInstanceId: string;
  parentStepInstanceId: string;
  childInstanceId: string;
  childFlowTemplateId: string;
  childFlowVersionId: string;
  ancestryDepth: number;
  parentState: DynamicFlowRuntimeStepState;
  childState: DynamicFlowRuntimeInstanceState;
  eventId: string;
};

export type DynamicFlowRuntimeSubflowArgs = {
  workId: string;
  parentInstanceId: string;
  parentStepInstanceId: string;
  body: DynamicFlowSubflowLaunchRequest;
};

export type DynamicFlowPeriodicSchedule = {
  scheduleId: string;
  workId: string;
  flowTemplateVersionId: string;
  flowTemplateVersionNo: number;
  scheduleKey: string;
  timeZoneId: string;
  normalizedTimeZoneId: string;
  cadence: "DAILY";
  localTime: string;
  policyVersion: string;
  scheduleIdentityHash: string;
  nextDueAtUtc: string;
  state: "ACTIVE" | "PAUSED";
  revision: number;
};

export type DynamicFlowPeriodicOccurrence = {
  occurrenceId: string;
  scheduleId: string;
  workId: string;
  periodKey: string;
  timeZoneId: string;
  policyVersion: string;
  scheduledAtUtc: string;
  observedAtUtc: string;
  state: "PENDING" | "LAUNCHING" | "LAUNCHED" | "MISSED" | "FAILED";
  reasonCode: string | null;
  flowInstanceId: string | null;
  manualCommandIds: string[];
  revision: number;
};

export type DynamicFlowPeriodicScheduleCreateRequest = {
  flowTemplateVersionId: string;
  commandId: string;
  targetUnitIds: string[];
  timeZoneId: string;
  localTime: string;
  effectiveFromUtc?: string | null;
};

export type DynamicFlowPeriodicRerunArgs = {
  workId: string;
  scheduleId: string;
  periodKey: string;
  body: { commandId: string };
};

type RuntimeCapabilityCarrier = {
  assignmentId?: unknown;
  reportId?: unknown;
  reportIds?: unknown;
  submitReportId?: unknown;
  reviewReportId?: unknown;
  capabilities?: Partial<DynamicFlowRuntimeCapabilities> | null;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAuthorizedReportId(row: RuntimeCapabilityCarrier, reportId: unknown): reportId is string {
  return hasText(reportId) &&
    Array.isArray(row.reportIds) &&
    row.reportIds.some((candidate) => candidate === reportId);
}

export function isDynamicFlowRuntimeEligibility(
  value: unknown,
): value is DynamicFlowRuntimeEligibility {
  return DYNAMIC_FLOW_RUNTIME_ELIGIBILITIES.some((candidate) => candidate === value);
}

export function isDynamicFlowRuntimeConfirmStatus(
  value: unknown,
): value is DynamicFlowRuntimeConfirmStatus {
  return DYNAMIC_FLOW_RUNTIME_CONFIRM_STATUSES.some((candidate) => candidate === value);
}

export function isDynamicFlowRuntimeInstanceState(
  value: unknown,
): value is DynamicFlowRuntimeInstanceState {
  return DYNAMIC_FLOW_RUNTIME_INSTANCE_STATES.some((candidate) => candidate === value);
}

export function isDynamicFlowRuntimeStepState(
  value: unknown,
): value is DynamicFlowRuntimeStepState {
  return DYNAMIC_FLOW_RUNTIME_STEP_STATES.some((candidate) => candidate === value);
}

export function canConfirmDynamicFlowRuntime(
  preview: DynamicFlowPreflightResponse | null | undefined,
): preview is DynamicFlowPreflightResponse {
  return preview?.eligibility === "ELIGIBLE_CANDIDATE" &&
    preview.blockedUntilPhase === null &&
    (preview.flowPin?.archetypeId === "FLOW-T01" ||
      preview.flowPin?.archetypeId === "FLOW-T02" ||
      preview.flowPin?.archetypeId === "FLOW-T03" ||
      preview.flowPin?.archetypeId === "FLOW-T04" ||
      preview.flowPin?.archetypeId === "FLOW-T05" ||
      preview.flowPin?.archetypeId === "FLOW-T06" ||
      preview.flowPin?.archetypeId === "FLOW-T07" ||
      preview.flowPin?.archetypeId === "FLOW-T08" ||
      preview.flowPin?.archetypeId === "FLOW-T09" ||
      preview.flowPin?.archetypeId === "FLOW-T11" ||
      preview.flowPin?.archetypeId === "FLOW-T12") &&
    hasText(preview.commandId) &&
    hasText(preview.snapshotToken);
}

export function canOpenDynamicFlowRuntimeAssignment(
  row: RuntimeCapabilityCarrier | null | undefined,
): boolean {
  return row?.capabilities?.canOpenAssignment === true && hasText(row.assignmentId);
}

export function canOpenDynamicFlowRuntimeReport(
  row: RuntimeCapabilityCarrier | null | undefined,
): boolean {
  return row?.capabilities?.canOpenReport === true &&
    hasAuthorizedReportId(row, row.reportId);
}

export function canSubmitDynamicFlowRuntimeReport(
  row: RuntimeCapabilityCarrier | null | undefined,
): boolean {
  return row?.capabilities?.canSubmitReport === true &&
    hasAuthorizedReportId(row, row.submitReportId);
}

export function canReviewDynamicFlowRuntimeReport(
  row: RuntimeCapabilityCarrier | null | undefined,
): boolean {
  return row?.capabilities?.canReviewReport === true &&
    hasAuthorizedReportId(row, row.reviewReportId);
}

function compactParams(
  query: {
    state?: string;
    limit?: number;
    cursor?: string | null;
  },
): Record<string, string | number> | undefined {
  const params: Record<string, string | number> = {};
  if (hasText(query.state)) params.state = query.state;
  if (Number.isInteger(query.limit) && (query.limit ?? 0) > 0) params.limit = query.limit!;
  if (hasText(query.cursor)) params.cursor = query.cursor;
  return Object.keys(params).length > 0 ? params : undefined;
}

function runtimeWorkTag(workId: string) {
  return { type: "DynamicFlowRuntime" as const, id: `WORK:${workId}` };
}

function runtimeInstanceTag(instanceId: string) {
  return { type: "DynamicFlowRuntime" as const, id: `INSTANCE:${instanceId}` };
}

export const dynamicFlowRuntimeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    preflightDynamicFlowRuntime: build.mutation<
      DynamicFlowPreflightResponse,
      DynamicFlowRuntimePreflightArgs
    >({
      query: ({ workId, body, limit, cursor }) => ({
        url: `/works/${encodeURIComponent(workId)}/dynamic-flows/preflight`,
        method: "POST",
        data: body,
        params: compactParams({ limit, cursor }),
      }),
    }),

    confirmDynamicFlowRuntime: build.mutation<
      DynamicFlowConfirmResponse,
      DynamicFlowRuntimeConfirmArgs
    >({
      query: ({ workId, body }) => ({
        url: `/works/${encodeURIComponent(workId)}/dynamic-flows/confirm`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result, error, { workId }) => {
        if (error || result?.businessWritePerformed !== true) return [];
        return [
          runtimeWorkTag(workId),
          { type: "DynamicFlowRuntime" as const, id: "INBOX" },
          ...(hasText(result.flowInstanceId)
            ? [runtimeInstanceTag(result.flowInstanceId)]
            : []),
        ];
      },
    }),

    forwardDynamicFlowRuntimeStep: build.mutation<
      DynamicFlowForwardResponse,
      DynamicFlowRuntimeForwardArgs
    >({
      query: ({ workId, assignmentId, body }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/assignments/` +
          `${encodeURIComponent(assignmentId)}/forward`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result, error, { workId, instanceId }) => {
        if (error || result?.businessWritePerformed !== true) return [];
        return [
          runtimeWorkTag(workId),
          runtimeInstanceTag(instanceId),
          { type: "DynamicFlowRuntime" as const, id: `STEPS:${instanceId}` },
          { type: "DynamicFlowRuntime" as const, id: `TIMELINE:${instanceId}` },
          { type: "DynamicFlowRuntime" as const, id: "INBOX" },
        ];
      },
    }),

    launchDynamicFlowRuntimeSubflow: build.mutation<
      DynamicFlowSubflowLaunchResponse,
      DynamicFlowRuntimeSubflowArgs
    >({
      query: ({
        workId,
        parentInstanceId,
        parentStepInstanceId,
        body,
      }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/instances/` +
          `${encodeURIComponent(parentInstanceId)}/steps/` +
          `${encodeURIComponent(parentStepInstanceId)}/subflow`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result, error, { workId, parentInstanceId }) => {
        if (error || result?.businessWritePerformed !== true) return [];
        return [
          runtimeWorkTag(workId),
          runtimeInstanceTag(parentInstanceId),
          runtimeInstanceTag(result.childInstanceId),
          {
            type: "DynamicFlowRuntime" as const,
            id: `STEPS:${parentInstanceId}`,
          },
          {
            type: "DynamicFlowRuntime" as const,
            id: `TIMELINE:${parentInstanceId}`,
          },
          { type: "DynamicFlowRuntime" as const, id: "INBOX" },
        ];
      },
    }),

    addDynamicFlowRuntimeSupplementalStep: build.mutation<
      DynamicFlowSupplementalCommandResponse,
      {
        workId: string;
        instanceId: string;
        body: DynamicFlowSupplementalAddRequest;
      }
    >({
      query: ({ workId, instanceId, body }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/instances/` +
          `${encodeURIComponent(instanceId)}/supplemental-steps`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_result, error, { workId, instanceId }) =>
        error
          ? []
          : [
              runtimeWorkTag(workId),
              runtimeInstanceTag(instanceId),
              { type: "DynamicFlowRuntime" as const, id: `STEPS:${instanceId}` },
              { type: "DynamicFlowRuntime" as const, id: `TIMELINE:${instanceId}` },
              { type: "DynamicFlowRuntime" as const, id: "INBOX" },
            ],
    }),

    cancelDynamicFlowRuntimeSupplementalStep: build.mutation<
      DynamicFlowSupplementalCommandResponse,
      {
        workId: string;
        instanceId: string;
        supplementalStepId: string;
        body: DynamicFlowSupplementalCancelRequest;
      }
    >({
      query: ({ workId, instanceId, supplementalStepId, body }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/instances/` +
          `${encodeURIComponent(instanceId)}/supplemental-steps/` +
          `${encodeURIComponent(supplementalStepId)}/cancel`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_result, error, { workId, instanceId }) =>
        error
          ? []
          : [
              runtimeWorkTag(workId),
              runtimeInstanceTag(instanceId),
              { type: "DynamicFlowRuntime" as const, id: `STEPS:${instanceId}` },
              { type: "DynamicFlowRuntime" as const, id: `TIMELINE:${instanceId}` },
              { type: "DynamicFlowRuntime" as const, id: "INBOX" },
            ],
    }),

    executeDynamicFlowEpochCommand: build.mutation<
      DynamicFlowEpochCommandResponse,
      DynamicFlowEpochCommandArgs
    >({
      query: ({ workId, instanceId, action, body }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/instances/` +
          `${encodeURIComponent(instanceId)}/${action}`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result, error, { workId, instanceId }) =>
        error || result?.businessWritePerformed !== true
          ? []
          : [
              runtimeWorkTag(workId),
              runtimeInstanceTag(instanceId),
              { type: "DynamicFlowRuntime" as const, id: `STEPS:${instanceId}` },
              { type: "DynamicFlowRuntime" as const, id: `TIMELINE:${instanceId}` },
              { type: "DynamicFlowRuntime" as const, id: "INBOX" },
            ],
    }),

    createDynamicFlowPeriodicSchedule: build.mutation<
      DynamicFlowPeriodicSchedule,
      { workId: string; body: DynamicFlowPeriodicScheduleCreateRequest }
    >({
      query: ({ workId, body }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/` +
          "periodic-schedules",
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_result, error, { workId }) =>
        error
          ? []
          : [{ type: "DynamicFlowRuntime" as const, id: `PERIODIC:${workId}` }],
    }),

    getDynamicFlowPeriodicSchedules: build.query<
      DynamicFlowPeriodicSchedule[],
      { workId: string }
    >({
      query: ({ workId }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/` +
          "periodic-schedules",
        method: "GET",
      }),
      providesTags: (_result, _error, { workId }) => [
        { type: "DynamicFlowRuntime" as const, id: `PERIODIC:${workId}` },
      ],
    }),

    getDynamicFlowPeriodicOccurrences: build.query<
      DynamicFlowPeriodicOccurrence[],
      { workId: string; scheduleId: string }
    >({
      query: ({ workId, scheduleId }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/` +
          `periodic-schedules/${encodeURIComponent(scheduleId)}/occurrences`,
        method: "GET",
      }),
      providesTags: (_result, _error, { scheduleId }) => [
        {
          type: "DynamicFlowRuntime" as const,
          id: `PERIODIC_OCCURRENCES:${scheduleId}`,
        },
      ],
    }),

    rerunDynamicFlowPeriodicOccurrence: build.mutation<
      DynamicFlowPeriodicOccurrence,
      DynamicFlowPeriodicRerunArgs
    >({
      query: ({ workId, scheduleId, periodKey, body }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/` +
          `periodic-schedules/${encodeURIComponent(scheduleId)}/` +
          `occurrences/${encodeURIComponent(periodKey)}/rerun`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_result, error, { workId, scheduleId }) =>
        error
          ? []
          : [
              runtimeWorkTag(workId),
              {
                type: "DynamicFlowRuntime" as const,
                id: `PERIODIC_OCCURRENCES:${scheduleId}`,
              },
            ],
    }),

    getDynamicFlowRuntimeInstances: build.query<
      DynamicFlowRuntimePage<DynamicFlowRuntimeInstanceRow>,
      DynamicFlowRuntimeInstanceListQuery
    >({
      query: ({ workId, state, limit, cursor }) => ({
        url: `/works/${encodeURIComponent(workId)}/dynamic-flows/instances`,
        method: "GET",
        params: compactParams({ state, limit, cursor }),
      }),
      providesTags: (_result, _error, { workId }) => [runtimeWorkTag(workId)],
    }),

    getDynamicFlowRuntimeInstance: build.query<
      DynamicFlowRuntimeInstanceOverview,
      DynamicFlowRuntimeInstanceQuery
    >({
      query: ({ workId, instanceId }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/instances/` +
          encodeURIComponent(instanceId),
        method: "GET",
      }),
      providesTags: (_result, _error, { instanceId }) => [runtimeInstanceTag(instanceId)],
    }),

    getDynamicFlowRuntimeSteps: build.query<
      DynamicFlowRuntimePage<DynamicFlowRuntimeStepRow>,
      DynamicFlowRuntimeInstancePageQuery
    >({
      query: ({ workId, instanceId, limit, cursor }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/instances/` +
          `${encodeURIComponent(instanceId)}/steps`,
        method: "GET",
        params: compactParams({ limit, cursor }),
      }),
      providesTags: (_result, _error, { instanceId }) => [
        runtimeInstanceTag(instanceId),
        { type: "DynamicFlowRuntime" as const, id: `STEPS:${instanceId}` },
      ],
    }),

    getDynamicFlowRuntimeInbox: build.query<
      DynamicFlowRuntimePage<DynamicFlowRuntimeStepRow>,
      DynamicFlowRuntimeInboxQuery | void
    >({
      query: (query) => ({
        url: "/dynamic-flows/inbox",
        method: "GET",
        params: compactParams(query ?? {}),
      }),
      providesTags: [{ type: "DynamicFlowRuntime", id: "INBOX" }],
    }),

    getDynamicFlowRuntimeTimeline: build.query<
      DynamicFlowRuntimePage<DynamicFlowRuntimeTimelineRow>,
      DynamicFlowRuntimeInstancePageQuery
    >({
      query: ({ workId, instanceId, limit, cursor }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/instances/` +
          `${encodeURIComponent(instanceId)}/timeline`,
        method: "GET",
        params: compactParams({ limit, cursor }),
      }),
      providesTags: (_result, _error, { instanceId }) => [
        runtimeInstanceTag(instanceId),
        { type: "DynamicFlowRuntime" as const, id: `TIMELINE:${instanceId}` },
      ],
    }),

    getDynamicFlowRuntimeRecovery: build.query<
      DynamicFlowRuntimeRecovery,
      DynamicFlowRuntimeInstanceQuery
    >({
      query: ({ workId, instanceId }) => ({
        url:
          `/works/${encodeURIComponent(workId)}/dynamic-flows/instances/` +
          `${encodeURIComponent(instanceId)}/recovery`,
        method: "GET",
      }),
      providesTags: (_result, _error, { instanceId }) => [
        runtimeInstanceTag(instanceId),
        { type: "DynamicFlowRuntime" as const, id: `RECOVERY:${instanceId}` },
      ],
    }),
  }),
});

export const {
  usePreflightDynamicFlowRuntimeMutation,
  useConfirmDynamicFlowRuntimeMutation,
  useForwardDynamicFlowRuntimeStepMutation,
  useLaunchDynamicFlowRuntimeSubflowMutation,
  useAddDynamicFlowRuntimeSupplementalStepMutation,
  useCancelDynamicFlowRuntimeSupplementalStepMutation,
  useExecuteDynamicFlowEpochCommandMutation,
  useCreateDynamicFlowPeriodicScheduleMutation,
  useGetDynamicFlowPeriodicSchedulesQuery,
  useLazyGetDynamicFlowPeriodicSchedulesQuery,
  useGetDynamicFlowPeriodicOccurrencesQuery,
  useLazyGetDynamicFlowPeriodicOccurrencesQuery,
  useRerunDynamicFlowPeriodicOccurrenceMutation,
  useGetDynamicFlowRuntimeInstancesQuery,
  useLazyGetDynamicFlowRuntimeInstancesQuery,
  useGetDynamicFlowRuntimeInstanceQuery,
  useLazyGetDynamicFlowRuntimeInstanceQuery,
  useGetDynamicFlowRuntimeStepsQuery,
  useLazyGetDynamicFlowRuntimeStepsQuery,
  useGetDynamicFlowRuntimeInboxQuery,
  useLazyGetDynamicFlowRuntimeInboxQuery,
  useGetDynamicFlowRuntimeTimelineQuery,
  useLazyGetDynamicFlowRuntimeTimelineQuery,
  useGetDynamicFlowRuntimeRecoveryQuery,
  useLazyGetDynamicFlowRuntimeRecoveryQuery,
} = dynamicFlowRuntimeApi;
