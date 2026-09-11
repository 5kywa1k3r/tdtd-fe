import type {
  StatRunCanonicalResult,
  StatRunJob,
  StatRunResultKind,
} from "../../../api/statRunApi";
import { normalizeApiError } from "../../../utils/apiError";

export type StatRunUiState =
  | "LOADING"
  | "EMPTY"
  | "QUEUED"
  | "RUNNING"
  | "RETRYING"
  | "READY"
  | "FAILED"
  | "CANCELLED"
  | "STALE"
  | "ERROR"
  | "FORBIDDEN"
  | "READONLY"
  | "CONFLICT"
  | "UNSUPPORTED"
  | "SOURCE_GONE";

const CONFLICT_CODES = new Set([
  "STAT_RUN_CAPABILITY_CONFLICT",
  "STAT_RUN_REVISION_CONFLICT",
  "STAT_RUN_CONFIG_STALE",
  "STAT_RUN_JOB_CONFLICT",
  "STAT_RUN_RESULT_STALE",
]);

const SOURCE_GONE_CODES = new Set([
  "STAT_RUN_SOURCE_NOT_APPROVED",
  "STAT_RUN_SOURCE_NOT_EFFECTIVE",
  "STAT_RUN_CANONICAL_RESULT_NOT_FOUND",
]);

export function stateFromError(error: unknown): StatRunUiState {
  const normalized = normalizeApiError(error);
  if (normalized.status === 401 || normalized.status === 403) return "FORBIDDEN";
  if (normalized.status === 404 || SOURCE_GONE_CODES.has(normalized.errorCode || "")) {
    return "SOURCE_GONE";
  }
  if (normalized.status === 409 || CONFLICT_CODES.has(normalized.errorCode || "")) {
    return "CONFLICT";
  }
  if (normalized.errorCode === "STAT_RUN_ROUTE_NOT_PROVEN") return "UNSUPPORTED";
  return "ERROR";
}

