import React from "react";
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
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import type { Sheet } from "@fortune-sheet/core";
import { useGetDynamicExcelQuery } from "../../../api/dynamicExcelApi";
import {
  useGetDynamicFormQuery,
  type DynamicFormDetail,
} from "../../../api/dynamicFormApi";
import {
  useApplyDynamicFormAggregateDraftMutation,
  useCreateUserCreatedReportMutation,
  useGetAggregateTableMutation,
  useGetDynamicFormAggregateTableMutation,
  useGetReportsByAssignmentQuery,
  usePreviewDynamicFormAggregateDraftMutation,
} from "../../../api/reportApi";
import {
  useGetWorkAssignmentByIdQuery,
  useGetWorkAssignmentsByWorkQuery,
} from "../../../api/workAssignmentApi";
import {
  exportFieldTextConcatCsv,
  useSearchFieldStatisticSummaryMutation,
  useSearchFieldTextConcatMutation,
  type FieldStatisticSummaryResponse,
  type FieldStatisticSummaryRow,
  type FieldTextConcatRequest,
  type FieldTextConcatResponse,
} from "../../../api/fieldStatisticsApi";
import type {
  AggregateTableResponse,
  DynamicFormAggregateRequest,
  DynamicFormAggregateResponse,
} from "../../../types/reportAggregate";
import type {
  WorkAssignmentReportListRow,
  WorkAssignmentReportResponse,
  WorkReportDataOrigin,
} from "../../../types/report";
import { WorkAssignmentReportStatus } from "../../../types/reportStatus";
import type { WorkAssignmentListResponse } from "../../../types/workAssignment";
import AggregateFilterBar from "../../../components/works/aggregate/AggregateFilterBar";
import AggregateResultTable from "../../../components/works/aggregate/AggregateResultTable";
import AggregateSourceTable from "../../../components/works/aggregate/AggregateSourceTable";
import AggregateWorkbookPreview from "../../../components/works/aggregate/AggregateWorkbookPreview";
import type {
  AggregateFilterState,
  AggregateMetricOption,
} from "../../../types/aggregateTypes";
import {
  fieldTypeLabels,
  getPrimaryDynamicFormBlockJson,
  tableModeLabels,
} from "../../../features/dynamicForms/dynamicFormSchema";
import {
  buildWorkbookForCellSum,
  buildWorkbookHorizontalByUser,
  buildWorkbookVerticalByUser,
  dayKeyToDateInput,
  formatDayKeyLabel,
  formatPeriodRangeLabel,
  normalizeDayKeyInput,
  parseJsonSafe,
  resolveResultRect,
  resolveTemplateRect,
} from "../../../components/works/aggregate/aggregateUtils";
import type {
  DynamicExcelSpecLike,
  ReportRect,
} from "../../../types/aggregateTypes";
import { UITextKey, uiText } from '../../../constants/uiText';
import { getMeSnapshot } from "../../../stores/authStorage";
import WorkReportEditorPage from "../report/WorkReportEditorPage";

type Props = {
  workId?: string | null;
  parentAssignmentId?: string | null;
  defaultDynamicExcelId?: string | null;
  defaultDynamicExcelCode?: string | null;
  defaultDynamicExcelName?: string | null;
  defaultDynamicFormTemplateId?: string | null;
  defaultDynamicFormTemplateCode?: string | null;
  defaultDynamicFormTemplateName?: string | null;
};

type DynamicFormExcelBlockLike = {
  blockId?: string | null;
  id?: string | null;
  dynamicExcelTemplateId?: string | null;
  DynamicExcelTemplateId?: string | null;
  dynamicExcelCode?: string | null;
  DynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
  DynamicExcelName?: string | null;
  tableMode?: string | null;
  TableMode?: string | null;
  tableKind?: string | null;
  TableKind?: string | null;
  indexMap?: DynamicFormMetricMapLike[] | null;
  metricRules?: DynamicFormMetricRuleLike[] | null;
  sourceBlockId?: string | null;
  sourceTableMode?: string | null;
  groupBy?: string[] | null;
  rowLayout?: DynamicFormSummaryRowLayoutLike[] | null;
  outputLayout?: DynamicFormSummaryOutputLayoutLike | null;
  w?: number | string | null;
  W?: number | string | null;
  h?: number | string | null;
  H?: number | string | null;
};

type DynamicFormMetricMapLike = {
  index?: number | string | null;
  rowKey?: string | null;
  columnKey?: string | null;
  metricKey?: string | null;
};

type DynamicFormMetricRuleLike = {
  metricKey?: string | null;
  label?: string | null;
};

type DynamicFormSummaryOutputLayoutLike = {
  sourceBlockId?: string | null;
  sourceTableMode?: string | null;
  groupBy?: string[] | null;
  rowLayout?: DynamicFormSummaryRowLayoutLike[] | null;
};

type DynamicFormSummaryRowLayoutLike = {
  repeatFor?: string | null;
  rowsPerUnit?: number | string | null;
  label?: string | null;
  metrics?: string[] | null;
};

type DynamicFormTableMode =
  | "FIXED_GRID"
  | "APPEND_ROWS"
  | "APPEND_COLUMNS"
  | "MATRIX"
  | "SUMMARY_TEMPLATE";

type AggregateDraftValueSelector = "SUM" | "AVERAGE" | "MIN" | "MAX" | "COUNT";

const AGGREGATE_DRAFT_DATA_ORIGINS: Array<{ value: WorkReportDataOrigin; label: string }> = [
  { value: "PARTIAL_MAPPING", label: "Gán một phần từ tổng hợp" },
  { value: "AUTO_SUMMARY", label: "Tự tổng hợp" },
  { value: "COPIED_SUMMARY", label: "Sao chép tổng hợp" },
];

const AGGREGATE_DRAFT_VALUE_SELECTORS: Array<{ value: AggregateDraftValueSelector; label: string }> = [
  { value: "SUM", label: "Tổng" },
  { value: "AVERAGE", label: "Trung bình" },
  { value: "MIN", label: "Nhỏ nhất" },
  { value: "MAX", label: "Lớn nhất" },
  { value: "COUNT", label: "Số lượng" },
];

type DynamicFormExcelBlockResolution = {
  blockId: string;
  tableMode: DynamicFormTableMode;
  tableKind?: string | null;
  dynamicExcelId?: string | null;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
  metricOptions: AggregateMetricOption[];
};

type AggregationScopeOption = {
  id: string;
  dynamicExcelId?: string | null;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  assignees?: WorkAssignmentListResponse["assignees"];
  latestPeriodKey?: string | null;
  isActive?: boolean | null;
  parentAssignmentId?: string | null;
  rootAssignmentId?: string | null;
  level?: number | null;
};

