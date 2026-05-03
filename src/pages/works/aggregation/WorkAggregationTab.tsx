import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Stack,
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
  useGetAggregateTableMutation,
  useGetDynamicFormAggregateTableMutation,
} from "../../../api/reportApi";
import {
  useSearchFieldStatisticSummaryMutation,
  type FieldStatisticSummaryResponse,
  type FieldStatisticSummaryRow,
} from "../../../api/fieldStatisticsApi";
import type {
  AggregateTableResponse,
  DynamicFormAggregateResponse,
} from "../../../types/reportAggregate";
import AggregateFilterBar from "../../../components/works/aggregate/AggregateFilterBar";
import AggregateResultTable from "../../../components/works/aggregate/AggregateResultTable";
import AggregateSourceTable from "../../../components/works/aggregate/AggregateSourceTable";
import AggregateWorkbookPreview from "../../../components/works/aggregate/AggregateWorkbookPreview";
import type {
  AggregateFilterState,
  AggregateMetricOption,
} from "../../../types/aggregateTypes";
import {
  buildWorkbookForCellSum,
  buildWorkbookHorizontalByUser,
  buildWorkbookVerticalByUser,
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

type DynamicFormExcelBlockResolution = {
  blockId: string;
  tableMode: DynamicFormTableMode;
  dynamicExcelId?: string | null;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
  metricOptions: AggregateMetricOption[];
};

function createDefaultFilter(defaultDynamicExcelId?: string | null): AggregateFilterState {
  return {
    dynamicExcelId: defaultDynamicExcelId ?? "",
    scopeMode: "DIRECT_CHILDREN",
    metricKeys: [],
    selectedUnitIds: [],
    periodScopeMode: "SINGLE_PERIOD",
    periodDate: "",
    periodDateFrom: "",
    periodDateTo: "",
    sourceStatusMode: "APPROVED_ONLY",
    aggregateMode: "SUM_BY_CELL",
  };
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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
    detail?.excelBlockJson,
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
    return "Dynamic Form has no Excel block configured for aggregation.";
  }

  return `Dynamic Form tableMode ${block.tableMode} is declared, but runtime aggregation supports FIXED_GRID, APPEND_ROWS, APPEND_COLUMNS, MATRIX, and SUMMARY_TEMPLATE only.`;
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

function formatFieldStatisticValue(row: FieldStatisticSummaryRow) {
  const type = row.fieldType?.toUpperCase();
  if (type === "NUMBER") {
    return `Sum ${formatMetricNumber(row.sum)} / Avg ${formatMetricNumber(row.average)}`;
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
        { key: "outputRowNumber", header: "Output row", width: 12, type: "integer" },
        { key: "rowsPerGroup", header: "Rows/group", width: 12, type: "integer" },
        { key: "groupType", header: "Group type", width: 14 },
        { key: "groupKey", header: "Group key", width: 24 },
        { key: "groupLabel", header: "Group label", width: 28 },
        { key: "unitSymbol", header: "Unit symbol", width: 16 },
        { key: "unitShortName", header: "Unit short name", width: 20 },
        { key: "workAssignmentId", header: "Assignment ID", width: 26 },
        { key: "metricKey", header: "Metric key", width: 54 },
        { key: "count", header: "Count", width: 12, type: "integer" },
        { key: "reportCount", header: "Reports", width: 12, type: "integer" },
        { key: "sum", header: "Sum", width: 14, type: "decimal" },
        { key: "min", header: "Min", width: 14, type: "decimal" },
        { key: "max", header: "Max", width: 14, type: "decimal" },
        { key: "average", header: "Average", width: 14, type: "decimal" },
      ]
    : [
        { key: "metricKey", header: "Metric key", width: 54 },
        { key: "rowKey", header: "Row", width: 20 },
        { key: "columnKey", header: "Column", width: 20 },
        { key: "count", header: "Count", width: 12, type: "integer" },
        { key: "sum", header: "Sum", width: 14, type: "decimal" },
        { key: "min", header: "Min", width: 14, type: "decimal" },
        { key: "max", header: "Max", width: 14, type: "decimal" },
        { key: "average", header: "Average", width: 14, type: "decimal" },
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
    sheetName: isSummary ? "Summary template" : "Dynamic Form aggregate",
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

  const meta = workbook.addWorksheet("Meta");
  meta.columns = [
    { key: "key", header: "Key", width: 28 },
    { key: "value", header: "Value", width: 46 },
  ];
  [
    ["Template ID", result.meta.dynamicFormTemplateId],
    ["Template code", result.meta.dynamicFormTemplateCode],
    ["Template name", result.meta.dynamicFormTemplateName],
    ["Block", result.meta.blockId],
    ["Mode", result.meta.tableMode],
    ["Scope assignment", result.meta.scopeAssignmentId],
    ["Scope mode", result.meta.scopeMode],
    ["Period scope", result.meta.periodScopeMode],
    ["Period", result.meta.periodKey],
    ["Period from", result.meta.periodKeyFrom],
    ["Period to", result.meta.periodKeyTo],
    ["Source status", result.meta.sourceStatusMode],
    ["Selected units", result.meta.selectedUnitIds?.join(", ")],
    ["Source assignments", result.meta.sourceAssignmentCount],
    ["Source reports", result.meta.sourceReportCount],
    ["Metrics", result.meta.metricCount],
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

  const worksheet = workbook.addWorksheet("Template output");
  worksheet.columns = [
    { key: "outputRowNumber", header: "Output row", width: 12 },
    { key: "groupLabel", header: "Unit / Assignment", width: 30 },
    { key: "workAssignmentId", header: "Assignment ID", width: 26 },
    { key: "metricLabel", header: "Metric", width: 34 },
    { key: "metricKey", header: "Metric key", width: 54 },
    { key: "reportCount", header: "Reports", width: 12 },
    { key: "count", header: "Count", width: 12 },
    { key: "sum", header: "Sum", width: 14 },
    { key: "min", header: "Min", width: 14 },
    { key: "max", header: "Max", width: 14 },
    { key: "average", header: "Average", width: 14 },
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

  const raw = workbook.addWorksheet("Raw result");
  const { columns, rows } = getDynamicFormAggregateExportShape(result);
  raw.columns = columns.map((column) => ({
    key: column.key,
    header: column.header,
    width: column.width,
  }));
  rows.forEach((row) => raw.addRow(row));
  raw.getRow(1).font = { bold: true };
  raw.views = [{ state: "frozen", ySplit: 1 }];

  const meta = workbook.addWorksheet("Meta");
  meta.columns = [
    { key: "key", header: "Key", width: 28 },
    { key: "value", header: "Value", width: 46 },
  ];
  [
    ["Template ID", result.meta.dynamicFormTemplateId],
    ["Template code", result.meta.dynamicFormTemplateCode],
    ["Template name", result.meta.dynamicFormTemplateName],
    ["Block", result.meta.blockId],
    ["Mode", result.meta.tableMode],
    ["Scope assignment", result.meta.scopeAssignmentId],
    ["Scope mode", result.meta.scopeMode],
    ["Period scope", result.meta.periodScopeMode],
    ["Period", result.meta.periodKey],
    ["Period from", result.meta.periodKeyFrom],
    ["Period to", result.meta.periodKeyTo],
    ["Source status", result.meta.sourceStatusMode],
    ["Selected units", result.meta.selectedUnitIds?.join(", ")],
    ["Source assignments", result.meta.sourceAssignmentCount],
    ["Source reports", result.meta.sourceReportCount],
    ["Metrics", result.meta.metricCount],
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
  const [searchFieldStatisticSummary, fieldStatisticState] =
    useSearchFieldStatisticSummaryMutation();
  const seedDynamicExcelId = normalizeOptionalText(defaultDynamicExcelId);
  const seedDynamicFormTemplateId = normalizeOptionalText(defaultDynamicFormTemplateId);

  const [filter, setFilter] = React.useState<AggregateFilterState>(() =>
    createDefaultFilter(seedDynamicExcelId)
  );
  const [result, setResult] = React.useState<AggregateTableResponse | null>(null);
  const [dynamicFormResult, setDynamicFormResult] =
    React.useState<DynamicFormAggregateResponse | null>(null);
  const [fieldStatisticResult, setFieldStatisticResult] =
    React.useState<FieldStatisticSummaryResponse | null>(null);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "" });

  const showMessage = React.useCallback((message: string) => {
    setSnackbar({ open: true, message });
  }, []);

  const dynamicFormQuery = useGetDynamicFormQuery(
    { id: seedDynamicFormTemplateId ?? "" },
    { skip: !seedDynamicFormTemplateId }
  );

  const resolvedDynamicFormExcelBlock = React.useMemo(
    () => resolveDynamicFormExcelBlock(dynamicFormQuery.data),
    [dynamicFormQuery.data]
  );
  const resolvedSupportedDynamicFormExcelBlock =
    isSupportedDynamicFormAggregateMode(resolvedDynamicFormExcelBlock?.tableMode)
      ? resolvedDynamicFormExcelBlock
      : null;

  const effectiveDynamicExcelId =
    seedDynamicExcelId ?? resolvedDynamicFormExcelBlock?.dynamicExcelId ?? null;
  const effectiveDynamicExcelCode =
    normalizeOptionalText(defaultDynamicExcelCode) ??
    resolvedDynamicFormExcelBlock?.dynamicExcelCode ??
    null;
  const effectiveDynamicExcelName =
    normalizeOptionalText(defaultDynamicExcelName) ??
    resolvedDynamicFormExcelBlock?.dynamicExcelName ??
    null;

  React.useEffect(() => {
    setFilter(createDefaultFilter(effectiveDynamicExcelId));
    setResult(null);
    setDynamicFormResult(null);
    setFieldStatisticResult(null);
  }, [effectiveDynamicExcelId, parentAssignmentId, seedDynamicFormTemplateId, workId]);

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
    templateQuery.isFetching ||
    dynamicFormQuery.isFetching;
  const hasDynamicFormSeed = Boolean(seedDynamicFormTemplateId);
  const dynamicFormResolutionPending =
    Boolean(parentAssignmentId) &&
    hasDynamicFormSeed &&
    dynamicFormQuery.isFetching;
  const hasResolvedDynamicFormExcelBlock =
    hasDynamicFormSeed && Boolean(resolvedDynamicFormExcelBlock);
  const supportsDynamicFormAggregate =
    hasDynamicFormSeed && Boolean(resolvedSupportedDynamicFormExcelBlock);
  const dynamicFormUnsupported =
    Boolean(parentAssignmentId) &&
    hasDynamicFormSeed &&
    !dynamicFormQuery.isFetching &&
    !dynamicFormQuery.error &&
    !resolvedSupportedDynamicFormExcelBlock;
  const dynamicFormUnsupportedMessage = formatUnsupportedDynamicFormBlockMessage(
    resolvedDynamicFormExcelBlock
  );

  const handleReset = React.useCallback(() => {
    setFilter(createDefaultFilter(effectiveDynamicExcelId));
    setResult(null);
    setDynamicFormResult(null);
    setFieldStatisticResult(null);
  }, [effectiveDynamicExcelId]);

  const validateFilter = React.useCallback(() => {
    if (dynamicFormUnsupported) return dynamicFormUnsupportedMessage;
    if (!parentAssignmentId) return "Thiáº¿u assignment gá»‘c Ä‘á»ƒ tá»•ng há»£p.";
    if (!seedDynamicFormTemplateId && !filter.dynamicExcelId.trim()) {
      return "Báº¯t buá»™c chá»n biá»ƒu máº«u.";
    }
    if (filter.periodScopeMode === "SINGLE_PERIOD" && !filter.periodDate) {
      return "Báº¯t buá»™c chá»n ngÃ y/ká»³.";
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
    filter,
    parentAssignmentId,
    seedDynamicFormTemplateId,
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
        const response = await getDynamicFormAggregateTable({
          scopeAssignmentId: parentAssignmentId ?? "",
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
          sourceStatusMode: filter.sourceStatusMode,
          selectedUnitIds,
        }).unwrap();

        setDynamicFormResult(response);
        setResult(null);
      } catch (err: unknown) {
        showMessage(getErrorMessage(err, "Could not aggregate Dynamic Form metrics."));
      }
      return;
    }

    try {
      const response = await getAggregateTable({
        parentAssignmentId: parentAssignmentId ?? "",
        dynamicExcelId: filter.dynamicExcelId.trim(),
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
        sourceStatusMode: filter.sourceStatusMode,
        selectedUnitIds,
        aggregateMode: filter.aggregateMode,
      }).unwrap();

      setResult(response);
      setDynamicFormResult(null);
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Could not aggregate data."));
    }
  }, [
    filter,
    getAggregateTable,
    getDynamicFormAggregateTable,
    parentAssignmentId,
    resolvedSupportedDynamicFormExcelBlock,
    seedDynamicFormTemplateId,
    showMessage,
    validateFilter,
  ]);

  const handleRunFieldStatistics = React.useCallback(async () => {
    if (!workId) {
      showMessage("Thiếu workId để xem thống kê field.");
      return;
    }
    if (!parentAssignmentId) {
      showMessage("Thiếu assignment gốc để xem thống kê field.");
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
        scopeId: parentAssignmentId,
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
        reportStatus: filter.sourceStatusMode === "APPROVED_ONLY" ? 2 : null,
        page: 0,
        pageSize: 100,
      }).unwrap();

      setFieldStatisticResult(response);
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Could not load field statistics."));
    }
  }, [
    filter,
    parentAssignmentId,
    searchFieldStatisticSummary,
    seedDynamicFormTemplateId,
    showMessage,
    workId,
  ]);

  const workbookPreview = React.useMemo(() => {
    if (!result) {
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

    return buildWorkbookVerticalByUser(result.rows ?? [], resultRect, templateSpec);
  }, [filter.aggregateMode, result, resultRect, templateSpec, templateWorkbook]);

  const periodSummary = React.useMemo(() => {
    if (!result) return "ChÆ°a cÃ³ dá»¯ liá»‡u";
    if (result.periodScopeMode === "ALL_PERIODS") return "ToÃ n bá»™ ká»³";
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
    const code = defaultDynamicFormTemplateCode || effectiveDynamicExcelCode || "";
    const name = defaultDynamicFormTemplateName || effectiveDynamicExcelName || "";
    return [code, name].filter(Boolean).join(" - ");
  }, [
    defaultDynamicFormTemplateCode,
    defaultDynamicFormTemplateName,
    effectiveDynamicExcelCode,
    effectiveDynamicExcelName,
  ]);
  const isSummaryTemplateResult =
    dynamicFormResult?.meta.tableMode === "SUMMARY_TEMPLATE";

  return (
    <Box sx={{ height: "100%", minHeight: 0 }}>
      <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
        <Stack spacing={0.5}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Tá»•ng há»£p biá»ƒu máº«u
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.72 }}>
            Tá»•ng há»£p theo dá»¯ liá»‡u 1D cá»§a report, hiá»ƒn thá»‹ láº¡i lÃªn template hoáº·c ghÃ©p theo ngÆ°á»i dÃ¹ng.
          </Typography>
        </Stack>

        {!parentAssignmentId && (
          <Alert severity="info">
            Chá»n má»™t assignment tá»« tab giao viá»‡c Ä‘á»ƒ náº¡p pháº¡m vi tá»•ng há»£p. Slice hiá»‡n táº¡i má»›i giá»¯
            luá»“ng legacy fixed-grid; bá»™ chá»n assignment trá»±c tiáº¿p trong tab sáº½ thuá»™c F08.2.
          </Alert>
        )}

        {parentAssignmentId && selectedTemplateLabel && (
          <Alert severity="info">
            Äang tá»•ng há»£p cho máº«u: <b>{selectedTemplateLabel}</b>
          </Alert>
        )}

        {dynamicFormResolutionPending && (
          <Alert severity="info">
            Loading Dynamic Form to resolve its aggregation Excel block.
          </Alert>
        )}

        {Boolean(parentAssignmentId) && supportsDynamicFormAggregate && (
          <Alert severity="success">
            Resolved Dynamic Form {resolvedSupportedDynamicFormExcelBlock?.tableMode} block.
          </Alert>
        )}

        {Boolean(parentAssignmentId) &&
          hasResolvedDynamicFormExcelBlock &&
          !supportsDynamicFormAggregate && (
          <Alert severity="warning">
            {dynamicFormUnsupportedMessage}
          </Alert>
        )}

        {Boolean(parentAssignmentId) && dynamicFormQuery.error && hasDynamicFormSeed && (
          <Alert severity="error">
            Could not load Dynamic Form to resolve the aggregation Excel block.
          </Alert>
        )}

        {Boolean(dynamicFormUnsupported && !hasResolvedDynamicFormExcelBlock) && (
          <Alert severity="warning">
            {dynamicFormUnsupportedMessage}
          </Alert>
        )}

        {parentAssignmentId && (
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

        {parentAssignmentId && workId && (
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
                    Field statistics
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.72 }}>
                    View-only scalar field summaries for fields marked showInDetail.
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void handleRunFieldStatistics()}
                  disabled={fieldStatisticState.isLoading}
                >
                  {fieldStatisticState.isLoading ? "Đang tải..." : "Xem field stats"}
                </Button>
              </Stack>

              {fieldStatisticResult && (
                <>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Chip
                      label={`Rows: ${fieldStatisticResult.totalRows}`}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`Values: ${fieldStatisticResult.totalValueCount}`}
                      variant="outlined"
                    />
                    <Chip
                      label={`Reports: ${fieldStatisticResult.totalReportCount}`}
                      variant="outlined"
                    />
                    <Chip
                      label={`Sum: ${formatMetricNumber(fieldStatisticResult.totalSum)}`}
                      variant="outlined"
                    />
                  </Stack>

                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Field</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Bucket</TableCell>
                          <TableCell>Period</TableCell>
                          <TableCell align="right">Value</TableCell>
                          <TableCell align="right">Count</TableCell>
                          <TableCell align="right">Reports</TableCell>
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
                            <TableCell>{row.fieldType}</TableCell>
                            <TableCell>{row.bucketLabel ?? row.bucketKey ?? "-"}</TableCell>
                            <TableCell>{formatDayKeyLabel(row.periodKey)}</TableCell>
                            <TableCell align="right">{formatFieldStatisticValue(row)}</TableCell>
                            <TableCell align="right">{row.valueCount}</TableCell>
                            <TableCell align="right">{row.reportCount}</TableCell>
                          </TableRow>
                        ))}
                        {fieldStatisticResult.rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7}>
                              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                Chưa có field statistic phù hợp với bộ lọc hiện tại.
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

        {loading && !result && (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        )}

        {templateQuery.error && (
          <Alert severity="error">KhÃ´ng táº£i Ä‘Æ°á»£c template DynamicExcel.</Alert>
        )}

        {dynamicFormResult && (
          <>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Chip
                label={`Metrics: ${dynamicFormResult.meta.metricCount}`}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Reports: ${dynamicFormResult.meta.sourceReportCount}`}
                variant="outlined"
              />
              <Chip
                label={`Assignments: ${dynamicFormResult.meta.sourceAssignmentCount}`}
                variant="outlined"
              />
              <Chip
                label={`Units: ${
                  dynamicFormResult.meta.selectedUnitIds?.length
                    ? `${dynamicFormResult.meta.selectedUnitIds.length} selected`
                    : "all"
                }`}
                variant="outlined"
              />
              <Chip
                label={`Scope: ${dynamicFormResult.meta.scopeMode}`}
                variant="outlined"
              />
              <Chip
                label={`Block: ${dynamicFormResult.meta.blockId}`}
                variant="outlined"
              />
              <Chip
                label={`Mode: ${dynamicFormResult.meta.tableMode}`}
                variant="outlined"
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
                onClick={() => downloadDynamicFormAggregateCsv(dynamicFormResult)}
              >
                Export CSV
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
                onClick={() => void downloadDynamicFormAggregateXlsx(dynamicFormResult)}
              >
                Export XLSX
              </Button>
              {isSummaryTemplateResult && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
                  onClick={() => void downloadSummaryTemplateWorkbookXlsx(dynamicFormResult)}
                >
                  Export template XLSX
                </Button>
              )}
            </Stack>

            {dynamicFormResult.warnings.map((warning) => (
              <Alert key={warning} severity="warning">
                {warning}
              </Alert>
            ))}

            <Alert severity="info">
              Dynamic Form aggregation uses stable metric keys from the table contract.
              SUMMARY_TEMPLATE preview reads projection aggregates from the configured source block.
            </Alert>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {isSummaryTemplateResult && <TableCell align="right">Output row</TableCell>}
                    {isSummaryTemplateResult && <TableCell>Group</TableCell>}
                    {isSummaryTemplateResult && <TableCell>Unit</TableCell>}
                    <TableCell>Metric key</TableCell>
                    <TableCell>Row</TableCell>
                    <TableCell>Column</TableCell>
                    <TableCell align="right">Count</TableCell>
                    {isSummaryTemplateResult && <TableCell align="right">Reports</TableCell>}
                    <TableCell align="right">Sum</TableCell>
                    <TableCell align="right">Min</TableCell>
                    <TableCell align="right">Max</TableCell>
                    <TableCell align="right">Average</TableCell>
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

            <AggregateSourceTable rows={dynamicFormResult.sources ?? []} />
          </>
        )}

        {result && (
          <>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Chip
                label={`Ká»³ dÃ¹ng Ä‘á»ƒ cá»™ng: ${result.periodCount ?? result.includedPeriodKeys?.length ?? 0}`}
                color="primary"
                variant="outlined"
              />
              <Chip label={`Pháº¡m vi: ${periodSummary}`} variant="outlined" />
              <Chip
                label={`Units: ${
                  result.selectedUnitIds?.length ? `${result.selectedUnitIds.length} selected` : "all"
                }`}
                variant="outlined"
              />
              <Chip label={`Nguá»“n: ${result.sources?.length ?? 0} bÃ¡o cÃ¡o`} variant="outlined" />
              {(result.includedPeriodKeys ?? []).map((item) => (
                <Chip key={item} label={formatDayKeyLabel(item)} size="small" variant="outlined" />
              ))}
            </Stack>

            <Alert severity="info">
              Mode: <b>{result.aggregateMode || filter.aggregateMode}</b>. Preview writes aggregate
              values directly into the template with legacy values1D.
            </Alert>

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

            <AggregateSourceTable rows={result.sources ?? []} />
          </>
        )}
      </Stack>

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