export function stateFromJob(job: StatRunJob): StatRunUiState {
  const freshness = job.freshnessState?.toUpperCase();
  if (["STALE", "DIRTY"].includes(freshness)) return "STALE";
  switch (job.status?.toUpperCase()) {
    case "QUEUED":
    case "PENDING":
      return "QUEUED";
    case "CLAIMED":
    case "RUNNING":
    case "BUILDING":
      return "RUNNING";
    case "RETRYING":
    case "RETRY_WAIT":
      return "RETRYING";
    case "COMPLETED":
    case "DONE":
    case "READY":
      return job.generationId ? "READY" : "EMPTY";
    case "FAILED":
    case "DEAD_LETTER":
      return "FAILED";
    case "CANCELLED":
    case "RESET":
      return "CANCELLED";
    default:
      return "ERROR";
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.toUpperCase() : "";
}

export type CanonicalDirectReconciliationIdentity = {
  p9RunId: string;
  p9ResultId: string;
  generationId: string;
  generationHash: string;
  conceptKey: string;
  periodKey: string;
  grain: string;
};

function exactIdentityText(value: unknown): string | null {
  if (typeof value !== "string" || !value || value !== value.trim() ||
      [...value].some(character => character.charCodeAt(0) < 32)) return null;
  return value;
}

/**
 * Reads the P10 create identity only from the canonical P9 response. Deep-link
 * query values are intentionally not accepted here: they select a read view,
 * but they are not an authority for a downstream mutation.
 */
export function canonicalDirectReconciliationIdentity(
  result: StatRunCanonicalResult | null,
  routeGenerationId: string,
): CanonicalDirectReconciliationIdentity | null {
  const metadata = record(result?.metadata);
  const identity = record(metadata?.reconciliationIdentity);
  if (!identity) return null;

  const p9RunId = exactIdentityText(identity.p9RunId);
  const p9ResultId = exactIdentityText(identity.p9ResultId);
  const generationId = exactIdentityText(identity.generationId);
  const generationHash = exactIdentityText(identity.generationHash);
  const conceptKey = exactIdentityText(identity.conceptKey);
  const periodKey = exactIdentityText(identity.periodKey);
  const grain = exactIdentityText(identity.grain);
  if (!p9RunId || p9RunId !== p9ResultId ||
      !/^[a-f0-9]{24}$/i.test(p9RunId) ||
      !generationId || !/^[a-f0-9]{64}$/i.test(generationId) ||
      generationId !== routeGenerationId ||
      !generationHash || !/^[a-f0-9]{64}$/i.test(generationHash) ||
      !conceptKey || !periodKey || !grain ||
      grain !== grain.toUpperCase()) return null;

  const publications = Array.isArray(metadata?.publications)
    ? metadata.publications.map(record).filter(Boolean) as Record<string, unknown>[]
    : [];
  if (publications.length !== 1) return null;
  const publication = publications[0];
  if (publication.runId !== p9RunId ||
      publication.generationId !== generationId ||
      publication.generationHash !== generationHash) return null;

  return {
    p9RunId,
    p9ResultId,
    generationId,
    generationHash,
    conceptKey,
    periodKey,
    grain,
  };
}

export function stateFromResult(result: StatRunCanonicalResult): StatRunUiState {
  const metadata = record(result.metadata);
  const meta = record(result.meta);
  const metadataState = text(metadata?.state);
  const rawState = metadataState || text(result.status || meta?.calculationStatus);
  const freshness = text(metadata?.freshness || result.freshnessState);
  if (metadata?.staleReason || meta?.snapshotDirty === true || result.isDirty === true) return "STALE";
  if (["STALE", "DIRTY"].includes(freshness)) return "STALE";
  if (["PENDING", "QUEUED"].includes(rawState)) return "QUEUED";
  if (["BUILDING", "RUNNING", "CLAIMED"].includes(rawState) || meta?.isCalculating === true) return "RUNNING";
  if (["RETRYING", "RETRY_WAIT"].includes(rawState)) return "RETRYING";
  if (["FAILED", "DEAD_LETTER"].includes(rawState) || metadata?.failureCode || result.failureCode) return "FAILED";
  if (["CANCELLED", "RESET"].includes(rawState)) return "CANCELLED";
  if (rawState === "MISSING") return "SOURCE_GONE";

  // Publication state is authoritative. A READY result may legitimately have
  // no rows (for example, an empty aggregate or a page past the last row).
  if (metadataState === "EMPTY") return "EMPTY";
  if (metadataState === "READY") return "READY";

  const rows = canonicalRows(result);
  const explicitTotal = serverTotal(result);
  if (rawState === "EMPTY" || explicitTotal === 0 || (rawState === "READY" && rows.length === 0)) {
    return "EMPTY";
  }
  if (["READY", "DONE", "COMPLETED", "CLEAN"].includes(rawState) || rows.length > 0 || result.resultJson) {
    return "READY";
  }
  return "EMPTY";
}

export function canonicalRows(result: StatRunCanonicalResult): Record<string, unknown>[] {
  if (Array.isArray(result.rows)) return result.rows.map(record).filter(Boolean) as Record<string, unknown>[];
  if (Array.isArray(result.fields) || Array.isArray(result.tables) || Array.isArray(result.sources)) {
    return [
      ...(Array.isArray(result.fields) ? result.fields : []),
      ...(Array.isArray(result.tables) ? result.tables : []),
      ...(Array.isArray(result.sources) ? result.sources : []),
    ].map(record).filter(Boolean) as Record<string, unknown>[];
  }
  if (typeof result.resultJson === "string" && result.resultJson) {
    try {
      const parsed: unknown = JSON.parse(result.resultJson);
      const values = Array.isArray(parsed) ? parsed : [parsed];
      return values.map(record).filter(Boolean) as Record<string, unknown>[];
    } catch {
      return [{ value: result.resultJson }];
    }
  }
  if (Array.isArray(result.selectedNodes)) {
    return result.selectedNodes.map(record).filter(Boolean) as Record<string, unknown>[];
  }
  return [];
}

export function canonicalDrilldownRows(
  result: StatRunCanonicalResult,
): Record<string, unknown>[] {
  return Array.isArray(result.drilldownRows)
    ? result.drilldownRows.map(record).filter(Boolean) as Record<string, unknown>[]
    : [];
}

export function serverTotals(result: StatRunCanonicalResult): Array<[string, string | number]> {
  const output: Array<[string, string | number]> = [];
  for (const [key, value] of Object.entries(result)) {
    if (!/(^total|count$|rowCount$|matched)/i.test(key)) continue;
    if (typeof value === "string" || typeof value === "number") output.push([key, value]);
  }
  const meta = record(result.meta);
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      if (!/(count$)/i.test(key) || (typeof value !== "string" && typeof value !== "number")) continue;
      output.push([`meta.${key}`, value]);
    }
  }
  return output;
}

