import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Divider,
  Drawer,
  Stack,
  Typography,
} from "@mui/material";

import { useSearchDashboardMindMapLabelReportsQuery } from "../../../api/dashboardMindMapApi";
import type {
  DashboardMindMapLabelReportRowDto,
  DashboardMindMapLabelSummaryDto,
  DashboardMindMapScopeRequest,
} from "../../../types/dashboardMindMap";
import { getWorkAssignmentReportStatusLabel } from "../../../types/reportStatus";
import { formatDateTime } from "../../../utils/dashboardUi";
import { AppTable, type AppTableColumn } from "../../common/AppTable";

type LabelDrilldownDrawerProps = {
  open: boolean;
  nodeId: string | null;
  label: DashboardMindMapLabelSummaryDto | null;
  scope: DashboardMindMapScopeRequest;
  onClose: () => void;
};

function getErrorMessage(error: unknown): string {
  const source = error as {
    data?: { message?: string; error?: string };
    message?: string;
    error?: string;
  };

  return source?.data?.message || source?.data?.error || source?.message || source?.error || "Không tải được chi tiết nhãn.";
}

function getLabelText(label: DashboardMindMapLabelSummaryDto | null) {
  if (!label) return "-";
  return label.labelName || label.labelCode;
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

export default function LabelDrilldownDrawer(props: LabelDrilldownDrawerProps) {
  const { open, nodeId, label, scope, onClose } = props;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data, isFetching, error } = useSearchDashboardMindMapLabelReportsQuery(
    {
      assignmentId: nodeId ?? "",
      req: {
        ...scope,
        labelCode: label?.labelCode ?? "",
        page,
        pageSize,
      },
    },
    {
      skip: !open || !nodeId || !label?.labelCode,
    },
  );

  const columns = useMemo<AppTableColumn<DashboardMindMapLabelReportRowDto>[]>(
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
        header: "Người dùng / đơn vị",
        width: 180,
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
        field: "rowCount",
        header: "Dòng gắn nhãn",
        width: 150,
        align: "right",
        render: (row) => (
          <Stack spacing={0.35} alignItems="flex-end">
            <Typography variant="body2" fontWeight={800}>
              {row.rowCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.blockIds.length || 0} phần bảng
            </Typography>
          </Stack>
        ),
      },
      {
        field: "status",
        header: "Trạng thái",
        width: 160,
        render: (row) => (
          <Stack spacing={0.5}>
            <Chip size="small" label={getWorkAssignmentReportStatusLabel(row.reportStatus)} />
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
        field: "sourceRows",
        header: "Nguồn nhãn",
        render: (row) => (
          <Stack spacing={1}>
            {noteBlock("Nhãn", row.labelName || row.labelCode)}
            {noteBlock("Phần bảng", row.blockIds.slice(0, 8).join(", "))}
            {noteBlock("Dòng", row.rowKeys.slice(0, 12).join(", "))}
            {noteBlock("Nguồn", row.sources.slice(0, 8).join(", "))}
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
          width: { xs: "100%", md: 1080 },
          p: 2,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
        },
      }}
    >
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Chi tiết nhãn thống kê
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            {getLabelText(label)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${data?.totalRows ?? 0} báo cáo`} />
          <Chip color="primary" variant="outlined" label={label?.labelCode || "LABEL"} />
          <Chip variant="outlined" label={`${label?.rowCount ?? 0} dòng gắn nhãn`} />
        </Stack>

        <Divider />

        {error ? <Alert severity="error">{getErrorMessage(error)}</Alert> : null}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <AppTable
            rows={data?.rows ?? []}
            columns={columns}
            rowKey={(row) => `${row.workAssignmentReportId}_${row.labelCode}`}
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
            Đang tải báo cáo đóng góp cho nhãn...
          </Typography>
        ) : null}
      </Stack>
    </Drawer>
  );
}
