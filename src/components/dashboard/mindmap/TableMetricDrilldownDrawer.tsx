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

import { useSearchDashboardMindMapTableMetricReportsQuery } from "../../../api/dashboardMindMapApi";
import type {
  DashboardMindMapScopeRequest,
  DashboardMindMapTableMetricReportRowDto,
  DashboardMindMapTableSummaryDto,
} from "../../../types/dashboardMindMap";
import { getWorkAssignmentReportStatusLabel } from "../../../types/reportStatus";
import { formatDateTime } from "../../../utils/dashboardUi";
import { AppTable, type AppTableColumn } from "../../common/AppTable";

type TableMetricDrilldownDrawerProps = {
  open: boolean;
  nodeId: string | null;
  metric: DashboardMindMapTableSummaryDto | null;
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

function getErrorMessage(error: unknown): string {
  const source = error as {
    data?: { message?: string; error?: string };
    message?: string;
    error?: string;
  };

  return source?.data?.message || source?.data?.error || source?.message || source?.error || "Khong tai duoc drilldown metric.";
}

function getMetricLabel(metric: DashboardMindMapTableSummaryDto | null): string {
  if (!metric) return "-";

  const axisLabel =
    metric.tableMode === "APPEND_ROWS"
      ? metric.columnKey
      : metric.tableMode === "APPEND_COLUMNS"
        ? metric.rowKey
        : metric.rowKey && metric.columnKey
          ? `${metric.rowKey}/${metric.columnKey}`
          : metric.metricKey;

  return `${metric.dynamicFormTemplateName || metric.blockId || metric.tableMode}: ${axisLabel || metric.metricKey}`;
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

export default function TableMetricDrilldownDrawer(props: TableMetricDrilldownDrawerProps) {
  const { open, nodeId, metric, scope, onClose } = props;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data, isFetching, error } = useSearchDashboardMindMapTableMetricReportsQuery(
    {
      assignmentId: nodeId ?? "",
      req: {
        ...scope,
        dynamicFormTemplateId: metric?.dynamicFormTemplateId ?? undefined,
        dynamicExcelTemplateId: metric?.dynamicExcelTemplateId ?? undefined,
        blockId: metric?.blockId ?? undefined,
        tableMode: metric?.tableMode ?? undefined,
        metricKey: metric?.metricKey ?? "",
        page,
        pageSize,
      },
    },
    {
      skip: !open || !nodeId || !metric?.metricKey,
    },
  );

  const columns = useMemo<AppTableColumn<DashboardMindMapTableMetricReportRowDto>[]>(
    () => [
      {
        field: "assignmentName",
        header: "Assignment",
        width: 220,
        render: (row) => (
          <Stack spacing={0.45}>
            <Typography variant="body2" fontWeight={700}>
              {row.assignmentCode || "-"} - {row.assignmentName || "Chua ro ten"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.periodKey || "-"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "assigneeFullName",
        header: "Nguoi / don vi",
        width: 180,
        render: (row) => (
          <Stack spacing={0.45}>
            <Typography variant="body2" fontWeight={700}>
              {row.assigneeFullName || row.assigneeUsername || "Chua ro nguoi dung"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.unitLabel || "Chua ro don vi"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "sum",
        header: "Gia tri metric",
        width: 190,
        align: "right",
        render: (row) => (
          <Stack spacing={0.35} alignItems="flex-end">
            <Typography variant="body2" fontWeight={800}>
              {formatMetricNumber(row.sum)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              avg {formatMetricNumber(row.average)} | {row.valueCount} value
            </Typography>
            <Typography variant="caption" color="text.secondary">
              min {formatMetricNumber(row.min)} / max {formatMetricNumber(row.max)}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "status",
        header: "Trang thai",
        width: 160,
        render: (row) => (
          <Stack spacing={0.5}>
            <Chip size="small" label={getWorkAssignmentReportStatusLabel(row.reportStatus)} />
            <Typography variant="caption" color="text.secondary">
              Gui: {formatDateTime(row.submittedAtUtc)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Duyet: {formatDateTime(row.approvedAtUtc)}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "sourceKeys",
        header: "Nguon metric",
        render: (row) => (
          <Stack spacing={1}>
            {noteBlock("MetricKey", row.metricKey)}
            {noteBlock("Row/Column", `${row.rowKey || "-"} / ${row.columnKey || "-"}`)}
            {noteBlock("Source keys", row.sourceKeys.slice(0, 12).join(", "))}
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
            Drilldown metric bang
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            {getMetricLabel(metric)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${data?.totalRows ?? 0} report`} />
          <Chip color="primary" variant="outlined" label={metric?.tableMode || "TABLE"} />
          <Chip variant="outlined" label={`Tong: ${formatMetricNumber(metric?.sum)}`} />
        </Stack>

        <Divider />

        {error ? <Alert severity="error">{getErrorMessage(error)}</Alert> : null}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <AppTable
            rows={data?.rows ?? []}
            columns={columns}
            rowKey={(row) => `${row.workAssignmentReportId}_${row.metricKey}`}
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
            Dang tai report dong gop metric...
          </Typography>
        ) : null}
      </Stack>
    </Drawer>
  );
}
