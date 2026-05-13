import HistoryIcon from "@mui/icons-material/History";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import ReplayIcon from "@mui/icons-material/Replay";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useGetMeQuery } from "../../api/base/meApi";
import {
  useProcessActionLogRetryJobsMutation,
  useProcessProjectionRetryJobsMutation,
  useProcessStatisticRebuildJobsMutation,
  useSearchActionLogRetryJobsQuery,
  useSearchActionLogsQuery,
  useSearchJobOperationLogsQuery,
  useSearchMaterializeJobsQuery,
  useSearchProjectionRetryJobsQuery,
  useSearchStatisticRebuildJobsQuery,
} from "../../api/operationsApi";
import type {
  JobRunSearchReq,
  MaterializeJobRow,
  ProjectionRetryJobRow,
  StatisticRebuildJobRow,
  UserActionLogRetryJobRow,
  UserActionLogRow,
  UserActionLogSearchReq,
  UserActionLogUserDto,
  WorkStatusOperationLogRow,
} from "../../api/operationsApi";
import { AppTable } from "../../components/common/AppTable";
import type { AppTableColumn } from "../../components/common/AppTable";
import { Role } from "../../constants/roles";
import type { PagedResult } from "../../types/pagedResult";
import { UITextKey, uiText } from '../../constants/uiText';

type MainTab = "history" | "jobRuns";
type JobRunTab = "operationLogs" | "materialize" | "projectionRetry" | "actionLogRetry" | "statisticRebuild";
type ChipColor = "default" | "success" | "error" | "warning" | "info";

type HistoryFilters = {
  q: string;
  action: string;
  scope: string;
  unitId: string;
  userId: string;
  pageSize: number;
};

type JobRunFilters = {
  q: string;
  status: string;
  action: string;
  workId: string;
  workAssignmentId: string;
  userId: string;
  includeInactive: boolean;
  pageSize: number;
};

type PagedTableProps<T> = {
  data?: PagedResult<T>;
  isFetching: boolean;
  isError: boolean;
  columns: AppTableColumn<T>[];
  rowKey: (row: T) => string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const historyDefaultFilters: HistoryFilters = {
  q: "",
  action: "",
  scope: "",
  unitId: "",
  userId: "",
  pageSize: 25,
};

const jobRunDefaultFilters: JobRunFilters = {
  q: "",
  status: "",
  action: "",
  workId: "",
  workAssignmentId: "",
  userId: "",
  includeInactive: false,
  pageSize: 25,
};

const actionOptions = [
  ["", "Tất cả thao tác"],
  ["WORK_CREATED", "Tạo đầu việc"],
  ["ASSIGNMENT_CREATED", "Giao công việc"],
  ["ASSIGNMENT_HANDOVER", "Bàn giao công việc"],
  ["REPORT_SUBMITTED", "Gửi báo cáo"],
  ["REPORT_APPROVED", "Duyệt báo cáo"],
  ["REPORT_RETURNED", "Trả lại báo cáo"],
] as const;

const scopeOptions = [
  ["", "Tất cả phạm vi"],
  ["work", "Đầu việc"],
  ["assignment", "Công việc"],
  ["report", "Báo cáo"],
] as const;

const jobRunTabs = [
  ["operationLogs", "Nhật ký trạng thái"],
  ["materialize", "Tạo dữ liệu xử lý"],
  ["projectionRetry", "Làm mới dữ liệu hiển thị"],
  ["actionLogRetry", "Ghi lại lịch sử thao tác"],
  ["statisticRebuild", "Tính lại thống kê"],
] as const;

const operationResultOptions = [
  ["", "Tất cả trạng thái"],
  ["SUCCESS", "Đã chạy"],
  ["PARTIAL_FAILED", "Lỗi một phần"],
  ["FAILED", "Lỗi"],
  ["SKIPPED", "Bỏ qua"],
] as const;

const queueStatusOptions = [
  ["", "Tất cả trạng thái"],
  ["Pending", "Chưa chạy"],
  ["Running", "Đang chạy"],
  ["RetryWaiting", "Lỗi - chờ chạy lại"],
  ["Completed", "Đã chạy"],
  ["DeadLetter", "Lỗi - dừng xử lý"],
] as const;

const statisticRebuildStatusOptions = [
  ["", "Tất cả trạng thái"],
  ["PENDING", "Chưa chạy"],
  ["RUNNING", "Đang chạy"],
  ["RETRY_WAITING", "Lỗi - chờ chạy lại"],
  ["COMPLETED", "Đã chạy"],
  ["DEAD_LETTER", "Lỗi - dừng xử lý"],
] as const;

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("vi-VN", { hour12: false });
};

