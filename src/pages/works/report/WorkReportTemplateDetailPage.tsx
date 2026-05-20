import { useMemo, useState } from "react";
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
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

import WorkReportPeriodTable from "../../../components/reports/WorkReportPeriodTable";
import WorkReportPeriodFilterBar, {
  type WorkReportPeriodFilterValue,
} from "../../../components/reports/WorkReportPeriodFilterBar";

import {
  useCreateUserCreatedReportMutation,
  useGetMyReportTemplateDetailQuery,
  useOpenWorkReportPeriodMutation,
} from "../../../api/reportApi";
import SingleDayKeyField, { dayKeyToIsoDate } from "../../../components/common/SingleDayKeyField";

import type { MyReportTemplateRow, WorkReportPeriodRow } from "../../../types/report";
import { parseMyReportTemplateDetail } from "../../../types/report.parses";
import { WorkReportPeriodStatus } from "../../../types/reportStatus";

import WorkReportEditorPage from "./WorkReportEditorPage";
import { UITextKey, uiText } from '../../../constants/uiText';

export interface WorkReportTemplateDetailPageProps {
  workId: string;
  group: MyReportTemplateRow;
  onBack?: () => void;
}

const defaultFilterValue = (): WorkReportPeriodFilterValue => ({
  statusBucket: "ALL",
});

function matchStatusBucket(
  row: WorkReportPeriodRow,
  bucket: WorkReportPeriodFilterValue["statusBucket"]
) {
  const status = row.status;

  switch (bucket) {
    case "PENDING":
      return status === WorkReportPeriodStatus.Pending;

    case "SUBMITTED":
      return status === WorkReportPeriodStatus.Submitted;

    case "OVERDUE":
      return (
        status === WorkReportPeriodStatus.OverduePending ||
        status === WorkReportPeriodStatus.OverdueDraft ||
        status === WorkReportPeriodStatus.OverdueSubmitted ||
        status === WorkReportPeriodStatus.OverdueApproved
      );

    case "RETURNED":
      return (
        !!row.returnReason &&
        !!row.lastReviewedAtUtc &&
        (status === WorkReportPeriodStatus.Draft ||
          status === WorkReportPeriodStatus.OverdueDraft)
      );

    case "ALL":
    default:
      return true;
  }
}

function normalizeDayKey(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 8);
}

