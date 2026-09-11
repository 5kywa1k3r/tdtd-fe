export const SUPPORTED_RUNTIME_ARCHETYPES = [
  "FLOW-T01",
  "FLOW-T02",
  "FLOW-T03",
  "FLOW-T04",
  "FLOW-T05",
  "FLOW-T06",
  "FLOW-T07",
  "FLOW-T08",
  "FLOW-T09",
  "FLOW-T10",
  "FLOW-T11",
  "FLOW-T12",
] as const;

export type SupportedRuntimeArchetype = (typeof SUPPORTED_RUNTIME_ARCHETYPES)[number];

export type DynamicFlowLaunchDraft = {
  flowTemplateVersionId: string;
  targetUnitIds: string[];
  periodKey: string;
  scheduleIdentityJson: string;
};

export type DynamicFlowLaunchPhase =
  | "EDITING"
  | "PREFLIGHTING"
  | "PREVIEW"
  | "CONFIRMING"
  | "RETRYING"
  | "STALE"
  | "SUCCESS";

const DYNAMIC_FLOW_LAUNCH_PHASES: readonly DynamicFlowLaunchPhase[] = [
  "EDITING",
  "PREFLIGHTING",
  "PREVIEW",
  "CONFIRMING",
  "RETRYING",
  "STALE",
  "SUCCESS",
];

export type DynamicFlowLaunchIntent<TPreview = unknown, TConfirmRequest = unknown> = {
  workId: string;
  actorUserId: string;
  commandId: string;
  draft: DynamicFlowLaunchDraft;
  phase: DynamicFlowLaunchPhase;
  preview?: TPreview;
  confirmRequest?: TConfirmRequest;
};

export type RuntimeStatePresentation = {
  label: string;
  tone: "info" | "success" | "warning" | "error" | "neutral";
  icon: "pending" | "active" | "partial" | "retrying" | "reconciled" | "failed" | "completed";
};

export type RuntimeErrorPresentation = {
  kind: "forbidden" | "missing" | "stale" | "locked" | "unsupported" | "error";
  message: string;
};

const RUNTIME_STATE_TEXT_COLORS: Record<RuntimeStatePresentation["tone"], string> = {
  info: "#0d47a1",
  success: "#1b5e20",
  warning: "#7c2d12",
  error: "#b71c1c",
  neutral: "#334155",
};

const DEFAULT_SCHEDULE_IDENTITY = "{}";

function runtimeRandomSuffix() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createDynamicFlowRuntimeCommandId() {
  return `flow-runtime-${runtimeRandomSuffix()}`;
}

export function buildDynamicFlowForwardRequest(
  instanceRevision: number,
  stepRevision: number,
  commandId = createDynamicFlowRuntimeCommandId(),
) {
  if (!Number.isInteger(instanceRevision) || instanceRevision < 0) {
    throw new Error("DYNAMIC_FLOW_FORWARD_INSTANCE_REVISION_INVALID");
  }
  if (!Number.isInteger(stepRevision) || stepRevision < 0) {
    throw new Error("DYNAMIC_FLOW_FORWARD_STEP_REVISION_INVALID");
  }
  return {
    commandId,
    expectedInstanceRevision: instanceRevision,
    expectedStepRevision: stepRevision,
  };
}

export function buildDynamicFlowSubflowLaunchRequest(
  instanceRevision: number,
  stepRevision: number,
  commandId = createDynamicFlowRuntimeCommandId(),
) {
  if (!Number.isInteger(instanceRevision) || instanceRevision < 0) {
    throw new Error("DYNAMIC_FLOW_SUBFLOW_INSTANCE_REVISION_INVALID");
  }
  if (!Number.isInteger(stepRevision) || stepRevision < 0) {
    throw new Error("DYNAMIC_FLOW_SUBFLOW_STEP_REVISION_INVALID");
  }
  return {
    commandId,
    expectedParentInstanceRevision: instanceRevision,
    expectedParentStepRevision: stepRevision,
  };
}

export function buildDynamicFlowEpochCommandRequest(
  executionEpoch: number,
  instanceRevision: number,
  checkpointNodeId?: string | null,
  commandId = createDynamicFlowRuntimeCommandId(),
) {
  if (!Number.isInteger(executionEpoch) || executionEpoch < 1) {
    throw new Error("DYNAMIC_FLOW_EPOCH_INVALID");
  }
  if (!Number.isInteger(instanceRevision) || instanceRevision < 0) {
    throw new Error("DYNAMIC_FLOW_EPOCH_REVISION_INVALID");
  }
  return {
    commandId,
    expectedExecutionEpoch: executionEpoch,
    expectedInstanceRevision: instanceRevision,
    checkpointNodeId: checkpointNodeId ?? null,
  };
}

export function emptyDynamicFlowLaunchDraft(): DynamicFlowLaunchDraft {
  return {
    flowTemplateVersionId: "",
    targetUnitIds: [],
    periodKey: "",
    scheduleIdentityJson: DEFAULT_SCHEDULE_IDENTITY,
  };
}

