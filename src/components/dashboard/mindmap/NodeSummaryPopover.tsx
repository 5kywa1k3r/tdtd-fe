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
  DashboardMindMapLabelSummaryDto,
  DashboardMindMapScopeRequest,
  DashboardMindMapTableSummaryDto,
} from "../../../types/dashboardMindMap";
import type { SummaryAnchorPosition } from "./AssignmentMindNode";
import StatusStackedBar from "./StatusStackedBar";
import { UITextKey, uiText } from '../../../constants/uiText';
import { getDashboardTableModeLabel } from "../../../utils/dashboardUi";

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
  onOpenLabel: (nodeId: string, label: DashboardMindMapLabelSummaryDto) => void;
};

function getErrorMessage(error: unknown): string {
  const source = error as {
    data?: { message?: string; error?: string };
    message?: string;
    error?: string;
  };

  return source?.data?.message || source?.data?.error || source?.message || source?.error || "Không tải được chi tiết công việc.";
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

  const blockLabel = item.dynamicFormTemplateName || item.blockId || getDashboardTableModeLabel(item.tableMode);
  return `${blockLabel}: ${axisLabel || item.metricKey}`;
}

function getTableMetricTitle(item: DashboardMindMapTableSummaryDto): string {
  return [
    item.metricKey,
    `kiểu bảng=${getDashboardTableModeLabel(item.tableMode)}`,
    `tổng=${formatMetricNumber(item.sum)}`,
    `trung bình=${formatMetricNumber(item.average)}`,
    `giá trị=${item.valueCount}`,
    `báo cáo=${item.reportCount}`,
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
    `kiểu=${item.fieldType}`,
    `giá trị=${item.valueCount}`,
    `báo cáo=${item.reportCount}`,
    item.sum != null ? `tổng=${formatMetricNumber(item.sum)}` : null,
    item.average != null ? `trung bình=${formatMetricNumber(item.average)}` : null,
    item.latestDateUtc ? `mới nhất=${formatMetricDate(item.latestDateUtc)}` : null,
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
    onOpenLabel,
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
                {data?.node.code || data?.node.dynamicExcelCode || "Công việc"}
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ mt: 0.35 }}>
                {data?.node.dynamicExcelName || "Chi tiết công việc"}
              </Typography>
            </>
          )}
        </Box>

        {error ? <Alert severity="error">{getErrorMessage(error)}</Alert> : null}

        {(scope.fromUtc || scope.toUtc || scope.unitIds.length > 0) && !isFetching ? (
          <Typography variant="caption" color="text.secondary">
            Đang áp dụng phạm vi lọc cho phần tóm tắt và chi tiết.
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
              <Chip size="small" label={`${data?.activeAssignmentCount ?? 0} công việc`} />
              <Chip size="small" label={`${data?.descendantAssignmentCount ?? 0} công việc con`} />
              <Chip size="small" label={`${data?.totalAssigneeCount ?? 0} đơn vị/người`} />
              <Chip size="small" label={`${data?.reportSummary.total ?? 0} báo cáo`} />
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
              title={uiText(UITextKey.TextTheoDonViNguoi)}
              helperText={uiText(UITextKey.TextClickVaoTungMauDeMoDanhSachDon)}
              bar={data?.unitBar}
              onSegmentClick={(bucket) => {
                if (!nodeId) return;
                onOpenUnitBucket(nodeId, bucket);
              }}
            />

            <StatusStackedBar
              title={uiText(UITextKey.TextTheoTongReport)}
              helperText={uiText(UITextKey.TextDrilldownTheoReportKyBaoCaoTrongToanBo)}
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
                    Trường thống kê
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
                    Chỉ hiển thị trường đã bật hiện trên sơ đồ trong biểu mẫu động.
                  </Typography>
                </Stack>
              </>
            ) : null}

            {data?.tableSummaries?.length ? (
              <>
                <Divider />
                <Stack spacing={0.8}>
                  <Typography variant="subtitle2" fontWeight={800}>
                    Chỉ số trong bảng
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
                    Tổng theo dữ liệu đã tính sẵn; bấm để xem báo cáo đóng góp.
                  </Typography>
                </Stack>
              </>
            ) : null}

            {data?.labelSummaries?.length ? (
              <>
                <Divider />
                <Stack spacing={0.8}>
                  <Typography variant="subtitle2" fontWeight={800}>
                    Nhãn thống kê
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
                          onClick={() => {
                            if (!nodeId) return;
                            onOpenLabel(nodeId, item);
                          }}
                          sx={{
                            maxWidth: "100%",
                            borderColor: item.labelColor || "divider",
                            color: "text.primary",
                            cursor: "pointer",
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