function todayDayKey() {
  const now = new Date();
  const yyyy = String(now.getFullYear()).padStart(4, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function dayKeyToApiDate(dayKey?: string | null) {
  const normalized = normalizeDayKey(dayKey);
  return normalized.length === 8 ? `${dayKeyToIsoDate(normalized)}T00:00:00.000Z` : null;
}

function getErrorMessage(error: unknown, fallback: string) {
  const anyError = error as any;
  return anyError?.data?.message || anyError?.data?.title || anyError?.message || fallback;
}

function getPeriodAnchorDayKey(row: WorkReportPeriodRow) {
  return (
    normalizeDayKey(row.periodEnd) ||
    normalizeDayKey(row.reportDate) ||
    normalizeDayKey(row.periodStart) ||
    normalizeDayKey(row.periodKey)
  );
}

function hasReportData(row: WorkReportPeriodRow) {
  return Boolean(row.currentReportId || (row.reportVersionCount ?? 0) > 0);
}

export default function WorkReportTemplateDetailPage(
  props: WorkReportTemplateDetailPageProps
) {
  const { workId, group, onBack } = props;

  const [selectedWorkReportPeriodId, setSelectedWorkReportPeriodId] =
    useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<WorkReportPeriodFilterValue>(
    defaultFilterValue()
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createStartDay, setCreateStartDay] = useState("");
  const [createEndDay, setCreateEndDay] = useState("");
  const [createReportDay, setCreateReportDay] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useGetMyReportTemplateDetailQuery(
    {
      workId,
      dynamicFormTemplateId: group.dynamicFormTemplateId,
    },
    {
      skip: !workId || !group.dynamicFormTemplateId,
    }
  );

  const [openWorkReportPeriod] = useOpenWorkReportPeriodMutation();
  const [createUserCreatedReport, createUserCreatedReportState] =
    useCreateUserCreatedReportMutation();

  const parsed = useMemo(() => {
    if (!data) return null;
    return parseMyReportTemplateDetail(data);
  }, [data]);

  const allPeriods = parsed?.periods ?? [];

  const filteredPeriods = useMemo(
    () => allPeriods.filter((row) => matchStatusBucket(row, filterValue.statusBucket)),
    [allPeriods, filterValue.statusBucket]
  );

  const pastReportStats = useMemo(() => {
    const today = todayDayKey();
    const pastRows = allPeriods.filter((row) => {
      const anchor = getPeriodAnchorDayKey(row);
      return Boolean(anchor && anchor < today);
    });
    const reported = pastRows.filter(hasReportData).length;
    return {
      required: pastRows.length,
      reported,
      missing: Math.max(0, pastRows.length - reported),
    };
  }, [allPeriods]);

  const handleOpenPeriod = async (row: WorkReportPeriodRow) => {
    try {
      setOpenError(null);
      const rs = await openWorkReportPeriod({
        workReportPeriodId: row.id,
      }).unwrap();

      setSelectedWorkReportPeriodId(row.id);
      setSelectedReportId(rs.id);
    } catch (err: any) {
      setOpenError(err?.data?.message || err?.message || "Không mở được kỳ báo cáo.");
    }
  };

  const handleOpenCreateUserReport = () => {
    const day = todayDayKey();
    setCreateTitle("");
    setCreateStartDay(day);
    setCreateEndDay(day);
    setCreateReportDay(day);
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleCloseCreateUserReport = () => {
    if (createUserCreatedReportState.isLoading) return;
    setCreateOpen(false);
    setCreateError(null);
  };

  const handleCreateUserReport = async () => {
    if (!parsed?.workAssignmentId) {
      setCreateError("Thiếu assignment để tạo báo cáo chủ động.");
      return;
    }

    const startDay = normalizeDayKey(createStartDay);
    const endDay = normalizeDayKey(createEndDay);
    const reportDay = normalizeDayKey(createReportDay || endDay);

    if (startDay.length !== 8 || endDay.length !== 8 || reportDay.length !== 8) {
      setCreateError("Nhập đủ ngày bắt đầu, ngày kết thúc và ngày báo cáo.");
      return;
    }

    if (endDay < startDay) {
      setCreateError("Ngày kết thúc không được trước ngày bắt đầu.");
      return;
    }

    if (reportDay < startDay || reportDay > endDay) {
      setCreateError("Ngày báo cáo phải nằm trong khoảng ngày bắt đầu - kết thúc.");
      return;
    }

    try {
      setCreateError(null);
      const completedDate = endDay < todayDayKey() ? dayKeyToApiDate(endDay) : null;
      const created = await createUserCreatedReport({
        workAssignmentId: parsed.workAssignmentId,
        data: {
          periodKey: reportDay,
          reportDate: dayKeyToApiDate(reportDay),
          periodStart: dayKeyToApiDate(startDay),
          periodEnd: dayKeyToApiDate(endDay),
          startedDate: dayKeyToApiDate(startDay),
          completedDate,
          reportTitle: createTitle.trim() || `Báo cáo chủ động ${reportDay}`,
        },
      }).unwrap();

      setCreateOpen(false);
      setSelectedWorkReportPeriodId(created.workReportPeriodId);
      setSelectedReportId(created.id);
      void refetch();
    } catch (err: unknown) {
      setCreateError(getErrorMessage(err, "Không tạo được báo cáo chủ động."));
    }
  };

  if (selectedReportId) {
    return (
      <WorkReportEditorPage
        workId={workId}
        reportId={selectedReportId}
        workReportPeriodId={selectedWorkReportPeriodId ?? undefined}
        onBack={() => {
          setSelectedReportId(null);
          setSelectedWorkReportPeriodId(null);
          void refetch();
        }}
        onSaved={() => {
          void refetch();
        }}
        onSubmitted={() => {
          void refetch();
        }}
      />
    );
  }

  if (isLoading && !parsed) {
    return (
      <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1.5}
        >
          <Box>
            <Typography variant="h6" fontWeight={800}>
              {group.dynamicExcelName || "Chi tiết biểu mẫu"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {group.dynamicExcelCode} • {group.bindingCount} phân công • {group.periodCount} kỳ
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleOpenCreateUserReport}
            disabled={!parsed?.workAssignmentId || createUserCreatedReportState.isLoading}
            sx={{ borderRadius: 2 }}
          >
            Tạo báo cáo chủ động
          </Button>

          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{ borderRadius: 2 }}
          >
            Quay lại nhóm biểu mẫu
          </Button>
        </Stack>
      </Paper>

      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Chọn một kỳ báo cáo để mở chi tiết. Người báo cáo lưu nháp và nộp báo cáo tại đây;
        phần rà soát nên thực hiện ở tab duyệt báo cáo.
      </Alert>

      <Alert severity={pastReportStats.missing > 0 ? "warning" : "success"} sx={{ borderRadius: 2 }}>
        Kỳ quá khứ: cần {pastReportStats.required} báo cáo, đã có {pastReportStats.reported} báo cáo, còn {pastReportStats.missing} báo cáo chưa báo cáo. Job tự động chỉ xử lý từ hiện tại trở đi.
      </Alert>

      <WorkReportPeriodFilterBar
        value={filterValue}
        onChange={setFilterValue}
        onReset={() => setFilterValue(defaultFilterValue())}
      />

      <Stack direction="row" spacing={1}>
        <Chip label={`Hiển thị: ${filteredPeriods.length}`} />
        <Chip label={`Tổng kỳ: ${allPeriods.length}`} color="primary" variant="outlined" />
      </Stack>

      {error ? (
        <Alert severity="error">{uiText(UITextKey.TextKhongTaiDuocChiTietBieuMauBaoCao)}</Alert>
      ) : filteredPeriods.length === 0 ? (
        <Alert severity="info">{uiText(UITextKey.TextKhongCoKyBaoCaoPhuHopVoiBo)}</Alert>
      ) : (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, overflow: "hidden" }}>
          <WorkReportPeriodTable
            rows={filteredPeriods}
            onOpen={handleOpenPeriod}
            onRowDoubleClick={handleOpenPeriod}
          />
        </Paper>
      )}

      {isFetching && (
        <Typography variant="body2" color="text.secondary">
          Đang đồng bộ dữ liệu kỳ báo cáo...
        </Typography>
      )}

      <Dialog open={createOpen} onClose={handleCloseCreateUserReport} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Tạo báo cáo chủ động</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField
              size="small"
              label="Tiêu đề"
              value={createTitle}
              onChange={(event) => setCreateTitle(event.target.value)}
              disabled={createUserCreatedReportState.isLoading}
              fullWidth
              autoFocus
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <SingleDayKeyField
                label="Ngày bắt đầu"
                value={createStartDay}
                onChange={(dayKey) => {
                  setCreateStartDay(dayKey);
                  if (createEndDay && dayKey && createEndDay < dayKey) {
                    setCreateEndDay(dayKey);
                    setCreateReportDay(dayKey);
                  }
                }}
                maxDayKey={createEndDay || undefined}
                disabled={createUserCreatedReportState.isLoading}
                fullWidth
              />
              <SingleDayKeyField
                label="Ngày kết thúc"
                value={createEndDay}
                onChange={(dayKey) => {
                  setCreateEndDay(dayKey);
                  if (dayKey) {
                    setCreateReportDay(dayKey);
                  }
                }}
                minDayKey={createStartDay || undefined}
                disabled={createUserCreatedReportState.isLoading}
                fullWidth
              />
            </Stack>
            <SingleDayKeyField
              label="Ngày báo cáo"
              value={createReportDay}
              onChange={setCreateReportDay}
              minDayKey={createStartDay || undefined}
              maxDayKey={createEndDay || undefined}
              disabled={createUserCreatedReportState.isLoading}
              fullWidth
            />
            {createError ? (
              <Alert severity="error">{createError}</Alert>
            ) : (
              <Alert severity="info">
                Báo cáo chủ động sẽ được tạo dạng bản nháp; có thể nhập dữ liệu và nộp ngay sau khi mở.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateUserReport} disabled={createUserCreatedReportState.isLoading}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleCreateUserReport()}
            disabled={createUserCreatedReportState.isLoading}
          >
            {createUserCreatedReportState.isLoading ? "Đang tạo..." : "Tạo bản nháp"}
          </Button>
        </DialogActions>
      </Dialog>

      {openError && <Alert severity="error">{openError}</Alert>}
    </Stack>
  );
}
