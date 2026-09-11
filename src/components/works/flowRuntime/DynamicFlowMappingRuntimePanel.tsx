import React from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SyncAltRoundedIcon from "@mui/icons-material/SyncAltRounded";

import {
  DYNAMIC_FLOW_MAPPING_APPLY_RESPONSE_INVALID,
  sanitizeDynamicFlowMappingApplyResponse,
  useApplyDynamicFlowMappingDraftMutation,
  usePreviewDynamicFlowMappingDraftMutation,
} from "../../../api/reportApi";
import type {
  DynamicFlowMappingChange,
  DynamicFlowMappingInputProvenance,
  DynamicFlowMappingPreviewResponse,
  DynamicFlowMappingRequest,
  DynamicFlowMappingSourceReport,
  DynamicFlowPolicyEvaluationResult,
  WorkAssignmentReportResponse,
} from "../../../types/report";
import { WorkAssignmentReportStatus } from "../../../types/reportStatus";
import { normalizeApiError } from "../../../utils/apiError";

export type DynamicFlowMappingUiState =
  | "loading"
  | "empty"
  | "error"
  | "forbidden"
  | "readonly"
  | "locked"
  | "stale-conflict"
  | "success"
  | "retrying"
  | "unsupported";

type MappingOperationState =
  | "idle"
  | "loading"
  | "retrying"
  | "error"
  | "forbidden"
  | "readonly"
  | "stale-conflict"
  | "success"
  | "unsupported";

export interface DynamicFlowMappingSnapshot {
  reportId: string;
  assignmentId: string;
  payloadRevision: number;
  lifecycleRevision: number;
  payloadHash: string | null;
}

export interface DynamicFlowMappingRuntimePanelProps {
  reportId: string;
  assignmentId: string;
  reportStatus: WorkAssignmentReportResponse["status"];
  payloadRevision: number;
  lifecycleRevision: number;
  payloadHash?: string | null;
  permissions?: DynamicFlowPolicyEvaluationResult | null;
  forceReadOnly?: boolean;
  localDraftState?: "clean" | "dirty" | "saving" | "saved" | "conflict";
  onRefreshCanonical: () => Promise<unknown>;
  onApplied: (response: WorkAssignmentReportResponse) => void | Promise<void>;
}

type ClassifiedMappingError = {
  state: Extract<MappingOperationState, "error" | "forbidden" | "readonly" | "stale-conflict" | "unsupported">;
  message: string;
  reason: string | null;
};

const STALE_REASONS = new Set([
  "DYNAMIC_FLOW_MAPPING_TARGET_REVISION_CONFLICT",
  "DYNAMIC_FLOW_MAPPING_SOURCE_CONFLICT",
  "DYNAMIC_FLOW_MAPPING_SOURCE_SIGNATURE_CONFLICT",
  "DYNAMIC_FLOW_MAPPING_PREVIEW_TOKEN_CONFLICT",
  "DYNAMIC_FLOW_MAPPING_PREVIEW_SNAPSHOT_CONFLICT",
  "DYNAMIC_FLOW_MAPPING_PREVIEW_TOKEN_EXPIRED",
  "DYNAMIC_FLOW_MAPPING_PREVIEW_TOKEN_INVALID",
  "DYNAMIC_FLOW_MAPPING_PREVIEW_TOKEN_SNAPSHOT_MISMATCH",
  "DYNAMIC_FLOW_MAPPING_PREVIEW_TOKEN_EPOCH_MISMATCH",
  "DYNAMIC_FLOW_MAPPING_LIFECYCLE_CONFLICT",
  "DYNAMIC_FLOW_MAPPING_COMMAND_REPLAY_MISMATCH",
  "DYNAMIC_FLOW_MAPPING_IDENTITY_CONFLICT",
  "DYNAMIC_FLOW_REVISION_CONFLICT",
]);

const FORBIDDEN_REASONS = new Set([
  "DYNAMIC_FLOW_MAPPING_SOURCE_FORBIDDEN",
  "DYNAMIC_FLOW_MAPPING_RAW_SOURCE_FORBIDDEN",
  "DYNAMIC_FLOW_MAPPING_POLICY_DENIED",
  "DYNAMIC_FLOW_MAPPING_FIELD_WRITE_FORBIDDEN",
  "DYNAMIC_FLOW_MAPPING_TABLE_COLUMN_WRITE_FORBIDDEN",
  "DYNAMIC_FLOW_MAPPING_TARGET_WRITE_FORBIDDEN",
  "WORK_ASSIGNMENT_REPORT_SAVE_FORBIDDEN",
  "WORK_ASSIGNMENT_REPORT_ACCESS_FORBIDDEN",
]);

const UNSUPPORTED_REASON_PARTS = [
  "UNSUPPORTED",
  "INTENTIONAL_BLOCK",
  "TARGET_NOT_EFFECTIVE",
  "LOCKED_VERSION_REQUIRED",
  "RUNTIME_PIN_MISSING",
  "RUNTIME_PIN_INVALID",
  "TRANSACTION_REQUIRED",
  "PREVIEW_TOKEN_KEY_UNAVAILABLE",
  "FIXED_GRID_IDENTITY_INVALID",
  "DUPLICATE_ROW_KEY",
];

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasRequiredScalars(
  value: Record<string, unknown>,
  fields: readonly string[],
  predicate: (candidate: unknown) => boolean,
) {
  return fields.every((field) => predicate(value[field]));
}

function hasOptionalScalars(
  value: Record<string, unknown>,
  fields: readonly string[],
  predicate: (candidate: unknown) => boolean,
) {
  return fields.every((field) =>
    value[field] === undefined ||
    value[field] === null ||
    predicate(value[field]),
  );
}

