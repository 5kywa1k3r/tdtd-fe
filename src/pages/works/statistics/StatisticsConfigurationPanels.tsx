import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { dynamicFormPath } from "../../../routes/dynamicFormRoutes";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useGetMeQuery } from "../../../api/base/meApi";
import { useGetDynamicFormQuery } from "../../../api/dynamicFormApi";
import {
  useArchiveP8AdvancedSummaryConfigMutation,
  useCreateNextP8AdvancedSummaryDraftMutation,
  useCreateNextP8BasicSummaryDraftMutation,
  useCreateNextP8DiffDraftMutation,
  useEnqueueStatConfigReadinessMutation,
  useGetEmptyStatConfigBundleQuery,
  useGetP8AdvancedSummaryConfigQuery,
  useGetP8BasicSummaryConfigQuery,
  useGetP8DiffConfigQuery,
  useGetP8DynamicFormStatisticsQuery,
  useGetStatConfigReadinessQuery,
  useLockP8AdvancedSummaryConfigMutation,
  useLockP8BasicSummaryConfigMutation,
  useLockP8DiffConfigMutation,
  usePutP8AdvancedSummaryConfigMutation,
  usePutP8BasicSummaryConfigMutation,
  usePutP8DiffConfigMutation,
  useValidateStatConfigBundleMutation,
  type P8AdvancedSummaryConfigPayload,
  type P8AdvancedSummaryConfigReadback,
  type P8BasicSummaryConfigPayload,
  type P8BasicSummaryConfigReadback,
  type P8DiffConfigPayload,
  type P8DiffConfigReadback,
  type P8StatConfigIdentity,
  type P8StatConfigPermissionSet,
  type P8StatConfigSourceScopePayload,
} from "../../../api/statConfigApi";
import { Role } from "../../../constants/roles";
import {
  apiErrorStatus,
  createStatConfigEmptyEnvelope,
  createStatConfigEnvelope,
  DIFF_CONCEPT_KINDS,
  isStatConfigStaleConflict,
  resolveStatConfigSurfaceState,
} from "./statisticsConfigurationModel";
import {
  advancedTargetForDataType,
  availableOrderingFieldIds,
  basicPeriodForMode,
  canonicalBasicOwnerId,
  dynamicFormClassificationCodes,
  DATA_TYPES,
  defaultDiffPayload,
  diffDraftValidationIssues,
  FLOW_EFFECTIVE_STATUS_OPTIONS,
  GROUPING_OPTIONS,
  hydrateDiffPayload,
  isDynamicFormVirtualReadback,
  isFlowSourceScopeMode,
  isReadinessTerminal,
  operationOptionsForDataType,
  ORDERING_DIRECTIONS,
  pinnedLabelLayers,
  readinessSurfaceState,
  setDiffSharedPeriodMode,
  setDiffSharedSelector,
  setDiffSharedSourceScope,
  SOURCE_SCOPE_OPTIONS,
  sourceScopeForMode,
  sourceScopeValidationIssues,
  syncOrderingAfterTargetRename,
  toggleEnumValue,
  type DataType,
  type DiffPeriodMode,
  type SourceScopeContract,
  type SourceScopeMode,
} from "./statisticsConfigurationPanelModel";
import { StatConfigReadbackCard } from "./StatConfigReadbackCard";
import { StatConfigSurfaceStateView } from "./StatConfigSurfaceState";

type OwnerRoute = {
  assignmentId: string;
  dynamicFormTemplateId: string;
};

function hasAsciiControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f)
    );
  });
}

function isBoundedIdentity(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 &&
    normalized.length <= maxLength &&
    !hasAsciiControlCharacter(normalized);
}
type MutationFeedback = {
  kind: "success" | "error" | "conflict";
  text: string;
} | null;

function mutationErrorText(error: unknown) {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const data = record.data && typeof record.data === "object"
      ? record.data as Record<string, unknown>
      : record;
    const detail = data.message ?? data.errorCode ?? data.code;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  return "Máy chủ từ chối yêu cầu cấu hình.";
}

function feedbackForError(error: unknown): MutationFeedback {
  return isStatConfigStaleConflict(error)
    ? {
        kind: "conflict",
        text: "STALE_CONFLICT: revision hoặc config hash đã đổi. Draft local vẫn được giữ; hãy tải lại rồi rebase.",
      }
    : { kind: "error", text: mutationErrorText(error) };
}

function FeedbackAlert({ feedback }: { feedback: MutationFeedback }) {
  if (!feedback) return null;
  return (
    <Alert
      severity={feedback.kind === "success" ? "success" : feedback.kind === "conflict" ? "warning" : "error"}
      role={feedback.kind === "error" ? "alert" : "status"}
      aria-live={feedback.kind === "error" ? "assertive" : "polite"}
      data-state={feedback.kind === "conflict" ? "STALE_CONFLICT" : feedback.kind === "success" ? "SUCCESS" : "ERROR"}
    >
      {feedback.text}
    </Alert>
  );
}

function queryState(
  query: { isLoading: boolean; isFetching: boolean; isError: boolean; error?: unknown },
  readback?: {
    identity: P8StatConfigIdentity;
    permissions: P8StatConfigPermissionSet;
    isVirtualEmpty: boolean;
    runtimeEligibility?: string;
  },
  conflict = false,
) {
  return resolveStatConfigSurfaceState({
    loading: query.isLoading || (query.isFetching && !readback),
    errorStatus: query.isError ? apiErrorStatus(query.error) ?? 500 : null,
    unsupported: Boolean(readback?.runtimeEligibility?.includes("UNSUPPORTED")),
    staleConflict: conflict,
    empty: readback?.isVirtualEmpty,
    locked: readback?.identity.status === "LOCKED",
    canManageDraft: readback?.permissions.canManageDraft,
  });
}

function SourceScopeFields({
  value,
  editable,
  contract,
  onChange,
}: {
  value: P8StatConfigSourceScopePayload | null | undefined;
  editable: boolean;
  contract: SourceScopeContract;
  onChange: (value: P8StatConfigSourceScopePayload) => void;
}) {
  const mode = (value?.mode ?? "DIRECT_CHILDREN_OR_SELF") as SourceScopeMode;
  const isFlow = isFlowSourceScopeMode(mode);
  const showStatus = isFlow && (contract !== "DIFF" || mode !== "FLOW_FINAL");
  const issues = sourceScopeValidationIssues(value, contract);
  const update = (patch: Partial<P8StatConfigSourceScopePayload>) =>
    onChange({ ...value, ...patch });

  return (
    <Box
      component="fieldset"
      sx={{
        border: 0,
        p: 0,
        m: 0,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
        gap: 1.5,
        minWidth: 0,
      }}
    >
      <Typography component="legend" variant="subtitle2" sx={{ gridColumn: "1 / -1" }}>
        Phạm vi nguồn
      </Typography>
      <TextField
        select
        fullWidth
        label="Phạm vi nguồn"
        value={mode}
        disabled={!editable}
        onChange={(event) => onChange(sourceScopeForMode(
          value,
          event.target.value as SourceScopeMode,
          contract,
        ))}
      >
        {SOURCE_SCOPE_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
      {isFlow ? (
        <TextField
          fullWidth
          label="Flow instance ID"
          value={value?.flowInstanceId ?? ""}
          disabled={!editable}
          error={issues.some((item) => item.startsWith("FLOW_INSTANCE_ID"))}
          onChange={(event) => update({ flowInstanceId: event.target.value })}
        />
      ) : null}
      {mode === "FLOW_STEP" ? (
        <TextField
          fullWidth
          label="Flow step ID"
          value={value?.flowStepId ?? ""}
          disabled={!editable}
          error={issues.some((item) => item.startsWith("FLOW_STEP_ID"))}
          onChange={(event) => update({ flowStepId: event.target.value })}
        />
      ) : null}
      {mode === "FLOW_BRANCH" ? (
        <TextField
          fullWidth
          label="Flow branch ID"
          value={value?.flowBranchId ?? ""}
          disabled={!editable}
          error={issues.some((item) => item.startsWith("FLOW_BRANCH_ID"))}
          onChange={(event) => update({ flowBranchId: event.target.value })}
        />
      ) : null}
      {showStatus ? (
        <TextField
          select
          fullWidth
          label="Trạng thái flow"
          value={value?.flowEffectiveStatus ?? "EFFECTIVE"}
          disabled={!editable}
          error={issues.includes("FLOW_EFFECTIVE_STATUS_REQUIRED")}
          onChange={(event) => update({ flowEffectiveStatus: event.target.value })}
        >
          {FLOW_EFFECTIVE_STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>{status}</MenuItem>
          ))}
        </TextField>
      ) : null}
    </Box>
  );
}

