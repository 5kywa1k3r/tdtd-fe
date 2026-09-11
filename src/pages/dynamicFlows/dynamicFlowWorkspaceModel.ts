import type {
  DynamicFlowTemplateFamilyDto,
  DynamicFlowTemplateVersionDetailDto,
  FlowDefinitionPayloadV2,
  FlowDefinitionSnapshotV2,
} from "../../api/dynamicFlowTemplateApi";

export const DYNAMIC_FLOW_WORKSPACE_TABS = [
  "overview",
  "topology",
  "forms-policies",
  "mapping-metadata",
  "result-statistics",
  "validation",
] as const;

export type DynamicFlowWorkspaceTab = (typeof DYNAMIC_FLOW_WORKSPACE_TABS)[number];

export const DYNAMIC_FLOW_DEFINITION_CREATE_ROLE_BASES = [
  "SYSTEM_ADMIN",
  "ADMIN",
  "MANAGER_LEVEL",
  "DYNAMIC_FLOW_MANAGER",
] as const;

export function canCreateDynamicFlowDefinition(
  roles: readonly string[] | null | undefined,
  actorUnitId?: string | null,
): boolean {
  const unitId = actorUnitId?.trim() ?? "";
  return (roles ?? []).some((role) => {
    const trimmed = role.trim();
    const normalized = trimmed.toUpperCase();
    if (DYNAMIC_FLOW_DEFINITION_CREATE_ROLE_BASES.includes(
      normalized as (typeof DYNAMIC_FLOW_DEFINITION_CREATE_ROLE_BASES)[number],
    )) {
      return true;
    }
    const managerUnitPrefix = "MANAGER_UNIT:";
    return Boolean(
      unitId &&
      normalized.startsWith(managerUnitPrefix) &&
      trimmed.slice(managerUnitPrefix.length).trim() === unitId,
    );
  });
}

export const DYNAMIC_FLOW_WORKSPACE_TAB_LABELS: Record<DynamicFlowWorkspaceTab, string> = {
  overview: "Tổng quan",
  topology: "Sơ đồ",
  "forms-policies": "Biểu mẫu & chính sách",
  "mapping-metadata": "Metadata ánh xạ",
  "result-statistics": "Kết quả & thống kê",
  validation: "Kiểm tra",
};

export function isDynamicFlowWorkspaceTab(value: string | undefined): value is DynamicFlowWorkspaceTab {
  return DYNAMIC_FLOW_WORKSPACE_TABS.includes(value as DynamicFlowWorkspaceTab);
}

export function toEditableDynamicFlowPayload(
  snapshot: FlowDefinitionSnapshotV2,
): FlowDefinitionPayloadV2 {
  return {
    // REQUIRES_REVIEW values are kept byte-for-byte at runtime and the
    // workspace is readonly. The cast only satisfies the canonical draft type.
    schemaVersion: snapshot.schemaVersion as 2,
    archetypeId: snapshot.archetypeId,
    entryStepId: snapshot.entryStepId,
    rootDynamicFormTemplateId: snapshot.rootDynamicFormTemplateId,
    formNodes: snapshot.formNodes.map(({ formNodeId, role, dynamicFormTemplateId }) => ({
      formNodeId,
      role,
      dynamicFormTemplateId,
    })),
    nodes: cloneJson(snapshot.nodes),
    edges: cloneJson(snapshot.edges),
    actorPolicies: cloneJson(snapshot.actorPolicies),
    fieldPolicies: cloneJson(snapshot.fieldPolicies),
    tableColumnPolicies: cloneJson(snapshot.tableColumnPolicies),
    mappingRules: cloneJson(snapshot.mappingRules),
    resultOwnerStepId: snapshot.resultOwnerStepId,
    resultOwnerFormNodeId: snapshot.resultOwnerFormNodeId,
    statisticsOwnerStepId: snapshot.statisticsOwnerStepId,
    statisticsOwnerFormNodeId: snapshot.statisticsOwnerFormNodeId,
    rollbackPolicy: cloneJson(snapshot.rollbackPolicy),
    finalResultPolicy: cloneJson(snapshot.finalResultPolicy),
    statisticProfile: cloneJson(snapshot.statisticProfile),
  };
}

