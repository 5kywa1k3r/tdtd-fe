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
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import { useBlocker } from "react-router-dom";

import DynamicExcelGridPreviewDialog from "../../../components/excel/fortune/DynamicExcelGridPreviewDialog";
import type {
  WorkbookDataGridHandle,
} from "../../../components/excel/fortune/WorkbookDataGrid";
import {
  extractTypedValues1D,
  hashWorkbookValues,
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
import { ActionToast, type ActionToastSeverity, type ActionToastState } from "../../../components/common/ActionToast";
import { UnsavedChangesDialog } from "../../../components/common/UnsavedChangesDialog";
import DynamicFlowMappingRuntimePanel, {
  isDynamicFlowPolicyReady,
} from "../../../components/works/flowRuntime/DynamicFlowMappingRuntimePanel";

import {
  useGetWorkAssignmentReportLogsQuery,
  useGetWorkAssignmentReportQuery,
  useGetWorkAssignmentReportSectionsQuery,
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
import {
  useGetDynamicFormQuery,
  type DynamicFormDetail,
} from "../../../api/dynamicFormApi";
import { useGetChildrenAssignmentsQuery } from "../../../api/workAssignmentApi";

import {
  getWorkAssignmentReportStatusLabel,
  getWorkReportPeriodStatusLabel,
  WorkAssignmentReportStatus,
} from "../../../types/reportStatus";
import type {
  DynamicFlowFieldPermission,
  DynamicFlowPolicyEvaluationResult,
  DynamicFlowTableColumnPermission,
  WorkAssignmentReportLogRow,
  WorkAssignmentReportResponse,
  WorkAssignmentReportSectionSummaryRow,
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
  type DynamicFormRuntimeFieldState,
  type DynamicFormRuntimeValue,
  type DynamicFormRuntimeValues,
} from "../../../features/dynamicForms/runtime/DynamicFormRuntimeFields";
import {
  getDateInputErrorText,
  isDateInputValueValid,
  normalizeDateInputValue,
  type DateInputMode,
} from "../../../utils/dateInputFormat";
import { normalizeApiError } from "../../../utils/apiError";
import { UITextKey, uiText } from '../../../constants/uiText';

const WorkbookDataGrid = React.lazy(() => import("../../../components/excel/fortune/WorkbookDataGrid"));

export interface WorkReportEditorPageProps {
  workId: string;
  reportId: string;
  workReportPeriodId?: string;
  forceReadOnly?: boolean;
  dynamicFlowRuntimeEnabled?: boolean;
  previewData?: WorkAssignmentReportResponse | null;
  onBack?: () => void;
  onSaved?: () => void;
  onSubmitted?: () => void;
}

type WorkbookSavePayload = {
  blockId?: string;
  values1D: ReportCellValue[];
  valuesHash?: string;
  rawWorkbookData?: any[];
  validationIssues?: WorkbookValueValidationIssue[];
};

type WorkbookValueMap = Record<string, ReportCellValue[]>;
type WorkbookHashMap = Record<string, string>;
type WorkbookValidationIssueMap = Record<string, WorkbookValueValidationIssue[]>;
type WorkbookRawDataMap = Record<string, any[]>;
type DirtyReportBlockMap = Record<string, boolean>;
type UnsavedTableCloseState = {
  open: boolean;
  blockId: string;
  blockLabel: string;
  payload: WorkbookSavePayload | null;
};
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

type RuntimeDecodeResult<T> =
  | { value: T; error: null }
  | { value: null; error: string | null };

const RUNTIME_FIELD_TYPES = new Set([
  "shortText",
  "longText",
  "richText",
  "stringList",
  "number",
  "date",
  "fullDate",
  "singleSelect",
  "multiSelect",
  "boolean",
]);
const RUNTIME_TABLE_MODES = new Set([
  "FIXED_GRID",
  "APPEND_ROWS",
  "APPEND_COLUMNS",
  "MATRIX",
  "SUMMARY_TEMPLATE",
]);
const RUNTIME_VALUE_SOURCES = new Set([
  "NONE",
  "FIXED_ENUM",
  "ENUM_CATALOG",
  "SYSTEM_UNIT",
  "SYSTEM_USER",
  "SYSTEM_POSITION",
  "SYSTEM_UNIT_TYPE",
]);
const RUNTIME_TABLE_DATA_TYPES = new Set([
  "NUMBER",
  "DATE",
  "FULL_DATE",
  "BOOLEAN",
  "SHORT_TEXT",
  "MULTI_SELECT",
  "IGNORE",
]);

function isRuntimeObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRuntimeJson(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} chứa JSON không hợp lệ.`);
  }
}

function parseRuntimeObjectJson(raw: string | null | undefined, label: string) {
  if (!raw?.trim()) return null;
  const value = parseRuntimeJson(raw, label);
  if (!isRuntimeObject(value)) {
    throw new Error(`${label} phải là một JSON object.`);
  }
  return value;
}

function parseRuntimeObjectArrayJson(raw: string | null | undefined, label: string) {
  if (!raw?.trim()) return [];
  const value = parseRuntimeJson(raw, label);
  if (!Array.isArray(value) || value.some((item) => !isRuntimeObject(item))) {
    throw new Error(`${label} phải là một mảng JSON object.`);
  }
  return value as Record<string, unknown>[];
}

function readRuntimeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function validatePublishedRuntimeIndexMap(
  value: unknown,
  blockId: string,
  maxValueCount: number,
  required: boolean,
) {
  if (value == null && !required) return;
  if (!Array.isArray(value) || (required && value.length === 0)) {
    throw new Error(`Block inline ${blockId} thiếu indexMap đã công bố.`);
  }
  const indexes = new Set<number>();
  const metricKeys = new Set<string>();
  value.forEach((item) => {
    if (!isRuntimeObject(item)) throw new Error(`indexMap của block ${blockId} chứa item không hợp lệ.`);
    const index = readRuntimeInteger(item.index);
    const rowKey = typeof item.rowKey === "string" ? item.rowKey.trim() : "";
    const columnKey = typeof item.columnKey === "string" ? item.columnKey.trim() : "";
    const metricKey = typeof item.metricKey === "string" ? item.metricKey.trim() : "";
    if (
      index == null ||
      index < 0 ||
      index >= maxValueCount ||
      indexes.has(index) ||
      !rowKey ||
      !columnKey ||
      !metricKey ||
      metricKeys.has(metricKey)
    ) {
      throw new Error(`indexMap của block ${blockId} không có index/key ổn định hợp lệ.`);
    }
    indexes.add(index);
    metricKeys.add(metricKey);
  });
}

function validatePublishedRuntimeBlockShape(
  block: Record<string, unknown>,
  blockId: string,
  tableMode: string,
  hasExternalTemplate: boolean,
) {
  const rect = isRuntimeObject(block.dataRect) ? block.dataRect : null;
  const r0 = readRuntimeInteger(rect?.r0);
  const c0 = readRuntimeInteger(rect?.c0);
  const r1 = readRuntimeInteger(rect?.r1);
  const c1 = readRuntimeInteger(rect?.c1);
  const width = readRuntimeInteger(block.w);
  const height = readRuntimeInteger(block.h);
  if (
    r0 == null || c0 == null || r1 == null || c1 == null ||
    r0 < 0 || c0 < 0 || r1 < r0 || c1 < c0 ||
    width == null || height == null || width <= 0 || height <= 0 ||
    width !== c1 - c0 + 1 || height !== r1 - r0 + 1
  ) {
    throw new Error(`Block runtime ${blockId} có dataRect/w/h không hợp lệ hoặc không đồng nhất.`);
  }

  const defaultDataType = typeof block.defaultDataType === "string"
    ? block.defaultDataType.trim().toUpperCase()
    : "";
  if (!RUNTIME_TABLE_DATA_TYPES.has(defaultDataType)) {
    throw new Error(`Block runtime ${blockId} thiếu defaultDataType được hỗ trợ.`);
  }

  validatePublishedRuntimeIndexMap(
    block.indexMap,
    blockId,
    width * height,
    !hasExternalTemplate,
  );

  if (block.spec != null && !isRuntimeObject(block.spec)) {
    throw new Error(`Đặc tả inline của block ${blockId} phải là object.`);
  }
  if (typeof block.specJson === "string") {
    parseRuntimeObjectJson(block.specJson, `Đặc tả block ${blockId}`);
  } else if (block.specJson != null) {
    throw new Error(`specJson của block ${blockId} phải là chuỗi JSON.`);
  }
  if (block.rawWorkbookData != null && !Array.isArray(block.rawWorkbookData)) {
    throw new Error(`Workbook inline của block ${blockId} phải là mảng.`);
  }
  if (typeof block.rawWorkbookDataJson === "string") {
    const workbook = parseRuntimeJson(block.rawWorkbookDataJson, `Workbook block ${blockId}`);
    if (!Array.isArray(workbook)) throw new Error(`Workbook block ${blockId} phải là một mảng.`);
  } else if (block.rawWorkbookDataJson != null) {
    throw new Error(`rawWorkbookDataJson của block ${blockId} phải là chuỗi JSON.`);
  }

  if (tableMode === "SUMMARY_TEMPLATE") {
    const sourceBlockId = typeof block.sourceBlockId === "string" ? block.sourceBlockId.trim() : "";
    if (!sourceBlockId || !Array.isArray(block.groupBy) || !Array.isArray(block.rowLayout)) {
      throw new Error(`Block SUMMARY_TEMPLATE ${blockId} thiếu sourceBlockId/groupBy/rowLayout.`);
    }
  }
}

function assertRuntimePayloadTemplate(
  raw: string | null | undefined,
  label: string,
  expectedTemplateId: string | null | undefined,
) {
  const value = parseRuntimeObjectJson(raw, label);
  if (!value || !expectedTemplateId) return;
  const embeddedId = typeof value.dynamicFormTemplateId === "string"
    ? value.dynamicFormTemplateId.trim()
    : "";
  if (embeddedId && embeddedId !== expectedTemplateId.trim()) {
    throw new Error(`${label} thuộc phiên bản biểu mẫu khác. Hãy tải lại báo cáo.`);
  }
}

function assertStrictValuesPayload(raw: string | null | undefined) {
  if (!raw?.trim()) return;
  const value = parseRuntimeJson(raw, "Dữ liệu bảng chính");
  if (Array.isArray(value)) return;
  if (
    isRuntimeObject(value) &&
    value.values1DCompressed === true &&
    Array.isArray(value.values1D) &&
    Number.isInteger(value.values1DLength)
  ) {
    return;
  }
  throw new Error("Dữ liệu bảng chính có cấu trúc không được hỗ trợ.");
}

/** Strict runtime decoder. Builder normalization deliberately remains permissive. */
export function decodeWorkReportRuntimeDetail(
  report: WorkAssignmentReportResponse,
): ParsedReportDetail {
  if (!report || typeof report !== "object") {
    throw new Error("Phản hồi báo cáo không hợp lệ.");
  }
  if (!Number.isInteger(report.payloadRevision) || report.payloadRevision < 0) {
    throw new Error("Payload revision của báo cáo không hợp lệ.");
  }
  if (!Number.isInteger(report.lifecycleRevision) || report.lifecycleRevision < 0) {
    throw new Error("Lifecycle revision của báo cáo không hợp lệ.");
  }

  assertStrictValuesPayload(report.values1DJson);
  assertRuntimePayloadTemplate(
    report.fieldValuesJson,
    "Dữ liệu trường biểu mẫu",
    report.dynamicFormTemplateId,
  );
  assertRuntimePayloadTemplate(
    report.tableValuesJson,
    "Dữ liệu bảng biểu mẫu",
    report.dynamicFormTemplateId,
  );

  const snapshot = parseRuntimeObjectJson(report.templateSnapshotJson, "Ảnh chụp mẫu báo cáo");
  if (snapshot) {
    if (typeof snapshot.specJson === "string") {
      parseRuntimeObjectJson(snapshot.specJson, "Đặc tả bảng trong ảnh chụp");
    } else if (snapshot.spec != null && !isRuntimeObject(snapshot.spec)) {
      throw new Error("Đặc tả bảng trong ảnh chụp không được hỗ trợ.");
    }
    if (typeof snapshot.rawWorkbookDataJson === "string") {
      const workbook = parseRuntimeJson(snapshot.rawWorkbookDataJson, "Workbook trong ảnh chụp");
      if (!Array.isArray(workbook)) throw new Error("Workbook trong ảnh chụp phải là một mảng.");
    } else if (snapshot.rawWorkbookData != null && !Array.isArray(snapshot.rawWorkbookData)) {
      throw new Error("Workbook trong ảnh chụp không được hỗ trợ.");
    }
  }

  const hasDynamicFormRuntime = Boolean(report.dynamicFormTemplateId?.trim());
  const hasTopLevelDynamicExcel = Boolean(report.dynamicExcelTemplateId?.trim());
  if (report.specJson?.trim()) {
    parseRuntimeObjectJson(report.specJson, "Đặc tả bảng báo cáo");
  } else if (!snapshot && (!hasDynamicFormRuntime || hasTopLevelDynamicExcel)) {
    throw new Error("Báo cáo thiếu đặc tả bảng đã công bố.");
  }

  try {
    return parseReportDetail(report);
  } catch {
    throw new Error("Không thể dựng workbook báo cáo từ dữ liệu đã lưu.");
  }
}

export function decodeDynamicFormRuntimeSchema(
  input: DynamicFormDetail,
  expectedTemplateId?: string | null,
): DynamicFormRuntimeSchema {
  if (!input || !isRuntimeObject(input.schema)) {
    throw new Error("Biểu mẫu thiếu schema runtime đã công bố.");
  }
  if (expectedTemplateId && input.id?.trim() !== expectedTemplateId.trim()) {
    throw new Error("Biểu mẫu trả về không khớp báo cáo hiện tại.");
  }
  if (input.isPublished !== true) {
    throw new Error("Báo cáo đang tham chiếu một phiên bản biểu mẫu chưa công bố.");
  }

  const { sections, fields, blocks } = input.schema;
  if (!Array.isArray(sections) || !Array.isArray(fields) || !Array.isArray(blocks)) {
    throw new Error("Schema runtime phải có sections, fields và blocks dạng mảng.");
  }
  if (sections.length === 0) throw new Error("Schema runtime không có section nào.");
  if (sections.some((item) => !isRuntimeObject(item))) {
    throw new Error("Schema runtime chứa section không hợp lệ.");
  }
  if (fields.some((item) => !isRuntimeObject(item))) {
    throw new Error("Schema runtime chứa field không hợp lệ.");
  }
  if (blocks.some((item) => !isRuntimeObject(item))) {
    throw new Error("Schema runtime chứa block không hợp lệ.");
  }

  const sectionIds = new Set<string>();
  sections.forEach((section, index) => {
    const id = typeof section.id === "string" ? section.id.trim() : "";
    if (!id || sectionIds.has(id)) {
      throw new Error(`Section runtime ${index + 1} thiếu ID hoặc bị trùng ID.`);
    }
    sectionIds.add(id);
  });

  const fieldIds = new Set<string>();
  fields.forEach((field, index) => {
    const id = typeof field.id === "string" ? field.id.trim() : "";
    const sectionId = typeof field.sectionId === "string" ? field.sectionId.trim() : "";
    if (!id || fieldIds.has(id) || !sectionIds.has(sectionId)) {
      throw new Error(`Field runtime ${index + 1} có ID/section không hợp lệ.`);
    }
    if (!RUNTIME_FIELD_TYPES.has(String(field.type ?? ""))) {
      throw new Error(`Field runtime ${id} dùng kiểu dữ liệu không được hỗ trợ: ${String(field.type ?? "trống")}.`);
    }
    const valueSource = isRuntimeObject(field.valueSource) ? field.valueSource : null;
    const sourceType = typeof valueSource?.sourceType === "string"
      ? valueSource.sourceType.trim().toUpperCase()
      : "";
    if (sourceType && !RUNTIME_VALUE_SOURCES.has(sourceType)) {
      throw new Error(`Field runtime ${id} dùng nguồn dữ liệu không được hỗ trợ.`);
    }
    fieldIds.add(id);
  });

  const blockIds = new Set<string>();
  const externalTemplateIds = new Set<string>();
  blocks.forEach((block, index) => {
    const blockId = typeof block.blockId === "string" ? block.blockId.trim() : "";
    const sectionId = typeof block.sectionId === "string" ? block.sectionId.trim() : "";
    if (!blockId || blockIds.has(blockId) || !sectionIds.has(sectionId)) {
      throw new Error(`Block runtime ${index + 1} có ID/section không hợp lệ.`);
    }
    if (!RUNTIME_TABLE_MODES.has(String(block.tableMode ?? ""))) {
      throw new Error(`Block runtime ${blockId} dùng table mode không được hỗ trợ: ${String(block.tableMode ?? "trống")}.`);
    }
    const dynamicExcelTemplateId = typeof block.dynamicExcelTemplateId === "string"
      ? block.dynamicExcelTemplateId.trim()
      : "";
    if (dynamicExcelTemplateId) {
      if (externalTemplateIds.has(dynamicExcelTemplateId)) {
        throw new Error(`Dynamic Excel template ${dynamicExcelTemplateId} bị tham chiếu lặp trong schema.`);
      }
      externalTemplateIds.add(dynamicExcelTemplateId);
    }
    validatePublishedRuntimeBlockShape(
      block,
      blockId,
      String(block.tableMode),
      Boolean(dynamicExcelTemplateId),
    );
    blockIds.add(blockId);
  });
  blocks.forEach((block) => {
    if (block.tableMode !== "SUMMARY_TEMPLATE") return;
    const blockId = String(block.blockId).trim();
    const sourceBlockId = typeof block.sourceBlockId === "string" ? block.sourceBlockId.trim() : "";
    if (!sourceBlockId || sourceBlockId === blockId || !blockIds.has(sourceBlockId)) {
      throw new Error(`Block SUMMARY_TEMPLATE ${blockId} tham chiếu sourceBlockId không hợp lệ.`);
    }
  });

  // Malformed legacy mirrors are still a contract error; do not silently prefer one representation.
  parseRuntimeObjectArrayJson(input.sectionsJson, "sectionsJson");
  parseRuntimeObjectArrayJson(input.fieldsJson, "fieldsJson");
  if (input.blocksJson?.trim()) parseRuntimeObjectArrayJson(input.blocksJson, "blocksJson");
  if (input.excelBlockJson?.trim()) parseRuntimeObjectJson(input.excelBlockJson, "excelBlockJson");

  return buildEditorValue({
    ...input,
    sectionsJson: JSON.stringify(sections),
    fieldsJson: JSON.stringify(fields),
    blocksJson: JSON.stringify(blocks),
    excelBlockJson: blocks[0] ? JSON.stringify(blocks[0]) : null,
  });
}

export function decodeRuntimeWorkbook(
  input: {
    id?: string | null;
    tableMode?: string | null;
    rawWorkbookDataJson?: string | null;
    specJson?: string | null;
  },
  expectedTemplateId: string,
) {
  if (input.id?.trim() !== expectedTemplateId.trim()) {
    throw new Error("Workbook trả về không khớp block đang mở.");
  }
  if (!new Set(["FIXED_GRID", "APPEND_ROWS", "APPEND_COLUMNS"]).has(String(input.tableMode ?? ""))) {
    throw new Error("Workbook dùng table mode không được hỗ trợ.");
  }
  const rawWorkbook = parseRuntimeJson(input.rawWorkbookDataJson ?? "", "Workbook động");
  const spec = parseRuntimeObjectJson(input.specJson, "Đặc tả workbook động");
  if (!Array.isArray(rawWorkbook) || rawWorkbook.length === 0) {
    throw new Error("Workbook động phải là một mảng không rỗng.");
  }
  if (!spec) throw new Error("Workbook động thiếu đặc tả.");
  return { rawWorkbook, spec };
}

function isSupportedRuntimeCellValue(value: unknown) {
  return (
    value == null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

function validateRuntimeFieldValue(field: DynamicFormField, value: unknown) {
  if (value == null) return true;
  if (field.type === "boolean") return typeof value === "boolean";
  if (field.type === "number") return typeof value === "number" && Number.isFinite(value);
  if (field.type === "multiSelect" || field.type === "stringList") {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
  }
  return typeof value === "string";
}

function validateRuntimeAxisRecords(
  block: Record<string, unknown>,
  property: "rows" | "columns",
  idProperty: "rowInstanceId" | "columnInstanceId",
  orderProperty: "rowOrder" | "columnOrder",
) {
  const value = block[property];
  if (value == null) return;
  if (!Array.isArray(value) || value.some((item) => !isRuntimeObject(item))) {
    throw new Error(`Dữ liệu ${property} của block runtime không hợp lệ.`);
  }
  const ids = new Set<string>();
  value.forEach((item) => {
    const id = typeof item[idProperty] === "string" ? item[idProperty].trim() : "";
    if (!id || ids.has(id) || !Number.isInteger(item[orderProperty])) {
      throw new Error(`Dữ liệu ${property} của block runtime thiếu ID/order ổn định.`);
    }
    if (!isRuntimeObject(item.cells) || Object.values(item.cells).some((cell) => !isSupportedRuntimeCellValue(cell))) {
      throw new Error(`Dữ liệu cells của ${id} không hợp lệ.`);
    }
    ids.add(id);
  });
}

/** Verifies persisted envelopes after both the report and published schema are available. */
export function validateWorkReportPayloadAgainstSchema(
  report: WorkAssignmentReportResponse,
  form: DynamicFormRuntimeSchema,
  publishedForm: DynamicFormDetail,
) {
  const reportTemplateId = report.dynamicFormTemplateId?.trim() ?? "";
  const reportFamilyId = report.dynamicFormFamilyId?.trim() ?? "";
  const reportSchemaHash = report.dynamicFormSchemaHash?.trim() ?? "";
  const publishedTemplateId = publishedForm.id?.trim() ?? "";
  const publishedFamilyId = publishedForm.familyId?.trim() ?? "";
  const publishedSchemaHash = publishedForm.publishedSchemaHash?.trim() ?? "";
  if (
    !reportTemplateId ||
    !publishedTemplateId ||
    reportTemplateId !== publishedTemplateId ||
    publishedForm.isPublished !== true
  ) {
    throw new Error("Báo cáo không tham chiếu đúng phiên bản biểu mẫu đã công bố.");
  }
  if (!reportFamilyId || !publishedFamilyId || reportFamilyId !== publishedFamilyId) {
    throw new Error("Họ biểu mẫu đã công bố của báo cáo không khớp. Hãy tải lại báo cáo.");
  }
  if (
    !Number.isInteger(report.dynamicFormVersionNo) ||
    !Number.isInteger(publishedForm.versionNo) ||
    report.dynamicFormVersionNo !== publishedForm.versionNo
  ) {
    throw new Error("Phiên bản biểu mẫu đã công bố của báo cáo không khớp. Hãy tải lại báo cáo.");
  }
  if (!reportSchemaHash || !publishedSchemaHash || reportSchemaHash !== publishedSchemaHash) {
    throw new Error("Hash schema biểu mẫu đã công bố của báo cáo không khớp. Hãy tải lại báo cáo.");
  }

  const fieldEnvelope = parseRuntimeObjectJson(report.fieldValuesJson, "Dữ liệu trường biểu mẫu");
  if (fieldEnvelope) {
    const values = Object.prototype.hasOwnProperty.call(fieldEnvelope, "values")
      ? fieldEnvelope.values
      : fieldEnvelope;
    if (!isRuntimeObject(values)) {
      throw new Error("Dữ liệu trường biểu mẫu phải có values dạng object.");
    }
    if (
      fieldEnvelope.schemaVersion != null &&
      Number(fieldEnvelope.schemaVersion) !== Number(form.schemaVersion)
    ) {
      throw new Error("Dữ liệu trường biểu mẫu dùng schema version cũ. Hãy tải lại báo cáo.");
    }
    const fieldsById = new Map(form.fields.map((field) => [field.id, field]));
    Object.entries(values).forEach(([fieldId, value]) => {
      const field = fieldsById.get(fieldId);
      if (!field) throw new Error(`Dữ liệu chứa field không còn trong schema: ${fieldId}.`);
      if (!validateRuntimeFieldValue(field, value)) {
        throw new Error(`Giá trị đã lưu của field ${fieldId} không đúng kiểu ${field.type}.`);
      }
    });
  }

  const tableEnvelope = parseRuntimeObjectJson(report.tableValuesJson, "Dữ liệu bảng biểu mẫu");
  if (!tableEnvelope) return true;
  if (!Array.isArray(tableEnvelope.blocks) || tableEnvelope.blocks.some((item) => !isRuntimeObject(item))) {
    throw new Error("Dữ liệu bảng biểu mẫu phải có blocks dạng mảng object.");
  }

  const schemaBlocks = parseRuntimeObjectArrayJson(form.blocksJson, "Schema blocks runtime");
  const modesByBlockId = new Map(
    schemaBlocks.map((block) => [String(block.blockId ?? "").trim(), String(block.tableMode ?? "")]),
  );
  const seen = new Set<string>();
  tableEnvelope.blocks.forEach((block) => {
    const blockId = typeof block.blockId === "string" ? block.blockId.trim() : "";
    const tableMode = typeof block.tableMode === "string" ? block.tableMode.trim() : "";
    const schemaMode = modesByBlockId.get(blockId);
    if (!blockId || seen.has(blockId) || !schemaMode) {
      throw new Error(`Dữ liệu bảng chứa block thiếu, trùng hoặc không còn trong schema: ${blockId || "trống"}.`);
    }
    if (!RUNTIME_TABLE_MODES.has(tableMode) || tableMode !== schemaMode) {
      throw new Error(`Table mode đã lưu của block ${blockId} không khớp schema.`);
    }
    if (tableMode === "SUMMARY_TEMPLATE") {
      throw new Error(`Block kết quả chỉ đọc ${blockId} không được chứa dữ liệu nhập.`);
    }
    if (!Array.isArray(block.values1D) || block.values1D.some((value: unknown) => !isSupportedRuntimeCellValue(value))) {
      throw new Error(`values1D của block ${blockId} không hợp lệ.`);
    }
    if (block.valueSlots != null) {
      if (
        !Array.isArray(block.valueSlots) ||
        block.valueSlots.some((slot: unknown) => !isRuntimeObject(slot) || !Number.isInteger(slot.index))
      ) {
        throw new Error(`valueSlots của block ${blockId} không hợp lệ.`);
      }
    }
    if (tableMode === "APPEND_ROWS") {
      validateRuntimeAxisRecords(block, "rows", "rowInstanceId", "rowOrder");
      if (block.columns != null) throw new Error(`Block ${blockId} không được chứa columns.`);
    } else if (tableMode === "APPEND_COLUMNS") {
      validateRuntimeAxisRecords(block, "columns", "columnInstanceId", "columnOrder");
      if (block.rows != null) throw new Error(`Block ${blockId} không được chứa rows.`);
    } else if (block.rows != null || block.columns != null) {
      throw new Error(`Block ${blockId} không hỗ trợ rows/columns động.`);
    }
    seen.add(blockId);
  });
  return true;
}

function decodeSafely<T>(factory: () => T): RuntimeDecodeResult<T> {
  try {
    return { value: factory(), error: null };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : "Dữ liệu runtime không hợp lệ.",
    };
  }
}

const DEFAULT_REPORT_DATA_ORIGIN: WorkReportDataOrigin = "MANUAL_INPUT";
const DEFAULT_REPORT_CUMULATIVE_CONTRIBUTION_MODE: WorkReportCumulativeContributionMode = "INCLUDE";

const REPORT_DATA_ORIGIN_OPTIONS: Array<{ value: WorkReportDataOrigin; label: string }> = [
  { value: DEFAULT_REPORT_DATA_ORIGIN, label: "Nhập tay" },
  { value: "AUTO_SUMMARY", label: "Dữ liệu tổng hợp đã gắn" },
  { value: "COPIED_SUMMARY", label: "Dữ liệu tổng hợp đã sao chép" },
  { value: "PARTIAL_MAPPING", label: "Gán một phần từ tổng hợp" },
];

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

  if (field.type === "stringList") {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
  }

  if (field.type === "longText") {
    if (value == null) return null;
    const text = String(value);
    return text === "" ? null : text;
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
  updatedAtUtc?: string,
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
    updatedAtUtc: updatedAtUtc ?? new Date().toISOString(),
  });
}

export function resolveWorkReportRuntimeCapabilities(
  detail: Pick<WorkAssignmentReportResponse, "canEditPayload" | "canSubmit" | "canWithdraw"> | null,
  forceReadOnly: boolean,
  runtimeWriteBlocked: boolean,
) {
  return {
    canEdit: Boolean(detail?.canEditPayload === true && !forceReadOnly && !runtimeWriteBlocked),
    canSubmit: Boolean(detail?.canSubmit === true && !forceReadOnly && !runtimeWriteBlocked),
    canWithdraw: Boolean(detail?.canWithdraw === true && !forceReadOnly),
  };
}

export function hasPendingLifecycleProjection(
  value: Pick<WorkAssignmentReportResponse, "lifecycleProjectionPending" | "lifecycleCommitState"> | null | undefined,
) {
  return Boolean(
    value?.lifecycleProjectionPending === true ||
    value?.lifecycleCommitState === "COMMITTED_PENDING_PROJECTION",
  );
}

type ReportSaveLifecycle = "clean" | "dirty" | "saving" | "saved" | "conflict";

type PendingPayloadCommand = {
  commandId: string;
  expectedPayloadRevision: number;
  expectedLifecycleRevision?: number;
};

type PendingLifecycleCommand = PendingPayloadCommand & {
  expectedLifecycleRevision: number;
};

type PersistedReportDraft = {
  basePayloadRevision: number;
  baseLifecycleRevision: number;
  updatedAtUtc: string;
  fieldValues: DynamicFormRuntimeValues;
  workbookValuesByBlock: WorkbookValueMap;
  workbookRawDataByBlock: WorkbookRawDataMap;
  rowLabelsByBlock: Record<string, Array<{
    sheetId?: string | null;
    rowKey?: string | null;
    rowIndex?: number | null;
    rowLabelCodes?: string[] | null;
    locked?: boolean | null;
    source?: string | null;
  }>>;
  appendAxisStates: Record<string, {
    mode: "APPEND_ROWS" | "APPEND_COLUMNS";
    instanceIds: Array<string | null>;
  }>;
  lateReason: string;
  completedDate: string;
  dataOrigin: WorkReportDataOrigin;
  cumulativeContributionMode: WorkReportCumulativeContributionMode;
  activeSectionId: string;
};

function cloneRuntimeDraftValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function isPersistedReportDraft(value: unknown): value is PersistedReportDraft {
  if (!isRuntimeObject(value)) return false;
  if (!(
    Number.isInteger(value.basePayloadRevision) &&
    Number.isInteger(value.baseLifecycleRevision) &&
    typeof value.updatedAtUtc === "string" &&
    isRuntimeObject(value.fieldValues) &&
    isRuntimeObject(value.workbookValuesByBlock) &&
    isRuntimeObject(value.workbookRawDataByBlock) &&
    isRuntimeObject(value.rowLabelsByBlock) &&
    isRuntimeObject(value.appendAxisStates) &&
    typeof value.lateReason === "string" &&
    typeof value.completedDate === "string" &&
    typeof value.dataOrigin === "string" &&
    typeof value.cumulativeContributionMode === "string" &&
    typeof value.activeSectionId === "string"
  )) return false;

  if (Object.values(value.fieldValues).some((item) => !isSupportedRuntimeCellValue(item))) return false;
  if (
    Object.values(value.workbookValuesByBlock).some(
      (items) => !Array.isArray(items) || items.some((item) => !isSupportedRuntimeCellValue(item)),
    )
  ) return false;
  if (Object.values(value.workbookRawDataByBlock).some((items) => !Array.isArray(items))) return false;
  if (
    Object.values(value.rowLabelsByBlock).some(
      (rows) => !Array.isArray(rows) || rows.some((row) => (
        !isRuntimeObject(row) ||
        (row.rowLabelCodes != null && (
          !Array.isArray(row.rowLabelCodes) ||
          row.rowLabelCodes.some((code: unknown) => typeof code !== "string")
        ))
      )),
    )
  ) return false;
  if (
    Object.values(value.appendAxisStates).some((state) => (
      !isRuntimeObject(state) ||
      (state.mode !== "APPEND_ROWS" && state.mode !== "APPEND_COLUMNS") ||
      !Array.isArray(state.instanceIds) ||
      state.instanceIds.some((id: unknown) => id !== null && typeof id !== "string")
    ))
  ) return false;
  if (!["MANUAL_INPUT", "AUTO_SUMMARY", "COPIED_SUMMARY", "PARTIAL_MAPPING"].includes(value.dataOrigin)) {
    return false;
  }
  return value.cumulativeContributionMode === "INCLUDE" || value.cumulativeContributionMode === "EXCLUDE";
}

export function createPayloadCommandId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createPendingRuntimeCommand(
  expectedPayloadRevision: number,
  expectedLifecycleRevision?: number,
): PendingPayloadCommand | PendingLifecycleCommand {
  return {
    expectedPayloadRevision,
    ...(expectedLifecycleRevision === undefined ? {} : { expectedLifecycleRevision }),
    commandId: createPayloadCommandId(),
  };
}

export function buildRebasedRuntimeCommandState(snapshot: {
  payloadRevision: number;
  lifecycleRevision: number;
}) {
  return {
    payloadRevision: snapshot.payloadRevision,
    lifecycleRevision: snapshot.lifecycleRevision,
    pendingCommands: {} as Record<string, PendingPayloadCommand>,
  };
}

function getReportDraftStorageKey(reportId: string) {
  return `tdtd:p3-report-draft:${reportId}`;
}

function getReportActiveSectionStorageKey(reportId: string) {
  return `tdtd:p3-report-active-section:${reportId}`;
}

function readPersistedReportActiveSection(reportId: string) {
  try {
    return sessionStorage.getItem(getReportActiveSectionStorageKey(reportId))?.trim() || null;
  } catch {
    return null;
  }
}

function persistReportActiveSection(reportId: string, sectionId: string) {
  try {
    sessionStorage.setItem(getReportActiveSectionStorageKey(reportId), sectionId);
  } catch {
    // Storage may be unavailable in private/restricted browser contexts.
  }
}

function removePersistedReportDraft(reportId: string) {
  try {
    sessionStorage.removeItem(getReportDraftStorageKey(reportId));
  } catch {
    // Storage may be unavailable in private/restricted browser contexts.
  }
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

export type ReportExcelBlockRuntime = {
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
  rows?: Array<{
    rowInstanceId?: string | null;
    rowOrder?: number | null;
  }> | null;
  columns?: Array<{
    columnInstanceId?: string | null;
    columnOrder?: number | null;
  }> | null;
  statisticsDisabled?: boolean | null;
  statisticsInputCellCount?: number | null;
  statisticsInputCellLimit?: number | null;
  statisticsDisabledReason?: string | null;
};

export type ReportAppendAxisMode = "APPEND_ROWS" | "APPEND_COLUMNS";

export type ReportAppendAxisState = {
  mode: ReportAppendAxisMode;
  instanceIds: Array<string | null>;
};

type ReportAppendAxisStateMap = Record<string, ReportAppendAxisState>;

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
    helper: "Dùng để ghi số lượng báo cáo, dòng hoặc ô có dữ liệu. Nhóm giá trị văn bản ngắn/chọn một/chọn nhiều xem ở thống kê trường/bảng.",
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

  return "Dữ liệu được lấy tự động theo cùng biểu mẫu động. Mặc định: số lấy tổng, ngày lấy giá trị muộn nhất, văn bản ngắn/chọn một đếm theo nhóm, danh sách chọn nhiều + đếm; phần chi tiết tải khi mở.";
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
  return tableModeLabels[mode] ?? "Kiểu bảng chưa hỗ trợ";
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
  return `Bảng có ${inputCellCount} ô nhập, vượt ngưỡng thống kê nền ${TABLE_STATISTIC_INPUT_CELL_LIMIT}; hệ thống không ghi dữ liệu đọc nền từng ô, nhưng thống kê cơ bản vẫn tổng hợp trực tiếp từ báo cáo đã duyệt nếu không vượt ${DESIGNER_LIMITS.MAX_DIRECT_AGGREGATE_INPUT_CELLS} ô nhập.`;
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

function getStoredReportTableValuesBlock(
  tableValuesJson: string | null | undefined,
  blockId: string,
) {
  const target = normalizeBlockId(blockId);
  return getReportTableValuesBlocks(tableValuesJson).find(
    (item) => normalizeBlockId(item.blockId) === target,
  ) ?? null;
}

function getStoredBlockValues(tableValuesJson: string | null | undefined, blockId: string) {
  const block = getStoredReportTableValuesBlock(tableValuesJson, blockId);
  return readTableBlockValues1D(block) as ReportCellValue[] | null;
}

function getStoredBlockRuntimeShape(
  tableValuesJson: string | null | undefined,
  blockId: string,
) {
  const block = getStoredReportTableValuesBlock(tableValuesJson, blockId);
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
  const block = getStoredReportTableValuesBlock(tableValuesJson, blockId);
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

function resolveStoredReportBlockValues(
  detail: ParsedReportDetail,
  block: ReportExcelBlockRuntime,
  topLevelBlockId: string,
) {
  const expectedLength = getExpectedValueLength(block);
  if (block.blockId === topLevelBlockId) {
    return normalizeWorkbookValues(detail.values1D, expectedLength);
  }

  return normalizeWorkbookValues(
    getStoredBlockValues(detail.tableValuesJson, block.blockId),
    expectedLength,
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

  return resolveStoredReportBlockValues(detail, block, topLevelBlockId);
}

function getReportAppendAxisMode(
  block?: ReportExcelBlockRuntime | null,
): ReportAppendAxisMode | null {
  const mode = getReportBlockTableMode(block);
  return mode === "APPEND_ROWS" || mode === "APPEND_COLUMNS" ? mode : null;
}

function getReportAppendAxisCapacity(
  block: ReportExcelBlockRuntime,
  mode: ReportAppendAxisMode,
) {
  const refs = buildInputCellRefs(block.dataRect, block.spec);
  const offsets = new Set(
    refs.map((ref) => mode === "APPEND_ROWS" ? ref.rowOffset : ref.colOffset),
  );
  return offsets.size === 0
    ? 0
    : Math.max(...offsets) + 1;
}

function getReportAppendAxisAvailableSlots(
  block: ReportExcelBlockRuntime,
  mode: ReportAppendAxisMode,
) {
  const refs = buildInputCellRefs(block.dataRect, block.spec);
  return Array.from(
    new Set(refs.map((ref) => mode === "APPEND_ROWS" ? ref.rowOffset : ref.colOffset)),
  ).sort((a, b) => a - b);
}

function buildFallbackAppendAxisInstanceId(
  blockId: string,
  mode: ReportAppendAxisMode,
  slot: number,
) {
  const axis = mode === "APPEND_ROWS" ? "row" : "column";
  return `${normalizeMetricPart(blockId, "excel_block")}:${axis}:${slot + 1}`;
}

function createAppendAxisInstanceId(
  blockId: string,
  mode: ReportAppendAxisMode,
) {
  const axis = mode === "APPEND_ROWS" ? "row" : "column";
  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${normalizeMetricPart(blockId, "excel_block")}:${axis}:${id}`;
}

export function buildReportAppendAxisState(
  block: ReportExcelBlockRuntime,
  tableValuesJson?: string | null,
  fallbackValues?: ReportCellValue[] | null,
  fallbackRowLabels?: ReportRuntimeRowLabel[] | null,
): ReportAppendAxisState | null {
  const mode = getReportAppendAxisMode(block);
  if (!mode) return null;

  const capacity = getReportAppendAxisCapacity(block, mode);
  const instanceIds = Array<string | null>(capacity).fill(null);
  const storedBlock = getStoredReportTableValuesBlock(tableValuesJson, block.blockId);
  const storedInstances = mode === "APPEND_ROWS"
    ? (storedBlock?.rows ?? []).map((item) => ({
        order: item.rowOrder,
        instanceId: item.rowInstanceId,
      }))
    : (storedBlock?.columns ?? []).map((item) => ({
        order: item.columnOrder,
        instanceId: item.columnInstanceId,
      }));

  for (const item of storedInstances) {
    const slot = Number(item.order) - 1;
    if (!Number.isInteger(slot) || slot < 0 || slot >= capacity || !item.instanceId?.trim()) continue;
    instanceIds[slot] = item.instanceId.trim();
  }

  if (instanceIds.some(Boolean)) return { mode, instanceIds };

  const values = normalizeWorkbookValues(fallbackValues, getExpectedValueLength(block));
  const refs = buildInputCellRefs(block.dataRect, block.spec);
  const labeledRows = new Set(
    normalizeRuntimeRowLabels(fallbackRowLabels).map((row) => Number(row.rowIndex) - block.dataRect.r0),
  );
  for (const slot of getReportAppendAxisAvailableSlots(block, mode)) {
    const hasValue = refs.some((ref) => {
      const refSlot = mode === "APPEND_ROWS" ? ref.rowOffset : ref.colOffset;
      return refSlot === slot && !isBlankReportCellValue(values[ref.index]);
    });
    const hasLabel = mode === "APPEND_ROWS" && labeledRows.has(slot);
    if (hasValue || hasLabel) {
      instanceIds[slot] = buildFallbackAppendAxisInstanceId(block.blockId, mode, slot);
    }
  }

  return { mode, instanceIds };
}

function buildInitialReportAppendAxisStates(
  detail: ParsedReportDetail,
  blocks: ReportExcelBlockRuntime[],
  topLevelBlockId: string,
  rowLabelsByBlock: RowLabelStateMap,
) {
  const entries = blocks.flatMap((block) => {
    const state = buildReportAppendAxisState(
      block,
      detail.tableValuesJson,
      resolveStoredReportBlockValues(detail, block, topLevelBlockId),
      rowLabelsByBlock[block.blockId],
    );
    return state ? [[block.blockId, state] as const] : [];
  });
  return Object.fromEntries(entries) as ReportAppendAxisStateMap;
}

export function clearReportAppendAxisValues(
  block: ReportExcelBlockRuntime,
  values: ReportCellValue[],
  mode: ReportAppendAxisMode,
  slot: number,
) {
  const next = normalizeWorkbookValues(values, getExpectedValueLength(block));
  buildInputCellRefs(block.dataRect, block.spec).forEach((ref) => {
    const refSlot = mode === "APPEND_ROWS" ? ref.rowOffset : ref.colOffset;
    if (refSlot === slot) next[ref.index] = null;
  });
  return next;
}

export function swapReportAppendAxisValues(
  block: ReportExcelBlockRuntime,
  values: ReportCellValue[],
  mode: ReportAppendAxisMode,
  firstSlot: number,
  secondSlot: number,
) {
  const refs = buildInputCellRefs(block.dataRect, block.spec);
  const current = normalizeWorkbookValues(values, refs.length);
  const next = [...current];
  const byCoordinate = new Map<string, DynamicExcelInputCellRef>();
  refs.forEach((ref) => {
    const slot = mode === "APPEND_ROWS" ? ref.rowOffset : ref.colOffset;
    const crossAxis = mode === "APPEND_ROWS" ? ref.colOffset : ref.rowOffset;
    byCoordinate.set(`${slot}:${crossAxis}`, ref);
  });

  const crossAxisOffsets = new Set(
    refs
      .filter((ref) => {
        const slot = mode === "APPEND_ROWS" ? ref.rowOffset : ref.colOffset;
        return slot === firstSlot || slot === secondSlot;
      })
      .map((ref) => mode === "APPEND_ROWS" ? ref.colOffset : ref.rowOffset),
  );

  crossAxisOffsets.forEach((crossAxis) => {
    const first = byCoordinate.get(`${firstSlot}:${crossAxis}`);
    const second = byCoordinate.get(`${secondSlot}:${crossAxis}`);
    if (first) next[first.index] = second ? current[second.index] : null;
    if (second) next[second.index] = first ? current[first.index] : null;
  });

  return next;
}

function buildInactiveAppendAxisCellKeys(
  block: ReportExcelBlockRuntime | null,
  state?: ReportAppendAxisState | null,
) {
  if (!block || !state) return [];
  return buildInputCellRefs(block.dataRect, block.spec)
    .filter((ref) => {
      const slot = state.mode === "APPEND_ROWS" ? ref.rowOffset : ref.colOffset;
      return !state.instanceIds[slot];
    })
    .map((ref) => `${ref.r}:${ref.c}`);
}

function buildStoredWorkbookHashByBlock(
  detail: ParsedReportDetail,
  blocks: ReportExcelBlockRuntime[],
  topLevelBlockId: string,
) {
  return Object.fromEntries(
    blocks.map((block) => [
      block.blockId,
      hashWorkbookValues(
        resolveStoredReportBlockValues(detail, block, topLevelBlockId),
        getExpectedValueLength(block),
      ),
    ]),
  ) as WorkbookHashMap;
}

const REPORT_ROW_LABEL_HASH_SEED = 2166136261;

function appendReportRowLabelHashText(hash: number, text: string) {
  let next = hash;
  for (let i = 0; i < text.length; i += 1) {
    next ^= text.charCodeAt(i);
    next = Math.imul(next, 16777619);
  }
  return next >>> 0;
}

function hashReportRowLabels(rowLabels?: ReportRuntimeRowLabel[] | null) {
  const normalized = normalizeRuntimeRowLabels(rowLabels);
  let hash = REPORT_ROW_LABEL_HASH_SEED;
  for (const row of normalized) {
    hash = appendReportRowLabelHashText(hash, `r:${Number(row.rowIndex ?? 0)}|`);
    const codes = normalizeLabelCodes(row.rowLabelCodes ?? []);
    hash = appendReportRowLabelHashText(hash, `c:${codes.length}|`);
    for (const code of codes) {
      hash = appendReportRowLabelHashText(hash, `${code.length}:${code}|`);
    }
  }
  return appendReportRowLabelHashText(hash, `len:${normalized.length}|`).toString(36);
}

function buildRowLabelHashByBlock(
  blocks: ReportExcelBlockRuntime[],
  rowLabelsByBlock: RowLabelStateMap,
) {
  return Object.fromEntries(
    blocks.map((block) => [
      block.blockId,
      hashReportRowLabels(rowLabelsByBlock[block.blockId]),
    ]),
  ) as WorkbookHashMap;
}

function getWorkbookPayloadHash(
  block: ReportExcelBlockRuntime,
  payload: WorkbookSavePayload,
) {
  return payload.valuesHash ?? hashWorkbookValues(payload.values1D, getExpectedValueLength(block));
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
  if (getReportBlockTableMode(block) === "SUMMARY_TEMPLATE") return [];

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

export function buildTableValuesJson(
  detail: ParsedReportDetail,
  form: DynamicFormRuntimeSchema | null,
  blocks: ReportExcelBlockRuntime[],
  valuesByBlock: WorkbookValueMap,
  rowLabelsByBlock: RowLabelStateMap,
  appendAxisStates: ReportAppendAxisStateMap = {},
) {
  if (!detail.dynamicFormTemplateId || !form) return detail.tableValuesJson ?? null;

  const tableBlocks = blocks
    .filter((block) => getReportBlockTableMode(block) !== "SUMMARY_TEMPLATE")
    .map((block) =>
      block.excelBlock
        ? buildTableValuesBlock(
            block,
            valuesByBlock[block.blockId] ?? [],
            rowLabelsByBlock[block.blockId],
            appendAxisStates[block.blockId],
          )
        : null,
    )
    .filter((block): block is NonNullable<typeof block> => Boolean(block));

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
  appendAxisStates: ReportAppendAxisStateMap = {},
) {
  const tableBlock = buildTableValuesBlock(
    block,
    valuesByBlock[block.blockId] ?? [],
    rowLabelsByBlock[block.blockId],
    appendAxisStates[block.blockId],
  );
  return tableBlock ? JSON.stringify(tableBlock) : null;
}

function hashReportAppendAxisState(state?: ReportAppendAxisState | null) {
  if (!state) return "none";
  return `${state.mode}:${state.instanceIds.map((id) => id ?? "-").join("|")}`;
}

export function buildTableValuesBlock(
  block: ReportExcelBlockRuntime,
  values1D: ReportCellValue[],
  runtimeRowLabels?: ReportRuntimeRowLabel[],
  appendAxisState?: ReportAppendAxisState | null,
) {
  const excelBlock = block.excelBlock;
  if (!excelBlock) return null;

  const tableMode = normalizeTableMode(excelBlock.tableMode);
  if (tableMode === "SUMMARY_TEMPLATE") return null;

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
  const valueSlots = inputCellRefs.map((ref) => ({
    index: ref.index,
    rowKey: ref.rowKey,
    columnKey: ref.columnKey,
    rowOffset: ref.rowOffset,
    columnOffset: ref.colOffset,
    row: ref.r,
    column: ref.c,
  }));
  const matchingAppendAxisState = appendAxisState?.mode === tableMode ? appendAxisState : null;
  const appendRows = buildAppendRowsTableRecords(
    tableMode,
    blockId,
    dataRect,
    tableValues,
    rowLabels,
    inputCellRefs,
    matchingAppendAxisState?.instanceIds,
  );
  const appendColumns = buildAppendColumnsTableRecords(
    tableMode,
    blockId,
    dataRect,
    tableValues,
    inputCellRefs,
    matchingAppendAxisState?.instanceIds,
  );
  const matrixCells = buildMatrixTableCellRecords(tableMode, blockId, dataRect, tableValues, indexMap, inputCellRefs);

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
    valueSlots,
    metricDefinitions,
    rowLabels,
    ...(tableMode === "APPEND_ROWS" ? { rows: appendRows } : {}),
    ...(tableMode === "APPEND_COLUMNS" ? { columns: appendColumns } : {}),
    ...(tableMode === "MATRIX" ? { cells: matrixCells } : {}),
  }, tableValues);
}

