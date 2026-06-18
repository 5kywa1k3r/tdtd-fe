import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import WorkReportPeriodTable from "../../../components/reports/WorkReportPeriodTable";
import WorkReportPeriodFilterBar, {
  type WorkReportPeriodFilterValue,
} from "../../../components/reports/WorkReportPeriodFilterBar";

import {
  useGetMyReportTemplateDetailQuery,
  useOpenWorkReportPeriodMutation,
} from "../../../api/reportApi";

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
        Kỳ quá khứ: cần {pastReportStats.required} báo cáo, đã có {pastReportStats.reported} báo cáo, còn {pastReportStats.missing} báo cáo chưa báo cáo. Job tự động sinh cửa sổ kỳ gần nhất theo cấu hình.
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

      {openError && <Alert severity="error">{openError}</Alert>}
    </Stack>
  );
}
