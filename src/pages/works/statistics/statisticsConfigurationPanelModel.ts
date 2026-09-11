import type {
  P8AdvancedSummaryOrderingPayload,
  P8AdvancedSummaryTargetPayload,
  P8DiffConfigPayload,
  P8DiffSidePayload,
  P8DynamicFormStatisticLabelSnapshot,
  P8DynamicFormStatisticsReadback,
  P8StatConfigSourceScopePayload,
  P8StatConfigValidationJobStatus,
} from "../../../api/statConfigApi";
import {
  BASIC_OPERATION_OPTIONS,
  type StatConfigSurfaceState,
} from "./statisticsConfigurationModel";

export const SOURCE_SCOPE_OPTIONS = [
  "DIRECT_CHILDREN_OR_SELF",
  "DIRECT_CHILDREN",
  "SELF",
  "FLOW_BRANCH",
  "FLOW_STEP",
  "FLOW_EFFECTIVE_PATH",
  "FLOW_FINAL",
] as const;

export const FLOW_EFFECTIVE_STATUS_OPTIONS = [
  "EFFECTIVE",
  "INVALIDATED",
  "TERMINATED",
  "ANY",
] as const;

export const DATA_TYPES = ["NUMBER", "DATE", "BOOLEAN", "CHOICE", "TEXT"] as const;
export const GROUPING_OPTIONS = ["UNIT", "ASSIGNMENT", "PERIOD"] as const;
export const ORDERING_DIRECTIONS = ["ASC", "DESC"] as const;

export type SourceScopeContract = "BASIC" | "ADVANCED" | "DIFF";
export type SourceScopeMode = (typeof SOURCE_SCOPE_OPTIONS)[number];
export type DataType = (typeof DATA_TYPES)[number];
export type DiffPeriodMode = "EXACT" | "RANGE";

const FLOW_MODES = new Set<SourceScopeMode>([
  "FLOW_BRANCH",
  "FLOW_STEP",
  "FLOW_EFFECTIVE_PATH",
  "FLOW_FINAL",
]);

function hasAsciiControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f)
    );
  });
}

export function canonicalBasicOwnerId(
  assignmentId: string,
  dynamicFormTemplateId: string,
) {
  return `${assignmentId}:${dynamicFormTemplateId}`;
}

export function isFlowSourceScopeMode(
  mode: string | null | undefined,
): mode is SourceScopeMode {
  return FLOW_MODES.has(mode as SourceScopeMode);
}

export function sourceScopeForMode(
  current: P8StatConfigSourceScopePayload | null | undefined,
  mode: SourceScopeMode,
  contract: SourceScopeContract,
): P8StatConfigSourceScopePayload {
  if (!isFlowSourceScopeMode(mode)) {
    return {
      mode,
      flowInstanceId: null,
      flowStepId: null,
      flowBranchId: null,
      flowEffectiveStatus: null,
    };
  }

  const wasFlow = isFlowSourceScopeMode(current?.mode);
  const statusIsAllowed = contract !== "DIFF" || mode !== "FLOW_FINAL";
  return {
    mode,
    flowInstanceId: wasFlow ? current?.flowInstanceId ?? "" : "",
    flowStepId: mode === "FLOW_STEP" && current?.mode === "FLOW_STEP"
      ? current.flowStepId ?? ""
      : mode === "FLOW_STEP"
        ? ""
        : null,
    flowBranchId: mode === "FLOW_BRANCH" && current?.mode === "FLOW_BRANCH"
      ? current.flowBranchId ?? ""
      : mode === "FLOW_BRANCH"
        ? ""
        : null,
    flowEffectiveStatus: statusIsAllowed
      ? wasFlow && current?.flowEffectiveStatus
        ? current.flowEffectiveStatus
        : "EFFECTIVE"
      : null,
  };
}

const isBoundedContractIdentity = (
  value: string | null | undefined,
  maxLength: number,
) => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 &&
    normalized.length <= maxLength &&
    !hasAsciiControlCharacter(normalized);
};

const isCanonicalObjectId = (value: string | null | undefined) =>
  /^[0-9a-f]{24}$/.test(value?.trim() ?? "");

