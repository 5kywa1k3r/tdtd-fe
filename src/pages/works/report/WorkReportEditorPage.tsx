// src/pages/works/report/WorkReportEditorPage.tsx
import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import PreviewOutlinedIcon from "@mui/icons-material/PreviewOutlined";
import OpenInFullOutlinedIcon from "@mui/icons-material/OpenInFullOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";

import DynamicExcelGridPreviewDialog from "../../../components/excel/fortune/DynamicExcelGridPreviewDialog";
import type {
  WorkbookDataGridHandle,
} from "../../../components/excel/fortune/WorkbookDataGrid";
import {
  extractTypedValues1D,
  type WorkbookValueValidationIssue,
} from "../../../components/excel/fortune/fortuneAdapter";
import AggregateDataControls, {
  type AggregateUnitOption,
} from "../../../components/works/aggregate/AggregateDataControls";
import {
  getCellDataType,
  getCellStringListOptions,
  dataTypeLabel,
  isDynamicExcelEnumDataType,
  normalizeSpecDataTypeMetadata,
} from "../../../components/excel/fortune/dataTypes";
import type {
  DynamicExcelDataType,
  DynamicExcelStringListOption,
  HeaderSpec,
} from "../../../components/excel/fortune/types";
import {
  buildInputCellRefs,
  getSpecialRanges,
  type DynamicExcelInputCellRef,
} from "../../../components/excel/fortune/specialRanges";
import { DESIGNER_LIMITS } from "../../../components/excel/fortune/validate";
import {
  attachCompressedValues1D,
  getTableBlockValues1DLength,
  readTableBlockValues1D,
} from "../../../components/excel/fortune/values1DCompression";
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
  useGetWorkAssignmentReportTemplateWorkbookQuery,
  useSaveWorkAssignmentReportDraftMutation,
  useSaveWorkAssignmentReportDraftPatchMutation,
  useSubmitWorkAssignmentReportMutation,
  useWithdrawSubmittedReportMutation,
} from "../../../api/reportApi";
import {
  useApplyDynamicFormAggregateDraftMutation,
  usePreviewDynamicFormAggregateDraftMutation,
} from "../../../api/aggregateDataApi";
import { useGetDynamicFormQuery } from "../../../api/dynamicFormApi";
import { useGetChildrenAssignmentsQuery } from "../../../api/workAssignmentApi";

import {
  getWorkAssignmentReportStatusLabel,
  getWorkReportPeriodStatusLabel,
  WorkAssignmentReportStatus,
} from "../../../types/reportStatus";
import type {
  WorkAssignmentReportLogRow,
  WorkAssignmentReportResponse,
  WorkReportCumulativeContributionMode,
  WorkReportDataOrigin,
} from "../../../types/report";
import type { DynamicFormAggregateRequest } from "../../../types/reportAggregate";
import type { WorkAssignmentListResponse } from "../../../types/workAssignment";
import type { AggregateMetricOption } from "../../../types/aggregateTypes";
import {
  applyValues1DToWorkbook,
  normalizeTemplateWorkbook,
  parseReportDetail,
  safeParseJson,
} from "../../../types/report.parses";
import { buildRuntimeValuesPatch } from "../../../components/excel/fortune/workbookRuntime";
import type { ReportCellValue } from "../../../types/report.helper";
import {
  buildEditorValue,
  getDynamicFormBlockJsonList,
  getDynamicFormFieldDisplayName,
  normalizeLabelCodes,
  normalizeTableMode,
  tableModeLabels,
} from "../../../features/dynamicForms/dynamicFormSchema";
import type {
  DynamicFormField,
  DynamicFormSection,
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
import { getApiErrorMessage } from "../../../utils/apiError";
import { UITextKey, uiText } from '../../../constants/uiText';

const WorkbookDataGrid = React.lazy(() => import("../../../components/excel/fortune/WorkbookDataGrid"));

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
  rawWorkbookData?: any[];
  validationIssues?: WorkbookValueValidationIssue[];
};

type WorkbookValueMap = Record<string, ReportCellValue[]>;
type WorkbookValidationIssueMap = Record<string, WorkbookValueValidationIssue[]>;
type WorkbookRawDataMap = Record<string, any[]>;
type ReportSectionValidationState = Record<
  string,
  {
    status: "valid" | "invalid";
    issueCount: number;
    checkedAt: number;
  }
>;

const TABLE_STATISTIC_INPUT_CELL_LIMIT = DESIGNER_LIMITS.MAX_TABLE_STATISTIC_INPUT_CELLS;
const REPORT_TABLES_SECTION_ID = "__report_tables__";

type ParsedReportDetail = ReturnType<typeof parseReportDetail>;
type DynamicFormRuntimeSchema = ReturnType<typeof buildEditorValue>;

const DEFAULT_REPORT_DATA_ORIGIN: WorkReportDataOrigin = "MANUAL_INPUT";
const DEFAULT_REPORT_CUMULATIVE_CONTRIBUTION_MODE: WorkReportCumulativeContributionMode = "INCLUDE";

const REPORT_DATA_ORIGIN_OPTIONS: Array<{ value: WorkReportDataOrigin; label: string }> = [
  { value: DEFAULT_REPORT_DATA_ORIGIN, label: "Nhập tay" },
  { value: "AUTO_SUMMARY", label: "Dữ liệu tổng hợp đã gắn" },
  { value: "COPIED_SUMMARY", label: "Dữ liệu tổng hợp đã sao chép" },
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

  return DEFAULT_REPORT_DATA_ORIGIN;
}

function normalizeContributionMode(
  value?: string | null,
  origin?: WorkReportDataOrigin | string | null,
): WorkReportCumulativeContributionMode {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "EXCLUDE") return "EXCLUDE";
  if (normalized === "INCLUDE") return "INCLUDE";

  return shouldDefaultExcludeOrigin(normalizeReportDataOrigin(origin))
    ? "EXCLUDE"
    : DEFAULT_REPORT_CUMULATIVE_CONTRIBUTION_MODE;
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
      return "Báo cáo dùng dữ liệu đã gắn từ kết quả tổng hợp thủ công; thường không tính vào lũy kế để tránh cộng trùng.";
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

function buildReportAdvancedSettingsPayload(
  detail: Pick<ParsedReportDetail, "cumulativeContributionPolicyJson" | "summarySourceJson"> | null | undefined,
  origin?: WorkReportDataOrigin | string | null,
  contributionMode?: WorkReportCumulativeContributionMode | string | null,
) {
  const dataOrigin = normalizeReportDataOrigin(origin);

  return {
    dataOrigin,
    cumulativeContributionMode: normalizeContributionMode(contributionMode, dataOrigin),
    cumulativeContributionPolicyJson: detail?.cumulativeContributionPolicyJson ?? null,
    summarySourceJson: detail?.summarySourceJson ?? null,
  };
}