function createDefaultFilter(
  defaultDynamicExcelId?: string | null,
  defaultPeriodDate?: string | null
): AggregateFilterState {
  return {
    dynamicExcelId: defaultDynamicExcelId ?? "",
    scopeMode: "DIRECT_CHILDREN",
    metricKeys: [],
    selectedUnitIds: [],
    periodScopeMode: "SINGLE_PERIOD",
    periodDate: defaultPeriodDate ?? "",
    periodDateFrom: "",
    periodDateTo: defaultPeriodDate ?? "",
    sourceStatusMode: "APPROVED_ONLY",
    aggregateMode: "SUM_BY_CELL",
  };
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toAggregationScopeOption(row: WorkAssignmentListResponse): AggregationScopeOption {
  return {
    id: row.id,
    dynamicExcelId: normalizeOptionalText(row.dynamicExcelId),
    dynamicExcelCode: normalizeOptionalText(row.dynamicExcelCode),
    dynamicExcelName: normalizeOptionalText(row.dynamicExcelName),
    dynamicFormTemplateId: normalizeOptionalText(row.dynamicFormTemplateId),
    dynamicFormTemplateCode: normalizeOptionalText(row.dynamicFormTemplateCode),
    dynamicFormTemplateName: normalizeOptionalText(row.dynamicFormTemplateName),
    assignees: row.assignees,
    latestPeriodKey: normalizeOptionalText(row.latestPeriodKey),
    isActive: row.isActive,
    parentAssignmentId: normalizeOptionalText(row.parentAssignmentId),
    rootAssignmentId: normalizeOptionalText(row.rootAssignmentId),
    level: row.level,
  };
}

function isRootAggregationScope(option?: AggregationScopeOption | null) {
  if (!option) return false;
  if (option.level === 0) return true;
  if (!option.parentAssignmentId) return true;
  return Boolean(option.rootAssignmentId && option.rootAssignmentId === option.id);
}

function normalizeBlockId(value?: string | null) {
  return normalizeOptionalText(value) ?? "excel_block";
}

function normalizeTableMode(value?: string | null): DynamicFormTableMode {
  const normalized = String(value ?? "FIXED_GRID").trim().toUpperCase();
  if (
    normalized === "APPEND_ROWS" ||
    normalized === "APPEND_COLUMNS" ||
    normalized === "MATRIX" ||
    normalized === "SUMMARY_TEMPLATE"
  ) {
    return normalized;
  }

  return "FIXED_GRID";
}

function normalizeMetricPart(value: unknown, fallback: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function buildMetricKey(blockId: string, rowKey: string, columnKey: string) {
  return `table:${blockId}.row:${rowKey}.column:${columnKey}`;
}

function getPositiveInt(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function resolveMetricOptions(
  block: DynamicFormExcelBlockLike,
  blockId: string
): AggregateMetricOption[] {
  const labelByMetricKey = new Map(
    (Array.isArray(block.metricRules) ? block.metricRules : [])
      .map((rule) => {
        const metricKey = normalizeOptionalText(rule?.metricKey);
        return metricKey ? [metricKey, normalizeOptionalText(rule?.label)] as const : null;
      })
      .filter((item): item is readonly [string, string | null] => Boolean(item))
  );

  const fromIndexMap = (Array.isArray(block.indexMap) ? block.indexMap : [])
    .map((item, fallbackIndex) => {
      const index = Number(item?.index ?? fallbackIndex);
      const rowKey = normalizeMetricPart(item?.rowKey, `row_${fallbackIndex + 1}`);
      const columnKey = normalizeMetricPart(item?.columnKey, "value");
      const metricKey =
        normalizeOptionalText(item?.metricKey) ?? buildMetricKey(blockId, rowKey, columnKey);

      return {
        metricKey,
        rowKey,
        columnKey,
        index: Number.isInteger(index) && index >= 0 ? index : fallbackIndex,
        label: labelByMetricKey.get(metricKey) ?? null,
      };
    })
    .filter((item) => Boolean(item.metricKey));

  const options = fromIndexMap.length > 0
    ? fromIndexMap
    : buildFallbackMetricOptions(blockId, block.w ?? block.W, block.h ?? block.H);

  const seen = new Set<string>();
  return options.filter((item) => {
    if (seen.has(item.metricKey)) return false;
    seen.add(item.metricKey);
    return true;
  });
}

function resolveAppendRowsMetricOptions(
  block: DynamicFormExcelBlockLike,
  blockId: string
): AggregateMetricOption[] {
  const width = getPositiveInt(block.w ?? block.W);
  if (width <= 0) return [];

  return Array.from({ length: width }, (_, columnIndex) => {
    const columnKey = `col_${columnIndex + 1}`;
    return {
      metricKey: `table:${blockId}.column:${columnKey}`,
      rowKey: "APPEND_ROWS",
      columnKey,
      index: columnIndex,
      label: columnKey,
    };
  });
}

function resolveAppendColumnsMetricOptions(
  block: DynamicFormExcelBlockLike,
  blockId: string
): AggregateMetricOption[] {
  const height = getPositiveInt(block.h ?? block.H);
  if (height <= 0) return [];

  return Array.from({ length: height }, (_, rowIndex) => {
    const rowKey = `row_${rowIndex + 1}`;
    return {
      metricKey: `table:${blockId}.row:${rowKey}`,
      rowKey,
      columnKey: "APPEND_COLUMNS",
      index: rowIndex,
      label: rowKey,
    };
  });
}

function resolveSummaryTemplateMetricOptions(
  block: DynamicFormExcelBlockLike
): AggregateMetricOption[] {
  const outputLayout = block.outputLayout && typeof block.outputLayout === "object"
    ? block.outputLayout
    : null;
  const rowLayout = Array.isArray(block.rowLayout)
    ? block.rowLayout
    : Array.isArray(outputLayout?.rowLayout)
      ? outputLayout.rowLayout
      : [];
  const seen = new Set<string>();
  const options: AggregateMetricOption[] = [];

  rowLayout.forEach((row, rowIndex) => {
    const label = normalizeOptionalText(row?.label);
    (Array.isArray(row?.metrics) ? row.metrics : []).forEach((metricKey) => {
      const normalizedMetricKey = normalizeOptionalText(metricKey);
      if (!normalizedMetricKey || seen.has(normalizedMetricKey)) return;
      seen.add(normalizedMetricKey);
      options.push({
        metricKey: normalizedMetricKey,
        rowKey: normalizeOptionalText(row?.repeatFor) ?? "selectedUnits",
        columnKey: label ?? `layout_${rowIndex + 1}`,
        index: options.length,
        label: label ?? normalizedMetricKey,
      });
    });
  });

  return options;
}

function buildFallbackMetricOptions(
  blockId: string,
  widthValue: unknown,
  heightValue: unknown
): AggregateMetricOption[] {
  const width = getPositiveInt(widthValue);
  const height = getPositiveInt(heightValue);
  if (width <= 0 || height <= 0) return [];

  const rows: AggregateMetricOption[] = [];
  for (let r = 0; r < height; r += 1) {
    for (let c = 0; c < width; c += 1) {
      const rowKey = `row_${r + 1}`;
      const columnKey = `col_${c + 1}`;
      rows.push({
        metricKey: buildMetricKey(blockId, rowKey, columnKey),
        rowKey,
        columnKey,
        index: r * width + c,
        label: null,
      });
    }
  }

  return rows;
}

function resolveDynamicFormExcelBlock(
  detail?: DynamicFormDetail | null
): DynamicFormExcelBlockResolution | null {
  const block = parseJsonSafe<DynamicFormExcelBlockLike | null>(
    getPrimaryDynamicFormBlockJson(detail?.blocksJson, detail?.excelBlockJson),
    null
  );
  if (!block) return null;

  const tableMode = normalizeTableMode(block.tableMode ?? block.TableMode);

  const dynamicExcelId =
    normalizeOptionalText(detail?.excelBlockDynamicExcelTemplateId) ??
    normalizeOptionalText(
      block.dynamicExcelTemplateId ?? block.DynamicExcelTemplateId
    );
  if (!dynamicExcelId && tableMode !== "SUMMARY_TEMPLATE") return null;

  return {
    blockId: normalizeBlockId(block.blockId ?? block.id),
    tableMode,
    tableKind: normalizeOptionalText(block.tableKind ?? block.TableKind),
    dynamicExcelId,
    dynamicExcelCode: normalizeOptionalText(
      block.dynamicExcelCode ?? block.DynamicExcelCode
    ),
    dynamicExcelName: normalizeOptionalText(
      block.dynamicExcelName ?? block.DynamicExcelName
    ),
    metricOptions:
      tableMode === "FIXED_GRID"
        ? resolveMetricOptions(block, normalizeBlockId(block.blockId ?? block.id))
        : tableMode === "APPEND_ROWS"
          ? resolveAppendRowsMetricOptions(block, normalizeBlockId(block.blockId ?? block.id))
          : tableMode === "APPEND_COLUMNS"
            ? resolveAppendColumnsMetricOptions(block, normalizeBlockId(block.blockId ?? block.id))
            : tableMode === "MATRIX"
              ? resolveMetricOptions(block, normalizeBlockId(block.blockId ?? block.id))
              : resolveSummaryTemplateMetricOptions(block),
  };
}

function formatUnsupportedDynamicFormBlockMessage(
  block?: DynamicFormExcelBlockResolution | null
) {
  if (!block) {
    return "Biểu mẫu động chưa cấu hình bảng Excel để tổng hợp.";
  }

  return `Biểu mẫu động đang dùng kiểu bảng ${formatTableModeLabel(block.tableMode)}, nhưng phần tổng hợp hiện chưa hỗ trợ kiểu này.`;
}

function isRecordTableBlock(block?: DynamicFormExcelBlockResolution | null) {
  return block?.tableKind === "RECORD_TABLE";
}

function formatTableModeLabel(tableMode?: DynamicFormTableMode | string | null) {
  return tableMode && tableMode in tableModeLabels
    ? tableModeLabels[tableMode as DynamicFormTableMode]
    : tableMode || "-";
}

function formatScopeModeLabel(scopeMode?: string | null) {
  if (scopeMode === "DIRECT_CHILDREN") return "Cấp con trực tiếp";
  if (scopeMode === "SUBTREE") return "Toàn bộ cây con";
  return scopeMode || "-";
}

function formatPeriodScopeModeLabel(periodScopeMode?: string | null) {
  if (periodScopeMode === "SINGLE_PERIOD") return "Một kỳ";
  if (periodScopeMode === "PERIOD_RANGE") return "Khoảng kỳ";
  if (periodScopeMode === "CUMULATIVE_TO_PERIOD") return "Lũy kế đến kỳ";
  if (periodScopeMode === "ALL_PERIODS") return "Toàn bộ kỳ";
  return periodScopeMode || "-";
}

function formatSourceStatusModeLabel(sourceStatusMode?: string | null) {
  if (sourceStatusMode === "APPROVED_ONLY") return "Chỉ báo cáo đã duyệt";
  return sourceStatusMode || "-";
}

function isSupportedDynamicFormAggregateMode(tableMode?: DynamicFormTableMode | null) {
  return (
    tableMode === "FIXED_GRID" ||
    tableMode === "APPEND_ROWS" ||
    tableMode === "APPEND_COLUMNS" ||
    tableMode === "MATRIX" ||
    tableMode === "SUMMARY_TEMPLATE"
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;

  const data = "data" in error ? (error as { data?: unknown }).data : null;
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  if ("message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
}

function formatMetricNumber(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function formatDraftReportOptionLabel(row: {
  reportTitle?: string | null;
  periodKey?: string | null;
  id: string;
}) {
  const title = normalizeOptionalText(row.reportTitle);
  const period = normalizeOptionalText(row.periodKey);
  return [title || "Bản nháp báo cáo", period].filter(Boolean).join(" - ") || row.id;
}

function getAggregateDraftDefaultClearExisting(origin: WorkReportDataOrigin) {
  return origin === "PARTIAL_MAPPING" ? false : true;
}

function formatAggregateDraftContributionPolicy(
  origin: WorkReportDataOrigin,
  clearExisting: boolean,
) {
  if (origin === "PARTIAL_MAPPING") {
    return clearExisting
      ? "Báo cáo sẽ lưu dạng gán một phần, xóa giá trị cũ ở block đích và loại trừ các chỉ số lấy từ cấp con khi tính thống kê để tránh cộng hai lần."
      : "Báo cáo sẽ lưu dạng gán một phần, giữ các ô nhập tay và loại trừ các chỉ số lấy từ cấp con khi tính thống kê để tránh cộng hai lần.";
  }

  if (origin === "AUTO_SUMMARY") {
    return "Báo cáo tự tổng hợp mặc định không đóng góp ngược vào thống kê chính thức sau khi duyệt.";
  }

  return "Báo cáo sao chép tổng hợp mặc định không đóng góp ngược vào thống kê chính thức sau khi duyệt.";
}

function formatFieldStatisticValue(row: FieldStatisticSummaryRow) {
  const type = row.fieldType?.toUpperCase();
  if (type === "NUMBER") {
    return `Tổng ${formatMetricNumber(row.sum)} / Trung bình ${formatMetricNumber(row.average)}`;
  }
  if (type === "BOOLEAN") {
    return `True ${row.trueCount} / False ${row.falseCount}`;
  }
  if (type === "DATE") {
    return row.latestDateUtc ? new Date(row.latestDateUtc).toLocaleDateString("vi-VN") : "-";
  }
  if (row.bucketLabel || row.bucketKey) {
    return `${row.bucketLabel ?? row.bucketKey}: ${row.valueCount}`;
  }
  return `${row.valueCount}`;
}

function formatAggregateModeLabel(mode?: string | null) {
  switch (mode) {
    case "SUM_BY_CELL":
      return uiText(UITextKey.TextCongVaoBieuMau);
    case "HORIZONTAL_BY_USER":
      return uiText(UITextKey.TextGhepNgangTheoNguoi);
    case "VERTICAL_BY_USER":
      return uiText(UITextKey.TextGhepDocTheoNguoi);
    case "RECORD_TABLE_CONCAT":
      return "Ghép bảng dữ liệu phát sinh";
    default:
      return mode || "-";
  }
}

function formatRecordAggregateValue(value: unknown) {
  if (value == null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number") {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
  }
  return String(value);
}

function RecordAggregateResultTable({ result }: { result: AggregateTableResponse }) {
  const columns = result.recordColumns ?? [];
  const rows = result.recordRows ?? [];
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>{uiText(UITextKey.TextPeriod)}</TableCell>
            <TableCell>Người báo cáo</TableCell>
            <TableCell>Đơn vị</TableCell>
            {columns.map((column) => (
              <TableCell key={column.key}>
                {column.label || column.key}
                {column.isCalculated ? " (tính toán)" : ""}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.reportId ?? ""}-${row.sourceRowKey ?? index}`} hover>
              <TableCell>{formatDayKeyLabel(row.periodKey)}</TableCell>
              <TableCell>{row.fullName || row.userName || row.userId || "-"}</TableCell>
              <TableCell>{row.unitShortName || row.unitSymbol || "-"}</TableCell>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {formatRecordAggregateValue(row.values?.[column.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 3}>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Chưa có dòng dữ liệu phát sinh phù hợp với bộ lọc hiện tại.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function isTextFieldStatisticRow(row: FieldStatisticSummaryRow) {
  return row.fieldType === "shortText" || row.fieldType === "longText";
}

function getFieldTypeDisplayLabel(fieldType?: string | null) {
  if (!fieldType) return "-";
  return fieldType in fieldTypeLabels
    ? fieldTypeLabels[fieldType as keyof typeof fieldTypeLabels]
    : fieldType;
}

type AggregateExportCell = string | number | null | undefined;
type AggregateExportColumn = {
  key: string;
  header: string;
  width: number;
  type?: "text" | "integer" | "decimal";
};
type AggregateExportRow = Record<string, AggregateExportCell>;

function getDynamicFormAggregateExportShape(result: DynamicFormAggregateResponse) {
  const isSummary = result.meta.tableMode === "SUMMARY_TEMPLATE";
  const columns: AggregateExportColumn[] = isSummary
    ? [
        { key: "outputRowNumber", header: "Dòng kết quả", width: 12, type: "integer" },
        { key: "rowsPerGroup", header: "Số dòng/nhóm", width: 12, type: "integer" },
        { key: "groupType", header: "Loại nhóm", width: 14 },
        { key: "groupKey", header: "Mã nhóm", width: 24 },
        { key: "groupLabel", header: "Tên nhóm", width: 28 },
        { key: "unitSymbol", header: "Ký hiệu đơn vị", width: 16 },
        { key: "unitShortName", header: "Tên ngắn đơn vị", width: 20 },
        { key: "workAssignmentId", header: "Mã công việc", width: 26 },
        { key: "metricKey", header: "Mã chỉ số", width: 54 },
        { key: "count", header: "Số dòng", width: 12, type: "integer" },
        { key: "reportCount", header: "Số báo cáo", width: 12, type: "integer" },
        { key: "sum", header: "Tổng", width: 14, type: "decimal" },
        { key: "min", header: "Nhỏ nhất", width: 14, type: "decimal" },
        { key: "max", header: "Lớn nhất", width: 14, type: "decimal" },
        { key: "average", header: "Trung bình", width: 14, type: "decimal" },
      ]
    : [
        { key: "metricKey", header: "Mã chỉ số", width: 54 },
        { key: "rowKey", header: "Dòng", width: 20 },
        { key: "columnKey", header: "Cột", width: 20 },
        { key: "count", header: "Số dòng", width: 12, type: "integer" },
        { key: "sum", header: "Tổng", width: 14, type: "decimal" },
        { key: "min", header: "Nhỏ nhất", width: 14, type: "decimal" },
        { key: "max", header: "Lớn nhất", width: 14, type: "decimal" },
        { key: "average", header: "Trung bình", width: 14, type: "decimal" },
      ];

  const rows: AggregateExportRow[] = result.rows.map((row) =>
    isSummary
      ? {
          outputRowNumber: row.outputRowNumber,
          rowsPerGroup: row.rowsPerGroup,
          groupType: row.groupType,
          groupKey: row.groupKey,
          groupLabel: row.groupLabel,
          unitSymbol: row.unitSymbol,
          unitShortName: row.unitShortName,
          workAssignmentId: row.workAssignmentId,
          metricKey: row.metricKey,
          count: row.count,
          reportCount: row.reportCount,
          sum: row.sum,
          min: row.min,
          max: row.max,
          average: row.average,
        }
      : {
          metricKey: row.metricKey,
          rowKey: row.rowKey,
          columnKey: row.columnKey,
          count: row.count,
          sum: row.sum,
          min: row.min,
          max: row.max,
          average: row.average,
        }
  );

  return {
    columns,
    rows,
    sheetName: isSummary ? "Mẫu tổng hợp" : "Tổng hợp biểu mẫu động",
  };
}

function csvCell(value: unknown) {
  if (value == null) return "";
  const raw = String(value);
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function buildDynamicFormAggregateCsv(result: DynamicFormAggregateResponse) {
  const { columns, rows } = getDynamicFormAggregateExportShape(result);

  return `\ufeff${[
    columns.map((column) => column.header),
    ...rows.map((row) => columns.map((column) => row[column.key])),
  ]
    .map((line) => line.map(csvCell).join(","))
    .join("\r\n")}`;
}

function sanitizeFilePart(value?: string | null) {
  return (value || "dynamic_form")
    .trim()
    .replace(/[^a-zA-Z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "dynamic_form";
}

function downloadDynamicFormAggregateCsv(result: DynamicFormAggregateResponse) {
  const csv = buildDynamicFormAggregateCsv(result);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, buildDynamicFormAggregateFileName(result, "csv"));
}

function buildDynamicFormAggregateFileName(
  result: DynamicFormAggregateResponse,
  extension: "csv" | "xlsx",
  variant: "aggregate" | "template" = "aggregate"
) {
  const template = sanitizeFilePart(
    result.meta.dynamicFormTemplateCode || result.meta.dynamicFormTemplateName
  );
  const block = sanitizeFilePart(result.meta.blockId);
  return `${template}_${block}_${result.meta.tableMode.toLowerCase()}_${variant}.${extension}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadDynamicFormAggregateXlsx(result: DynamicFormAggregateResponse) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "TDTD";
  workbook.created = new Date();
  workbook.modified = new Date();

  const { columns, rows, sheetName } = getDynamicFormAggregateExportShape(result);
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = columns.map((column) => ({
    key: column.key,
    header: column.header,
    width: column.width,
  }));
  rows.forEach((row) => worksheet.addRow(row));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8EEF8" },
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  columns.forEach((column, index) => {
    const excelColumn = worksheet.getColumn(index + 1);
    if (column.type === "integer") {
      excelColumn.numFmt = "#,##0";
    } else if (column.type === "decimal") {
      excelColumn.numFmt = "#,##0.00";
    }
  });

  const meta = workbook.addWorksheet("Thông tin");
  meta.columns = [
    { key: "key", header: "Mục", width: 28 },
    { key: "value", header: "Giá trị", width: 46 },
  ];
  [
    ["Mã biểu mẫu", result.meta.dynamicFormTemplateId],
    ["Mã đại diện biểu mẫu", result.meta.dynamicFormTemplateCode],
    ["Tên biểu mẫu", result.meta.dynamicFormTemplateName],
    ["Phần bảng", result.meta.blockId],
    ["Kiểu bảng", formatTableModeLabel(result.meta.tableMode)],
    ["Mã công việc phạm vi", result.meta.scopeAssignmentId],
    ["Phạm vi", formatScopeModeLabel(result.meta.scopeMode)],
    ["Phạm vi kỳ", formatPeriodScopeModeLabel(result.meta.periodScopeMode)],
    ["Kỳ báo cáo", result.meta.periodKey],
    ["Từ kỳ", result.meta.periodKeyFrom],
    ["Đến kỳ", result.meta.periodKeyTo],
    ["Trạng thái nguồn", formatSourceStatusModeLabel(result.meta.sourceStatusMode)],
    ["Đơn vị đã chọn", result.meta.selectedUnitIds?.join(", ")],
    ["Số công việc nguồn", result.meta.sourceAssignmentCount],
    ["Số báo cáo nguồn", result.meta.sourceReportCount],
    ["Số chỉ số", result.meta.metricCount],
  ].forEach(([key, value]) => meta.addRow({ key, value: value ?? "" }));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, buildDynamicFormAggregateFileName(result, "xlsx"));
}

async function downloadSummaryTemplateWorkbookXlsx(result: DynamicFormAggregateResponse) {
  if (result.meta.tableMode !== "SUMMARY_TEMPLATE") {
    await downloadDynamicFormAggregateXlsx(result);
    return;
  }

  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "TDTD";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Kết quả biểu mẫu");
  worksheet.columns = [
    { key: "outputRowNumber", header: "Dòng kết quả", width: 12 },
    { key: "groupLabel", header: "Đơn vị / Công việc", width: 30 },
    { key: "workAssignmentId", header: "Mã công việc", width: 26 },
    { key: "metricLabel", header: "Chỉ số", width: 34 },
    { key: "metricKey", header: "Mã chỉ số", width: 54 },
    { key: "reportCount", header: "Số báo cáo", width: 12 },
    { key: "count", header: "Số dòng", width: 12 },
    { key: "sum", header: "Tổng", width: 14 },
    { key: "min", header: "Nhỏ nhất", width: 14 },
    { key: "max", header: "Lớn nhất", width: 14 },
    { key: "average", header: "Trung bình", width: 14 },
  ];

  const sortedRows = [...result.rows].sort((a, b) => {
    const aRow = a.outputRowNumber ?? a.index + 1;
    const bRow = b.outputRowNumber ?? b.index + 1;
    return aRow - bRow;
  });

  const groups = new Map<
    string,
    {
      groupIndex: number;
      rowsPerGroup: number;
      groupLabel: string;
      workAssignmentId: string;
      rowsByOffset: Map<number, (typeof result.rows)[number]>;
    }
  >();

  sortedRows.forEach((row) => {
    const rowsPerGroup = Math.max(1, row.rowsPerGroup ?? 1);
    const absoluteIndex = row.outputRowIndex ?? Math.max(0, (row.outputRowNumber ?? row.index + 1) - 1);
    const groupIndex = row.outputGroupIndex ?? Math.floor(absoluteIndex / rowsPerGroup);
    const offset = Math.max(0, absoluteIndex - groupIndex * rowsPerGroup);
    const key = `${groupIndex}:${row.groupKey ?? row.workAssignmentId ?? ""}`;
    const existing = groups.get(key);

    if (existing) {
      existing.rowsPerGroup = Math.max(existing.rowsPerGroup, rowsPerGroup);
      existing.rowsByOffset.set(offset, row);
      return;
    }

    groups.set(key, {
      groupIndex,
      rowsPerGroup,
      groupLabel: row.groupLabel ?? row.groupKey ?? row.workAssignmentId ?? "-",
      workAssignmentId: row.workAssignmentId ?? "",
      rowsByOffset: new Map([[offset, row]]),
    });
  });

  const orderedGroups = Array.from(groups.values()).sort((a, b) => a.groupIndex - b.groupIndex);
  const groupRanges: Array<{ first: number; last: number }> = [];

  orderedGroups.forEach((group) => {
    const firstExcelRow = worksheet.rowCount + 1;
    for (let offset = 0; offset < group.rowsPerGroup; offset += 1) {
      const row = group.rowsByOffset.get(offset);
      worksheet.addRow({
        outputRowNumber: group.groupIndex * group.rowsPerGroup + offset + 1,
        groupLabel: group.groupLabel,
        workAssignmentId: group.workAssignmentId,
        metricLabel: row?.label ?? row?.sourceMetricKey ?? row?.metricKey ?? "",
        metricKey: row?.sourceMetricKey ?? row?.metricKey ?? "",
        reportCount: row?.reportCount ?? null,
        count: row?.count ?? null,
        sum: row?.sum ?? null,
        min: row?.min ?? null,
        max: row?.max ?? null,
        average: row?.average ?? null,
      });
    }
    const lastExcelRow = worksheet.rowCount;
    if (lastExcelRow > firstExcelRow) {
      groupRanges.push({ first: firstExcelRow, last: lastExcelRow });
    }
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8EEF8" },
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  groupRanges.forEach(({ first, last }) => {
    worksheet.mergeCells(first, 2, last, 2);
    worksheet.mergeCells(first, 3, last, 3);
  });

  worksheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "middle", wrapText: true };
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
        };
      });
    }
  });
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  [6, 7].forEach((columnIndex) => {
    worksheet.getColumn(columnIndex).numFmt = "#,##0";
  });
  [8, 9, 10, 11].forEach((columnIndex) => {
    worksheet.getColumn(columnIndex).numFmt = "#,##0.00";
  });

  const raw = workbook.addWorksheet("Dữ liệu thô");
  const { columns, rows } = getDynamicFormAggregateExportShape(result);
  raw.columns = columns.map((column) => ({
    key: column.key,
    header: column.header,
    width: column.width,
  }));
  rows.forEach((row) => raw.addRow(row));
  raw.getRow(1).font = { bold: true };
  raw.views = [{ state: "frozen", ySplit: 1 }];

  const meta = workbook.addWorksheet("Thông tin");
  meta.columns = [
    { key: "key", header: "Mục", width: 28 },
    { key: "value", header: "Giá trị", width: 46 },
  ];
  [
    ["Mã biểu mẫu", result.meta.dynamicFormTemplateId],
    ["Mã đại diện biểu mẫu", result.meta.dynamicFormTemplateCode],
    ["Tên biểu mẫu", result.meta.dynamicFormTemplateName],
    ["Phần bảng", result.meta.blockId],
    ["Kiểu bảng", formatTableModeLabel(result.meta.tableMode)],
    ["Mã công việc phạm vi", result.meta.scopeAssignmentId],
    ["Phạm vi", formatScopeModeLabel(result.meta.scopeMode)],
    ["Phạm vi kỳ", formatPeriodScopeModeLabel(result.meta.periodScopeMode)],
    ["Kỳ báo cáo", result.meta.periodKey],
    ["Từ kỳ", result.meta.periodKeyFrom],
    ["Đến kỳ", result.meta.periodKeyTo],
    ["Trạng thái nguồn", formatSourceStatusModeLabel(result.meta.sourceStatusMode)],
    ["Đơn vị đã chọn", result.meta.selectedUnitIds?.join(", ")],
    ["Số công việc nguồn", result.meta.sourceAssignmentCount],
    ["Số báo cáo nguồn", result.meta.sourceReportCount],
    ["Số chỉ số", result.meta.metricCount],
  ].forEach(([key, value]) => meta.addRow({ key, value: value ?? "" }));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, buildDynamicFormAggregateFileName(result, "xlsx", "template"));
}

const WorkAggregationTab: React.FC<Props> = ({
  workId = null,
  parentAssignmentId = null,
  defaultDynamicExcelId = null,
  defaultDynamicExcelCode = null,
  defaultDynamicExcelName = null,
  defaultDynamicFormTemplateId = null,
  defaultDynamicFormTemplateCode = null,
  defaultDynamicFormTemplateName = null,
}) => {
  const [getAggregateTable, aggregateState] = useGetAggregateTableMutation();
  const [getDynamicFormAggregateTable, dynamicFormAggregateState] =
    useGetDynamicFormAggregateTableMutation();
  const [applyDynamicFormAggregateDraft, applyDynamicFormAggregateDraftState] =
    useApplyDynamicFormAggregateDraftMutation();
  const [previewDynamicFormAggregateDraft, previewDynamicFormAggregateDraftState] =
    usePreviewDynamicFormAggregateDraftMutation();
  const [createUserCreatedReport, createUserCreatedReportState] =
    useCreateUserCreatedReportMutation();
  const [searchFieldStatisticSummary, fieldStatisticState] =
    useSearchFieldStatisticSummaryMutation();
  const [searchFieldTextConcat, fieldTextConcatState] =
    useSearchFieldTextConcatMutation();
  const currentUserId = React.useMemo(() => getMeSnapshot()?.id ?? null, []);
  const externalParentAssignmentId = normalizeOptionalText(parentAssignmentId);

  const scopeOptionsQuery = useGetWorkAssignmentsByWorkQuery(
    { workId: workId ?? "" },
    { skip: !workId }
  );

  const scopeOptions = React.useMemo(
    () =>
      ((scopeOptionsQuery.data ?? []) as WorkAssignmentListResponse[])
        .map(toAggregationScopeOption)
        .filter(
          (option) =>
            option.isActive !== false &&
            Boolean(option.dynamicFormTemplateId || option.dynamicExcelId)
        ),
    [scopeOptionsQuery.data]
  );

  const scopeOptionFromList = React.useMemo(
    () =>
      externalParentAssignmentId
        ? scopeOptions.find((option) => option.id === externalParentAssignmentId) ?? null
        : null,
    [externalParentAssignmentId, scopeOptions]
  );

  const selectedAssignmentQuery = useGetWorkAssignmentByIdQuery(
    { id: externalParentAssignmentId ?? "" },
    { skip: !externalParentAssignmentId || Boolean(scopeOptionFromList) }
  );

  const selectedScopeOption = React.useMemo(() => {
    if (scopeOptionFromList) return scopeOptionFromList;
    return selectedAssignmentQuery.data
      ? toAggregationScopeOption(selectedAssignmentQuery.data as unknown as WorkAssignmentListResponse)
      : null;
  }, [scopeOptionFromList, selectedAssignmentQuery.data]);

  const selectedScopeIsRoot = isRootAggregationScope(selectedScopeOption);

  const effectiveParentAssignmentId = externalParentAssignmentId ?? null;
  const seedDynamicExcelId =
    normalizeOptionalText(defaultDynamicExcelId) ??
    normalizeOptionalText(selectedScopeOption?.dynamicExcelId);
  const seedDynamicExcelCode =
    normalizeOptionalText(defaultDynamicExcelCode) ??
    normalizeOptionalText(selectedScopeOption?.dynamicExcelCode);
  const seedDynamicExcelName =
    normalizeOptionalText(defaultDynamicExcelName) ??
    normalizeOptionalText(selectedScopeOption?.dynamicExcelName);
  const seedDynamicFormTemplateId =
    normalizeOptionalText(defaultDynamicFormTemplateId) ??
    normalizeOptionalText(selectedScopeOption?.dynamicFormTemplateId);
  const seedDynamicFormTemplateCode =
    normalizeOptionalText(defaultDynamicFormTemplateCode) ??
    normalizeOptionalText(selectedScopeOption?.dynamicFormTemplateCode);
  const seedDynamicFormTemplateName =
    normalizeOptionalText(defaultDynamicFormTemplateName) ??
    normalizeOptionalText(selectedScopeOption?.dynamicFormTemplateName);
  const seedPeriodDate = dayKeyToDateInput(selectedScopeOption?.latestPeriodKey);

  const [filter, setFilter] = React.useState<AggregateFilterState>(() =>
    createDefaultFilter(seedDynamicExcelId, seedPeriodDate)
  );
  const [result, setResult] = React.useState<AggregateTableResponse | null>(null);
  const [dynamicFormResult, setDynamicFormResult] =
    React.useState<DynamicFormAggregateResponse | null>(null);
  const [lastDynamicFormAggregateRequest, setLastDynamicFormAggregateRequest] =
    React.useState<DynamicFormAggregateRequest | null>(null);
  const [fieldStatisticResult, setFieldStatisticResult] =
    React.useState<FieldStatisticSummaryResponse | null>(null);
  const [fieldTextConcatResult, setFieldTextConcatResult] =
    React.useState<FieldTextConcatResponse | null>(null);
  const [fieldTextConcatRequest, setFieldTextConcatRequest] =
    React.useState<FieldTextConcatRequest | null>(null);
  const [fieldTextConcatExporting, setFieldTextConcatExporting] = React.useState(false);
  const [targetDraftReportId, setTargetDraftReportId] = React.useState("");
  const [createdDraftReportOption, setCreatedDraftReportOption] =
    React.useState<WorkAssignmentReportListRow | null>(null);
  const [aggregateDraftDataOrigin, setAggregateDraftDataOrigin] =
    React.useState<WorkReportDataOrigin>("PARTIAL_MAPPING");
  const [aggregateDraftValueSelector, setAggregateDraftValueSelector] =
    React.useState<AggregateDraftValueSelector>("SUM");
  const [aggregateDraftClearExisting, setAggregateDraftClearExisting] =
    React.useState(false);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "" });
  const [previewReportId, setPreviewReportId] = React.useState("");
  const [mappedPreviewReport, setMappedPreviewReport] =
    React.useState<WorkAssignmentReportResponse | null>(null);
  const [applyConfirmOpen, setApplyConfirmOpen] = React.useState(false);

  const showMessage = React.useCallback((message: string) => {
    setSnackbar({ open: true, message });
  }, []);

  const dynamicFormQuery = useGetDynamicFormQuery(
    { id: seedDynamicFormTemplateId ?? "" },
    { skip: !seedDynamicFormTemplateId }
  );
  const assignmentReportsQuery = useGetReportsByAssignmentQuery(
    { workAssignmentId: effectiveParentAssignmentId ?? "" },
    { skip: !effectiveParentAssignmentId || !seedDynamicFormTemplateId || selectedScopeIsRoot }
  );

  const resolvedDynamicFormExcelBlock = React.useMemo(
    () => resolveDynamicFormExcelBlock(dynamicFormQuery.data),
    [dynamicFormQuery.data]
  );
  const resolvedSupportedDynamicFormExcelBlock =
    !isRecordTableBlock(resolvedDynamicFormExcelBlock) &&
    isSupportedDynamicFormAggregateMode(resolvedDynamicFormExcelBlock?.tableMode)
      ? resolvedDynamicFormExcelBlock
      : null;

  const effectiveDynamicExcelId =
    seedDynamicExcelId ?? resolvedDynamicFormExcelBlock?.dynamicExcelId ?? null;
  const effectiveDynamicExcelCode =
    seedDynamicExcelCode ?? resolvedDynamicFormExcelBlock?.dynamicExcelCode ?? null;
  const effectiveDynamicExcelName =
    seedDynamicExcelName ?? resolvedDynamicFormExcelBlock?.dynamicExcelName ?? null;

  React.useEffect(() => {
    setFilter(createDefaultFilter(effectiveDynamicExcelId, seedPeriodDate));
    setResult(null);
    setDynamicFormResult(null);
    setLastDynamicFormAggregateRequest(null);
    setFieldStatisticResult(null);
    setFieldTextConcatResult(null);
    setFieldTextConcatRequest(null);
    setTargetDraftReportId("");
    setCreatedDraftReportOption(null);
    setMappedPreviewReport(null);
  }, [
    effectiveDynamicExcelId,
    effectiveParentAssignmentId,
    seedDynamicFormTemplateId,
    seedPeriodDate,
    workId,
  ]);

  const templateQuery = useGetDynamicExcelQuery(
    { id: filter.dynamicExcelId },
    { skip: !filter.dynamicExcelId }
  );

  const templateDetail = templateQuery.data;
  const templateWorkbook = React.useMemo(
    () => parseJsonSafe<Sheet[]>(templateDetail?.rawWorkbookDataJson, []),
    [templateDetail?.rawWorkbookDataJson]
  );
  const templateSpec = React.useMemo(
    () => parseJsonSafe<DynamicExcelSpecLike>(templateDetail?.specJson, {}),
    [templateDetail?.specJson]
  );
  const templateRect: ReportRect = React.useMemo(
    () => resolveTemplateRect(templateDetail?.dataRect),
    [templateDetail?.dataRect]
  );
  const resultRect = React.useMemo(
    () => resolveResultRect(result, templateRect),
    [result, templateRect]
  );

  const loading =
    aggregateState.isLoading ||
    dynamicFormAggregateState.isLoading ||
    fieldStatisticState.isLoading ||
    fieldTextConcatState.isLoading ||
    applyDynamicFormAggregateDraftState.isLoading ||
    previewDynamicFormAggregateDraftState.isLoading ||
    createUserCreatedReportState.isLoading ||
    fieldTextConcatExporting ||
    templateQuery.isFetching ||
    dynamicFormQuery.isFetching ||
    assignmentReportsQuery.isFetching ||
    scopeOptionsQuery.isFetching ||
    selectedAssignmentQuery.isFetching;
  const hasDynamicFormSeed = Boolean(seedDynamicFormTemplateId);
  const dynamicFormResolutionPending =
    Boolean(effectiveParentAssignmentId) &&
    hasDynamicFormSeed &&
    dynamicFormQuery.isFetching;
  const hasResolvedDynamicFormExcelBlock =
    hasDynamicFormSeed && Boolean(resolvedDynamicFormExcelBlock);
  const supportsRecordTableAggregate =
    hasDynamicFormSeed && isRecordTableBlock(resolvedDynamicFormExcelBlock);
  const supportsDynamicFormAggregate =
    hasDynamicFormSeed && Boolean(resolvedSupportedDynamicFormExcelBlock);
  const dynamicFormUnsupported =
    Boolean(effectiveParentAssignmentId) &&
    hasDynamicFormSeed &&
    !dynamicFormQuery.isFetching &&
    !dynamicFormQuery.error &&
    !resolvedSupportedDynamicFormExcelBlock &&
    !supportsRecordTableAggregate;
  const dynamicFormUnsupportedMessage = formatUnsupportedDynamicFormBlockMessage(
    resolvedDynamicFormExcelBlock
  );
  React.useEffect(() => {
    if (
      createdDraftReportOption &&
      assignmentReportsQuery.data?.some((row) => row.id === createdDraftReportOption.id)
    ) {
      setCreatedDraftReportOption(null);
    }
  }, [assignmentReportsQuery.data, createdDraftReportOption]);

  const assignmentReportRows = React.useMemo(() => {
    const rows = assignmentReportsQuery.data ?? [];
    if (
      !createdDraftReportOption ||
      createdDraftReportOption.workAssignmentId !== effectiveParentAssignmentId ||
      rows.some((row) => row.id === createdDraftReportOption.id)
    ) {
      return rows;
    }
    return [createdDraftReportOption, ...rows];
  }, [assignmentReportsQuery.data, createdDraftReportOption, effectiveParentAssignmentId]);

  const templateDraftReports = React.useMemo(
    () =>
      assignmentReportRows.filter((row) => {
        const sameTemplate =
          !seedDynamicFormTemplateId ||
          row.dynamicFormTemplateId === seedDynamicFormTemplateId;
        return (
          sameTemplate &&
          row.status === WorkAssignmentReportStatus.Draft &&
          row.isActive !== false
        );
      }),
    [assignmentReportRows, seedDynamicFormTemplateId]
  );
  const targetDraftReports = React.useMemo(
    () =>
      templateDraftReports.filter((row) =>
        currentUserId
          ? row.assigneeUserId === currentUserId || row.id === createdDraftReportOption?.id
          : true
      ),
    [createdDraftReportOption?.id, currentUserId, templateDraftReports]
  );
  const hasReadOnlyDraftReports =
    templateDraftReports.length > 0 && targetDraftReports.length === 0;
  const selectedTargetDraftReport = React.useMemo(
    () => targetDraftReports.find((row) => row.id === targetDraftReportId) ?? null,
    [targetDraftReportId, targetDraftReports]
  );

  React.useEffect(() => {
    if (!supportsDynamicFormAggregate) {
      setTargetDraftReportId("");
      return;
    }

    if (
      targetDraftReportId &&
      targetDraftReports.some((row) => row.id === targetDraftReportId)
    ) {
      return;
    }

    setTargetDraftReportId(targetDraftReports[0]?.id ?? "");
  }, [supportsDynamicFormAggregate, targetDraftReportId, targetDraftReports]);

  React.useEffect(() => {
    setMappedPreviewReport(null);
  }, [
    aggregateDraftClearExisting,
    aggregateDraftDataOrigin,
    aggregateDraftValueSelector,
    lastDynamicFormAggregateRequest,
    targetDraftReportId,
  ]);

  const handleReset = React.useCallback(() => {
    setFilter(createDefaultFilter(effectiveDynamicExcelId, seedPeriodDate));
    setResult(null);
    setDynamicFormResult(null);
    setLastDynamicFormAggregateRequest(null);
    setFieldStatisticResult(null);
    setFieldTextConcatResult(null);
    setFieldTextConcatRequest(null);
    setTargetDraftReportId("");
    setCreatedDraftReportOption(null);
    setMappedPreviewReport(null);
  }, [effectiveDynamicExcelId, seedPeriodDate]);

  const validateFilter = React.useCallback(() => {
    if (dynamicFormUnsupported) return dynamicFormUnsupportedMessage;
    if (!effectiveParentAssignmentId) return "Thiếu công việc gốc để tổng hợp.";
    if (selectedScopeIsRoot) return "Assignment root không ghi tổng hợp lên báo cáo cấp trên.";
    const aggregateDynamicExcelId =
      filter.dynamicExcelId.trim() || effectiveDynamicExcelId || "";
    if (!seedDynamicFormTemplateId && !aggregateDynamicExcelId) {
      return "Bắt buộc chọn biểu mẫu.";
    }
    if (filter.periodScopeMode === "SINGLE_PERIOD" && !filter.periodDate) {
      return "Bắt buộc chọn ngày/kỳ.";
    }
    if (
      filter.periodScopeMode === "PERIOD_RANGE" &&
      (!filter.periodDateFrom || !filter.periodDateTo)
    ) {
      return "Bắt buộc chọn từ ngày và đến ngày.";
    }
    if (filter.periodScopeMode === "CUMULATIVE_TO_PERIOD" && !filter.periodDateTo) {
      return "Bắt buộc chọn ngày/kỳ lũy kế.";
    }
    return null;
  }, [
    dynamicFormUnsupported,
    dynamicFormUnsupportedMessage,
    effectiveDynamicExcelId,
    effectiveParentAssignmentId,
    filter,
    seedDynamicFormTemplateId,
    selectedScopeIsRoot,
  ]);

  const handleRunAggregate = React.useCallback(async () => {
    const error = validateFilter();
    if (error) {
      showMessage(error);
      return;
    }

    let periodKeyFrom = normalizeDayKeyInput(filter.periodDateFrom);
    let periodKeyTo = normalizeDayKeyInput(filter.periodDateTo);
    const selectedUnitIds =
      filter.selectedUnitIds.length > 0 ? filter.selectedUnitIds : null;

    if (periodKeyFrom && periodKeyTo && periodKeyFrom > periodKeyTo) {
      const temp = periodKeyFrom;
      periodKeyFrom = periodKeyTo;
      periodKeyTo = temp;
    }

    if (seedDynamicFormTemplateId && resolvedSupportedDynamicFormExcelBlock) {
      try {
        const request: DynamicFormAggregateRequest = {
          scopeAssignmentId: effectiveParentAssignmentId ?? "",
          scopeMode: filter.scopeMode,
          dynamicFormTemplateId: seedDynamicFormTemplateId,
          blockId: resolvedSupportedDynamicFormExcelBlock.blockId,
          tableMode: resolvedSupportedDynamicFormExcelBlock.tableMode,
          metricKeys: filter.metricKeys.length > 0 ? filter.metricKeys : null,
          periodScopeMode: filter.periodScopeMode,
          periodKey:
            filter.periodScopeMode === "SINGLE_PERIOD"
              ? normalizeDayKeyInput(filter.periodDate)
              : null,
          periodKeyFrom:
            filter.periodScopeMode === "PERIOD_RANGE" ? periodKeyFrom : null,
          periodKeyTo:
            filter.periodScopeMode === "PERIOD_RANGE" ||
            filter.periodScopeMode === "CUMULATIVE_TO_PERIOD"
              ? periodKeyTo
              : null,
          sourceStatusMode: "APPROVED_ONLY",
          selectedUnitIds,
        };
        const response = await getDynamicFormAggregateTable(request).unwrap();

        setDynamicFormResult(response);
        setLastDynamicFormAggregateRequest(request);
        setResult(null);
      } catch (err: unknown) {
        setLastDynamicFormAggregateRequest(null);
        showMessage(getErrorMessage(err, "Không tổng hợp được chỉ số của biểu mẫu động."));
      }
      return;
    }

    const aggregateDynamicExcelId =
      filter.dynamicExcelId.trim() || effectiveDynamicExcelId || "";

    try {
      const response = await getAggregateTable({
        parentAssignmentId: effectiveParentAssignmentId ?? "",
        dynamicExcelId: aggregateDynamicExcelId,
        periodScopeMode: filter.periodScopeMode,
        periodKey:
          filter.periodScopeMode === "SINGLE_PERIOD"
            ? normalizeDayKeyInput(filter.periodDate)
            : null,
        periodKeyFrom:
          filter.periodScopeMode === "PERIOD_RANGE" ? periodKeyFrom : null,
        periodKeyTo:
          filter.periodScopeMode === "PERIOD_RANGE" ||
          filter.periodScopeMode === "CUMULATIVE_TO_PERIOD"
            ? periodKeyTo
            : null,
        sourceStatusMode: "APPROVED_ONLY",
        selectedUnitIds,
        aggregateMode: filter.aggregateMode,
      }).unwrap();

      setResult(response);
      setDynamicFormResult(null);
      setLastDynamicFormAggregateRequest(null);
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Không tổng hợp được dữ liệu."));
    }
  }, [
    filter,
    effectiveParentAssignmentId,
    effectiveDynamicExcelId,
    getAggregateTable,
    getDynamicFormAggregateTable,
    resolvedSupportedDynamicFormExcelBlock,
    seedDynamicFormTemplateId,
    showMessage,
    validateFilter,
  ]);

  const handleAggregateDraftDataOriginChange = React.useCallback((next: WorkReportDataOrigin) => {
    setAggregateDraftDataOrigin(next);
    setAggregateDraftClearExisting(getAggregateDraftDefaultClearExisting(next));
  }, []);

  const handleCreateAggregateDraftReport = React.useCallback(async () => {
    if (!effectiveParentAssignmentId) {
      showMessage("Thiếu công việc để tạo bản nháp tổng hợp.");
      return;
    }
    if (selectedScopeIsRoot) {
      showMessage("Assignment root không tạo bản nháp tổng hợp để báo cáo cấp trên.");
      return;
    }

    const periodKey =
      normalizeDayKeyInput(filter.periodDate) ||
      normalizeDayKeyInput(filter.periodDateTo) ||
      normalizeDayKeyInput(filter.periodDateFrom) ||
      new Date().toISOString().slice(0, 10);
    const periodDate = dayKeyToDateInput(periodKey) || periodKey;
    const periodDateUtc = `${periodDate}T00:00:00.000Z`;

    try {
      const created = await createUserCreatedReport({
        workAssignmentId: effectiveParentAssignmentId,
        data: {
          periodKey,
          reportDate: periodDateUtc,
          startedDate: periodDateUtc,
          completedDate: periodDateUtc,
          periodStart: periodDateUtc,
          periodEnd: periodDateUtc,
          reportTitle: `Báo cáo tổng hợp ${periodKey}`,
        },
      }).unwrap();

      setCreatedDraftReportOption(created);
      setTargetDraftReportId(created.id);
      void assignmentReportsQuery.refetch();
      showMessage("Đã tạo bản nháp báo cáo tổng hợp.");
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Không tạo được bản nháp báo cáo tổng hợp."));
    }
  }, [
    assignmentReportsQuery,
    createUserCreatedReport,
    effectiveParentAssignmentId,
    filter.periodDate,
    filter.periodDateFrom,
    filter.periodDateTo,
    selectedScopeIsRoot,
    showMessage,
  ]);

  const handleApplyDynamicFormAggregateDraft = React.useCallback(async () => {
    if (selectedScopeIsRoot) {
      showMessage("Assignment root không ghi tổng hợp lên báo cáo cấp trên.");
      return;
    }
    if (!targetDraftReportId) {
      showMessage("Chọn một bản nháp báo cáo để ghi kết quả tổng hợp.");
      return;
    }
    if (!lastDynamicFormAggregateRequest || !dynamicFormResult) {
      showMessage("Chạy tổng hợp biểu mẫu động trước khi ghi vào bản nháp.");
      return;
    }
    try {
      await applyDynamicFormAggregateDraft({
        id: targetDraftReportId,
        data: {
          aggregateRequest: lastDynamicFormAggregateRequest,
          dataOrigin: aggregateDraftDataOrigin,
          targetBlockId: dynamicFormResult.meta.blockId,
          valueSelector: aggregateDraftValueSelector,
          clearExistingValues: aggregateDraftClearExisting,
        },
      }).unwrap();

      void assignmentReportsQuery.refetch();
      showMessage(
        (dynamicFormResult.rows ?? []).length > 0
          ? "Đã ghi kết quả tổng hợp vào bản nháp."
          : "Đã lưu cấu hình tổng hợp; báo cáo chưa duyệt sẽ tự cộng khi được duyệt.",
      );
      setApplyConfirmOpen(false);
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Không ghi được kết quả tổng hợp vào bản nháp."));
    }
  }, [
    aggregateDraftClearExisting,
    aggregateDraftDataOrigin,
    aggregateDraftValueSelector,
    applyDynamicFormAggregateDraft,
    assignmentReportsQuery,
    dynamicFormResult,
    lastDynamicFormAggregateRequest,
    selectedScopeIsRoot,
    showMessage,
    targetDraftReportId,
  ]);

  const handlePreviewDynamicFormAggregateDraft = React.useCallback(async () => {
    if (selectedScopeIsRoot) {
      showMessage("Assignment root không preview ghi tổng hợp lên báo cáo cấp trên.");
      return;
    }
    if (!targetDraftReportId) {
      showMessage("Chọn một bản nháp báo cáo để preview sau khi gán.");
      return;
    }
    if (!lastDynamicFormAggregateRequest || !dynamicFormResult) {
      showMessage("Chạy tổng hợp biểu mẫu động trước khi preview sau khi gán.");
      return;
    }

    try {
      const response = await previewDynamicFormAggregateDraft({
        id: targetDraftReportId,
        data: {
          aggregateRequest: lastDynamicFormAggregateRequest,
          dataOrigin: aggregateDraftDataOrigin,
          targetBlockId: dynamicFormResult.meta.blockId,
          valueSelector: aggregateDraftValueSelector,
          clearExistingValues: aggregateDraftClearExisting,
        },
      }).unwrap();

      setMappedPreviewReport(response);
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Không preview được report sau khi gán tổng hợp."));
    }
  }, [
    aggregateDraftClearExisting,
    aggregateDraftDataOrigin,
    aggregateDraftValueSelector,
    dynamicFormResult,
    lastDynamicFormAggregateRequest,
    previewDynamicFormAggregateDraft,
    selectedScopeIsRoot,
    showMessage,
    targetDraftReportId,
  ]);

  const handleRequestApplyDynamicFormAggregateDraft = React.useCallback(() => {
    if (selectedScopeIsRoot) {
      showMessage("Assignment root không ghi tổng hợp lên báo cáo cấp trên.");
      return;
    }
    if (!targetDraftReportId) {
      showMessage("Chọn một bản nháp báo cáo để ghi kết quả tổng hợp.");
      return;
    }
    if (!lastDynamicFormAggregateRequest || !dynamicFormResult) {
      showMessage("Chạy tổng hợp biểu mẫu động trước khi ghi vào bản nháp.");
      return;
    }

    setApplyConfirmOpen(true);
  }, [dynamicFormResult, lastDynamicFormAggregateRequest, selectedScopeIsRoot, showMessage, targetDraftReportId]);

  const handleRunFieldStatistics = React.useCallback(async () => {
    if (!workId) {
      showMessage("Thiếu mã công việc để xem thống kê trường dữ liệu.");
      return;
    }
    if (!effectiveParentAssignmentId) {
      showMessage("Thiếu công việc gốc để xem thống kê trường dữ liệu.");
      return;
    }
    if (filter.periodScopeMode === "SINGLE_PERIOD" && !filter.periodDate) {
      showMessage("Bắt buộc chọn ngày/kỳ.");
      return;
    }
    if (
      filter.periodScopeMode === "PERIOD_RANGE" &&
      (!filter.periodDateFrom || !filter.periodDateTo)
    ) {
      showMessage("Bắt buộc chọn từ ngày và đến ngày.");
      return;
    }
    if (filter.periodScopeMode === "CUMULATIVE_TO_PERIOD" && !filter.periodDateTo) {
      showMessage("Bắt buộc chọn ngày/kỳ lũy kế.");
      return;
    }

    let periodKeyFrom = normalizeDayKeyInput(filter.periodDateFrom);
    let periodKeyTo = normalizeDayKeyInput(filter.periodDateTo);

    if (periodKeyFrom && periodKeyTo && periodKeyFrom > periodKeyTo) {
      const temp = periodKeyFrom;
      periodKeyFrom = periodKeyTo;
      periodKeyTo = temp;
    }

    try {
      const response = await searchFieldStatisticSummary({
        workId,
        scopeType: "ASSIGNMENT",
        scopeId: effectiveParentAssignmentId,
        dynamicFormTemplateId: seedDynamicFormTemplateId,
        showInDetail: true,
        periodKey:
          filter.periodScopeMode === "SINGLE_PERIOD"
            ? normalizeDayKeyInput(filter.periodDate)
            : null,
        periodKeyFrom:
          filter.periodScopeMode === "PERIOD_RANGE" ? periodKeyFrom : null,
        periodKeyTo:
          filter.periodScopeMode === "PERIOD_RANGE" ||
          filter.periodScopeMode === "CUMULATIVE_TO_PERIOD"
            ? periodKeyTo
            : null,
        reportStatus: 2,
        page: 0,
        pageSize: 100,
      }).unwrap();

      setFieldStatisticResult(response);
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Không tải được thống kê trường dữ liệu."));
    }
  }, [
    effectiveParentAssignmentId,
    filter,
    searchFieldStatisticSummary,
    seedDynamicFormTemplateId,
    showMessage,
    workId,
  ]);

  const handleRunFieldTextConcat = React.useCallback(async (row: FieldStatisticSummaryRow) => {
    if (!workId || !effectiveParentAssignmentId) {
      showMessage("Thiếu phạm vi để đọc nội dung trường dữ liệu.");
      return;
    }

    const dynamicFormTemplateId = normalizeOptionalText(row.dynamicFormTemplateId) ?? seedDynamicFormTemplateId;
    if (!dynamicFormTemplateId) {
      showMessage("Thiếu biểu mẫu động để đọc nội dung trường dữ liệu.");
      return;
    }

    let periodKeyFrom = normalizeDayKeyInput(filter.periodDateFrom);
    let periodKeyTo = normalizeDayKeyInput(filter.periodDateTo);

    if (periodKeyFrom && periodKeyTo && periodKeyFrom > periodKeyTo) {
      const temp = periodKeyFrom;
      periodKeyFrom = periodKeyTo;
      periodKeyTo = temp;
    }

    const request: FieldTextConcatRequest = {
      workId,
      scopeType: "ASSIGNMENT",
      scopeId: effectiveParentAssignmentId,
      dynamicFormTemplateId,
      fieldId: row.fieldId,
      fieldKey: row.fieldKey,
      periodKey:
        filter.periodScopeMode === "SINGLE_PERIOD"
          ? normalizeDayKeyInput(filter.periodDate)
          : null,
      periodKeyFrom:
        filter.periodScopeMode === "PERIOD_RANGE" ? periodKeyFrom : null,
      periodKeyTo:
        filter.periodScopeMode === "PERIOD_RANGE" ||
        filter.periodScopeMode === "CUMULATIVE_TO_PERIOD"
          ? periodKeyTo
          : null,
      reportStatus: 2,
      page: 0,
      pageSize: 50,
      maxChars: 10000,
      maxRowChars: 2000,
      scanLimit: 1000,
    };

    try {
      const response = await searchFieldTextConcat(request).unwrap();

      setFieldTextConcatRequest(request);
      setFieldTextConcatResult(response);
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Không tải được text concat."));
    }
  }, [
    effectiveParentAssignmentId,
    filter,
    searchFieldTextConcat,
    seedDynamicFormTemplateId,
    showMessage,
    workId,
  ]);

  const handleExportFieldTextConcatCsv = React.useCallback(async () => {
    if (!fieldTextConcatRequest) {
      showMessage("Chưa có truy vấn text concat để export.");
      return;
    }

    setFieldTextConcatExporting(true);
    try {
      const { blob, fileName } = await exportFieldTextConcatCsv({
        ...fieldTextConcatRequest,
        page: 0,
        pageSize: 1000,
        maxChars: 500000,
        maxRowChars: 10000,
        scanLimit: 20000,
      });
      downloadBlob(blob, fileName);
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Không xuất được nội dung ghép ra CSV."));
    } finally {
      setFieldTextConcatExporting(false);
    }
  }, [fieldTextConcatRequest, showMessage]);

  const workbookPreview = React.useMemo(() => {
    if (!result) {
      return {
        workbook: [] as Sheet[],
        previewRect: resultRect,
      };
    }

    if (result.tableKind === "RECORD_TABLE") {
      return {
        workbook: [] as Sheet[],
        previewRect: resultRect,
      };
    }

    if (filter.aggregateMode === "SUM_BY_CELL") {
      return buildWorkbookForCellSum(
        templateWorkbook,
        resultRect,
        result.rows?.[0] ?? null
      );
    }

    if (filter.aggregateMode === "HORIZONTAL_BY_USER") {
      return buildWorkbookHorizontalByUser(result.rows ?? [], resultRect, templateSpec);
    }

    return buildWorkbookVerticalByUser(result.rows ?? [], resultRect, templateSpec, templateWorkbook);
  }, [filter.aggregateMode, result, resultRect, templateSpec, templateWorkbook]);

  const periodSummary = React.useMemo(() => {
    if (!result) return "Chưa có dữ liệu";
    if (result.periodScopeMode === "ALL_PERIODS") return "Toàn bộ kỳ";
    if (result.periodScopeMode === "PERIOD_RANGE") {
      return formatPeriodRangeLabel(result.periodKeyFrom, result.periodKeyTo);
    }
    if (result.periodScopeMode === "CUMULATIVE_TO_PERIOD") {
      return `Lũy kế đến ${formatDayKeyLabel(result.periodKeyTo)}`;
    }
    return formatDayKeyLabel(result.periodKey);
  }, [result]);

  const lockDynamicExcel = Boolean(effectiveDynamicExcelId);
  const selectedTemplateLabel = React.useMemo(() => {
    const code = seedDynamicFormTemplateCode || effectiveDynamicExcelCode || "";
    const name = seedDynamicFormTemplateName || effectiveDynamicExcelName || "";
    return [code, name].filter(Boolean).join(" - ");
  }, [
    effectiveDynamicExcelCode,
    effectiveDynamicExcelName,
    seedDynamicFormTemplateCode,
    seedDynamicFormTemplateName,
  ]);
  const isSummaryTemplateResult =
    dynamicFormResult?.meta.tableMode === "SUMMARY_TEMPLATE";

  return (
    <Box sx={{ height: "100%", minHeight: 0 }}>
      <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
        <Stack spacing={0.5}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Tổng hợp theo công việc được giao
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.72 }}>
            Ngữ cảnh tổng hợp lấy từ dòng giao việc đã chọn; báo cáo nguồn và bản nháp đích được xem trước trước khi ghi dữ liệu.
          </Typography>
        </Stack>

        {!effectiveParentAssignmentId && !scopeOptionsQuery.isFetching && (
          <Alert severity="info">
            Mở tổng hợp từ một dòng giao việc để hệ thống có đủ ngữ cảnh biểu mẫu, báo cáo và nguồn dữ liệu. Màn này không cho chọn lại công việc cha.
          </Alert>
        )}

        {effectiveParentAssignmentId &&
          (scopeOptionsQuery.isFetching || selectedAssignmentQuery.isFetching) &&
          !selectedTemplateLabel && (
          <Alert severity="info">
            Đang tải ngữ cảnh công việc được giao để xác định biểu mẫu và nguồn tổng hợp.
          </Alert>
        )}

        {effectiveParentAssignmentId &&
          !selectedScopeOption &&
          !scopeOptionsQuery.isFetching &&
          !selectedAssignmentQuery.isFetching &&
          selectedAssignmentQuery.error && (
          <Alert severity="error">
            Không tải được ngữ cảnh công việc được giao. Hãy mở tổng hợp từ dòng giao việc phù hợp hoặc kiểm tra quyền truy cập assignment.
          </Alert>
        )}

        {effectiveParentAssignmentId && selectedTemplateLabel && (
          <Alert severity="info">
            Đang tổng hợp cho biểu mẫu: <b>{selectedTemplateLabel}</b>
          </Alert>
        )}

        {effectiveParentAssignmentId && selectedScopeIsRoot && !scopeOptionsQuery.isFetching && (
          <Alert severity="warning">
            Assignment root không ghi tổng hợp vào report cấp trên. Hãy mở tổng hợp từ assignment của reviewer ở cấp trung gian.
          </Alert>
        )}

        {dynamicFormResolutionPending && (
          <Alert severity="info">
            Đang tải biểu mẫu động để xác định bảng Excel cần tổng hợp.
          </Alert>
        )}

        {Boolean(effectiveParentAssignmentId) && supportsDynamicFormAggregate && (
          <Alert severity="success">
            Đã xác định bảng {formatTableModeLabel(resolvedSupportedDynamicFormExcelBlock?.tableMode)} của biểu mẫu động.
          </Alert>
        )}

        {Boolean(effectiveParentAssignmentId) && supportsRecordTableAggregate && (
          <Alert severity="success">
            Đã xác định bảng dữ liệu phát sinh của biểu mẫu động.
          </Alert>
        )}

        {Boolean(effectiveParentAssignmentId) &&
          hasResolvedDynamicFormExcelBlock &&
          !supportsDynamicFormAggregate &&
          !supportsRecordTableAggregate && (
          <Alert severity="warning">
            {dynamicFormUnsupportedMessage}
          </Alert>
        )}

        {Boolean(effectiveParentAssignmentId) && dynamicFormQuery.error && hasDynamicFormSeed && (
          <Alert severity="error">
            Không tải được biểu mẫu động để xác định bảng Excel cần tổng hợp.
          </Alert>
        )}

        {Boolean(dynamicFormUnsupported && !hasResolvedDynamicFormExcelBlock) && (
          <Alert severity="warning">
            {dynamicFormUnsupportedMessage}
          </Alert>
        )}

        {effectiveParentAssignmentId && !selectedScopeIsRoot && (
          <AggregateFilterBar
            value={filter}
            defaultDynamicExcelCode={effectiveDynamicExcelCode}
            defaultDynamicExcelName={effectiveDynamicExcelName}
            lockDynamicExcel={lockDynamicExcel}
            showScopeMode={hasDynamicFormSeed}
            showAggregateMode={!hasDynamicFormSeed}
            showMetricFilter={supportsDynamicFormAggregate}
            metricOptions={resolvedSupportedDynamicFormExcelBlock?.metricOptions ?? []}
            loading={loading}
            onChange={setFilter}
            onRun={() => void handleRunAggregate()}
            onReset={handleReset}
          />
        )}

        {effectiveParentAssignmentId && !selectedScopeIsRoot && workId && (
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                spacing={1}
              >
                <Stack spacing={0.25}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Thống kê trường dữ liệu
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.72 }}>
                    Xem nhanh các trường dữ liệu đã bật hiển thị chi tiết.
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void handleRunFieldStatistics()}
                  disabled={fieldStatisticState.isLoading}
                >
                  {fieldStatisticState.isLoading ? "Đang tải..." : "Xem thống kê trường dữ liệu"}
                </Button>
              </Stack>

              {fieldStatisticResult && (
                <>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Chip
                      label={`Dòng: ${fieldStatisticResult.totalRows}`}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`Giá trị: ${fieldStatisticResult.totalValueCount}`}
                      variant="outlined"
                    />
                    <Chip
                      label={`Báo cáo: ${fieldStatisticResult.totalReportCount}`}
                      variant="outlined"
                    />
                    <Chip
                      label={`Tổng: ${formatMetricNumber(fieldStatisticResult.totalSum)}`}
                      variant="outlined"
                    />
                  </Stack>

                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{uiText(UITextKey.TextField)}</TableCell>
                          <TableCell>{uiText(UITextKey.TextType)}</TableCell>
                          <TableCell>{uiText(UITextKey.TextBucket)}</TableCell>
                          <TableCell>{uiText(UITextKey.TextPeriod)}</TableCell>
                          <TableCell align="right">{uiText(UITextKey.TextValue)}</TableCell>
                          <TableCell align="right">{uiText(UITextKey.TextCount)}</TableCell>
                          <TableCell align="right">{uiText(UITextKey.TextReports)}</TableCell>
                          <TableCell align="right">{uiText(UITextKey.TextText)}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fieldStatisticResult.rows.map((row, rowIndex) => (
                          <TableRow key={`${row.scopeId}-${row.fieldKey}-${row.bucketKey ?? ""}-${row.periodKey}-${rowIndex}`} hover>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {row.fieldLabel || row.fieldKey}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.65 }}>
                                  {row.fieldKey}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>{getFieldTypeDisplayLabel(row.fieldType)}</TableCell>
                            <TableCell>{row.bucketLabel ?? row.bucketKey ?? "-"}</TableCell>
                            <TableCell>{formatDayKeyLabel(row.periodKey)}</TableCell>
                            <TableCell align="right">{formatFieldStatisticValue(row)}</TableCell>
                            <TableCell align="right">{row.valueCount}</TableCell>
                            <TableCell align="right">{row.reportCount}</TableCell>
                            <TableCell align="right">
                              {isTextFieldStatisticRow(row) ? (
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => void handleRunFieldTextConcat(row)}
                                  disabled={fieldTextConcatState.isLoading}
                                >
                                  Xem text
                                </Button>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {fieldStatisticResult.rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8}>
                              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                Chưa có thống kê trường dữ liệu phù hợp với bộ lọc hiện tại.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Stack>
          </Box>
        )}

        {loading && !result && !dynamicFormResult && (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        )}

        {templateQuery.error && (
          <Alert severity="error">{uiText(UITextKey.TextKhANgTaIAACTemplateDynamicExcel)}</Alert>
        )}

        {dynamicFormResult && (
          <>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Chip
                label={`Chỉ số: ${dynamicFormResult.meta.metricCount}`}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Báo cáo: ${dynamicFormResult.meta.sourceReportCount}`}
                variant="outlined"
              />
              <Chip
                label={`Công việc: ${dynamicFormResult.meta.sourceAssignmentCount}`}
                variant="outlined"
              />
              <Chip
                label={`Đơn vị: ${
                  dynamicFormResult.meta.selectedUnitIds?.length
                    ? `${dynamicFormResult.meta.selectedUnitIds.length} đã chọn`
                    : "tất cả"
                }`}
                variant="outlined"
              />
              <Chip
                label={`Phạm vi: ${formatScopeModeLabel(dynamicFormResult.meta.scopeMode)}`}
                variant="outlined"
              />
              <Chip
                label={`Khối: ${dynamicFormResult.meta.blockId}`}
                variant="outlined"
              />
              <Chip
                label={`Kiểu bảng: ${formatTableModeLabel(dynamicFormResult.meta.tableMode)}`}
                variant="outlined"
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
                onClick={() => downloadDynamicFormAggregateCsv(dynamicFormResult)}
              >
                Xuất CSV
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
                onClick={() => void downloadDynamicFormAggregateXlsx(dynamicFormResult)}
              >
                Xuất XLSX
              </Button>
              {isSummaryTemplateResult && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
                  onClick={() => void downloadSummaryTemplateWorkbookXlsx(dynamicFormResult)}
                >
                  Xuất XLSX theo biểu mẫu
                </Button>
              )}
            </Stack>

            {dynamicFormResult.warnings.map((warning) => (
              <Alert key={warning} severity="warning">
                {warning}
              </Alert>
            ))}

            <Alert severity="info">
              Phần tổng hợp dùng các chỉ số đã cấu hình trong biểu mẫu. Bản xem trước tổng hợp đọc dữ liệu từ bảng nguồn đã chọn.
            </Alert>

            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, minmax(0, 1fr))",
                      xl: "minmax(300px, 1.4fr) max-content max-content minmax(170px, 0.8fr) minmax(140px, 0.7fr) minmax(130px, 0.6fr)",
                    },
                    gap: 1,
                    alignItems: "center",
                    "& .MuiButton-root": {
                      minHeight: 40,
                      whiteSpace: "nowrap",
                    },
                  }}
                >
                  <TextField
                    select
                    size="small"
                    label="Bản nháp báo cáo"
                    value={targetDraftReportId}
                    onChange={(event) => setTargetDraftReportId(event.target.value)}
                    sx={{ minWidth: 0 }}
                  >
                    {targetDraftReports.length === 0 && (
                      <MenuItem value="" disabled>
                        Chưa có bản nháp phù hợp
                      </MenuItem>
                    )}
                    {targetDraftReports.map((row) => (
                      <MenuItem key={row.id} value={row.id}>
                        {formatDraftReportOptionLabel(row)}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Button
                    variant="outlined"
                    onClick={() => setPreviewReportId(targetDraftReportId)}
                    disabled={!targetDraftReportId}
                  >
                    Xem report hiện có
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={() => void handlePreviewDynamicFormAggregateDraft()}
                    disabled={
                      selectedScopeIsRoot ||
                      !targetDraftReportId ||
                      !lastDynamicFormAggregateRequest ||
                      previewDynamicFormAggregateDraftState.isLoading
                    }
                  >
                    {previewDynamicFormAggregateDraftState.isLoading
                      ? "Đang preview..."
                      : "Preview sau khi gán"}
                  </Button>

                  <TextField
                    select
                    size="small"
                    label="Nguồn dữ liệu"
                    value={aggregateDraftDataOrigin}
                    onChange={(event) =>
                      handleAggregateDraftDataOriginChange(event.target.value as WorkReportDataOrigin)
                    }
                    sx={{ minWidth: 0 }}
                  >
                    {AGGREGATE_DRAFT_DATA_ORIGINS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    size="small"
                    label="Giá trị"
                    value={aggregateDraftValueSelector}
                    onChange={(event) =>
                      setAggregateDraftValueSelector(event.target.value as AggregateDraftValueSelector)
                    }
                    sx={{ minWidth: 0 }}
                  >
                    {AGGREGATE_DRAFT_VALUE_SELECTORS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    size="small"
                    label="Ghi đè"
                    value={aggregateDraftClearExisting ? "YES" : "NO"}
                    onChange={(event) =>
                      setAggregateDraftClearExisting(event.target.value === "YES")
                    }
                    sx={{ minWidth: 0 }}
                  >
                    <MenuItem value="NO">Giữ ô cũ</MenuItem>
                    <MenuItem value="YES">Xóa ô cũ</MenuItem>
                  </TextField>
                </Box>

                <Alert severity="info">
                  {formatAggregateDraftContributionPolicy(aggregateDraftDataOrigin, aggregateDraftClearExisting)}
                </Alert>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    variant="contained"
                    onClick={handleRequestApplyDynamicFormAggregateDraft}
                    disabled={
                      selectedScopeIsRoot ||
                      !targetDraftReportId ||
                      !lastDynamicFormAggregateRequest ||
                      applyDynamicFormAggregateDraftState.isLoading
                    }
                  >
                    {applyDynamicFormAggregateDraftState.isLoading
                      ? "Đang ghi..."
                      : "Ghi vào bản nháp"}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => void handleCreateAggregateDraftReport()}
                    disabled={
                      createUserCreatedReportState.isLoading ||
                      !effectiveParentAssignmentId ||
                      selectedScopeIsRoot
                    }
                  >
                    {createUserCreatedReportState.isLoading
                      ? "Đang tạo..."
                      : "Tạo bản nháp chủ động"}
                  </Button>
                </Stack>

                {hasReadOnlyDraftReports && (
                  <Alert severity="info">
                    Công việc này có bản nháp cùng biểu mẫu nhưng thuộc người báo cáo khác. Màn tổng hợp chỉ cho ghi vào bản nháp của chính người đang nhập báo cáo; người duyệt vẫn xem được dữ liệu tổng hợp ở phần xem trước.
                  </Alert>
                )}

                {targetDraftReports.length === 0 && !hasReadOnlyDraftReports && (
                  <Alert severity="warning">
                    Chưa có bản nháp báo cáo phù hợp trong công việc này; có thể tạo bản nháp chủ động nếu công việc cho phép.
                  </Alert>
                )}
              </Stack>
            </Box>

            <Stack spacing={0.75}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Sau khi tổng hợp/gán
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.72 }}>
                Đây là kết quả xem trước theo nguồn đã duyệt và bộ lọc hiện tại. Dữ liệu chỉ được ghi khi bấm ghi vào bản nháp.
              </Typography>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {isSummaryTemplateResult && <TableCell align="right">{uiText(UITextKey.TextOutputRow)}</TableCell>}
                    {isSummaryTemplateResult && <TableCell>{uiText(UITextKey.TextGroup)}</TableCell>}
                    {isSummaryTemplateResult && <TableCell>{uiText(UITextKey.TextUnit)}</TableCell>}
                    <TableCell>{uiText(UITextKey.TextMetricKey)}</TableCell>
                    <TableCell>{uiText(UITextKey.TextRow)}</TableCell>
                    <TableCell>{uiText(UITextKey.TextColumn)}</TableCell>
                    <TableCell align="right">{uiText(UITextKey.TextCount)}</TableCell>
                    {isSummaryTemplateResult && <TableCell align="right">{uiText(UITextKey.TextReports)}</TableCell>}
                    <TableCell align="right">{uiText(UITextKey.TextSum)}</TableCell>
                    <TableCell align="right">{uiText(UITextKey.TextMin)}</TableCell>
                    <TableCell align="right">{uiText(UITextKey.TextMax)}</TableCell>
                    <TableCell align="right">{uiText(UITextKey.TextAverage)}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dynamicFormResult.rows.map((row, rowIndex) => (
                    <TableRow key={`${row.metricKey}-${row.groupKey ?? ""}-${rowIndex}`} hover>
                      {isSummaryTemplateResult && (
                        <TableCell align="right">{row.outputRowNumber ?? row.index + 1}</TableCell>
                      )}
                      {isSummaryTemplateResult && (
                        <TableCell>{row.groupLabel ?? row.groupKey ?? "-"}</TableCell>
                      )}
                      {isSummaryTemplateResult && (
                        <TableCell>{row.unitShortName || row.unitSymbol || "-"}</TableCell>
                      )}
                      <TableCell sx={{ maxWidth: 360, wordBreak: "break-all" }}>
                        {row.metricKey}
                      </TableCell>
                      <TableCell>{row.rowKey}</TableCell>
                      <TableCell>{row.columnKey}</TableCell>
                      <TableCell align="right">{row.count}</TableCell>
                      {isSummaryTemplateResult && (
                        <TableCell align="right">{row.reportCount ?? 0}</TableCell>
                      )}
                      <TableCell align="right">{formatMetricNumber(row.sum)}</TableCell>
                      <TableCell align="right">{formatMetricNumber(row.min)}</TableCell>
                      <TableCell align="right">{formatMetricNumber(row.max)}</TableCell>
                      <TableCell align="right">{formatMetricNumber(row.average)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <AggregateSourceTable
              rows={dynamicFormResult.sources ?? []}
              onPreviewReport={setPreviewReportId}
            />
          </>
        )}

        {result && (
          <>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Chip
                label={`Kỳ dùng để cộng: ${result.periodCount ?? result.includedPeriodKeys?.length ?? 0}`}
                color="primary"
                variant="outlined"
              />
              <Chip label={`Phạm vi: ${periodSummary}`} variant="outlined" />
              <Chip
                label={`Đơn vị: ${
                  result.selectedUnitIds?.length ? `${result.selectedUnitIds.length} đã chọn` : "tất cả"
                }`}
                variant="outlined"
              />
              <Chip label={`Nguồn: ${result.sources?.length ?? 0} báo cáo`} variant="outlined" />
              {(result.includedPeriodKeys ?? []).map((item) => (
                <Chip key={item} label={formatDayKeyLabel(item)} size="small" variant="outlined" />
              ))}
            </Stack>

            {(result.warnings ?? []).map((warning) => (
              <Alert key={warning} severity="warning">
                {warning}
              </Alert>
            ))}

            <Alert severity="info">
              Cách tổng hợp: <b>{formatAggregateModeLabel(result.aggregateMode || filter.aggregateMode)}</b>.
              {result.tableKind === "RECORD_TABLE"
                ? " Bảng dữ liệu phát sinh chỉ ghép các dòng đã duyệt; cột tính toán được tính tại cấp xem hiện tại."
                : " Bản xem trước ghi dữ liệu tổng hợp trực tiếp vào biểu mẫu."}
            </Alert>

            {result.tableKind === "RECORD_TABLE" ? (
              <RecordAggregateResultTable result={result} />
            ) : (
              <>
                <AggregateWorkbookPreview
                  workbook={workbookPreview.workbook}
                  previewRect={workbookPreview.previewRect}
                  spec={templateSpec}
                />

                <AggregateResultTable
                  result={result}
                  aggregateMode={filter.aggregateMode}
                  templateRect={resultRect}
                />
              </>
            )}

            <AggregateSourceTable rows={result.sources ?? []} onPreviewReport={setPreviewReportId} />
          </>
        )}
      </Stack>

      <Dialog
        open={applyConfirmOpen}
        onClose={() => setApplyConfirmOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Xác nhận ghi vào bản nháp</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Alert severity="warning">
              Chỉ bản nháp được cập nhật. Báo cáo đã duyệt không bị ghi đè.
            </Alert>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Bản nháp đích
              </Typography>
              <Typography fontWeight={700}>
                {selectedTargetDraftReport
                  ? formatDraftReportOptionLabel(selectedTargetDraftReport)
                  : targetDraftReportId || "-"}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                variant="outlined"
                label={`${dynamicFormResult?.rows?.length ?? 0} chỉ số`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${dynamicFormResult?.sources?.length ?? 0} báo cáo nguồn`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Giá trị: ${aggregateDraftValueSelector}`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={aggregateDraftClearExisting ? "Xóa ô cũ" : "Giữ ô cũ"}
              />
            </Stack>
            <Alert severity="info">
              {formatAggregateDraftContributionPolicy(aggregateDraftDataOrigin, aggregateDraftClearExisting)}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyConfirmOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={() => void handleApplyDynamicFormAggregateDraft()}
            disabled={applyDynamicFormAggregateDraftState.isLoading}
          >
            {applyDynamicFormAggregateDraftState.isLoading ? "Đang ghi..." : "Ghi vào bản nháp"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(previewReportId)}
        onClose={() => setPreviewReportId("")}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle>Preview báo cáo</DialogTitle>
        <DialogContent dividers sx={{ height: "78vh", p: 0 }}>
          {previewReportId && workId ? (
            <Box sx={{ height: "100%", p: 2 }}>
              <WorkReportEditorPage
                workId={workId}
                reportId={previewReportId}
                forceReadOnly
                onBack={() => setPreviewReportId("")}
              />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewReportId("")}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(mappedPreviewReport)}
        onClose={() => setMappedPreviewReport(null)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle>Preview report sau khi gán tổng hợp</DialogTitle>
        <DialogContent dividers sx={{ height: "78vh", p: 0 }}>
          {mappedPreviewReport && workId ? (
            <Box sx={{ height: "100%", p: 2 }}>
              <WorkReportEditorPage
                workId={workId}
                reportId={mappedPreviewReport.id}
                previewData={mappedPreviewReport}
                forceReadOnly
                onBack={() => setMappedPreviewReport(null)}
              />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMappedPreviewReport(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(fieldTextConcatResult)}
        onClose={() => {
          setFieldTextConcatResult(null);
          setFieldTextConcatRequest(null);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{uiText(UITextKey.TextTextConcat)}</DialogTitle>
        <DialogContent dividers>
          {fieldTextConcatResult && (
            <Stack spacing={2}>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={fieldTextConcatResult.fieldLabel || fieldTextConcatResult.fieldKey}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Dòng: ${fieldTextConcatResult.totalRows}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Đã đọc: ${fieldTextConcatResult.scannedReportCount}/${fieldTextConcatResult.matchingReportCount}`}
                />
                {fieldTextConcatResult.truncated && (
                  <Chip size="small" color="warning" variant="outlined" label={uiText(UITextKey.TextTruncated)} />
                )}
              </Stack>

              {fieldTextConcatResult.hasMoreReportsThanScanLimit && (
                <Alert severity="warning">
                  Result is capped by scanLimit. Narrow the period or status filter for a fuller read.
                </Alert>
              )}

              <TextField
                value={fieldTextConcatResult.concatenatedText}
                fullWidth
                multiline
                minRows={10}
                InputProps={{ readOnly: true }}
              />

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>{uiText(UITextKey.TextPeriod)}</TableCell>
                      <TableCell>{uiText(UITextKey.TextAssignment)}</TableCell>
                      <TableCell>{uiText(UITextKey.TextAssignee)}</TableCell>
                      <TableCell align="right">{uiText(UITextKey.TextChars)}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fieldTextConcatResult.rows.map((row) => (
                      <TableRow key={row.workAssignmentReportId} hover>
                        <TableCell>{formatDayKeyLabel(row.periodKey)}</TableCell>
                        <TableCell>{row.assignmentCode || row.assignmentName || row.assignmentId}</TableCell>
                        <TableCell>{row.assigneeFullName || row.assigneeUsername || row.assigneeUserId || "-"}</TableCell>
                        <TableCell align="right">
                          {row.charCount}
                          {row.rowTruncated ? "+" : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
            onClick={() => void handleExportFieldTextConcatCsv()}
            disabled={!fieldTextConcatRequest || fieldTextConcatExporting}
          >
            {fieldTextConcatExporting ? "Đang xuất..." : "Xuất CSV"}
          </Button>
          <Button
            onClick={() => {
              setFieldTextConcatResult(null);
              setFieldTextConcatRequest(null);
            }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default WorkAggregationTab;
