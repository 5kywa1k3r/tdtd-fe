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

  const parsed = useMemo(() => {
    if (!data) return null;
    return parseMyReportTemplateDetail(data);
  }, [data]);

  const allPeriods = parsed?.periods ?? [];

  const filteredPeriods = useMemo(
    () => allPeriods.filter((row) => matchStatusBucket(row, filterValue.statusBucket)),
    [allPeriods, filterValue.statusBucket]
  );

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

      {openError && <Alert severity="error">{openError}</Alert>}
    </Stack>
  );
}