export function cloneDynamicFlowPayload(payload: FlowDefinitionPayloadV2): FlowDefinitionPayloadV2 {
  return cloneJson(payload);
}

function cloneJson<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function dynamicFlowPayloadFingerprint(payload: FlowDefinitionPayloadV2): string {
  return JSON.stringify(canonicalize(payload));
}

export type DynamicFlowMergeConflict = {
  path: string;
  segments: Array<string | number>;
  localValue: unknown;
  remoteValue: unknown;
};

export type DynamicFlowMergeResult = {
  payload: FlowDefinitionPayloadV2;
  conflicts: DynamicFlowMergeConflict[];
};

const MISSING_VALUE = Symbol("dynamic-flow-missing-value");
type MergeValue = unknown | typeof MISSING_VALUE;

function mergePath(segments: Array<string | number>): string {
  if (segments.length === 0) return "payload";
  return segments.reduce<string>(
    (path, segment) =>
      typeof segment === "number"
        ? `${path}[${segment}]`
        : path
          ? `${path}.${segment}`
          : segment,
    "",
  );
}

function mergeValueFingerprint(value: MergeValue): string {
  if (value === MISSING_VALUE) return "__MISSING__";
  return JSON.stringify(canonicalize(value));
}

function mergeValuesEqual(left: MergeValue, right: MergeValue): boolean {
  return mergeValueFingerprint(left) === mergeValueFingerprint(right);
}

function cloneMergeValue(value: MergeValue): MergeValue {
  if (value === MISSING_VALUE || value === undefined || value === null) return value;
  return cloneJson(value);
}

