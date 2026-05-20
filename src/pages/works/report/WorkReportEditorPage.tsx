// src/pages/works/report/WorkReportEditorPage.tsx
import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

import WorkbookDataGrid from "../../../components/excel/fortune/WorkbookDataGrid";
import type { WorkbookValueValidationIssue } from "../../../components/excel/fortune/fortuneAdapter";
import {
  getCellDataType,
  getCellStringListOptions,
  isDynamicExcelEnumDataType,
  normalizeSpecDataTypeMetadata,
} from "../../../components/excel/fortune/dataTypes";
import type {
  DynamicExcelDataType,
  DynamicExcelStringListOption,
  HeaderSpec,
} from "../../../components/excel/fortune/types";
import LabelPicker from "../../../components/labels/LabelPicker";
import type { LabelDataType } from "../../../api/labelApi";
import ReportStatusChip from "../../../components/reports/ReportStatusChip";
import ReportPeriodStatusChip from "../../../components/reports/ReportPeriodStatusChip";
import SingleDayKeyField, {
  dayKeyToIsoDate,
  isoDateToDayKey,
} from "../../../components/common/SingleDayKeyField";

import {
  useGetWorkAssignmentReportLogsQuery,
  useGetWorkAssignmentReportQuery,
  useSaveWorkAssignmentReportDraftMutation,
  useSubmitWorkAssignmentReportMutation,
  useWithdrawSubmittedReportMutation,
} from "../../../api/reportApi";
import { useGetDynamicFormQuery } from "../../../api/dynamicFormApi";
import { useGetDynamicExcelQuery } from "../../../api/dynamicExcelApi";

import { WorkAssignmentReportStatus } from "../../../types/reportStatus";
import type {
  WorkAssignmentReportLogRow,
  WorkAssignmentReportResponse,
  WorkReportCumulativeContributionMode,
  WorkReportDataOrigin,
} from "../../../types/report";
import {
  applyValues1DToWorkbook,
  normalizeTemplateWorkbook,
  parseReportDetail,
  safeParseJson,
} from "../../../types/report.parses";
import type { ReportCellValue } from "../../../types/report.helper";
import {
  buildEditorValue,
  getDynamicFormBlockJsonList,
  getDynamicFormFieldDisplayName,
  normalizeLabelCodes,
  normalizeTableMode,
} from "../../../features/dynamicForms/dynamicFormSchema";
import type {
  DynamicFormField,
  DynamicFormTableIndexMapItem,
  DynamicFormTableMode,
} from "../../../features/dynamicForms/dynamicForm.types";
import DynamicFormRuntimeFields, {
  type DynamicFormRuntimeValue,
  type DynamicFormRuntimeValues,
} from "../../../features/dynamicForms/runtime/DynamicFormRuntimeFields";
import {
  getDateInputErrorText,
  isDateInputValueValid,
  normalizeDateInputValue,
  type DateInputMode,
} from "../../../utils/dateInputFormat";
import { UITextKey, uiText } from '../../../constants/uiText';

export interface WorkReportEditorPageProps {
  workId: string;
  reportId: string;
  workReportPeriodId?: string;
  forceReadOnly?: boolean;
  previewData?: WorkAssignmentReportResponse | null;
  onBack?: () => void;
  onSaved?: () => void;
  onSubmitted?: () => void;
}

type WorkbookSavePayload = {
  blockId?: string;
  values1D: ReportCellValue[];
  validationIssues?: WorkbookValueValidationIssue[];
};

type WorkbookValueMap = Record<string, ReportCellValue[]>;
type WorkbookValidationIssueMap = Record<string, WorkbookValueValidationIssue[]>;

type ParsedReportDetail = ReturnType<typeof parseReportDetail>;
type DynamicFormRuntimeSchema = ReturnType<typeof buildEditorValue>;

const REPORT_DATA_ORIGIN_OPTIONS: Array<{ value: WorkReportDataOrigin; label: string }> = [
  { value: "MANUAL_INPUT", label: "Nhập tay" },
  { value: "AUTO_SUMMARY", label: "Tự tổng hợp" },
  { value: "COPIED_SUMMARY", label: "Sao chép tổng hợp" },
  { value: "PARTIAL_MAPPING", label: "Gán một phần từ tổng hợp" },
];

function isEditableReportStatus(status?: number | null) {
  return Number(status) === WorkAssignmentReportStatus.Draft;
}

function normalizeReportDataOrigin(value?: string | null): WorkReportDataOrigin {
  const normalized = value?.trim().toUpperCase();
  if (
    normalized === "AUTO_SUMMARY" ||
    normalized === "COPIED_SUMMARY" ||
    normalized === "PARTIAL_MAPPING"
  ) {
    return normalized;
  }

  return "MANUAL_INPUT";
}

function normalizeContributionMode(value?: string | null): WorkReportCumulativeContributionMode {
  return value?.trim().toUpperCase() === "EXCLUDE" ? "EXCLUDE" : "INCLUDE";
}

function shouldDefaultExcludeOrigin(origin: WorkReportDataOrigin) {
  return origin === "AUTO_SUMMARY" || origin === "COPIED_SUMMARY";
}

function isAutoSummaryDataLocked(origin: WorkReportDataOrigin) {
  return origin === "AUTO_SUMMARY" || origin === "COPIED_SUMMARY";
}

function getReportDataOriginLabel(origin: WorkReportDataOrigin) {
  return REPORT_DATA_ORIGIN_OPTIONS.find((item) => item.value === origin)?.label ?? origin;
}

function getReportDataOriginHelp(origin: WorkReportDataOrigin) {
  switch (origin) {
    case "AUTO_SUMMARY":
      return "Báo cáo được hệ thống tổng hợp từ báo cáo cấp dưới; thường không tính vào lũy kế để tránh cộng trùng.";
    case "COPIED_SUMMARY":
      return "Số liệu được sao chép từ kết quả tổng hợp; thường không tính vào lũy kế để tránh cộng trùng.";
    case "PARTIAL_MAPPING":
      return "Chỉ một phần chỉ số lấy từ kết quả tổng hợp, phần còn lại vẫn do người báo cáo nhập.";
    default:
      return "Người báo cáo tự nhập số liệu gốc; mặc định được tính vào thống kê và lũy kế sau khi duyệt.";
  }
}

function getContributionModeHelp(include: boolean) {
  return include
    ? "Khi báo cáo được duyệt, các trường/chỉ số thống kê hợp lệ sẽ được cộng vào số liệu chính thức."
    : "Khi báo cáo được duyệt, số liệu của báo cáo này không được cộng vào thống kê/lũy kế chính thức.";
}

function isOverdue(dueAtUtc?: string | null) {
  if (!dueAtUtc) return false;
  return new Date(dueAtUtc).getTime() < Date.now();
}