function isCompletedAfterDue(completedDate?: string | null, dueAtUtc?: string | null) {
  const completedDay = toDayKey(completedDate);
  const dueDay = toDayKey(dueAtUtc);
  return Boolean(completedDay && dueDay && completedDay > dueDay);
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

type ReportWorkbookValidationIssue = {
  section: DynamicFormSection;
  block: ReportExcelBlockRuntime;
  issue: WorkbookValueValidationIssue;
};

type ReportTableValidationDialogState = {
  open: boolean;
  source: "manual" | "save" | "submit" | "section-switch";
  sectionId: string;
  sectionTitle: string;
  issues: ReportWorkbookValidationIssue[];
};

type ReportSectionValidationPromptState = {
  open: boolean;
  section: DynamicFormSection;
  blockCount: number;
};

type ReportTableValuesBlock = {
  blockId?: string | null;
  tableMode?: string | null;
  w?: number | null;
  h?: number | null;
  dataRect?: ExcelBlockDataRect | null;
  values1D?: ReportCellValue[] | null;
  values1DCompressed?: boolean | null;
  values1DCompression?: string | null;
  values1DLength?: number | null;
  values1DCompressedIndexes?: number[] | null;
  values1DCompressedCounts?: number[] | null;
  rowLabels?: ReportRuntimeRowLabel[] | null;
  statisticsDisabled?: boolean | null;
  statisticsInputCellCount?: number | null;
  statisticsInputCellLimit?: number | null;
  statisticsDisabledReason?: string | null;
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

type ReportAggregateMapBlockOption = {
  key: string;
  blockId: string;
  label: string;
  tableMode: string;
  metricOptions: AggregateMetricOption[];
  dynamicExcelTemplateId?: string | null;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
  w?: number | null;
  h?: number | null;
  statisticsDisabled: boolean;
  statisticsInputCellCount: number;
  statisticsInputCellLimit: number;
  statisticsDisabledReason?: string | null;
};

type ReportAggregateMapValueSelector = "SUM" | "AVERAGE" | "MIN" | "MAX" | "COUNT";

const REPORT_AGGREGATE_VALUE_SELECTORS: Array<{
  value: ReportAggregateMapValueSelector;
  label: string;
  helper: string;
}> = [
  {
    value: "SUM",
    label: "Cộng số",
    helper: "Dùng cho ô số, ngân sách, khối lượng; các giá trị trống không được cộng.",
  },
  {
    value: "COUNT",
    label: "Đếm nguồn",
    helper: "Dùng để ghi số lượng báo cáo, dòng hoặc ô có dữ liệu. Bucket short text/chọn một/chọn nhiều xem ở thống kê field/table.",
  },
  {
    value: "AVERAGE",
    label: "Trung bình",
    helper: "Dùng cho chỉ số số cần lấy bình quân từ các báo cáo nguồn đã duyệt.",
  },
  {
    value: "MIN",
    label: "Nhỏ nhất",
    helper: "Dùng khi chỉ cần giá trị thấp nhất trong các nguồn hợp lệ.",
  },
  {
    value: "MAX",
    label: "Lớn nhất",
    helper: "Dùng khi chỉ cần giá trị cao nhất trong các nguồn hợp lệ.",
  },
];

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

function getDynamicFormBlockLabel(
  formName: string | null | undefined,
  excelBlock: Record<string, unknown> | null,
  index: number,
) {
  return (
    getOptionalString(excelBlock?.dynamicExcelName) ??
    getOptionalString(excelBlock?.name) ??
    getOptionalString(excelBlock?.dynamicExcelCode) ??
    getOptionalString(excelBlock?.code) ??
    formName ??
    `Phần bảng ${index + 1}`
  );
}

function buildAggregateMapBlockOptions(
  form: DynamicFormRuntimeSchema | null,
): ReportAggregateMapBlockOption[] {
  if (!form) return [];

  return getDynamicFormBlockJsonList(form.blocksJson, form.excelBlockJson)
    .map<ReportAggregateMapBlockOption | null>((blockJson, index) => {
      const excelBlock = parseObjectJson(blockJson);
      if (!excelBlock) return null;
      const blockId = normalizeBlockId(getOptionalString(excelBlock.blockId) ?? getOptionalString(excelBlock.id));
      const rawTableMode = getOptionalString(excelBlock.tableMode);
      const tableMode: DynamicFormTableMode = rawTableMode ? normalizeTableMode(rawTableMode) : "FIXED_GRID";
      const dataRect = getExcelBlockDataRect(excelBlock);
      const indexMap = getExcelBlockIndexMap(excelBlock, blockId, tableMode);
      const spec = dataRect ? buildMetricHeaderSpec(excelBlock, dataRect) : null;
      const inputCellRefs = dataRect && spec ? buildInputCellRefs(dataRect, spec) : [];
      const statisticsInputCellCount = getTableStatisticInputCellCount(excelBlock, inputCellRefs.length);
      const statisticsDisabled = isTableStatisticDisabled(excelBlock, inputCellRefs.length);

      return {
        key: `${blockId}_${index}`,
        blockId,
        label: getDynamicFormBlockLabel(form.name, excelBlock, index),
        tableMode,
        metricOptions: statisticsDisabled
          ? []
          : buildTableMetricDefinitions(
              blockId,
              tableMode,
              excelBlock,
              dataRect,
              indexMap,
              inputCellRefs,
            ).map((metric) => ({
              metricKey: metric.metricKey,
              rowKey: metric.rowKey,
              columnKey: metric.columnKey,
              index: metric.index,
              label: metric.displayLabel,
            })),
        dynamicExcelTemplateId: getBlockDynamicExcelTemplateId(excelBlock),
        dynamicExcelCode: getOptionalString(excelBlock.dynamicExcelCode),
        dynamicExcelName: getOptionalString(excelBlock.dynamicExcelName) ?? getOptionalString(excelBlock.name),
        w: Number(excelBlock.w ?? excelBlock.W) || null,
        h: Number(excelBlock.h ?? excelBlock.H) || null,
        statisticsDisabled,
        statisticsInputCellCount,
        statisticsInputCellLimit: TABLE_STATISTIC_INPUT_CELL_LIMIT,
        statisticsDisabledReason: statisticsDisabled
          ? getTableStatisticDisabledReason(statisticsInputCellCount)
          : null,
      };
    })
    .filter((item): item is ReportAggregateMapBlockOption => Boolean(item));
}

function formatAggregateTableMode(mode?: string | null) {
  const normalized = (mode ?? "").trim().toUpperCase();
  switch (normalized) {
    case "APPEND_ROWS":
      return "Bảng thêm dòng";
    case "APPEND_COLUMNS":
      return "Bảng thêm cột";
    case "MATRIX":
      return "Ma trận";
    case "SUMMARY_TEMPLATE":
      return "Bảng tổng hợp";
    default:
      return "Bảng cố định";
  }
}

function formatAggregateBlockMetricSummary(block?: ReportAggregateMapBlockOption | null) {
  if (!block) return "Tự động theo biểu mẫu nguồn";
  return block.statisticsDisabled
    ? "Bảng lớn: tổng hợp trực tiếp"
    : `${block.metricOptions.length} chỉ tiêu bảng tự động`;
}

function formatAggregateBlockMetricHelper(block?: ReportAggregateMapBlockOption | null) {
  if (block?.statisticsDisabled) {
    return block.statisticsDisabledReason ?? getTableStatisticDisabledReason(block.statisticsInputCellCount);
  }

  return "Dữ liệu được lấy tự động theo cùng Dynamic Form. Mặc định: số lấy tổng, ngày lấy giá trị muộn nhất, short text/single select đếm theo nhóm, multi select list + đếm; phần chi tiết tải khi mở.";
}

function getReportBlockTableMode(block?: ReportExcelBlockRuntime | null) {
  const raw = block?.excelBlock?.tableMode;
  return typeof raw === "string" && raw.trim() ? normalizeTableMode(raw) : "FIXED_GRID";
}

function getReportBlockSectionId(
  block: ReportExcelBlockRuntime,
  fallbackSectionId?: string | null,
) {
  return (
    getOptionalString(block.excelBlock?.sectionId) ??
    getOptionalString(block.excelBlock?.SectionId) ??
    fallbackSectionId ??
    null
  );
}

function buildReportRuntimeSections(
  form: DynamicFormRuntimeSchema | null,
  blocks: ReportExcelBlockRuntime[],
): DynamicFormSection[] {
  if (form) return [...form.sections].sort((a, b) => a.order - b.order);
  if (blocks.length === 0) return [];

  return [
    {
      id: REPORT_TABLES_SECTION_ID,
      title: "Phần bảng",
      description: null,
      tagCodes: [],
      order: 0,
    },
  ];
}

function buildReportBlocksBySectionId(
  sections: DynamicFormSection[],
  blocks: ReportExcelBlockRuntime[],
) {
  const sectionIds = new Set(sections.map((section) => section.id));
  const fallbackSectionId = sections[0]?.id ?? REPORT_TABLES_SECTION_ID;

  return blocks.reduce<Record<string, ReportExcelBlockRuntime[]>>((acc, block) => {
    const rawSectionId = getReportBlockSectionId(block, fallbackSectionId);
    const sectionId = rawSectionId && sectionIds.has(rawSectionId) ? rawSectionId : fallbackSectionId;
    (acc[sectionId] ??= []).push(block);
    return acc;
  }, {});
}

function getReportTableModeLabel(block: ReportExcelBlockRuntime) {
  const mode = getReportBlockTableMode(block);
  return tableModeLabels[mode] ?? mode;
}

function getReportBlockButtonSummary(block: ReportExcelBlockRuntime) {
  return `${block.w}x${block.h} · ${getReportTableModeLabel(block)}`;
}

function formatDayKeyForUser(dayKey?: string | null) {
  const iso = dayKey ? dayKeyToIsoDate(dayKey) : "";
  if (!iso) return dayKey || "-";
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("vi-VN");
}

function parseBlockSpec(excelBlock: Record<string, unknown> | null, fallback: any) {
  if (!excelBlock) return fallback;
  if (typeof excelBlock.specJson === "string") {
    return safeParseJson<any>(excelBlock.specJson, fallback) ?? fallback;
  }

  if (excelBlock.spec && typeof excelBlock.spec === "object") {
    return excelBlock.spec;
  }

  const dataRect = getExcelBlockDataRect(excelBlock);
  return dataRect ? buildMetricHeaderSpec(excelBlock, dataRect) : fallback;
}

function parseBlockWorkbookData(excelBlock: Record<string, unknown> | null) {
  if (!excelBlock) return [];
  if (typeof excelBlock.rawWorkbookDataJson === "string") {
    return safeParseJson<any[]>(excelBlock.rawWorkbookDataJson, []) ?? [];
  }

  return Array.isArray(excelBlock.rawWorkbookData) ? excelBlock.rawWorkbookData : [];
}

function getReportBlockTemplateWorkbookData(block: ReportExcelBlockRuntime) {
  const embeddedWorkbookData = normalizeTemplateWorkbook(parseBlockWorkbookData(block.excelBlock ?? null));
  return embeddedWorkbookData.length > 0 ? embeddedWorkbookData : block.templateWorkbookData;
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
      const storedShape = getStoredBlockRuntimeShape(detail.tableValuesJson, blockId);
      const baseDataRect = getExcelBlockDataRect(excelBlock) ?? detail.dataRect;
      const width =
        storedShape?.width ||
        getPositiveInt(excelBlock.w ?? excelBlock.W) ||
        getDataRectWidth(baseDataRect) ||
        detail.w;
      const storedHeightFromValues =
        storedShape?.valueLength && width > 0
          ? Math.ceil(storedShape.valueLength / width)
          : 0;
      const height = Math.max(
        storedShape?.height || 0,
        storedHeightFromValues,
        getPositiveInt(excelBlock.h ?? excelBlock.H),
        getDataRectHeight(baseDataRect),
        detail.h,
      );
      const dataRect =
        storedShape?.dataRect ??
        (height > getDataRectHeight(baseDataRect)
          ? { ...baseDataRect, r1: baseDataRect.r0 + height - 1, c1: baseDataRect.c0 + width - 1 }
          : baseDataRect);

      return {
        key: `${blockId}:${index}`,
        index,
        blockId,
        label: getBlockLabel(detail, excelBlock, index),
        dynamicExcelTemplateId: dynamicExcelTemplateId ?? null,
        blockJson,
        excelBlock,
        spec: parseBlockSpec(excelBlock, isTopLevelTemplate ? detail.spec : null),
        templateWorkbookData: fallbackWorkbook,
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
  return buildInputCellRefs(block.dataRect, block.spec).length;
}

function readOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (raw === "true") return true;
    if (raw === "false") return false;
  }
  return null;
}

function getOptionalNonNegativeInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function getTableStatisticInputCellCount(
  excelBlock: Record<string, unknown>,
  fallbackInputCellCount: number,
) {
  return getOptionalNonNegativeInt(excelBlock.statisticsInputCellCount) ?? fallbackInputCellCount;
}

function isTableStatisticDisabled(
  excelBlock: Record<string, unknown>,
  fallbackInputCellCount: number,
) {
  const explicit = readOptionalBoolean(excelBlock.statisticsDisabled);
  if (explicit === true) return true;

  const inputCellCount = getTableStatisticInputCellCount(excelBlock, fallbackInputCellCount);
  return inputCellCount > TABLE_STATISTIC_INPUT_CELL_LIMIT;
}

function getTableStatisticDisabledReason(inputCellCount: number) {
  return `Bảng có ${inputCellCount} ô nhập, vượt ngưỡng thống kê nền ${TABLE_STATISTIC_INPUT_CELL_LIMIT}; hệ thống không ghi projection từng ô, nhưng thống kê cơ bản vẫn tổng hợp trực tiếp từ báo cáo đã duyệt nếu không vượt ${DESIGNER_LIMITS.MAX_DIRECT_AGGREGATE_INPUT_CELLS} ô input.`;
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
  return readTableBlockValues1D(block) as ReportCellValue[] | null;
}

function getStoredBlockRuntimeShape(
  tableValuesJson: string | null | undefined,
  blockId: string,
) {
  const target = normalizeBlockId(blockId);
  const block = getReportTableValuesBlocks(tableValuesJson).find(
    (item) => normalizeBlockId(item.blockId) === target,
  );
  if (!block) return null;

  const width = getPositiveInt(block.w);
  const height = getPositiveInt(block.h);
  const dataRect = block.dataRect && typeof block.dataRect === "object"
    ? getExcelBlockDataRect({ dataRect: block.dataRect })
    : null;

  return {
    width,
    height,
    dataRect,
    valueLength: getTableBlockValues1DLength(block),
  };
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
  return applyValues1DToWorkbook(getReportBlockTemplateWorkbookData(block), {
    values1D,
    r0: block.dataRect.r0,
    c0: block.dataRect.c0,
    w: block.w,
    h: block.h,
    spec: block.spec,
  });
}

function validateReportBlockWorkbook(
  block: ReportExcelBlockRuntime,
  values1D: ReportCellValue[],
  rawWorkbookData?: any[] | null,
) {
  const workbookData =
    Array.isArray(rawWorkbookData) && rawWorkbookData.length > 0
      ? rawWorkbookData
      : hydrateReportBlockWorkbook(block, values1D);
  const sheet = Array.isArray(workbookData) ? workbookData[0] : null;
  if (!sheet) return [];

  const excludedDataColumns = new Set(getExcelBlockLabelColumns(block.blockJson));
  return extractTypedValues1D(sheet, block.dataRect, block.spec)
    .issues
    .filter((issue) => !excludedDataColumns.has(issue.c));
}

function formatWorkbookIssueReason(issue: WorkbookValueValidationIssue) {
  const prefix = `${issue.cellRef}:`;
  const message = issue.message?.trim() || "không hợp lệ.";
  return message.startsWith(prefix) ? message.slice(prefix.length).trim() : message;
}

function formatWorkbookIssueValue(value: string) {
  const raw = value.trim();
  if (!raw) return "trống";
  return raw.length > 80 ? `"${raw.slice(0, 77)}..."` : `"${raw}"`;
}

function formatWorkbookIssueForUser(issue: WorkbookValueValidationIssue) {
  const typeLabel = dataTypeLabel(issue.dataType);
  const reason = formatWorkbookIssueReason(issue);
  const valueText = issue.value?.trim()
    ? ` Giá trị đang nhập: ${formatWorkbookIssueValue(issue.value)}.`
    : "";
  return `Ô ${issue.cellRef} (${typeLabel}) ${reason}${valueText}`;
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

function buildTableValuesBlockJson(
  block: ReportExcelBlockRuntime,
  valuesByBlock: WorkbookValueMap,
  rowLabelsByBlock: RowLabelStateMap,
) {
  const tableBlock = buildTableValuesBlock(
    block,
    valuesByBlock[block.blockId] ?? [],
    rowLabelsByBlock[block.blockId],
  );
  return tableBlock ? JSON.stringify(tableBlock) : null;
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
  const inputCellRefs = buildInputCellRefs(dataRect, block.spec);
  const tableValues = normalizeWorkbookValues(values1D, inputCellRefs.length);
  const rowLabels = normalizeRuntimeRowLabels(runtimeRowLabels ?? getTemplateRowLabels(block));
  const statisticsInputCellCount = getTableStatisticInputCellCount(excelBlock, inputCellRefs.length);
  const statisticsDisabled = isTableStatisticDisabled(excelBlock, inputCellRefs.length);
  const metricDefinitions = statisticsDisabled
    ? []
    : buildTableMetricDefinitions(
        blockId,
        tableMode,
        excelBlock,
        dataRect,
        indexMap,
        inputCellRefs,
      );
  const statisticIndexMap = metricDefinitions.map((metric) => ({
    index: metric.index,
    rowKey: metric.rowKey,
    columnKey: metric.columnKey,
    metricKey: metric.metricKey,
  }));
  const appendRows = statisticsDisabled ? [] : buildAppendRowsTableRecords(tableMode, blockId, dataRect, tableValues, rowLabels, inputCellRefs);
  const appendColumns = statisticsDisabled ? [] : buildAppendColumnsTableRecords(tableMode, blockId, dataRect, tableValues, inputCellRefs);
  const matrixCells = statisticsDisabled ? [] : buildMatrixTableCellRecords(tableMode, blockId, dataRect, tableValues, indexMap, inputCellRefs);

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

  return attachCompressedValues1D({
    blockId,
    dynamicExcelTemplateId:
      getOptionalString(excelBlock.dynamicExcelTemplateId) ?? block.dynamicExcelTemplateId ?? null,
    tableMode,
    w: getPositiveInt(excelBlock.w ?? excelBlock.W) || null,
    h: getPositiveInt(excelBlock.h ?? excelBlock.H) || null,
    dataRect,
    hasSpecialRanges: getSpecialRanges(block.spec).length > 0,
    statisticsDisabled,
    statisticsInputCellCount,
    statisticsInputCellLimit: TABLE_STATISTIC_INPUT_CELL_LIMIT,
    statisticsDisabledReason: statisticsDisabled ? getTableStatisticDisabledReason(statisticsInputCellCount) : null,
    indexMap: statisticIndexMap,
    metricDefinitions,
    rowLabels,
    rows: appendRows,
    columns: appendColumns,
    cells: matrixCells,
  }, tableValues);
}

function buildAppendRowsTableRecords(
  tableMode: DynamicFormTableMode,
  blockId: string,
  dataRect: ExcelBlockDataRect | null,
  tableValues: ReportCellValue[],
  rowLabels: ReportRuntimeRowLabel[],
  inputCellRefs: DynamicExcelInputCellRef[],
) {
  if (tableMode !== "APPEND_ROWS" || !dataRect) return [];

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return [];

  return Array.from({ length: height }, (_, rowOffset) => {
    const absoluteRow = dataRect.r0 + rowOffset;
    const refs = inputCellRefs.filter((ref) => ref.r === absoluteRow);
    const cells = Object.fromEntries(
      refs.map((ref) => {
        const value = tableValues[ref.index];
        return [ref.columnKey, value] as const;
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
  inputCellRefs: DynamicExcelInputCellRef[],
) {
  if (tableMode !== "APPEND_COLUMNS" || !dataRect) return [];

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return [];

  return Array.from({ length: width }, (_, colOffset) => {
    const absoluteColumn = dataRect.c0 + colOffset;
    const refs = inputCellRefs.filter((ref) => ref.c === absoluteColumn);
    const cells = Object.fromEntries(
      refs.map((ref) => {
        const value = tableValues[ref.index];
        return [ref.rowKey, value] as const;
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
  inputCellRefs: DynamicExcelInputCellRef[],
) {
  if (tableMode !== "MATRIX" || !dataRect) return [];

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return [];

  const metricByIndex = new Map(indexMap.map((item) => [item.index, item]));

  return inputCellRefs.map((ref) => {
    const value = tableValues[ref.index];
    if (isBlankReportCellValue(value)) return null;

    const metric =
      metricByIndex.get(ref.index) ?? {
        index: ref.index,
        rowKey: ref.rowKey,
        columnKey: ref.columnKey,
        metricKey: buildMetricKey(blockId, ref.rowKey, ref.columnKey),
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
  inputCellRefs: DynamicExcelInputCellRef[],
): ReportTableMetricDefinition[] {
  if (!dataRect) return [];

  const w = getPositiveInt(excelBlock.w ?? excelBlock.W) || dataRect.c1 - dataRect.c0 + 1;
  const h = getPositiveInt(excelBlock.h ?? excelBlock.H) || dataRect.r1 - dataRect.r0 + 1;
  if (w <= 0 || h <= 0 || inputCellRefs.length === 0) return [];

  const spec = buildMetricHeaderSpec(excelBlock, dataRect);
  const targets = resolveConfiguredTableMetricTargets(
    blockId,
    tableMode,
    excelBlock,
    dataRect,
    w,
    indexMap,
    inputCellRefs,
  );

  return targets
    .filter((metric) => metric.index >= 0 && metric.index < inputCellRefs.length)
    .map((metric) => {
      const absoluteCell = resolveMetricAbsoluteCell(metric, tableMode, dataRect, w, inputCellRefs);
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
  indexMap: DynamicFormTableIndexMapItem[],
  inputCellRefs: DynamicExcelInputCellRef[],
): DynamicFormTableIndexMapItem[] {
  const byMetricKey = new Map<string, DynamicFormTableIndexMapItem>();
  const knownByMetricKey = new Map(indexMap.map((item) => [item.metricKey, normalizeMetricIndex(item, tableMode, inputCellRefs)]));

  const addMetric = (metric: DynamicFormTableIndexMapItem | null) => {
    if (!metric?.metricKey || byMetricKey.has(metric.metricKey)) return;
    const normalized = normalizeMetricIndex(metric, tableMode, inputCellRefs);
    if (normalized.index < 0 || normalized.index >= inputCellRefs.length) return;
    byMetricKey.set(metric.metricKey, normalized);
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
    expandMetricTargetRange(blockId, tableMode, dataRect, range, inputCellRefs).forEach(addMetric);
  });

  return Array.from(byMetricKey.values()).sort((a, b) => a.index - b.index || a.metricKey.localeCompare(b.metricKey));
}

function normalizeMetricIndex(
  metric: DynamicFormTableIndexMapItem,
  tableMode: DynamicFormTableMode,
  inputCellRefs: DynamicExcelInputCellRef[],
): DynamicFormTableIndexMapItem {
  const match = findMetricInputRef(metric, tableMode, inputCellRefs);
  return match ? { ...metric, index: match.index } : metric;
}

function findMetricInputRef(
  metric: DynamicFormTableIndexMapItem,
  tableMode: DynamicFormTableMode,
  inputCellRefs: DynamicExcelInputCellRef[],
) {
  if (tableMode === "APPEND_ROWS") {
    return inputCellRefs.find((ref) => ref.columnKey === metric.columnKey) ?? null;
  }

  if (tableMode === "APPEND_COLUMNS") {
    return inputCellRefs.find((ref) => ref.rowKey === metric.rowKey) ?? null;
  }

  return inputCellRefs.find((ref) => ref.rowKey === metric.rowKey && ref.columnKey === metric.columnKey) ??
    inputCellRefs.find((ref) => ref.index === metric.index) ??
    null;
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
  inputCellRefs: DynamicExcelInputCellRef[],
): DynamicFormTableIndexMapItem[] {
  const r0 = Math.max(dataRect.r0, range.r0);
  const c0 = Math.max(dataRect.c0, range.c0);
  const r1 = Math.min(dataRect.r1, range.r1);
  const c1 = Math.min(dataRect.c1, range.c1);
  if (r1 < r0 || c1 < c0) return [];
  const refs = inputCellRefs.filter((ref) => ref.r >= r0 && ref.r <= r1 && ref.c >= c0 && ref.c <= c1);

  const rows: DynamicFormTableIndexMapItem[] = [];
  if (tableMode === "APPEND_ROWS") {
    const seenColumns = new Set<string>();
    for (const ref of refs) {
      if (seenColumns.has(ref.columnKey)) continue;
      seenColumns.add(ref.columnKey);
      rows.push({
        index: ref.index,
        rowKey: "APPEND_ROWS",
        columnKey: ref.columnKey,
        metricKey: `table:${normalizeMetricPart(blockId, "excel_block")}.column:${ref.columnKey}`,
      });
    }
    return rows;
  }

  if (tableMode === "APPEND_COLUMNS") {
    const seenRows = new Set<string>();
    for (const ref of refs) {
      if (seenRows.has(ref.rowKey)) continue;
      seenRows.add(ref.rowKey);
      rows.push({
        index: ref.index,
        rowKey: ref.rowKey,
        columnKey: "APPEND_COLUMNS",
        metricKey: `table:${normalizeMetricPart(blockId, "excel_block")}.row:${ref.rowKey}`,
      });
    }
    return rows;
  }

  for (const ref of refs) {
    rows.push({
      index: ref.index,
      rowKey: ref.rowKey,
      columnKey: ref.columnKey,
      metricKey: buildMetricKey(blockId, ref.rowKey, ref.columnKey),
    });
  }
  return rows;
}

function resolveMetricAbsoluteCell(
  metric: DynamicFormTableIndexMapItem,
  tableMode: DynamicFormTableMode,
  dataRect: ExcelBlockDataRect,
  width: number,
  inputCellRefs: DynamicExcelInputCellRef[],
) {
  const match = findMetricInputRef(metric, tableMode, inputCellRefs);
  if (match) return { row: match.r, column: match.c };

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
    specialRanges: Array.isArray(excelBlock.specialRanges) ? excelBlock.specialRanges as HeaderSpec["specialRanges"] : [],
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
  if (dataType === "IGNORE") return [];
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
  busy: boolean;
  dataOrigin: WorkReportDataOrigin;
  cumulativeContributionMode: WorkReportCumulativeContributionMode;
  onOpenLogs: () => void;
};

function ReportHeaderSection(props: HeaderSectionProps) {
  const { detail, overdue, canEdit, busy, dataOrigin, cumulativeContributionMode, onOpenLogs } = props;
  if (!detail) return null;
  const reportStatusLabel = getWorkAssignmentReportStatusLabel(detail.status);
  const periodStatusLabel = getWorkReportPeriodStatusLabel(detail.periodStatus);
  const showPeriodStatusChip = periodStatusLabel !== reportStatusLabel;
  const handleOpenLogs = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onOpenLogs();
  };

  return (
    <Accordion
      defaultExpanded
      variant="outlined"
      disableGutters
      sx={{
        borderRadius: 1,
        overflow: "hidden",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        component="div"
        expandIcon={<ExpandMoreOutlinedIcon />}
        sx={{
          px: 2,
          py: 0.75,
          "& .MuiAccordionSummary-content": { my: 0.75, minWidth: 0 },
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1}
          sx={{ width: "100%", minWidth: 0 }}
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

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <ReportStatusChip status={detail.status} />
            {showPeriodStatusChip ? <ReportPeriodStatusChip status={detail.periodStatus} /> : null}
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
            <Button
              size="small"
              variant="outlined"
              startIcon={<HistoryOutlinedIcon fontSize="small" />}
              onClick={handleOpenLogs}
              disabled={busy}
              sx={{ textTransform: "none" }}
            >
              Xem nhật ký
            </Button>
          </Stack>
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
        <Stack spacing={1.5}>
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
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

type ActionBarProps = {
  canEdit: boolean;
  canWithdraw: boolean;
  busy: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onOpenWithdraw: () => void;
};

function ReportActionBar(props: ActionBarProps) {
  const { canEdit, canWithdraw, busy, onSaveDraft, onSubmit, onOpenWithdraw } = props;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
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

type ReportAggregateMapSectionProps = {
  detail: ParsedReportDetail;
  targetBlocks: ReportExcelBlockRuntime[];
  selectedTargetBlock?: ReportExcelBlockRuntime | null;
  canEdit: boolean;
  busy: boolean;
  onPreview: (report: WorkAssignmentReportResponse) => void;
  onApplied: () => Promise<void> | void;
  onSelectTargetBlock: (blockId: string) => void;
  showMessage: (message: string) => void;
};

function formatSourceAssignmentLabel(row: WorkAssignmentListResponse) {
  const formName = row.dynamicFormTemplateName || row.dynamicFormTemplateCode || "Chưa có biểu mẫu";
  const assignees = (row.assignees ?? [])
    .map((item) => item.unitShortName || item.fullName || item.username)
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
  return `${row.code || row.id} - ${formName}${assignees ? ` - ${assignees}` : ""}`;
}

function buildSourceUnitOptions(rows: WorkAssignmentListResponse[]): AggregateUnitOption[] {
  const byId = new Map<string, AggregateUnitOption>();

  rows.forEach((row) => {
    (row.assignees ?? []).forEach((assignee) => {
      const id = assignee.unitId?.trim();
      if (!id || byId.has(id)) return;

      byId.set(id, {
        id,
        label:
          assignee.unitShortName?.trim() ||
          assignee.unitName?.trim() ||
          assignee.unitSymbol?.trim() ||
          id,
        code: assignee.unitSymbol ?? null,
        secondaryLabel: row.code || row.dynamicFormTemplateCode || null,
      });
    });
  });

  return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

function ReportAggregateMapSection(props: ReportAggregateMapSectionProps) {
  const {
    detail,
    targetBlocks,
    selectedTargetBlock,
    canEdit,
    busy,
    onPreview,
    onApplied,
    onSelectTargetBlock,
    showMessage,
  } = props;

  const anchorDayKey = getReportAnchorDayKey(detail);
  const anchorDateInput = dayKeyToIsoDate(anchorDayKey);
  const childrenQuery = useGetChildrenAssignmentsQuery(
    { parentAssignmentId: detail.workAssignmentId },
    { skip: !canEdit || !detail.workAssignmentId },
  );
  const sourceAssignments = React.useMemo(
    () =>
      (childrenQuery.data ?? []).filter(
        (row) => row.isActive !== false && Boolean(row.dynamicFormTemplateId?.trim()),
      ),
    [childrenQuery.data],
  );

  const [sourceAssignmentId, setSourceAssignmentId] = React.useState("");
  const [sourceBlockId, setSourceBlockId] = React.useState("");
  const [targetBlockId, setTargetBlockId] = React.useState("");
  const [valueSelector, setValueSelector] =
    React.useState<ReportAggregateMapValueSelector>("SUM");
  const [periodDateFrom, setPeriodDateFrom] = React.useState(anchorDateInput);
  const [periodDateTo, setPeriodDateTo] = React.useState(anchorDateInput);
  const [selectedUnitIds, setSelectedUnitIds] = React.useState<string[]>([]);
  const [aggregateDialogOpen, setAggregateDialogOpen] = React.useState(false);
  const [sourcePreviewOpen, setSourcePreviewOpen] = React.useState(false);
  const [previewDynamicFormAggregateDraft, previewState] =
    usePreviewDynamicFormAggregateDraftMutation();
  const [applyDynamicFormAggregateDraft, applyState] =
    useApplyDynamicFormAggregateDraftMutation();

  React.useEffect(() => {
    setPeriodDateFrom(anchorDateInput);
    setPeriodDateTo(anchorDateInput);
  }, [anchorDateInput, detail.id]);

  React.useEffect(() => {
    const preferredSourceId =
      sourceAssignments.find(
        (row) =>
          row.dynamicFormTemplateId?.trim() &&
          row.dynamicFormTemplateId?.trim() === detail.dynamicFormTemplateId?.trim(),
      )?.id ??
      sourceAssignments[0]?.id ??
      "";

    setSourceAssignmentId((prev) =>
      sourceAssignments.some((row) => row.id === prev) ? prev : preferredSourceId,
    );
  }, [detail.dynamicFormTemplateId, sourceAssignments]);

  React.useEffect(() => {
    const selectedBlockId = selectedTargetBlock?.blockId ?? targetBlocks[0]?.blockId ?? "";
    setTargetBlockId((prev) =>
      targetBlocks.some((block) => block.blockId === prev) ? prev : selectedBlockId,
    );
  }, [selectedTargetBlock?.blockId, targetBlocks]);

  const selectedSourceAssignment = React.useMemo(
    () => sourceAssignments.find((row) => row.id === sourceAssignmentId) ?? null,
    [sourceAssignmentId, sourceAssignments],
  );
  const sourceDynamicFormTemplateId = selectedSourceAssignment?.dynamicFormTemplateId?.trim() ?? "";
  const sourceFormAssignments = React.useMemo(
    () =>
      sourceAssignments.filter(
        (row) => row.dynamicFormTemplateId?.trim() === sourceDynamicFormTemplateId,
      ),
    [sourceAssignments, sourceDynamicFormTemplateId],
  );
  const sourceUnitOptions = React.useMemo(
    () => buildSourceUnitOptions(sourceFormAssignments),
    [sourceFormAssignments],
  );
  const sourceFormQuery = useGetDynamicFormQuery(
    { id: sourceDynamicFormTemplateId },
    { skip: !sourceDynamicFormTemplateId },
  );
  const sourceFormRuntime = React.useMemo(
    () => (sourceFormQuery.data ? buildEditorValue(sourceFormQuery.data) : null),
    [sourceFormQuery.data],
  );
  const sourceBlocks = React.useMemo(
    () => buildAggregateMapBlockOptions(sourceFormRuntime),
    [sourceFormRuntime],
  );

  React.useEffect(() => {
    const preferredBlockId =
      targetBlockId && sourceBlocks.some((block) => block.blockId === targetBlockId)
        ? targetBlockId
        : sourceBlocks[0]?.blockId ?? "";

    setSourceBlockId((prev) =>
      sourceBlocks.some((block) => block.blockId === prev) ? prev : preferredBlockId,
    );
  }, [sourceBlocks, targetBlockId]);

  const selectedSourceBlock = React.useMemo(
    () => sourceBlocks.find((block) => block.blockId === sourceBlockId) ?? null,
    [sourceBlockId, sourceBlocks],
  );
  const selectedTargetBlockOption = React.useMemo(
    () => targetBlocks.find((block) => block.blockId === targetBlockId) ?? null,
    [targetBlockId, targetBlocks],
  );

  React.useEffect(() => {
    const allowed = new Set(sourceUnitOptions.map((option) => option.id));
    setSelectedUnitIds((prev) => prev.filter((unitId) => allowed.has(unitId)));
  }, [sourceUnitOptions]);

  const selectedSourceDynamicExcelId = selectedSourceBlock?.dynamicExcelTemplateId?.trim() ?? "";
  const periodKeyFrom = isoDateToDayKey(periodDateFrom);
  const periodKeyTo = isoDateToDayKey(periodDateTo);
  const selectedValueSelector = REPORT_AGGREGATE_VALUE_SELECTORS.find(
    (item) => item.value === valueSelector,
  );
  const targetTableMode = selectedTargetBlockOption
    ? getReportBlockTableMode(selectedTargetBlockOption)
    : "";
  const sourceTableMode = selectedSourceBlock?.tableMode ?? "";
  const sourceIsStacked =
    sourceTableMode === "APPEND_ROWS" || sourceTableMode === "APPEND_COLUMNS";
  const outputShape =
    sourceIsStacked && targetTableMode === "APPEND_ROWS"
      ? "STACKED_APPEND_ROWS"
      : "METRIC_VALUE_MAP";
  const outputShapeHelper =
    outputShape === "STACKED_APPEND_ROWS"
      ? "Nguồn thêm dòng/thêm cột sẽ được gộp thành bảng thêm dòng, có cột định danh nguồn như đơn vị, kỳ và chỉ số."
      : "Hệ thống ghi giá trị tổng hợp số vào bảng đích. Kết quả bucket short text/single select/multi select đang xem ở thống kê field/table; ghi bucket lên bảng phía trên cần cấu hình đích riêng.";
  const sectionBusy =
    busy ||
    childrenQuery.isFetching ||
    sourceFormQuery.isFetching ||
    previewState.isLoading ||
    applyState.isLoading;
  const canRunAggregate = Boolean(
    selectedSourceAssignment &&
    selectedSourceBlock &&
    selectedTargetBlockOption &&
    periodKeyFrom &&
    periodKeyTo,
  );

  const buildRequest = React.useCallback(() => {
    if (!selectedSourceAssignment || !sourceDynamicFormTemplateId) {
      showMessage("Chọn biểu mẫu/công việc nguồn để tập hợp dữ liệu.");
      return null;
    }
    if (!selectedSourceBlock) {
      showMessage("Chọn field/table nguồn trong biểu mẫu nguồn.");
      return null;
    }
    if (!selectedTargetBlockOption) {
      showMessage("Chọn field/table đích trong báo cáo hiện tại.");
      return null;
    }
    if (!periodKeyFrom || !periodKeyTo) {
      showMessage("Chọn Từ ngày và Đến ngày để tập hợp dữ liệu.");
      return null;
    }
    if (periodKeyFrom > periodKeyTo) {
      showMessage("Từ ngày không được lớn hơn Đến ngày.");
      return null;
    }

    const sourceUnitIds = selectedUnitIds.length > 0 ? selectedUnitIds : null;
    const aggregateRequest: DynamicFormAggregateRequest = {
      scopeAssignmentId: detail.workAssignmentId,
      scopeMode: "DIRECT_CHILDREN",
      dynamicFormTemplateId: sourceDynamicFormTemplateId,
      blockId: selectedSourceBlock.blockId,
      tableMode: selectedSourceBlock.tableMode,
      metricKeys: null,
      periodScopeMode: "PERIOD_RANGE",
      periodKey: null,
      periodKeyFrom,
      periodKeyTo,
      sourceStatusMode: "APPROVED_ONLY",
      selectedUnitIds: sourceUnitIds,
    };

    const advancedSettings = buildReportAdvancedSettingsPayload(
      detail,
      "PARTIAL_MAPPING",
      "INCLUDE",
    );

    return {
      aggregateRequest,
      ...advancedSettings,
      targetBlockId: selectedTargetBlockOption.blockId,
      valueSelector,
      clearExistingValues: true,
      reportMapConfigJson: JSON.stringify({
        version: 1,
        kind: "REPORT_TABLE_TO_TABLE",
        sourceAssignmentId: selectedSourceAssignment.id,
        sourceAssignmentCode: selectedSourceAssignment.code ?? null,
        sourceDynamicFormTemplateId,
        sourceDynamicFormTemplateCode: selectedSourceAssignment.dynamicFormTemplateCode ?? null,
        sourceDynamicFormTemplateName: selectedSourceAssignment.dynamicFormTemplateName ?? null,
        sourceBlockId: selectedSourceBlock.blockId,
        sourceBlockLabel: selectedSourceBlock.label,
        sourceTableMode: selectedSourceBlock.tableMode,
        sourceAssignmentIds: sourceFormAssignments.map((row) => row.id),
        targetReportId: detail.id,
        targetDynamicFormTemplateId: detail.dynamicFormTemplateId ?? null,
        targetDynamicFormTemplateCode: detail.dynamicFormTemplateCode ?? null,
        targetDynamicFormTemplateName: detail.dynamicFormTemplateName ?? null,
        targetBlockId: selectedTargetBlockOption.blockId,
        targetBlockLabel: selectedTargetBlockOption.label,
        targetTableMode,
        valueSelector,
        metricKeys: null,
        selectedUnitIds: sourceUnitIds,
        outputShape,
        periodRule: {
          mode: "DATE_RANGE",
          anchorDayKey,
          periodDateFrom,
          periodDateTo,
          periodKeyFrom,
          periodKeyTo,
        },
        sourceStatusMode: "APPROVED_ONLY",
        scopeMode: "DIRECT_CHILDREN",
      }),
    };
  }, [
    anchorDayKey,
    detail,
    periodDateFrom,
    periodDateTo,
    periodKeyFrom,
    periodKeyTo,
    selectedSourceAssignment,
    selectedSourceBlock,
    selectedTargetBlockOption,
    selectedUnitIds,
    showMessage,
    sourceFormAssignments,
    sourceDynamicFormTemplateId,
    targetTableMode,
    outputShape,
    valueSelector,
  ]);

  const handleTargetBlockChange = React.useCallback((nextBlockId: string) => {
    setTargetBlockId(nextBlockId);
    onSelectTargetBlock(nextBlockId);
  }, [onSelectTargetBlock]);

  const handlePreview = React.useCallback(async () => {
    const request = buildRequest();
    if (!request) return;
    try {
      const response = await previewDynamicFormAggregateDraft({
        id: detail.id,
        data: request,
      }).unwrap();
      onPreview(response);
    } catch (err) {
      console.error(err);
      showMessage("Không xem trước được báo cáo sau khi gán dữ liệu tổng hợp.");
    }
  }, [buildRequest, detail.id, onPreview, previewDynamicFormAggregateDraft, showMessage]);

  const handleApply = React.useCallback(async () => {
    const request = buildRequest();
    if (!request) return;
    try {
      await applyDynamicFormAggregateDraft({
        id: detail.id,
        data: request,
      }).unwrap();
      await onApplied();
      setAggregateDialogOpen(false);
      showMessage("Đã gắn dữ liệu tổng hợp vào báo cáo hiện tại.");
    } catch (err) {
      console.error(err);
      showMessage("Không gắn được dữ liệu tổng hợp vào báo cáo.");
    }
  }, [applyDynamicFormAggregateDraft, buildRequest, detail.id, onApplied, showMessage]);

  if (!canEdit) return null;

  const disabled = sectionBusy;
  const sourceSlot = (
    <Stack spacing={1}>
      <TextField
        select
        size="small"
        label="Biểu mẫu/công việc nguồn"
        value={sourceAssignmentId}
        onChange={(event) => {
          setSourceAssignmentId(event.target.value);
          setSourceBlockId("");
          setSelectedUnitIds([]);
        }}
        disabled={disabled}
        fullWidth
        helperText="Chọn một công việc đại diện; hệ thống tập hợp tất cả công việc con cùng biểu mẫu."
      >
        {sourceAssignments.length === 0 && (
          <MenuItem value="" disabled>
            Chưa có công việc con có biểu mẫu
          </MenuItem>
        )}
        {sourceAssignments.map((row) => (
          <MenuItem key={row.id} value={row.id}>
            {formatSourceAssignmentLabel(row)}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Field/Table nguồn"
        value={sourceBlockId}
        onChange={(event) => setSourceBlockId(event.target.value)}
        disabled={disabled || !selectedSourceAssignment}
        fullWidth
        helperText="Table metric trong biểu mẫu nguồn được lấy tự động; field có nhãn thống kê được tổng hợp ở thống kê field."
      >
        {sourceBlocks.length === 0 && (
          <MenuItem value="" disabled>
            Chưa có field/table nguồn
          </MenuItem>
        )}
        {sourceBlocks.map((block) => (
          <MenuItem key={block.key} value={block.blockId}>
            {block.label} - {formatAggregateTableMode(block.tableMode)} - {formatAggregateBlockMetricSummary(block)}
          </MenuItem>
        ))}
      </TextField>
      {selectedSourceBlock && (
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip size="small" color="primary" variant="outlined" label="Nguồn" />
            <Chip size="small" variant="outlined" label={formatAggregateTableMode(selectedSourceBlock.tableMode)} />
            <Chip
              size="small"
              color={selectedSourceBlock.statisticsDisabled ? "warning" : undefined}
              variant="outlined"
              label={formatAggregateBlockMetricSummary(selectedSourceBlock)}
            />
            {selectedSourceBlock.w && selectedSourceBlock.h && (
              <Chip size="small" variant="outlined" label={`${selectedSourceBlock.w}x${selectedSourceBlock.h}`} />
            )}
          </Stack>
          {selectedSourceBlock.statisticsDisabled && (
            <Alert severity="warning" sx={{ py: 0.75 }}>
              {selectedSourceBlock.statisticsDisabledReason ?? getTableStatisticDisabledReason(selectedSourceBlock.statisticsInputCellCount)}
            </Alert>
          )}
        </Stack>
      )}
    </Stack>
  );
  const targetSlot = (
    <Stack spacing={1}>
      <TextField
        select
        size="small"
        label="Field/Table đích"
        value={targetBlockId}
        onChange={(event) => handleTargetBlockChange(event.target.value)}
        disabled={disabled}
        fullWidth
        helperText="Đích sẽ được mở ở phần nhập liệu của báo cáo và nhận kết quả tổng hợp."
      >
        {targetBlocks.length === 0 && (
          <MenuItem value="" disabled>
            Chưa có field/table đích
          </MenuItem>
        )}
        {targetBlocks.map((block) => (
          <MenuItem key={block.key} value={block.blockId}>
            {block.label} - {formatAggregateTableMode(getReportBlockTableMode(block))}
          </MenuItem>
        ))}
      </TextField>
      {selectedTargetBlockOption && (
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip size="small" color="primary" variant="outlined" label="Đích" />
          <Chip size="small" variant="outlined" label={`${selectedTargetBlockOption.w}x${selectedTargetBlockOption.h}`} />
        </Stack>
      )}
    </Stack>
  );
  const metricExtraSlot = (
    <TextField
      select
      size="small"
      label="Cách ghi số"
      value={valueSelector}
      onChange={(event) =>
        setValueSelector(event.target.value as ReportAggregateMapValueSelector)
      }
      disabled={disabled}
      helperText={selectedValueSelector?.helper}
      fullWidth
    >
      {REPORT_AGGREGATE_VALUE_SELECTORS.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          startIcon={<CalculateOutlinedIcon fontSize="small" />}
          onClick={() => setAggregateDialogOpen(true)}
          disabled={sectionBusy || targetBlocks.length === 0}
        >
          Gán dữ liệu tổng hợp
        </Button>
      </Box>

      <Dialog
        open={aggregateDialogOpen}
        onClose={() => setAggregateDialogOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Gán dữ liệu tổng hợp</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Nếu để trống đơn vị, hệ thống sẽ lấy tất cả đơn vị đã giao. Table metric trong cùng biểu mẫu nguồn và field có nhãn thống kê được gom tự động; phần field chưa gán nhãn chỉ tải khi mở chi tiết. Khoảng ngày mặc định theo kỳ báo cáo hiện tại ({formatDayKeyForUser(anchorDayKey)}).
            </Alert>

            <AggregateDataControls
              title="Tập hợp dữ liệu"
              subtitle="Chọn khoảng thời gian, đơn vị, nguồn/đích và cách tính trước khi xem trước hoặc gán vào báo cáo."
              dateFrom={periodDateFrom}
              dateTo={periodDateTo}
              onDateFromChange={setPeriodDateFrom}
              onDateToChange={setPeriodDateTo}
              selectedUnitIds={selectedUnitIds}
              onSelectedUnitIdsChange={setSelectedUnitIds}
              unitOptions={sourceUnitOptions}
              sourceSlot={sourceSlot}
              targetSlot={targetSlot}
              metricOptions={selectedSourceBlock?.metricOptions ?? []}
              selectedMetricKeys={[]}
              onSelectedMetricKeysChange={undefined}
              hideMetricSelector
              metricSectionTitle="Cách tổng hợp"
              metricSummaryText={formatAggregateBlockMetricSummary(selectedSourceBlock)}
              metricHelperText={formatAggregateBlockMetricHelper(selectedSourceBlock)}
              metricExtraSlot={metricExtraSlot}
              actions={[
                {
                  key: "source-preview",
                  label: "Xem nguồn",
                  tooltip: "Xem trước field/table nguồn",
                  icon: VisibilityOutlinedIcon,
                  onClick: () => setSourcePreviewOpen(true),
                  disabled: !selectedSourceDynamicExcelId,
                },
                {
                  key: "preview-report",
                  label: "Xem trước",
                  tooltip: "Xem trước báo cáo sau khi gán dữ liệu",
                  icon: PreviewOutlinedIcon,
                  onClick: () => void handlePreview(),
                  disabled: sectionBusy || !canRunAggregate,
                  color: "primary",
                },
              ]}
            />

            <Alert severity="info">{outputShapeHelper}</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAggregateDialogOpen(false)} disabled={sectionBusy}>
            Đóng
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleApply()}
            disabled={sectionBusy || !canRunAggregate}
          >
            {applyState.isLoading ? "Đang gắn..." : "Gắn dữ liệu"}
          </Button>
        </DialogActions>
      </Dialog>

      <DynamicExcelGridPreviewDialog
        open={sourcePreviewOpen}
        dynamicExcelId={selectedSourceDynamicExcelId}
        onClose={() => setSourcePreviewOpen(false)}
      />
    </>
  );
}

type ContributionSectionProps = {
  canEdit: boolean;
  busy: boolean;
  dataOrigin: WorkReportDataOrigin;
  cumulativeContributionMode: WorkReportCumulativeContributionMode;
  policyJson?: string | null;
  summarySourceJson?: string | null;
  embedded?: boolean;
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
    embedded = false,
    onDataOriginChange,
    onContributionModeChange,
  } = props;

  const disabled = !canEdit || busy;
  const include = cumulativeContributionMode === "INCLUDE";
  const hasTargetPolicy = Boolean(policyJson?.trim());
  const hasSummarySource = Boolean(summarySourceJson?.trim());
  const sourceConfigDisabled = disabled || hasSummarySource;

  const content = (
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
  );

  if (embedded) {
    return (
      <Box
        sx={{
          p: 1.5,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "background.paper",
        }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>{content}</CardContent>
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
  completedDate: string;
  lateReason: string;
  setCompletedDate: (v: string) => void;
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
    completedDate,
    lateReason,
    setCompletedDate,
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
              Đây là dữ liệu từ quá khứ. Người báo cáo phải kiểm tra ngày hoàn thành; khi duyệt, người duyệt sẽ xác nhận lại.
            </Alert>
          )}

          {showCompletedDate && (
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <SingleDayKeyField
                label={requiresCompletedDate ? "Ngày hoàn thành *" : "Ngày hoàn thành"}
                value={completedDate}
                disabled={!canEdit || busy || !canEditCompletedDate}
                fullWidth
                minDayKey={completedDateMin || undefined}
                maxDayKey={completedDateMax || undefined}
                onChange={setCompletedDate}
              />
            </Stack>
          )}

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

type ReportSectionTablePreviewsProps = {
  blocks: ReportExcelBlockRuntime[];
  rowLabelsByBlock: RowLabelStateMap;
  canEdit: boolean;
  busy: boolean;
  onValidateSection?: () => void;
  canValidate?: boolean;
  onOpenBlock: (block: ReportExcelBlockRuntime) => void;
};

function ReportSectionTablePreviews(props: ReportSectionTablePreviewsProps) {
  const {
    blocks,
    rowLabelsByBlock,
    canEdit,
    busy,
    onValidateSection,
    canValidate = true,
    onOpenBlock,
  } = props;

  if (blocks.length === 0) return null;

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Typography variant="subtitle2" fontWeight={800}>
          Bảng dữ liệu
        </Typography>
        {onValidateSection && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<FactCheckOutlinedIcon fontSize="small" />}
            disabled={!canValidate}
            onClick={onValidateSection}
            sx={{ alignSelf: { xs: "stretch", sm: "center" }, textTransform: "none" }}
          >
            Kiểm tra dữ liệu
          </Button>
        )}
      </Stack>

      {blocks.map((block) => {
        const rowLabels = rowLabelsByBlock[block.blockId] ?? [];
        const labeledRows = rowLabels.filter(
          (row) => normalizeLabelCodes(row.rowLabelCodes ?? []).length > 0,
        ).length;
        const inputCellCount = getExpectedValueLength(block);

        return (
          <Paper
            key={block.key}
            variant="outlined"
            sx={{ p: 1.25, borderRadius: 1, bgcolor: "background.default" }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <TableChartOutlinedIcon fontSize="small" color="primary" />
                  <Typography variant="body2" fontWeight={800}>
                    {block.label}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  <Chip size="small" variant="outlined" label={getReportBlockButtonSummary(block)} />
                  <Chip size="small" variant="outlined" label={`${inputCellCount} ô nhập`} />
                  {labeledRows > 0 && (
                    <Chip size="small" color="primary" variant="outlined" label={`${labeledRows} dòng gắn nhãn`} />
                  )}
                </Stack>
              </Stack>

              <Button
                data-testid="report-table-open-button"
                data-block-id={block.blockId || undefined}
                variant={canEdit ? "contained" : "outlined"}
                startIcon={<OpenInFullOutlinedIcon fontSize="small" />}
                disabled={busy}
                onClick={() => onOpenBlock(block)}
                sx={{ alignSelf: { xs: "stretch", md: "center" }, textTransform: "none" }}
              >
                {canEdit ? "Mở nhập liệu" : "Xem bảng"}
              </Button>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
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
  const { reportId, onSaved, onSubmitted } = props;

  const { data, isLoading, isError, refetch } = useGetWorkAssignmentReportQuery(
    reportId,
    { skip: !reportId || Boolean(props.previewData) }
  );

  const [saveDraft, saveDraftState] = useSaveWorkAssignmentReportDraftMutation();
  const [saveDraftPatch, saveDraftPatchState] = useSaveWorkAssignmentReportDraftPatchMutation();
  const [submitReport, submitState] = useSubmitWorkAssignmentReportMutation();
  const [withdrawSubmittedReport, withdrawState] = useWithdrawSubmittedReportMutation();
  const busy =
    saveDraftState.isLoading ||
    saveDraftPatchState.isLoading ||
    submitState.isLoading ||
    withdrawState.isLoading;

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
  const latestWorkbookRawRef = React.useRef<WorkbookRawDataMap>({});
  const selectedWorkbookGridRef = React.useRef<WorkbookDataGridHandle | null>(null);
  const [sectionValidationState, setSectionValidationState] =
    React.useState<ReportSectionValidationState>({});
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
  const [tableDialogOpen, setTableDialogOpen] = React.useState(false);
  const selectedDynamicExcelId = selectedReportBlock?.dynamicExcelTemplateId?.trim() ?? "";
  const selectedReportId = detail?.id?.trim() ?? reportId;
  const { data: selectedDynamicExcelDetail, isFetching: isFetchingSelectedDynamicExcel } = useGetWorkAssignmentReportTemplateWorkbookQuery(
    { id: selectedReportId, dynamicExcelTemplateId: selectedDynamicExcelId },
    { skip: !tableDialogOpen || !selectedReportId || !selectedDynamicExcelId },
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
      tableDialogOpen && detail && selectedReportBlock
        ? resolveReportBlockValues(
            detail,
            selectedReportBlock,
            topLevelBlockId,
            latestWorkbookPayloadRef.current,
          )
        : [],
    [detail, selectedReportBlock, tableDialogOpen, topLevelBlockId],
  );
  const selectedWorkbookData = React.useMemo(
    () => {
      const rawWorkbookData = selectedReportBlock
        ? latestWorkbookRawRef.current[selectedReportBlock.blockId]
        : null;
      if (tableDialogOpen && Array.isArray(rawWorkbookData) && rawWorkbookData.length > 0) {
        return rawWorkbookData;
      }

      return tableDialogOpen && selectedRenderableBlock
        ? hydrateReportBlockWorkbook(selectedRenderableBlock, selectedBlockValues)
        : [];
    },
    [selectedRenderableBlock, selectedBlockValues, selectedReportBlock, tableDialogOpen],
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
  const requiresLateReason = isHistoricalData
    ? isCompletedAfterDue(detail?.completedDate, detail?.dueAtUtc)
    : overdue;
  const canEditCompletedDate = Boolean(detail?.canEditCompletedDate);
  const requiresCompletedDate = Boolean(detail?.requiresCompletedDate);
  const completedDateMin = toDayKey(detail?.completedDateMin);
  const completedDateMax = toDayKey(detail?.completedDateMax);

  const [lateReason, setLateReason] = React.useState("");
  const [completedDate, setCompletedDate] = React.useState("");
  const [dataOrigin, setDataOrigin] = React.useState<WorkReportDataOrigin>(
    DEFAULT_REPORT_DATA_ORIGIN,
  );
  const [cumulativeContributionMode, setCumulativeContributionMode] =
    React.useState<WorkReportCumulativeContributionMode>(
      DEFAULT_REPORT_CUMULATIVE_CONTRIBUTION_MODE,
    );
  const reportDataLocked = detail ? isAutoSummaryDataLocked(dataOrigin) : false;
  const canEditReportData = canEdit && !reportDataLocked;
  const [fieldValues, setFieldValues] = React.useState<DynamicFormRuntimeValues>({});
  const [rowLabelsByBlock, setRowLabelsByBlock] = React.useState<RowLabelStateMap>({});
  const selectedBlockRowLabels = React.useMemo(
    () => (selectedReportBlock ? rowLabelsByBlock[selectedReportBlock.blockId] ?? [] : []),
    [selectedReportBlock, rowLabelsByBlock],
  );
  const reportRuntimeSections = React.useMemo(
    () => buildReportRuntimeSections(dynamicFormRuntime, reportBlocks),
    [dynamicFormRuntime, reportBlocks],
  );
  const reportBlocksBySectionId = React.useMemo(
    () => buildReportBlocksBySectionId(reportRuntimeSections, reportBlocks),
    [reportBlocks, reportRuntimeSections],
  );
  const [tableValidationDialog, setTableValidationDialog] =
    React.useState<ReportTableValidationDialogState | null>(null);
  const [sectionValidationPrompt, setSectionValidationPrompt] =
    React.useState<ReportSectionValidationPromptState | null>(null);

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

  const reportSectionById = React.useMemo(
    () => Object.fromEntries(reportRuntimeSections.map((section) => [section.id, section])),
    [reportRuntimeSections],
  );
  const reportBlockSectionById = React.useMemo(() => {
    const entries: Array<[string, string]> = [];
    Object.entries(reportBlocksBySectionId).forEach(([sectionId, blocks]) => {
      blocks.forEach((block) => entries.push([block.blockId, sectionId]));
    });
    return Object.fromEntries(entries);
  }, [reportBlocksBySectionId]);
  const fallbackReportSection = React.useMemo<DynamicFormSection>(
    () =>
      reportRuntimeSections[0] ?? {
        id: REPORT_TABLES_SECTION_ID,
        title: "Phần bảng",
        description: null,
        tagCodes: [],
        order: 0,
      },
    [reportRuntimeSections],
  );
  const resolveReportBlockSection = React.useCallback(
    (block: ReportExcelBlockRuntime) => {
      const sectionId = reportBlockSectionById[block.blockId];
      return (sectionId ? reportSectionById[sectionId] : null) ?? fallbackReportSection;
    },
    [fallbackReportSection, reportBlockSectionById, reportSectionById],
  );
  const invalidateReportSectionValidation = React.useCallback((sectionId?: string | null) => {
    if (!sectionId) return;
    setSectionValidationState((prev) => {
      if (!prev[sectionId]) return prev;
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
  }, []);
  const invalidateReportBlockSectionValidation = React.useCallback(
    (blockId?: string | null) => {
      if (!blockId) return;
      invalidateReportSectionValidation(reportBlockSectionById[blockId] ?? fallbackReportSection.id);
    },
    [fallbackReportSection.id, invalidateReportSectionValidation, reportBlockSectionById],
  );
  const markReportSectionsValidated = React.useCallback(
    (blocksToValidate: ReportExcelBlockRuntime[], issues: ReportWorkbookValidationIssue[]) => {
      const sectionIds = Array.from(
        new Set(blocksToValidate.map((block) => resolveReportBlockSection(block).id)),
      );
      if (sectionIds.length === 0) return;

      const issueCounts = new Map<string, number>();
      issues.forEach((item) => {
        issueCounts.set(item.section.id, (issueCounts.get(item.section.id) ?? 0) + 1);
      });

      const checkedAt = Date.now();
      setSectionValidationState((prev) => {
        const next: ReportSectionValidationState = { ...prev };
        sectionIds.forEach((sectionId) => {
          const issueCount = issueCounts.get(sectionId) ?? 0;
          next[sectionId] = {
            status: issueCount > 0 ? "invalid" : "valid",
            issueCount,
            checkedAt,
          };
        });
        return next;
      });
    },
    [resolveReportBlockSection],
  );
  const validateReportBlocks = React.useCallback(
    (blocksToValidate: ReportExcelBlockRuntime[]) => {
      if (!detail || reportDataLocked) return [];

      const nextIssuesByBlock: WorkbookValidationIssueMap = {};
      const issues: ReportWorkbookValidationIssue[] = [];

      blocksToValidate.forEach((block) => {
        const cachedIssues = latestWorkbookIssuesRef.current[block.blockId];
        const blockIssues = Array.isArray(cachedIssues)
          ? cachedIssues
          : validateReportBlockWorkbook(
              block,
              resolveReportBlockValues(
                detail,
                block,
                topLevelBlockId,
                latestWorkbookPayloadRef.current,
              ),
              latestWorkbookRawRef.current[block.blockId],
            );

        nextIssuesByBlock[block.blockId] = blockIssues;
        blockIssues.forEach((issue) => {
          issues.push({
            section: resolveReportBlockSection(block),
            block,
            issue,
          });
        });
      });

      latestWorkbookIssuesRef.current = {
        ...latestWorkbookIssuesRef.current,
        ...nextIssuesByBlock,
      };

      return issues;
    },
    [detail, reportDataLocked, resolveReportBlockSection, topLevelBlockId],
  );
  const showReportTableValidationDialog = React.useCallback(
    (
      issues: ReportWorkbookValidationIssue[],
      source: ReportTableValidationDialogState["source"],
      section: DynamicFormSection,
    ) => {
      const sectionIssues = issues.filter((item) => item.section.id === section.id);
      setTableValidationDialog({
        open: true,
        source,
        sectionId: section.id,
        sectionTitle: section.title,
        issues: sectionIssues.length > 0 ? sectionIssues : issues,
      });
    },
    [],
  );
  const handleValidateReportSection = React.useCallback(
    (sectionId: string, source: ReportTableValidationDialogState["source"] = "manual") => {
      const section = reportSectionById[sectionId] ?? fallbackReportSection;
      const blocks = reportBlocksBySectionId[sectionId] ?? [];
      const issues = validateReportBlocks(blocks);
      markReportSectionsValidated(blocks, issues);
      setSectionValidationPrompt(null);
      showReportTableValidationDialog(issues, source, section);
      showMessage(
        issues.length > 0
          ? `${section.title}: phát hiện ${issues.length} lỗi dữ liệu bảng.`
          : `${section.title}: chưa phát hiện lỗi dữ liệu bảng.`,
      );
      return issues;
    },
    [
      fallbackReportSection,
      markReportSectionsValidated,
      reportBlocksBySectionId,
      reportSectionById,
      showMessage,
      showReportTableValidationDialog,
      validateReportBlocks,
    ],
  );
  const showFirstReportTableIssue = React.useCallback(
    (
      issues: ReportWorkbookValidationIssue[],
      source: ReportTableValidationDialogState["source"],
    ) => {
      const firstIssue = issues[0];
      if (!firstIssue) return;
      showReportTableValidationDialog(issues, source, firstIssue.section);
      showMessage(`Dữ liệu bảng chưa hợp lệ ở section ${firstIssue.section.title}.`);
    },
    [showMessage, showReportTableValidationDialog],
  );
  const handleOpenReportBlock = React.useCallback((block: ReportExcelBlockRuntime) => {
    setSelectedBlockKey(block.key);
    setTableDialogOpen(true);
  }, []);
  const handleOpenValidationIssueBlock = React.useCallback(
    (block: ReportExcelBlockRuntime) => {
      setTableValidationDialog(null);
      handleOpenReportBlock(block);
    },
    [handleOpenReportBlock],
  );
  const handleRuntimeSectionChange = React.useCallback(
    (section: DynamicFormSection) => {
      if (!canEditReportData) return;
      const blocks = reportBlocksBySectionId[section.id] ?? [];
      if (blocks.length === 0) return;
      if (sectionValidationState[section.id]) return;
      setSectionValidationPrompt({
        open: true,
        section,
        blockCount: blocks.length,
      });
    },
    [canEditReportData, reportBlocksBySectionId, sectionValidationState],
  );
  const getReportSectionTableCount = React.useCallback(
    (section: DynamicFormSection) => reportBlocksBySectionId[section.id]?.length ?? 0,
    [reportBlocksBySectionId],
  );
  function handleReportBlockRowLabelChange(
    block: ReportExcelBlockRuntime,
    rowIndex: number,
    codes: string[],
  ) {
    const blockId = block.blockId;
    const normalized = normalizeLabelCodes(codes);
    invalidateReportBlockSectionValidation(blockId);

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
  }
  const renderReportSectionTables = React.useCallback(
    (section: DynamicFormSection) => {
      if (!detail) return null;
      const blocks = reportBlocksBySectionId[section.id] ?? [];
      return (
        <ReportSectionTablePreviews
          blocks={blocks}
          rowLabelsByBlock={rowLabelsByBlock}
          onValidateSection={() => handleValidateReportSection(section.id, "manual")}
          canValidate={canEditReportData && !busy}
          canEdit={canEditReportData}
          busy={busy}
          onOpenBlock={handleOpenReportBlock}
        />
      );
    },
    [
      busy,
      canEditReportData,
      detail,
      handleOpenReportBlock,
      handleValidateReportSection,
      reportBlocksBySectionId,
      rowLabelsByBlock,
    ],
  );

  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [withdrawReason, setWithdrawReason] = React.useState("");
  const [aggregateMapPreview, setAggregateMapPreview] =
    React.useState<WorkAssignmentReportResponse | null>(null);
  const [aggregateMapOpen, setAggregateMapOpen] = React.useState(false);

  React.useEffect(() => {
    latestWorkbookPayloadRef.current = {};
    latestWorkbookIssuesRef.current = {};
    latestWorkbookRawRef.current = {};
  }, [detail?.id, detail?.tableValuesJson, detail?.updatedAtUtc]);

  React.useEffect(() => {
    setSectionValidationState({});
  }, [detail?.id]);

  React.useEffect(() => {
    setSelectedBlockKey((prev) =>
      reportBlocks.some((block) => block.key === prev)
        ? prev
        : reportBlocks[0]?.key ?? "",
    );
  }, [reportBlockKeys, reportBlocks]);

  React.useEffect(() => {
    if (!detail) return;

    setLateReason(detail.lateReason ?? "");
    setCompletedDate(resolveInitialCompletedDayKey(detail));
    const nextDataOrigin = normalizeReportDataOrigin(detail.dataOrigin);
    setDataOrigin(nextDataOrigin);
    setCumulativeContributionMode(
      normalizeContributionMode(detail.cumulativeContributionMode, nextDataOrigin),
    );
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
      handleReportBlockRowLabelChange(selectedReportBlock, rowIndex, codes);
    },
    [selectedReportBlock],
  );

  async function handleSaveDraft(payload?: WorkbookSavePayload) {
    if (!detail) return;

    const payloadBlockId = payload?.values1D
      ? normalizeBlockId(payload.blockId ?? topLevelBlockId)
      : null;

    if (payload?.values1D && payloadBlockId) {
      latestWorkbookPayloadRef.current = {
        ...latestWorkbookPayloadRef.current,
        [payloadBlockId]: payload.values1D,
      };
      latestWorkbookIssuesRef.current = {
        ...latestWorkbookIssuesRef.current,
        [payloadBlockId]: payload.validationIssues ?? [],
      };
      if (payload.rawWorkbookData) {
        latestWorkbookRawRef.current = {
          ...latestWorkbookRawRef.current,
          [payloadBlockId]: payload.rawWorkbookData,
        };
      }
    }

    if (!reportDataLocked) {
      const blocksToValidate = payloadBlockId
        ? reportBlocks.filter((block) => normalizeBlockId(block.blockId) === payloadBlockId)
        : reportBlocks;
      const effectiveBlocksToValidate = blocksToValidate.length > 0 ? blocksToValidate : reportBlocks;
      const tableIssues = validateReportBlocks(effectiveBlocksToValidate);
      markReportSectionsValidated(effectiveBlocksToValidate, tableIssues);
      if (tableIssues.length > 0) {
        showFirstReportTableIssue(tableIssues, "save");
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
    const topLevelBlock = reportBlocks.find((block) => block.blockId === topLevelBlockId) ?? reportBlocks[0];
    const topLevelValues = normalizeWorkbookValues(
      valuesByBlock[topLevelBlockId] ?? detail.values1D ?? [],
      topLevelBlock ? getExpectedValueLength(topLevelBlock) : detail.w * detail.h,
    );
    const fieldValuesJson = buildDynamicFieldValuesJson(
      detail,
      dynamicFormRuntime,
      fieldValues,
    );
    const completedDatePayload = canEditCompletedDate ? dayKeyToApiDate(completedDate) : null;
    const advancedSettings = buildReportAdvancedSettingsPayload(
      detail,
      dataOrigin,
      cumulativeContributionMode,
    );

    try {
      if (payloadBlockId && !props.previewData) {
        const changedBlock = reportBlocks.find(
          (block) => normalizeBlockId(block.blockId) === payloadBlockId,
        );
        const blockJson = changedBlock
          ? buildTableValuesBlockJson(changedBlock, valuesByBlock, rowLabelsByBlock)
          : null;
        const topLevelPatch =
          payloadBlockId === normalizeBlockId(topLevelBlockId)
            ? buildRuntimeValuesPatch(
                normalizeWorkbookValues(detail.values1D ?? [], topLevelValues.length),
                topLevelValues,
              )
            : [];

        await saveDraftPatch({
          id: detail.id,
          data: {
            values1DLength: topLevelValues.length,
            values1DPatch: topLevelPatch.length > 0 ? topLevelPatch : null,
            fieldValuesJson,
            tableBlockPatches: blockJson ? [{ blockId: payloadBlockId, blockJson }] : null,
            ...advancedSettings,
            completedDate: completedDatePayload,
            lateReason: lateReason.trim() || null,
            note: null,
          },
        }).unwrap();

        onSaved?.();
        showMessage("ÄÃ£ lÆ°u nhÃ¡p.");
        return;
      }

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
          ...advancedSettings,
          completedDate: completedDatePayload,
          lateReason: lateReason.trim() || null,
          note: null,
        },
      }).unwrap();

      onSaved?.();
      showMessage("Đã lưu nháp.");
    } catch (error) {
      console.error(error);
      showMessage(getApiErrorMessage(error) || "Lưu nháp thất bại.");
    }
  }

  const handleSaveSelectedWorkbookDraft = async () => {
    if (!selectedReportBlock) return;

    const payload = selectedWorkbookGridRef.current?.commitChanges();
    if (!payload) {
      showMessage("Không lấy được dữ liệu bảng để lưu.");
      return;
    }

    if (payload.validationIssues.length > 0) {
      const section = resolveReportBlockSection(selectedReportBlock);
      const issues = payload.validationIssues.map((issue) => ({
        section,
        block: selectedReportBlock,
        issue,
      }));
      markReportSectionsValidated([selectedReportBlock], issues);
      showReportTableValidationDialog(
        issues,
        "save",
        section,
      );
      showMessage(`${section.title}: phát hiện ${payload.validationIssues.length} lỗi dữ liệu bảng.`);
      return;
    }

    await handleSaveDraft({
      blockId: selectedReportBlock.blockId,
      values1D: payload.values1D,
      rawWorkbookData: payload.rawWorkbookData,
      validationIssues: payload.validationIssues,
    });
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
      const tableIssues = validateReportBlocks(reportBlocks);
      markReportSectionsValidated(reportBlocks, tableIssues);
      if (tableIssues.length > 0) {
        showFirstReportTableIssue(tableIssues, "submit");
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
      const topLevelBlock = reportBlocks.find((block) => block.blockId === topLevelBlockId) ?? reportBlocks[0];
      const topLevelValues = normalizeWorkbookValues(
        valuesByBlock[topLevelBlockId] ?? detail.values1D ?? [],
        topLevelBlock ? getExpectedValueLength(topLevelBlock) : detail.w * detail.h,
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
      const advancedSettings = buildReportAdvancedSettingsPayload(
        detail,
        dataOrigin,
        cumulativeContributionMode,
      );

      await saveDraft({
        id: detail.id,
        data: {
          values1D: topLevelValues,
          fieldValuesJson,
          tableValuesJson,
          ...advancedSettings,
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
          ...advancedSettings,
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
      showMessage(getApiErrorMessage(error) || "Nộp báo cáo thất bại.");
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
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: { md: 0.5 }, pb: 2 }}>
          <Stack spacing={2} sx={{ minHeight: 0 }}>
            {(canEdit || canWithdraw) && (
              <Stack direction="row" justifyContent="flex-end" alignItems="center">
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
                />
              </Stack>
            )}

            <ReportHeaderSection
              detail={detail}
              overdue={requiresLateReason}
              canEdit={canEdit}
              busy={busy}
              dataOrigin={dataOrigin}
              cumulativeContributionMode={cumulativeContributionMode}
              onOpenLogs={() => setLogsOpen(true)}
            />

            {reportDataLocked && (
              <Alert severity={detail.aggregateSnapshotDirty ? "warning" : "info"}>
                Báo cáo này dùng dữ liệu đã gắn từ kết quả tổng hợp thủ công. Phần dữ liệu biểu mẫu được khóa nhập và lấy từ snapshot tổng hợp hiện hành; người báo cáo chỉ cập nhật được các thông tin đi kèm.
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

        {isFetchingDynamicForm && (
          <Alert severity="info">{uiText(UITextKey.TextDangTaiTruongBoSung)}</Alert>
        )}

        {reportRuntimeSections.length > 0 && (
          <DynamicFormRuntimeFields
            sections={reportRuntimeSections}
            fields={dynamicFormRuntime?.fields ?? []}
            values={fieldValues}
            readOnly={!canEditReportData}
            disabled={busy}
            onChange={handleDynamicFieldChange}
            title="Dữ liệu biểu mẫu"
            getSectionExtraCount={getReportSectionTableCount}
            renderSectionExtra={renderReportSectionTables}
            getSectionValidationState={(section) => {
              const state = sectionValidationState[section.id];
              return state
                ? { status: state.status, issueCount: state.issueCount }
                : null;
            }}
            onSectionChange={handleRuntimeSectionChange}
          />
        )}

        <Accordion
          variant="outlined"
          disableGutters
          sx={{
            borderRadius: 1,
            overflow: "hidden",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreOutlinedIcon />}
            sx={{
              minHeight: 48,
              "& .MuiAccordionSummary-content": {
                my: 1,
              },
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <TuneOutlinedIcon fontSize="small" color="primary" />
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>
                  Tính năng nâng cao
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Gán dữ liệu tổng hợp, thống kê và lũy kế.
                </Typography>
              </Box>
              {dataOrigin !== "MANUAL_INPUT" && (
                <Chip size="small" variant="outlined" label={getReportDataOriginLabel(dataOrigin)} />
              )}
              {cumulativeContributionMode === "INCLUDE" && (
                <Chip size="small" color="success" variant="outlined" label="Tính lũy kế" />
              )}
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={2}>
              {canEditReportData && (
                <Box
                  sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    bgcolor: "background.paper",
                  }}
                >
                  <Stack spacing={aggregateMapOpen ? 2 : 0}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1}
                      alignItems={{ xs: "stretch", md: "center" }}
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800}>
                          Gán dữ liệu tổng hợp
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tạm ưu tiên bài toán matrix tập hợp dữ liệu; danh sách và biểu mẫu nguồn chỉ tải khi mở.
                        </Typography>
                      </Box>
                      <Button
                        variant={aggregateMapOpen ? "outlined" : "contained"}
                        startIcon={<CalculateOutlinedIcon />}
                        disabled={busy}
                        onClick={() => setAggregateMapOpen((open) => !open)}
                        sx={{ alignSelf: { xs: "stretch", md: "center" }, textTransform: "none" }}
                      >
                        {aggregateMapOpen ? "Ẩn gán dữ liệu" : "Mở gán dữ liệu"}
                      </Button>
                    </Stack>

                    {aggregateMapOpen && (
                      <ReportAggregateMapSection
                        detail={detail}
                        targetBlocks={reportBlocks}
                        selectedTargetBlock={selectedReportBlock}
                        canEdit={canEditReportData}
                        busy={busy}
                        onPreview={setAggregateMapPreview}
                        onApplied={async () => {
                          await refetch();
                          onSaved?.();
                        }}
                        onSelectTargetBlock={(blockId) => {
                          const block = reportBlocks.find((item) => item.blockId === blockId);
                          if (block) setSelectedBlockKey(block.key);
                        }}
                        showMessage={showMessage}
                      />
                    )}
                  </Stack>
                </Box>
              )}

              <ReportContributionSection
                canEdit={canEdit}
                busy={busy}
                dataOrigin={dataOrigin}
                cumulativeContributionMode={cumulativeContributionMode}
                policyJson={detail.cumulativeContributionPolicyJson}
                summarySourceJson={detail.summarySourceJson}
                embedded
                onDataOriginChange={handleDataOriginChange}
                onContributionModeChange={setCumulativeContributionMode}
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        <ReportBusinessFormSection
          canEdit={canEdit}
          busy={busy}
          overdue={requiresLateReason}
          isHistoricalData={isHistoricalData}
          canEditCompletedDate={canEditCompletedDate}
          requiresCompletedDate={requiresCompletedDate}
          completedDateMin={completedDateMin || undefined}
          completedDateMax={completedDateMax || undefined}
          completedDate={completedDate}
          lateReason={lateReason}
          setCompletedDate={setCompletedDate}
          setLateReason={setLateReason}
        />
      </Stack>
        </Box>
      </Box>

      <Dialog
        data-testid="report-table-dialog"
        open={tableDialogOpen}
        onClose={() => !busy && setTableDialogOpen(false)}
        fullScreen
      >
        <DialogTitle
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            px: { xs: 1.5, md: 2 },
            py: 1.25,
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} noWrap>
                {selectedReportBlock?.label ?? "Bảng dữ liệu"}
              </Typography>
              {selectedReportBlock && (
                <Typography variant="caption" color="text.secondary">
                  {getReportBlockButtonSummary(selectedReportBlock)}
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {canEditReportData && (
                <Button
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  disabled={busy}
                  onClick={() => void handleSaveSelectedWorkbookDraft()}
                >
                  Lưu nháp
                </Button>
              )}
              <Button onClick={() => setTableDialogOpen(false)} disabled={busy}>
                Đóng
              </Button>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, bgcolor: "background.paper", display: "flex", minHeight: 0, overflow: "hidden" }}>
          {selectedReportBlock ? (
            <Box
              sx={{
                flex: "1 1 auto",
                width: "100%",
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ flex: "1 1 auto", minHeight: 0, width: "100%", height: "100%" }}>
                <React.Suspense
                  fallback={(
                    <Stack sx={{ height: "100%" }} alignItems="center" justifyContent="center">
                      <CircularProgress size={24} />
                    </Stack>
                  )}
                >
                  <WorkbookDataGrid
                    ref={selectedWorkbookGridRef}
                    initialSpec={selectedRenderableBlock?.spec ?? selectedReportBlock.spec ?? detail.spec}
                    initialWorkbookData={
                      selectedWorkbookData.length > 0
                        ? selectedWorkbookData
                        : selectedRenderableBlock?.templateWorkbookData ?? detail.renderWorkbookData
                    }
                    dataRect={selectedReportBlock.dataRect ?? detail.dataRect}
                    excludedDataColumns={excludedDataColumns}
                    mode={canEditReportData ? "edit" : "view"}
                    readOnly={!canEditReportData}
                    saving={busy || isFetchingSelectedDynamicExcel}
                    showActions={false}
                    embeddedFullscreen
                    changeCommitMode="manual"
                    saveLabel="Lưu nháp"
                    backLabel="Đóng"
                    onBack={() => setTableDialogOpen(false)}
                    onChangeRaw={(rawWorkbookData, payload) => {
                      invalidateReportBlockSectionValidation(selectedReportBlock.blockId);
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
                      latestWorkbookRawRef.current = {
                        ...latestWorkbookRawRef.current,
                        [selectedReportBlock.blockId]: rawWorkbookData,
                      };
                    }}
                    onSave={(payload) => {
                      latestWorkbookPayloadRef.current = {
                        ...latestWorkbookPayloadRef.current,
                        [selectedReportBlock.blockId]: payload.values1D,
                      };
                      latestWorkbookIssuesRef.current = {
                        ...latestWorkbookIssuesRef.current,
                        [selectedReportBlock.blockId]: payload.validationIssues,
                      };
                      latestWorkbookRawRef.current = {
                        ...latestWorkbookRawRef.current,
                        [selectedReportBlock.blockId]: payload.rawWorkbookData,
                      };
                      void handleSaveDraft({
                        blockId: selectedReportBlock.blockId,
                        values1D: payload.values1D,
                        rawWorkbookData: payload.rawWorkbookData,
                        validationIssues: payload.validationIssues,
                      });
                    }}
                  />
                </React.Suspense>
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
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <Alert severity="info">Không có bảng dữ liệu để hiển thị.</Alert>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(sectionValidationPrompt?.open)}
        onClose={() => setSectionValidationPrompt(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Kiểm tra dữ liệu bảng?</DialogTitle>
        <DialogContent dividers>
          {sectionValidationPrompt && (
            <Stack spacing={1.5}>
              <Alert severity="info">
                Section {sectionValidationPrompt.section.title} có {sectionValidationPrompt.blockCount} bảng dữ liệu.
                Hệ thống chỉ kiểm tra các ô nhập dữ liệu trong bảng; tiêu đề, ô công thức, ô bỏ trống không nhập và phần template tự ghi đè sẽ được bỏ qua.
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Nên kiểm tra trước khi lưu hoặc nộp để biết rõ lỗi nằm ở bảng nào, ô nào và lý do không hợp lệ.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSectionValidationPrompt(null)}>Để sau</Button>
          <Button
            variant="contained"
            startIcon={<FactCheckOutlinedIcon />}
            onClick={() => {
              if (sectionValidationPrompt) {
                handleValidateReportSection(sectionValidationPrompt.section.id, "section-switch");
              }
            }}
          >
            Kiểm tra dữ liệu nhập trong bảng
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(tableValidationDialog?.open)}
        onClose={() => setTableValidationDialog(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Kiểm tra dữ liệu bảng</DialogTitle>
        <DialogContent dividers>
          {tableValidationDialog && (
            <Stack spacing={1.5}>
              <Alert severity={tableValidationDialog.issues.length > 0 ? "error" : "success"}>
                {tableValidationDialog.issues.length > 0
                  ? `Section ${tableValidationDialog.sectionTitle} có ${tableValidationDialog.issues.length} lỗi dữ liệu bảng.`
                  : `Section ${tableValidationDialog.sectionTitle} chưa phát hiện lỗi dữ liệu bảng.`}
                {" "}Hệ thống không kiểm tra title/header, ô bỏ trống không nhập, ô công thức hoặc dữ liệu template tự ghi đè.
              </Alert>

              {tableValidationDialog.issues.length > 0 && (
                <Stack spacing={1}>
                  {tableValidationDialog.issues.slice(0, 50).map((item, index) => (
                    <Box
                      key={`${item.block.blockId}_${item.issue.cellRef}_${index}`}
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 1,
                        bgcolor: "background.default",
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={0.75}
                          alignItems={{ xs: "flex-start", sm: "center" }}
                          justifyContent="space-between"
                        >
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                            <ErrorOutlineOutlinedIcon color="error" fontSize="small" />
                            <Chip size="small" variant="outlined" label={item.block.label} />
                            <Chip size="small" color="error" variant="outlined" label={item.issue.cellRef} />
                          </Stack>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<OpenInFullOutlinedIcon fontSize="small" />}
                            onClick={() => handleOpenValidationIssueBlock(item.block)}
                            sx={{ textTransform: "none" }}
                          >
                            Mở bảng
                          </Button>
                        </Stack>
                        <Typography variant="body2">
                          {formatWorkbookIssueForUser(item.issue)}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                  {tableValidationDialog.issues.length > 50 && (
                    <Alert severity="warning">
                      Đang hiển thị 50 lỗi đầu tiên. Hãy sửa theo từng bảng rồi kiểm tra lại section này.
                    </Alert>
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTableValidationDialog(null)}>Đóng</Button>
          {tableValidationDialog && (
            <Button
              variant="outlined"
              startIcon={<FactCheckOutlinedIcon />}
              onClick={() => handleValidateReportSection(tableValidationDialog.sectionId, tableValidationDialog.source)}
            >
              Kiểm tra lại section
            </Button>
          )}
          {tableValidationDialog?.issues[0] && (
            <Button
              variant="contained"
              startIcon={<OpenInFullOutlinedIcon />}
              onClick={() => handleOpenValidationIssueBlock(tableValidationDialog.issues[0].block)}
            >
              Mở bảng lỗi đầu tiên
            </Button>
          )}
        </DialogActions>
      </Dialog>

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

      <Dialog
        open={Boolean(aggregateMapPreview)}
        onClose={() => setAggregateMapPreview(null)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle>Xem trước báo cáo sau khi gán dữ liệu</DialogTitle>
        <DialogContent dividers sx={{ height: "78vh", p: 0 }}>
          {aggregateMapPreview ? (
            <Box sx={{ height: "100%", p: 2 }}>
              <WorkReportEditorPage
                workId={props.workId}
                reportId={aggregateMapPreview.id}
                previewData={aggregateMapPreview}
                forceReadOnly
                onBack={() => setAggregateMapPreview(null)}
              />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAggregateMapPreview(null)}>Đóng</Button>
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
