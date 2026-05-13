import { useDeferredValue, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Divider,
  Drawer,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useSearchDashboardMindMapNodeReportsQuery } from "../../../api/dashboardMindMapApi";
import type {
  DashboardMindMapBucket,
  DashboardMindMapReportRowDto,
  DashboardMindMapScopeRequest,
} from "../../../types/dashboardMindMap";
import { formatDateTime } from "../../../utils/dashboardUi";
import { AppTable, type AppTableColumn } from "../../common/AppTable";
import { UITextKey, uiText } from '../../../constants/uiText';

type ReportDrilldownDrawerProps = {
  open: boolean;
  nodeId: string | null;
  bucket: DashboardMindMapBucket;
  scope: DashboardMindMapScopeRequest;
  onClose: () => void;
};

const BUCKET_LABELS: Partial<Record<DashboardMindMapBucket, string>> = {
  ALL: "Tất cả",
  TODO: "Chưa làm",
  DONE: "Đã làm",
  PENDING: "Chưa bắt đầu",
  DRAFT: "Bản nháp",
  SUBMITTED: "Đã gửi",
  APPROVED: "Đã duyệt",
  OVERDUE: "Chậm muộn",
};

function getErrorMessage(error: unknown): string {
  const source = error as {
    data?: { message?: string; error?: string };
    message?: string;
    error?: string;
  };

  return source?.data?.message || source?.data?.error || source?.message || source?.error || "Không tải được danh sách báo cáo.";
}

function noteBlock(label: string, value?: string | null) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
        {value?.trim() || "-"}
      </Typography>
    </Box>
  );
}

export default function ReportDrilldownDrawer(props: ReportDrilldownDrawerProps) {
  const { open, nodeId, bucket, scope, onClose } = props;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword.trim());

  const { data, isFetching, error } = useSearchDashboardMindMapNodeReportsQuery(
    {
      assignmentId: nodeId ?? "",
      req: {
        ...scope,
        bucket,
        q: deferredKeyword || undefined,
        page,
        pageSize,
      },
    },
    {
      skip: !open || !nodeId,
    },
  );

  const columns = useMemo<AppTableColumn<DashboardMindMapReportRowDto>[]>(
    () => [
      {
        field: "assignmentName",
        header: "Công việc",
        width: 220,
        render: (row) => (
          <Stack spacing={0.45}>
            <Typography variant="body2" fontWeight={700}>
              {row.assignmentCode || "-"} - {row.assignmentName || "Chưa rõ tên"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.periodKey || "-"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "assigneeFullName",
        header: "Người / đơn vị",
        width: 190,
        render: (row) => (
          <Stack spacing={0.45}>
            <Typography variant="body2" fontWeight={700}>
              {row.assigneeFullName || row.assigneeUsername || "Chưa rõ người dùng"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.unitLabel || "Chưa rõ đơn vị"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "timeline",
        header: "Thời gian",
        width: 190,
        render: (row) => (
          <Stack spacing={0.35}>
            <Typography variant="caption" color="text.secondary">
              Hạn: {formatDateTime(row.dueAtUtc)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gửi: {formatDateTime(row.submittedAtUtc)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Duyệt: {formatDateTime(row.approvedAtUtc)}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "notes",
        header: "Nội dung báo cáo / đánh giá",
        render: (row) => (
          <Stack spacing={1}>
            {noteBlock("Trạng thái tiến độ", row.currentProgressStatus)}
            {noteBlock("Lý do báo cáo", row.reportReason)}
            {noteBlock("Khó khăn", row.difficulties)}
            {noteBlock("Giải pháp đề xuất", row.proposedSolution)}
            {noteBlock("Lý do chậm", row.lateReason)}
            {noteBlock("Phản hồi / trả lại", row.reviewerComment || row.returnReason)}
            {noteBlock("Đánh giá của người duyệt", row.reviewerEvaluation)}
          </Stack>
        ),
      },
    ],
    [],
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{
        sx: { zIndex: (theme) => theme.zIndex.modal + 30 },
      }}
      PaperProps={{
        sx: {
          width: { xs: "100%", md: 1040 },
          p: 2,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
        },
      }}
    >
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Chi tiết báo cáo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            Nhóm hiện tại: {BUCKET_LABELS[bucket] ?? bucket}. Dữ liệu lấy theo toàn bộ nhánh đang chọn.
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          <TextField
            label={uiText(UITextKey.TextTimNhanh)}
            placeholder={uiText(UITextKey.TextAssignmentNguoiDungDonViKyBaoCao)}
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(0);
            }}
            sx={{ flex: 1 }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${data?.totalRows ?? 0} dòng`} />
            <Chip color="primary" variant="outlined" label={BUCKET_LABELS[bucket] ?? bucket} />
          </Stack>
        </Stack>

        <Divider />

        {error ? <Alert severity="error">{getErrorMessage(error)}</Alert> : null}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <AppTable
            rows={data?.rows ?? []}
            columns={columns}
            rowKey={(row) => row.workReportPeriodId}
            enablePagination
            paginationMode="server"
            page={page}
            pageSize={pageSize}
            totalRows={data?.totalRows ?? 0}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </Box>

        {isFetching ? (
          <Typography variant="caption" color="text.secondary">
            Đang tải danh sách báo cáo...
          </Typography>
        ) : null}
      </Stack>
    </Drawer>
  );
}
