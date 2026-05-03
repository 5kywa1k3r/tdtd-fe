import {
  Alert,
  Box,
  Chip,
  Divider,
  Popover,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";

import { useGetDashboardMindMapNodeSummaryQuery } from "../../../api/dashboardMindMapApi";
import type {
  DashboardMindMapBucket,
  DashboardMindMapFieldSummaryDto,
  DashboardMindMapScopeRequest,
  DashboardMindMapTableSummaryDto,
} from "../../../types/dashboardMindMap";
import type { SummaryAnchorPosition } from "./AssignmentMindNode";
import StatusStackedBar from "./StatusStackedBar";

type NodeSummaryPopoverProps = {
  open: boolean;
  nodeId: string | null;
  scope: DashboardMindMapScopeRequest;
  anchorPosition: SummaryAnchorPosition | null;
  onClose: () => void;
  onOpenUnitBucket: (nodeId: string, bucket: DashboardMindMapBucket) => void;
  onOpenReportBucket: (nodeId: string, bucket: DashboardMindMapBucket) => void;
  onOpenTableMetric: (nodeId: string, metric: DashboardMindMapTableSummaryDto) => void;
  onOpenFieldMetric: (nodeId: string, metric: DashboardMindMapFieldSummaryDto) => void;
};

function getErrorMessage(error: unknown): string {
  const source = error as {
    data?: { message?: string; error?: string };
    message?: string;
    error?: string;
  };

  return source?.data?.message || source?.data?.error || source?.message || source?.error || "Khong tai duoc chi tiet node.";
}

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

function getTableMetricLabel(item: DashboardMindMapTableSummaryDto): string {
  const axisLabel =
    item.tableMode === "APPEND_ROWS"
      ? item.columnKey
      : item.tableMode === "APPEND_COLUMNS"
        ? item.rowKey
        : item.rowKey && item.columnKey
          ? `${item.rowKey}/${item.columnKey}`
          : item.metricKey;

  const blockLabel = item.dynamicFormTemplateName || item.blockId || item.tableMode;
  return `${blockLabel}: ${axisLabel || item.metricKey}`;
}

function getTableMetricTitle(item: DashboardMindMapTableSummaryDto): string {
  return [
    item.metricKey,
    `mode=${item.tableMode}`,
    `sum=${formatMetricNumber(item.sum)}`,
    `avg=${formatMetricNumber(item.average)}`,
    `values=${item.valueCount}`,
    `reports=${item.reportCount}`,
  ].join(" | ");
}

function getFieldMetricLabel(item: DashboardMindMapFieldSummaryDto): string {
  const fieldLabel = item.fieldLabel || item.fieldKey || item.fieldId;
  if (item.bucketLabel || item.bucketKey) {
    return `${fieldLabel}: ${item.bucketLabel || item.bucketKey}`;
  }

  return fieldLabel;
}

function getFieldMetricValue(item: DashboardMindMapFieldSummaryDto): string {
  if (item.fieldType === "number") {
    return formatMetricNumber(item.sum);
  }

  if (item.fieldType === "date") {
    return formatMetricDate(item.latestDateUtc);
  }

  return formatMetricNumber(item.valueCount);
}

function getFieldMetricTitle(item: DashboardMindMapFieldSummaryDto): string {
  return [
    item.fieldKey,
    `type=${item.fieldType}`,
    `values=${item.valueCount}`,
    `reports=${item.reportCount}`,
    item.sum != null ? `sum=${formatMetricNumber(item.sum)}` : null,
    item.average != null ? `avg=${formatMetricNumber(item.average)}` : null,
    item.latestDateUtc ? `latest=${formatMetricDate(item.latestDateUtc)}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export default function NodeSummaryPopover(props: NodeSummaryPopoverProps) {
  const {
    open,
    nodeId,
    scope,
    anchorPosition,
    onClose,
    onOpenUnitBucket,
    onOpenReportBucket,
    onOpenTableMetric,
    onOpenFieldMetric,
  } = props;

  const { data, isFetching, error } = useGetDashboardMindMapNodeSummaryQuery(
    {
      assignmentId: nodeId ?? "",
      scope,
    },
    {
      skip: !open || !nodeId,
    },
  );

  return (
    <Popover
      open={open && Boolean(anchorPosition) && Boolean(nodeId)}
      onClose={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
      anchorReference="anchorPosition"
      anchorPosition={
        anchorPosition
          ? { top: Math.round(anchorPosition.top), left: Math.round(anchorPosition.left) }
          : undefined
      }
      transformOrigin={{ vertical: "center", horizontal: "left" }}
      PaperProps={{
        sx: {
          width: 420,
          borderRadius: 4,
          border: "1px solid rgba(148,163,184,0.2)",
          boxShadow: "0 28px 70px rgba(15,23,42,0.16)",
          overflow: "hidden",
        },
      }}
    >
      <Stack spacing={1.5} sx={{ p: 2 }}>
        <Box>
          {isFetching && !data ? (
            <>
              <Skeleton width="38%" height={20} />
              <Skeleton width="82%" height={34} />
            </>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {data?.node.code || data?.node.dynamicExcelCode || "Assignment"}
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ mt: 0.35 }}>
                {data?.node.dynamicExcelName || "Node detail"}
              </Typography>
            </>
          )}
        </Box>

        {error ? <Alert severity="error">{getErrorMessage(error)}</Alert> : null}

        {(scope.fromUtc || scope.toUtc || scope.unitIds.length > 0) && !isFetching ? (
          <Typography variant="caption" color="text.secondary">
            Scope dang ap dung cho summary va drilldown.
          </Typography>
        ) : null}

        <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
          {isFetching && !data ? (
            <>
              <Skeleton variant="rounded" width={90} height={28} />
              <Skeleton variant="rounded" width={118} height={28} />
              <Skeleton variant="rounded" width={86} height={28} />
            </>
          ) : (
            <>
              <Chip size="small" label={`${data?.activeAssignmentCount ?? 0} assignment`} />
              <Chip size="small" label={`${data?.descendantAssignmentCount ?? 0} hau due`} />
              <Chip size="small" label={`${data?.totalAssigneeCount ?? 0} don vi/nguoi`} />
              <Chip size="small" label={`${data?.reportSummary.total ?? 0} report`} />
            </>
          )}
        </Stack>

        <Divider />

        {isFetching && !data ? (
          <Stack spacing={1.6}>
            <Skeleton variant="rounded" height={74} />
            <Skeleton variant="rounded" height={74} />
          </Stack>
        ) : (
          <>
            <StatusStackedBar
              title="Theo don vi / nguoi"
              helperText="Click vao tung mau de mo danh sach don vi tuong ung."
              bar={data?.unitBar}
              onSegmentClick={(bucket) => {
                if (!nodeId) return;
                onOpenUnitBucket(nodeId, bucket);
              }}
            />

            <StatusStackedBar
              title="Theo tong report"
              helperText="Drilldown theo report/ky bao cao trong toan bo subtree cua node."
              bar={data?.reportBar}
              onSegmentClick={(bucket) => {
                if (!nodeId) return;
                onOpenReportBucket(nodeId, bucket);
              }}
            />

            {data?.fieldSummaries?.length ? (
              <>
                <Divider />
                <Stack spacing={0.8}>
                  <Typography variant="subtitle2" fontWeight={800}>
                    Field thong ke
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {data.fieldSummaries.map((item) => (
                      <Chip
                        key={`${item.fieldId}-${item.bucketKey || "value"}`}
                        size="small"
                        variant="outlined"
                        title={getFieldMetricTitle(item)}
                        label={`${getFieldMetricLabel(item)}: ${getFieldMetricValue(item)}`}
                        onClick={() => {
                          if (!nodeId) return;
                          onOpenFieldMetric(nodeId, item);
                        }}
                        sx={{
                          maxWidth: "100%",
                          borderColor: "rgba(14,165,233,0.35)",
                          color: "text.primary",
                          cursor: "pointer",
                          "& .MuiChip-label": {
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          },
                        }}
                      />
                    ))}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Chi hien field da bat showInTree trong Dynamic Form.
                  </Typography>
                </Stack>
              </>
            ) : null}

            {data?.tableSummaries?.length ? (
              <>
                <Divider />
                <Stack spacing={0.8}>
                  <Typography variant="subtitle2" fontWeight={800}>
                    Metric bang
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {data.tableSummaries.map((item) => (
                      <Chip
                        key={`${item.metricKey}-${item.blockId}-${item.tableMode}`}
                        size="small"
                        variant="outlined"
                        title={getTableMetricTitle(item)}
                        label={`${getTableMetricLabel(item)}: ${formatMetricNumber(item.sum)}`}
                        onClick={() => {
                          if (!nodeId) return;
                          onOpenTableMetric(nodeId, item);
                        }}
                        sx={{
                          maxWidth: "100%",
                          borderColor: "rgba(37,99,235,0.35)",
                          color: "text.primary",
                          cursor: "pointer",
                          "& .MuiChip-label": {
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          },
                        }}
                      />
                    ))}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Tong theo projection; click de xem report dong gop.
                  </Typography>
                </Stack>
              </>
            ) : null}

            {data?.labelSummaries?.length ? (
              <>
                <Divider />
                <Stack spacing={0.8}>
                  <Typography variant="subtitle2" fontWeight={800}>
                    Nhan thong ke
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {data.labelSummaries.map((item) => {
                      const label = item.labelName || item.labelCode;
                      return (
                        <Chip
                          key={`${item.labelCode}-${item.blockId || "all"}`}
                          size="small"
                          variant="outlined"
                          label={`${label}: ${item.rowCount}`}
                          sx={{
                            maxWidth: "100%",
                            borderColor: item.labelColor || "divider",
                            color: "text.primary",
                            "& .MuiChip-label": {
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            },
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Stack>
              </>
            ) : null}
          </>
        )}
      </Stack>
    </Popover>
  );
}
