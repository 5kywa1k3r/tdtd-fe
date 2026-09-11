import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  createStatRun,
  getStatRunJob,
  getStatRunResult,
  type StatRunCanonicalResult,
  type StatRunCapabilityId,
  type StatRunCreateRequest,
  type StatRunExportCreateRequest,
  type StatRunExport,
  type StatRunJob,
  type StatRunResultKind,
} from "../../../api/statRunApi";
import DomainContextStrip from "../../../components/navigation/DomainContextStrip";
import { dynamicFormPath } from "../../../routes/dynamicFormRoutes";
import { dynamicFlowRuntimePath, dynamicFlowVersionPath } from "../../../routes/dynamicFlowRoutes";
import { getApiErrorMessage } from "../../../utils/apiError";
import { CanonicalResultPanel, StatRunExportPanel } from "./StatRunResultPanels";
import { StatRunStateView } from "./StatRunStateView";
import {
  canTriggerDirectReconciliation,
  canonicalDirectReconciliationIdentity,
  directReconciliationWorkspacePath,
  isPollingState,
  resultKindForJob,
  stateFromError,
  stateFromJob,
  stateFromResult,
  statRunJobPath,
  statRunResultPath,
  type StatRunUiState,
} from "./statRunUiModel";

const CAPABILITIES: StatRunCapabilityId[] = [
  "DIRECT_FIELD_TABLE_LABEL",
  "BASIC_SUMMARY",
  "ADVANCED_SUMMARY",
  "DIFF",
  "FLOW_SCOPES",
];

const RESULT_KINDS: StatRunResultKind[] = [
  "DIRECT_FIELD",
  "DIRECT_TABLE",
  "DIRECT_LABEL",
  "BASIC",
  "ADVANCED",
  "DIFF",
  "FLOW",
];

function valueRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function dateTime(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("vi-VN");
}

function shortHash(value: unknown) {
  return typeof value === "string" && value ? `${value.slice(0, 12)}…${value.slice(-8)}` : "—";
}

function RunFrame({
  workId,
  scopeAssignmentId,
  title,
  children,
}: {
  workId: string;
  scopeAssignmentId: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Stack
      spacing={2}
      sx={{ p: { xs: 1.25, sm: 2, lg: 2.5 }, maxWidth: 1500, mx: "auto", width: "100%", boxSizing: "border-box" }}
      data-boundary="P9_STAT_RUN_ONLY"
    >
      <DomainContextStrip
        ariaLabel="Ngữ cảnh thống kê"
        breadcrumbs={[
          { label: "Công việc", to: `/works/${encodeURIComponent(workId)}` },
          { label: "Thống kê" },
          { label: title },
        ]}
        items={[
          { label: "Work", value: workId },
          { label: "Scope assignment", value: scopeAssignmentId },
          { label: "Bề mặt", value: title },
          { label: "Quyền", value: "Dữ liệu và CTA do máy chủ quyết định" },
        ]}
      />
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack spacing={1.25}>
          <Button
            component={RouterLink}
            to={`/works/${encodeURIComponent(workId)}`}
            startIcon={<ArrowBackRoundedIcon />}
            sx={{ alignSelf: "flex-start" }}
          >
            Quay lại công việc
          </Button>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography component="h1" variant="h5" fontWeight={850}>{title}</Typography>
              <Typography variant="body2" color="text.secondary">
                Work {workId} · scope {scopeAssignmentId} · dữ liệu và quyền do máy chủ quyết định
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" color="primary" label="LẦN CHẠY / KẾT QUẢ" />
              <Chip size="small" variant="outlined" label="SERVER CANONICAL" />
              <Chip size="small" variant="outlined" label="READ AUTH EACH REQUEST" />
            </Stack>
          </Stack>
          <Divider />
          <Stack component="nav" aria-label="Điều hướng thống kê" direction="row" spacing={2} useFlexGap flexWrap="wrap">
            <Link component={RouterLink} to={`/works/${encodeURIComponent(workId)}/statistics/${encodeURIComponent(scopeAssignmentId)}/runs`}>
              Lần chạy
            </Link>
            <Link component={RouterLink} to={`/works/${encodeURIComponent(workId)}/statistics/${encodeURIComponent(scopeAssignmentId)}/config`}>
              Cấu hình
            </Link>
            <Link component={RouterLink} to={`/works/${encodeURIComponent(workId)}/statistics/${encodeURIComponent(scopeAssignmentId)}/reconciliations`}>
              Đối soát
            </Link>
          </Stack>
        </Stack>
      </Paper>
      {children}
    </Stack>
  );
}