function buildAppendRowsTableRecords(
  tableMode: DynamicFormTableMode,
  blockId: string,
  dataRect: ExcelBlockDataRect | null,
  tableValues: ReportCellValue[],
  rowLabels: ReportRuntimeRowLabel[],
  inputCellRefs: DynamicExcelInputCellRef[],
  instanceIds?: Array<string | null>,
) {
  if (tableMode !== "APPEND_ROWS" || !dataRect) return [];

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return [];

  return Array.from({ length: height }, (_, rowOffset) => {
    const absoluteRow = dataRect.r0 + rowOffset;
    const refs = inputCellRefs.filter((ref) => ref.r === absoluteRow);
    const configuredInstanceId = instanceIds?.[rowOffset]?.trim() || null;
    if (instanceIds && !configuredInstanceId) return null;
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
      rowInstanceId:
        configuredInstanceId ??
        `${normalizeMetricPart(blockId, "excel_block")}:row:${absoluteRow + 1}`,
      rowOrder: rowOffset + 1,
      rowKey: `sheet_1:R${absoluteRow + 1}`,
      rowLabelCodes,
      cells,
    };
  }).filter((row): row is NonNullable<typeof row> => Boolean(
    row && (Boolean(instanceIds) || Object.keys(row.cells).length > 0 || row.rowLabelCodes.length > 0),
  ));
}