export function sourceScopeValidationIssues(
  scope: P8StatConfigSourceScopePayload | null | undefined,
  contract: SourceScopeContract,
) {
  const issues: string[] = [];
  const mode = scope?.mode as SourceScopeMode | undefined;
  if (!mode || !SOURCE_SCOPE_OPTIONS.includes(mode)) return ["SOURCE_SCOPE_MODE_REQUIRED"];

  if (!isFlowSourceScopeMode(mode)) {
    if (
      scope?.flowInstanceId != null ||
      scope?.flowStepId != null ||
      scope?.flowBranchId != null ||
      scope?.flowEffectiveStatus != null
    ) issues.push("SOURCE_SCOPE_FIELD_NOT_APPLICABLE");
    return issues;
  }

  const instance = scope?.flowInstanceId?.trim();
  if (!instance) issues.push("FLOW_INSTANCE_ID_REQUIRED");
  else if (!isBoundedContractIdentity(instance, 256)) {
    issues.push("FLOW_INSTANCE_ID_INVALID");
  } else if (contract !== "BASIC" && !isCanonicalObjectId(instance)) {
    issues.push("FLOW_INSTANCE_ID_OBJECT_ID_REQUIRED");
  }

  if (mode === "FLOW_STEP") {
    const step = scope?.flowStepId?.trim();
    if (!step) issues.push("FLOW_STEP_ID_REQUIRED");
    else if (!isBoundedContractIdentity(step, 256)) issues.push("FLOW_STEP_ID_INVALID");
  }
  if (mode !== "FLOW_STEP" && scope?.flowStepId != null) {
    issues.push("FLOW_STEP_ID_NOT_ALLOWED");
  }
  if (mode !== "FLOW_BRANCH" && scope?.flowBranchId != null) {
    issues.push("FLOW_BRANCH_ID_NOT_ALLOWED");
  }
  if (mode === "FLOW_BRANCH") {
    const branch = scope?.flowBranchId?.trim();
    if (!branch) issues.push("FLOW_BRANCH_ID_REQUIRED");
    else if (!isBoundedContractIdentity(branch, 256)) {
      issues.push("FLOW_BRANCH_ID_INVALID");
    } else if (contract !== "BASIC" && !isCanonicalObjectId(branch)) {
      issues.push("FLOW_BRANCH_ID_OBJECT_ID_REQUIRED");
    }
  }

  const statusRequired = contract !== "DIFF" || mode !== "FLOW_FINAL";
  if (statusRequired && !FLOW_EFFECTIVE_STATUS_OPTIONS.includes(
    scope?.flowEffectiveStatus as (typeof FLOW_EFFECTIVE_STATUS_OPTIONS)[number],
  )) issues.push("FLOW_EFFECTIVE_STATUS_REQUIRED");
  if (!statusRequired && scope?.flowEffectiveStatus != null) {
    issues.push("FLOW_EFFECTIVE_STATUS_NOT_ALLOWED");
  }
  return issues;
}

export function basicPeriodForMode(mode: "ALL_PERIODS" | "SINGLE_PERIOD" | "PERIOD_RANGE") {
  if (mode === "ALL_PERIODS") {
    return { mode, periodKey: null, periodKeyFrom: null, periodKeyTo: null };
  }
  if (mode === "SINGLE_PERIOD") {
    return { mode, periodKey: "", periodKeyFrom: null, periodKeyTo: null };
  }
  return { mode, periodKey: null, periodKeyFrom: "", periodKeyTo: "" };
}

