import { Navigate, useLocation } from "react-router-dom";

export const DYNAMIC_FLOW_LIST_PATH = "/design/flows";
export const LEGACY_DYNAMIC_FLOW_PATH = "/dynamic-flows";
export const DYNAMIC_FLOW_RUNTIME_TABS = [
  "overview",
  "work-to-do",
  "timeline",
] as const;

export type DynamicFlowRuntimeTab = (typeof DYNAMIC_FLOW_RUNTIME_TABS)[number];

export const DEFAULT_DYNAMIC_FLOW_RUNTIME_TAB: DynamicFlowRuntimeTab = "overview";

export type DynamicFlowRuntimeDeepLink = {
  stepInstanceId?: string | null;
  branchId?: string | null;
  attemptNo?: number | null;
  assignmentId?: string | null;
  reportId?: string | null;
};

export type DynamicFlowWorkspaceTab =
  | "overview"
  | "topology"
  | "forms-policies"
  | "mapping-metadata"
  | "result-statistics"
  | "validation";

export function dynamicFlowVersionPath(
  familyId: string,
  versionId: string,
  tab?: DynamicFlowWorkspaceTab,
) {
  const base = `${DYNAMIC_FLOW_LIST_PATH}/${encodeURIComponent(familyId)}/versions/${encodeURIComponent(versionId)}`;
  return tab ? `${base}/${tab}` : base;
}

export function isDynamicFlowRuntimeTab(value: string | undefined): value is DynamicFlowRuntimeTab {
  return DYNAMIC_FLOW_RUNTIME_TABS.includes(value as DynamicFlowRuntimeTab);
}

export function normalizeDynamicFlowRuntimeTab(
  value: string | undefined,
): DynamicFlowRuntimeTab {
  return isDynamicFlowRuntimeTab(value) ? value : DEFAULT_DYNAMIC_FLOW_RUNTIME_TAB;
}

function normalizedIdentityText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizedAttemptNo(value: number | null | undefined): number | null {
  return Number.isInteger(value) && (value ?? 0) > 0 ? value! : null;
}

export function dynamicFlowRuntimePath(
  workId: string,
  instanceId: string,
  tab: DynamicFlowRuntimeTab = DEFAULT_DYNAMIC_FLOW_RUNTIME_TAB,
  identity: DynamicFlowRuntimeDeepLink = {},
): string {
  const base =
    `/works/${encodeURIComponent(workId)}/flow-instances/` +
    `${encodeURIComponent(instanceId)}/${tab}`;
  const params = new URLSearchParams();
  const stepInstanceId = normalizedIdentityText(identity.stepInstanceId);
  const branchId = normalizedIdentityText(identity.branchId);
  const attemptNo = normalizedAttemptNo(identity.attemptNo);
  const assignmentId = normalizedIdentityText(identity.assignmentId);
  const reportId = normalizedIdentityText(identity.reportId);

  if (stepInstanceId) params.set("stepInstanceId", stepInstanceId);
  if (branchId) params.set("branchId", branchId);
  if (attemptNo !== null) params.set("attemptNo", String(attemptNo));
  if (assignmentId) params.set("assignmentId", assignmentId);
  if (reportId) params.set("reportId", reportId);

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function readDynamicFlowRuntimeDeepLink(
  search: string | URLSearchParams,
): DynamicFlowRuntimeDeepLink {
  const params = typeof search === "string"
    ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
    : search;
  const rawAttemptNo = params.get("attemptNo");
  const parsedAttemptNo = rawAttemptNo === null ? null : Number(rawAttemptNo);

  return {
    stepInstanceId: normalizedIdentityText(params.get("stepInstanceId")),
    branchId: normalizedIdentityText(params.get("branchId")),
    attemptNo: normalizedAttemptNo(parsedAttemptNo),
    assignmentId: normalizedIdentityText(params.get("assignmentId")),
    reportId: normalizedIdentityText(params.get("reportId")),
  };
}

export function getLegacyDynamicFlowRedirectTarget(location: {
  pathname: string;
  search?: string;
  hash?: string;
}) {
  const legacySuffix = location.pathname.startsWith(LEGACY_DYNAMIC_FLOW_PATH)
    ? location.pathname.slice(LEGACY_DYNAMIC_FLOW_PATH.length)
    : "";
  return `${DYNAMIC_FLOW_LIST_PATH}${legacySuffix}${location.search ?? ""}${location.hash ?? ""}`;
}

export function LegacyDynamicFlowsRedirect() {
  const location = useLocation();
  return <Navigate to={getLegacyDynamicFlowRedirectTarget(location)} replace />;
}