function ConfigActions({
  identity,
  permissions,
  busy,
  dirty,
  isVirtualEmpty = false,
  allowNextFromArchived = false,
  saveDisabled = false,
  onSave,
  onLock,
  onNextDraft,
  onArchive,
}: {
  identity: P8StatConfigIdentity;
  permissions: P8StatConfigPermissionSet;
  busy: boolean;
  dirty: boolean;
  isVirtualEmpty?: boolean;
  allowNextFromArchived?: boolean;
  saveDisabled?: boolean;
  onSave: () => void;
  onLock: () => void;
  onNextDraft: () => void;
  onArchive?: () => void;
}) {
  const isDraft = identity.status === "DRAFT";
  const isLocked = identity.status === "LOCKED";
  const isArchived = identity.status === "ARCHIVED";
  const canCreateNext = isLocked || (allowNextFromArchived && isArchived);
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
      {isDraft && permissions.canManageDraft ? (
        <Button variant="contained" disabled={busy || (!dirty && !isVirtualEmpty) || saveDisabled} onClick={onSave}>
          Lưu draft cấu hình
        </Button>
      ) : null}
      {isDraft && !isVirtualEmpty && permissions.canLockVersion ? (
        <Button variant="outlined" disabled={busy || dirty} onClick={onLock}>
          Khóa version
        </Button>
      ) : null}
      {canCreateNext && !isVirtualEmpty && permissions.canManageDraft ? (
        <Button variant="contained" disabled={busy} onClick={onNextDraft}>
          Tạo draft kế tiếp
        </Button>
      ) : null}
      {onArchive && isLocked && !isVirtualEmpty && permissions.canManageDraft ? (
        <Button color="warning" variant="text" disabled={busy || dirty} onClick={onArchive}>
          Lưu trữ cấu hình
        </Button>
      ) : null}
    </Stack>
  );
}

function VersionStrip({
  versions,
}: {
  versions: Array<{ versionNo: number; status: string; configHash: string }>;
}) {
  return (
    <Stack component="section" aria-label="Các version cấu hình" spacing={1}>
      <Typography variant="subtitle2">Lịch sử version</Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {versions.length ? versions.map((version) => (
          <Chip
            key={`${version.versionNo}:${version.configHash}`}
            size="small"
            variant="outlined"
            label={`v${version.versionNo} · ${version.status}`}
            title={version.configHash}
          />
        )) : <Typography variant="body2" color="text.secondary">Chưa có version đã lưu.</Typography>}
      </Stack>
    </Stack>
  );
}