export function normalizeDynamicFlowLaunchDraft(
  draft: DynamicFlowLaunchDraft,
): DynamicFlowLaunchDraft {
  return {
    flowTemplateVersionId: draft.flowTemplateVersionId.trim(),
    targetUnitIds: draft.targetUnitIds
      .map((value) => value.trim())
      .filter((value, index, all) => Boolean(value) && all.indexOf(value) === index),
    periodKey: draft.periodKey.trim(),
    scheduleIdentityJson: draft.scheduleIdentityJson.trim() || DEFAULT_SCHEDULE_IDENTITY,
  };
}

export function validateDynamicFlowLaunchDraft(draft: DynamicFlowLaunchDraft) {
  const normalized = normalizeDynamicFlowLaunchDraft(draft);
  const errors: Partial<Record<keyof DynamicFlowLaunchDraft, string>> = {};

  if (!normalized.flowTemplateVersionId) {
    errors.flowTemplateVersionId = "Hãy nhập chính xác phiên bản Flow đã khóa.";
  }
  if (normalized.targetUnitIds.length === 0) {
    errors.targetUnitIds = "Hãy chọn ít nhất một đơn vị đích.";
  }
  if (!normalized.periodKey) {
    errors.periodKey = "Hãy nhập kỳ thực hiện.";
  }

  try {
    const value: unknown = JSON.parse(normalized.scheduleIdentityJson);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.scheduleIdentityJson = "Định danh lịch phải là một JSON object.";
    }
  } catch {
    errors.scheduleIdentityJson = "Định danh lịch không phải JSON hợp lệ.";
  }

  return errors;
}

export function hasDynamicFlowLaunchErrors(
  errors: Partial<Record<keyof DynamicFlowLaunchDraft, string>>,
) {
  return Object.values(errors).some(Boolean);
}

export function buildDynamicFlowPreflightRequest(
  draft: DynamicFlowLaunchDraft,
  commandId: string,
) {
  const normalized = normalizeDynamicFlowLaunchDraft(draft);
  return {
    flowTemplateVersionId: normalized.flowTemplateVersionId,
    commandId,
    targetUnitIds: normalized.targetUnitIds,
    periodKey: normalized.periodKey,
    scheduleIdentityJson: normalized.scheduleIdentityJson,
  };
}

export function buildDynamicFlowConfirmRequest<
  T extends ReturnType<typeof buildDynamicFlowPreflightRequest>,
>(request: T, snapshotToken: string) {
  return {
    ...request,
    snapshotToken,
  };
}

export function isSameDynamicFlowConfirmRequest(
  left: ReturnType<typeof buildDynamicFlowConfirmRequest>,
  right: ReturnType<typeof buildDynamicFlowConfirmRequest>,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function dynamicFlowLaunchSessionKey(workId: string, actorUserId: string) {
  return `p5-flow-runtime:${encodeURIComponent(actorUserId)}:${encodeURIComponent(workId)}`;
}

export function saveDynamicFlowLaunchIntent(
  storage: Pick<Storage, "setItem">,
  intent: DynamicFlowLaunchIntent,
) {
  storage.setItem(
    dynamicFlowLaunchSessionKey(intent.workId, intent.actorUserId),
    JSON.stringify(intent),
  );
}

export function loadDynamicFlowLaunchIntent(
  storage: Pick<Storage, "getItem">,
  workId: string,
  actorUserId: string,
): DynamicFlowLaunchIntent | null {
  const raw = storage.getItem(dynamicFlowLaunchSessionKey(workId, actorUserId));
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<DynamicFlowLaunchIntent>;
    if (
      candidate.workId !== workId ||
      candidate.actorUserId !== actorUserId ||
      typeof candidate.commandId !== "string" ||
      !candidate.commandId ||
      !candidate.draft ||
      typeof candidate.draft !== "object" ||
      typeof candidate.phase !== "string" ||
      !DYNAMIC_FLOW_LAUNCH_PHASES.includes(candidate.phase as DynamicFlowLaunchPhase)
    ) {
      return null;
    }
    return candidate as DynamicFlowLaunchIntent;
  } catch {
    return null;
  }
}

export function clearDynamicFlowLaunchIntent(
  storage: Pick<Storage, "removeItem">,
  workId: string,
  actorUserId: string,
) {
  storage.removeItem(dynamicFlowLaunchSessionKey(workId, actorUserId));
}

export function isRuntimeCapabilityEnabled(value: unknown): value is true {
  return value === true;
}

export function isSupportedRuntimeArchetype(value: unknown): value is SupportedRuntimeArchetype {
  return (
    typeof value === "string" &&
    (SUPPORTED_RUNTIME_ARCHETYPES as readonly string[]).includes(value)
  );
}

