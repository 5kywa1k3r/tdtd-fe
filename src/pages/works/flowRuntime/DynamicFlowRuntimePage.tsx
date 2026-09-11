import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import {
  canOpenDynamicFlowRuntimeAssignment,
  canOpenDynamicFlowRuntimeReport,
  canReviewDynamicFlowRuntimeReport,
  canSubmitDynamicFlowRuntimeReport,
  useAddDynamicFlowRuntimeSupplementalStepMutation,
  useCancelDynamicFlowRuntimeSupplementalStepMutation,
  useExecuteDynamicFlowEpochCommandMutation,
  useForwardDynamicFlowRuntimeStepMutation,
  useGetDynamicFlowRuntimeInstanceQuery,
  useGetDynamicFlowRuntimeRecoveryQuery,
  useGetDynamicFlowRuntimeStepsQuery,
  useGetDynamicFlowRuntimeTimelineQuery,
  useLaunchDynamicFlowRuntimeSubflowMutation,
  type DynamicFlowRuntimeStepRow,
  type DynamicFlowRuntimeTimelineRow,
  type DynamicFlowEpochAction,
} from "../../../api/dynamicFlowRuntimeApi";
import { useCompleteWorkAssignmentMutation } from "../../../api/workAssignmentApi";
import {
  dynamicFlowRuntimePath,
  isDynamicFlowRuntimeTab,
  normalizeDynamicFlowRuntimeTab,
  readDynamicFlowRuntimeDeepLink,
  type DynamicFlowRuntimeDeepLink,
  type DynamicFlowRuntimeTab,
} from "../../../routes/dynamicFlowRoutes";
import DynamicFlowRuntimeStateBadge from "../../../components/works/flowRuntime/DynamicFlowRuntimeStateBadge";
import DomainContextStrip from "../../../components/navigation/DomainContextStrip";
import {
  buildDynamicFlowForwardRequest,
  buildDynamicFlowEpochCommandRequest,
  buildDynamicFlowSubflowLaunchRequest,
  isRuntimeCapabilityEnabled,
  runtimeErrorPresentation,
} from "../../../components/works/flowRuntime/dynamicFlowRuntimeModel";

const WorkReportEditorPage = lazy(() => import("../report/WorkReportEditorPage"));

const TAB_LABELS: Record<DynamicFlowRuntimeTab, string> = {
  overview: "Tổng quan",
  "work-to-do": "Việc cần làm",
  timeline: "Dòng thời gian",
};

const FORWARD_MATERIALIZATION_POLL_ATTEMPTS = 6;
const FORWARD_MATERIALIZATION_POLL_INTERVAL_MS = 250;

function waitForForwardPoll() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, FORWARD_MATERIALIZATION_POLL_INTERVAL_MS);
  });
}

function mergeByKey<T>(current: T[], incoming: T[], keyOf: (row: T) => string) {
  const next = [...current];
  const seen = new Set(current.map(keyOf));
  for (const row of incoming) {
    const key = keyOf(row);
    if (!seen.has(key)) {
      seen.add(key);
      next.push(row);
    }
  }
  return next;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("vi-VN");
}

function forwardTestPrefix(archetypeId: string | null | undefined) {
  if (archetypeId === "FLOW-T04") return "p6-t04";
  if (archetypeId === "FLOW-T05") return "p6-t05";
  if (archetypeId === "FLOW-T06") return "p6-t06";
  if (archetypeId === "FLOW-T07") return "p6-t07";
  if (archetypeId === "FLOW-T08") return "p6-t08";
  return "p6-t03";
}

function DetailValue({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
        {value === null || value === undefined || value === "" ? "—" : value}
      </Typography>
    </Box>
  );
}

