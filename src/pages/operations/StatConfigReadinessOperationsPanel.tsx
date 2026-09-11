import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";

import {
  useCancelStatConfigReadinessAdminMutation,
  useCleanupStatConfigReadinessAdminMutation,
  useGetStatConfigReadinessIndexesQuery,
  useProcessStatConfigReadinessAdminMutation,
  useResetStatConfigReadinessAdminMutation,
  useSearchStatConfigReadinessAdminQuery,
} from "../../api/statConfigApi";
import type {
  P8StatConfigMutationEnvelope,
  P8StatConfigValidationJobDiagnostics,
} from "../../api/statConfigApi";
import { AppTable } from "../../components/common/AppTable";
import type { AppTableColumn } from "../../components/common/AppTable";

const EMPTY_CONFIG_HASH =
  "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b";

type Filters = {
  q: string;
  status: string;
  ownerKind: string;
  ownerId: string;
  configId: string;
  correlationId: string;
  includeInactive: boolean;
};

const initialFilters: Filters = {
  q: "",
  status: "",
  ownerKind: "",
  ownerId: "",
  configId: "",
  correlationId: "",
  includeInactive: false,
};

const statusOptions = [
  "QUEUED",
  "RUNNING",
  "RETRYING",
  "DONE",
  "FAILED",
  "CANCELLED",
  "RESET",
] as const;

function commandId(kind: string) {
  const suffix = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `p8-ui-readiness-${kind}-${suffix}`;
}

function stateCommand(
  kind: string,
  row: P8StatConfigValidationJobDiagnostics,
): P8StatConfigMutationEnvelope<{ reason?: string | null }> {
  return {
    commandId: commandId(kind),
    expectedRevision: row.stateRevision,
    expectedConfigHash: row.stateHash,
    payload: { reason: `P8 configuration readiness ${kind} from Operations` },
  };
}