export function StatisticsOverviewPanel({ route }: { route: OwnerRoute }) {
  const ownerId = canonicalBasicOwnerId(route.assignmentId, route.dynamicFormTemplateId);
  const bundleQuery = useGetEmptyStatConfigBundleQuery({
    ownerKind: "BASIC_SUMMARY",
    ownerId,
  });
  const [validateBundle, validateState] = useValidateStatConfigBundleMutation();
  const [feedback, setFeedback] = useState<MutationFeedback>(null);
  const bundle = bundleQuery.data;
  const state = resolveStatConfigSurfaceState({
    loading: bundleQuery.isLoading,
    errorStatus: bundleQuery.isError ? apiErrorStatus(bundleQuery.error) ?? 500 : null,
    empty: bundle?.isEmpty,
    unsupported: bundle?.eligibility.configuration === "UNSUPPORTED",
  });

  const validate = async () => {
    if (!bundle || !bundle.isEmpty) return;
    try {
      await validateBundle({
        commandId: `p8-ui-empty-bundle-${Date.now().toString(36)}`,
        expectedBundleHash: bundle.bundleHash,
        bundle: { ownerKind: bundle.ownerKind, ownerId: bundle.ownerId },
      }).unwrap();
      setFeedback({
        kind: "success",
        text: "EMPTY bundle validation đã xác nhận canonical owner và bundle hash; đây không phải full dependency bundle.",
      });
    } catch (error) {
      setFeedback(feedbackForError(error));
    }
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        <AlertTitle>Configuration-only workspace</AlertTitle>
        Các owner dưới đây chỉ quản lý metadata, version, hash và readiness. Kết quả nghiệp vụ thuộc phase kế tiếp và không được gọi từ trang này.
      </Alert>
      <StatConfigSurfaceStateView state={state} compact />
      {bundle ? (
        <Paper variant="outlined" sx={{ p: 2 }} component="section" aria-label="Canonical EMPTY bundle readback">
          <Stack spacing={1.5}>
            <Typography fontWeight={800}>STAT_CONFIG_EMPTY_BUNDLE_READBACK</Typography>
            <Alert severity="info">
              Endpoint này chỉ mô tả EMPTY bundle của canonical Basic owner. Pins bằng 0 không phải bằng chứng cho full dependency pins.
            </Alert>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`Schema ${bundle.schemaVersion}`} />
              <Chip label={`Freshness: ${bundle.freshness}`} />
              <Chip label={`Configuration: ${bundle.eligibility.configuration}`} />
              <Chip label={`Future result: ${bundle.eligibility.futureResult}`} />
              <Chip label={`Executor: ${bundle.eligibility.executor}`} />
            </Stack>
            <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
              <strong>EMPTY bundle hash:</strong> {bundle.bundleHash}
            </Typography>
            <Typography variant="body2">EMPTY pins: {bundle.pins.length}</Typography>
            <Button
              sx={{ alignSelf: "flex-start" }}
              variant="outlined"
              disabled={validateState.isLoading || !bundle.isEmpty}
              onClick={() => void validate()}
            >
              Xác thực EMPTY bundle
            </Button>
          </Stack>
        </Paper>
      ) : null}
      <FeedbackAlert feedback={feedback} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
        {[
          ["1. Nhãn phân loại", "CLASSIFICATION dùng để mô tả taxonomy nghiệp vụ."],
          ["2. Nhãn trường thống kê", "STATISTIC gắn vào field có kiểu và phép tổng hợp tương thích."],
          ["3. Nhãn metric bảng", "TABLE_TARGET gắn bằng metricKey ổn định, không dùng tọa độ ô."],
          ["4. Nhãn dòng runtime", "TABLE_TARGET allowlist giới hạn row-label code được chấp nhận."],
        ].map(([title, detail]) => (
          <Paper key={title} variant="outlined" sx={{ p: 1.5 }}>
            <Typography fontWeight={750}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{detail}</Typography>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}

export function LabelsAndFormPanel({ dynamicFormTemplateId }: { dynamicFormTemplateId: string }) {
  const formQuery = useGetP8DynamicFormStatisticsQuery({ id: dynamicFormTemplateId });
  const formDetailQuery = useGetDynamicFormQuery({ id: dynamicFormTemplateId });
  const form = formQuery.data;
  const layers = useMemo(() => form ? pinnedLabelLayers(form) : {
    field: [],
    metric: [],
    row: [],
  }, [form]);
  const classificationCodes = dynamicFormClassificationCodes(formDetailQuery.data);
  const virtual = Boolean(form && isDynamicFormVirtualReadback(form));
  const formIdentity = form ? {
    ownerKind: form.ownerKind,
    ownerId: form.ownerId,
    configId: form.configId,
    versionId: form.versionId,
    versionNo: form.versionNo,
    revision: form.revision,
    status: form.status,
    configHash: form.configHash,
    dependencyPins: form.dependencyPins,
  } : null;
  const state = resolveStatConfigSurfaceState({
    loading: formQuery.isLoading || formDetailQuery.isLoading,
    errorStatus: formQuery.isError
      ? apiErrorStatus(formQuery.error) ?? 500
      : formDetailQuery.isError
        ? apiErrorStatus(formDetailQuery.error) ?? 500
        : null,
    empty: virtual,
    locked: !virtual && form?.status === "LOCKED",
    canManageDraft: form?.permissions.canManageDraft,
  });

  return (
    <Stack spacing={2}>
      <StatConfigSurfaceStateView state={state} compact />
      {formIdentity && form ? <StatConfigReadbackCard identity={formIdentity} receiptId={form.receiptId} /> : null}
      <Alert severity="info">
        Lớp phân loại lấy từ tagCodes canonical của Dynamic Form; ba lớp thống kê lấy từ pinned snapshots. Không dùng catalog top-50 làm oracle.
      </Alert>
      {form ? (
        <Button
          component={RouterLink}
          to={dynamicFormPath(dynamicFormTemplateId, form.permissions.canManageDraft ? "edit" : undefined)}
          variant="outlined"
          sx={{ alignSelf: "flex-start" }}
        >
          {form.permissions.canManageDraft
            ? "Mở trình sửa cấu hình biểu mẫu"
            : "Xem biểu mẫu (chỉ đọc)"}
        </Button>
      ) : null}
      {form ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
          <Paper variant="outlined" sx={{ p: 2 }} component="section" aria-label="Typed field methods">
            <Typography fontWeight={800}>Field methods</Typography>
            <Typography variant="caption">Hash: {form.fieldSectionHash}</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {form.fields.length ? form.fields.map((field) => (
                <Box key={field.fieldId}>
                  <Typography variant="body2"><strong>{field.fieldId}</strong> · {field.fieldType}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {field.isStatistic ? field.statistic?.aggregateOps?.join(", ") || "Chưa chọn method" : "Không bật thống kê"}
                    {field.statisticLabelCodes.length ? ` · labels: ${field.statisticLabelCodes.join(", ")}` : ""}
                  </Typography>
                </Box>
              )) : <Typography variant="body2" color="text.secondary">Chưa có field statistic.</Typography>}
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }} component="section" aria-label="Typed table methods">
            <Typography fontWeight={800}>Table methods</Typography>
            <Typography variant="caption">Hash: {form.tableSectionHash}</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {form.tableConfig.length ? form.tableConfig.map((table) => (
                <Box key={table.blockId}>
                  <Typography variant="body2"><strong>{table.blockId}</strong> · {table.tableMode}</Typography>
                  <Typography variant="caption" color={table.statisticsDisabled ? "warning.main" : "text.secondary"}>
                    {table.statisticsDisabled
                      ? `Đã tắt: ${table.statisticsDisabledReason ?? "block policy"}`
                      : `${table.metrics.length} metricKey · ${table.allowedRowLabelCodes.length} row labels`}
                  </Typography>
                </Box>
              )) : <Typography variant="body2" color="text.secondary">Chưa có table statistic.</Typography>}
            </Stack>
          </Paper>
        </Box>
      ) : null}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
        <Paper variant="outlined" sx={{ p: 1.5 }} component="section" aria-label="Nhãn phân loại">
          <Typography fontWeight={750}>Nhãn phân loại</Typography>
          <Typography variant="caption" color="text.secondary">CLASSIFICATION tagCodes canonical</Typography>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            {classificationCodes.length ? classificationCodes.map((code) => (
              <Chip key={`classification:${code}`} size="small" label={code} />
            )) : <Typography variant="body2" color="text.secondary">Không có tagCode phân loại.</Typography>}
          </Stack>
        </Paper>
        {([
          ["field", "Nhãn field statistic", "STATISTIC field snapshot"],
          ["metric", "Nhãn metric target", "TABLE_TARGET metricLabelTargets snapshot"],
          ["row", "Nhãn dòng runtime", "TABLE_TARGET rowLabelSnapshots"],
        ] as const).map(([key, title, usage]) => (
          <Paper key={key} variant="outlined" sx={{ p: 1.5 }} component="section" aria-label={title}>
            <Typography fontWeight={750}>{title}</Typography>
            <Typography variant="caption" color="text.secondary">{usage}</Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              {layers[key].length ? layers[key].map((label) => (
                <Chip
                  key={`${key}:${label.labelId}:${label.versionId}`}
                  size="small"
                  label={`${label.code} · ${label.dataType} · v${label.versionNo}`}
                />
              )) : <Typography variant="body2" color="text.secondary">Không có pinned snapshot.</Typography>}
            </Stack>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}

function defaultBasicPayload(): P8BasicSummaryConfigPayload {
  return {
    sourceScope: sourceScopeForMode(undefined, "DIRECT_CHILDREN_OR_SELF", "BASIC"),
    periodRule: basicPeriodForMode("ALL_PERIODS"),
    groupingHints: [],
    detailHints: { includeSourceRows: false, maxTextChars: 12000 },
    targets: [],
  };
}

export function BasicConfigPanel({ route }: { route: OwnerRoute }) {
  const query = useGetP8BasicSummaryConfigQuery(route);
  const [putConfig, putState] = usePutP8BasicSummaryConfigMutation();
  const [lockConfig, lockState] = useLockP8BasicSummaryConfigMutation();
  const [createNext, nextState] = useCreateNextP8BasicSummaryDraftMutation();
  const [draft, setDraft] = useState<P8BasicSummaryConfigPayload>(defaultBasicPayload);
  const [base, setBase] = useState("");
  const [feedback, setFeedback] = useState<MutationFeedback>(null);
  const data = query.data;

  useEffect(() => {
    if (!data) return;
    setDraft(data.payload);
    setBase(JSON.stringify(data.payload));
    setFeedback(null);
  }, [data?.identity.versionId, data?.identity.revision, data]);

  const dirty = JSON.stringify(draft) !== base;
  const state = queryState(query, data, feedback?.kind === "conflict");
  const busy = putState.isLoading || lockState.isLoading || nextState.isLoading;
  const editable = Boolean(data?.permissions.canManageDraft && data.identity.status === "DRAFT");
  const sourceIssues = sourceScopeValidationIssues(draft.sourceScope, "BASIC");
  const validationIssues = [...sourceIssues];
  const periodMode = draft.periodRule?.mode ?? "ALL_PERIODS";
  if (periodMode === "SINGLE_PERIOD") {
    if (!draft.periodRule?.periodKey?.trim()) validationIssues.push("PERIOD_KEY_REQUIRED");
    else if (!isBoundedIdentity(draft.periodRule.periodKey, 256)) validationIssues.push("PERIOD_KEY_INVALID");
  }
  if (periodMode === "PERIOD_RANGE") {
    const from = draft.periodRule?.periodKeyFrom?.trim() ?? "";
    const to = draft.periodRule?.periodKeyTo?.trim() ?? "";
    if (!from) validationIssues.push("PERIOD_KEY_FROM_REQUIRED");
    else if (!isBoundedIdentity(from, 256)) validationIssues.push("PERIOD_KEY_FROM_INVALID");
    if (!to) validationIssues.push("PERIOD_KEY_TO_REQUIRED");
    else if (!isBoundedIdentity(to, 256)) validationIssues.push("PERIOD_KEY_TO_INVALID");
    if (from && to && from > to) validationIssues.push("PERIOD_RANGE_REVERSED");
  }
  if ((draft.detailHints?.maxTextChars ?? 0) < 1000 || (draft.detailHints?.maxTextChars ?? 0) > 100000) {
    validationIssues.push("MAX_TEXT_CHARS_OUT_OF_RANGE");
  }
  const seenBasicTargets = new Set<string>();
  (draft.targets ?? []).forEach((target, index) => {
    const kind = target.conceptKind?.trim().toUpperCase() ?? "";
    const rawKey = target.conceptKey?.trim() ?? "";
    if (!rawKey) validationIssues.push(`TARGET_${index + 1}_CONCEPT_KEY_REQUIRED`);
    else if (!isBoundedIdentity(rawKey, 256)) validationIssues.push(`TARGET_${index + 1}_CONCEPT_KEY_INVALID`);
    const key = kind === "ROW_LABEL" ? rawKey.toLowerCase() : rawKey;
    const tuple = `${kind}\u0000${key}`;
    if (rawKey && seenBasicTargets.has(tuple)) validationIssues.push("DUPLICATE_TARGET_CONCEPT");
    seenBasicTargets.add(tuple);
  });

  const save = async () => {
    if (!data || validationIssues.length) return;
    try {
      const result = await putConfig({
        ...route,
        body: createStatConfigEnvelope("basic-put", data.identity, draft),
      }).unwrap();
      setDraft(result.payload);
      setBase(JSON.stringify(result.payload));
      setFeedback({ kind: "success", text: "Basic draft đã lưu với CAS và readback mới." });
    } catch (error) {
      setFeedback(feedbackForError(error));
    }
  };
  const lock = async () => {
    if (!data || data.isVirtualEmpty) return;
    try {
      await lockConfig({ ...route, body: createStatConfigEmptyEnvelope("basic-lock", data.identity) }).unwrap();
      setFeedback({ kind: "success", text: "Basic version đã khóa; config hash hiện là bất biến." });
    } catch (error) {
      setFeedback(feedbackForError(error));
    }
  };
  const next = async () => {
    if (!data || data.isVirtualEmpty) return;
    try {
      await createNext({ ...route, body: createStatConfigEmptyEnvelope("basic-next", data.identity) }).unwrap();
      setFeedback({ kind: "success", text: "Đã tạo Basic draft kế tiếp với lineage rõ ràng." });
    } catch (error) {
      setFeedback(feedbackForError(error));
    }
  };

  const updateTarget = (index: number, patch: Record<string, unknown>) => {
    setDraft((current) => ({
      ...current,
      targets: (current.targets ?? []).map((target, targetIndex) =>
        targetIndex === index ? { ...target, ...patch } : target),
    }));
  };

  return (
    <Stack spacing={2}>
      <StatConfigSurfaceStateView state={state} compact />
      {data ? <StatConfigReadbackCard identity={data.identity} runtimeEligibility={data.runtimeEligibility} receiptId={data.receiptId} /> : null}
      <FeedbackAlert feedback={feedback} />
      {data ? (
        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }} component="section" aria-label="Basic configuration">
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={800}>Basic typed configuration</Typography>
            <SourceScopeFields
              value={draft.sourceScope}
              editable={editable}
              contract="BASIC"
              onChange={(sourceScope) => setDraft((current) => ({ ...current, sourceScope }))}
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select
                fullWidth
                label="Quy tắc kỳ"
                value={periodMode}
                disabled={!editable}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  periodRule: basicPeriodForMode(
                    event.target.value as "ALL_PERIODS" | "SINGLE_PERIOD" | "PERIOD_RANGE",
                  ),
                }))}
              >
                {(["ALL_PERIODS", "SINGLE_PERIOD", "PERIOD_RANGE"] as const).map((value) => (
                  <MenuItem key={value} value={value}>{value}</MenuItem>
                ))}
              </TextField>
              {periodMode === "SINGLE_PERIOD" ? (
                <TextField
                  fullWidth
                  label="Kỳ"
                  value={draft.periodRule?.periodKey ?? ""}
                  disabled={!editable}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    periodRule: { ...current.periodRule, periodKey: event.target.value },
                  }))}
                />
              ) : null}
              {periodMode === "PERIOD_RANGE" ? (
                <>
                  <TextField
                    fullWidth
                    label="Từ kỳ"
                    value={draft.periodRule?.periodKeyFrom ?? ""}
                    disabled={!editable}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      periodRule: { ...current.periodRule, periodKeyFrom: event.target.value },
                    }))}
                  />
                  <TextField
                    fullWidth
                    label="Đến kỳ"
                    value={draft.periodRule?.periodKeyTo ?? ""}
                    disabled={!editable}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      periodRule: { ...current.periodRule, periodKeyTo: event.target.value },
                    }))}
                  />
                </>
              ) : null}
            </Stack>
            <FormControl component="fieldset" disabled={!editable}>
              <FormLabel component="legend">Grouping hints</FormLabel>
              <FormGroup row>
                {GROUPING_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option}
                    label={option}
                    control={(
                      <Checkbox
                        checked={(draft.groupingHints ?? []).includes(option)}
                        onChange={() => setDraft((current) => ({
                          ...current,
                          groupingHints: toggleEnumValue(current.groupingHints, option),
                        }))}
                      />
                    )}
                  />
                ))}
              </FormGroup>
            </FormControl>
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography fontWeight={750}>Typed targets</Typography>
              {editable ? (
                <Button onClick={() => setDraft((current) => ({
                  ...current,
                  targets: [...(current.targets ?? []), {
                    conceptKind: "FIELD",
                    conceptKey: "",
                    dataType: "NUMBER",
                    operation: "COUNT",
                  }],
                }))}>
                  Thêm target
                </Button>
              ) : null}
            </Stack>
            {(draft.targets ?? []).map((target, index) => (
              <Stack key={`basic-target-${index}`} direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                <TextField
                  select
                  label="Concept"
                  value={target.conceptKind ?? "FIELD"}
                  disabled={!editable}
                  onChange={(event) => updateTarget(index, { conceptKind: event.target.value })}
                  sx={{ minWidth: 150 }}
                >
                  {DIFF_CONCEPT_KINDS.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                </TextField>
                <TextField
                  label="Concept key"
                  value={target.conceptKey ?? ""}
                  disabled={!editable}
                  onChange={(event) => updateTarget(index, { conceptKey: event.target.value })}
                  fullWidth
                />
                <TextField
                  select
                  label="Data type"
                  value={target.dataType ?? "NUMBER"}
                  disabled={!editable}
                  onChange={(event) => updateTarget(index, {
                    dataType: event.target.value,
                    operation: operationOptionsForDataType(event.target.value)[0],
                  })}
                  sx={{ minWidth: 130 }}
                >
                  {DATA_TYPES.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                </TextField>
                <TextField
                  select
                  label="Method"
                  value={target.operation ?? "COUNT"}
                  disabled={!editable}
                  onChange={(event) => updateTarget(index, { operation: event.target.value })}
                  sx={{ minWidth: 140 }}
                >
                  {operationOptionsForDataType(target.dataType).map((value) => (
                    <MenuItem key={value} value={value}>{value}</MenuItem>
                  ))}
                </TextField>
                {editable ? (
                  <Button color="error" onClick={() => setDraft((current) => ({
                    ...current,
                    targets: (current.targets ?? []).filter((_, targetIndex) => targetIndex !== index),
                  }))}>
                    Bỏ
                  </Button>
                ) : null}
              </Stack>
            ))}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={draft.detailHints?.includeSourceRows ?? false}
                    disabled={!editable}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      detailHints: { ...current.detailHints, includeSourceRows: event.target.checked },
                    }))}
                  />
                )}
                label="Giữ metadata dòng nguồn"
              />
              <TextField
                type="number"
                label="Giới hạn ký tự"
                value={draft.detailHints?.maxTextChars ?? 12000}
                disabled={!editable}
                inputProps={{ min: 1000, max: 100000 }}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  detailHints: { ...current.detailHints, maxTextChars: Number(event.target.value) },
                }))}
              />
            </Stack>
            {validationIssues.length ? (
              <Alert severity="warning">Cần hoàn tất: {validationIssues.join(", ")}</Alert>
            ) : null}
            <Typography variant="caption">MEAN: {data.meanContract.formula}; metadata-only: {String(data.meanContract.metadataOnly)}</Typography>
            <VersionStrip versions={data.versions} />
            <ConfigActions
              identity={data.identity}
              permissions={data.permissions}
              busy={busy}
              dirty={dirty}
              isVirtualEmpty={data.isVirtualEmpty}
              saveDisabled={validationIssues.length > 0}
              onSave={() => void save()}
              onLock={() => void lock()}
              onNextDraft={() => void next()}
            />
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}

