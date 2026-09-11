import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";

import {
  useConfirmDynamicFlowRuntimeMutation,
  usePreflightDynamicFlowRuntimeMutation,
  type DynamicFlowConfirmRequest,
  type DynamicFlowPreflightResponse,
} from "../../../api/dynamicFlowRuntimeApi";
import { getMeSnapshot } from "../../../stores/authStorage";
import { LazyUnitMultiSelect } from "../../common/LazyUnitMultiSelect";
import {
  buildDynamicFlowConfirmRequest,
  buildDynamicFlowPreflightRequest,
  clearDynamicFlowLaunchIntent,
  createDynamicFlowRuntimeCommandId,
  emptyDynamicFlowLaunchDraft,
  hasDynamicFlowLaunchErrors,
  isSupportedRuntimeArchetype,
  loadDynamicFlowLaunchIntent,
  runtimeErrorPresentation,
  saveDynamicFlowLaunchIntent,
  validateDynamicFlowLaunchDraft,
  type DynamicFlowLaunchDraft,
  type DynamicFlowLaunchIntent,
  type DynamicFlowLaunchPhase,
} from "./dynamicFlowRuntimeModel";

const STEPS = [
  "Phiên bản Flow",
  "Đơn vị đích",
  "Kỳ và lịch",
  "Xem trước pin",
  "Xác nhận",
];

type Props = {
  open: boolean;
  workId: string;
  onClose: () => void;
  onOpenedInstance: (instanceId: string) => void;
};

type PreviewState = DynamicFlowPreflightResponse & {
  targets: DynamicFlowPreflightResponse["targets"];
};

function previewIdentityMatches(left: DynamicFlowPreflightResponse, right: DynamicFlowPreflightResponse) {
  return (
    left.commandId === right.commandId &&
    left.requestHash === right.requestHash &&
    left.snapshotToken === right.snapshotToken
  );
}