function buildAppendColumnsTableRecords(
  tableMode: DynamicFormTableMode,
  blockId: string,
  dataRect: ExcelBlockDataRect | null,
  tableValues: ReportCellValue[],
  inputCellRefs: DynamicExcelInputCellRef[],
  instanceIds?: Array<string | null>,
) {
  if (tableMode !== "APPEND_COLUMNS" || !dataRect) return [];

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return [];

  return Array.from({ length: width }, (_, colOffset) => {
    const absoluteColumn = dataRect.c0 + colOffset;
    const refs = inputCellRefs.filter((ref) => ref.c === absoluteColumn);
    const configuredInstanceId = instanceIds?.[colOffset]?.trim() || null;
    if (instanceIds && !configuredInstanceId) return null;
    const cells = Object.fromEntries(
      refs.map((ref) => {
        const value = tableValues[ref.index];
        return [ref.rowKey, value] as const;
      }).filter(([, value]) => !isBlankReportCellValue(value)),
    );

    return {
      columnInstanceId:
        configuredInstanceId ??
        `${normalizeMetricPart(blockId, "excel_block")}:column:${absoluteColumn + 1}`,
      columnOrder: colOffset + 1,
      columnKey: `sheet_1:C${absoluteColumn + 1}`,
      columnLabelCodes: [],
      cells,
    };
  }).filter((column): column is NonNullable<typeof column> => Boolean(
    column && (Boolean(instanceIds) || Object.keys(column.cells).length > 0),
  ));
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

function hasEnteredRuntimeValue(value: DynamicFormRuntimeValue | undefined) {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => String(item).trim().length > 0);
  return false;
}

function applyDynamicFlowFieldPermissions(
  fields: DynamicFormField[],
  permissions?: DynamicFlowPolicyEvaluationResult | null,
) {
  if (permissions?.denyAllFields === true) return [];
  return fields
    .filter((field) => {
      const permission = findDynamicFlowFieldPermission(permissions, field);
      return !permission || !isDynamicFlowFieldHidden(permission);
    })
    .map((field) => {
      const permission = findDynamicFlowFieldPermission(permissions, field);
      if (!permission?.required || field.required) return field;
      return { ...field, required: true };
    });
}

function getDynamicFlowFieldState(
  permissions: DynamicFlowPolicyEvaluationResult | null | undefined,
  field: DynamicFormField,
): DynamicFormRuntimeFieldState | null {
  const permission = findDynamicFlowFieldPermission(permissions, field);
  if (!permission) return null;
  return {
    readOnly: isDynamicFlowWriteDenied(permission),
  };
}

function findDynamicFlowFieldPermission(
  permissions: DynamicFlowPolicyEvaluationResult | null | undefined,
  field: DynamicFormField,
) {
  const fields = permissions?.fields;
  if (!fields) return null;

  const keys = [field.id, field.key, field.name]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  for (const key of keys) {
    const exact = fields[key];
    if (exact) return exact;
  }

  const lowered = new Set(keys.map((key) => key.toLowerCase()));
  return Object.values(fields).find((permission) => {
    const permissionKeys = [permission.targetKey, permission.fieldId, permission.fieldKey]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean);
    return permissionKeys.some((key) => lowered.has(key));
  }) ?? null;
}

function isDynamicFlowFieldHidden(permission: DynamicFlowFieldPermission) {
  return permission.hidden === true || permission.read === false;
}

function isDynamicFlowWriteDenied(permission: {
  read?: boolean | null;
  write?: boolean | null;
  hidden?: boolean | null;
  locked?: boolean | null;
}) {
  return permission.hidden === true ||
    permission.read === false ||
    permission.locked === true ||
    permission.write === false;
}

function buildDynamicFlowLockedCellKeys(
  permissions: DynamicFlowPolicyEvaluationResult | null | undefined,
  block: ReportExcelBlockRuntime | null | undefined,
) {
  const deniedColumns = getDynamicFlowDeniedColumnKeys(permissions, block?.blockId);
  if (!block || deniedColumns.size === 0) return [];

  const keys = new Set<string>();
  const inputCellRefs = buildInputCellRefs(block.dataRect, block.spec);
  const addRef = (ref?: DynamicExcelInputCellRef | null) => {
    if (!ref) return;
    keys.add(`${ref.r}:${ref.c}`);
  };

  inputCellRefs.forEach((ref) => {
    if (
      deniedColumns.has("*") ||
      deniedColumns.has(normalizeDynamicFlowPermissionKey(ref.columnKey))
    ) {
      addRef(ref);
    }
  });

  if (block.excelBlock) {
    const tableMode = normalizeTableMode(block.excelBlock.tableMode);
    const dataRect = getExcelBlockDataRect(block.excelBlock) ?? block.dataRect;
    const indexMap = getExcelBlockIndexMap(block.excelBlock, block.blockId, tableMode);
    buildTableMetricDefinitions(
      block.blockId,
      tableMode,
      block.excelBlock,
      dataRect,
      indexMap,
      inputCellRefs,
    ).forEach((metric) => {
      if (
        !deniedColumns.has("*") &&
        !deniedColumns.has(normalizeDynamicFlowPermissionKey(metric.columnKey))
      ) return;
      addRef(inputCellRefs.find((ref) => ref.index === metric.index) ?? findMetricInputRef(metric, tableMode, inputCellRefs));
    });
  }

  return Array.from(keys);
}

function getDynamicFlowDeniedColumnKeys(
  permissions: DynamicFlowPolicyEvaluationResult | null | undefined,
  blockId?: string | null,
) {
  const targetBlockId = normalizeDynamicFlowPermissionKey(blockId);
  const result = new Set<string>();
  if (!targetBlockId) return result;
  if (permissions?.denyAllTableColumns === true) {
    result.add("*");
    return result;
  }

  Object.values(permissions?.tableColumns ?? {}).forEach((permission: DynamicFlowTableColumnPermission) => {
    if (normalizeDynamicFlowPermissionKey(permission.blockId) !== targetBlockId) return;
    if (!isDynamicFlowWriteDenied(permission)) return;
    const key = normalizeDynamicFlowPermissionKey(permission.columnKey);
    if (key) result.add(key);
  });

  return result;
}

function getMissingDynamicFlowRequiredTableColumns(
  permissions: DynamicFlowPolicyEvaluationResult | null | undefined,
  blocks: ReportExcelBlockRuntime[],
  valuesByBlock: WorkbookValueMap,
  rowLabelsByBlock: RowLabelStateMap,
  appendAxisStates: ReportAppendAxisStateMap = {},
) {
  const missing = new Map<string, string>();

  Object.values(permissions?.tableColumns ?? {}).forEach((permission: DynamicFlowTableColumnPermission) => {
    if (permission.required !== true || permission.hidden === true || permission.read === false) return;

    const normalizedBlockId = normalizeDynamicFlowPermissionKey(permission.blockId);
    const normalizedColumnKey = normalizeDynamicFlowPermissionKey(permission.columnKey);
    const targetKey = `${normalizedBlockId}:${normalizedColumnKey}`;
    if (!normalizedBlockId || !normalizedColumnKey || missing.has(targetKey)) return;

    const block = blocks.find(
      (item) => normalizeDynamicFlowPermissionKey(item.blockId) === normalizedBlockId,
    );
    if (!block) {
      missing.set(targetKey, `${permission.blockId} / ${formatDynamicFlowColumnLabel(permission.columnKey)}`);
      return;
    }
    if (getReportBlockTableMode(block) === "SUMMARY_TEMPLATE") return;

    const inputCellRefs = buildInputCellRefs(block.dataRect, block.spec);
    const values = normalizeWorkbookValues(
      valuesByBlock[block.blockId] ?? [],
      inputCellRefs.length,
    );
    const tableMode = normalizeTableMode(block.excelBlock?.tableMode);
    let isMissing = false;

    if (tableMode === "APPEND_ROWS") {
      const dataRect = block.excelBlock
        ? getExcelBlockDataRect(block.excelBlock) ?? block.dataRect
        : block.dataRect;
      const activeRows = buildAppendRowsTableRecords(
        tableMode,
        block.blockId,
        dataRect,
        values,
        rowLabelsByBlock[block.blockId] ?? [],
        inputCellRefs,
        appendAxisStates[block.blockId]?.mode === "APPEND_ROWS"
          ? appendAxisStates[block.blockId].instanceIds
          : undefined,
      );
      if (activeRows.length === 0) return;

      isMissing = activeRows.some((row) => {
        const cell = Object.entries(row.cells).find(
          ([key]) => normalizeDynamicFlowPermissionKey(key) === normalizedColumnKey,
        );
        return !cell || isBlankReportCellValue(cell[1]);
      });
    } else {
      const requiredIndexes = new Set(
        inputCellRefs
          .filter((ref) => normalizeDynamicFlowPermissionKey(ref.columnKey) === normalizedColumnKey)
          .map((ref) => ref.index),
      );

      if (requiredIndexes.size === 0 && block.excelBlock) {
        const dataRect = getExcelBlockDataRect(block.excelBlock) ?? block.dataRect;
        const indexMap = getExcelBlockIndexMap(block.excelBlock, block.blockId, tableMode);
        buildTableMetricDefinitions(
          block.blockId,
          tableMode,
          block.excelBlock,
          dataRect,
          indexMap,
          inputCellRefs,
        ).forEach((metric) => {
          if (normalizeDynamicFlowPermissionKey(metric.columnKey) !== normalizedColumnKey) return;
          const ref = inputCellRefs.find((item) => item.index === metric.index) ??
            findMetricInputRef(metric, tableMode, inputCellRefs);
          if (ref) requiredIndexes.add(ref.index);
        });
      }

      isMissing = requiredIndexes.size === 0 ||
        Array.from(requiredIndexes).some((index) => isBlankReportCellValue(values[index]));
    }

    if (isMissing) {
      missing.set(
        targetKey,
        `${block.label || "Bảng dữ liệu"} / ${formatDynamicFlowColumnLabel(permission.columnKey)}`,
      );
    }
  });

  return Array.from(missing.values());
}