export function runtimeStatePresentation(state: string): RuntimeStatePresentation {
  switch (state.trim().toUpperCase()) {
    case "ACTIVE":
    case "APPROVED":
    case "WAITING_CHILD":
      return { label: state.trim().toUpperCase(), tone: "success", icon: "active" };
    case "ASSIGNED":
      return { label: "ASSIGNED \u2014 \u0110\u00e3 giao", tone: "success", icon: "active" };
    case "IN_PROGRESS":
      return { label: "IN_PROGRESS \u2014 \u0110ang th\u1ef1c hi\u1ec7n", tone: "success", icon: "active" };
    case "RETURNED":
      return { label: "RETURNED \u2014 B\u1ecb tr\u1ea3 l\u1ea1i", tone: "warning", icon: "partial" };
    case "SUBMITTED":
      return { label: "SUBMITTED \u2014 \u0110\u00e3 g\u1eedi", tone: "success", icon: "active" };
    case "PARTIAL":
      return { label: "PARTIAL — hoàn tất một phần", tone: "warning", icon: "partial" };
    case "RETRYING":
      return { label: "RETRYING — đang thử lại cùng lệnh", tone: "info", icon: "retrying" };
    case "RECONCILED":
      return { label: "RECONCILED — đã đối soát", tone: "success", icon: "reconciled" };
    case "IMPOSSIBLE":
      return { label: "IMPOSSIBLE — không thể đạt quorum", tone: "error", icon: "failed" };
    case "CANCELLED_BY_GATEWAY":
      return { label: "CANCELLED_BY_GATEWAY — gateway đã đóng nhánh", tone: "warning", icon: "partial" };
    case "LATE_IGNORED":
      return { label: "LATE_IGNORED — chỉ ghi audit", tone: "neutral", icon: "reconciled" };
    case "MISSED":
      return { label: "MISSED — kỳ chạy đã được ghi audit", tone: "warning", icon: "partial" };
    case "LAUNCHED":
      return { label: "LAUNCHED — đã tạo đúng một instance", tone: "success", icon: "active" };
    case "LAUNCHING":
      return { label: "LAUNCHING — đang giữ lease", tone: "info", icon: "pending" };
    case "COLLECTING":
      return { label: "COLLECTING — đang chờ contribution", tone: "info", icon: "pending" };
    case "SATISFIED":
      return { label: "SATISFIED — đã đạt quorum", tone: "success", icon: "completed" };
    case "FAILED":
      return { label: "FAILED — xử lý thất bại", tone: "error", icon: "failed" };
    case "COMPLETED":
      return { label: "COMPLETED — đã hoàn tất", tone: "success", icon: "completed" };
    case "FINALIZED":
      return { label: "FINALIZED — epoch đã chốt, không thể đảo ngược", tone: "success", icon: "completed" };
    case "INVALIDATED":
      return { label: "INVALIDATED — lịch sử không còn canonical", tone: "warning", icon: "partial" };
    case "ROLLED_BACK":
      return { label: "ROLLED_BACK — đã mở execution epoch mới", tone: "warning", icon: "partial" };
    case "RESTARTED":
      return { label: "RESTARTED — đã khởi động lại từ checkpoint", tone: "info", icon: "retrying" };
    case "TERMINATED":
      return { label: "TERMINATED — scope đã đóng", tone: "neutral", icon: "completed" };
    case "PENDING":
    case "MATERIALIZING":
      return { label: `${state.trim().toUpperCase()} — đang xử lý`, tone: "info", icon: "pending" };
    default:
      return { label: `${state || "UNKNOWN"} — chỉ đọc`, tone: "neutral", icon: "pending" };
  }
}

export function runtimeStateTextColor(state: string) {
  return RUNTIME_STATE_TEXT_COLORS[runtimeStatePresentation(state).tone];
}

function readErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function readErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return "";
  const direct = (error as { errorCode?: unknown }).errorCode;
  const data = (error as { data?: unknown }).data;
  if (typeof direct === "string") return direct;
  if (data && typeof data === "object") {
    const nested = (data as { errorCode?: unknown; code?: unknown }).errorCode ??
      (data as { code?: unknown }).code;
    return typeof nested === "string" ? nested : "";
  }
  return "";
}

export function runtimeErrorPresentation(error: unknown): RuntimeErrorPresentation {
  const status = readErrorStatus(error);
  const code = readErrorCode(error).toUpperCase();

  if (status === 403) {
    return { kind: "forbidden", message: "Bạn không có quyền xem tài nguyên Flow này." };
  }
  if (status === 404) {
    return { kind: "missing", message: "Không tìm thấy tài nguyên hoặc tài nguyên không hiển thị." };
  }
  if (status === 409 || code.includes("STALE") || code.includes("REVISION_CONFLICT")) {
    return {
      kind: "stale",
      message: "Dữ liệu Flow đã cũ hoặc xung đột phiên bản. Hãy làm mới trạng thái trước khi tiếp tục.",
    };
  }
  if (status === 423 || code.includes("LOCKED")) {
    return { kind: "locked", message: "Tài nguyên đang bị khóa và chỉ có thể xem." };
  }
  if (status === 501 || code.includes("UNSUPPORTED")) {
    return {
      kind: "unsupported",
      message: "Khả năng này chưa được mở trong prompt P6 hiện tại.",
    };
  }
  return { kind: "error", message: "Không thể tải dữ liệu Flow. Hãy thử lại." };
}