function DomainIdentityValue({ kind, label, value, to }: {
  kind: string;
  label: string;
  value: string | number | null | undefined;
  to?: string | null;
}) {
  const shown = value === null || value === undefined || value === "" ? "Not applicable" : String(value);
  return <Box component="div">
    <Typography component="dt" variant="caption" color="text.secondary">{label}</Typography>
    <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: "anywhere" }}
      data-domain-kind={kind} data-domain-id={shown}>
      {to && shown !== "Not applicable"
        ? <Link component={RouterLink} to={to} data-domain-link={kind}>{shown}</Link>
        : shown}
    </Typography>
  </Box>;
}

function StatRunDomainProof({ job, resultLink }: {
  job: StatRunJob;
  resultLink: string | null;
}) {
  const workPath = `/works/${encodeURIComponent(job.workId)}`;
  const configPath = `${workPath}/statistics/${encodeURIComponent(job.scopeId || "")}/config`;
  const flowVersionPath = job.flowTemplateId && job.flowTemplateVersionId
    ? dynamicFlowVersionPath(job.flowTemplateId, job.flowTemplateVersionId)
    : null;
  const flowRuntimePath = job.flowInstanceId
    ? dynamicFlowRuntimePath(job.workId, job.flowInstanceId, "overview", {
      stepInstanceId: job.flowStepInstanceId,
      branchId: job.flowBranchId,
      attemptNo: job.flowAttemptNo,
      assignmentId: job.scopeId,
      reportId: job.sourceReportId,
    })
    : null;
  const runPath = statRunJobPath(job.workId, job.scopeId || "", job.jobId);
  return <>
    <Box component="section" aria-labelledby="stat-run-domain-identities-title"
      data-domain-identities>
      <Typography id="stat-run-domain-identities-title" component="h3" variant="subtitle1">
        Chuỗi identity nghiệp vụ
      </Typography>
      <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1 }}>
        <DomainIdentityValue kind="statistics-config" label="Statistics configuration (config)" value={job.configId} to={configPath} />
        <DomainIdentityValue kind="statistics-config-version" label="Statistics configuration version (version)" value={job.configVersionId} to={configPath} />
        <DomainIdentityValue kind="dynamic-form-version" label="Dynamic Form version (version)" value={job.dynamicFormTemplateId} to={dynamicFormPath(job.dynamicFormTemplateId)} />
        <DomainIdentityValue kind="dynamic-flow-version" label="Dynamic Flow version (version)" value={job.flowTemplateVersionId} to={flowVersionPath} />
        <DomainIdentityValue kind="dynamic-flow-instance" label="Dynamic Flow instance (instance)" value={job.flowInstanceId} to={flowRuntimePath} />
        <DomainIdentityValue kind="dynamic-flow-step" label="Dynamic Flow step (step)" value={job.flowStepId} to={flowRuntimePath} />
        <DomainIdentityValue kind="work-assignment" label="Work assignment (assignment)" value={job.scopeId} to={flowRuntimePath || workPath} />
        <DomainIdentityValue kind="source-report" label="Source report (report)" value={job.sourceReportId} to={flowRuntimePath || workPath} />
        <DomainIdentityValue kind="statistics-run" label="Statistics job (run)" value={job.jobId} to={runPath} />
        <DomainIdentityValue kind="statistics-result" label="Statistics result (result)" value={job.projectionRunId} to={resultLink || runPath} />
        <DomainIdentityValue kind="statistics-result-generation" label="Statistics result generation" value={job.generationId} to={resultLink} />
      </Box>
    </Box>
    <Box component="section" aria-labelledby="stat-run-timeline-title"
      data-stat-run-timeline data-terminal-status={job.status} data-state-revision={job.stateRevision}>
      <Typography id="stat-run-timeline-title" component="h3" variant="subtitle1">Vòng đời job từ máy chủ</Typography>
      <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1 }}>
        {[
          ["created", "Tạo", job.createdAtUtc],
          ["started", "Bắt đầu", job.startedAtUtc],
          ["computed", "Tính xong", job.computedAtUtc],
          ["completed", "Hoàn tất", job.completedAtUtc],
          ["updated", "Cập nhật", job.updatedAtUtc],
        ].map(([event, label, value]) => <Box component="div" key={event}>
          <Typography component="dt" variant="caption" color="text.secondary">{label}</Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0 }}>
            <time data-lifecycle-event={event} dateTime={value || undefined}>{dateTime(value)}</time>
          </Typography>
        </Box>)}
      </Box>
    </Box>
  </>;
}

