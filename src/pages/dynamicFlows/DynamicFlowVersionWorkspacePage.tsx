import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";

import {
  useGetDynamicFlowTemplateFamilyQuery,
  useGetDynamicFlowTemplateVersionQuery,
  useDiffDynamicFlowTemplateVersionsMutation,
  useLockDynamicFlowTemplateVersionP4Mutation,
  useReopenDynamicFlowTemplateVersionMutation,
  useSaveDynamicFlowTemplateVersionDraftP4Mutation,
  type DynamicFlowTemplateDiffDto,
  type DynamicFlowTemplateVersionDetailDto,
  type DynamicFlowTemplateVersionSummaryDto,
  type FlowDefinitionPayloadV2,
  type FlowFieldPolicyV2,
  type FlowMappingCalculationV2,
  type FlowMappingEndpointV2,
  type FlowMappingInputV2,
  type FlowMappingRuleV2,
  type FlowTableColumnPolicyV2,
} from "../../api/dynamicFlowTemplateApi";
import { UnsavedChangesDialog } from "../../components/common/UnsavedChangesDialog";
import DomainContextStrip from "../../components/navigation/DomainContextStrip";
import { ApiErrorCode } from "../../constants/errorCodes";
import { getMeSnapshot } from "../../stores/authStorage";
import { normalizeApiError } from "../../utils/apiError";
import { dynamicFlowVersionPath, DYNAMIC_FLOW_LIST_PATH } from "../../routes/dynamicFlowRoutes";
import { DynamicFlowEligibilityBadges } from "./DynamicFlowEligibilityBadges";
import { DynamicFlowJsonEditor } from "./DynamicFlowJsonEditor";
import { DynamicFlowTopologyWorkspace } from "./DynamicFlowTopologyWorkspace";
import {
  clearDynamicFlowDraft,
  cloneDynamicFlowPayload,
  createDynamicFlowWorkspaceCommandId,
  DYNAMIC_FLOW_WORKSPACE_TAB_LABELS,
  DYNAMIC_FLOW_WORKSPACE_TABS,
  dynamicFlowPayloadFingerprint,
  getDynamicFlowWorkspaceAccessState,
  isDynamicFlowWorkspaceTab,
  mergeDynamicFlowPayload,
  readDynamicFlowDraft,
  resolveDynamicFlowMergeConflicts,
  resolveDynamicFlowValidationTarget,
  toEditableDynamicFlowPayload,
  validateDynamicFlowWorkspacePayload,
  writeDynamicFlowDraft,
  type DynamicFlowMergeConflict,
  type DynamicFlowValidationTarget,
  type DynamicFlowWorkspaceTab,
} from "./dynamicFlowWorkspaceModel";

type WorkspaceDraft = {
  identity: string;
  payload: FlowDefinitionPayloadV2;
  basePayload: FlowDefinitionPayloadV2;
  baseDraftRevision: number;
  basePayloadHash: string;
  restoredLocally: boolean;
  restoredFromStaleBase: boolean;
  mergeConflicts: DynamicFlowMergeConflict[];
};

type PageMessage = {
  severity: "success" | "info" | "warning" | "error";
  text: string;
};

type P8FlowContributionPolicy = "EXCLUDE" | "INCLUDE";
type P8FlowContributionReadback = DynamicFlowTemplateVersionDetailDto & {
  contributionPolicy?: P8FlowContributionPolicy | null;
  contributionPolicyHash?: string | null;
  contributionWarning?: string | null;
};

const P8_INCLUDE_WARNING =
  "DYNAMIC_FLOW_STATISTIC_CONTRIBUTION_INCLUDE_WARNING";

function hasNonEmptyStatisticProfile(
  profile: Readonly<Record<string, unknown>>,
) {
  const entries = Object.entries(profile);
  if (entries.length === 0) return false;
  if (entries.length !== 1 || entries[0][0] !== "diffMode") return true;
  const value = entries[0][1];
  return typeof value !== "string" ||
    !["", "NONE"].includes(value.trim().toUpperCase());
}

type WorkspaceValidationFocusTarget = DynamicFlowValidationTarget & {
  requestId: number;
};

function isRevisionConflict(error: ReturnType<typeof normalizeApiError>) {
  return error.status === 409 &&
    error.errorCode === ApiErrorCode.DynamicFlowRevisionConflict;
}

function tabPath(
  familyId: string,
  versionId: string,
  tab: DynamicFlowWorkspaceTab,
) {
  return dynamicFlowVersionPath(familyId, versionId, tab);
}

function accessAlert(state: ReturnType<typeof getDynamicFlowWorkspaceAccessState>) {
  switch (state) {
    case "locked":
      return {
        severity: "info" as const,
        title: "Phiên bản đã khóa",
        text: "Snapshot này là bất biến. Mở lại sẽ tạo một draft mới có lineage rõ ràng.",
      };
    case "archived":
      return {
        severity: "warning" as const,
        title: "Định nghĩa đã lưu trữ",
        text: "Mọi trường trong workspace đang ở chế độ chỉ đọc.",
      };
    case "unsupported":
      return {
        severity: "warning" as const,
        title: "Cần xem xét migration",
        text: "Payload chưa ở dạng canonical được hỗ trợ. Workspace giữ nguyên dữ liệu và không cho ghi đè mù.",
      };
    case "readonly":
      return {
        severity: "info" as const,
        title: "Chế độ chỉ đọc",
        text: "Bạn có quyền xem nhưng không có quyền quản lý chính xác family/version này.",
      };
    default:
      return null;
  }
}