export function toggleEnumValue(values: readonly string[] | null | undefined, value: string) {
  const current = values ?? [];
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

export function operationOptionsForDataType(dataType: string | null | undefined) {
  return BASIC_OPERATION_OPTIONS[
    (DATA_TYPES.includes(dataType as DataType) ? dataType : "NUMBER") as DataType
  ];
}

export function advancedTargetForDataType(
  target: P8AdvancedSummaryTargetPayload,
  dataType: DataType,
): P8AdvancedSummaryTargetPayload {
  return {
    ...target,
    dataType,
    operation: operationOptionsForDataType(dataType)[0],
  };
}

export function syncOrderingAfterTargetRename(
  ordering: readonly P8AdvancedSummaryOrderingPayload[] | null | undefined,
  previousFieldId: string | null | undefined,
  nextFieldId: string,
) {
  const previous = previousFieldId?.trim();
  if (!previous) return [...(ordering ?? [])];
  if (!nextFieldId.trim()) {
    return (ordering ?? []).filter((item) => item.fieldId !== previous);
  }
  return (ordering ?? []).map((item) => item.fieldId === previous
    ? { ...item, fieldId: nextFieldId }
    : item);
}

export function availableOrderingFieldIds(
  targets: readonly P8AdvancedSummaryTargetPayload[] | null | undefined,
  ordering: readonly P8AdvancedSummaryOrderingPayload[] | null | undefined,
) {
  const used = new Set((ordering ?? []).map((item) => item.fieldId?.trim()).filter(Boolean));
  return (targets ?? [])
    .map((target) => target.fieldId?.trim() ?? "")
    .filter((fieldId, index, all) => fieldId && all.indexOf(fieldId) === index && !used.has(fieldId));
}

function defaultDiffSide(): P8DiffSidePayload {
  return {
    selector: {
      conceptKind: "FIELD",
      conceptKey: "",
      conceptCode: "",
      dataType: "NUMBER",
    },
    period: { mode: "EXACT", periodKey: "", periodKeyFrom: null, periodKeyTo: null },
    sourceScope: sourceScopeForMode(undefined, "DIRECT_CHILDREN_OR_SELF", "DIFF"),
  };
}

export function defaultDiffPayload(): P8DiffConfigPayload {
  return {
    name: "",
    left: defaultDiffSide(),
    right: defaultDiffSide(),
    direction: "LEFT_TO_RIGHT",
    missingPolicy: "REJECT",
    emptyPolicy: "REJECT",
  };
}

export function hydrateDiffPayload(
  payload: P8DiffConfigPayload,
  isVirtualEmpty: boolean,
) {
  return isVirtualEmpty ? defaultDiffPayload() : payload;
}

export function setDiffSharedSelector(
  payload: P8DiffConfigPayload,
  key: "conceptKind" | "conceptCode" | "dataType",
  value: string,
): P8DiffConfigPayload {
  const update = (side: P8DiffSidePayload | null | undefined): P8DiffSidePayload => ({
    ...side,
    selector: { ...side?.selector, [key]: value },
  });
  return {
    ...payload,
    left: update(payload.left),
    right: update(payload.right),
    missingPolicy: key === "dataType" && value !== "NUMBER" && payload.missingPolicy === "AS_ZERO"
      ? "REJECT"
      : payload.missingPolicy,
  };
}

export function setDiffSharedPeriodMode(
  payload: P8DiffConfigPayload,
  mode: DiffPeriodMode,
): P8DiffConfigPayload {
  const period = mode === "EXACT"
    ? { mode, periodKey: "", periodKeyFrom: null, periodKeyTo: null }
    : { mode, periodKey: null, periodKeyFrom: "", periodKeyTo: "" };
  return {
    ...payload,
    left: { ...payload.left, period: { ...period } },
    right: { ...payload.right, period: { ...period } },
  };
}

export function setDiffSharedSourceScope(
  payload: P8DiffConfigPayload,
  sourceScope: P8StatConfigSourceScopePayload,
): P8DiffConfigPayload {
  return {
    ...payload,
    left: { ...payload.left, sourceScope: { ...sourceScope } },
    right: { ...payload.right, sourceScope: { ...sourceScope } },
  };
}

const required = (value: string | null | undefined) => Boolean(value?.trim());
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;

export function diffDraftValidationIssues(payload: P8DiffConfigPayload) {
  const issues: string[] = [];
  if (!required(payload.name)) issues.push("NAME_REQUIRED");
  else if (!isBoundedContractIdentity(payload.name, 200)) issues.push("NAME_INVALID");
  const left = payload.left;
  const right = payload.right;
  if (!left || !right) return [...issues, "DIFF_SIDES_REQUIRED"];

  for (const [sideName, side] of [["LEFT", left], ["RIGHT", right]] as const) {
    if (!required(side.selector?.conceptKey)) issues.push(`${sideName}_CONCEPT_KEY_REQUIRED`);
    else if (!isBoundedContractIdentity(side.selector?.conceptKey, 256)) {
      issues.push(`${sideName}_CONCEPT_KEY_INVALID`);
    }
    if (!required(side.selector?.conceptCode)) issues.push(`${sideName}_CONCEPT_CODE_REQUIRED`);
    else if (!CODE_PATTERN.test(side.selector?.conceptCode?.trim() ?? "")) {
      issues.push(`${sideName}_CONCEPT_CODE_INVALID`);
    }
    const kind = side.selector?.conceptKind;
    const key = side.selector?.conceptKey?.trim() ?? "";
    if ((kind === "TABLE_METRIC" || kind === "ROW_LABEL") && (
      !key.includes(":") || key.startsWith(":") || key.endsWith(":") ||
      kind === "ROW_LABEL" && key.indexOf(":") !== key.lastIndexOf(":")
    )) issues.push(`${sideName}_CONCEPT_KEY_INVALID`);

    if (side.period?.mode === "EXACT") {
      if (!required(side.period.periodKey)) issues.push(`${sideName}_PERIOD_KEY_REQUIRED`);
      else if (!isBoundedContractIdentity(side.period.periodKey, 128)) {
        issues.push(`${sideName}_PERIOD_KEY_INVALID`);
      }
    } else if (side.period?.mode === "RANGE") {
      if (!required(side.period.periodKeyFrom)) issues.push(`${sideName}_PERIOD_FROM_REQUIRED`);
      else if (!isBoundedContractIdentity(side.period.periodKeyFrom, 128)) {
        issues.push(`${sideName}_PERIOD_FROM_INVALID`);
      }
      if (!required(side.period.periodKeyTo)) issues.push(`${sideName}_PERIOD_TO_REQUIRED`);
      else if (!isBoundedContractIdentity(side.period.periodKeyTo, 128)) {
        issues.push(`${sideName}_PERIOD_TO_INVALID`);
      }
      if (
        required(side.period.periodKeyFrom) &&
        required(side.period.periodKeyTo) &&
        (side.period.periodKeyFrom ?? "").trim() > (side.period.periodKeyTo ?? "").trim()
      ) issues.push(`${sideName}_PERIOD_RANGE_INVALID`);
    } else issues.push(`${sideName}_PERIOD_MODE_REQUIRED`);
  }

  if (left.selector?.conceptKind !== right.selector?.conceptKind) issues.push("DIFF_CONCEPT_KIND_MISMATCH");
  if (left.selector?.conceptCode !== right.selector?.conceptCode) issues.push("DIFF_CONCEPT_MISMATCH");
  if (left.selector?.dataType !== right.selector?.dataType) issues.push("DIFF_DATA_TYPE_MISMATCH");
  if (left.period?.mode !== right.period?.mode) issues.push("DIFF_PERIOD_MODE_MISMATCH");
  if (JSON.stringify(left.sourceScope) !== JSON.stringify(right.sourceScope)) {
    issues.push("DIFF_SOURCE_SCOPE_MISMATCH");
  }
  issues.push(...sourceScopeValidationIssues(left.sourceScope, "DIFF"));
  if (payload.missingPolicy === "AS_ZERO" && left.selector?.dataType !== "NUMBER") {
    issues.push("DIFF_MISSING_POLICY_INCOMPATIBLE");
  }
  return [...new Set(issues)];
}

type DynamicFormClassificationReadback = {
  tagCodes?: unknown;
  schema?: {
    sections?: unknown;
    fields?: unknown;
    blocks?: unknown;
  } | null;
};

const classificationTagCodes = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export function dynamicFormClassificationCodes(
  detail: DynamicFormClassificationReadback | null | undefined,
) {
  if (!detail) return [];
  const sources: unknown[] = [detail.tagCodes];
  for (const collection of [
    detail.schema?.sections,
    detail.schema?.fields,
    detail.schema?.blocks,
  ]) {
    if (!Array.isArray(collection)) continue;
    for (const item of collection) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        sources.push((item as Record<string, unknown>).tagCodes);
      }
    }
  }

  const seen = new Set<string>();
  return sources.flatMap(classificationTagCodes).filter((code) => {
    const normalized = code.toLocaleUpperCase("en-US");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
export function isDynamicFormVirtualReadback(form: P8DynamicFormStatisticsReadback) {
  return form.configId === form.ownerId &&
    form.versionId === form.ownerId &&
    form.versionNo === 1 &&
    form.revision === 1;
}

export function isReadinessTerminal(status: string | null | undefined) {
  return status === "DONE" || status === "FAILED" || status === "CANCELLED";
}

export function readinessSurfaceState(
  status: P8StatConfigValidationJobStatus["status"],
): StatConfigSurfaceState {
  switch (status) {
    case "QUEUED":
    case "RUNNING":
      return "LOADING";
    case "RETRYING":
    case "RESET":
      return "RETRYING";
    case "DONE":
      return "SUCCESS";
    case "FAILED":
    case "CANCELLED":
      return "ERROR";
    default:
      return "UNSUPPORTED";
  }
}

export type PinnedLabelLayers = Record<
  "field" | "metric" | "row",
  P8DynamicFormStatisticLabelSnapshot[]
>;

const uniqueSnapshots = (items: P8DynamicFormStatisticLabelSnapshot[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.labelId}:${item.versionId}:${item.configHash}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function pinnedLabelLayers(form: P8DynamicFormStatisticsReadback): PinnedLabelLayers {
  const fieldSnapshots = form.fields.flatMap((field) => field.labelSnapshots ?? []);
  const metricSnapshots = form.tableConfig.flatMap((table) =>
    table.metricLabelTargets.map((target) => target.labelSnapshot));
  const rowSnapshots = form.tableConfig.flatMap((table) => table.rowLabelSnapshots ?? []);
  return {
    field: uniqueSnapshots(fieldSnapshots.filter((item) => item.usage === "STATISTIC")),
    metric: uniqueSnapshots(metricSnapshots),
    row: uniqueSnapshots(rowSnapshots),
  };
}