function serverTotal(result: StatRunCanonicalResult): number | null {
  for (const key of ["totalRows", "totalRowCount", "sourceReportCount", "comparedRowCount"]) {
    const value = result[key];
    if (typeof value === "number") return value;
  }
  const meta = record(result.meta);
  return typeof meta?.sourceReportCount === "number" ? meta.sourceReportCount : null;
}

export function resultKindForJob(job: StatRunJob): StatRunResultKind {
  switch (job.capabilityId) {
    case "BASIC_SUMMARY": return "BASIC";
    case "ADVANCED_SUMMARY": return "ADVANCED";
    case "DIFF": return "DIFF";
    case "FLOW_SCOPES": return "FLOW";
    default: return "DIRECT_FIELD";
  }
}

export function statRunResultPath(
  workId: string,
  scopeAssignmentId: string,
  resultKind: StatRunResultKind,
  resultId: string,
) {
  return `/works/${encodeURIComponent(workId)}/statistics/${encodeURIComponent(scopeAssignmentId)}` +
    `/results/${encodeURIComponent(resultKind)}/${encodeURIComponent(resultId)}`;
}

export function statRunJobPath(workId: string, scopeAssignmentId: string, jobId: string) {
  return `/works/${encodeURIComponent(workId)}/statistics/${encodeURIComponent(scopeAssignmentId)}` +
    `/runs/${encodeURIComponent(jobId)}`;
}

export type DirectFieldReconciliationWorkspaceFilter = {
  periodInstanceKey: string | null | undefined;
  fieldId: string | null | undefined;
  fieldKey: string | null | undefined;
  bucketKey: string | null | undefined;
  periodKey: string | null | undefined;
};

export function directReconciliationWorkspacePath(
  workId: string,
  scopeAssignmentId: string,
  resultKind: StatRunResultKind,
  identity: CanonicalDirectReconciliationIdentity | null,
  filter: DirectFieldReconciliationWorkspaceFilter,
  exportId: string | null | undefined,
) {
  const exactExportId = exactIdentityText(exportId);
  const periodInstanceKey = exactIdentityText(filter.periodInstanceKey);
  const fieldId = exactIdentityText(filter.fieldId);
  const fieldKey = exactIdentityText(filter.fieldKey);
  const periodKey = exactIdentityText(filter.periodKey);
  if (resultKind !== "DIRECT_FIELD" || !identity ||
      !canTriggerDirectReconciliation(resultKind, "READY", identity) ||
      !exactExportId || !periodInstanceKey || !fieldId || !fieldKey ||
      !periodKey || periodKey !== identity?.periodKey ||
      filter.bucketKey != null) return null;

  const query = new URLSearchParams({
    p9ResultKind: "DIRECT",
    p9ResultId: identity.p9ResultId,
    p9RunId: identity.p9RunId,
    conceptKey: identity.conceptKey,
    grain: identity.grain,
    periodInstanceKey,
    fieldId,
    fieldKey,
    periodKey,
    exportId: exactExportId,
  });
  return "/works/" + encodeURIComponent(workId) + "/statistics/" +
    encodeURIComponent(scopeAssignmentId) + "/reconciliations?" + query;
}
export function canTriggerDirectReconciliation(
  resultKind: StatRunResultKind,
  state: StatRunUiState,
  identity: CanonicalDirectReconciliationIdentity | null,
) {
  return state === "READY" &&
    ["DIRECT_FIELD", "DIRECT_TABLE", "DIRECT_LABEL"].includes(resultKind) &&
    identity !== null &&
    identity.p9RunId === identity.p9ResultId &&
    /^[a-f0-9]{24}$/i.test(identity.p9RunId) &&
    /^[a-f0-9]{64}$/i.test(identity.generationHash) &&
    Boolean(identity.conceptKey) &&
    Boolean(identity.periodKey) &&
    identity.grain === identity.grain.toUpperCase();
}

export function isPollingState(state: StatRunUiState) {
  return state === "QUEUED" || state === "RUNNING" || state === "RETRYING";
}