type RunForm = {
  capabilityId: StatRunCapabilityId;
  sourceReportId: string;
  dynamicFormTemplateId: string;
  configRevision: string;
  configHash: string;
  sourceRevision: string;
  sourceHash: string;
  lifecycleRevision: string;
  periodKey: string;
  periodInstanceKey: string;
  periodKind: string;
  periodStart: string;
  periodEnd: string;
};

const INITIAL_RUN_FORM: RunForm = {
  capabilityId: "DIRECT_FIELD_TABLE_LABEL",
  sourceReportId: "",
  dynamicFormTemplateId: "",
  configRevision: "",
  configHash: "",
  sourceRevision: "",
  sourceHash: "",
  lifecycleRevision: "",
  periodKey: "",
  periodInstanceKey: "",
  periodKind: "ONCE",
  periodStart: "",
  periodEnd: "",
};

export function StatisticsRunsPage() {
  const { workId = "", scopeAssignmentId = "" } = useParams<{ workId: string; scopeAssignmentId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<RunForm>(INITIAL_RUN_FORM);
  const [jobLookup, setJobLookup] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const update = (key: keyof RunForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const request: StatRunCreateRequest = {
      commandId: crypto.randomUUID(),
      workId,
      scopeType: "ASSIGNMENT",
      scopeId: scopeAssignmentId,
      sourceReportId: form.sourceReportId.trim(),
      dynamicFormTemplateId: form.dynamicFormTemplateId.trim(),
      expectedConfigRevision: Number(form.configRevision),
      expectedConfigHash: form.configHash.trim(),
      expectedSourceRevision: Number(form.sourceRevision),
      expectedSourceHash: form.sourceHash.trim(),
      expectedLifecycleRevision: Number(form.lifecycleRevision),
      period: {
        periodKey: form.periodKey.trim(),
        periodInstanceKey: form.periodInstanceKey.trim(),
        periodKind: form.periodKind.trim(),
        periodStart: form.periodStart.trim() || null,
        periodEnd: form.periodEnd.trim() || null,
      },
    };
    try {
      const job = await createStatRun(form.capabilityId, request);
      navigate(statRunJobPath(workId, scopeAssignmentId, job.jobId));
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  };

  const routeMissing = !workId || !scopeAssignmentId;
  return (
    <RunFrame workId={workId} scopeAssignmentId={scopeAssignmentId} title="Chạy thống kê">
      {routeMissing ? <StatRunStateView state="UNSUPPORTED" detail="Route thiếu workId hoặc scopeAssignmentId." /> : null}
      {error ? <StatRunStateView state={stateFromError(error)} detail={getApiErrorMessage(error)} onRetry={() => setError(null)} /> : null}
      <Paper component="form" onSubmit={submit} variant="outlined" sx={{ p: 2 }} aria-labelledby="run-form-title">
        <Stack spacing={2}>
          <Box>
            <Typography id="run-form-title" component="h2" variant="h6">Khởi chạy với pin chính xác</Typography>
            <Typography variant="body2" color="text.secondary">
              Các giá trị pin bắt buộc được gửi nguyên vẹn; máy chủ sẽ xác thực capability, quyền, config và source.
            </Typography>
          </Box>
          <FormControl fullWidth>
            <InputLabel id="capability-label">Capability</InputLabel>
            <Select
              labelId="capability-label"
              label="Capability"
              value={form.capabilityId}
              onChange={(event) => update("capabilityId", event.target.value)}
            >
              {CAPABILITIES.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
            <TextField required label="Source report ID" value={form.sourceReportId} onChange={(e) => update("sourceReportId", e.target.value)} />
            <TextField required label="Dynamic Form template ID" value={form.dynamicFormTemplateId} onChange={(e) => update("dynamicFormTemplateId", e.target.value)} />
            <TextField required type="number" label="Config revision" value={form.configRevision} onChange={(e) => update("configRevision", e.target.value)} />
            <TextField required label="Config SHA-256" inputProps={{ minLength: 64, maxLength: 64 }} value={form.configHash} onChange={(e) => update("configHash", e.target.value)} />
            <TextField required type="number" label="Source revision" value={form.sourceRevision} onChange={(e) => update("sourceRevision", e.target.value)} />
            <TextField required label="Source SHA-256" inputProps={{ minLength: 64, maxLength: 64 }} value={form.sourceHash} onChange={(e) => update("sourceHash", e.target.value)} />
            <TextField required type="number" label="Lifecycle revision" value={form.lifecycleRevision} onChange={(e) => update("lifecycleRevision", e.target.value)} />
            <TextField required label="Period kind" value={form.periodKind} onChange={(e) => update("periodKind", e.target.value)} />
            <TextField required label="Period key" value={form.periodKey} onChange={(e) => update("periodKey", e.target.value)} />
            <TextField required label="Period instance key" value={form.periodInstanceKey} onChange={(e) => update("periodInstanceKey", e.target.value)} />
            <TextField label="Period start UTC" placeholder="2026-08-22T00:00:00Z" value={form.periodStart} onChange={(e) => update("periodStart", e.target.value)} />
            <TextField label="Period end UTC" placeholder="2026-08-31T00:00:00Z" value={form.periodEnd} onChange={(e) => update("periodEnd", e.target.value)} />
          </Box>
          <Button type="submit" variant="contained" startIcon={<PlayArrowRoundedIcon />} disabled={routeMissing || submitting} sx={{ alignSelf: "flex-start" }}>
            {submitting ? "Đang gửi…" : "Khởi chạy"}
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography component="h2" variant="h6">Mở job bằng deep link</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField fullWidth label="Job ID" value={jobLookup} onChange={(event) => setJobLookup(event.target.value)} />
            <Button
              variant="outlined"
              disabled={!jobLookup.trim()}
              onClick={() => navigate(statRunJobPath(workId, scopeAssignmentId, jobLookup.trim()))}
            >
              Mở job
            </Button>
          </Stack>
          <StatRunStateView state="EMPTY" detail="Route danh sách không tự suy ra job; hãy khởi chạy hoặc mở một job ID đã biết." />
        </Stack>
      </Paper>
    </RunFrame>
  );
}

export function StatisticsRunDetailPage() {
  const { workId = "", scopeAssignmentId = "", runId = "" } = useParams<{ workId: string; scopeAssignmentId: string; runId: string }>();
  const [job, setJob] = useState<StatRunJob | null>(null);
  const [state, setState] = useState<StatRunUiState>("LOADING");
  const [error, setError] = useState<unknown>(null);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!runId) { setState("UNSUPPORTED"); return; }
    try {
      const loaded = await getStatRunJob(runId);
      if (loaded.workId !== workId || (loaded.scopeId && loaded.scopeId !== scopeAssignmentId)) {
        setJob(null);
        setState("FORBIDDEN");
        return;
      }
      setJob(loaded);
      setState(stateFromJob(loaded));
      setError(null);
    } catch (caught) {
      setJob(null);
      setError(caught);
      setState(stateFromError(caught));
    }
  }, [runId, scopeAssignmentId, workId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (timer.current) window.clearInterval(timer.current);
    if (isPollingState(state)) timer.current = window.setInterval(() => void load(), 2000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [load, state]);

  const resultLink = job?.generationId ? (() => {
    const params = new URLSearchParams({
      dynamicFormTemplateId: job.dynamicFormTemplateId,
      scopeType: job.scopeType,
      periodKey: job.periodKey,
      periodInstanceKey: job.periodInstanceKey,
      resultHash: job.generationHash || "",
      configHash: job.configHash,
      sourceHash: job.sourceHash,
      lifecycleRevision: String(job.lifecycleRevision),
    });
    return `${statRunResultPath(workId, scopeAssignmentId, resultKindForJob(job), job.generationId)}?${params}`;
  })() : null;

  return (
    <RunFrame workId={workId} scopeAssignmentId={scopeAssignmentId} title="Chi tiết job thống kê">
      <StatRunStateView state={state} detail={error ? getApiErrorMessage(error) : job?.staleReason || job?.diagnosticCode} onRetry={load} />
      {job ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
              <Box>
                <Typography component="h2" variant="h6">{job.runKind}</Typography>
                <Typography variant="body2">Job {job.jobId} · Run {job.runId}</Typography>
              </Box>
              <Button startIcon={<RefreshRoundedIcon />} onClick={load}>Tải lại</Button>
            </Stack>
            <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 1.5 }}>
              {[
                ["Trạng thái", job.status], ["Freshness", job.freshnessState], ["Retry", job.retryCount],
                ["Config", `${job.configId} v${job.configVersionNo} r${job.configRevision}`],
                ["Config hash", shortHash(job.configHash)], ["Source hash", shortHash(job.sourceHash)],
                ["State hash", shortHash(job.stateHash)], ["Generation hash", shortHash(job.generationHash)],
                ["Period", `${job.periodKind} · ${job.periodInstanceKey}`], ["Bắt đầu", dateTime(job.startedAtUtc)],
                ["Hoàn tất", dateTime(job.completedAtUtc)], ["Candidate", `${job.candidateChainId} · ${job.catalogVersion}`],
              ].map(([label, value]) => (
                <Box key={String(label)}>
                  <Typography component="dt" variant="caption" color="text.secondary">{label}</Typography>
                  <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: "anywhere" }}>{String(value ?? "—")}</Typography>
                </Box>
              ))}
            </Box>
            <StatRunDomainProof job={job} resultLink={resultLink} />
            {resultLink ? <Button component={RouterLink} to={resultLink} variant="contained" sx={{ alignSelf: "flex-start" }}>Mở kết quả</Button> : null}
            <Alert severity="info">Các thao tác vận hành đặc quyền nằm ở route operations riêng và tiếp tục được máy chủ kiểm quyền.</Alert>
          </Stack>
        </Paper>
      ) : null}
    </RunFrame>
  );
}