export default function DynamicFlowRuntimePage() {
  const navigate = useNavigate();
  const { workId = "", instanceId = "", tab: rawTab } = useParams<{
    workId: string;
    instanceId: string;
    tab?: string;
  }>();
  const [searchParams] = useSearchParams();
  const tab = normalizeDynamicFlowRuntimeTab(rawTab);
  const identity = useMemo(
    () => readDynamicFlowRuntimeDeepLink(searchParams),
    [searchParams],
  );
  const [stepCursor, setStepCursor] = useState<string | null>(null);
  const [timelineCursor, setTimelineCursor] = useState<string | null>(null);
  const [stepRows, setStepRows] = useState<DynamicFlowRuntimeStepRow[]>([]);
  const [timelineRows, setTimelineRows] = useState<DynamicFlowRuntimeTimelineRow[]>([]);
  const [forwardMaterializationPending, setForwardMaterializationPending] = useState(false);
  const [supplementalCancelMessage, setSupplementalCancelMessage] = useState<string | null>(null);
  const forwardRequestRef = useRef<{
    selectionKey: string;
    body: ReturnType<typeof buildDynamicFlowForwardRequest>;
  } | null>(null);
  const subflowRequestRef = useRef<{
    selectionKey: string;
    body: ReturnType<typeof buildDynamicFlowSubflowLaunchRequest>;
  } | null>(null);
  const epochRequestRef = useRef<{
    selectionKey: string;
    body: ReturnType<typeof buildDynamicFlowEpochCommandRequest>;
  } | null>(null);
  const [
    forwardStep,
    {
      data: forwardResult,
      error: forwardError,
      isLoading: isForwarding,
      reset: resetForward,
    },
  ] = useForwardDynamicFlowRuntimeStepMutation();
  const [
    launchSubflow,
    {
      data: subflowResult,
      error: subflowError,
      isLoading: isLaunchingSubflow,
      reset: resetSubflow,
    },
  ] = useLaunchDynamicFlowRuntimeSubflowMutation();
  const [
    addSupplemental,
    {
      data: supplementalAddResult,
      error: supplementalAddError,
      isLoading: isAddingSupplemental,
      reset: resetSupplementalAdd,
    },
  ] = useAddDynamicFlowRuntimeSupplementalStepMutation();
  const [
    cancelSupplemental,
    {
      data: supplementalCancelResult,
      error: supplementalCancelError,
      isLoading: isCancellingSupplemental,
      reset: resetSupplementalCancel,
    },
  ] = useCancelDynamicFlowRuntimeSupplementalStepMutation();
  const [
    executeEpochCommand,
    {
      data: epochCommandResult,
      error: epochCommandError,
      isLoading: isExecutingEpochCommand,
      reset: resetEpochCommand,
    },
  ] = useExecuteDynamicFlowEpochCommandMutation();
  const [
    completeFlowAssignment,
    {
      error: flowCompletionError,
      isLoading: isCompletingFlowAssignment,
      reset: resetFlowCompletion,
    },
  ] = useCompleteWorkAssignmentMutation();

  useEffect(() => {
    if (rawTab && isDynamicFlowRuntimeTab(rawTab)) return;
    navigate(dynamicFlowRuntimePath(workId, instanceId, "overview", identity), { replace: true });
  }, [identity, instanceId, navigate, rawTab, workId]);

  useEffect(() => {
    setStepCursor(null);
    setTimelineCursor(null);
    setStepRows([]);
    setTimelineRows([]);
    setForwardMaterializationPending(false);
    forwardRequestRef.current = null;
    subflowRequestRef.current = null;
    epochRequestRef.current = null;
    resetForward();
    resetSubflow();
    resetSupplementalAdd();
    resetSupplementalCancel();
    resetEpochCommand();
    resetFlowCompletion();
  }, [
    instanceId,
    resetForward,
    resetSubflow,
    resetSupplementalAdd,
    resetSupplementalCancel,
    resetEpochCommand,
    resetFlowCompletion,
    workId,
  ]);

  const overview = useGetDynamicFlowRuntimeInstanceQuery(
    { workId, instanceId },
    { skip: !workId || !instanceId },
  );
  const recovery = useGetDynamicFlowRuntimeRecoveryQuery(
    { workId, instanceId },
    { skip: !workId || !instanceId || tab !== "overview" },
  );
  const loadT12CompletionReadiness =
    tab === "overview" && overview.data?.archetypeId === "FLOW-T12";
  const steps = useGetDynamicFlowRuntimeStepsQuery(
    { workId, instanceId, limit: 25, cursor: stepCursor },
    {
      skip:
        !workId ||
        !instanceId ||
        (tab !== "work-to-do" && !loadT12CompletionReadiness),
    },
  );
  const timelineAllowed = isRuntimeCapabilityEnabled(overview.data?.capabilities.canViewTimeline);
  const timeline = useGetDynamicFlowRuntimeTimelineQuery(
    { workId, instanceId, limit: 25, cursor: timelineCursor },
    { skip: !workId || !instanceId || tab !== "timeline" || !timelineAllowed },
  );

  useEffect(() => {
    const page = steps.data;
    if (!page) return;
    setStepRows((current) =>
      stepCursor
        ? mergeByKey(current, page.items, (row) => `${row.stepInstanceId}:${row.branchId}:${row.attemptNo}`)
        : page.items,
    );
  }, [stepCursor, steps.data]);

  useEffect(() => {
    const page = timeline.data;
    if (!page) return;
    setTimelineRows((current) =>
      timelineCursor
        ? mergeByKey(current, page.items, (row) => row.eventId)
        : page.items,
    );
  }, [timeline.data, timelineCursor]);

  const selectedStep = useMemo(
    () => {
      if (!identity.stepInstanceId || !identity.branchId || !identity.attemptNo) return null;
      return (
        stepRows.find(
        (row) =>
            row.stepInstanceId === identity.stepInstanceId &&
            row.branchId === identity.branchId &&
            row.attemptNo === identity.attemptNo &&
            (!identity.assignmentId || row.assignmentId === identity.assignmentId),
        ) ?? null
      );
    },
    [
      identity.assignmentId,
      identity.attemptNo,
      identity.branchId,
      identity.stepInstanceId,
      stepRows,
    ],
  );
  const t12ApprovedStep = useMemo(
    () =>
      stepRows.find(
        (row) =>
          row.assignmentId && row.state.trim().toUpperCase() === "APPROVED",
      ) ?? null,
    [stepRows],
  );
  const selectedForwardKey =
    selectedStep?.assignmentId
      ? [
          workId,
          instanceId,
          selectedStep.stepInstanceId,
          selectedStep.branchId,
          selectedStep.attemptNo,
          selectedStep.assignmentId,
        ].join(":")
      : null;
  const forwardStateMatchesSelection =
    selectedForwardKey !== null &&
    forwardRequestRef.current?.selectionKey === selectedForwardKey;
  const subflowStateMatchesSelection =
    selectedForwardKey !== null &&
    subflowRequestRef.current?.selectionKey === selectedForwardKey;
  const selectedReportRow = useMemo(
    () =>
      identity.reportId && selectedStep?.reportIds.includes(identity.reportId)
        ? selectedStep
        : null,
    [identity.reportId, selectedStep],
  );
  const reportAuthorized = Boolean(
    selectedReportRow &&
      identity.reportId &&
      ((selectedReportRow.reportId === identity.reportId &&
        canOpenDynamicFlowRuntimeReport(selectedReportRow)) ||
        (selectedReportRow.submitReportId === identity.reportId &&
          canSubmitDynamicFlowRuntimeReport(selectedReportRow)) ||
        (selectedReportRow.reviewReportId === identity.reportId &&
          canReviewDynamicFlowRuntimeReport(selectedReportRow))),
  );
  const reportWritable = Boolean(
    selectedReportRow &&
      identity.reportId === selectedReportRow.submitReportId &&
      canSubmitDynamicFlowRuntimeReport(selectedReportRow),
  );

  const navigateTab = (nextTab: DynamicFlowRuntimeTab, nextIdentity: DynamicFlowRuntimeDeepLink = identity) => {
    navigate(dynamicFlowRuntimePath(workId, instanceId, nextTab, nextIdentity));
  };
  const selectStep = (row: DynamicFlowRuntimeStepRow, reportId?: string | null) => {
    navigateTab("work-to-do", {
      stepInstanceId: row.stepInstanceId,
      branchId: row.branchId,
      attemptNo: row.attemptNo,
      assignmentId: row.assignmentId,
      reportId: reportId ?? null,
    });
  };
  const forwardSelectedStep = async () => {
    if (
      !selectedStep?.assignmentId ||
      selectedStep.capabilities.canForward !== true ||
      !overview.data ||
      !selectedForwardKey
    ) {
      return;
    }
    if (forwardRequestRef.current?.selectionKey !== selectedForwardKey) {
      resetForward();
      setForwardMaterializationPending(false);
      forwardRequestRef.current = {
        selectionKey: selectedForwardKey,
        body: buildDynamicFlowForwardRequest(
          overview.data.capabilities.expectedRevision,
          selectedStep.capabilities.expectedRevision,
        ),
      };
    }
    try {
      const result = await forwardStep({
        workId,
        instanceId,
        assignmentId: selectedStep.assignmentId,
        body: forwardRequestRef.current.body,
      }).unwrap();
      setForwardMaterializationPending(true);
      const nextAttemptNo = 1;
      const activatedBranches = result.activatedBranches ?? [];
      const expectedBranches =
        activatedBranches.length > 0
          ? activatedBranches
          : [
              {
                stepInstanceId: result.nextStepInstanceId,
                assignmentId: result.nextAssignmentId,
                branchId: selectedStep.branchId,
              },
            ];
      for (
        let attempt = 0;
        attempt < FORWARD_MATERIALIZATION_POLL_ATTEMPTS;
        attempt += 1
      ) {
        const refreshed = await steps.refetch();
        const materialized = expectedBranches
          .map((expected) =>
            refreshed.data?.items.find(
              (row) =>
                row.stepInstanceId === expected.stepInstanceId &&
                row.branchId === expected.branchId &&
                row.attemptNo === nextAttemptNo &&
                row.assignmentId === expected.assignmentId,
            ),
          )
          .filter((row): row is DynamicFlowRuntimeStepRow => Boolean(row));
        if (materialized.length === expectedBranches.length) {
          const firstMaterialized = materialized[0];
          setForwardMaterializationPending(false);
          await overview.refetch();
          navigateTab("work-to-do", {
            stepInstanceId: firstMaterialized.stepInstanceId,
            branchId: firstMaterialized.branchId,
            attemptNo: firstMaterialized.attemptNo,
            assignmentId: firstMaterialized.assignmentId,
            reportId: null,
          });
          return;
        }
        if (attempt + 1 < FORWARD_MATERIALIZATION_POLL_ATTEMPTS) {
          await waitForForwardPoll();
        }
      }
      await overview.refetch();
    } catch {
      // The mutation state renders the canonical server error. Keeping the
      // exact request in the ref makes a retry use the same command identity.
    }
  };
  const launchSelectedSubflow = async () => {
    if (
      !selectedStep ||
      selectedStep.capabilities.canLaunchSubflow !== true ||
      !overview.data ||
      !selectedForwardKey
    ) {
      return;
    }
    if (subflowRequestRef.current?.selectionKey !== selectedForwardKey) {
      resetSubflow();
      subflowRequestRef.current = {
        selectionKey: selectedForwardKey,
        body: buildDynamicFlowSubflowLaunchRequest(
          overview.data.capabilities.expectedRevision,
          selectedStep.capabilities.expectedRevision,
        ),
      };
    }
    try {
      await launchSubflow({
        workId,
        parentInstanceId: instanceId,
        parentStepInstanceId: selectedStep.stepInstanceId,
        body: subflowRequestRef.current.body,
      }).unwrap();
      await Promise.all([overview.refetch(), steps.refetch()]);
    } catch {
      // Keep the command identity stable so a retry remains replay-safe.
    }
  };
  const addSelectedSupplemental = async (completionRequired: boolean) => {
    if (
      !selectedStep ||
      selectedStep.isSupplemental === true ||
      overview.data?.capabilities.canManageSupplemental !== true
    ) {
      return;
    }
    resetSupplementalAdd();
    try {
      await addSupplemental({
        workId,
        instanceId,
        body: {
          commandId: `supplemental-add:${crypto.randomUUID()}`,
          expectedInstanceRevision: overview.data.capabilities.expectedRevision,
          formNodeId: selectedStep.formNodeId,
          targetUnitId: selectedStep.targetUnitId,
          completionRequired,
        },
      }).unwrap();
      await Promise.all([overview.refetch(), steps.refetch(), timeline.refetch()]);
    } catch {
      // The mutation renders the server-authoritative validation result.
    }
  };
  const cancelSelectedSupplemental = async () => {
    if (
      !selectedStep?.supplementalStepId ||
      selectedStep.capabilities.canCancelSupplemental !== true ||
      !overview.data
    ) {
      return;
    }
    setSupplementalCancelMessage(null);
    resetSupplementalCancel();
    try {
      await cancelSupplemental({
        workId,
        instanceId,
        supplementalStepId: selectedStep.supplementalStepId,
        body: {
          commandId: `supplemental-cancel:${crypto.randomUUID()}`,
          expectedInstanceRevision: overview.data.capabilities.expectedRevision,
          expectedStepRevision: selectedStep.capabilities.expectedRevision,
          reason: "Cancelled by coordinator",
        },
      }).unwrap();
      await Promise.all([overview.refetch(), steps.refetch(), timeline.refetch()]);
    } catch (error) {
      setSupplementalCancelMessage(runtimeErrorPresentation(error).message);
    }
  };

  const completeApprovedT12Step = async () => {
    if (
      overview.data?.archetypeId !== "FLOW-T12" ||
      overview.data.state.trim().toUpperCase() !== "ACTIVE" ||
      overview.data.capabilities.canRollback !== true ||
      !t12ApprovedStep?.assignmentId
    ) {
      return;
    }
    try {
      await completeFlowAssignment({
        id: t12ApprovedStep.assignmentId,
        workId,
        body: {
          completedDate: `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
          note: "Completed from Dynamic Flow runtime before epoch finalization",
        },
      }).unwrap();
      await Promise.all([overview.refetch(), steps.refetch()]);
    } catch {
      // The assignment completion owner enforces report readiness and actor scope;
      // its canonical error is rendered below and a retry remains replay-safe.
    }
  };

  const executeInstanceEpochCommand = async (action: DynamicFlowEpochAction) => {
    if (!overview.data) return;
    const allowed =
      (action === "finalize" && overview.data.capabilities.canFinalize === true) ||
      (action === "rollback" && overview.data.capabilities.canRollback === true) ||
      (action === "terminate" && overview.data.capabilities.canTerminate === true) ||
      (action === "restart" && overview.data.capabilities.canRestart === true);
    if (!allowed) return;
    const checkpointNodeId =
      action === "rollback" || action === "restart"
        ? overview.data.entryFlowStepId
        : null;
    const selectionKey = [
      workId,
      instanceId,
      action,
      overview.data.executionEpoch,
      overview.data.capabilities.expectedRevision,
      checkpointNodeId ?? "",
    ].join(":");
    if (epochRequestRef.current?.selectionKey !== selectionKey) {
      resetEpochCommand();
      epochRequestRef.current = {
        selectionKey,
        body: buildDynamicFlowEpochCommandRequest(
          overview.data.executionEpoch,
          overview.data.capabilities.expectedRevision,
          checkpointNodeId,
          `epoch-${action}:${crypto.randomUUID()}`,
        ),
      };
    }
    try {
      await executeEpochCommand({
        workId,
        instanceId,
        action,
        body: epochRequestRef.current.body,
      }).unwrap();
      epochRequestRef.current = null;
      await Promise.all([overview.refetch(), steps.refetch(), timeline.refetch()]);
    } catch {
      // Server capability/CAS remains authoritative; error is rendered below.
    }
  };

  const firstError =
    supplementalCancelError ??
    overview.error ??
    recovery.error ??
    steps.error ??
    timeline.error ??
    epochCommandError ??
    flowCompletionError ??
    supplementalAddError;
  const errorPresentation = firstError ? runtimeErrorPresentation(firstError) : null;

  if (!workId || !instanceId) {
    return <Alert severity="error">Đường dẫn Flow runtime thiếu workId hoặc instanceId.</Alert>;
  }

  return (
    <Box
      data-testid="p5-runtime-page"
      data-work-id={workId}
      data-instance-id={instanceId}
      sx={{ p: { xs: 1.5, md: 2.5 }, minHeight: "100%", bgcolor: "#f8fafc" }}
    >
      <Stack spacing={2}>
        <DomainContextStrip
          ariaLabel="Ngữ cảnh Flow runtime"
          breadcrumbs={[
            { label: "Công việc", to: `/works/${encodeURIComponent(workId)}` },
            { label: "Flow instance" },
            { label: TAB_LABELS[tab] },
          ]}
          items={[
            { label: "Work", value: workId },
            { label: "Instance", value: instanceId },
            { label: "Trạng thái", value: overview.data?.state ?? "Đang tải", color: overview.data ? "info" : "default" },
            { label: "Kỳ", value: overview.data?.periodKey },
            { label: "Execution epoch", value: overview.data?.executionEpoch },
            { label: "Quyền", value: overview.data
              ? Object.entries(overview.data.capabilities).some(([key, value]) => key.startsWith("can") && value === true && !key.startsWith("canView"))
                ? "Có thao tác được máy chủ cấp" : "Chỉ đọc"
              : "Đang xác thực" },
          ]}
        />
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={1.25}
        >
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Button
              startIcon={<ArrowBackOutlinedIcon />}
              onClick={() => navigate(`/works/${encodeURIComponent(workId)}?tab=ASSIGN`)}
            >
              Công việc
            </Button>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 850, overflowWrap: "anywhere" }}>
                Flow instance
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                Work {workId} · Instance {instanceId}
              </Typography>
            </Box>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            {overview.data ? <DynamicFlowRuntimeStateBadge state={overview.data.state} size="medium" /> : null}
            <Button
              startIcon={<RefreshOutlinedIcon />}
              data-testid="p5-runtime-refresh"
              onClick={() => {
                setSupplementalCancelMessage(null);
                if (supplementalCancelError) resetSupplementalCancel();
                void overview.refetch();
                if (tab === "overview") void recovery.refetch();
                if (tab === "work-to-do") void steps.refetch();
                if (tab === "timeline" && timelineAllowed) void timeline.refetch();
              }}
            >
              Làm mới
            </Button>
          </Stack>
        </Stack>

        <Card elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <Tabs
            value={tab}
            onChange={(_, value: DynamicFlowRuntimeTab) => navigateTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            aria-label="Flow runtime tabs"
          >
            <Tab id="flow-tab-overview" aria-controls="flow-panel-overview" value="overview" label={TAB_LABELS.overview} />
            <Tab
              id="flow-tab-work-to-do"
              aria-controls="flow-panel-work-to-do"
              value="work-to-do"
              label={TAB_LABELS["work-to-do"]}
            />
            <Tab id="flow-tab-timeline" aria-controls="flow-panel-timeline" value="timeline" label={TAB_LABELS.timeline} />
          </Tabs>
        </Card>

        {supplementalCancelMessage ? (
          <Alert severity="error" data-testid="p6-t11-cancel-conflict">
            {supplementalCancelMessage}
          </Alert>
        ) : errorPresentation ? (
          <Alert severity={errorPresentation.kind === "forbidden" ? "warning" : "error"}>
            {errorPresentation.message}
          </Alert>
        ) : null}

        {overview.isLoading ? (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 6 }} role="status">
            <CircularProgress size={24} />
            <Typography>Đang tải Flow instance…</Typography>
          </Stack>
        ) : null}

        {tab === "overview" && !overview.isLoading && overview.data ? (
          <Card
            elevation={0}
            role="tabpanel"
            id="flow-panel-overview"
            aria-labelledby="flow-tab-overview"
            sx={{ border: "1px solid #e2e8f0", borderRadius: "8px" }}
          >
            <CardContent>
              <Stack spacing={2}>
                {!isRuntimeCapabilityEnabled(overview.data.capabilities.canViewOverview) ? (
                  <Alert severity="warning">
                    Server không cấp canViewOverview; nội dung chi tiết bị khóa fail-closed.
                  </Alert>
                ) : (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
                      gap: 2,
                    }}
                  >
                    <DetailValue label="Flow template" value={overview.data.flowTemplateId} />
                    <DetailValue label="Exact version" value={`${overview.data.flowTemplateVersionId} · v${overview.data.flowTemplateVersionNo}`} />
                    <DetailValue label="Archetype" value={overview.data.archetypeId} />
                    <DetailValue label="Execution epoch" value={overview.data.executionEpoch} />
                    <DetailValue label="Finalized epoch" value={overview.data.finalizedExecutionEpoch} />
                    <DetailValue label="Finalized at" value={formatDateTime(overview.data.finalizedAtUtc ?? null)} />
                    <DetailValue label="Definition revision" value={overview.data.definitionRevision} />
                    <DetailValue label="Topology hash" value={overview.data.topologySnapshotHash} />
                    <DetailValue label="Entry step" value={overview.data.entryFlowStepId} />
                    <DetailValue label="Period" value={overview.data.periodKey} />
                    <DetailValue label="Participant snapshot" value={overview.data.participantSnapshotId} />
                    <DetailValue label="Parent instance" value={overview.data.parentInstanceId} />
                    <DetailValue label="Parent step" value={overview.data.parentStepInstanceId} />
                    <DetailValue label="Root instance" value={overview.data.rootInstanceId} />
                    <DetailValue label="Ancestry depth" value={overview.data.ancestryPath.length} />
                    <DetailValue label="Visible steps" value={overview.data.visibleStepCount} />
                    <DetailValue label="Revision" value={overview.data.revision} />
                    <DetailValue label="Expected revision" value={overview.data.capabilities.expectedRevision} />
                    <DetailValue label="Revision token" value={overview.data.revisionToken} />
                    <DetailValue label="Schedule hash" value={overview.data.scheduleIdentityHash} />
                    <DetailValue label="Recovery epoch" value={overview.data.runtimeRecoveryEpoch} />
                    <DetailValue label="Updated" value={formatDateTime(overview.data.updatedAtUtc)} />
                  </Box>
                )}

                {overview.data.archetypeId === "FLOW-T12" ? (
                  <Stack spacing={1.5} data-testid="p6-t12-epoch-controls">
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Execution epoch controls
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
                      {overview.data.state.trim().toUpperCase() === "ACTIVE" &&
                      overview.data.capabilities.canRollback === true &&
                      t12ApprovedStep?.assignmentId ? (
                        <Button
                          variant="contained"
                          color="success"
                          disabled={isCompletingFlowAssignment}
                          onClick={() => void completeApprovedT12Step()}
                        >
                          Complete approved step
                        </Button>
                      ) : null}
                      {overview.data.capabilities.canFinalize === true ? (
                        <Button
                          variant="contained"
                          disabled={isExecutingEpochCommand}
                          onClick={() => void executeInstanceEpochCommand("finalize")}
                        >
                          Finalize epoch
                        </Button>
                      ) : null}
                      {overview.data.capabilities.canRollback === true ? (
                        <Button
                          variant="outlined"
                          disabled={isExecutingEpochCommand}
                          onClick={() => void executeInstanceEpochCommand("rollback")}
                        >
                          Rollback to allowed ancestor
                        </Button>
                      ) : null}
                      {overview.data.capabilities.canRestart === true ? (
                        <Button
                          variant="outlined"
                          disabled={isExecutingEpochCommand}
                          onClick={() => void executeInstanceEpochCommand("restart")}
                        >
                          Restart from checkpoint
                        </Button>
                      ) : null}
                      {overview.data.capabilities.canTerminate === true ? (
                        <Button
                          color="error"
                          variant="outlined"
                          disabled={isExecutingEpochCommand}
                          onClick={() => void executeInstanceEpochCommand("terminate")}
                        >
                          Terminate current scope
                        </Button>
                      ) : null}
                    </Stack>
                    {epochCommandResult ? (
                      <Alert severity="success" data-testid="p6-t12-command-success">
                        {epochCommandResult.action}: epoch {epochCommandResult.previousExecutionEpoch}
                        {" → "}
                        {epochCommandResult.executionEpoch}; event {epochCommandResult.eventId}
                        {epochCommandResult.rebuildIntentId
                          ? `; rebuild intent ${epochCommandResult.rebuildIntentId}`
                          : ""}.
                      </Alert>
                    ) : null}
                    {epochCommandError ? (
                      <Alert severity="error">
                        {runtimeErrorPresentation(epochCommandError).message}
                      </Alert>
                    ) : null}
                    {(overview.data.epochs ?? []).map((epoch) => (
                      <Card
                        key={epoch.epochId}
                        variant="outlined"
                        data-testid={`p6-t12-epoch-${epoch.executionEpoch}`}
                      >
                        <CardContent>
                          <Stack spacing={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <DynamicFlowRuntimeStateBadge state={epoch.state} />
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                Epoch {epoch.executionEpoch} · {epoch.epochId}
                              </Typography>
                            </Stack>
                            <DetailValue
                              label="Canonical"
                              value={epoch.isCanonical ? "Canonical" : "Invalidated history"}
                            />
                            <DetailValue label="Checkpoint" value={epoch.checkpointNodeId} />
                            <DetailValue label="Terminal event" value={epoch.terminalEventId} />
                            <DetailValue
                              label="Replacement epoch"
                              value={epoch.replacedByExecutionEpoch}
                            />
                            <DetailValue label="Closed" value={formatDateTime(epoch.closedAtUtc)} />
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : null}

                {overview.data.gateways.map((gateway) => (
                  <Card
                    key={`${gateway.gatewayInstanceId}:${gateway.gatewayVersion}`}
                    variant="outlined"
                    data-testid={
                      gateway.gatewayKind === "JOIN_ALL"
                        ? "p6-t05-join-all"
                        : gateway.gatewayKind === "JOIN_ANY" ||
                            gateway.gatewayKind === "JOIN_N_OF_M"
                          ? "p6-t06-join-quorum"
                          : gateway.gatewayKind === "CONDITION"
                            ? "p6-t07-conditional-decision"
                          : "dynamic-flow-gateway"
                    }
                  >
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          justifyContent="space-between"
                        >
                          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            {gateway.gatewayKind} · {gateway.gatewayNodeId}
                          </Typography>
                          <DynamicFlowRuntimeStateBadge state={gateway.state} />
                        </Stack>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                            gap: 1,
                          }}
                        >
                          <DetailValue
                            label="Gateway instance"
                            value={`${gateway.gatewayInstanceId} · v${gateway.gatewayVersion}`}
                          />
                          <DetailValue label="Gateway revision" value={gateway.revision} />
                          <DetailValue
                            label="Epoch authority"
                            value={
                              gateway.isCanonicalEpoch === false
                                ? `Invalidated by ${gateway.invalidatedByFlowEventId ?? "epoch event"}`
                                : "Canonical"
                            }
                          />
                          {gateway.gatewayKind === "CONDITION" ? (
                            <>
                              <DetailValue label="Evaluator version" value={gateway.evaluatorVersion} />
                              <DetailValue label="Selected edge" value={gateway.selectedEdgeId} />
                              <DetailValue label="Decision reason" value={gateway.decisionReasonCode} />
                              <DetailValue label="Input snapshot hash" value={gateway.inputSnapshotHash} />
                            </>
                          ) : null}
                          <DetailValue
                            label="Expected contributions"
                            value={gateway.expectedContributionIds.join(", ")}
                          />
                          <DetailValue
                            label="Arrived contributions"
                            value={gateway.arrivedContributionIds.join(", ")}
                          />
                          <Box data-testid="p6-t06-quorum-progress">
                            <DetailValue
                              label="Quorum progress"
                              value={`${gateway.arrivedContributionIds.length}/${gateway.requiredContributionCount}`}
                            />
                          </Box>
                          <DetailValue
                            label="Winner contribution"
                            value={gateway.winnerContributionId}
                          />
                          <Box data-testid="p6-t05-missing-contributors">
                            <DetailValue
                              label={`Missing contributors (${gateway.missingContributionIds.length})`}
                              value={
                                gateway.missingContributionIds.length > 0
                                  ? gateway.missingContributionIds.join(", ")
                                  : "Không còn contribution thiếu"
                              }
                            />
                          </Box>
                          <Box data-testid="p6-t06-cancelled-contributors">
                            <DetailValue
                              label={`Cancelled by gateway (${gateway.cancelledContributionIds.length})`}
                              value={
                                gateway.cancelledContributionIds.length > 0
                                  ? gateway.cancelledContributionIds.join(", ")
                                  : "Không có nhánh bị hủy"
                              }
                            />
                          </Box>
                          <Box data-testid="p6-t06-late-contributors">
                            <DetailValue
                              label={`Late ignored (${gateway.lateContributionIds.length})`}
                              value={
                                gateway.lateContributionIds.length > 0
                                  ? gateway.lateContributionIds.join(", ")
                                  : "Chưa có completion đến muộn"
                              }
                            />
                          </Box>
                          <DetailValue label="Released" value={formatDateTime(gateway.releasedAtUtc)} />
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}

                <Divider />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Recovery (server-owned)
                </Typography>
                {recovery.isLoading ? <CircularProgress size={20} /> : null}
                {recovery.data ? (
                  <Stack spacing={1}>
                    <DynamicFlowRuntimeStateBadge state={recovery.data.state} />
                    <Typography variant="body2">{recovery.data.statusText || "Không có trạng thái recovery bổ sung."}</Typography>
                    <DetailValue label="Reason" value={recovery.data.reasonCode} />
                    <DetailValue label="Next action" value={recovery.data.nextAction} />
                    <DetailValue label="Attempt count" value={recovery.data.attemptCount} />
                    <Alert severity="info">
                      Khi máy chủ không công khai mutation retry/reconcile, UI không dựng endpoint hoặc nút launch mới,
                      kể cả khi một capability lân cận đang bật.
                    </Alert>
                  </Stack>
                ) : null}

                <Alert severity="info">
                  Mapping/source rules và statistics/aggregation chỉ được mở qua canonical owner
                  khi capability máy chủ tương ứng cho phép; runtime không suy diễn quyền hoặc dựng endpoint.
                </Alert>
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        {tab === "work-to-do" ? (
          <Card
            elevation={0}
            role="tabpanel"
            id="flow-panel-work-to-do"
            aria-labelledby="flow-tab-work-to-do"
            sx={{ border: "1px solid #e2e8f0", borderRadius: "8px" }}
          >
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Các bước/nhánh nhìn thấy bởi actor
                </Typography>
                {steps.isLoading && stepRows.length === 0 ? (
                  <Stack direction="row" spacing={1} alignItems="center" role="status">
                    <CircularProgress size={20} />
                    <Typography variant="body2">Đang tải work-to-do…</Typography>
                  </Stack>
                ) : null}
                {!steps.isLoading && stepRows.length === 0 && !steps.error ? (
                  <Alert severity="info">Không có bước Flow hiển thị cho actor hiện tại.</Alert>
                ) : null}
                {identity.stepInstanceId && stepRows.length > 0 && !selectedStep ? (
                  <Alert severity="warning">
                    Deep-link step/branch/attempt/assignment không nằm trong trang dữ liệu đang hiển thị; client không
                    tự suy hoặc mở rộng quyền.
                  </Alert>
                ) : null}

                <List disablePadding sx={{ maxHeight: { xs: "none", lg: 520 }, overflow: "auto" }}>
                  {stepRows.map((row) => {
                    const selected =
                      selectedStep?.stepInstanceId === row.stepInstanceId &&
                      selectedStep.branchId === row.branchId &&
                      selectedStep.attemptNo === row.attemptNo;
                    return (
                      <ListItem
                        key={`${row.stepInstanceId}:${row.branchId}:${row.attemptNo}`}
                        disablePadding
                        divider
                        secondaryAction={
                          <DynamicFlowRuntimeStateBadge state={row.state} />
                        }
                      >
                        <ListItemButton
                          selected={selected}
                          onClick={() => selectStep(row)}
                          sx={{ pr: { xs: 2, md: 28 }, alignItems: "flex-start" }}
                        >
                          <ListItemText
                            primary={`${row.flowStepCode} · ${row.gatewayInstanceId ? "nhánh fork" : "nhánh"} ${row.branchId} · lần ${row.attemptNo}`}
                            secondary={
                              <>
                                Step instance: {row.stepInstanceId}
                                <br />
                                Target: {row.targetUnitId} · revision {row.revision}
                              </>
                            }
                            primaryTypographyProps={{ sx: { fontWeight: 800, overflowWrap: "anywhere" } }}
                            secondaryTypographyProps={{ component: "div", sx: { overflowWrap: "anywhere" } }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>

                {steps.data?.hasMore && steps.data.nextCursor ? (
                  <Button
                    onClick={() => setStepCursor(steps.data?.nextCursor ?? null)}
                    disabled={steps.isFetching}
                  >
                    Tải thêm nhánh
                  </Button>
                ) : null}

                {selectedStep ? (
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          Exact targets từ server
                        </Typography>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                            gap: 1,
                          }}
                        >
                          <DetailValue label="Execution epoch" value={selectedStep.executionEpoch} />
                          <DetailValue
                            label="Epoch authority"
                            value={
                              selectedStep.isCanonicalEpoch === false
                                ? `Invalidated by ${selectedStep.invalidatedByFlowEventId ?? "epoch event"}`
                                : "Canonical active epoch"
                            }
                          />
                          <DetailValue
                            label="Invalidated at"
                            value={formatDateTime(selectedStep.invalidatedAtUtc ?? null)}
                          />
                          <DetailValue label="Definition revision" value={selectedStep.definitionRevision} />
                          <DetailValue label="Form version" value={`${selectedStep.formVersionId} · v${selectedStep.formVersionNo}`} />
                          <DetailValue label="Result owner" value={selectedStep.resultOwnerIdentity} />
                          <DetailValue label="Statistics owner" value={selectedStep.statisticOwnerIdentity} />
                          {selectedStep.maxReviewCycles !== null ? (
                            <Box data-testid="p6-t08-review-cycle">
                              <DetailValue
                                label="Review cycle"
                                value={`${selectedStep.reviewCycleNo}/${selectedStep.maxReviewCycles} · attempt ${selectedStep.attemptNo}`}
                              />
                              <DetailValue
                                label="Attempt authority"
                                value={
                                  selectedStep.isCanonicalAttempt
                                    ? "Canonical active attempt"
                                    : `Readonly history · superseded by ${selectedStep.supersededByStepInstanceId ?? "terminal policy"}`
                                }
                              />
                              <DetailValue
                                label="Previous attempt"
                                value={
                                  selectedStep.previousAttemptStepInstanceId
                                    ? `${selectedStep.previousAttemptStepInstanceId} · assignment ${selectedStep.previousAttemptAssignmentId ?? "—"}`
                                    : "Initial review attempt"
                                }
                              />
                            </Box>
                          ) : null}
                          {selectedStep.gatewayInstanceId ? (
                            <>
                              <DetailValue
                                label="Fork gateway"
                                value={`${selectedStep.gatewayInstanceId} · v${selectedStep.gatewayVersion ?? 1}`}
                              />
                              <DetailValue
                                label="Contribution"
                                value={selectedStep.contributionId ?? "—"}
                              />
                            </>
                          ) : null}
                          {selectedStep.childInstanceId ? (
                            <Box data-testid="p6-t09-child-lineage">
                              <DetailValue label="Child instance" value={selectedStep.childInstanceId} />
                              <DetailValue
                                label="Child exact pin"
                                value={`${selectedStep.childFlowTemplateId ?? "—"} · ${selectedStep.childFlowVersionId ?? "—"}`}
                              />
                              <DetailValue label="Child state" value={selectedStep.childState} />
                              <DetailValue label="Child outcome" value={selectedStep.childOutcomeCode} />
                              <DetailValue label="Linked" value={formatDateTime(selectedStep.childLinkedAtUtc)} />
                            </Box>
                          ) : null}
                          {selectedStep.isSupplemental === true ? (
                            <Box data-testid="p6-t11-supplemental-identity">
                              <DetailValue
                                label="Supplemental identity"
                                value={selectedStep.supplementalStepId}
                              />
                              <DetailValue
                                label="Completion policy"
                                value={
                                  selectedStep.completionRequired === true
                                    ? "Required"
                                    : "Optional"
                                }
                              />
                              <DetailValue
                                label="Requested by"
                                value={selectedStep.requestedByUserId}
                              />
                              <DetailValue
                                label="Cancellation"
                                value={
                                  selectedStep.isSupplementalCancelled === true
                                    ? `${formatDateTime(
                                        selectedStep.supplementalCancelledAtUtc,
                                      )} · ${
                                        selectedStep.supplementalCancelReason ??
                                        "Cancelled"
                                      }`
                                    : "Active"
                                }
                              />
                            </Box>
                          ) : null}
                          <DetailValue
                            label="Topology"
                            value={
                              selectedStep.isTerminalNode
                                ? "Nút cuối — không có bước kế tiếp"
                                : `Bước kế tiếp: ${selectedStep.nextNodeIds.join(", ")}`
                            }
                          />
                        </Box>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
                          {canOpenDynamicFlowRuntimeAssignment(selectedStep) ? (
                            <Button
                              startIcon={<AssignmentOutlinedIcon />}
                              onClick={() =>
                                navigate(
                                  `/works/${encodeURIComponent(workId)}?tab=ASSIGN&assignmentId=${encodeURIComponent(
                                    selectedStep.assignmentId as string,
                                  )}`,
                                )
                              }
                            >
                              Mở assignment
                            </Button>
                          ) : (
                            <Button disabled startIcon={<AssignmentOutlinedIcon />}>
                              Assignment readonly/không được cấp quyền
                            </Button>
                          )}
                          {canOpenDynamicFlowRuntimeReport(selectedStep) ? (
                            <Button
                              startIcon={<SummarizeOutlinedIcon />}
                              onClick={() => selectStep(selectedStep, selectedStep.reportId)}
                            >
                              Mở báo cáo
                            </Button>
                          ) : null}
                          {canSubmitDynamicFlowRuntimeReport(selectedStep) ? (
                            <Button
                              variant="contained"
                              startIcon={<OpenInNewOutlinedIcon />}
                              onClick={() => selectStep(selectedStep, selectedStep.submitReportId)}
                            >
                              Mở báo cáo cần gửi
                            </Button>
                          ) : null}
                          {canReviewDynamicFlowRuntimeReport(selectedStep) ? (
                            <Button
                              startIcon={<FactCheckOutlinedIcon />}
                              onClick={() => selectStep(selectedStep, selectedStep.reviewReportId)}
                            >
                              Xem báo cáo cần duyệt
                            </Button>
                          ) : null}
                          {selectedStep.capabilities.canForward === true &&
                          selectedStep.assignmentId &&
                          !selectedStep.isTerminalNode ? (
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<SendOutlinedIcon />}
                              disabled={isForwarding}
                              data-testid={
                                `${forwardTestPrefix(overview.data?.archetypeId)}-forward`
                              }
                              onClick={() => void forwardSelectedStep()}
                            >
                              {isForwarding ? "Đang chuyển bước…" : "Chuyển sang bước kế tiếp"}
                            </Button>
                          ) : null}
                          {selectedStep.capabilities.canLaunchSubflow === true ? (
                            <Button
                              variant="contained"
                              color="secondary"
                              startIcon={<OpenInNewOutlinedIcon />}
                              disabled={isLaunchingSubflow}
                              data-testid="p6-t09-launch-subflow"
                              onClick={() => void launchSelectedSubflow()}
                            >
                              {isLaunchingSubflow ? "Đang khởi tạo subflow…" : "Khởi tạo subflow"}
                            </Button>
                          ) : null}
                          {overview.data?.capabilities.canManageSupplemental ===
                            true &&
                          selectedStep.isSupplemental !== true ? (
                            <>
                              <Button
                                variant="contained"
                                color="secondary"
                                disabled={isAddingSupplemental}
                                data-testid="p6-t11-add-required"
                                onClick={() =>
                                  void addSelectedSupplemental(true)
                                }
                              >
                                Thêm bước bổ sung bắt buộc
                              </Button>
                              <Button
                                disabled={isAddingSupplemental}
                                data-testid="p6-t11-add-optional"
                                onClick={() =>
                                  void addSelectedSupplemental(false)
                                }
                              >
                                Thêm bước bổ sung tùy chọn
                              </Button>
                            </>
                          ) : null}
                          {selectedStep.capabilities.canCancelSupplemental ===
                          true ? (
                            <Button
                              color="warning"
                              disabled={isCancellingSupplemental}
                              data-testid="p6-t11-cancel"
                              onClick={() => void cancelSelectedSupplemental()}
                            >
                              Hủy bước bổ sung
                            </Button>
                          ) : null}
                          {selectedStep.childInstanceId ? (
                            <Button
                              startIcon={<OpenInNewOutlinedIcon />}
                              data-testid="p6-t09-open-child"
                              onClick={() =>
                                navigate(
                                  dynamicFlowRuntimePath(
                                    workId,
                                    selectedStep.childInstanceId as string,
                                    "overview",
                                  ),
                                )
                              }
                            >
                              Mở child flow
                            </Button>
                          ) : null}
                        </Stack>
                        {subflowResult && subflowStateMatchesSelection ? (
                          <Alert severity="success" data-testid="p6-t09-launch-success">
                            Child {subflowResult.childInstanceId} đã được khởi tạo từ exact version{" "}
                            {subflowResult.childFlowVersionId}; parent đang chờ child terminal.
                          </Alert>
                        ) : null}
                        {subflowError && subflowStateMatchesSelection ? (
                          <Alert
                            severity="error"
                            action={
                              <Button
                                color="inherit"
                                size="small"
                                onClick={() => {
                                  subflowRequestRef.current = null;
                                  resetSubflow();
                                  void overview.refetch();
                                  void steps.refetch();
                                }}
                              >
                                Làm mới lệnh
                              </Button>
                            }
                          >
                            {runtimeErrorPresentation(subflowError).message}
                          </Alert>
                        ) : null}
                        {supplementalAddResult ? (
                          <Alert
                            severity="success"
                            data-testid="p6-t11-add-success"
                          >
                            Supplemental {supplementalAddResult.supplementalStepId}{" "}
                            đã được thêm với chính sách{" "}
                            {supplementalAddResult.completionRequired
                              ? "required"
                              : "optional"}.
                          </Alert>
                        ) : null}
                        {supplementalCancelResult ? (
                          <Alert
                            severity="success"
                            data-testid="p6-t11-cancel-success"
                          >
                            Supplemental{" "}
                            {supplementalCancelResult.supplementalStepId} đã bị
                            hủy và được ghi vào timeline.
                          </Alert>
                        ) : null}
                        {supplementalCancelError && !supplementalCancelMessage ? (
                          <Alert severity="error" data-testid="p6-t11-cancel-conflict">
                            {runtimeErrorPresentation(supplementalCancelError).message}
                          </Alert>
                        ) : null}
                        {forwardResult && forwardStateMatchesSelection ? (
                          <Alert
                            severity="success"
                            data-testid={
                              `${forwardTestPrefix(overview.data?.archetypeId)}-forward-success`
                            }
                          >
                            Đã ghi nhận {(forwardResult.activatedBranches?.length ?? 0) > 1
                              ? `fork ${forwardResult.activatedBranches.length} nhánh`
                              : `chuyển bước ${forwardResult.activatedTransitionId}`}; assignment tiếp theo đang
                            được materialize theo outbox.
                          </Alert>
                        ) : null}
                        {forwardMaterializationPending && forwardStateMatchesSelection ? (
                          <Alert
                            severity="info"
                            data-testid={
                              `${forwardTestPrefix(overview.data?.archetypeId)}-forward-pending`
                            }
                          >
                            Lệnh chuyển bước đã được ghi nhận, nhưng assignment kế tiếp chưa materialize.
                            Bạn vẫn ở bước hiện tại; hãy tải lại sau hoặc để recovery tiếp tục xử lý.
                          </Alert>
                        ) : null}
                        {forwardError && forwardStateMatchesSelection ? (
                          <Alert
                            severity="error"
                            action={
                              <Button
                                color="inherit"
                                size="small"
                                onClick={() => {
                                  forwardRequestRef.current = null;
                                  resetForward();
                                  void overview.refetch();
                                  void steps.refetch();
                                }}
                              >
                                Làm mới lệnh
                              </Button>
                            }
                          >
                            {runtimeErrorPresentation(forwardError).message}
                          </Alert>
                        ) : null}
                        {!canOpenDynamicFlowRuntimeReport(selectedStep) &&
                        !canSubmitDynamicFlowRuntimeReport(selectedStep) &&
                        !canReviewDynamicFlowRuntimeReport(selectedStep) ? (
                          <Alert severity="info">
                            Không có report affordance được server cấp cho actor này.
                          </Alert>
                        ) : null}
                      </Stack>
                    </CardContent>
                  </Card>
                ) : null}

                {identity.reportId ? (
                  reportAuthorized && selectedReportRow ? (
                    <Card variant="outlined" sx={{ minHeight: 420 }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                            P3 report renderer · {identity.reportId}
                          </Typography>
                          <Button
                            startIcon={<VisibilityOutlinedIcon />}
                            onClick={() => selectStep(selectedReportRow, null)}
                          >
                            Đóng báo cáo
                          </Button>
                        </Stack>
                        <Suspense fallback={<CircularProgress size={24} />}>
                          <WorkReportEditorPage
                            workId={workId}
                            reportId={identity.reportId}
                            dynamicFlowRuntimeEnabled
                            forceReadOnly={!reportWritable}
                            onBack={() => selectStep(selectedReportRow, null)}
                          />
                        </Suspense>
                      </CardContent>
                    </Card>
                  ) : (
                    <Alert severity="warning">
                      Report deep link không khớp exact reportIds/capability của step đang hiển thị; bị khóa
                      fail-closed.
                    </Alert>
                  )
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        {tab === "timeline" ? (
          <Card
            elevation={0}
            role="tabpanel"
            id="flow-panel-timeline"
            aria-labelledby="flow-tab-timeline"
            sx={{ border: "1px solid #e2e8f0", borderRadius: "8px" }}
          >
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TimelineOutlinedIcon />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Timeline
                  </Typography>
                </Stack>
                {!overview.isLoading && !timelineAllowed ? (
                  <Alert severity="warning">
                    Server không cấp canViewTimeline; timeline bị khóa fail-closed.
                  </Alert>
                ) : null}
                {timeline.isLoading && timelineRows.length === 0 ? (
                  <CircularProgress size={24} />
                ) : null}
                {timelineAllowed && !timeline.isLoading && timelineRows.length === 0 && !timeline.error ? (
                  <Alert severity="info">Timeline chưa có event hiển thị.</Alert>
                ) : null}
                <List disablePadding>
                  {timelineRows.map((event) => (
                    <ListItem key={event.eventId} divider alignItems="flex-start">
                      <ListItemText
                        primary={`#${event.sequence} · ${event.eventType}`}
                        secondary={
                          <>
                            {formatDateTime(event.occurredAtUtc)} · actor {event.actorUserId}
                            <br />
                            step {event.stepInstanceId ?? "—"} · branch {event.branchId ?? "—"} · attempt{" "}
                            {event.attemptNo ?? "—"}
                            <br />
                            {event.fromState ?? "—"} → {event.toState ?? "—"} · command {event.commandId}
                          </>
                        }
                        primaryTypographyProps={{ sx: { fontWeight: 800, overflowWrap: "anywhere" } }}
                        secondaryTypographyProps={{ component: "div", sx: { overflowWrap: "anywhere" } }}
                      />
                    </ListItem>
                  ))}
                </List>
                {timeline.data?.hasMore && timeline.data.nextCursor ? (
                  <Button
                    onClick={() => setTimelineCursor(timeline.data?.nextCursor ?? null)}
                    disabled={timeline.isFetching}
                  >
                    Tải thêm timeline
                  </Button>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Stack>
    </Box>
  );
}
