import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import type { Sheet } from "@fortune-sheet/core";
import { useGetDynamicExcelQuery } from "../../../api/dynamicExcelApi";
import {
  useGetDynamicFormQuery,
  type DynamicFormDetail,
} from "../../../api/dynamicFormApi";
import {
  useGetAggregateTableMutation,
  useGetDynamicFormAggregateTableMutation,
  useGetWorkAssignmentAggregateConfigQuery,
  useGetWorkAssignmentBasicSummaryConfigQuery,
  useGetWorkAssignmentBasicSummaryMutation,
  useSaveWorkAssignmentAggregateConfigMutation,
  useSaveWorkAssignmentBasicSummaryConfigMutation,
} from "../../../api/aggregateDataApi";
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
  DynamicFormStackedTableDto,
  WorkAssignmentBasicSummaryDefaultMethodsDto,
  WorkAssignmentBasicSummaryRequest,
  WorkAssignmentBasicSummaryRuleDto,
  WorkAssignmentBasicSummaryResponse,
} from "../../../types/reportAggregate";
import { WorkAssignmentReportStatus } from "../../../types/reportStatus";
import type { WorkAssignmentListResponse } from "../../../types/workAssignment";
import AggregateFilterBar, {
  type AggregateUnitOption,
  resolveMetricDisplayLabel,
} from "../../../components/works/aggregate/AggregateFilterBar";
import AggregateResultTable from "../../../components/works/aggregate/AggregateResultTable";
import AggregateSourceTable from "../../../components/works/aggregate/AggregateSourceTable";
import BasicSummaryPanel, {
  type BasicSummarySourceScopeOption,
} from "../../../components/works/aggregate/BasicSummaryPanel";
import StatisticDiffPanel from "../../../components/works/aggregate/StatisticDiffPanel";
import AggregateWorkbookPreview from "../../../components/works/aggregate/AggregateWorkbookPreview";
import type { WorkbookPreviewHighlight } from "../../../components/excel/fortune/WorkbookDataGrid";
import { MARK_COLORS } from "../../../components/excel/fortune/designerMarking";
import {
  dataTypeLabel,
  getCellDataType,
  normalizeSpecDataTypeMetadata,
} from "../../../components/excel/fortune/dataTypes";
import { buildInputCellRefs } from "../../../components/excel/fortune/specialRanges";
import type {
  DynamicExcelDataType,
  HeaderSpec as FortuneHeaderSpec,
} from "../../../components/excel/fortune/types";
import type { DynamicFormField } from "../../../features/dynamicForms/dynamicForm.types";
import { DESIGNER_LIMITS } from "../../../components/excel/fortune/validate";
import type {
  AggregateFilterState,
  AggregateMetricOption,
  PeriodScopeMode,
} from "../../../types/aggregateTypes";
import {
  buildEditorValue,
  fieldTypeLabels,
  getDynamicFormBlockJsonList,
  getDynamicFormFieldDisplayName,
  tableModeLabels,
} from "../../../features/dynamicForms/dynamicFormSchema";
import {
  buildWorkbookForCellSum,
  buildWorkbookHorizontalByUser,
  buildWorkbookVerticalByUser,
  cloneDeepJson,
  dayKeyToDateInput,
  formatDayKeyLabel,
  formatPeriodRangeLabel,
  normalizeDayKeyInput,
  parseJsonSafe,
  resolveResultRect,
  resolveTemplateRect,
  setCellValue,
} from "../../../components/works/aggregate/aggregateUtils";
import type {
  DynamicExcelSpecLike,
  ReportRect,
} from "../../../types/aggregateTypes";
import { UITextKey, uiText } from '../../../constants/uiText';
import WorkReportEditorPage from "../report/WorkReportEditorPage";
import { statisticsConfigurationPath } from "../statistics/statisticsConfigurationModel";

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
  metricLabelTargets?: DynamicFormMetricLabelTargetLike[] | null;
  dataRect?: DynamicFormMetricRangeLike | null;
  DataRect?: DynamicFormMetricRangeLike | null;
  sourceBlockId?: string | null;
  sourceTableMode?: string | null;
  groupBy?: string[] | null;
  rowLayout?: DynamicFormSummaryRowLayoutLike[] | null;
  outputLayout?: DynamicFormSummaryOutputLayoutLike | null;
  w?: number | string | null;
  W?: number | string | null;
  h?: number | string | null;
  H?: number | string | null;
  excelSpecKind?: string | null;
  ExcelSpecKind?: string | null;
  kind?: string | null;
  Kind?: string | null;
  defaultDataType?: string | null;
  DefaultDataType?: string | null;
  defaultOptions?: unknown[] | null;
  DefaultOptions?: unknown[] | null;
  dataTypeOverrides?: unknown[] | null;
  DataTypeOverrides?: unknown[] | null;
  specialRanges?: unknown[] | null;
  SpecialRanges?: unknown[] | null;
  statisticsDisabled?: boolean | string | null;
  StatisticsDisabled?: boolean | string | null;
  statisticsInputCellCount?: number | string | null;
  StatisticsInputCellCount?: number | string | null;
  statisticsInputCellLimit?: number | string | null;
  StatisticsInputCellLimit?: number | string | null;
  statisticsDisabledReason?: string | null;
  StatisticsDisabledReason?: string | null;
};

type DynamicFormMetricMapLike = {
  index?: number | string | null;
  rowKey?: string | null;
  columnKey?: string | null;
  metricKey?: string | null;
  label?: string | null;
  excelRef?: string | null;
};

type DynamicFormMetricRuleLike = {
  metricKey?: string | null;
  label?: string | null;
};

type DynamicFormMetricRangeLike = {
  r0?: number | string | null;
  c0?: number | string | null;
  r1?: number | string | null;
  c1?: number | string | null;
  R0?: number | string | null;
  C0?: number | string | null;
  R1?: number | string | null;
  C1?: number | string | null;
};

type NormalizedMetricRange = {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
};

type DynamicFormMetricLabelTargetLike = {
  metricKey?: string | null;
  statisticLabelCode?: string | null;
  range?: DynamicFormMetricRangeLike | null;
  dataType?: string | null;
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

const STACK_IDENTITY_COLUMN_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: "periodKey", label: "Kỳ", description: "Kỳ báo cáo của dòng nguồn, ví dụ 22/05/2026." },
  { value: "periodInstanceKey", label: "Lần báo cáo", description: "Mã lần báo cáo nếu cùng một kỳ có nhiều lần gửi." },
  { value: "unitSymbol", label: "Mã đơn vị", description: "Ký hiệu đơn vị gửi báo cáo, dùng để lọc và đối chiếu." },
  { value: "unitShortName", label: "Đơn vị", description: "Tên ngắn của đơn vị gửi báo cáo." },
  { value: "fullName", label: "Người báo cáo", description: "Họ tên người lập hoặc gửi báo cáo." },
  { value: "userName", label: "Tài khoản", description: "Tài khoản người báo cáo, dùng khi cần truy vết." },
  { value: "workAssignmentId", label: "Công việc con", description: "Mã công việc con chứa báo cáo đã duyệt." },
  { value: "reportId", label: "Báo cáo", description: "Mã báo cáo để mở và kiểm chứng dữ liệu." },
  { value: "approvedAtUtc", label: "Thời điểm duyệt", description: "Thời điểm báo cáo được duyệt." },
  { value: "sourceReportCount", label: "Số báo cáo", description: "Số báo cáo đã được gom vào dòng này khi chọn khoảng kỳ, lũy kế hoặc toàn bộ kỳ." },
];

type SummaryMethod =
  | "SUM"
  | "COUNT"
  | "MEAN"
  | "MIN"
  | "MAX"
  | "TRUE_COUNT"
  | "FALSE_COUNT"
  | "MIN_DATE"
  | "MAX_DATE"
  | "JOIN"
  | "BUCKET_COUNT";

type SummaryMethodOption = {
  value: SummaryMethod;
  label: string;
};

const SUMMARY_METHOD_LABELS: Record<SummaryMethod, string> = {
  SUM: "Tổng",
  COUNT: "Đếm có dữ liệu",
  MEAN: "Trung bình",
  MIN: "Nhỏ nhất",
  MAX: "Lớn nhất",
  TRUE_COUNT: "Đếm giá trị đúng",
  FALSE_COUNT: "Đếm giá trị sai",
  MIN_DATE: "Ngày sớm nhất",
  MAX_DATE: "Ngày mới nhất",
  JOIN: "Mẫu văn bản",
  BUCKET_COUNT: "Đếm theo lựa chọn",
};

const SUMMARY_METHOD_OPTIONS: SummaryMethodOption[] = [
  "SUM",
  "COUNT",
  "MEAN",
  "MIN",
  "MAX",
  "TRUE_COUNT",
  "FALSE_COUNT",
  "MIN_DATE",
  "MAX_DATE",
  "JOIN",
  "BUCKET_COUNT",
].map((value) => ({ value: value as SummaryMethod, label: SUMMARY_METHOD_LABELS[value as SummaryMethod] }));

const DEFAULT_BASIC_SUMMARY_METHODS: Required<WorkAssignmentBasicSummaryDefaultMethodsDto> = {
  number: "SUM",
  date: "MAX_DATE",
  boolean: "TRUE_COUNT",
  text: "COUNT",
  selection: "BUCKET_COUNT",
};

const DEFAULT_BASIC_SUMMARY_SOURCE_VIEW = {
  q: "",
  periodKey: "",
  unitId: "",
  assigneeUserId: "",
  page: 0,
  pageSize: 10,
};

const DEFAULT_BASIC_SUMMARY_SOURCE_SCOPE_MODE = "DIRECT_CHILDREN_OR_SELF";

const BASIC_SUMMARY_BASE_SOURCE_SCOPE_OPTIONS: BasicSummarySourceScopeOption[] = [
  { value: "DIRECT_CHILDREN_OR_SELF", label: "Cấp con hoặc chính nó" },
  { value: "DIRECT_CHILDREN", label: "Cấp con trực tiếp" },
  { value: "SELF", label: "Chính công việc này" },
];

const BASIC_SUMMARY_FLOW_SOURCE_SCOPE_OPTIONS: BasicSummarySourceScopeOption[] = [
  { value: "FLOW_BRANCH", label: "Nhánh quy trình này" },
  { value: "FLOW_STEP", label: "Bước quy trình này" },
  { value: "FLOW_EFFECTIVE_PATH", label: "Dữ liệu quy trình còn hiệu lực" },
  { value: "FLOW_FINAL", label: "Kết quả cuối quy trình" },
];

function buildBasicSummarySourceScopeOptions(
  scope?: AggregationScopeOption | null,
): BasicSummarySourceScopeOption[] {
  return scope?.flowInstanceId
    ? [...BASIC_SUMMARY_BASE_SOURCE_SCOPE_OPTIONS, ...BASIC_SUMMARY_FLOW_SOURCE_SCOPE_OPTIONS]
    : BASIC_SUMMARY_BASE_SOURCE_SCOPE_OPTIONS;
}

function isFlowSourceScopeMode(value: string) {
  return value.startsWith("FLOW_");
}

function buildBasicSummarySourceScopeRequest(
  scope: AggregationScopeOption | null | undefined,
  sourceScopeMode: string,
): Pick<
  WorkAssignmentBasicSummaryRequest,
  | "sourceScopeMode"
  | "sourceFlowInstanceId"
  | "sourceFlowStepId"
  | "sourceFlowBranchId"
  | "sourceFlowEffectiveStatus"
> {
  const mode = sourceScopeMode || DEFAULT_BASIC_SUMMARY_SOURCE_SCOPE_MODE;
  const hasFlow = Boolean(scope?.flowInstanceId);
  const flowMode = hasFlow && isFlowSourceScopeMode(mode);
  const baseMode = BASIC_SUMMARY_BASE_SOURCE_SCOPE_OPTIONS.some((option) => option.value === mode);

  return {
    sourceScopeMode: flowMode || baseMode ? mode : DEFAULT_BASIC_SUMMARY_SOURCE_SCOPE_MODE,
    sourceFlowInstanceId: flowMode ? scope?.flowInstanceId ?? null : null,
    sourceFlowStepId: flowMode && mode === "FLOW_STEP" ? scope?.flowStepId ?? null : null,
    sourceFlowBranchId: flowMode && mode === "FLOW_BRANCH" ? scope?.flowBranchId ?? null : null,
    sourceFlowEffectiveStatus: flowMode ? "EFFECTIVE" : null,
  };
}

function normalizeSummaryMethod(value: unknown, fallback: SummaryMethod): SummaryMethod {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  return raw in SUMMARY_METHOD_LABELS ? (raw as SummaryMethod) : fallback;
}

function pickSummaryMethodOptions(values: SummaryMethod[]) {
  const allowed = new Set(values);
  return SUMMARY_METHOD_OPTIONS.filter((option) => allowed.has(option.value));
}

function methodOptionsForFieldType(fieldType: DynamicFormField["type"]): SummaryMethodOption[] {
  switch (fieldType) {
    case "number":
      return pickSummaryMethodOptions(["SUM", "COUNT", "MEAN", "MIN", "MAX"]);
    case "date":
    case "fullDate":
      return pickSummaryMethodOptions(["MAX_DATE", "MIN_DATE", "COUNT"]);
    case "boolean":
      return pickSummaryMethodOptions(["TRUE_COUNT", "FALSE_COUNT", "COUNT"]);
    case "singleSelect":
    case "multiSelect":
      return pickSummaryMethodOptions(["BUCKET_COUNT", "COUNT"]);
    case "shortText":
    case "longText":
    case "stringList":
    default:
      return pickSummaryMethodOptions(["COUNT", "JOIN"]);
  }
}

function defaultSummaryMethodForFieldType(
  fieldType: DynamicFormField["type"],
  defaultMethods: WorkAssignmentBasicSummaryDefaultMethodsDto,
): SummaryMethod {
  switch (fieldType) {
    case "number":
      return normalizeSummaryMethod(defaultMethods.number, "SUM");
    case "date":
    case "fullDate":
      return normalizeSummaryMethod(defaultMethods.date, "MAX_DATE");
    case "boolean":
      return normalizeSummaryMethod(defaultMethods.boolean, "TRUE_COUNT");
    case "singleSelect":
    case "multiSelect":
      return normalizeSummaryMethod(defaultMethods.selection, "BUCKET_COUNT");
    case "shortText":
    case "longText":
    case "stringList":
    default:
      return normalizeSummaryMethod(defaultMethods.text, "COUNT");
  }
}

function buildBasicSummaryFieldMethodRows(
  detail: DynamicFormDetail | null | undefined,
  selectedMethods: Record<string, SummaryMethod>,
  defaultMethods: WorkAssignmentBasicSummaryDefaultMethodsDto,
) {
  if (!detail) return [];

  const value = buildEditorValue({
    code: detail.code,
    name: detail.name,
    description: detail.description,
    tagCodes: detail.tagCodes,
    schemaVersion: detail.schemaVersion,
    isActive: detail.isActive,
    sectionsJson: detail.sectionsJson,
    fieldsJson: detail.fieldsJson,
    excelBlockJson: detail.excelBlockJson,
    blocksJson: detail.blocksJson,
  });

  return [...value.fields]
    .sort((a, b) => a.order - b.order)
    .map((field) => {
      const defaultMethod = defaultSummaryMethodForFieldType(field.type, defaultMethods);
      const methodOptions = methodOptionsForFieldType(field.type);
      const configuredMethod = selectedMethods[field.id];
      const selectedMethod = configuredMethod && methodOptions.some((option) => option.value === configuredMethod)
        ? configuredMethod
        : defaultMethod;

      return {
        id: field.id,
        label: getDynamicFormFieldDisplayName(field),
        dataTypeLabel: fieldTypeLabels[field.type],
        defaultMethod,
        selectedMethod,
        methodOptions,
      };
    });
}

function buildBasicSummaryFieldRules(rows: ReturnType<typeof buildBasicSummaryFieldMethodRows>): WorkAssignmentBasicSummaryRuleDto[] {
  return rows
    .filter((row) => row.selectedMethod !== row.defaultMethod)
    .map((row) => ({
      targetKind: "FIELD",
      targetKey: `field:${row.id}`,
      operation: row.selectedMethod,
    }));
}

type DynamicFormExcelBlockResolution = {
  blockId: string;
  tableMode: DynamicFormTableMode;
  dynamicExcelId?: string | null;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
  metricLabelTargetCount: number;
  metricOptions: AggregateMetricOption[];
  statisticsDisabled: boolean;
  statisticsInputCellCount: number;
  statisticsInputCellLimit: number;
  statisticsDisabledReason?: string | null;
};