const PREVIEW_REQUIRED_STRING_FIELDS = [
  "targetReportId",
  "targetAssignmentId",
  "flowFamilyId",
  "flowVersionId",
  "flowPayloadHash",
  "catalogVersion",
  "catalogSemanticHash",
  "mappingRuleSetHash",
  "evaluatorVersion",
  "functionRegistryVersion",
  "functionRegistryHash",
  "flowInstanceId",
  "stepInstanceId",
  "stepId",
  "branchId",
  "formFamilyId",
  "formVersionId",
  "formSchemaHash",
  "targetPayloadHash",
  "sourceSignature",
  "resultSemanticHash",
  "mappingCapability",
  "mappingCapabilityReason",
  "freshness",
  "dataOrigin",
  "cumulativeContributionMode",
] as const;

const PREVIEW_REQUIRED_INTEGER_FIELDS = [
  "executionEpoch",
  "attemptNo",
  "formVersionNo",
  "targetPayloadRevision",
  "targetLifecycleRevision",
] as const;

const PREVIEW_REQUIRED_BOOLEAN_FIELDS = [
  "canPreview",
  "canApply",
  "hasBlockingConflicts",
] as const;

const PREVIEW_OPTIONAL_STRING_FIELDS = [
  "previewToken",
  "previewIssuedAtUtc",
  "previewExpiresAtUtc",
  "applyState",
  "receiptId",
  "commandId",
  "cumulativeContributionPolicyJson",
  "summarySourceJson",
  "fieldValuesJson",
  "tableValuesJson",
] as const;

const SOURCE_REPORT_OPTIONAL_STRING_FIELDS = [
  "reportId",
  "workAssignmentId",
  "flowInstanceId",
  "stepInstanceId",
  "branchId",
  "flowStepId",
  "flowStepCode",
  "dynamicFormTemplateId",
  "formFamilyId",
  "formVersionId",
  "formSchemaHash",
  "payloadHash",
  "lifecycleStatus",
  "periodInstanceKey",
] as const;

const SOURCE_REPORT_OPTIONAL_INTEGER_FIELDS = [
  "executionEpoch",
  "attemptNo",
  "formVersionNo",
  "payloadRevision",
  "lifecycleRevision",
] as const;

const CHANGE_OPTIONAL_STRING_FIELDS = [
  "sourceReportId",
  "sourceKey",
  "previousValueJson",
  "nextValueJson",
  "reason",
  "conceptCode",
  "contributionPolicy",
] as const;

const PROVENANCE_OPTIONAL_STRING_FIELDS = [
  "inputKey",
  "sourceDynamicFormTemplateId",
  "sourceStepId",
  "sourceStepCode",
  "sourceAssignmentId",
  "sourceReportId",
  "sourcePayloadHash",
  "sourceKey",
  "rowKey",
  "valueJson",
] as const;

const PROVENANCE_OPTIONAL_INTEGER_FIELDS = [
  "sourcePayloadRevision",
  "sourceLifecycleRevision",
] as const;

/**
 * Keep only a render-safe projection of the server preview. Apply still uses
 * the signed identity/hash pins, never provenance or caller-owned rules.
 */
