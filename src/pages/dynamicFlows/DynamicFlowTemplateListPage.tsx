import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SaveIcon from "@mui/icons-material/Save";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

import {
  useCreateDynamicFlowTemplateMutation,
  useLazyGetDynamicFlowTemplateQuery,
  useLockDynamicFlowTemplateVersionMutation,
  useSaveDynamicFlowTemplateVersionDraftMutation,
  useSearchDynamicFlowTemplatesMutation,
  useUpdateDynamicFlowTemplateMutation,
  hasDynamicFlowPermissionMetadata,
  type DynamicFlowTemplateDto,
  type DynamicFlowTemplateVersionDto,
  type FlowActorPolicy,
  type FlowActorRole,
  type FlowFieldPolicy,
  type FlowFormNode,
  type FlowMappingCalculation,
  type FlowMappingEndpoint,
  type FlowMappingInput,
  type FlowMappingRule,
  type FlowPayload,
  type FlowStep,
  type FlowTableColumnPolicy,
  type FlowTransition,
} from "../../api/dynamicFlowTemplateApi";
import { dynamicFlowVersionPath } from "../../routes/dynamicFlowRoutes";
import { DynamicFlowEligibilityBadges } from "./DynamicFlowEligibilityBadges";
import {
  useLazyGetDynamicFormQuery,
  useSearchDynamicFormsMutation,
  type DynamicFormDetail,
  type DynamicFormRow,
} from "../../api/dynamicFormApi";

type MappingDialogState = {
  edgeIndex: number;
  sourceStep: FlowStep;
  targetStep: FlowStep;
} | null;

type ActorPermissionDialogState = {
  stepId: string;
} | null;

type FormSectionOption = {
  id: string;
  code?: string | null;
  label: string;
};

type FormFieldOption = {
  id?: string | null;
  key: string;
  code?: string | null;
  label: string;
  sectionId?: string | null;
  sectionLabel?: string | null;
  dataType?: string | null;
};

type FormTableColumnOption = {
  blockId: string;
  columnKey: string;
  label: string;
  dataType: string;
};

type MappingPick = {
  kind: "FIELD" | "TABLE_COLUMN";
  sectionId?: string | null;
  fieldKey?: string | null;
  fieldId?: string | null;
  blockId?: string | null;
  columnKey?: string | null;
  dataType?: string | null;
  label: string;
  subtitle?: string | null;
};

const defaultTransformOptions = ["COPY", "FIRST_NON_BLANK", "SUM", "COUNT", "TEXT_JOIN", "CALC_PERCENTAGE"];
const transformOptionLabels: Record<string, string> = {
  COPY: "Sao chép",
  FIRST_NON_BLANK: "Giá trị không trống đầu tiên",
  SUM: "Tổng",
  COUNT: "Đếm",
  TEXT_JOIN: "Nối văn bản",
  CALC_PERCENTAGE: "Tính tỷ lệ phần trăm",
};

const actorRoleLabels: Record<FlowActorRole, string> = {
  ISSUER: "Người giao",
  ASSIGNEE: "Người được giao",
  COORDINATOR: "Người phối hợp",
  REVIEWER: "Người duyệt",
  FINALIZER: "Người chốt",
};

