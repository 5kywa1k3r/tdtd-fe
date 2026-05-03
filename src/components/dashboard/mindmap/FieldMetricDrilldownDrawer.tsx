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

  return source?.data?.message || source?.data?.error || source?.message || source?.error || "Khong tai duoc drilldown field.";
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

function getRowMetricValue(row: DashboardMindMapFieldMetricReportRowDto): string {
  if (row.fieldType === "number") return formatMetricNumber(row.sum);
  if (row.fieldType === "date") return formatMetricDate(row.latestDateUtc);
  if (row.fieldType === "boolean") {
    if (row.trueCount > 0 && row.falseCount === 0) return "True";
    if (row.falseCount > 0 && row.trueCount === 0) return "False";
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
        field: "valueCount",
        header: "Gia tri field",
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
                  avg {formatMetricNumber(row.average)} | {row.numericValueCount} number
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  min {formatMetricNumber(row.min)} / max {formatMetricNumber(row.max)}
                </Typography>
              </>
            ) : (
              <Typography variant="caption" color="text.secondary">
                {row.valueCount} value
              </Typography>
            )}
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
        header: "Nguon field",
        render: (row) => (
          <Stack spacing={1}>
            {noteBlock("Field", row.fieldLabel || row.fieldKey)}
            {noteBlock("Bucket", row.bucketLabel || row.bucketKey)}
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
            Drilldown field thong ke
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            {getMetricLabel(metric)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${data?.totalRows ?? 0} report`} />
          <Chip color="primary" variant="outlined" label={metric?.fieldType || "FIELD"} />
          <Chip variant="outlined" label={`Tong: ${getMetricValue(metric)}`} />
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
            Dang tai report dong gop field...
          </Typography>
        ) : null}
      </Stack>
    </Drawer>
  );
}