export function sanitizeDynamicFlowMappingPreview(
  value: unknown,
): DynamicFlowMappingPreviewResponse | null {
  if (
    !isRecord(value) ||
    !hasRequiredScalars(
      value,
      PREVIEW_REQUIRED_STRING_FIELDS,
      (candidate) => typeof candidate === "string",
    ) ||
    !hasRequiredScalars(
      value,
      PREVIEW_REQUIRED_INTEGER_FIELDS,
      Number.isInteger,
    ) ||
    !hasRequiredScalars(
      value,
      PREVIEW_REQUIRED_BOOLEAN_FIELDS,
      (candidate) => typeof candidate === "boolean",
    ) ||
    !hasOptionalScalars(
      value,
      PREVIEW_OPTIONAL_STRING_FIELDS,
      (candidate) => typeof candidate === "string",
    ) ||
    !Array.isArray(value.sourceReports) ||
    !Array.isArray(value.changes) ||
    value.sourceReports.some(
      (source) =>
        !isRecord(source) ||
        typeof source.identityRedacted !== "boolean" ||
        !hasOptionalScalars(
          source,
          SOURCE_REPORT_OPTIONAL_STRING_FIELDS,
          (candidate) => typeof candidate === "string",
        ) ||
        !hasOptionalScalars(
          source,
          SOURCE_REPORT_OPTIONAL_INTEGER_FIELDS,
          Number.isInteger,
        ),
    ) ||
    value.changes.some(
      (change) =>
        !isRecord(change) ||
        !hasRequiredScalars(
          change,
          ["mappingId", "targetKind", "targetKey", "status"],
          (candidate) => typeof candidate === "string",
        ) ||
        !normalizeText(change.mappingId) ||
        !Number.isInteger(change.mappingVersion) ||
        !normalizeText(change.targetKind) ||
        !normalizeText(change.targetKey) ||
        !normalizeText(change.status) ||
        !hasOptionalScalars(
          change,
          CHANGE_OPTIONAL_STRING_FIELDS,
          (candidate) => typeof candidate === "string",
        ) ||
        !Array.isArray(change.sources) ||
        change.sources.some(
          (source) =>
            !isRecord(source) ||
            !hasOptionalScalars(
              source,
              PROVENANCE_OPTIONAL_STRING_FIELDS,
              (candidate) => typeof candidate === "string",
            ) ||
            !hasOptionalScalars(
              source,
              PROVENANCE_OPTIONAL_INTEGER_FIELDS,
              Number.isInteger,
            ),
        ),
    )
  ) {
    return null;
  }

  const sourceReports: DynamicFlowMappingSourceReport[] = value.sourceReports.map((source) => {
    const typed = source as unknown as DynamicFlowMappingSourceReport;
    if (typed.identityRedacted !== false || !normalizeText(typed.reportId)) {
      return { identityRedacted: true } satisfies DynamicFlowMappingSourceReport;
    }
    return {
      reportId: typed.reportId,
      workAssignmentId: typed.workAssignmentId,
      flowInstanceId: typed.flowInstanceId,
      executionEpoch: typed.executionEpoch,
      stepInstanceId: typed.stepInstanceId,
      branchId: typed.branchId,
      attemptNo: typed.attemptNo,
      flowStepId: typed.flowStepId,
      flowStepCode: typed.flowStepCode,
      dynamicFormTemplateId: typed.dynamicFormTemplateId,
      formFamilyId: typed.formFamilyId,
      formVersionId: typed.formVersionId,
      formVersionNo: typed.formVersionNo,
      formSchemaHash: typed.formSchemaHash,
      payloadRevision: typed.payloadRevision,
      payloadHash: typed.payloadHash,
      lifecycleRevision: typed.lifecycleRevision,
      lifecycleStatus: typed.lifecycleStatus,
      periodInstanceKey: typed.periodInstanceKey,
      identityRedacted: false,
    };
  });
  const readableSourceReportIds = new Set(
    sourceReports
      .filter((source) => source.identityRedacted === false)
      .map((source) => normalizeText(source.reportId))
      .filter(Boolean),
  );
  const changes = value.changes.map((change) => {
    const typed = change as unknown as DynamicFlowMappingChange;
    const directSourceReadable = readableSourceReportIds.has(
      normalizeText(typed.sourceReportId),
    );
    return {
      mappingId: typed.mappingId,
      mappingVersion: typed.mappingVersion,
      targetKind: typed.targetKind,
      targetKey: typed.targetKey,
      sourceReportId: directSourceReadable ? typed.sourceReportId : null,
      sourceKey: directSourceReadable ? typed.sourceKey : null,
      previousValueJson: typed.previousValueJson,
      nextValueJson: typed.nextValueJson,
      status: typed.status,
      reason: typed.reason,
      conceptCode: typed.conceptCode,
      contributionPolicy: typed.contributionPolicy,
      sources: typed.sources.map((source, sourceIndex): DynamicFlowMappingInputProvenance => {
        const sourceReadable = readableSourceReportIds.has(
          normalizeText(source.sourceReportId),
        );
        if (!sourceReadable) {
          return {
            inputKey: normalizeText(source.inputKey) || `input-${sourceIndex + 1}`,
            sourceReportId: null,
            valueJson: null,
          };
        }
        return {
          inputKey: normalizeText(source.inputKey) || `input-${sourceIndex + 1}`,
          sourceDynamicFormTemplateId: source.sourceDynamicFormTemplateId,
          sourceStepId: source.sourceStepId,
          sourceStepCode: source.sourceStepCode,
          sourceAssignmentId: source.sourceAssignmentId,
          sourceReportId: source.sourceReportId,
          sourcePayloadRevision: source.sourcePayloadRevision,
          sourcePayloadHash: source.sourcePayloadHash,
          sourceLifecycleRevision: source.sourceLifecycleRevision,
          sourceKey: source.sourceKey,
          rowKey: source.rowKey,
          // Raw source values never belong in runtime UI state or the DOM.
          valueJson: null,
        };
      }),
    } satisfies DynamicFlowMappingChange;
  });

  const typed = value as unknown as DynamicFlowMappingPreviewResponse;
  return {
    targetReportId: typed.targetReportId,
    targetAssignmentId: typed.targetAssignmentId,
    flowFamilyId: typed.flowFamilyId,
    flowVersionId: typed.flowVersionId,
    flowPayloadHash: typed.flowPayloadHash,
    catalogVersion: typed.catalogVersion,
    catalogSemanticHash: typed.catalogSemanticHash,
    mappingRuleSetHash: typed.mappingRuleSetHash,
    evaluatorVersion: typed.evaluatorVersion,
    functionRegistryVersion: typed.functionRegistryVersion,
    functionRegistryHash: typed.functionRegistryHash,
    flowInstanceId: typed.flowInstanceId,
    executionEpoch: typed.executionEpoch,
    stepInstanceId: typed.stepInstanceId,
    stepId: typed.stepId,
    branchId: typed.branchId,
    attemptNo: typed.attemptNo,
    formFamilyId: typed.formFamilyId,
    formVersionId: typed.formVersionId,
    formVersionNo: typed.formVersionNo,
    formSchemaHash: typed.formSchemaHash,
    targetPayloadRevision: typed.targetPayloadRevision,
    targetPayloadHash: typed.targetPayloadHash,
    targetLifecycleRevision: typed.targetLifecycleRevision,
    sourceSignature: typed.sourceSignature,
    resultSemanticHash: typed.resultSemanticHash,
    previewToken: typed.previewToken,
    previewIssuedAtUtc: typed.previewIssuedAtUtc,
    previewExpiresAtUtc: typed.previewExpiresAtUtc,
    mappingCapability: typed.mappingCapability,
    mappingCapabilityReason: typed.mappingCapabilityReason,
    canPreview: typed.canPreview,
    canApply: typed.canApply,
    freshness: typed.freshness,
    applyState: typed.applyState,
    receiptId: typed.receiptId,
    commandId: typed.commandId,
    dataOrigin: typed.dataOrigin,
    cumulativeContributionMode: typed.cumulativeContributionMode,
    cumulativeContributionPolicyJson: typed.cumulativeContributionPolicyJson,
    summarySourceJson: null,
    fieldValuesJson: null,
    tableValuesJson: null,
    sourceReports,
    changes,
    hasBlockingConflicts: typed.hasBlockingConflicts,
  };
}

function readReason(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;
  if (typeof value === "string") {
    const text = value.trim();
    return /^DYNAMIC_FLOW_|^WORK_ASSIGNMENT_REPORT_/.test(text) ? text : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = readReason(item, depth + 1);
      if (nested) return nested;
    }
    return null;
  }
  if (typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  for (const key of ["reason", "errorCode", "code"]) {
    const candidate = normalizeText(record[key]);
    if (candidate) return candidate;
  }
  for (const nested of Object.values(record)) {
    const candidate = readReason(nested, depth + 1);
    if (candidate) return candidate;
  }
  return null;
}