function todayDayKey() {
  const now = new Date();
  const yyyy = String(now.getFullYear()).padStart(4, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function toDayKey(value?: string | null) {
  if (!value) return "";
  const text = String(value).trim();
  const iso = isoDateToDayKey(text.slice(0, 10));
  if (iso) return iso;
  const digits = text.replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(0, 8) : "";
}

function dayKeyToApiDate(dayKey?: string | null) {
  return dayKey ? `${dayKeyToIsoDate(dayKey)}T00:00:00.000Z` : null;
}

function getReportAnchorDayKey(detail?: ParsedReportDetail | null) {
  if (!detail) return "";
  return (
    toDayKey(detail.periodEnd) ||
    toDayKey(detail.reportDate) ||
    toDayKey(detail.periodStart) ||
    toDayKey(detail.periodKey)
  );
}

function isHistoricalReportDetail(detail?: ParsedReportDetail | null) {
  if (!detail) return false;
  if (detail.isHistoricalData) return true;
  const anchor = getReportAnchorDayKey(detail);
  return Boolean(anchor && anchor < todayDayKey());
}

function resolveInitialStartedDayKey(detail: ParsedReportDetail) {
  return (
    toDayKey(detail.startedDate) ||
    toDayKey(detail.periodStart) ||
    toDayKey(detail.reportDate) ||
    toDayKey(detail.periodKey)
  );
}

function resolveInitialCompletedDayKey(detail: ParsedReportDetail) {
  const existing = toDayKey(detail.completedDate);
  if (existing) return existing;
  if (detail.requiresCompletedDate) return getReportAnchorDayKey(detail);
  return "";
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return withTime ? d.toLocaleString("vi-VN") : d.toLocaleDateString("vi-VN");
}

function parseDynamicFieldValues(input?: string | null): DynamicFormRuntimeValues {
  if (!input?.trim()) return {};

  try {
    const parsed = JSON.parse(input);
    const rawValues =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      parsed.values &&
      typeof parsed.values === "object" &&
      !Array.isArray(parsed.values)
        ? parsed.values
        : parsed;

    if (!rawValues || typeof rawValues !== "object" || Array.isArray(rawValues)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(rawValues).filter(([, value]) => {
        if (value == null) return true;
        if (typeof value === "string") return true;
        if (typeof value === "number") return Number.isFinite(value);
        if (typeof value === "boolean") return true;
        return Array.isArray(value) && value.every((item) => typeof item === "string");
      }),
    ) as DynamicFormRuntimeValues;
  } catch {
    return {};
  }
}

function normalizeDynamicValue(
  field: DynamicFormField,
  value: DynamicFormRuntimeValue | undefined,
): DynamicFormRuntimeValue {
  if (field.type === "boolean") {
    return typeof value === "boolean" ? value : null;
  }

  if (field.type === "number") {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  if (field.type === "date" || field.type === "fullDate") {
    if (value == null || value === "") return null;
    const mode: DateInputMode = field.type === "fullDate" ? "full" : "flexible";
    const normalized = normalizeDateInputValue(value, mode);
    const text = String(value).trim();
    return normalized ?? (text ? text : null);
  }

  if (field.type === "multiSelect") {
    return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
  }

  if (field.type === "stringList" || field.type === "longText") {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
  }

  if (value == null) return null;
  const text = String(value);
  return text === "" ? null : text;
}

function sanitizeDynamicFieldValues(
  fields: DynamicFormField[],
  values: DynamicFormRuntimeValues,
): DynamicFormRuntimeValues {
  return Object.fromEntries(
    fields.map((field) => [field.id, normalizeDynamicValue(field, values[field.id])]),
  );
}

function buildDynamicFieldValuesJson(
  detail: ParsedReportDetail,
  form: DynamicFormRuntimeSchema | null,
  values: DynamicFormRuntimeValues,
) {
  if (!detail.dynamicFormTemplateId) return detail.fieldValuesJson ?? null;
  if (!form) return detail.fieldValuesJson ?? null;

  const normalizedValues = sanitizeDynamicFieldValues(form.fields, values);

  return JSON.stringify({
    dynamicFormTemplateId: detail.dynamicFormTemplateId,
    dynamicFormTemplateCode: detail.dynamicFormTemplateCode ?? null,
    dynamicFormTemplateName: detail.dynamicFormTemplateName ?? null,
    schemaVersion: form?.schemaVersion ?? null,
    values: normalizedValues,
    updatedAtUtc: new Date().toISOString(),
  });
}

type ExcelBlockRowLabelColumn = {
  columnIndex?: number;
};

type ExcelBlockDataRect = {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
};

type ReportExcelBlockRuntime = {
  key: string;
  index: number;
  blockId: string;
  label: string;
  dynamicExcelTemplateId?: string | null;
  blockJson?: string | null;
  excelBlock?: Record<string, unknown> | null;
  spec: any;
  templateWorkbookData: any[];
  dataRect: ExcelBlockDataRect;
  w: number;
  h: number;
};

type ReportTableValuesBlock = {
  blockId?: string | null;
  values1D?: ReportCellValue[] | null;
  rowLabels?: ReportRuntimeRowLabel[] | null;
};

type ExcelBlockRowLabelDefault = {
  sheetId?: string;
  rowKey?: string;
  rowIndex?: number;
  rowLabelCodes?: string[];
  targetDataType?: LabelDataType;
  locked?: boolean;
  source?: string;
};

type ReportRuntimeRowLabel = {
  sheetId?: string | null;
  rowKey?: string | null;
  rowIndex?: number | null;
  rowLabelCodes?: string[] | null;
  locked?: boolean | null;
  source?: string | null;
};

type RowLabelStateMap = Record<string, ReportRuntimeRowLabel[]>;

function parseObjectJson(input?: string | null): Record<string, unknown> | null {
  if (!input?.trim()) return null;
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getExcelBlockLabelColumns(excelBlockJson?: string | null): number[] {
  const obj = parseObjectJson(excelBlockJson);
  const columns = Array.isArray(obj?.rowLabelColumns) ? obj.rowLabelColumns : [];
  return Array.from(
    new Set(
      columns
        .map((item) =>
          item && typeof item === "object"
            ? Number((item as ExcelBlockRowLabelColumn).columnIndex)
            : NaN,
        )
        .filter((value) => Number.isInteger(value) && value >= 0),
    ),
  );
}

function normalizeBlockId(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw || "excel_block";
}

function getOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sameTemplateId(a?: string | null, b?: string | null) {
  const left = a?.trim();
  const right = b?.trim();
  return Boolean(left && right && left === right);
}

function getBlockDynamicExcelTemplateId(excelBlock: Record<string, unknown>) {
  return getOptionalString(excelBlock.dynamicExcelTemplateId) ?? getOptionalString(excelBlock.templateId);
}

function getBlockLabel(
  detail: ParsedReportDetail,
  excelBlock: Record<string, unknown> | null,
  index: number,
) {
  if (!excelBlock) return detail.dynamicExcelTemplateName || detail.dynamicExcelTemplateCode || "Phần bảng";

  return (
    getOptionalString(excelBlock.dynamicExcelTemplateName) ??
    getOptionalString(excelBlock.name) ??
    getOptionalString(excelBlock.dynamicExcelTemplateCode) ??
    getOptionalString(excelBlock.code) ??
    `Phần bảng ${index + 1}`
  );
}

function parseBlockSpec(excelBlock: Record<string, unknown> | null, fallback: any) {
  if (!excelBlock) return fallback;
  if (typeof excelBlock.specJson === "string") {
    return safeParseJson<any>(excelBlock.specJson, fallback) ?? fallback;
  }

  return excelBlock.spec ?? fallback;
}

function parseBlockWorkbookData(excelBlock: Record<string, unknown> | null) {
  if (!excelBlock) return [];
  if (typeof excelBlock.rawWorkbookDataJson === "string") {
    return safeParseJson<any[]>(excelBlock.rawWorkbookDataJson, []) ?? [];
  }

  return Array.isArray(excelBlock.rawWorkbookData) ? excelBlock.rawWorkbookData : [];
}

function buildLegacyReportBlock(detail: ParsedReportDetail): ReportExcelBlockRuntime {
  return {
    key: "legacy_excel_block",
    index: 0,
    blockId: "excel_block",
    label: detail.dynamicExcelTemplateName || detail.dynamicExcelTemplateCode || "Phần bảng",
    dynamicExcelTemplateId: detail.dynamicExcelTemplateId,
    blockJson: null,
    excelBlock: null,
    spec: detail.spec,
    templateWorkbookData: detail.renderWorkbookData,
    dataRect: detail.dataRect,
    w: detail.w,
    h: detail.h,
  };
}

function buildReportExcelBlocks(
  detail: ParsedReportDetail,
  form: DynamicFormRuntimeSchema | null,
): ReportExcelBlockRuntime[] {
  if (!detail.dynamicFormTemplateId || !form) return [buildLegacyReportBlock(detail)];

  const blockJsonList = getDynamicFormBlockJsonList(form.blocksJson, form.excelBlockJson);
  const blocks = blockJsonList
    .map<ReportExcelBlockRuntime | null>((blockJson, index) => {
      const excelBlock = parseObjectJson(blockJson);
      if (!excelBlock) return null;

      const blockId = normalizeBlockId(excelBlock.blockId ?? excelBlock.id);
      const dynamicExcelTemplateId = getBlockDynamicExcelTemplateId(excelBlock);
      const isTopLevelTemplate = sameTemplateId(dynamicExcelTemplateId, detail.dynamicExcelTemplateId);
      const fallbackWorkbook = isTopLevelTemplate || index === 0 ? detail.renderWorkbookData : [];
      const templateWorkbookData = normalizeTemplateWorkbook(parseBlockWorkbookData(excelBlock));
      const dataRect = getExcelBlockDataRect(excelBlock) ?? detail.dataRect;
      const width = getPositiveInt(excelBlock.w ?? excelBlock.W) || getDataRectWidth(dataRect) || detail.w;
      const height = getPositiveInt(excelBlock.h ?? excelBlock.H) || getDataRectHeight(dataRect) || detail.h;

      return {
        key: `${blockId}:${index}`,
        index,
        blockId,
        label: getBlockLabel(detail, excelBlock, index),
        dynamicExcelTemplateId: dynamicExcelTemplateId ?? null,
        blockJson,
        excelBlock,
        spec: parseBlockSpec(excelBlock, isTopLevelTemplate ? detail.spec : null),
        templateWorkbookData: templateWorkbookData.length > 0 ? templateWorkbookData : fallbackWorkbook,
        dataRect,
        w: width,
        h: height,
      };
    })
    .filter((block): block is ReportExcelBlockRuntime => Boolean(block));

  return blocks.length > 0 ? blocks : [buildLegacyReportBlock(detail)];
}

function getDataRectWidth(dataRect: ExcelBlockDataRect | null) {
  return dataRect ? Math.max(0, dataRect.c1 - dataRect.c0 + 1) : 0;
}

function getDataRectHeight(dataRect: ExcelBlockDataRect | null) {
  return dataRect ? Math.max(0, dataRect.r1 - dataRect.r0 + 1) : 0;
}

function getExpectedValueLength(block: ReportExcelBlockRuntime) {
  return Math.max(0, block.w) * Math.max(0, block.h);
}

function normalizeReportCellValue(value: ReportCellValue | undefined): ReportCellValue {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const items = value
      .map((item) => typeof item === "string" ? item.trim() : "")
      .filter(Boolean);
    return items.length > 0 ? items : null;
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function normalizeWorkbookValues(
  values: ReportCellValue[] | null | undefined,
  expectedLength?: number,
): ReportCellValue[] {
  const source = Array.isArray(values) ? values : [];
  const length =
    typeof expectedLength === "number" && expectedLength >= 0
      ? Math.floor(expectedLength)
      : source.length;

  const next = source.slice(0, length).map((value) => normalizeReportCellValue(value));
  while (next.length < length) next.push(null);
  return next;
}

function getReportTableValuesBlocks(tableValuesJson?: string | null): ReportTableValuesBlock[] {
  const root = parseObjectJson(tableValuesJson);
  const blocks = Array.isArray(root?.blocks) ? root.blocks : [];
  return blocks.filter(
    (block): block is ReportTableValuesBlock =>
      Boolean(block && typeof block === "object" && !Array.isArray(block)),
  );
}

function getStoredBlockValues(tableValuesJson: string | null | undefined, blockId: string) {
  const target = normalizeBlockId(blockId);
  const block = getReportTableValuesBlocks(tableValuesJson).find(
    (item) => normalizeBlockId(item.blockId) === target,
  );
  return Array.isArray(block?.values1D) ? block.values1D : null;
}

function getStoredBlockRowLabels(
  tableValuesJson: string | null | undefined,
  blockId: string,
) {
  const target = normalizeBlockId(blockId);
  const block = getReportTableValuesBlocks(tableValuesJson).find(
    (item) => normalizeBlockId(item.blockId) === target,
  );
  return Array.isArray(block?.rowLabels)
    ? normalizeRuntimeRowLabels(block.rowLabels)
    : null;
}

function normalizeRuntimeRowLabels(rows?: ReportRuntimeRowLabel[] | null): ReportRuntimeRowLabel[] {
  const byRow = new Map<number, ReportRuntimeRowLabel>();

  for (const row of rows ?? []) {
    if (!row || typeof row !== "object") continue;

    const rowIndex = normalizeRowIndex(
      typeof row.rowIndex === "number" ? row.rowIndex : undefined,
      typeof row.rowKey === "string" ? row.rowKey : undefined,
    );
    if (!Number.isInteger(rowIndex) || rowIndex < 0) continue;

    const rowLabelCodes = normalizeLabelCodes(row.rowLabelCodes ?? []);
    if (rowLabelCodes.length === 0) continue;

    byRow.set(rowIndex, {
      sheetId: getOptionalString(row.sheetId) ?? "sheet_1",
      rowKey: getOptionalString(row.rowKey) ?? buildReportRowKey(rowIndex),
      rowIndex,
      rowLabelCodes,
      locked: Boolean(row.locked),
      source: getOptionalString(row.source) ?? "ROW_LABEL",
    });
  }

  return Array.from(byRow.values()).sort(
    (a, b) => Number(a.rowIndex ?? 0) - Number(b.rowIndex ?? 0),
  );
}

function getTemplateRowLabels(block: ReportExcelBlockRuntime) {
  const defaults = Array.isArray(block.excelBlock?.rowLabelDefaults)
    ? (block.excelBlock.rowLabelDefaults.filter(
        (item) => item && typeof item === "object",
      ) as ExcelBlockRowLabelDefault[])
    : [];

  return normalizeRuntimeRowLabels(
    defaults.map((row) => ({
      sheetId: row.sheetId ?? "sheet_1",
      rowKey: row.rowKey ?? buildReportRowKey(row.rowIndex),
      rowIndex: row.rowIndex,
      rowLabelCodes: row.rowLabelCodes,
      locked: row.locked,
      source: "TEMPLATE_DEFAULT",
    })),
  );
}

function buildInitialRowLabelsByBlock(
  detail: ParsedReportDetail,
  blocks: ReportExcelBlockRuntime[],
): RowLabelStateMap {
  return Object.fromEntries(
    blocks.map((block) => [
      block.blockId,
      getStoredBlockRowLabels(detail.tableValuesJson, block.blockId) ??
        getTemplateRowLabels(block),
    ]),
  );
}

function resolveTopLevelBlockId(
  detail: ParsedReportDetail,
  blocks: ReportExcelBlockRuntime[],
) {
  return (
    blocks.find((block) =>
      sameTemplateId(block.dynamicExcelTemplateId, detail.dynamicExcelTemplateId),
    )?.blockId ??
    blocks[0]?.blockId ??
    "excel_block"
  );
}

function resolveReportBlockValues(
  detail: ParsedReportDetail,
  block: ReportExcelBlockRuntime,
  topLevelBlockId: string,
  latestValues: WorkbookValueMap,
) {
  const expectedLength = getExpectedValueLength(block);
  const latest = latestValues[block.blockId];
  if (Array.isArray(latest)) return normalizeWorkbookValues(latest, expectedLength);

  if (block.blockId === topLevelBlockId) {
    return normalizeWorkbookValues(detail.values1D, expectedLength);
  }

  return normalizeWorkbookValues(
    getStoredBlockValues(detail.tableValuesJson, block.blockId),
    expectedLength,
  );
}

function buildWorkbookValuesByBlock(
  detail: ParsedReportDetail,
  blocks: ReportExcelBlockRuntime[],
  latestValues: WorkbookValueMap,
  override?: WorkbookSavePayload,
) {
  const topLevelBlockId = resolveTopLevelBlockId(detail, blocks);
  const valuesByBlock = Object.fromEntries(
    blocks.map((block) => [
      block.blockId,
      resolveReportBlockValues(detail, block, topLevelBlockId, latestValues),
    ]),
  ) as WorkbookValueMap;

  if (override?.values1D) {
    const overrideBlockId = normalizeBlockId(override.blockId ?? topLevelBlockId);
    const block = blocks.find((item) => item.blockId === overrideBlockId);
    valuesByBlock[overrideBlockId] = normalizeWorkbookValues(
      override.values1D,
      block ? getExpectedValueLength(block) : override.values1D.length,
    );
  }

  return valuesByBlock;
}

function hydrateReportBlockWorkbook(
  block: ReportExcelBlockRuntime,
  values1D: ReportCellValue[],
) {
  return applyValues1DToWorkbook(block.templateWorkbookData, {
    values1D,
    r0: block.dataRect.r0,
    c0: block.dataRect.c0,
    w: block.w,
    h: block.h,
  });
}

function buildTableValuesJson(
  detail: ParsedReportDetail,
  form: DynamicFormRuntimeSchema | null,
  blocks: ReportExcelBlockRuntime[],
  valuesByBlock: WorkbookValueMap,
  rowLabelsByBlock: RowLabelStateMap,
) {
  if (!detail.dynamicFormTemplateId || !form) return detail.tableValuesJson ?? null;

  const tableBlocks = blocks
    .map((block) =>
      block.excelBlock
        ? buildTableValuesBlock(
            block,
            valuesByBlock[block.blockId] ?? [],
            rowLabelsByBlock[block.blockId],
          )
        : null,
    )
    .filter((block): block is NonNullable<typeof block> => Boolean(block));

  if (tableBlocks.length === 0) return detail.tableValuesJson ?? null;

  return JSON.stringify({
    dynamicFormTemplateId: detail.dynamicFormTemplateId,
    dynamicFormTemplateCode: detail.dynamicFormTemplateCode ?? null,
    dynamicFormTemplateName: detail.dynamicFormTemplateName ?? null,
    updatedAtUtc: new Date().toISOString(),
    blocks: tableBlocks,
  });
}

function buildTableValuesBlock(
  block: ReportExcelBlockRuntime,
  values1D: ReportCellValue[],
  runtimeRowLabels?: ReportRuntimeRowLabel[],
) {
  const excelBlock = block.excelBlock;
  if (!excelBlock) return null;

  const tableMode = normalizeTableMode(excelBlock.tableMode);
  const blockId = block.blockId;
  const indexMap = getExcelBlockIndexMap(excelBlock, blockId, tableMode);
  const dataRect = getExcelBlockDataRect(excelBlock) ?? block.dataRect;
  const tableValues = normalizeWorkbookValues(values1D, getExpectedValueLength(block));
  const rowLabels = normalizeRuntimeRowLabels(runtimeRowLabels ?? getTemplateRowLabels(block));
  const metricDefinitions = buildTableMetricDefinitions(
    blockId,
    tableMode,
    excelBlock,
    dataRect,
    indexMap,
  );
  const statisticIndexMap = metricDefinitions.map((metric) => ({
    index: metric.index,
    rowKey: metric.rowKey,
    columnKey: metric.columnKey,
    metricKey: metric.metricKey,
  }));
  const appendRows = buildAppendRowsTableRecords(tableMode, blockId, dataRect, tableValues, rowLabels);
  const appendColumns = buildAppendColumnsTableRecords(tableMode, blockId, dataRect, tableValues);
  const matrixCells = buildMatrixTableCellRecords(tableMode, blockId, dataRect, tableValues, indexMap);

  if (
    rowLabels.length === 0 &&
    tableValues.length === 0 &&
    statisticIndexMap.length === 0 &&
    appendRows.length === 0 &&
    appendColumns.length === 0 &&
    matrixCells.length === 0
  ) {
    return null;
  }

  return {
    blockId,
    dynamicExcelTemplateId:
      getOptionalString(excelBlock.dynamicExcelTemplateId) ?? block.dynamicExcelTemplateId ?? null,
    tableMode,
    w: getPositiveInt(excelBlock.w ?? excelBlock.W) || null,
    h: getPositiveInt(excelBlock.h ?? excelBlock.H) || null,
    dataRect,
    values1D: tableValues,
    indexMap: statisticIndexMap,
    metricDefinitions,
    rowLabels,
    rows: appendRows,
    columns: appendColumns,
    cells: matrixCells,
  };
}

function buildAppendRowsTableRecords(
  tableMode: DynamicFormTableMode,
  blockId: string,
  dataRect: ExcelBlockDataRect | null,
  tableValues: ReportCellValue[],
  rowLabels: ReportRuntimeRowLabel[],
) {
  if (tableMode !== "APPEND_ROWS" || !dataRect) return [];

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return [];

  return Array.from({ length: height }, (_, rowOffset) => {
    const absoluteRow = dataRect.r0 + rowOffset;
    const cells = Object.fromEntries(
      Array.from({ length: width }, (_, colOffset) => {
        const value = tableValues[rowOffset * width + colOffset];
        return [`col_${colOffset + 1}`, value] as const;
      }).filter(([, value]) => !isBlankReportCellValue(value)),
    );

    const rowLabelCodes = normalizeLabelCodes(
      rowLabels.find((row) => Number(row.rowIndex) === absoluteRow)?.rowLabelCodes ?? [],
    );

    return {
      rowInstanceId: `${normalizeMetricPart(blockId, "excel_block")}:row:${absoluteRow + 1}`,
      rowOrder: rowOffset + 1,
      rowKey: `sheet_1:R${absoluteRow + 1}`,
      rowLabelCodes,
      cells,
    };
  }).filter((row) => Object.keys(row.cells).length > 0 || row.rowLabelCodes.length > 0);
}

function buildAppendColumnsTableRecords(
  tableMode: DynamicFormTableMode,
  blockId: string,
  dataRect: ExcelBlockDataRect | null,
  tableValues: ReportCellValue[],
) {
  if (tableMode !== "APPEND_COLUMNS" || !dataRect) return [];

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return [];

  return Array.from({ length: width }, (_, colOffset) => {
    const absoluteColumn = dataRect.c0 + colOffset;
    const cells = Object.fromEntries(
      Array.from({ length: height }, (_, rowOffset) => {
        const value = tableValues[rowOffset * width + colOffset];
        return [`row_${rowOffset + 1}`, value] as const;
      }).filter(([, value]) => !isBlankReportCellValue(value)),
    );

    return {
      columnInstanceId: `${normalizeMetricPart(blockId, "excel_block")}:column:${absoluteColumn + 1}`,
      columnOrder: colOffset + 1,
      columnKey: `sheet_1:C${absoluteColumn + 1}`,
      columnLabelCodes: [],
      cells,
    };
  }).filter((column) => Object.keys(column.cells).length > 0);
}

function buildMatrixTableCellRecords(
  tableMode: DynamicFormTableMode,
  blockId: string,
  dataRect: ExcelBlockDataRect | null,
  tableValues: ReportCellValue[],
  indexMap: DynamicFormTableIndexMapItem[],
) {
  if (tableMode !== "MATRIX" || !dataRect) return [];

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return [];

  const metricByIndex = new Map(indexMap.map((item) => [item.index, item]));

  return Array.from({ length: width * height }, (_, index) => {
    const rowOffset = Math.floor(index / width);
    const colOffset = index % width;
    const value = tableValues[index];
    if (isBlankReportCellValue(value)) return null;

    const metric =
      metricByIndex.get(index) ?? {
        index,
        rowKey: `row_${rowOffset + 1}`,
        columnKey: `col_${colOffset + 1}`,
        metricKey: buildMetricKey(blockId, `row_${rowOffset + 1}`, `col_${colOffset + 1}`),
      };

    return {
      rowAxisKey: "row",
      rowKey: metric.rowKey,
      columnAxisKey: "column",
      columnKey: metric.columnKey,
      metricKey: metric.metricKey,
      value,
    };
  }).filter((cell): cell is NonNullable<typeof cell> => Boolean(cell));
}

function isBlankReportCellValue(value: ReportCellValue | undefined) {
  return value == null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.every((item) => !item.trim()));
}

type ReportTableMetricDefinition = {
  blockId: string;
  metricKey: string;
  rowKey: string;
  columnKey: string;
  index: number;
  displayLabel: string;
  dataType: DynamicExcelDataType;
  sourceKind: DynamicFormTableMode;
  supportedOps: string[];
  options?: DynamicExcelStringListOption[];
};

function buildTableMetricDefinitions(
  blockId: string,
  tableMode: DynamicFormTableMode,
  excelBlock: Record<string, unknown>,
  dataRect: ExcelBlockDataRect | null,
  indexMap: DynamicFormTableIndexMapItem[],
): ReportTableMetricDefinition[] {
  if (!dataRect) return [];

  const w = getPositiveInt(excelBlock.w ?? excelBlock.W) || dataRect.c1 - dataRect.c0 + 1;
  const h = getPositiveInt(excelBlock.h ?? excelBlock.H) || dataRect.r1 - dataRect.r0 + 1;
  if (w <= 0 || h <= 0) return [];

  const spec = buildMetricHeaderSpec(excelBlock, dataRect);
  const targets = resolveConfiguredTableMetricTargets(
    blockId,
    tableMode,
    excelBlock,
    dataRect,
    w,
    h,
    indexMap,
  );

  return targets
    .filter((metric) => isMetricIndexInBounds(metric, tableMode, w, h))
    .map((metric) => {
      const absoluteCell = resolveMetricAbsoluteCell(metric, tableMode, dataRect, w);
      const dataType = getCellDataType(spec, dataRect, absoluteCell.row, absoluteCell.column);
      const options = isDynamicExcelEnumDataType(dataType)
        ? getCellStringListOptions(spec, dataRect, absoluteCell.row, absoluteCell.column)
        : [];

      return {
        blockId,
        metricKey: metric.metricKey,
        rowKey: metric.rowKey,
        columnKey: metric.columnKey,
        index: metric.index,
        displayLabel: `${metric.rowKey} / ${metric.columnKey}`,
        dataType,
        sourceKind: tableMode,
        supportedOps: getSupportedMetricOps(dataType),
        ...(options.length > 0 ? { options } : {}),
      };
    });
}

function resolveConfiguredTableMetricTargets(
  blockId: string,
  tableMode: DynamicFormTableMode,
  excelBlock: Record<string, unknown>,
  dataRect: ExcelBlockDataRect,
  width: number,
  height: number,
  indexMap: DynamicFormTableIndexMapItem[],
): DynamicFormTableIndexMapItem[] {
  const byMetricKey = new Map<string, DynamicFormTableIndexMapItem>();
  const knownByMetricKey = new Map(indexMap.map((item) => [item.metricKey, item]));

  const addMetric = (metric: DynamicFormTableIndexMapItem | null) => {
    if (!metric?.metricKey || byMetricKey.has(metric.metricKey)) return;
    byMetricKey.set(metric.metricKey, metric);
  };

  const addMetricKey = (metricKey: string | null, fallbackIndex: number) => {
    if (!metricKey) return;
    addMetric(knownByMetricKey.get(metricKey) ?? parseConfiguredMetricKey(metricKey, tableMode, width, fallbackIndex));
  };

  (Array.isArray(excelBlock.metricRules) ? excelBlock.metricRules : []).forEach((rule, index) => {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) return;
    addMetricKey(readOptionalString((rule as Record<string, unknown>).metricKey), index);
  });

  (Array.isArray(excelBlock.metricLabelTargets) ? excelBlock.metricLabelTargets : []).forEach((target, targetIndex) => {
    if (!target || typeof target !== "object" || Array.isArray(target)) return;
    const row = target as Record<string, unknown>;
    const metricKey = readOptionalString(row.metricKey);
    if (metricKey) {
      addMetricKey(metricKey, targetIndex);
      return;
    }

    const range = readMetricTargetRange(row);
    if (!range) return;
    expandMetricTargetRange(blockId, tableMode, dataRect, range, width, height).forEach(addMetric);
  });

  return Array.from(byMetricKey.values()).sort((a, b) => a.index - b.index || a.metricKey.localeCompare(b.metricKey));
}

function parseConfiguredMetricKey(
  metricKey: string,
  tableMode: DynamicFormTableMode,
  width: number,
  fallbackIndex: number,
): DynamicFormTableIndexMapItem {
  const fixed = metricKey.match(/\.row:([^.]+)\.column:([^.]+)$/);
  if (fixed) {
    const rowKey = normalizeMetricPart(fixed[1], `row_${fallbackIndex + 1}`);
    const columnKey = normalizeMetricPart(fixed[2], "value");
    const index = indexFromRowColumn(rowKey, columnKey, width) ?? fallbackIndex;
    return { index, rowKey, columnKey, metricKey };
  }

  const appendColumn = metricKey.match(/\.column:([^.]+)$/);
  if (tableMode === "APPEND_ROWS" && appendColumn) {
    const columnKey = normalizeMetricPart(appendColumn[1], `col_${fallbackIndex + 1}`);
    return {
      index: indexFromOrdinalPart(columnKey, "col_") ?? fallbackIndex,
      rowKey: "APPEND_ROWS",
      columnKey,
      metricKey,
    };
  }

  const appendRow = metricKey.match(/\.row:([^.]+)$/);
  if (tableMode === "APPEND_COLUMNS" && appendRow) {
    const rowKey = normalizeMetricPart(appendRow[1], `row_${fallbackIndex + 1}`);
    return {
      index: indexFromOrdinalPart(rowKey, "row_") ?? fallbackIndex,
      rowKey,
      columnKey: "APPEND_COLUMNS",
      metricKey,
    };
  }

  return {
    index: fallbackIndex,
    rowKey: tableMode === "APPEND_ROWS" ? "APPEND_ROWS" : `row_${fallbackIndex + 1}`,
    columnKey: tableMode === "APPEND_COLUMNS" ? "APPEND_COLUMNS" : "value",
    metricKey,
  };
}

function expandMetricTargetRange(
  blockId: string,
  tableMode: DynamicFormTableMode,
  dataRect: ExcelBlockDataRect,
  range: ExcelBlockDataRect,
  width: number,
  height: number,
): DynamicFormTableIndexMapItem[] {
  const r0 = Math.max(dataRect.r0, range.r0);
  const c0 = Math.max(dataRect.c0, range.c0);
  const r1 = Math.min(dataRect.r1, range.r1);
  const c1 = Math.min(dataRect.c1, range.c1);
  if (r1 < r0 || c1 < c0) return [];

  const rows: DynamicFormTableIndexMapItem[] = [];
  if (tableMode === "APPEND_ROWS") {
    for (let c = c0; c <= c1; c += 1) {
      const columnOffset = c - dataRect.c0;
      if (columnOffset < 0 || columnOffset >= width) continue;
      const columnKey = `col_${columnOffset + 1}`;
      rows.push({
        index: columnOffset,
        rowKey: "APPEND_ROWS",
        columnKey,
        metricKey: `table:${normalizeMetricPart(blockId, "excel_block")}.column:${columnKey}`,
      });
    }
    return rows;
  }

  if (tableMode === "APPEND_COLUMNS") {
    for (let r = r0; r <= r1; r += 1) {
      const rowOffset = r - dataRect.r0;
      if (rowOffset < 0 || rowOffset >= height) continue;
      const rowKey = `row_${rowOffset + 1}`;
      rows.push({
        index: rowOffset,
        rowKey,
        columnKey: "APPEND_COLUMNS",
        metricKey: `table:${normalizeMetricPart(blockId, "excel_block")}.row:${rowKey}`,
      });
    }
    return rows;
  }

  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) {
      const rowOffset = r - dataRect.r0;
      const colOffset = c - dataRect.c0;
      if (rowOffset < 0 || rowOffset >= height || colOffset < 0 || colOffset >= width) continue;
      const rowKey = `row_${rowOffset + 1}`;
      const columnKey = `col_${colOffset + 1}`;
      rows.push({
        index: rowOffset * width + colOffset,
        rowKey,
        columnKey,
        metricKey: buildMetricKey(blockId, rowKey, columnKey),
      });
    }
  }
  return rows;
}

function isMetricIndexInBounds(
  metric: DynamicFormTableIndexMapItem,
  tableMode: DynamicFormTableMode,
  width: number,
  height: number,
) {
  if (metric.index < 0) return false;
  if (tableMode === "APPEND_ROWS") return metric.index < width;
  if (tableMode === "APPEND_COLUMNS") return metric.index < height;
  return metric.index < width * height;
}

function resolveMetricAbsoluteCell(
  metric: DynamicFormTableIndexMapItem,
  tableMode: DynamicFormTableMode,
  dataRect: ExcelBlockDataRect,
  width: number,
) {
  if (tableMode === "APPEND_ROWS") {
    return { row: dataRect.r0, column: dataRect.c0 + metric.index };
  }

  if (tableMode === "APPEND_COLUMNS") {
    return { row: dataRect.r0 + metric.index, column: dataRect.c0 };
  }

  return {
    row: dataRect.r0 + Math.floor(metric.index / Math.max(1, width)),
    column: dataRect.c0 + metric.index % Math.max(1, width),
  };
}

function readMetricTargetRange(value: Record<string, unknown>): ExcelBlockDataRect | null {
  const raw = value.range && typeof value.range === "object" && !Array.isArray(value.range)
    ? value.range as Record<string, unknown>
    : value;
  const r0 = Number(raw.r0 ?? raw.R0);
  const c0 = Number(raw.c0 ?? raw.C0);
  const r1 = Number(raw.r1 ?? raw.R1);
  const c1 = Number(raw.c1 ?? raw.C1);
  if (![r0, c0, r1, c1].every(Number.isFinite)) return null;
  if (r1 < r0 || c1 < c0) return null;
  return { r0, c0, r1, c1 };
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function indexFromRowColumn(rowKey: string, columnKey: string, width: number) {
  const rowIndex = indexFromOrdinalPart(rowKey, "row_");
  const columnIndex = indexFromOrdinalPart(columnKey, "col_");
  if (rowIndex == null || columnIndex == null || width <= 0) return null;
  return rowIndex * width + columnIndex;
}

function indexFromOrdinalPart(value: string, prefix: string) {
  if (!value.toLowerCase().startsWith(prefix)) return null;
  const n = Number(value.slice(prefix.length));
  return Number.isInteger(n) && n > 0 ? n - 1 : null;
}

function buildMetricHeaderSpec(
  excelBlock: Record<string, unknown>,
  dataRect: ExcelBlockDataRect,
): HeaderSpec {
  const kindRaw = getOptionalString(excelBlock.excelSpecKind) ?? getOptionalString(excelBlock.kind);
  const kind = kindRaw === "LEFT" || kindRaw === "MATRIX" ? kindRaw : "TOP";
  const base = {
    defaultDataType: getOptionalString(excelBlock.defaultDataType) as DynamicExcelDataType | undefined,
    defaultOptions: Array.isArray(excelBlock.defaultOptions) ? excelBlock.defaultOptions as DynamicExcelStringListOption[] : [],
    dataTypeOverrides: Array.isArray(excelBlock.dataTypeOverrides) ? excelBlock.dataTypeOverrides as HeaderSpec["dataTypeOverrides"] : [],
  };

  if (kind === "LEFT") {
    return normalizeSpecDataTypeMetadata({
      kind,
      leftRows: dataRect.r1 + 1,
      leftCols: Math.max(1, dataRect.c0),
      dataCols: dataRect.c1 - dataRect.c0 + 1,
      ...base,
    });
  }

  if (kind === "MATRIX") {
    return normalizeSpecDataTypeMetadata({
      kind,
      topRows: Math.max(1, dataRect.r0),
      topCols: dataRect.c1 - dataRect.c0 + 1,
      leftRows: dataRect.r1 - dataRect.r0 + 1,
      leftCols: Math.max(1, dataRect.c0),
      ...base,
    });
  }

  return normalizeSpecDataTypeMetadata({
    kind: "TOP",
    topRows: Math.max(1, dataRect.r0),
    topCols: dataRect.c1 - dataRect.c0 + 1,
    dataRows: dataRect.r1 - dataRect.r0 + 1,
    ...base,
  });
}

function getSupportedMetricOps(dataType: DynamicExcelDataType) {
  if (dataType === "NUMBER") return ["count", "sum", "min", "max", "average"];
  if (dataType === "SHORT_TEXT" || dataType === "MULTI_SELECT") return ["count", "bucketCount"];
  if (dataType === "BOOLEAN") return ["count", "trueCount", "falseCount"];
  if (dataType === "DATE" || dataType === "FULL_DATE") return ["count", "earliest", "latest"];
  return ["count"];
}

function getExcelBlockIndexMap(
  excelBlock: Record<string, unknown>,
  blockId: string,
  tableMode: DynamicFormTableMode,
): DynamicFormTableIndexMapItem[] {
  if (tableMode !== "FIXED_GRID" && tableMode !== "MATRIX") return [];

  const raw = Array.isArray(excelBlock.indexMap) ? excelBlock.indexMap : [];
  const normalized = raw
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const rowKey = normalizeMetricPart(row.rowKey, `row_${index + 1}`);
      const columnKey = normalizeMetricPart(row.columnKey, "value");
      return {
        index: getNonNegativeInt(row.index, index),
        rowKey,
        columnKey,
        metricKey:
          typeof row.metricKey === "string" && row.metricKey.trim()
            ? row.metricKey.trim()
            : buildMetricKey(blockId, rowKey, columnKey),
      };
    })
    .filter((item): item is DynamicFormTableIndexMapItem => Boolean(item));

  return normalized;
}