function resultPins(result: StatRunCanonicalResult | null, resultId: string) {
  const metadata = valueRecord(result?.metadata);
  const publications = Array.isArray(metadata?.publications) ? metadata.publications.map(valueRecord).filter(Boolean) as Record<string, unknown>[] : [];
  const publication = publications.find((pin) => pin.runId === resultId || pin.generationId === resultId) || publications[0];
  const meta = valueRecord(result?.meta);
  return {
    resultHash: String(publication?.generationHash || result?.resultHash || ""),
    configHash: String(publication?.configHash || result?.configHash || meta?.configHash || ""),
    sourceHash: String(publication?.sourcePayloadHash || meta?.sourceSignatureHash || ""),
    lifecycleRevision: Number(publication?.sourceLifecycleRevision ?? -1),
  };
}

export function StatisticsResultPage() {
  const { workId = "", scopeAssignmentId = "", resultKind: rawKind = "", resultId = "" } = useParams<{
    workId: string; scopeAssignmentId: string; resultKind: string; resultId: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const resultKind = rawKind.toUpperCase() as StatRunResultKind;
  const page = Math.max(0, Number(searchParams.get("page") || 0));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || 50)));
  const [result, setResult] = useState<StatRunCanonicalResult | null>(null);
  const [state, setState] = useState<StatRunUiState>("LOADING");
  const [error, setError] = useState<unknown>(null);
  const [reconciliationExport, setReconciliationExport] =
    useState<StatRunExport | null>(null);

  const query = useMemo(() => ({
    resultKind,
    resultId,
    workId,
    scopeAssignmentId,
    page,
    pageSize,
    dynamicFormTemplateId: searchParams.get("dynamicFormTemplateId"),
    scopeType: searchParams.get("scopeType"),
    periodKey: searchParams.get("periodKey"),
    periodInstanceKey: searchParams.get("periodInstanceKey"),
    fieldId: searchParams.get("fieldId"),
    fieldKey: searchParams.get("fieldKey"),
    blockId: searchParams.get("blockId"),
    metricKey: searchParams.get("metricKey"),
    labelCode: searchParams.get("labelCode"),
    bucketKey: searchParams.get("bucketKey"),
    startDayKey: searchParams.get("startDayKey"),
    endDayKey: searchParams.get("endDayKey"),
    advancedConfigId: searchParams.get("configId"),
    sourceScopeMode: searchParams.get("sourceScopeMode") as
      | "FLOW_BRANCH"
      | "FLOW_STEP"
      | "FLOW_EFFECTIVE_PATH"
      | "FLOW_FINAL"
      | null,
    sourceFlowInstanceId: searchParams.get("sourceFlowInstanceId"),
    sourceFlowStepId: searchParams.get("sourceFlowStepId"),
    sourceFlowBranchId: searchParams.get("sourceFlowBranchId"),
    sourceFlowEffectiveStatus: searchParams.get("sourceFlowEffectiveStatus"),
  }), [page, pageSize, resultId, resultKind, scopeAssignmentId, searchParams, workId]);

  const load = useCallback(async () => {
    if (!RESULT_KINDS.includes(resultKind) || !resultId || !workId || !scopeAssignmentId) {
      setState("UNSUPPORTED");
      return;
    }
    setState("LOADING");
    try {
      const loaded = await getStatRunResult(query);
      setResult(loaded);
      setState(stateFromResult(loaded));
      setError(null);
    } catch (caught) {
      setResult(null);
      setError(caught);
      setState(stateFromError(caught));
    }
  }, [query, resultId, resultKind, scopeAssignmentId, workId]);

  useEffect(() => { void load(); }, [load]);
  const pins = resultPins(result, resultId);
  const missingPins = [
    !/^[a-f0-9]{64}$/i.test(pins.resultHash) ? "resultHash" : "",
    !/^[a-f0-9]{64}$/i.test(pins.configHash) ? "configHash" : "",
    !/^[a-f0-9]{64}$/i.test(pins.sourceHash) ? "sourceHash" : "",
    pins.lifecycleRevision < 0 ? "lifecycleRevision" : "",
  ].filter(Boolean);
  const reconciliationIdentity = useMemo(
    () => canonicalDirectReconciliationIdentity(result, resultId),
    [result, resultId],
  );
  const canOpenReconciliationWorkspace = canTriggerDirectReconciliation(
    resultKind,
    state,
    reconciliationIdentity,
  );
  const reconciliationExportId = reconciliationExport &&
    ["COMPLETED", "READY"].includes(reconciliationExport.status.toUpperCase()) &&
    reconciliationExport.workId === workId &&
    reconciliationExport.scopeId === scopeAssignmentId &&
    reconciliationExport.resultKind.toUpperCase() === resultKind &&
    reconciliationExport.resultId === resultId &&
    new Date(reconciliationExport.expiresAtUtc).getTime() > Date.now()
    ? reconciliationExport.exportId
    : null;
  const reconciliationWorkspaceHref = canOpenReconciliationWorkspace
    ? directReconciliationWorkspacePath(
      workId,
      scopeAssignmentId,
      resultKind,
      reconciliationIdentity,
      {
        periodInstanceKey: query.periodInstanceKey,
        fieldId: query.fieldId,
        fieldKey: query.fieldKey,
        bucketKey: query.bucketKey,
        periodKey: reconciliationIdentity?.periodKey,
      },
      reconciliationExportId,
    )
    : null;
  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
  };

  const buildExportRequest = (format: "CSV" | "XLSX"): StatRunExportCreateRequest => ({
    commandId: crypto.randomUUID(),
    format,
    resultKind,
    workId,
    scopeType: searchParams.get("scopeType") || "ASSIGNMENT",
    scopeId: scopeAssignmentId,
    periodInstanceKey: searchParams.get("periodInstanceKey"),
    resultId,
    expectedResultHash: pins.resultHash,
    expectedConfigHash: pins.configHash,
    expectedSourceHash: pins.sourceHash,
    expectedLifecycleRevision: pins.lifecycleRevision,
    filters: {
      dynamicFormTemplateId: searchParams.get("dynamicFormTemplateId"),
      fieldId: searchParams.get("fieldId"), fieldKey: searchParams.get("fieldKey"),
      blockId: searchParams.get("blockId"), metricKey: searchParams.get("metricKey"),
      labelCode: searchParams.get("labelCode"), periodKey: searchParams.get("periodKey"),
      bucketKey: searchParams.get("bucketKey"),
    },
  });

  return (
    <RunFrame workId={workId} scopeAssignmentId={scopeAssignmentId} title={`Kết quả ${resultKind || "thống kê"}`}>
      <StatRunStateView state={state} detail={error ? getApiErrorMessage(error) : undefined} onRetry={load} />
      {result ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography component="h2" variant="h6">Identity và freshness pin</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap"
              data-stat-result-identity
              data-generation-id={reconciliationIdentity?.generationId || resultId}
              data-projection-run-id={reconciliationIdentity?.p9RunId || undefined}
              data-concept-key={reconciliationIdentity?.conceptKey || undefined}
              data-period-key={reconciliationIdentity?.periodKey || undefined}
              data-grain={reconciliationIdentity?.grain || undefined}>
              <Chip label={`Result ${resultId}`} variant="outlined" />
              <Chip label={`Result hash ${shortHash(pins.resultHash)}`} variant="outlined" />
              <Chip label={`Config hash ${shortHash(pins.configHash)}`} variant="outlined" />
              <Chip label={`Source hash ${shortHash(pins.sourceHash)}`} variant="outlined" />
              <Chip label={`Lifecycle r${pins.lifecycleRevision}`} variant="outlined" />
            </Stack>
            {reconciliationIdentity ? <Typography variant="body2">
              Projection {reconciliationIdentity.p9RunId} · concept {reconciliationIdentity.conceptKey} · period {reconciliationIdentity.periodKey} · grain {reconciliationIdentity.grain}
            </Typography> : null}
          </Stack>
        </Paper>
      ) : null}
      {result && state === "READY" ? (
        <CanonicalResultPanel result={result} page={page} pageSize={pageSize} onPageChange={changePage} />
      ) : null}
      {result && state === "READY" ? <StatRunExportPanel
        buildRequest={buildExportRequest}
        missingPins={missingPins}
        onReadyExportChange={setReconciliationExport}
      /> : null}
      {result && state === "READY" &&
        ["DIRECT_FIELD", "DIRECT_TABLE", "DIRECT_LABEL"].includes(resultKind) &&
        !reconciliationIdentity ? <Alert severity="warning" data-testid="reconciliation-identity-unavailable">
          Máy chủ chưa cung cấp một identity đối soát canonical duy nhất; thao tác tạo đối soát bị khóa.
        </Alert> : null}
      {result && canOpenReconciliationWorkspace ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1} alignItems="flex-start">
            <Typography component="h2" variant="h6">Đối soát kết quả DIRECT</Typography>
            <Typography variant="body2">
              Chọn một export hoàn tất của result hiện tại, sau đó mở workspace đối soát.
              Workspace sẽ yêu cầu máy chủ cấp capture-plan token trước khi tạo.
            </Typography>
            {reconciliationWorkspaceHref ? (
              <Button
                component={RouterLink}
                to={reconciliationWorkspaceHref}
                variant="contained"
              >
                Mở workspace đối soát
              </Button>
            ) : (
              <Alert severity="info">
                Hãy tạo một export DIRECT_FIELD hoàn tất với exact filter hiện tại để tiếp tục.
              </Alert>
            )}
          </Stack>
        </Paper>
      ) : null}
    </RunFrame>
  );
}