const compactId = (value?: string | null) =>
  value ? (value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value) : "-";

const labelFromOptions = <T extends readonly (readonly [string, string])[]>(options: T, value?: string | null) =>
  options.find(([key]) => key === value)?.[1];

const actionLabel = (value: string) => {
  const normalized = value.toUpperCase();
  const special: Record<string, string> = {
    REPORT_DEACTIVATED: "Thu hồi báo cáo",
    REPORT_REACTIVATED: "Mở lại báo cáo",
    SAVE_DRAFT: "Lưu bản nháp",
    SUBMIT: "Gửi báo cáo",
    APPROVE: "Duyệt báo cáo",
    RETURN: "Trả lại báo cáo",
    DELETE_USER_REPORT: "Xóa báo cáo",
    INIT_DRAFT: "Tạo bản nháp",
    EVALUATE: "Đánh giá công việc",
    UPDATE_EVALUATION: "Cập nhật đánh giá",
    REBUILD_WORK: "Làm mới đầu việc",
    REBUILD_WORK_ASSIGNMENTS: "Làm mới danh sách công việc",
    REBUILD_ASSIGNMENT: "Làm mới công việc",
    REBUILD_WORK_REPORT_PERIODS: "Làm mới kỳ báo cáo",
    REBUILD_REPORT_PERIOD: "Làm mới một kỳ báo cáo",
    REBUILD_MY_REPORT_TEMPLATE: "Làm mới biểu mẫu báo cáo",
    SOFT_DELETE_DOC: "Ẩn dữ liệu cũ",
  };
  return special[normalized] ?? labelFromOptions(actionOptions, value) ?? value;
};

const scopeLabel = (value?: string | null) => labelFromOptions(scopeOptions, value) ?? value ?? "-";

const operationLabel = (value: string) => {
  const labels: Record<string, string> = {
    ASSIGNMENT_STATUS_SYNC: "Đồng bộ trạng thái công việc",
    MATERIALIZE_SCAN: "Quét dữ liệu cần tạo",
    MATERIALIZE_JOB: "Tạo dữ liệu xử lý",
    ASSIGNMENT_HANDOVER: "Bàn giao công việc",
    QUEUE_DUE_SCAN_ITEM: "Quét một lịch báo cáo",
    QUEUE_DUE_SCAN: "Quét lịch báo cáo",
    DOCROLE_PROJECTION_RETRY_SCAN: "Làm mới quyền xem dữ liệu",
    NOTIFICATION_DUE_SCAN: "Quét thông báo đến hạn",
    SAVE_DRAFT: "Lưu bản nháp",
    SUBMIT: "Gửi báo cáo",
    APPROVE: "Duyệt báo cáo",
    RETURN: "Trả lại báo cáo",
    DELETE_USER_REPORT: "Xóa báo cáo",
    INIT_DRAFT: "Tạo bản nháp",
  };
  return labels[value.toUpperCase()] ?? value;
};

const docTypeLabel = (value?: string | null) => {
  const labels: Record<string, string> = {
    WORK: "Đầu việc",
    WORK_ASSIGNMENT: "Công việc",
    WORK_REPORT_PERIOD: "Kỳ báo cáo",
    WORK_ASSIGNMENT_REPORT: "Báo cáo",
  };
  return value ? labels[value.toUpperCase()] ?? value : "-";
};

const priorityLabel = (value?: string | null) => {
  const labels: Record<string, string> = {
    NORMAL: "Bình thường",
    HIGH: "Cao",
  };
  return value ? labels[value.toUpperCase()] ?? value : "-";
};