function formatDynamicFlowColumnLabel(columnKey?: string | null) {
  const normalized = String(columnKey ?? "").trim();
  const match = /^col_(\d+)$/i.exec(normalized);
  return match ? `Cột ${match[1]}` : normalized || "Cột chưa xác định";
}

function normalizeDynamicFlowPermissionKey(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function hasEnteredReportBlockValues(
  detail: ParsedReportDetail,
  block: ReportExcelBlockRuntime,
  topLevelBlockId: string,
  latestValues: WorkbookValueMap,
) {
  return resolveReportBlockValues(detail, block, topLevelBlockId, latestValues)
    .some((value) => !isBlankReportCellValue(value));
}

function getJsonUpdatedAtUtc(input?: string | null) {
  const root = parseObjectJson(input);
  const raw = typeof root?.updatedAtUtc === "string" ? root.updatedAtUtc.trim() : "";
  return raw || null;
}

function pickLatestDateTime(values: Array<string | null | undefined>) {
  let latest: { value: string; time: number } | null = null;

  for (const value of values) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) continue;
    if (!latest || time > latest.time) latest = { value, time };
  }

  return latest?.value ?? null;
}

function resolveReportSectionLastUpdatedAt(
  detail: ParsedReportDetail,
  hasFields: boolean,
  hasTables: boolean,
) {
  return pickLatestDateTime([
    detail.updatedAtUtc,
    detail.createdAtUtc,
    hasFields ? getJsonUpdatedAtUtc(detail.fieldValuesJson) : null,
    hasTables ? getJsonUpdatedAtUtc(detail.tableValuesJson) : null,
  ]);
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

export function collectDynamicFieldValidationErrors(
  fields: DynamicFormField[],
  values: DynamicFormRuntimeValues,
) {
  const errors: Record<string, string> = {};
  fields.forEach((field) => {
    if (field.required && !hasRequiredDynamicValue(field, values)) {
      errors[field.id] = `${getDynamicFormFieldDisplayName(field)} là trường bắt buộc.`;
      return;
    }
    if (
      (field.type === "date" || field.type === "fullDate") &&
      values[field.id] != null &&
      values[field.id] !== ""
    ) {
      const mode: DateInputMode = field.type === "fullDate" ? "full" : "flexible";
      if (!isDateInputValueValid(values[field.id], mode)) {
        errors[field.id] = getDynamicFieldValidationMessage(field);
      }
    }
  });
  return errors;
}

function collectServerValidationEntries(value: unknown, output: Array<[string, string]>) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectServerValidationEntries(item, output));
    return;
  }
  if (!isRuntimeObject(value)) return;

  const fieldId = [value.fieldId, value.field, value.key, value.property, value.path]
    .find((item): item is string => typeof item === "string" && Boolean(item.trim()));
  const message = [value.message, value.error, value.reason]
    .find((item): item is string => typeof item === "string" && Boolean(item.trim()));
  if (fieldId && message) output.push([fieldId.trim(), message.trim()]);

  Object.entries(value).forEach(([key, child]) => {
    if (typeof child === "string" && child.trim() && !["message", "error", "reason"].includes(key)) {
      output.push([key, child.trim()]);
      return;
    }
    if (Array.isArray(child) && child.every((item) => typeof item === "string")) {
      const text = child.map(String).map((item) => item.trim()).filter(Boolean).join(" ");
      if (text) output.push([key, text]);
      return;
    }
    collectServerValidationEntries(child, output);
  });
}