export default function DynamicFlowVersionWorkspacePage() {
  const navigate = useNavigate();
  const { familyId = "", versionId = "", tab: routeTab } = useParams<{
    familyId: string;
    versionId: string;
    tab?: string;
  }>();
  const actorId = getMeSnapshot()?.id ?? "";
  const familyQuery = useGetDynamicFlowTemplateFamilyQuery(
    { familyId },
    { skip: !familyId },
  );
  const versionQuery = useGetDynamicFlowTemplateVersionQuery(
    { familyId, versionId },
    { skip: !familyId || !versionId },
  );
  const [saveDraft, saveState] = useSaveDynamicFlowTemplateVersionDraftP4Mutation();
  const [lockVersion, lockState] = useLockDynamicFlowTemplateVersionP4Mutation();
  const [reopenVersion, reopenState] = useReopenDynamicFlowTemplateVersionMutation();
  const [workspaceState, setWorkspace] = useState<WorkspaceDraft | null>(null);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [conflict, setConflict] = useState(false);
  const [contributionPolicy, setContributionPolicy] =
    useState<P8FlowContributionPolicy>("EXCLUDE");
  const [contributionWarningAcknowledged, setContributionWarningAcknowledged] =
    useState(false);
  const [invalidEditors, setInvalidEditors] = useState<Set<string>>(() => new Set());
  const [rawDirtyEditors, setRawDirtyEditors] = useState<Set<string>>(() => new Set());
  const [rawEditorTexts, setRawEditorTexts] = useState<Record<string, string>>({});
  const [validationFocusTarget, setValidationFocusTarget] =
    useState<WorkspaceValidationFocusTarget | null>(null);
  const allowNavigationRef = useRef(false);

  const identity = `${familyId}:${versionId}`;
  const queriedFamily = familyQuery.currentData;
  const family = queriedFamily?.familyId === familyId ? queriedFamily : undefined;
  const queriedVersion = versionQuery.currentData;
  const routeVersion = queriedVersion?.familyId === familyId && queriedVersion.id === versionId
    ? queriedVersion
    : undefined;
  const workspace = workspaceState?.identity === identity ? workspaceState : null;
  const activeTab: DynamicFlowWorkspaceTab = isDynamicFlowWorkspaceTab(routeTab)
    ? routeTab
    : "overview";
  const unsupportedTab = Boolean(routeTab && !isDynamicFlowWorkspaceTab(routeTab));
  const contributionReadback = routeVersion as
    | P8FlowContributionReadback
    | undefined;

  useEffect(() => {
    setContributionPolicy(
      contributionReadback?.contributionPolicy === "INCLUDE"
        ? "INCLUDE"
        : "EXCLUDE",
    );
    setContributionWarningAcknowledged(false);
  }, [identity, contributionReadback?.contributionPolicy]);

  useEffect(() => {
    const version = routeVersion;
    if (!version || workspace?.identity === identity) return;
    const serverPayload = toEditableDynamicFlowPayload(version.payload);
    const localDraft = actorId ? readDynamicFlowDraft(actorId, familyId, versionId) : null;
    const useLocalDraft = localDraft !== null && version.status === "DRAFT" && version.canManage;
    const staleLocalDraft = Boolean(
      useLocalDraft &&
        (localDraft.baseDraftRevision !== version.draftRevision ||
          localDraft.basePayloadHash !== version.payloadHash),
    );
    let payload = serverPayload;
    let mergeConflicts: DynamicFlowMergeConflict[] = [];
    let restoredFromStaleBase = false;
    if (useLocalDraft && localDraft) {
      if (!staleLocalDraft) {
        payload = cloneDynamicFlowPayload(localDraft.payload);
      } else if (localDraft.basePayload) {
        const merged = mergeDynamicFlowPayload(
          localDraft.basePayload,
          localDraft.payload,
          serverPayload,
        );
        payload = merged.payload;
        mergeConflicts = merged.conflicts;
      } else {
        // Legacy local records did not retain the old base. Never guess a
        // merge: keep both values available and require an explicit choice.
        payload = cloneDynamicFlowPayload(localDraft.payload);
        mergeConflicts = [{
          path: "payload",
          segments: [],
          localValue: cloneDynamicFlowPayload(localDraft.payload),
          remoteValue: cloneDynamicFlowPayload(serverPayload),
        }];
        restoredFromStaleBase = true;
      }
    }
    setWorkspace({
      identity,
      payload,
      basePayload: cloneDynamicFlowPayload(serverPayload),
      baseDraftRevision: version.draftRevision,
      basePayloadHash: version.payloadHash,
      restoredLocally: useLocalDraft,
      restoredFromStaleBase,
      mergeConflicts,
    });
    setConflict(false);
    const restoredRawEditorTexts = useLocalDraft ? localDraft?.rawEditorTexts ?? {} : {};
    setInvalidEditors(new Set());
    setRawDirtyEditors(new Set(Object.keys(restoredRawEditorTexts)));
    setRawEditorTexts(restoredRawEditorTexts);
    setValidationFocusTarget(null);
  }, [actorId, familyId, identity, routeVersion, versionId, workspace?.identity]);

  const isPayloadDirty = Boolean(
    workspace &&
      dynamicFlowPayloadFingerprint(workspace.payload) !==
        dynamicFlowPayloadFingerprint(workspace.basePayload),
  );
  const hasRawEditorDrafts = Object.keys(rawEditorTexts).length > 0;
  const isDirty = isPayloadDirty || rawDirtyEditors.size > 0 || hasRawEditorDrafts;
  const hasPendingWorkspaceRisk = isDirty ||
    conflict ||
    Boolean(workspace?.restoredFromStaleBase) ||
    Boolean(workspace?.mergeConflicts.length);
  const workspaceBasePath = `${DYNAMIC_FLOW_LIST_PATH}/${encodeURIComponent(familyId)}/versions/${encodeURIComponent(versionId)}`;
  const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!hasPendingWorkspaceRisk || allowNavigationRef.current) return false;
    const currentInsideWorkspace = currentLocation.pathname.startsWith(workspaceBasePath);
    const nextInsideWorkspace = nextLocation.pathname.startsWith(workspaceBasePath);
    if (currentInsideWorkspace && nextInsideWorkspace) return false;
    return (
      `${currentLocation.pathname}${currentLocation.search}${currentLocation.hash}` !==
      `${nextLocation.pathname}${nextLocation.search}${nextLocation.hash}`
    );
  });

  useEffect(() => {
    if (!isDirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [hasPendingWorkspaceRisk]);

  useEffect(() => {
    if (!actorId || !workspace || !hasPendingWorkspaceRisk) return;
    const timeout = window.setTimeout(() => {
      writeDynamicFlowDraft({
        schema: 1,
        actorId,
        familyId,
        versionId,
        baseDraftRevision: workspace.baseDraftRevision,
        basePayloadHash: workspace.basePayloadHash,
        basePayload: workspace.basePayload,
        savedAtUtc: new Date().toISOString(),
        payload: workspace.payload,
        rawEditorTexts,
      });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [actorId, familyId, hasPendingWorkspaceRisk, rawEditorTexts, versionId, workspace]);

  useEffect(() => {
    if (!actorId || !workspace || hasPendingWorkspaceRisk) return;
    clearDynamicFlowDraft(actorId, familyId, versionId);
  }, [actorId, familyId, hasPendingWorkspaceRisk, versionId, workspace]);

  useEffect(() => {
    if (navigationBlocker.state === "blocked" && !hasPendingWorkspaceRisk) {
      navigationBlocker.proceed();
    }
  }, [hasPendingWorkspaceRisk, navigationBlocker]);

  const onEditorValidityChange = useCallback((editorId: string, valid: boolean) => {
    setInvalidEditors((current) => {
      const next = new Set(current);
      if (valid) next.delete(editorId);
      else next.add(editorId);
      return next;
    });
  }, []);

  const onRawDirtyChange = useCallback((editorId: string, dirty: boolean) => {
    setRawDirtyEditors((current) => {
      const next = new Set(current);
      if (dirty) next.add(editorId);
      else next.delete(editorId);
      return next;
    });
  }, []);

  const onRawTextChange = useCallback((editorId: string, text: string | null) => {
    setRawEditorTexts((current) => {
      if (text === null) {
        if (!(editorId in current)) return current;
        const next = { ...current };
        delete next[editorId];
        return next;
      }
      if (current[editorId] === text) return current;
      return { ...current, [editorId]: text };
    });
  }, []);

  const adoptServerVersion = useCallback(
    (version: DynamicFlowTemplateVersionDetailDto) => {
      const payload = toEditableDynamicFlowPayload(version.payload);
      setWorkspace({
        identity,
        payload,
        basePayload: cloneDynamicFlowPayload(payload),
        baseDraftRevision: version.draftRevision,
        basePayloadHash: version.payloadHash,
        restoredLocally: false,
        restoredFromStaleBase: false,
        mergeConflicts: [],
      });
      if (actorId) clearDynamicFlowDraft(actorId, familyId, versionId);
      setConflict(false);
      setInvalidEditors(new Set());
      setRawDirtyEditors(new Set());
      setRawEditorTexts({});
      setValidationFocusTarget(null);
    },
    [actorId, familyId, identity, versionId],
  );

  const validationIssues = useMemo(
    () => (workspace ? validateDynamicFlowWorkspacePayload(workspace.payload) : []),
    [workspace],
  );
  const validationErrorCount = validationIssues.filter((issue) => issue.level === "error").length;
  const version = routeVersion;
  const accessState = family && version ? getDynamicFlowWorkspaceAccessState(family, version) : null;
  const readOnly = accessState !== "editable";
  const busy = familyQuery.isFetching || versionQuery.isFetching ||
    saveState.isLoading || lockState.isLoading || reopenState.isLoading;
  const hasUnresolvedRevision = conflict ||
    Boolean(workspace?.mergeConflicts.length) ||
    Boolean(workspace?.restoredFromStaleBase);

  const routeValidationError = useCallback(
    (error: ReturnType<typeof normalizeApiError>) => {
      if (!workspace) return;
      const target = resolveDynamicFlowValidationTarget(error.details, workspace.payload);
      if (!target) return;
      setValidationFocusTarget({ ...target, requestId: Date.now() });
      if (activeTab !== target.tab) {
        navigate(tabPath(familyId, versionId, target.tab));
      }
    },
    [activeTab, familyId, navigate, versionId, workspace],
  );

  useEffect(() => {
    if (!validationFocusTarget || validationFocusTarget.tab !== activeTab) return;

    const focusElement = (element: HTMLElement | null) => {
      if (!element) return false;
      element.scrollIntoView?.({ block: "center", behavior: "smooth" });
      element.focus();
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.select();
      }
      return true;
    };

    const timer = window.setTimeout(() => {
      if (validationFocusTarget.nodeId) {
        const row = Array.from(
          document.querySelectorAll<HTMLElement>("[data-dynamic-flow-node-id]"),
        ).find((candidate) =>
          candidate.dataset.dynamicFlowNodeId === validationFocusTarget.nodeId);
        row?.click();
        window.setTimeout(() => {
          const control = Array.from(
            document.querySelectorAll<HTMLElement>("[data-dynamic-flow-node-control]"),
          ).find((candidate) =>
            candidate.dataset.dynamicFlowNodeControl === validationFocusTarget.control);
          if (!focusElement(control ?? null)) focusElement(row ?? null);
        }, 0);
        return;
      }

      if (
        validationFocusTarget.canonicalControlId &&
        focusElement(document.getElementById(validationFocusTarget.canonicalControlId))
      ) {
        return;
      }

      if (validationFocusTarget.editorId) {
        focusElement(document.getElementById(
          `dynamic-flow-json-editor-${validationFocusTarget.editorId}`,
        ));
        return;
      }

      const root = validationFocusTarget.path.split(/[.[\]]/).find(Boolean);
      if (root && focusElement(document.getElementById(`dynamic-flow-control-${root}`))) return;
      focusElement(document.getElementById("dynamic-flow-validation-panel"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, validationFocusTarget]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!workspace || !version || readOnly) return false;
    if (hasUnresolvedRevision) {
      setMessage({
        severity: "warning",
        text: "Hãy rebase và giải quyết tất cả vùng xung đột trước khi lưu.",
      });
      return false;
    }
    if (hasRawEditorDrafts) {
      setMessage({
        severity: "error",
        text: "Hãy áp dụng hoặc hoàn tác nội dung JSON đang nhập trước khi lưu.",
      });
      return false;
    }
    if (invalidEditors.size > 0) {
      setMessage({ severity: "error", text: "Hãy sửa JSON chưa hợp lệ trước khi lưu." });
      return false;
    }
    try {
      const saved = await saveDraft({
        familyId,
        versionId,
        body: {
          commandId: createDynamicFlowWorkspaceCommandId("save"),
          expectedDraftRevision: workspace.baseDraftRevision,
          expectedPayloadHash: workspace.basePayloadHash,
          payload: workspace.payload,
        },
      }).unwrap();
      adoptServerVersion(saved);
      setMessage({ severity: "success", text: "Đã lưu draft với token CAS mới." });
      return true;
    } catch (caught) {
      const error = normalizeApiError(caught);
      if (isRevisionConflict(error)) {
        setConflict(true);
        setMessage({
          severity: "warning",
          text: "Draft trên máy chủ đã thay đổi. Nội dung bạn đang nhập vẫn được giữ nguyên.",
        });
      } else {
        setMessage({ severity: "error", text: error.message });
        routeValidationError(error);
      }
      return false;
    }
  }, [
    adoptServerVersion,
    familyId,
    hasRawEditorDrafts,
    hasUnresolvedRevision,
    invalidEditors.size,
    readOnly,
    routeValidationError,
    saveDraft,
    version,
    versionId,
    workspace,
  ]);

  const reloadServer = async (preserveLocal: boolean) => {
    const currentPayload = workspace?.payload;
    const currentBasePayload = workspace?.basePayload;
    const result = await versionQuery.refetch();
    if (!("data" in result) || !result.data) {
      setMessage({ severity: "error", text: "Không tải được revision mới từ máy chủ." });
      return;
    }
    const fresh = result.data;
    if (!preserveLocal || !currentPayload || !currentBasePayload) {
      adoptServerVersion(fresh);
      setMessage({ severity: "info", text: "Đã nạp lại snapshot mới nhất từ máy chủ." });
      return;
    }
    const freshPayload = toEditableDynamicFlowPayload(fresh.payload);
    const merged = mergeDynamicFlowPayload(
      currentBasePayload,
      currentPayload,
      freshPayload,
    );
    setWorkspace({
      identity,
      payload: merged.payload,
      basePayload: cloneDynamicFlowPayload(freshPayload),
      baseDraftRevision: fresh.draftRevision,
      basePayloadHash: fresh.payloadHash,
      restoredLocally: true,
      restoredFromStaleBase: false,
      mergeConflicts: merged.conflicts,
    });
    setConflict(false);
    setMessage({
      severity: merged.conflicts.length ? "warning" : "info",
      text: merged.conflicts.length
        ? `Rebase giữ thay đổi không giao nhau và phát hiện ${merged.conflicts.length} vùng xung đột cần chọn.`
        : "Đã rebase ba chiều; thay đổi local và máy chủ không giao nhau đều được giữ.",
    });
  };

  const resolveMergeConflicts = (choice: "local" | "remote") => {
    setWorkspace((current) => {
      if (!current || current.mergeConflicts.length === 0) return current;
      return {
        ...current,
        payload: resolveDynamicFlowMergeConflicts(
          current.payload,
          current.mergeConflicts,
          choice,
        ),
        restoredFromStaleBase: false,
        mergeConflicts: [],
      };
    });
    setConflict(false);
    setMessage({
      severity: "info",
      text: choice === "local"
        ? "Đã giữ giá trị local tại vùng xung đột; thay đổi remote không giao nhau vẫn được bảo toàn."
        : "Đã dùng giá trị máy chủ tại vùng xung đột; thay đổi local không giao nhau vẫn được bảo toàn.",
    });
  };

  const handleLock = async () => {
    if (busy || !workspace || !family || !version || readOnly || isDirty || hasUnresolvedRevision) return;
    if (hasNonEmptyStatisticProfile(workspace.payload.statisticProfile)) {
      setMessage({ severity: "error", text: "FLOW_STATISTIC_PROFILE_DISABLED" });
      return;
    }
    if (contributionPolicy === "INCLUDE" && !contributionWarningAcknowledged) {
      setMessage({
        severity: "warning",
        text: "DYNAMIC_FLOW_CONTRIBUTION_WARNING_REQUIRED: hãy xác nhận cảnh báo INCLUDE trước khi khóa.",
      });
      return;
    }
    if (validationErrorCount > 0 || invalidEditors.size > 0) {
      setMessage({ severity: "error", text: "Không thể khóa khi còn lỗi validation." });
      return;
    }
    try {
      const locked = await lockVersion({
        familyId,
        versionId,
        body: {
          commandId: createDynamicFlowWorkspaceCommandId("lock"),
          expectedFamilyRevision: family.familyRevision,
          expectedDraftRevision: workspace.baseDraftRevision,
          expectedPayloadHash: workspace.basePayloadHash,
          contributionPolicy,
          acknowledgeContributionWarning:
            contributionPolicy === "INCLUDE"
              ? contributionWarningAcknowledged : false,
        },
      }).unwrap();
      adoptServerVersion(locked);
      await familyQuery.refetch();
      setMessage({
        severity: "success",
        text: `Đã khóa version ${locked.versionNo}. Thực thi vẫn bị chặn đến ${locked.blockedUntilPhase ?? "phase đích"}.`,
      });
    } catch (caught) {
      const error = normalizeApiError(caught);
      const revisionConflict = isRevisionConflict(error);
      if (revisionConflict) setConflict(true);
      setMessage({ severity: revisionConflict ? "warning" : "error", text: error.message });
      if (!revisionConflict) routeValidationError(error);
    }
  };

  const handleReopen = async () => {
    if (
      !family ||
      !version ||
      family.status === "ARCHIVED" ||
      version.status !== "LOCKED" ||
      !version.canManage
    ) return;
    try {
      const reopened = await reopenVersion({
        familyId,
        versionId,
        body: {
          commandId: createDynamicFlowWorkspaceCommandId("reopen"),
          expectedFamilyRevision: family.familyRevision,
        },
      }).unwrap();
      allowNavigationRef.current = true;
      navigate(dynamicFlowVersionPath(familyId, reopened.id, "overview"));
      window.setTimeout(() => {
        allowNavigationRef.current = false;
      }, 0);
    } catch (caught) {
      setMessage({ severity: "error", text: normalizeApiError(caught).message });
    }
  };

  const leaveAfterSave = async () => {
    const saved = await handleSave();
    if (saved && navigationBlocker.state === "blocked") navigationBlocker.proceed();
  };

  if (!familyId || !versionId) {
    return <Alert severity="error" sx={{ m: 2 }}>Thiếu familyId hoặc versionId trên đường dẫn.</Alert>;
  }

  if (familyQuery.isError || versionQuery.isError || !family || !version) {
    if (!familyQuery.isError && !versionQuery.isError) {
      return (
        <Stack spacing={2} sx={{ p: { xs: 1.5, md: 2.5 } }} aria-label="Đang tải workspace quy trình">
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={52} />
          <Skeleton variant="rounded" height={480} />
        </Stack>
      );
    }
    const error = normalizeApiError(familyQuery.error ?? versionQuery.error);
    const forbidden = error.status === 403;
    return (
      <Stack spacing={2} alignItems="flex-start" sx={{ p: { xs: 1.5, md: 2.5 } }}>
        <Alert severity={forbidden ? "warning" : "error"} sx={{ width: "100%" }}>
          <AlertTitle>{forbidden ? "Không có quyền truy cập" : "Không mở được workspace"}</AlertTitle>
          {forbidden
            ? "Bạn không có quyền xem chính xác family/version này. Hệ thống không hiển thị metadata chi tiết."
            : error.message}
        </Alert>
        <Stack direction="row" gap={1}>
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(DYNAMIC_FLOW_LIST_PATH)}>
            Về danh sách
          </Button>
          {!forbidden ? (
            <Button
              startIcon={<RefreshRoundedIcon />}
              onClick={() => void Promise.all([familyQuery.refetch(), versionQuery.refetch()])}
            >
              Thử lại
            </Button>
          ) : null}
        </Stack>
      </Stack>
    );
  }

  if (familyQuery.isLoading || versionQuery.isLoading || !workspace) {
    return (
      <Stack spacing={2} sx={{ p: { xs: 1.5, md: 2.5 } }} aria-label="Đang tải workspace quy trình">
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={52} />
        <Skeleton variant="rounded" height={480} />
      </Stack>
    );
  }

  if (!version.canRead || version.familyId !== familyId) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Bạn không có quyền xem chính xác family/version này.
      </Alert>
    );
  }

  const stateAlert = accessState ? accessAlert(accessState) : null;

  return (
    <Stack sx={{ minWidth: 0, minHeight: "calc(100vh - 92px)" }}>
      <DomainContextStrip
        ariaLabel="Ngữ cảnh quy trình"
        breadcrumbs={[
          { label: "Thiết kế" },
          { label: "Quy trình", to: DYNAMIC_FLOW_LIST_PATH },
          { label: family.code },
          { label: `v${version.versionNo}` },
        ]}
        items={[
          { label: "Family", value: familyId },
          { label: "Phiên bản", value: versionId },
          { label: "Trạng thái", value: version.status, color: version.status === "DRAFT" ? "warning" : "success" },
          { label: "Quyền", value: version.canManage ? "Có thể quản lý" : "Chỉ đọc" },
        ]}
      />
      <Paper square elevation={0} sx={{ px: { xs: 1.5, md: 2.5 }, py: 1.75, borderBottom: 1, borderColor: "divider" }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" gap={1.5}>
            <Stack direction="row" gap={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
              <Button
                size="small"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => navigate(DYNAMIC_FLOW_LIST_PATH)}
                sx={{ flexShrink: 0 }}
              >
                Danh sách
              </Button>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="h5" fontWeight={900} noWrap>{family.name}</Typography>
                  <Chip size="small" label={family.code} variant="outlined" />
                  <Chip size="small" label={`v${version.versionNo} · ${version.status}`} color={version.status === "DRAFT" ? "warning" : "success"} />
                  {isDirty ? <Chip size="small" label="Chưa lưu" color="warning" /> : <Chip size="small" label="Đã đồng bộ" color="success" variant="outlined" />}
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  noWrap
                  data-testid="dynamic-flow-version-cas-strip"
                  data-family-id={familyId}
                  data-family-revision={family.familyRevision}
                  data-version-id={version.id}
                  data-version-status={version.status}
                  data-workspace-identity={workspace.identity}
                  data-base-draft-revision={workspace.baseDraftRevision}
                  data-base-payload-hash={workspace.basePayloadHash}
                >
                  Family revision {family.familyRevision} · Draft revision {workspace.baseDraftRevision} · Hash {workspace.basePayloadHash.slice(0, 12)}…
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel id="flow-version-select-label">Phiên bản</InputLabel>
                <Select
                  labelId="flow-version-select-label"
                  label="Phiên bản"
                  value={versionId}
                  onChange={(event) =>
                    navigate(dynamicFlowVersionPath(familyId, event.target.value, activeTab))
                  }
                >
                  {family.versions.map((item) => (
                    <MenuItem key={item.id} value={item.id}>v{item.versionNo} · {item.status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {version.status === "DRAFT" ? (
                <>
                  <Button
                    variant="outlined"
                    startIcon={saveState.isLoading ? <CircularProgress size={16} /> : <SaveOutlinedIcon />}
                    disabled={
                      busy ||
                      readOnly ||
                      !isDirty ||
                      invalidEditors.size > 0 ||
                      hasRawEditorDrafts ||
                      hasUnresolvedRevision
                    }
                    onClick={() => void handleSave()}
                  >
                    Lưu draft
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={lockState.isLoading ? <CircularProgress size={16} color="inherit" /> : <LockOutlinedIcon />}
                    disabled={
                      busy ||
                      readOnly ||
                      isDirty ||
                      invalidEditors.size > 0 ||
                      validationErrorCount > 0 ||
                      hasNonEmptyStatisticProfile(workspace.payload.statisticProfile) ||
                      (contributionPolicy === "INCLUDE" &&
                        !contributionWarningAcknowledged)
                    }
                    onClick={() => void handleLock()}
                  >
                    Khóa snapshot
                  </Button>
                </>
              ) : version.status === "LOCKED" &&
                version.canManage &&
                family.status !== "ARCHIVED" ? (
                <Button
                  variant="outlined"
                  startIcon={reopenState.isLoading ? <CircularProgress size={16} /> : <RestoreRoundedIcon />}
                  disabled={busy}
                  onClick={() => void handleReopen()}
                >
                  Mở lại thành draft mới
                </Button>
              ) : null}
            </Stack>
          </Stack>
          <DynamicFlowEligibilityBadges metadata={version} />
        </Stack>
      </Paper>

      <Tabs
        value={activeTab}
        onChange={(_event, next: DynamicFlowWorkspaceTab) => navigate(tabPath(familyId, versionId, next))}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Các vùng cấu hình phiên bản quy trình"
        sx={{ px: { xs: 0.5, md: 2 }, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}
      >
        {DYNAMIC_FLOW_WORKSPACE_TABS.map((tab) => (
          <Tab
            key={tab}
            value={tab}
            label={
              tab === "validation" && validationErrorCount > 0
                ? `${DYNAMIC_FLOW_WORKSPACE_TAB_LABELS[tab]} (${validationErrorCount})`
                : DYNAMIC_FLOW_WORKSPACE_TAB_LABELS[tab]
            }
          />
        ))}
      </Tabs>

      <Box sx={{ p: { xs: 1.25, md: 2.5 }, minWidth: 0 }}>
        <Stack spacing={2}>
          {unsupportedTab ? (
            <Alert severity="warning" action={<Button onClick={() => navigate(tabPath(familyId, versionId, "overview"))}>Về tổng quan</Button>}>
              Tab “{routeTab}” không được hỗ trợ trong workspace quy trình.
            </Alert>
          ) : null}
          {message ? <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert> : null}
          {stateAlert ? (
            <Alert severity={stateAlert.severity}>
              <AlertTitle>{stateAlert.title}</AlertTitle>
              {stateAlert.text}
            </Alert>
          ) : null}
          {workspace.restoredLocally ? (
            <Alert severity={workspace.restoredFromStaleBase ? "warning" : "info"}>
              <AlertTitle>Đã khôi phục draft cục bộ theo actor/family/version</AlertTitle>
              {workspace.restoredFromStaleBase
                ? "Revision máy chủ đã đổi nhưng draft cũ không có base để merge an toàn. Hãy chọn rõ local hoặc máy chủ trước khi lưu."
                : workspace.mergeConflicts.length > 0
                  ? "Đã merge ba chiều và giữ mọi thay đổi không giao nhau; các vùng chồng lấn cần được chọn rõ."
                  : "Các chỉnh sửa chưa gửi lần trước đã được khôi phục và rebase an toàn trên thiết bị này."}
            </Alert>
          ) : null}
          {conflict && workspace.mergeConflicts.length === 0 ? (
            <Alert severity="warning">
              <AlertTitle>Xung đột revision — nội dung local chưa bị mất</AlertTitle>
              <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ mt: 1 }}>
                <Button size="small" variant="contained" onClick={() => void reloadServer(true)}>
                  Rebase và giữ nội dung local
                </Button>
                <Button size="small" color="warning" variant="outlined" onClick={() => void reloadServer(false)}>
                  Bỏ local, nạp bản máy chủ
                </Button>
              </Stack>
            </Alert>
          ) : null}
          {workspace.mergeConflicts.length > 0 ? (
            <Alert severity="warning">
              <AlertTitle>
                {workspace.mergeConflicts.length} vùng chỉnh sửa chồng lấn — Save đang bị khóa
              </AlertTitle>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                {workspace.mergeConflicts.map((item) => (
                  <Typography key={item.path} variant="body2">
                    <code>{item.path}</code>
                  </Typography>
                ))}
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ mt: 1.5 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => resolveMergeConflicts("local")}
                >
                  Giữ local tại vùng xung đột
                </Button>
                <Button
                  size="small"
                  color="warning"
                  variant="outlined"
                  onClick={() => resolveMergeConflicts("remote")}
                >
                  Dùng máy chủ tại vùng xung đột
                </Button>
                <Button
                  size="small"
                  color="warning"
                  variant="text"
                  onClick={() => void reloadServer(false)}
                >
                  Bỏ toàn bộ local
                </Button>
              </Stack>
            </Alert>
          ) : null}

          {activeTab === "overview" ? (
            <OverviewPanel
              family={family}
              version={version}
              payload={workspace.payload}
              readOnly={readOnly}
              onChange={(payload) => setWorkspace((current) => current ? { ...current, payload } : current)}
            />
          ) : null}
          {activeTab === "topology" ? (
            <DynamicFlowTopologyWorkspace
              payload={workspace.payload}
              readOnly={readOnly}
              onChange={(payload) => setWorkspace((current) => current ? { ...current, payload } : current)}
              onEditorValidityChange={onEditorValidityChange}
              onRawDirtyChange={onRawDirtyChange}
              rawText={rawEditorTexts["topology-edges"]}
              onRawTextChange={onRawTextChange}
            />
          ) : null}
          {activeTab === "forms-policies" ? (
            <FormsPoliciesPanel
              payload={workspace.payload}
              readOnly={readOnly}
              onChange={(payload) => setWorkspace((current) => current ? { ...current, payload } : current)}
              onEditorValidityChange={onEditorValidityChange}
              onRawDirtyChange={onRawDirtyChange}
              rawEditorTexts={rawEditorTexts}
              onRawTextChange={onRawTextChange}
              validationFocusTarget={validationFocusTarget}
            />
          ) : null}
          {activeTab === "mapping-metadata" ? (
            <MappingMetadataPanel
              payload={workspace.payload}
              readOnly={readOnly}
              onChange={(payload) => setWorkspace((current) => current ? { ...current, payload } : current)}
              onEditorValidityChange={onEditorValidityChange}
              onRawDirtyChange={onRawDirtyChange}
              rawEditorTexts={rawEditorTexts}
              onRawTextChange={onRawTextChange}
              validationFocusTarget={validationFocusTarget}
            />
          ) : null}
          {activeTab === "result-statistics" ? (
            <ResultStatisticsPanel
              payload={workspace.payload}
              version={version}
              readOnly={readOnly}
              onChange={(payload) => setWorkspace((current) => current ? { ...current, payload } : current)}
              contributionPolicy={contributionPolicy}
              contributionWarningAcknowledged={contributionWarningAcknowledged}
              onContributionPolicyChange={(policy) => {
                setContributionPolicy(policy);
                setContributionWarningAcknowledged(false);
              }}
              onContributionWarningAcknowledgedChange={
                setContributionWarningAcknowledged
              }
              onEditorValidityChange={onEditorValidityChange}
              onRawDirtyChange={onRawDirtyChange}
              rawEditorTexts={rawEditorTexts}
              onRawTextChange={onRawTextChange}
            />
          ) : null}
          {activeTab === "validation" ? (
            <ValidationPanel payload={workspace.payload} issues={validationIssues} />
          ) : null}
        </Stack>
      </Box>

      <UnsavedChangesDialog
        open={navigationBlocker.state === "blocked"}
        title="Draft quy trình chưa được lưu"
        message="Các thay đổi được giữ trong draft cục bộ theo tài khoản và version. Bạn muốn lưu lên máy chủ trước khi rời workspace?"
        saveText="Lưu rồi rời đi"
        discardText="Rời đi, giữ draft cục bộ"
        saving={saveState.isLoading}
        onSave={() => void leaveAfterSave()}
        onDiscard={() => {
          if (navigationBlocker.state === "blocked") navigationBlocker.proceed();
        }}
        onCancel={() => {
          if (navigationBlocker.state === "blocked") navigationBlocker.reset();
        }}
      />
    </Stack>
  );
}

type PanelProps = {
  payload: FlowDefinitionPayloadV2;
  readOnly: boolean;
  onChange: (payload: FlowDefinitionPayloadV2) => void;
};

function OverviewPanel({
  family,
  version,
  payload,
  readOnly,
  onChange,
}: PanelProps & {
  family: NonNullable<ReturnType<typeof useGetDynamicFlowTemplateFamilyQuery>["data"]>;
  version: DynamicFlowTemplateVersionDetailDto;
}) {
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={850} sx={{ mb: 2 }}>Nhận diện definition</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            id="dynamic-flow-control-archetypeId"
            fullWidth
            label="Archetype catalog"
            value={payload.archetypeId}
            disabled={readOnly}
            onChange={(event) => onChange({ ...payload, archetypeId: event.target.value })}
          />
          <TextField
            id="dynamic-flow-control-entryStepId"
            select
            fullWidth
            label="Nút bắt đầu"
            value={payload.entryStepId}
            disabled={readOnly}
            onChange={(event) => onChange({ ...payload, entryStepId: event.target.value })}
          >
            {payload.nodes.map((node) => <MenuItem key={node.nodeId} value={node.nodeId}>{node.nodeCode}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <MetadataCard title="Family">
          <MetadataRow label="ID" value={family.familyId} />
          <MetadataRow label="Chủ sở hữu" value={family.ownerUserId ?? family.ownerUnitId ?? "—"} />
          <MetadataRow label="Trạng thái" value={family.status} />
          <MetadataRow label="Lineage" value={family.lineage.originFamilyId ?? "Family gốc"} />
        </MetadataCard>
        <MetadataCard title="Version snapshot">
          <MetadataRow label="Version ID" value={version.id} />
          <MetadataRow label="Schema / adapter" value={`${version.schemaVersion} / ${version.adapterVersion}`} />
          <MetadataRow
            label="Catalog"
            value={`${version.catalogVersion ?? "untrusted"} · ${version.catalogSemanticHash ? `${version.catalogSemanticHash.slice(0, 12)}…` : "untrusted"}`}
          />
          <MetadataRow label="Lineage version" value={version.lineage.originVersionId ?? "Version gốc"} />
        </MetadataCard>
      </Stack>
      <VersionDiffPanel
        familyId={family.familyId}
        currentVersionId={version.id}
        versions={family.versions.filter((item: DynamicFlowTemplateVersionSummaryDto) => item.canRead)}
      />
      <Alert severity="warning">
        Workspace này sở hữu định nghĩa và snapshot. Khởi chạy/runtime đi qua canonical Work route theo capability máy chủ; không tạo mutation owner thứ hai tại đây.
      </Alert>
    </Stack>
  );
}

function VersionDiffPanel({
  familyId,
  currentVersionId,
  versions,
}: {
  familyId: string;
  currentVersionId: string;
  versions: DynamicFlowTemplateVersionSummaryDto[];
}) {
  const current = versions.find((item) => item.id === currentVersionId) ?? versions.at(-1) ?? null;
  const prior = current
    ? [...versions]
        .filter((item) => item.id !== current.id && item.versionNo < current.versionNo)
        .sort((left, right) => right.versionNo - left.versionNo)[0] ??
      versions.find((item) => item.id !== current.id) ??
      current
    : null;
  const [fromVersionId, setFromVersionId] = useState(prior?.id ?? "");
  const [toVersionId, setToVersionId] = useState(current?.id ?? "");
  const [result, setResult] = useState<DynamicFlowTemplateDiffDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diffVersions, diffState] = useDiffDynamicFlowTemplateVersionsMutation();
  const versionSignature = versions.map((item) => `${item.id}:${item.versionNo}`).join("|");

  useEffect(() => {
    const available = new Set(versions.map((item) => item.id));
    setFromVersionId((value) => available.has(value) ? value : prior?.id ?? "");
    setToVersionId((value) => available.has(value) ? value : current?.id ?? "");
    setResult(null);
    setError(null);
  }, [current?.id, familyId, prior?.id, versionSignature]);

  const runDiff = async () => {
    if (!fromVersionId || !toVersionId || fromVersionId === toVersionId) return;
    setError(null);
    try {
      setResult(await diffVersions({
        familyId,
        body: { fromVersionId, toVersionId },
      }).unwrap());
    } catch (caught) {
      setResult(null);
      setError(normalizeApiError(caught).message);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={850}>So sánh version canonical</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Diff do server tạo từ hai snapshot mà tài khoản hiện tại có quyền đọc; quyền quản lý không phải điều kiện đọc diff.
      </Typography>
      {versions.length < 2 ? (
        <Alert severity="info">Cần ít nhất hai version có quyền đọc để so sánh.</Alert>
      ) : (
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Phiên bản nguồn"
              value={fromVersionId}
              onChange={(event) => {
                setFromVersionId(event.target.value);
                setResult(null);
              }}
            >
              {versions.map((item) => <MenuItem key={item.id} value={item.id}>v{item.versionNo} · {item.status}</MenuItem>)}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label="Phiên bản đích"
              value={toVersionId}
              onChange={(event) => {
                setToVersionId(event.target.value);
                setResult(null);
              }}
            >
              {versions.map((item) => <MenuItem key={item.id} value={item.id}>v{item.versionNo} · {item.status}</MenuItem>)}
            </TextField>
            <Button
              variant="outlined"
              disabled={diffState.isLoading || !fromVersionId || !toVersionId || fromVersionId === toVersionId}
              onClick={() => void runDiff()}
              sx={{ whiteSpace: "nowrap" }}
            >
              {diffState.isLoading ? "Đang so sánh…" : "So sánh version"}
            </Button>
          </Stack>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {result ? <VersionDiffResult result={result} /> : null}
        </Stack>
      )}
    </Paper>
  );
}

function VersionDiffResult({ result }: { result: DynamicFlowTemplateDiffDto }) {
  return (
    <Stack spacing={1.25} aria-label="Kết quả so sánh version canonical">
      <Stack direction={{ xs: "column", md: "row" }} gap={1}>
        <Chip size="small" variant="outlined" label={`Nguồn ${result.fromPayloadHash}`} sx={{ maxWidth: "100%" }} />
        <Chip size="small" variant="outlined" label={`Đích ${result.toPayloadHash}`} sx={{ maxWidth: "100%" }} />
      </Stack>
      {result.operations.length === 0 ? (
        <Alert severity="success">Hai snapshot không có khác biệt canonical.</Alert>
      ) : (
        result.operations.map((operation, index) => (
          <Paper key={`${operation.op}:${operation.path}:${index}`} variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Chip size="small" label={operation.op} color={operation.op === "REMOVE" ? "warning" : operation.op === "ADD" ? "success" : "info"} />
              <Typography component="code" variant="body2" sx={{ overflowWrap: "anywhere" }}>{operation.path}</Typography>
            </Stack>
            {operation.fromValue !== undefined ? (
              <Typography component="pre" variant="caption" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", mb: 0 }}>
                {`from: ${JSON.stringify(operation.fromValue)}`}
              </Typography>
            ) : null}
            {operation.toValue !== undefined ? (
              <Typography component="pre" variant="caption" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", mb: 0 }}>
                {`to: ${JSON.stringify(operation.toValue)}`}
              </Typography>
            ) : null}
          </Paper>
        ))
      )}
    </Stack>
  );
}

function MetadataCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Paper variant="outlined" sx={{ p: 2, flex: 1 }}><Typography fontWeight={850} sx={{ mb: 1 }}>{title}</Typography>{children}</Paper>;
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={700} sx={{ overflowWrap: "anywhere", textAlign: "right" }}>{value}</Typography>
    </Stack>
  );
}

type JsonPanelProps = PanelProps & {
  onEditorValidityChange: (editorId: string, valid: boolean) => void;
  onRawDirtyChange: (editorId: string, dirty: boolean) => void;
  rawEditorTexts: Record<string, string>;
  onRawTextChange: (editorId: string, text: string | null) => void;
  validationFocusTarget?: WorkspaceValidationFocusTarget | null;
};

const POLICY_DECISION_KEYS = [
  "read",
  "write",
  "required",
  "hidden",
  "locked",
  "lockedAfterSubmit",
] as const;

type PolicyDecisionKey = (typeof POLICY_DECISION_KEYS)[number];
type PolicyFocus = { kind: "field" | "table"; index: number };

function PolicyDecisionSelect({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id?: string;
  label: string;
  value: boolean | null;
  disabled: boolean;
  onChange: (value: boolean | null) => void;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = `${inputId}-label`;
  return (
    <FormControl fullWidth size="small">
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        id={inputId}
        labelId={labelId}
        label={label}
        value={value === null ? "DEFAULT_DENY" : value ? "ALLOW" : "DENY"}
        disabled={disabled}
        onChange={(event) => onChange(
          event.target.value === "DEFAULT_DENY"
            ? null
            : event.target.value === "ALLOW",
        )}
      >
        <MenuItem value="DEFAULT_DENY">Mặc định (deny)</MenuItem>
        <MenuItem value="ALLOW">Cho phép</MenuItem>
        <MenuItem value="DENY">Từ chối</MenuItem>
      </Select>
    </FormControl>
  );
}

function nextPolicyId(prefix: string, existing: Array<{ policyId: string | null }>) {
  const ids = new Set(existing.map((item) => item.policyId).filter(Boolean));
  let index = existing.length + 1;
  while (ids.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function defaultFieldPolicy(payload: FlowDefinitionPayloadV2): FlowFieldPolicyV2 {
  const firstStep = payload.nodes.find((node) => node.nodeKind === "FORM_STEP");
  return {
    policyId: nextPolicyId("field-policy", payload.fieldPolicies),
    dynamicFormTemplateId: payload.rootDynamicFormTemplateId ?? null,
    stepId: firstStep?.nodeId ?? null,
    stepCode: firstStep?.nodeCode ?? null,
    actorRole: "ASSIGNEE",
    fieldId: null,
    fieldKey: null,
    read: null,
    write: null,
    required: null,
    hidden: null,
    locked: null,
    lockedAfterSubmit: null,
  };
}

function defaultTablePolicy(payload: FlowDefinitionPayloadV2): FlowTableColumnPolicyV2 {
  const firstStep = payload.nodes.find((node) => node.nodeKind === "FORM_STEP");
  return {
    policyId: nextPolicyId("table-policy", payload.tableColumnPolicies),
    dynamicFormTemplateId: payload.rootDynamicFormTemplateId ?? null,
    stepId: firstStep?.nodeId ?? null,
    stepCode: firstStep?.nodeCode ?? null,
    actorRole: "ASSIGNEE",
    blockId: null,
    columnKey: null,
    read: null,
    write: null,
    required: null,
    hidden: null,
    locked: null,
    lockedAfterSubmit: null,
  };
}

function policyIdentityError(
  policy: FlowFieldPolicyV2 | FlowTableColumnPolicyV2,
  kind: PolicyFocus["kind"],
) {
  if (!policy.policyId?.trim()) return "Thiếu policyId.";
  if (!policy.stepId?.trim() && !policy.stepCode?.trim()) return "Thiếu stepId/stepCode.";
  if (!policy.actorRole) return "Thiếu actorRole.";
  if (kind === "field") {
    const field = policy as FlowFieldPolicyV2;
    if (!field.fieldId?.trim() && !field.fieldKey?.trim()) return "Thiếu fieldId/fieldKey.";
  } else {
    const column = policy as FlowTableColumnPolicyV2;
    if (!column.blockId?.trim() || !column.columnKey?.trim()) return "Thiếu blockId/columnKey.";
  }
  return null;
}

function PolicyCoverageWorkspace({
  payload,
  readOnly,
  onChange,
  validationFocusTarget,
}: PanelProps & {
  validationFocusTarget?: WorkspaceValidationFocusTarget | null;
}) {
  const [focus, setFocus] = useState<PolicyFocus | null>(() =>
    payload.fieldPolicies.length > 0
      ? { kind: "field", index: 0 }
      : payload.tableColumnPolicies.length > 0
        ? { kind: "table", index: 0 }
        : null,
  );

  useEffect(() => {
    if (!focus) return;
    const length = focus.kind === "field"
      ? payload.fieldPolicies.length
      : payload.tableColumnPolicies.length;
    if (length === 0) setFocus(null);
    else if (focus.index >= length) setFocus({ ...focus, index: length - 1 });
  }, [focus, payload.fieldPolicies.length, payload.tableColumnPolicies.length]);

  useEffect(() => {
    const match = /^(fieldPolicies|tableColumnPolicies)\[(\d+)]/
      .exec(validationFocusTarget?.path ?? "");
    if (!match) return;
    setFocus({
      kind: match[1] === "fieldPolicies" ? "field" : "table",
      index: Number(match[2]),
    });
  }, [validationFocusTarget]);

  const allPolicies = [
    ...payload.fieldPolicies.map((policy, index) => ({ kind: "field" as const, policy, index })),
    ...payload.tableColumnPolicies.map((policy, index) => ({ kind: "table" as const, policy, index })),
  ];
  const explicitDecisions = allPolicies.reduce(
    (total, item) => total + POLICY_DECISION_KEYS.filter(
      (key) => item.policy[key] !== null,
    ).length,
    0,
  );
  const totalDecisions = allPolicies.length * POLICY_DECISION_KEYS.length;
  const identityErrors = allPolicies
    .map((item) => ({
      ...item,
      error: policyIdentityError(item.policy, item.kind),
    }))
    .filter((item) => item.error);

  const focusedPolicy = focus?.kind === "field"
    ? payload.fieldPolicies[focus.index]
    : focus?.kind === "table"
      ? payload.tableColumnPolicies[focus.index]
      : null;

  const updateFocusedPolicy = (
    patch: Partial<FlowFieldPolicyV2 & FlowTableColumnPolicyV2>,
  ) => {
    if (!focus || !focusedPolicy) return;
    if (focus.kind === "field") {
      onChange({
        ...payload,
        fieldPolicies: payload.fieldPolicies.map(
          (item, index) => index === focus.index ? { ...item, ...patch } : item,
        ),
      });
    } else {
      onChange({
        ...payload,
        tableColumnPolicies: payload.tableColumnPolicies.map(
          (item, index) => index === focus.index ? { ...item, ...patch } : item,
        ),
      });
    }
  };

  const applyPreset = (preset: "READ_ONLY" | "DENY_ALL") => {
    const decisionPatch = preset === "READ_ONLY"
      ? {
          read: true,
          write: false,
          required: false,
          hidden: false,
          locked: true,
          lockedAfterSubmit: true,
        }
      : {
          read: false,
          write: false,
          required: false,
          hidden: true,
          locked: true,
          lockedAfterSubmit: true,
        };
    onChange({
      ...payload,
      fieldPolicies: payload.fieldPolicies.map((policy) => ({ ...policy, ...decisionPatch })),
      tableColumnPolicies: payload.tableColumnPolicies.map((policy) => ({ ...policy, ...decisionPatch })),
    });
  };

  const removeFocusedPolicy = () => {
    if (!focus) return;
    if (focus.kind === "field") {
      onChange({
        ...payload,
        fieldPolicies: payload.fieldPolicies.filter((_, index) => index !== focus.index),
      });
    } else {
      onChange({
        ...payload,
        tableColumnPolicies: payload.tableColumnPolicies.filter((_, index) => index !== focus.index),
      });
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Box>
            <Typography fontWeight={850}>Policy coverage (default deny)</Typography>
            <Typography variant="body2" color="text.secondary">
              Null không phải là grant. Runtime chỉ dùng quyết định explicit từ snapshot đã khóa.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`${explicitDecisions}/${totalDecisions || 0} quyết định explicit`}
              color={totalDecisions > 0 && explicitDecisions === totalDecisions ? "success" : "warning"}
              variant="outlined"
            />
            <Chip
              label={`${identityErrors.length} lỗi định danh`}
              color={identityErrors.length > 0 ? "error" : "success"}
              variant="outlined"
            />
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            disabled={readOnly}
            onClick={() => {
              const next = defaultFieldPolicy(payload);
              onChange({ ...payload, fieldPolicies: [...payload.fieldPolicies, next] });
              setFocus({ kind: "field", index: payload.fieldPolicies.length });
            }}
          >
            Thêm field policy
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={readOnly}
            onClick={() => {
              const next = defaultTablePolicy(payload);
              onChange({ ...payload, tableColumnPolicies: [...payload.tableColumnPolicies, next] });
              setFocus({ kind: "table", index: payload.tableColumnPolicies.length });
            }}
          >
            Thêm table policy
          </Button>
          <Button
            size="small"
            disabled={readOnly || allPolicies.length === 0}
            onClick={() => applyPreset("READ_ONLY")}
          >
            Preset chỉ đọc
          </Button>
          <Button
            size="small"
            color="warning"
            disabled={readOnly || allPolicies.length === 0}
            onClick={() => applyPreset("DENY_ALL")}
          >
            Preset deny-all
          </Button>
        </Stack>

        {identityErrors.length > 0 ? (
          <Alert severity="error">
            <Stack spacing={0.5}>
              <Typography variant="body2">
                Chọn rule lỗi để sửa trước khi khóa snapshot.
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {identityErrors.map((item) => (
                  <Button
                    key={`${item.kind}:${item.index}`}
                    size="small"
                    color="inherit"
                    onClick={() => setFocus({ kind: item.kind, index: item.index })}
                  >
                    {item.policy.policyId || `${item.kind} #${item.index + 1}`}: {item.error}
                  </Button>
                ))}
              </Stack>
            </Stack>
          </Alert>
        ) : null}

        {allPolicies.length > 0 ? (
          <TextField
            select
            fullWidth
            size="small"
            label="Policy đang chỉnh"
            value={focus ? `${focus.kind}:${focus.index}` : ""}
            onChange={(event) => {
              const [kind, rawIndex] = event.target.value.split(":");
              setFocus({ kind: kind as PolicyFocus["kind"], index: Number(rawIndex) });
            }}
          >
            {allPolicies.map((item) => (
              <MenuItem
                key={`${item.kind}:${item.index}`}
                value={`${item.kind}:${item.index}`}
              >
                {item.kind === "field" ? "Field" : "Table"} · {item.policy.policyId || `#${item.index + 1}`}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Alert severity="warning">
            Chưa có policy. Field và table phải được coi là deny theo mặc định.
          </Alert>
        )}

        {focus && focusedPolicy ? (
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField
                id={`dynamic-flow-policy-${focus.kind}-${focus.index}-policyId`}
                fullWidth
                size="small"
                label="policyId"
                value={focusedPolicy.policyId ?? ""}
                disabled={readOnly}
                onChange={(event) => updateFocusedPolicy({ policyId: event.target.value || null })}
              />
              <TextField
                id={`dynamic-flow-policy-${focus.kind}-${focus.index}-actorRole`}
                fullWidth
                size="small"
                label="actorRole"
                value={focusedPolicy.actorRole ?? ""}
                disabled={readOnly}
                onChange={(event) => updateFocusedPolicy({
                  actorRole: (event.target.value || null) as FlowFieldPolicyV2["actorRole"],
                })}
              />
              <TextField
                id={`dynamic-flow-policy-${focus.kind}-${focus.index}-stepId`}
                fullWidth
                size="small"
                label="stepId"
                value={focusedPolicy.stepId ?? ""}
                disabled={readOnly}
                onChange={(event) => updateFocusedPolicy({ stepId: event.target.value || null })}
              />
              <TextField
                id={`dynamic-flow-policy-${focus.kind}-${focus.index}-stepCode`}
                fullWidth
                size="small"
                label="stepCode"
                value={focusedPolicy.stepCode ?? ""}
                disabled={readOnly}
                onChange={(event) => updateFocusedPolicy({ stepCode: event.target.value || null })}
              />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              {focus.kind === "field" ? (
                <>
                  <TextField
                    id={`dynamic-flow-policy-field-${focus.index}-fieldId`}
                    fullWidth
                    size="small"
                    label="fieldId"
                    value={(focusedPolicy as FlowFieldPolicyV2).fieldId ?? ""}
                    disabled={readOnly}
                    onChange={(event) => updateFocusedPolicy({ fieldId: event.target.value || null })}
                  />
                  <TextField
                    id={`dynamic-flow-policy-field-${focus.index}-fieldKey`}
                    fullWidth
                    size="small"
                    label="fieldKey"
                    value={(focusedPolicy as FlowFieldPolicyV2).fieldKey ?? ""}
                    disabled={readOnly}
                    onChange={(event) => updateFocusedPolicy({ fieldKey: event.target.value || null })}
                  />
                </>
              ) : (
                <>
                  <TextField
                    id={`dynamic-flow-policy-table-${focus.index}-blockId`}
                    fullWidth
                    size="small"
                    label="blockId"
                    value={(focusedPolicy as FlowTableColumnPolicyV2).blockId ?? ""}
                    disabled={readOnly}
                    onChange={(event) => updateFocusedPolicy({ blockId: event.target.value || null })}
                  />
                  <TextField
                    id={`dynamic-flow-policy-table-${focus.index}-columnKey`}
                    fullWidth
                    size="small"
                    label="columnKey"
                    value={(focusedPolicy as FlowTableColumnPolicyV2).columnKey ?? ""}
                    disabled={readOnly}
                    onChange={(event) => updateFocusedPolicy({ columnKey: event.target.value || null })}
                  />
                </>
              )}
            </Stack>
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
              }}
            >
              {POLICY_DECISION_KEYS.map((key) => (
                <PolicyDecisionSelect
                  key={key}
                  id={`dynamic-flow-policy-${focus.kind}-${focus.index}-${key}`}
                  label={key}
                  value={focusedPolicy[key]}
                  disabled={readOnly}
                  onChange={(value) => updateFocusedPolicy({ [key]: value } as Record<PolicyDecisionKey, boolean | null>)}
                />
              ))}
            </Box>
            <Box>
              <Button
                size="small"
                color="error"
                disabled={readOnly}
                onClick={removeFocusedPolicy}
              >
                Xóa policy đang chọn
              </Button>
            </Box>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

function FormsPoliciesPanel({
  payload,
  readOnly,
  onChange,
  onEditorValidityChange,
  onRawDirtyChange,
  rawEditorTexts,
  onRawTextChange,
  validationFocusTarget,
}: JsonPanelProps) {
  return (
    <Stack spacing={2}>
      <Alert severity="info">Form pin/hash của snapshot khóa do backend sở hữu; client chỉ gửi các tham chiếu form cơ sở trong draft.</Alert>
      <PolicyCoverageWorkspace
        payload={payload}
        readOnly={readOnly}
        onChange={onChange}
        validationFocusTarget={validationFocusTarget}
      />
      <DynamicFlowJsonEditor
        editorId="forms"
        label="Tham chiếu biểu mẫu"
        value={payload.formNodes}
        disabled={readOnly}
        expect="array"
        onChange={(formNodes) => onChange({ ...payload, formNodes })}
        onValidityChange={onEditorValidityChange}
        onRawDirtyChange={onRawDirtyChange}
        rawText={rawEditorTexts.forms}
        onRawTextChange={onRawTextChange}
      />
      <Divider />
      <DynamicFlowJsonEditor
        editorId="actor-policies"
        label="Chính sách vai trò"
        value={payload.actorPolicies}
        disabled={readOnly}
        expect="array"
        onChange={(actorPolicies) => onChange({ ...payload, actorPolicies })}
        onValidityChange={onEditorValidityChange}
        onRawDirtyChange={onRawDirtyChange}
        rawText={rawEditorTexts["actor-policies"]}
        onRawTextChange={onRawTextChange}
      />
      <DynamicFlowJsonEditor
        editorId="field-policies"
        label="Chính sách field (fail-closed)"
        value={payload.fieldPolicies}
        disabled={readOnly}
        expect="array"
        onChange={(fieldPolicies) => onChange({ ...payload, fieldPolicies })}
        onValidityChange={onEditorValidityChange}
        onRawDirtyChange={onRawDirtyChange}
        rawText={rawEditorTexts["field-policies"]}
        onRawTextChange={onRawTextChange}
      />
      <DynamicFlowJsonEditor
        editorId="table-policies"
        label="Chính sách cột bảng (fail-closed)"
        value={payload.tableColumnPolicies}
        disabled={readOnly}
        expect="array"
        onChange={(tableColumnPolicies) => onChange({ ...payload, tableColumnPolicies })}
        onValidityChange={onEditorValidityChange}
        onRawDirtyChange={onRawDirtyChange}
        rawText={rawEditorTexts["table-policies"]}
        onRawTextChange={onRawTextChange}
      />
    </Stack>
  );
}

function emptyMappingEndpoint(kind: FlowMappingEndpointV2["kind"] = "FIELD"): FlowMappingEndpointV2 {
  return {
    kind,
    dynamicFormTemplateId: null,
    stepId: null,
    stepCode: null,
    sectionId: null,
    sectionCode: null,
    fieldId: null,
    fieldKey: null,
    blockId: null,
    columnKey: null,
    rowKey: null,
    dataType: null,
  };
}

function defaultMappingInput(
  index = 0,
  source: FlowMappingEndpointV2 = emptyMappingEndpoint("FIELD"),
): FlowMappingInputV2 {
  return {
    inputKey: index === 0 ? "source" : `source_${index + 1}`,
    source,
    dataType: null,
    cardinality: "ONE",
    nullPolicy: "KEEP_NULL",
    constantValue: null,
  };
}

function defaultMappingCalculation(): FlowMappingCalculationV2 {
  return {
    kind: "DIRECT",
    operation: null,
    resultDataType: null,
    expression: null,
    functionCode: null,
    functionVersion: null,
    arguments: null,
    defaultValue: null,
  };
}

function nextMappingId(rules: FlowMappingRuleV2[]) {
  const ids = new Set(rules.map((rule) => rule.mappingId));
  let index = rules.length + 1;
  while (ids.has(`mapping-${index}`)) index += 1;
  return `mapping-${index}`;
}

function defaultMappingRule(payload: FlowDefinitionPayloadV2): FlowMappingRuleV2 {
  const firstStep = payload.nodes.find((node) => node.nodeKind === "FORM_STEP");
  const formReference = firstStep?.formNodeId
    ? payload.formNodes.find((form) => form.formNodeId === firstStep.formNodeId)
    : null;
  const endpoint = {
    ...emptyMappingEndpoint("FIELD"),
    dynamicFormTemplateId: formReference?.dynamicFormTemplateId ?? null,
    stepId: firstStep?.nodeId ?? null,
    stepCode: firstStep?.nodeCode ?? null,
  };
  return {
    mappingId: nextMappingId(payload.mappingRules),
    mappingVersion: 1,
    mappingKind: "FIELD",
    inputs: [defaultMappingInput(0, { ...endpoint })],
    target: { ...endpoint },
    calculation: defaultMappingCalculation(),
    conceptCode: null,
    evaluationGrain: "SOURCE_REPORT",
    errorPolicy: "BLOCK_APPLY",
  };
}

type MappingSupport = {
  level: "SUPPORTED" | "CONDITIONAL" | "BLOCKED";
  label: string;
  reason: string;
};

function getMappingSupport(rule: FlowMappingRuleV2): MappingSupport {
  const operation = rule.calculation?.operation?.trim().toUpperCase() ?? "";
  if (rule.mappingKind === "APPEND_COLUMNS") {
    return {
      level: "BLOCKED",
      label: "Intentional block",
      reason: "APPEND_COLUMNS target chưa thuộc capability được máy chủ hỗ trợ.",
    };
  }
  if (operation.includes("GROUP")) {
    return {
      level: "BLOCKED",
      label: "Intentional block",
      reason: "GROUP calculation chưa thuộc capability được máy chủ hỗ trợ.",
    };
  }
  if (operation.includes("JOIN")) {
    return {
      level: "BLOCKED",
      label: "Intentional block",
      reason: "Custom join key/calculation chưa thuộc capability được máy chủ hỗ trợ.",
    };
  }
  if (rule.target?.kind === "FIELD" && rule.evaluationGrain === "TABLE_ROW") {
    return {
      level: "BLOCKED",
      label: "Intentional block",
      reason: "Scalar-row mapping vào FIELD bị chặn có chủ đích.",
    };
  }
  if (
    rule.target?.kind === "FIELD" &&
    (rule.inputs ?? []).some(
      (input) => input.source.kind === "TABLE_COLUMN" && input.cardinality === "MANY",
    )
  ) {
    return {
      level: "BLOCKED",
      label: "Intentional block",
      reason: "Row-to-report mapping vào scalar FIELD bị chặn có chủ đích.",
    };
  }
  if (rule.target?.kind === "TABLE_COLUMN") {
    return {
      level: "CONDITIONAL",
      label: "Runtime shape gate",
      reason: "FIXED_GRID, APPEND_ROWS và MATRIX/sparse được hỗ trợ; SUMMARY_TEMPLATE/APPEND_COLUMNS bị chặn.",
    };
  }
  return {
    level: "SUPPORTED",
    label: "Được máy chủ hỗ trợ",
    reason: "FIELD và SOURCE_REPORT/direct-expression-function nằm trong support boundary.",
  };
}

function mappingRuleErrors(rule: FlowMappingRuleV2, allRules: FlowMappingRuleV2[]) {
  const errors: string[] = [];
  if (!rule.mappingId.trim()) errors.push("Thiếu mappingId.");
  if (allRules.filter((item) => item.mappingId === rule.mappingId).length > 1) {
    errors.push("mappingId bị trùng.");
  }
  if (!Number.isInteger(rule.mappingVersion) || rule.mappingVersion < 1) {
    errors.push("mappingVersion phải là số nguyên >= 1.");
  }
  if (!rule.mappingKind) errors.push("Thiếu mappingKind.");
  if (!rule.inputs?.length) errors.push("Cần ít nhất một input.");
  (rule.inputs ?? []).forEach((input, index) => {
    if (!input.inputKey.trim()) errors.push(`Input ${index + 1}: thiếu inputKey.`);
    if (!input.source?.kind) errors.push(`Input ${index + 1}: thiếu source kind.`);
    if (
      input.source?.kind !== "CONSTANT" &&
      !input.source?.dynamicFormTemplateId?.trim()
    ) {
      errors.push(`Input ${index + 1}: thiếu dynamicFormTemplateId.`);
    }
    if (
      input.source?.kind !== "CONSTANT" &&
      !input.source?.stepId?.trim() &&
      !input.source?.stepCode?.trim()
    ) {
      errors.push(`Input ${index + 1}: thiếu stepId/stepCode.`);
    }
    if (
      input.source?.kind === "FIELD" &&
      !input.source.fieldId?.trim() &&
      !input.source.fieldKey?.trim()
    ) {
      errors.push(`Input ${index + 1}: thiếu fieldId/fieldKey.`);
    }
    if (
      input.source?.kind === "TABLE_COLUMN" &&
      (!input.source.blockId?.trim() || !input.source.columnKey?.trim())
    ) {
      errors.push(`Input ${index + 1}: thiếu blockId/columnKey.`);
    }
  });
  if (!rule.target?.kind) errors.push("Thiếu target kind.");
  if (!rule.target?.dynamicFormTemplateId?.trim()) {
    errors.push("Target thiếu dynamicFormTemplateId.");
  }
  if (!rule.target?.stepId?.trim() && !rule.target?.stepCode?.trim()) {
    errors.push("Target thiếu stepId/stepCode.");
  }
  if (
    rule.target?.kind === "FIELD" &&
    !rule.target.fieldId?.trim() &&
    !rule.target.fieldKey?.trim()
  ) {
    errors.push("Target FIELD thiếu fieldId/fieldKey.");
  }
  if (
    rule.target?.kind === "TABLE_COLUMN" &&
    (!rule.target.blockId?.trim() || !rule.target.columnKey?.trim())
  ) {
    errors.push("Target TABLE_COLUMN thiếu blockId/columnKey.");
  }
  if (!rule.calculation?.kind) errors.push("Thiếu calculation kind.");
  if (
    rule.calculation?.kind === "EXPRESSION" &&
    rule.calculation.expression == null
  ) {
    errors.push("EXPRESSION cần expression có kiểu.");
  }
  if (
    rule.calculation?.kind === "REGISTERED_FUNCTION" &&
    (!rule.calculation.functionCode?.trim() || !rule.calculation.functionVersion)
  ) {
    errors.push("REGISTERED_FUNCTION cần functionCode và functionVersion.");
  }
  if (!rule.evaluationGrain) errors.push("Thiếu evaluationGrain.");
  if (!rule.errorPolicy) errors.push("Thiếu errorPolicy.");
  return errors;
}

function MappingEndpointEditor({
  idPrefix,
  label,
  endpoint,
  readOnly,
  allowConstant,
  onChange,
}: {
  idPrefix: string;
  label: string;
  endpoint: FlowMappingEndpointV2;
  readOnly: boolean;
  allowConstant: boolean;
  onChange: (endpoint: FlowMappingEndpointV2) => void;
}) {
  const set = (patch: Partial<FlowMappingEndpointV2>) => onChange({ ...endpoint, ...patch });
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
        <Typography fontWeight={800}>{label}</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            id={`${idPrefix}-kind`}
            select
            fullWidth
            size="small"
            label="Endpoint kind"
            value={endpoint.kind ?? ""}
            disabled={readOnly}
            onChange={(event) => {
              const kind = (event.target.value || null) as FlowMappingEndpointV2["kind"];
              if (kind === "CONSTANT") {
                onChange({
                  ...emptyMappingEndpoint("CONSTANT"),
                  dataType: endpoint.dataType ?? null,
                });
                return;
              }
              set({ kind });
            }}
          >
            <MenuItem value="FIELD">FIELD</MenuItem>
            <MenuItem value="TABLE_COLUMN">TABLE_COLUMN</MenuItem>
            {allowConstant ? <MenuItem value="CONSTANT">CONSTANT</MenuItem> : null}
          </TextField>
          <TextField
            id={`${idPrefix}-stepId`}
            fullWidth
            size="small"
            label="stepId"
            value={endpoint.stepId ?? ""}
            disabled={readOnly || endpoint.kind === "CONSTANT"}
            onChange={(event) => set({ stepId: event.target.value || null })}
          />
          <TextField
            id={`${idPrefix}-stepCode`}
            fullWidth
            size="small"
            label="stepCode"
            value={endpoint.stepCode ?? ""}
            disabled={readOnly || endpoint.kind === "CONSTANT"}
            onChange={(event) => set({ stepCode: event.target.value || null })}
          />
          <TextField
            id={`${idPrefix}-dynamicFormTemplateId`}
            fullWidth
            size="small"
            label="dynamicFormTemplateId"
            value={endpoint.dynamicFormTemplateId ?? ""}
            disabled={readOnly || endpoint.kind === "CONSTANT"}
            onChange={(event) => set({ dynamicFormTemplateId: event.target.value || null })}
          />
          <TextField
            id={`${idPrefix}-dataType`}
            fullWidth
            size="small"
            label="dataType"
            value={endpoint.dataType ?? ""}
            disabled={readOnly}
            onChange={(event) => set({ dataType: event.target.value || null })}
          />
        </Stack>
        {endpoint.kind === "FIELD" ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField id={`${idPrefix}-fieldId`} fullWidth size="small" label="fieldId" value={endpoint.fieldId ?? ""} disabled={readOnly} onChange={(event) => set({ fieldId: event.target.value || null })} />
            <TextField id={`${idPrefix}-fieldKey`} fullWidth size="small" label="fieldKey" value={endpoint.fieldKey ?? ""} disabled={readOnly} onChange={(event) => set({ fieldKey: event.target.value || null })} />
            <TextField id={`${idPrefix}-sectionCode`} fullWidth size="small" label="sectionCode" value={endpoint.sectionCode ?? ""} disabled={readOnly} onChange={(event) => set({ sectionCode: event.target.value || null })} />
          </Stack>
        ) : endpoint.kind === "TABLE_COLUMN" ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField id={`${idPrefix}-blockId`} fullWidth size="small" label="blockId" value={endpoint.blockId ?? ""} disabled={readOnly} onChange={(event) => set({ blockId: event.target.value || null })} />
            <TextField id={`${idPrefix}-columnKey`} fullWidth size="small" label="columnKey" value={endpoint.columnKey ?? ""} disabled={readOnly} onChange={(event) => set({ columnKey: event.target.value || null })} />
            <TextField id={`${idPrefix}-rowKey`} fullWidth size="small" label="rowKey (optional)" value={endpoint.rowKey ?? ""} disabled={readOnly} onChange={(event) => set({ rowKey: event.target.value || null })} />
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

function MappingRuleWorkspace({
  payload,
  readOnly,
  onChange,
  validationFocusTarget,
}: PanelProps & {
  validationFocusTarget?: WorkspaceValidationFocusTarget | null;
}) {
  const [selectedRuleIndex, setSelectedRuleIndex] = useState(0);
  const [selectedInputIndex, setSelectedInputIndex] = useState(0);

  useEffect(() => {
    if (payload.mappingRules.length === 0) {
      if (selectedRuleIndex !== 0) setSelectedRuleIndex(0);
      return;
    }
    if (selectedRuleIndex >= payload.mappingRules.length) {
      setSelectedRuleIndex(payload.mappingRules.length - 1);
    }
  }, [payload.mappingRules.length, selectedRuleIndex]);

  const rule = payload.mappingRules[selectedRuleIndex] ?? null;
  const inputs = rule?.inputs ?? [];
  const input = inputs[selectedInputIndex] ?? inputs[0] ?? null;
  const support = rule ? getMappingSupport(rule) : null;
  const errors = rule ? mappingRuleErrors(rule, payload.mappingRules) : [];

  useEffect(() => {
    if (inputs.length === 0 && selectedInputIndex !== 0) setSelectedInputIndex(0);
    else if (selectedInputIndex >= inputs.length) setSelectedInputIndex(Math.max(0, inputs.length - 1));
  }, [inputs.length, selectedInputIndex]);

  useEffect(() => {
    const match = /^mappingRules\[(\d+)](?:\.inputs\[(\d+)])?/
      .exec(validationFocusTarget?.path ?? "");
    if (!match) return;
    setSelectedRuleIndex(Number(match[1]));
    setSelectedInputIndex(match[2] === undefined ? 0 : Number(match[2]));
  }, [validationFocusTarget]);

  const updateRule = (patch: Partial<FlowMappingRuleV2>) => {
    if (!rule) return;
    onChange({
      ...payload,
      mappingRules: payload.mappingRules.map(
        (item, index) => index === selectedRuleIndex ? { ...item, ...patch } : item,
      ),
    });
  };
  const updateInput = (patch: Partial<FlowMappingInputV2>) => {
    if (!rule || !input) return;
    updateRule({
      inputs: inputs.map(
        (item, index) => index === selectedInputIndex ? { ...item, ...patch } : item,
      ),
    });
  };

  return (
    <Stack
      direction={{ xs: "column", lg: "row" }}
      spacing={2}
      alignItems="stretch"
      role="group"
      aria-label="Mapping rules"
      data-testid="dynamic-flow-mapping-definition-rules"
      data-readonly={readOnly ? "true" : "false"}
    >
      <Paper
        variant="outlined"
        data-testid="dynamic-flow-mapping-definition-rule-list"
        sx={{ p: 1.5, width: { xs: "100%", lg: 300 }, flexShrink: 0 }}
      >
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={850}>Mapping rules</Typography>
            <Chip size="small" label={payload.mappingRules.length} />
          </Stack>
          <Button
            variant="outlined"
            size="small"
            data-testid="dynamic-flow-mapping-definition-add-rule"
            aria-controls="dynamic-flow-mapping-definition-rule-editor"
            disabled={readOnly}
            onClick={() => {
              const next = defaultMappingRule(payload);
              onChange({ ...payload, mappingRules: [...payload.mappingRules, next] });
              setSelectedRuleIndex(payload.mappingRules.length);
              setSelectedInputIndex(0);
            }}
          >
            Thêm mapping rule
          </Button>
          {payload.mappingRules.length === 0 ? (
            <Alert severity="info">Chưa có mapping rule.</Alert>
          ) : payload.mappingRules.map((item, index) => {
            const itemSupport = getMappingSupport(item);
            const itemErrors = mappingRuleErrors(item, payload.mappingRules);
            return (
              <Button
                id={`dynamic-flow-mapping-rule-${index}-selector`}
                key={`${item.mappingId}:${index}`}
                data-testid={`dynamic-flow-mapping-definition-rule-${index}`}
                aria-pressed={index === selectedRuleIndex}
                variant={index === selectedRuleIndex ? "contained" : "text"}
                color={itemErrors.length > 0 ? "error" : "primary"}
                onClick={() => {
                  setSelectedRuleIndex(index);
                  setSelectedInputIndex(0);
                }}
                sx={{ justifyContent: "flex-start", textAlign: "left" }}
              >
                {item.mappingId || `Rule ${index + 1}`} · {itemSupport.label}
              </Button>
            );
          })}
        </Stack>
      </Paper>

      <Paper
        id="dynamic-flow-mapping-definition-rule-editor"
        variant="outlined"
        data-testid="dynamic-flow-mapping-definition-rule-editor"
        data-support={support?.level ?? "EMPTY"}
        data-validation-errors={errors.length}
        aria-label="Chi tiết mapping rule"
        sx={{ p: 2, flex: 1, minWidth: 0 }}
      >
        {!rule ? (
          <Alert severity="info">Thêm hoặc chọn một mapping rule để chỉnh endpoint và calculation.</Alert>
        ) : (
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={1}
            >
              <Box>
                <Typography fontWeight={900}>{rule.mappingId || "Mapping rule chưa đặt tên"}</Typography>
                <Typography variant="body2" color="text.secondary">{support?.reason}</Typography>
              </Box>
              <Chip
                data-testid="dynamic-flow-mapping-definition-support"
                label={support?.label}
                color={support?.level === "BLOCKED" ? "error" : support?.level === "SUPPORTED" ? "success" : "warning"}
                variant="outlined"
              />
            </Stack>

            {errors.length > 0 ? (
              <Alert severity="error" data-testid="dynamic-flow-mapping-definition-validation">
                <AlertTitle>{errors.length} lỗi ở rule đang chọn</AlertTitle>
                {errors.map((error) => <Typography key={error} variant="body2">• {error}</Typography>)}
              </Alert>
            ) : (
              <Alert severity="success" data-testid="dynamic-flow-mapping-definition-validation">Rule có đủ cấu trúc client-side; backend vẫn canonicalize và validate cuối cùng.</Alert>
            )}

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-mappingId`} fullWidth size="small" label="mappingId" value={rule.mappingId} disabled={readOnly} onChange={(event) => updateRule({ mappingId: event.target.value })} />
              <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-mappingVersion`} fullWidth size="small" type="number" label="mappingVersion" value={rule.mappingVersion} disabled={readOnly} inputProps={{ min: 1 }} onChange={(event) => updateRule({ mappingVersion: Number(event.target.value) })} />
              <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-mappingKind`} select fullWidth size="small" label="mappingKind" value={rule.mappingKind ?? ""} disabled={readOnly} onChange={(event) => updateRule({ mappingKind: (event.target.value || null) as FlowMappingRuleV2["mappingKind"] })}>
                <MenuItem value="FIELD">FIELD</MenuItem>
                <MenuItem value="TABLE_COLUMN">TABLE_COLUMN</MenuItem>
                <MenuItem value="APPEND_COLUMNS">APPEND_COLUMNS (blocked)</MenuItem>
              </TextField>
              <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-conceptCode`} fullWidth size="small" label="conceptCode" value={rule.conceptCode ?? ""} disabled={readOnly} onChange={(event) => updateRule({ conceptCode: event.target.value || null })} />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-evaluationGrain`} select fullWidth size="small" label="evaluationGrain" value={rule.evaluationGrain ?? ""} disabled={readOnly} onChange={(event) => updateRule({ evaluationGrain: (event.target.value || null) as FlowMappingRuleV2["evaluationGrain"] })}>
                <MenuItem value="FLOW_INSTANCE">FLOW_INSTANCE</MenuItem>
                <MenuItem value="SOURCE_REPORT">SOURCE_REPORT</MenuItem>
                <MenuItem value="TABLE_ROW">TABLE_ROW</MenuItem>
              </TextField>
              <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-errorPolicy`} select fullWidth size="small" label="errorPolicy" value={rule.errorPolicy ?? ""} disabled={readOnly} onChange={(event) => updateRule({ errorPolicy: (event.target.value || null) as FlowMappingRuleV2["errorPolicy"] })}>
                <MenuItem value="BLOCK_APPLY">BLOCK_APPLY</MenuItem>
                <MenuItem value="SKIP_RULE">SKIP_RULE</MenuItem>
                <MenuItem value="USE_DEFAULT">USE_DEFAULT</MenuItem>
              </TextField>
            </Stack>

            <Divider />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
              <Typography fontWeight={850} sx={{ mr: "auto" }}>Nguồn có kiểu</Typography>
              {inputs.length > 0 ? (
                <TextField
                  select
                  size="small"
                  label="Input đang chỉnh"
                  value={String(selectedInputIndex)}
                  onChange={(event) => setSelectedInputIndex(Number(event.target.value))}
                  sx={{ minWidth: 210 }}
                >
                  {inputs.map((item, index) => (
                    <MenuItem
                      id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-input-${index}-selector`}
                      key={`${item.inputKey}:${index}`}
                      value={String(index)}
                    >
                      {item.inputKey || `Input ${index + 1}`}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}
              <Button
                size="small"
                disabled={readOnly}
                onClick={() => {
                  const inheritedSource = inputs[0]?.source
                    ? { ...inputs[0].source, fieldId: null, fieldKey: null, blockId: null, columnKey: null, rowKey: null }
                    : emptyMappingEndpoint();
                  const nextInputs = [...inputs, defaultMappingInput(inputs.length, inheritedSource)];
                  updateRule({ inputs: nextInputs });
                  setSelectedInputIndex(nextInputs.length - 1);
                }}
              >
                Thêm nguồn
              </Button>
              <Button
                size="small"
                color="error"
                disabled={readOnly || !input}
                onClick={() => {
                  updateRule({ inputs: inputs.filter((_, index) => index !== selectedInputIndex) });
                  setSelectedInputIndex(Math.max(0, selectedInputIndex - 1));
                }}
              >
                Xóa nguồn
              </Button>
            </Stack>
            {input ? (
              <>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                  <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-input-${selectedInputIndex}-inputKey`} fullWidth size="small" label="inputKey" value={input.inputKey} disabled={readOnly} onChange={(event) => updateInput({ inputKey: event.target.value })} />
                  <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-input-${selectedInputIndex}-dataType`} fullWidth size="small" label="dataType" value={input.dataType ?? ""} disabled={readOnly} onChange={(event) => updateInput({ dataType: event.target.value || null })} />
                  <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-input-${selectedInputIndex}-cardinality`} select fullWidth size="small" label="cardinality" value={input.cardinality ?? ""} disabled={readOnly} onChange={(event) => updateInput({ cardinality: (event.target.value || null) as FlowMappingInputV2["cardinality"] })}>
                    <MenuItem value="ONE">ONE</MenuItem>
                    <MenuItem value="MANY">MANY</MenuItem>
                  </TextField>
                  <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-input-${selectedInputIndex}-nullPolicy`} select fullWidth size="small" label="nullPolicy" value={input.nullPolicy ?? ""} disabled={readOnly} onChange={(event) => updateInput({ nullPolicy: (event.target.value || null) as FlowMappingInputV2["nullPolicy"] })}>
                    {["KEEP_NULL", "SKIP", "ZERO", "EMPTY_TEXT", "ERROR"].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                  </TextField>
                </Stack>
                <MappingEndpointEditor
                  idPrefix={`dynamic-flow-mapping-rule-${selectedRuleIndex}-input-${selectedInputIndex}-source`}
                  label="Source endpoint"
                  endpoint={input.source ?? emptyMappingEndpoint()}
                  readOnly={readOnly}
                  allowConstant
                  onChange={(source) => updateInput({ source })}
                />
                {input.source?.kind === "CONSTANT" ? (
                  <TextField
                    id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-input-${selectedInputIndex}-constantValue`}
                    fullWidth
                    size="small"
                    label="Constant value"
                    value={input.constantValue == null ? "" : String(input.constantValue)}
                    disabled={readOnly}
                    onChange={(event) => {
                      const raw = event.target.value;
                      const dataType = input.dataType?.trim().toUpperCase();
                      const numeric = dataType === "NUMBER" && raw.trim() !== ""
                        ? Number(raw)
                        : Number.NaN;
                      updateInput({
                        constantValue: raw === "" ? null : Number.isFinite(numeric) ? numeric : raw,
                      });
                    }}
                  />
                ) : null}
              </>
            ) : null}

            <Divider />
            <MappingEndpointEditor
              idPrefix={`dynamic-flow-mapping-rule-${selectedRuleIndex}-target`}
              label="Target endpoint"
              endpoint={rule.target ?? emptyMappingEndpoint()}
              readOnly={readOnly}
              allowConstant={false}
              onChange={(target) => updateRule({ target })}
            />

            <Divider />
            <Typography fontWeight={850}>Calculation có kiểu</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-calculation-kind`} select fullWidth size="small" label="Calculation kind" value={rule.calculation?.kind ?? ""} disabled={readOnly} onChange={(event) => updateRule({ calculation: { ...(rule.calculation ?? defaultMappingCalculation()), kind: (event.target.value || null) as FlowMappingCalculationV2["kind"] } })}>
                <MenuItem value="DIRECT">DIRECT</MenuItem>
                <MenuItem value="EXPRESSION">EXPRESSION</MenuItem>
                <MenuItem value="REGISTERED_FUNCTION">REGISTERED_FUNCTION</MenuItem>
              </TextField>
              <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-calculation-operation`} fullWidth size="small" label="operation" value={rule.calculation?.operation ?? ""} disabled={readOnly} onChange={(event) => updateRule({ calculation: { ...(rule.calculation ?? defaultMappingCalculation()), operation: event.target.value || null } })} />
              <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-calculation-resultDataType`} fullWidth size="small" label="resultDataType" value={rule.calculation?.resultDataType ?? ""} disabled={readOnly} onChange={(event) => updateRule({ calculation: { ...(rule.calculation ?? defaultMappingCalculation()), resultDataType: event.target.value || null } })} />
            </Stack>
            {rule.calculation?.kind === "EXPRESSION" ? (
              <TextField
                id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-calculation-expression`}
                fullWidth
                multiline
                minRows={3}
                label="Typed expression / AST JSON"
                value={rule.calculation.expression == null
                  ? ""
                  : typeof rule.calculation.expression === "string"
                    ? rule.calculation.expression
                    : JSON.stringify(rule.calculation.expression, null, 2)}
                disabled={readOnly}
                onChange={(event) => {
                  let expression: FlowMappingCalculationV2["expression"] = event.target.value || null;
                  try {
                    expression = event.target.value ? JSON.parse(event.target.value) : null;
                  } catch {
                    // Preserve the typed draft as a string; backend validation remains authoritative.
                  }
                  updateRule({ calculation: { ...(rule.calculation ?? defaultMappingCalculation()), expression } });
                }}
              />
            ) : rule.calculation?.kind === "REGISTERED_FUNCTION" ? (
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-calculation-functionCode`} fullWidth size="small" label="functionCode" value={rule.calculation.functionCode ?? ""} disabled={readOnly} onChange={(event) => updateRule({ calculation: { ...(rule.calculation ?? defaultMappingCalculation()), functionCode: event.target.value || null } })} />
                <TextField id={`dynamic-flow-mapping-rule-${selectedRuleIndex}-calculation-functionVersion`} fullWidth size="small" type="number" label="functionVersion" value={rule.calculation.functionVersion ?? ""} disabled={readOnly} inputProps={{ min: 1 }} onChange={(event) => updateRule({ calculation: { ...(rule.calculation ?? defaultMappingCalculation()), functionVersion: event.target.value ? Number(event.target.value) : null } })} />
              </Stack>
            ) : null}

            <Box>
              <Button
                size="small"
                color="error"
                disabled={readOnly}
                onClick={() => {
                  onChange({
                    ...payload,
                    mappingRules: payload.mappingRules.filter((_, index) => index !== selectedRuleIndex),
                  });
                  setSelectedRuleIndex(Math.max(0, selectedRuleIndex - 1));
                  setSelectedInputIndex(0);
                }}
              >
                Xóa mapping rule
              </Button>
            </Box>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}

function MappingMetadataPanel({
  payload,
  readOnly,
  onChange,
  onEditorValidityChange,
  onRawDirtyChange,
  rawEditorTexts,
  onRawTextChange,
  validationFocusTarget,
}: JsonPanelProps) {
  return (
    <Stack
      component="section"
      spacing={2}
      data-testid="dynamic-flow-mapping-definition"
      data-readonly={readOnly ? "true" : "false"}
      aria-label="Định nghĩa mapping canonical"
    >
      <Alert severity="warning" data-testid="dynamic-flow-mapping-definition-status">
        Workspace định nghĩa không preview, apply, rerun hay gọi mapping writer; các thao tác đó thuộc runtime owner.
      </Alert>
      <MappingRuleWorkspace
        payload={payload}
        readOnly={readOnly}
        onChange={onChange}
        validationFocusTarget={validationFocusTarget}
      />
      <Divider />
      <Typography fontWeight={850}>JSON nâng cao</Typography>
      <DynamicFlowJsonEditor
        editorId="mapping-rules"
        label="Mapping rules v2"
        description="Khai báo endpoint, calculation và policy; máy chủ validate/canonicalize trước khi lưu định nghĩa."
        value={payload.mappingRules}
        disabled={readOnly}
        expect="array"
        rows={18}
        onChange={(mappingRules) => onChange({ ...payload, mappingRules })}
        onValidityChange={onEditorValidityChange}
        onRawDirtyChange={onRawDirtyChange}
        rawText={rawEditorTexts["mapping-rules"]}
        onRawTextChange={onRawTextChange}
      />
    </Stack>
  );
}

function ResultStatisticsPanel({
  version,
  payload,
  readOnly,
  contributionPolicy,
  contributionWarningAcknowledged,
  onContributionPolicyChange,
  onContributionWarningAcknowledgedChange,
  onChange,
  onEditorValidityChange,
  onRawDirtyChange,
  rawEditorTexts,
  onRawTextChange,
}: JsonPanelProps & {
  version: DynamicFlowTemplateVersionDetailDto;
  contributionPolicy: P8FlowContributionPolicy;
  contributionWarningAcknowledged: boolean;
  onContributionPolicyChange: (policy: P8FlowContributionPolicy) => void;
  onContributionWarningAcknowledgedChange: (checked: boolean) => void;
}) {
  const nullable = (value: string) => value || null;
  const readback = version as P8FlowContributionReadback;
  const effectivePolicy = readOnly && readback.contributionPolicy
    ? readback.contributionPolicy : contributionPolicy;
  const profileBlocked = hasNonEmptyStatisticProfile(payload.statisticProfile);
  return (
    <Stack spacing={2}>
      <Alert severity="warning">Chỉ cấu hình ownership, contribution policy và metadata. Việc chạy thống kê hoặc tạo kết quả thuộc Statistics runtime.</Alert>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={850} sx={{ mb: 2 }}>Chủ sở hữu kết quả</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField id="dynamic-flow-control-resultOwnerStepId" select fullWidth label="Result owner step" value={payload.resultOwnerStepId ?? ""} disabled={readOnly} onChange={(event) => onChange({ ...payload, resultOwnerStepId: nullable(event.target.value) })}>
            <MenuItem value="">Không đặt</MenuItem>
            {payload.nodes.map((node) => <MenuItem key={node.nodeId} value={node.nodeId}>{node.nodeCode}</MenuItem>)}
          </TextField>
          <TextField id="dynamic-flow-control-resultOwnerFormNodeId" select fullWidth label="Result owner form node" value={payload.resultOwnerFormNodeId ?? ""} disabled={readOnly} onChange={(event) => onChange({ ...payload, resultOwnerFormNodeId: nullable(event.target.value) })}>
            <MenuItem value="">Không đặt</MenuItem>
            {payload.formNodes.map((node) => <MenuItem key={node.formNodeId} value={node.formNodeId}>{node.formNodeId}</MenuItem>)}
          </TextField>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
          <TextField id="dynamic-flow-control-statisticsOwnerStepId" select fullWidth label="Statistics owner step" value={payload.statisticsOwnerStepId ?? ""} disabled={readOnly} onChange={(event) => onChange({ ...payload, statisticsOwnerStepId: nullable(event.target.value) })}>
            <MenuItem value="">Không đặt</MenuItem>
            {payload.nodes.map((node) => <MenuItem key={node.nodeId} value={node.nodeId}>{node.nodeCode}</MenuItem>)}
          </TextField>
          <TextField id="dynamic-flow-control-statisticsOwnerFormNodeId" select fullWidth label="Statistics owner form node" value={payload.statisticsOwnerFormNodeId ?? ""} disabled={readOnly} onChange={(event) => onChange({ ...payload, statisticsOwnerFormNodeId: nullable(event.target.value) })}>
            <MenuItem value="">Không đặt</MenuItem>
            {payload.formNodes.map((node) => <MenuItem key={node.formNodeId} value={node.formNodeId}>{node.formNodeId}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>
      <Paper
        variant="outlined"
        sx={{ p: 2 }}
        component="section"
        data-testid="FLOW_STATISTIC_CONTRIBUTION_CONFIG"
        aria-label="Flow statistic contribution configuration"
      >
        <Stack spacing={1.5}>
          <Typography fontWeight={850}>Đóng góp thống kê của Flow version</Typography>
          <FormControl component="fieldset" disabled={readOnly}>
            <FormLabel component="legend">Contribution policy bất biến khi khóa</FormLabel>
            <RadioGroup
              row
              value={effectivePolicy}
              onChange={(event) =>
                onContributionPolicyChange(
                  event.target.value as P8FlowContributionPolicy,
                )
              }
              aria-label="Contribution policy"
            >
              <FormControlLabel
                value="EXCLUDE"
                control={<Radio />}
                label="V_EXCLUDE — không cộng lại dữ liệu nguồn"
              />
              <FormControlLabel
                value="INCLUDE"
                control={<Radio />}
                label="V_INCLUDE — tính vào biểu mẫu đích"
              />
            </RadioGroup>
          </FormControl>
          {effectivePolicy === "INCLUDE" ? (
            <Alert severity="warning" role="alert">
              <AlertTitle>{readback.contributionWarning ?? P8_INCLUDE_WARNING}</AlertTitle>
              INCLUDE có thể làm dữ liệu đích được tính vào thống kê bên cạnh dữ liệu nguồn. Chỉ khóa khi đây là lựa chọn chủ ý trên đúng snapshot hiện tại.
              {!readOnly ? (
                <FormControlLabel
                  sx={{ display: "flex", mt: 1, alignItems: "flex-start" }}
                  control={(
                    <Checkbox
                      checked={contributionWarningAcknowledged}
                      onChange={(event) =>
                        onContributionWarningAcknowledgedChange(event.target.checked)
                      }
                      inputProps={{ "aria-label": "Xác nhận cảnh báo INCLUDE" }}
                    />
                  )}
                  label="Tôi hiểu cảnh báo và chủ ý chọn INCLUDE cho version này."
                />
              ) : null}
            </Alert>
          ) : (
            <Alert severity="info">
              <AlertTitle>EXCLUDE là mặc định an toàn</AlertTitle>
              Dữ liệu do mapping tạo không được cộng lại vào thống kê đích, giúp tránh double-counting.
            </Alert>
          )}
          {readback.contributionPolicyHash ? (
            <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>
              <strong>Contribution hash:</strong> {readback.contributionPolicyHash}
            </Typography>
          ) : null}
        </Stack>
      </Paper>
      <DynamicFlowJsonEditor editorId="rollback-policy" label="Rollback policy" value={payload.rollbackPolicy} disabled={readOnly} expect="object" onChange={(rollbackPolicy) => onChange({ ...payload, rollbackPolicy })} onValidityChange={onEditorValidityChange} onRawDirtyChange={onRawDirtyChange} rawText={rawEditorTexts["rollback-policy"]} onRawTextChange={onRawTextChange} />
      <DynamicFlowJsonEditor editorId="final-result-policy" label="Final result policy" value={payload.finalResultPolicy} disabled={readOnly} expect="object" onChange={(finalResultPolicy) => onChange({ ...payload, finalResultPolicy })} onValidityChange={onEditorValidityChange} onRawDirtyChange={onRawDirtyChange} rawText={rawEditorTexts["final-result-policy"]} onRawTextChange={onRawTextChange} />
      {profileBlocked ? (
        <Alert severity="error" role="alert" data-testid="FLOW_STATISTIC_PROFILE_DISABLED">
          <AlertTitle>FLOW_STATISTIC_PROFILE_DISABLED</AlertTitle>
          statisticProfile không rỗng bị chặn fail-closed bởi DYNAMIC_FLOW_STATISTIC_PROFILE_NOT_EXECUTABLE. Không có editor hoặc executor cho profile này.
        </Alert>
      ) : (
        <Alert severity="info" data-testid="statistic-profile-empty-barrier">
          <AlertTitle>Statistic profile đang tắt</AlertTitle>
          Profile rỗng (hoặc diffMode=NONE đã normalize) được giữ ở barrier cấu hình; không có executor.
        </Alert>
      )}
    </Stack>
  );
}

function ValidationPanel({ payload, issues }: { payload: FlowDefinitionPayloadV2; issues: ReturnType<typeof validateDynamicFlowWorkspacePayload> }) {
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");
  return (
    <Stack spacing={2} id="dynamic-flow-validation-panel" tabIndex={-1}>
      <Alert severity={errors.length ? "error" : warnings.length ? "warning" : "success"}>
        <AlertTitle>{errors.length ? `${errors.length} lỗi phía client` : "Không phát hiện lỗi cấu trúc cơ bản"}</AlertTitle>
        Backend vẫn là nguồn xác thực cuối cùng cho strict schema, topology, catalog, policy coverage và budget.
      </Alert>
      {issues.length ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1}>
            {issues.map((issue, index) => (
              <Alert key={`${issue.path}:${index}`} severity={issue.level}>
                <strong>{issue.path}</strong>: {issue.message}
              </Alert>
            ))}
          </Stack>
        </Paper>
      ) : null}
      <DynamicFlowJsonEditor
        editorId="canonical-preview"
        label="Payload canonical gửi khi lưu"
        description="Preview chỉ đọc; không gồm Form pins hoặc catalog pins do server sở hữu."
        value={payload}
        disabled
        rows={24}
        onChange={() => undefined}
      />
    </Stack>
  );
}