function uniqueTargets(targets: DynamicFlowPreflightResponse["targets"]) {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = target.targetUnitId;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function DynamicFlowLaunchWizard({
  open,
  workId,
  onClose,
  onOpenedInstance,
}: Props) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const actorUserId = getMeSnapshot()?.id ?? "";
  const versionInputRef = useRef<HTMLInputElement>(null);
  const periodInputRef = useRef<HTMLInputElement>(null);
  const scheduleInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DynamicFlowLaunchDraft>(emptyDynamicFlowLaunchDraft);
  const [commandId, setCommandId] = useState(createDynamicFlowRuntimeCommandId);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<DynamicFlowConfirmRequest | null>(null);
  const [phase, setPhase] = useState<DynamicFlowLaunchPhase>("EDITING");
  const [message, setMessage] = useState<string | null>(null);
  const [preflight, preflightState] = usePreflightDynamicFlowRuntimeMutation();
  const [confirm, confirmState] = useConfirmDynamicFlowRuntimeMutation();

  useEffect(() => {
    if (!open) return;

    const restored = actorUserId
      ? loadDynamicFlowLaunchIntent(sessionStorage, workId, actorUserId)
      : null;
    if (restored) {
      const restoredPreview = (restored.preview as PreviewState | undefined) ?? null;
      const restoredConfirmRequest =
        (restored.confirmRequest as DynamicFlowConfirmRequest | undefined) ?? null;
      const snapshotIdentityStable =
        !restoredConfirmRequest ||
        Boolean(
          restoredPreview &&
            restored.commandId === restoredConfirmRequest.commandId &&
            restoredPreview.commandId === restoredConfirmRequest.commandId &&
            restoredPreview.snapshotToken === restoredConfirmRequest.snapshotToken,
        );
      if (!snapshotIdentityStable) {
        clearDynamicFlowLaunchIntent(sessionStorage, workId, actorUserId);
        setStep(0);
        setDraft(emptyDynamicFlowLaunchDraft());
        setCommandId(createDynamicFlowRuntimeCommandId());
        setPreview(null);
        setConfirmRequest(null);
        setPhase("EDITING");
        setMessage("Intent đã lưu không còn cùng command/snapshot và đã bị khóa an toàn.");
        return;
      }

      setDraft(restored.draft);
      setCommandId(restored.commandId);
      setPreview(restoredPreview);
      setConfirmRequest(restoredConfirmRequest);
      setPhase(restored.phase);
      setStep(restored.confirmRequest ? 4 : restored.preview ? 3 : 0);
      setMessage(
        restored.phase === "RETRYING"
          ? "Đã khôi phục lệnh đang thử lại. Hệ thống sẽ dùng nguyên command id và snapshot token."
          : null,
      );
      return;
    }

    setStep(0);
    setDraft(emptyDynamicFlowLaunchDraft());
    setCommandId(createDynamicFlowRuntimeCommandId());
    setPreview(null);
    setConfirmRequest(null);
    setPhase("EDITING");
    setMessage(null);
  }, [actorUserId, open, workId]);

  const persist = (
    nextPhase: DynamicFlowLaunchPhase,
    nextPreview: PreviewState | null,
    nextConfirmRequest: DynamicFlowConfirmRequest | null,
  ) => {
    if (!actorUserId) return;
    const intent: DynamicFlowLaunchIntent = {
      workId,
      actorUserId,
      commandId,
      draft,
      phase: nextPhase,
      preview: nextPreview ?? undefined,
      confirmRequest: nextConfirmRequest ?? undefined,
    };
    saveDynamicFlowLaunchIntent(sessionStorage, intent);
  };

  const validation = useMemo(() => validateDynamicFlowLaunchDraft(draft), [draft]);
  const archetypeSupported = preview
    ? isSupportedRuntimeArchetype(preview.flowPin.archetypeId)
    : false;
  const phaseAllowsConfirm =
    phase === "PREVIEW" || phase === "CONFIRMING" || phase === "RETRYING";
  const confirmEnabled = Boolean(
    preview &&
      phaseAllowsConfirm &&
      preview.eligibility === "ELIGIBLE_CANDIDATE" &&
      !preview.blockedUntilPhase &&
      archetypeSupported &&
      confirmRequest,
  );

  const updateDraft = (patch: Partial<DynamicFlowLaunchDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setMessage(null);
    setPhase("EDITING");
    if (preview || confirmRequest) {
      setPreview(null);
      setConfirmRequest(null);
      setCommandId(createDynamicFlowRuntimeCommandId());
      if (actorUserId) clearDynamicFlowLaunchIntent(sessionStorage, workId, actorUserId);
    }
  };

  const focusInvalidField = () => {
    if (validation.flowTemplateVersionId) {
      setStep(0);
      queueMicrotask(() => versionInputRef.current?.focus());
      return;
    }
    if (validation.targetUnitIds) {
      setStep(1);
      queueMicrotask(() => document.getElementById("p5-runtime-target-units")?.focus());
      return;
    }
    if (validation.periodKey) {
      setStep(2);
      queueMicrotask(() => periodInputRef.current?.focus());
      return;
    }
    if (validation.scheduleIdentityJson) {
      setStep(2);
      queueMicrotask(() => scheduleInputRef.current?.focus());
    }
  };

  const runPreflight = async (cursor?: string | null) => {
    if (!actorUserId) {
      setMessage("Không xác định được actor hiện tại; preflight bị khóa an toàn.");
      return;
    }
    if (hasDynamicFlowLaunchErrors(validation)) {
      setMessage("Hãy hoàn tất các trường bắt buộc trước khi xem trước.");
      focusInvalidField();
      return;
    }

    const request = buildDynamicFlowPreflightRequest(draft, commandId);
    setPhase("PREFLIGHTING");
    setMessage(null);
    try {
      const result = await preflight({
        workId,
        body: request,
        limit: 25,
        cursor: cursor || undefined,
      }).unwrap();

      if (
        result.commandId !== request.commandId ||
        result.flowPin.flowTemplateVersionId !== request.flowTemplateVersionId ||
        result.periodKey !== request.periodKey ||
        result.scheduleIdentityJson !== request.scheduleIdentityJson
      ) {
        setPhase("STALE");
        setMessage("Preflight không khớp exact launch intent. Hãy xem trước lại.");
        persist("STALE", preview, confirmRequest);
        return;
      }

      if (cursor && preview && !previewIdentityMatches(preview, result)) {
        setPhase("STALE");
        setMessage("Trang target không còn cùng snapshot. Hãy xem trước lại.");
        persist("STALE", preview, confirmRequest);
        return;
      }

      const nextPreview: PreviewState = {
        ...result,
        targets: uniqueTargets(cursor && preview ? [...preview.targets, ...result.targets] : result.targets),
      };
      const nextConfirmRequest = buildDynamicFlowConfirmRequest(request, result.snapshotToken);
      setPreview(nextPreview);
      setConfirmRequest(nextConfirmRequest);
      setPhase("PREVIEW");
      setStep(3);
      persist("PREVIEW", nextPreview, nextConfirmRequest);
    } catch (error) {
      const presentation = runtimeErrorPresentation(error);
      setPhase(presentation.kind === "stale" ? "STALE" : "EDITING");
      setMessage(presentation.message);
    }
  };

  const runConfirm = async () => {
    if (!confirmRequest || !confirmEnabled) return;
    const retrying = phase === "RETRYING";
    const nextPhase: DynamicFlowLaunchPhase = retrying ? "RETRYING" : "CONFIRMING";
    setPhase(nextPhase);
    setMessage(null);
    persist(nextPhase, preview, confirmRequest);

    try {
      const result = await confirm({ workId, body: confirmRequest }).unwrap();
      if (
        result.commandId !== confirmRequest.commandId ||
        result.snapshotToken !== confirmRequest.snapshotToken ||
        (preview?.requestHash && result.requestHash !== preview.requestHash)
      ) {
        setPhase("STALE");
        setMessage("Confirm response không khớp command/snapshot/request hash đã xem trước.");
        persist("STALE", preview, confirmRequest);
        return;
      }
      if (result.flowInstanceId) {
        setPhase("SUCCESS");
        setMessage(`Đã mở Flow instance ${result.flowInstanceId}.`);
        if (actorUserId) clearDynamicFlowLaunchIntent(sessionStorage, workId, actorUserId);
        onOpenedInstance(result.flowInstanceId);
        return;
      }

      setPhase("RETRYING");
      setMessage(
        result.businessWritePerformed
          ? `${result.status}: instance đang materialize. Thử lại sẽ giữ nguyên lệnh.`
          : `${result.status}: runtime vẫn bị khóa theo gate phát hành; không có business write.`,
      );
      persist("RETRYING", preview, confirmRequest);
    } catch (error) {
      const presentation = runtimeErrorPresentation(error);
      if (presentation.kind === "stale") {
        setPhase("STALE");
        setMessage(presentation.message);
        persist("STALE", preview, confirmRequest);
      } else {
        setPhase("RETRYING");
        setMessage(`${presentation.message} Có thể thử lại cùng lệnh.`);
        persist("RETRYING", preview, confirmRequest);
      }
    }
  };

  const handleNext = () => {
    if (step === 0 && validation.flowTemplateVersionId) {
      focusInvalidField();
      return;
    }
    if (step === 1 && validation.targetUnitIds) {
      focusInvalidField();
      return;
    }
    if (step === 2) {
      void runPreflight();
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const handleClose = () => {
    if (preflightState.isLoading || confirmState.isLoading) return;
    onClose();
  };

  const blockedReason = preview?.blockedUntilPhase
    ? `Bị khóa đến ${preview.blockedUntilPhase}.`
    : preview?.eligibility === "BLOCKED_CATALOG"
      ? "Catalog runtime không khớp exact catalog 1.3 đang kích hoạt; yêu cầu bị khóa fail-closed."
      : preview?.eligibility === "BLOCKED_PHASE"
        ? "Archetype này chưa thuộc phạm vi runtime production đã được server kích hoạt."
        : !archetypeSupported && preview
          ? "Archetype yêu cầu không thuộc FLOW-T01..T12 của catalog 1.3 production đã niêm phong."
          : null;

  return (
    <Dialog
      open={open}
      data-testid="p5-runtime-launch-dialog"
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      fullScreen={mobile}
      aria-labelledby="p5-runtime-launch-title"
      aria-describedby="p5-runtime-launch-description"
    >
      <DialogTitle id="p5-runtime-launch-title">Khởi chạy Flow runtime</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography id="p5-runtime-launch-description" variant="body2" color="text.secondary">
            Preflight từ server khóa exact Flow/Form pins, actor snapshot, command id và snapshot
            token trước khi xác nhận.
          </Typography>

          <Stepper activeStep={step} alternativeLabel sx={{ overflowX: "auto", pb: 0.5 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box role="status" aria-live="polite">
            {message ? (
              <Alert severity={phase === "STALE" ? "warning" : phase === "SUCCESS" ? "success" : "info"}>
                {message}
              </Alert>
            ) : null}
          </Box>

          {!actorUserId ? (
            <Alert severity="error">
              Không xác định được actor đăng nhập. Mọi affordance runtime được khóa fail-closed.
            </Alert>
          ) : null}

          {step === 0 ? (
            <Stack spacing={2} role="group" aria-label="Chọn phiên bản Flow">
              <TextField
                inputRef={versionInputRef}
                inputProps={{ "data-testid": "p5-runtime-flow-version" }}
                label="Exact locked Flow version id"
                value={draft.flowTemplateVersionId}
                onChange={(event) => updateDraft({ flowTemplateVersionId: event.target.value })}
                error={Boolean(validation.flowTemplateVersionId)}
                helperText={
                  validation.flowTemplateVersionId ??
                  "Không dùng canExecute của màn hình thiết kế; server preflight xác minh phiên bản."
                }
                required
                fullWidth
                autoFocus
              />
              <Alert icon={<LockOutlinedIcon />} severity="info">
                UI không tự suy Flow đang eligible. Chỉ exact version pin trả về từ server mới được
                xác nhận.
              </Alert>
            </Stack>
          ) : null}

          {step === 1 ? (
            <Stack spacing={2} role="group" aria-label="Chọn đơn vị đích">
              <LazyUnitMultiSelect
                id="p5-runtime-target-units"
                value={draft.targetUnitIds}
                onChange={(targetUnitIds) => updateDraft({ targetUnitIds })}
                mode="multiple"
                label="Đơn vị đích"
                virtualUnitBehavior="reject"
              />
              {validation.targetUnitIds ? (
                <Typography color="error" variant="caption">
                  {validation.targetUnitIds}
                </Typography>
              ) : null}
              <Alert severity="info">
                Server chụp actor/participant snapshot theo đơn vị. Client không chọn hoặc suy role.
              </Alert>
            </Stack>
          ) : null}

          {step === 2 ? (
            <Stack spacing={2} role="group" aria-label="Kỳ và lịch chạy">
              <TextField
                inputRef={periodInputRef}
                inputProps={{ "data-testid": "p5-runtime-period-key" }}
                label="Period key"
                value={draft.periodKey}
                onChange={(event) => updateDraft({ periodKey: event.target.value })}
                error={Boolean(validation.periodKey)}
                helperText={validation.periodKey ?? "Ví dụ: 2026-Q3 hoặc 2026-07."}
                required
                fullWidth
              />
              <TextField
                inputRef={scheduleInputRef}
                inputProps={{ "data-testid": "p5-runtime-schedule-identity" }}
                label="Schedule identity JSON"
                value={draft.scheduleIdentityJson}
                onChange={(event) => updateDraft({ scheduleIdentityJson: event.target.value })}
                error={Boolean(validation.scheduleIdentityJson)}
                helperText={
                  validation.scheduleIdentityJson ??
                  "JSON được giữ nguyên trong preflight, confirm và mọi confirm retry."
                }
                multiline
                minRows={4}
                required
                fullWidth
              />
            </Stack>
          ) : null}

          {step === 3 && preview ? (
            <Stack spacing={2} role="region" aria-label="Xem trước exact Flow và Form pins">
              <Alert
                severity={blockedReason ? "warning" : "success"}
                icon={blockedReason ? <LockOutlinedIcon /> : <VerifiedOutlinedIcon />}
              >
                {blockedReason ?? "Snapshot đủ điều kiện xác nhận theo server."}
              </Alert>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
                <Chip label={`Eligibility: ${preview.eligibility}`} />
                <Chip label={`Archetype: ${preview.flowPin.archetypeId}`} />
                <Chip label={`Catalog: ${preview.flowPin.catalogVersion}`} />
                <Chip label={`Flow v${preview.flowPin.flowTemplateVersionNo}`} />
              </Stack>
              <Box sx={{ overflowWrap: "anywhere" }}>
                <Typography variant="caption" color="text.secondary">
                  Command id
                </Typography>
                <Typography variant="body2">{preview.commandId}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Snapshot token
                </Typography>
                <Typography variant="body2">{preview.snapshotToken}</Typography>
              </Box>
              <Divider />
              <Typography variant="subtitle2">Form pins ({preview.formPins.length})</Typography>
              <List dense disablePadding sx={{ maxHeight: 220, overflow: "auto" }}>
                {preview.formPins.map((pin) => (
                  <ListItem key={`${pin.formNodeId}:${pin.dynamicFormTemplateId}`} disableGutters>
                    <ListItemText
                      primary={`${pin.formNodeId} · Form v${pin.dynamicFormVersionNo}`}
                      secondary={`${pin.dynamicFormTemplateId} · ${pin.dynamicFormSchemaHash}`}
                      secondaryTypographyProps={{ sx: { overflowWrap: "anywhere" } }}
                    />
                  </ListItem>
                ))}
              </List>
              <Typography variant="subtitle2">
                Target snapshots ({preview.targets.length}/{preview.targetTotal})
              </Typography>
              <List dense disablePadding sx={{ maxHeight: 260, overflow: "auto" }}>
                {preview.targets.map((target) => (
                  <ListItem key={target.targetUnitId} disableGutters>
                    <ListItemText
                      primary={target.targetUnitId}
                      secondary={`${target.participants.length} participant · ${target.assigneeUserIds.length} assignee`}
                    />
                  </ListItem>
                ))}
              </List>
              {preview.targetHasMore && preview.targetNextCursor ? (
                <Button
                  onClick={() => void runPreflight(preview.targetNextCursor)}
                  disabled={preflightState.isLoading}
                >
                  Tải thêm target snapshot
                </Button>
              ) : null}
            </Stack>
          ) : null}

          {step === 4 && preview && confirmRequest ? (
            <Stack spacing={2} role="region" aria-label="Xác nhận launch snapshot">
              <Alert severity={confirmEnabled ? "warning" : "info"}>
                {confirmEnabled
                  ? "Xác nhận sẽ gửi đúng request đã preflight. Không sửa command id hoặc snapshot token."
                  : blockedReason ?? "Server chưa cho phép xác nhận snapshot này."}
              </Alert>
              <TextField label="Command id" value={confirmRequest.commandId} InputProps={{ readOnly: true }} />
              <TextField
                label="Snapshot token"
                value={confirmRequest.snapshotToken}
                InputProps={{ readOnly: true }}
                multiline
              />
              <Alert severity="info">
                FLOW-T01..T12 đã có runtime production qua catalog 1.3 được niêm phong. Mapping/source rules
                vẫn bị khóa đến P7; statistics/aggregation vẫn bị khóa đến P8.
              </Alert>
            </Stack>
          ) : null}

          {preflightState.isLoading || confirmState.isLoading ? (
            <Stack direction="row" spacing={1} alignItems="center" role="status">
              <CircularProgress size={20} />
              <Typography variant="body2">
                {confirmState.isLoading ? "Đang xác nhận cùng lệnh…" : "Đang tạo snapshot xem trước…"}
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={handleClose} disabled={preflightState.isLoading || confirmState.isLoading}>
          Đóng
        </Button>
        <Box sx={{ flex: 1 }} />
        {step > 0 ? (
          <Button
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
            disabled={preflightState.isLoading || confirmState.isLoading}
          >
            Quay lại
          </Button>
        ) : null}
        {step < 4 ? (
          <Button
            variant="contained"
            data-testid={
              step === 2
                ? "p5-runtime-preflight"
                : "p5-runtime-next"
            }
            onClick={handleNext}
            disabled={preflightState.isLoading || confirmState.isLoading || !actorUserId}
          >
            {step === 2 ? "Xem trước từ server" : "Tiếp tục"}
          </Button>
        ) : (
          <Button
            variant="contained"
            data-testid="p5-runtime-confirm"
            color={phase === "RETRYING" ? "warning" : "primary"}
            startIcon={phase === "RETRYING" ? <ReplayOutlinedIcon /> : <VerifiedOutlinedIcon />}
            onClick={() => void runConfirm()}
            disabled={!confirmEnabled || confirmState.isLoading}
          >
            {phase === "RETRYING" ? "Thử lại cùng lệnh" : "Xác nhận snapshot"}
          </Button>
        )}
        {phase === "STALE" ? (
          <Button
            startIcon={<ReplayOutlinedIcon />}
            onClick={() => {
              setPreview(null);
              setConfirmRequest(null);
              setPhase("EDITING");
              setStep(2);
              setMessage("Snapshot cũ đã bỏ. Hãy preflight lại cùng command và launch intent.");
              if (actorUserId) clearDynamicFlowLaunchIntent(sessionStorage, workId, actorUserId);
            }}
          >
            Xem trước lại
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