type AggregationScopeOption = {
  id: string;
  assignmentType?: WorkAssignmentListResponse["assignmentType"];
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
  flowInstanceId?: string | null;
  flowStepId?: string | null;
  flowBranchId?: string | null;
  flowEffectiveStatus?: string | null;
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
    periodScopeMode: "PERIOD_RANGE",
    periodDate: defaultPeriodDate ?? "",
    periodDateFrom: defaultPeriodDate ?? "",
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
    assignmentType: row.assignmentType,
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
    flowInstanceId: normalizeOptionalText(row.flowInstanceId),
    flowStepId: normalizeOptionalText(row.flowStepId),
    flowBranchId: normalizeOptionalText(row.flowBranchId),
    flowEffectiveStatus: normalizeOptionalText(row.flowEffectiveStatus),
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

function readOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return null;
}

function getOptionalNonNegativeInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function getLargeTableStatisticMessage(inputCellCount: number, limit: number) {
  return `Bảng có ${inputCellCount} ô nhập, vượt ngưỡng thống kê nền ${limit}; hệ thống không ghi dữ liệu đọc nền từng ô, nhưng thống kê cơ bản vẫn tổng hợp trực tiếp từ báo cáo đã duyệt nếu không vượt ${DESIGNER_LIMITS.MAX_DIRECT_AGGREGATE_INPUT_CELLS} ô nhập.`;
}

function resolveBlockStatisticState(block: DynamicFormExcelBlockLike) {
  const limit =
    getOptionalNonNegativeInt(block.statisticsInputCellLimit ?? block.StatisticsInputCellLimit) ??
    DESIGNER_LIMITS.MAX_TABLE_STATISTIC_INPUT_CELLS;
  const inputCellCount =
    getOptionalNonNegativeInt(block.statisticsInputCellCount ?? block.StatisticsInputCellCount) ??
    countDynamicFormExcelBlockInputCells(block);
  const explicitDisabled = readOptionalBoolean(block.statisticsDisabled ?? block.StatisticsDisabled);
  const statisticsDisabled = explicitDisabled === true || inputCellCount > limit;
  const reason = statisticsDisabled ? getLargeTableStatisticMessage(inputCellCount, limit) : null;

  return {
    statisticsDisabled,
    statisticsInputCellCount: inputCellCount,
    statisticsInputCellLimit: limit,
    statisticsDisabledReason: statisticsDisabled ? reason : null,
  };
}

function countDynamicFormExcelBlockInputCells(block: DynamicFormExcelBlockLike) {
  const dataRect = normalizeMetricRange(block.dataRect ?? block.DataRect);
  if (!dataRect) {
    const width = getPositiveInt(block.w ?? block.W);
    const height = getPositiveInt(block.h ?? block.H);
    return width > 0 && height > 0 ? width * height : 0;
  }

  try {
    return buildInputCellRefs(dataRect, buildStatisticHeaderSpec(block, dataRect)).length;
  } catch {
    return (dataRect.r1 - dataRect.r0 + 1) * (dataRect.c1 - dataRect.c0 + 1);
  }
}

