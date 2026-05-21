import React from "react";
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
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Snackbar,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import RestoreOutlinedIcon from "@mui/icons-material/RestoreOutlined";

import { AppTable, type AppTableColumn } from "../../common/AppTable";
import AssignmentProgressChip from "../../../components/reports/AssignmentProgressChip";
import ReportPeriodStatusChip from "../../../components/reports/ReportPeriodStatusChip";
import ReportStatusChip from "../../../components/reports/ReportStatusChip";
import CommonDateText from "../../common/CommonDateText";
import CommonLabelText from "../../common/CommonLabelText";
import WorkReviewFilterBar, { type ReviewFilterOption } from "./WorkReviewFilterBar";
import ReviewEntityListViewDialog, {
  type ReviewEntityListItem,
} from "./ReviewEntityListViewDialog";
import {
  useApproveReviewReportMutation,
  useDeactivateReviewReportMutation,
  useRecallApprovedReviewReportMutation,
  useReactivateReviewReportMutation,
  useReturnReviewReportMutation,
  useSearchReviewReportsMutation,
  useSearchReviewSummaryMutation,
} from "../../../api/reportApi";
import type {
  ApproveReportRequest,
  RecallApprovedReportRequest,
  ReportActiveRequest,
  ReturnReportRequest,
  ReviewReportFlatRowDto,
  ReviewStatusBucket,
  ReviewSummaryRowDto,
} from "../../../types/reportReview";
import { WorkAssignmentReportStatus } from "../../../types/reportStatus";
import WorkReportEditorPage from "../../../pages/works/report/WorkReportEditorPage";
import { UITextKey, uiText } from '../../../constants/uiText';

type Props = {
  workId: string;
};

type ReviewActionKind = "return" | "recallApproved" | "deactivate" | "reactivate";
type SummaryDialogState = {
  open: boolean;
  title: string;
  items: ReviewEntityListItem[];
};

type SummaryViewRow = ReviewSummaryRowDto & {
  assigneeUsersDisplay: string;
  assigneeUsersTooltip: string;
  assigneeUnitsDisplay: string;
  assigneeUnitsTooltip: string;
  assigneeUserItems: ReviewEntityListItem[];
  assigneeUnitItems: ReviewEntityListItem[];
};

const DETAIL_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function normalizeDayKey(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 8);
}

function formatDayKey(dayKey?: string | null) {
  const normalized = normalizeDayKey(dayKey);
  if (normalized.length !== 8) return dayKey || "-";
  return `${normalized.slice(6, 8)}/${normalized.slice(4, 6)}/${normalized.slice(0, 4)}`;
}