export function classifyDynamicFlowMappingError(error: unknown): ClassifiedMappingError {
  const normalized = normalizeApiError(error);
  const reason =
    readReason(normalized.details) ??
    readReason(normalized.raw) ??
    (normalizeText(normalized.errorCode) || null);

  if (
    normalized.status === 409 ||
    (reason !== null && STALE_REASONS.has(reason)) ||
    Boolean(reason?.includes("PREVIEW_TOKEN"))
  ) {
    return {
      state: "stale-conflict",
      reason,
      message:
        "Nguồn hoặc báo cáo đích đã thay đổi. Bản xem trước cũ được giữ để đối chiếu; hãy tải lại rồi xem trước lại.",
    };
  }
  if (
    reason === "DYNAMIC_FLOW_MAPPING_POLICY_UNAVAILABLE" ||
    reason === "DYNAMIC_FLOW_MAPPING_POLICY_NOT_LOADED" ||
    reason === "DYNAMIC_FLOW_MAPPING_EXACT_PIN_REQUIRED"
  ) {
    return {
      state: "readonly",
      reason,
      message:
        reason === "DYNAMIC_FLOW_MAPPING_EXACT_PIN_REQUIRED"
          ? "Thiếu exact runtime pin canonical. Mọi thao tác mapping bị từ chối."
          : "Chính sách mapping canonical chưa sẵn sàng. Mọi thao tác bị từ chối theo mặc định.",
    };
  }
  if (
    normalized.status === 403 ||
    (reason !== null && FORBIDDEN_REASONS.has(reason)) ||
    Boolean(reason?.includes("FORBIDDEN"))
  ) {
    return {
      state: "forbidden",
      reason,
      message: "Bạn không có quyền xem trước hoặc áp dụng mapping này.",
    };
  }
  if (
    reason !== null &&
    UNSUPPORTED_REASON_PARTS.some((part) => reason.includes(part))
  ) {
    return {
      state: "unsupported",
      reason,
      message: "Mapping này chưa được runtime hỗ trợ hoặc target chưa ở pha cho phép.",
    };
  }
  return {
    state: "error",
    reason,
    message: normalized.message || "Không thực hiện được mapping.",
  };
}

export function isDynamicFlowPolicyReady(
  permissions: DynamicFlowPolicyEvaluationResult | null | undefined,
) {
  return Boolean(
    permissions &&
    typeof permissions.denyAllFields === "boolean" &&
    typeof permissions.denyAllTableColumns === "boolean" &&
    permissions.fields &&
    typeof permissions.fields === "object" &&
    !Array.isArray(permissions.fields) &&
    permissions.tableColumns &&
    typeof permissions.tableColumns === "object" &&
    !Array.isArray(permissions.tableColumns),
  );
}

export function buildDynamicFlowMappingPreviewRequest(
  snapshot: DynamicFlowMappingSnapshot,
): DynamicFlowMappingRequest {
  return {
    expectedPayloadRevision: snapshot.payloadRevision,
    expectedLifecycleRevision: snapshot.lifecycleRevision,
    expectedPayloadHash: snapshot.payloadHash,
  };
}