export function extractServerDynamicFieldErrors(
  error: unknown,
  fields: DynamicFormField[],
) {
  const normalized = normalizeApiError(error);
  const entries: Array<[string, string]> = [];
  collectServerValidationEntries(normalized.details, entries);
  collectServerValidationEntries(normalized.raw, entries);
  const byLookup = new Map<string, DynamicFormField>();
  fields.forEach((field) => {
    byLookup.set(field.id.toLowerCase(), field);
    if (field.key?.trim()) byLookup.set(field.key.trim().toLowerCase(), field);
  });
  const result: Record<string, string> = {};
  entries.forEach(([rawKey, message]) => {
    const segments = rawKey.split(/[.[\]]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
    const field = segments.map((segment) => byLookup.get(segment)).find(Boolean);
    if (field && !result[field.id]) result[field.id] = message;
  });
  return result;
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
              Bấm <b>Lưu nháp</b> để ghi bảng tính mới nhất. Khi bấm <b>Nộp báo cáo</b>,
              toàn bộ dữ liệu được kiểm tra và nộp trong một thao tác duy nhất.
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
  canSubmit: boolean;
  canWithdraw: boolean;
  busy: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onOpenWithdraw: () => void;
};

function ReportActionBar(props: ActionBarProps) {
  const { canEdit, canSubmit, canWithdraw, busy, onSaveDraft, onSubmit, onOpenWithdraw } = props;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {canEdit && (
        <Button
          variant="outlined"
          startIcon={<SaveOutlinedIcon />}
          onClick={onSaveDraft}
          disabled={busy}
        >
          Lưu nháp
        </Button>
      )}
      {canSubmit && (
        <Button
          variant="contained"
          startIcon={<SendOutlinedIcon />}
          onClick={onSubmit}
          disabled={busy}
        >
          Nộp báo cáo
        </Button>
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
  onApplied: (report: WorkAssignmentReportResponse) => Promise<void> | void;
  onSelectTargetBlock: (blockId: string) => void;
  showMessage: (message: string, severity?: ActionToastSeverity) => void;
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

export function ReportAggregateMapSection(props: ReportAggregateMapSectionProps) {
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
  const pendingApplyCommandRef = React.useRef<PendingPayloadCommand | null>(null);

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
    () => buildAggregateMapBlockOptions(sourceFormRuntime).filter(
      (block) => block.tableMode !== "SUMMARY_TEMPLATE",
    ),
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
      : "Hệ thống ghi giá trị tổng hợp số vào bảng đích. Nhóm giá trị văn bản ngắn/chọn một/chọn nhiều đang xem ở thống kê trường/bảng; muốn ghi nhóm lên bảng phía trên cần cấu hình đích riêng.";
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

  React.useEffect(() => {
    pendingApplyCommandRef.current = null;
  }, [
    detail.payloadRevision,
    periodKeyFrom,
    periodKeyTo,
    selectedSourceAssignment?.id,
    selectedSourceBlock?.blockId,
    selectedTargetBlockOption?.blockId,
    selectedUnitIds,
    valueSelector,
  ]);

  const buildRequest = React.useCallback((command: PendingPayloadCommand) => {
    if (!selectedSourceAssignment || !sourceDynamicFormTemplateId) {
      showMessage("Chọn biểu mẫu/công việc nguồn để tập hợp dữ liệu.", "warning");
      return null;
    }
    if (!selectedSourceBlock) {
      showMessage("Chọn trường/bảng nguồn trong biểu mẫu nguồn.", "warning");
      return null;
    }
    if (!selectedTargetBlockOption) {
      showMessage("Chọn trường/bảng đích trong báo cáo hiện tại.", "warning");
      return null;
    }
    if (!periodKeyFrom || !periodKeyTo) {
      showMessage("Chọn Từ ngày và Đến ngày để tập hợp dữ liệu.", "warning");
      return null;
    }
    if (periodKeyFrom > periodKeyTo) {
      showMessage("Từ ngày không được lớn hơn Đến ngày.", "warning");
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
      expectedPayloadRevision: command.expectedPayloadRevision,
      commandId: command.commandId,
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
    const request = buildRequest({
      expectedPayloadRevision: detail.payloadRevision,
      commandId: createPayloadCommandId(),
    });
    if (!request) return;
    try {
      const response = await previewDynamicFormAggregateDraft({
        id: detail.id,
        data: request,
      }).unwrap();
      onPreview(response);
    } catch (err) {
      console.error(err);
      showMessage("Không xem trước được báo cáo sau khi gán dữ liệu tổng hợp.", "error");
    }
  }, [buildRequest, detail.id, onPreview, previewDynamicFormAggregateDraft, showMessage]);

  const handleApply = React.useCallback(async () => {
    const command = pendingApplyCommandRef.current ?? {
      expectedPayloadRevision: detail.payloadRevision,
      commandId: createPayloadCommandId(),
    };
    pendingApplyCommandRef.current = command;
    const request = buildRequest(command);
    if (!request) return;
    try {
      const response = await applyDynamicFormAggregateDraft({
        id: detail.id,
        data: request,
      }).unwrap();
      pendingApplyCommandRef.current = null;
      await onApplied(response);
      setAggregateDialogOpen(false);
      showMessage("Đã gắn dữ liệu tổng hợp vào báo cáo hiện tại.", "success");
    } catch (err) {
      console.error(err);
      const normalized = normalizeApiError(err);
      showMessage(
        normalized.status === 409
          ? "Báo cáo đã có revision mới. Cấu hình tổng hợp đang chọn vẫn được giữ để bạn đối chiếu và thử lại sau khi tải mới."
          : normalized.message || "Không gắn được dữ liệu tổng hợp vào báo cáo.",
        "error",
      );
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
        label="Trường/Bảng nguồn"
        value={sourceBlockId}
        onChange={(event) => setSourceBlockId(event.target.value)}
        disabled={disabled || !selectedSourceAssignment}
        fullWidth
        helperText="Chỉ tiêu bảng trong biểu mẫu nguồn được lấy tự động; trường có nhãn thống kê được tổng hợp ở thống kê trường."
      >
        {sourceBlocks.length === 0 && (
          <MenuItem value="" disabled>
            Chưa có trường/bảng nguồn
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
        label="Trường/Bảng đích"
        value={targetBlockId}
        onChange={(event) => handleTargetBlockChange(event.target.value)}
        disabled={disabled}
        fullWidth
        helperText="Đích sẽ được mở ở phần nhập liệu của báo cáo và nhận kết quả tổng hợp."
      >
        {targetBlocks.length === 0 && (
          <MenuItem value="" disabled>
            Chưa có trường/bảng đích
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
              Nếu để trống đơn vị, hệ thống sẽ lấy tất cả đơn vị đã giao. Chỉ tiêu bảng trong cùng biểu mẫu nguồn và trường có nhãn thống kê được gom tự động; phần trường chưa gán nhãn chỉ tải khi mở chi tiết. Khoảng ngày mặc định theo kỳ báo cáo hiện tại ({formatDayKeyForUser(anchorDayKey)}).
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
                  tooltip: "Xem trước trường/bảng nguồn",
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
  const showCompletedDateRequiredHint =
    isHistoricalData && requiresCompletedDate && canEditCompletedDate && !completedDate;

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

          {showCompletedDateRequiredHint && (
            <Alert severity="info">
              Có thể lưu nháp trước. Khi nộp báo cáo, bắt buộc nhập ngày hoàn thành để hệ thống đánh giá đúng hạn hoặc chậm muộn.
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
                helperText={
                  requiresCompletedDate
                    ? "Có thể để trống khi lưu nháp; bắt buộc nhập trước khi nộp báo cáo."
                    : undefined
                }
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

export function ReportSectionTablePreviews(props: ReportSectionTablePreviewsProps) {
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
        const isSummaryTemplate = getReportBlockTableMode(block) === "SUMMARY_TEMPLATE";
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
                  <Chip
                    size="small"
                    variant="outlined"
                    color={isSummaryTemplate ? "info" : "default"}
                    label={isSummaryTemplate ? "Kết quả chỉ đọc" : `${inputCellCount} ô nhập`}
                  />
                  {labeledRows > 0 && (
                    <Chip size="small" color="primary" variant="outlined" label={`${labeledRows} dòng gắn nhãn`} />
                  )}
                </Stack>
              </Stack>

              <Button
                data-testid="report-table-open-button"
                data-block-id={block.blockId || undefined}
                variant={canEdit && !isSummaryTemplate ? "contained" : "outlined"}
                startIcon={<OpenInFullOutlinedIcon fontSize="small" />}
                disabled={busy}
                onClick={() => onOpenBlock(block)}
                sx={{ alignSelf: { xs: "stretch", md: "center" }, textTransform: "none" }}
              >
                {canEdit && !isSummaryTemplate ? "Mở nhập liệu" : isSummaryTemplate ? "Xem kết quả" : "Xem bảng"}
              </Button>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}

export type ReportAppendAxisControlsProps = {
  blockLabel: string;
  state: ReportAppendAxisState;
  availableSlots: number[];
  canEdit: boolean;
  busy: boolean;
  onAdd: () => void;
  onRemove: (slot: number) => void;
  onMove: (fromSlot: number, toSlot: number) => void;
};

export function ReportAppendAxisControls(props: ReportAppendAxisControlsProps) {
  const {
    blockLabel,
    state,
    availableSlots,
    canEdit,
    busy,
    onAdd,
    onRemove,
    onMove,
  } = props;
  const isRows = state.mode === "APPEND_ROWS";
  const axisLabel = isRows ? "dòng" : "cột";
  const activeSlots = availableSlots.filter((slot) => Boolean(state.instanceIds[slot]));
  const canAdd = canEdit && !busy && activeSlots.length < availableSlots.length;

  return (
    <Box
      data-testid="report-append-axis-controls"
      data-table-mode={state.mode}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1.5,
        bgcolor: "background.default",
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={800}>
              {isRows ? "Dòng dữ liệu động" : "Cột dữ liệu động"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activeSlots.length}/{availableSlots.length} {axisLabel} đang dùng trong {blockLabel}
            </Typography>
          </Box>
          {canEdit && (
            <Button
              size="small"
              variant="outlined"
              disabled={!canAdd}
              aria-label={isRows ? "Thêm dòng dữ liệu" : "Thêm cột dữ liệu"}
              onClick={onAdd}
              sx={{ alignSelf: { xs: "stretch", sm: "center" }, textTransform: "none" }}
            >
              {isRows ? "Thêm dòng" : "Thêm cột"}
            </Button>
          )}
        </Stack>

        {!isRows && (
          <Typography variant="caption" color="text.secondary">
            Trên màn hình hẹp, vuốt ngang vùng điều khiển và bảng để xem đầy đủ các cột.
          </Typography>
        )}

        {activeSlots.length === 0 ? (
          <Alert severity="info">
            Chưa có {axisLabel} dữ liệu. {canEdit ? `Chọn “Thêm ${axisLabel}” để bắt đầu nhập.` : "Không có dữ liệu để hiển thị."}
          </Alert>
        ) : (
          <Box
            role="region"
            aria-label={isRows ? "Thứ tự dòng dữ liệu" : "Thứ tự cột dữ liệu"}
            tabIndex={0}
            sx={{
              overflowX: isRows ? "visible" : "auto",
              WebkitOverflowScrolling: "touch",
              pb: isRows ? 0 : 0.5,
            }}
          >
            <Stack
              direction={isRows ? "column" : "row"}
              spacing={1}
              sx={!isRows ? { minWidth: "max-content" } : undefined}
            >
              {activeSlots.map((slot, index) => {
                const previousSlot = activeSlots[index - 1];
                const nextSlot = activeSlots[index + 1];
                const displayOrder = slot + 1;
                return (
                  <Paper
                    key={state.instanceIds[slot] ?? `${state.mode}:${slot}`}
                    variant="outlined"
                    sx={{ p: 1, minWidth: isRows ? 0 : 220 }}
                  >
                    <Stack
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {isRows ? "Dòng" : "Cột"} {displayOrder}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          title={state.instanceIds[slot] ?? undefined}
                          sx={{ display: "block", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          ID {state.instanceIds[slot]}
                        </Typography>
                      </Box>
                      {canEdit && (
                        <Stack direction="row" spacing={0.5}>
                          <Button
                            size="small"
                            disabled={busy || previousSlot === undefined}
                            aria-label={`Chuyển ${axisLabel} ${displayOrder} lên trước`}
                            onClick={() => previousSlot !== undefined && onMove(slot, previousSlot)}
                            sx={{ minWidth: 36, px: 0.75 }}
                          >
                            {isRows ? "Lên" : "Trái"}
                          </Button>
                          <Button
                            size="small"
                            disabled={busy || nextSlot === undefined}
                            aria-label={`Chuyển ${axisLabel} ${displayOrder} xuống sau`}
                            onClick={() => nextSlot !== undefined && onMove(slot, nextSlot)}
                            sx={{ minWidth: 42, px: 0.75 }}
                          >
                            {isRows ? "Xuống" : "Phải"}
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            disabled={busy}
                            aria-label={`Xóa ${axisLabel} ${displayOrder}`}
                            onClick={() => onRemove(slot)}
                            sx={{ minWidth: 36, px: 0.75 }}
                          >
                            Xóa
                          </Button>
                        </Stack>
                      )}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

type ReportRowLabelEditorProps = {
  block: ReportExcelBlockRuntime | null;
  rowLabels: ReportRuntimeRowLabel[];
  activeRowSlots?: number[] | null;
  allowedCodes: string[];
  allowedDataTypes?: LabelDataType[];
  canEdit: boolean;
  busy: boolean;
  onChange: (rowIndex: number, codes: string[]) => void;
};

function ReportRowLabelEditor(props: ReportRowLabelEditorProps) {
  const { block, rowLabels, activeRowSlots, allowedCodes, allowedDataTypes, canEdit, busy, onChange } = props;
  const rowIndexes = React.useMemo(() => {
    const allRows = getReportBlockDataRows(block);
    if (!block || !Array.isArray(activeRowSlots)) return allRows;
    const activeRows = new Set(activeRowSlots.map((slot) => block.dataRect.r0 + slot));
    return allRows.filter((rowIndex) => activeRows.has(rowIndex));
  }, [activeRowSlots, block]);

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

  const {
    data,
    isLoading,
    isError: isReportQueryError,
    error: reportQueryError,
    refetch,
  } = useGetWorkAssignmentReportQuery(
    reportId,
    { skip: !reportId || Boolean(props.previewData) }
  );
  const {
    data: reportSectionSummaries,
    isError: isReportSectionsError,
    error: reportSectionsError,
    refetch: refetchReportSectionSummaries,
  } = useGetWorkAssignmentReportSectionsQuery(reportId, {
    skip: !reportId || Boolean(props.previewData),
  });

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
  const detailDecode = React.useMemo<RuntimeDecodeResult<ParsedReportDetail>>(
    () => effectiveData
      ? decodeSafely(() => decodeWorkReportRuntimeDetail(effectiveData))
      : { value: null, error: null },
    [effectiveData]
  );
  const detail = detailDecode.value;
  const [payloadRevision, setPayloadRevision] = React.useState(0);
  const payloadRevisionRef = React.useRef(0);
  const [payloadHash, setPayloadHash] = React.useState<string | null>(null);
  const payloadHashRef = React.useRef<string | null>(null);
  const [lifecycleRevision, setLifecycleRevision] = React.useState(0);
  const lifecycleRevisionRef = React.useRef(0);
  const [lifecycleProjectionPending, setLifecycleProjectionPending] = React.useState(false);
  const [saveLifecycle, setSaveLifecycle] = React.useState<ReportSaveLifecycle>("clean");
  const [conflictMessage, setConflictMessage] = React.useState<string | null>(null);
  const [conflictServerSnapshot, setConflictServerSnapshot] = React.useState<{
    payloadRevision: number;
    lifecycleRevision: number;
    payloadHash?: string | null;
    updatedAtUtc?: string | null;
  } | null>(null);
  const [fieldValidationErrors, setFieldValidationErrors] = React.useState<Record<string, string>>({});
  const [focusedFieldId, setFocusedFieldId] = React.useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = React.useState("");
  const [draftChangeSequence, setDraftChangeSequence] = React.useState(0);
  const draftChangeSequenceRef = React.useRef(0);
  const [manualBackPending, setManualBackPending] = React.useState(false);
  const allowNavigationRef = React.useRef(false);
  const pendingPayloadCommandsRef = React.useRef<Record<string, PendingPayloadCommand>>({});
  const fieldValuesUpdatedAtUtcRef = React.useRef(new Date().toISOString());
  const restoredDraftReportIdRef = React.useRef("");
  const activeSectionStorageReadyReportIdRef = React.useRef("");
  const activeSectionStorageSignatureRef = React.useRef("");
  const payloadReportIdRef = React.useRef("");
  const autosaveDraftRef = React.useRef<(() => Promise<boolean>) | null>(null);
  const draftSaveInFlightRef = React.useRef<Promise<boolean> | null>(null);

  const invalidatePendingPayloadCommands = React.useCallback(() => {
    pendingPayloadCommandsRef.current = {};
  }, []);

  const markEditorDirty = React.useCallback(() => {
    invalidatePendingPayloadCommands();
    draftChangeSequenceRef.current += 1;
    setDraftChangeSequence(draftChangeSequenceRef.current);
    setSaveLifecycle((current) => current === "conflict" ? current : "dirty");
  }, [invalidatePendingPayloadCommands]);

  const getOrCreatePayloadCommand = React.useCallback((operation: string) => {
    const existing = pendingPayloadCommandsRef.current[operation];
    if (existing) return existing;

    const command = createPendingRuntimeCommand(payloadRevisionRef.current);
    pendingPayloadCommandsRef.current = {
      ...pendingPayloadCommandsRef.current,
      [operation]: command,
    };
    return command;
  }, []);

  const getOrCreateLifecycleCommand = React.useCallback((operation: string): PendingLifecycleCommand => {
    const existing = pendingPayloadCommandsRef.current[operation];
    if (existing?.expectedLifecycleRevision !== undefined) {
      return existing as PendingLifecycleCommand;
    }

    const command = createPendingRuntimeCommand(
      payloadRevisionRef.current,
      lifecycleRevisionRef.current,
    ) as PendingLifecycleCommand;
    pendingPayloadCommandsRef.current = {
      ...pendingPayloadCommandsRef.current,
      [operation]: command,
    };
    return command;
  }, []);

  const acceptPayloadMutationResponse = React.useCallback(
    (response: WorkAssignmentReportResponse) => {
      const nextRevision = Number(response.payloadRevision);
      if (Number.isInteger(nextRevision) && nextRevision >= 0) {
        payloadRevisionRef.current = nextRevision;
        setPayloadRevision(nextRevision);
      }
      const nextPayloadHash = String(response.payloadHash ?? "").trim() || null;
      payloadHashRef.current = nextPayloadHash;
      setPayloadHash(nextPayloadHash);
      const nextLifecycleRevision = Number(response.lifecycleRevision);
      if (Number.isInteger(nextLifecycleRevision) && nextLifecycleRevision >= 0) {
        lifecycleRevisionRef.current = nextLifecycleRevision;
        setLifecycleRevision(nextLifecycleRevision);
      }
      pendingPayloadCommandsRef.current = {};
      setConflictMessage(null);
      setConflictServerSnapshot(null);
      setLifecycleProjectionPending(
        hasPendingLifecycleProjection(response),
      );
    },
    [],
  );

  const handlePayloadMutationError = React.useCallback(
    (error: unknown, fallbackMessage: string) => {
      const normalized = normalizeApiError(error);
      if (normalized.status === 409) {
        const message =
          "Báo cáo đã được cập nhật ở nơi khác. Dữ liệu bạn đang nhập vẫn được giữ; hãy tải lại phiên bản mới rồi đối chiếu trước khi lưu lại.";
        setConflictMessage(message);
        setSaveLifecycle("conflict");
        return message;
      }

      setSaveLifecycle("dirty");
      return normalized.message || fallbackMessage;
    },
    [],
  );
  const reportSectionSummaryById = React.useMemo(() => {
    const map = new Map<string, WorkAssignmentReportSectionSummaryRow>();
    for (const summary of reportSectionSummaries ?? []) {
      if (summary.sectionId) map.set(summary.sectionId, summary);
    }
    return map;
  }, [reportSectionSummaries]);

  const dynamicFormTemplateId = detail?.dynamicFormTemplateId?.trim() ?? "";
  const {
    data: dynamicFormDetail,
    isFetching: isFetchingDynamicForm,
    isError: isDynamicFormError,
    error: dynamicFormError,
    refetch: refetchDynamicForm,
  } = useGetDynamicFormQuery(
    { id: dynamicFormTemplateId },
    { skip: !dynamicFormTemplateId },
  );
  const dynamicFormDecode = React.useMemo<RuntimeDecodeResult<DynamicFormRuntimeSchema>>(
    () => dynamicFormDetail
      ? decodeSafely(() => decodeDynamicFormRuntimeSchema(dynamicFormDetail, dynamicFormTemplateId))
      : { value: null, error: null },
    [dynamicFormDetail, dynamicFormTemplateId],
  );
  const dynamicFormRuntime = dynamicFormDecode.value;
  const persistedPayloadSchemaError = React.useMemo(
    () => effectiveData && dynamicFormRuntime && dynamicFormDetail
      ? decodeSafely(() => validateWorkReportPayloadAgainstSchema(
          effectiveData,
          dynamicFormRuntime,
          dynamicFormDetail,
        )).error
      : null,
    [dynamicFormDetail, dynamicFormRuntime, effectiveData],
  );
  const dynamicFlowPermissions = detail?.dynamicFlowPermissions ?? null;
  const dynamicFormRuntimeFields = React.useMemo(
    () => applyDynamicFlowFieldPermissions(dynamicFormRuntime?.fields ?? [], dynamicFlowPermissions),
    [dynamicFlowPermissions, dynamicFormRuntime?.fields],
  );
  const getDynamicFormRuntimeFieldState = React.useCallback(
    (field: DynamicFormField) => {
      const permission = getDynamicFlowFieldState(dynamicFlowPermissions, field) ?? {};
      const validationMessage = fieldValidationErrors[field.id];
      return {
        ...permission,
        error: Boolean(permission.error || validationMessage),
        errorText: validationMessage ?? permission.errorText,
        focusTarget: focusedFieldId === field.id,
      };
    },
    [dynamicFlowPermissions, fieldValidationErrors, focusedFieldId],
  );
  const latestWorkbookPayloadRef = React.useRef<WorkbookValueMap>({});
  const latestWorkbookHashRef = React.useRef<WorkbookHashMap>({});
  const latestWorkbookIssuesRef = React.useRef<WorkbookValidationIssueMap>({});
  const latestWorkbookRawRef = React.useRef<WorkbookRawDataMap>({});
  const baselineWorkbookHashRef = React.useRef<WorkbookHashMap>({});
  const baselineRowLabelHashRef = React.useRef<WorkbookHashMap>({});
  const baselineAppendAxisHashRef = React.useRef<WorkbookHashMap>({});
  const dirtyReportBlockIdsRef = React.useRef<DirtyReportBlockMap>({});
  const fieldValuesDirtyRef = React.useRef(false);
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
  const [dirtyReportBlockIds, setDirtyReportBlockIds] = React.useState<DirtyReportBlockMap>({});
  const [appendAxisStates, setAppendAxisStates] = React.useState<ReportAppendAxisStateMap>({});
  const [tableRuntimeRevision, setTableRuntimeRevision] = React.useState(0);
  const [unsavedTableClose, setUnsavedTableClose] =
    React.useState<UnsavedTableCloseState | null>(null);
  const selectedDynamicExcelId = selectedReportBlock?.dynamicExcelTemplateId?.trim() ?? "";
  const selectedReportId = detail?.id?.trim() ?? reportId;
  const {
    data: selectedDynamicExcelDetail,
    isFetching: isFetchingSelectedDynamicExcel,
    isError: isSelectedDynamicExcelError,
    error: selectedDynamicExcelError,
    refetch: refetchSelectedDynamicExcel,
  } = useGetWorkAssignmentReportTemplateWorkbookQuery(
    { id: selectedReportId, dynamicExcelTemplateId: selectedDynamicExcelId },
    { skip: !tableDialogOpen || !selectedReportId || !selectedDynamicExcelId },
  );
  const selectedWorkbookDecode = React.useMemo<RuntimeDecodeResult<ReturnType<typeof decodeRuntimeWorkbook>>>(
    () => selectedDynamicExcelDetail && selectedDynamicExcelId
      ? decodeSafely(() => decodeRuntimeWorkbook(selectedDynamicExcelDetail, selectedDynamicExcelId))
      : { value: null, error: null },
    [selectedDynamicExcelDetail, selectedDynamicExcelId],
  );
  const selectedRenderableBlock = React.useMemo(() => {
    if (!selectedReportBlock) return null;
    if (!selectedWorkbookDecode.value) return selectedReportBlock;

    const templateWorkbookData = normalizeTemplateWorkbook(selectedWorkbookDecode.value.rawWorkbook);
    const spec = selectedWorkbookDecode.value.spec;

    return {
      ...selectedReportBlock,
      spec,
      templateWorkbookData:
        templateWorkbookData.length > 0
          ? templateWorkbookData
          : selectedReportBlock.templateWorkbookData,
    };
  }, [selectedReportBlock, selectedWorkbookDecode.value]);
  const topLevelBlockId = React.useMemo(
    () => (detail ? resolveTopLevelBlockId(detail, reportBlocks) : "excel_block"),
    [detail, reportBlocks],
  );
  const storedWorkbookHashesByBlock = React.useMemo<WorkbookHashMap>(
    () => detail ? buildStoredWorkbookHashByBlock(detail, reportBlocks, topLevelBlockId) : {},
    [detail, reportBlocks, topLevelBlockId],
  );
  const storedRowLabelHashesByBlock = React.useMemo<WorkbookHashMap>(
    () => detail ? buildRowLabelHashByBlock(reportBlocks, buildInitialRowLabelsByBlock(detail, reportBlocks)) : {},
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
    [selectedRenderableBlock, selectedBlockValues, selectedReportBlock, tableDialogOpen, tableRuntimeRevision],
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
  const selectedReportBlockDirty = Boolean(
    selectedReportBlock && dirtyReportBlockIds[selectedReportBlock.blockId],
  );
  const selectedAppendAxisState = selectedReportBlock
    ? appendAxisStates[selectedReportBlock.blockId] ?? null
    : null;
  const selectedBlockLockedCellKeys = React.useMemo(
    () => Array.from(new Set([
      ...buildDynamicFlowLockedCellKeys(dynamicFlowPermissions, selectedReportBlock),
      ...buildInactiveAppendAxisCellKeys(selectedReportBlock, selectedAppendAxisState),
    ])),
    [dynamicFlowPermissions, selectedAppendAxisState, selectedReportBlock],
  );

  const runtimeLoadError = React.useMemo(() => {
    if (isReportSectionsError) {
      return normalizeApiError(reportSectionsError).message || "Không tải được projection section của báo cáo.";
    }
    if (!dynamicFormTemplateId) return null;
    if (isDynamicFormError) {
      const normalized = normalizeApiError(dynamicFormError);
      return normalized.status === 403
        ? "Bạn không có quyền đọc schema runtime của biểu mẫu này."
        : normalized.message || "Không tải được schema runtime của biểu mẫu.";
    }
    return dynamicFormDecode.error ?? persistedPayloadSchemaError;
  }, [
    dynamicFormDecode.error,
    dynamicFormError,
    dynamicFormTemplateId,
    isDynamicFormError,
    isReportSectionsError,
    persistedPayloadSchemaError,
    reportSectionsError,
  ]);
  const runtimeWriteBlocked = Boolean(
    runtimeLoadError ||
    (dynamicFormTemplateId && (isFetchingDynamicForm || !dynamicFormRuntime)) ||
    (
      props.dynamicFlowRuntimeEnabled &&
      !isDynamicFlowPolicyReady(dynamicFlowPermissions)
    ),
  );
  const selectedWorkbookWriteBlocked = Boolean(
    isSelectedDynamicExcelError ||
    selectedWorkbookDecode.error ||
    (tableDialogOpen && selectedDynamicExcelId && (isFetchingSelectedDynamicExcel || !selectedWorkbookDecode.value)),
  );
  const selectedWorkbookErrorMessage = isSelectedDynamicExcelError
    ? (() => {
        const normalized = normalizeApiError(selectedDynamicExcelError);
        return normalized.status === 403
          ? "Bạn không có quyền đọc workbook của block này."
          : normalized.message || "Không tải được workbook của block này.";
      })()
    : selectedWorkbookDecode.error;
  const { canEdit, canSubmit, canWithdraw } = resolveWorkReportRuntimeCapabilities(
    detail,
    Boolean(props.forceReadOnly),
    runtimeWriteBlocked,
  );
  const isHistoricalData = isHistoricalReportDetail(detail);
  const overdue = isOverdue(detail?.dueAtUtc);
  const canEditCompletedDate = Boolean(detail?.canEditCompletedDate);
  const requiresCompletedDate = Boolean(detail?.requiresCompletedDate);
  const completedDateMin = toDayKey(detail?.completedDateMin);
  const completedDateMax = toDayKey(detail?.completedDateMax);

  const [lateReason, setLateReason] = React.useState("");
  const [completedDate, setCompletedDate] = React.useState("");
  const requiresLateReason = isHistoricalData
    ? isCompletedAfterDue(completedDate, detail?.dueAtUtc)
    : overdue;
  const [dataOrigin, setDataOrigin] = React.useState<WorkReportDataOrigin>(
    DEFAULT_REPORT_DATA_ORIGIN,
  );
  const [cumulativeContributionMode, setCumulativeContributionMode] =
    React.useState<WorkReportCumulativeContributionMode>(
      DEFAULT_REPORT_CUMULATIVE_CONTRIBUTION_MODE,
    );
  const reportDataLocked = detail ? isAutoSummaryDataLocked(dataOrigin) : false;
  const canEditReportData = canEdit && !reportDataLocked;
  const selectedSummaryTemplate = getReportBlockTableMode(selectedReportBlock) === "SUMMARY_TEMPLATE";
  const canEditSelectedReportBlock =
    canEditReportData && !selectedSummaryTemplate && !selectedWorkbookWriteBlocked;
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
  const publishedReportSectionIds = React.useMemo(
    () => reportRuntimeSections.map((section) => section.id).filter(Boolean),
    [reportRuntimeSections],
  );
  const publishedReportSectionSignature = publishedReportSectionIds.join("\u0000");
  React.useEffect(() => {
    const reportIdForSection = detail?.id ?? "";
    if (!reportIdForSection || props.previewData || publishedReportSectionIds.length === 0) return;

    const signature = `${reportIdForSection}\u0001${publishedReportSectionSignature}`;
    if (activeSectionStorageSignatureRef.current === signature) return;

    const validSectionIds = new Set(publishedReportSectionIds);
    const persistedSectionId = readPersistedReportActiveSection(reportIdForSection);
    const keepCurrentSection =
      activeSectionStorageReadyReportIdRef.current === reportIdForSection &&
      validSectionIds.has(activeSectionId);
    const nextSectionId = persistedSectionId && validSectionIds.has(persistedSectionId)
      ? persistedSectionId
      : keepCurrentSection
        ? activeSectionId
        : publishedReportSectionIds[0];

    activeSectionStorageReadyReportIdRef.current = reportIdForSection;
    activeSectionStorageSignatureRef.current = signature;
    setActiveSectionId(nextSectionId);
    persistReportActiveSection(reportIdForSection, nextSectionId);
  }, [
    activeSectionId,
    detail?.id,
    props.previewData,
    publishedReportSectionIds,
    publishedReportSectionSignature,
  ]);
  const handleActiveReportSectionChange = React.useCallback((sectionId: string) => {
    if (!publishedReportSectionIds.includes(sectionId)) return;
    setActiveSectionId(sectionId);
    if (
      detail?.id &&
      !props.previewData &&
      activeSectionStorageReadyReportIdRef.current === detail.id
    ) {
      persistReportActiveSection(detail.id, sectionId);
    }
  }, [detail?.id, props.previewData, publishedReportSectionIds]);
  const [tableValidationDialog, setTableValidationDialog] =
    React.useState<ReportTableValidationDialogState | null>(null);
  const [sectionValidationPrompt, setSectionValidationPrompt] =
    React.useState<ReportSectionValidationPromptState | null>(null);

  const [toast, setToast] = React.useState<ActionToastState>({
    open: false,
    message: "",
    severity: "info",
  });

  const showMessage = React.useCallback((message: string, severity: ActionToastSeverity = "info") => {
    setToast({
      open: true,
      message,
      severity,
    });
  }, []);

  const focusRuntimeField = React.useCallback((fieldId: string) => {
    const field = dynamicFormRuntimeFields.find((item) => item.id === fieldId);
    if (!field) return;
    handleActiveReportSectionChange(field.sectionId);
    setFocusedFieldId(null);
    window.setTimeout(() => setFocusedFieldId(field.id), 0);
  }, [dynamicFormRuntimeFields, handleActiveReportSectionChange]);

  const applyFieldErrors = React.useCallback((errors: Record<string, string>) => {
    setFieldValidationErrors(errors);
    const firstField = dynamicFormRuntimeFields.find((field) => Boolean(errors[field.id]));
    if (firstField) focusRuntimeField(firstField.id);
    return firstField;
  }, [dynamicFormRuntimeFields, focusRuntimeField]);

  const applyServerFieldErrors = React.useCallback((error: unknown) => {
    const errors = extractServerDynamicFieldErrors(error, dynamicFormRuntimeFields);
    if (Object.keys(errors).length > 0) applyFieldErrors(errors);
    return errors;
  }, [applyFieldErrors, dynamicFormRuntimeFields]);

  React.useEffect(() => {
    if (!detail) return;

    const serverRevision = Number.isInteger(detail.payloadRevision)
      ? detail.payloadRevision
      : 0;
    const serverPayloadHash = String(detail.payloadHash ?? "").trim() || null;
    const serverLifecycleRevision = Number.isInteger(detail.lifecycleRevision)
      ? detail.lifecycleRevision
      : 0;
    if (payloadReportIdRef.current !== detail.id) {
      payloadReportIdRef.current = detail.id;
      payloadRevisionRef.current = serverRevision;
      setPayloadRevision(serverRevision);
      payloadHashRef.current = serverPayloadHash;
      setPayloadHash(serverPayloadHash);
      lifecycleRevisionRef.current = serverLifecycleRevision;
      setLifecycleRevision(serverLifecycleRevision);
      pendingPayloadCommandsRef.current = {};
      setConflictMessage(null);
      setSaveLifecycle("clean");
      setLifecycleProjectionPending(
        hasPendingLifecycleProjection(detail),
      );
      fieldValuesUpdatedAtUtcRef.current =
        detail.payloadUpdatedAtUtc ?? detail.updatedAtUtc ?? new Date().toISOString();
      restoredDraftReportIdRef.current = "";
      return;
    }

    if (saveLifecycle !== "dirty" && saveLifecycle !== "conflict" && serverRevision >= payloadRevisionRef.current) {
      payloadRevisionRef.current = serverRevision;
      setPayloadRevision(serverRevision);
      payloadHashRef.current = serverPayloadHash;
      setPayloadHash(serverPayloadHash);
    }
    if (
      saveLifecycle !== "dirty" &&
      saveLifecycle !== "conflict" &&
      serverLifecycleRevision >= lifecycleRevisionRef.current
    ) {
      lifecycleRevisionRef.current = serverLifecycleRevision;
      setLifecycleRevision(serverLifecycleRevision);
      setLifecycleProjectionPending(hasPendingLifecycleProjection(detail));
    }
  }, [detail, saveLifecycle]);

  React.useEffect(() => {
    baselineWorkbookHashRef.current = storedWorkbookHashesByBlock;
    baselineRowLabelHashRef.current = storedRowLabelHashesByBlock;
  }, [storedRowLabelHashesByBlock, storedWorkbookHashesByBlock]);

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
  const markReportBlockDirty = React.useCallback((blockId?: string | null) => {
    if (!blockId) return;
    markEditorDirty();
    if (dirtyReportBlockIdsRef.current[blockId]) return;
    dirtyReportBlockIdsRef.current = {
      ...dirtyReportBlockIdsRef.current,
      [blockId]: true,
    };
    setDirtyReportBlockIds(dirtyReportBlockIdsRef.current);
  }, [markEditorDirty]);
  const clearReportBlockDirty = React.useCallback((blockId?: string | null) => {
    if (!blockId) return;
    if (!dirtyReportBlockIdsRef.current[blockId]) return;
    const next = { ...dirtyReportBlockIdsRef.current };
    delete next[blockId];
    dirtyReportBlockIdsRef.current = next;
    setDirtyReportBlockIds(next);
  }, []);
  const clearAllReportBlockDirty = React.useCallback(() => {
    dirtyReportBlockIdsRef.current = {};
    setDirtyReportBlockIds({});
  }, []);
  const isWorkbookPayloadDirty = React.useCallback(
    (block: ReportExcelBlockRuntime, payload: WorkbookSavePayload | null | undefined) => {
      if (!detail || !payload?.values1D) return false;
      const payloadHash = getWorkbookPayloadHash(block, payload);
      const baselineHash =
        baselineWorkbookHashRef.current[block.blockId] ??
        hashWorkbookValues(
          resolveStoredReportBlockValues(detail, block, topLevelBlockId),
          getExpectedValueLength(block),
        );
      return payloadHash !== baselineHash;
    },
    [detail, topLevelBlockId],
  );
  const isReportBlockRowLabelsDirty = React.useCallback(
    (blockId?: string | null) => {
      if (!blockId) return false;
      const currentHash = hashReportRowLabels(rowLabelsByBlock[blockId]);
      const baselineHash = baselineRowLabelHashRef.current[blockId] ?? hashReportRowLabels([]);
      return currentHash !== baselineHash;
    },
    [rowLabelsByBlock],
  );
  const isReportBlockAppendAxisDirty = React.useCallback(
    (blockId?: string | null) => {
      if (!blockId) return false;
      return hashReportAppendAxisState(appendAxisStates[blockId]) !==
        (baselineAppendAxisHashRef.current[blockId] ?? "none");
    },
    [appendAxisStates],
  );
  const discardReportBlockDraft = React.useCallback(
    (blockId?: string | null) => {
      if (!blockId) return;

      const removeFromRecord = <T,>(record: Record<string, T>) => {
        if (!record[blockId]) return record;
        const next = { ...record };
        delete next[blockId];
        return next;
      };

      latestWorkbookPayloadRef.current = removeFromRecord(latestWorkbookPayloadRef.current);
      latestWorkbookHashRef.current = removeFromRecord(latestWorkbookHashRef.current);
      latestWorkbookIssuesRef.current = removeFromRecord(latestWorkbookIssuesRef.current);
      latestWorkbookRawRef.current = removeFromRecord(latestWorkbookRawRef.current);
      clearReportBlockDirty(blockId);

      if (detail) {
        const initialRowLabels = buildInitialRowLabelsByBlock(detail, reportBlocks);
        setRowLabelsByBlock((prev) => ({
          ...prev,
          [blockId]: initialRowLabels[blockId] ?? [],
        }));
        const block = reportBlocks.find((item) => item.blockId === blockId);
        if (block) {
          const initialState = buildReportAppendAxisState(
            block,
            detail.tableValuesJson,
            resolveStoredReportBlockValues(detail, block, topLevelBlockId),
            initialRowLabels[blockId],
          );
          setAppendAxisStates((prev) => {
            const next = { ...prev };
            if (initialState) next[blockId] = initialState;
            else delete next[blockId];
            return next;
          });
          setTableRuntimeRevision((value) => value + 1);
        }
      }
    },
    [clearReportBlockDirty, detail, reportBlocks, topLevelBlockId],
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
        issues.length > 0 ? "error" : "success",
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
      showMessage(`Dữ liệu bảng chưa hợp lệ ở phần ${firstIssue.section.title}.`, "error");
    },
    [showMessage, showReportTableValidationDialog],
  );
  const saveDynamicFieldsDraftBeforeSectionChange = React.useCallback(async () => {
    if (!detail || props.previewData || !fieldValuesDirtyRef.current) return true;
    if (busy) {
      showMessage("Đang có thao tác lưu/nộp báo cáo, vui lòng chờ hoàn tất.", "warning");
      return false;
    }

    const fieldValuesJson = buildDynamicFieldValuesJson(
      detail,
      dynamicFormRuntime,
      fieldValues,
      fieldValuesUpdatedAtUtcRef.current,
    );
    const completedDatePayload = canEditCompletedDate ? dayKeyToApiDate(completedDate) : null;
    const advancedSettings = buildReportAdvancedSettingsPayload(
      detail,
      dataOrigin,
      cumulativeContributionMode,
    );

    const command = getOrCreatePayloadCommand("section-fields");
    setSaveLifecycle("saving");
    try {
      const response = await saveDraftPatch({
        id: detail.id,
        data: {
          ...command,
          values1DPatch: null,
          tableBlockPatches: null,
          fieldValuesJson,
          ...advancedSettings,
          completedDate: completedDatePayload,
          lateReason: lateReason.trim() || null,
          note: null,
        },
      }).unwrap();

      acceptPayloadMutationResponse(response);
      fieldValuesDirtyRef.current = false;
      removePersistedReportDraft(detail.id);
      setSaveLifecycle(Object.keys(dirtyReportBlockIdsRef.current).length > 0 ? "dirty" : "saved");
      await refetchReportSectionSummaries();
      onSaved?.();
      showMessage("Đã tự lưu nháp phần vừa chỉnh.", "success");
      return true;
    } catch (error) {
      console.error(error);
      applyServerFieldErrors(error);
      showMessage(
        handlePayloadMutationError(error, "Không tự lưu được dữ liệu trước khi chuyển phần."),
        "error",
      );
      return false;
    }
  }, [
    busy,
    acceptPayloadMutationResponse,
    canEditCompletedDate,
    completedDate,
    cumulativeContributionMode,
    dataOrigin,
    detail,
    dynamicFormRuntime,
    fieldValues,
    lateReason,
    getOrCreatePayloadCommand,
    handlePayloadMutationError,
    applyServerFieldErrors,
    onSaved,
    props.previewData,
    refetchReportSectionSummaries,
    saveDraftPatch,
    showMessage,
  ]);
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
    async (section: DynamicFormSection) => {
      if (!canEditReportData) return true;
      const saved = await saveDynamicFieldsDraftBeforeSectionChange();
      if (!saved) return false;
      const blocks = reportBlocksBySectionId[section.id] ?? [];
      if (blocks.length === 0) return true;
      if (sectionValidationState[section.id]) return true;
      setSectionValidationPrompt({
        open: true,
        section,
        blockCount: blocks.length,
      });
      return true;
    },
    [canEditReportData, reportBlocksBySectionId, saveDynamicFieldsDraftBeforeSectionChange, sectionValidationState],
  );
  const getReportSectionTableCount = React.useCallback(
    (section: DynamicFormSection) => reportBlocksBySectionId[section.id]?.length ?? 0,
    [reportBlocksBySectionId],
  );
  const getReportSectionEntryState = React.useCallback(
    (section: DynamicFormSection) => {
      if (!detail) return null;

      const summary = reportSectionSummaryById.get(section.id);
      const sectionFields = dynamicFormRuntimeFields
        .filter((field) => field.sectionId === section.id);
      const blocks = reportBlocksBySectionId[section.id] ?? [];
      const hasFieldInput = sectionFields.some((field) => hasEnteredRuntimeValue(fieldValues[field.id]));
      const hasTableInput = blocks.some((block) =>
        hasEnteredReportBlockValues(
          detail,
          block,
          topLevelBlockId,
          latestWorkbookPayloadRef.current,
        ),
      );
      const status: "entered" | "empty" =
        hasFieldInput || hasTableInput || summary?.hasData ? "entered" : "empty";

      return {
        status,
        lastUpdatedAt: summary?.lastUpdatedAtUtc ??
          resolveReportSectionLastUpdatedAt(
            detail,
            sectionFields.length > 0,
            blocks.length > 0,
          ),
      };
    },
    [
      detail,
      dirtyReportBlockIds,
      dynamicFormRuntimeFields,
      fieldValues,
      reportSectionSummaryById,
      reportBlocksBySectionId,
      topLevelBlockId,
    ],
  );
  function handleReportBlockRowLabelChange(
    block: ReportExcelBlockRuntime,
    rowIndex: number,
    codes: string[],
  ) {
    const blockId = block.blockId;
    const normalized = normalizeLabelCodes(codes);
    markReportBlockDirty(blockId);
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

  React.useEffect(() => {
    if (
      fieldValuesDirtyRef.current ||
      Object.keys(dirtyReportBlockIdsRef.current).length > 0 ||
      saveLifecycle === "conflict"
    ) {
      return;
    }
    latestWorkbookPayloadRef.current = {};
    latestWorkbookHashRef.current = {};
    latestWorkbookIssuesRef.current = {};
    latestWorkbookRawRef.current = {};
    dirtyReportBlockIdsRef.current = {};
    setDirtyReportBlockIds({});
    setUnsavedTableClose(null);
  }, [detail?.id, detail?.tableValuesJson, detail?.updatedAtUtc, saveLifecycle]);

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

    if (
      fieldValuesDirtyRef.current ||
      Object.keys(dirtyReportBlockIdsRef.current).length > 0 ||
      saveLifecycle === "conflict"
    ) {
      return;
    }

    setLateReason(detail.lateReason ?? "");
    setCompletedDate(resolveInitialCompletedDayKey(detail));
    const nextDataOrigin = normalizeReportDataOrigin(detail.dataOrigin);
    setDataOrigin(nextDataOrigin);
    setCumulativeContributionMode(
      normalizeContributionMode(detail.cumulativeContributionMode, nextDataOrigin),
    );
  }, [detail]);

  const handleDataOriginChange = React.useCallback((next: WorkReportDataOrigin) => {
    markEditorDirty();
    setDataOrigin(next);
    setCumulativeContributionMode(shouldDefaultExcludeOrigin(next) ? "EXCLUDE" : "INCLUDE");
  }, [markEditorDirty]);

  React.useEffect(() => {
    if (!detail) {
      setFieldValues({});
      fieldValuesDirtyRef.current = false;
      return;
    }

    if (fieldValuesDirtyRef.current) return;
    setFieldValues(parseDynamicFieldValues(detail.fieldValuesJson));
    fieldValuesDirtyRef.current = false;
  }, [detail]);

  React.useEffect(() => {
    if (!detail || props.previewData || restoredDraftReportIdRef.current === detail.id) return;
    restoredDraftReportIdRef.current = detail.id;

    try {
      const raw = sessionStorage.getItem(getReportDraftStorageKey(detail.id));
      if (!raw) return;
      const persisted: unknown = JSON.parse(raw);
      if (!isPersistedReportDraft(persisted)) {
        removePersistedReportDraft(detail.id);
        return;
      }

      setFieldValues(cloneRuntimeDraftValue(persisted.fieldValues));
      fieldValuesDirtyRef.current = true;
      fieldValuesUpdatedAtUtcRef.current = persisted.updatedAtUtc;
      latestWorkbookPayloadRef.current = cloneRuntimeDraftValue(persisted.workbookValuesByBlock);
      latestWorkbookRawRef.current = cloneRuntimeDraftValue(persisted.workbookRawDataByBlock);
      latestWorkbookHashRef.current = Object.fromEntries(
        Object.entries(persisted.workbookValuesByBlock).map(([blockId, values]) => [
          blockId,
          hashWorkbookValues(values, values.length),
        ]),
      );
      const restoredDirtyBlocks = Object.fromEntries(
        Array.from(new Set([
          ...Object.keys(persisted.workbookValuesByBlock),
          ...Object.keys(persisted.rowLabelsByBlock),
          ...Object.keys(persisted.appendAxisStates),
        ])).map((blockId) => [blockId, true]),
      );
      dirtyReportBlockIdsRef.current = restoredDirtyBlocks;
      setDirtyReportBlockIds(restoredDirtyBlocks);
      setRowLabelsByBlock(cloneRuntimeDraftValue(persisted.rowLabelsByBlock));
      setAppendAxisStates(cloneRuntimeDraftValue(persisted.appendAxisStates));
      setLateReason(persisted.lateReason);
      setCompletedDate(persisted.completedDate);
      setDataOrigin(normalizeReportDataOrigin(persisted.dataOrigin));
      setCumulativeContributionMode(
        normalizeContributionMode(persisted.cumulativeContributionMode, persisted.dataOrigin),
      );
      draftChangeSequenceRef.current += 1;
      setDraftChangeSequence(draftChangeSequenceRef.current);
      if (persisted.basePayloadRevision === payloadRevisionRef.current) {
        setSaveLifecycle("dirty");
        showMessage("Đã khôi phục dữ liệu chưa lưu của phiên làm việc này.", "info");
      } else {
        setSaveLifecycle("conflict");
        setConflictMessage(
          "Bản nháp cục bộ được tạo từ revision cũ. Dữ liệu vẫn được giữ để bạn đối chiếu trước khi lưu.",
        );
      }
    } catch {
      removePersistedReportDraft(detail.id);
    }
  }, [detail, props.previewData, showMessage]);

  React.useEffect(() => {
    if (!detail || props.previewData || saveLifecycle === "clean" || saveLifecycle === "saved") return;
    const persisted: PersistedReportDraft = {
      basePayloadRevision: payloadRevisionRef.current,
      baseLifecycleRevision: lifecycleRevisionRef.current,
      updatedAtUtc: fieldValuesUpdatedAtUtcRef.current,
      fieldValues: cloneRuntimeDraftValue(fieldValues),
      workbookValuesByBlock: cloneRuntimeDraftValue(latestWorkbookPayloadRef.current),
      workbookRawDataByBlock: cloneRuntimeDraftValue(latestWorkbookRawRef.current),
      rowLabelsByBlock: cloneRuntimeDraftValue(rowLabelsByBlock),
      appendAxisStates: cloneRuntimeDraftValue(appendAxisStates),
      lateReason,
      completedDate,
      dataOrigin,
      cumulativeContributionMode,
      activeSectionId,
    };
    try {
      sessionStorage.setItem(getReportDraftStorageKey(detail.id), JSON.stringify(persisted));
    } catch {
      // Storage may be unavailable in private/restricted browser contexts.
    }
  }, [
    activeSectionId,
    appendAxisStates,
    completedDate,
    cumulativeContributionMode,
    dataOrigin,
    detail,
    draftChangeSequence,
    fieldValues,
    lateReason,
    props.previewData,
    rowLabelsByBlock,
    saveLifecycle,
  ]);

  const hasUnsavedReportChanges =
    saveLifecycle === "dirty" ||
    saveLifecycle === "conflict" ||
    fieldValuesDirtyRef.current ||
    Object.keys(dirtyReportBlockIds).length > 0;

  const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!hasUnsavedReportChanges || allowNavigationRef.current) return false;
    return (
      `${currentLocation.pathname}${currentLocation.search}${currentLocation.hash}` !==
      `${nextLocation.pathname}${nextLocation.search}${nextLocation.hash}`
    );
  });

  React.useEffect(() => {
    if (navigationBlocker.state === "blocked" && !hasUnsavedReportChanges) {
      navigationBlocker.proceed();
    }
  }, [hasUnsavedReportChanges, navigationBlocker]);

  React.useEffect(() => {
    if (!hasUnsavedReportChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedReportChanges]);

  React.useEffect(() => {
    if (!detail) {
      setRowLabelsByBlock({});
      setAppendAxisStates({});
      baselineAppendAxisHashRef.current = {};
      return;
    }

    if (
      fieldValuesDirtyRef.current ||
      Object.keys(dirtyReportBlockIdsRef.current).length > 0 ||
      saveLifecycle === "conflict"
    ) {
      return;
    }

    const initialRowLabels = buildInitialRowLabelsByBlock(detail, reportBlocks);
    setRowLabelsByBlock(initialRowLabels);
    const initialAppendAxisStates = buildInitialReportAppendAxisStates(
      detail,
      reportBlocks,
      topLevelBlockId,
      initialRowLabels,
    );
    setAppendAxisStates(initialAppendAxisStates);
    baselineAppendAxisHashRef.current = Object.fromEntries(
      Object.entries(initialAppendAxisStates).map(([blockId, state]) => [
        blockId,
        hashReportAppendAxisState(state),
      ]),
    );
    setTableRuntimeRevision((value) => value + 1);
  }, [detail, reportBlockKeys, reportBlocks, topLevelBlockId]);

  const handleDynamicFieldChange = React.useCallback(
    (fieldId: string, value: DynamicFormRuntimeValue) => {
      fieldValuesDirtyRef.current = true;
      fieldValuesUpdatedAtUtcRef.current = new Date().toISOString();
      markEditorDirty();
      setFieldValues((prev) => ({
        ...prev,
        [fieldId]: value,
      }));
      setFieldValidationErrors((current) => {
        if (!current[fieldId]) return current;
        const next = { ...current };
        delete next[fieldId];
        return next;
      });
      setFocusedFieldId((current) => current === fieldId ? null : current);
    },
    [markEditorDirty],
  );

  const handleSelectedBlockRowLabelChange = React.useCallback(
    (rowIndex: number, codes: string[]) => {
      if (!selectedReportBlock) return;
      handleReportBlockRowLabelChange(selectedReportBlock, rowIndex, codes);
    },
    [selectedReportBlock],
  );

  function readSelectedWorkbookValuesForAxisMutation(block: ReportExcelBlockRuntime) {
    const committed = selectedWorkbookGridRef.current?.commitChanges();
    const values = committed?.values1D ??
      latestWorkbookPayloadRef.current[block.blockId] ??
      selectedBlockValues;

    if (committed) {
      latestWorkbookIssuesRef.current = {
        ...latestWorkbookIssuesRef.current,
        [block.blockId]: committed.validationIssues,
      };
    }

    return normalizeWorkbookValues(values, getExpectedValueLength(block));
  }

  function applySelectedAppendAxisValues(
    block: ReportExcelBlockRuntime,
    values: ReportCellValue[],
  ) {
    const normalized = normalizeWorkbookValues(values, getExpectedValueLength(block));
    latestWorkbookPayloadRef.current = {
      ...latestWorkbookPayloadRef.current,
      [block.blockId]: normalized,
    };
    latestWorkbookHashRef.current = {
      ...latestWorkbookHashRef.current,
      [block.blockId]: hashWorkbookValues(normalized, normalized.length),
    };
    latestWorkbookIssuesRef.current = {
      ...latestWorkbookIssuesRef.current,
      [block.blockId]: validateReportBlockWorkbook(block, normalized),
    };
    latestWorkbookRawRef.current = {
      ...latestWorkbookRawRef.current,
      [block.blockId]: hydrateReportBlockWorkbook(selectedRenderableBlock ?? block, normalized),
    };
    invalidateReportBlockSectionValidation(block.blockId);
    markReportBlockDirty(block.blockId);
    setTableRuntimeRevision((value) => value + 1);
  }

  function handleAddSelectedAppendAxisInstance() {
    const block = selectedReportBlock;
    const state = selectedAppendAxisState;
    if (!block || !state || !canEditSelectedReportBlock) return;

    const slot = getReportAppendAxisAvailableSlots(block, state.mode)
      .find((candidate) => !state.instanceIds[candidate]);
    if (slot === undefined) return;

    const values = clearReportAppendAxisValues(
      block,
      readSelectedWorkbookValuesForAxisMutation(block),
      state.mode,
      slot,
    );
    setAppendAxisStates((prev) => ({
      ...prev,
      [block.blockId]: {
        ...state,
        instanceIds: state.instanceIds.map((id, index) =>
          index === slot ? createAppendAxisInstanceId(block.blockId, state.mode) : id,
        ),
      },
    }));
    applySelectedAppendAxisValues(block, values);
  }

  function handleRemoveSelectedAppendAxisInstance(slot: number) {
    const block = selectedReportBlock;
    const state = selectedAppendAxisState;
    if (!block || !state || !canEditSelectedReportBlock || !state.instanceIds[slot]) return;

    const values = clearReportAppendAxisValues(
      block,
      readSelectedWorkbookValuesForAxisMutation(block),
      state.mode,
      slot,
    );
    setAppendAxisStates((prev) => ({
      ...prev,
      [block.blockId]: {
        ...state,
        instanceIds: state.instanceIds.map((id, index) => index === slot ? null : id),
      },
    }));
    if (state.mode === "APPEND_ROWS") {
      const absoluteRow = block.dataRect.r0 + slot;
      setRowLabelsByBlock((prev) => ({
        ...prev,
        [block.blockId]: normalizeRuntimeRowLabels(
          (prev[block.blockId] ?? []).filter((row) => Number(row.rowIndex) !== absoluteRow),
        ),
      }));
    }
    applySelectedAppendAxisValues(block, values);
  }

  function handleMoveSelectedAppendAxisInstance(fromSlot: number, toSlot: number) {
    const block = selectedReportBlock;
    const state = selectedAppendAxisState;
    if (
      !block ||
      !state ||
      !canEditSelectedReportBlock ||
      !state.instanceIds[fromSlot] ||
      !state.instanceIds[toSlot]
    ) return;

    const values = swapReportAppendAxisValues(
      block,
      readSelectedWorkbookValuesForAxisMutation(block),
      state.mode,
      fromSlot,
      toSlot,
    );
    const nextInstanceIds = [...state.instanceIds];
    [nextInstanceIds[fromSlot], nextInstanceIds[toSlot]] = [
      nextInstanceIds[toSlot],
      nextInstanceIds[fromSlot],
    ];
    setAppendAxisStates((prev) => ({
      ...prev,
      [block.blockId]: { ...state, instanceIds: nextInstanceIds },
    }));

    if (state.mode === "APPEND_ROWS") {
      const firstRow = block.dataRect.r0 + fromSlot;
      const secondRow = block.dataRect.r0 + toSlot;
      setRowLabelsByBlock((prev) => {
        const rows = (prev[block.blockId] ?? []).map((row) => {
          const rowIndex = Number(row.rowIndex);
          if (rowIndex !== firstRow && rowIndex !== secondRow) return row;
          const nextRowIndex = rowIndex === firstRow ? secondRow : firstRow;
          return {
            ...row,
            rowIndex: nextRowIndex,
            rowKey: buildReportRowKey(nextRowIndex),
          };
        });
        return { ...prev, [block.blockId]: normalizeRuntimeRowLabels(rows) };
      });
    }
    applySelectedAppendAxisValues(block, values);
  }

  async function performSaveDraft(
    payload?: WorkbookSavePayload,
    options: { silent?: boolean } = {},
  ): Promise<boolean> {
    if (!detail) return false;
    if (!canEdit || runtimeWriteBlocked) return false;
    if (
      !payload &&
      !fieldValuesDirtyRef.current &&
      Object.keys(dirtyReportBlockIdsRef.current).length === 0 &&
      (saveLifecycle === "clean" || saveLifecycle === "saved")
    ) {
      return true;
    }
    const mutationSequence = draftChangeSequenceRef.current;

    const payloadBlockId = payload?.values1D
      ? normalizeBlockId(payload.blockId ?? topLevelBlockId)
      : null;
    const payloadBlock = payloadBlockId
      ? reportBlocks.find((block) => normalizeBlockId(block.blockId) === payloadBlockId)
      : null;
    const payloadHash = payload?.values1D && payloadBlock
      ? getWorkbookPayloadHash(payloadBlock, payload)
      : null;

    if (payload?.values1D && payloadBlockId) {
      latestWorkbookPayloadRef.current = {
        ...latestWorkbookPayloadRef.current,
        [payloadBlockId]: payload.values1D,
      };
      if (payloadHash) {
        latestWorkbookHashRef.current = {
          ...latestWorkbookHashRef.current,
          [payloadBlockId]: payloadHash,
        };
      }
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
        if (!options.silent) showFirstReportTableIssue(tableIssues, "save");
        return false;
      }
    }

    if (!payloadBlockId && !reportDataLocked && dynamicFormRuntime) {
      const fieldErrors = collectDynamicFieldValidationErrors(dynamicFormRuntimeFields, fieldValues);
      const invalidField = applyFieldErrors(fieldErrors);
      if (invalidField) {
        if (!options.silent) showMessage(fieldErrors[invalidField.id], "warning");
        return false;
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
      fieldValuesUpdatedAtUtcRef.current,
    );
    const completedDatePayload = canEditCompletedDate ? dayKeyToApiDate(completedDate) : null;
    const advancedSettings = buildReportAdvancedSettingsPayload(
      detail,
      dataOrigin,
      cumulativeContributionMode,
    );

    const command = getOrCreatePayloadCommand(
      payloadBlockId ? `table-patch:${payloadBlockId}` : "save-full",
    );
    setSaveLifecycle("saving");
    try {
      if (payloadBlockId && !props.previewData) {
        const changedBlock = reportBlocks.find(
          (block) => normalizeBlockId(block.blockId) === payloadBlockId,
        );
        const blockJson = changedBlock
          ? buildTableValuesBlockJson(
              changedBlock,
              valuesByBlock,
              rowLabelsByBlock,
              appendAxisStates,
            )
          : null;
        const topLevelPatch =
          payloadBlockId === normalizeBlockId(topLevelBlockId)
            ? buildRuntimeValuesPatch(
                normalizeWorkbookValues(detail.values1D ?? [], topLevelValues.length),
                topLevelValues,
              )
            : [];

        const response = await saveDraftPatch({
          id: detail.id,
          data: {
            ...command,
            values1DLength: topLevelValues.length,
            values1DPatch: topLevelPatch.length > 0 ? topLevelPatch : null,
            fieldValuesJson: null,
            tableBlockPatches: blockJson ? [{ blockId: payloadBlockId, blockJson }] : null,
            ...advancedSettings,
            completedDate: completedDatePayload,
            lateReason: lateReason.trim() || null,
            note: null,
          },
        }).unwrap();

        acceptPayloadMutationResponse(response);
        await refetchReportSectionSummaries();
        onSaved?.();
        if (payloadBlockId) {
          if (payloadHash) {
            baselineWorkbookHashRef.current = {
              ...baselineWorkbookHashRef.current,
              [payloadBlockId]: payloadHash,
            };
          }
          baselineRowLabelHashRef.current = {
            ...baselineRowLabelHashRef.current,
            [payloadBlockId]: hashReportRowLabels(rowLabelsByBlock[payloadBlockId]),
          };
          baselineAppendAxisHashRef.current = {
            ...baselineAppendAxisHashRef.current,
            [payloadBlockId]: hashReportAppendAxisState(appendAxisStates[payloadBlockId]),
          };
          if (mutationSequence === draftChangeSequenceRef.current) {
            clearReportBlockDirty(payloadBlockId);
          }
        }
        const hasOtherDirtyBlocks = Object.keys(dirtyReportBlockIdsRef.current)
          .some((blockId) => blockId !== payloadBlockId);
        setSaveLifecycle(
          mutationSequence !== draftChangeSequenceRef.current || fieldValuesDirtyRef.current || hasOtherDirtyBlocks
            ? "dirty"
            : "saved",
        );
        if (!options.silent) showMessage("Đã lưu nháp.", "success");
        return true;
      }

      const tableValuesJson = buildTableValuesJson(
        detail,
        dynamicFormRuntime,
        reportBlocks,
        valuesByBlock,
        rowLabelsByBlock,
        appendAxisStates,
      );

      const response = await saveDraft({
        id: detail.id,
        data: {
          ...command,
          values1D: topLevelValues,
          fieldValuesJson,
          tableValuesJson,
          ...advancedSettings,
          completedDate: completedDatePayload,
          lateReason: lateReason.trim() || null,
          note: null,
        },
      }).unwrap();

      acceptPayloadMutationResponse(response);
      await refetchReportSectionSummaries();
      onSaved?.();
      const unchangedDuringSave = mutationSequence === draftChangeSequenceRef.current;
      if (unchangedDuringSave) {
        fieldValuesDirtyRef.current = false;
        baselineWorkbookHashRef.current = {
          ...baselineWorkbookHashRef.current,
          ...latestWorkbookHashRef.current,
        };
        const nextRowLabelHashes = { ...baselineRowLabelHashRef.current };
        Object.keys(dirtyReportBlockIdsRef.current).forEach((blockId) => {
          nextRowLabelHashes[blockId] = hashReportRowLabels(rowLabelsByBlock[blockId]);
        });
        baselineRowLabelHashRef.current = nextRowLabelHashes;
        baselineAppendAxisHashRef.current = Object.fromEntries(
          Object.entries(appendAxisStates).map(([blockId, state]) => [
            blockId,
            hashReportAppendAxisState(state),
          ]),
        );
        latestWorkbookHashRef.current = {};
        clearAllReportBlockDirty();
        removePersistedReportDraft(detail.id);
        setSaveLifecycle("saved");
      } else {
        setSaveLifecycle("dirty");
      }
      if (!options.silent) showMessage("Đã lưu nháp.", "success");
      return true;
    } catch (error) {
      console.error(error);
      applyServerFieldErrors(error);
      const message = handlePayloadMutationError(error, "Lưu nháp thất bại.");
      if (!options.silent) showMessage(message, "error");
      return false;
    }
  }

  async function handleSaveDraft(
    payload?: WorkbookSavePayload,
    options: { silent?: boolean } = {},
  ): Promise<boolean> {
    const inFlight = draftSaveInFlightRef.current;
    if (inFlight) return inFlight;

    const operation = performSaveDraft(payload, options);
    draftSaveInFlightRef.current = operation;
    try {
      return await operation;
    } finally {
      if (draftSaveInFlightRef.current === operation) {
        draftSaveInFlightRef.current = null;
      }
    }
  }

  autosaveDraftRef.current = async () => {
    if (
      !detail ||
      !canEdit ||
      busy ||
      props.previewData ||
      runtimeWriteBlocked ||
      saveLifecycle === "conflict"
    ) {
      return false;
    }

    if (tableDialogOpen && selectedReportBlock && dirtyReportBlockIdsRef.current[selectedReportBlock.blockId]) {
      const committed = selectedWorkbookGridRef.current?.commitChanges();
      if (committed) {
        latestWorkbookPayloadRef.current = {
          ...latestWorkbookPayloadRef.current,
          [selectedReportBlock.blockId]: committed.values1D,
        };
        latestWorkbookHashRef.current = {
          ...latestWorkbookHashRef.current,
          [selectedReportBlock.blockId]: committed.valuesHash,
        };
        latestWorkbookIssuesRef.current = {
          ...latestWorkbookIssuesRef.current,
          [selectedReportBlock.blockId]: committed.validationIssues,
        };
        latestWorkbookRawRef.current = {
          ...latestWorkbookRawRef.current,
          [selectedReportBlock.blockId]: committed.rawWorkbookData,
        };
      }
    }

    return handleSaveDraft(undefined, { silent: true });
  };

  React.useEffect(() => {
    if (
      saveLifecycle !== "dirty" ||
      !canEdit ||
      busy ||
      props.previewData ||
      runtimeWriteBlocked
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      void autosaveDraftRef.current?.();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [
    busy,
    canEdit,
    draftChangeSequence,
    props.previewData,
    runtimeWriteBlocked,
    saveLifecycle,
  ]);

  const handleSaveSelectedWorkbookDraft = async (): Promise<boolean> => {
    if (!selectedReportBlock || !canEditSelectedReportBlock) return false;

    const payload = selectedWorkbookGridRef.current?.commitChanges();
    if (!payload) {
      showMessage("Không lấy được dữ liệu bảng để lưu.", "error");
      return false;
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
      showMessage(`${section.title}: phát hiện ${payload.validationIssues.length} lỗi dữ liệu bảng.`, "error");
      return false;
    }

    return await handleSaveDraft({
      blockId: selectedReportBlock.blockId,
      values1D: payload.values1D,
      valuesHash: payload.valuesHash,
      rawWorkbookData: payload.rawWorkbookData,
      validationIssues: payload.validationIssues,
    });
  };

  function buildSelectedBlockFallbackPayload(block: ReportExcelBlockRuntime): WorkbookSavePayload {
    const expectedLength = getExpectedValueLength(block);
    const values1D = normalizeWorkbookValues(selectedBlockValues, expectedLength);
    return {
      blockId: block.blockId,
      values1D,
      valuesHash: latestWorkbookHashRef.current[block.blockId] ?? hashWorkbookValues(values1D, expectedLength),
      rawWorkbookData: selectedWorkbookData,
      validationIssues: latestWorkbookIssuesRef.current[block.blockId] ?? [],
    };
  }

  function closeTableDialogNow() {
    setUnsavedTableClose(null);
    setTableDialogOpen(false);
  }

  function requestCloseTableDialog() {
    if (busy) return;

    if (!canEditSelectedReportBlock || !selectedReportBlock) {
      closeTableDialogNow();
      return;
    }

    const rowLabelsDirty = isReportBlockRowLabelsDirty(selectedReportBlock.blockId);
    const appendAxisDirty = isReportBlockAppendAxisDirty(selectedReportBlock.blockId);
    if (!selectedReportBlockDirty && !rowLabelsDirty && !appendAxisDirty) {
      closeTableDialogNow();
      return;
    }

    const committedPayload = selectedReportBlockDirty
      ? selectedWorkbookGridRef.current?.commitChanges() ?? null
      : null;
    const payloadDirty = selectedReportBlockDirty
      ? isWorkbookPayloadDirty(selectedReportBlock, committedPayload)
      : false;
    const hasUnsavedChanges = payloadDirty || rowLabelsDirty || appendAxisDirty;

    if (!hasUnsavedChanges) {
      clearReportBlockDirty(selectedReportBlock.blockId);
      closeTableDialogNow();
      return;
    }

    setUnsavedTableClose({
      open: true,
      blockId: selectedReportBlock.blockId,
      blockLabel: selectedReportBlock.label || "Bảng dữ liệu",
      payload: committedPayload && payloadDirty
        ? {
            ...committedPayload,
            blockId: selectedReportBlock.blockId,
          }
        : buildSelectedBlockFallbackPayload(selectedReportBlock),
    });
  }

  async function handleSaveAndCloseUnsavedTable() {
    const pending = unsavedTableClose;
    const block = reportBlocks.find((item) => item.blockId === pending?.blockId) ?? selectedReportBlock;
    if (!pending || !block) return;

    const payload = pending.payload ?? buildSelectedBlockFallbackPayload(block);
    const saved = await handleSaveDraft({
      ...payload,
      blockId: block.blockId,
    });
    if (!saved) return;

    closeTableDialogNow();
  }

  function handleDiscardAndCloseUnsavedTable() {
    const pending = unsavedTableClose;
    if (pending?.blockId) discardReportBlockDraft(pending.blockId);
    closeTableDialogNow();
  }

  const handleSubmit = async () => {
    if (!detail || !canSubmit || runtimeWriteBlocked) return;

    if (requiresLateReason && !lateReason.trim()) {
      showMessage("Bắt buộc nhập lý do trễ hạn trước khi nộp.", "warning");
      return;
    }

    if (requiresCompletedDate && !completedDate) {
      showMessage("Trước khi nộp báo cáo quá khứ, bắt buộc nhập ngày hoàn thành.", "warning");
      return;
    }

    if (completedDate && completedDateMin && completedDate < completedDateMin) {
      showMessage("Ngày hoàn thành nằm ngoài khoảng được phép của kỳ báo cáo.", "warning");
      return;
    }

    if (completedDate && completedDateMax && completedDate > completedDateMax) {
      showMessage("Ngày hoàn thành nằm ngoài khoảng được phép của kỳ báo cáo.", "warning");
      return;
    }

    if (!reportDataLocked && dynamicFormTemplateId && !dynamicFormRuntime) {
      showMessage("Chưa tải xong trường bổ sung.", "warning");
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

    const fieldErrors = !reportDataLocked && dynamicFormRuntime
      ? collectDynamicFieldValidationErrors(dynamicFormRuntimeFields, fieldValues)
      : {};
    const firstInvalidDynamicField = applyFieldErrors(fieldErrors);
    if (firstInvalidDynamicField) {
      showMessage(fieldErrors[firstInvalidDynamicField.id], "warning");
      return;
    }

    const completedDatePayload = canEditCompletedDate ? dayKeyToApiDate(completedDate) : null;

    try {
      const valuesByBlock = buildWorkbookValuesByBlock(
        detail,
        reportBlocks,
        latestWorkbookPayloadRef.current,
      );
      const missingRequiredTableColumns = getMissingDynamicFlowRequiredTableColumns(
        dynamicFlowPermissions,
        reportBlocks,
        valuesByBlock,
        rowLabelsByBlock,
        appendAxisStates,
      );
      if (missingRequiredTableColumns.length > 0) {
        showMessage(
          `Thiếu dữ liệu bắt buộc ở cột bảng: ${missingRequiredTableColumns.slice(0, 3).join(", ")}`,
          "warning",
        );
        return;
      }

      const topLevelBlock = reportBlocks.find((block) => block.blockId === topLevelBlockId) ?? reportBlocks[0];
      const topLevelValues = normalizeWorkbookValues(
        valuesByBlock[topLevelBlockId] ?? detail.values1D ?? [],
        topLevelBlock ? getExpectedValueLength(topLevelBlock) : detail.w * detail.h,
      );
      const fieldValuesJson = buildDynamicFieldValuesJson(
        detail,
        dynamicFormRuntime,
        fieldValues,
        fieldValuesUpdatedAtUtcRef.current,
      );
      const tableValuesJson = buildTableValuesJson(
        detail,
        dynamicFormRuntime,
        reportBlocks,
        valuesByBlock,
        rowLabelsByBlock,
        appendAxisStates,
      );
      const advancedSettings = buildReportAdvancedSettingsPayload(
        detail,
        dataOrigin,
        cumulativeContributionMode,
      );

      const command = getOrCreateLifecycleCommand("submit");
      setSaveLifecycle("saving");
      const response = await submitReport({
        id: detail.id,
        data: {
          ...command,
          values1D: topLevelValues,
          fieldValuesJson,
          tableValuesJson,
          ...advancedSettings,
          completedDate: completedDatePayload,
          lateReason: lateReason.trim() || null,
          note: null,
        },
      }).unwrap();

      acceptPayloadMutationResponse(response);
      await refetch();
      await refetchReportSectionSummaries();
      fieldValuesDirtyRef.current = false;
      clearAllReportBlockDirty();
      removePersistedReportDraft(detail.id);
      setSaveLifecycle("saved");
      onSubmitted?.();
      showMessage(
        hasPendingLifecycleProjection(response)
          ? "Báo cáo đã được commit; projection đang được hệ thống phục hồi."
          : "Đã nộp báo cáo.",
        hasPendingLifecycleProjection(response)
          ? "warning"
          : "success",
      );
    } catch (error) {
      console.error(error);
      applyServerFieldErrors(error);
      showMessage(handlePayloadMutationError(error, "Nộp báo cáo thất bại."), "error");
    }
  };

  const handleWithdraw = async () => {
    if (!detail || !canWithdraw) return;

    if (!withdrawReason.trim()) {
      showMessage("Bắt buộc nhập lý do thu hồi.", "warning");
      return;
    }

    try {
      const command = getOrCreateLifecycleCommand("withdraw");
      const response = await withdrawSubmittedReport({
        id: detail.id,
        data: {
          ...command,
          returnReason: withdrawReason.trim(),
          reviewerComment: null,
        },
      }).unwrap();

      acceptPayloadMutationResponse(response);
      setWithdrawOpen(false);
      await refetch();
      await refetchReportSectionSummaries();
      showMessage(
        hasPendingLifecycleProjection(response)
          ? "Thu hồi đã được commit; projection đang được hệ thống phục hồi."
          : "Đã thu hồi báo cáo.",
        hasPendingLifecycleProjection(response)
          ? "warning"
          : "success",
      );
    } catch (error) {
      console.error(error);
      showMessage(handlePayloadMutationError(error, "Thu hồi báo cáo thất bại."), "error");
    }
  };

  const handleLoadConflictServerVersion = async () => {
    if (props.previewData) return;
    try {
      const result = await refetch();
      if (!result.data) throw new Error("Không nhận được bản báo cáo mới từ máy chủ.");
      const latest = decodeWorkReportRuntimeDetail(result.data);
      if (dynamicFormRuntime && dynamicFormDetail) {
        validateWorkReportPayloadAgainstSchema(result.data, dynamicFormRuntime, dynamicFormDetail);
      }
      setConflictServerSnapshot({
        payloadRevision: latest.payloadRevision,
        lifecycleRevision: latest.lifecycleRevision,
        payloadHash: latest.payloadHash,
        updatedAtUtc: latest.payloadUpdatedAtUtc ?? latest.updatedAtUtc,
      });
      showMessage(
        "Đã tải metadata bản máy chủ để đối chiếu. Bản nháp cục bộ chưa bị ghi đè.",
        "info",
      );
    } catch (error) {
      showMessage(normalizeApiError(error).message || "Không tải được bản máy chủ mới.", "error");
    }
  };

  const handleRebaseConflictDraft = () => {
    const snapshot = conflictServerSnapshot;
    if (!snapshot) return;
    const rebased = buildRebasedRuntimeCommandState(snapshot);
    payloadRevisionRef.current = rebased.payloadRevision;
    lifecycleRevisionRef.current = rebased.lifecycleRevision;
    payloadHashRef.current = snapshot.payloadHash ?? null;
    setPayloadRevision(rebased.payloadRevision);
    setLifecycleRevision(rebased.lifecycleRevision);
    setPayloadHash(snapshot.payloadHash ?? null);
    pendingPayloadCommandsRef.current = rebased.pendingCommands;
    setConflictServerSnapshot(null);
    setConflictMessage(null);
    draftChangeSequenceRef.current += 1;
    setDraftChangeSequence(draftChangeSequenceRef.current);
    setSaveLifecycle("dirty");
    showMessage(
      "Đã rebase bản nháp cục bộ lên revision máy chủ. Lần lưu tiếp theo sẽ dùng command mới.",
      "warning",
    );
  };

  const requestEditorBack = () => {
    if (!props.onBack) return;
    if (hasUnsavedReportChanges) {
      setManualBackPending(true);
      return;
    }
    props.onBack();
  };

  const refreshLifecycleProjection = React.useCallback(async (announce = true) => {
    if (props.previewData) return;
    try {
      const result = await refetch();
      await refetchReportSectionSummaries();
      const pending = Boolean(
        hasPendingLifecycleProjection(result.data),
      );
      setLifecycleProjectionPending(pending);
      if (announce) {
        showMessage(
          pending
            ? "Lifecycle đã commit; projection vẫn đang được hệ thống phục hồi."
            : "Projection lifecycle đã đồng bộ xong.",
          pending ? "warning" : "success",
        );
      }
    } catch (error) {
      if (announce) showMessage(normalizeApiError(error).message, "error");
    }
  }, [props.previewData, refetch, refetchReportSectionSummaries, showMessage]);

  const refreshDynamicFlowMappingCanonical = React.useCallback(async () => {
    if (props.previewData) return;
    await Promise.all([
      refetch(),
      refetchReportSectionSummaries(),
    ]);
  }, [props.previewData, refetch, refetchReportSectionSummaries]);

  const handleDynamicFlowMappingApplied = React.useCallback(
    async (response: WorkAssignmentReportResponse) => {
      acceptPayloadMutationResponse(response);
      setDataOrigin(normalizeReportDataOrigin(response.dataOrigin));
      setCumulativeContributionMode(
        normalizeContributionMode(response.cumulativeContributionMode, response.dataOrigin),
      );
      setSaveLifecycle("saved");
      showMessage("Đã áp dụng mapping từ snapshot canonical.", "success");
      await refreshDynamicFlowMappingCanonical();
      props.onSaved?.();
    },
    [
      acceptPayloadMutationResponse,
      props,
      refreshDynamicFlowMappingCanonical,
      showMessage,
    ],
  );

  React.useEffect(() => {
    if (!lifecycleProjectionPending || props.previewData) return;
    const timer = window.setTimeout(() => {
      void refreshLifecycleProjection(false);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [lifecycleProjectionPending, props.previewData, refreshLifecycleProjection]);

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

  if (isReportQueryError || detailDecode.error || !detail) {
    const normalized = isReportQueryError ? normalizeApiError(reportQueryError) : null;
    return (
      <Alert
        severity="error"
        action={props.previewData ? undefined : (
          <Button color="inherit" size="small" onClick={() => void refetch()}>
            Thử lại
          </Button>
        )}
      >
        {detailDecode.error ?? (
          normalized?.status === 403
            ? "Bạn không có quyền đọc báo cáo này."
            : normalized?.message || "Không tải được chi tiết báo cáo hoặc báo cáo không tồn tại."
        )}
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
            {props.onBack && (
              <Box>
                <Button
                  variant="text"
                  startIcon={<ArrowBackOutlinedIcon />}
                  onClick={requestEditorBack}
                >
                  Quay lại danh sách kỳ báo cáo
                </Button>
              </Box>
            )}
            {(canEdit || canSubmit || canWithdraw) && (
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" aria-live="polite">
                  <Chip
                    size="small"
                    variant="outlined"
                    color={
                      saveLifecycle === "conflict"
                        ? "error"
                        : saveLifecycle === "dirty"
                          ? "warning"
                          : saveLifecycle === "saving"
                            ? "info"
                            : saveLifecycle === "saved"
                              ? "success"
                              : "default"
                    }
                    label={
                      saveLifecycle === "conflict"
                        ? "Xung đột phiên bản"
                        : saveLifecycle === "dirty"
                          ? "Có thay đổi chưa lưu"
                          : saveLifecycle === "saving"
                            ? "Đang lưu..."
                            : saveLifecycle === "saved"
                              ? "Đã lưu"
                              : "Chưa thay đổi"
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    Payload {payloadRevision} / Lifecycle {lifecycleRevision}
                  </Typography>
                </Stack>
                <ReportActionBar
                  canEdit={canEdit}
                  canSubmit={canSubmit}
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

            {conflictMessage && (
              <Alert severity="error" role="alert">
                <Stack spacing={1}>
                  <Typography variant="body2">{conflictMessage}</Typography>
                  {conflictServerSnapshot && (
                    <Typography variant="caption">
                      Bản máy chủ: payload revision {conflictServerSnapshot.payloadRevision}, lifecycle revision{" "}
                      {conflictServerSnapshot.lifecycleRevision}
                      {conflictServerSnapshot.updatedAtUtc
                        ? ` · cập nhật ${formatDate(conflictServerSnapshot.updatedAtUtc, true)}`
                        : ""}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      color="inherit"
                      variant="outlined"
                      startIcon={<RefreshOutlinedIcon />}
                      onClick={() => void handleLoadConflictServerVersion()}
                    >
                      Tải bản máy chủ để đối chiếu
                    </Button>
                    <Button
                      size="small"
                      color="inherit"
                      variant="contained"
                      disabled={!conflictServerSnapshot}
                      onClick={handleRebaseConflictDraft}
                    >
                      Rebase bản nháp lên revision này
                    </Button>
                  </Stack>
                </Stack>
              </Alert>
            )}

            {lifecycleProjectionPending && (
              <Alert
                severity="warning"
                action={(
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<RefreshOutlinedIcon />}
                    onClick={() => void refreshLifecycleProjection(true)}
                  >
                    Kiểm tra lại
                  </Button>
                )}
              >
                Lifecycle đã commit thành công; projection đang chờ hệ thống phục hồi. Không gửi lại command cũ.
              </Alert>
            )}

            {runtimeLoadError && (
              <Alert
                severity="error"
                role="alert"
                action={(
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<RefreshOutlinedIcon />}
                    onClick={() => {
                      if (isReportSectionsError) void refetchReportSectionSummaries();
                      if (dynamicFormTemplateId) void refetchDynamicForm();
                    }}
                  >
                    Thử lại
                  </Button>
                )}
              >
                {runtimeLoadError} Mọi thao tác ghi đã được khóa để tránh làm mất dữ liệu.
              </Alert>
            )}

            {Object.keys(fieldValidationErrors).length > 0 && (
              <Alert severity="error" role="alert">
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2">
                    Cần sửa {Object.keys(fieldValidationErrors).length} trường trước khi lưu hoặc nộp.
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {dynamicFormRuntimeFields
                      .filter((field) => Boolean(fieldValidationErrors[field.id]))
                      .map((field) => (
                        <Button
                          key={field.id}
                          size="small"
                          color="inherit"
                          variant="outlined"
                          onClick={() => focusRuntimeField(field.id)}
                        >
                          {getDynamicFormFieldDisplayName(field)}
                        </Button>
                      ))}
                  </Stack>
                </Stack>
              </Alert>
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

            {props.dynamicFlowRuntimeEnabled && !props.previewData ? (
              <DynamicFlowMappingRuntimePanel
                reportId={detail.id}
                assignmentId={detail.workAssignmentId}
                reportStatus={detail.status}
                payloadRevision={payloadRevision}
                lifecycleRevision={lifecycleRevision}
                payloadHash={payloadHash}
                permissions={dynamicFlowPermissions}
                forceReadOnly={Boolean(props.forceReadOnly)}
                localDraftState={saveLifecycle}
                onRefreshCanonical={refreshDynamicFlowMappingCanonical}
                onApplied={handleDynamicFlowMappingApplied}
              />
            ) : null}

            {reportDataLocked && (
              <Alert severity={detail.aggregateSnapshotDirty ? "warning" : "info"}>
                Báo cáo này dùng dữ liệu đã gắn từ kết quả tổng hợp thủ công. Phần dữ liệu biểu mẫu được khóa nhập và lấy từ bản chụp tổng hợp hiện hành; người báo cáo chỉ cập nhật được các thông tin đi kèm.
                {detail.aggregateSnapshotDirty
                  ? " Bản chụp đang cần làm mới và sẽ được hệ thống cập nhật khi mở báo cáo."
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
            fields={dynamicFormRuntimeFields}
            getFieldState={getDynamicFormRuntimeFieldState}
            values={fieldValues}
            readOnly={!canEditReportData}
            disabled={busy}
            onChange={handleDynamicFieldChange}
            title="Dữ liệu biểu mẫu"
            getSectionExtraCount={getReportSectionTableCount}
            renderSectionExtra={renderReportSectionTables}
            getSectionEntryState={getReportSectionEntryState}
            getSectionValidationState={(section) => {
              const state = sectionValidationState[section.id];
              return state
                ? { status: state.status, issueCount: state.issueCount }
                : null;
            }}
            onSectionChange={handleRuntimeSectionChange}
            activeSectionId={activeSectionId}
            onActiveSectionChange={handleActiveReportSectionChange}
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
                  Thống kê và lũy kế.
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
              <ReportContributionSection
                canEdit={canEdit}
                busy={busy}
                dataOrigin={dataOrigin}
                cumulativeContributionMode={cumulativeContributionMode}
                policyJson={detail.cumulativeContributionPolicyJson}
                summarySourceJson={detail.summarySourceJson}
                embedded
                onDataOriginChange={handleDataOriginChange}
                onContributionModeChange={(next) => {
                  markEditorDirty();
                  setCumulativeContributionMode(next);
                }}
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
          setCompletedDate={(next) => {
            markEditorDirty();
            setCompletedDate(next);
          }}
          setLateReason={(next) => {
            markEditorDirty();
            setLateReason(next);
          }}
        />
      </Stack>
        </Box>
      </Box>

      <Dialog
        data-testid="report-table-dialog"
        open={tableDialogOpen}
        onClose={requestCloseTableDialog}
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
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle1" fontWeight={800} noWrap>
                  {selectedReportBlock?.label ?? "Bảng dữ liệu"}
                </Typography>
                {selectedReportBlockDirty && (
                  <Chip size="small" color="warning" variant="outlined" label="Chưa lưu" />
                )}
              </Stack>
              {selectedReportBlock && (
                <Typography variant="caption" color="text.secondary">
                  {getReportBlockButtonSummary(selectedReportBlock)}
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {canEditSelectedReportBlock && (
                <Button
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  disabled={busy}
                  onClick={() => void handleSaveSelectedWorkbookDraft()}
                >
                  Lưu nháp bảng này
                </Button>
              )}
              <Button onClick={requestCloseTableDialog} disabled={busy}>
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
              {selectedSummaryTemplate && (
                <Alert severity="info" sx={{ m: 1.5, mb: 0 }}>
                  Đây là mẫu kết quả tổng hợp chỉ đọc. Dữ liệu được tạo từ nguồn tổng hợp và không được gửi như dữ liệu nhập của báo cáo.
                </Alert>
              )}

              {selectedAppendAxisState && (
                <Box sx={{ p: 1.5, pb: 0 }}>
                  <ReportAppendAxisControls
                    blockLabel={selectedReportBlock.label || "Bảng dữ liệu"}
                    state={selectedAppendAxisState}
                    availableSlots={getReportAppendAxisAvailableSlots(
                      selectedReportBlock,
                      selectedAppendAxisState.mode,
                    )}
                    canEdit={canEditSelectedReportBlock}
                    busy={busy}
                    onAdd={handleAddSelectedAppendAxisInstance}
                    onRemove={handleRemoveSelectedAppendAxisInstance}
                    onMove={handleMoveSelectedAppendAxisInstance}
                  />
                </Box>
              )}

              {selectedWorkbookErrorMessage ? (
                <Alert
                  severity="error"
                  sx={{ m: 1.5 }}
                  action={(
                    <Button
                      color="inherit"
                      size="small"
                      startIcon={<RefreshOutlinedIcon />}
                      onClick={() => void refetchSelectedDynamicExcel()}
                    >
                      Thử lại
                    </Button>
                  )}
                >
                  {selectedWorkbookErrorMessage} Block đã được khóa ghi.
                </Alert>
              ) : (
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
                    lockedCellKeys={selectedBlockLockedCellKeys}
                    mode={canEditSelectedReportBlock ? "edit" : "view"}
                    readOnly={!canEditSelectedReportBlock}
                    saving={busy || isFetchingSelectedDynamicExcel}
                    showActions={false}
                    embeddedFullscreen
                    changeCommitMode="manual"
                    saveLabel="Lưu nháp bảng này"
                    backLabel="Đóng"
                    onBack={requestCloseTableDialog}
                    onDirty={() => markReportBlockDirty(selectedReportBlock.blockId)}
                    onChangeRaw={(rawWorkbookData, payload) => {
                      markReportBlockDirty(selectedReportBlock.blockId);
                      invalidateReportBlockSectionValidation(selectedReportBlock.blockId);
                      latestWorkbookPayloadRef.current = {
                        ...latestWorkbookPayloadRef.current,
                        [selectedReportBlock.blockId]:
                          payload?.values1D ??
                          latestWorkbookPayloadRef.current[selectedReportBlock.blockId] ??
                          selectedBlockValues,
                      };
                      if (payload?.valuesHash) {
                        latestWorkbookHashRef.current = {
                          ...latestWorkbookHashRef.current,
                          [selectedReportBlock.blockId]: payload.valuesHash,
                        };
                      }
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
                      void handleSaveDraft({
                        blockId: selectedReportBlock.blockId,
                        values1D: payload.values1D,
                        valuesHash: payload.valuesHash,
                        rawWorkbookData: payload.rawWorkbookData,
                        validationIssues: payload.validationIssues,
                      });
                    }}
                    />
                  </React.Suspense>
                </Box>
              )}

              <ReportRowLabelEditor
                block={selectedReportBlock}
                rowLabels={selectedBlockRowLabels}
                activeRowSlots={
                  selectedAppendAxisState?.mode === "APPEND_ROWS"
                    ? selectedAppendAxisState.instanceIds
                        .map((id, slot) => id ? slot : -1)
                        .filter((slot) => slot >= 0)
                    : null
                }
                allowedCodes={selectedBlockAllowedRowLabelCodes}
                allowedDataTypes={[selectedBlockRowLabelDataType]}
                canEdit={canEditSelectedReportBlock}
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

      <UnsavedChangesDialog
        open={Boolean(unsavedTableClose?.open)}
        title="Bảng dữ liệu chưa lưu"
        message={
          <Stack spacing={1}>
            <Typography variant="body2">
              Bảng <b>{unsavedTableClose?.blockLabel ?? "dữ liệu"}</b> đang có thay đổi chưa lưu.
              Nếu đóng ngay, dữ liệu vừa nhập trong chế độ toàn màn hình sẽ bị bỏ.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Chọn <b>Lưu nháp bảng này</b> để chỉ kiểm tra và lưu bảng đang mở. Nút <b>Lưu nháp</b> ngoài màn hình báo cáo vẫn kiểm tra toàn bộ phần và bảng trước khi lưu.
            </Typography>
          </Stack>
        }
        saveText="Lưu nháp bảng này"
        discardText="Đóng không lưu"
        cancelText="Tiếp tục chỉnh sửa"
        saving={busy}
        onSave={() => void handleSaveAndCloseUnsavedTable()}
        onDiscard={handleDiscardAndCloseUnsavedTable}
        onCancel={() => setUnsavedTableClose(null)}
      />

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
                Phần {sectionValidationPrompt.section.title} có {sectionValidationPrompt.blockCount} bảng dữ liệu.
                Hệ thống chỉ kiểm tra các ô nhập dữ liệu trong bảng; tiêu đề, ô công thức, ô bỏ trống không nhập và phần mẫu tự ghi đè sẽ được bỏ qua.
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
                  ? `Phần ${tableValidationDialog.sectionTitle} có ${tableValidationDialog.issues.length} lỗi dữ liệu bảng.`
                  : `Phần ${tableValidationDialog.sectionTitle} chưa phát hiện lỗi dữ liệu bảng.`}
                {" "}Hệ thống không kiểm tra tiêu đề, ô bỏ trống không nhập, ô công thức hoặc dữ liệu mẫu tự ghi đè.
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
                      Đang hiển thị 50 lỗi đầu tiên. Hãy sửa theo từng bảng rồi kiểm tra lại phần này.
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
              Kiểm tra lại phần
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

      <UnsavedChangesDialog
        open={manualBackPending || navigationBlocker.state === "blocked"}
        title={saveLifecycle === "conflict" ? "Bản nháp đang xung đột" : "Báo cáo có thay đổi chưa lưu"}
        message={
          saveLifecycle === "conflict"
            ? "Bản nháp cục bộ đang xung đột với máy chủ. Hãy ở lại để tải bản mới và rebase, hoặc rời trang và bỏ bản nháp cục bộ."
            : "Bản nháp gồm trường, bảng, nhãn dòng, trục động, thiết lập và section hiện tại chưa lưu xong."
        }
        saveText="Lưu nháp rồi rời trang"
        discardText="Bỏ bản nháp và rời trang"
        cancelText="Ở lại chỉnh sửa"
        saving={busy}
        onSave={() => {
          if (saveLifecycle === "conflict") {
            showMessage("Hãy rebase bản nháp trước khi lưu.", "warning");
            return;
          }
          void (async () => {
            const saved = await handleSaveDraft();
            if (!saved) return;
            allowNavigationRef.current = true;
            if (manualBackPending) {
              setManualBackPending(false);
              props.onBack?.();
            } else if (navigationBlocker.state === "blocked") {
              navigationBlocker.proceed();
            }
          })();
        }}
        onDiscard={() => {
          removePersistedReportDraft(detail.id);
          allowNavigationRef.current = true;
          if (manualBackPending) {
            setManualBackPending(false);
            props.onBack?.();
          } else if (navigationBlocker.state === "blocked") {
            navigationBlocker.proceed();
          }
        }}
        onCancel={() => {
          setManualBackPending(false);
          if (navigationBlocker.state === "blocked") navigationBlocker.reset();
        }}
      />

      <ReportLogsDialog
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        logs={logs}
        isFetching={isFetchingLogs}
        isError={isLogsError}
      />

      <ActionToast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}