export default function DynamicFlowTemplateListPage() {
  const navigate = useNavigate();
  const { familyId: routeFamilyId, versionId: routeVersionId } = useParams<{
    familyId?: string;
    versionId?: string;
  }>();
  const [forms, setForms] = useState<DynamicFormRow[]>([]);
  const [formDetails, setFormDetails] = useState<Record<string, DynamicFormDetail>>({});
  const [flows, setFlows] = useState<DynamicFlowTemplateDto[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<DynamicFlowTemplateDto | null>(null);
  const [payload, setPayload] = useState<FlowPayload>(() => createEmptyPayload(""));
  const [createRootFormId, setCreateRootFormId] = useState("");
  const [createFlowCode, setCreateFlowCode] = useState("");
  const [createFlowName, setCreateFlowName] = useState("Quy trình động");
  const [editorFlowName, setEditorFlowName] = useState("");
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const [mappingDialog, setMappingDialog] = useState<MappingDialogState>(null);
  const [actorDialog, setActorDialog] = useState<ActorPermissionDialogState>(null);

  const [searchForms, searchFormsState] = useSearchDynamicFormsMutation();
  const [searchFlows, searchFlowsState] = useSearchDynamicFlowTemplatesMutation();
  const [loadFlow, loadFlowState] = useLazyGetDynamicFlowTemplateQuery();
  const [loadFormDetail] = useLazyGetDynamicFormQuery();
  const [createFlow, createFlowState] = useCreateDynamicFlowTemplateMutation();
  const [updateFlow, updateFlowState] = useUpdateDynamicFlowTemplateMutation();
  const [saveDraft, saveDraftState] = useSaveDynamicFlowTemplateVersionDraftMutation();
  const [lockVersion, lockVersionState] = useLockDynamicFlowTemplateVersionMutation();

  const busy =
    searchFormsState.isLoading ||
    searchFlowsState.isLoading ||
    loadFlowState.isFetching ||
    createFlowState.isLoading ||
    updateFlowState.isLoading ||
    saveDraftState.isLoading ||
    lockVersionState.isLoading;

  const formById = useMemo(
    () => new Map(forms.map((form) => [form.id, form])),
    [forms],
  );
  const linkedFormIds = useMemo(
    () => payload.formNodes.map((node) => node.dynamicFormTemplateId).filter(Boolean),
    [payload.formNodes],
  );
  const linkedFormIdsKey = linkedFormIds.join("|");

  useEffect(() => {
    const missingIds = linkedFormIds.filter((id) => !formDetails[id]);
    if (missingIds.length === 0) return;

    let cancelled = false;
    void Promise.all(
      missingIds.map((id) =>
        loadFormDetail({ id })
          .unwrap()
          .then((detail) => [id, detail] as const)
          .catch(() => null),
      ),
    ).then((entries) => {
      if (cancelled) return;
      const nextEntries = entries.filter((entry): entry is readonly [string, DynamicFormDetail] => Boolean(entry));
      if (nextEntries.length === 0) return;
      setFormDetails((current) => {
        const next = { ...current };
        nextEntries.forEach(([id, detail]) => {
          next[id] = detail;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [linkedFormIdsKey, formDetails, loadFormDetail]);

  const reloadForms = async () => {
    const result = await searchForms({ page: 0, pageSize: 100, isActive: true, isPublished: true }).unwrap();
    setForms(result.rows ?? []);
  };

  const reloadFlows = async () => {
    const result = await searchFlows({ page: 0, pageSize: 50 }).unwrap();
    setFlows(result.rows ?? []);
  };

  useEffect(() => {
    void Promise.all([reloadForms(), reloadFlows()]).catch(() => {
      setMessage({ severity: "error", text: "Không tải được dữ liệu tạo quy trình. Hãy thử lại." });
    });
  }, []);

  const selectFlow = async (id: string, requestedVersionId?: string) => {
    const detail = await loadFlow({ id }).unwrap();
    const requestedVersion = requestedVersionId
      ? detail.versions.find((candidate) => candidate.id === requestedVersionId)
      : null;
    if (requestedVersionId && !requestedVersion) {
      throw new Error("DYNAMIC_FLOW_VERSION_NOT_AVAILABLE");
    }
    const version = requestedVersion ?? detail.draftVersion ?? detail.currentVersion;
    const nextPayload = parsePayload(
      version?.payload,
      version?.payloadJson,
      detail.rootDynamicFormTemplateId ?? detail.dynamicFormTemplateId ?? "",
    );
    setSelectedFlow(detail);
    setPayload(nextPayload);
    setEditorFlowName(detail.name);
    setMessage(null);
    return { detail, version };
  };

  useEffect(() => {
    if (!routeFamilyId) {
      setSelectedFlow(null);
      return;
    }

    let cancelled = false;
    void selectFlow(routeFamilyId, routeVersionId).catch(() => {
      if (!cancelled) {
        setMessage({ severity: "error", text: "Không mở được phiên bản quy trình theo đường dẫn này." });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [routeFamilyId, routeVersionId]);

  const handleSelectFlow = async (id: string) => {
    try {
      const opened = await selectFlow(id);
      if (opened.version) {
        navigate(dynamicFlowVersionPath(opened.detail.id, opened.version.id));
      }
    } catch {
      setMessage({ severity: "error", text: "Không mở được quy trình đã chọn." });
    }
  };

  const handleCreate = async () => {
    const normalizedCode = createFlowCode.trim().toUpperCase();
    if (!normalizedCode) {
      setMessage({ severity: "error", text: "Nhập mã quy trình trước khi tạo." });
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9_.-]*$/.test(normalizedCode)) {
      setMessage({ severity: "error", text: "Mã quy trình chỉ được dùng chữ in hoa, số, dấu gạch dưới, dấu gạch ngang hoặc dấu chấm." });
      return;
    }
    if (!createRootFormId) {
      setMessage({ severity: "error", text: "Chọn biểu mẫu gốc trước khi tạo quy trình." });
      return;
    }

    try {
      const nextPayload = createEmptyPayload(createRootFormId);
      const created = await createFlow({
        commandId: createDynamicFlowCommandId(),
        code: normalizedCode,
        name: createFlowName.trim() || "Quy trình động",
        rootDynamicFormTemplateId: createRootFormId,
        dynamicFormTemplateId: createRootFormId,
        payload: nextPayload,
      }).unwrap();
      await reloadFlows();
      const opened = await selectFlow(created.id);
      if (opened.version) {
        navigate(dynamicFlowVersionPath(opened.detail.id, opened.version.id));
      }
      setCreateFlowCode("");
      setMessage({ severity: "success", text: "Đã tạo quy trình." });
    } catch {
      setMessage({ severity: "error", text: "Không tạo được quy trình." });
    }
  };

  const persistDraft = async (): Promise<{
    family: DynamicFlowTemplateDto;
    version: DynamicFlowTemplateVersionDto;
  } | null> => {
    if (!selectedFlow) return null;
    if (!payload.rootDynamicFormTemplateId) {
      throw new Error("DYNAMIC_FLOW_ROOT_FORM_REQUIRED");
    }
    const draft = selectedFlow.draftVersion;
    if (!draft) return null;

    const updatedFamily = await updateFlow({
      id: selectedFlow.id,
      body: {
        commandId: createDynamicFlowCommandId(),
        expectedFamilyRevision: selectedFlow.familyRevision ?? 0,
        name: editorFlowName.trim() || selectedFlow.name,
        rootDynamicFormTemplateId: payload.rootDynamicFormTemplateId,
        dynamicFormTemplateId: payload.rootDynamicFormTemplateId,
      },
    }).unwrap();
    const savedVersion = await saveDraft({
      id: selectedFlow.id,
      body: {
        commandId: createDynamicFlowCommandId(),
        expectedDraftRevision: draft.draftRevision,
        expectedPayloadHash: draft.payloadHash,
        payload: normalizePayload(payload),
      },
    }).unwrap();
    return { family: updatedFamily, version: savedVersion };
  };

  const handleSave = async () => {
    try {
      const persisted = await persistDraft();
      if (!persisted || !selectedFlow) return;
      await reloadFlows();
      await selectFlow(selectedFlow.id);
      setMessage({ severity: "success", text: "Đã lưu bản nháp quy trình." });
    } catch {
      setMessage({ severity: "error", text: "Không lưu được bản nháp quy trình." });
    }
  };

  const handleLock = async () => {
    if (!selectedFlow?.draftVersion) {
      setMessage({ severity: "error", text: "Không có phiên bản nháp để khóa." });
      return;
    }

    try {
      const persisted = await persistDraft();
      if (!persisted) return;
      await lockVersion({
        versionId: persisted.version.id,
        body: {
          commandId: createDynamicFlowCommandId(),
          expectedFamilyRevision:
            persisted.family.familyRevision ?? (selectedFlow.familyRevision ?? 0) + 1,
          expectedDraftRevision: persisted.version.draftRevision,
          expectedPayloadHash: persisted.version.payloadHash,
        },
      }).unwrap();
      await reloadFlows();
      await selectFlow(selectedFlow.id);
      setMessage({ severity: "success", text: "Đã khóa phiên bản quy trình." });
    } catch {
      setMessage({ severity: "error", text: "Không khóa được phiên bản quy trình." });
    }
  };

  const handleEditorRootChange = (nextRootId: string) => {
    setPayload((current) => setPayloadRoot(current, nextRootId));
  };

  const handleAddNextForm = (formId: string, parentStepId: string) => {
    if (!formId) return;
    setPayload((current) => addFormStep(current, formId, parentStepId));
  };

  const updateStep = (index: number, patch: Partial<FlowStep>) => {
    setPayload((current) => {
      const existing = current.steps[index];
      if (!existing) return current;
      const nextStep = { ...existing, ...patch };
      const updatePolicy = <T extends { stepId?: string | null; stepCode?: string | null }>(policy: T): T =>
        policy.stepId === existing.stepId ? { ...policy, stepCode: nextStep.stepCode } : policy;
      return normalizePayload({
        ...current,
        steps: current.steps.map((step, i) => (i === index ? nextStep : step)),
        actorPolicies: current.actorPolicies.map(updatePolicy),
        fieldPolicies: current.fieldPolicies.map(updatePolicy),
        tableColumnPolicies: current.tableColumnPolicies.map(updatePolicy),
        mappingRules: current.mappingRules.map((rule) => ({
          ...rule,
          sourceStepCode: rule.sourceStepId === existing.stepId ? nextStep.stepCode : rule.sourceStepCode,
          targetStepCode: rule.targetStepId === existing.stepId ? nextStep.stepCode : rule.targetStepCode,
          inputs: rule.inputs?.map((input) => ({
            ...input,
            source: input.source.stepId === existing.stepId
              ? { ...input.source, stepCode: nextStep.stepCode }
              : input.source,
          })) ?? null,
          target: rule.target?.stepId === existing.stepId
            ? { ...rule.target, stepCode: nextStep.stepCode }
            : rule.target,
        })),
      });
    });
  };

  const updateStepForm = (index: number, formId: string) => {
    setPayload((current) => {
      const withNode = ensureFormNode(current, formId);
      const changedStep = withNode.steps[index];
      if (!changedStep || changedStep.dynamicFormTemplateId === formId) return withNode;
      return normalizePayload({
        ...withNode,
        steps: withNode.steps.map((step, i) => (i === index ? { ...step, dynamicFormTemplateId: formId } : step)),
        fieldPolicies: withNode.fieldPolicies.filter((policy) => policy.stepId !== changedStep.stepId),
        tableColumnPolicies: withNode.tableColumnPolicies.filter((policy) => policy.stepId !== changedStep.stepId),
        mappingRules: withNode.mappingRules.filter((rule) =>
          rule.sourceStepId !== changedStep.stepId &&
          rule.targetStepId !== changedStep.stepId &&
          !rule.inputs?.some((input) => input.source.stepId === changedStep.stepId) &&
          rule.target?.stepId !== changedStep.stepId,
        ),
      });
    });
  };

  const updateStepParent = (stepId: string, parentStepId: string) => {
    setPayload((current) => {
      const step = current.steps.find((item) => item.stepId === stepId);
      const parent = current.steps.find((item) => item.stepId === parentStepId);
      if (!step || !parent || step.stepId === current.steps[0]?.stepId || parent.stepOrder >= step.stepOrder) return current;
      const oldParentId = current.transitions.find((transition) => transition.toStepId === stepId)?.fromStepId;
      return normalizePayload({
        ...current,
        transitions: [
          ...current.transitions.filter((transition) => transition.toStepId !== stepId),
          {
            transitionId: `transition_${parentStepId}_${stepId}`,
            fromStepId: parentStepId,
            toStepId: stepId,
          },
        ],
        mappingRules: oldParentId
          ? current.mappingRules.filter((rule) => !mappingConnectsSteps(rule, stepId, oldParentId))
          : current.mappingRules,
      });
    });
  };

  const removeStep = (index: number) => {
    if (index === 0) return;
    setPayload((current) => {
      const removedStep = current.steps[index];
      if (!removedStep) return current;
      const parentStepId = current.transitions.find((transition) => transition.toStepId === removedStep.stepId)?.fromStepId;
      const childStepIds = current.transitions
        .filter((transition) => transition.fromStepId === removedStep.stepId)
        .map((transition) => transition.toStepId);
      const nextTransitions = current.transitions.filter((transition) =>
        transition.fromStepId !== removedStep.stepId && transition.toStepId !== removedStep.stepId,
      );
      if (parentStepId) {
        childStepIds.forEach((childStepId) => {
          nextTransitions.push({
            transitionId: `transition_${parentStepId}_${childStepId}`,
            fromStepId: parentStepId,
            toStepId: childStepId,
          });
        });
      }

      return normalizePayload({
        ...current,
        steps: current.steps.filter((_, i) => i !== index),
        transitions: nextTransitions,
        actorPolicies: current.actorPolicies.filter((policy) => policy.stepId !== removedStep.stepId),
        fieldPolicies: current.fieldPolicies.filter((policy) => policy.stepId !== removedStep.stepId),
        tableColumnPolicies: current.tableColumnPolicies.filter((policy) => policy.stepId !== removedStep.stepId),
        mappingRules: current.mappingRules.filter((rule) =>
          rule.sourceStepId !== removedStep.stepId &&
          rule.targetStepId !== removedStep.stepId &&
          !rule.inputs?.some((input) => input.source.stepId === removedStep.stepId) &&
          rule.target?.stepId !== removedStep.stepId,
        ),
      });
    });
  };

  const selectedVersion = selectedFlow?.draftVersion ?? selectedFlow?.currentVersion ?? null;
  const selectedPermissionMetadata = selectedVersion && hasDynamicFlowPermissionMetadata(selectedVersion)
    ? selectedVersion
    : selectedFlow && hasDynamicFlowPermissionMetadata(selectedFlow)
      ? selectedFlow
      : null;

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ md: "center" }}
        justifyContent="space-between"
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <AccountTreeOutlinedIcon color="primary" />
            <Typography variant="h5" fontWeight={800}>
              Quy trình động
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Tạo cây biểu mẫu, chuyển bước và ánh xạ dữ liệu trong quy trình.
          </Typography>
        </Box>
        {busy && <CircularProgress size={22} />}
      </Stack>

      {message && <Alert severity={message.severity}>{message.text}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, bgcolor: "background.paper" }}>
        <Stack spacing={1.25}>
          <Typography fontWeight={800}>Tạo quy trình mới</Typography>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ md: "center" }}
            flexWrap="wrap"
            useFlexGap
          >
            <TextField
              select
              size="small"
              label="Biểu mẫu gốc ban đầu"
              value={createRootFormId}
              onChange={(event) => setCreateRootFormId(event.target.value)}
              sx={{ minWidth: { md: 360 } }}
            >
              {forms.map((form) => (
                <MenuItem key={form.id} value={form.id}>
                  {form.code} - {form.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Mã quy trình mới"
              value={createFlowCode}
              onChange={(event) => setCreateFlowCode(event.target.value.toUpperCase())}
              inputProps={{ maxLength: 80 }}
              sx={{ minWidth: { md: 220 } }}
            />
            <TextField
              size="small"
              label="Tên quy trình mới"
              value={createFlowName}
              onChange={(event) => setCreateFlowName(event.target.value)}
              sx={{ minWidth: { md: 320 } }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => void handleCreate()}
              disabled={busy || !createRootFormId || !createFlowCode.trim()}
              sx={{ minHeight: 40 }}
            >
              Tạo quy trình
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="stretch">
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, width: { lg: 320 }, flexShrink: 0 }}>
          <Typography fontWeight={800} sx={{ mb: 1 }}>
            Danh sách quy trình
          </Typography>
          <Stack spacing={1}>
            {flows.map((flow) => (
              <Button
                key={flow.id}
                variant={selectedFlow?.id === flow.id ? "contained" : "outlined"}
                onClick={() => void handleSelectFlow(flow.id)}
                sx={{ justifyContent: "flex-start", textTransform: "none", minHeight: 58 }}
              >
                <Stack alignItems="flex-start" sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700} noWrap>{flow.name}</Typography>
                  <Typography variant="caption" noWrap>{flow.code}</Typography>
                </Stack>
              </Button>
            ))}
            {flows.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Chưa có quy trình.
              </Typography>
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 0, borderRadius: 1, flex: 1, minWidth: 0, overflow: "hidden" }}>
          {!selectedFlow ? (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary">Chọn hoặc tạo một quy trình để cấu hình.</Typography>
            </Box>
          ) : (
            <Stack sx={{ minHeight: 560 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                alignItems={{ md: "center" }}
                justifyContent="space-between"
                sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" fontWeight={800} noWrap>{editorFlowName.trim() || selectedFlow.name}</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={flowStatusLabel(selectedFlow.status)} />
                    <Chip size="small" variant="outlined" label={`Gốc: ${formLabel(formById, payload.rootDynamicFormTemplateId)}`} />
                  </Stack>
                  {selectedPermissionMetadata && (
                    <Box sx={{ mt: 1 }}>
                      <DynamicFlowEligibilityBadges metadata={selectedPermissionMetadata} />
                    </Box>
                  )}
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={() => void handleSave()}
                    disabled={busy || selectedPermissionMetadata?.canManage === false}
                  >
                    Lưu bản nháp
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<LockOutlinedIcon />}
                    onClick={() => void handleLock()}
                    disabled={
                      busy ||
                      !selectedFlow.draftVersion ||
                      selectedPermissionMetadata?.canManage === false ||
                      selectedPermissionMetadata?.definitionLockable === false
                    }
                  >
                    Khóa phiên bản
                  </Button>
                </Stack>
              </Stack>

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
              >
                <TextField
                  size="small"
                  label="Tên quy trình đang chỉnh sửa"
                  value={editorFlowName}
                  onChange={(event) => setEditorFlowName(event.target.value)}
                  sx={{ minWidth: { md: 320 } }}
                />
                <TextField
                  select
                  size="small"
                  label="Biểu mẫu gốc của quy trình"
                  value={payload.rootDynamicFormTemplateId ?? ""}
                  onChange={(event) => handleEditorRootChange(event.target.value)}
                  sx={{ minWidth: { md: 420 } }}
                >
                  {payload.rootDynamicFormTemplateId && !formById.has(payload.rootDynamicFormTemplateId) && (
                    <MenuItem value={payload.rootDynamicFormTemplateId} disabled>
                      {formDetails[payload.rootDynamicFormTemplateId]
                        ? `${formDetails[payload.rootDynamicFormTemplateId].code} - ${formDetails[payload.rootDynamicFormTemplateId].name} (chưa phát hành hoặc ngừng dùng)`
                        : `${payload.rootDynamicFormTemplateId} (không còn trong danh sách được phép)`}
                    </MenuItem>
                  )}
                  {forms.map((form) => (
                    <MenuItem key={form.id} value={form.id}>
                      {form.code} - {form.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Box sx={{ bgcolor: "#f6f7fb", p: 2, flex: 1 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    bgcolor: "#fff",
                    borderRadius: 1,
                    minHeight: 460,
                    overflow: "auto",
                    p: 3,
                  }}
                >
                  <Stack spacing={2} sx={{ minWidth: 920 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width={210}>Bước</TableCell>
                          <TableCell width={280}>Biểu mẫu</TableCell>
                          <TableCell width={240}>Bước trước</TableCell>
                          <TableCell align="center">Quyền</TableCell>
                          <TableCell align="center">Ánh xạ</TableCell>
                          <TableCell width={56}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payload.steps.map((step, index) => {
                          const parentStepId = payload.transitions.find((transition) => transition.toStepId === step.stepId)?.fromStepId;
                          const parentStep = payload.steps.find((item) => item.stepId === parentStepId);
                          return (
                            <FlowStepRow
                              key={step.stepId}
                              index={index}
                              step={step}
                              parentStep={parentStep}
                              steps={payload.steps}
                              forms={forms}
                              formById={formById}
                              isRoot={index === 0}
                              mappingCount={parentStep
                                ? countMappingsForEdge(payload.mappingRules, step.stepId, parentStep.stepId)
                                : 0}
                              onPatch={(patch) => updateStep(index, patch)}
                              onFormChange={(formId) => updateStepForm(index, formId)}
                              onParentChange={(parentId) => updateStepParent(step.stepId, parentId)}
                              onPermissions={() => setActorDialog({ stepId: step.stepId })}
                              onMapping={() => parentStep && setMappingDialog({ edgeIndex: index - 1, sourceStep: step, targetStep: parentStep })}
                              onRemove={() => removeStep(index)}
                            />
                          );
                        })}
                      </TableBody>
                    </Table>

                    <AddFlowNode forms={forms} steps={payload.steps} onAdd={handleAddNextForm} />
                  </Stack>
                </Paper>
              </Box>
            </Stack>
          )}
        </Paper>
      </Stack>

      <MappingDialog
        state={mappingDialog}
        payload={payload}
        setPayload={setPayload}
        formById={formById}
        formDetails={formDetails}
        onClose={() => setMappingDialog(null)}
      />

      <ActorPermissionDialog
        state={actorDialog}
        payload={payload}
        setPayload={setPayload}
        formById={formById}
        formDetails={formDetails}
        onClose={() => setActorDialog(null)}
      />
    </Stack>
  );
}

function FlowStepRow(props: {
  index: number;
  step: FlowStep;
  parentStep?: FlowStep;
  steps: FlowStep[];
  forms: DynamicFormRow[];
  formById: Map<string, DynamicFormRow>;
  isRoot: boolean;
  mappingCount: number;
  onPatch: (patch: Partial<FlowStep>) => void;
  onFormChange: (formId: string) => void;
  onParentChange: (stepId: string) => void;
  onPermissions: () => void;
  onMapping: () => void;
  onRemove: () => void;
}) {
  const { index, step, parentStep, steps, forms, formById, isRoot, mappingCount, onPatch, onFormChange, onParentChange, onPermissions, onMapping, onRemove } = props;
  const parentOptions = steps.filter((candidate) => candidate.stepOrder < step.stepOrder);

  return (
    <TableRow hover>
      <TableCell>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" color={isRoot ? "primary" : "default"} label={isRoot ? "Gốc" : `Bước ${index + 1}`} />
            <TextField
              size="small"
              label="Mã bước"
              value={step.stepCode}
              onChange={(event) => onPatch({ stepCode: event.target.value.toUpperCase() })}
              sx={{ width: 130 }}
            />
          </Stack>
          <TextField
            size="small"
            label="Tên bước"
            value={step.stepName ?? ""}
            onChange={(event) => onPatch({ stepName: event.target.value })}
          />
        </Stack>
      </TableCell>
      <TableCell>
        <TextField
          select
          size="small"
          label="Biểu mẫu của bước"
          value={step.dynamicFormTemplateId}
          onChange={(event) => onFormChange(event.target.value)}
          disabled={isRoot}
          fullWidth
        >
          {!forms.some((form) => form.id === step.dynamicFormTemplateId) && (
            <MenuItem value={step.dynamicFormTemplateId} disabled>
              {formLabel(formById, step.dynamicFormTemplateId)} (chưa phát hành hoặc ngừng dùng)
            </MenuItem>
          )}
          {forms.map((form) => (
            <MenuItem key={form.id} value={form.id}>{formLabel(formById, form.id)}</MenuItem>
          ))}
        </TextField>
      </TableCell>
      <TableCell>
        {isRoot ? (
          <Typography variant="body2" color="text.secondary">Điểm bắt đầu của quy trình</Typography>
        ) : (
          <TextField
            select
            size="small"
            label="Bước trước"
            value={parentStep?.stepId ?? ""}
            onChange={(event) => onParentChange(event.target.value)}
            fullWidth
          >
            {parentOptions.map((candidate) => (
              <MenuItem key={candidate.stepId} value={candidate.stepId}>
                {candidate.stepCode} - {candidate.stepName || formLabel(formById, candidate.dynamicFormTemplateId)}
              </MenuItem>
            ))}
          </TextField>
        )}
      </TableCell>
      <TableCell align="center">
        <Button
          size="small"
          variant="outlined"
          startIcon={<SettingsOutlinedIcon />}
          onClick={onPermissions}
        >
          Cấu hình
        </Button>
      </TableCell>
      <TableCell align="center">
        <Button
          size="small"
          variant={mappingCount > 0 ? "contained" : "outlined"}
          onClick={onMapping}
          disabled={!parentStep}
        >
          Ánh xạ {mappingCount > 0 ? `(${mappingCount})` : ""}
        </Button>
      </TableCell>
      <TableCell align="right">
        {!isRoot && (
          <Tooltip title="Xóa bước">
            <IconButton onClick={onRemove}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
}

function AddFlowNode(props: { forms: DynamicFormRow[]; steps: FlowStep[]; onAdd: (formId: string, parentStepId: string) => void }) {
  const [value, setValue] = useState("");
  const [parentStepId, setParentStepId] = useState(props.steps.at(-1)?.stepId ?? "");

  useEffect(() => {
    if (!props.steps.some((step) => step.stepId === parentStepId)) {
      setParentStepId(props.steps.at(-1)?.stepId ?? "");
    }
  }, [parentStepId, props.steps]);

  return (
    <Paper
      variant="outlined"
      sx={{
        width: 520,
        maxWidth: "100%",
        minHeight: 160,
        borderRadius: 1,
        borderStyle: "dashed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        flexShrink: 0,
      }}
    >
      <Stack spacing={1.25} sx={{ width: "100%" }} alignItems="stretch">
        <Typography fontWeight={800} textAlign="center">Thêm bước tiếp</Typography>
        <TextField
          select
          size="small"
          label="Nối sau bước"
          value={parentStepId}
          onChange={(event) => setParentStepId(event.target.value)}
        >
          {props.steps.map((step) => (
            <MenuItem key={step.stepId} value={step.stepId}>{step.stepCode} - {step.stepName || "Chưa đặt tên"}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Chọn biểu mẫu"
          value={value}
          onChange={(event) => {
            const formId = event.target.value;
            setValue("");
            props.onAdd(formId, parentStepId);
          }}
        >
          {props.forms.map((form) => (
            <MenuItem key={form.id} value={form.id}>
              {form.code} - {form.name}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="caption" color="text.secondary" textAlign="center">
          Chọn biểu mẫu để tạo bước mới.
        </Typography>
      </Stack>
    </Paper>
  );
}

function ActorPermissionDialog(props: {
  state: ActorPermissionDialogState;
  payload: FlowPayload;
  setPayload: Dispatch<SetStateAction<FlowPayload>>;
  formById: Map<string, DynamicFormRow>;
  formDetails: Record<string, DynamicFormDetail>;
  onClose: () => void;
}) {
  const { state, payload, setPayload, formById, formDetails, onClose } = props;
  const [stepId, setStepId] = useState(state?.stepId ?? "");
  const [actorRole, setActorRole] = useState<FlowActorRole>("ASSIGNEE");

  useEffect(() => {
    if (state?.stepId) {
      setStepId(state.stepId);
      setActorRole("ASSIGNEE");
    }
  }, [state?.stepId]);

  if (!state) return null;

  const selectedStep = payload.steps.find((step) => step.stepId === stepId) ?? payload.steps[0];
  const detail = selectedStep ? formDetails[selectedStep.dynamicFormTemplateId] : undefined;
  const catalog = readFormCatalog(detail);
  const fieldRows = catalog.fields;
  const tableColumns = catalog.tableColumns;
  const effectiveAllowSubFlow = resolveActorBooleanPolicy(
    payload.actorPolicies,
    selectedStep,
    actorRole,
    (policy) => policy.allowSubFlow,
  );

  const fieldPermissionState = (field: FormFieldOption) => resolvePermissionPolicy(
    payload.fieldPolicies.filter((policy) => fieldPolicyTargetsField(policy, field)),
    selectedStep,
    actorRole,
  );
  const tablePermissionState = (blockId: string, columnKey: string) => resolvePermissionPolicy(
    payload.tableColumnPolicies.filter((policy) =>
      sameIdentity(policy.blockId, blockId) && sameIdentity(policy.columnKey, columnKey)),
    selectedStep,
    actorRole,
  );

  const updateFieldPermission = (field: FormFieldOption, patch: Partial<PermissionState>) => {
    if (!selectedStep) return;
    setPayload((current) => {
      const targetPolicies = current.fieldPolicies.filter((policy) => fieldPolicyTargetsField(policy, field));
      const effective = resolvePermissionPolicy(targetPolicies, selectedStep, actorRole);
      const nextState = applyPermissionStatePatch(effective, patch);
      const existing = targetPolicies.find((policy) =>
        policy.stepId === selectedStep.stepId && policy.actorRole === actorRole);
      const withoutCurrent = current.fieldPolicies.filter((policy) =>
        !(
          policy.stepId === selectedStep.stepId &&
          policy.actorRole === actorRole &&
          fieldPolicyTargetsField(policy, field)
        ),
      );
      const policy: FlowFieldPolicy = {
        ...existing,
        policyId: `field_${selectedStep.stepId}_${actorRole}_${field.key}`,
        stepId: selectedStep.stepId,
        stepCode: selectedStep.stepCode,
        actorRole,
        fieldId: field.id ?? null,
        fieldKey: field.key,
        ...nextState,
      };
      return normalizePayload({ ...current, fieldPolicies: [...withoutCurrent, policy] });
    });
  };

  const updateTablePermission = (column: FormTableColumnOption, patch: Partial<PermissionState>) => {
    if (!selectedStep) return;
    setPayload((current) => {
      const targetPolicies = current.tableColumnPolicies.filter((policy) =>
        sameIdentity(policy.blockId, column.blockId) &&
        sameIdentity(policy.columnKey, column.columnKey));
      const effective = resolvePermissionPolicy(targetPolicies, selectedStep, actorRole);
      const nextState = applyPermissionStatePatch(effective, patch);
      const existing = targetPolicies.find((policy) =>
        policy.stepId === selectedStep.stepId && policy.actorRole === actorRole);
      const withoutCurrent = current.tableColumnPolicies.filter((policy) =>
        !(policy.stepId === selectedStep.stepId &&
          policy.actorRole === actorRole &&
          sameIdentity(policy.blockId, column.blockId) &&
          sameIdentity(policy.columnKey, column.columnKey)),
      );
      const policy: FlowTableColumnPolicy = {
        ...existing,
        policyId: `column_${selectedStep.stepId}_${actorRole}_${column.blockId}_${column.columnKey}`,
        stepId: selectedStep.stepId,
        stepCode: selectedStep.stepCode,
        actorRole,
        blockId: column.blockId,
        columnKey: column.columnKey,
        ...nextState,
      };
      return normalizePayload({ ...current, tableColumnPolicies: [...withoutCurrent, policy] });
    });
  };

  const setAllowSubFlow = (checked: boolean) => {
    if (!selectedStep) return;
    setPayload((current) => {
      const existing = current.actorPolicies.find((policy) =>
        policy.stepId === selectedStep.stepId && policy.actorRole === actorRole,
      );
      const withoutCurrent = current.actorPolicies.filter((policy) =>
        !(policy.stepId === selectedStep.stepId && policy.actorRole === actorRole),
      );
      const nextPolicy: FlowActorPolicy = {
        ...existing,
        policyId: existing?.policyId ?? `actor_${selectedStep.stepId}_${actorRole}`,
        stepId: selectedStep.stepId,
        stepCode: selectedStep.stepCode,
        actorRole,
        allowSubFlow: checked,
      };
      return normalizePayload({ ...current, actorPolicies: [...withoutCurrent, nextPolicy] });
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        <Typography variant="h6" fontWeight={800}>Quyền trường và bảng theo bước</Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">
            Quyền được áp dụng theo bước và vai trò. Chính sách của đúng bước, đúng vai trò sẽ ưu tiên hơn chính sách dùng chung.
          </Alert>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              select
              size="small"
              label="Bước áp dụng"
              value={selectedStep?.stepId ?? ""}
              onChange={(event) => setStepId(event.target.value)}
              sx={{ minWidth: 320 }}
            >
              {payload.steps.map((step) => (
                <MenuItem key={step.stepId} value={step.stepId}>
                  {step.stepCode} - {step.stepName || formLabel(formById, step.dynamicFormTemplateId)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Vai trò"
              value={actorRole}
              onChange={(event) => setActorRole(event.target.value as FlowActorRole)}
              sx={{ minWidth: 220 }}
            >
              {(Object.keys(actorRoleLabels) as FlowActorRole[]).map((role) => (
                <MenuItem key={role} value={role}>{actorRoleLabels[role]}</MenuItem>
              ))}
            </TextField>
          </Stack>

          {selectedStep && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`Bước: ${selectedStep.stepCode}`} />
              <Chip size="small" variant="outlined" label={`Biểu mẫu: ${formLabel(formById, selectedStep.dynamicFormTemplateId)}`} />
            </Stack>
          )}

          {catalog.unsupportedTableModes.map((warning) => (
            <Alert key={warning} severity="warning">{warning}</Alert>
          ))}

          <FormControlLabel
            control={(
              <Switch
                checked={effectiveAllowSubFlow}
                onChange={(event) => setAllowSubFlow(event.target.checked)}
              />
            )}
            label="Cho phép tạo nhánh công việc ở bước này"
          />

          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflowX: "auto" }}>
            <Table size="small" stickyHeader sx={{ minWidth: 1040, tableLayout: "fixed" }}>
              <TableHead>
                <TableRow>
                  <TableCell width={210}>Trường</TableCell>
                  <TableCell width={150}>Khu vực</TableCell>
                  <TableCell width={140}>Mã trường</TableCell>
                  <TableCell align="center" width={68}>Đọc</TableCell>
                  <TableCell align="center" width={68}>Ghi</TableCell>
                  <TableCell align="center" width={88}>Bắt buộc</TableCell>
                  <TableCell align="center" width={68}>Ẩn</TableCell>
                  <TableCell align="center" width={68}>Khóa</TableCell>
                  <TableCell align="center" width={112}>Khóa sau gửi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fieldRows.map((field) => {
                  const permission = fieldPermissionState(field);
                  return (
                    <TableRow key={`${field.sectionId ?? ""}_${field.key}`} hover>
                      <TableCell>
                        <Typography fontWeight={700}>{field.label}</Typography>
                      </TableCell>
                      <TableCell>{field.sectionLabel ?? field.sectionId ?? "-"}</TableCell>
                      <TableCell>{field.key}</TableCell>
                      <PermissionCell label="Đọc" checked={permission.read} onChange={(checked) => updateFieldPermission(field, { read: checked })} />
                      <PermissionCell label="Ghi" checked={permission.write} onChange={(checked) => updateFieldPermission(field, { write: checked })} />
                      <PermissionCell label="Bắt buộc" checked={permission.required} onChange={(checked) => updateFieldPermission(field, { required: checked })} />
                      <PermissionCell label="Ẩn" checked={permission.hidden} onChange={(checked) => updateFieldPermission(field, { hidden: checked })} />
                      <PermissionCell label="Khóa" checked={permission.locked} onChange={(checked) => updateFieldPermission(field, { locked: checked })} />
                      <PermissionCell label="Khóa sau khi gửi" checked={permission.lockedAfterSubmit} onChange={(checked) => updateFieldPermission(field, { lockedAfterSubmit: checked })} />
                    </TableRow>
                  );
                })}
                {fieldRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Typography variant="body2" color="text.secondary">
                        Chưa đọc được trường của biểu mẫu thuộc bước này.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflowX: "auto" }}>
            <Table size="small" stickyHeader sx={{ minWidth: 1040, tableLayout: "fixed" }}>
              <TableHead>
                <TableRow>
                  <TableCell width={250}>Bảng</TableCell>
                  <TableCell width={120}>Cột</TableCell>
                  <TableCell width={130}>Kiểu dữ liệu</TableCell>
                  <TableCell align="center" width={68}>Đọc</TableCell>
                  <TableCell align="center" width={68}>Ghi</TableCell>
                  <TableCell align="center" width={88}>Bắt buộc</TableCell>
                  <TableCell align="center" width={68}>Ẩn</TableCell>
                  <TableCell align="center" width={68}>Khóa</TableCell>
                  <TableCell align="center" width={112}>Khóa sau gửi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableColumns.map((column) => {
                  const permission = tablePermissionState(column.blockId, column.columnKey);
                  return (
                    <TableRow key={`${column.blockId}_${column.columnKey}`} hover>
                      <TableCell>{column.label}</TableCell>
                      <TableCell>{column.columnKey}</TableCell>
                      <TableCell>{mappingDataTypeLabel(column.dataType)}</TableCell>
                      <PermissionCell label="Đọc" checked={permission.read} onChange={(checked) => updateTablePermission(column, { read: checked })} />
                      <PermissionCell label="Ghi" checked={permission.write} onChange={(checked) => updateTablePermission(column, { write: checked })} />
                      <PermissionCell label="Bắt buộc" checked={permission.required} onChange={(checked) => updateTablePermission(column, { required: checked })} />
                      <PermissionCell label="Ẩn" checked={permission.hidden} onChange={(checked) => updateTablePermission(column, { hidden: checked })} />
                      <PermissionCell label="Khóa" checked={permission.locked} onChange={(checked) => updateTablePermission(column, { locked: checked })} />
                      <PermissionCell label="Khóa sau khi gửi" checked={permission.lockedAfterSubmit} onChange={(checked) => updateTablePermission(column, { lockedAfterSubmit: checked })} />
                    </TableRow>
                  );
                })}
                {tableColumns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Typography variant="body2" color="text.secondary">
                        Biểu mẫu của bước này không có cột bảng có thể nhập.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}

function PermissionCell(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <TableCell align="center" padding="checkbox">
      <Tooltip title={props.label}>
        <Checkbox
          size="small"
          checked={props.checked}
          onChange={(event) => props.onChange(event.target.checked)}
          inputProps={{ "aria-label": props.label }}
        />
      </Tooltip>
    </TableCell>
  );
}

function MappingDialog(props: {
  state: MappingDialogState;
  payload: FlowPayload;
  setPayload: Dispatch<SetStateAction<FlowPayload>>;
  formById: Map<string, DynamicFormRow>;
  formDetails: Record<string, DynamicFormDetail>;
  onClose: () => void;
}) {
  const { state, payload, setPayload, formById, formDetails, onClose } = props;
  const [direction, setDirection] = useState<"NEXT_TO_PREVIOUS" | "PREVIOUS_TO_NEXT">("NEXT_TO_PREVIOUS");
  const [sourcePicks, setSourcePicks] = useState<MappingPick[]>([]);
  const [targetPick, setTargetPick] = useState<MappingPick | null>(null);
  const [transform, setTransform] = useState("COPY");
  const [conflictPolicy, setConflictPolicy] = useState("OVERWRITE");
  const [contributionPolicy, setContributionPolicy] = useState<"EXCLUDE" | "INCLUDE">("EXCLUDE");
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    setDirection("NEXT_TO_PREVIOUS");
    setSourcePicks([]);
    setTargetPick(null);
    setTransform("COPY");
    setConflictPolicy("OVERWRITE");
    setContributionPolicy("EXCLUDE");
    setDialogError(null);
  }, [state?.edgeIndex]);

  if (!state) return null;

  const sourceStep = direction === "NEXT_TO_PREVIOUS" ? state.sourceStep : state.targetStep;
  const targetStep = direction === "NEXT_TO_PREVIOUS" ? state.targetStep : state.sourceStep;
  const sourceFormId = sourceStep.dynamicFormTemplateId;
  const targetFormId = targetStep.dynamicFormTemplateId;
  const sourceCatalog = readFormCatalog(formDetails[sourceFormId]);
  const targetCatalog = readFormCatalog(formDetails[targetFormId]);
  const sourceRows = catalogToMappingPicks(sourceCatalog);
  const targetRows = catalogToMappingPicks(targetCatalog);
  const pairRules = payload.mappingRules
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule }) =>
      (mappingRuleSourceStepIds(rule).includes(sourceStep.stepId) ||
        (mappingRuleSourceStepIds(rule).length === 0 && rule.sourceDynamicFormTemplateId === sourceFormId)) &&
      (mappingRuleTargetStepId(rule) === targetStep.stepId ||
        (!mappingRuleTargetStepId(rule) && rule.targetDynamicFormTemplateId === targetFormId)),
    );
  const requiredSourceCount = transform === "CALC_PERCENTAGE" ? 2 : 1;
  const selectionError = validateMappingSelection(transform, sourcePicks, targetPick);
  const canConnect = Boolean(
    targetPick &&
    sourcePicks.length >= requiredSourceCount &&
    (transform !== "COPY" || sourcePicks.length === 1) &&
    (transform !== "CALC_PERCENTAGE" || sourcePicks.length === 2) &&
    !selectionError,
  );

  const handleConnect = () => {
    if (!targetPick || !canConnect) return;
    const targetEndpoint = mappingEndpointFromPick(targetPick, targetStep, targetFormId);
    const duplicateTarget = payload.mappingRules.some((rule) =>
      mappingRuleTargetStepId(rule) === targetStep.stepId &&
      mappingEndpointKey(rule.target ?? legacyTargetEndpoint(rule)) === mappingEndpointKey(targetEndpoint),
    );
    if (duplicateTarget) {
      setDialogError("Đích này đã có một quy tắc ghi dữ liệu. Hãy xóa hoặc sửa quy tắc hiện có trước.");
      return;
    }

    const evaluationGrain = targetPick.kind === "FIELD"
      ? "FLOW_INSTANCE"
      : sourcePicks.some((pick) => pick.kind === "TABLE_COLUMN")
        ? "TABLE_ROW"
        : "FLOW_INSTANCE";
    const inputs = sourcePicks.map((pick, index) => ({
      inputKey: `nguon_${index + 1}`,
      source: mappingEndpointFromPick(pick, sourceStep, sourceFormId),
      dataType: normalizeMappingDataType(pick.dataType),
      cardinality: mappingInputCardinality(pick, evaluationGrain),
      nullPolicy: transform === "SUM" ? "ZERO" : "SKIP",
    } satisfies FlowMappingInput));
    const resultDataType = transform === "SUM" || transform === "COUNT" || transform === "CALC_PERCENTAGE"
      ? "NUMBER"
      : transform === "TEXT_JOIN"
        ? "TEXT"
        : normalizeMappingDataType(targetPick.dataType);
    const calculation: FlowMappingCalculation = transform === "CALC_PERCENTAGE"
      ? {
          kind: "REGISTERED_FUNCTION",
          functionCode: "CALC_PERCENTAGE",
          functionVersion: 1,
          resultDataType,
          arguments: {
            numerator: { input: inputs[0].inputKey },
            denominator: { input: inputs[1].inputKey },
          },
        }
      : {
          kind: "DIRECT",
          operation: directOperationName(transform),
          resultDataType,
        };
    const firstSource = sourcePicks[0];
    const nextRule: FlowMappingRule = {
      mappingId: `map_${Date.now()}`,
      mappingVersion: 1,
      mappingKind: targetPick.kind,
      sourceDynamicFormTemplateId: sourceFormId,
      sourceStepId: sourceStep.stepId,
      sourceSectionId: firstSource.sectionId ?? null,
      sourceFieldId: firstSource.fieldId ?? null,
      sourceFieldKey: firstSource.fieldKey ?? null,
      sourceBlockId: firstSource.blockId ?? null,
      sourceColumnKey: firstSource.columnKey ?? null,
      targetDynamicFormTemplateId: targetFormId,
      targetStepId: targetStep.stepId,
      targetSectionId: targetPick.sectionId ?? null,
      targetFieldId: targetPick.fieldId ?? null,
      targetFieldKey: targetPick.fieldKey ?? null,
      targetBlockId: targetPick.blockId ?? null,
      targetColumnKey: targetPick.columnKey ?? null,
      valueTransform: transform,
      conflictPolicy,
      contributionPolicy,
      evaluationGrain,
      errorPolicy: "BLOCK_APPLY",
      inputs,
      target: targetEndpoint,
      calculation,
    };
    setPayload((current) => normalizePayload({ ...current, mappingRules: [...current.mappingRules, nextRule] }));
    setSourcePicks([]);
    setTargetPick(null);
    setDialogError(null);
  };

  const removeRule = (index: number) => {
    setPayload((current) => ({
      ...current,
      mappingRules: current.mappingRules.filter((_, i) => i !== index),
    }));
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        <Stack spacing={1}>
          <Typography variant="h6" fontWeight={800}>Ánh xạ giữa hai biểu mẫu</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`Nguồn: ${formLabel(formById, sourceFormId)}`} />
            <Chip size="small" variant="outlined" label={`Đích: ${formLabel(formById, targetFormId)}`} />
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          {[...new Set([...sourceCatalog.unsupportedTableModes, ...targetCatalog.unsupportedTableModes])].map((warning) => (
            <Alert key={warning} severity="warning">{warning}</Alert>
          ))}
          <ToggleButtonGroup
            exclusive
            size="small"
            value={direction}
            onChange={(_event, value) => {
              if (!value) return;
              setDirection(value);
              setSourcePicks([]);
              setTargetPick(null);
              setDialogError(null);
            }}
          >
            <ToggleButton value="NEXT_TO_PREVIOUS">Kết quả bước sau sang bước trước</ToggleButton>
            <ToggleButton value="PREVIOUS_TO_NEXT">Dữ liệu bước trước sang bước sau</ToggleButton>
          </ToggleButtonGroup>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
            <TextField
              select
              size="small"
              label="Cách tính"
              value={transform}
              onChange={(event) => {
                setTransform(event.target.value);
                setDialogError(null);
              }}
              sx={{ width: { md: 240 } }}
            >
              {defaultTransformOptions.map((option) => (
                <MenuItem key={option} value={option}>{transformOptionLabels[option] ?? "Cách tính chưa hỗ trợ"}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Khi đích đã có dữ liệu"
              value={conflictPolicy}
              onChange={(event) => setConflictPolicy(event.target.value)}
              sx={{ width: { md: 240 } }}
            >
              <MenuItem value="OVERWRITE">Ghi đè bằng kết quả mới</MenuItem>
              <MenuItem value="TARGET_WINS">Giữ dữ liệu đang có</MenuItem>
              <MenuItem value="ERROR_ON_CONFLICT">Báo xung đột</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Thống kê kết quả ánh xạ"
              value={contributionPolicy}
              onChange={(event) => setContributionPolicy(event.target.value as "EXCLUDE" | "INCLUDE")}
              sx={{ width: { md: 300 } }}
            >
              <MenuItem value="EXCLUDE">Không tính, tránh trùng với dữ liệu nguồn</MenuItem>
              <MenuItem value="INCLUDE">Có tính ở biểu mẫu đích</MenuItem>
            </TextField>
            <Button variant="contained" disabled={!canConnect} onClick={handleConnect}>
              Tạo ánh xạ
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Đã chọn {sourcePicks.length} đầu vào. Sao chép cần đúng một đầu vào; tính tỷ lệ cần đúng hai đầu vào.
          </Typography>
          {selectionError && <Alert severity="warning">{selectionError}</Alert>}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
            <MappingPickTable
              title="Đầu vào"
              emptyText="Chưa đọc được trường hoặc cột bảng của biểu mẫu nguồn."
              rows={sourceRows}
              selected={sourcePicks}
              multiple
              onToggle={(row) => setSourcePicks((current) =>
                current.some((item) => isSamePick(item, row))
                  ? current.filter((item) => !isSamePick(item, row))
                  : [...current, row],
              )}
            />
            <Stack alignItems="center" justifyContent="center" sx={{ display: { xs: "none", md: "flex" }, px: 0.5 }}>
              <ArrowForwardIcon color="action" />
            </Stack>
            <MappingPickTable
              title="Đích"
              emptyText="Chưa đọc được trường hoặc cột bảng của biểu mẫu đích."
              rows={targetRows}
              selected={targetPick ? [targetPick] : []}
              onToggle={(row) => setTargetPick(row)}
            />
          </Stack>

          <Divider />

          <Box>
            <Typography fontWeight={800} sx={{ mb: 1 }}>Các ánh xạ đã cấu hình</Typography>
            <Stack spacing={1}>
              {pairRules.map(({ rule, index }) => (
                <Paper key={`${rule.mappingId}_${index}`} variant="outlined" sx={{ p: 1.25, borderRadius: 1 }}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={(rule.target?.kind ?? rule.mappingKind) === "TABLE_COLUMN" ? "Đích là cột bảng" : "Đích là trường"}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        color={rule.contributionPolicy === "INCLUDE" ? "primary" : "default"}
                        label={rule.contributionPolicy === "INCLUDE" ? "Có tính thống kê đích" : "Không tính thống kê đích"}
                      />
                      <Typography variant="body2">
                        {mappingRuleSourceLabel(rule)}
                        {" -> "}
                        {mappingRuleTargetLabel(rule)}
                        {` / ${transformOptionLabels[rule.valueTransform ?? ""] ?? "Cách tính chưa hỗ trợ"}`}
                      </Typography>
                    </Stack>
                    <Tooltip title="Xóa ánh xạ">
                      <IconButton onClick={() => removeRule(index)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
              ))}
              {pairRules.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Chưa có ánh xạ nào giữa hai biểu mẫu này.
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}

function MappingPickTable(props: {
  title: string;
  rows: MappingPick[];
  selected: MappingPick[];
  multiple?: boolean;
  emptyText: string;
  onToggle: (row: MappingPick) => void;
}) {
  return (
    <Box sx={{ flex: 1, border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
      <Box sx={{ px: 1.5, py: 1, bgcolor: "#f6f7fb", borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography fontWeight={800}>{props.title}</Typography>
      </Box>
      <Box sx={{ maxHeight: 360, overflow: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Tên</TableCell>
              <TableCell>Loại</TableCell>
              <TableCell width={96}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {props.rows.map((row) => {
              const selected = props.selected.some((item) => isSamePick(item, row));
              return (
                <TableRow key={mappingPickKey(row)} selected={selected}>
                  <TableCell>
                    <Typography fontWeight={700}>{row.label}</Typography>
                    {row.subtitle && <Typography variant="caption" color="text.secondary">{row.subtitle}</Typography>}
                  </TableCell>
                  <TableCell>{row.kind === "FIELD" ? "Trường" : "Cột bảng"}</TableCell>
                  <TableCell align="right">
                    <Button size="small" variant={selected ? "contained" : "outlined"} onClick={() => props.onToggle(row)}>
                      {selected && props.multiple ? "Bỏ chọn" : "Chọn"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {props.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary">{props.emptyText}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}

function parsePayload(
  payload: FlowPayload | null | undefined,
  payloadJson: string | null | undefined,
  rootFormId: string,
): FlowPayload {
  try {
    const parsed = payload ?? (payloadJson ? JSON.parse(payloadJson) : {});
    return normalizePayload({
      ...createEmptyPayload(rootFormId || parsed.rootDynamicFormTemplateId || ""),
      ...parsed,
    });
  } catch {
    return createEmptyPayload(rootFormId);
  }
}

function createEmptyPayload(rootFormId: string): FlowPayload {
  return normalizePayload({
    rootDynamicFormTemplateId: rootFormId || null,
    formNodes: rootFormId ? [{ formNodeId: "root", role: "ROOT", dynamicFormTemplateId: rootFormId }] : [],
    steps: rootFormId
      ? [{ stepId: "root", stepCode: "ROOT", stepName: "Gốc", stepOrder: 1, dynamicFormTemplateId: rootFormId }]
      : [],
    transitions: [],
    actorPolicies: [],
    fieldPolicies: [],
    tableColumnPolicies: [],
    mappingRules: [],
    rollbackPolicy: {},
    finalResultPolicy: {},
    statisticProfile: {},
  });
}

function normalizePayload(input: Partial<FlowPayload>): FlowPayload {
  const rootId = input.rootDynamicFormTemplateId || input.formNodes?.find((node) => node.role === "ROOT")?.dynamicFormTemplateId || "";
  const formNodes = normalizeFormNodes(rootId, input.formNodes ?? []);
  const validFormIds = new Set(formNodes.map((node) => node.dynamicFormTemplateId));
  const fallbackFormId = rootId || formNodes[0]?.dynamicFormTemplateId || "";
  const stepIds = new Set<string>();
  const steps = (input.steps ?? []).map((step, index) => {
    const requestedId = normalizeBlank(step.stepId) ?? `step_${index + 1}`;
    const stepId = nextUniqueId(requestedId, stepIds);
    stepIds.add(stepId);
    return {
      stepId,
      stepCode: (step.stepCode || `STEP_${index + 1}`).toUpperCase(),
      stepName: step.stepName ?? null,
      stepOrder: index + 1,
      dynamicFormTemplateId: validFormIds.has(step.dynamicFormTemplateId) ? step.dynamicFormTemplateId : fallbackFormId,
    } satisfies FlowStep;
  }).filter((step) => Boolean(step.dynamicFormTemplateId));
  const validStepIds = new Set(steps.map((step) => step.stepId));
  const usedFormIds = new Set(steps.map((step) => step.dynamicFormTemplateId));
  if (rootId) usedFormIds.add(rootId);

  return {
    rootDynamicFormTemplateId: rootId || null,
    formNodes: formNodes.filter((node) => usedFormIds.has(node.dynamicFormTemplateId)),
    steps,
    transitions: normalizeTransitions(input.transitions ?? [], validStepIds),
    actorPolicies: (input.actorPolicies ?? []).map(normalizeActorPolicy).filter(Boolean) as FlowActorPolicy[],
    fieldPolicies: (input.fieldPolicies ?? []).map(normalizeFieldPolicy).filter(Boolean) as FlowFieldPolicy[],
    tableColumnPolicies: (input.tableColumnPolicies ?? []).map(normalizeTableColumnPolicy).filter(Boolean) as FlowTableColumnPolicy[],
    mappingRules: (input.mappingRules ?? []).map((rule, index) => normalizeMappingRule(rule, index, fallbackFormId, rootId)),
    rollbackPolicy: input.rollbackPolicy && typeof input.rollbackPolicy === "object" ? input.rollbackPolicy : {},
    finalResultPolicy: input.finalResultPolicy && typeof input.finalResultPolicy === "object" ? input.finalResultPolicy : {},
    statisticProfile: input.statisticProfile && typeof input.statisticProfile === "object" ? input.statisticProfile : {},
  };
}

function normalizeTransitions(input: FlowTransition[], validStepIds: Set<string>): FlowTransition[] {
  const seen = new Set<string>();
  return input.flatMap((transition, index) => {
    const raw = transition as unknown as Record<string, unknown>;
    const fromStepId = readText(raw, "fromStepId", "sourceStepId");
    const toStepId = readText(raw, "toStepId", "targetStepId");
    const key = `${fromStepId ?? ""}|${toStepId ?? ""}`;
    if (!fromStepId || !toStepId || !validStepIds.has(fromStepId) || !validStepIds.has(toStepId) || seen.has(key)) return [];
    seen.add(key);
    return [{
      transitionId: readText(raw, "transitionId", "id") ?? `transition_${index + 1}`,
      fromStepId,
      toStepId,
    }];
  });
}

function normalizeActorPolicy(policy: FlowActorPolicy): FlowActorPolicy | null {
  const stepId = normalizeBlank(policy.stepId);
  const stepCode = normalizeBlank(policy.stepCode);
  const actorRole = normalizeBlank(policy.actorRole) as FlowActorRole | "*" | null;
  if (!stepId && !stepCode) return null;
  return {
    policyId: normalizeBlank(policy.policyId),
    stepId,
    stepCode,
    actorRole,
    allowSubFlow: policy.allowSubFlow ?? null,
    allowForward: policy.allowForward ?? null,
    canFinalize: policy.canFinalize ?? null,
  };
}

function normalizeTableColumnPolicy(policy: FlowTableColumnPolicy): FlowTableColumnPolicy | null {
  const blockId = normalizeBlank(policy.blockId);
  const columnKey = normalizeBlank(policy.columnKey);
  if (!blockId || !columnKey) return null;
  return {
    policyId: normalizeBlank(policy.policyId ?? policy.id),
    stepId: normalizeBlank(policy.stepId),
    stepCode: normalizeBlank(policy.stepCode),
    actorRole: normalizeBlank(policy.actorRole),
    blockId,
    columnKey,
    read: policy.read ?? null,
    write: policy.write ?? null,
    required: policy.required ?? null,
    hidden: policy.hidden ?? null,
    locked: policy.locked ?? null,
    lockedAfterSubmit: policy.lockedAfterSubmit ?? null,
  };
}

function normalizeMappingRule(
  rule: FlowMappingRule,
  index: number,
  fallbackFormId: string,
  rootFormId: string,
): FlowMappingRule {
  const inputs = (rule.inputs ?? []).map((input) => ({
    inputKey: input.inputKey,
    source: normalizeMappingEndpoint(input.source),
    dataType: normalizeMappingDataType(input.dataType),
    cardinality: input.cardinality || "ONE",
    nullPolicy: input.nullPolicy || "KEEP_NULL",
    ...(Object.prototype.hasOwnProperty.call(input, "constantValue") ? { constantValue: input.constantValue } : {}),
  }));
  const target = rule.target ? normalizeMappingEndpoint(rule.target) : null;
  const calculation = rule.calculation ? {
    kind: rule.calculation.kind || "DIRECT",
    operation: normalizeBlank(rule.calculation.operation),
    resultDataType: normalizeMappingDataType(rule.calculation.resultDataType),
    expression: rule.calculation.expression,
    functionCode: normalizeBlank(rule.calculation.functionCode),
    functionVersion: rule.calculation.functionVersion ?? null,
    arguments: rule.calculation.arguments ?? null,
    ...(Object.prototype.hasOwnProperty.call(rule.calculation, "defaultValue")
      ? { defaultValue: rule.calculation.defaultValue }
      : {}),
  } satisfies FlowMappingCalculation : null;

  return {
    mappingId: rule.mappingId || `map_${index + 1}`,
    mappingVersion: rule.mappingVersion || 1,
    mappingKind: target?.kind === "TABLE_COLUMN" ? "TABLE_COLUMN" : rule.mappingKind || "FIELD",
    sourceDynamicFormTemplateId: inputs.length > 0
      ? inputs[0].source.dynamicFormTemplateId ?? null
      : rule.sourceDynamicFormTemplateId || fallbackFormId || null,
    sourceStepId: inputs.length > 0 ? inputs[0].source.stepId ?? null : rule.sourceStepId ?? null,
    sourceStepCode: inputs.length > 0 ? inputs[0].source.stepCode ?? null : rule.sourceStepCode ?? null,
    sourceSectionId: normalizeBlank(rule.sourceSectionId),
    sourceSectionCode: normalizeBlank(rule.sourceSectionCode),
    sourceFieldId: normalizeBlank(rule.sourceFieldId),
    sourceFieldKey: normalizeBlank(rule.sourceFieldKey),
    sourceBlockId: normalizeBlank(rule.sourceBlockId),
    sourceColumnKey: normalizeBlank(rule.sourceColumnKey),
    targetDynamicFormTemplateId: target?.dynamicFormTemplateId ?? (rule.targetDynamicFormTemplateId || rootFormId || fallbackFormId || null),
    targetStepId: target?.stepId ?? rule.targetStepId ?? null,
    targetStepCode: target?.stepCode ?? rule.targetStepCode ?? null,
    targetSectionId: normalizeBlank(rule.targetSectionId),
    targetSectionCode: normalizeBlank(rule.targetSectionCode),
    targetFieldId: normalizeBlank(rule.targetFieldId),
    targetFieldKey: normalizeBlank(rule.targetFieldKey),
    targetBlockId: normalizeBlank(rule.targetBlockId),
    targetColumnKey: normalizeBlank(rule.targetColumnKey),
    valueTransform: rule.valueTransform || "COPY",
    conflictPolicy: rule.conflictPolicy || "OVERWRITE",
    contributionPolicy: rule.contributionPolicy || "EXCLUDE",
    evaluationGrain: rule.evaluationGrain || "FLOW_INSTANCE",
    errorPolicy: rule.errorPolicy || "BLOCK_APPLY",
    inputs: inputs.length > 0 ? inputs : null,
    target,
    calculation,
  };
}

function normalizeMappingEndpoint(endpoint: FlowMappingEndpoint): FlowMappingEndpoint {
  return {
    kind: endpoint.kind,
    dynamicFormTemplateId: normalizeBlank(endpoint.dynamicFormTemplateId),
    stepId: normalizeBlank(endpoint.stepId),
    stepCode: normalizeBlank(endpoint.stepCode),
    sectionId: normalizeBlank(endpoint.sectionId),
    fieldId: normalizeBlank(endpoint.fieldId),
    fieldKey: normalizeBlank(endpoint.fieldKey),
    blockId: normalizeBlank(endpoint.blockId),
    columnKey: normalizeBlank(endpoint.columnKey),
    rowKey: normalizeBlank(endpoint.rowKey),
    dataType: normalizeMappingDataType(endpoint.dataType),
  };
}

function nextUniqueId(requestedId: string, existing: Set<string>) {
  if (!existing.has(requestedId)) return requestedId;
  let suffix = 2;
  while (existing.has(`${requestedId}_${suffix}`)) suffix += 1;
  return `${requestedId}_${suffix}`;
}

function normalizeFieldPolicy(policy: FlowFieldPolicy): FlowFieldPolicy | null {
  const fieldId = normalizeBlank(policy.fieldId);
  const fieldKey = normalizeBlank(policy.fieldKey);
  if (!fieldId && !fieldKey) return null;

  return {
    policyId: normalizeBlank(policy.policyId ?? policy.id),
    stepId: normalizeBlank(policy.stepId),
    stepCode: normalizeBlank(policy.stepCode),
    actorRole: normalizeBlank(policy.actorRole),
    fieldId,
    fieldKey,
    read: policy.read ?? policy.canRead ?? null,
    write: policy.write ?? policy.canWrite ?? null,
    required: policy.required ?? policy.isRequired ?? null,
    hidden: policy.hidden ?? policy.isHidden ?? null,
    locked: policy.locked ?? policy.isLocked ?? null,
    lockedAfterSubmit: policy.lockedAfterSubmit ?? null,
  };
}

function normalizeFormNodes(rootId: string, nodes: FlowFormNode[]): FlowFormNode[] {
  const seen = new Set<string>();
  const usedNodeIds = new Set<string>();
  const result: FlowFormNode[] = [];
  if (rootId) {
    result.push({ formNodeId: "root", role: "ROOT", dynamicFormTemplateId: rootId });
    seen.add(rootId);
    usedNodeIds.add("root");
  }

  nodes.forEach((node, index) => {
    if (!node.dynamicFormTemplateId || seen.has(node.dynamicFormTemplateId)) return;
    const requestedNodeId = normalizeBlank(node.formNodeId) ?? `form_${index + 1}`;
    const formNodeId = nextUniqueId(requestedNodeId === "root" ? `form_${index + 1}` : requestedNodeId, usedNodeIds);
    seen.add(node.dynamicFormTemplateId);
    usedNodeIds.add(formNodeId);
    result.push({
      formNodeId,
      role: "CHILD",
      dynamicFormTemplateId: node.dynamicFormTemplateId,
    });
  });

  return result;
}

function setPayloadRoot(current: FlowPayload, rootId: string): FlowPayload {
  const next = normalizePayload({ ...current, rootDynamicFormTemplateId: rootId });
  if (next.steps.length === 0 && rootId) {
    next.steps.push({ stepId: "root", stepCode: "ROOT", stepName: "Gốc", stepOrder: 1, dynamicFormTemplateId: rootId });
  }
  if (next.steps[0] && rootId) {
    const changedRootStep = next.steps[0];
    const formChanged = changedRootStep.dynamicFormTemplateId !== rootId;
    next.steps[0] = { ...next.steps[0], dynamicFormTemplateId: rootId };
    if (formChanged) {
      next.fieldPolicies = next.fieldPolicies.filter((policy) => policy.stepId !== changedRootStep.stepId);
      next.tableColumnPolicies = next.tableColumnPolicies.filter((policy) => policy.stepId !== changedRootStep.stepId);
      next.mappingRules = next.mappingRules.filter((rule) =>
        rule.sourceStepId !== changedRootStep.stepId &&
        rule.targetStepId !== changedRootStep.stepId &&
        !rule.inputs?.some((input) => input.source.stepId === changedRootStep.stepId) &&
        rule.target?.stepId !== changedRootStep.stepId,
      );
    }
  }
  return normalizePayload(next);
}

function ensureFormNode(current: FlowPayload, formId: string): FlowPayload {
  if (!formId || current.formNodes.some((node) => node.dynamicFormTemplateId === formId)) return current;
  return {
    ...current,
    formNodes: [
      ...current.formNodes,
      {
        formNodeId: `form_${current.formNodes.length + 1}`,
        role: "CHILD",
        dynamicFormTemplateId: formId,
      },
    ],
  };
}

function addFormStep(current: FlowPayload, formId: string, requestedParentStepId: string): FlowPayload {
  const withNode = ensureFormNode(current, formId);
  let index = withNode.steps.length + 1;
  const existingStepIds = new Set(withNode.steps.map((step) => step.stepId));
  while (existingStepIds.has(`step_${index}`)) index += 1;
  const form = withNode.formNodes.find((node) => node.dynamicFormTemplateId === formId);
  const previousStep = withNode.steps.find((step) => step.stepId === requestedParentStepId) ?? withNode.steps.at(-1);
  const nextStep: FlowStep = {
    stepId: `step_${index}`,
    stepCode: `STEP_${index}`,
    stepName: form?.role === "ROOT" ? "Gốc" : `Bước ${index}`,
    stepOrder: withNode.steps.length + 1,
    dynamicFormTemplateId: formId,
  };
  return normalizePayload({
    ...withNode,
    steps: [...withNode.steps, nextStep],
    transitions: previousStep
      ? [
          ...withNode.transitions,
          {
            transitionId: `transition_${previousStep.stepId}_${nextStep.stepId}`,
            fromStepId: previousStep.stepId,
            toStepId: nextStep.stepId,
          },
        ]
      : withNode.transitions,
  });
}

function countMappingsForEdge(rules: FlowMappingRule[], sourceStepId: string, targetStepId: string) {
  return rules.filter((rule) => mappingConnectsSteps(rule, sourceStepId, targetStepId)).length;
}

function readFormCatalog(detail: DynamicFormDetail | undefined) {
  const sections = safeJsonArray(detail?.sectionsJson).map((item, index) => {
    const id = readText(item, "id", "sectionId", "code") || `section_${index + 1}`;
    return {
      id,
      code: readText(item, "code"),
      label: readText(item, "title", "name", "label", "code", "id") || id,
    } satisfies FormSectionOption;
  });
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const fields = safeJsonArray(detail?.fieldsJson).map((item, index) => {
    const id = readText(item, "id", "fieldId");
    const key = readText(item, "key", "fieldKey", "id", "code") || `field_${index + 1}`;
    const sectionId = readText(item, "sectionId", "sectionCode");
    return {
      id,
      key,
      code: readText(item, "code"),
      label: readText(item, "name", "label", "displayName", "title", "code", "key", "id") || key,
      sectionId,
      sectionLabel: sectionId ? sectionById.get(sectionId)?.label ?? sectionId : null,
      dataType: normalizeMappingDataType(readText(item, "dataType", "type", "fieldType")),
    } satisfies FormFieldOption;
  });
  const blocks = safeJsonArray(detail?.blocksJson);
  const standaloneBlock = safeJsonObject(detail?.excelBlockJson);
  if (blocks.length === 0 && standaloneBlock) blocks.push(standaloneBlock);
  const unsupportedTableModes = blocks.flatMap((block) => {
    const tableMode = readText(block, "tableMode")?.toUpperCase();
    const blockId = readText(block, "blockId", "id") ?? "Bảng chưa xác định";
    return tableMode === "APPEND_COLUMNS"
      ? [`${blockId}: bảng thêm cột cần hợp đồng ánh xạ theo hàng và chưa được phép cấu hình ở phiên bản này.`]
      : tableMode === "SUMMARY_TEMPLATE"
        ? [`${blockId}: bảng mẫu tổng hợp chỉ để đọc, không nhận ánh xạ ghi.`]
        : [];
  });
  const tableColumns = blocks.flatMap((block, blockIndex) => {
    const tableMode = readText(block, "tableMode")?.toUpperCase();
    if (tableMode === "APPEND_COLUMNS" || tableMode === "SUMMARY_TEMPLATE") return [];
    const blockId = readText(block, "blockId", "id") ?? `block_${blockIndex + 1}`;
    const blockLabel = readText(block, "dynamicExcelName", "name", "title", "dynamicExcelCode") ?? blockId;
    const dataRect = readObject(block, "dataRect");
    const r0 = readInteger(dataRect, "r0") ?? 0;
    const r1 = readInteger(dataRect, "r1") ?? ((readInteger(block, "h", "H") ?? 0) - 1);
    const c0 = readInteger(dataRect, "c0") ?? 0;
    const c1 = readInteger(dataRect, "c1") ?? ((readInteger(block, "w", "W") ?? 0) - 1);
    const width = c1 >= c0 ? Math.min(c1 - c0 + 1, 1000) : 0;
    return Array.from({ length: width }, (_, columnOffset) => columnOffset)
      .filter((columnOffset) => columnHasInputCell(block, c0 + columnOffset, r0, r1))
      .map((columnOffset) => ({
        blockId,
        columnKey: `col_${columnOffset + 1}`,
        label: `${blockLabel} - Cột ${columnOffset + 1}`,
        dataType: resolveBlockColumnDataType(block, columnOffset, c0 + columnOffset, r0, r1),
      } satisfies FormTableColumnOption));
  });

  return { sections, fields, tableColumns, unsupportedTableModes };
}

function fieldToPick(field: FormFieldOption): MappingPick {
  return {
    kind: "FIELD",
    sectionId: field.sectionId ?? null,
    fieldId: field.id ?? null,
    fieldKey: field.key,
    dataType: normalizeMappingDataType(field.dataType),
    label: field.label,
    subtitle: field.sectionLabel
      ? `${field.sectionLabel} / ${field.key} / ${mappingDataTypeLabel(field.dataType)}`
      : `${field.key} / ${mappingDataTypeLabel(field.dataType)}`,
  };
}

function tableColumnToPick(column: FormTableColumnOption): MappingPick {
  return {
    kind: "TABLE_COLUMN",
    blockId: column.blockId,
    columnKey: column.columnKey,
    dataType: normalizeMappingDataType(column.dataType),
    label: `${column.label} - ${column.columnKey}`,
    subtitle: mappingDataTypeLabel(column.dataType),
  };
}

function catalogToMappingPicks(catalog: ReturnType<typeof readFormCatalog>) {
  return [
    ...catalog.fields.map(fieldToPick),
    ...catalog.tableColumns.map(tableColumnToPick),
  ];
}

function safeJsonArray(json: string | null | undefined): any[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeJsonObject(json: string | null | undefined): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function readObject(input: unknown, key: string): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  const value = (input as Record<string, unknown>)[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readInteger(input: unknown, ...keys: string[]) {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  for (const key of keys) {
    const raw = record[key];
    if (raw === null || raw === undefined || raw === "") continue;
    const value = Number(raw);
    if (Number.isInteger(value)) return value;
  }
  return null;
}

function readText(input: unknown, ...keys: string[]) {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function columnHasInputCell(
  block: Record<string, unknown>,
  absoluteColumn: number,
  dataRowStart: number,
  dataRowEnd: number,
) {
  if (dataRowEnd < dataRowStart) return true;
  const rawRanges = Array.isArray(block.specialRanges)
    ? block.specialRanges
    : Array.isArray(block.SpecialRanges)
      ? block.SpecialRanges
      : [];
  const intervals = rawRanges.flatMap((rawRange) => {
    if (!rawRange || typeof rawRange !== "object") return [];
    const range = rawRange as Record<string, unknown>;
    const role = normalizeNonInputRangeRole(readText(range, "role", "kind", "type"));
    if (!role) return [];
    const r0 = readInteger(range, "r0", "R0");
    const c0 = readInteger(range, "c0", "C0");
    const r1 = readInteger(range, "r1", "R1");
    const c1 = readInteger(range, "c1", "C1");
    if (r0 === null || c0 === null || r1 === null || c1 === null ||
      r1 < r0 || c1 < c0 || absoluteColumn < c0 || absoluteColumn > c1) {
      return [];
    }
    const start = Math.max(dataRowStart, r0);
    const end = Math.min(dataRowEnd, r1);
    return start <= end ? [{ start, end }] : [];
  }).sort((left, right) => left.start - right.start || left.end - right.end);

  let nextInputRow = dataRowStart;
  for (const interval of intervals) {
    if (interval.start > nextInputRow) return true;
    nextInputRow = Math.max(nextInputRow, interval.end + 1);
    if (nextInputRow > dataRowEnd) return false;
  }
  return nextInputRow <= dataRowEnd;
}

function normalizeNonInputRangeRole(value: string | null) {
  const role = value?.trim().toUpperCase();
  if (role === "FORMULAR") return "FORMULA";
  if (role === "HEADER") return "TITLE";
  if (role === "STYLE" || role === "EMPTY" || role === "EMPTY_INPUT") return "BLANK";
  return role === "FORMULA" || role === "TITLE" || role === "BLANK" ? role : null;
}

function resolveBlockColumnDataType(
  block: unknown,
  columnOffset: number,
  absoluteColumn: number,
  dataRowStart: number,
  dataRowEnd: number,
) {
  if (!block || typeof block !== "object") return "NUMBER";
  const record = block as Record<string, unknown>;
  const defaultType = normalizeMappingDataType(readText(record, "defaultDataType", "dataType") ?? "NUMBER");
  const overrides = Array.isArray(record.dataTypeOverrides) ? record.dataTypeOverrides : [];
  const specKind = readText(record, "excelSpecKind", "kind")?.toUpperCase();
  const columnTypes = overrides.flatMap((override) => {
    if (!override || typeof override !== "object") return [];
    const item = override as Record<string, unknown>;
    return readText(item, "scope")?.toUpperCase() === "COLUMN" && readInteger(item, "index") === columnOffset
      ? [normalizeMappingDataType(readText(item, "dataType", "type"))]
      : [];
  });
  const columnType = columnTypes.at(-1);
  if (specKind === "TOP") return columnType ?? defaultType;

  const types = new Set<string>([defaultType]);
  if (columnType) types.add(columnType);
  if (specKind === "LEFT") {
    const rowCount = Math.max(0, dataRowEnd - dataRowStart + 1);
    const overriddenRows = new Set<number>();
    const rowTypes = new Set<string>();
    overrides.forEach((override) => {
      if (!override || typeof override !== "object") return;
      const item = override as Record<string, unknown>;
      if (readText(item, "scope")?.toUpperCase() !== "ROW") return;
      const rowOffset = readInteger(item, "index");
      if (rowOffset === null || rowOffset < 0 || rowOffset >= rowCount) return;
      const dataType = normalizeMappingDataType(readText(item, "dataType", "type"));
      overriddenRows.add(rowOffset);
      rowTypes.add(dataType);
      types.add(dataType);
    });
    if (rowCount > 0 && overriddenRows.size === rowCount) return rowTypes.size === 1 ? [...rowTypes][0] : "JSON";
    return types.size === 1 ? [...types][0] : "JSON";
  }

  const coveredRanges: Array<{ start: number; end: number }> = [];
  const rangeTypes = new Set<string>();
  overrides.forEach((override) => {
    if (!override || typeof override !== "object") return;
    const item = override as Record<string, unknown>;
    if (readText(item, "scope")?.toUpperCase() !== "RANGE") return;
    const c0 = readInteger(item, "c0");
    const c1 = readInteger(item, "c1");
    const r0 = readInteger(item, "r0");
    const r1 = readInteger(item, "r1");
    if (c0 === null || c1 === null || r0 === null || r1 === null || absoluteColumn < c0 || absoluteColumn > c1) return;
    const dataType = normalizeMappingDataType(readText(item, "dataType", "type"));
    rangeTypes.add(dataType);
    types.add(dataType);
    const start = Math.max(dataRowStart, r0);
    const end = Math.min(dataRowEnd, r1);
    if (start <= end) coveredRanges.push({ start, end });
  });
  if (specKind === "MATRIX" && intervalsCoverRows(coveredRanges, dataRowStart, dataRowEnd)) {
    return rangeTypes.size === 1 ? [...rangeTypes][0] : "JSON";
  }
  return types.size === 1 ? [...types][0] : "JSON";
}

function intervalsCoverRows(
  intervals: Array<{ start: number; end: number }>,
  requiredStart: number,
  requiredEnd: number,
) {
  let next = requiredStart;
  [...intervals]
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .forEach((interval) => {
      if (interval.start <= next) next = Math.max(next, interval.end + 1);
    });
  return next > requiredEnd;
}

function normalizeMappingDataType(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized === "SHORT_TEXT" || normalized === "SHORTTEXT" || normalized === "STRING" || normalized === "TEXTAREA") return "TEXT";
  if (normalized === "FULLDATE" || normalized === "STRICT_DATE") return "FULL_DATE";
  if (normalized === "MULTISELECT") return "MULTI_SELECT";
  if (normalized === "SINGLESELECT" || normalized === "STRING_LIST" || normalized === "STRINGLIST") return "SINGLE_SELECT";
  if (["TEXT", "NUMBER", "BOOLEAN", "DATE", "FULL_DATE", "SINGLE_SELECT", "MULTI_SELECT", "JSON"].includes(normalized)) return normalized;
  return "TEXT";
}

function mappingDataTypeLabel(value: string | null | undefined) {
  switch (normalizeMappingDataType(value)) {
    case "NUMBER": return "Số";
    case "BOOLEAN": return "Đúng/sai";
    case "DATE": return "Ngày";
    case "FULL_DATE": return "Ngày đầy đủ";
    case "SINGLE_SELECT": return "Chọn một";
    case "MULTI_SELECT": return "Chọn nhiều";
    case "JSON": return "Dữ liệu cấu trúc";
    default: return "Văn bản";
  }
}

function normalizeBlank(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : null;
}

function isSamePick(left: MappingPick | null, right: MappingPick) {
  if (!left) return false;
  return mappingPickKey(left) === mappingPickKey(right);
}

function mappingPickKey(pick: MappingPick) {
  return pick.kind === "FIELD"
    ? `FIELD:${pick.fieldId ?? pick.fieldKey ?? ""}`
    : `TABLE_COLUMN:${pick.blockId ?? ""}:${pick.columnKey ?? ""}`;
}

function mappingEndpointFromPick(pick: MappingPick, step: FlowStep, formId: string): FlowMappingEndpoint {
  return {
    kind: pick.kind,
    dynamicFormTemplateId: formId,
    stepId: step.stepId,
    stepCode: step.stepCode,
    sectionId: pick.sectionId ?? null,
    fieldId: pick.fieldId ?? null,
    fieldKey: pick.fieldKey ?? null,
    blockId: pick.blockId ?? null,
    columnKey: pick.columnKey ?? null,
    dataType: normalizeMappingDataType(pick.dataType),
  };
}

function legacyTargetEndpoint(rule: FlowMappingRule): FlowMappingEndpoint {
  return {
    kind: rule.targetBlockId || rule.targetColumnKey ? "TABLE_COLUMN" : "FIELD",
    dynamicFormTemplateId: rule.targetDynamicFormTemplateId ?? null,
    stepId: rule.targetStepId ?? null,
    stepCode: rule.targetStepCode ?? null,
    sectionId: rule.targetSectionId ?? null,
    fieldId: rule.targetFieldId ?? null,
    fieldKey: rule.targetFieldKey ?? null,
    blockId: rule.targetBlockId ?? null,
    columnKey: rule.targetColumnKey ?? null,
  };
}

function mappingEndpointKey(endpoint: FlowMappingEndpoint) {
  return endpoint.kind === "FIELD"
    ? `FIELD:${endpoint.fieldId ?? endpoint.fieldKey ?? ""}`
    : `TABLE_COLUMN:${endpoint.blockId ?? ""}:${endpoint.columnKey ?? ""}`;
}

function mappingRuleSourceStepIds(rule: FlowMappingRule) {
  const ids = [rule.sourceStepId, ...(rule.inputs ?? []).map((input) => input.source.stepId)]
    .filter((value): value is string => Boolean(value));
  return [...new Set(ids)];
}

function mappingRuleTargetStepId(rule: FlowMappingRule) {
  return rule.target?.stepId ?? rule.targetStepId ?? null;
}

function mappingConnectsSteps(rule: FlowMappingRule, leftStepId: string, rightStepId: string) {
  const sourceIds = mappingRuleSourceStepIds(rule);
  const targetId = mappingRuleTargetStepId(rule);
  return (sourceIds.includes(leftStepId) && targetId === rightStepId) ||
    (sourceIds.includes(rightStepId) && targetId === leftStepId);
}

function directOperationName(transform: string) {
  switch (transform) {
    case "FIRST_NON_BLANK": return "firstNonBlank";
    case "SUM": return "sum";
    case "COUNT": return "count";
    case "TEXT_JOIN": return "textJoin";
    default: return "copy";
  }
}

function mappingInputCardinality(
  source: MappingPick,
  evaluationGrain: "FLOW_INSTANCE" | "TABLE_ROW",
) {
  return source.kind === "TABLE_COLUMN" && evaluationGrain === "FLOW_INSTANCE"
    ? "MANY"
    : "ONE";
}

function validateMappingSelection(
  transform: string,
  sources: MappingPick[],
  target: MappingPick | null,
) {
  if (!target || sources.length === 0) return null;
  const sourceTypes = sources.map((source) => normalizeMappingDataType(source.dataType));
  const targetType = normalizeMappingDataType(target.dataType);

  if (transform === "COPY" && sources.length === 1 && !mappingDataTypesCompatible(sourceTypes[0], targetType)) {
    return `Không thể sao chép ${mappingDataTypeLabel(sourceTypes[0])} vào đích ${mappingDataTypeLabel(targetType)}.`;
  }
  if (transform === "COPY" && target.kind === "FIELD" && sources.some((source) => source.kind === "TABLE_COLUMN")) {
    return "Không thể sao chép trực tiếp cả cột bảng vào một trường. Hãy chọn lấy giá trị đầu tiên, tính tổng, đếm hoặc nối nội dung.";
  }
  if (target.kind === "TABLE_COLUMN" && sources.every((source) => source.kind !== "TABLE_COLUMN")) {
    return "Đích là cột bảng cần ít nhất một cột bảng nguồn để xác định đúng hàng. Ánh xạ trường vào một hàng bảng cụ thể chưa được hỗ trợ.";
  }
  if (transform === "FIRST_NON_BLANK" && sourceTypes.some((sourceType) => !mappingDataTypesCompatible(sourceType, targetType))) {
    return "Mọi đầu vào của cách lấy giá trị đầu tiên phải cùng kiểu với đích.";
  }
  if (transform === "SUM" && (targetType !== "NUMBER" || sourceTypes.some((sourceType) => sourceType !== "NUMBER"))) {
    return "Phép tính tổng chỉ nhận đầu vào số và phải ghi vào đích kiểu số.";
  }
  if (transform === "COUNT" && targetType !== "NUMBER") {
    return "Phép đếm phải ghi vào đích kiểu số.";
  }
  if (transform === "TEXT_JOIN" && targetType !== "TEXT") {
    return "Phép nối nội dung phải ghi vào đích kiểu văn bản.";
  }
  if (transform === "CALC_PERCENTAGE" &&
      (targetType !== "NUMBER" || sourceTypes.some((sourceType) => sourceType !== "NUMBER"))) {
    return "Tính tỷ lệ cần hai đầu vào số và một đích kiểu số.";
  }
  if (transform === "CALC_PERCENTAGE" && target.kind === "FIELD" &&
      sources.some((source) => source.kind === "TABLE_COLUMN")) {
    return "Tính tỷ lệ từ cột bảng sang trường chưa hỗ trợ rút gọn từng cột. Hãy ánh xạ các tổng trung gian trước.";
  }
  if (target.kind === "TABLE_COLUMN" && sources.some((source) => source.kind === "TABLE_COLUMN") &&
      transform !== "COPY" && transform !== "FIRST_NON_BLANK" && transform !== "SUM" &&
      transform !== "COUNT" && transform !== "TEXT_JOIN" && transform !== "CALC_PERCENTAGE") {
    return "Cách tính này chưa hỗ trợ căn kết quả theo từng hàng bảng.";
  }
  return null;
}

function mappingDataTypesCompatible(left: string, right: string) {
  if (left === right) return true;
  return (left === "DATE" || left === "FULL_DATE") && (right === "DATE" || right === "FULL_DATE");
}

function mappingRuleSourceLabel(rule: FlowMappingRule) {
  if (rule.inputs?.length) {
    return rule.inputs.map((input) => {
      const endpoint = input.source;
      return endpoint.kind === "FIELD"
        ? endpoint.fieldKey ?? endpoint.fieldId ?? "Trường chưa xác định"
        : `${endpoint.blockId ?? "Bảng"}:${endpoint.columnKey ?? "Cột"}`;
    }).join(" + ");
  }
  return rule.sourceFieldKey ??
    (rule.sourceBlockId ? `${rule.sourceBlockId}:${rule.sourceColumnKey ?? "Cột"}` : "Nguồn chưa xác định");
}

function mappingRuleTargetLabel(rule: FlowMappingRule) {
  const endpoint = rule.target ?? legacyTargetEndpoint(rule);
  return endpoint.kind === "FIELD"
    ? endpoint.fieldKey ?? endpoint.fieldId ?? "Trường chưa xác định"
    : `${endpoint.blockId ?? "Bảng"}:${endpoint.columnKey ?? "Cột"}`;
}

type PermissionPolicy = {
  stepId?: string | null;
  stepCode?: string | null;
  actorRole?: string | null;
  read?: boolean | null;
  canRead?: boolean | null;
  write?: boolean | null;
  canWrite?: boolean | null;
  required?: boolean | null;
  isRequired?: boolean | null;
  hidden?: boolean | null;
  isHidden?: boolean | null;
  locked?: boolean | null;
  isLocked?: boolean | null;
  lockedAfterSubmit?: boolean | null;
};

type PermissionState = {
  read: boolean;
  write: boolean;
  required: boolean;
  hidden: boolean;
  locked: boolean;
  lockedAfterSubmit: boolean;
};

function fieldPolicyTargetsField(policy: FlowFieldPolicy, field: FormFieldOption) {
  return Boolean(
    (field.id && sameIdentity(policy.fieldId, field.id)) ||
    sameIdentity(policy.fieldKey, field.key),
  );
}

function sameIdentity(left: string | null | undefined, right: string | null | undefined) {
  return Boolean(left && right && left.trim().toUpperCase() === right.trim().toUpperCase());
}

function resolveActorBooleanPolicy(
  policies: FlowActorPolicy[],
  step: FlowStep | undefined,
  actorRole: FlowActorRole,
  readValue: (policy: FlowActorPolicy) => boolean | null | undefined,
) {
  if (!step) return false;
  let resolved = false;
  policies
    .filter((policy) => scopeMatches(policy.stepId, step.stepId) &&
      scopeMatches(policy.stepCode, step.stepCode) &&
      scopeMatches(policy.actorRole, actorRole))
    .map((policy, index) => ({
      policy,
      index,
      specificity: [policy.stepId, policy.stepCode, policy.actorRole]
        .filter((value) => value && value !== "*").length,
    }))
    .sort((left, right) => left.specificity - right.specificity || left.index - right.index)
    .forEach(({ policy }) => {
      const value = readValue(policy);
      if (value !== null && value !== undefined) resolved = value;
    });
  return resolved;
}

function resolvePermissionPolicy(
  policies: PermissionPolicy[],
  step: FlowStep | undefined,
  actorRole: FlowActorRole,
): PermissionState {
  if (!step) {
    return {
      read: true,
      write: false,
      required: false,
      hidden: false,
      locked: true,
      lockedAfterSubmit: false,
    };
  }
  const matches = policies
    .filter((policy) => scopeMatches(policy.stepId, step.stepId) &&
      scopeMatches(policy.stepCode, step.stepCode) &&
      scopeMatches(policy.actorRole, actorRole))
    .map((policy, index) => ({
      policy,
      index,
      specificity: [policy.stepId, policy.stepCode, policy.actorRole]
        .filter((value) => value && value !== "*").length,
    }))
    .sort((left, right) => left.specificity - right.specificity || left.index - right.index);
  const resolved: PermissionState = {
    read: true,
    write: matches.length === 0,
    required: false,
    hidden: false,
    locked: false,
    lockedAfterSubmit: false,
  };
  matches.forEach(({ policy }) => {
    const read = policy.read ?? policy.canRead;
    const write = policy.write ?? policy.canWrite;
    const required = policy.required ?? policy.isRequired;
    const hidden = policy.hidden ?? policy.isHidden;
    const locked = policy.locked ?? policy.isLocked;
    if (read !== null && read !== undefined) resolved.read = read;
    if (write !== null && write !== undefined) resolved.write = write;
    if (required !== null && required !== undefined) resolved.required = required;
    if (hidden !== null && hidden !== undefined) resolved.hidden = hidden;
    if (locked !== null && locked !== undefined) resolved.locked = locked;
    if (policy.lockedAfterSubmit !== null && policy.lockedAfterSubmit !== undefined) {
      resolved.lockedAfterSubmit = policy.lockedAfterSubmit;
    }
    if (resolved.hidden) {
      resolved.read = false;
      resolved.write = false;
      resolved.required = false;
    } else if (resolved.locked) {
      resolved.write = false;
    }
  });
  return resolved;
}

function applyPermissionStatePatch(
  current: PermissionState,
  patch: Partial<PermissionState>,
): PermissionState {
  const next = { ...current, ...patch };
  if (patch.read === true) next.hidden = false;
  if (patch.read === false) next.write = false;
  if (patch.write === true) {
    next.read = true;
    next.hidden = false;
    next.locked = false;
  }
  if (patch.required === true) next.hidden = false;
  if (patch.hidden === true) {
    next.read = false;
    next.write = false;
    next.required = false;
  }
  if (patch.locked === true) next.write = false;
  return next;
}

function scopeMatches(policyValue: string | null | undefined, contextValue: string) {
  return !policyValue || policyValue === "*" || policyValue.toUpperCase() === contextValue.toUpperCase();
}

function formLabel(formById: Map<string, DynamicFormRow>, id: string | null | undefined) {
  if (!id) return "-";
  const form = formById.get(id);
  return form ? `${form.code} - ${form.name}` : id;
}

function createDynamicFlowCommandId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `flow-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function flowStatusLabel(status: string | null | undefined) {
  switch ((status ?? "").trim().toUpperCase()) {
    case "DRAFT":
      return "Bản nháp";
    case "ACTIVE":
      return "Đang hoạt động";
    case "ARCHIVED":
      return "Đã lưu trữ";
    case "LOCKED":
      return "Đã khóa";
    default:
      return "Chưa xác định";
  }
}