function buildStatisticHeaderSpec(
  block: DynamicFormExcelBlockLike,
  dataRect: NormalizedMetricRange,
): FortuneHeaderSpec {
  const kindRaw = normalizeOptionalText(
    block.excelSpecKind ?? block.ExcelSpecKind ?? block.kind ?? block.Kind
  );
  const kind: FortuneHeaderSpec["kind"] = kindRaw === "LEFT" || kindRaw === "MATRIX" ? kindRaw : "TOP";
  const defaultOptions = block.defaultOptions ?? block.DefaultOptions;
  const dataTypeOverrides = block.dataTypeOverrides ?? block.DataTypeOverrides;
  const specialRanges = block.specialRanges ?? block.SpecialRanges;
  const base = {
    defaultDataType: normalizeOptionalText(block.defaultDataType ?? block.DefaultDataType) as DynamicExcelDataType | undefined,
    defaultOptions: Array.isArray(defaultOptions) ? defaultOptions as FortuneHeaderSpec["defaultOptions"] : [],
    dataTypeOverrides: Array.isArray(dataTypeOverrides) ? dataTypeOverrides as FortuneHeaderSpec["dataTypeOverrides"] : [],
    specialRanges: Array.isArray(specialRanges) ? specialRanges as FortuneHeaderSpec["specialRanges"] : [],
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

function formatBlockMetricSummary(block: DynamicFormExcelBlockResolution) {
  return block.statisticsDisabled
    ? "Bảng lớn: theo biểu mẫu báo cáo viên"
    : `${block.metricOptions.length} chỉ tiêu bảng tự động`;
}

function formatBlockMetricHelper(block?: DynamicFormExcelBlockResolution | null) {
  if (block?.statisticsDisabled) {
    return "Bảng lớn không ghi thống kê nền từng ô; màn này vẫn dùng biểu mẫu báo cáo viên và đọc trực tiếp từ báo cáo đã duyệt khi chạy tổng hợp.";
  }

  return "Tự động lấy chỉ tiêu bảng hợp lệ và trường có nhãn thống kê. Mặc định: số lấy tổng, ngày lấy giá trị muộn nhất, văn bản ngắn/chọn một đếm theo nhóm, danh sách chọn nhiều + đếm.";
}

function parseExcelOrdinalCell(rowKey?: string | null, columnKey?: string | null) {
  const rowMatch = normalizeOptionalText(rowKey)?.match(/^R(\d+)$/i);
  const columnMatch = normalizeOptionalText(columnKey)?.match(/^C(\d+)$/i);
  if (!rowMatch || !columnMatch) return null;

  const r = Number(rowMatch[1]) - 1;
  const c = Number(columnMatch[1]) - 1;
  return Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0
    ? { r, c }
    : null;
}

function parseMetricKeyCell(metricKey?: string | null) {
  const text = normalizeOptionalText(metricKey);
  if (!text) return null;

  const match = text.match(/(?:^|[.])R(\d+)[.]C(\d+)$/i);
  if (!match) return null;

  const r = Number(match[1]) - 1;
  const c = Number(match[2]) - 1;
  return Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0
    ? { r, c }
    : null;
}

function parseRelativeMetricCell(
  rowKey: string | null | undefined,
  columnKey: string | null | undefined,
  rect: ReportRect,
) {
  const rowIndex = rowKey ? indexFromOrdinalPart(rowKey, "row_") : null;
  const columnIndex = columnKey ? indexFromOrdinalPart(columnKey, "col_") : null;
  if (rowIndex == null || columnIndex == null) return null;
  return { r: rect.r0 + rowIndex, c: rect.c0 + columnIndex };
}

function resolveDynamicFormAggregateCell(
  row: DynamicFormAggregateResponse["rows"][number],
  option: AggregateMetricOption | null | undefined,
  rect: ReportRect,
) {
  return (
    parseExcelOrdinalCell(row.rowKey, row.columnKey) ??
    parseExcelOrdinalCell(option?.rowKey, option?.columnKey) ??
    parseMetricKeyCell(row.sourceMetricKey) ??
    parseMetricKeyCell(row.metricKey) ??
    parseRelativeMetricCell(row.rowKey, row.columnKey, rect) ??
    parseRelativeMetricCell(option?.rowKey, option?.columnKey, rect) ??
    resolveDynamicFormAggregateCellByIndex(row.index, rect)
  );
}

function resolveDynamicFormAggregateCellByIndex(index: number | null | undefined, rect: ReportRect) {
  if (!Number.isInteger(index) || index == null || index < 0) return null;

  const width = Math.max(1, rect.c1 - rect.c0 + 1);
  return {
    r: rect.r0 + Math.floor(index / width),
    c: rect.c0 + (index % width),
  };
}

function formatExcelCellRef(r: number, c: number) {
  return `${excelColumnName(c)}${r + 1}`;
}

function excelColumnName(index: number) {
  let text = "";
  let n = Math.max(0, Math.floor(index)) + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    text = String.fromCharCode(65 + mod) + text;
    n = Math.floor((n - 1) / 26);
  }
  return text;
}

function resolveDynamicFormAggregateDisplayValue(row: DynamicFormAggregateResponse["rows"][number]) {
  if (typeof row.sum === "number" && Number.isFinite(row.sum)) return row.sum;
  if (typeof row.average === "number" && Number.isFinite(row.average)) return row.average;
  if (typeof row.count === "number" && Number.isFinite(row.count)) return row.count;
  return null;
}

function buildDynamicFormAggregateTemplateWorkbook(
  result: DynamicFormAggregateResponse | null,
  block: DynamicFormExcelBlockResolution | null,
  templateWorkbook: Sheet[],
  rect: ReportRect,
) {
  if (!result || !block || result.stackedTable || !templateWorkbook.length) {
    return null;
  }

  const tableMode = normalizeTableMode(result.meta.tableMode);
  if (tableMode !== "FIXED_GRID" && tableMode !== "MATRIX") {
    return null;
  }

  const workbook = cloneDeepJson(templateWorkbook);
  const firstSheet: any = workbook[0];
  if (!firstSheet) return null;

  const metricOptionByKey = new Map<string, AggregateMetricOption>();
  block.metricOptions.forEach((option) => {
    metricOptionByKey.set(option.metricKey, option);
  });

  result.rows.forEach((row) => {
    const option =
      metricOptionByKey.get(row.sourceMetricKey ?? "") ??
      metricOptionByKey.get(row.metricKey) ??
      null;
    const cell = resolveDynamicFormAggregateCell(row, option, rect);
    if (!cell) return;
    setCellValue(firstSheet, cell.r, cell.c, resolveDynamicFormAggregateDisplayValue(row));
  });

  return {
    workbook,
    previewRect: rect,
  };
}

function resolveMetricOptions(
  block: DynamicFormExcelBlockLike,
  blockId: string
): AggregateMetricOption[] {
  return resolveConfiguredMetricOptions(block, blockId, normalizeTableMode(block.tableMode ?? block.TableMode));
}

function resolveConfiguredMetricOptions(
  block: DynamicFormExcelBlockLike,
  blockId: string,
  tableMode: DynamicFormTableMode,
): AggregateMetricOption[] {
  const labelByMetricKey = new Map(
    (Array.isArray(block.metricRules) ? block.metricRules : [])
      .map((rule) => {
        const metricKey = normalizeOptionalText(rule?.metricKey);
        return metricKey ? [metricKey, normalizeOptionalText(rule?.label)] as const : null;
      })
      .filter((item): item is readonly [string, string | null] => Boolean(item))
  );

  const knownByMetricKey = new Map(
    (Array.isArray(block.indexMap) ? block.indexMap : [])
      .map((item, fallbackIndex) => {
        const metric = buildMetricOptionFromMapItem(item, blockId, fallbackIndex);
        return metric ? [metric.metricKey, metric] as const : null;
      })
      .filter((item): item is readonly [string, AggregateMetricOption] => Boolean(item))
  );
  const options: AggregateMetricOption[] = [];
  const seen = new Set<string>();

  const addOption = (option: AggregateMetricOption | null) => {
    if (!option || seen.has(option.metricKey)) return;
    seen.add(option.metricKey);
    options.push({
      ...option,
      label: labelByMetricKey.get(option.metricKey) ?? option.label,
    });
  };

  (Array.isArray(block.metricRules) ? block.metricRules : []).forEach((rule, fallbackIndex) => {
    const metricKey = normalizeOptionalText(rule?.metricKey);
    if (!metricKey) return;
    addOption(knownByMetricKey.get(metricKey) ?? parseConfiguredMetricOption(metricKey, tableMode, fallbackIndex));
  });

  (Array.isArray(block.metricLabelTargets) ? block.metricLabelTargets : []).forEach((target, fallbackIndex) => {
    const metricKey = normalizeOptionalText(target?.metricKey);
    const label = normalizeOptionalText(target?.statisticLabelCode);
    if (metricKey) {
      const option = knownByMetricKey.get(metricKey) ?? parseConfiguredMetricOption(metricKey, tableMode, fallbackIndex);
      addOption(option ? { ...option, label: label ?? option.label } : null);
      return;
    }

    const dataRect = normalizeMetricRange(block.dataRect ?? block.DataRect);
    const range = normalizeMetricRange(target?.range);
    if (!dataRect || !range) return;
    expandMetricOptionRange(blockId, tableMode, dataRect, range, block.w ?? block.W, block.h ?? block.H)
      .forEach((option) => addOption({ ...option, label: label ?? option.label }));
  });

  return options.sort((a, b) => (a.index ?? 0) - (b.index ?? 0) || a.metricKey.localeCompare(b.metricKey));
}

function buildMetricOptionFromMapItem(
  item: DynamicFormMetricMapLike | null | undefined,
  blockId: string,
  fallbackIndex: number,
): AggregateMetricOption | null {
  if (!item) return null;
  const index = Number(item.index ?? fallbackIndex);
  const rowKey = normalizeMetricPart(item.rowKey, `row_${fallbackIndex + 1}`);
  const columnKey = normalizeMetricPart(item.columnKey, "value");
  const metricKey =
    normalizeOptionalText(item.metricKey) ?? buildMetricKey(blockId, rowKey, columnKey);

  return {
    metricKey,
    rowKey,
    columnKey,
    index: Number.isInteger(index) && index >= 0 ? index : fallbackIndex,
    label: normalizeOptionalText(item.label) ?? normalizeOptionalText(item.excelRef),
  };
}

function buildAssignedUnitOptions(
  options: AggregationScopeOption[],
  scopeAssignmentId?: string | null,
): AggregateUnitOption[] {
  const parentId = normalizeOptionalText(scopeAssignmentId);
  if (!parentId) return [];

  const byUnitId = new Map<string, AggregateUnitOption & { assignmentCodes: Set<string> }>();
  const sourceAssignments = options.filter(
    (option) => option.isActive !== false && option.parentAssignmentId === parentId,
  );

  for (const assignment of sourceAssignments) {
    for (const assignee of assignment.assignees ?? []) {
      const unitId = normalizeOptionalText(assignee.unitId);
      if (!unitId) continue;

      const label =
        normalizeOptionalText(assignee.unitShortName) ??
        normalizeOptionalText(assignee.unitName) ??
        normalizeOptionalText(assignee.unitSymbol) ??
        unitId;
      const code = normalizeOptionalText(assignee.unitSymbol);
      const existing = byUnitId.get(unitId);

      if (existing) {
        if (assignment.id) existing.assignmentCodes.add(assignment.id);
        continue;
      }

      byUnitId.set(unitId, {
        id: unitId,
        label,
        code,
        secondaryLabel: code ? `Ký hiệu: ${code}` : undefined,
        assignmentCodes: new Set(assignment.id ? [assignment.id] : []),
      });
    }
  }

  return Array.from(byUnitId.values())
    .map((item) => ({
      id: item.id,
      label: item.label,
      code: item.code,
      secondaryLabel: item.secondaryLabel,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

function parseConfiguredMetricOption(
  metricKey: string,
  tableMode: DynamicFormTableMode,
  fallbackIndex: number,
): AggregateMetricOption {
  const fixed = metricKey.match(/\.row:([^.]+)\.column:([^.]+)$/);
  if (fixed) {
    const rowKey = normalizeMetricPart(fixed[1], `row_${fallbackIndex + 1}`);
    const columnKey = normalizeMetricPart(fixed[2], "value");
    return {
      metricKey,
      rowKey,
      columnKey,
      index: indexFromRowColumn(rowKey, columnKey) ?? fallbackIndex,
      label: null,
    };
  }

  const appendColumn = metricKey.match(/\.column:([^.]+)$/);
  if (tableMode === "APPEND_ROWS" && appendColumn) {
    const columnKey = normalizeMetricPart(appendColumn[1], `col_${fallbackIndex + 1}`);
    return {
      metricKey,
      rowKey: "APPEND_ROWS",
      columnKey,
      index: indexFromOrdinalPart(columnKey, "col_") ?? fallbackIndex,
      label: null,
    };
  }

  const appendRow = metricKey.match(/\.row:([^.]+)$/);
  if (tableMode === "APPEND_COLUMNS" && appendRow) {
    const rowKey = normalizeMetricPart(appendRow[1], `row_${fallbackIndex + 1}`);
    return {
      metricKey,
      rowKey,
      columnKey: "APPEND_COLUMNS",
      index: indexFromOrdinalPart(rowKey, "row_") ?? fallbackIndex,
      label: null,
    };
  }

  return {
    metricKey,
    rowKey: tableMode === "APPEND_ROWS" ? "APPEND_ROWS" : `row_${fallbackIndex + 1}`,
    columnKey: tableMode === "APPEND_COLUMNS" ? "APPEND_COLUMNS" : "value",
    index: fallbackIndex,
    label: null,
  };
}

function resolveAppendRowsMetricOptions(
  block: DynamicFormExcelBlockLike,
  blockId: string
): AggregateMetricOption[] {
  return resolveConfiguredMetricOptions(block, blockId, "APPEND_ROWS");
}

function resolveAppendColumnsMetricOptions(
  block: DynamicFormExcelBlockLike,
  blockId: string
): AggregateMetricOption[] {
  return resolveConfiguredMetricOptions(block, blockId, "APPEND_COLUMNS");
}

function expandMetricOptionRange(
  blockId: string,
  tableMode: DynamicFormTableMode,
  dataRect: Required<Pick<DynamicFormMetricRangeLike, "r0" | "c0" | "r1" | "c1">>,
  range: Required<Pick<DynamicFormMetricRangeLike, "r0" | "c0" | "r1" | "c1">>,
  widthValue: unknown,
  heightValue: unknown,
): AggregateMetricOption[] {
  const dataR0 = Number(dataRect.r0);
  const dataC0 = Number(dataRect.c0);
  const dataR1 = Number(dataRect.r1);
  const dataC1 = Number(dataRect.c1);
  const r0 = Math.max(dataR0, Number(range.r0));
  const c0 = Math.max(dataC0, Number(range.c0));
  const r1 = Math.min(dataR1, Number(range.r1));
  const c1 = Math.min(dataC1, Number(range.c1));
  if (r1 < r0 || c1 < c0) return [];

  const width = getPositiveInt(widthValue) || dataC1 - dataC0 + 1;
  const height = getPositiveInt(heightValue) || dataR1 - dataR0 + 1;
  const options: AggregateMetricOption[] = [];

  if (tableMode === "APPEND_ROWS") {
    for (let c = c0; c <= c1; c += 1) {
      const columnOffset = c - dataC0;
      if (columnOffset < 0 || columnOffset >= width) continue;
      const columnKey = `col_${columnOffset + 1}`;
      options.push({
        metricKey: `table:${blockId}.column:${columnKey}`,
        rowKey: "APPEND_ROWS",
        columnKey,
        index: columnOffset,
        label: null,
      });
    }
    return options;
  }

  if (tableMode === "APPEND_COLUMNS") {
    for (let r = r0; r <= r1; r += 1) {
      const rowOffset = r - dataR0;
      if (rowOffset < 0 || rowOffset >= height) continue;
      const rowKey = `row_${rowOffset + 1}`;
      options.push({
        metricKey: `table:${blockId}.row:${rowKey}`,
        rowKey,
        columnKey: "APPEND_COLUMNS",
        index: rowOffset,
        label: null,
      });
    }
    return options;
  }

  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) {
      const rowOffset = r - dataR0;
      const columnOffset = c - dataC0;
      if (rowOffset < 0 || rowOffset >= height || columnOffset < 0 || columnOffset >= width) continue;
      const rowKey = `row_${rowOffset + 1}`;
      const columnKey = `col_${columnOffset + 1}`;
      options.push({
        metricKey: buildMetricKey(blockId, rowKey, columnKey),
        rowKey,
        columnKey,
        index: rowOffset * width + columnOffset,
        label: null,
      });
    }
  }

  return options;
}

function normalizeMetricRange(value: DynamicFormMetricRangeLike | null | undefined): NormalizedMetricRange | null {
  if (!value || typeof value !== "object") return null;
  const r0 = Number(value.r0 ?? value.R0);
  const c0 = Number(value.c0 ?? value.C0);
  const r1 = Number(value.r1 ?? value.R1);
  const c1 = Number(value.c1 ?? value.C1);
  if (![r0, c0, r1, c1].every(Number.isFinite)) return null;
  if (r1 < r0 || c1 < c0) return null;
  return { r0, c0, r1, c1 };
}

function indexFromRowColumn(rowKey: string, columnKey: string) {
  const rowIndex = indexFromOrdinalPart(rowKey, "row_");
  const columnIndex = indexFromOrdinalPart(columnKey, "col_");
  if (rowIndex == null || columnIndex == null) return null;
  return rowIndex * 100000 + columnIndex;
}

function indexFromOrdinalPart(value: string, prefix: string) {
  if (!value.toLowerCase().startsWith(prefix)) return null;
  const n = Number(value.slice(prefix.length));
  return Number.isInteger(n) && n > 0 ? n - 1 : null;
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

function countMetricLabelTargets(block: DynamicFormExcelBlockLike) {
  return Array.isArray(block.metricLabelTargets)
    ? block.metricLabelTargets.filter((item) => item && typeof item === "object").length
    : 0;
}

function resolveDynamicFormExcelBlocks(
  detail?: DynamicFormDetail | null
): DynamicFormExcelBlockResolution[] {
  return getDynamicFormBlockJsonList(detail?.blocksJson, detail?.excelBlockJson)
    .map((blockJson) => parseJsonSafe<DynamicFormExcelBlockLike | null>(blockJson, null))
    .filter((block): block is DynamicFormExcelBlockLike => Boolean(block))
    .map((block) => resolveDynamicFormExcelBlockFromJson(detail, block))
    .filter((block): block is DynamicFormExcelBlockResolution => Boolean(block));
}

function resolveDynamicFormExcelBlockFromJson(
  detail: DynamicFormDetail | null | undefined,
  block: DynamicFormExcelBlockLike
): DynamicFormExcelBlockResolution | null {
  const tableMode = normalizeTableMode(block.tableMode ?? block.TableMode);

  const dynamicExcelId =
    normalizeOptionalText(block.dynamicExcelTemplateId ?? block.DynamicExcelTemplateId) ??
    normalizeOptionalText(
      tableMode === "SUMMARY_TEMPLATE" ? null : detail?.excelBlockDynamicExcelTemplateId
    );
  if (!dynamicExcelId && tableMode !== "SUMMARY_TEMPLATE") return null;

  const blockId = normalizeBlockId(block.blockId ?? block.id);
  const statisticState = resolveBlockStatisticState(block);
  const metricOptions = tableMode === "FIXED_GRID"
    ? resolveMetricOptions(block, blockId)
    : tableMode === "APPEND_ROWS"
      ? resolveAppendRowsMetricOptions(block, blockId)
      : tableMode === "APPEND_COLUMNS"
        ? resolveAppendColumnsMetricOptions(block, blockId)
        : tableMode === "MATRIX"
          ? resolveMetricOptions(block, blockId)
          : resolveSummaryTemplateMetricOptions(block);

  return {
    blockId,
    tableMode,
    dynamicExcelId,
    dynamicExcelCode: normalizeOptionalText(
      block.dynamicExcelCode ?? block.DynamicExcelCode
    ),
    dynamicExcelName: normalizeOptionalText(
      block.dynamicExcelName ?? block.DynamicExcelName
    ),
    metricLabelTargetCount: countMetricLabelTargets(block),
    metricOptions,
    statisticsDisabled: statisticState.statisticsDisabled,
    statisticsInputCellCount: statisticState.statisticsInputCellCount,
    statisticsInputCellLimit: statisticState.statisticsInputCellLimit,
    statisticsDisabledReason: statisticState.statisticsDisabledReason,
  };
}

function findDynamicFormBlock(
  blocks: DynamicFormExcelBlockResolution[],
  blockId?: string | null,
) {
  const normalized = normalizeOptionalText(blockId);
  if (!normalized) return null;
  return blocks.find((block) => block.blockId === normalized) ?? null;
}

function findDynamicFormBlockByExcelId(
  blocks: DynamicFormExcelBlockResolution[],
  dynamicExcelId?: string | null,
) {
  const normalized = normalizeOptionalText(dynamicExcelId);
  if (!normalized) return null;
  return blocks.find((block) => block.dynamicExcelId === normalized) ?? null;
}

function getDynamicFormBlockDisplayLabel(block: DynamicFormExcelBlockResolution) {
  const template = block.dynamicExcelName || block.dynamicExcelCode || "";
  const source = template || block.blockId;
  return `${source} (${formatTableModeLabel(block.tableMode)})`;
}

type AggregateConfigMetricMapping = {
  sourceDynamicExcelTemplateId?: string | null;
  sourceBlockId?: string | null;
  metricKeys: string[];
};

function parseAggregateConfigMetricMapping(
  value?: string | null
): AggregateConfigMetricMapping {
  const parsed = parseJsonSafe<Record<string, unknown> | null>(value, null);
  if (!parsed || typeof parsed !== "object") {
    return { metricKeys: [] };
  }

  const metricKeys = Array.isArray(parsed.metricKeys)
    ? parsed.metricKeys
        .map((item) => normalizeOptionalText(typeof item === "string" ? item : null))
        .filter((item): item is string => Boolean(item))
    : [];

  return {
    sourceDynamicExcelTemplateId: normalizeOptionalText(
      typeof parsed.sourceDynamicExcelTemplateId === "string"
        ? parsed.sourceDynamicExcelTemplateId
        : null
    ),
    sourceBlockId: normalizeOptionalText(
      typeof parsed.sourceBlockId === "string" ? parsed.sourceBlockId : null
    ),
    metricKeys,
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

function formatTableModeLabel(tableMode?: DynamicFormTableMode | string | null) {
  return tableMode && tableMode in tableModeLabels
    ? tableModeLabels[tableMode as DynamicFormTableMode]
    : tableMode || "-";
}

function formatScopeModeLabel(scopeMode?: string | null) {
  if (scopeMode === "DIRECT_CHILDREN_OR_SELF") return "Cấp con hoặc chính nó";
  if (scopeMode === "DIRECT_CHILDREN") return "Cấp con trực tiếp";
  if (scopeMode === "SELF") return "Chính công việc này";
  if (scopeMode === "FLOW_BRANCH") return "Nhánh quy trình này";
  if (scopeMode === "FLOW_STEP") return "Bước quy trình này";
  if (scopeMode === "FLOW_EFFECTIVE_PATH") return "Dữ liệu quy trình còn hiệu lực";
  if (scopeMode === "FLOW_FINAL") return "Kết quả cuối quy trình";
  if (scopeMode === "SUBTREE") return "Cấp con trực tiếp";
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

const METRIC_PREVIEW_LIMIT = 8;

function isStackedTableMode(tableMode?: DynamicFormTableMode | null) {
  return tableMode === "APPEND_ROWS" || tableMode === "APPEND_COLUMNS";
}

function getStackIdentityAxisLabel(tableMode?: DynamicFormTableMode | null) {
  return tableMode === "APPEND_COLUMNS" ? "Hàng định danh nguồn" : "Cột định danh nguồn";
}

function getStackIdentityAxisLowerLabel(tableMode?: DynamicFormTableMode | null) {
  return tableMode === "APPEND_COLUMNS" ? "hàng định danh nguồn" : "cột định danh nguồn";
}

function getStackIdentityHelperText(tableMode?: DynamicFormTableMode | null) {
  if (tableMode === "APPEND_COLUMNS") {
    return "Chỉ dùng cho bảng thêm cột. Các hàng này mô tả từng cột nguồn như kỳ, đơn vị, người báo cáo để đọc và đối chiếu; không tham gia tính tổng.";
  }

  return "Chỉ dùng cho bảng thêm dòng. Các cột này mô tả từng dòng nguồn như kỳ, đơn vị, người báo cáo để đọc và đối chiếu; không tham gia tính tổng.";
}

function buildMetricPreviewHighlights(
  block: DynamicFormExcelBlockResolution,
  dataRect: ReportRect
): WorkbookPreviewHighlight[] {
  const highlights: WorkbookPreviewHighlight[] = [];
  const seen = new Set<string>();

  for (const option of block.metricOptions) {
    const rect = resolveMetricPreviewRect(block.tableMode, option, dataRect);
    if (!rect) continue;

    const key = `${rect.r0}:${rect.c0}:${rect.r1}:${rect.c1}`;
    if (seen.has(key)) continue;
    seen.add(key);
    highlights.push({ rect, color: MARK_COLORS.RANGE_BG });
  }

  return highlights;
}

function resolveMetricPreviewRect(
  tableMode: DynamicFormTableMode,
  option: AggregateMetricOption,
  dataRect: ReportRect
): ReportRect | null {
  if (tableMode === "APPEND_ROWS") {
    const columnIndex = resolveOrdinalIndex(option.columnKey, "col_", option.index);
    if (columnIndex == null) return null;
    const c = dataRect.c0 + columnIndex;
    if (c < dataRect.c0 || c > dataRect.c1) return null;
    return { r0: dataRect.r0, c0: c, r1: dataRect.r1, c1: c };
  }

  if (tableMode === "APPEND_COLUMNS") {
    const rowIndex = resolveOrdinalIndex(option.rowKey, "row_", option.index);
    if (rowIndex == null) return null;
    const r = dataRect.r0 + rowIndex;
    if (r < dataRect.r0 || r > dataRect.r1) return null;
    return { r0: r, c0: dataRect.c0, r1: r, c1: dataRect.c1 };
  }

  const rowIndex = indexFromOrdinalPart(option.rowKey ?? "", "row_");
  const columnIndex = indexFromOrdinalPart(option.columnKey ?? "", "col_");
  if (rowIndex == null || columnIndex == null) return null;

  const r = dataRect.r0 + rowIndex;
  const c = dataRect.c0 + columnIndex;
  if (r < dataRect.r0 || r > dataRect.r1 || c < dataRect.c0 || c > dataRect.c1) {
    return null;
  }

  return { r0: r, c0: c, r1: r, c1: c };
}

function buildFieldSummaryMethodsFromRules(
  rows: ReturnType<typeof buildBasicSummaryFieldMethodRows>,
  rules: WorkAssignmentBasicSummaryRuleDto[] | null | undefined,
): Record<string, SummaryMethod> {
  if (!rows.length || !rules?.length) return {};

  const fieldIds = new Set(rows.map((row) => row.id));
  const methods: Record<string, SummaryMethod> = {};
  for (const rule of rules) {
    if (String(rule.targetKind).toUpperCase() !== "FIELD") continue;
    const fieldId = String(rule.targetKey ?? "").replace(/^field:/i, "");
    if (!fieldIds.has(fieldId)) continue;

    const row = rows.find((item) => item.id === fieldId);
    const method = normalizeSummaryMethod(rule.operation, row?.defaultMethod ?? "COUNT");
    if (row?.methodOptions.some((option) => option.value === method)) {
      methods[fieldId] = method;
    }
  }

  return methods;
}

function resolveOrdinalIndex(value: string | null | undefined, prefix: string, fallback: unknown) {
  const fromKey = indexFromOrdinalPart(value ?? "", prefix);
  if (fromKey != null) return fromKey;

  const n = Number(fallback);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

type DynamicFormAggregatePreviewPanelProps = {
  block: DynamicFormExcelBlockResolution;
  workbook: Sheet[];
  templateRect: ReportRect;
  templateSpec: DynamicExcelSpecLike;
  selectedTemplateLabel?: string;
  previewHighlights: WorkbookPreviewHighlight[];
  loading?: boolean;
  title: string;
  description: string;
};

function DynamicFormAggregatePreviewPanel({
  block,
  workbook,
  templateRect,
  templateSpec,
  selectedTemplateLabel,
  previewHighlights,
  loading,
  title,
  description,
}: DynamicFormAggregatePreviewPanelProps) {
  const metricOptions = block.metricOptions;
  const visibleMetrics = metricOptions.slice(0, METRIC_PREVIEW_LIMIT);
  const hiddenMetricCount = Math.max(metricOptions.length - visibleMetrics.length, 0);
  const excelLabel =
    block.dynamicExcelName ||
    block.dynamicExcelId ||
    block.blockId ||
    block.dynamicExcelCode;

  return (
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
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "flex-start" }}
          spacing={1}
        >
          <Stack spacing={0.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
            {selectedTemplateLabel && (
              <Typography variant="body2">
                Biểu mẫu động: <b>{selectedTemplateLabel}</b>
              </Typography>
            )}
          </Stack>

          <Stack direction="row" flexWrap="wrap" gap={1} justifyContent={{ md: "flex-end" }}>
            <Chip label={`Bảng: ${formatTableModeLabel(block.tableMode)}`} variant="outlined" />
            <Chip
              label={`Excel: ${excelLabel}`}
              variant="outlined"
              sx={{ maxWidth: { xs: "100%", md: 320 } }}
            />
            <Chip
              label={block.statisticsDisabled ? "Không thống kê nền" : `${metricOptions.length} chỉ tiêu`}
              color={block.statisticsDisabled ? "warning" : metricOptions.length ? "primary" : "warning"}
              variant={metricOptions.length && !block.statisticsDisabled ? "filled" : "outlined"}
            />
          </Stack>
        </Stack>

        {block.statisticsDisabled && (
          <Alert severity="warning" sx={{ py: 0.75 }}>
            {block.statisticsDisabledReason ?? getLargeTableStatisticMessage(
              block.statisticsInputCellCount,
              block.statisticsInputCellLimit,
            )}
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 300px" },
            gap: 2,
            alignItems: "start",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {workbook.length ? (
              <AggregateWorkbookPreview
                title="Xem trước bảng Excel"
                workbook={workbook}
                previewRect={templateRect}
                spec={templateSpec}
                previewHighlights={previewHighlights}
              />
            ) : (
              <Alert severity={loading ? "info" : "warning"}>
                {loading
                  ? "Đang tải bản xem trước bảng Excel."
                  : "Chưa tải được bản xem trước bảng Excel của biểu mẫu động."}
              </Alert>
            )}
          </Box>

          <Stack spacing={1.25}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Chú giải
            </Typography>
            <PreviewLegendItem
              color={MARK_COLORS.HEADER_BG}
              label="Vùng tiêu đề"
              description="Các ô tiêu đề của bảng Excel."
            />
            <PreviewLegendItem
              color={MARK_COLORS.DATA_BG}
              label="Vùng dữ liệu"
              description="Các ô hệ thống đọc dữ liệu theo kiểu dữ liệu đã cấu hình."
            />
            <PreviewLegendItem
              color={MARK_COLORS.RANGE_BG}
              label="Ô/chỉ tiêu tổng hợp"
              description="Ô, dòng hoặc cột được cấu hình để đọc khi chạy tổng hợp."
            />
            {isStackedTableMode(block.tableMode) && (
              <Alert severity="info" sx={{ py: 0.75 }}>
                {getStackIdentityAxisLabel(block.tableMode)} chỉ dùng để truy vết kỳ, đơn vị, người báo cáo và báo cáo nguồn; không tham gia tính tổng.
              </Alert>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 800 }}>
                Dữ liệu đọc từ template
              </Typography>
              {metricOptions.length ? (
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {visibleMetrics.map((option) => (
                    <Chip
                      key={option.metricKey}
                      size="small"
                      label={resolveMetricDisplayLabel(option)}
                      sx={{ maxWidth: "100%" }}
                    />
                  ))}
                  {hiddenMetricCount > 0 && (
                    <Chip size="small" variant="outlined" label={`+${hiddenMetricCount} chỉ tiêu`} />
                  )}
                </Stack>
              ) : (
                <Alert severity={block.statisticsDisabled ? "info" : "warning"} sx={{ py: 0.75 }}>
                  {block.statisticsDisabled
                    ? "Bảng lớn đang khóa thống kê nền từng ô. Biểu mẫu báo cáo viên vẫn là bề mặt chính; nếu cần ghi dữ liệu vào báo cáo đích, dùng luồng Gán dữ liệu tổng hợp riêng."
                    : "Bảng này chưa cấu hình chỉ tiêu thống kê. Hãy gắn nhãn chỉ tiêu cho ô, dòng, cột hoặc vùng cần tổng hợp trong biểu mẫu động."}
                </Alert>
              )}
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

type PreviewLegendItemProps = {
  color: string;
  label: string;
  description: string;
};

function PreviewLegendItem({ color, label, description }: PreviewLegendItemProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box
        sx={{
          width: 18,
          height: 18,
          mt: 0.25,
          borderRadius: 0.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: color,
          flex: "0 0 auto",
        }}
      />
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}

type StackIdentityPreviewProps = {
  block: DynamicFormExcelBlockResolution;
  identityColumns: string[];
  workbook: Sheet[];
  templateRect: ReportRect;
  templateSpec: DynamicExcelSpecLike;
  previewHighlights: WorkbookPreviewHighlight[];
  loading?: boolean;
  periodScopeMode: string;
  selectedTemplateLabel?: string;
};

function StackIdentityPreviewDialogContent({
  block,
  identityColumns,
  workbook,
  templateRect,
  templateSpec,
  previewHighlights,
  loading,
  periodScopeMode,
  selectedTemplateLabel,
}: StackIdentityPreviewProps) {
  const identityOptions = identityColumns
    .map((value) => STACK_IDENTITY_COLUMN_OPTIONS.find((option) => option.value === value))
    .filter((option): option is (typeof STACK_IDENTITY_COLUMN_OPTIONS)[number] => Boolean(option));
  const metricRows = buildStackMetricPreviewRows(block, templateRect, templateSpec);
  const axisLabel = getStackIdentityAxisLabel(block.tableMode);
  const axisLower = getStackIdentityAxisLowerLabel(block.tableMode);
  const sourceAxisLabel = block.tableMode === "APPEND_COLUMNS" ? "cột nguồn" : "dòng nguồn";

  return (
    <Stack spacing={2}>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Chip label={`Bảng: ${formatTableModeLabel(block.tableMode)}`} variant="outlined" />
        <Chip label={axisLabel} color="primary" variant="outlined" />
        <Chip label={`Phạm vi kỳ: ${formatPeriodScopeModeLabel(periodScopeMode)}`} variant="outlined" />
        <Chip
          label={block.statisticsDisabled ? "Không thống kê nền" : `${metricRows.length} chỉ tiêu`}
          color={block.statisticsDisabled ? "warning" : undefined}
          variant="outlined"
        />
      </Stack>

      {selectedTemplateLabel && (
        <Typography variant="body2">
          Biểu mẫu động: <b>{selectedTemplateLabel}</b>
        </Typography>
      )}

      <Alert severity="info">
        {block.tableMode === "APPEND_COLUMNS"
          ? "Bảng thêm cột: mỗi cột nguồn cần các hàng định danh để biết cột đó đến từ kỳ, đơn vị, người báo cáo hoặc báo cáo nào."
          : "Bảng thêm dòng: mỗi dòng nguồn cần các cột định danh để biết dòng đó đến từ kỳ, đơn vị, người báo cáo hoặc báo cáo nào."}
      </Alert>

      {block.statisticsDisabled && (
        <Alert severity="warning">
          {block.statisticsDisabledReason ?? getLargeTableStatisticMessage(
            block.statisticsInputCellCount,
            block.statisticsInputCellLimit,
          )}
        </Alert>
      )}

      <DynamicFormAggregatePreviewPanel
        block={block}
        workbook={workbook}
        templateRect={templateRect}
        templateSpec={templateSpec}
        selectedTemplateLabel={selectedTemplateLabel}
        previewHighlights={previewHighlights}
        loading={loading}
        title="Xem trước bảng Excel nguồn"
        description="Bản xem trước dùng cùng cách hiển thị với các bảng khác: vùng dữ liệu và các chỉ tiêu đang chọn được tô màu trực tiếp trên bảng Excel nguồn."
      />

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
          Dạng bảng sau khi ghép thêm định danh nguồn
        </Typography>
        {block.tableMode === "APPEND_COLUMNS" ? (
          <AppendColumnsIdentityLayoutPreview
            identityOptions={identityOptions}
            metricRows={metricRows}
          />
        ) : (
          <AppendRowsIdentityLayoutPreview
            identityOptions={identityOptions}
            metricRows={metricRows}
          />
        )}
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
          Tọa độ, kiểu dữ liệu và cách tổng hợp
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Vai trò</TableCell>
                <TableCell>{axisLabel}</TableCell>
                <TableCell>Tọa độ nguồn</TableCell>
                <TableCell>Kiểu dữ liệu</TableCell>
                <TableCell>Cách tổng hợp hiện có</TableCell>
                <TableCell>Ghi chú</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {identityOptions.map((option, index) => (
                <TableRow key={option.value} hover>
                  <TableCell>Định danh</TableCell>
                  <TableCell>
                    {index + 1}. {option.label}
                  </TableCell>
                  <TableCell>Thêm mới vào {axisLower}</TableCell>
                  <TableCell>{option.value === "sourceReportCount" ? "Số" : "Văn bản"}</TableCell>
                  <TableCell>Không tính toán</TableCell>
                  <TableCell>{option.description}</TableCell>
                </TableRow>
              ))}
              {metricRows.map((row) => (
                <TableRow key={row.metricKey} hover>
                  <TableCell>Chỉ tiêu</TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell>{row.coordinate}</TableCell>
                  <TableCell>{row.dataTypeLabel}</TableCell>
                  <TableCell>{row.aggregateOptions}</TableCell>
                  <TableCell>{row.note}</TableCell>
                </TableRow>
              ))}
              {identityOptions.length === 0 && metricRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      Chưa có {axisLower} hoặc chỉ tiêu để xem trước.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Alert severity="warning">
        Bộ lọc một kỳ, khoảng kỳ hoặc lũy kế là phạm vi chung của lần tổng hợp. Từng chỉ tiêu nhỏ vẫn cần chọn đúng phép tính theo kiểu dữ liệu khi map vào báo cáo đích; không nên tự tổng hợp các ô chưa được gắn chỉ tiêu.
      </Alert>

      <Typography variant="caption" color="text.secondary">
        Với {sourceAxisLabel}, hệ thống chỉ lấy báo cáo đã duyệt trong phạm vi hiện tại. Nếu thấy lỗi bảng không thuộc biểu mẫu động, hãy kiểm tra lại biểu mẫu của công việc đang mở hoặc lưu lại cấu hình tổng hợp sau khi biểu mẫu động thay đổi.
      </Typography>
    </Stack>
  );
}

type StackMetricPreviewRow = {
  metricKey: string;
  label: string;
  coordinate: string;
  dataType: DynamicExcelDataType;
  dataTypeLabel: string;
  aggregateOptions: string;
  note: string;
};

function AppendRowsIdentityLayoutPreview({
  identityOptions,
  metricRows,
}: {
  identityOptions: Array<(typeof STACK_IDENTITY_COLUMN_OPTIONS)[number]>;
  metricRows: StackMetricPreviewRow[];
}) {
  const visibleMetrics = metricRows.slice(0, 4);
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            {identityOptions.map((option) => (
              <TableCell key={option.value} sx={{ bgcolor: "action.hover", fontWeight: 700 }}>
                {option.label}
              </TableCell>
            ))}
            <TableCell sx={{ bgcolor: "action.hover", fontWeight: 700 }}>Dòng nguồn</TableCell>
            {visibleMetrics.map((metric) => (
              <TableCell key={metric.metricKey} sx={{ fontWeight: 700 }}>
                {metric.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {[1, 2].map((index) => (
            <TableRow key={index}>
              {identityOptions.map((option) => (
                <TableCell key={option.value}>{sampleIdentityValue(option.value, index)}</TableCell>
              ))}
              <TableCell>Dòng {index}</TableCell>
              {visibleMetrics.map((metric) => (
                <TableCell key={metric.metricKey}>{sampleMetricValue(metric.dataType, index)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function AppendColumnsIdentityLayoutPreview({
  identityOptions,
  metricRows,
}: {
  identityOptions: Array<(typeof STACK_IDENTITY_COLUMN_OPTIONS)[number]>;
  metricRows: StackMetricPreviewRow[];
}) {
  const visibleMetrics = metricRows.slice(0, 4);
  const sourceColumns = [1, 2, 3];
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ bgcolor: "action.hover", fontWeight: 700 }}>Hàng thêm</TableCell>
            {sourceColumns.map((index) => (
              <TableCell key={index} sx={{ fontWeight: 700 }}>
                Cột nguồn {index}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {identityOptions.map((option) => (
            <TableRow key={option.value}>
              <TableCell sx={{ bgcolor: "action.hover", fontWeight: 700 }}>
                {option.label}
              </TableCell>
              {sourceColumns.map((index) => (
                <TableCell key={index}>{sampleIdentityValue(option.value, index)}</TableCell>
              ))}
            </TableRow>
          ))}
          {visibleMetrics.map((metric) => (
            <TableRow key={metric.metricKey}>
              <TableCell sx={{ fontWeight: 700 }}>{metric.label}</TableCell>
              {sourceColumns.map((index) => (
                <TableCell key={index}>{sampleMetricValue(metric.dataType, index)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function buildStackMetricPreviewRows(
  block: DynamicFormExcelBlockResolution,
  templateRect: ReportRect,
  templateSpec: DynamicExcelSpecLike
): StackMetricPreviewRow[] {
  const headerSpec = resolvePreviewHeaderSpec(templateSpec);

  return block.metricOptions.map((option, index) => {
    const rect = resolveMetricPreviewRect(block.tableMode, option, templateRect);
    const dataType = resolveMetricDataType(headerSpec, templateRect, rect);
    const label = resolveMetricDisplayLabel(option);

    return {
      metricKey: option.metricKey,
      label,
      coordinate: rect
        ? formatMetricCoordinate(block.tableMode, rect)
        : `Chỉ tiêu ${index + 1}`,
      dataType,
      dataTypeLabel: dataTypeLabel(dataType),
      aggregateOptions: formatAvailableAggregateOptions(dataType),
      note: formatMetricPreviewNote(block.tableMode, dataType),
    };
  });
}

function resolvePreviewHeaderSpec(spec: DynamicExcelSpecLike): FortuneHeaderSpec | null {
  const raw =
    (spec as unknown as { kind?: unknown })?.kind
      ? spec
      : (spec as unknown as { headerSpec?: unknown })?.headerSpec;
  if (!raw || typeof raw !== "object") return null;

  const kind = (raw as { kind?: unknown }).kind;
  if (kind !== "TOP" && kind !== "LEFT" && kind !== "MATRIX") return null;

  try {
    return normalizeSpecDataTypeMetadata(raw as FortuneHeaderSpec);
  } catch {
    return raw as FortuneHeaderSpec;
  }
}

function resolveMetricDataType(
  headerSpec: FortuneHeaderSpec | null,
  templateRect: ReportRect,
  rect: ReportRect | null
): DynamicExcelDataType {
  if (!headerSpec || !rect) return "NUMBER";
  return getCellDataType(headerSpec, templateRect, rect.r0, rect.c0);
}

function formatMetricCoordinate(tableMode: DynamicFormTableMode, rect: ReportRect) {
  if (tableMode === "APPEND_ROWS") {
    return `Cột nguồn C${rect.c0 + 1}; vùng R${rect.r0 + 1}:R${rect.r1 + 1}`;
  }

  if (tableMode === "APPEND_COLUMNS") {
    return `Hàng nguồn R${rect.r0 + 1}; vùng C${rect.c0 + 1}:C${rect.c1 + 1}`;
  }

  if (rect.r0 === rect.r1 && rect.c0 === rect.c1) {
    return `Ô R${rect.r0 + 1}C${rect.c0 + 1}`;
  }

  return `Vùng R${rect.r0 + 1}C${rect.c0 + 1}:R${rect.r1 + 1}C${rect.c1 + 1}`;
}

function formatAvailableAggregateOptions(dataType: DynamicExcelDataType) {
  switch (dataType) {
    case "IGNORE":
      return "Bỏ qua nhập";
    case "NUMBER":
      return "Tổng, số dòng có dữ liệu, nhỏ nhất, lớn nhất, trung bình";
    case "SHORT_TEXT":
      return "Đếm dữ liệu, đếm theo nhóm nội dung";
    case "MULTI_SELECT":
      return "Đếm dữ liệu, đếm theo từng lựa chọn";
    case "BOOLEAN":
      return "Đếm dữ liệu, đếm Đúng/Sai";
    case "DATE":
    case "FULL_DATE":
      return "Đếm dữ liệu, ngày sớm nhất, ngày muộn nhất";
    default:
      return "Đếm dữ liệu";
  }
}

function formatMetricPreviewNote(tableMode: DynamicFormTableMode, dataType: DynamicExcelDataType) {
  const sourceAxis = tableMode === "APPEND_COLUMNS" ? "hàng nguồn" : "cột nguồn";
  if (dataType === "IGNORE") {
    return `Ô dùng cấu hình cũ Bỏ qua nhập cho ${sourceAxis}.`;
  }
  if (dataType === "NUMBER") {
    return `Có thể cộng theo kỳ/lũy kế trên ${sourceAxis}.`;
  }
  return `Không tự cộng số; cần chọn phép đếm hoặc nhóm giá trị cho ${sourceAxis}.`;
}

function sampleIdentityValue(key: string, index: number) {
  switch (key) {
    case "periodKey":
      return "22/05/2026";
    case "periodInstanceKey":
      return `Lần ${index}`;
    case "unitSymbol":
      return `PV0${index}`;
    case "unitShortName":
      return `Đơn vị ${index}`;
    case "fullName":
      return `Người báo cáo ${index}`;
    case "userName":
      return `user${index}`;
    case "workAssignmentId":
      return `Công việc ${index}`;
    case "reportId":
      return `Báo cáo ${index}`;
    case "approvedAtUtc":
      return "Đã duyệt";
    case "sourceReportCount":
      return index;
    default:
      return "-";
  }
}

function sampleMetricValue(dataType: DynamicExcelDataType, index: number) {
  switch (dataType) {
    case "IGNORE":
      return "-";
    case "NUMBER":
      return formatMetricNumber(index * 10);
    case "SHORT_TEXT":
      return index === 1 ? "Nhóm A" : "Nhóm B";
    case "MULTI_SELECT":
      return index === 1 ? "A; B" : "B";
    case "BOOLEAN":
      return index % 2 === 0 ? "Không" : "Có";
    case "DATE":
    case "FULL_DATE":
      return `2${index}/05/2026`;
    default:
      return "-";
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;

  const data = "data" in error ? (error as { data?: unknown }).data : null;
  if (data && typeof data === "object" && "message" in data) {
    const code = readApiErrorCode(data);
    if (code === "DYNAMIC_FORM_BLOCK_NOT_FOUND") {
      return "Biểu mẫu/vùng đã chọn không còn thuộc biểu mẫu động đang tổng hợp. Hãy mở đúng công việc có biểu mẫu đó, hoặc lưu lại cấu hình tổng hợp sau khi biểu mẫu động thay đổi.";
    }

    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  if ("message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
}

function readApiErrorCode(data: object) {
  const code = (data as { code?: unknown; errorCode?: unknown }).code ??
    (data as { code?: unknown; errorCode?: unknown }).errorCode;
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

function formatMetricNumber(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function formatFieldStatisticValue(row: FieldStatisticSummaryRow) {
  const type = row.fieldType?.trim().toLowerCase();
  if (type === "number") {
    return `Tổng ${formatMetricNumber(row.sum)} / Nhỏ nhất ${formatMetricNumber(row.min)} / Lớn nhất ${formatMetricNumber(row.max)}`;
  }
  if (type === "boolean") {
    return `Có ${row.trueCount} / Không ${row.falseCount}`;
  }
  if (type === "date") {
    const minDate = row.earliestDateUtc
      ? new Date(row.earliestDateUtc).toLocaleDateString("vi-VN")
      : null;
    const maxDate = row.latestDateUtc
      ? new Date(row.latestDateUtc).toLocaleDateString("vi-VN")
      : null;

    if (minDate && maxDate && minDate !== maxDate) return `${minDate} - ${maxDate}`;
    return maxDate ?? minDate ?? "-";
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
    default:
      return mode || "-";
  }
}

function formatStackCellValue(value: unknown) {
  if (value == null) return "-";
  if (typeof value === "number") return formatMetricNumber(value);
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  return String(value);
}

function StackedAggregatePreview({
  table,
  metricLabelByKey,
}: {
  table: DynamicFormStackedTableDto;
  metricLabelByKey?: ReadonlyMap<string, string>;
}) {
  const sourceTableMode = normalizeTableMode(table.sourceTableMode);
  const identityAxisLower = getStackIdentityAxisLowerLabel(sourceTableMode);
  const sourceAxisLower = sourceTableMode === "APPEND_COLUMNS" ? "cột" : "dòng";
  const visibleColumns = table.columns;
  return (
    <Box sx={{ minHeight: 260 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Bảng gộp sau tổng hợp
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.72 }}>
            {table.rowMode === "PERIOD_GROUPED_STACK"
              ? `Đã gom dữ liệu theo kỳ và ${identityAxisLower} trước khi hiển thị.`
              : `Hiển thị từng ${sourceAxisLower} nguồn của kỳ đã chọn cùng ${identityAxisLower}.`}
          </Typography>
        </Stack>
        <Chip size="small" variant="outlined" label={`${table.rows.length} dòng`} />
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableCell key={column.key}>
                  <Stack spacing={0.25}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {column.role === "METRIC"
                        ? metricLabelByKey?.get(column.metricKey ?? column.key) || column.label || column.key
                        : column.label || column.key}
                    </Typography>
                  </Stack>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {table.rows.slice(0, 200).map((row) => (
              <TableRow key={row.rowKey} hover>
                {visibleColumns.map((column) => (
                  <TableCell key={`${row.rowKey}:${column.key}`}>
                    {formatStackCellValue(row.cells?.[column.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {table.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={Math.max(1, visibleColumns.length)}>
                  <Typography variant="body2" sx={{ opacity: 0.72 }}>
                    Chưa có dòng dữ liệu phù hợp với bộ lọc hiện tại.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {table.rows.length > 200 && (
        <Alert severity="info" sx={{ mt: 1 }}>
          Bản xem trước đang hiển thị 200 dòng đầu; xuất file để kiểm tra toàn bộ dữ liệu.
        </Alert>
      )}
    </Box>
  );
}

function isTextFieldStatisticRow(row: FieldStatisticSummaryRow) {
  const type = row.fieldType?.trim();
  return type === "stringList" || type === "longText";
}

function isConcatFieldStatisticRow(row: FieldStatisticSummaryRow) {
  const type = row.fieldType?.trim();
  return type === "shortText" || type === "stringList" || type === "longText" || type === "singleSelect" || type === "multiSelect";
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

function getDynamicFormAggregateExportShape(
  result: DynamicFormAggregateResponse,
  metricLabelByKey?: ReadonlyMap<string, string>,
) {
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
        { key: "metricLabel", header: "Chỉ số", width: 34 },
        { key: "count", header: "Số dòng", width: 12, type: "integer" },
        { key: "reportCount", header: "Số báo cáo", width: 12, type: "integer" },
        { key: "sum", header: "Tổng", width: 14, type: "decimal" },
        { key: "min", header: "Nhỏ nhất", width: 14, type: "decimal" },
        { key: "max", header: "Lớn nhất", width: 14, type: "decimal" },
        { key: "average", header: "Trung bình", width: 14, type: "decimal" },
      ]
    : [
        { key: "metricLabel", header: "Chỉ tiêu", width: 34 },
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
          metricLabel: resolveExportMetricLabel(row, metricLabelByKey),
          count: row.count,
          reportCount: row.reportCount,
          sum: row.sum,
          min: row.min,
          max: row.max,
          average: row.average,
        }
      : {
          metricLabel: resolveExportMetricLabel(row, metricLabelByKey),
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

function resolveExportMetricLabel(
  row: DynamicFormAggregateResponse["rows"][number],
  metricLabelByKey?: ReadonlyMap<string, string>,
) {
  return (
    metricLabelByKey?.get(row.sourceMetricKey ?? "") ??
    metricLabelByKey?.get(row.metricKey) ??
    (row.label && row.label !== row.metricKey ? row.label : null) ??
    `Chỉ tiêu ${row.index + 1}`
  );
}

function csvCell(value: unknown) {
  if (value == null) return "";
  const raw = String(value);
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function buildDynamicFormAggregateCsv(
  result: DynamicFormAggregateResponse,
  metricLabelByKey?: ReadonlyMap<string, string>,
) {
  const { columns, rows } = getDynamicFormAggregateExportShape(result, metricLabelByKey);

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

function downloadDynamicFormAggregateCsv(
  result: DynamicFormAggregateResponse,
  metricLabelByKey?: ReadonlyMap<string, string>,
) {
  const csv = buildDynamicFormAggregateCsv(result, metricLabelByKey);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, buildDynamicFormAggregateFileName(result, "csv"));
}

function buildDynamicFormAggregateFileName(
  result: DynamicFormAggregateResponse,
  extension: "csv" | "xlsx",
  variant: "aggregate" | "template" = "aggregate"
) {
  const template = sanitizeFilePart(
    result.meta.dynamicFormTemplateName || result.meta.dynamicFormTemplateCode
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

async function downloadDynamicFormAggregateXlsx(
  result: DynamicFormAggregateResponse,
  metricLabelByKey?: ReadonlyMap<string, string>,
) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "TDTD";
  workbook.created = new Date();
  workbook.modified = new Date();

  const { columns, rows, sheetName } = getDynamicFormAggregateExportShape(result, metricLabelByKey);
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
    ["Biểu mẫu", result.meta.dynamicFormTemplateName || result.meta.dynamicFormTemplateId],
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

async function downloadSummaryTemplateWorkbookXlsx(
  result: DynamicFormAggregateResponse,
  metricLabelByKey?: ReadonlyMap<string, string>,
) {
  if (result.meta.tableMode !== "SUMMARY_TEMPLATE") {
    await downloadDynamicFormAggregateXlsx(result, metricLabelByKey);
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
        metricLabel: row ? resolveExportMetricLabel(row, metricLabelByKey) : "",
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
  const { columns, rows } = getDynamicFormAggregateExportShape(result, metricLabelByKey);
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
    ["Biểu mẫu", result.meta.dynamicFormTemplateName || result.meta.dynamicFormTemplateId],
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
  const [getWorkAssignmentBasicSummary, basicSummaryState] =
    useGetWorkAssignmentBasicSummaryMutation();
  const [saveWorkAssignmentBasicSummaryConfig, saveBasicSummaryConfigState] =
    useSaveWorkAssignmentBasicSummaryConfigMutation();
  const [searchFieldStatisticSummary, fieldStatisticState] =
    useSearchFieldStatisticSummaryMutation();
  const [searchFieldTextConcat, fieldTextConcatState] =
    useSearchFieldTextConcatMutation();
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
  const directChildScopeOptions = React.useMemo(
    () =>
      scopeOptions.filter(
        (option) =>
          option.isActive !== false &&
          option.parentAssignmentId === effectiveParentAssignmentId &&
          Boolean(option.dynamicFormTemplateId || option.dynamicExcelId),
      ),
    [effectiveParentAssignmentId, scopeOptions],
  );
  const aggregateUnitOptions = React.useMemo(
    () => buildAssignedUnitOptions(scopeOptions, effectiveParentAssignmentId),
    [effectiveParentAssignmentId, scopeOptions],
  );
  const aggregateConfigQuery = useGetWorkAssignmentAggregateConfigQuery(
    effectiveParentAssignmentId ?? "",
    { skip: !effectiveParentAssignmentId }
  );
  const [saveWorkAssignmentAggregateConfig, saveAggregateConfigState] =
    useSaveWorkAssignmentAggregateConfigMutation();
  const aggregateConfigMetricMapping = React.useMemo(
    () => parseAggregateConfigMetricMapping(aggregateConfigQuery.data?.metricMappingsJson),
    [aggregateConfigQuery.data?.metricMappingsJson]
  );
  const aggregateConfigSourceBlockId =
    normalizeOptionalText(aggregateConfigQuery.data?.sourceBlockId) ??
    aggregateConfigMetricMapping.sourceBlockId;
  const sourceScopeOption = React.useMemo(() => {
    const configuredFormId = normalizeOptionalText(aggregateConfigQuery.data?.sourceDynamicFormTemplateId);
    const configuredExcelId = aggregateConfigMetricMapping.sourceDynamicExcelTemplateId;
    const configuredChild = directChildScopeOptions.find(
      (option) =>
        (configuredFormId && option.dynamicFormTemplateId === configuredFormId) ||
        (configuredExcelId && option.dynamicExcelId === configuredExcelId),
    );
    if (configuredChild) return configuredChild;

    const childDynamicForms = directChildScopeOptions.filter((option) =>
      Boolean(option.dynamicFormTemplateId)
    );
    if (childDynamicForms.length > 0) {
      return (
        childDynamicForms.find(
          (option) =>
            option.dynamicFormTemplateId &&
            option.dynamicFormTemplateId !== selectedScopeOption?.dynamicFormTemplateId,
        ) ?? childDynamicForms[0]
      );
    }

    return directChildScopeOptions.find((option) => Boolean(option.dynamicExcelId)) ?? selectedScopeOption;
  }, [
    aggregateConfigMetricMapping.sourceDynamicExcelTemplateId,
    aggregateConfigQuery.data?.sourceDynamicFormTemplateId,
    directChildScopeOptions,
    selectedScopeOption,
  ]);
  const seedDynamicExcelId =
    normalizeOptionalText(sourceScopeOption?.dynamicFormTemplateId)
      ? normalizeOptionalText(sourceScopeOption?.dynamicExcelId)
      : normalizeOptionalText(sourceScopeOption?.dynamicExcelId) ??
        normalizeOptionalText(defaultDynamicExcelId) ??
        normalizeOptionalText(selectedScopeOption?.dynamicExcelId);
  const seedDynamicExcelCode =
    normalizeOptionalText(sourceScopeOption?.dynamicFormTemplateId)
      ? normalizeOptionalText(sourceScopeOption?.dynamicExcelCode)
      : normalizeOptionalText(sourceScopeOption?.dynamicExcelCode) ??
        normalizeOptionalText(defaultDynamicExcelCode) ??
        normalizeOptionalText(selectedScopeOption?.dynamicExcelCode);
  const seedDynamicExcelName =
    normalizeOptionalText(sourceScopeOption?.dynamicFormTemplateId)
      ? normalizeOptionalText(sourceScopeOption?.dynamicExcelName)
      : normalizeOptionalText(sourceScopeOption?.dynamicExcelName) ??
        normalizeOptionalText(defaultDynamicExcelName) ??
        normalizeOptionalText(selectedScopeOption?.dynamicExcelName);
  const seedDynamicFormTemplateId =
    normalizeOptionalText(sourceScopeOption?.dynamicFormTemplateId) ??
    normalizeOptionalText(defaultDynamicFormTemplateId) ??
    normalizeOptionalText(selectedScopeOption?.dynamicFormTemplateId);
  const seedDynamicFormTemplateCode =
    normalizeOptionalText(sourceScopeOption?.dynamicFormTemplateCode) ??
    normalizeOptionalText(defaultDynamicFormTemplateCode) ??
    normalizeOptionalText(selectedScopeOption?.dynamicFormTemplateCode);
  const seedDynamicFormTemplateName =
    normalizeOptionalText(sourceScopeOption?.dynamicFormTemplateName) ??
    normalizeOptionalText(defaultDynamicFormTemplateName) ??
    normalizeOptionalText(selectedScopeOption?.dynamicFormTemplateName);
  const seedPeriodDate = dayKeyToDateInput(sourceScopeOption?.latestPeriodKey ?? selectedScopeOption?.latestPeriodKey);

  const basicSummaryConfigQuery = useGetWorkAssignmentBasicSummaryConfigQuery(
    {
      assignmentId: effectiveParentAssignmentId ?? "",
      dynamicFormTemplateId: seedDynamicFormTemplateId ?? "",
    },
    { skip: !effectiveParentAssignmentId || !seedDynamicFormTemplateId },
  );

  const [filter, setFilter] = React.useState<AggregateFilterState>(() =>
    createDefaultFilter(seedDynamicExcelId, seedPeriodDate)
  );
  const [result, setResult] = React.useState<AggregateTableResponse | null>(null);
  const [dynamicFormResult, setDynamicFormResult] =
    React.useState<DynamicFormAggregateResponse | null>(null);
  const [basicSummaryResult, setBasicSummaryResult] =
    React.useState<WorkAssignmentBasicSummaryResponse | null>(null);
  const [summaryMode, setSummaryMode] = React.useState<"BASIC" | "ADVANCED">("BASIC");
  const [fieldStatisticResult, setFieldStatisticResult] =
    React.useState<FieldStatisticSummaryResponse | null>(null);
  const [fieldTextConcatResult, setFieldTextConcatResult] =
    React.useState<FieldTextConcatResponse | null>(null);
  const [fieldTextConcatRequest, setFieldTextConcatRequest] =
    React.useState<FieldTextConcatRequest | null>(null);
  const [fieldTextConcatExporting, setFieldTextConcatExporting] = React.useState(false);
  const [selectedDynamicFormBlockId, setSelectedDynamicFormBlockId] = React.useState("");
  const [basicSummaryDefaultMethods, setBasicSummaryDefaultMethods] =
    React.useState<WorkAssignmentBasicSummaryDefaultMethodsDto>(DEFAULT_BASIC_SUMMARY_METHODS);
  const [basicSummaryFieldMethods, setBasicSummaryFieldMethods] =
    React.useState<Record<string, SummaryMethod>>({});
  const [basicSummarySourceView, setBasicSummarySourceView] =
    React.useState(DEFAULT_BASIC_SUMMARY_SOURCE_VIEW);
  const [basicSummarySourceScopeMode, setBasicSummarySourceScopeMode] =
    React.useState(DEFAULT_BASIC_SUMMARY_SOURCE_SCOPE_MODE);
  const [stackIdentityPreviewOpen, setStackIdentityPreviewOpen] = React.useState(false);
  const [stackIdentityColumns, setStackIdentityColumns] = React.useState<string[]>([
    "periodKey",
    "unitSymbol",
    "unitShortName",
    "fullName",
    "userName",
    "sourceReportCount",
  ]);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "" });
  const [previewReportId, setPreviewReportId] = React.useState("");
  const appliedAggregateConfigIdRef = React.useRef<string | null>(null);
  const appliedAggregateMetricMappingRef = React.useRef("");
  const appliedBasicSummaryConfigRef = React.useRef("");

  const showMessage = React.useCallback((message: string) => {
    setSnackbar({ open: true, message });
  }, []);

  const hasDynamicFormSeed = Boolean(seedDynamicFormTemplateId);
  const basicSummarySourceScopeOptions = React.useMemo(
    () => buildBasicSummarySourceScopeOptions(selectedScopeOption),
    [selectedScopeOption],
  );
  const basicSummarySourceScopeRequest = React.useMemo(
    () => buildBasicSummarySourceScopeRequest(selectedScopeOption, basicSummarySourceScopeMode),
    [basicSummarySourceScopeMode, selectedScopeOption],
  );

  React.useEffect(() => {
    if (!basicSummarySourceScopeOptions.some((option) => option.value === basicSummarySourceScopeMode)) {
      setBasicSummarySourceScopeMode(DEFAULT_BASIC_SUMMARY_SOURCE_SCOPE_MODE);
    }
  }, [basicSummarySourceScopeMode, basicSummarySourceScopeOptions]);

  const dynamicFormQuery = useGetDynamicFormQuery(
    { id: seedDynamicFormTemplateId ?? "" },
    { skip: !seedDynamicFormTemplateId }
  );

  React.useEffect(() => {
    const configured = aggregateConfigQuery.data?.identityColumns;
    if (Array.isArray(configured) && configured.length > 0) {
      setStackIdentityColumns(configured);
    }
  }, [aggregateConfigQuery.data?.identityColumns]);

  const dynamicFormExcelBlocks = React.useMemo(
    () => resolveDynamicFormExcelBlocks(dynamicFormQuery.data),
    [dynamicFormQuery.data]
  );

  React.useEffect(() => {
    if (!dynamicFormExcelBlocks.length) {
      setSelectedDynamicFormBlockId("");
      return;
    }

    setSelectedDynamicFormBlockId((prev) => {
      if (prev && dynamicFormExcelBlocks.some((block) => block.blockId === prev)) return prev;

      const configuredBlock = findDynamicFormBlock(
        dynamicFormExcelBlocks,
        aggregateConfigSourceBlockId,
      ) ?? findDynamicFormBlockByExcelId(
        dynamicFormExcelBlocks,
        aggregateConfigMetricMapping.sourceDynamicExcelTemplateId,
      );
      const seedBlock = findDynamicFormBlockByExcelId(dynamicFormExcelBlocks, seedDynamicExcelId);
      const supportedBlock =
        configuredBlock ??
        seedBlock ??
        dynamicFormExcelBlocks.find((block) => isSupportedDynamicFormAggregateMode(block.tableMode)) ??
        dynamicFormExcelBlocks[0];

      return supportedBlock?.blockId ?? "";
    });
  }, [
    aggregateConfigMetricMapping.sourceDynamicExcelTemplateId,
    aggregateConfigSourceBlockId,
    dynamicFormExcelBlocks,
    seedDynamicExcelId,
  ]);

  React.useEffect(() => {
    if (!aggregateConfigQuery.data || !dynamicFormExcelBlocks.length) return;

    const configuredBlock =
      findDynamicFormBlock(dynamicFormExcelBlocks, aggregateConfigSourceBlockId) ??
      findDynamicFormBlockByExcelId(
        dynamicFormExcelBlocks,
        aggregateConfigMetricMapping.sourceDynamicExcelTemplateId,
      );
    if (!configuredBlock) return;

    const fingerprint = [
      aggregateConfigQuery.data.id ?? "",
      aggregateConfigQuery.data.versionNo ?? "",
      aggregateConfigSourceBlockId ?? "",
      aggregateConfigMetricMapping.sourceDynamicExcelTemplateId ?? "",
    ].join(":");
    if (appliedAggregateConfigIdRef.current === fingerprint) return;

    appliedAggregateConfigIdRef.current = fingerprint;
    setSelectedDynamicFormBlockId(configuredBlock.blockId);
  }, [
    aggregateConfigMetricMapping.sourceDynamicExcelTemplateId,
    aggregateConfigQuery.data,
    aggregateConfigSourceBlockId,
    dynamicFormExcelBlocks,
  ]);

  const resolvedDynamicFormExcelBlock =
    findDynamicFormBlock(dynamicFormExcelBlocks, selectedDynamicFormBlockId) ??
    findDynamicFormBlock(dynamicFormExcelBlocks, aggregateConfigSourceBlockId) ??
    findDynamicFormBlockByExcelId(
      dynamicFormExcelBlocks,
      aggregateConfigMetricMapping.sourceDynamicExcelTemplateId,
    ) ??
    findDynamicFormBlockByExcelId(dynamicFormExcelBlocks, seedDynamicExcelId) ??
    dynamicFormExcelBlocks[0] ??
    null;
  const resolvedSupportedDynamicFormExcelBlock =
    isSupportedDynamicFormAggregateMode(resolvedDynamicFormExcelBlock?.tableMode)
      ? resolvedDynamicFormExcelBlock
      : null;

  const effectiveDynamicExcelId = hasDynamicFormSeed
    ? resolvedDynamicFormExcelBlock?.dynamicExcelId ?? null
    : seedDynamicExcelId ?? null;
  const effectiveDynamicExcelCode = hasDynamicFormSeed
    ? resolvedDynamicFormExcelBlock?.dynamicExcelCode ?? null
    : seedDynamicExcelCode ?? null;
  const effectiveDynamicExcelName = hasDynamicFormSeed
    ? resolvedDynamicFormExcelBlock?.dynamicExcelName ?? null
    : seedDynamicExcelName ?? null;

  React.useEffect(() => {
    setFilter(createDefaultFilter(effectiveDynamicExcelId, seedPeriodDate));
    setResult(null);
    setDynamicFormResult(null);
    setBasicSummaryResult(null);
    setBasicSummaryDefaultMethods(DEFAULT_BASIC_SUMMARY_METHODS);
    setBasicSummaryFieldMethods({});
    setBasicSummarySourceView(DEFAULT_BASIC_SUMMARY_SOURCE_VIEW);
    setBasicSummarySourceScopeMode(DEFAULT_BASIC_SUMMARY_SOURCE_SCOPE_MODE);
    setFieldStatisticResult(null);
    setFieldTextConcatResult(null);
    setFieldTextConcatRequest(null);
  }, [
    effectiveDynamicExcelId,
    effectiveParentAssignmentId,
    seedDynamicFormTemplateId,
    seedPeriodDate,
    workId,
  ]);

  React.useEffect(() => {
    setBasicSummaryFieldMethods({});
  }, [selectedDynamicFormBlockId, effectiveDynamicExcelId, seedDynamicFormTemplateId]);

  React.useEffect(() => {
    if (!aggregateConfigQuery.data || !resolvedSupportedDynamicFormExcelBlock) return;

    if (
      aggregateConfigSourceBlockId &&
      aggregateConfigSourceBlockId !== resolvedSupportedDynamicFormExcelBlock.blockId
    ) {
      return;
    }

    if (
      aggregateConfigMetricMapping.sourceDynamicExcelTemplateId &&
      resolvedSupportedDynamicFormExcelBlock.dynamicExcelId &&
      aggregateConfigMetricMapping.sourceDynamicExcelTemplateId !==
        resolvedSupportedDynamicFormExcelBlock.dynamicExcelId
    ) {
      return;
    }

    const fingerprint = [
      aggregateConfigQuery.data.id ?? "",
      aggregateConfigQuery.data.versionNo ?? "",
      resolvedSupportedDynamicFormExcelBlock.blockId,
      aggregateConfigQuery.data.metricMappingsJson ?? "",
    ].join(":");
    if (appliedAggregateMetricMappingRef.current === fingerprint) return;

    appliedAggregateMetricMappingRef.current = fingerprint;
    setFilter((prev) =>
      prev.metricKeys.length === 0 ? prev : { ...prev, metricKeys: [] }
    );
  }, [
    aggregateConfigMetricMapping,
    aggregateConfigQuery.data,
    aggregateConfigSourceBlockId,
    resolvedSupportedDynamicFormExcelBlock,
  ]);

  React.useEffect(() => {
    const allowedUnitIds = new Set(aggregateUnitOptions.map((item) => item.id));
    setFilter((prev) => {
      const nextSelectedUnitIds = prev.selectedUnitIds.filter((unitId) =>
        allowedUnitIds.has(unitId),
      );
      if (nextSelectedUnitIds.length === prev.selectedUnitIds.length) return prev;
      return { ...prev, selectedUnitIds: nextSelectedUnitIds };
    });
  }, [aggregateUnitOptions]);

  React.useEffect(() => {
    if (summaryMode !== "BASIC") return;
    if (selectedScopeOption?.assignmentType !== "PERIODIC_REPORT") return;
    if (filter.periodScopeMode === "SINGLE_PERIOD" || filter.periodScopeMode === "PERIOD_RANGE") return;

    setFilter((prev) => ({ ...prev, periodScopeMode: "PERIOD_RANGE" }));
    setBasicSummaryResult(null);
  }, [filter.periodScopeMode, selectedScopeOption?.assignmentType, summaryMode]);

  const shouldLoadTemplateWorkbook = summaryMode === "ADVANCED" && Boolean(filter.dynamicExcelId);
  const templateQuery = useGetDynamicExcelQuery(
    { id: filter.dynamicExcelId },
    { skip: !shouldLoadTemplateWorkbook }
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
  const basicSummaryFieldMethodRows = React.useMemo(
    () =>
      buildBasicSummaryFieldMethodRows(
        dynamicFormQuery.data,
        basicSummaryFieldMethods,
        basicSummaryDefaultMethods,
      ),
    [basicSummaryDefaultMethods, basicSummaryFieldMethods, dynamicFormQuery.data],
  );
  const basicSummaryRules = React.useMemo(
    () => buildBasicSummaryFieldRules(basicSummaryFieldMethodRows),
    [basicSummaryFieldMethodRows],
  );
  const handleBasicSummaryFieldMethodChange = React.useCallback((fieldId: string, method: SummaryMethod) => {
    setBasicSummaryFieldMethods((prev) => ({
      ...prev,
      [fieldId]: method,
    }));
    setBasicSummaryResult(null);
  }, []);
  const handleBasicSummaryDefaultMethodsChange = React.useCallback((methods: WorkAssignmentBasicSummaryDefaultMethodsDto) => {
    setBasicSummaryDefaultMethods({ ...DEFAULT_BASIC_SUMMARY_METHODS, ...methods });
    setBasicSummaryResult(null);
  }, []);
  const updateBasicSummaryFilter = React.useCallback((patch: Partial<AggregateFilterState>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
    setBasicSummaryResult(null);
  }, []);
  const handleBasicSummaryPeriodScopeModeChange = React.useCallback((periodScopeMode: PeriodScopeMode) => {
    updateBasicSummaryFilter({ periodScopeMode });
  }, [updateBasicSummaryFilter]);
  const handleBasicSummaryPeriodDateChange = React.useCallback((periodDate: string) => {
    updateBasicSummaryFilter({ periodDate });
  }, [updateBasicSummaryFilter]);
  const handleBasicSummaryPeriodDateFromChange = React.useCallback((periodDateFrom: string) => {
    updateBasicSummaryFilter({ periodDateFrom });
  }, [updateBasicSummaryFilter]);
  const handleBasicSummaryPeriodDateToChange = React.useCallback((periodDateTo: string) => {
    updateBasicSummaryFilter({ periodDateTo });
  }, [updateBasicSummaryFilter]);
  const handleBasicSummarySelectedUnitIdsChange = React.useCallback((selectedUnitIds: string[]) => {
    updateBasicSummaryFilter({ selectedUnitIds });
  }, [updateBasicSummaryFilter]);

  React.useEffect(() => {
    const config = basicSummaryConfigQuery.data;
    if (!config) return;

    const fingerprint = `${config.id ?? ""}:${config.versionNo ?? ""}:${config.assignmentId}:${config.dynamicFormTemplateId}`;
    if (appliedBasicSummaryConfigRef.current === fingerprint) return;
    appliedBasicSummaryConfigRef.current = fingerprint;

    const nextDefaultMethods = { ...DEFAULT_BASIC_SUMMARY_METHODS, ...(config.defaultMethods ?? {}) };
    setBasicSummaryDefaultMethods(nextDefaultMethods);

    const fieldRowsForConfig = buildBasicSummaryFieldMethodRows(
      dynamicFormQuery.data,
      {},
      nextDefaultMethods,
    );
    setBasicSummaryFieldMethods(buildFieldSummaryMethodsFromRules(fieldRowsForConfig, config.rules));
    setBasicSummaryResult(null);
  }, [
    basicSummaryConfigQuery.data,
    dynamicFormQuery.data,
  ]);
  const selectedAggregateMetricOptions = React.useMemo(() => {
    if (!resolvedSupportedDynamicFormExcelBlock) return [];
    if (!filter.metricKeys.length) return resolvedSupportedDynamicFormExcelBlock.metricOptions;
    const selected = new Set(filter.metricKeys);
    return resolvedSupportedDynamicFormExcelBlock.metricOptions.filter((option) =>
      selected.has(option.metricKey),
    );
  }, [filter.metricKeys, resolvedSupportedDynamicFormExcelBlock]);
  const previewDynamicFormExcelBlock = React.useMemo(
    () =>
      resolvedSupportedDynamicFormExcelBlock
        ? {
            ...resolvedSupportedDynamicFormExcelBlock,
            metricOptions: selectedAggregateMetricOptions,
          }
        : null,
    [resolvedSupportedDynamicFormExcelBlock, selectedAggregateMetricOptions],
  );
  const dynamicFormPreviewHighlights = React.useMemo(
    () =>
      previewDynamicFormExcelBlock
        ? buildMetricPreviewHighlights(previewDynamicFormExcelBlock, templateRect)
        : [],
    [previewDynamicFormExcelBlock, templateRect]
  );
  const resultRect = React.useMemo(
    () => resolveResultRect(result, templateRect),
    [result, templateRect]
  );

  const loading =
    aggregateState.isLoading ||
    dynamicFormAggregateState.isLoading ||
    basicSummaryState.isLoading ||
    fieldStatisticState.isLoading ||
    fieldTextConcatState.isLoading ||
    fieldTextConcatExporting ||
    templateQuery.isFetching ||
    dynamicFormQuery.isFetching ||
    scopeOptionsQuery.isFetching ||
    selectedAssignmentQuery.isFetching;
  const dynamicFormResolutionPending =
    Boolean(effectiveParentAssignmentId) &&
    hasDynamicFormSeed &&
    dynamicFormQuery.isFetching;
  const hasResolvedDynamicFormExcelBlock =
    hasDynamicFormSeed && Boolean(resolvedDynamicFormExcelBlock);
  const supportsDynamicFormAggregate =
    hasDynamicFormSeed && Boolean(resolvedSupportedDynamicFormExcelBlock);
  const dynamicFormUnsupported =
    Boolean(effectiveParentAssignmentId) &&
    hasDynamicFormSeed &&
    !dynamicFormQuery.isFetching &&
    !dynamicFormQuery.error &&
    !resolvedSupportedDynamicFormExcelBlock;
  const dynamicFormUnsupportedMessage = formatUnsupportedDynamicFormBlockMessage(
    resolvedDynamicFormExcelBlock
  );
  const selectedBlockStatisticsDisabled =
    Boolean(resolvedSupportedDynamicFormExcelBlock?.statisticsDisabled);
  const selectedBlockStatisticsDisabledReason = resolvedSupportedDynamicFormExcelBlock
    ? resolvedSupportedDynamicFormExcelBlock.statisticsDisabledReason ?? getLargeTableStatisticMessage(
        resolvedSupportedDynamicFormExcelBlock.statisticsInputCellCount,
        resolvedSupportedDynamicFormExcelBlock.statisticsInputCellLimit,
      )
    : null;

  const handleReset = React.useCallback(() => {
    setFilter(createDefaultFilter(effectiveDynamicExcelId, seedPeriodDate));
    setResult(null);
    setDynamicFormResult(null);
    setBasicSummaryResult(null);
    setFieldStatisticResult(null);
    setFieldTextConcatResult(null);
    setFieldTextConcatRequest(null);
  }, [effectiveDynamicExcelId, seedPeriodDate]);

  const validateFilter = React.useCallback(() => {
    if (dynamicFormUnsupported) return dynamicFormUnsupportedMessage;
    if (!effectiveParentAssignmentId) return "Thiếu công việc gốc để tổng hợp.";
    const aggregateDynamicExcelId =
      filter.dynamicExcelId.trim() || effectiveDynamicExcelId || "";
    if (!seedDynamicFormTemplateId && !aggregateDynamicExcelId) {
      return "Bắt buộc chọn biểu mẫu.";
    }
    if (
      seedDynamicFormTemplateId &&
      resolvedSupportedDynamicFormExcelBlock &&
      !resolvedSupportedDynamicFormExcelBlock.statisticsDisabled &&
      resolvedSupportedDynamicFormExcelBlock.tableMode !== "SUMMARY_TEMPLATE" &&
      resolvedSupportedDynamicFormExcelBlock.metricOptions.length === 0
    ) {
      return "Bảng Excel động chưa cấu hình chỉ tiêu thống kê. Hãy cấu hình rõ ô, dòng, cột hoặc vùng cần tổng hợp trong biểu mẫu động.";
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
    resolvedSupportedDynamicFormExcelBlock,
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
        const request: DynamicFormAggregateRequest = {
          scopeAssignmentId: effectiveParentAssignmentId ?? "",
          scopeMode: "DIRECT_CHILDREN",
          dynamicFormTemplateId: seedDynamicFormTemplateId,
          blockId: resolvedSupportedDynamicFormExcelBlock.blockId,
          tableMode: resolvedSupportedDynamicFormExcelBlock.tableMode,
          metricKeys: null,
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
          aggregateConfigId: aggregateConfigQuery.data?.id ?? null,
          identityColumns: stackIdentityColumns,
        };
        const response = await getDynamicFormAggregateTable(request).unwrap();

        setDynamicFormResult(response);
        setResult(null);
      } catch (err: unknown) {
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
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Không tổng hợp được dữ liệu."));
    }
  }, [
    filter,
    effectiveParentAssignmentId,
    effectiveDynamicExcelId,
    getAggregateTable,
    getDynamicFormAggregateTable,
    aggregateConfigQuery.data?.id,
    resolvedSupportedDynamicFormExcelBlock,
    seedDynamicFormTemplateId,
    showMessage,
    stackIdentityColumns,
    validateFilter,
  ]);

  const handleRunBasicSummary = React.useCallback(async (
    forceRefresh: boolean,
    sourceViewOverride = basicSummarySourceView,
  ) => {
    if (!effectiveParentAssignmentId) {
      showMessage("Thiếu công việc để tải thống kê cơ bản.");
      return;
    }
    const isOnceSummary = selectedScopeOption?.assignmentType === "ONCE";
    const isPeriodicSummary = selectedScopeOption?.assignmentType === "PERIODIC_REPORT";
    if (!isOnceSummary && !isPeriodicSummary) {
      showMessage("Thống kê cơ bản hỗ trợ công việc giao một lần và báo cáo định kỳ.");
      return;
    }
    if (!seedDynamicFormTemplateId) {
      showMessage("Thiếu biểu mẫu động để tải thống kê cơ bản.");
      return;
    }
    if (isPeriodicSummary && filter.periodScopeMode === "CUMULATIVE_TO_PERIOD") {
      showMessage("Thống kê cơ bản cho dữ liệu lớn không hỗ trợ lũy kế. Hãy chọn một kỳ hoặc khoảng kỳ.");
      return;
    }
    if (isPeriodicSummary && filter.periodScopeMode === "ALL_PERIODS") {
      showMessage("Thống kê cơ bản định kỳ cần một kỳ hoặc khoảng kỳ để tránh quét toàn bộ lịch sử.");
      return;
    }
    if (isPeriodicSummary && filter.periodScopeMode === "SINGLE_PERIOD" && !filter.periodDate) {
      showMessage("Bắt buộc chọn ngày/kỳ.");
      return;
    }
    if (
      isPeriodicSummary &&
      filter.periodScopeMode === "PERIOD_RANGE" &&
      (!filter.periodDateFrom || !filter.periodDateTo)
    ) {
      showMessage("Bắt buộc chọn từ ngày và đến ngày.");
      return;
    }

    let periodKeyFrom = normalizeDayKeyInput(filter.periodDateFrom);
    let periodKeyTo = normalizeDayKeyInput(filter.periodDateTo);

    if (periodKeyFrom && periodKeyTo && periodKeyFrom > periodKeyTo) {
      const temp = periodKeyFrom;
      periodKeyFrom = periodKeyTo;
      periodKeyTo = temp;
    }

    const periodScopeMode = isPeriodicSummary ? filter.periodScopeMode : "ALL_PERIODS";
    const selectedUnitIds = filter.selectedUnitIds.length > 0 ? filter.selectedUnitIds : null;

    try {
      const response = await getWorkAssignmentBasicSummary({
        scopeAssignmentId: effectiveParentAssignmentId,
        dynamicFormTemplateId: seedDynamicFormTemplateId,
        selectedUnitIds,
        periodScopeMode,
        periodKey:
          isPeriodicSummary && filter.periodScopeMode === "SINGLE_PERIOD"
            ? normalizeDayKeyInput(filter.periodDate)
            : null,
        periodKeyFrom:
          isPeriodicSummary && filter.periodScopeMode === "PERIOD_RANGE" ? periodKeyFrom : null,
        periodKeyTo:
          isPeriodicSummary && filter.periodScopeMode === "PERIOD_RANGE" ? periodKeyTo : null,
        ...basicSummarySourceScopeRequest,
        defaultMethods: basicSummaryDefaultMethods,
        rules: basicSummaryRules.length ? basicSummaryRules : null,
        sourceView: {
          q: sourceViewOverride.q || null,
          periodKey: sourceViewOverride.periodKey || null,
          unitId: sourceViewOverride.unitId || null,
          assigneeUserId: sourceViewOverride.assigneeUserId || null,
          page: sourceViewOverride.page,
          pageSize: sourceViewOverride.pageSize,
        },
        forceRefresh,
        includeSourceRows: true,
        maxTextChars: 12000,
      }).unwrap();
      setBasicSummaryResult(response);
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Không tải được thống kê cơ bản."));
    }
  }, [
    basicSummaryDefaultMethods,
    basicSummarySourceScopeRequest,
    effectiveParentAssignmentId,
    basicSummarySourceView,
    basicSummaryRules,
    filter,
    getWorkAssignmentBasicSummary,
    seedDynamicFormTemplateId,
    selectedScopeOption?.assignmentType,
    showMessage,
  ]);

  const handleApplyBasicSummarySourceView = React.useCallback(() => {
    const nextView = { ...basicSummarySourceView, page: 0 };
    setBasicSummarySourceView(nextView);
    void handleRunBasicSummary(false, nextView);
  }, [basicSummarySourceView, handleRunBasicSummary]);

  const handleBasicSummarySourcePageChange = React.useCallback((page: number, pageSize: number) => {
    const nextView = { ...basicSummarySourceView, page, pageSize };
    setBasicSummarySourceView(nextView);
    void handleRunBasicSummary(false, nextView);
  }, [basicSummarySourceView, handleRunBasicSummary]);

  const handleSaveBasicSummaryConfig = React.useCallback(async () => {
    if (!effectiveParentAssignmentId || !seedDynamicFormTemplateId) {
      showMessage("Thiếu ngữ cảnh để lưu cấu hình thống kê cơ bản.");
      return;
    }

    try {
      await saveWorkAssignmentBasicSummaryConfig({
        assignmentId: effectiveParentAssignmentId,
        dynamicFormTemplateId: seedDynamicFormTemplateId,
        data: {
          defaultMethods: basicSummaryDefaultMethods,
          rules: basicSummaryRules,
        },
      }).unwrap();
      await basicSummaryConfigQuery.refetch();
      showMessage("Đã lưu cấu hình thống kê cơ bản.");
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Không lưu được cấu hình thống kê cơ bản."));
    }
  }, [
    basicSummaryConfigQuery,
    basicSummaryDefaultMethods,
    basicSummaryRules,
    effectiveParentAssignmentId,
    saveWorkAssignmentBasicSummaryConfig,
    seedDynamicFormTemplateId,
    showMessage,
  ]);

  const handleSaveAggregateConfig = React.useCallback(async () => {
    if (!effectiveParentAssignmentId || !seedDynamicFormTemplateId || !resolvedSupportedDynamicFormExcelBlock) {
      showMessage("Thiếu ngữ cảnh để lưu cấu hình tổng hợp.");
      return;
    }

    try {
      await saveWorkAssignmentAggregateConfig({
        assignmentId: effectiveParentAssignmentId,
        data: {
          sourceDynamicFormTemplateId: seedDynamicFormTemplateId,
          sourceBlockId: resolvedSupportedDynamicFormExcelBlock.blockId,
          sourceTableMode: resolvedSupportedDynamicFormExcelBlock.tableMode,
          targetDynamicFormTemplateId: seedDynamicFormTemplateId,
          targetBlockId: resolvedSupportedDynamicFormExcelBlock.blockId,
          aggregateKind: "MANUAL_MAP",
          identityColumns: stackIdentityColumns,
          periodAggregationRule: "STACK_SINGLE_PERIOD_SUM_RANGE",
          metricMappingsJson: JSON.stringify({
            sourceDynamicExcelTemplateId: resolvedSupportedDynamicFormExcelBlock.dynamicExcelId ?? null,
            sourceBlockId: resolvedSupportedDynamicFormExcelBlock.blockId,
            metricKeys: null,
          }),
        },
      }).unwrap();
      showMessage("Đã lưu cấu hình tổng hợp cho công việc hiện tại.");
    } catch (err: unknown) {
      showMessage(getErrorMessage(err, "Không lưu được cấu hình tổng hợp."));
    }
  }, [
    effectiveParentAssignmentId,
    resolvedSupportedDynamicFormExcelBlock,
    saveWorkAssignmentAggregateConfig,
    seedDynamicFormTemplateId,
    showMessage,
    stackIdentityColumns,
  ]);

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
        reportStatus: WorkAssignmentReportStatus.Approved,
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
      bucketKey: row.bucketKey ?? null,
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
      reportStatus: WorkAssignmentReportStatus.Approved,
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
      showMessage(getErrorMessage(err, "Không tải được nội dung ghép."));
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
      showMessage("Chưa có truy vấn ghép nội dung để xuất dữ liệu.");
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
  const dynamicFormAggregateWorkbookPreview = React.useMemo(
    () =>
      buildDynamicFormAggregateTemplateWorkbook(
        dynamicFormResult,
        resolvedSupportedDynamicFormExcelBlock,
        templateWorkbook,
        templateRect,
    ),
    [dynamicFormResult, resolvedSupportedDynamicFormExcelBlock, templateRect, templateWorkbook],
  );

  const basicSummaryPeriodScopeLabel = React.useMemo(() => {
    if (selectedScopeOption?.assignmentType !== "PERIODIC_REPORT") {
      return "Tất cả báo cáo đã duyệt";
    }
    if (filter.periodScopeMode === "SINGLE_PERIOD") {
      return `Một kỳ: ${formatDayKeyLabel(normalizeDayKeyInput(filter.periodDate))}`;
    }
    if (filter.periodScopeMode === "PERIOD_RANGE") {
      return `Khoảng kỳ: ${formatPeriodRangeLabel(
        normalizeDayKeyInput(filter.periodDateFrom),
        normalizeDayKeyInput(filter.periodDateTo),
      )}`;
    }
    if (filter.periodScopeMode === "CUMULATIVE_TO_PERIOD") {
      return "Lũy kế không hỗ trợ cho thống kê cơ bản dữ liệu lớn";
    }
    return "Toàn bộ kỳ không dùng cho thống kê cơ bản định kỳ";
  }, [
    filter.periodDate,
    filter.periodDateFrom,
    filter.periodDateTo,
    filter.periodScopeMode,
    selectedScopeOption?.assignmentType,
  ]);

  const statisticDiffPeriodKey = React.useMemo(() => {
    if (filter.periodScopeMode === "PERIOD_RANGE") {
      return normalizeDayKeyInput(filter.periodDateTo) || normalizeDayKeyInput(filter.periodDate);
    }
    return normalizeDayKeyInput(filter.periodDate);
  }, [filter.periodDate, filter.periodDateTo, filter.periodScopeMode]);

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
  const metricLabelByKey = React.useMemo(() => {
    const map = new Map<string, string>();
    (resolvedSupportedDynamicFormExcelBlock?.metricOptions ?? []).forEach((option) => {
      map.set(option.metricKey, resolveMetricDisplayLabel(option));
    });
    return map;
  }, [resolvedSupportedDynamicFormExcelBlock?.metricOptions]);
  const metricOptionByKey = React.useMemo(() => {
    const map = new Map<string, AggregateMetricOption>();
    (resolvedSupportedDynamicFormExcelBlock?.metricOptions ?? []).forEach((option) => {
      map.set(option.metricKey, option);
    });
    return map;
  }, [resolvedSupportedDynamicFormExcelBlock?.metricOptions]);
  const formatDynamicFormMetricLabel = React.useCallback(
    (row: DynamicFormAggregateResponse["rows"][number]) => {
      const mapped =
        metricLabelByKey.get(row.sourceMetricKey ?? "") ??
        metricLabelByKey.get(row.metricKey);
      if (mapped) return mapped;

      const rowLabel = normalizeOptionalText(row.label);
      if (
        rowLabel &&
        rowLabel !== row.metricKey &&
        !/row_\d+|col_\d+/i.test(rowLabel)
      ) {
        return rowLabel;
      }

      const option =
        metricOptionByKey.get(row.sourceMetricKey ?? "") ??
        metricOptionByKey.get(row.metricKey) ??
        null;
      const cell = resolveDynamicFormAggregateCell(row, option, templateRect);
      return cell ? `Ô ${formatExcelCellRef(cell.r, cell.c)}` : `Chỉ tiêu ${row.index + 1}`;
    },
    [metricLabelByKey, metricOptionByKey, templateRect]
  );

  const lockDynamicExcel = Boolean(effectiveDynamicExcelId);
  const selectedTemplateLabel = React.useMemo(() => {
    const name = seedDynamicFormTemplateName || effectiveDynamicExcelName || "";
    return name || seedDynamicFormTemplateCode || effectiveDynamicExcelCode || "";
  }, [
    effectiveDynamicExcelCode,
    effectiveDynamicExcelName,
    seedDynamicFormTemplateCode,
    seedDynamicFormTemplateName,
  ]);
  const isSummaryTemplateResult =
    dynamicFormResult?.meta.tableMode === "SUMMARY_TEMPLATE";
  const dynamicFormSourceSlot = hasDynamicFormSeed && dynamicFormExcelBlocks.length > 0 ? (
    <Autocomplete
      size="small"
      options={dynamicFormExcelBlocks}
      value={resolvedDynamicFormExcelBlock}
      getOptionLabel={getDynamicFormBlockDisplayLabel}
      isOptionEqualToValue={(option, selected) => option.blockId === selected.blockId}
      onChange={(_, next) => {
        setSelectedDynamicFormBlockId(next?.blockId ?? "");
        setFilter((prev) => ({
          ...prev,
          dynamicExcelId: next?.dynamicExcelId ?? "",
          metricKeys: [],
        }));
        setResult(null);
        setDynamicFormResult(null);
      }}
      renderOption={(props, option) => (
        <li {...props}>
          <Box sx={{ minWidth: 0, py: 0.25 }}>
            <Typography variant="body2">
              {option.dynamicExcelCode || option.blockId}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[option.dynamicExcelName, formatTableModeLabel(option.tableMode), formatBlockMetricSummary(option)]
                .filter(Boolean)
                .join(" - ")}
            </Typography>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Mẫu bảng / vùng dữ liệu"
          helperText="Khối bảng hoặc mẫu bảng cần được cấu hình trong biểu mẫu động."
        />
      )}
    />
  ) : undefined;

  return (
    <Box sx={{ height: "100%", minHeight: 0 }}>
      <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
        <Stack spacing={0.5}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Tập hợp dữ liệu theo công việc được giao
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.72 }}>
            {selectedScopeIsRoot
              ? "Công việc gốc dùng màn này để xem trước và xuất bảng tổng hợp từ các công việc con; muốn ghi dữ liệu thì mở báo cáo đích và dùng Gán dữ liệu tổng hợp."
              : "Màn này dùng để tập hợp dữ liệu, xem trước bản chụp và lưu cấu hình tổng hợp; muốn ghi vào báo cáo thì mở báo cáo đích và dùng Gán dữ liệu tổng hợp."}
          </Typography>
        </Stack>
        {workId && effectiveParentAssignmentId ? (
          <Alert
            severity="info"
            data-testid="p8-stat-config-entry"
            action={(
              <Button
                component={RouterLink}
                to={statisticsConfigurationPath(workId, effectiveParentAssignmentId, "overview")}
              >
                Mở cấu hình thống kê
              </Button>
            )}
          >
            Basic, Advanced, Diff, label và readiness canonical được quản lý tại workspace cấu hình riêng. Khu vực bên dưới chỉ dành cho xem và thao tác kết quả theo phase được máy chủ cho phép.
          </Alert>
        ) : null}

        {!effectiveParentAssignmentId && !scopeOptionsQuery.isFetching && (
          <Alert severity="info">
            Mở tổng hợp từ một dòng giao việc để hệ thống có đủ ngữ cảnh biểu mẫu và báo cáo. Màn này không cho chọn lại công việc cha.
          </Alert>
        )}

        {effectiveParentAssignmentId &&
          (scopeOptionsQuery.isFetching || selectedAssignmentQuery.isFetching) &&
          !selectedTemplateLabel && (
          <Alert severity="info">
            Đang tải ngữ cảnh công việc được giao để xác định biểu mẫu và vùng tổng hợp.
          </Alert>
        )}

        {effectiveParentAssignmentId &&
          !selectedScopeOption &&
          !scopeOptionsQuery.isFetching &&
          !selectedAssignmentQuery.isFetching &&
          selectedAssignmentQuery.error && (
          <Alert severity="error">
            Không tải được ngữ cảnh công việc được giao. Hãy mở tổng hợp từ dòng giao việc phù hợp hoặc kiểm tra quyền truy cập công việc.
          </Alert>
        )}

        {effectiveParentAssignmentId && selectedTemplateLabel && !supportsDynamicFormAggregate && (
          <Alert severity="info">
            Đang tổng hợp cho biểu mẫu: <b>{selectedTemplateLabel}</b>
          </Alert>
        )}

        {effectiveParentAssignmentId && selectedScopeIsRoot && !scopeOptionsQuery.isFetching && (
          <Alert severity="info">
            Bạn đang ở công việc gốc. Luồng này chỉ xem trước và xuất bảng tổng hợp từ các công việc con; muốn ghi dữ liệu vào báo cáo, mở báo cáo đích rồi dùng <b>Gán dữ liệu tổng hợp</b>.
          </Alert>
        )}

        {effectiveParentAssignmentId && (
          <Tabs
            value={summaryMode}
            onChange={(_, next) => setSummaryMode(next)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": {
                minHeight: 40,
                textTransform: "none",
                fontWeight: 700,
              },
            }}
          >
            <Tab
              value="BASIC"
              icon={<SummarizeOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label="Cơ bản"
            />
            <Tab
              value="ADVANCED"
              icon={<TuneOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label="Nâng cao"
            />
          </Tabs>
        )}

        {summaryMode === "BASIC" && effectiveParentAssignmentId && (
            <BasicSummaryPanel
              assignmentType={selectedScopeOption?.assignmentType}
              scopeAssignmentId={effectiveParentAssignmentId}
              dynamicFormTemplateId={seedDynamicFormTemplateId}
              dynamicFormDetail={dynamicFormQuery.data ?? null}
              result={basicSummaryResult}
              loading={basicSummaryState.isLoading}
              configLoading={basicSummaryConfigQuery.isFetching}
              configSaving={saveBasicSummaryConfigState.isLoading}
              defaultMethods={basicSummaryDefaultMethods}
              fieldMethodRows={basicSummaryFieldMethodRows}
              sourceView={basicSummarySourceView}
              periodScopeLabel={basicSummaryPeriodScopeLabel}
              periodScopeMode={filter.periodScopeMode}
              periodDate={filter.periodDate}
              periodDateFrom={filter.periodDateFrom}
              periodDateTo={filter.periodDateTo}
              selectedUnitIds={filter.selectedUnitIds}
              unitOptions={aggregateUnitOptions}
              sourceScopeMode={basicSummarySourceScopeMode}
              sourceScopeOptions={basicSummarySourceScopeOptions}
              onDefaultMethodsChange={handleBasicSummaryDefaultMethodsChange}
              onFieldMethodChange={handleBasicSummaryFieldMethodChange}
              onPeriodScopeModeChange={handleBasicSummaryPeriodScopeModeChange}
              onPeriodDateChange={handleBasicSummaryPeriodDateChange}
              onPeriodDateFromChange={handleBasicSummaryPeriodDateFromChange}
              onPeriodDateToChange={handleBasicSummaryPeriodDateToChange}
              onSelectedUnitIdsChange={handleBasicSummarySelectedUnitIdsChange}
              onSourceScopeModeChange={setBasicSummarySourceScopeMode}
              onSaveConfig={() => void handleSaveBasicSummaryConfig()}
              onLoad={(forceRefresh) => void handleRunBasicSummary(forceRefresh)}
              onSourceViewChange={setBasicSummarySourceView}
              onApplySourceView={handleApplyBasicSummarySourceView}
              onSourcePageChange={handleBasicSummarySourcePageChange}
              onPreviewReport={setPreviewReportId}
            />
        )}

        {summaryMode === "ADVANCED" && (
          <>

        {dynamicFormResolutionPending && (
          <Alert severity="info">
            Đang tải biểu mẫu động để xác định bảng Excel cần tổng hợp.
          </Alert>
        )}

        {selectedBlockStatisticsDisabled && selectedBlockStatisticsDisabledReason && (
          <Alert severity="warning">
            {selectedBlockStatisticsDisabledReason}
          </Alert>
        )}

        {Boolean(effectiveParentAssignmentId) &&
          supportsDynamicFormAggregate &&
          resolvedSupportedDynamicFormExcelBlock && (
            <DynamicFormAggregatePreviewPanel
              block={previewDynamicFormExcelBlock ?? resolvedSupportedDynamicFormExcelBlock}
              workbook={templateWorkbook}
              templateRect={templateRect}
              templateSpec={templateSpec}
              selectedTemplateLabel={selectedTemplateLabel}
              previewHighlights={dynamicFormPreviewHighlights}
              loading={templateQuery.isFetching}
              title="Mẫu bảng cho người báo cáo"
              description="Bảng bên dưới dùng cùng bố cục với màn nhập báo cáo. Vùng dữ liệu và ô hoặc chỉ tiêu đang đọc được tô màu trực tiếp trên mẫu bảng."
            />
          )}

        {Boolean(effectiveParentAssignmentId) &&
          supportsDynamicFormAggregate &&
          (resolvedSupportedDynamicFormExcelBlock?.tableMode === "APPEND_ROWS" ||
            resolvedSupportedDynamicFormExcelBlock?.tableMode === "APPEND_COLUMNS") && (
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
                      Chọn chỉ tiêu và định danh nguồn
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.72 }}>
                      {resolvedSupportedDynamicFormExcelBlock?.tableMode === "APPEND_COLUMNS"
                        ? "Bảng thêm cột dùng hàng định danh nguồn để mô tả từng cột phát sinh."
                        : "Bảng thêm dòng dùng cột định danh nguồn để mô tả từng dòng phát sinh."}
                      {" Cấu hình này chỉ lưu cho công việc đang tổng hợp, không sửa biểu mẫu động dùng chung."}
                    </Typography>
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                      onClick={() => setStackIdentityPreviewOpen(true)}
                    >
                      Xem trước định danh
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => void handleSaveAggregateConfig()}
                      disabled={saveAggregateConfigState.isLoading}
                    >
                      {saveAggregateConfigState.isLoading ? "Đang lưu..." : "Lưu cấu hình"}
                    </Button>
                  </Stack>
                </Stack>
                <Autocomplete
                  multiple
                  size="small"
                  options={STACK_IDENTITY_COLUMN_OPTIONS}
                  value={STACK_IDENTITY_COLUMN_OPTIONS.filter((option) =>
                    stackIdentityColumns.includes(option.value)
                  )}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, selected) => option.value === selected.value}
                  onChange={(_, next) => {
                    setStackIdentityColumns(next.map((item) => item.value));
                    setStackIdentityPreviewOpen(true);
                  }}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Tooltip
                        title={`${option.label}: ${option.description}`}
                        placement="right"
                        arrow
                      >
                        <Box sx={{ width: "100%", py: 0.25 }}>
                          <Typography variant="body2">{option.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={getStackIdentityAxisLabel(resolvedSupportedDynamicFormExcelBlock?.tableMode)}
                      helperText={getStackIdentityHelperText(resolvedSupportedDynamicFormExcelBlock?.tableMode)}
                    />
                  )}
                />
              </Stack>
            </Box>
          )}

        {Boolean(effectiveParentAssignmentId) &&
          hasResolvedDynamicFormExcelBlock &&
          !supportsDynamicFormAggregate && (
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

        {effectiveParentAssignmentId && (
          <AggregateFilterBar
            value={filter}
            defaultDynamicExcelCode={effectiveDynamicExcelCode}
            defaultDynamicExcelName={effectiveDynamicExcelName}
            lockDynamicExcel={lockDynamicExcel}
            showScopeMode={hasDynamicFormSeed}
            showAggregateMode={!hasDynamicFormSeed}
            showMetricFilter={supportsDynamicFormAggregate}
            metricOptions={resolvedSupportedDynamicFormExcelBlock?.metricOptions ?? []}
            metricSummaryText={
              resolvedSupportedDynamicFormExcelBlock
                ? formatBlockMetricSummary(resolvedSupportedDynamicFormExcelBlock)
                : undefined
            }
            metricHelperText={formatBlockMetricHelper(resolvedSupportedDynamicFormExcelBlock)}
            unitOptions={aggregateUnitOptions}
            loading={loading}
            primaryDisabled={false}
            sourceSlot={dynamicFormSourceSlot}
            extraActions={
              effectiveParentAssignmentId && workId
                ? [
                    {
                      key: "field-statistics",
                      label: "Thống kê trường biểu mẫu động",
                      tooltip: "Xem thống kê các trường biểu mẫu động theo cùng khoảng thời gian và đơn vị",
                      icon: CalculateOutlinedIcon,
                      onClick: () => void handleRunFieldStatistics(),
                      disabled: fieldStatisticState.isLoading,
                      color: "primary",
                    },
                  ]
                : []
            }
            onChange={setFilter}
            onRun={() => void handleRunAggregate()}
            onReset={handleReset}
          />
        )}

        {effectiveParentAssignmentId && workId && seedDynamicFormTemplateId && (
          <StatisticDiffPanel
            workId={workId}
            assignmentId={effectiveParentAssignmentId}
            dynamicFormTemplateId={seedDynamicFormTemplateId}
            periodKey={statisticDiffPeriodKey}
            selectedUnitIds={filter.selectedUnitIds}
            sourceScopeOptions={basicSummarySourceScopeOptions}
            defaultSourceScopeMode={basicSummarySourceScopeMode}
          />
        )}

        {effectiveParentAssignmentId && workId && fieldStatisticResult && (
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Stack spacing={1.5}>
              <Stack spacing={0.25}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Thống kê trường biểu mẫu động
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.72 }}>
                  Kết quả dùng cùng khoảng thời gian, đơn vị và phạm vi đã chọn ở bộ lọc tập hợp.
                </Typography>
              </Stack>

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
                      label={`Lượt báo cáo: ${fieldStatisticResult.totalReportCount}`}
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
                          <TableCell>Nhãn thống kê</TableCell>
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
                            <TableCell>
                              {row.statisticLabelCodes?.length ? (
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                  {row.statisticLabelCodes.map((code) => (
                                    <Chip key={code} size="small" variant="outlined" label={code} />
                                  ))}
                                </Stack>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>{getFieldTypeDisplayLabel(row.fieldType)}</TableCell>
                            <TableCell>{row.bucketLabel ?? row.bucketKey ?? "-"}</TableCell>
                            <TableCell>{formatDayKeyLabel(row.periodKey)}</TableCell>
                            <TableCell align="right">{formatFieldStatisticValue(row)}</TableCell>
                            <TableCell align="right">{row.valueCount}</TableCell>
                            <TableCell align="right">{row.reportCount}</TableCell>
                            <TableCell align="right">
                              {isConcatFieldStatisticRow(row) ? (
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => void handleRunFieldTextConcat(row)}
                                  disabled={fieldTextConcatState.isLoading}
                                >
                                  {isTextFieldStatisticRow(row) ? "Xem nội dung" : "Xem danh sách"}
                                </Button>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {fieldStatisticResult.rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9}>
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
                label={`Phần bảng: ${dynamicFormResult.meta.blockId}`}
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
                onClick={() => downloadDynamicFormAggregateCsv(dynamicFormResult, metricLabelByKey)}
              >
                Xuất CSV
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
                onClick={() => void downloadDynamicFormAggregateXlsx(dynamicFormResult, metricLabelByKey)}
              >
                Xuất XLSX
              </Button>
              {isSummaryTemplateResult && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
                  onClick={() => void downloadSummaryTemplateWorkbookXlsx(dynamicFormResult, metricLabelByKey)}
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
              Phần tổng hợp dùng các chỉ số đã cấu hình trong biểu mẫu. Bản xem trước đọc dữ liệu từ biểu mẫu/vùng đã chọn.
            </Alert>

            <Alert severity="info">
              Tab tổng hợp chỉ lưu cấu hình và xem trước bản chụp. Muốn ghi dữ liệu vào báo cáo, mở báo cáo đích rồi dùng <b>Gán dữ liệu tổng hợp</b> để chọn biểu mẫu, vùng đích và khoảng ngày.
            </Alert>

            {dynamicFormAggregateWorkbookPreview && (
              <AggregateWorkbookPreview
                title="Báo cáo tổng hợp theo biểu mẫu báo cáo viên"
                workbook={dynamicFormAggregateWorkbookPreview.workbook}
                previewRect={dynamicFormAggregateWorkbookPreview.previewRect}
                spec={templateSpec}
              />
            )}

            <Stack spacing={0.75}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {dynamicFormResult.stackedTable
                  ? "Bảng gộp tổng hợp"
                  : "Bảng xem trước tổng hợp"}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.72 }}>
                {dynamicFormResult.stackedTable
                  ? `Bảng ${formatTableModeLabel(dynamicFormResult.meta.tableMode).toLowerCase()} được chuyển thành bảng 2 chiều có ${getStackIdentityAxisLowerLabel(
                      normalizeTableMode(dynamicFormResult.meta.tableMode),
                    )}. Nếu chọn khoảng kỳ, hệ thống cộng các ô số và đếm các ô không phải số có dữ liệu trước khi hiển thị.`
                  : "Đây là kết quả xem trước từ báo cáo đã duyệt và bộ lọc hiện tại; chưa ghi vào báo cáo nào."}
              </Typography>
            </Stack>

            {dynamicFormResult.stackedTable && (
              <StackedAggregatePreview
                table={dynamicFormResult.stackedTable}
                metricLabelByKey={metricLabelByKey}
              />
            )}

            {!dynamicFormResult.stackedTable && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {isSummaryTemplateResult && <TableCell align="right">{uiText(UITextKey.TextOutputRow)}</TableCell>}
                    {isSummaryTemplateResult && <TableCell>{uiText(UITextKey.TextGroup)}</TableCell>}
                    {isSummaryTemplateResult && <TableCell>{uiText(UITextKey.TextUnit)}</TableCell>}
                    <TableCell>Chỉ tiêu</TableCell>
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
                      <TableCell>{formatDynamicFormMetricLabel(row)}</TableCell>
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
            )}

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
              {" Bản xem trước ghi dữ liệu tổng hợp trực tiếp vào biểu mẫu."}
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

            <AggregateSourceTable rows={result.sources ?? []} onPreviewReport={setPreviewReportId} />
          </>
        )}
          </>
        )}
      </Stack>

      <Dialog
        open={Boolean(previewReportId)}
        onClose={() => setPreviewReportId("")}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle>Xem trước báo cáo</DialogTitle>
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
        open={stackIdentityPreviewOpen}
        onClose={() => setStackIdentityPreviewOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          Xem trước chỉ tiêu và {getStackIdentityAxisLowerLabel(resolvedSupportedDynamicFormExcelBlock?.tableMode)}
        </DialogTitle>
        <DialogContent dividers>
          {resolvedSupportedDynamicFormExcelBlock ? (
            <StackIdentityPreviewDialogContent
              block={previewDynamicFormExcelBlock ?? resolvedSupportedDynamicFormExcelBlock}
              identityColumns={stackIdentityColumns}
              workbook={templateWorkbook}
              templateRect={templateRect}
              templateSpec={templateSpec}
              previewHighlights={dynamicFormPreviewHighlights}
              loading={templateQuery.isFetching}
              periodScopeMode={filter.periodScopeMode}
              selectedTemplateLabel={selectedTemplateLabel}
            />
          ) : (
            <Alert severity="warning">
              Chưa xác định được biểu mẫu/vùng của biểu mẫu động để xem trước định danh.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStackIdentityPreviewOpen(false)}>Đóng</Button>
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
                  Kết quả đang bị giới hạn bởi số dòng quét tối đa. Hãy thu hẹp kỳ hoặc bộ lọc trạng thái để đọc đầy đủ hơn.
                </Alert>
              )}

              {(fieldTextConcatResult.fieldType === "stringList" || fieldTextConcatResult.fieldType === "longText") && (
                <TextField
                  value={fieldTextConcatResult.concatenatedText}
                  fullWidth
                  multiline
                  minRows={5}
                  InputProps={{ readOnly: true }}
                />
              )}

              <Stack spacing={1}>
                {fieldTextConcatResult.rows.map((row, index) => {
                  const title =
                    row.assigneeFullName ||
                    row.assigneeUsername ||
                    row.assigneeUserId ||
                    `Nguồn ${index + 1}`;
                  const unit = row.unitLabel || row.unitId || "-";
                  const assignment = row.assignmentName || row.assignmentId;
                  const assignmentCode = row.assignmentCode;
                  const items = row.items ?? [];

                  return (
                    <Accordion key={row.workAssignmentReportId} defaultExpanded={index < 3} disableGutters>
                      <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography fontWeight={700}>{title}</Typography>
                          <Chip size="small" variant="outlined" label={unit} />
                          <Chip size="small" variant="outlined" label={formatDayKeyLabel(row.periodKey)} />
                          {items.length > 0 && (
                            <Chip size="small" color="primary" variant="outlined" label={`${items.length} mục`} />
                          )}
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip size="small" label={assignment} />
                            {assignmentCode ? (
                              <Chip size="small" variant="outlined" label={assignmentCode} />
                            ) : null}
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`${row.charCount}${row.rowTruncated ? "+" : ""} ký tự`}
                            />
                          </Stack>

                          {items.length > 0 ? (
                            <Stack spacing={0.75}>
                              {items.map((item) => (
                                <Paper key={`${row.workAssignmentReportId}_${item.value}`} variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
                                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <Typography variant="body2" fontWeight={700}>
                                      {item.label || item.value}
                                    </Typography>
                                    <Chip size="small" variant="outlined" label={item.value} />
                                  </Stack>
                                </Paper>
                              ))}
                            </Stack>
                          ) : (
                            <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1 }}>
                              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                {row.text}
                              </Typography>
                            </Paper>
                          )}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
                {fieldTextConcatResult.rows.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Không có dòng dữ liệu phù hợp.
                  </Typography>
                )}
              </Stack>
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