function getExcelBlockDataRect(excelBlock: Record<string, unknown>): ExcelBlockDataRect | null {
  const raw = excelBlock.dataRect;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rect = raw as Record<string, unknown>;
  const r0 = Number(rect.r0 ?? rect.R0);
  const c0 = Number(rect.c0 ?? rect.C0);
  const r1 = Number(rect.r1 ?? rect.R1);
  const c1 = Number(rect.c1 ?? rect.C1);
  if (![r0, c0, r1, c1].every(Number.isFinite)) return null;
  return { r0, c0, r1, c1 };
}

function getPositiveInt(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function getNonNegativeInt(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
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
  return `table:${normalizeMetricPart(blockId, "excel_block")}.row:${rowKey}.column:${columnKey}`;
}

function normalizeRowIndex(rowIndex?: number, rowKey?: string) {
  const value = Number(rowIndex);
  if (Number.isInteger(value) && value >= 0) return value;

  const match = typeof rowKey === "string" ? rowKey.match(/R(\d+)$/i) : null;
  return match ? Number(match[1]) - 1 : Number.NaN;
}

function buildReportRowKey(rowIndex?: number) {
  const value = Number(rowIndex);
  return Number.isInteger(value) && value >= 0 ? `sheet_1:R${value + 1}` : null;
}

function getReportBlockDataRows(block: ReportExcelBlockRuntime | null) {
  if (!block?.dataRect) return [];

  const r0 = Math.max(0, Math.floor(block.dataRect.r0));
  const r1 = Math.max(r0, Math.floor(block.dataRect.r1));
  return Array.from({ length: r1 - r0 + 1 }, (_, index) => r0 + index);
}

function getReportBlockAllowedRowLabelCodes(block: ReportExcelBlockRuntime | null) {
  const raw = Array.isArray(block?.excelBlock?.allowedRowLabelCodes)
    ? block.excelBlock.allowedRowLabelCodes
    : [];
  return normalizeLabelCodes(raw.filter((item): item is string => typeof item === "string"));
}

function getReportBlockRowLabelDataType(block: ReportExcelBlockRuntime | null): LabelDataType {
  return normalizeTableTargetLabelDataType(
    block?.excelBlock?.rowLabelDataType ??
      block?.excelBlock?.rowLabelTargetDataType ??
      block?.excelBlock?.targetDataType ??
      block?.excelBlock?.labelDataType ??
      block?.excelBlock?.defaultDataType ??
      block?.excelBlock?.dataType,
  );
}

function getInvalidDynamicField(
  fields: DynamicFormField[],
  values: DynamicFormRuntimeValues,
) {
  return fields.find((field) => {
    if (field.type !== "date" && field.type !== "fullDate") return false;
    const value = values[field.id];
    if (value == null || value === "") return false;
    const mode: DateInputMode = field.type === "fullDate" ? "full" : "flexible";
    return !isDateInputValueValid(value, mode);
  });
}

function getDynamicFieldValidationMessage(field: DynamicFormField) {
  const mode: DateInputMode = field.type === "fullDate" ? "full" : "flexible";
  return getDateInputErrorText(getDynamicFormFieldDisplayName(field), mode);
}

function normalizeTableTargetLabelDataType(value: unknown): LabelDataType {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (raw === "TEXT" || raw === "STRING" || raw === "SHORTTEXT") return "SHORT_TEXT";
  if (raw === "MULTI_SELECT" || raw === "MULTISELECT") return "SHORT_TEXT";
  if (raw === "STRINGLIST" || raw === "STRING_LIST" || raw === "LONGTEXT" || raw === "LONG_TEXT") return "STRING_LIST";
  if (
    raw === "NUMBER" ||
    raw === "SHORT_TEXT" ||
    raw === "STRING_LIST" ||
    raw === "DATE" ||
    raw === "FULL_DATE" ||
    raw === "FULLDATE" ||
    raw === "BOOLEAN"
  ) {
    return raw === "FULL_DATE" || raw === "FULLDATE" ? "DATE" : raw;
  }
  return "NUMBER";
}

function getRowLabelCodes(rowLabels: ReportRuntimeRowLabel[], rowIndex: number) {
  const row = rowLabels.find((item) => Number(item.rowIndex) === rowIndex);
  return normalizeLabelCodes(row?.rowLabelCodes ?? []);
}

function isRowLabelLocked(rowLabels: ReportRuntimeRowLabel[], rowIndex: number) {
  return Boolean(rowLabels.find((item) => Number(item.rowIndex) === rowIndex)?.locked);
}

function hasRequiredDynamicValue(field: DynamicFormField, values: DynamicFormRuntimeValues) {
  const value = values[field.id];
  if (field.type === "boolean") return value === true || value === false;
  if (Array.isArray(value)) return value.some((item) => String(item).trim());
  return value !== null && value !== undefined && value !== "";
}

function getMissingRequiredFields(
  fields: DynamicFormField[],
  values: DynamicFormRuntimeValues,
) {
  return fields.filter((field) => field.required && !hasRequiredDynamicValue(field, values));
}

function getFirstWorkbookValidationIssue(
  blocks: ReportExcelBlockRuntime[],
  issuesByBlock: WorkbookValidationIssueMap,
) {
  for (const block of blocks) {
    const issue = issuesByBlock[block.blockId]?.[0];
    if (issue) return { block, issue };
  }
  return null;
}

function getLogActionLabel(action?: string) {
  switch (action) {
    case "INIT_DRAFT":
      return "Khởi tạo nháp";
    case "SAVE_DRAFT":
      return "Lưu nháp";
    case "SUBMIT":
      return "Nộp báo cáo";
    case "APPROVE":
      return "Duyệt báo cáo";
    case "RETURN":
      return "Trả lại báo cáo";
    default:
      return action || "-";
  }
}

type HeaderSectionProps = {
  detail: ReturnType<typeof parseReportDetail>;
  overdue: boolean;
  canEdit: boolean;
  dataOrigin: WorkReportDataOrigin;
  cumulativeContributionMode: WorkReportCumulativeContributionMode;
  onBack?: () => void;
};

function ReportHeaderSection(props: HeaderSectionProps) {
  const { detail, overdue, canEdit, dataOrigin, cumulativeContributionMode, onBack } = props;
  if (!detail) return null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={1}
          >
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {detail.dynamicFormTemplateName ||
                  detail.dynamicExcelTemplateName ||
                  "Biểu mẫu báo cáo"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {detail.dynamicFormTemplateCode || detail.dynamicExcelTemplateCode || "-"} • Kỳ{" "}
                {detail.periodKey}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <ReportStatusChip status={detail.status} />
              <ReportPeriodStatusChip status={detail.periodStatus} />
              <Chip
                size="small"
                variant="outlined"
                color={cumulativeContributionMode === "INCLUDE" ? "success" : "default"}
                label={cumulativeContributionMode === "INCLUDE" ? "Tính lũy kế" : "Không tính lũy kế"}
              />
              <Chip
                size="small"
                variant="outlined"
                label={getReportDataOriginLabel(dataOrigin)}
              />
              {detail.dueAtUtc && (
                <Chip
                  size="small"
                  variant="outlined"
                  color={overdue ? "error" : "default"}
                  label={`Hạn: ${formatDate(detail.dueAtUtc)}`}
                />
              )}
            </Stack>
          </Stack>

          {detail.status === WorkAssignmentReportStatus.Submitted && (
            <Alert severity="info">
              Báo cáo đã nộp và đang chờ duyệt. Hiện chỉ có thể xem.
            </Alert>
          )}

          {detail.status === WorkAssignmentReportStatus.Approved &&
            detail.autoApproved === true &&
            detail.autoApprovalLocked !== true && (
              <Alert severity="success">
                Báo cáo đã được tự duyệt. Có thể thu hồi cho đến khi người duyệt xác nhận.
              </Alert>
            )}

          {detail.status === WorkAssignmentReportStatus.Approved &&
            !(detail.autoApproved === true && detail.autoApprovalLocked !== true) && (
              <Alert severity="success">
                Báo cáo đã được duyệt. Hiện chỉ có thể xem.
              </Alert>
            )}

          {canEdit && (
            <Alert severity="info">
              Bấm <b>Lưu nháp</b> để ghi workbook mới nhất. Khi bấm <b>Nộp báo cáo</b>,
              hệ thống sẽ tự lưu dữ liệu trước rồi mới gửi báo cáo.
            </Alert>
          )}

          {overdue && (
            <Alert severity="warning">
              Báo cáo đã quá hạn. Khi nộp bắt buộc phải nhập <b>Lý do trễ hạn</b>.
            </Alert>
          )}

          {detail.returnReason && (
            <Alert severity="warning">
              <b>Lý do trả lại:</b> {detail.returnReason}
            </Alert>
          )}

          {detail.reviewerComment && (
            <Alert severity="info">
              <b>Nhận xét:</b> {detail.reviewerComment}
            </Alert>
          )}

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button variant="outlined" onClick={onBack}>
              Quay lại
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

type ActionBarProps = {
  canEdit: boolean;
  canWithdraw: boolean;
  busy: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onOpenWithdraw: () => void;
  onOpenLogs: () => void;
};

function ReportActionBar(props: ActionBarProps) {
  const { canEdit, canWithdraw, busy, onSaveDraft, onSubmit, onOpenWithdraw, onOpenLogs } = props;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      <Button
        variant="outlined"
        startIcon={<HistoryOutlinedIcon />}
        onClick={onOpenLogs}
        disabled={busy}
      >
        Xem nhật ký
      </Button>

      {canEdit && (
        <>
          <Button
            variant="outlined"
            startIcon={<SaveOutlinedIcon />}
            onClick={onSaveDraft}
            disabled={busy}
          >
            Lưu nháp
          </Button>
          <Button
            variant="contained"
            startIcon={<SendOutlinedIcon />}
            onClick={onSubmit}
            disabled={busy}
          >
            Nộp báo cáo
          </Button>
        </>
      )}

      {canWithdraw && (
        <Button
          variant="outlined"
          color="warning"
          startIcon={<UndoOutlinedIcon />}
          onClick={onOpenWithdraw}
          disabled={busy}
        >
          Thu hồi
        </Button>
      )}
    </Stack>
  );
}

type ContributionSectionProps = {
  canEdit: boolean;
  busy: boolean;
  dataOrigin: WorkReportDataOrigin;
  cumulativeContributionMode: WorkReportCumulativeContributionMode;
  policyJson?: string | null;
  summarySourceJson?: string | null;
  onDataOriginChange: (value: WorkReportDataOrigin) => void;
  onContributionModeChange: (value: WorkReportCumulativeContributionMode) => void;
};

function ReportContributionSection(props: ContributionSectionProps) {
  const {
    canEdit,
    busy,
    dataOrigin,
    cumulativeContributionMode,
    policyJson,
    summarySourceJson,
    onDataOriginChange,
    onContributionModeChange,
  } = props;

  const disabled = !canEdit || busy;
  const include = cumulativeContributionMode === "INCLUDE";
  const hasTargetPolicy = Boolean(policyJson?.trim());
  const hasSummarySource = Boolean(summarySourceJson?.trim());
  const sourceConfigDisabled = disabled || hasSummarySource;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={1.5}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Thống kê và lũy kế
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {hasTargetPolicy
                  ? "Báo cáo có quy định chi tiết theo từng trường dữ liệu hoặc chỉ số."
                  : "Áp dụng cho toàn bộ báo cáo."}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {hasSummarySource && <Chip size="small" variant="outlined" label="Có nguồn tổng hợp" />}
              {hasTargetPolicy && <Chip size="small" variant="outlined" label="Có quy định chi tiết" />}
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <FormControl size="small" sx={{ minWidth: 220 }} disabled={sourceConfigDisabled}>
              <InputLabel id="report-data-origin-label">Nguồn dữ liệu</InputLabel>
              <Select
                labelId="report-data-origin-label"
                value={dataOrigin}
                label="Nguồn dữ liệu"
                onChange={(e) => onDataOriginChange(e.target.value as WorkReportDataOrigin)}
              >
                {REPORT_DATA_ORIGIN_OPTIONS.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary">
                {getReportDataOriginHelp(dataOrigin)}
              </Typography>
            </FormControl>

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={include}
                    disabled={sourceConfigDisabled}
                    onChange={(e) =>
                      onContributionModeChange(e.target.checked ? "INCLUDE" : "EXCLUDE")
                    }
                  />
                }
                label={include ? "Tính vào lũy kế" : "Bỏ khỏi lũy kế"}
              />
              <Typography variant="caption" color="text.secondary" display="block">
                {getContributionModeHelp(include)}
              </Typography>
            </Box>

            {shouldDefaultExcludeOrigin(dataOrigin) && include && (
              <Alert severity="warning" sx={{ py: 0.25 }}>
                Bản tổng hợp đang được tính vào lũy kế.
              </Alert>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

type BusinessFormSectionProps = {
  canEdit: boolean;
  busy: boolean;
  overdue: boolean;
  isHistoricalData: boolean;
  canEditCompletedDate: boolean;
  requiresCompletedDate: boolean;
  completedDateMin?: string;
  completedDateMax?: string;
  startedDate: string;
  completedDate: string;
  currentProgressStatus: string;
  reportReason: string;
  difficulties: string;
  proposedSolution: string;
  lateReason: string;
  setStartedDate: (v: string) => void;
  setCompletedDate: (v: string) => void;
  setCurrentProgressStatus: (v: string) => void;
  setReportReason: (v: string) => void;
  setDifficulties: (v: string) => void;
  setProposedSolution: (v: string) => void;
  setLateReason: (v: string) => void;
};

function ReportBusinessFormSection(props: BusinessFormSectionProps) {
  const {
    canEdit,
    busy,
    overdue,
    isHistoricalData,
    canEditCompletedDate,
    requiresCompletedDate,
    completedDateMin,
    completedDateMax,
    startedDate,
    completedDate,
    currentProgressStatus,
    reportReason,
    difficulties,
    proposedSolution,
    lateReason,
    setStartedDate,
    setCompletedDate,
    setCurrentProgressStatus,
    setReportReason,
    setDifficulties,
    setProposedSolution,
    setLateReason,
  } = props;
  const showCompletedDate = canEditCompletedDate || Boolean(completedDate);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={700}>
            Thông tin nghiệp vụ
          </Typography>

          {isHistoricalData && (
            <Alert severity="warning">
              Đây là dữ liệu từ quá khứ. Người báo cáo phải kiểm tra ngày hoàn thành; khi duyệt, reviewer sẽ phải xác nhận riêng.
            </Alert>
          )}

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <SingleDayKeyField
              label="Ngày bắt đầu báo cáo"
              value={startedDate}
              disabled={!canEdit || busy}
              fullWidth
              maxDayKey={showCompletedDate ? completedDate || undefined : undefined}
              onChange={setStartedDate}
            />
            {showCompletedDate && (
              <SingleDayKeyField
                label={requiresCompletedDate ? "Ngày hoàn thành *" : "Ngày hoàn thành"}
                value={completedDate}
                disabled={!canEdit || busy || !canEditCompletedDate}
                fullWidth
                minDayKey={completedDateMin || startedDate || undefined}
                maxDayKey={completedDateMax || undefined}
                onChange={setCompletedDate}
              />
            )}
          </Stack>

          <TextField
            size="small"
            label={uiText(UITextKey.TextTrangThaiHienTai)}
            value={currentProgressStatus}
            disabled={!canEdit || busy}
            onChange={(e) => setCurrentProgressStatus(e.target.value)}
            fullWidth
          />

          <TextField
            size="small"
            label={uiText(UITextKey.TextLyDoNoiDungBaoCao)}
            value={reportReason}
            disabled={!canEdit || busy}
            onChange={(e) => setReportReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <TextField
            size="small"
            label={uiText(UITextKey.TextKhoKhanVuongMac)}
            value={difficulties}
            disabled={!canEdit || busy}
            onChange={(e) => setDifficulties(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <TextField
            size="small"
            label={uiText(UITextKey.TextPhuongAnGiaiQuyetDeXuat)}
            value={proposedSolution}
            disabled={!canEdit || busy}
            onChange={(e) => setProposedSolution(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <TextField
            size="small"
            label={uiText(UITextKey.TextLyDoTreHan)}
            value={lateReason}
            disabled={!canEdit || busy}
            onChange={(e) => setLateReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            required={overdue}
            helperText={
              overdue
                ? "Bắt buộc nhập khi báo cáo quá hạn."
                : "Chỉ cần nhập nếu nộp quá hạn."
            }
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

type ReportRowLabelEditorProps = {
  block: ReportExcelBlockRuntime | null;
  rowLabels: ReportRuntimeRowLabel[];
  allowedCodes: string[];
  allowedDataTypes?: LabelDataType[];
  canEdit: boolean;
  busy: boolean;
  onChange: (rowIndex: number, codes: string[]) => void;
};

function ReportRowLabelEditor(props: ReportRowLabelEditorProps) {
  const { block, rowLabels, allowedCodes, allowedDataTypes, canEdit, busy, onChange } = props;
  const rowIndexes = React.useMemo(() => getReportBlockDataRows(block), [block]);

  if (!block?.excelBlock || rowIndexes.length === 0) return null;

  const allowed = allowedCodes.length > 0 ? allowedCodes : undefined;
  const labeledRows = rowLabels.filter((row) => normalizeLabelCodes(row.rowLabelCodes ?? []).length > 0).length;
  const shouldShow = allowedCodes.length > 0 || labeledRows > 0;
  if (!shouldShow) return null;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1.5,
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1}
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={800}>
              Nhãn dòng
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {labeledRows}/{rowIndexes.length} dòng đã gắn nhãn
            </Typography>
          </Box>
          {allowedCodes.length > 0 && (
            <Chip size="small" variant="outlined" label={`${allowedCodes.length} nhãn có thể chọn`} />
          )}
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
            gap: 1,
            maxHeight: 320,
            overflow: "auto",
            pr: 0.5,
          }}
        >
          {rowIndexes.map((rowIndex) => (
            <LabelPicker
              key={`${block.blockId}:${rowIndex}`}
              size="small"
              value={getRowLabelCodes(rowLabels, rowIndex)}
              allowedCodes={allowed}
              allowedDataTypes={allowedDataTypes}
              disabled={!canEdit || busy || isRowLabelLocked(rowLabels, rowIndex)}
              usage="tableTarget"
              label={`Dòng ${rowIndex + 1}`}
              placeholder={uiText(UITextKey.TextChonNhan)}
              limitTags={2}
              lazySearch
              onChange={(codes) => onChange(rowIndex, codes)}
            />
          ))}
        </Box>
      </Stack>
    </Box>
  );
}

type LogsDialogProps = {
  open: boolean;
  onClose: () => void;
  logs?: WorkAssignmentReportLogRow[];
  isFetching: boolean;
  isError: boolean;
};

function ReportLogsDialog(props: LogsDialogProps) {
  const { open, onClose, logs, isFetching, isError } = props;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{uiText(UITextKey.TextLichSuThaoTacBaoCao)}</DialogTitle>
      <DialogContent dividers>
        {isFetching ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2">{uiText(UITextKey.TextDangTaiLog)}</Typography>
          </Stack>
        ) : isError ? (
          <Alert severity="error">{uiText(UITextKey.TextKhongTaiDuocLogBaoCao)}</Alert>
        ) : !logs || logs.length === 0 ? (
          <Alert severity="info">{uiText(UITextKey.TextChuaCoLogNao)}</Alert>
        ) : (
          <Stack spacing={1.5}>
            {logs.map((x) => (
              <Card key={x.id} variant="outlined">
                <CardContent>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {getLogActionLabel(x.action)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Thời điểm: {formatDate(x.actionAtUtc, true)}
                    </Typography>
                    {x.reason && (
                      <Typography variant="body2">
                        <b>Lý do:</b> {x.reason}
                      </Typography>
                    )}
                    {x.comment && (
                      <Typography variant="body2">
                        <b>Nhận xét:</b> {x.comment}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{uiText(UITextKey.TextDong)}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function WorkReportEditorPage(
  props: WorkReportEditorPageProps
) {
  const { reportId, onBack, onSaved, onSubmitted } = props;

  const { data, isLoading, isError, refetch } = useGetWorkAssignmentReportQuery(
    reportId,
    { skip: !reportId || Boolean(props.previewData) }
  );

  const [saveDraft, saveDraftState] = useSaveWorkAssignmentReportDraftMutation();
  const [submitReport, submitState] = useSubmitWorkAssignmentReportMutation();
  const [withdrawSubmittedReport, withdrawState] = useWithdrawSubmittedReportMutation();

  const [logsOpen, setLogsOpen] = React.useState(false);
  const {
    data: logs,
    isFetching: isFetchingLogs,
    isError: isLogsError,
  } = useGetWorkAssignmentReportLogsQuery(
    { id: reportId },
    {
      skip: !logsOpen || !reportId,
    }
  );

  const effectiveData = props.previewData ?? data;
  const detail = React.useMemo(
    () => (effectiveData ? parseReportDetail(effectiveData) : null),
    [effectiveData]
  );

  const dynamicFormTemplateId = detail?.dynamicFormTemplateId?.trim() ?? "";
  const {
    data: dynamicFormDetail,
    isFetching: isFetchingDynamicForm,
  } = useGetDynamicFormQuery(
    { id: dynamicFormTemplateId },
    { skip: !dynamicFormTemplateId },
  );
  const dynamicFormRuntime = React.useMemo(
    () => (dynamicFormDetail ? buildEditorValue(dynamicFormDetail) : null),
    [dynamicFormDetail],
  );
  const latestWorkbookPayloadRef = React.useRef<WorkbookValueMap>({});
  const latestWorkbookIssuesRef = React.useRef<WorkbookValidationIssueMap>({});
  const reportBlocks = React.useMemo(
    () => (detail ? buildReportExcelBlocks(detail, dynamicFormRuntime) : []),
    [detail, dynamicFormRuntime],
  );
  const reportBlockKeys = React.useMemo(
    () => reportBlocks.map((block) => block.key).join("|"),
    [reportBlocks],
  );
  const [selectedBlockKey, setSelectedBlockKey] = React.useState("");
  const selectedReportBlock = React.useMemo(
    () =>
      reportBlocks.find((block) => block.key === selectedBlockKey) ??
      reportBlocks[0] ??
      null,
    [reportBlocks, selectedBlockKey],
  );
  const selectedDynamicExcelId = selectedReportBlock?.dynamicExcelTemplateId?.trim() ?? "";
  const { data: selectedDynamicExcelDetail } = useGetDynamicExcelQuery(
    { id: selectedDynamicExcelId },
    { skip: !dynamicFormTemplateId || !selectedDynamicExcelId },
  );
  const selectedRenderableBlock = React.useMemo(() => {
    if (!selectedReportBlock) return null;
    if (!selectedDynamicExcelDetail) return selectedReportBlock;

    const templateWorkbookData = normalizeTemplateWorkbook(
      safeParseJson<any[]>(selectedDynamicExcelDetail.rawWorkbookDataJson, []) ?? [],
    );
    const spec = safeParseJson<any>(
      selectedDynamicExcelDetail.specJson,
      selectedReportBlock.spec,
    ) ?? selectedReportBlock.spec;

    return {
      ...selectedReportBlock,
      spec,
      templateWorkbookData:
        templateWorkbookData.length > 0
          ? templateWorkbookData
          : selectedReportBlock.templateWorkbookData,
    };
  }, [selectedDynamicExcelDetail, selectedReportBlock]);
  const topLevelBlockId = React.useMemo(
    () => (detail ? resolveTopLevelBlockId(detail, reportBlocks) : "excel_block"),
    [detail, reportBlocks],
  );
  const selectedBlockValues = React.useMemo(
    () =>
      detail && selectedReportBlock
        ? resolveReportBlockValues(
            detail,
            selectedReportBlock,
            topLevelBlockId,
            latestWorkbookPayloadRef.current,
          )
        : [],
    [detail, selectedReportBlock, topLevelBlockId],
  );
  const selectedWorkbookData = React.useMemo(
    () =>
      selectedRenderableBlock
        ? hydrateReportBlockWorkbook(selectedRenderableBlock, selectedBlockValues)
        : [],
    [selectedRenderableBlock, selectedBlockValues],
  );
  const excludedDataColumns = React.useMemo(
    () => getExcelBlockLabelColumns(selectedReportBlock?.blockJson),
    [selectedReportBlock?.blockJson],
  );
  const selectedBlockAllowedRowLabelCodes = React.useMemo(
    () => getReportBlockAllowedRowLabelCodes(selectedReportBlock),
    [selectedReportBlock],
  );
  const selectedBlockRowLabelDataType = React.useMemo(
    () => getReportBlockRowLabelDataType(selectedReportBlock),
    [selectedReportBlock],
  );

  const canEdit = detail ? !props.forceReadOnly && isEditableReportStatus(detail.status) : false;
  const canWithdraw = detail
    ? !props.forceReadOnly &&
      (detail.status === WorkAssignmentReportStatus.Submitted ||
        (detail.status === WorkAssignmentReportStatus.Approved &&
          detail.autoApproved === true &&
          detail.autoApprovalLocked !== true))
    : false;
  const isHistoricalData = isHistoricalReportDetail(detail);
  const overdue = isOverdue(detail?.dueAtUtc);
  const requiresLateReason = overdue && !isHistoricalData;
  const canEditCompletedDate = Boolean(detail?.canEditCompletedDate);
  const requiresCompletedDate = Boolean(detail?.requiresCompletedDate);
  const completedDateMin = toDayKey(detail?.completedDateMin);
  const completedDateMax = toDayKey(detail?.completedDateMax);

  const [currentProgressStatus, setCurrentProgressStatus] = React.useState("");
  const [reportReason, setReportReason] = React.useState("");
  const [difficulties, setDifficulties] = React.useState("");
  const [proposedSolution, setProposedSolution] = React.useState("");
  const [lateReason, setLateReason] = React.useState("");
  const [startedDate, setStartedDate] = React.useState("");
  const [completedDate, setCompletedDate] = React.useState("");
  const [dataOrigin, setDataOrigin] = React.useState<WorkReportDataOrigin>("MANUAL_INPUT");
  const [cumulativeContributionMode, setCumulativeContributionMode] =
    React.useState<WorkReportCumulativeContributionMode>("INCLUDE");
  const reportDataLocked = detail ? isAutoSummaryDataLocked(dataOrigin) : false;
  const canEditReportData = canEdit && !reportDataLocked;
  const [fieldValues, setFieldValues] = React.useState<DynamicFormRuntimeValues>({});
  const [rowLabelsByBlock, setRowLabelsByBlock] = React.useState<RowLabelStateMap>({});
  const selectedBlockRowLabels = React.useMemo(
    () => (selectedReportBlock ? rowLabelsByBlock[selectedReportBlock.blockId] ?? [] : []),
    [selectedReportBlock, rowLabelsByBlock],
  );

  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [withdrawReason, setWithdrawReason] = React.useState("");

  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: "",
  });

  const showMessage = React.useCallback((message: string) => {
    setSnackbar({
      open: true,
      message,
    });
  }, []);

  React.useEffect(() => {
    latestWorkbookPayloadRef.current = {};
    latestWorkbookIssuesRef.current = {};
  }, [detail?.id, detail?.tableValuesJson, detail?.updatedAtUtc]);

  React.useEffect(() => {
    setSelectedBlockKey((prev) =>
      reportBlocks.some((block) => block.key === prev)
        ? prev
        : reportBlocks[0]?.key ?? "",
    );
  }, [reportBlockKeys, reportBlocks]);

  React.useEffect(() => {
    if (!detail) return;

    setCurrentProgressStatus(detail.currentProgressStatus ?? "");
    setReportReason(detail.reportReason ?? "");
    setDifficulties(detail.difficulties ?? "");
    setProposedSolution(detail.proposedSolution ?? "");
    setLateReason(detail.lateReason ?? "");
    setStartedDate(resolveInitialStartedDayKey(detail));
    setCompletedDate(resolveInitialCompletedDayKey(detail));
    setDataOrigin(normalizeReportDataOrigin(detail.dataOrigin));
    setCumulativeContributionMode(normalizeContributionMode(detail.cumulativeContributionMode));
  }, [detail]);

  const handleDataOriginChange = React.useCallback((next: WorkReportDataOrigin) => {
    setDataOrigin(next);
    setCumulativeContributionMode(shouldDefaultExcludeOrigin(next) ? "EXCLUDE" : "INCLUDE");
  }, []);

  React.useEffect(() => {
    if (!detail) {
      setFieldValues({});
      return;
    }

    setFieldValues(parseDynamicFieldValues(detail.fieldValuesJson));
  }, [detail]);

  React.useEffect(() => {
    if (!detail) {
      setRowLabelsByBlock({});
      return;
    }

    setRowLabelsByBlock(buildInitialRowLabelsByBlock(detail, reportBlocks));
  }, [detail, reportBlockKeys, reportBlocks]);

  const handleDynamicFieldChange = React.useCallback(
    (fieldId: string, value: DynamicFormRuntimeValue) => {
      setFieldValues((prev) => ({
        ...prev,
        [fieldId]: value,
      }));
    },
    [],
  );

  const handleSelectedBlockRowLabelChange = React.useCallback(
    (rowIndex: number, codes: string[]) => {
      if (!selectedReportBlock) return;

      const blockId = selectedReportBlock.blockId;
      const normalized = normalizeLabelCodes(codes);

      setRowLabelsByBlock((prev) => {
        const current = prev[blockId] ?? [];
        const existing = current.find((row) => Number(row.rowIndex) === rowIndex);
        const next = current.filter((row) => Number(row.rowIndex) !== rowIndex);

        if (normalized.length > 0) {
          next.push({
            sheetId: existing?.sheetId ?? "sheet_1",
            rowKey: existing?.rowKey ?? buildReportRowKey(rowIndex),
            rowIndex,
            rowLabelCodes: normalized,
            locked: Boolean(existing?.locked),
            source: "REPORT_EDIT",
          });
        }

        return {
          ...prev,
          [blockId]: normalizeRuntimeRowLabels(next),
        };
      });
    },
    [selectedReportBlock],
  );

  const handleSaveDraft = async (payload?: WorkbookSavePayload) => {
    if (!detail) return;

    if (payload?.values1D) {
      const payloadBlockId = normalizeBlockId(payload.blockId ?? topLevelBlockId);
      latestWorkbookPayloadRef.current = {
        ...latestWorkbookPayloadRef.current,
        [payloadBlockId]: payload.values1D,
      };
      latestWorkbookIssuesRef.current = {
        ...latestWorkbookIssuesRef.current,
        [payloadBlockId]: payload.validationIssues ?? [],
      };
    }

    if (!reportDataLocked) {
      const tableIssue = getFirstWorkbookValidationIssue(
        reportBlocks,
        latestWorkbookIssuesRef.current,
      );
      if (tableIssue) {
        showMessage(`Dữ liệu bảng không hợp lệ: ${tableIssue.block.label} - ${tableIssue.issue.message}`);
        return;
      }
    }

    if (!reportDataLocked && dynamicFormRuntime) {
      const invalidField = getInvalidDynamicField(dynamicFormRuntime.fields, fieldValues);
      if (invalidField) {
        showMessage(getDynamicFieldValidationMessage(invalidField));
        return;
      }
    }

    const valuesByBlock = buildWorkbookValuesByBlock(
      detail,
      reportBlocks,
      latestWorkbookPayloadRef.current,
      payload,
    );
    const topLevelValues = normalizeWorkbookValues(
      valuesByBlock[topLevelBlockId] ?? detail.values1D ?? [],
      detail.w * detail.h,
    );
    const fieldValuesJson = buildDynamicFieldValuesJson(
      detail,
      dynamicFormRuntime,
      fieldValues,
    );
    const tableValuesJson = buildTableValuesJson(
      detail,
      dynamicFormRuntime,
      reportBlocks,
      valuesByBlock,
      rowLabelsByBlock,
    );
    const completedDatePayload = canEditCompletedDate ? dayKeyToApiDate(completedDate) : null;

    try {
      await saveDraft({
        id: detail.id,
        data: {
          values1D: topLevelValues,
          fieldValuesJson,
          tableValuesJson,
          dataOrigin,
          cumulativeContributionMode,
          cumulativeContributionPolicyJson: detail.cumulativeContributionPolicyJson ?? null,
          summarySourceJson: detail.summarySourceJson ?? null,
          currentProgressStatus: currentProgressStatus.trim() || null,
          reportReason: reportReason.trim() || null,
          difficulties: difficulties.trim() || null,
          proposedSolution: proposedSolution.trim() || null,
          startedDate: dayKeyToApiDate(startedDate),
          completedDate: completedDatePayload,
          lateReason: lateReason.trim() || null,
          note: null,
        },
      }).unwrap();

      await refetch();
      onSaved?.();
      showMessage("Đã lưu nháp.");
    } catch (error) {
      console.error(error);
      showMessage("Lưu nháp thất bại.");
    }
  };

  const handleSubmit = async () => {
    if (!detail) return;

    if (requiresLateReason && !lateReason.trim()) {
      showMessage("Bắt buộc nhập lý do trễ hạn trước khi nộp.");
      return;
    }

    if (requiresCompletedDate && !completedDate) {
      showMessage("Báo cáo này bắt buộc có ngày hoàn thành.");
      return;
    }

    if (startedDate && completedDate && completedDate < startedDate) {
      showMessage("Ngày hoàn thành không được trước ngày bắt đầu báo cáo.");
      return;
    }

    if (completedDate && completedDateMin && completedDate < completedDateMin) {
      showMessage("Ngày hoàn thành nằm ngoài khoảng được phép của kỳ báo cáo.");
      return;
    }

    if (completedDate && completedDateMax && completedDate > completedDateMax) {
      showMessage("Ngày hoàn thành nằm ngoài khoảng được phép của kỳ báo cáo.");
      return;
    }

    if (!reportDataLocked && dynamicFormTemplateId && !dynamicFormRuntime) {
      showMessage("Chưa tải xong trường bổ sung.");
      return;
    }

    if (!reportDataLocked) {
      const tableIssue = getFirstWorkbookValidationIssue(
        reportBlocks,
        latestWorkbookIssuesRef.current,
      );
      if (tableIssue) {
        showMessage(`Dữ liệu bảng không hợp lệ: ${tableIssue.block.label} - ${tableIssue.issue.message}`);
        return;
      }
    }

    const invalidDynamicField = !reportDataLocked && dynamicFormRuntime
      ? getInvalidDynamicField(dynamicFormRuntime.fields, fieldValues)
      : null;
    if (invalidDynamicField) {
      showMessage(getDynamicFieldValidationMessage(invalidDynamicField));
      return;
    }

    const missingRequiredFields = !reportDataLocked && dynamicFormRuntime
      ? getMissingRequiredFields(dynamicFormRuntime.fields, fieldValues)
      : [];
    if (missingRequiredFields.length > 0) {
      showMessage(
        `Thiếu trường bắt buộc: ${missingRequiredFields
          .slice(0, 3)
          .map((field) => getDynamicFormFieldDisplayName(field))
          .join(", ")}`,
      );
      return;
    }

    const completedDatePayload = canEditCompletedDate ? dayKeyToApiDate(completedDate) : null;

    try {
      const valuesByBlock = buildWorkbookValuesByBlock(
        detail,
        reportBlocks,
        latestWorkbookPayloadRef.current,
      );
      const topLevelValues = normalizeWorkbookValues(
        valuesByBlock[topLevelBlockId] ?? detail.values1D ?? [],
        detail.w * detail.h,
      );
      const fieldValuesJson = buildDynamicFieldValuesJson(
        detail,
        dynamicFormRuntime,
        fieldValues,
      );
      const tableValuesJson = buildTableValuesJson(
        detail,
        dynamicFormRuntime,
        reportBlocks,
        valuesByBlock,
        rowLabelsByBlock,
      );

      await saveDraft({
        id: detail.id,
        data: {
          values1D: topLevelValues,
          fieldValuesJson,
          tableValuesJson,
          dataOrigin,
          cumulativeContributionMode,
          cumulativeContributionPolicyJson: detail.cumulativeContributionPolicyJson ?? null,
          summarySourceJson: detail.summarySourceJson ?? null,
          currentProgressStatus: currentProgressStatus.trim() || null,
          reportReason: reportReason.trim() || null,
          difficulties: difficulties.trim() || null,
          proposedSolution: proposedSolution.trim() || null,
          startedDate: dayKeyToApiDate(startedDate),
          completedDate: completedDatePayload,
          lateReason: lateReason.trim() || null,
          note: null,
        },
      }).unwrap();

      await submitReport({
        id: detail.id,
        data: {
          fieldValuesJson,
          tableValuesJson,
          dataOrigin,
          cumulativeContributionMode,
          cumulativeContributionPolicyJson: detail.cumulativeContributionPolicyJson ?? null,
          summarySourceJson: detail.summarySourceJson ?? null,
          currentProgressStatus: currentProgressStatus.trim() || null,
          reportReason: reportReason.trim() || null,
          difficulties: difficulties.trim() || null,
          proposedSolution: proposedSolution.trim() || null,
          startedDate: dayKeyToApiDate(startedDate),
          completedDate: completedDatePayload,
          lateReason: lateReason.trim() || null,
          note: null,
        },
      }).unwrap();

      await refetch();
      onSubmitted?.();
      showMessage("Đã nộp báo cáo.");
    } catch (error) {
      console.error(error);
      showMessage("Nộp báo cáo thất bại.");
    }
  };

  const handleWithdraw = async () => {
    if (!detail) return;

    if (!withdrawReason.trim()) {
      showMessage("Bắt buộc nhập lý do thu hồi.");
      return;
    }

    try {
      await withdrawSubmittedReport({
        id: detail.id,
        data: {
            returnReason: withdrawReason.trim(),
            reviewerComment: null,
        },
      }).unwrap();

      setWithdrawOpen(false);
      await refetch();
      showMessage("Đã thu hồi báo cáo.");
    } catch (error) {
      console.error(error);
      showMessage("Trả lại báo cáo thất bại.");
    }
  };

  if (!reportId) {
    return <Alert severity="warning">{uiText(UITextKey.TextThieuReportId)}</Alert>;
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2">{uiText(UITextKey.TextDangTaiBaoCao)}</Typography>
        </Stack>
      </Box>
    );
  }

  if (isError || !detail) {
    return (
      <Alert severity="error">
        Không tải được chi tiết báo cáo hoặc báo cáo không tồn tại.
      </Alert>
    );
  }

  const busy =
    saveDraftState.isLoading ||
    submitState.isLoading ||
    withdrawState.isLoading;

  return (
    <>
      <Box
        sx={{
          height: { xs: "calc(100vh - 72px)", md: "calc(100vh - 96px)" },
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            px: { xs: 1.5, md: 2 },
            py: 1.25,
            mb: 1.5,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={1.25}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>
                Dữ liệu báo cáo
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {detail.dynamicFormTemplateName || detail.dynamicExcelTemplateName || "Biểu mẫu báo cáo"} • Kỳ {detail.periodKey}
              </Typography>
            </Box>

            <ReportActionBar
              canEdit={canEdit}
              canWithdraw={canWithdraw}
              busy={busy}
              onSaveDraft={() => void handleSaveDraft()}
              onSubmit={() => void handleSubmit()}
              onOpenWithdraw={() => {
                setWithdrawReason("");
                setWithdrawOpen(true);
              }}
              onOpenLogs={() => setLogsOpen(true)}
            />
          </Stack>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: { md: 0.5 }, pb: 2 }}>
          <Stack spacing={2} sx={{ minHeight: 0 }}>
            <ReportHeaderSection
              detail={detail}
              overdue={requiresLateReason}
              canEdit={canEdit}
              dataOrigin={dataOrigin}
              cumulativeContributionMode={cumulativeContributionMode}
              onBack={onBack}
            />

            {reportDataLocked && (
              <Alert severity={detail.aggregateSnapshotDirty ? "warning" : "info"}>
                Báo cáo này dùng dữ liệu tự tổng hợp. Phần dữ liệu biểu mẫu được khóa nhập và lấy từ
                snapshot tổng hợp hiện hành; người báo cáo chỉ cập nhật được các thông tin đi kèm.
                {detail.aggregateSnapshotDirty
                  ? " Snapshot đang cần làm mới và sẽ được hệ thống cập nhật khi mở báo cáo."
                  : ""}
              </Alert>
            )}

            {detail.aggregateRefreshError && (
              <Alert severity="error">
                Không làm mới được dữ liệu tổng hợp: {detail.aggregateRefreshError}
              </Alert>
            )}

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  {reportBlocks.length > 1 && selectedReportBlock && (
                <Tabs
                  value={selectedReportBlock.key}
                  onChange={(_, nextValue) => setSelectedBlockKey(String(nextValue))}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ minHeight: 36 }}
                >
                  {reportBlocks.map((block) => (
                    <Tab
                      key={block.key}
                      value={block.key}
                      label={block.label}
                      sx={{ minHeight: 36, textTransform: "none" }}
                    />
                  ))}
                </Tabs>
              )}

              {selectedReportBlock && (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Phần bảng ${selectedReportBlock.index + 1}/${reportBlocks.length}`}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${selectedReportBlock.w}x${selectedReportBlock.h}`}
                  />
                </Stack>
              )}
              <Box sx={{ height: 520, minHeight: 320 }}>
                <WorkbookDataGrid
                  initialSpec={selectedRenderableBlock?.spec ?? selectedReportBlock?.spec ?? detail.spec}
                  initialWorkbookData={
                    selectedWorkbookData.length > 0
                      ? selectedWorkbookData
                      : detail.renderWorkbookData
                  }
                  dataRect={selectedReportBlock?.dataRect ?? detail.dataRect}
                  excludedDataColumns={excludedDataColumns}
                  mode={canEditReportData ? "edit" : "view"}
                  readOnly={!canEditReportData}
                  saving={busy}
                  showActions={false}
                  saveLabel="Lưu nháp"
                  backLabel="Quay lại"
                  onBack={onBack}
                  onChangeRaw={(_, payload) => {
                    if (!selectedReportBlock) return;
                    latestWorkbookPayloadRef.current = {
                      ...latestWorkbookPayloadRef.current,
                      [selectedReportBlock.blockId]:
                        payload?.values1D ??
                        latestWorkbookPayloadRef.current[selectedReportBlock.blockId] ??
                        selectedBlockValues,
                    };
                    latestWorkbookIssuesRef.current = {
                      ...latestWorkbookIssuesRef.current,
                      [selectedReportBlock.blockId]: payload?.validationIssues ?? [],
                    };
                  }}
                  onSave={(payload) => {
                    if (!selectedReportBlock) return;
                    latestWorkbookPayloadRef.current = {
                      ...latestWorkbookPayloadRef.current,
                      [selectedReportBlock.blockId]: payload.values1D,
                    };
                    latestWorkbookIssuesRef.current = {
                      ...latestWorkbookIssuesRef.current,
                      [selectedReportBlock.blockId]: payload.validationIssues,
                    };
                    void handleSaveDraft({
                      blockId: selectedReportBlock.blockId,
                      values1D: payload.values1D,
                      validationIssues: payload.validationIssues,
                    });
                  }}
                />
              </Box>

              <ReportRowLabelEditor
                block={selectedReportBlock}
                rowLabels={selectedBlockRowLabels}
                allowedCodes={selectedBlockAllowedRowLabelCodes}
                allowedDataTypes={[selectedBlockRowLabelDataType]}
                canEdit={canEditReportData}
                busy={busy}
                onChange={handleSelectedBlockRowLabelChange}
              />
            </Stack>
          </CardContent>
        </Card>

        {isFetchingDynamicForm && (
          <Alert severity="info">{uiText(UITextKey.TextDangTaiTruongBoSung)}</Alert>
        )}

        {dynamicFormRuntime && dynamicFormRuntime.fields.length > 0 && (
          <DynamicFormRuntimeFields
            sections={dynamicFormRuntime.sections}
            fields={dynamicFormRuntime.fields}
            values={fieldValues}
            readOnly={!canEditReportData}
            disabled={busy}
            onChange={handleDynamicFieldChange}
          />
        )}

        <ReportContributionSection
          canEdit={canEdit}
          busy={busy}
          dataOrigin={dataOrigin}
          cumulativeContributionMode={cumulativeContributionMode}
          policyJson={detail.cumulativeContributionPolicyJson}
          summarySourceJson={detail.summarySourceJson}
          onDataOriginChange={handleDataOriginChange}
          onContributionModeChange={setCumulativeContributionMode}
        />

        <ReportBusinessFormSection
          canEdit={canEdit}
          busy={busy}
          overdue={requiresLateReason}
          isHistoricalData={isHistoricalData}
          canEditCompletedDate={canEditCompletedDate}
          requiresCompletedDate={requiresCompletedDate}
          completedDateMin={completedDateMin || undefined}
          completedDateMax={completedDateMax || undefined}
          startedDate={startedDate}
          completedDate={completedDate}
          currentProgressStatus={currentProgressStatus}
          reportReason={reportReason}
          difficulties={difficulties}
          proposedSolution={proposedSolution}
          lateReason={lateReason}
          setStartedDate={setStartedDate}
          setCompletedDate={setCompletedDate}
          setCurrentProgressStatus={setCurrentProgressStatus}
          setReportReason={setReportReason}
          setDifficulties={setDifficulties}
          setProposedSolution={setProposedSolution}
          setLateReason={setLateReason}
        />
      </Stack>
        </Box>
      </Box>

      <Dialog
        open={withdrawOpen}
        onClose={() => !busy && setWithdrawOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{uiText(UITextKey.TextThuHoiBaoCaoDaNop)}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Alert severity="warning">
              Báo cáo sẽ quay về trạng thái <b>Nháp</b>
              {detail?.status === WorkAssignmentReportStatus.Approved ? ". Báo cáo tự duyệt chỉ thu hồi được trước khi người duyệt xác nhận." : "."}
            </Alert>

            <TextField
              size="small"
              label={uiText(UITextKey.TextLyDoThuHoi)}
              value={withdrawReason}
              disabled={busy}
              onChange={(e) => setWithdrawReason(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawOpen(false)} disabled={busy}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => void handleWithdraw()}
            disabled={busy}
          >
            Thu hồi
          </Button>
        </DialogActions>
      </Dialog>

      <ReportLogsDialog
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        logs={logs}
        isFetching={isFetchingLogs}
        isError={isLogsError}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </>
  );
}
