export const STATISTICS_CONFIGURATION_TABS = [
  "overview",
  "labels-form",
  "basic",
  "advanced",
  "diff",
  "readiness",
] as const;

export type StatisticsConfigurationTab =
  (typeof STATISTICS_CONFIGURATION_TABS)[number];

export const STATISTICS_CONFIGURATION_TAB_LABELS: Record<
  StatisticsConfigurationTab,
  string
> = {
  overview: "Tổng quan",
  "labels-form": "Nhãn & biểu mẫu",
  basic: "Basic",
  advanced: "Advanced",
  diff: "Diff",
  readiness: "Sẵn sàng",
};

export type StatConfigSurfaceState =
  | "LOADING"
  | "EMPTY"
  | "ERROR"
  | "FORBIDDEN"
  | "READONLY"
  | "LOCKED"
  | "STALE_CONFLICT"
  | "SUCCESS"
  | "RETRYING"
  | "UNSUPPORTED";

export type StatConfigStateInput = {
  loading?: boolean;
  errorStatus?: number | null;
  unsupported?: boolean;
  staleConflict?: boolean;
  retrying?: boolean;
  success?: boolean;
  empty?: boolean;
  locked?: boolean;
  canManageDraft?: boolean;
};

export function resolveStatConfigSurfaceState(
  input: StatConfigStateInput,
): StatConfigSurfaceState {
  if (input.loading) return "LOADING";
  if (input.errorStatus === 401 || input.errorStatus === 403) return "FORBIDDEN";
  if (input.unsupported) return "UNSUPPORTED";
  if (input.staleConflict) return "STALE_CONFLICT";
  if (input.retrying) return "RETRYING";
  if (input.success) return "SUCCESS";
  if (input.errorStatus != null) return "ERROR";
  if (input.locked) return "LOCKED";
  if (input.canManageDraft === false) return "READONLY";
  if (input.empty) return "EMPTY";
  return "SUCCESS";
}

export function isStatisticsConfigurationTab(
  value: string | undefined,
): value is StatisticsConfigurationTab {
  return STATISTICS_CONFIGURATION_TABS.includes(
    value as StatisticsConfigurationTab,
  );
}

export function statisticsConfigurationPath(
  workId: string,
  scopeAssignmentId: string,
  tab: StatisticsConfigurationTab = "overview",
) {
  return `/works/${encodeURIComponent(workId)}/statistics/${encodeURIComponent(
    scopeAssignmentId,
  )}/config/${tab}`;
}

export function createStatConfigCommandId(kind: string) {
  const suffix = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `p8-ui-${kind}-${suffix}`;
}

export function createStatConfigEnvelope<TPayload>(
  kind: string,
  identity: { revision: number; configHash: string },
  payload: TPayload,
) {
  return {
    commandId: createStatConfigCommandId(kind),
    expectedRevision: identity.revision,
    expectedConfigHash: identity.configHash,
    payload,
  };
}

export function createStatConfigEmptyEnvelope(
  kind: string,
  identity: { revision: number; configHash: string },
) {
  return createStatConfigEnvelope(kind, identity, {});
}

export function compactConfigHash(value: string | null | undefined) {
  if (!value) return "—";
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

export function apiErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const record = error as Record<string, unknown>;
  if (typeof record.status === "number") return record.status;
  if (record.data && typeof record.data === "object") {
    const nested = record.data as Record<string, unknown>;
    if (typeof nested.status === "number") return nested.status;
  }
  return null;
}

export function isStatConfigStaleConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const data = record.data && typeof record.data === "object"
    ? record.data as Record<string, unknown>
    : record;
  const code = String(data.errorCode ?? data.code ?? "");
  return apiErrorStatus(error) === 409 &&
    (code === "STAT_CONFIG_CAS_CONFLICT" || code.includes("REVISION"));
}

export function isNonEmptyStatisticProfile(
  profile: Readonly<Record<string, unknown>> | null | undefined,
) {
  if (!profile) return false;
  const entries = Object.entries(profile);
  if (entries.length === 0) return false;
  if (entries.length !== 1 || entries[0][0] !== "diffMode") return true;
  const value = entries[0][1];
  return typeof value !== "string" ||
    !["", "NONE"].includes(value.trim().toUpperCase());
}

export const BASIC_OPERATION_OPTIONS = {
  NUMBER: ["COUNT", "SUM", "MIN", "MAX", "MEAN"],
  DATE: ["COUNT", "MIN_DATE", "MAX_DATE"],
  BOOLEAN: ["COUNT", "TRUE_COUNT", "FALSE_COUNT"],
  CHOICE: ["COUNT", "BUCKET_COUNT"],
  TEXT: ["COUNT", "JOIN"],
} as const;

export const DIFF_CONCEPT_KINDS = ["FIELD", "TABLE_METRIC", "ROW_LABEL"] as const;

export const STAT_CONFIG_RESULT_ACTION_PATTERN =
  /run|result|export|reconcile|preview|hierarchy|materialize|rebuild/i;
