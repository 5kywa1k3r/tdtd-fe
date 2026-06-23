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

import { useSearchDashboardMindMapFieldMetricReportsQuery } from "../../../api/dashboardMindMapApi";
import type {
  DashboardMindMapFieldMetricReportRowDto,
  DashboardMindMapFieldSummaryDto,
  DashboardMindMapScopeRequest,
} from "../../../types/dashboardMindMap";
import { getWorkAssignmentReportStatusLabel } from "../../../types/reportStatus";
import { formatDateTime } from "../../../utils/dashboardUi";
import { AppTable, type AppTableColumn } from "../../common/AppTable";

type FieldMetricDrilldownDrawerProps = {
  open: boolean;
  nodeId: string | null;
  metric: DashboardMindMapFieldSummaryDto | null;
  scope: DashboardMindMapScopeRequest;
  onClose: () => void;
};

const metricNumberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

function formatMetricNumber(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "0";
  return metricNumberFormatter.format(value);
}

function formatMetricDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN");
}

function getErrorMessage(error: unknown): string {
  const source = error as {
    data?: { message?: string; error?: string };
    message?: string;
    error?: string;
  };

  return source?.data?.message || source?.data?.error || source?.message || source?.error || "Không tải được chi tiết trường dữ liệu.";
}

function getMetricLabel(metric: DashboardMindMapFieldSummaryDto | null): string {
  if (!metric) return "-";
  const fieldLabel = metric.fieldLabel || metric.fieldKey || metric.fieldId;
  return metric.bucketLabel || metric.bucketKey
    ? `${fieldLabel}: ${metric.bucketLabel || metric.bucketKey}`
    : fieldLabel;
}

function getMetricValue(metric: DashboardMindMapFieldSummaryDto | null): string {
  if (!metric) return "-";
  if (metric.fieldType === "number") return formatMetricNumber(metric.sum);
  if (metric.fieldType === "date") return formatMetricDate(metric.latestDateUtc);
  return formatMetricNumber(metric.valueCount);
}

function getFieldTypeLabel(fieldType?: string | null): string {
  switch (fieldType) {
    case "number":
      return "Số";
    case "date":
      return "Ngày";
    case "boolean":
      return "Có/không";
    case "shortText":
      return "Nội dung cố định";
    case "stringList":
      return "Nội dung";
    case "longText":
      return "Nội dung";
    case "singleSelect":
      return "Chọn một";
    case "multiSelect":
      return "Chọn nhiều";
    default:
      return "Trường dữ liệu";
  }
}

function getRowMetricValue(row: DashboardMindMapFieldMetricReportRowDto): string {
  if (row.fieldType === "number") return formatMetricNumber(row.sum);
  if (row.fieldType === "date") return formatMetricDate(row.latestDateUtc);
  if (row.fieldType === "boolean") {
    if (row.trueCount > 0 && row.falseCount === 0) return "Có";
    if (row.falseCount > 0 && row.trueCount === 0) return "Không";
  }

  return formatMetricNumber(row.valueCount);
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

export default function FieldMetricDrilldownDrawer(props: FieldMetricDrilldownDrawerProps) {
  const { open, nodeId, metric, scope, onClose } = props;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data, isFetching, error } = useSearchDashboardMindMapFieldMetricReportsQuery(
    {
      assignmentId: nodeId ?? "",
      req: {
        ...scope,
        dynamicFormTemplateId: metric?.dynamicFormTemplateId ?? undefined,
        fieldId: metric?.fieldId ?? "",
        bucketKey: metric?.bucketKey ?? undefined,
        page,
        pageSize,
      },
    },
    {
      skip: !open || !nodeId || !metric?.fieldId,
    },
  );

  const columns = useMemo<AppTableColumn<DashboardMindMapFieldMetricReportRowDto>[]>(
    () => [
      {
        field: "assignmentName",
        header: "Công việc",
        width: 220,
        render: (row) => (
          <Stack spacing={0.45}>
            <Typography variant="body2" fontWeight={700}>
              {row.assignmentName || "Chưa rõ tên"}
            </Typography>
            {row.assignmentCode ? (
              <Chip size="small" variant="outlined" label={row.assignmentCode} sx={{ width: "fit-content" }} />
            ) : null}
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
        field: "valueCount",
        header: "Giá trị trường",
        width: 210,
        align: "right",
        render: (row) => (
          <Stack spacing={0.35} alignItems="flex-end">
            <Typography variant="body2" fontWeight={800}>
              {getRowMetricValue(row)}
            </Typography>
            {row.numericValueCount > 0 ? (
              <>
                <Typography variant="caption" color="text.secondary">
                  Trung bình {formatMetricNumber(row.average)} | {row.numericValueCount} số
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Nhỏ nhất {formatMetricNumber(row.min)} / lớn nhất {formatMetricNumber(row.max)}
                </Typography>
              </>
            ) : (
              <Typography variant="caption" color="text.secondary">
                {row.valueCount} giá trị
              </Typography>
            )}
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
        field: "sourceKeys",
        header: "Nguồn dữ liệu",
        render: (row) => (
          <Stack spacing={1}>
            {noteBlock("Trường dữ liệu", row.fieldLabel || row.fieldKey)}
            {noteBlock("Nhóm giá trị", row.bucketLabel || row.bucketKey)}
            {noteBlock("Mã nguồn", row.sourceKeys.slice(0, 12).join(", "))}
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
            Chi tiết trường thống kê
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            {getMetricLabel(metric)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${data?.totalRows ?? 0} báo cáo`} />
          <Chip color="primary" variant="outlined" label={getFieldTypeLabel(metric?.fieldType)} />
          <Chip variant="outlined" label={`Tổng: ${getMetricValue(metric)}`} />
        </Stack>

        <Divider />

        {error ? <Alert severity="error">{getErrorMessage(error)}</Alert> : null}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <AppTable
            rows={data?.rows ?? []}
            columns={columns}
            rowKey={(row) => `${row.workAssignmentReportId}_${row.fieldId}_${row.bucketKey ?? "value"}`}
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
            Đang tải báo cáo đóng góp cho trường dữ liệu...
          </Typography>
        ) : null}
      </Stack>
    </Drawer>
  );
}