function isPlainMergeObject(value: MergeValue): value is Record<string, unknown> {
  return value !== MISSING_VALUE &&
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

const STABLE_ARRAY_ID_FIELDS = [
  "nodeId",
  "transitionId",
  "formNodeId",
  "mappingId",
  "policyId",
  "inputKey",
] as const;

function stableArrayIdentity(item: unknown): string | null {
  if (!isPlainMergeObject(item)) return null;
  for (const field of STABLE_ARRAY_ID_FIELDS) {
    const value = item[field];
    if (typeof value === "string" && value.trim()) return `${field}:${value}`;
  }
  return null;
}

function indexStableArray(items: unknown[]): Map<string, unknown> | null {
  const indexed = new Map<string, unknown>();
  for (const item of items) {
    const identity = stableArrayIdentity(item);
    if (!identity || indexed.has(identity)) return null;
    indexed.set(identity, item);
  }
  return indexed;
}

function mergeDynamicFlowValue(
  base: MergeValue,
  local: MergeValue,
  remote: MergeValue,
  segments: Array<string | number>,
  conflicts: DynamicFlowMergeConflict[],
): MergeValue {
  if (mergeValuesEqual(local, base)) return cloneMergeValue(remote);
  if (mergeValuesEqual(remote, base) || mergeValuesEqual(local, remote)) {
    return cloneMergeValue(local);
  }

  if (isPlainMergeObject(base) && isPlainMergeObject(local) && isPlainMergeObject(remote)) {
    const merged: Record<string, unknown> = {};
    const keys = new Set([
      ...Object.keys(base),
      ...Object.keys(local),
      ...Object.keys(remote),
    ]);
    keys.forEach((key) => {
      const child = mergeDynamicFlowValue(
        Object.prototype.hasOwnProperty.call(base, key) ? base[key] : MISSING_VALUE,
        Object.prototype.hasOwnProperty.call(local, key) ? local[key] : MISSING_VALUE,
        Object.prototype.hasOwnProperty.call(remote, key) ? remote[key] : MISSING_VALUE,
        [...segments, key],
        conflicts,
      );
      if (child !== MISSING_VALUE) merged[key] = child;
    });
    return merged;
  }

  if (
    Array.isArray(base) &&
    Array.isArray(local) &&
    Array.isArray(remote)
  ) {
    const baseById = indexStableArray(base);
    const localById = indexStableArray(local);
    const remoteById = indexStableArray(remote);
    if (baseById && localById && remoteById) {
      const hasDeleteVsEditConflict = Array.from(baseById.entries()).some(
        ([identity, baseItem]) =>
          (!localById.has(identity) &&
            remoteById.has(identity) &&
            !mergeValuesEqual(baseItem, remoteById.get(identity))) ||
          (!remoteById.has(identity) &&
            localById.has(identity) &&
            !mergeValuesEqual(baseItem, localById.get(identity))),
      );
      if (hasDeleteVsEditConflict) {
        conflicts.push({
          path: mergePath(segments),
          segments: [...segments],
          localValue: cloneJson(local),
          remoteValue: cloneJson(remote),
        });
        return cloneJson(local);
      }
      const identities = [
        ...remoteById.keys(),
        ...Array.from(localById.keys()).filter((identity) => !remoteById.has(identity)),
      ];
      const merged: unknown[] = [];
      identities.forEach((identity, index) => {
        const child = mergeDynamicFlowValue(
          baseById.has(identity) ? baseById.get(identity) : MISSING_VALUE,
          localById.has(identity) ? localById.get(identity) : MISSING_VALUE,
          remoteById.has(identity) ? remoteById.get(identity) : MISSING_VALUE,
          [...segments, index],
          conflicts,
        );
        if (child !== MISSING_VALUE) merged.push(child);
      });
      return merged;
    }
    if (base.length === local.length && base.length === remote.length) {
      return base.map((_item, index) =>
        mergeDynamicFlowValue(
          base[index],
          local[index],
          remote[index],
          [...segments, index],
          conflicts,
        ),
      );
    }
  }

  conflicts.push({
    path: mergePath(segments),
    segments: [...segments],
    localValue: local === MISSING_VALUE ? undefined : cloneMergeValue(local),
    remoteValue: remote === MISSING_VALUE ? undefined : cloneMergeValue(remote),
  });
  // Keep the user's value visible until they explicitly resolve the overlap.
  return cloneMergeValue(local);
}

export function mergeDynamicFlowPayload(
  base: FlowDefinitionPayloadV2,
  local: FlowDefinitionPayloadV2,
  remote: FlowDefinitionPayloadV2,
): DynamicFlowMergeResult {
  const conflicts: DynamicFlowMergeConflict[] = [];
  const payload = mergeDynamicFlowValue(base, local, remote, [], conflicts);
  return {
    payload: payload as FlowDefinitionPayloadV2,
    conflicts,
  };
}

function applyMergeValueAtPath(
  root: FlowDefinitionPayloadV2,
  segments: Array<string | number>,
  value: unknown,
): FlowDefinitionPayloadV2 {
  if (segments.length === 0) return cloneJson(value) as FlowDefinitionPayloadV2;
  const next = cloneDynamicFlowPayload(root) as unknown as Record<string, unknown>;
  let parent: Record<string, unknown> | unknown[] = next;
  for (let index = 0; index < segments.length - 1; index += 1) {
    parent = parent[segments[index] as never] as Record<string, unknown> | unknown[];
  }
  const leaf = segments.at(-1)!;
  if (value === undefined && !Array.isArray(parent)) {
    delete parent[leaf as string];
  } else {
    parent[leaf as never] = cloneMergeValue(value) as never;
  }
  return next as unknown as FlowDefinitionPayloadV2;
}

export function resolveDynamicFlowMergeConflicts(
  payload: FlowDefinitionPayloadV2,
  conflicts: DynamicFlowMergeConflict[],
  choice: "local" | "remote",
): FlowDefinitionPayloadV2 {
  return conflicts.reduce(
    (current, conflict) =>
      applyMergeValueAtPath(
        current,
        conflict.segments,
        choice === "local" ? conflict.localValue : conflict.remoteValue,
      ),
    cloneDynamicFlowPayload(payload),
  );
}

export function createDynamicFlowWorkspaceCommandId(kind: string): string {
  const random = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `flow-${kind}-${random}`;
}

export type DynamicFlowWorkspaceAccessState =
  | "editable"
  | "readonly"
  | "locked"
  | "archived"
  | "unsupported";

export function getDynamicFlowWorkspaceAccessState(
  family: DynamicFlowTemplateFamilyDto,
  version: DynamicFlowTemplateVersionDetailDto,
): DynamicFlowWorkspaceAccessState {
  if (family.status === "ARCHIVED" || version.status === "ARCHIVED") return "archived";
  if (version.migrationState === "REQUIRES_REVIEW") return "unsupported";
  if (version.status === "LOCKED") return "locked";
  if (!version.canManage) return "readonly";
  return "editable";
}

export type DynamicFlowDraftRecord = {
  schema: 1;
  actorId: string;
  familyId: string;
  versionId: string;
  baseDraftRevision: number;
  basePayloadHash: string;
  basePayload?: FlowDefinitionPayloadV2;
  savedAtUtc: string;
  payload: FlowDefinitionPayloadV2;
  rawEditorTexts?: Record<string, string>;
};

export function dynamicFlowDraftStorageKey(
  actorId: string,
  familyId: string,
  versionId: string,
): string {
  return `tdtd:p4-flow-draft:${encodeURIComponent(actorId)}:${encodeURIComponent(familyId)}:${encodeURIComponent(versionId)}`;
}

export function readDynamicFlowDraft(
  actorId: string,
  familyId: string,
  versionId: string,
): DynamicFlowDraftRecord | null {
  try {
    const raw = localStorage.getItem(dynamicFlowDraftStorageKey(actorId, familyId, versionId));
    if (!raw) return null;
    const candidate = JSON.parse(raw) as Partial<DynamicFlowDraftRecord>;
    if (
      candidate.schema !== 1 ||
      candidate.actorId !== actorId ||
      candidate.familyId !== familyId ||
      candidate.versionId !== versionId ||
      typeof candidate.baseDraftRevision !== "number" ||
      typeof candidate.basePayloadHash !== "string" ||
      !candidate.payload
    ) {
      return null;
    }
    return candidate as DynamicFlowDraftRecord;
  } catch {
    return null;
  }
}

export function writeDynamicFlowDraft(record: DynamicFlowDraftRecord): void {
  try {
    localStorage.setItem(
      dynamicFlowDraftStorageKey(record.actorId, record.familyId, record.versionId),
      JSON.stringify(record),
    );
  } catch {
    // Draft persistence is best-effort; the in-memory draft remains authoritative.
  }
}

export function clearDynamicFlowDraft(actorId: string, familyId: string, versionId: string): void {
  try {
    localStorage.removeItem(dynamicFlowDraftStorageKey(actorId, familyId, versionId));
  } catch {
    // Storage can be disabled by the browser. Nothing else needs to be cleared.
  }
}

export type DynamicFlowValidationIssue = {
  level: "error" | "warning";
  path: string;
  message: string;
};

export type DynamicFlowValidationTarget = {
  path: string;
  tab: DynamicFlowWorkspaceTab;
  editorId: string | null;
  canonicalControlId: string | null;
  nodeId: string | null;
  control: string | null;
};

function detailsRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function detailsString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const POLICY_CANONICAL_CONTROLS = new Set([
  "policyId",
  "actorRole",
  "stepId",
  "stepCode",
  "fieldId",
  "fieldKey",
  "blockId",
  "columnKey",
  "read",
  "write",
  "required",
  "hidden",
  "locked",
  "lockedAfterSubmit",
]);

const MAPPING_RULE_CANONICAL_CONTROLS = new Set([
  "mappingId",
  "mappingVersion",
  "mappingKind",
  "conceptCode",
  "evaluationGrain",
  "errorPolicy",
]);

const MAPPING_INPUT_CANONICAL_CONTROLS = new Set([
  "inputKey",
  "dataType",
  "cardinality",
  "nullPolicy",
  "constantValue",
]);

const MAPPING_ENDPOINT_CANONICAL_CONTROLS = new Set([
  "kind",
  "stepId",
  "stepCode",
  "dynamicFormTemplateId",
  "dataType",
  "fieldId",
  "fieldKey",
  "sectionCode",
  "blockId",
  "columnKey",
  "rowKey",
]);

const MAPPING_CALCULATION_CANONICAL_CONTROLS = new Set([
  "kind",
  "operation",
  "resultDataType",
  "expression",
  "functionCode",
  "functionVersion",
]);

export function resolveDynamicFlowCanonicalControlId(path: string): string | null {
  const policyMatch = /^(fieldPolicies|tableColumnPolicies)\[(\d+)](?:\.([A-Za-z0-9_]+))?$/
    .exec(path);
  if (policyMatch) {
    const kind = policyMatch[1] === "fieldPolicies" ? "field" : "table";
    const control = policyMatch[3] && POLICY_CANONICAL_CONTROLS.has(policyMatch[3])
      ? policyMatch[3]
      : "policyId";
    return `dynamic-flow-policy-${kind}-${policyMatch[2]}-${control}`;
  }

  const mappingMatch = /^mappingRules\[(\d+)](?:\.(.+))?$/.exec(path);
  if (!mappingMatch) return null;
  const rulePrefix = `dynamic-flow-mapping-rule-${mappingMatch[1]}`;
  const remainder = mappingMatch[2];
  if (!remainder) return `${rulePrefix}-selector`;

  const inputMatch = /^inputs\[(\d+)](?:\.(.+))?$/.exec(remainder);
  if (inputMatch) {
    const inputPrefix = `${rulePrefix}-input-${inputMatch[1]}`;
    const inputRemainder = inputMatch[2];
    if (!inputRemainder) return `${inputPrefix}-selector`;
    const sourceMatch = /^source(?:\.([A-Za-z0-9_]+))?$/.exec(inputRemainder);
    if (sourceMatch) {
      const control = sourceMatch[1] && MAPPING_ENDPOINT_CANONICAL_CONTROLS.has(sourceMatch[1])
        ? sourceMatch[1]
        : "kind";
      return `${inputPrefix}-source-${control}`;
    }
    return MAPPING_INPUT_CANONICAL_CONTROLS.has(inputRemainder)
      ? `${inputPrefix}-${inputRemainder}`
      : `${inputPrefix}-selector`;
  }

  const targetMatch = /^target(?:\.([A-Za-z0-9_]+))?$/.exec(remainder);
  if (targetMatch) {
    const control = targetMatch[1] && MAPPING_ENDPOINT_CANONICAL_CONTROLS.has(targetMatch[1])
      ? targetMatch[1]
      : "kind";
    return `${rulePrefix}-target-${control}`;
  }

  const calculationMatch = /^calculation(?:\.([A-Za-z0-9_]+))?$/.exec(remainder);
  if (calculationMatch) {
    const control = calculationMatch[1] &&
      MAPPING_CALCULATION_CANONICAL_CONTROLS.has(calculationMatch[1])
      ? calculationMatch[1]
      : "kind";
    return `${rulePrefix}-calculation-${control}`;
  }

  return MAPPING_RULE_CANONICAL_CONTROLS.has(remainder)
    ? `${rulePrefix}-${remainder}`
    : `${rulePrefix}-selector`;
}

export function resolveDynamicFlowValidationTarget(
  details: unknown,
  payload: FlowDefinitionPayloadV2,
): DynamicFlowValidationTarget | null {
  const record = detailsRecord(details);
  const context = detailsRecord(record?.context);
  const path = (detailsString(record, "path") ?? detailsString(context, "path"))
    ?.replace(/^\$\.?/, "")
    .replace(/^payload\./, "");
  if (!path) return null;

  const root = path.split(/[.[\]]/).find(Boolean) ?? "";
  const explicitTab = detailsString(record, "tab") ?? detailsString(context, "tab");
  const inferredTab: DynamicFlowWorkspaceTab =
    root === "nodes" || root === "edges" || root === "entryStepId"
      ? "topology"
      : root === "formNodes" ||
          root === "actorPolicies" ||
          root === "fieldPolicies" ||
          root === "tableColumnPolicies" ||
          root === "rootDynamicFormTemplateId"
        ? "forms-policies"
        : root === "mappingRules"
          ? "mapping-metadata"
          : root === "resultOwnerStepId" ||
              root === "resultOwnerFormNodeId" ||
              root === "statisticsOwnerStepId" ||
              root === "statisticsOwnerFormNodeId" ||
              root === "rollbackPolicy" ||
              root === "finalResultPolicy" ||
              root === "statisticProfile"
            ? "result-statistics"
            : root === "archetypeId"
              ? "overview"
              : "validation";
  const normalizedExplicitTab =
    explicitTab === "completion-statistics" ? "result-statistics" : explicitTab;
  const tab = normalizedExplicitTab && isDynamicFlowWorkspaceTab(normalizedExplicitTab)
    ? normalizedExplicitTab
    : inferredTab;
  const editorByRoot: Partial<Record<string, string>> = {
    edges: "topology-edges",
    formNodes: "forms",
    actorPolicies: "actor-policies",
    fieldPolicies: "field-policies",
    tableColumnPolicies: "table-policies",
    mappingRules: "mapping-rules",
    rollbackPolicy: "rollback-policy",
    finalResultPolicy: "final-result-policy",
    statisticProfile: "statistic-profile",
  };
  const nodeIndexMatch = /^nodes\[(\d+)]/.exec(path);
  const nodeIndex = nodeIndexMatch ? Number(nodeIndexMatch[1]) : -1;
  const explicitNodeId = detailsString(record, "nodeId") ?? detailsString(context, "nodeId");
  const rawControl = detailsString(record, "control") ??
    detailsString(context, "control") ??
    path.split(".").at(-1)?.replace(/\[\d+]$/, "") ??
    null;
  const control = nodeIndex >= 0 && path.includes(".gateway")
    ? "gateway"
    : rawControl;

  return {
    path,
    tab,
    editorId: editorByRoot[root] ?? null,
    canonicalControlId: resolveDynamicFlowCanonicalControlId(path),
    nodeId: explicitNodeId ?? (nodeIndex >= 0 ? payload.nodes[nodeIndex]?.nodeId ?? null : null),
    control,
  };
}

export function validateDynamicFlowWorkspacePayload(
  payload: FlowDefinitionPayloadV2,
): DynamicFlowValidationIssue[] {
  const issues: DynamicFlowValidationIssue[] = [];
  const nodeIds = new Set<string>();
  const nodeCodes = new Set<string>();
  const transitionIds = new Set<string>();
  const edgePairs = new Set<string>();

  if (payload.nodes.length > 200) {
    issues.push({ level: "error", path: "nodes", message: "Số nút vượt giới hạn 200." });
  }
  if (payload.edges.length > 400) {
    issues.push({ level: "error", path: "edges", message: "Số liên kết vượt giới hạn 400." });
  }
  if (payload.formNodes.filter((node) => node.role === "ROOT").length !== 1) {
    issues.push({
      level: "error",
      path: "formNodes",
      message: "Định nghĩa phải có đúng một biểu mẫu gốc.",
    });
  }

  payload.nodes.forEach((node, index) => {
    if (nodeIds.has(node.nodeId)) {
      issues.push({ level: "error", path: `nodes[${index}].nodeId`, message: "ID nút bị trùng." });
    }
    nodeIds.add(node.nodeId);
    const normalizedCode = node.nodeCode.trim().toUpperCase();
    if (nodeCodes.has(normalizedCode)) {
      issues.push({ level: "error", path: `nodes[${index}].nodeCode`, message: "Mã nút bị trùng." });
    }
    nodeCodes.add(normalizedCode);
    if (node.nodeKind === "FORM_STEP" && node.declaredRoles.length === 0) {
      issues.push({
        level: "error",
        path: `nodes[${index}].declaredRoles`,
        message: "Bước biểu mẫu cần ít nhất một vai trò.",
      });
    }
  });

  if (!nodeIds.has(payload.entryStepId)) {
    issues.push({ level: "error", path: "entryStepId", message: "Nút bắt đầu không tồn tại." });
  }

  payload.edges.forEach((edge, index) => {
    if (transitionIds.has(edge.transitionId)) {
      issues.push({
        level: "error",
        path: `edges[${index}].transitionId`,
        message: "ID liên kết bị trùng.",
      });
    }
    transitionIds.add(edge.transitionId);
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
      issues.push({
        level: "error",
        path: `edges[${index}]`,
        message: "Liên kết tham chiếu nút không tồn tại.",
      });
    }
    if (edge.fromNodeId === edge.toNodeId) {
      issues.push({ level: "error", path: `edges[${index}]`, message: "Không cho phép tự nối nút." });
    }
    const pair = `${edge.fromNodeId}\u0000${edge.toNodeId}`;
    if (edgePairs.has(pair)) {
      issues.push({ level: "error", path: `edges[${index}]`, message: "Liên kết bị trùng." });
    }
    edgePairs.add(pair);
  });

  if (payload.nodes.length === 0) {
    issues.push({ level: "warning", path: "nodes", message: "Sơ đồ chưa có nút." });
  }
  if (payload.actorPolicies.length === 0) {
    issues.push({
      level: "warning",
      path: "actorPolicies",
      message: "Chưa khai báo chính sách vai trò.",
    });
  }
  return issues;
}