function defaultAdvancedPayload(sectionId: string): P8AdvancedSummaryConfigPayload {
  return {
    sourceScope: sourceScopeForMode(undefined, "DIRECT_CHILDREN_OR_SELF", "ADVANCED"),
    sections: [{ sectionId, isCumulative: false, targets: [] }],
    hierarchyGrains: [],
    grouping: [],
    ordering: [],
    description: "",
  };
}

export function AdvancedConfigPanel({
  route,
  sectionId,
  onSectionIdChange,
}: {
  route: OwnerRoute;
  sectionId: string;
  onSectionIdChange: (value: string) => void;
}) {
  const advancedRoute = { ...route, sectionId };
  const query = useGetP8AdvancedSummaryConfigQuery(advancedRoute, { skip: !sectionId });
  const [putConfig, putState] = usePutP8AdvancedSummaryConfigMutation();
  const [lockConfig, lockState] = useLockP8AdvancedSummaryConfigMutation();
  const [createNext, nextState] = useCreateNextP8AdvancedSummaryDraftMutation();
  const [archive, archiveState] = useArchiveP8AdvancedSummaryConfigMutation();
  const [draft, setDraft] = useState<P8AdvancedSummaryConfigPayload>(() => defaultAdvancedPayload(sectionId));
  const [base, setBase] = useState("");
  const [feedback, setFeedback] = useState<MutationFeedback>(null);
  const data = query.data;

  useEffect(() => {
    if (!data) {
      setDraft(defaultAdvancedPayload(sectionId));
      setBase("");
      return;
    }
    setDraft(data.payload);
    setBase(JSON.stringify(data.payload));
    setFeedback(null);
  }, [data?.identity.versionId, data?.identity.revision, data, sectionId]);

  if (!sectionId) {
    return (
      <Stack spacing={2}>
        <StatConfigSurfaceStateView state="EMPTY" detail="Nhập sectionId canonical của Dynamic Form để mở đúng Advanced owner." />
        <TextField
          label="Advanced sectionId"
          onChange={(event) => onSectionIdChange(event.target.value.trim())}
          helperText="Section được giữ trong URL query để deep-link và refresh không đổi owner."
        />
      </Stack>
    );
  }

  const dirty = JSON.stringify(draft) !== base;
  const state = queryState(query, data, feedback?.kind === "conflict");
  const busy = putState.isLoading || lockState.isLoading || nextState.isLoading || archiveState.isLoading;
  const section = draft.sections?.[0] ?? { sectionId, isCumulative: false, targets: [] };
  const editable = Boolean(data?.permissions.canManageDraft && data.identity.status === "DRAFT");
  const validationIssues = sourceScopeValidationIssues(draft.sourceScope, "ADVANCED");
  const targetIds = (section.targets ?? []).map((target) => target.fieldId?.trim() ?? "");
  targetIds.forEach((fieldId, index) => {
    if (!fieldId) validationIssues.push(`TARGET_${index + 1}_FIELD_ID_REQUIRED`);
    else if (!isBoundedIdentity(fieldId, 256)) validationIssues.push(`TARGET_${index + 1}_FIELD_ID_INVALID`);
    if (fieldId && targetIds.indexOf(fieldId) !== index) validationIssues.push("DUPLICATE_TARGET_FIELD");
  });
  if ((section.targets?.length ?? 0) > (section.isCumulative ? 249 : 1000)) {
    validationIssues.push("TARGET_LIMIT_EXCEEDED");
  }
  const targetIdSet = new Set(targetIds.filter(Boolean));
  const seenOrdering = new Set<string>();
  (draft.ordering ?? []).forEach((ordering, index) => {
    const fieldId = ordering.fieldId?.trim() ?? "";
    if (!fieldId) validationIssues.push(`ORDERING_${index + 1}_FIELD_ID_REQUIRED`);
    else if (!isBoundedIdentity(fieldId, 256)) validationIssues.push(`ORDERING_${index + 1}_FIELD_ID_INVALID`);
    else if (!targetIdSet.has(fieldId)) validationIssues.push("ORDERING_FIELD_NOT_TARGETED");
    if (fieldId && seenOrdering.has(fieldId)) validationIssues.push("DUPLICATE_ORDERING_FIELD");
    seenOrdering.add(fieldId);
  });
  const orderingCandidates = availableOrderingFieldIds(section.targets, draft.ordering);
  const orderingFieldOptions = [...targetIdSet];

  const setSection = (nextSection: typeof section) => setDraft((current) => ({
    ...current,
    sections: [nextSection],
  }));
  const renameTarget = (index: number, fieldId: string) => setDraft((current) => {
    const currentSection = current.sections?.[0] ?? section;
    const previous = currentSection.targets?.[index]?.fieldId;
    return {
      ...current,
      sections: [{
        ...currentSection,
        targets: (currentSection.targets ?? []).map((item, itemIndex) =>
          itemIndex === index ? { ...item, fieldId } : item),
      }],
      ordering: syncOrderingAfterTargetRename(current.ordering, previous, fieldId),
    };
  });
  const removeTarget = (index: number) => setDraft((current) => {
    const currentSection = current.sections?.[0] ?? section;
    const removedId = currentSection.targets?.[index]?.fieldId;
    return {
      ...current,
      sections: [{
        ...currentSection,
        targets: (currentSection.targets ?? []).filter((_, itemIndex) => itemIndex !== index),
      }],
      ordering: (current.ordering ?? []).filter((item) => item.fieldId !== removedId),
    };
  });

  const mutate = async (kind: "save" | "lock" | "next" | "archive") => {
    if (!data || (kind === "save" && validationIssues.length)) return;
    try {
      let result: P8AdvancedSummaryConfigReadback;
      if (kind === "save") {
        result = await putConfig({
          ...advancedRoute,
          body: createStatConfigEnvelope("advanced-put", data.identity, draft),
        }).unwrap();
      } else if (kind === "lock") {
        result = await lockConfig({
          ...advancedRoute,
          body: createStatConfigEmptyEnvelope("advanced-lock", data.identity),
        }).unwrap();
      } else if (kind === "next") {
        result = await createNext({
          ...advancedRoute,
          body: createStatConfigEmptyEnvelope("advanced-next", data.identity),
        }).unwrap();
      } else {
        result = await archive({
          ...advancedRoute,
          body: createStatConfigEmptyEnvelope("advanced-archive", data.identity),
        }).unwrap();
      }
      setDraft(result.payload);
      setBase(JSON.stringify(result.payload));
      setFeedback({ kind: "success", text: `Advanced ${kind} đã hoàn tất với canonical readback.` });
    } catch (error) {
      setFeedback(feedbackForError(error));
    }
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="Advanced sectionId"
        value={sectionId}
        onChange={(event) => onSectionIdChange(event.target.value.trim())}
        size="small"
        helperText="Đổi section sẽ đổi canonical owner; không tự động sao chép cấu hình."
      />
      <StatConfigSurfaceStateView state={state} compact />
      {data ? <StatConfigReadbackCard identity={data.identity} runtimeEligibility={data.runtimeEligibility} receiptId={data.commandReceiptId} /> : null}
      <FeedbackAlert feedback={feedback} />
      {data ? (
        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }} component="section" aria-label="Advanced configuration">
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={800}>Advanced configuration · đúng một section</Typography>
            <Alert severity="info">Budget: tối đa {section.isCumulative ? 249 : 1000} targets · hierarchy depth 3 · canonical payload 1,048,576 bytes.</Alert>
            <SourceScopeFields
              value={draft.sourceScope}
              editable={editable}
              contract="ADVANCED"
              onChange={(sourceScope) => setDraft((current) => ({ ...current, sourceScope }))}
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={section.isCumulative ?? false}
                    disabled={!editable}
                    onChange={(event) => setSection({ ...section, isCumulative: event.target.checked })}
                  />
                )}
                label="Section lũy kế"
              />
              <TextField
                select
                fullWidth
                label="Hierarchy prefix"
                value={(draft.hierarchyGrains ?? []).length}
                disabled={!editable}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  hierarchyGrains: ["DAY", "MONTH", "YEAR"].slice(0, Number(event.target.value)),
                }))}
              >
                <MenuItem value={0}>Không phân cấp</MenuItem>
                <MenuItem value={1}>DAY</MenuItem>
                <MenuItem value={2}>DAY → MONTH</MenuItem>
                <MenuItem value={3}>DAY → MONTH → YEAR</MenuItem>
              </TextField>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography fontWeight={750}>Typed targets ({section.targets?.length ?? 0}/{section.isCumulative ? 249 : 1000})</Typography>
              {editable ? (
                <Button onClick={() => setSection({
                  ...section,
                  targets: [...(section.targets ?? []), {
                    fieldId: "",
                    dataType: "NUMBER",
                    operation: "COUNT",
                  }],
                })}>
                  Thêm field
                </Button>
              ) : null}
            </Stack>
            {(section.targets ?? []).map((target, index) => (
              <Stack key={`advanced-target-${index}`} direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField
                  fullWidth
                  label="Field ID"
                  value={target.fieldId ?? ""}
                  disabled={!editable}
                  onChange={(event) => renameTarget(index, event.target.value)}
                />
                <TextField
                  select
                  label="Data type"
                  value={target.dataType ?? "NUMBER"}
                  disabled={!editable}
                  onChange={(event) => setSection({
                    ...section,
                    targets: (section.targets ?? []).map((item, itemIndex) =>
                      itemIndex === index
                        ? advancedTargetForDataType(item, event.target.value as DataType)
                        : item),
                  })}
                  sx={{ minWidth: 140 }}
                >
                  {DATA_TYPES.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                </TextField>
                <TextField
                  select
                  label="Operation"
                  value={target.operation ?? "COUNT"}
                  disabled={!editable}
                  onChange={(event) => setSection({
                    ...section,
                    targets: (section.targets ?? []).map((item, itemIndex) =>
                      itemIndex === index ? { ...item, operation: event.target.value } : item),
                  })}
                  sx={{ minWidth: 150 }}
                >
                  {operationOptionsForDataType(target.dataType).map((operation) => (
                    <MenuItem key={operation} value={operation}>{operation}</MenuItem>
                  ))}
                </TextField>
                {editable ? <Button color="error" onClick={() => removeTarget(index)}>Bỏ</Button> : null}
              </Stack>
            ))}
            <FormControl component="fieldset" disabled={!editable}>
              <FormLabel component="legend">Grouping</FormLabel>
              <FormGroup row>
                {GROUPING_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option}
                    label={option}
                    control={(
                      <Checkbox
                        checked={(draft.grouping ?? []).includes(option)}
                        onChange={() => setDraft((current) => ({
                          ...current,
                          grouping: toggleEnumValue(current.grouping, option),
                        }))}
                      />
                    )}
                  />
                ))}
              </FormGroup>
            </FormControl>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography fontWeight={750}>Ordering</Typography>
              {editable ? (
                <Button
                  disabled={!orderingCandidates.length}
                  onClick={() => setDraft((current) => ({
                    ...current,
                    ordering: [...(current.ordering ?? []), {
                      fieldId: orderingCandidates[0],
                      direction: "ASC",
                    }],
                  }))}
                >
                  Thêm ordering
                </Button>
              ) : null}
            </Stack>
            {(draft.ordering ?? []).map((ordering, index) => (
              <Stack key={`advanced-ordering-${index}`} direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  select
                  fullWidth
                  label={`Ordering field ${index + 1}`}
                  value={ordering.fieldId ?? ""}
                  disabled={!editable}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    ordering: (current.ordering ?? []).map((item, itemIndex) =>
                      itemIndex === index ? { ...item, fieldId: event.target.value } : item),
                  }))}
                >
                  {orderingFieldOptions.map((fieldId) => (
                    <MenuItem key={fieldId} value={fieldId}>{fieldId}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label={`Ordering direction ${index + 1}`}
                  value={ordering.direction ?? "ASC"}
                  disabled={!editable}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    ordering: (current.ordering ?? []).map((item, itemIndex) =>
                      itemIndex === index ? { ...item, direction: event.target.value } : item),
                  }))}
                  sx={{ minWidth: 140 }}
                >
                  {ORDERING_DIRECTIONS.map((direction) => (
                    <MenuItem key={direction} value={direction}>{direction}</MenuItem>
                  ))}
                </TextField>
                {editable ? (
                  <Button color="error" onClick={() => setDraft((current) => ({
                    ...current,
                    ordering: (current.ordering ?? []).filter((_, itemIndex) => itemIndex !== index),
                  }))}>
                    Bỏ
                  </Button>
                ) : null}
              </Stack>
            ))}
            <TextField
              fullWidth
              label="Mô tả"
              value={draft.description ?? ""}
              disabled={!editable}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
            {validationIssues.length ? (
              <Alert severity="warning">Cần hoàn tất: {[...new Set(validationIssues)].join(", ")}</Alert>
            ) : null}
            {data.validationReceipt ? (
              <Alert severity="success" component="section" aria-label="Advanced validation receipt">
                <AlertTitle>Validation receipt {data.validationReceipt.receiptId}</AlertTitle>
                Targets {data.validationReceipt.targetCount}/{data.validationReceipt.targetLimit} · hierarchy {data.validationReceipt.hierarchyDepth}/{data.validationReceipt.maxHierarchyDepth} · payload {data.validationReceipt.canonicalPayloadBytes}/{data.validationReceipt.maxCanonicalPayloadBytes} bytes.
              </Alert>
            ) : <Alert severity="info">Validation receipt sẽ xuất hiện sau canonical validation.</Alert>}
            <VersionStrip versions={data.versions.map((version) => version.identity)} />
            <ConfigActions
              identity={data.identity}
              permissions={data.permissions}
              busy={busy}
              dirty={dirty}
              isVirtualEmpty={data.isVirtualEmpty}
              allowNextFromArchived
              saveDisabled={validationIssues.length > 0}
              onSave={() => void mutate("save")}
              onLock={() => void mutate("lock")}
              onNextDraft={() => void mutate("next")}
              onArchive={() => void mutate("archive")}
            />
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}