function todayDayKey() {
  const now = new Date();
  const yyyy = String(now.getFullYear()).padStart(4, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function isHistoricalReviewRow(row?: ReviewReportFlatRowDto | null) {
  if (!row) return false;
  if (row.isHistoricalData) return true;
  const anchor =
    normalizeDayKey(row.completedDate) ||
    normalizeDayKey(row.periodEnd) ||
    normalizeDayKey(row.periodKey);
  return Boolean(anchor && anchor < todayDayKey());
}

function getTemplateLabel(row: {
  dynamicExcelId?: string | null;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
}) {
  const code = row.dynamicExcelCode?.trim();
  const name = row.dynamicExcelName?.trim();
  if (code && name) return `${code} - ${name}`;
  return code || name || row.dynamicExcelId || "-";
}

function isPrivilegedUsername(username?: string | null) {
  const normalized = (username ?? "").trim().toLowerCase();
  return normalized.startsWith("mu_") || normalized.startsWith("ml_");
}

function normalizeReviewUsername(username?: string | null) {
  const raw = (username ?? "").trim();
  if (!raw) return "";
  if (isPrivilegedUsername(raw)) {
    return raw.replace(/^(mu_|ml_)/i, "").toUpperCase();
  }
  return raw;
}

function getUserLabel(data: {
  assigneeUserName?: string | null;
  assigneeFullName?: string | null;
  assigneeUserId?: string | null;
}) {
  const username = normalizeReviewUsername(data.assigneeUserName);
  if (username && data.assigneeFullName?.trim()) {
    return `${data.assigneeFullName.trim()} • ${username}`;
  }
  if (username) return username;
  return data.assigneeFullName?.trim() || data.assigneeUserId || "-";
}

function getUserSecondary(data: {
  assigneeUserName?: string | null;
  assigneeFullName?: string | null;
  assigneeUserId?: string | null;
  assigneeUnitShortName?: string | null;
  assigneeUnitName?: string | null;
}) {
  const username = normalizeReviewUsername(data.assigneeUserName);
  const unit = data.assigneeUnitShortName?.trim() || data.assigneeUnitName?.trim() || "";
  const values = [username ? `username: ${username}` : "", unit ? `đơn vị: ${unit}` : ""]
    .filter(Boolean)
    .join(" • ");
  return values || undefined;
}

function getRowUsername(row: ReviewReportFlatRowDto) {
  return getUserLabel(row);
}

function getUnitLabel(row: {
  assigneeUnitShortName?: string | null;
  assigneeUnitName?: string | null;
  assigneeUnitId?: string | null;
}) {
  return row.assigneeUnitShortName?.trim() || row.assigneeUnitName?.trim() || row.assigneeUnitId || "-";
}

function getWorstOverdueLabel(row: {
  worstOverdueReasonLabel?: string | null;
  hasOverduePeriod?: boolean | null;
}) {
  if (row.worstOverdueReasonLabel?.trim()) return row.worstOverdueReasonLabel.trim();
  if (row.hasOverduePeriod) return "Có quá hạn";
  return "-";
}

function canApprove(row?: ReviewReportFlatRowDto | null) {
  if (!row?.reportId) return false;
  if (row.reportStatus === WorkAssignmentReportStatus.Submitted) return true;
  return (
    row.reportStatus === WorkAssignmentReportStatus.Approved &&
    row.autoApproved === true &&
    row.autoApprovalLocked !== true
  );
}

function canReturn(row?: ReviewReportFlatRowDto | null) {
  return !!row?.reportId && row.reportStatus === WorkAssignmentReportStatus.Submitted;
}

function canRecallApproved(row?: ReviewReportFlatRowDto | null) {
  return !!row?.reportId &&
    row.reportStatus === WorkAssignmentReportStatus.Approved &&
    !(row.autoApproved === true && row.autoApprovalLocked !== true);
}

function canDeactivate(row?: ReviewReportFlatRowDto | null) {
  return !!row?.reportId && row.reportIsActive !== false;
}

function canReactivate(row?: ReviewReportFlatRowDto | null) {
  return !!row?.reportId && row.reportIsActive === false;
}

function getActionTitle(kind: ReviewActionKind) {
  if (kind === "recallApproved") return "Thu hồi duyệt";
  if (kind === "deactivate") return "Ẩn báo cáo";
  if (kind === "reactivate") return "Kích hoạt lại báo cáo";
  return "Trả lại báo cáo";
}

function getActionAlert(kind: ReviewActionKind) {
  if (kind === "recallApproved") return "Báo cáo đã duyệt sẽ quay về trạng thái Đã nộp.";
  if (kind === "deactivate") return "Báo cáo sẽ bị ẩn khỏi danh sách và không còn được tính vào thống kê.";
  if (kind === "reactivate") return "Báo cáo sẽ được kích hoạt lại nếu không có báo cáo hiện hành khác trong cùng kỳ.";
  return "Báo cáo sẽ được trả lại và quay về trạng thái Nháp.";
}

function getActionButtonLabel(kind: ReviewActionKind) {
  if (kind === "recallApproved") return "Thu hồi duyệt";
  if (kind === "deactivate") return "Ẩn báo cáo";
  if (kind === "reactivate") return "Kích hoạt lại";
  return "Trả lại";
}

function getActionButtonColor(kind: ReviewActionKind): "primary" | "secondary" | "warning" | "error" {
  if (kind === "recallApproved") return "secondary";
  if (kind === "deactivate") return "error";
  if (kind === "reactivate") return "primary";
  return "warning";
}

function summarizeLabels(labels: string[], max = 2) {
  if (labels.length === 0) return "-";
  if (labels.length <= max) return labels.join(", ");
  return `${labels.slice(0, max).join(", ")}, ...`;
}

function buildUserOption(row: {
  assigneeUserId?: string | null;
  assigneeUserName?: string | null;
  assigneeFullName?: string | null;
  assigneeUnitShortName?: string | null;
  assigneeUnitName?: string | null;
}): ReviewFilterOption | null {
  const id = row.assigneeUserId?.trim();
  if (!id) return null;
  return {
    id,
    label: getUserLabel(row),
    subLabel: getUserSecondary(row),
  };
}

function buildUnitOption(row: {
  assigneeUnitId?: string | null;
  assigneeUnitShortName?: string | null;
  assigneeUnitName?: string | null;
}): ReviewFilterOption | null {
  const id = row.assigneeUnitId?.trim();
  if (!id) return null;
  return {
    id,
    label: getUnitLabel(row),
  };
}

function distinctOptions<T extends ReviewFilterOption>(items: Array<T | null | undefined>) {
  const map = new Map<string, T>();
  for (const item of items) {
    if (!item?.id || map.has(item.id)) continue;
    map.set(item.id, item);
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

function getSummaryAssigneeDisplay(assignee: ReviewSummaryRowDto["assignees"][number]) {
  const username = normalizeReviewUsername(assignee?.userName);
  return username || assignee?.fullName?.trim() || assignee?.userId || "-";
}

function getSummaryAssigneeTooltip(assignee: ReviewSummaryRowDto["assignees"][number]) {
  const username = normalizeReviewUsername(assignee?.userName);
  const fullName = assignee?.fullName?.trim() || "";
  if (fullName && username) return `${fullName} • ${username}`;
  return fullName || username || assignee?.userId || "-";
}

function getSummaryUnitLabel(assignee: ReviewSummaryRowDto["assignees"][number]) {
  return assignee?.unitShortName?.trim() || assignee?.unitName?.trim() || assignee?.unitId || "-";
}

function buildSummaryUserOption(assignee: ReviewSummaryRowDto["assignees"][number]): ReviewFilterOption | null {
  const id = assignee?.userId?.trim();
  if (!id) return null;
  return {
    id,
    label: getSummaryAssigneeDisplay(assignee),
    subLabel: getSummaryAssigneeTooltip(assignee),
  };
}

function buildSummaryUnitOption(assignee: ReviewSummaryRowDto["assignees"][number]): ReviewFilterOption | null {
  const id = assignee?.unitId?.trim();
  if (!id) return null;
  return {
    id,
    label: getSummaryUnitLabel(assignee),
  };
}

function scopeSummaryAssignees(
  row: ReviewSummaryRowDto,
  unitId: string,
  userId: string
): ReviewSummaryRowDto | null {
  const normalizedUnitId = unitId.trim();
  const normalizedUserId = userId.trim();
  const assignees = Array.isArray(row.assignees) ? row.assignees : [];

  const scopedAssignees = assignees.filter((assignee) => {
    const passUnit = !normalizedUnitId || (assignee.unitId ?? "").trim() === normalizedUnitId;
    const passUser = !normalizedUserId || (assignee.userId ?? "").trim() === normalizedUserId;
    return passUnit && passUser;
  });

  if ((normalizedUnitId || normalizedUserId) && scopedAssignees.length === 0)
    return null;

  return {
    ...row,
    assignees: normalizedUnitId || normalizedUserId ? scopedAssignees : assignees,
  };
}

function getScopedAssigneeUserIds(summary: SummaryViewRow, unitId: string, userId: string) {
  const normalizedUnitId = unitId.trim();
  const normalizedUserId = userId.trim();

  if (normalizedUserId)
    return [normalizedUserId];

  if (!normalizedUnitId)
    return [];

  return (summary.assignees ?? [])
    .filter((assignee) => (assignee.unitId ?? "").trim() === normalizedUnitId)
    .map((assignee) => assignee.userId?.trim())
    .filter((id): id is string => !!id)
    .filter((id, index, arr) => arr.indexOf(id) === index);
}

function aggregateSummaryRows(rows: ReviewSummaryRowDto[]): SummaryViewRow[] {
  return rows.map((row) => {
    const assignees = Array.isArray(row.assignees) ? row.assignees : [];

    const assigneeUserItems = distinctOptions(assignees.map((x) => buildSummaryUserOption(x))).map((x) => ({
      key: x.id,
      label: x.label,
      secondary: x.subLabel,
    }));

    const assigneeUnitItems = distinctOptions(assignees.map((x) => buildSummaryUnitOption(x))).map((x) => ({
      key: x.id,
      label: x.label,
    }));

    const userLabels = assigneeUserItems.map((x) => x.label);
    const userTooltips = assigneeUserItems.map((x) => x.secondary || x.label);
    const unitLabels = assigneeUnitItems.map((x) => x.label);

    return {
      ...row,
      assigneeUsersDisplay: summarizeLabels(userLabels),
      assigneeUsersTooltip: userTooltips.join("\n") || "-",
      assigneeUnitsDisplay: summarizeLabels(unitLabels),
      assigneeUnitsTooltip: unitLabels.join("\n") || "-",
      assigneeUserItems,
      assigneeUnitItems,
    };
  });
}

const DETAIL_STATUS_OPTIONS: Array<{ value: ReviewStatusBucket; label: string }> = [
  { value: "PENDING", label: "Chưa làm" },
  { value: "SUBMITTED", label: "Đã nộp" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "OVERDUE", label: "Quá hạn" },
  { value: "RETURNED", label: "Bị từ chối" },
  { value: "ALL", label: "Tất cả" },
];

const WorkReviewTab: React.FC<Props> = ({ workId }) => {
  const [searchSummary, searchSummaryState] = useSearchReviewSummaryMutation();
  const [searchReviewReports, searchReviewReportsState] = useSearchReviewReportsMutation();
  const [approveReviewReport, approveState] = useApproveReviewReportMutation();
  const [returnReviewReport, returnState] = useReturnReviewReportMutation();
  const [recallApprovedReviewReport, recallState] = useRecallApprovedReviewReportMutation();
  const [deactivateReviewReport, deactivateState] = useDeactivateReviewReportMutation();
  const [reactivateReviewReport, reactivateState] = useReactivateReviewReportMutation();

  const [allSummaryRows, setAllSummaryRows] = React.useState<ReviewSummaryRowDto[]>([]);
  const [summaryRows, setSummaryRows] = React.useState<SummaryViewRow[]>([]);
  const [summaryUnitId, setSummaryUnitId] = React.useState("");
  const [summaryUserId, setSummaryUserId] = React.useState("");
  const [summaryPeriodDayKey, setSummaryPeriodDayKey] = React.useState("");
  const [reviewStatusBucket, setReviewStatusBucket] = React.useState<ReviewStatusBucket>("ALL");

  const [selectedSummary, setSelectedSummary] = React.useState<SummaryViewRow | null>(null);
  const [detailRows, setDetailRows] = React.useState<ReviewReportFlatRowDto[]>([]);
  const [detailTotalRows, setDetailTotalRows] = React.useState(0);
  const [detailPage, setDetailPage] = React.useState(0);
  const [detailPageSize, setDetailPageSize] = React.useState(20);
  const [detailStatusBucket, setDetailStatusBucket] = React.useState<ReviewStatusBucket>("ALL");
  const [detailUnitId, setDetailUnitId] = React.useState("");
  const [detailUserId, setDetailUserId] = React.useState("");
  const [periodDialogOpen, setPeriodDialogOpen] = React.useState(false);
  const [previewReportId, setPreviewReportId] = React.useState<string | null>(null);
  const [summaryDialog, setSummaryDialog] = React.useState<SummaryDialogState>({
    open: false,
    title: "",
    items: [],
  });

  const [actionDialogOpen, setActionDialogOpen] = React.useState(false);
  const [actionTarget, setActionTarget] = React.useState<ReviewReportFlatRowDto | null>(null);
  const [actionKind, setActionKind] = React.useState<ReviewActionKind>("return");
  const [actionComment, setActionComment] = React.useState("");
  const [historicalApproveTarget, setHistoricalApproveTarget] =
    React.useState<ReviewReportFlatRowDto | null>(null);

  const [snackbar, setSnackbar] = React.useState({ open: false, message: "" });
  const selectedSummaryRef = React.useRef<SummaryViewRow | null>(null);

  React.useEffect(() => {
    selectedSummaryRef.current = selectedSummary;
  }, [selectedSummary]);

  const showMessage = React.useCallback((message: string) => {
    setSnackbar({ open: true, message });
  }, []);

  const closeActionDialog = React.useCallback(() => {
    setActionDialogOpen(false);
    setActionTarget(null);
    setActionComment("");
  }, []);

  const summaryUnitOptions = React.useMemo(
    () => distinctOptions(allSummaryRows.flatMap((row) => (row.assignees ?? []).map((assignee) => buildSummaryUnitOption(assignee)))),
    [allSummaryRows]
  );

  const summaryUserOptions = React.useMemo(() => {
    const unitId = summaryUnitId.trim();
    return distinctOptions(
      allSummaryRows.flatMap((row) =>
        (row.assignees ?? [])
          .filter((assignee) => !unitId || (assignee.unitId ?? "").trim() === unitId)
          .map((assignee) => buildSummaryUserOption(assignee))
      )
    );
  }, [allSummaryRows, summaryUnitId]);

  const detailUnitOptions = React.useMemo(() => {
    if (selectedSummary)
      return distinctOptions((selectedSummary.assignees ?? []).map((assignee) => buildSummaryUnitOption(assignee)));

    return distinctOptions(detailRows.map((row) => buildUnitOption(row)));
  }, [detailRows, selectedSummary]);

  const detailUserOptions = React.useMemo(() => {
    if (selectedSummary) {
      const unitId = detailUnitId.trim();
      return distinctOptions(
        (selectedSummary.assignees ?? [])
          .filter((assignee) => !unitId || (assignee.unitId ?? "").trim() === unitId)
          .map((assignee) => buildSummaryUserOption(assignee))
      );
    }

    return distinctOptions(detailRows.map((row) => buildUserOption(row)));
  }, [detailRows, detailUnitId, selectedSummary]);

  const applySummaryFilters = React.useCallback(
    (rows: ReviewSummaryRowDto[], unitId: string, userId: string) => {
      const scopedRows = rows
        .map((row) => scopeSummaryAssignees(row, unitId, userId))
        .filter((row): row is ReviewSummaryRowDto => !!row);

      return aggregateSummaryRows(scopedRows);
    },
    []
  );

  const handleSummaryUnitChange = React.useCallback(
    (nextUnitId: string) => {
      setSummaryUnitId(nextUnitId);

      if (!summaryUserId)
        return;

      const selectedUserStillInUnit = allSummaryRows.some((row) =>
        (row.assignees ?? []).some((assignee) =>
          (assignee.userId ?? "").trim() === summaryUserId &&
          (!nextUnitId || (assignee.unitId ?? "").trim() === nextUnitId)
        )
      );

      if (!selectedUserStillInUnit)
        setSummaryUserId("");
    },
    [allSummaryRows, summaryUserId]
  );

  const loadSummary = React.useCallback(async () => {
    if (!workId) {
      setAllSummaryRows([]);
      setSummaryRows([]);
      return;
    }

    try {
      const payload: any = {
        workId,
        waitingReviewOnly: reviewStatusBucket === "SUBMITTED" ? true : null,
        reviewStatusBucket,
        periodKey: normalizeDayKey(summaryPeriodDayKey) || null,
        assigneeUserIds: summaryUserId ? [summaryUserId] : null,
        assigneeUnitIds: summaryUnitId ? [summaryUnitId] : null,
        page: 0,
        pageSize: 500,
      };

      const res = await searchSummary(payload).unwrap();
      const rows = Array.isArray(res?.rows) ? (res.rows as ReviewSummaryRowDto[]) : [];
      setAllSummaryRows(rows);
      setSummaryRows(applySummaryFilters(rows, summaryUnitId, summaryUserId));
      setSelectedSummary(null);
      setDetailRows([]);
      setDetailTotalRows(0);
      setDetailPage(0);
      setPeriodDialogOpen(false);
    } catch (err: any) {
      showMessage(err?.data?.message || err?.message || "Không tải được bảng cần duyệt.");
    }
  }, [
    applySummaryFilters,
    reviewStatusBucket,
    searchSummary,
    showMessage,
    summaryPeriodDayKey,
    summaryUnitId,
    summaryUserId,
    workId,
  ]);

  React.useEffect(() => {
    if (!workId) return;
    void loadSummary();
  }, [loadSummary, workId]);

  const loadDetailRows = React.useCallback(
    async (
      summary: SummaryViewRow,
      page: number,
      pageSize: number,
      bucket: ReviewStatusBucket,
      unitId: string = detailUnitId,
      userId: string = detailUserId
    ) => {
      const scopedAssigneeUserIds = getScopedAssigneeUserIds(summary, unitId, userId);
      if ((unitId || userId) && scopedAssigneeUserIds.length === 0) {
        setDetailRows([]);
        setDetailTotalRows(0);
        setDetailPage(page);
        setDetailPageSize(pageSize);
        return;
      }

      const payload: any = {
        workId,
        assignmentId: summary.assignmentId,
        periodKey: normalizeDayKey(summaryPeriodDayKey) || null,
        reviewStatusBucket: bucket,
        waitingReviewOnly: bucket === "SUBMITTED" ? true : null,
        assigneeUserIds: scopedAssigneeUserIds.length > 0 ? scopedAssigneeUserIds : null,
        assigneeUnitIds: unitId ? [unitId] : null,
        page,
        pageSize,
      };

      const res = await searchReviewReports(payload).unwrap();
      const rows = Array.isArray(res?.rows) ? (res.rows as ReviewReportFlatRowDto[]) : [];
      const filteredRows = rows.filter((row) => {
        const passUnit = !unitId || (row.assigneeUnitId ?? "").trim() === unitId;
        const passUser = !userId || (row.assigneeUserId ?? "").trim() === userId;
        return passUnit && passUser;
      });
      setDetailRows(filteredRows);
      setDetailTotalRows(unitId || userId ? filteredRows.length : res?.totalRows ?? filteredRows.length);
      setDetailPage(res?.page ?? page);
      setDetailPageSize(res?.pageSize ?? pageSize);
    },
    [detailUnitId, detailUserId, searchReviewReports, summaryPeriodDayKey, workId]
  );

  const openPeriods = React.useCallback(
    async (row: SummaryViewRow) => {
      try {
        setSelectedSummary(row);
        setDetailStatusBucket(reviewStatusBucket);
        setDetailUserId(summaryUserId);
        setDetailUnitId(summaryUnitId);
        setPeriodDialogOpen(true);
        setDetailRows([]);
        setDetailTotalRows(0);
        setDetailPage(0);

        await loadDetailRows(row, 0, detailPageSize, reviewStatusBucket, summaryUnitId, summaryUserId);
      } catch (err: any) {
        setDetailRows([]);
        setDetailTotalRows(0);
        setPeriodDialogOpen(false);
        showMessage(err?.data?.message || err?.message || "Không tải được danh sách cần duyệt.");
      }
    },
    [detailPageSize, loadDetailRows, reviewStatusBucket, showMessage, summaryUnitId, summaryUserId]
  );

  const refreshCurrentPopup = React.useCallback(async () => {
    if (!selectedSummaryRef.current) return;
    await loadDetailRows(
      selectedSummaryRef.current,
      detailPage,
      detailPageSize,
      detailStatusBucket,
      detailUnitId,
      detailUserId
    );
    await loadSummary();
  }, [detailPage, detailPageSize, detailStatusBucket, detailUnitId, detailUserId, loadDetailRows, loadSummary]);

  const openViewList = React.useCallback((title: string, items: ReviewEntityListItem[]) => {
    setSummaryDialog({ open: true, title, items });
  }, []);

  const submitApprove = async (row: ReviewReportFlatRowDto, confirmHistoricalDataApproval = false) => {
    if (!row.reportId) {
      showMessage("Không tìm thấy báo cáo để duyệt.");
      return;
    }

    const data: ApproveReportRequest = { comment: null, confirmHistoricalDataApproval };

    try {
      await approveReviewReport({ reportId: row.reportId, data }).unwrap();
      showMessage("Đã duyệt báo cáo.");
      setHistoricalApproveTarget(null);
      await refreshCurrentPopup();
    } catch (err: any) {
      showMessage(err?.data?.message || err?.message || "Duyệt báo cáo thất bại.");
    }
  };

  const handleApprove = async (row: ReviewReportFlatRowDto) => {
    if (isHistoricalReviewRow(row) && !row.historicalDataApproved) {
      setHistoricalApproveTarget(row);
      return;
    }

    await submitApprove(row);
  };

  const openActionDialog = (kind: ReviewActionKind, row: ReviewReportFlatRowDto) => {
    if (!row.reportId) {
      showMessage("Không tìm thấy báo cáo để thao tác.");
      return;
    }

    setActionKind(kind);
    setActionTarget(row);
    setActionComment("");
    setActionDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!actionTarget?.reportId) {
      showMessage("Không tìm thấy báo cáo để thao tác.");
      return;
    }

    const comment = actionComment.trim();
    if (!comment && actionKind !== "deactivate" && actionKind !== "reactivate") {
      showMessage(actionKind === "recallApproved" ? "Phải nhập lý do thu hồi duyệt." : "Bắt buộc nhập lý do trả lại.");
      return;
    }

    try {
      if (actionKind === "deactivate") {
        const data: ReportActiveRequest = { comment: comment || null };
        await deactivateReviewReport({ reportId: actionTarget.reportId, data }).unwrap();
        showMessage("Đã ẩn báo cáo và cập nhật thống kê.");
        closeActionDialog();
        await refreshCurrentPopup();
        return;
      }

      if (actionKind === "reactivate") {
        const data: ReportActiveRequest = { comment: comment || null };
        await reactivateReviewReport({ reportId: actionTarget.reportId, data }).unwrap();
        showMessage("Đã kích hoạt lại báo cáo và cập nhật thống kê.");
        closeActionDialog();
        await refreshCurrentPopup();
        return;
      }

      if (actionKind === "recallApproved") {
        const data: RecallApprovedReportRequest = { comment };
        await recallApprovedReviewReport({ reportId: actionTarget.reportId, data }).unwrap();
        showMessage("Đã thu hồi duyệt báo cáo.");
      } else {
        const data: ReturnReportRequest = { comment };
        await returnReviewReport({ reportId: actionTarget.reportId, data }).unwrap();
        showMessage("Đã trả lại báo cáo.");
      }

      closeActionDialog();
      await refreshCurrentPopup();
    } catch (err: any) {
      showMessage(err?.data?.message || err?.message || "Thao tác thất bại.");
    }
  };

  const renderSummaryListCell = React.useCallback(
    (title: string, display: string, tooltip: string, items: ReviewEntityListItem[]) => (
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
        <Tooltip title={<span style={{ whiteSpace: "pre-line" }}>{tooltip}</span>}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <CommonLabelText text={display} sx={{ minWidth: 0 }} />
          </Box>
        </Tooltip>
        <Tooltip title={`Xem danh sách ${title.toLowerCase()}`}>
          <span>
            <IconButton
              size="small"
              onClick={() => openViewList(title, items)}
              disabled={items.length === 0}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    ),
    [openViewList]
  );

  const summaryColumns: AppTableColumn<SummaryViewRow>[] = React.useMemo(
    () => [
      {
        field: "actions",
        header: "",
        width: 70,
        align: "center",
        sortable: false,
        render: (row) => (
          <Tooltip title={uiText(UITextKey.TextXemDanhSachReview)}>
            <IconButton size="small" onClick={() => void openPeriods(row)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
      {
        field: "dynamicExcelCode",
        header: "Biểu mẫu",
        width: "22%",
        sortable: false,
        render: (row) => <CommonLabelText text={getTemplateLabel(row)} />,
      },
      {
        field: "assigneeUsersDisplay",
        header: "Tài khoản",
        width: "20%",
        sortable: false,
        render: (row) =>
          renderSummaryListCell(
            "Danh sách tài khoản",
            row.assigneeUsersDisplay,
            row.assigneeUsersTooltip,
            row.assigneeUserItems
          ),
      },
      {
        field: "assigneeUnitsDisplay",
        header: "Đơn vị",
        width: "16%",
        sortable: false,
        render: (row) =>
          renderSummaryListCell(
            "Danh sách đơn vị",
            row.assigneeUnitsDisplay,
            row.assigneeUnitsTooltip,
            row.assigneeUnitItems
          ),
      },
      {
        field: "latestPeriodKey",
        header: "Ngày kỳ gần nhất",
        width: 140,
        sortable: false,
        render: (row) => <CommonLabelText text={formatDayKey(row.latestPeriodKey)} />,
      },
      {
        field: "progressStatus",
        header: "Tiến độ",
        width: 130,
        sortable: false,
        render: (row) => <AssignmentProgressChip status={row.progressStatus} />,
      },
      {
        field: "worstPeriodStatus",
        header: "Kỳ xấu nhất",
        width: 140,
        sortable: false,
        render: (row) => <ReportPeriodStatusChip status={row.worstPeriodStatus} />,
      },
      {
        field: "worstOverdueReasonLabel",
        header: "Bản chất trễ",
        width: "14%",
        sortable: false,
        render: (row) => <CommonLabelText text={getWorstOverdueLabel(row)} />,
      },
      {
        field: "latestDueAtUtc",
        header: "Hạn gần nhất",
        width: 130,
        sortable: false,
        render: (row) => <CommonDateText value={row.latestDueAtUtc} />,
      },
    ],
    [openPeriods, renderSummaryListCell]
  );

  const detailColumns: AppTableColumn<ReviewReportFlatRowDto>[] = React.useMemo(
    () => [
      {
        field: "actions",
        header: "",
        width: 220,
        sortable: false,
        align: "center",
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title={row.reportId ? "Xem báo cáo" : "Kỳ chưa có báo cáo"}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => row.reportId && setPreviewReportId(row.reportId)}
                  disabled={!row.reportId}
                >
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={uiText(UITextKey.TextDuyetBaoCao)}>
              <span>
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => void handleApprove(row)}
                  disabled={!canApprove(row) || approveState.isLoading}
                >
                  <CheckCircleOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={uiText(UITextKey.TextTraLaiBaoCao)}>
              <span>
                <IconButton
                  size="small"
                  color="warning"
                  onClick={() => openActionDialog("return", row)}
                  disabled={!canReturn(row) || returnState.isLoading}
                >
                  <UndoOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={uiText(UITextKey.TextThuHoiDuyet)}>
              <span>
                <IconButton
                  size="small"
                  color="secondary"
                  onClick={() => openActionDialog("recallApproved", row)}
                  disabled={!canRecallApproved(row) || recallState.isLoading}
                >
                  <ReplayOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={uiText(UITextKey.TextAnBaoCao)}>
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => openActionDialog("deactivate", row)}
                  disabled={!canDeactivate(row) || deactivateState.isLoading}
                >
                  <BlockOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={uiText(UITextKey.TextKichHoatLai)}>
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => openActionDialog("reactivate", row)}
                  disabled={!canReactivate(row) || reactivateState.isLoading}
                >
                  <RestoreOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      },
      {
        field: "assigneeUserName",
        header: "Tài khoản",
        width: 180,
        sortable: false,
        render: (row) => <CommonLabelText text={getRowUsername(row)} />,
      },
      {
        field: "assigneeUnitShortName",
        header: "Đơn vị",
        width: 150,
        sortable: false,
        render: (row) => <CommonLabelText text={getUnitLabel(row)} />,
      },
      {
        field: "periodKey",
        header: "Ngày kỳ",
        width: 120,
        sortable: false,
        render: (row) => <CommonLabelText text={formatDayKey(row.periodKey)} />,
      },
      {
        field: "periodStatus",
        header: "Trạng thái kỳ",
        width: 150,
        sortable: false,
        render: (row) => <ReportPeriodStatusChip status={row.periodStatus} />,
      },
      {
        field: "reportStatus",
        header: "Trạng thái báo cáo",
        width: 150,
        sortable: false,
        render: (row) => <ReportStatusChip status={row.reportStatus} />,
      },
      {
        field: "isHistoricalData",
        header: "Dữ liệu quá khứ",
        width: 150,
        sortable: false,
        render: (row) =>
          isHistoricalReviewRow(row) ? (
            <Chip
              size="small"
              color={row.historicalDataApproved ? "success" : "warning"}
              variant={row.historicalDataApproved ? "filled" : "outlined"}
              label={row.historicalDataApproved ? "Đã xác nhận" : "Cần xác nhận"}
            />
          ) : (
            <Chip size="small" variant="outlined" label="Không" />
          ),
      },
      {
        field: "dueAtUtc",
        header: "Hạn nộp",
        width: 160,
        sortable: false,
        render: (row) => <CommonDateText value={row.dueAtUtc} withTime />,
      },
      {
        field: "submittedAtUtc",
        header: "Ngày nộp",
        width: 160,
        sortable: false,
        render: (row) => <CommonDateText value={row.submittedAtUtc} withTime />,
      },
      {
        field: "approvedAtUtc",
        header: "Ngày duyệt",
        width: 160,
        sortable: false,
        render: (row) => <CommonDateText value={row.approvedAtUtc} withTime />,
      },
      {
        field: "returnReason",
        header: "Lý do từ chối",
        width: "18%",
        sortable: false,
        render: (row) => <CommonLabelText text={row.returnReason || row.reviewerComment || "-"} />,
      },
    ],
    [approveState.isLoading, deactivateState.isLoading, reactivateState.isLoading, recallState.isLoading, returnState.isLoading]
  );

  const summaryLoading = searchSummaryState.isLoading;
  const detailLoading = searchReviewReportsState.isLoading;
  const busyAction =
    approveState.isLoading ||
    returnState.isLoading ||
    recallState.isLoading ||
    deactivateState.isLoading ||
    reactivateState.isLoading;
  const detailPageCount = Math.max(1, Math.ceil((detailTotalRows || 0) / (detailPageSize || 1)));

  return (
    <Box sx={{ height: "100%", minHeight: 0 }}>
      <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{uiText(UITextKey.TextDuyetBaoCao)}</Typography>
        </Stack>

        <WorkReviewFilterBar
          unitId={summaryUnitId}
          onUnitIdChange={handleSummaryUnitChange}
          unitOptions={summaryUnitOptions}
          userId={summaryUserId}
          onUserIdChange={setSummaryUserId}
          userOptions={summaryUserOptions}
          periodDayKey={summaryPeriodDayKey}
          onPeriodDayKeyChange={setSummaryPeriodDayKey}
          reviewStatusBucket={reviewStatusBucket}
          onReviewStatusBucketChange={setReviewStatusBucket}
          loading={summaryLoading}
          disabled={!workId}
          onSearch={() => void loadSummary()}
        />

        {summaryLoading ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2">{uiText(UITextKey.TextDangTaiDuLieuReview)}</Typography>
          </Stack>
        ) : (
          <AppTable<SummaryViewRow>
            rows={summaryRows}
            columns={summaryColumns}
            rowKey={(row) => row.assignmentId}
            enablePagination={false}
          />
        )}
      </Stack>

      <Dialog
        open={periodDialogOpen}
        onClose={() => !detailLoading && setPeriodDialogOpen(false)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle>
          <Stack spacing={0.5}>
            <Typography variant="h6">{uiText(UITextKey.TextDanhSachKyCanDanhGia)}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {selectedSummary ? getTemplateLabel(selectedSummary) : "-"}
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", xl: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", xl: "center" }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  select
                  size="small"
                  label={uiText(UITextKey.TextTrangThai)}
                  value={detailStatusBucket}
                  onChange={(e) => {
                    const next = e.target.value as ReviewStatusBucket;
                    setDetailStatusBucket(next);
                    if (selectedSummaryRef.current) {
                      void loadDetailRows(selectedSummaryRef.current, 0, detailPageSize, next, detailUnitId, detailUserId);
                    }
                  }}
                  sx={{ minWidth: 180 }}
                >
                  {DETAIL_STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label={uiText(UITextKey.TextSoDong)}
                  value={detailPageSize}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDetailPageSize(next);
                    if (selectedSummaryRef.current) {
                      void loadDetailRows(selectedSummaryRef.current, 0, next, detailStatusBucket, detailUnitId, detailUserId);
                    }
                  }}
                  sx={{ minWidth: 120 }}
                >
                  {DETAIL_PAGE_SIZE_OPTIONS.map((n) => (
                    <MenuItem key={n} value={n}>
                      {n}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label={uiText(UITextKey.TextDonVi)}
                  value={detailUnitId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDetailUnitId(next);
                    if (selectedSummaryRef.current) {
                      void loadDetailRows(selectedSummaryRef.current, 0, detailPageSize, detailStatusBucket, next, detailUserId);
                    }
                  }}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="">{uiText(UITextKey.TextTatCaDonVi)}</MenuItem>
                  {detailUnitOptions.map((opt) => (
                    <MenuItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label={uiText(UITextKey.TextTaiKhoan)}
                  value={detailUserId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDetailUserId(next);
                    if (selectedSummaryRef.current) {
                      void loadDetailRows(selectedSummaryRef.current, 0, detailPageSize, detailStatusBucket, detailUnitId, next);
                    }
                  }}
                  sx={{ minWidth: 260 }}
                >
                  <MenuItem value="">{uiText(UITextKey.TextTatCaTaiKhoan)}</MenuItem>
                  {detailUserOptions.map((opt) => (
                    <MenuItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Button onClick={() => void refreshCurrentPopup()} disabled={detailLoading}>
                Refresh popup
              </Button>
            </Stack>

            {detailLoading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography variant="body2">{uiText(UITextKey.TextDangTaiDanhSachKy)}</Typography>
              </Stack>
            ) : (
              <>
                <AppTable<ReviewReportFlatRowDto>
                  rows={detailRows}
                  columns={detailColumns}
                  rowKey={(row) => row.workReportPeriodId || row.periodKey}
                  enablePagination={false}
                />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Trang {detailPage + 1} / {detailPageCount} • Tổng {detailTotalRows}
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={detailPage <= 0}
                      onClick={() => {
                        if (selectedSummaryRef.current) {
                          void loadDetailRows(
                            selectedSummaryRef.current,
                            Math.max(0, detailPage - 1),
                            detailPageSize,
                            detailStatusBucket,
                            detailUnitId,
                            detailUserId
                          );
                        }
                      }}
                    >
                      Trang trước
                    </Button>

                    <Button
                      variant="outlined"
                      size="small"
                      disabled={detailPage + 1 >= detailPageCount}
                      onClick={() => {
                        if (selectedSummaryRef.current) {
                          void loadDetailRows(
                            selectedSummaryRef.current,
                            Math.min(detailPageCount - 1, detailPage + 1),
                            detailPageSize,
                            detailStatusBucket,
                            detailUnitId,
                            detailUserId
                          );
                        }
                      }}
                    >
                      Trang sau
                    </Button>
                  </Stack>
                </Stack>
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setPeriodDialogOpen(false)}>{uiText(UITextKey.TextDong)}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!previewReportId} onClose={() => setPreviewReportId(null)} fullWidth maxWidth="xl">
        <DialogTitle>{uiText(UITextKey.TextXemBaoCao)}</DialogTitle>
        <DialogContent dividers>
          {previewReportId ? (
            <WorkReportEditorPage
              workId={workId}
              reportId={previewReportId}
              forceReadOnly
              onBack={() => setPreviewReportId(null)}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewReportId(null)}>{uiText(UITextKey.TextDong)}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!historicalApproveTarget}
        onClose={() => !approveState.isLoading && setHistoricalApproveTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Xác nhận duyệt dữ liệu từ quá khứ</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Alert severity="warning">
              Báo cáo này được đánh dấu là dữ liệu từ quá khứ. Khi duyệt, hệ thống ghi nhận reviewer đã xác nhận nghiệp vụ; trạng thái đúng hạn hoặc quá hạn được tính theo ngày hoàn thành so với hạn hoàn thành của kỳ.
            </Alert>
            <Typography variant="body2">
              Kỳ báo cáo: <b>{formatDayKey(historicalApproveTarget?.periodKey)}</b>
            </Typography>
            <Typography variant="body2">
              Ngày hoàn thành: <b>{formatDayKey(historicalApproveTarget?.completedDate || historicalApproveTarget?.periodEnd)}</b>
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoricalApproveTarget(null)} disabled={approveState.isLoading}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={approveState.isLoading || !historicalApproveTarget}
            onClick={() =>
              historicalApproveTarget &&
              void submitApprove(historicalApproveTarget, true)
            }
          >
            Xác nhận và duyệt
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={actionDialogOpen}
        onClose={() => !busyAction && closeActionDialog()}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{getActionTitle(actionKind)}</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Alert severity={actionKind === "deactivate" ? "warning" : "info"}>
              {getActionAlert(actionKind)}
            </Alert>

            <TextField
              size="small"
              label={actionKind === "deactivate" || actionKind === "reactivate" ? "Ghi chú" : "Lý do *"}
              value={actionComment}
              disabled={busyAction}
              onChange={(e) => setActionComment(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              required={actionKind !== "deactivate" && actionKind !== "reactivate"}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeActionDialog} disabled={busyAction}>
            {uiText(UITextKey.TextHuy3)}
          </Button>
          <Button
            variant="contained"
            color={getActionButtonColor(actionKind)}
            onClick={() => void handleConfirmAction()}
            disabled={busyAction}
          >
            {getActionButtonLabel(actionKind)}
          </Button>
        </DialogActions>
      </Dialog>

      <ReviewEntityListViewDialog
        open={summaryDialog.open}
        title={summaryDialog.title}
        items={summaryDialog.items}
        onClose={() => setSummaryDialog({ open: false, title: "", items: [] })}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default WorkReviewTab;