function compact(value: string | null | undefined, length = 18) {
  if (!value) return "—";
  if (value.length <= length) return value;
  const side = Math.max(4, Math.floor((length - 1) / 2));
  return `${value.slice(0, side)}…${value.slice(-side)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleString("vi-VN");
}

function statusColor(status: string) {
  switch (status) {
    case "DONE":
      return "success" as const;
    case "FAILED":
      return "error" as const;
    case "RUNNING":
      return "info" as const;
    case "RETRYING":
    case "RESET":
      return "warning" as const;
    default:
      return "default" as const;
  }
}

function errorText(error: unknown) {
  if (!error || typeof error !== "object") return "Không thể hoàn tất thao tác.";
  const record = error as Record<string, unknown>;
  const data = record.data && typeof record.data === "object"
    ? record.data as Record<string, unknown>
    : record;
  return String(data.message ?? data.errorCode ?? data.code ?? "Không thể hoàn tất thao tác.");
}

export function StatConfigReadinessOperationsPanel() {
  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [applied, setApplied] = useState<Filters>(initialFilters);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [notice, setNotice] = useState<
    { severity: "error" | "info" | "success" | "warning"; text: string } | null
  >(null);

  const searchArgs = useMemo(() => ({
    q: applied.q.trim() || undefined,
    status: applied.status || undefined,
    ownerKind: applied.ownerKind.trim() || undefined,
    ownerId: applied.ownerId.trim() || undefined,
    configId: applied.configId.trim() || undefined,
    correlationId: applied.correlationId.trim() || undefined,
    includeInactive: applied.includeInactive,
    page,
    pageSize,
  }), [applied, page, pageSize]);

  const jobsQuery = useSearchStatConfigReadinessAdminQuery(searchArgs);
  const indexesQuery = useGetStatConfigReadinessIndexesQuery();
  const [processJobs, processState] = useProcessStatConfigReadinessAdminMutation();
  const [resetJob, resetState] = useResetStatConfigReadinessAdminMutation();
  const [cancelJob, cancelState] = useCancelStatConfigReadinessAdminMutation();
  const [cleanupJobs, cleanupState] = useCleanupStatConfigReadinessAdminMutation();
  const busy = processState.isLoading || resetState.isLoading ||
    cancelState.isLoading || cleanupState.isLoading;

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setNotice(null);
    try {
      await action();
      setNotice({ severity: "success", text: success });
    } catch (error) {
      setNotice({ severity: "error", text: errorText(error) });
    }
  };

  const handleReset = (row: P8StatConfigValidationJobDiagnostics) => {
    void runAction(
      () => resetJob({
        jobId: row.safeStatus.jobId,
        body: stateCommand("reset", row),
      }).unwrap(),
      `Đã reset readiness job ${compact(row.safeStatus.jobId)}.`,
    );
  };

  const handleCancel = (row: P8StatConfigValidationJobDiagnostics) => {
    void runAction(
      () => cancelJob({
        jobId: row.safeStatus.jobId,
        body: stateCommand("cancel", row),
      }).unwrap(),
      `Đã hủy readiness job ${compact(row.safeStatus.jobId)}.`,
    );
  };

  const columns = useMemo<AppTableColumn<P8StatConfigValidationJobDiagnostics>[]>(() => [
    {
      field: "createdAtUtc",
      header: "Tạo lúc",
      width: 170,
      render: (row) => formatDate(row.safeStatus.createdAtUtc),
    },
    {
      field: "status",
      header: "Trạng thái",
      width: 125,
      render: (row) => (
        <Chip
          size="small"
          color={statusColor(row.safeStatus.status)}
          label={row.safeStatus.status}
        />
      ),
    },
    {
      field: "owner",
      header: "Owner",
      width: 210,
      render: (row) => (
        <span title={`${row.safeStatus.ownerKind}/${row.safeStatus.ownerId}`}>
          {row.safeStatus.ownerKind} · {compact(row.safeStatus.ownerId)}
        </span>
      ),
    },
    {
      field: "configId",
      header: "Config / version",
      width: 210,
      render: (row) => (
        <span title={`${row.safeStatus.configId}/${row.safeStatus.versionId}`}>
          {compact(row.safeStatus.configId)} · v{row.safeStatus.versionNo}
        </span>
      ),
    },
    {
      field: "retryCount",
      header: "Retry",
      width: 80,
      render: (row) => `${row.safeStatus.retryCount}/${row.safeStatus.maxRetryCount}`,
    },
    {
      field: "safeMessage",
      header: "Thông báo an toàn",
      render: (row) => row.safeStatus.safeMessage || row.safeStatus.safeCode || "—",
    },
    {
      field: "diagnostics",
      header: "Chẩn đoán admin",
      render: (row) => (
        <Stack spacing={0.25}>
          <span>{row.diagnosticCode || "—"}</span>
          <Typography variant="caption" color="text.secondary" title={row.diagnosticMessage ?? undefined}>
            {row.diagnosticMessage ? compact(row.diagnosticMessage, 52) : "Không có chi tiết"}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "actions",
      header: "Điều khiển",
      width: 170,
      render: (row) => (
        <Stack direction="row" spacing={0.75}>
          <Button
            size="small"
            onClick={() => handleReset(row)}
            disabled={busy || !["FAILED", "CANCELLED"].includes(row.safeStatus.status)}
          >
            Reset
          </Button>
          <Button
            size="small"
            color="warning"
            onClick={() => handleCancel(row)}
            disabled={busy || !["QUEUED", "RUNNING", "RETRYING", "RESET"].includes(row.safeStatus.status)}
          >
            Hủy
          </Button>
        </Stack>
      ),
    },
  ], [busy]);

  const applyFilters = () => {
    setPage(0);
    setApplied(draft);
  };

  const handleProcess = () => {
    void runAction(async () => {
      const response = await processJobs({ maxJobs: 10 }).unwrap();
      return response;
    }, "Đã xử lý hàng đợi readiness theo giới hạn 10 job.");
  };

  const handleDryRunCleanup = () => {
    void runAction(
      () => cleanupJobs({
        commandId: commandId("cleanup-dry-run"),
        expectedRevision: 0,
        expectedConfigHash: EMPTY_CONFIG_HASH,
        payload: {
          completedBeforeUtc: new Date().toISOString(),
          limit: 100,
          dryRun: true,
        },
      }).unwrap(),
      "Đã xem trước cleanup; chưa xóa readiness job nào.",
    );
  };

  return (
    <Stack spacing={2} data-testid="stat-config-readiness-operations">
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="h6" fontWeight={800}>Readiness cấu hình thống kê</Typography>
            <Typography variant="body2" color="text.secondary">
              Chỉ kiểm tra bundle cấu hình và dependency pins; không tạo dataset hay kết quả thống kê.
            </Typography>
          </Box>

          {indexesQuery.isLoading ? <LinearProgress /> : null}
          {indexesQuery.isError ? (
            <Alert severity="error">Không đọc được readiness của index contract.</Alert>
          ) : indexesQuery.data ? (
            <Alert severity={indexesQuery.data.ready ? "success" : "warning"}>
              Index contract: {indexesQuery.data.ready ? "READY" : "NOT READY"} · {indexesQuery.data.indexes.length} index · hash {compact(indexesQuery.data.contractHash)}
            </Alert>
          ) : null}

          <Stack direction={{ xs: "column", lg: "row" }} spacing={1} useFlexGap flexWrap="wrap">
            <TextField
              size="small"
              label="Tìm kiếm"
              value={draft.q}
              onChange={(event) => setDraft((value) => ({ ...value, q: event.target.value }))}
            />
            <TextField
              select
              size="small"
              label="Trạng thái"
              value={draft.status}
              onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value }))}
              sx={{ minWidth: 145 }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              {statusOptions.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
            </TextField>
            <TextField
              size="small"
              label="Owner kind"
              value={draft.ownerKind}
              onChange={(event) => setDraft((value) => ({ ...value, ownerKind: event.target.value }))}
            />
            <TextField
              size="small"
              label="Owner ID"
              value={draft.ownerId}
              onChange={(event) => setDraft((value) => ({ ...value, ownerId: event.target.value }))}
            />
            <TextField
              size="small"
              label="Config ID"
              value={draft.configId}
              onChange={(event) => setDraft((value) => ({ ...value, configId: event.target.value }))}
            />
            <TextField
              size="small"
              label="Correlation ID"
              value={draft.correlationId}
              onChange={(event) => setDraft((value) => ({ ...value, correlationId: event.target.value }))}
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={draft.includeInactive}
                  onChange={(event) => setDraft((value) => ({ ...value, includeInactive: event.target.checked }))}
                />
              )}
              label="Gồm job không active"
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" onClick={applyFilters}>Áp dụng bộ lọc</Button>
            <Button onClick={() => void jobsQuery.refetch()} disabled={jobsQuery.isFetching}>Tải lại</Button>
            <Button onClick={handleProcess} disabled={busy}>Xử lý tối đa 10 job</Button>
            <Button onClick={handleDryRunCleanup} disabled={busy}>Xem trước cleanup</Button>
          </Stack>
        </Stack>
      </Paper>

      {notice ? <Alert severity={notice.severity}>{notice.text}</Alert> : null}
      {jobsQuery.isFetching ? <LinearProgress /> : null}
      {jobsQuery.isError ? (
        <Alert severity="error">{errorText(jobsQuery.error)}</Alert>
      ) : null}

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <AppTable
          rows={jobsQuery.data?.rows ?? []}
          columns={columns}
          rowKey={(row) => row.safeStatus.jobId}
          enablePagination
          paginationMode="server"
          page={jobsQuery.data?.page ?? page}
          pageSize={jobsQuery.data?.pageSize ?? pageSize}
          totalRows={jobsQuery.data?.totalRows ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPage(0);
            setPageSize(value);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Stack>
  );
}