const statusLabel = (value?: string | null) => {
  const normalized = (value ?? "").replace(/[_\s-]/g, "").toLowerCase();
  if (!normalized) return "-";
  if (normalized === "pending") return "Chưa chạy";
  if (normalized === "running") return "Đang chạy";
  if (normalized === "retrywaiting") return "Lỗi - chờ chạy lại";
  if (normalized === "completed" || normalized === "success") return "Đã chạy";
  if (normalized === "deadletter") return "Lỗi - dừng xử lý";
  if (normalized === "failed" || normalized === "error") return "Lỗi";
  if (normalized === "partialfailed") return "Lỗi một phần";
  if (normalized === "skipped") return "Bỏ qua";
  return value ?? "-";
};

const actionResultLabel = (value?: string | null) => {
  const normalized = (value ?? "").replace(/[_\s-]/g, "").toLowerCase();
  if (!normalized) return "-";
  if (normalized === "success" || normalized === "completed") return "Thành công";
  if (normalized === "failed" || normalized === "error") return "Lỗi";
  if (normalized === "partialfailed") return "Lỗi một phần";
  if (normalized === "skipped") return "Bỏ qua";
  return value ?? "-";
};

const resultColor = (value?: string | null): ChipColor => {
  const normalized = (value ?? "").replace(/[_\s-]/g, "").toLowerCase();
  if (["success", "completed", "ok"].includes(normalized)) return "success";
  if (["failed", "error", "deadletter"].includes(normalized)) return "error";
  if (["partialfailed", "retrywaiting", "pending"].includes(normalized)) return "warning";
  if (["running", "skipped"].includes(normalized)) return "info";
  return "default";
};

const renderLimitedText = (value?: string | null, maxWidth = 360) => (
  <Typography
    variant="body2"
    sx={{
      maxWidth,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }}
    title={value ?? undefined}
  >
    {value || "-"}
  </Typography>
);

const renderUser = (user?: UserActionLogUserDto | null) => {
  if (!user) return "-";

  return (
    <Stack spacing={0.25}>
      <Typography variant="body2" fontWeight={600}>
        {user.fullName || user.username || compactId(user.userId)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {user.unitCode || user.unitName || compactId(user.unitId)}
      </Typography>
    </Stack>
  );
};

const renderRelation = (row: UserActionLogRow) => {
  if (row.fromUser || row.toUser) {
    return (
      <Stack spacing={0.5}>
        <Typography variant="caption">Từ: {row.fromUser?.fullName || row.fromUser?.username || "-"}</Typography>
        <Typography variant="caption">Đến: {row.toUser?.fullName || row.toUser?.username || "-"}</Typography>
      </Stack>
    );
  }

  if (row.users.length > 0) {
    return (
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {row.users.slice(0, 3).map((user) => (
          <Chip
            key={user.userId}
            size="small"
            label={user.fullName || user.username || compactId(user.userId)}
          />
        ))}
        {row.users.length > 3 && <Chip size="small" label={`+${row.users.length - 3}`} />}
      </Stack>
    );
  }

  return renderUser(row.targetUser);
};

const renderWorkObject = (row: UserActionLogRow) => {
  const primary = row.workAutoCode || row.workCode || compactId(row.workId);
  const secondary = row.workAssignmentCode || row.periodInstanceKey || row.reportStatus;

  return (
    <Stack spacing={0.25}>
      <Typography variant="body2" fontWeight={600}>
        {primary}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {secondary || row.workName || "-"}
      </Typography>
    </Stack>
  );
};

const renderUnitScope = (row: UserActionLogRow) => {
  if (row.unitScopes.length === 0) return "-";
  const unit = row.unitScopes[0];
  return (
    <Stack spacing={0.25}>
      <Typography variant="body2" fontWeight={600}>
        {unit.unitCode || compactId(unit.unitId)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {unit.unitName || `Cấp ${unit.unitLevel}`}
      </Typography>
    </Stack>
  );
};

function PagedTable<T>({
  data,
  isFetching,
  isError,
  columns,
  rowKey,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PagedTableProps<T>) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      {isFetching && <LinearProgress />}
      {isError && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          Không tải được dữ liệu.
        </Alert>
      )}
      <AppTable
        rows={data?.rows ?? []}
        columns={columns}
        rowKey={rowKey}
        enablePagination
        paginationMode="server"
        page={data?.page ?? page}
        pageSize={data?.pageSize ?? pageSize}
        totalRows={data?.totalRows ?? 0}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Paper>
  );
}