export function DiffConfigPanel({ route }: { route: OwnerRoute }) {
  const query = useGetP8DiffConfigQuery(route);
  const [putConfig, putState] = usePutP8DiffConfigMutation();
  const [lockConfig, lockState] = useLockP8DiffConfigMutation();
  const [createNext, nextState] = useCreateNextP8DiffDraftMutation();
  const [draft, setDraft] = useState<P8DiffConfigPayload>(defaultDiffPayload);
  const [base, setBase] = useState("");
  const [feedback, setFeedback] = useState<MutationFeedback>(null);
  const data = query.data;

  useEffect(() => {
    if (!data) return;
    const hydrated = hydrateDiffPayload(data.payload, data.isVirtualEmpty);
    setDraft(hydrated);
    setBase(JSON.stringify(hydrated));
    setFeedback(null);
  }, [data?.identity.versionId, data?.identity.revision, data]);

  const dirty = JSON.stringify(draft) !== base;
  const state = queryState(query, data, feedback?.kind === "conflict");
  const busy = putState.isLoading || lockState.isLoading || nextState.isLoading;
  const editable = Boolean(data?.permissions.canManageDraft && data.identity.status === "DRAFT");
  const diffIssues = diffDraftValidationIssues(draft);
  const sharedSelector = draft.left?.selector;
  const sharedPeriodMode = (draft.left?.period?.mode ?? "EXACT") as DiffPeriodMode;
  const sharedSourceScope = draft.left?.sourceScope;

  const mutate = async (kind: "save" | "lock" | "next") => {
    if (!data || (kind === "save" && diffIssues.length)) return;
    try {
      let result: P8DiffConfigReadback;
      if (kind === "save") {
        result = await putConfig({
          ...route,
          body: createStatConfigEnvelope("diff-put", data.identity, draft),
        }).unwrap();
      } else if (kind === "lock") {
        result = await lockConfig({
          ...route,
          body: createStatConfigEmptyEnvelope("diff-lock", data.identity),
        }).unwrap();
      } else {
        result = await createNext({
          ...route,
          body: createStatConfigEmptyEnvelope("diff-next", data.identity),
        }).unwrap();
      }
      const hydrated = hydrateDiffPayload(result.payload, result.isVirtualEmpty);
      setDraft(hydrated);
      setBase(JSON.stringify(hydrated));
      setFeedback({ kind: "success", text: `Diff ${kind} đã hoàn tất với canonical readback.` });
    } catch (error) {
      setFeedback(feedbackForError(error));
    }
  };

  const updateSide = (
    side: "left" | "right",
    group: "selector" | "period",
    key: string,
    value: string,
  ) => setDraft((current) => ({
    ...current,
    [side]: {
      ...current[side],
      [group]: { ...current[side]?.[group], [key]: value },
    },
  }));

  const updateSharedSelector = (
    key: "conceptKind" | "conceptCode" | "dataType",
    value: string,
  ) => setDraft((current) => {
    const next = setDiffSharedSelector(current, key, value);
    if (key !== "conceptKind") return next;
    return {
      ...next,
      left: { ...next.left, selector: { ...next.left?.selector, conceptKey: "" } },
      right: { ...next.right, selector: { ...next.right?.selector, conceptKey: "" } },
    };
  });

  const sideEditor = (side: "left" | "right", label: string) => {
    const value = draft[side];
    return (
      <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }} component="fieldset">
        <Typography component="legend" fontWeight={800}>{label}</Typography>
        <Stack spacing={1.25} sx={{ mt: 1 }}>
          <TextField
            label={`${label} concept key`}
            value={value?.selector?.conceptKey ?? ""}
            disabled={!editable}
            onChange={(event) => updateSide(side, "selector", "conceptKey", event.target.value)}
          />
          {sharedPeriodMode === "RANGE" ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                fullWidth
                label={`${label} period from`}
                value={value?.period?.periodKeyFrom ?? ""}
                disabled={!editable}
                onChange={(event) => updateSide(side, "period", "periodKeyFrom", event.target.value)}
              />
              <TextField
                fullWidth
                label={`${label} period to`}
                value={value?.period?.periodKeyTo ?? ""}
                disabled={!editable}
                onChange={(event) => updateSide(side, "period", "periodKeyTo", event.target.value)}
              />
            </Stack>
          ) : (
            <TextField
              label={`${label} period key`}
              value={value?.period?.periodKey ?? ""}
              disabled={!editable}
              onChange={(event) => updateSide(side, "period", "periodKey", event.target.value)}
            />
          )}
        </Stack>
      </Paper>
    );
  };

  return (
    <Stack spacing={2}>
      <StatConfigSurfaceStateView state={state} compact />
      {data ? <StatConfigReadbackCard identity={data.identity} runtimeEligibility={data.runtimeEligibility} receiptId={data.receiptId} /> : null}
      <FeedbackAlert feedback={feedback} />
      {data ? (
        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }} component="section" aria-label="Diff configuration">
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={800}>Diff configuration · metadata only</Typography>
            <TextField
              fullWidth
              label="Tên cấu hình"
              value={draft.name ?? ""}
              disabled={!editable}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
            <Paper variant="outlined" sx={{ p: 1.5 }} component="section" aria-label="Diff shared contract">
              <Stack spacing={1.5}>
                <Alert severity="info">
                  Concept kind/code/type, period mode và source scope là hợp đồng dùng chung bắt buộc giống nhau cho hai vế.
                </Alert>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
                  <TextField
                    select
                    label="Shared concept kind"
                    value={sharedSelector?.conceptKind ?? "FIELD"}
                    disabled={!editable}
                    onChange={(event) => updateSharedSelector("conceptKind", event.target.value)}
                  >
                    {DIFF_CONCEPT_KINDS.map((kind) => <MenuItem key={kind} value={kind}>{kind}</MenuItem>)}
                  </TextField>
                  <TextField
                    label="Shared concept code"
                    value={sharedSelector?.conceptCode ?? ""}
                    disabled={!editable}
                    onChange={(event) => updateSharedSelector("conceptCode", event.target.value)}
                  />
                  <TextField
                    select
                    label="Shared data type"
                    value={sharedSelector?.dataType ?? "NUMBER"}
                    disabled={!editable}
                    onChange={(event) => updateSharedSelector("dataType", event.target.value)}
                  >
                    {DATA_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                  </TextField>
                  <TextField
                    select
                    label="Shared period mode"
                    value={sharedPeriodMode}
                    disabled={!editable}
                    onChange={(event) => setDraft((current) =>
                      setDiffSharedPeriodMode(current, event.target.value as DiffPeriodMode))}
                  >
                    <MenuItem value="EXACT">EXACT</MenuItem>
                    <MenuItem value="RANGE">RANGE</MenuItem>
                  </TextField>
                </Box>
                <SourceScopeFields
                  value={sharedSourceScope}
                  editable={editable}
                  contract="DIFF"
                  onChange={(sourceScope) => setDraft((current) =>
                    setDiffSharedSourceScope(current, sourceScope))}
                />
              </Stack>
            </Paper>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
              {sideEditor("left", "Vế trái")}
              {sideEditor("right", "Vế phải")}
            </Box>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select
                fullWidth
                label="Hướng so sánh"
                value={draft.direction ?? "LEFT_TO_RIGHT"}
                disabled={!editable}
                onChange={(event) => setDraft((current) => ({ ...current, direction: event.target.value }))}
              >
                {["LEFT_TO_RIGHT", "RIGHT_TO_LEFT"].map((value) => (
                  <MenuItem key={value} value={value}>{value}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="Missing policy"
                value={draft.missingPolicy ?? "REJECT"}
                disabled={!editable}
                onChange={(event) => setDraft((current) => ({ ...current, missingPolicy: event.target.value }))}
              >
                {(sharedSelector?.dataType === "NUMBER"
                  ? ["REJECT", "INCLUDE", "AS_ZERO"]
                  : ["REJECT", "INCLUDE"]
                ).map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
              </TextField>
              <TextField
                select
                fullWidth
                label="Empty policy"
                value={draft.emptyPolicy ?? "REJECT"}
                disabled={!editable}
                onChange={(event) => setDraft((current) => ({ ...current, emptyPolicy: event.target.value }))}
              >
                {["REJECT", "INCLUDE", "AS_MISSING"].map((value) => (
                  <MenuItem key={value} value={value}>{value}</MenuItem>
                ))}
              </TextField>
            </Stack>
            {diffIssues.length ? (
              <Alert severity="warning">Cần hoàn tất trước khi lưu: {diffIssues.join(", ")}</Alert>
            ) : null}
            <VersionStrip versions={data.versions.map((version) => version.identity)} />
            <ConfigActions
              identity={data.identity}
              permissions={data.permissions}
              busy={busy}
              dirty={dirty}
              isVirtualEmpty={data.isVirtualEmpty}
              saveDisabled={diffIssues.length > 0}
              onSave={() => void mutate("save")}
              onLock={() => void mutate("lock")}
              onNextDraft={() => void mutate("next")}
            />
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}

type ReadinessCandidate = {
  identity: P8StatConfigIdentity;
  permissions: P8StatConfigPermissionSet;
  isVirtualEmpty: boolean;
  runtimeEligibility?: string;
};

export function ReadinessPanel({
  route,
  dynamicFormOwnerId,
  sectionId,
}: {
  route: OwnerRoute;
  dynamicFormOwnerId: string;
  sectionId: string;
}) {
  const meQuery = useGetMeQuery();
  const isSystemAdmin = meQuery.data?.roles?.includes(Role.SYSTEM_ADMIN) === true ||
    meQuery.data?.accountKind === "SYSTEM_ADMIN";
  const [ownerKind, setOwnerKind] = useState("BASIC_SUMMARY");
  const basic = useGetP8BasicSummaryConfigQuery(route, { skip: ownerKind !== "BASIC_SUMMARY" });
  const advanced = useGetP8AdvancedSummaryConfigQuery(
    { ...route, sectionId },
    { skip: ownerKind !== "ADVANCED_SUMMARY" || !sectionId },
  );
  const diff = useGetP8DiffConfigQuery(route, { skip: ownerKind !== "DIFF" });
  const form = useGetP8DynamicFormStatisticsQuery(
    { id: dynamicFormOwnerId },
    { skip: ownerKind !== "DYNAMIC_FORM" },
  );
  const [enqueue, enqueueState] = useEnqueueStatConfigReadinessMutation();
  const [jobId, setJobId] = useState("");
  const [terminalJobId, setTerminalJobId] = useState("");
  const statusQuery = useGetStatConfigReadinessQuery({ jobId }, {
    skip: !jobId,
    pollingInterval: jobId && terminalJobId !== jobId ? 2000 : 0,
    skipPollingIfUnfocused: true,
  });
  const [feedback, setFeedback] = useState<MutationFeedback>(null);

  const selected: ReadinessCandidate | undefined = ownerKind === "BASIC_SUMMARY"
    ? basic.data
    : ownerKind === "ADVANCED_SUMMARY"
      ? advanced.data
      : ownerKind === "DIFF"
        ? diff.data
        : form.data
          ? {
              identity: {
                ownerKind: form.data.ownerKind,
                ownerId: form.data.ownerId,
                configId: form.data.configId,
                versionId: form.data.versionId,
                versionNo: form.data.versionNo,
                revision: form.data.revision,
                status: form.data.status,
                configHash: form.data.configHash,
                dependencyPins: form.data.dependencyPins,
              },
              permissions: form.data.permissions,
              isVirtualEmpty: isDynamicFormVirtualReadback(form.data),
            }
          : undefined;
  const activeQuery = ownerKind === "BASIC_SUMMARY"
    ? basic
    : ownerKind === "ADVANCED_SUMMARY"
      ? advanced
      : ownerKind === "DIFF"
        ? diff
        : form;
  const selectedErrorStatus = activeQuery.isError
    ? apiErrorStatus(activeQuery.error) ?? 500
    : null;
  const unsupported = Boolean(selected?.runtimeEligibility?.includes("UNSUPPORTED"));
  const persisted = Boolean(selected && !selected.isVirtualEmpty);
  const canEnqueue = Boolean(
    isSystemAdmin &&
    persisted &&
    selected?.permissions.canReadConfig &&
    selectedErrorStatus == null &&
    !unsupported,
  );
  const status = jobId && statusQuery.currentData?.jobId === jobId
    ? statusQuery.currentData
    : undefined;
  const statusState = status ? readinessSurfaceState(status.status) : null;

  useEffect(() => {
    if (status && isReadinessTerminal(status.status)) setTerminalJobId(status.jobId);
  }, [status]);

  const changeOwner = (value: string) => {
    setOwnerKind(value);
    setJobId("");
    setTerminalJobId("");
    setFeedback(null);
  };

  const enqueueJob = async () => {
    if (!selected || !canEnqueue) return;
    const identity = selected.identity;
    try {
      const result = await enqueue({
        ownerKind: identity.ownerKind,
        ownerId: identity.ownerId,
        body: createStatConfigEnvelope("readiness", identity, {
          configId: identity.configId,
          versionId: identity.versionId,
          versionNo: identity.versionNo,
        }),
      }).unwrap();
      setTerminalJobId("");
      setJobId(result.jobId);
      setFeedback({ kind: "success", text: `Readiness job ${result.jobId} đã được xếp hàng.` });
    } catch (error) {
      setFeedback(feedbackForError(error));
    }
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Validation readiness chạy trên queue riêng và không đọc dataset nghiệp vụ. Trang business chỉ nhận safe status; diagnostics chi tiết thuộc Operations.
      </Alert>
      <TextField
        select
        label="Owner cần validation"
        value={ownerKind}
        onChange={(event) => changeOwner(event.target.value)}
      >
        <MenuItem value="DYNAMIC_FORM">DYNAMIC_FORM</MenuItem>
        <MenuItem value="BASIC_SUMMARY">BASIC_SUMMARY</MenuItem>
        <MenuItem value="ADVANCED_SUMMARY" disabled={!sectionId}>ADVANCED_SUMMARY</MenuItem>
        <MenuItem value="DIFF">DIFF</MenuItem>
      </TextField>
      <TextField
        fullWidth
        label="Safe readiness job ID"
        value={jobId}
        helperText="Nhập jobId đã được cấp để đọc safe status sau refresh; API vẫn thực thi quyền truy cập."
        onChange={(event) => {
          setJobId(event.target.value.trim());
          setTerminalJobId("");
          setFeedback(null);
        }}
      />
      {activeQuery.isLoading || meQuery.isLoading ? (
        <StatConfigSurfaceStateView state="LOADING" />
      ) : selectedErrorStatus != null ? (
        <StatConfigSurfaceStateView
          state={selectedErrorStatus === 401 || selectedErrorStatus === 403 ? "FORBIDDEN" : "ERROR"}
        />
      ) : unsupported ? (
        <StatConfigSurfaceStateView state="UNSUPPORTED" />
      ) : selected ? (
        <Stack spacing={1}>
          <StatConfigReadbackCard identity={selected.identity} />
          {selected.isVirtualEmpty ? (
            <StatConfigSurfaceStateView
              state="EMPTY"
              detail="Owner hiện là virtual readback. Hãy lưu canonical draft trước khi enqueue readiness."
              compact
            />
          ) : null}
        </Stack>
      ) : (
        <StatConfigSurfaceStateView
          state="EMPTY"
          detail={ownerKind === "ADVANCED_SUMMARY" && !sectionId
            ? "Hãy chọn sectionId ở tab Advanced trước."
            : "Owner chưa có canonical readback."}
        />
      )}
      {isSystemAdmin ? (
        <Button
          variant="contained"
          sx={{ alignSelf: "flex-start" }}
          disabled={!canEnqueue || enqueueState.isLoading}
          onClick={() => void enqueueJob()}
        >
          Kiểm tra readiness
        </Button>
      ) : (
        <Alert severity="info">Chỉ SYSTEM_ADMIN được enqueue readiness. Actor được cấp jobId có thể nhập ở trên để đọc safe status.</Alert>
      )}
      <FeedbackAlert feedback={feedback} />
      {statusQuery.isError && jobId ? <StatConfigSurfaceStateView state="ERROR" /> : null}
      {status && statusState ? (
        <Paper variant="outlined" sx={{ p: 2 }} component="section" aria-label="Readiness safe status">
          <Stack spacing={1}>
            <StatConfigSurfaceStateView state={statusState} compact />
            <Typography><strong>Job:</strong> {status.jobId}</Typography>
            <Typography><strong>Status:</strong> {status.status}</Typography>
            <Typography><strong>Retry:</strong> {status.retryCount}/{status.maxRetryCount}</Typography>
            {status.safeCode ? <Typography><strong>Safe code:</strong> {status.safeCode}</Typography> : null}
            {status.safeMessage ? <Typography>{status.safeMessage}</Typography> : null}
            {status.nextRetryAtUtc ? <Typography variant="caption">Thử lại lúc {status.nextRetryAtUtc}</Typography> : null}
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}

export type { P8BasicSummaryConfigReadback, P8AdvancedSummaryConfigReadback, P8DiffConfigReadback };