function createMappingCommandId() {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `flow-mapping-${randomUuid}`;
  return `flow-mapping-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function buildDynamicFlowMappingApplyRequest(
  preview: DynamicFlowMappingPreviewResponse,
  commandId: string,
): DynamicFlowMappingRequest {
  return {
    expectedPayloadRevision: preview.targetPayloadRevision,
    expectedLifecycleRevision: preview.targetLifecycleRevision,
    expectedPayloadHash: preview.targetPayloadHash,
    commandId,
    previewToken: preview.previewToken,
    sourceSignature: preview.sourceSignature,
    resultSemanticHash: preview.resultSemanticHash,
    flowFamilyId: preview.flowFamilyId,
    flowVersionId: preview.flowVersionId,
    flowPayloadHash: preview.flowPayloadHash,
    catalogVersion: preview.catalogVersion,
    catalogSemanticHash: preview.catalogSemanticHash,
    mappingRuleSetHash: preview.mappingRuleSetHash,
    evaluatorVersion: preview.evaluatorVersion,
    functionRegistryVersion: preview.functionRegistryVersion,
    functionRegistryHash: preview.functionRegistryHash,
    flowInstanceId: preview.flowInstanceId,
    executionEpoch: preview.executionEpoch,
    stepInstanceId: preview.stepInstanceId,
    stepId: preview.stepId,
    branchId: preview.branchId,
    attemptNo: preview.attemptNo,
    targetAssignmentId: preview.targetAssignmentId,
    targetReportId: preview.targetReportId,
    formFamilyId: preview.formFamilyId,
    formVersionId: preview.formVersionId,
    formVersionNo: preview.formVersionNo,
    formSchemaHash: preview.formSchemaHash,
  };
}

function isPreviewExpired(preview: DynamicFlowMappingPreviewResponse, now = Date.now()) {
  const expiresAt = Date.parse(preview.previewExpiresAtUtc ?? "");
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

function isSha256(value: unknown) {
  return /^[a-f0-9]{64}$/i.test(normalizeText(value));
}

function hasExactDynamicFlowMappingPins(
  preview: DynamicFlowMappingPreviewResponse,
) {
  const issuedAt = Date.parse(preview.previewIssuedAtUtc ?? "");
  const expiresAt = Date.parse(preview.previewExpiresAtUtc ?? "");
  return Boolean(
    normalizeText(preview.targetReportId) &&
    normalizeText(preview.targetAssignmentId) &&
    normalizeText(preview.flowFamilyId) &&
    normalizeText(preview.flowVersionId) &&
    isSha256(preview.flowPayloadHash) &&
    normalizeText(preview.catalogVersion) &&
    isSha256(preview.catalogSemanticHash) &&
    isSha256(preview.mappingRuleSetHash) &&
    normalizeText(preview.evaluatorVersion) &&
    normalizeText(preview.functionRegistryVersion) &&
    isSha256(preview.functionRegistryHash) &&
    normalizeText(preview.flowInstanceId) &&
    Number.isInteger(preview.executionEpoch) &&
    preview.executionEpoch > 0 &&
    normalizeText(preview.stepInstanceId) &&
    normalizeText(preview.stepId) &&
    normalizeText(preview.branchId) &&
    Number.isInteger(preview.attemptNo) &&
    preview.attemptNo > 0 &&
    normalizeText(preview.formFamilyId) &&
    normalizeText(preview.formVersionId) &&
    Number.isInteger(preview.formVersionNo) &&
    preview.formVersionNo > 0 &&
    isSha256(preview.formSchemaHash) &&
    Number.isInteger(preview.targetPayloadRevision) &&
    preview.targetPayloadRevision >= 0 &&
    isSha256(preview.targetPayloadHash) &&
    Number.isInteger(preview.targetLifecycleRevision) &&
    preview.targetLifecycleRevision >= 0 &&
    isSha256(preview.sourceSignature) &&
    isSha256(preview.resultSemanticHash) &&
    normalizeText(preview.previewToken) &&
    Number.isFinite(issuedAt) &&
    Number.isFinite(expiresAt) &&
    expiresAt > issuedAt,
  );
}

export function canApplyDynamicFlowMappingPreview(
  preview: DynamicFlowMappingPreviewResponse | null,
  snapshot: DynamicFlowMappingSnapshot,
  now = Date.now(),
) {
  if (!preview) return false;
  return Boolean(
    hasExactDynamicFlowMappingPins(preview) &&
    preview.mappingCapability === "ALLOWED" &&
    preview.canPreview === true &&
    preview.canApply === true &&
    preview.freshness === "FRESH" &&
    preview.hasBlockingConflicts === false &&
    preview.targetReportId === snapshot.reportId &&
    preview.targetAssignmentId === snapshot.assignmentId &&
    preview.targetPayloadRevision === snapshot.payloadRevision &&
    preview.targetLifecycleRevision === snapshot.lifecycleRevision &&
    preview.targetPayloadHash === snapshot.payloadHash &&
    !isPreviewExpired(preview, now),
  );
}

function resolvePanelState(
  operationState: MappingOperationState,
  preview: DynamicFlowMappingPreviewResponse | null,
  snapshot: DynamicFlowMappingSnapshot,
  reportStatus: WorkAssignmentReportResponse["status"],
  policyReady: boolean,
  forceReadOnly: boolean,
  localDraftState: DynamicFlowMappingRuntimePanelProps["localDraftState"],
): DynamicFlowMappingUiState {
  if (operationState === "stale-conflict") return "stale-conflict";
  if (Number(reportStatus) !== WorkAssignmentReportStatus.Draft) return "locked";
  if (
    forceReadOnly ||
    !policyReady ||
    !normalizeText(snapshot.payloadHash) ||
    localDraftState === "dirty" ||
    localDraftState === "saving" ||
    localDraftState === "conflict"
  ) {
    return "readonly";
  }
  if (
    preview &&
    operationState !== "success" &&
    !canApplyDynamicFlowMappingPreview(preview, snapshot) &&
    (
      preview.targetPayloadRevision !== snapshot.payloadRevision ||
      preview.targetLifecycleRevision !== snapshot.lifecycleRevision ||
      preview.targetPayloadHash !== snapshot.payloadHash ||
      preview.freshness === "STALE" ||
      isPreviewExpired(preview)
    )
  ) {
    return "stale-conflict";
  }
  if (operationState !== "idle") return operationState;
  if (!preview || preview.changes.length === 0) return "empty";
  if (
    preview.mappingCapability !== "ALLOWED" ||
    preview.canPreview !== true ||
    preview.freshness !== "FRESH"
  ) {
    return "unsupported";
  }
  return "success";
}

function sortChanges(changes: DynamicFlowMappingChange[]) {
  return [...changes].sort((left, right) =>
    left.mappingId.localeCompare(right.mappingId) ||
    left.mappingVersion - right.mappingVersion ||
    left.targetKind.localeCompare(right.targetKind) ||
    left.targetKey.localeCompare(right.targetKey),
  );
}

function displayJsonValue(value: string | null | undefined) {
  if (value == null || value.trim() === "") return "∅";
  try {
    const formatted = JSON.stringify(JSON.parse(value));
    return formatted.length > 240 ? `${formatted.slice(0, 237)}…` : formatted;
  } catch {
    return value.length > 240 ? `${value.slice(0, 237)}…` : value;
  }
}

function stateCopy(
  state: DynamicFlowMappingUiState,
  errorMessage: string | null,
  preview: DynamicFlowMappingPreviewResponse | null,
) {
  switch (state) {
    case "loading":
      return { severity: "info" as const, title: "Đang tạo bản xem trước", body: "Server đang chốt source signature và diff canonical." };
    case "retrying":
      return { severity: "info" as const, title: "Đang thử lại", body: "Bản xem trước cũ vẫn được giữ cho tới khi server trả kết quả mới." };
    case "forbidden":
      return { severity: "error" as const, title: "Không có quyền mapping", body: errorMessage ?? "Server đã từ chối capability mapping." };
    case "readonly":
      return { severity: "warning" as const, title: "Chỉ đọc", body: errorMessage ?? "Thiếu policy/readiness canonical hoặc đang có bản nháp cục bộ chưa lưu." };
    case "locked":
      return { severity: "info" as const, title: "Báo cáo đã khóa", body: "Chỉ báo cáo Draft mới được xem trước và áp dụng mapping." };
    case "stale-conflict":
      return { severity: "warning" as const, title: "Bản xem trước đã cũ", body: errorMessage ?? "Nguồn, target hoặc preview token không còn fresh. Không tự động áp dụng lại." };
    case "unsupported":
      return { severity: "warning" as const, title: "Runtime chưa hỗ trợ", body: errorMessage ?? preview?.mappingCapabilityReason ?? "Server không cấp capability cho shape mapping này." };
    case "error":
      return { severity: "error" as const, title: "Không tạo được mapping", body: errorMessage ?? "Đã xảy ra lỗi khi gọi runtime mapping." };
    case "success":
      return { severity: "success" as const, title: "Bản xem trước sẵn sàng", body: errorMessage ?? "Diff canonical đã được server xác nhận. Áp dụng vẫn cần thao tác rõ ràng." };
    default:
      return { severity: "info" as const, title: "Chưa có bản xem trước", body: "Chọn “Xem trước mapping” để lấy diff và provenance đã redaction từ server." };
  }
}

export default function DynamicFlowMappingRuntimePanel({
  reportId,
  assignmentId,
  reportStatus,
  payloadRevision,
  lifecycleRevision,
  payloadHash = null,
  permissions,
  forceReadOnly = false,
  localDraftState = "clean",
  onRefreshCanonical,
  onApplied,
}: DynamicFlowMappingRuntimePanelProps) {
  const [previewMapping, previewMutation] = usePreviewDynamicFlowMappingDraftMutation();
  const [applyMapping, applyMutation] = useApplyDynamicFlowMappingDraftMutation();
  const [preview, setPreview] = React.useState<DynamicFlowMappingPreviewResponse | null>(null);
  const [operationState, setOperationState] = React.useState<MappingOperationState>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [errorReason, setErrorReason] = React.useState<string | null>(null);
  const [hasApplied, setHasApplied] = React.useState(false);
  const [, setClockTick] = React.useState(0);
  const applyCommandRef = React.useRef<{ previewKey: string; commandId: string } | null>(null);
  const statusRef = React.useRef<HTMLDivElement | null>(null);

  const snapshot = React.useMemo<DynamicFlowMappingSnapshot>(() => ({
    reportId,
    assignmentId,
    payloadRevision,
    lifecycleRevision,
    payloadHash: normalizeText(payloadHash) || null,
  }), [assignmentId, lifecycleRevision, payloadHash, payloadRevision, reportId]);
  const policyReady = isDynamicFlowPolicyReady(permissions);
  const state = resolvePanelState(
    operationState,
    preview,
    snapshot,
    reportStatus,
    policyReady,
    forceReadOnly,
    localDraftState,
  );
  const statusCopy = stateCopy(state, errorMessage, preview);
  const sortedChanges = React.useMemo(
    () => sortChanges(preview?.changes ?? []),
    [preview?.changes],
  );
  const operationBusy =
    operationState === "loading" ||
    operationState === "retrying" ||
    previewMutation.isLoading ||
    applyMutation.isLoading;
  const canPreview = Boolean(
    Number(reportStatus) === WorkAssignmentReportStatus.Draft &&
    policyReady &&
    !forceReadOnly &&
    normalizeText(snapshot.payloadHash) &&
    localDraftState !== "dirty" &&
    localDraftState !== "saving" &&
    localDraftState !== "conflict" &&
    !operationBusy,
  );
  const previewCommandKey = preview
    ? `${preview.previewToken ?? ""}:${preview.resultSemanticHash}`
    : "";
  const canRetryApply = Boolean(
    operationState === "error" &&
    applyCommandRef.current?.previewKey === previewCommandKey,
  );
  const canApply = Boolean(
    canPreview &&
    (state === "success" || canRetryApply) &&
    !hasApplied &&
    (preview?.changes.length ?? 0) > 0 &&
    canApplyDynamicFlowMappingPreview(preview, snapshot) &&
    !previewMutation.isLoading &&
    !applyMutation.isLoading,
  );

  React.useEffect(() => {
    if (!preview?.previewExpiresAtUtc) return;
    const expiresAt = Date.parse(preview.previewExpiresAtUtc);
    if (!Number.isFinite(expiresAt)) return;
    const delay = Math.max(0, expiresAt - Date.now() + 25);
    const timer = window.setTimeout(
      () => setClockTick((current) => current + 1),
      Math.min(delay, 2_147_483_647),
    );
    return () => window.clearTimeout(timer);
  }, [preview?.previewExpiresAtUtc]);

  const refreshCanonicalSafely = React.useCallback(async () => {
    try {
      await onRefreshCanonical();
    } catch {
      // The stale/error state remains authoritative. A refresh failure must
      // never turn into an implicit retry or make the old preview applicable.
    }
  }, [onRefreshCanonical]);

  const handlePreview = async () => {
    if (!canPreview) return;
    const retrying = operationState !== "idle" || preview !== null;
    applyCommandRef.current = null;
    setOperationState(retrying ? "retrying" : "loading");
    setErrorMessage(null);
    setErrorReason(null);
    setHasApplied(false);
    try {
      const response = await previewMapping({
        id: reportId,
        data: buildDynamicFlowMappingPreviewRequest(snapshot),
      }).unwrap();
      const safePreview = sanitizeDynamicFlowMappingPreview(response);
      if (!safePreview) {
        setOperationState("readonly");
        setErrorMessage("Preview không đúng API shape canonical; dữ liệu trả về đã bị từ chối.");
        return;
      }
      if (
        safePreview.targetReportId !== reportId ||
        safePreview.targetAssignmentId !== assignmentId ||
        safePreview.targetPayloadRevision !== snapshot.payloadRevision ||
        safePreview.targetLifecycleRevision !== snapshot.lifecycleRevision ||
        safePreview.targetPayloadHash !== snapshot.payloadHash ||
        safePreview.freshness !== "FRESH"
      ) {
        setOperationState("stale-conflict");
        setErrorMessage("Server trả bản xem trước không khớp snapshot target hiện tại.");
        await refreshCanonicalSafely();
        return;
      }
      if (
        safePreview.mappingCapability !== "ALLOWED" ||
        safePreview.canPreview !== true
      ) {
        setPreview(safePreview);
        setOperationState("unsupported");
        setErrorMessage(
          safePreview.mappingCapabilityReason || "Server không cấp MAPPING_PREVIEW.",
        );
        return;
      }
      if (!hasExactDynamicFlowMappingPins(safePreview)) {
        setOperationState("readonly");
        setErrorMessage("Preview thiếu exact runtime pins/token/expiry canonical; apply bị từ chối.");
        return;
      }
      setPreview(safePreview);
      setOperationState("idle");
    } catch (error) {
      const classified = classifyDynamicFlowMappingError(error);
      setOperationState(classified.state);
      setErrorMessage(classified.message);
      setErrorReason(classified.reason);
      if (classified.state === "stale-conflict") {
        await refreshCanonicalSafely();
      }
    }
  };

  const handleApply = async () => {
    if (!preview || !canApply) return;
    const previewKey = `${preview.previewToken ?? ""}:${preview.resultSemanticHash}`;
    const retrying = applyCommandRef.current?.previewKey === previewKey;
    if (applyCommandRef.current?.previewKey !== previewKey) {
      applyCommandRef.current = {
        previewKey,
        commandId: createMappingCommandId(),
      };
    }
    setOperationState(retrying ? "retrying" : "loading");
    setErrorMessage(null);
    setErrorReason(null);
    try {
      const rawResponse = await applyMapping({
        id: reportId,
        data: buildDynamicFlowMappingApplyRequest(
          preview,
          applyCommandRef.current.commandId,
        ),
      }).unwrap();
      const response = sanitizeDynamicFlowMappingApplyResponse(rawResponse, {
        targetReportId: reportId,
        targetAssignmentId: assignmentId,
        targetPayloadRevision: preview.targetPayloadRevision,
        targetLifecycleRevision: preview.targetLifecycleRevision,
        commandId: applyCommandRef.current.commandId,
        resultSemanticHash: preview.resultSemanticHash,
      });
      if (!response) {
        setOperationState("error");
        setErrorReason(DYNAMIC_FLOW_MAPPING_APPLY_RESPONSE_INVALID);
        setErrorMessage(
          "Server trả phản hồi apply không đủ report identity, revision, hash hoặc capability canonical.",
        );
        return;
      }
      setHasApplied(true);
      setOperationState("success");
      setErrorMessage(`Đã áp dụng mapping vào payload revision ${response.payloadRevision}.`);
      await onApplied(response);
    } catch (error) {
      const classified = classifyDynamicFlowMappingError(error);
      setOperationState(classified.state);
      setErrorMessage(classified.message);
      setErrorReason(classified.reason);
      if (classified.state === "stale-conflict") {
        applyCommandRef.current = null;
        await refreshCanonicalSafely();
        statusRef.current?.focus();
      }
    }
  };

  const disabledReason = !policyReady
    ? "Policy chưa tải đủ deny-all flags và permission maps; mặc định từ chối."
    : forceReadOnly
      ? "Actor hiện tại ở chế độ chỉ đọc."
      : Number(reportStatus) !== WorkAssignmentReportStatus.Draft
        ? "Báo cáo không còn ở trạng thái Draft."
        : !normalizeText(snapshot.payloadHash)
          ? "Thiếu payload hash canonical."
          : localDraftState === "dirty" || localDraftState === "saving" || localDraftState === "conflict"
            ? "Hãy lưu hoặc xử lý xung đột bản nháp cục bộ trước khi mapping."
            : null;

  return (
    <Paper
      variant="outlined"
      data-testid="dynamic-flow-mapping-runtime"
      data-state={state}
      aria-busy={operationBusy}
      aria-labelledby="dynamic-flow-mapping-runtime-title"
      role="region"
      sx={{ p: { xs: 1.5, md: 2 } }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={1}
        >
          <Box>
            <Typography id="dynamic-flow-mapping-runtime-title" variant="h6" fontWeight={850}>
              Mapping dữ liệu quy trình
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Preview server-side, diff xác định, provenance đã redaction và apply tường minh.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={`MAPPING_PREVIEW: ${preview?.canPreview === true ? "đã cấp" : "chưa cấp"}`}
              color={preview?.canPreview === true ? "success" : "default"}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`MAPPING_APPLY: ${preview?.canApply === true ? "đã cấp" : "chưa cấp"}`}
              color={preview?.canApply === true ? "success" : "default"}
              variant="outlined"
            />
            <Chip
              size="small"
              data-testid="dynamic-flow-mapping-freshness"
              data-freshness={preview?.freshness ?? "UNKNOWN"}
              aria-label={`Freshness: ${preview?.freshness ?? "UNKNOWN"}`}
              label={`Freshness: ${preview?.freshness ?? "UNKNOWN"}`}
              color={preview?.freshness === "FRESH" ? "success" : "warning"}
              variant="outlined"
            />
          </Stack>
        </Stack>

        <Box data-testid={state === "stale-conflict" ? "dynamic-flow-mapping-conflict" : undefined}>
          <Alert
          id="dynamic-flow-mapping-status"
          ref={statusRef}
          severity={statusCopy.severity}
          role="status"
          data-testid="dynamic-flow-mapping-status"
          data-state={state}
          aria-live="polite"
          aria-labelledby="dynamic-flow-mapping-status-title"
          tabIndex={-1}
        >
          <AlertTitle id="dynamic-flow-mapping-status-title">{statusCopy.title}</AlertTitle>
          {statusCopy.body}
          {errorReason ? (
            <Typography component="div" variant="caption" sx={{ mt: 0.5 }}>
              Mã ổn định: {errorReason}
            </Typography>
          ) : null}
          </Alert>
        </Box>

        {disabledReason ? (
          <Typography variant="caption" color="text.secondary">
            {disabledReason}
          </Typography>
        ) : null}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            data-testid="dynamic-flow-mapping-preview-button"
            aria-controls="dynamic-flow-mapping-preview"
            aria-describedby="dynamic-flow-mapping-status"
            aria-busy={previewMutation.isLoading}
            disabled={!canPreview}
            onClick={() => void handlePreview()}
          >
            {preview ? "Làm mới bản xem trước" : "Xem trước mapping"}
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleOutlineRoundedIcon />}
            data-testid="dynamic-flow-mapping-apply-button"
            aria-controls="dynamic-flow-mapping-preview"
            aria-describedby="dynamic-flow-mapping-status"
            aria-busy={applyMutation.isLoading}
            disabled={!canApply}
            onClick={() => void handleApply()}
          >
            {canRetryApply ? "Thử lại áp dụng" : "Áp dụng mapping"}
          </Button>
        </Stack>

        {preview ? (
          <Box
            id="dynamic-flow-mapping-preview"
            data-testid="dynamic-flow-mapping-preview"
            sx={{ display: "contents" }}
          >
            <Divider />
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              flexWrap="wrap"
              useFlexGap
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ overflowWrap: "anywhere" }}
              >
                Source signature: {preview.sourceSignature || "MISSING"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ overflowWrap: "anywhere" }}
              >
                Result semantic hash: {preview.resultSemanticHash || "MISSING"}
              </Typography>
            </Stack>
            <Stack
              spacing={1}
              role="region"
              aria-labelledby="dynamic-flow-mapping-provenance-title"
              data-testid="dynamic-flow-mapping-provenance"
            >
              <Typography id="dynamic-flow-mapping-provenance-title" fontWeight={800}>Nguồn canonical ({preview.sourceReports.length})</Typography>
              {preview.sourceReports.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Rule set không cần source report hoặc chưa có nguồn hợp lệ.
                </Typography>
              ) : preview.sourceReports.map((source, index) => (
                <Stack
                  key={`${source.reportId ?? "redacted"}:${source.stepInstanceId ?? index}`}
                  data-testid={`dynamic-flow-mapping-provenance-source-${index}`}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <SyncAltRoundedIcon fontSize="small" />
                  <Typography variant="body2">
                    {source.identityRedacted
                      ? `Nguồn ${index + 1}: danh tính đã ẩn theo quyền truy cập`
                      : [
                          source.flowStepCode || source.flowStepId || `Nguồn ${index + 1}`,
                          source.periodInstanceKey,
                          source.reportId,
                        ].filter(Boolean).join(" · ")}
                  </Typography>
                  <Chip
                    size="small"
                    label={source.identityRedacted ? "REDACTED" : `payload r${source.payloadRevision ?? "?"}`}
                    variant="outlined"
                  />
                </Stack>
              ))}
              <Typography variant="caption" color="text.secondary">
                Giá trị nguồn thô không được hiển thị trong provenance.
              </Typography>
            </Stack>

            <Divider />
            <Stack
              spacing={1.25}
              role="region"
              aria-labelledby="dynamic-flow-mapping-diff-title"
              data-testid="dynamic-flow-mapping-diff"
            >
              <Typography id="dynamic-flow-mapping-diff-title" fontWeight={800}>Diff canonical ({sortedChanges.length})</Typography>
              {sortedChanges.length === 0 ? (
                <Alert severity="info">Không có thay đổi để áp dụng.</Alert>
              ) : sortedChanges.map((change, index) => (
                <Paper
                  key={`${change.mappingId}:${change.mappingVersion}:${change.targetKind}:${change.targetKey}`}
                  data-testid={`dynamic-flow-mapping-diff-item-${index}`}
                  data-mapping-id={change.mappingId}
                  data-status={change.status || "UNKNOWN"}
                  variant="outlined"
                  sx={{ p: 1.5 }}
                >
                  <Stack spacing={1}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography fontWeight={750}>
                        {change.targetKind} · {change.targetKey}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${change.status || "UNKNOWN"} · ${change.mappingId}@${change.mappingVersion}`}
                        color={change.status === "CONFLICT" ? "error" : "default"}
                        variant="outlined"
                      />
                    </Stack>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary">Trước</Typography>
                        <Typography
                          component="pre"
                          variant="body2"
                          sx={{ m: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                        >
                          {displayJsonValue(change.previousValueJson)}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary">Sau</Typography>
                        <Typography
                          component="pre"
                          variant="body2"
                          sx={{ m: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                        >
                          {displayJsonValue(change.nextValueJson)}
                        </Typography>
                      </Box>
                    </Stack>
                    {change.reason ? (
                      <Typography variant="caption" color="text.secondary">
                        {change.reason}
                      </Typography>
                    ) : null}
                    {change.sources.length > 0 ? (
                      <Stack
                        spacing={0.25}
                        data-testid={`dynamic-flow-mapping-diff-item-${index}-provenance`}
                      >
                        <Typography variant="caption" fontWeight={750}>Provenance đã redaction</Typography>
                        {change.sources.map((source, index) => (
                          <Typography
                            key={`${source.inputKey}:${source.sourceReportId ?? "redacted"}:${index}`}
                            variant="caption"
                            color="text.secondary"
                          >
                            {source.sourceReportId
                              ? [
                                  source.inputKey,
                                  source.sourceStepCode || source.sourceStepId,
                                  source.sourceKey,
                                  source.rowKey,
                                  source.sourcePayloadRevision == null
                                    ? null
                                    : `payload r${source.sourcePayloadRevision}`,
                                ].filter(Boolean).join(" · ")
                              : `${normalizeText(source.inputKey) || `Input ${index + 1}`}: nguồn đã ẩn theo quyền truy cập`}
                          </Typography>
                        ))}
                      </Stack>
                    ) : null}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}