function OperationsPage() {
  const meQuery = useGetMeQuery();
  const roles = meQuery.data?.roles ?? [];
  const isSystemAdmin = roles.includes(Role.SYSTEM_ADMIN);
  const [tab, setTab] = useState<MainTab>("history");

  const handleMainTabChange = (_event: unknown, value: MainTab) => {
    setTab(value === "jobRuns" && !isSystemAdmin ? "history" : value);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Vận hành hệ thống
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Lịch sử thao tác và tác vụ nền
          </Typography>
        </Box>
      </Stack>

      <Tabs value={tab} onChange={handleMainTabChange} sx={{ mb: 2 }}>
        <Tab value="history" icon={<HistoryIcon />} iconPosition="start" label={uiText(UITextKey.TextLichSuThaoTac)} />
        {isSystemAdmin && (
          <Tab value="jobRuns" icon={<ManageSearchIcon />} iconPosition="start" label={uiText(UITextKey.TextJobRun)} />
        )}
      </Tabs>

      {tab === "history" && <HistoryPanel />}
      {tab === "jobRuns" && isSystemAdmin && <JobRunsPanel />}
    </Box>
  );
}

function HistoryPanel() {
  const [draft, setDraft] = useState<HistoryFilters>(historyDefaultFilters);
  const [applied, setApplied] = useState<HistoryFilters>(historyDefaultFilters);
  const [page, setPage] = useState(0);

  const queryArgs = useMemo<UserActionLogSearchReq>(
    () => ({
      q: applied.q.trim() || undefined,
      action: applied.action || undefined,
      scope: applied.scope || undefined,
      unitId: applied.unitId.trim() || undefined,
      userId: applied.userId.trim() || undefined,
      page,
      pageSize: applied.pageSize,
    }),
    [applied, page],
  );

  const query = useSearchActionLogsQuery(queryArgs);

  const columns = useMemo<AppTableColumn<UserActionLogRow>[]>(
    () => [
      {
        field: "occurredAtUtc",
        header: "Thời gian",
        width: 170,
        render: (row) => formatDateTime(row.occurredAtUtc),
      },
      {
        field: "action",
        header: "Thao tác",
        width: 180,
        render: (row) => <Chip size="small" label={actionLabel(row.action)} />,
      },
      {
        field: "result",
        header: "Kết quả",
        width: 100,
        render: (row) => <Chip size="small" color={resultColor(row.result)} label={actionResultLabel(row.result)} />,
      },
      {
        field: "actor",
        header: "Người thao tác",
        width: 220,
        render: (row) => renderUser(row.actor),
      },
      {
        field: "unitScopes",
        header: "Đơn vị",
        width: 220,
        render: renderUnitScope,
      },
      {
        field: "targetUser",
        header: "Người liên quan",
        width: 240,
        render: renderRelation,
      },
      {
        field: "workId",
        header: "Đối tượng",
        width: 220,
        render: renderWorkObject,
      },
      {
        field: "summary",
        header: "Tóm tắt",
        render: (row) => renderLimitedText(row.summary),
      },
    ],
    [],
  );

  const applyFilters = () => {
    setPage(0);
    setApplied(draft);
  };

  const setPageSize = (pageSize: number) => {
    setPage(0);
    setDraft((current) => ({ ...current, pageSize }));
    setApplied((current) => ({ ...current, pageSize }));
  };

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ lg: "center" }}>
          <TextField
            size="small"
            label={uiText(UITextKey.TextTimKiem)}
            value={draft.q}
            onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyFilters();
            }}
            sx={{ minWidth: 240 }}
          />
          <TextField
            select
            size="small"
            label={uiText(UITextKey.TextThaoTac)}
            value={draft.action}
            onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))}
            sx={{ minWidth: 190 }}
          >
            {actionOptions.map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={uiText(UITextKey.TextScope)}
            value={draft.scope}
            onChange={(event) => setDraft((current) => ({ ...current, scope: event.target.value }))}
            sx={{ minWidth: 150 }}
          >
            {scopeOptions.map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label={uiText(UITextKey.TextUnitID)}
            value={draft.unitId}
            onChange={(event) => setDraft((current) => ({ ...current, unitId: event.target.value }))}
            sx={{ minWidth: 220 }}
          />
          <TextField
            size="small"
            label={uiText(UITextKey.TextUserID)}
            value={draft.userId}
            onChange={(event) => setDraft((current) => ({ ...current, userId: event.target.value }))}
            sx={{ minWidth: 220 }}
          />
          <Button variant="contained" startIcon={<SearchIcon />} onClick={applyFilters}>
            Lọc
          </Button>
        </Stack>
      </Paper>

      <PagedTable
        data={query.data}
        isFetching={query.isFetching}
        isError={query.isError}
        columns={columns}
        rowKey={(row) => row.id}
        page={page}
        pageSize={applied.pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </Stack>
  );
}

function JobRunsPanel() {
  const [jobTab, setJobTab] = useState<JobRunTab>("operationLogs");
  const [draft, setDraft] = useState<JobRunFilters>(jobRunDefaultFilters);
  const [applied, setApplied] = useState<JobRunFilters>(jobRunDefaultFilters);
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState<ReactNode>(null);
  const [processProjection, projectionProcessState] = useProcessProjectionRetryJobsMutation();
  const [processActionLog, actionLogProcessState] = useProcessActionLogRetryJobsMutation();
  const [processStatisticRebuild, statisticRebuildProcessState] = useProcessStatisticRebuildJobsMutation();

  const statusOptions = useMemo(() => {
    if (jobTab === "operationLogs") return operationResultOptions;
    if (jobTab === "statisticRebuild") return statisticRebuildStatusOptions;
    return queueStatusOptions;
  }, [jobTab]);

  const queryArgs = useMemo<JobRunSearchReq>(
    () => ({
      q: applied.q.trim() || undefined,
      status: applied.status.trim() || undefined,
      action: applied.action.trim() || undefined,
      operation: applied.action.trim() || undefined,
      result: applied.status.trim() || undefined,
      workId: applied.workId.trim() || undefined,
      workAssignmentId: applied.workAssignmentId.trim() || undefined,
      userId: applied.userId.trim() || undefined,
      includeInactive: applied.includeInactive,
      page,
      pageSize: applied.pageSize,
    }),
    [applied, page],
  );

  const operationLogsQuery = useSearchJobOperationLogsQuery(queryArgs, {
    skip: jobTab !== "operationLogs",
  });
  const materializeQuery = useSearchMaterializeJobsQuery(queryArgs, {
    skip: jobTab !== "materialize",
  });
  const projectionRetryQuery = useSearchProjectionRetryJobsQuery(queryArgs, {
    skip: jobTab !== "projectionRetry",
  });
  const actionLogRetryQuery = useSearchActionLogRetryJobsQuery(queryArgs, {
    skip: jobTab !== "actionLogRetry",
  });
  const statisticRebuildQuery = useSearchStatisticRebuildJobsQuery(queryArgs, {
    skip: jobTab !== "statisticRebuild",
  });

  const operationColumns = useMemo<AppTableColumn<WorkStatusOperationLogRow>[]>(
    () => [
      { field: "startedAtUtc", header: "Bắt đầu", width: 170, render: (row) => formatDateTime(row.startedAtUtc) },
      { field: "operation", header: "Thao tác", width: 190, render: (row) => <Chip size="small" label={operationLabel(row.operation)} /> },
      { field: "result", header: "Trạng thái", width: 140, render: (row) => <Chip size="small" color={resultColor(row.result)} label={statusLabel(row.result)} /> },
      { field: "scope", header: "Phạm vi", width: 120, render: (row) => scopeLabel(row.scope) },
      { field: "workId", header: "Đầu việc", width: 160, render: (row) => compactId(row.workId) },
      { field: "workAssignmentId", header: "Công việc", width: 160, render: (row) => compactId(row.workAssignmentId) },
      { field: "durationMs", header: "Thời lượng", width: 100, render: (row) => `${row.durationMs}ms` },
      { field: "summary", header: "Tóm tắt / lỗi", render: (row) => renderLimitedText(row.errorMessage || row.summary, 420) },
    ],
    [],
  );

  const materializeColumns = useMemo<AppTableColumn<MaterializeJobRow>[]>(
    () => [
      { field: "createdAtUtc", header: "Tạo lúc", width: 170, render: (row) => formatDateTime(row.createdAtUtc) },
      { field: "status", header: "Trạng thái", width: 150, render: (row) => <Chip size="small" color={resultColor(row.status)} label={statusLabel(row.status)} /> },
      { field: "workId", header: "Đầu việc", width: 160, render: (row) => compactId(row.workId) },
      { field: "workAssignmentId", header: "Công việc", width: 160, render: (row) => compactId(row.workAssignmentId) },
      { field: "retryCount", header: "Số lần thử", width: 100, align: "right" },
      { field: "cursorAssigneeIndex", header: "Vị trí xử lý", width: 120, render: (row) => `${row.cursorAssigneeIndex}/${row.cursorDueIndex}` },
      { field: "lastRunAtUtc", header: "Chạy gần nhất", width: 170, render: (row) => formatDateTime(row.lastRunAtUtc) },
      { field: "completedAtUtc", header: "Hoàn tất", width: 170, render: (row) => formatDateTime(row.completedAtUtc) },
      { field: "nextRetryAtUtc", header: "Lần chạy lại tiếp theo", width: 190, render: (row) => formatDateTime(row.nextRetryAtUtc) },
      { field: "lastError", header: "Lỗi gần nhất", render: (row) => renderLimitedText(row.lastError, 420) },
    ],
    [],
  );

  const projectionColumns = useMemo<AppTableColumn<ProjectionRetryJobRow>[]>(
    () => [
      { field: "createdAtUtc", header: "Tạo lúc", width: 170, render: (row) => formatDateTime(row.createdAtUtc) },
      { field: "action", header: "Thao tác", width: 190, render: (row) => <Chip size="small" label={actionLabel(row.action)} /> },
      { field: "status", header: "Trạng thái", width: 150, render: (row) => <Chip size="small" color={resultColor(row.status)} label={statusLabel(row.status)} /> },
      { field: "docType", header: "Tài liệu", width: 180, render: (row) => row.docType ? `${docTypeLabel(row.docType)}: ${compactId(row.docId)}` : compactId(row.docId) },
      { field: "workId", header: "Đầu việc", width: 150, render: (row) => compactId(row.workId) },
      { field: "userId", header: "Người dùng", width: 150, render: (row) => compactId(row.userId) },
      { field: "retryCount", header: "Số lần thử", width: 100, align: "right" },
      { field: "lastRunAtUtc", header: "Chạy gần nhất", width: 170, render: (row) => formatDateTime(row.lastRunAtUtc) },
      { field: "completedAtUtc", header: "Hoàn tất", width: 170, render: (row) => formatDateTime(row.completedAtUtc) },
      { field: "nextRetryAtUtc", header: "Lần chạy lại tiếp theo", width: 190, render: (row) => formatDateTime(row.nextRetryAtUtc) },
      { field: "lastError", header: "Lý do / lỗi", render: (row) => renderLimitedText(row.lastError || row.reason, 420) },
    ],
    [],
  );

  const actionRetryColumns = useMemo<AppTableColumn<UserActionLogRetryJobRow>[]>(
    () => [
      { field: "createdAtUtc", header: "Tạo lúc", width: 170, render: (row) => formatDateTime(row.createdAtUtc) },
      { field: "action", header: "Thao tác", width: 190, render: (row) => <Chip size="small" label={actionLabel(row.action)} /> },
      { field: "status", header: "Trạng thái", width: 150, render: (row) => <Chip size="small" color={resultColor(row.status)} label={statusLabel(row.status)} /> },
      { field: "dedupeKey", header: "Mã chống trùng", width: 260, render: (row) => renderLimitedText(row.dedupeKey, 260) },
      { field: "retryCount", header: "Số lần thử", width: 100, align: "right" },
      { field: "lastRunAtUtc", header: "Chạy gần nhất", width: 170, render: (row) => formatDateTime(row.lastRunAtUtc) },
      { field: "completedAtUtc", header: "Hoàn tất", width: 170, render: (row) => formatDateTime(row.completedAtUtc) },
      { field: "nextRetryAtUtc", header: "Lần chạy lại tiếp theo", width: 190, render: (row) => formatDateTime(row.nextRetryAtUtc) },
      { field: "lastError", header: "Lỗi gần nhất", render: (row) => renderLimitedText(row.lastError, 420) },
    ],
    [],
  );

  const statisticRebuildColumns = useMemo<AppTableColumn<StatisticRebuildJobRow>[]>(
    () => [
      { field: "createdAtUtc", header: "Tạo lúc", width: 170, render: (row) => formatDateTime(row.createdAtUtc) },
      { field: "status", header: "Trạng thái", width: 150, render: (row) => <Chip size="small" color={resultColor(row.status)} label={statusLabel(row.status)} /> },
      { field: "priority", header: "Ưu tiên", width: 120, render: (row) => <Chip size="small" label={priorityLabel(row.priority)} /> },
      {
        field: "dynamicFormTemplateId",
        header: "Biểu mẫu động",
        width: 260,
        render: (row) => renderLimitedText(row.dynamicFormTemplateCode || row.dynamicFormTemplateName || compactId(row.dynamicFormTemplateId), 260),
      },
      {
        field: "processedReportCount",
        header: "Tiến độ",
        width: 140,
        render: (row) => `${row.processedReportCount}/${row.totalReportCount}`,
      },
      { field: "failedReportCount", header: "Lỗi", width: 80, align: "right" },
      { field: "retryCount", header: "Số lần thử", width: 100, align: "right" },
      { field: "lastRunAtUtc", header: "Chạy gần nhất", width: 170, render: (row) => formatDateTime(row.lastRunAtUtc) },
      { field: "completedAtUtc", header: "Hoàn tất", width: 170, render: (row) => formatDateTime(row.completedAtUtc) },
      { field: "nextRetryAtUtc", header: "Lần chạy lại tiếp theo", width: 190, render: (row) => formatDateTime(row.nextRetryAtUtc) },
      { field: "lastError", header: "Lỗi gần nhất", render: (row) => renderLimitedText(row.lastError, 420) },
    ],
    [],
  );

  const applyFilters = () => {
    setPage(0);
    setApplied(draft);
  };

  const setPageSize = (pageSize: number) => {
    setPage(0);
    setDraft((current) => ({ ...current, pageSize }));
    setApplied((current) => ({ ...current, pageSize }));
  };

  const handleJobTabChange = (_event: unknown, value: JobRunTab) => {
    setJobTab(value);
    setPage(0);
    setNotice(null);
    setDraft((current) => ({ ...current, status: "" }));
    setApplied((current) => ({ ...current, status: "" }));
  };

  const runProjectionRetry = async () => {
    setNotice(null);
    try {
      const result = await processProjection(20).unwrap();
      setNotice(`Đã xử lý ${result.processed}/${result.maxJobs} tác vụ làm mới dữ liệu hiển thị.`);
    } catch {
      setNotice("Không xử lý được tác vụ làm mới dữ liệu hiển thị.");
    }
  };

  const runActionLogRetry = async () => {
    setNotice(null);
    try {
      const result = await processActionLog(20).unwrap();
      setNotice(`Đã xử lý ${result.processed}/${result.maxJobs} tác vụ ghi lại lịch sử thao tác.`);
    } catch {
      setNotice("Không xử lý được tác vụ ghi lại lịch sử thao tác.");
    }
  };

  const runStatisticRebuild = async () => {
    setNotice(null);
    try {
      const result = await processStatisticRebuild({ maxJobs: 3, batchSize: 25 }).unwrap();
      setNotice(`Đã xử lý ${result.processed}/${result.maxJobs} tác vụ tính lại thống kê.`);
    } catch {
      setNotice("Không xử lý được tác vụ tính lại thống kê.");
    }
  };

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ lg: "center" }}>
          <TextField
            size="small"
            label={uiText(UITextKey.TextTimKiem)}
            value={draft.q}
            onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyFilters();
            }}
            sx={{ minWidth: 220 }}
          />
          <TextField
            select
            size="small"
            label={uiText(UITextKey.TextStatusResult)}
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
            sx={{ minWidth: 170 }}
          >
            {statusOptions.map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label={uiText(UITextKey.TextActionOperation)}
            value={draft.action}
            onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))}
            sx={{ minWidth: 190 }}
          />
          <TextField
            size="small"
            label="Mã đầu việc"
            value={draft.workId}
            onChange={(event) => setDraft((current) => ({ ...current, workId: event.target.value }))}
            sx={{ minWidth: 190 }}
          />
          <TextField
            size="small"
            label={uiText(UITextKey.TextAssignmentID)}
            value={draft.workAssignmentId}
            onChange={(event) => setDraft((current) => ({ ...current, workAssignmentId: event.target.value }))}
            sx={{ minWidth: 210 }}
          />
          <TextField
            size="small"
            label={uiText(UITextKey.TextUserID)}
            value={draft.userId}
            onChange={(event) => setDraft((current) => ({ ...current, userId: event.target.value }))}
            sx={{ minWidth: 180 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={draft.includeInactive}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, includeInactive: event.target.checked }))
                }
              />
            }
            label={uiText(UITextKey.TextInactive)}
          />
          <Button variant="contained" startIcon={<SearchIcon />} onClick={applyFilters}>
            Lọc
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1}>
          <Tabs value={jobTab} onChange={handleJobTabChange} variant="scrollable" scrollButtons="auto">
            {jobRunTabs.map(([value, label]) => (
              <Tab key={value} value={value} label={label} />
            ))}
          </Tabs>
          <Stack direction="row" spacing={1} sx={{ p: 1 }}>
            {jobTab === "projectionRetry" && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ReplayIcon />}
                disabled={projectionProcessState.isLoading}
                onClick={runProjectionRetry}
              >
                Chạy lại 20
              </Button>
            )}
            {jobTab === "actionLogRetry" && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ReplayIcon />}
                disabled={actionLogProcessState.isLoading}
                onClick={runActionLogRetry}
              >
                Chạy lại 20
              </Button>
            )}
            {jobTab === "statisticRebuild" && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ReplayIcon />}
                disabled={statisticRebuildProcessState.isLoading}
                onClick={runStatisticRebuild}
              >
                Chạy 3
              </Button>
            )}
          </Stack>
        </Stack>
        <Divider />
        {notice && (
          <Alert severity="info" sx={{ borderRadius: 0 }}>
            {notice}
          </Alert>
        )}
      </Paper>

      {jobTab === "operationLogs" && (
        <PagedTable
          data={operationLogsQuery.data}
          isFetching={operationLogsQuery.isFetching}
          isError={operationLogsQuery.isError}
          columns={operationColumns}
          rowKey={(row) => row.id}
          page={page}
          pageSize={applied.pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
      {jobTab === "materialize" && (
        <PagedTable
          data={materializeQuery.data}
          isFetching={materializeQuery.isFetching}
          isError={materializeQuery.isError}
          columns={materializeColumns}
          rowKey={(row) => row.id}
          page={page}
          pageSize={applied.pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
      {jobTab === "projectionRetry" && (
        <PagedTable
          data={projectionRetryQuery.data}
          isFetching={projectionRetryQuery.isFetching}
          isError={projectionRetryQuery.isError}
          columns={projectionColumns}
          rowKey={(row) => row.id}
          page={page}
          pageSize={applied.pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
      {jobTab === "actionLogRetry" && (
        <PagedTable
          data={actionLogRetryQuery.data}
          isFetching={actionLogRetryQuery.isFetching}
          isError={actionLogRetryQuery.isError}
          columns={actionRetryColumns}
          rowKey={(row) => row.id}
          page={page}
          pageSize={applied.pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
      {jobTab === "statisticRebuild" && (
        <PagedTable
          data={statisticRebuildQuery.data}
          isFetching={statisticRebuildQuery.isFetching}
          isError={statisticRebuildQuery.isError}
          columns={statisticRebuildColumns}
          rowKey={(row) => row.id}
          page={page}
          pageSize={applied.pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </Stack>
  );
}

export default OperationsPage;
