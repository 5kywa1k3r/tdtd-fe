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
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import SingleDayKeyField, {
  dayKeyToIsoDate,
} from "../../../components/common/SingleDayKeyField";

import type {
  MyReportTemplateAssignmentOption,
  MyReportTemplateRow,
  WorkReportPeriodRow,
} from "../../../types/report";
import { parseMyReportTemplateDetail } from "../../../types/report.parses";
import { WorkReportPeriodStatus } from "../../../types/reportStatus";

import WorkReportEditorPage from "./WorkReportEditorPage";
import { UITextKey, uiText } from '../../../constants/uiText';

export interface WorkReportTemplateDetailPageProps {
  workId: string;
  group: MyReportTemplateRow;
  scopeAssignmentId?: string | null;
  scopeAssignmentIds?: string[];
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

function compactId(value?: string | null) {
  if (!value) return "";
  return value.length > 8 ? value.slice(-8) : value;
}

function formatAssignmentOptionLabel(option: MyReportTemplateAssignmentOption) {
  const code = option.assignmentCode?.trim();
  const type =
    option.assignmentType === "ONCE"
      ? "Một lần"
      : option.assignmentType === "PERIODIC_REPORT"
        ? "Định kỳ"
        : "Phân công";
  const date = normalizeDayKey(option.dueDate || option.dueAtUtc || option.completedDate);
  const suffix = date ? ` - ${date}` : "";
  return `${code || compactId(option.workAssignmentId) || "Phân công"} - ${type}${suffix}`;
}

function getAssignmentHardDueDayKey(option?: MyReportTemplateAssignmentOption | null) {
  return normalizeDayKey(option?.dueAtUtc || option?.dueDate || option?.completedDate);
}

function getCreateAssignmentId(
  options: MyReportTemplateAssignmentOption[],
  fallback?: string | null
) {
  if (options.length > 0) {
    return (
      options.find((x) => x.isActive !== false && x.allowUserCreatedReports !== false)
        ?.workAssignmentId ||
      options.find((x) => x.isActive !== false)?.workAssignmentId ||
      ""
    );
  }

  return (
    fallback ||
    ""
  );
}

export default function WorkReportTemplateDetailPage(
  props: WorkReportTemplateDetailPageProps
) {
  const { workId, group, scopeAssignmentId = null, scopeAssignmentIds = [], onBack } = props;
  const isBranchView = Boolean(scopeAssignmentId);

  const [selectedWorkReportPeriodId, setSelectedWorkReportPeriodId] =
    useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<WorkReportPeriodFilterValue>(
    defaultFilterValue()
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createReportDay, setCreateReportDay] = useState("");
  const [createAssignmentId, setCreateAssignmentId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useGetMyReportTemplateDetailQuery(
    {
      workId,
      dynamicFormTemplateId: group.dynamicFormTemplateId,
      scopeAssignmentId: scopeAssignmentId || null,
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

  const scopeIdSet = useMemo(() => {
    const ids = scopeAssignmentIds.length > 0
      ? scopeAssignmentIds
      : scopeAssignmentId
      ? [scopeAssignmentId]
      : [];
    return new Set(ids.filter(Boolean));
  }, [scopeAssignmentId, scopeAssignmentIds]);
  const allPeriods = useMemo(() => {
    const periods = parsed?.periods ?? [];
    if (scopeIdSet.size === 0) return periods;
    return periods.filter((period) => scopeIdSet.has(period.workAssignmentId));
  }, [parsed?.periods, scopeIdSet]);
  const assignmentOptions = useMemo(() => {
    const options = parsed?.assignmentOptions ?? [];
    if (scopeIdSet.size === 0) return options;
    return options.filter((option) => scopeIdSet.has(option.workAssignmentId));
  }, [parsed?.assignmentOptions, scopeIdSet]);
  const assignmentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    assignmentOptions.forEach((option) => {
      if (option.workAssignmentId) {
        map.set(option.workAssignmentId, formatAssignmentOptionLabel(option));
      }
    });
    return map;
  }, [assignmentOptions]);
  const assignmentTypeById = useMemo(() => {
    const map = new Map<string, string>();
    assignmentOptions.forEach((option) => {
      if (option.workAssignmentId && option.assignmentType) {
        map.set(option.workAssignmentId, option.assignmentType);
      }
    });
    return map;
  }, [assignmentOptions]);
  const showAssignmentColumn =
    assignmentOptions.filter((x) => x.workAssignmentId).length > 1;
  const defaultCreateAssignmentId = getCreateAssignmentId(
    assignmentOptions,
    parsed?.workAssignmentId
  );
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
    if (isBranchView) {
      if (!row.currentReportId) {
        setOpenError("Kỳ này chưa có báo cáo để xem.");
        return;
      }

      setSelectedWorkReportPeriodId(row.id);
      setSelectedReportId(row.currentReportId);
      return;
    }

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
    const assignmentId = defaultCreateAssignmentId;
    const assignmentDueDay = getAssignmentHardDueDayKey(
      assignmentOptions.find((option) => option.workAssignmentId === assignmentId)
    );
    const day = assignmentDueDay && assignmentDueDay < todayDayKey()
      ? assignmentDueDay
      : todayDayKey();
    setCreateTitle("");
    setCreateAssignmentId(assignmentId);
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
    const targetAssignmentId =
      createAssignmentId || getCreateAssignmentId(assignmentOptions, parsed?.workAssignmentId);

    if (!targetAssignmentId) {
      setCreateError("Thiếu công việc để tạo báo cáo chủ động.");
      return;
    }

    const reportDay = normalizeDayKey(createReportDay);

    if (reportDay.length !== 8) {
      setCreateError("Nhập ngày báo cáo.");
      return;
    }

    try {
      setCreateError(null);
      const created = await createUserCreatedReport({
        workAssignmentId: targetAssignmentId,
        data: {
          reportDate: dayKeyToApiDate(reportDay),
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
        forceReadOnly={isBranchView}
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
            disabled={isBranchView || !defaultCreateAssignmentId || createUserCreatedReportState.isLoading}
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
            showAssignment={showAssignmentColumn}
            getAssignmentLabel={(row) =>
              assignmentLabelById.get(row.workAssignmentId) ||
              compactId(row.workAssignmentId) ||
              "-"
            }
            getAssignmentType={(row) => assignmentTypeById.get(row.workAssignmentId)}
            onOpen={handleOpenPeriod}
            onRowDoubleClick={handleOpenPeriod}
            canOpen={(row) => !isBranchView || Boolean(row.currentReportId)}
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
            {assignmentOptions.length > 1 && (
              <FormControl size="small" fullWidth>
                <InputLabel id="create-report-assignment-label">Phân công</InputLabel>
                <Select
                  labelId="create-report-assignment-label"
                  label="Phân công"
                  value={createAssignmentId}
                  onChange={(event) => {
                    const nextAssignmentId = event.target.value;
                    setCreateAssignmentId(nextAssignmentId);
                    const nextAssignmentDueDay = getAssignmentHardDueDayKey(
                      assignmentOptions.find((option) => option.workAssignmentId === nextAssignmentId)
                    );
                    if (nextAssignmentDueDay && nextAssignmentDueDay < todayDayKey()) {
                      setCreateReportDay(nextAssignmentDueDay);
                    }
                  }}
                  disabled={createUserCreatedReportState.isLoading}
                >
                  {assignmentOptions.map((option) => (
                    <MenuItem
                      key={option.workTemplateAssigneeId || option.workAssignmentId}
                      value={option.workAssignmentId}
                      disabled={
                        option.isActive === false ||
                        option.allowUserCreatedReports === false
                      }
                    >
                      {formatAssignmentOptionLabel(option)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <SingleDayKeyField
              label="Ngày báo cáo"
              value={createReportDay}
              onChange={setCreateReportDay}
              disabled={createUserCreatedReportState.isLoading}
              fullWidth
            />
            <Alert severity="warning">
              Báo cáo chủ động là báo cáo phát sinh, không thay thế kỳ định kỳ bắt buộc. Khoảng báo cáo và hạn hoàn thành được xác định theo phân công đã giao.
            </Alert>
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
            disabled={
              createUserCreatedReportState.isLoading ||
              !createAssignmentId ||
              !createReportDay
            }
          >
            {createUserCreatedReportState.isLoading ? "Đang tạo..." : "Tạo bản nháp"}
          </Button>
        </DialogActions>
      </Dialog>

      {openError && <Alert severity="error">{openError}</Alert>}
    </Stack>
  );
}
