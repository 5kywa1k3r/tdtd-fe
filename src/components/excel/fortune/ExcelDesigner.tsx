import { type ChangeEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FullscreenOutlinedIcon from "@mui/icons-material/FullscreenOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";

import type {
  DataTypeOverride,
  DynamicExcelDataType,
  DynamicExcelValueSource,
  HeaderKind,
  HeaderSpecialRange,
  HeaderSpecialRole,
  HeaderSpec,
} from "./types";
import type { HeaderMeta } from "../HeaderInput";
import { SaveResultDialog } from "../SaveResultDialog";
import type { DynamicExcelTableMode } from "../../../api/dynamicExcelApi";

import { normalizeToSingleSheet } from "./normalizeWorkbook";
import { computeRegions, getAnchors, getTableRect, type Rect as RegionRect } from "./regions";

import { extractMasterCells, extractNumericValues1D } from "./fortuneAdapter";
import { DESIGNER_LIMITS, validateHeader, validateNoMergeInDataRange, validateSpecLimits } from "./validate";
import {
  buildInputCellRefs,
  createInputDataCellChecker,
  findSpecialRangeAt,
  getSpecialRanges,
  removeSpecialRange,
  SPECIAL_RANGE_COLORS,
  upsertSpecialRange,
  validateSpecialRanges,
} from "./specialRanges";

import {
  DATA_TYPE_OPTIONS,
  DATA_TYPE_COLORS,
  dataTypeLabel,
  DEFAULT_DYNAMIC_EXCEL_DATA_TYPE,
  formatColumnRef,
  formatRectRef,
  formatRowRef,
  getCellDataType,
  getCellStringListOptions,
  getCellValueSource,
  getColumnDataType,
  getColumnStringListOptions,
  getColumnValueSource,
  getDefaultEnumOptions,
  getDefaultDataType,
  getMatrixDataTypeRanges,
  getRowDataType,
  getRowStringListOptions,
  getRowValueSource,
  isDynamicExcelEnumDataType,
  normalizeDataType,
  normalizeDataTypeOverrides,
  normalizeStringListOptions,
  normalizeSpecDataTypeMetadata,
  setColumnDataType,
  setColumnStringListOptions,
  setMatrixRangeStringListOptions,
  setMatrixRangeDataType,
  setRowDataType,
  setRowStringListOptions,
} from "./dataTypes";
import {
  MARK_COLORS,
  markRect,
  stripMarksForSave,
  type Backup,
  type Rect as MarkRect,
} from "./designerMarking";
import { useQuickCreateLabelEnumCatalogMutation } from "../../../api/labelEnumCatalogApi";
import { LabelEnumCatalogSelect } from "../../labels/labelUi";
import { getApiErrorMessage } from "../../../utils/apiError";
import LazyFortuneWorkbook from "./LazyFortuneWorkbook";
import { useFortuneWheelScrollFix } from "./wheelScroll";
import { GuideLegend, GuideLegendChip, GuideToggleButton } from "./PreviewGuideControls";
import {
  importXlsxForDynamicExcelSpec,
  previewXlsxForDynamicExcelImport,
  type DynamicExcelImportPreview,
  type ExcelImportSourceRange,
} from "./excelImport";
import {
  normalizeWorkbookNumberInputCells,
  recalculateSimpleNumericFormulas,
  stripEmptyNumberInputCellMetadata,
} from "./workbookRuntime";

export type ExcelDesignerMeta = HeaderMeta;

function rectRows(R: RegionRect) {
  return R.r1 - R.r0 + 1;
}

function rectCols(R: RegionRect) {
  return R.c1 - R.c0 + 1;
}

function createEmptyWorkbook(rows: number, cols: number) {
  return normalizeToSingleSheet([], rows, cols);
}

const DEFAULT_SPEC: HeaderSpec = {
  kind: "TOP",
  topRows: 1,
  topCols: 6,
  dataRows: 10,
  defaultDataType: DEFAULT_DYNAMIC_EXCEL_DATA_TYPE,
  dataTypeOverrides: [],
};

const MARKED_BACKGROUNDS = new Set<string>([
  MARK_COLORS.HEADER_BG,
  MARK_COLORS.DATA_BG,
  MARK_COLORS.ACTIVE_BG,
  MARK_COLORS.RANGE_BG,
  ...Object.values(SPECIAL_RANGE_COLORS),
]);

const SAVE_TIMEOUT_MS = 30_000;
const INLINE_WORKBOOK_ZOOM_RATIO = 0.5;
const FULLSCREEN_WORKBOOK_ZOOM_RATIO = 1;
const SAVE_FAILED_MESSAGE = "Không lưu được bảng biểu động.";
const SAVE_TIMEOUT_MESSAGE = "Quá thời gian chờ phản hồi từ máy chủ. Vui lòng kiểm tra kết nối và thử lưu lại.";
const SEMANTIC_EDITABLE_SPECIAL_ROLES = new Set<HeaderSpecialRole>();
const DANGEROUS_TEMPLATE_TEXT_RE =
  /<\s*(script|iframe|object|embed|svg|img|style|link|meta)\b|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on[a-z]+\s*=/i;

function cloneWorkbookData(workbook: any[]) {
  return JSON.parse(JSON.stringify(Array.isArray(workbook) ? workbook : []));
}

function withWorkbookZoom(workbook: any[], zoomRatio: number) {
  return (Array.isArray(workbook) ? workbook : []).map((sheet) =>
    sheet && typeof sheet === "object"
      ? { ...sheet, zoomRatio }
      : sheet,
  );
}

function stripWorkbookZoom(workbook: any[]) {
  return (Array.isArray(workbook) ? workbook : []).map((sheet) => {
    if (!sheet || typeof sheet !== "object") return sheet;
    const { zoomRatio: _zoomRatio, ...rest } = sheet as any;
    return rest;
  });
}

function withSaveTimeout<T>(operation: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(SAVE_TIMEOUT_MESSAGE));
    }, SAVE_TIMEOUT_MS);

    operation.then(
      (result) => {
        window.clearTimeout(timeout);
        resolve(result);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function getSafeSaveErrorMessage(error: unknown): string {
  try {
    const message = getApiErrorMessage(error);
    if (message) return message;
  } catch {
    // Preserve the save dialog even if the error normalizer receives an unexpected payload.
  }

  if (error instanceof Error && error.message) return error.message;
  return SAVE_FAILED_MESSAGE;
}

function stableStringify(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function semanticLockedSpecKey(input?: HeaderSpec): string {
  const normalized = normalizeSpecDataTypeMetadata(normalizeDesignerSpec(input));
  const { specialRanges: _specialRanges, ...locked } = normalized as HeaderSpec & Record<string, unknown>;
  return stableStringify(locked);
}

function semanticLockedSpecialRangesKey(input?: HeaderSpec): string {
  return stableStringify(
    getSpecialRanges(normalizeDesignerSpec(input))
      .filter((range) => !SEMANTIC_EDITABLE_SPECIAL_ROLES.has(range.role))
      .map((range) => ({
        role: range.role === "STYLE" ? "BLANK" : range.role,
        r0: range.r0,
        c0: range.c0,
        r1: range.r1,
        c1: range.c1,
      }))
      .sort((a, b) => a.r0 - b.r0 || a.c0 - b.c0 || a.r1 - b.r1 || a.c1 - b.c1 || a.role.localeCompare(b.role)),
  );
}

function validateSemanticEditSpec(baseline: HeaderSpec | undefined, next: HeaderSpec) {
  const issues: Array<{ code: string; message: string }> = [];

  if (semanticLockedSpecKey(baseline) !== semanticLockedSpecKey(next)) {
    issues.push({
      code: "SEMANTIC_EDIT_SCHEMA_LOCKED",
      message: "Chỉ được cập nhật tiêu đề, header và công thức. Cấu trúc bảng và kiểu dữ liệu đang được khóa.",
    });
  }

  if (semanticLockedSpecialRangesKey(baseline) !== semanticLockedSpecialRangesKey(next)) {
    issues.push({
      code: "SEMANTIC_EDIT_SPECIAL_RANGE_LOCKED",
      message: "Vùng bỏ trống/không nhập đang được khóa. Chỉ được thêm, sửa hoặc xóa vùng tiêu đề/công thức.",
    });
  }

  return issues;
}

function findUnsafeTemplateText(value: unknown, path = "$", depth = 0): string | null {
  if (depth > 80) return `${path}: JSON quá sâu`;
  if (typeof value === "string") return DANGEROUS_TEMPLATE_TEXT_RE.test(value) ? path : null;
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const hit = findUnsafeTemplateText(value[index], `${path}[${index}]`, depth + 1);
      if (hit) return hit;
    }
    return null;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype" || DANGEROUS_TEMPLATE_TEXT_RE.test(key)) {
      return `${path}.${key}`;
    }

    const hit = findUnsafeTemplateText(nested, `${path}.${key}`, depth + 1);
    if (hit) return hit;
  }

  return null;
}

export type ExcelDesignerMode = "create" | "view" | "edit";

type ActiveTarget =
  | { kind: "HEADER" }
  | { kind: "DATA" }
  | { kind: "COLUMN"; index: number }
  | { kind: "ROW"; index: number }
  | { kind: "RANGE"; rect: RegionRect; id?: string }
  | { kind: "SPECIAL"; rect: RegionRect; role: HeaderSpecialRole };

type ExcelDesignerProps = {
  mode?: ExcelDesignerMode;
  meta?: ExcelDesignerMeta;
  onMetaChange?: (meta: ExcelDesignerMeta) => void;
  initialTableMode?: DynamicExcelTableMode;
  initialSpec?: HeaderSpec;
  initialWorkbookData?: any[];
  readOnly?: boolean;
  onBack?: () => void;
  onSaved?: (payload: {
    code: string;
    name: string;
    tableMode: DynamicExcelTableMode;
    contractVersion: number;
    spec: HeaderSpec;
    rawWorkbookData: any[];
    dataRect: { r0: number; c0: number; r1: number; c1: number };
    W: number;
    H: number;
    values1D: (number | null)[];
    masterCells: any[];
  }) => void | Promise<void>;
};

type PendingExcelImport = {
  file: File;
  preview: DynamicExcelImportPreview | null;
};

function hasMeaningfulCellValue(cell: any): boolean {
  if (!cell || typeof cell !== "object") return false;

  const v = cell.v;
  const m = cell.m;
  const f = cell.f;

  if (typeof v === "number" && Number.isFinite(v)) return true;
  if (typeof v === "string" && v.trim().length > 0) return true;

  if (typeof m === "string" && m.trim().length > 0) return true;
  if (typeof f === "string" && f.trim().length > 0) return true;

  return false;
}

function buildCelldataMap(sheet: any) {
  const map = new Map<string, any>();
  const cd = Array.isArray(sheet?.celldata) ? sheet.celldata : [];
  for (const it of cd) {
    const r = Number(it?.r);
    const c = Number(it?.c);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    if (it?.v && typeof it.v === "object") map.set(`${r},${c}`, it.v);
  }
  return map;
}

function getCellAny(sheet: any, r: number, c: number, cdMap: Map<string, any>) {
  const row = Array.isArray(sheet?.data) ? sheet.data[r] : null;
  const d = Array.isArray(row) ? row[c] : null;
  if (d && typeof d === "object") return d;
  return cdMap.get(`${r},${c}`) ?? null;
}

function validateNoDataInRect(
  sheet: any,
  rect: { r0: number; c0: number; r1: number; c1: number },
  spec: HeaderSpec,
) {
  const cdMap = buildCelldataMap(sheet);
  const isInputCell = createInputDataCellChecker(rect, spec);

  for (let r = rect.r0; r <= rect.r1; r++) {
    for (let c = rect.c0; c <= rect.c1; c++) {
      if (!isInputCell(r, c)) continue;
      const cell = getCellAny(sheet, r, c, cdMap);
      if (hasMeaningfulCellValue(cell)) {
        return [
          {
            code: "DATA_TRONG_VUNG_DU_LIEU",
            message: `Biểu mẫu không được có dữ liệu trong vùng dữ liệu (phát hiện tại hàng ${r + 1}, cột ${c + 1}).`,
            at: { r, c },
          },
        ];
      }
    }
  }
  return [];
}

function toMarkRect(r: { r0: number; c0: number; r1: number; c1: number }): MarkRect {
  return { r0: r.r0, c0: r.c0, r1: r.r1, c1: r.c1 };
}

function copyText(text: string) {
  try {
    void navigator.clipboard?.writeText(text);
  } catch {
    // ignore
  }
}

function clampCount(v: any, max = DESIGNER_LIMITS.MAX_SHEET_CELLS) {
  return Math.max(1, Math.min(max, Math.floor(Number(v || 1))));
}

function normalizeDesignerSpec(input?: HeaderSpec): HeaderSpec {
  const kind = input?.kind;
  if (kind !== "TOP" && kind !== "LEFT" && kind !== "MATRIX") {
    return normalizeSpecDataTypeMetadata(DEFAULT_SPEC);
  }
  return normalizeSpecDataTypeMetadata(input!);
}

function specLayoutKey(input: HeaderSpec) {
  if (input.kind === "TOP") {
    return `TOP:${input.topRows}:${input.topCols}:${input.dataRows}`;
  }
  if (input.kind === "LEFT") {
    return `LEFT:${input.leftRows}:${input.leftCols}:${input.dataCols}`;
  }
  return `MATRIX:${input.topRows}:${input.topCols}:${input.leftRows}:${input.leftCols}`;
}

function createSpecForKind(kind: HeaderKind, previous: HeaderSpec): HeaderSpec {
  const base = {
    defaultDataType: getDefaultDataType(previous),
    dataTypeOverrides: [],
  };
  if (kind === "TOP") return { kind, topRows: 1, topCols: 6, dataRows: 10, ...base };
  if (kind === "LEFT") return { kind, leftRows: 10, leftCols: 1, dataCols: 6, ...base };
  return { kind, topRows: 1, topCols: 4, leftRows: 5, leftCols: 1, ...base };
}

function containsCell(rect: RegionRect, r: number, c: number) {
  return r >= rect.r0 && r <= rect.r1 && c >= rect.c0 && c <= rect.c1;
}

function intersectRect<T extends RegionRect>(rect: T, bounds: RegionRect): T | null {
  const next = {
    ...rect,
    r0: Math.max(rect.r0, bounds.r0),
    c0: Math.max(rect.c0, bounds.c0),
    r1: Math.min(rect.r1, bounds.r1),
    c1: Math.min(rect.c1, bounds.c1),
  };
  if (next.r1 < next.r0 || next.c1 < next.c0) return null;
  return next;
}

function pruneSpecForLayoutChange(input: HeaderSpec): HeaderSpec {
  const normalized = normalizeSpecDataTypeMetadata(input);
  const dataRect = computeRegions(normalized, getTableRect(normalized)).dataRect;

  const dataTypeOverrides = normalizeDataTypeOverrides(normalized.dataTypeOverrides)
    .map((override): DataTypeOverride | null => {
      if (override.scope === "COLUMN") {
        return containsCell(dataRect, dataRect.r0, override.index) ? override : null;
      }
      if (override.scope === "ROW") {
        return containsCell(dataRect, override.index, dataRect.c0) ? override : null;
      }

      const clipped = intersectRect(override, dataRect);
      return clipped ? { ...override, ...clipped } : null;
    })
    .filter((override): override is DataTypeOverride => Boolean(override));

  const specialRanges = getSpecialRanges(normalized)
    .map((range): HeaderSpecialRange | null => {
      const clipped = intersectRect(range, dataRect);
      if (!clipped) return null;
      return { ...range, ...clipped };
    })
    .filter((range): range is HeaderSpecialRange => Boolean(range));

  return normalizeSpecDataTypeMetadata({
    ...normalized,
    dataTypeOverrides,
    specialRanges,
  });
}

function defaultTableModeForKind(kind: HeaderKind): DynamicExcelTableMode {
  if (kind === "TOP") return "FIXED_GRID";
  if (kind === "LEFT") return "FIXED_GRID";
  return "FIXED_GRID";
}

function getAllowedTableModes(kind: HeaderKind): DynamicExcelTableMode[] {
  if (kind === "TOP") return ["FIXED_GRID", "APPEND_ROWS"];
  if (kind === "LEFT") return ["FIXED_GRID", "APPEND_COLUMNS"];
  return ["FIXED_GRID"];
}

function normalizeTableModeForKind(
  value: DynamicExcelTableMode | undefined,
  kind: HeaderKind,
): DynamicExcelTableMode {
  const allowed = getAllowedTableModes(kind);
  return value && allowed.includes(value) ? value : defaultTableModeForKind(kind);
}

function tableModeLabel(value: DynamicExcelTableMode) {
  if (value === "APPEND_ROWS") return "Gộp thêm dòng";
  if (value === "APPEND_COLUMNS") return "Gộp thêm cột";
  return "Lưới cố định";
}

function tableModeHelper(value: DynamicExcelTableMode) {
  if (value === "APPEND_ROWS") {
    return "Dữ liệu cấp con được nối thêm thành các dòng khi tổng hợp lên cấp cha.";
  }
  if (value === "APPEND_COLUMNS") {
    return "Dữ liệu cấp con được nối thêm thành các cột khi tổng hợp lên cấp cha.";
  }
  return "Dữ liệu giữ nguyên vị trí ô; chỉ tiêu thống kê được cấu hình trong biểu mẫu động.";
}

function headerKindLabel(value: HeaderKind) {
  if (value === "TOP") return "Bảng ngang";
  if (value === "LEFT") return "Bảng dọc";
  return "Bảng ma trận";
}

function formatCellRef(r: number, c: number) {
  return `${formatColumnRef(c)}${formatRowRef(r)}`;
}

function parseDataConfigCoordinateRange(
  topLeft: string,
  bottomRight: string,
  dataRect: RegionRect,
): { range: RegionRect | null; issue: string | null } {
  const hasTopLeft = topLeft.trim().length > 0;
  const hasBottomRight = bottomRight.trim().length > 0;
  if (!hasTopLeft || !hasBottomRight) {
    return { range: null, issue: "Nhập đủ ô trên trái và ô dưới phải, ví dụ A4 và N85." };
  }

  const start = parseCellRef(topLeft);
  const end = parseCellRef(bottomRight);
  if (!start || !end) {
    return { range: null, issue: "Tọa độ cần dùng dạng ô Excel, ví dụ A4 hoặc N85." };
  }

  const range: RegionRect = {
    r0: Math.min(start.r, end.r),
    c0: Math.min(start.c, end.c),
    r1: Math.max(start.r, end.r),
    c1: Math.max(start.c, end.c),
  };

  if (!rectInside(dataRect, range)) {
    return {
      range: null,
      issue: `Vùng chọn phải nằm trong vùng dữ liệu ${formatRectRef(dataRect)}.`,
    };
  }

  return { range, issue: null };
}

function parseCellRef(value: string): { r: number; c: number } | null {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  const match = /^([A-Z]+)([1-9][0-9]*)$/.exec(normalized);
  if (!match) return null;

  let col = 0;
  for (const char of match[1]) {
    col = col * 26 + (char.charCodeAt(0) - 64);
  }

  const row = Number(match[2]);
  if (!Number.isFinite(row)) return null;
  return { r: row - 1, c: col - 1 };
}

function createImportSpecFromSourceRange(current: HeaderSpec, sourceRange: ExcelImportSourceRange): HeaderSpec {
  const rows = rectRows(sourceRange);
  const cols = rectCols(sourceRange);
  const base = {
    defaultDataType: getDefaultDataType(current),
    defaultOptions: normalizeStringListOptions((current as any).defaultOptions),
    dataTypeOverrides: [],
    specialRanges: [],
  };

  if (current.kind === "TOP") {
    return normalizeSpecDataTypeMetadata({
      kind: "TOP",
      topRows: current.topRows,
      topCols: cols,
      dataRows: Math.max(1, rows - current.topRows),
      ...base,
    });
  }

  if (current.kind === "LEFT") {
    return normalizeSpecDataTypeMetadata({
      kind: "LEFT",
      leftRows: rows,
      leftCols: current.leftCols,
      dataCols: Math.max(1, cols - current.leftCols),
      ...base,
    });
  }

  return normalizeSpecDataTypeMetadata({
    kind: "MATRIX",
    topRows: current.topRows,
    leftCols: current.leftCols,
    leftRows: Math.max(1, rows - current.topRows),
    topCols: Math.max(1, cols - current.leftCols),
    ...base,
  });
}

function getImportRangeIssue(spec: HeaderSpec, sourceRange: ExcelImportSourceRange, workbookData: any[]) {
  const rows = rectRows(sourceRange);
  const cols = rectCols(sourceRange);

  if (spec.kind === "TOP" && rows <= spec.topRows) {
    return `Vùng import phải có nhiều hơn ${spec.topRows} dòng để còn phần dữ liệu bên dưới tiêu đề.`;
  }
  if (spec.kind === "LEFT" && cols <= spec.leftCols) {
    return `Vùng import phải có nhiều hơn ${spec.leftCols} cột để còn phần dữ liệu bên phải tiêu đề.`;
  }
  if (spec.kind === "MATRIX") {
    if (rows <= spec.topRows) {
      return `Vùng import phải có nhiều hơn ${spec.topRows} dòng để còn phần dữ liệu bên dưới tiêu đề trên.`;
    }
    if (cols <= spec.leftCols) {
      return `Vùng import phải có nhiều hơn ${spec.leftCols} cột để còn phần dữ liệu bên phải tiêu đề trái.`;
    }
  }

  const mergeIssue = getPartialMergeSelectionIssue(workbookData, sourceRange);
  if (mergeIssue) return mergeIssue;

  return null;
}

function getPartialMergeSelectionIssue(workbookData: any[], sourceRange: ExcelImportSourceRange) {
  const sheet = Array.isArray(workbookData) ? workbookData[0] : null;
  const merge = sheet?.config?.merge;
  if (!merge || typeof merge !== "object") return null;

  for (const item of Object.values<any>(merge)) {
    const mergeRect = readPreviewMergeRect(item);
    if (!mergeRect || !rectsOverlapPreview(mergeRect, sourceRange)) continue;
    if (rectInside(sourceRange, mergeRect)) continue;
    return `Vùng import đang cắt ngang ô merge ${formatRectRef(mergeRect)}. Hãy lấy trọn ô merge hoặc bỏ vùng đó ra ngoài.`;
  }

  return null;
}

export default function ExcelDesigner(props: ExcelDesignerProps) {
  const {
    mode = "create",
    initialSpec,
    initialWorkbookData,
    readOnly,
    onBack,
    onSaved,
  } = props;

  const isView = mode === "view";
  const canEdit = !(readOnly ?? false) && !isView;
  const semanticEditOnly = mode === "edit";
  const sheetWheelRef = useFortuneWheelScrollFix<HTMLDivElement>();

  const [spec, setSpec] = useState<HeaderSpec>(() => normalizeDesignerSpec(initialSpec));
  const [activeTarget, setActiveTarget] = useState<ActiveTarget | null>({ kind: "DATA" });
  const [tableMode, setTableMode] = useState<DynamicExcelTableMode>(() =>
    normalizeTableModeForKind(props.initialTableMode, normalizeDesignerSpec(initialSpec).kind),
  );

  const [meta, setMeta] = useState<ExcelDesignerMeta>(() => ({
    code: props.meta?.code ?? "",
    name: props.meta?.name ?? "",
  }));

  useEffect(() => {
    setMeta({
      code: props.meta?.code ?? "",
      name: props.meta?.name ?? "",
    });
  }, [props.meta?.code, props.meta?.name]);

  const table = useMemo(() => getTableRect(spec), [spec]);
  const regions = useMemo(() => computeRegions(spec, table), [spec, table]);

  const visualBackupRef = useRef<Map<string, Backup>>(new Map());
  const sheetFullscreenSnapshotRef = useRef<any[] | null>(null);
  const sheetFullscreenGuideSnapshotRef = useRef<boolean | null>(null);
  const mountedRef = useRef(true);
  const [sheetGuideVisible, setSheetGuideVisible] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const normalizeAndMarkWorkbook = (
    raw: any[],
    nextSpec: HeaderSpec,
    _nextActive: ActiveTarget | null,
    showGuide = sheetGuideVisible,
  ) => {
    const nextTable = getTableRect(nextSpec);
    const rows = rectRows(nextTable);
    const cols = rectCols(nextTable);
    const nextRegions = computeRegions(nextSpec, nextTable);
    const normalized = stripWorkbookZoom(normalizeToSingleSheet(raw, rows, cols));
    normalizeWorkbookNumberInputCells(normalized, nextRegions.dataRect, nextSpec);
    recalculateSimpleNumericFormulas(normalized);
    const sheet = normalized[0];
    if (!sheet) return normalized;

    stripMarksForSave(sheet, visualBackupRef.current, MARKED_BACKGROUNDS);
    visualBackupRef.current.clear();

    if (!showGuide) return [{ ...sheet }];

    const headerRects = (nextRegions as any).headerRects?.length
      ? ((nextRegions as any).headerRects as RegionRect[])
      : [nextRegions.headerRect];

    for (const rect of headerRects) {
      markRect(sheet, toMarkRect(rect), MARK_COLORS.HEADER_BG, visualBackupRef.current);
    }
    markRect(sheet, toMarkRect(nextRegions.dataRect), MARK_COLORS.DATA_BG, visualBackupRef.current);
    for (const range of getSpecialRanges(nextSpec)) {
      markRect(sheet, toMarkRect(range), SPECIAL_RANGE_COLORS[range.role], visualBackupRef.current);
    }

    return [{ ...sheet }];
  };

  const getCleanWorkbook = (raw: any[], nextSpec: HeaderSpec) => {
    const nextTable = getTableRect(nextSpec);
    const nextRegions = computeRegions(nextSpec, nextTable);
    const normalized = stripWorkbookZoom(normalizeToSingleSheet(raw, rectRows(nextTable), rectCols(nextTable)));
    normalizeWorkbookNumberInputCells(normalized, nextRegions.dataRect, nextSpec);
    recalculateSimpleNumericFormulas(normalized);
    const sheet = normalized[0];
    if (sheet) {
      stripMarksForSave(sheet, visualBackupRef.current, MARKED_BACKGROUNDS);
    }
    return normalized;
  };

  const [workbookData, setWorkbookData] = useState<any[]>(() => {
    const nextSpec = normalizeDesignerSpec(initialSpec);
    const nextTable = getTableRect(nextSpec);
    const rows = rectRows(nextTable);
    const cols = rectCols(nextTable);
    const raw = initialWorkbookData?.length ? initialWorkbookData : createEmptyWorkbook(rows, cols);
    return normalizeAndMarkWorkbook(raw, nextSpec, { kind: "DATA" });
  });

  const workbookRef = useRef<any[]>(workbookData);
  const fortuneWorkbookRef = useRef<any>(null);
  useEffect(() => {
    workbookRef.current = workbookData;
  }, [workbookData]);

  const [workbookKey, setWorkbookKey] = useState(0);
  const [shouldRenderWorkbook, setShouldRenderWorkbook] = useState(false);

  useEffect(() => {
    setShouldRenderWorkbook(false);
    const id = window.requestAnimationFrame(() => {
      setShouldRenderWorkbook(true);
    });

    return () => window.cancelAnimationFrame(id);
  }, [workbookKey]);

  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgOk, setDlgOk] = useState(false);
  const [dlgIssues, setDlgIssues] = useState<any[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [sheetFullscreenOpen, setSheetFullscreenOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importReadRunRef = useRef(0);
  const [previewingExcel, setPreviewingExcel] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingExcelImport, setPendingExcelImport] = useState<PendingExcelImport | null>(null);
  const [importSourceRange, setImportSourceRange] = useState<ExcelImportSourceRange | null>(null);
  const [importSpecDraft, setImportSpecDraft] = useState<HeaderSpec | null>(null);

  useEffect(() => {
    if (!sheetFullscreenOpen) return undefined;

    const notifyResize = () => window.dispatchEvent(new Event("resize"));
    const frame = window.requestAnimationFrame(notifyResize);
    const timeout = window.setTimeout(notifyResize, 80);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [sheetFullscreenOpen]);

  useEffect(() => {
    const nextSpec = normalizeDesignerSpec(initialSpec);
    setSpec(nextSpec);
    setTableMode(normalizeTableModeForKind(props.initialTableMode, nextSpec.kind));
    setActiveTarget({ kind: "DATA" });

    const nextTable = getTableRect(nextSpec);
    const rows = rectRows(nextTable);
    const cols = rectCols(nextTable);
    const raw = initialWorkbookData?.length ? initialWorkbookData : createEmptyWorkbook(rows, cols);
    const next = normalizeAndMarkWorkbook(raw, nextSpec, { kind: "DATA" });

    setWorkbookData(next);
    workbookRef.current = next;
    setWorkbookKey((k) => k + 1);
  }, [initialSpec, initialWorkbookData, mode, props.initialTableMode]);

  const getLiveWorkbookData = () => {
    try {
      const live = fortuneWorkbookRef.current?.getAllSheets?.();
      if (Array.isArray(live) && live.length > 0) return cloneWorkbookData(stripWorkbookZoom(live));
    } catch {
      // Fortune may be between mounts while switching inline/fullscreen surfaces.
    }

    return workbookRef.current?.length ? workbookRef.current : workbookData;
  };

  const settings = useMemo(() => {
    const zoomRatio = sheetFullscreenOpen ? FULLSCREEN_WORKBOOK_ZOOM_RATIO : INLINE_WORKBOOK_ZOOM_RATIO;
    return {
      data: withWorkbookZoom(workbookData, zoomRatio),
      row: workbookData?.[0]?.row,
      column: workbookData?.[0]?.column,
      allowEdit: canEdit,
      showSheetTabs: false,
      onChange: (data: any) => {
        if (!canEdit) return;
        if (Array.isArray(data)) {
          const base = cloneWorkbookData(stripWorkbookZoom(data));
          const next = cloneWorkbookData(base);
          normalizeWorkbookNumberInputCells(next, regions.dataRect, spec);
          recalculateSimpleNumericFormulas(next);
          workbookRef.current = next;
        }
      },
    };
  }, [workbookData, canEdit, regions.dataRect, sheetFullscreenOpen, spec]);

  const getNormalizedLatest = (s: HeaderSpec) => {
    const nextTable = getTableRect(s);
    const rows = rectRows(nextTable);
    const cols = rectCols(nextTable);
    const nextRegions = computeRegions(s, nextTable);
    const raw = getLiveWorkbookData();
    const normalized = stripWorkbookZoom(normalizeToSingleSheet(raw, rows, cols));
    normalizeWorkbookNumberInputCells(normalized, nextRegions.dataRect, s);
    recalculateSimpleNumericFormulas(normalized);
    const sheet = normalized[0];
    return { table: nextTable, rows, cols, normalized, sheet };
  };

  const handleMetaChange = (patch: Partial<ExcelDesignerMeta>) => {
    const next = { ...meta, ...patch };
    setMeta(next);
    props.onMetaChange?.(next);
  };

  const setNextSpec = (nextSpec: HeaderSpec, nextActive: ActiveTarget | null = activeTarget) => {
    if (!canEdit) return;

    const normalizedCandidate = normalizeSpecDataTypeMetadata(nextSpec);
    const layoutChanged = specLayoutKey(spec) !== specLayoutKey(normalizedCandidate);
    const normalizedSpec = layoutChanged
      ? pruneSpecForLayoutChange(normalizedCandidate)
      : normalizedCandidate;
    const v = validateSpecLimits(normalizedSpec);
    if (!v.ok) {
      setDlgOk(false);
      setDlgIssues(v.issues);
      setDlgOpen(true);
      return;
    }

    setSpec(normalizedSpec);
    setTableMode((current) => normalizeTableModeForKind(current, normalizedSpec.kind));
    setActiveTarget(nextActive);

    if (layoutChanged) {
      const raw = getLiveWorkbookData();
      const nextWorkbook = normalizeAndMarkWorkbook(raw, normalizedSpec, nextActive);
      setWorkbookData(nextWorkbook);
      workbookRef.current = nextWorkbook;
      setWorkbookKey((k) => k + 1);
    }
  };

  const refresh = () => {
    if (!canEdit) return;
    importReadRunRef.current += 1;
    const next = normalizeAndMarkWorkbook(createEmptyWorkbook(rectRows(table), rectCols(table)), spec, activeTarget);
    setWorkbookData(next);
    workbookRef.current = next;
    setWorkbookKey((k) => k + 1);
    setImportNotice(null);
    setImportError(null);
    setPendingExcelImport(null);
    setImportSourceRange(null);
    setImportSpecDraft(null);
    setPreviewingExcel(false);
  };

  const handleExcelImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || mode !== "create" || !canEdit || previewingExcel || importingExcel) return;

    const runId = importReadRunRef.current + 1;
    importReadRunRef.current = runId;
    setPreviewingExcel(true);
    setImportError(null);
    setImportNotice(null);
    setPendingExcelImport({ file, preview: null });
    setImportSourceRange(null);
    setImportSpecDraft(null);
    try {
      const preview = await previewXlsxForDynamicExcelImport(file);
      if (!mountedRef.current || importReadRunRef.current !== runId) return;
      setPendingExcelImport({ file, preview });
      setImportSourceRange(preview.summary.detectedSourceRange);
      setImportSpecDraft(normalizeSpecDataTypeMetadata(spec));
    } catch (error) {
      if (!mountedRef.current || importReadRunRef.current !== runId) return;
      console.error("[DynamicExcel] import xlsx failed", error);
      setImportError(getSafeSaveErrorMessage(error));
    } finally {
      if (mountedRef.current && importReadRunRef.current === runId) setPreviewingExcel(false);
    }
  };

  const closeImportPreview = () => {
    if (importingExcel) return;
    importReadRunRef.current += 1;
    setPreviewingExcel(false);
    setPendingExcelImport(null);
    setImportSourceRange(null);
    setImportSpecDraft(null);
  };

  const confirmExcelImportRange = async () => {
    if (!pendingExcelImport?.preview || !importSourceRange || mode !== "create" || !canEdit || previewingExcel || importingExcel) return;

    const effectiveSpec = importSpecDraft ?? spec;
    const rangeIssue = getImportRangeIssue(effectiveSpec, importSourceRange, pendingExcelImport.preview.workbookData);
    if (rangeIssue) {
      setImportError(rangeIssue);
      return;
    }

    const nextSpecCandidate = createImportSpecFromSourceRange(effectiveSpec, importSourceRange);
    const limitResult = validateSpecLimits(nextSpecCandidate);
    if (!limitResult.ok) {
      setDlgOk(false);
      setDlgIssues(limitResult.issues);
      setDlgOpen(true);
      return;
    }

    setImportingExcel(true);
    setImportError(null);
    setImportNotice(null);
    try {
      const imported = await importXlsxForDynamicExcelSpec(pendingExcelImport.file, nextSpecCandidate, {
        sourceRange: importSourceRange,
      });
      const nextSpec = normalizeSpecDataTypeMetadata(imported.spec);
      const nextLimitResult = validateSpecLimits(nextSpec);
      if (!nextLimitResult.ok) {
        setDlgOk(false);
        setDlgIssues(nextLimitResult.issues);
        setDlgOpen(true);
        return;
      }
      const nextSpecialIssues = validateSpecialRanges(nextSpec, nextLimitResult.dataRect);
      if (nextSpecialIssues.length) {
        setDlgOk(false);
        setDlgIssues(nextSpecialIssues);
        setDlgOpen(true);
        return;
      }

      const nextWorkbook = normalizeAndMarkWorkbook(imported.workbookData, nextSpec, { kind: "DATA" });
      setSpec(nextSpec);
      setTableMode((current) => normalizeTableModeForKind(current, nextSpec.kind));
      setActiveTarget({ kind: "DATA" });
      setWorkbookData(nextWorkbook);
      workbookRef.current = nextWorkbook;
      setWorkbookKey((k) => k + 1);
      setPendingExcelImport(null);
      setImportSourceRange(null);
      setImportSpecDraft(null);

      if (!(meta.name ?? "").trim()) {
        handleMetaChange({ name: pendingExcelImport.file.name.replace(/\.xlsx$/i, "") });
      }

      const ignoredRows = Math.max(0, imported.summary.sourceRows - imported.summary.rows);
      const ignoredCols = Math.max(0, imported.summary.sourceCols - imported.summary.cols);
      const ignoredText = ignoredRows || ignoredCols
        ? ` Phần ngoài vùng import chỉ bị bỏ qua khỏi template (${ignoredRows} dòng, ${ignoredCols} cột).`
        : "";
      setImportNotice(
        `Đã nhập sheet "${imported.summary.sheetName}" từ vùng ${formatRectRef(imported.summary.sourceRange)} theo kích thước ${imported.summary.rows}x${imported.summary.cols}. Tự đánh dấu ${imported.summary.formulaCells} ô công thức, ${imported.summary.titleCells} ô tiêu đề và ${imported.summary.blankCells} ô không nhập.${ignoredText}`,
      );
    } catch (error) {
      console.error("[DynamicExcel] import xlsx failed", error);
      setImportError(getSafeSaveErrorMessage(error));
    } finally {
      if (mountedRef.current) setImportingExcel(false);
    }
  };

  const save = async () => {
    if (!canEdit || saving) return;

    const name = (meta.name ?? "").trim();
    if (!name) {
      setDlgOk(false);
      setDlgIssues([{ code: "EMPTY_NAME", message: "Tên bảng không được trống." }]);
      setDlgOpen(true);
      return;
    }

    const specToSave = normalizeSpecDataTypeMetadata(spec);
    const vlim = validateSpecLimits(specToSave);
    if (!vlim.ok) {
      setDlgOk(false);
      setDlgIssues(vlim.issues);
      setDlgOpen(true);
      return;
    }
    const specialIssues = validateSpecialRanges(specToSave, vlim.dataRect);
    if (specialIssues.length) {
      setDlgOk(false);
      setDlgIssues(specialIssues);
      setDlgOpen(true);
      return;
    }

    if (semanticEditOnly) {
      const semanticIssues = validateSemanticEditSpec(initialSpec, specToSave);
      if (semanticIssues.length) {
        setDlgOk(false);
        setDlgIssues(semanticIssues);
        setDlgOpen(true);
        return;
      }
    }

    const { normalized } = getNormalizedLatest(specToSave);
    const normalizedForSave = stripWorkbookZoom(normalizeToSingleSheet(normalized, rectRows(vlim.table), rectCols(vlim.table)));
    const sheetForSave = normalizedForSave[0];

    if (!sheetForSave) {
      setDlgOk(false);
      setDlgIssues([{ code: "NO_SHEET", message: "Không lấy được Sheet1." }]);
      setDlgOpen(true);
      return;
    }

    stripMarksForSave(sheetForSave, visualBackupRef.current, MARKED_BACKGROUNDS);

    const unsafeTextPath = findUnsafeTemplateText({
      name,
      spec: specToSave,
      workbook: normalizedForSave,
    });
    if (unsafeTextPath) {
      setDlgOk(false);
      setDlgIssues([{
        code: "TEMPLATE_TEXT_UNSAFE",
        message: `Nội dung template có chuỗi không an toàn tại ${unsafeTextPath}. Vui lòng bỏ script, javascript: hoặc thuộc tính on*.`,
      }]);
      setDlgOpen(true);
      return;
    }

    const { topAnchor, leftAnchor } = getAnchors(specToSave);
    const masterCells = extractMasterCells(sheetForSave);

    const vres = validateHeader({
      spec: specToSave,
      topAnchor,
      leftAnchor,
      sheetRows: rectRows(vlim.table),
      sheetCols: rectCols(vlim.table),
      masterCells,
    });

    if (!vres.ok) {
      setDlgOk(false);
      setDlgIssues(vres.issues);
      setDlgOpen(true);
      return;
    }

    const dataRect = vlim.dataRect;
    const dataIssues = validateNoDataInRect(sheetForSave, dataRect, specToSave);
    if (dataIssues.length) {
      setDlgOk(false);
      setDlgIssues(dataIssues);
      setDlgOpen(true);
      return;
    }

    const merge = sheetForSave?.config?.merge ?? {};
    const mergeIssues = validateNoMergeInDataRange(merge, dataRect, specToSave);
    if (mergeIssues.length) {
      setDlgOk(false);
      setDlgIssues(mergeIssues);
      setDlgOpen(true);
      return;
    }

    const values1D = extractNumericValues1D(sheetForSave, dataRect, specToSave);
    stripEmptyNumberInputCellMetadata(normalizedForSave, dataRect, specToSave);

    const payload = {
      code: meta.code,
      name,
      tableMode: normalizeTableModeForKind(tableMode, specToSave.kind),
      contractVersion: 1,
      spec: specToSave,
      rawWorkbookData: normalizedForSave,
      dataRect,
      W: dataRect.c1 - dataRect.c0 + 1,
      H: dataRect.r1 - dataRect.r0 + 1,
      values1D,
      masterCells,
    };

    setSaving(true);
    try {
      await withSaveTimeout(Promise.resolve(onSaved?.(payload)));
      if (mountedRef.current) {
        setDlgOk(true);
        setDlgIssues([]);
        setDlgOpen(true);
      }
    } catch (error) {
      console.error("[DynamicExcel] save failed", error);
      if (mountedRef.current) {
        setDlgOk(false);
        setDlgIssues([{ code: "SAVE_FAILED", message: getSafeSaveErrorMessage(error) }]);
        setDlgOpen(true);
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const headerRangeText = useMemo(() => {
    const headerRects = (regions as any).headerRects?.length
      ? ((regions as any).headerRects as RegionRect[])
      : [regions.headerRect];
    return headerRects.map(formatRectRef).join(", ");
  }, [regions]);

  const dataRangeText = formatRectRef(regions.dataRect);
  const inputCellCount = buildInputCellRefs(regions.dataRect, spec).length;
  const tableStatisticsDisabled = inputCellCount > DESIGNER_LIMITS.MAX_TABLE_STATISTIC_INPUT_CELLS;
  const guideSpecialCounts = useMemo(
    () =>
      getSpecialRanges(spec).reduce<Record<HeaderSpecialRole, number>>((acc, range) => {
        acc[range.role] = (acc[range.role] ?? 0) + 1;
        return acc;
      }, {} as Record<HeaderSpecialRole, number>),
    [spec],
  );
  const toggleSheetGuide = () => {
    const nextVisible = !sheetGuideVisible;
    setSheetGuideVisible(nextVisible);
    const nextWorkbook = normalizeAndMarkWorkbook(getLiveWorkbookData(), spec, activeTarget, nextVisible);
    setWorkbookData(nextWorkbook);
    workbookRef.current = nextWorkbook;
    setWorkbookKey((k) => k + 1);
  };
  const openSheetFullscreen = () => {
    const current = getLiveWorkbookData();
    const cleanCurrent = getCleanWorkbook(current, spec);
    const nextWorkbook = normalizeAndMarkWorkbook(cleanCurrent, spec, activeTarget, sheetGuideVisible);
    setWorkbookData(nextWorkbook);
    workbookRef.current = nextWorkbook;
    sheetFullscreenSnapshotRef.current = cloneWorkbookData(cleanCurrent);
    sheetFullscreenGuideSnapshotRef.current = sheetGuideVisible;
    setSheetFullscreenOpen(true);
    setWorkbookKey((k) => k + 1);
  };
  const applySheetFullscreenChanges = () => {
    const current = getLiveWorkbookData();
    const nextWorkbook = normalizeAndMarkWorkbook(current, spec, activeTarget, sheetGuideVisible);
    setWorkbookData(nextWorkbook);
    workbookRef.current = nextWorkbook;
    sheetFullscreenSnapshotRef.current = null;
    sheetFullscreenGuideSnapshotRef.current = null;
    setSheetFullscreenOpen(false);
    setWorkbookKey((k) => k + 1);
  };
  const discardSheetFullscreenChanges = () => {
    const snapshot = sheetFullscreenSnapshotRef.current;
    const guideVisible = sheetFullscreenGuideSnapshotRef.current ?? sheetGuideVisible;
    if (snapshot) {
      const restored = normalizeAndMarkWorkbook(snapshot, spec, activeTarget, guideVisible);
      setWorkbookData(restored);
      workbookRef.current = restored;
    }
    setSheetGuideVisible(guideVisible);
    sheetFullscreenSnapshotRef.current = null;
    sheetFullscreenGuideSnapshotRef.current = null;
    setSheetFullscreenOpen(false);
    setWorkbookKey((k) => k + 1);
  };
  const renderSheetSurface = (fullscreen = false) => (
    <Box
      ref={sheetWheelRef}
      className="tdtdSheet"
      sx={{
        flex: fullscreen ? "1 1 auto" : 1,
        width: "100%",
        height: fullscreen ? "100%" : undefined,
        minHeight: 0,
        border: fullscreen ? 0 : "1px solid rgba(255,255,255,0.12)",
        borderRadius: fullscreen ? 0 : 1,
        overflow: "hidden",
        "& .fortune-sheettab-button": { display: "none !important" },
        "& .fortune-sheettab-container-c": { display: "none !important" },
        "& .fortune-zoom-container": { display: "none !important" },
        "& #luckysheet-bottom-add-row, & #luckysheet-bottom-add-row-input, & #luckysheet-bottom-return-top": {
          display: "none !important",
        },
      }}
    >
      {shouldRenderWorkbook ? <LazyFortuneWorkbook ref={fortuneWorkbookRef} key={workbookKey} {...settings} /> : null}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, height: "100%" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        spacing={1}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Tooltip title="Quay lại">
            <IconButton onClick={onBack}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={850} noWrap>
              {isView ? "Xem bảng biểu động" : mode === "edit" ? "Cấu hình bảng biểu động" : "Tạo bảng biểu động"}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              Bản xem trước xác định vùng tiêu đề và vùng dữ liệu ngay trên bảng.
            </Typography>
          </Box>
        </Stack>

        {!isView && (
          <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
            {!semanticEditOnly && (
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh} disabled={!canEdit}>
                Làm mới bảng
              </Button>
            )}
            {mode === "create" && (
              <>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  hidden
                  onChange={handleExcelImport}
                />
                <Tooltip title="Nhập Excel và chọn vùng bảng từ preview">
                  <span>
                    <Button
                      variant="outlined"
                      startIcon={<UploadFileOutlinedIcon />}
                      onClick={() => importInputRef.current?.click()}
                      disabled={!canEdit || previewingExcel || importingExcel}
                    >
                      {previewingExcel ? "Đang đọc..." : importingExcel ? "Đang nhập..." : "Nhập Excel"}
                    </Button>
                  </span>
                </Tooltip>
              </>
            )}
            <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={save} disabled={!canEdit || saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </Stack>
        )}
      </Stack>

      {semanticEditOnly && (
        <Alert severity="info" sx={{ py: 0.75 }}>
          Chế độ sửa chỉ cập nhật tên bảng và nội dung/style trên template hiện có. Cấu trúc bảng, vùng dữ liệu, kiểu dữ liệu và vùng đặc biệt đang được khóa.
        </Alert>
      )}

      <Card variant="outlined" sx={{ flex: 1, minHeight: 620, display: "flex", flexDirection: "column" }}>
        <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
          <ExcelConfigPanel
            spec={spec}
            meta={meta}
            tableMode={tableMode}
            disabled={!canEdit}
            showTableConfig={mode === "create"}
            onMetaChange={handleMetaChange}
            onTableModeChange={setTableMode}
            onSpecChange={setNextSpec}
            onActiveTargetChange={setActiveTarget}
          />

          {importNotice && (
            <Alert severity="success" sx={{ py: 0.75 }}>
              {importNotice}
            </Alert>
          )}
          {importError && (
            <Alert severity="error" sx={{ py: 0.75 }}>
              {importError}
            </Alert>
          )}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
              <GuideLegend visible={sheetGuideVisible}>
                <GuideLegendChip label={`Tiêu đề: ${headerRangeText}`} color={MARK_COLORS.HEADER_BG} />
                <GuideLegendChip label={`Dữ liệu: ${dataRangeText}`} color={MARK_COLORS.DATA_BG} />
                {guideSpecialCounts.FORMULA ? (
                  <GuideLegendChip label={`Công thức ${guideSpecialCounts.FORMULA}`} color={SPECIAL_RANGE_COLORS.FORMULA} />
                ) : null}
                {(guideSpecialCounts.TITLE || guideSpecialCounts.HEADER) ? (
                  <GuideLegendChip
                    label={`Tiêu đề/text ${(guideSpecialCounts.TITLE ?? 0) + (guideSpecialCounts.HEADER ?? 0)}`}
                    color={SPECIAL_RANGE_COLORS.TITLE}
                  />
                ) : null}
                {(guideSpecialCounts.BLANK || guideSpecialCounts.STYLE) ? (
                  <GuideLegendChip
                    label={`Bỏ trống ${(guideSpecialCounts.BLANK ?? 0) + (guideSpecialCounts.STYLE ?? 0)}`}
                    color={SPECIAL_RANGE_COLORS.BLANK}
                  />
                ) : null}
              </GuideLegend>
              <Chip size="small" variant="outlined" label={`Loại bảng: ${headerKindLabel(spec.kind)}`} />
              <Chip size="small" variant="outlined" label={`Kiểu nhập/tổng hợp: ${tableModeLabel(tableMode)}`} />
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end" sx={{ flexShrink: 0 }}>
              <GuideToggleButton enabled={sheetGuideVisible} onToggle={toggleSheetGuide} />
              {!semanticEditOnly && (
                <Button
                  variant="outlined"
                  startIcon={<TuneOutlinedIcon />}
                  onClick={() => setConfigOpen(true)}
                >
                  {canEdit ? "Cấu hình kiểu dữ liệu" : "Xem kiểu dữ liệu"}
                </Button>
              )}
              <Tooltip title="Mở toàn màn hình">
                <IconButton size="small" onClick={openSheetFullscreen} aria-label="Mở toàn màn hình">
                  <FullscreenOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {tableStatisticsDisabled && (
            <Alert severity="warning" sx={{ py: 0.75 }}>
              Bảng có {inputCellCount} ô nhập, vượt ngưỡng {DESIGNER_LIMITS.MAX_TABLE_STATISTIC_INPUT_CELLS}. Hệ thống vẫn lưu dữ liệu nhưng không thống kê nền từng ô; thống kê cơ bản vẫn có thể tổng hợp trực tiếp nếu không vượt {DESIGNER_LIMITS.MAX_DIRECT_AGGREGATE_INPUT_CELLS} ô input.
            </Alert>
          )}

          {sheetFullscreenOpen ? (
            <Alert severity="info" sx={{ py: 0.75 }}>
              Bảng đang mở ở chế độ toàn màn hình.
            </Alert>
          ) : renderSheetSurface(false)}
        </CardContent>
      </Card>

      <Dialog
        fullScreen
        open={sheetFullscreenOpen}
        onClose={discardSheetFullscreenChanges}
        PaperProps={{
          sx: {
            m: 0,
            width: "100vw",
            maxWidth: "100vw",
            height: "100dvh",
            maxHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            borderRadius: 0,
          },
        }}
      >
        <DialogTitle component="div" sx={{ py: 1, pr: 1.25, flex: "0 0 auto" }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
                Bảng tính
              </Typography>
              <GuideToggleButton enabled={sheetGuideVisible} onToggle={toggleSheetGuide} />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {canEdit && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<SaveOutlinedIcon fontSize="small" />}
                  onClick={applySheetFullscreenChanges}
                >
                  Áp dụng thay đổi
                </Button>
              )}
              <Button size="small" variant="outlined" onClick={discardSheetFullscreenChanges}>
                {canEdit ? "Đóng không lưu" : "Đóng"}
              </Button>
              <Tooltip title={canEdit ? "Đóng không lưu" : "Đóng"}>
                <IconButton size="small" onClick={discardSheetFullscreenChanges} aria-label={canEdit ? "Đóng không lưu" : "Đóng"}>
                  <CloseOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 0,
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {sheetFullscreenOpen ? renderSheetSurface(true) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={configOpen && !semanticEditOnly}
        onClose={() => setConfigOpen(false)}
        fullWidth
        maxWidth="xl"
        PaperProps={{
          sx: {
            height: { xs: "calc(100dvh - 32px)", sm: "min(760px, calc(100dvh - 64px))" },
            maxHeight: { xs: "calc(100dvh - 32px)", sm: "calc(100dvh - 64px)" },
          },
        }}
      >
        <DialogTitle component="div" sx={{ pb: 1 }}>
          <Box sx={{ typography: "h6", fontWeight: 850 }}>
            Cấu hình kiểu dữ liệu
          </Box>
          <Typography variant="body2" color="text.secondary">
            Chọn vùng dữ liệu cần sửa, đổi kiểu dữ liệu và kiểm tra màu trên bảng xem trước.
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <DataTypeConfigPanel
            spec={spec}
            disabled={!canEdit}
            dataRect={regions.dataRect}
            workbookData={workbookRef.current?.length ? workbookRef.current : workbookData}
            onSpecChange={setNextSpec}
            onActiveTargetChange={() => {}}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <ExcelImportPreviewDialog
        open={Boolean(pendingExcelImport)}
        spec={importSpecDraft ?? spec}
        pendingImport={pendingExcelImport}
        selectedRange={importSourceRange}
        importing={importingExcel}
        reading={previewingExcel}
        error={importError}
        onSpecChange={setImportSpecDraft}
        onClose={closeImportPreview}
        onConfirm={confirmExcelImportRange}
      />

      <SaveResultDialog open={dlgOpen} ok={dlgOk} issues={dlgIssues as any} onClose={() => setDlgOpen(false)} />
    </Box>
  );
}

function ExcelConfigPanel({
  spec,
  meta,
  tableMode,
  disabled,
  showTableConfig = true,
  onMetaChange,
  onTableModeChange,
  onSpecChange,
  onActiveTargetChange,
}: {
  spec: HeaderSpec;
  meta: ExcelDesignerMeta;
  tableMode: DynamicExcelTableMode;
  disabled: boolean;
  showTableConfig?: boolean;
  onMetaChange: (patch: Partial<ExcelDesignerMeta>) => void;
  onTableModeChange: (tableMode: DynamicExcelTableMode) => void;
  onSpecChange: (spec: HeaderSpec, active?: ActiveTarget | null) => void;
  onActiveTargetChange: (target: ActiveTarget | null) => void;
}) {
  const [infoOpen, setInfoOpen] = useState(true);
  const metaSummary = [meta.code?.trim(), meta.name?.trim()].filter(Boolean).join(" · ");
  const controlGridSx = {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, minmax(0, 1fr))",
      xl: "repeat(auto-fit, minmax(150px, 1fr))",
    },
    gap: 1,
    alignItems: "start",
  };

  return (
    <Box sx={{ p: 1.5, maxHeight: { xs: "42dvh", md: 300 }, overflowY: "auto", pr: 1 }}>
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ minWidth: 0 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={850}>
              Thông tin bảng
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {metaSummary || "Chưa có mã bảng/tên bảng"}
            </Typography>
          </Box>
          <Tooltip title={infoOpen ? "Ẩn thông tin bảng" : "Hiện thông tin bảng"}>
            <IconButton size="small" onClick={() => setInfoOpen((open) => !open)}>
              {infoOpen ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>

        <Collapse in={infoOpen} timeout="auto" unmountOnExit>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "220px minmax(220px, 1fr)" },
              gap: 1,
            }}
          >
            <TextField
              label="Mã bảng"
              size="small"
              value={meta.code ?? ""}
              disabled={disabled}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Sao chép mã">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => copyText(meta.code ?? "")}
                          disabled={disabled || !(meta.code ?? "").trim()}
                          edge="end"
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Tên bảng"
              size="small"
              value={meta.name ?? ""}
              disabled={disabled}
              onChange={(event) => onMetaChange({ name: event.target.value })}
              fullWidth
            />
          </Box>
        </Collapse>

        {showTableConfig && (
          <>
        <Divider />

        <Stack spacing={1}>
          <Box>
            <Typography variant="subtitle1" fontWeight={850}>
              Vùng bảng
            </Typography>
          </Box>

          <Box sx={controlGridSx}>
          <FormControl size="small" fullWidth>
            <InputLabel>Loại bảng</InputLabel>
            <Select
              label="Loại bảng"
              value={spec.kind}
              disabled={disabled}
              onChange={(event) =>
                onSpecChange(createSpecForKind(event.target.value as HeaderKind, spec), { kind: "DATA" })
              }
            >
              <MenuItem value="TOP">Bảng ngang</MenuItem>
              <MenuItem value="LEFT">Bảng dọc</MenuItem>
              <MenuItem value="MATRIX">Bảng ma trận</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Kiểu nhập/tổng hợp bảng</InputLabel>
            <Select
              label="Kiểu nhập/tổng hợp bảng"
              value={normalizeTableModeForKind(tableMode, spec.kind)}
              disabled={disabled}
              onChange={(event) =>
                onTableModeChange(normalizeTableModeForKind(event.target.value as DynamicExcelTableMode, spec.kind))
              }
              renderValue={(selected) => {
                const modeValue = normalizeTableModeForKind(selected as DynamicExcelTableMode, spec.kind);
                return (
                  <Tooltip title={tableModeHelper(modeValue)} arrow placement="top">
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        minWidth: 0,
                        maxWidth: "100%",
                      }}
                    >
                      <Typography component="span" variant="body2" noWrap>
                        {tableModeLabel(modeValue)}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              }}
            >
              {getAllowedTableModes(spec.kind).map((modeValue) => (
                <MenuItem key={modeValue} value={modeValue}>
                  {tableModeLabel(modeValue)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {spec.kind === "TOP" && (
            <>
              <NumberField
                label="Số hàng tiêu đề"
                value={spec.topRows}
                disabled={disabled}
                onFocus={() => onActiveTargetChange({ kind: "HEADER" })}
                onChange={(value) => onSpecChange({ ...spec, topRows: value }, { kind: "HEADER" })}
              />
              <NumberField
                label="Số cột dữ liệu"
                value={spec.topCols}
                disabled={disabled}
                onFocus={() => onActiveTargetChange({ kind: "DATA" })}
                onChange={(value) => onSpecChange({ ...spec, topCols: value }, { kind: "DATA" })}
              />
              <NumberField
                label="Số hàng dữ liệu"
                value={spec.dataRows}
                disabled={disabled}
                onFocus={() => onActiveTargetChange({ kind: "DATA" })}
                onChange={(value) => onSpecChange({ ...spec, dataRows: value }, { kind: "DATA" })}
              />
            </>
          )}

          {spec.kind === "LEFT" && (
            <>
              <NumberField
                label="Số hàng dữ liệu"
                value={spec.leftRows}
                disabled={disabled}
                onFocus={() => onActiveTargetChange({ kind: "DATA" })}
                onChange={(value) => onSpecChange({ ...spec, leftRows: value }, { kind: "DATA" })}
              />
              <NumberField
                label="Số cột tiêu đề"
                value={spec.leftCols}
                disabled={disabled}
                onFocus={() => onActiveTargetChange({ kind: "HEADER" })}
                onChange={(value) => onSpecChange({ ...spec, leftCols: value }, { kind: "HEADER" })}
              />
              <NumberField
                label="Số cột dữ liệu"
                value={spec.dataCols}
                disabled={disabled}
                onFocus={() => onActiveTargetChange({ kind: "DATA" })}
                onChange={(value) => onSpecChange({ ...spec, dataCols: value }, { kind: "DATA" })}
              />
            </>
          )}

          {spec.kind === "MATRIX" && (
            <>
              <NumberField
                label="Số hàng tiêu đề"
                value={spec.topRows}
                disabled={disabled}
                onFocus={() => onActiveTargetChange({ kind: "HEADER" })}
                onChange={(value) => onSpecChange({ ...spec, topRows: value }, { kind: "HEADER" })}
              />
              <NumberField
                label="Số cột dữ liệu"
                value={spec.topCols}
                disabled={disabled}
                onFocus={() => onActiveTargetChange({ kind: "DATA" })}
                onChange={(value) => onSpecChange({ ...spec, topCols: value }, { kind: "DATA" })}
              />
              <NumberField
                label="Số hàng dữ liệu"
                value={spec.leftRows}
                disabled={disabled}
                onFocus={() => onActiveTargetChange({ kind: "DATA" })}
                onChange={(value) => onSpecChange({ ...spec, leftRows: value }, { kind: "DATA" })}
              />
              <NumberField
                label="Số cột tiêu đề"
                value={spec.leftCols}
                disabled={disabled}
                onFocus={() => onActiveTargetChange({ kind: "HEADER" })}
                onChange={(value) => onSpecChange({ ...spec, leftCols: value }, { kind: "HEADER" })}
              />
            </>
          )}
          </Box>
        </Stack>

          </>
        )}
      </Stack>
    </Box>
  );
}

function ExcelImportPreviewDialog({
  open,
  spec,
  pendingImport,
  selectedRange,
  importing,
  reading,
  error,
  onSpecChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  spec: HeaderSpec;
  pendingImport: PendingExcelImport | null;
  selectedRange: ExcelImportSourceRange | null;
  importing: boolean;
  reading: boolean;
  error: string | null;
  onSpecChange: (spec: HeaderSpec) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [showPreviewGuide, setShowPreviewGuide] = useState(false);
  const preview = pendingImport?.preview ?? null;
  const workbookData = preview?.workbookData ?? [];
  const sheet = Array.isArray(workbookData) ? workbookData[0] : null;
  const rows = Math.max(0, Number(preview?.summary.rows ?? 0));
  const cols = Math.max(0, Number(preview?.summary.cols ?? 0));
  const tableRect: ExcelImportSourceRange = {
    r0: 0,
    c0: 0,
    r1: Math.max(0, rows - 1),
    c1: Math.max(0, cols - 1),
  };
  const mergeMap = useMemo(
    () => buildPreviewMergeMap(workbookData, tableRect),
    [workbookData, tableRect.r0, tableRect.c0, tableRect.r1, tableRect.c1],
  );
  const rangeIssue = preview
    ? selectedRange
      ? getImportRangeIssue(spec, selectedRange, workbookData)
      : "Không xác định được vùng import."
    : null;
  const nextSpec = preview && selectedRange && !rangeIssue ? createImportSpecFromSourceRange(spec, selectedRange) : null;
  const canConfirm = Boolean(preview && selectedRange && !rangeIssue && !importing && !reading);
  const displayRows = Array.from({ length: rows }, (_item, index) => index);
  const displayCols = Array.from({ length: cols }, (_item, index) => index);
  const rowHeaderWidth = 56;
  const columnWidths = useMemo(
    () => displayCols.map((columnIndex) => getPreviewColumnWidthPx(sheet, columnIndex)),
    [cols, sheet],
  );
  const rowHeights = useMemo(
    () => displayRows.map((rowIndex) => getPreviewRowHeightPx(sheet, rowIndex)),
    [rows, sheet],
  );
  const tableMinWidth = rowHeaderWidth + columnWidths.reduce((sum, width) => sum + width, 0);
  const setDraftSpec = (next: HeaderSpec) => {
    onSpecChange(normalizeSpecDataTypeMetadata(next));
  };

  const computedHeaderRows = selectedRange
    ? spec.kind === "LEFT"
      ? rectRows(selectedRange)
      : spec.topRows
    : spec.kind === "LEFT"
      ? ""
      : spec.topRows;
  const computedHeaderCols = selectedRange
    ? spec.kind === "TOP"
      ? rectCols(selectedRange)
      : spec.leftCols
    : spec.kind === "TOP"
      ? ""
      : spec.leftCols;
  const previewRegions = selectedRange && !rangeIssue ? buildImportPreviewRegions(spec, selectedRange) : null;

  const hint =
    spec.kind === "TOP"
      ? `Giữ ${spec.topRows} dòng tiêu đề; số dòng dữ liệu và số cột sẽ lấy theo vùng import.`
      : spec.kind === "LEFT"
        ? `Giữ ${spec.leftCols} cột tiêu đề trái; số dòng dữ liệu và số cột dữ liệu sẽ lấy theo vùng import.`
        : `Giữ ${spec.topRows} dòng tiêu đề trên và ${spec.leftCols} cột tiêu đề trái; vùng dữ liệu sẽ lấy theo vùng import.`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      PaperProps={{
        sx: {
          height: { xs: "calc(100dvh - 24px)", md: "min(860px, calc(100dvh - 48px))" },
          maxHeight: { xs: "calc(100dvh - 24px)", md: "calc(100dvh - 48px)" },
        },
      }}
    >
      <DialogTitle component="div" sx={{ pb: 1 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={850}>
              Cấu hình vùng import Excel
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {preview
                ? `${pendingImport?.file.name ?? ""} · Sheet ${preview.summary.sheetName} · ${rows} dòng x ${cols} cột`
                : `${pendingImport?.file.name ?? ""} · Đang đọc file`}
            </Typography>
          </Box>
          {selectedRange && (
            <Chip
              size="small"
              color={rangeIssue ? "warning" : "primary"}
              label={`Vùng import: ${formatRectRef(selectedRange)} (${rectRows(selectedRange)}x${rectCols(selectedRange)})`}
              sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
            />
          )}
        </Stack>
        {preview && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "220px repeat(4, minmax(150px, 1fr))",
            },
            gap: 1,
            alignItems: "start",
            mt: 1.25,
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel>Loại bảng</InputLabel>
            <Select
              label="Loại bảng"
              value={spec.kind}
              disabled={importing}
              onChange={(event) => setDraftSpec(createSpecForKind(event.target.value as HeaderKind, spec))}
            >
              <MenuItem value="TOP">Bảng ngang</MenuItem>
              <MenuItem value="LEFT">Bảng dọc</MenuItem>
              <MenuItem value="MATRIX">Bảng ma trận</MenuItem>
            </Select>
          </FormControl>

          {spec.kind === "TOP" && (
            <>
              <NumberField
                label="Số hàng tiêu đề"
                value={spec.topRows}
                disabled={importing}
                onFocus={() => {}}
                onChange={(value) => setDraftSpec({ ...spec, topRows: value })}
              />
              <TextField
                size="small"
                label="Số cột tiêu đề"
                value={computedHeaderCols}
                placeholder="Nhập tọa độ"
                InputProps={{ readOnly: true }}
                helperText="Suy ra từ vùng import"
              />
            </>
          )}

          {spec.kind === "LEFT" && (
            <>
              <TextField
                size="small"
                label="Số hàng tiêu đề"
                value={computedHeaderRows}
                placeholder="Nhập tọa độ"
                InputProps={{ readOnly: true }}
                helperText="Suy ra từ vùng import"
              />
              <NumberField
                label="Số cột tiêu đề"
                value={spec.leftCols}
                disabled={importing}
                onFocus={() => {}}
                onChange={(value) => setDraftSpec({ ...spec, leftCols: value })}
              />
            </>
          )}

          {spec.kind === "MATRIX" && (
            <>
              <NumberField
                label="Số hàng tiêu đề"
                value={spec.topRows}
                disabled={importing}
                onFocus={() => {}}
                onChange={(value) => setDraftSpec({ ...spec, topRows: value })}
              />
              <NumberField
                label="Số cột tiêu đề"
                value={spec.leftCols}
                disabled={importing}
                onFocus={() => {}}
                onChange={(value) => setDraftSpec({ ...spec, leftCols: value })}
              />
            </>
            )}
        </Box>
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {!preview ? (
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
            {reading && <LinearProgress />}
            <Alert severity={error ? "error" : "info"} variant="outlined">
              {error ?? "Đang đọc file Excel và xác định vùng bảng. Có thể hủy thao tác nếu chọn nhầm file."}
            </Alert>
          </Box>
        ) : (
          <>
        <Box sx={{ p: 1.25, borderBottom: 1, borderColor: "divider" }}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 1 }}>
            <Button size="small" variant="outlined" onClick={() => setShowPreviewGuide((value) => !value)}>
              {showPreviewGuide ? "Ẩn tô màu" : "Hiện tô màu"}
            </Button>
            {showPreviewGuide && (
              <>
                <ImportPreviewLegendChip label="Header" color={MARK_COLORS.HEADER_BG} />
                <ImportPreviewLegendChip label="Vùng dữ liệu" color={MARK_COLORS.DATA_BG} />
                <ImportPreviewLegendChip label="Công thức" color={SPECIAL_RANGE_COLORS.FORMULA} />
                <ImportPreviewLegendChip label="Tiêu đề/text" color={SPECIAL_RANGE_COLORS.TITLE} />
                <ImportPreviewLegendChip label="TR/nền vàng không nhập" color={SPECIAL_RANGE_COLORS.BLANK} />
              </>
            )}
            <Chip
              size="small"
              variant="outlined"
              label="Vùng import theo 2 marker #END"
            />
          </Stack>

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
            <Chip size="small" variant="outlined" label={`Loại bảng: ${headerKindLabel(spec.kind)}`} />
            <Chip size="small" variant="outlined" label={hint} />
            {selectedRange && (
              <Chip
                size="small"
                color={rangeIssue ? "warning" : "primary"}
                label={`Vùng import: ${formatRectRef(selectedRange)} (${rectRows(selectedRange)}x${rectCols(selectedRange)})`}
              />
            )}
            {nextSpec && (
              <Chip
                size="small"
                color="success"
                label={
                  nextSpec.kind === "MATRIX"
                    ? `Data: ${nextSpec.leftRows} dòng x ${nextSpec.topCols} cột`
                    : nextSpec.kind === "TOP"
                      ? `Data: ${nextSpec.dataRows} dòng x ${nextSpec.topCols} cột`
                      : `Data: ${nextSpec.leftRows} dòng x ${nextSpec.dataCols} cột`
                }
              />
            )}
          </Stack>
          <Alert severity="info" variant="outlined" sx={{ mt: 1, py: 0.5 }}>
            Trong vùng dữ liệu: ô có công thức Excel dạng =... sẽ là Công thức; ô có chữ/text sẽ là Tiêu đề; ô nền vàng hoặc chữ TR sẽ là Bỏ trống không nhập. Kiểu dữ liệu phức tạp như text nhập liệu hoặc list enum chỉnh sau trong web app.
          </Alert>
          {rangeIssue && (
            <Alert severity={selectedRange ? "warning" : "info"} sx={{ mt: 1, py: 0.5 }}>
              {rangeIssue}
            </Alert>
          )}
        </Box>

        <TableContainer
          sx={{
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "auto",
            bgcolor: "background.default",
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              tableLayout: "fixed",
              minWidth: tableMinWidth,
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    width: rowHeaderWidth,
                    minWidth: rowHeaderWidth,
                    position: "sticky",
                    left: 0,
                    zIndex: 4,
                    bgcolor: "background.paper",
                  }}
                />
                {displayCols.map((columnIndex) => (
                  <TableCell
                    key={columnIndex}
                    align="center"
                    sx={{
                      width: columnWidths[columnIndex] ?? 104,
                      minWidth: columnWidths[columnIndex] ?? 104,
                      maxWidth: columnWidths[columnIndex] ?? 104,
                      px: 0.5,
                      fontWeight: 850,
                      bgcolor: "background.paper",
                    }}
                  >
                    {formatColumnRef(columnIndex)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayRows.map((rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell
                    sx={{
                      width: rowHeaderWidth,
                      minWidth: rowHeaderWidth,
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      px: 0.75,
                      fontWeight: 850,
                      bgcolor: "background.paper",
                    }}
                  >
                    {formatRowRef(rowIndex)}
                  </TableCell>
                  {displayCols.map((columnIndex) => {
                    const mergeInfo = mergeMap.get(previewCellKey(rowIndex, columnIndex));
                    if (mergeInfo?.hidden) return null;

                    const renderedRect = mergeInfo?.rect ?? {
                      r0: rowIndex,
                      c0: columnIndex,
                      r1: rowIndex,
                      c1: columnIndex,
                    };
                    const sourceR = mergeInfo?.sourceR ?? rowIndex;
                    const sourceC = mergeInfo?.sourceC ?? columnIndex;
                    const cell = getPreviewCellObject(sheet, sourceR, sourceC);
                    const selected = selectedRange ? rectsOverlapPreview(renderedRect, selectedRange) : false;
                    const outside = Boolean(selectedRange && !selected);
                    const previewText = getPreviewCellText(sheet, sourceR, sourceC);
                    const title = typeof cell?.f === "string" && cell.f.trim()
                      ? `${previewText}\n${cell.f.startsWith("=") ? cell.f : `=${cell.f}`}`
                      : previewText;
                    const rowSpan = mergeInfo?.rowSpan ?? 1;
                    const colSpan = mergeInfo?.colSpan ?? 1;
                    const renderedWidth = sumPreviewSizes(columnWidths, renderedRect.c0, renderedRect.c1);
                    const renderedHeight = sumPreviewSizes(rowHeights, renderedRect.r0, renderedRect.r1);
                    const guideBg = showPreviewGuide
                      ? getImportPreviewGuideColor({
                          cell,
                          text: previewText,
                          rect: renderedRect,
                          regions: previewRegions,
                        })
                      : null;

                    return (
                      <TableCell
                        key={previewCellKey(rowIndex, columnIndex)}
                        rowSpan={rowSpan}
                        colSpan={colSpan}
                        title={title}
                        sx={{
                          height: renderedHeight,
                          width: renderedWidth,
                          minWidth: renderedWidth,
                          maxWidth: renderedWidth,
                          px: 0.75,
                          py: 0.25,
                          fontFamily: cell?.ff ?? undefined,
                          fontWeight: cell?.bl ? 800 : 400,
                          fontStyle: cell?.it ? "italic" : "normal",
                          fontSize: cell?.fs ? `${Math.min(16, Math.max(10, Number(cell.fs)))}px` : "0.78rem",
                          color: cell?.fc ?? "text.primary",
                          textAlign: cell?.ht === 0 ? "center" : cell?.ht === 2 ? "right" : "left",
                          verticalAlign: cell?.vt === 1 ? "top" : cell?.vt === 2 ? "bottom" : "middle",
                          whiteSpace: "normal",
                          wordBreak: "normal",
                          overflowWrap: "break-word",
                          overflow: "hidden",
                          userSelect: "none",
                          cursor: "default",
                          opacity: outside ? 0.62 : 1,
                          bgcolor: outside ? "#F3F4F6" : guideBg ?? (selected ? "rgba(25, 118, 210, 0.18)" : cell?.bg ?? "background.paper"),
                          outline: selected ? "2px solid" : "1px solid",
                          outlineColor: selected ? "primary.main" : "divider",
                          outlineOffset: "-1px",
                        }}
                      >
                        {previewText}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={importing}>
          Hủy
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={!canConfirm}>
          {reading ? "Đang đọc..." : importing ? "Đang nhập..." : "Nhập vùng import"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ImportPreviewLegendChip({ label, color }: { label: string; color: string }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={label}
      sx={{
        bgcolor: color,
        borderColor: "divider",
        color: "text.primary",
        fontWeight: 650,
      }}
    />
  );
}

function DataTypeConfigPanel({
  spec,
  disabled,
  dataRect,
  workbookData,
  onSpecChange,
  onActiveTargetChange,
}: {
  spec: HeaderSpec;
  disabled: boolean;
  dataRect: RegionRect;
  workbookData: any[];
  onSpecChange: (spec: HeaderSpec, active?: ActiveTarget | null) => void;
  onActiveTargetChange: (target: ActiveTarget | null) => void;
}) {
  const [selectedRect, setSelectedRect] = useState<RegionRect>(dataRect);
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null);
  const [topLeftDraft, setTopLeftDraft] = useState(() => formatCellRef(dataRect.r0, dataRect.c0));
  const [bottomRightDraft, setBottomRightDraft] = useState(() => formatCellRef(dataRect.r1, dataRect.c1));
  const [coordinateIssue, setCoordinateIssue] = useState<string | null>(null);
  const [dataGridExpanded, setDataGridExpanded] = useState(false);

  useEffect(() => {
    setSelectedRect(dataRect);
    setTopLeftDraft(formatCellRef(dataRect.r0, dataRect.c0));
    setBottomRightDraft(formatCellRef(dataRect.r1, dataRect.c1));
    setActiveCell(null);
    setCoordinateIssue(null);
  }, [dataRect.r0, dataRect.c0, dataRect.r1, dataRect.c1]);

  const syncDraftsFromRect = (rect: RegionRect) => {
    setTopLeftDraft(formatCellRef(rect.r0, rect.c0));
    setBottomRightDraft(formatCellRef(rect.r1, rect.c1));
  };

  const selectRect = (rect: RegionRect) => {
    setSelectedRect(rect);
    syncDraftsFromRect(rect);
    setCoordinateIssue(null);
    if (rect.c0 === rect.c1) onActiveTargetChange({ kind: "COLUMN", index: rect.c0 });
    else if (rect.r0 === rect.r1) onActiveTargetChange({ kind: "ROW", index: rect.r0 });
    else onActiveTargetChange({ kind: "RANGE", rect });
  };

  const viewCell = (cell: { r: number; c: number }) => {
    setActiveCell(cell);
  };

  const applyCoordinateSelection = () => {
    const parsed = parseDataConfigCoordinateRange(topLeftDraft, bottomRightDraft, dataRect);
    if (parsed.issue || !parsed.range) {
      setCoordinateIssue(parsed.issue ?? "Tọa độ vùng dữ liệu không hợp lệ.");
      return;
    }
    selectRect(parsed.range);
  };

  const handleCoordinateKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applyCoordinateSelection();
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: dataGridExpanded
          ? "1fr"
          : { xs: "1fr", md: "minmax(280px, 0.72fr) minmax(640px, 1.28fr)" },
        minHeight: 0,
      }}
    >
      <Box sx={{ p: 2, borderRight: dataGridExpanded ? 0 : { md: 1 }, borderColor: "divider", minWidth: 0 }}>
        <Stack spacing={1}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={850}>
              Bảng dữ liệu
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setDataGridExpanded((value) => !value)}
              sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
            >
              {dataGridExpanded ? "Hiện cấu hình" : "Mở rộng bảng dữ liệu"}
            </Button>
          </Stack>
          <Stack spacing={1} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "flex-start" }}>
              <TextField
                size="small"
                label="Ô trên trái"
                value={topLeftDraft}
                disabled={disabled}
                placeholder={formatCellRef(dataRect.r0, dataRect.c0)}
                onChange={(event) => setTopLeftDraft(event.target.value)}
                onKeyDown={handleCoordinateKeyDown}
                inputProps={{ spellCheck: false }}
                error={Boolean(coordinateIssue)}
                helperText="Tọa độ Excel"
              />
              <TextField
                size="small"
                label="Ô dưới phải"
                value={bottomRightDraft}
                disabled={disabled}
                placeholder={formatCellRef(dataRect.r1, dataRect.c1)}
                onChange={(event) => setBottomRightDraft(event.target.value)}
                onKeyDown={handleCoordinateKeyDown}
                inputProps={{ spellCheck: false }}
                error={Boolean(coordinateIssue)}
                helperText="Nhấn Enter để áp dụng"
              />
              <TextField
                size="small"
                label="Ô đang chọn"
                value={activeCell ? formatCellRef(activeCell.r, activeCell.c) : ""}
                placeholder="Click ô để xem"
                InputProps={{ readOnly: true }}
                helperText="Chỉ xem tọa độ"
              />
              <Button
                variant="outlined"
                size="small"
                disabled={disabled}
                onClick={applyCoordinateSelection}
                sx={{ minHeight: 40, flexShrink: 0 }}
              >
                Áp dụng vùng
              </Button>
            </Stack>
            {coordinateIssue && (
              <Alert severity="warning" variant="outlined" sx={{ py: 0.5 }}>
                {coordinateIssue}
              </Alert>
            )}
          </Stack>
          <DataTypePreviewGrid
            spec={spec}
            dataRect={dataRect}
            workbookData={workbookData}
            selectedRect={selectedRect}
            disabled={disabled}
            onSelect={selectRect}
            activeCell={activeCell}
            onActiveCellChange={viewCell}
            expanded={dataGridExpanded}
          />
        </Stack>
      </Box>

      {!dataGridExpanded && (
      <Box sx={{ p: 2, minWidth: 0 }}>
        <Stack spacing={1.5}>
          <Box>
          <Typography variant="subtitle1" fontWeight={850}>
            Kiểu dữ liệu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cột/dòng/vùng được chọn sẽ được tô lại theo màu của kiểu dữ liệu.
          </Typography>
          </Box>

          {spec.kind !== "MATRIX" && (
            <SpecialRangeConfig
              spec={spec}
              dataRect={dataRect}
              selectedRect={selectedRect}
              disabled={disabled}
              onSpecChange={onSpecChange}
              onActiveTargetChange={onActiveTargetChange}
              onSelectRect={selectRect}
            />
          )}

          <Box>
            {spec.kind === "TOP" && (
              <ColumnTypeConfig
                spec={spec}
                dataRect={dataRect}
                disabled={disabled}
                onSpecChange={onSpecChange}
                onActiveTargetChange={onActiveTargetChange}
                onSelectRect={selectRect}
              />
            )}

            {spec.kind === "LEFT" && (
              <RowTypeConfig
                spec={spec}
                dataRect={dataRect}
                disabled={disabled}
                onSpecChange={onSpecChange}
                onActiveTargetChange={onActiveTargetChange}
                onSelectRect={selectRect}
              />
            )}

            {spec.kind === "MATRIX" && (
              <MatrixRangeTypeConfig
                spec={spec}
                dataRect={dataRect}
                selectedRect={selectedRect}
                disabled={disabled}
                onSpecChange={onSpecChange}
                onActiveTargetChange={onActiveTargetChange}
                onSelectRect={selectRect}
              />
            )}
          </Box>
        </Stack>
      </Box>
      )}
    </Box>
  );
}

const SPECIAL_ROLE_OPTIONS: Array<{ value: HeaderSpecialRole; label: string }> = [
  { value: "FORMULA", label: "Công thức" },
  { value: "TITLE", label: "Tiêu đề" },
  { value: "BLANK", label: "Bỏ trống không nhập" },
];

function specialRoleLabel(role: HeaderSpecialRole) {
  if (role === "HEADER") return "Tiêu đề";
  if (role === "STYLE") return "Bỏ trống không nhập";
  return SPECIAL_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function specialRoleShortLabel(role: HeaderSpecialRole) {
  if (role === "FORMULA") return "CT";
  if (role === "HEADER" || role === "TITLE") return "TD";
  if (role === "STYLE" || role === "BLANK") return "TR";
  return "V";
}

function SpecialRangeConfig({
  spec,
  dataRect,
  selectedRect,
  disabled,
  editableRoles,
  onSpecChange,
  onActiveTargetChange,
  onSelectRect,
}: {
  spec: HeaderSpec;
  dataRect: RegionRect;
  selectedRect: RegionRect;
  disabled: boolean;
  editableRoles?: HeaderSpecialRole[];
  onSpecChange: (spec: HeaderSpec, active?: ActiveTarget | null) => void;
  onActiveTargetChange: (target: ActiveTarget | null) => void;
  onSelectRect: (rect: RegionRect) => void;
}) {
  const [role, setRole] = useState<HeaderSpecialRole>("BLANK");
  const editableRoleSet = useMemo(() => new Set(editableRoles ?? SPECIAL_ROLE_OPTIONS.map((option) => option.value)), [editableRoles]);
  const roleOptions = SPECIAL_ROLE_OPTIONS.filter((option) => editableRoleSet.has(option.value));
  const effectiveRole = roleOptions.some((option) => option.value === role)
    ? role
    : roleOptions[0]?.value ?? role;
  const ranges = getSpecialRanges(spec);
  const visibleRanges = ranges;
  const selectedInsideData =
    selectedRect.r0 >= dataRect.r0 &&
    selectedRect.c0 >= dataRect.c0 &&
    selectedRect.r1 <= dataRect.r1 &&
    selectedRect.c1 <= dataRect.c1;
  const lockedOverlap = ranges.some((range) => !editableRoleSet.has(range.role) && rectsOverlapPreview(range, selectedRect));
  const canAdd = selectedInsideData && !lockedOverlap;

  const addSelectedRange = () => {
    if (disabled || !canAdd) return;
    const baseSpec = removeNonInputSpecialRangesOverlapping(spec, selectedRect, Array.from(editableRoleSet));
    const nextSpec = upsertSpecialRange(baseSpec, selectedRect, effectiveRole);
    onSpecChange(nextSpec, { kind: "SPECIAL", rect: selectedRect, role: effectiveRole });
  };

  const removeRange = (range: HeaderSpecialRange) => {
    if (disabled || !editableRoleSet.has(range.role)) return;
    onSpecChange(removeSpecialRange(spec, range), null);
  };

  return (
    <Stack
      spacing={1}
      sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.25 }}
    >
      <Typography variant="body2" fontWeight={750}>
        Vùng dữ liệu đặc biệt
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
        <TextField
          select
          size="small"
          label="Loại vùng không nhập"
          value={effectiveRole}
          disabled={disabled}
          onChange={(event) => setRole(event.target.value as HeaderSpecialRole)}
          sx={{ minWidth: 160 }}
        >
          {roleOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <Chip
          size="small"
          variant={canAdd ? "filled" : "outlined"}
          color={canAdd ? "primary" : "default"}
          label={`Đang chọn: ${formatRectRef(selectedRect)}`}
        />
        <Button variant="outlined" size="small" disabled={disabled || !canAdd} onClick={addSelectedRange}>
          Áp dụng cho vùng
        </Button>
      </Stack>

      {!selectedInsideData && (
        <Alert severity="warning" variant="outlined">
          Vùng không nhập phải nằm trong vùng dữ liệu.
        </Alert>
      )}
      {selectedInsideData && lockedOverlap && (
        <Alert severity="warning" variant="outlined">
          Vùng đang chọn chồng lên cấu hình đang khóa. Chỉ chọn phần không trùng vùng bỏ trống/không nhập.
        </Alert>
      )}

      {visibleRanges.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          {visibleRanges.map((range) => (
            <Chip
              key={range.id ?? `${range.role}:${formatRectRef(range)}`}
              size="small"
              label={`${specialRoleLabel(range.role)}: ${formatRectRef(range)}${editableRoleSet.has(range.role) ? "" : " (khóa)"}`}
              sx={{ bgcolor: SPECIAL_RANGE_COLORS[range.role], color: "text.primary" }}
              clickable
              onClick={() => onSelectRect(range)}
              onMouseEnter={() => onActiveTargetChange({ kind: "SPECIAL", rect: range, role: range.role })}
              onDelete={disabled || !editableRoleSet.has(range.role) ? undefined : () => removeRange(range)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

type PreviewMergeCell = {
  hidden?: boolean;
  rect: RegionRect;
  rowSpan: number;
  colSpan: number;
  sourceR: number;
  sourceC: number;
};

function previewCellKey(r: number, c: number) {
  return `${r}:${c}`;
}

function previewNonNegativeInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function previewPositiveSpan(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(1, Math.floor(parsed));
}

function rectInside(outer: RegionRect, inner: RegionRect) {
  return inner.r0 >= outer.r0 && inner.c0 >= outer.c0 && inner.r1 <= outer.r1 && inner.c1 <= outer.c1;
}

function rectsOverlapPreview(a: RegionRect, b: RegionRect) {
  return a.r0 <= b.r1 && a.r1 >= b.r0 && a.c0 <= b.c1 && a.c1 >= b.c0;
}

function findPreviewScrollTarget(container: HTMLElement, rect: RegionRect) {
  for (let r = rect.r0; r <= rect.r1; r += 1) {
    for (let c = rect.c0; c <= rect.c1; c += 1) {
      const cell = container.querySelector<HTMLElement>(`[data-preview-cell="${previewCellKey(r, c)}"]`);
      if (cell) return cell;
    }
  }

  const cells = container.querySelectorAll<HTMLElement>("[data-preview-rect]");
  for (const cell of cells) {
    const parts = (cell.dataset.previewRect ?? "").split(":").map((value) => Number(value));
    if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) continue;
    if (rectsOverlapPreview({ r0: parts[0], c0: parts[1], r1: parts[2], c1: parts[3] }, rect)) return cell;
  }
  return null;
}

function buildImportPreviewRegions(spec: HeaderSpec, sourceRange: RegionRect) {
  const headerRects: RegionRect[] = [];
  const dataRect: RegionRect = { ...sourceRange };

  if (spec.kind === "TOP") {
    headerRects.push({
      r0: sourceRange.r0,
      c0: sourceRange.c0,
      r1: Math.min(sourceRange.r1, sourceRange.r0 + spec.topRows - 1),
      c1: sourceRange.c1,
    });
    dataRect.r0 = Math.min(sourceRange.r1 + 1, sourceRange.r0 + spec.topRows);
  } else if (spec.kind === "LEFT") {
    headerRects.push({
      r0: sourceRange.r0,
      c0: sourceRange.c0,
      r1: sourceRange.r1,
      c1: Math.min(sourceRange.c1, sourceRange.c0 + spec.leftCols - 1),
    });
    dataRect.c0 = Math.min(sourceRange.c1 + 1, sourceRange.c0 + spec.leftCols);
  } else {
    const topRows = spec.topRows;
    const leftCols = spec.leftCols;
    headerRects.push({
      r0: sourceRange.r0,
      c0: sourceRange.c0,
      r1: Math.min(sourceRange.r1, sourceRange.r0 + topRows - 1),
      c1: sourceRange.c1,
    });
    headerRects.push({
      r0: Math.min(sourceRange.r1 + 1, sourceRange.r0 + topRows),
      c0: sourceRange.c0,
      r1: sourceRange.r1,
      c1: Math.min(sourceRange.c1, sourceRange.c0 + leftCols - 1),
    });
    dataRect.r0 = Math.min(sourceRange.r1 + 1, sourceRange.r0 + topRows);
    dataRect.c0 = Math.min(sourceRange.c1 + 1, sourceRange.c0 + leftCols);
  }

  return {
    headerRects: headerRects.filter((rect) => rect.r1 >= rect.r0 && rect.c1 >= rect.c0),
    dataRect,
  };
}

function getImportPreviewGuideColor(params: {
  cell: any;
  text: string;
  rect: RegionRect;
  regions: ReturnType<typeof buildImportPreviewRegions> | null;
}) {
  const { cell, text, rect, regions } = params;
  if (!regions) return null;
  if (regions.dataRect.r1 >= regions.dataRect.r0 && regions.dataRect.c1 >= regions.dataRect.c0) {
    if (rectsOverlapPreview(rect, regions.dataRect)) {
      if (typeof cell?.f === "string" && cell.f.trim()) return SPECIAL_RANGE_COLORS.FORMULA;
      if (isPreviewBlankMarkerCell(cell, text)) return SPECIAL_RANGE_COLORS.BLANK;
      if (isPreviewTitleTextCell(cell)) return SPECIAL_RANGE_COLORS.TITLE;
      return MARK_COLORS.DATA_BG;
    }
  }
  if (regions.headerRects.some((headerRect) => rectsOverlapPreview(rect, headerRect))) {
    return MARK_COLORS.HEADER_BG;
  }
  return null;
}

function isPreviewBlankMarkerCell(cell: any, text: string) {
  if (String(text ?? "").trim().toUpperCase() === "TR") return true;
  return isPreviewYellow(cell?.bg ?? null);
}

function isPreviewTitleTextCell(cell: any) {
  if (!cell || typeof cell !== "object" || typeof cell.f === "string") return false;
  return typeof cell.v === "string" && cell.v.trim().length > 0;
}

function isPreviewYellow(hex: string | null) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r >= 220 && g >= 180 && b <= 150;
}

function getPreviewCellObject(sheet: any, r: number, c: number) {
  const row = Array.isArray(sheet?.data) ? sheet.data[r] : null;
  const fromData = Array.isArray(row) ? row[c] : null;
  if (fromData && typeof fromData === "object") return fromData;

  const celldata = Array.isArray(sheet?.celldata) ? sheet.celldata : [];
  for (const item of celldata) {
    const itemR = Number(item?.r);
    const itemC = Number(item?.c);
    if (itemR === r && itemC === c && item?.v && typeof item.v === "object") return item.v;
  }

  return fromData ?? null;
}

function getPreviewCellText(sheet: any, r: number, c: number) {
  const cell = getPreviewCellObject(sheet, r, c);
  if (cell == null) return "";
  if (typeof cell !== "object") return String(cell);

  const text =
    cell.m ??
    cell.v ??
    cell.ct?.s ??
    (typeof cell.f === "string" && cell.f.trim() ? `=${cell.f.trim().replace(/^=/, "")}` : "");
  return text == null ? "" : String(text);
}

function getPreviewColumnWidthPx(sheet: any, c: number) {
  const raw = sheet?.config?.columnlen?.[String(c)] ?? sheet?.config?.columnlen?.[c];
  const width = Number(raw);
  if (!Number.isFinite(width) || width <= 0) return 104;
  return Math.max(40, Math.min(420, Math.round(width)));
}

function getPreviewRowHeightPx(sheet: any, r: number) {
  const raw = sheet?.config?.rowlen?.[String(r)] ?? sheet?.config?.rowlen?.[r];
  const height = Number(raw);
  if (!Number.isFinite(height) || height <= 0) return 34;
  return Math.max(24, Math.min(180, Math.round(height)));
}

function sumPreviewSizes(sizes: number[], start: number, end: number) {
  let sum = 0;
  for (let index = start; index <= end; index += 1) {
    sum += sizes[index] ?? 104;
  }
  return sum;
}

function readPreviewMergeRect(merge: any): RegionRect | null {
  const r0 = previewNonNegativeInt(merge?.r ?? merge?.row ?? merge?.r0);
  const c0 = previewNonNegativeInt(merge?.c ?? merge?.col ?? merge?.c0);
  if (r0 == null || c0 == null) return null;

  const rowSpan = previewPositiveSpan(merge?.rs ?? merge?.rowspan ?? merge?.rowSpan ?? merge?.rows);
  const colSpan = previewPositiveSpan(merge?.cs ?? merge?.colspan ?? merge?.colSpan ?? merge?.cols);
  return { r0, c0, r1: r0 + rowSpan - 1, c1: c0 + colSpan - 1 };
}

function buildPreviewMergeMap(workbookData: any[] | null | undefined, tableRect: RegionRect) {
  const sheet = Array.isArray(workbookData) ? workbookData[0] : null;
  const merge = sheet?.config?.merge;
  const map = new Map<string, PreviewMergeCell>();
  if (!merge || typeof merge !== "object") return map;

  for (const item of Object.values<any>(merge)) {
    const rawRect = readPreviewMergeRect(item);
    if (!rawRect || !rectsOverlapPreview(rawRect, tableRect)) continue;

    const clipped: RegionRect = {
      r0: Math.max(rawRect.r0, tableRect.r0),
      c0: Math.max(rawRect.c0, tableRect.c0),
      r1: Math.min(rawRect.r1, tableRect.r1),
      c1: Math.min(rawRect.c1, tableRect.c1),
    };
    const masterKey = previewCellKey(clipped.r0, clipped.c0);
    map.set(masterKey, {
      rect: clipped,
      rowSpan: rectRows(clipped),
      colSpan: rectCols(clipped),
      sourceR: rawRect.r0,
      sourceC: rawRect.c0,
    });

    for (let r = clipped.r0; r <= clipped.r1; r++) {
      for (let c = clipped.c0; c <= clipped.c1; c++) {
        const key = previewCellKey(r, c);
        if (key === masterKey) continue;
        map.set(key, {
          hidden: true,
          rect: clipped,
          rowSpan: 1,
          colSpan: 1,
          sourceR: rawRect.r0,
          sourceC: rawRect.c0,
        });
      }
    }
  }

  return map;
}

function DataTypePreviewGrid({
  spec,
  dataRect,
  workbookData,
  selectedRect,
  disabled,
  onSelect,
  activeCell,
  onActiveCellChange,
  expanded,
}: {
  spec: HeaderSpec;
  dataRect: RegionRect;
  workbookData: any[];
  selectedRect: RegionRect;
  disabled: boolean;
  onSelect: (rect: RegionRect) => void;
  activeCell: { r: number; c: number } | null;
  onActiveCellChange: (cell: { r: number; c: number }) => void;
  expanded: boolean;
}) {
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const tableRect = getTableRect(spec);
  const sheet = Array.isArray(workbookData) ? workbookData[0] : null;
  const mergeMap = useMemo(
    () => buildPreviewMergeMap(workbookData, tableRect),
    [workbookData, tableRect.r0, tableRect.c0, tableRect.r1, tableRect.c1],
  );
  const totalRows = rectRows(tableRect);
  const totalCols = rectCols(tableRect);
  const rows = Array.from({ length: totalRows }, (_item, index) => tableRect.r0 + index);
  const columns = Array.from({ length: totalCols }, (_item, index) => tableRect.c0 + index);
  const rowHeaderWidth = 56;
  const cellWidth = 48;
  const cellHeight = 26;
  const cellFontSize = "0.72rem";

  const isRectSelected = (rect: RegionRect) => rectsOverlapPreview(rect, selectedRect);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    const frame = window.requestAnimationFrame(() => {
      findPreviewScrollTarget(container, selectedRect)?.scrollIntoView({ block: "center", inline: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedRect.r0, selectedRect.c0, selectedRect.r1, selectedRect.c1]);

  return (
    <Stack spacing={1}>
      <TableContainer
        ref={tableContainerRef}
        sx={{
          maxHeight: expanded ? "calc(100dvh - 310px)" : "min(54dvh, 560px)",
          maxWidth: "100%",
          overflow: "auto",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            tableLayout: "fixed",
            minWidth: rowHeaderWidth + columns.length * cellWidth,
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                onMouseDown={(event) => {
                  if (disabled) return;
                  event.preventDefault();
                  onSelect(dataRect);
                  onActiveCellChange({ r: dataRect.r0, c: dataRect.c0 });
                }}
                sx={{
                  width: rowHeaderWidth,
                  minWidth: rowHeaderWidth,
                  bgcolor: "background.paper",
                  position: "sticky",
                  left: 0,
                  zIndex: 4,
                  cursor: disabled ? "default" : "pointer",
                }}
              />
              {columns.map((columnIndex) => {
                const selectableColumn = columnIndex >= dataRect.c0 && columnIndex <= dataRect.c1;
                return (
                  <TableCell
                    key={columnIndex}
                    align="center"
                    onMouseDown={(event) => {
                      if (disabled || !selectableColumn) return;
                      event.preventDefault();
                      onSelect({ r0: dataRect.r0, c0: columnIndex, r1: dataRect.r1, c1: columnIndex });
                      onActiveCellChange({ r: dataRect.r0, c: columnIndex });
                    }}
                    sx={{
                      width: cellWidth,
                      minWidth: cellWidth,
                      maxWidth: cellWidth,
                      fontWeight: 850,
                      px: 0.25,
                      bgcolor: selectableColumn ? "background.paper" : MARK_COLORS.HEADER_BG,
                      color: selectableColumn ? "text.primary" : "text.secondary",
                      cursor: disabled || !selectableColumn ? "default" : "pointer",
                    }}
                  >
                    {formatColumnRef(columnIndex)}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((rowIndex) => {
              const selectableRow = rowIndex >= dataRect.r0 && rowIndex <= dataRect.r1;
              return (
                <TableRow key={rowIndex}>
                  <TableCell
                    onMouseDown={(event) => {
                      if (disabled || !selectableRow) return;
                      event.preventDefault();
                      onSelect({ r0: rowIndex, c0: dataRect.c0, r1: rowIndex, c1: dataRect.c1 });
                      onActiveCellChange({ r: rowIndex, c: dataRect.c0 });
                    }}
                    sx={{
                      width: rowHeaderWidth,
                      minWidth: rowHeaderWidth,
                      fontWeight: 850,
                      bgcolor: selectableRow ? "background.paper" : MARK_COLORS.HEADER_BG,
                      color: selectableRow ? "text.primary" : "text.secondary",
                      px: 0.5,
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      cursor: disabled || !selectableRow ? "default" : "pointer",
                    }}
                  >
                    {formatRowRef(rowIndex)}
                  </TableCell>
                  {columns.map((columnIndex) => {
                    const mergeInfo = mergeMap.get(previewCellKey(rowIndex, columnIndex));
                    if (mergeInfo?.hidden) return null;

                    const renderedRect = mergeInfo?.rect ?? {
                      r0: rowIndex,
                      c0: columnIndex,
                      r1: rowIndex,
                      c1: columnIndex,
                    };
                    const dataCell = rectInside(dataRect, renderedRect);
                    const dataType = dataCell
                      ? getCellDataType(spec, dataRect, rowIndex, columnIndex)
                      : DEFAULT_DYNAMIC_EXCEL_DATA_TYPE;
                    const specialRange = dataCell ? findSpecialRangeAt(spec, rowIndex, columnIndex) : null;
                    const selected = dataCell && isRectSelected(renderedRect);
                    const active = activeCell
                      ? activeCell.r >= renderedRect.r0 &&
                        activeCell.r <= renderedRect.r1 &&
                        activeCell.c >= renderedRect.c0 &&
                        activeCell.c <= renderedRect.c1
                      : false;
                    const selectable = !disabled && dataCell;
                    const previewText = dataCell
                      ? ""
                      : getPreviewCellText(sheet, mergeInfo?.sourceR ?? rowIndex, mergeInfo?.sourceC ?? columnIndex);
                    const bodyLabel = specialRange
                      ? specialRoleShortLabel(specialRange.role)
                      : dataType === "NUMBER"
                        ? "N"
                        : dataType === "DATE"
                          ? "D"
                          : dataType === "FULL_DATE"
                            ? "DF"
                            : dataType === "BOOLEAN"
                              ? "B"
                              : dataType === "IGNORE"
                                ? "I"
                                : "T";
                    const rowSpan = mergeInfo?.rowSpan ?? 1;
                    const colSpan = mergeInfo?.colSpan ?? 1;

                    return (
                      <TableCell
                        key={previewCellKey(rowIndex, columnIndex)}
                        align={dataCell ? "center" : "left"}
                        rowSpan={rowSpan}
                        colSpan={colSpan}
                        data-preview-cell={previewCellKey(renderedRect.r0, renderedRect.c0)}
                        data-preview-rect={`${renderedRect.r0}:${renderedRect.c0}:${renderedRect.r1}:${renderedRect.c1}`}
                        title={previewText}
                        onMouseDown={(event) => {
                          if (!selectable) return;
                          event.preventDefault();
                          onActiveCellChange({ r: renderedRect.r0, c: renderedRect.c0 });
                        }}
                        sx={{
                          height: cellHeight * rowSpan,
                          width: cellWidth * colSpan,
                          minWidth: cellWidth * colSpan,
                          maxWidth: cellWidth * colSpan,
                          px: 0.5,
                          py: 0,
                          fontSize: cellFontSize,
                          lineHeight: 1.15,
                          whiteSpace: "normal",
                          wordBreak: "normal",
                          overflowWrap: "break-word",
                          overflow: "hidden",
                          cursor: selectable ? "pointer" : "default",
                          bgcolor: dataCell
                            ? specialRange
                              ? SPECIAL_RANGE_COLORS[specialRange.role]
                              : DATA_TYPE_COLORS[dataType]
                            : MARK_COLORS.HEADER_BG,
                          color: dataCell ? "text.primary" : "text.secondary",
                          border: selected ? "2px solid" : "1px solid",
                          borderColor: selected ? "primary.main" : "divider",
                          boxShadow: active ? "inset 0 0 0 9999px rgba(156, 39, 176, 0.10)" : undefined,
                          outline: active ? "2px dashed rgba(156, 39, 176, 0.85)" : undefined,
                          outlineOffset: "-3px",
                          userSelect: "none",
                        }}
                      >
                        {dataCell ? bodyLabel : previewText}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary">
        Đang hiển thị đầy đủ bảng {totalRows} dòng x {totalCols} cột, gồm cả header. Header chỉ để xem, không chọn; các ô merge được hiển thị theo vùng gộp.
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {DATA_TYPE_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            size="small"
            label={option.label}
            sx={{ bgcolor: DATA_TYPE_COLORS[option.value], color: "text.primary" }}
          />
        ))}
        {SPECIAL_ROLE_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            size="small"
            label={option.label}
            sx={{ bgcolor: SPECIAL_RANGE_COLORS[option.value], color: "text.primary" }}
          />
        ))}
      </Stack>
    </Stack>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onFocus,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onFocus: () => void;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    const next = clampCount(draft);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const handleDraftChange = (nextDraft: string) => {
    setDraft(nextDraft);

    if (!nextDraft.trim()) return;

    const parsed = Number(nextDraft);
    if (!Number.isFinite(parsed)) return;

    const next = Math.floor(parsed);
    if (next < 1 || next > DESIGNER_LIMITS.MAX_SHEET_CELLS) return;
    if (next !== value) onChange(next);
  };

  return (
    <TextField
      size="small"
      label={label}
      type="number"
      value={draft}
      disabled={disabled}
      onFocus={onFocus}
      onChange={(event) => handleDraftChange(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitDraft();
          event.currentTarget.blur();
        }
      }}
      inputProps={{ min: 1, max: DESIGNER_LIMITS.MAX_SHEET_CELLS }}
    />
  );
}

function DataTypeSelect({
  label,
  value,
  disabled,
  helperText,
  onFocus,
  onChange,
}: {
  label: string;
  value: DynamicExcelDataType;
  disabled: boolean;
  helperText?: string;
  onFocus?: () => void;
  onChange: (value: DynamicExcelDataType) => void;
}) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      disabled={disabled}
      helperText={helperText}
      onFocus={onFocus}
      onChange={(event) => onChange(normalizeDataType(event.target.value))}
      fullWidth
    >
      {DATA_TYPE_OPTIONS.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {option.label}
            </Box>
            {option.tooltip ? (
              <Tooltip title={option.tooltip}>
                <HelpOutlineIcon color="action" fontSize="small" />
              </Tooltip>
            ) : null}
          </Stack>
        </MenuItem>
      ))}
    </TextField>
  );
}

const MATRIX_BLANK_KIND = "__BLANK__" as const;
const MATRIX_FORMULA_KIND = "__FORMULA__" as const;
const MATRIX_TITLE_KIND = "__TITLE__" as const;
type MatrixRangeKind =
  | DynamicExcelDataType
  | typeof MATRIX_BLANK_KIND
  | typeof MATRIX_FORMULA_KIND
  | typeof MATRIX_TITLE_KIND;

function MatrixRangeKindSelect({
  label,
  value,
  disabled,
  helperText,
  onFocus,
  onChange,
}: {
  label: string;
  value: MatrixRangeKind;
  disabled: boolean;
  helperText?: string;
  onFocus?: () => void;
  onChange: (value: MatrixRangeKind) => void;
}) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      disabled={disabled}
      helperText={helperText}
      onFocus={onFocus}
      onChange={(event) => {
        const raw = event.target.value;
        onChange(
          raw === MATRIX_BLANK_KIND || raw === MATRIX_FORMULA_KIND || raw === MATRIX_TITLE_KIND
            ? raw
            : normalizeDataType(raw),
        );
      }}
      fullWidth
    >
      {DATA_TYPE_OPTIONS.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {option.label}
            </Box>
            {option.tooltip ? (
              <Tooltip title={option.tooltip}>
                <HelpOutlineIcon color="action" fontSize="small" />
              </Tooltip>
            ) : null}
          </Stack>
        </MenuItem>
      ))}
      <MenuItem value={MATRIX_FORMULA_KIND}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            Công thức
          </Box>
          <Tooltip title="Loại vùng khỏi dữ liệu nhập; khi xem/nhập báo cáo, công thức được giữ từ template.">
            <HelpOutlineIcon color="action" fontSize="small" />
          </Tooltip>
        </Stack>
      </MenuItem>
      <MenuItem value={MATRIX_TITLE_KIND}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            Tiêu đề
          </Box>
          <Tooltip title="Loại vùng khỏi dữ liệu nhập; chữ, màu, merge và layout tiêu đề được giữ từ template.">
            <HelpOutlineIcon color="action" fontSize="small" />
          </Tooltip>
        </Stack>
      </MenuItem>
      <MenuItem value={MATRIX_BLANK_KIND}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            Bỏ trống không nhập
          </Box>
          <Tooltip title="Loại vùng khỏi ô nhập; vẫn giữ layout trong workbook.">
            <HelpOutlineIcon color="action" fontSize="small" />
          </Tooltip>
        </Stack>
      </MenuItem>
    </TextField>
  );
}

function StringListOptionsField({
  value,
  dataType,
  valueSource,
  disabled,
  quickCreateName,
  quickCreateSourcePath,
  onFocus,
  onChange,
  onSourceChange,
}: {
  value: Array<{ code: string; label: string }>;
  dataType: DynamicExcelDataType;
  valueSource?: DynamicExcelValueSource | null;
  disabled: boolean;
  quickCreateName?: string;
  quickCreateSourcePath?: string;
  onFocus?: () => void;
  onChange: (value: Array<{ code: string; label: string }>) => void;
  onSourceChange?: (value: DynamicExcelValueSource | null) => void;
}) {
  const options = normalizeStringListOptions(value);
  const [draftOptions, setDraftOptions] = useState(() =>
    options.map((option, index) => ({ ...option, key: `${index}_${option.code || "option"}` })),
  );
  const valueKey = useMemo(
    () => options.map((option) => `${option.code}\u0000${option.label}`).join("\u0001"),
    [options],
  );
  const draftKeyRef = useRef(valueKey);

  useEffect(() => {
    if (draftKeyRef.current === valueKey) return;
    draftKeyRef.current = valueKey;
    setDraftOptions(options.map((option, index) => ({ ...option, key: `${index}_${option.code || "option"}` })));
  }, [options, valueKey]);
  const optionNoun = dataType === "SHORT_TEXT" ? "nội dung" : "lựa chọn";
  const sourceType = valueSource?.sourceType ?? "FIXED_ENUM";
  const usesFixedEnum = sourceType === "FIXED_ENUM";
  const usesEnumCatalog = sourceType === "ENUM_CATALOG";
  const [quickCreateCatalog, quickCreateState] = useQuickCreateLabelEnumCatalogMutation();
  const [catalogDraftName, setCatalogDraftName] = useState(valueSource?.catalogName || quickCreateName || "");
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    if (usesEnumCatalog && valueSource?.catalogName) {
      setCatalogDraftName(valueSource.catalogName);
    }
  }, [usesEnumCatalog, valueSource?.catalogName]);

  const commit = (nextOptions = draftOptions) => {
    const normalized = normalizeStringListOptions(nextOptions);
    draftKeyRef.current = normalized.map((option) => `${option.code}\u0000${option.label}`).join("\u0001");
    onChange(normalized);
  };

  const addOption = () => {
    const nextIndex = draftOptions.length + 1;
    const [base] = getDefaultEnumOptions(dataType);
    const next = [
      ...draftOptions,
      {
        key: `${Date.now()}_${nextIndex}`,
        code: dataType === "SHORT_TEXT" && nextIndex === 1 ? base.code : `OPT_${nextIndex}`,
        label: dataType === "SHORT_TEXT"
          ? nextIndex === 1
            ? base.label
            : `${base.label} ${nextIndex}`
          : `Lựa chọn ${nextIndex}`,
      },
    ];
    setDraftOptions(next);
    commit(next);
  };

  const updateOption = (
    index: number,
    patch: Partial<{ code: string; label: string }>,
  ) => {
    setDraftOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    );
  };

  const removeOption = (index: number) => {
    const next = draftOptions.filter((_option, optionIndex) => optionIndex !== index);
    setDraftOptions(next);
    commit(next);
  };

  const createEnumCatalogFromOptions = async () => {
    const normalized = normalizeStringListOptions(draftOptions);
    const name = catalogDraftName.trim();
    if (!name || normalized.length === 0) return;

    try {
      setCatalogError(null);
      const catalog = await quickCreateCatalog({
        name,
        sourceFeature: "DYNAMIC_EXCEL",
        sourcePath: quickCreateSourcePath ?? "dynamic-excel",
        options: normalized,
      }).unwrap();
      onChange(normalized);
      onSourceChange?.({
        sourceType: "ENUM_CATALOG",
        catalogId: catalog.id,
        catalogCode: catalog.code,
        catalogName: catalog.name,
      });
    } catch {
      setCatalogError("Không tạo được danh mục enum từ danh sách hiện tại.");
    }
  };

  return (
    <Stack spacing={1}>
      <TextField
        select
        size="small"
        label="Nhãn UI / nguồn dữ liệu"
        value={sourceType}
        disabled={disabled}
        helperText="Chọn danh mục hệ thống nếu ô này phải chiếu sang dữ liệu đơn vị, người dùng, chức vụ hoặc loại đơn vị."
        onFocus={onFocus}
        onChange={(event) => {
          const nextSourceType = event.target.value as DynamicExcelValueSource["sourceType"];
          onSourceChange?.(
            nextSourceType === "FIXED_ENUM"
              ? { sourceType: "FIXED_ENUM", options: normalizeStringListOptions(draftOptions) }
              : nextSourceType === "ENUM_CATALOG"
                ? {
                    sourceType: "ENUM_CATALOG",
                    catalogId: valueSource?.catalogId,
                    catalogCode: valueSource?.catalogCode,
                    catalogName: valueSource?.catalogName,
                  }
              : { sourceType: nextSourceType },
          );
        }}
      >
        <MenuItem value="FIXED_ENUM">Danh sách cố định</MenuItem>
        <MenuItem value="ENUM_CATALOG">Danh mục enum riêng</MenuItem>
        <MenuItem value="SYSTEM_UNIT">Danh mục đơn vị</MenuItem>
        <MenuItem value="SYSTEM_USER">Danh mục người dùng</MenuItem>
        <MenuItem value="SYSTEM_POSITION">Danh mục chức vụ</MenuItem>
        <MenuItem value="SYSTEM_UNIT_TYPE">Danh mục loại đơn vị</MenuItem>
      </TextField>

      {!usesFixedEnum && (
        <Alert severity="info" variant="outlined">
          {usesEnumCatalog
            ? "Người báo cáo sẽ chọn từ danh mục cố định riêng được phân quyền; hệ thống lưu mã để thống kê, không nhập text tự do."
            : "Người báo cáo sẽ chọn từ select box/multiselect của danh mục hệ thống; hệ thống lưu mã để thống kê, không nhập text tự do."}
        </Alert>
      )}

      {usesEnumCatalog && (
        <LabelEnumCatalogSelect
          value={valueSource?.catalogId ?? ""}
          selectedName={valueSource?.catalogName ?? ""}
          disabled={disabled}
          helperText="Chọn danh mục cố định riêng đã được MU/ML tạo và phân quyền cho phạm vi hiện tại."
          onChange={(catalog) =>
            onSourceChange?.({
              sourceType: "ENUM_CATALOG",
              catalogId: catalog?.id,
              catalogCode: catalog?.code,
              catalogName: catalog?.name,
            })
          }
        />
      )}

      {usesFixedEnum && (
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {dataType === "SHORT_TEXT" ? "Nội dung" : "Lựa chọn"}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Người báo cáo chọn theo danh sách cố định; hệ thống lưu mã để thống kê.
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon fontSize="small" />}
          disabled={disabled}
          onClick={addOption}
        >
          {dataType === "SHORT_TEXT" ? "Thêm nội dung" : "Thêm"}
        </Button>
      </Stack>
      )}

      {usesFixedEnum && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", md: "flex-start" }}
        >
          <TextField
            size="small"
            label="Tên danh mục enum mới"
            value={catalogDraftName}
            disabled={disabled || quickCreateState.isLoading}
            helperText="Tạo nhanh danh mục enum riêng từ danh sách đang cấu hình."
            onFocus={onFocus}
            onChange={(event) => setCatalogDraftName(event.target.value)}
            sx={{ flex: 1 }}
          />
          <Button
            size="small"
            variant="outlined"
            disabled={
              disabled ||
              quickCreateState.isLoading ||
              !catalogDraftName.trim() ||
              normalizeStringListOptions(draftOptions).length === 0
            }
            onClick={createEnumCatalogFromOptions}
            sx={{ minHeight: 40 }}
          >
            Tạo enum
          </Button>
        </Stack>
      )}

      {catalogError && <Alert severity="error">{catalogError}</Alert>}

      {usesFixedEnum && draftOptions.length === 0 ? (
        <Alert severity="warning">
          Cần thêm ít nhất một {optionNoun} trước khi lưu kiểu enum cố định.
        </Alert>
      ) : null}

      {usesFixedEnum && <Stack spacing={0.75}>
        {draftOptions.map((option, index) => (
          <Stack
            key={option.key}
            spacing={0.75}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "160px minmax(420px, 1fr) 40px" },
              alignItems: "start",
              "& .MuiTextField-root": { mt: 0 },
            }}
          >
            <TextField
              size="small"
              label="Mã"
              value={option.code}
              disabled={disabled}
              onFocus={onFocus}
              onChange={(event) => updateOption(index, { code: event.target.value })}
              onBlur={() => commit()}
              sx={{ flex: { sm: "0 0 160px" } }}
            />
            <TextField
              size="small"
              label="Nội dung"
              value={option.label}
              disabled={disabled}
              onFocus={onFocus}
              onChange={(event) => updateOption(index, { label: event.target.value })}
              onBlur={() => commit()}
              fullWidth
              multiline
              minRows={1}
            />
            <Tooltip title="Xóa lựa chọn">
              <span>
                <IconButton
                  size="small"
                  disabled={disabled}
                  onClick={() => removeOption(index)}
                  sx={{ mt: { xs: 0, md: 0.5 } }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ))}
      </Stack>}
    </Stack>
  );
}

function valueSourceWithOptions(
  source: DynamicExcelValueSource | null | undefined,
  options: Array<{ code: string; label: string }>,
) {
  return source?.sourceType === "FIXED_ENUM"
    ? { ...source, options: normalizeStringListOptions(options) }
    : source ?? null;
}

function findNonInputSpecialRangeContainingSelection(spec: HeaderSpec, selectedRect: RegionRect) {
  return getSpecialRanges(spec).find(
    (range) => (range.role === "BLANK" || range.role === "FORMULA" || range.role === "TITLE") && rectInside(range, selectedRect),
  );
}

function removeNonInputSpecialRangesOverlapping(
  spec: HeaderSpec,
  targetRect: RegionRect,
  rolesToRemove: HeaderSpecialRole[] = ["BLANK", "FORMULA", "TITLE"],
) {
  const removableRoles = new Set<HeaderSpecialRole>(rolesToRemove);
  const specialRanges = getSpecialRanges(spec).filter(
    (range) => !removableRoles.has(range.role) || !rectsOverlapPreview(range, targetRect),
  );
  return { ...spec, specialRanges };
}

function getNonInputSpecialRanges(spec: HeaderSpec) {
  return getSpecialRanges(spec).filter(
    (range) => range.role === "BLANK" || range.role === "FORMULA" || range.role === "TITLE",
  );
}

function subtractRegionRect(source: RegionRect, cut: RegionRect): RegionRect[] {
  const r0 = Math.max(source.r0, cut.r0);
  const c0 = Math.max(source.c0, cut.c0);
  const r1 = Math.min(source.r1, cut.r1);
  const c1 = Math.min(source.c1, cut.c1);
  if (r1 < r0 || c1 < c0) return [source];

  const pieces: RegionRect[] = [];
  if (source.r0 < r0) pieces.push({ r0: source.r0, c0: source.c0, r1: r0 - 1, c1: source.c1 });
  if (r1 < source.r1) pieces.push({ r0: r1 + 1, c0: source.c0, r1: source.r1, c1: source.c1 });
  if (source.c0 < c0) pieces.push({ r0, c0: source.c0, r1, c1: c0 - 1 });
  if (c1 < source.c1) pieces.push({ r0, c0: c1 + 1, r1, c1: source.c1 });
  return pieces.filter((piece) => piece.r1 >= piece.r0 && piece.c1 >= piece.c0);
}

function subtractRegionRects(source: RegionRect, cuts: RegionRect[]) {
  let pieces: RegionRect[] = [source];
  for (const cut of cuts) {
    pieces = pieces.flatMap((piece) => subtractRegionRect(piece, cut));
  }
  return pieces;
}

function ColumnTypeConfig({
  spec,
  dataRect,
  disabled,
  onSpecChange,
  onActiveTargetChange,
  onSelectRect,
}: {
  spec: HeaderSpec;
  dataRect: RegionRect;
  disabled: boolean;
  onSpecChange: (spec: HeaderSpec, active?: ActiveTarget | null) => void;
  onActiveTargetChange: (target: ActiveTarget | null) => void;
  onSelectRect: (rect: RegionRect) => void;
}) {
  const columns = Array.from({ length: rectCols(dataRect) }, (_, index) => dataRect.c0 + index);
  const [expandedColumns, setExpandedColumns] = useState<Record<number, boolean>>({});

  return (
    <Stack spacing={1}>
      <Typography variant="body2" fontWeight={750}>
        Kiểu dữ liệu theo cột
      </Typography>
      <TableContainer sx={{ maxHeight: 520, overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
        <Table size="small" stickyHeader sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 120, fontWeight: 800 }}>Cột dữ liệu</TableCell>
              <TableCell sx={{ minWidth: 620, fontWeight: 800 }}>Kiểu dữ liệu</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {columns.map((columnIndex) => {
              const dataType = getColumnDataType(spec, columnIndex);
              const isEnum = isDynamicExcelEnumDataType(dataType);
              const expanded = Boolean(expandedColumns[columnIndex]);
              return (
                <TableRow
                  key={columnIndex}
                  hover
                  onClick={() => onSelectRect({ r0: dataRect.r0, c0: columnIndex, r1: dataRect.r1, c1: columnIndex })}
                  onMouseEnter={() => onActiveTargetChange({ kind: "COLUMN", index: columnIndex })}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>Cột {formatColumnRef(columnIndex)}</TableCell>
                  <TableCell>
                    <Stack spacing={1}>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: isEnum ? "minmax(260px, 1fr) auto" : "1fr" },
                          gap: 1,
                          alignItems: "start",
                        }}
                      >
                        <DataTypeSelect
                          label="Kiểu dữ liệu"
                          value={dataType}
                          disabled={disabled}
                          onFocus={() => onActiveTargetChange({ kind: "COLUMN", index: columnIndex })}
                          onChange={(nextDataType) => {
                            if (isDynamicExcelEnumDataType(nextDataType)) {
                              setExpandedColumns((current) => ({ ...current, [columnIndex]: true }));
                            }
                            onSpecChange(setColumnDataType(spec, columnIndex, nextDataType), {
                              kind: "COLUMN",
                              index: columnIndex,
                            });
                          }}
                        />
                        {isEnum && (
                          <Button
                            size="small"
                            variant="text"
                            disabled={disabled}
                            endIcon={expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            onClick={() =>
                              setExpandedColumns((current) => ({
                                ...current,
                                [columnIndex]: !expanded,
                              }))
                            }
                            sx={{ minHeight: 40, whiteSpace: "nowrap" }}
                          >
                            {expanded ? "Ẩn cấu hình" : "Cấu hình nội dung"}
                          </Button>
                        )}
                      </Box>
                      {isEnum && (
                        <Collapse in={expanded} unmountOnExit>
                          <StringListOptionsField
                            value={getColumnStringListOptions(spec, columnIndex)}
                            dataType={dataType}
                            valueSource={getColumnValueSource(spec, columnIndex)}
                            disabled={disabled}
                            quickCreateName={`Enum cột ${formatColumnRef(columnIndex)}`}
                            quickCreateSourcePath={`dynamic-excel:column:${columnIndex}`}
                            onFocus={() => onActiveTargetChange({ kind: "COLUMN", index: columnIndex })}
                            onChange={(options) =>
                              onSpecChange(setColumnStringListOptions(
                                spec,
                                columnIndex,
                                options,
                                dataType,
                                valueSourceWithOptions(getColumnValueSource(spec, columnIndex), options),
                              ), {
                                kind: "COLUMN",
                                index: columnIndex,
                              })
                            }
                            onSourceChange={(valueSource) =>
                              onSpecChange(setColumnStringListOptions(
                                spec,
                                columnIndex,
                                getColumnStringListOptions(spec, columnIndex),
                                dataType,
                                valueSource,
                              ), {
                                kind: "COLUMN",
                                index: columnIndex,
                              })
                            }
                          />
                        </Collapse>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

function RowTypeConfig({
  spec,
  dataRect,
  disabled,
  onSpecChange,
  onActiveTargetChange,
  onSelectRect,
}: {
  spec: HeaderSpec;
  dataRect: RegionRect;
  disabled: boolean;
  onSpecChange: (spec: HeaderSpec, active?: ActiveTarget | null) => void;
  onActiveTargetChange: (target: ActiveTarget | null) => void;
  onSelectRect: (rect: RegionRect) => void;
}) {
  const rows = Array.from({ length: rectRows(dataRect) }, (_, index) => dataRect.r0 + index);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  return (
    <Stack spacing={1}>
      <Typography variant="body2" fontWeight={750}>
        Kiểu dữ liệu theo dòng
      </Typography>
      <TableContainer sx={{ maxHeight: 520, overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
        <Table size="small" stickyHeader sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 120, fontWeight: 800 }}>Dòng dữ liệu</TableCell>
              <TableCell sx={{ minWidth: 620, fontWeight: 800 }}>Kiểu dữ liệu</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((rowIndex) => {
              const dataType = getRowDataType(spec, rowIndex);
              const isEnum = isDynamicExcelEnumDataType(dataType);
              const expanded = Boolean(expandedRows[rowIndex]);
              return (
                <TableRow
                  key={rowIndex}
                  hover
                  onClick={() => onSelectRect({ r0: rowIndex, c0: dataRect.c0, r1: rowIndex, c1: dataRect.c1 })}
                  onMouseEnter={() => onActiveTargetChange({ kind: "ROW", index: rowIndex })}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>Dòng {rowIndex + 1}</TableCell>
                  <TableCell>
                    <Stack spacing={1}>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: isEnum ? "minmax(260px, 1fr) auto" : "1fr" },
                          gap: 1,
                          alignItems: "start",
                        }}
                      >
                        <DataTypeSelect
                          label="Kiểu dữ liệu"
                          value={dataType}
                          disabled={disabled}
                          onFocus={() => onActiveTargetChange({ kind: "ROW", index: rowIndex })}
                          onChange={(nextDataType) => {
                            if (isDynamicExcelEnumDataType(nextDataType)) {
                              setExpandedRows((current) => ({ ...current, [rowIndex]: true }));
                            }
                            onSpecChange(setRowDataType(spec, rowIndex, nextDataType), {
                              kind: "ROW",
                              index: rowIndex,
                            });
                          }}
                        />
                        {isEnum && (
                          <Button
                            size="small"
                            variant="text"
                            disabled={disabled}
                            endIcon={expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            onClick={() =>
                              setExpandedRows((current) => ({
                                ...current,
                                [rowIndex]: !expanded,
                              }))
                            }
                            sx={{ minHeight: 40, whiteSpace: "nowrap" }}
                          >
                            {expanded ? "Ẩn cấu hình" : "Cấu hình nội dung"}
                          </Button>
                        )}
                      </Box>
                      {isEnum && (
                        <Collapse in={expanded} unmountOnExit>
                          <StringListOptionsField
                            value={getRowStringListOptions(spec, rowIndex)}
                            dataType={dataType}
                            valueSource={getRowValueSource(spec, rowIndex)}
                            disabled={disabled}
                            quickCreateName={`Enum dòng ${formatRowRef(rowIndex)}`}
                            quickCreateSourcePath={`dynamic-excel:row:${rowIndex}`}
                            onFocus={() => onActiveTargetChange({ kind: "ROW", index: rowIndex })}
                            onChange={(options) =>
                              onSpecChange(setRowStringListOptions(
                                spec,
                                rowIndex,
                                options,
                                dataType,
                                valueSourceWithOptions(getRowValueSource(spec, rowIndex), options),
                              ), {
                                kind: "ROW",
                                index: rowIndex,
                              })
                            }
                            onSourceChange={(valueSource) =>
                              onSpecChange(setRowStringListOptions(
                                spec,
                                rowIndex,
                                getRowStringListOptions(spec, rowIndex),
                                dataType,
                                valueSource,
                              ), {
                                kind: "ROW",
                                index: rowIndex,
                              })
                            }
                          />
                        </Collapse>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

function MatrixRangeTypeConfig({
  spec,
  dataRect,
  selectedRect,
  disabled,
  onSpecChange,
  onActiveTargetChange,
  onSelectRect,
}: {
  spec: HeaderSpec;
  dataRect: RegionRect;
  selectedRect: RegionRect;
  disabled: boolean;
  onSpecChange: (spec: HeaderSpec, active?: ActiveTarget | null) => void;
  onActiveTargetChange: (target: ActiveTarget | null) => void;
  onSelectRect: (rect: RegionRect) => void;
}) {
  const ranges = getMatrixDataTypeRanges(spec, dataRect);
  const selectedType = getCellDataType(spec, dataRect, selectedRect.r0, selectedRect.c0);
  const selectedNonInputRange = findNonInputSpecialRangeContainingSelection(spec, selectedRect);
  const selectedKind: MatrixRangeKind =
    selectedNonInputRange?.role === "FORMULA"
      ? MATRIX_FORMULA_KIND
      : selectedNonInputRange?.role === "TITLE"
        ? MATRIX_TITLE_KIND
        : selectedNonInputRange?.role === "BLANK"
          ? MATRIX_BLANK_KIND
        : selectedType;
  const selectedInsideData = rectInside(dataRect, selectedRect);
  const canApplyNonInput = selectedInsideData;
  const helperText =
    selectedKind === MATRIX_BLANK_KIND
      ? "Vùng này không nhận dữ liệu nhập và sẽ bị loại khỏi values1D."
      : selectedKind === MATRIX_FORMULA_KIND
        ? "Vùng này không nhận dữ liệu nhập; công thức được giữ từ template khi xem/nhập báo cáo."
      : selectedKind === MATRIX_TITLE_KIND
        ? "Vùng này không nhận dữ liệu nhập; tiêu đề và layout được giữ từ template."
      : selectedKind === "IGNORE"
        ? "Vùng này dùng cấu hình cũ Bỏ qua nhập; cấu hình mới nên dùng vùng Bỏ trống không nhập."
        : "Có thể chọn kiểu dữ liệu nhập hoặc đánh dấu vùng là công thức/tiêu đề/bỏ trống không nhập.";
  const specialRanges = getNonInputSpecialRanges(spec);
  const displayRanges = [
    ...ranges.flatMap((range) =>
      subtractRegionRects(range, specialRanges).map((rect) => ({
        kind: "DATA_TYPE" as const,
        id: `${range.id ?? "range"}:${formatRectRef(rect)}`,
        rect,
        label: dataTypeLabel(range.dataType),
        color: DATA_TYPE_COLORS[range.dataType],
        dataType: range.dataType,
      })),
    ),
    ...specialRanges.map((range) => ({
      kind: range.role as "BLANK" | "FORMULA" | "TITLE",
      id: range.id,
      rect: range,
      label: specialRoleLabel(range.role),
      color: SPECIAL_RANGE_COLORS[range.role],
    })),
  ].sort((a, b) => a.rect.r0 - b.rect.r0 || a.rect.c0 - b.rect.c0 || a.rect.r1 - b.rect.r1 || a.rect.c1 - b.rect.c1);

  const applyKind = (kind: MatrixRangeKind) => {
    if (kind === MATRIX_BLANK_KIND || kind === MATRIX_FORMULA_KIND || kind === MATRIX_TITLE_KIND) {
      if (!canApplyNonInput) return;
      const role = kind === MATRIX_FORMULA_KIND
        ? "FORMULA"
        : kind === MATRIX_TITLE_KIND
          ? "TITLE"
          : "BLANK";
      const baseSpec = removeNonInputSpecialRangesOverlapping(spec, selectedRect);
      const nextSpec = upsertSpecialRange(baseSpec, selectedRect, role);
      onSpecChange(nextSpec, { kind: "SPECIAL", rect: selectedRect, role });
      return;
    }

    const targetRect = selectedNonInputRange ?? selectedRect;
    const specWithoutNonInput = removeNonInputSpecialRangesOverlapping(spec, targetRect);
    const nextSpec = setMatrixRangeDataType(specWithoutNonInput, dataRect, targetRect, kind);
    onSpecChange(nextSpec, { kind: "RANGE", rect: targetRect });
  };

  return (
    <Stack spacing={1}>
      <Typography variant="body2" fontWeight={750}>
        Vùng dữ liệu ma trận
      </Typography>
      <MatrixRangeKindSelect
        label={`Vùng đang chọn ${formatRectRef(selectedRect)}`}
        value={selectedKind}
        disabled={disabled}
        helperText={helperText}
        onFocus={() => onActiveTargetChange({ kind: "RANGE", rect: selectedRect })}
        onChange={applyKind}
      />
      {!canApplyNonInput && (selectedKind === MATRIX_BLANK_KIND || selectedKind === MATRIX_FORMULA_KIND || selectedKind === MATRIX_TITLE_KIND) && (
        <Alert severity="info" variant="outlined">
          Vùng không nhập chỉ áp dụng cho vùng nằm trong vùng dữ liệu.
        </Alert>
      )}
      {isDynamicExcelEnumDataType(selectedType) &&
        selectedKind !== MATRIX_BLANK_KIND &&
        selectedKind !== MATRIX_FORMULA_KIND &&
        selectedKind !== MATRIX_TITLE_KIND && (
        <StringListOptionsField
          value={getCellStringListOptions(spec, dataRect, selectedRect.r0, selectedRect.c0)}
          dataType={selectedType}
          valueSource={getCellValueSource(spec, dataRect, selectedRect.r0, selectedRect.c0)}
          disabled={disabled}
          quickCreateName={`Enum vùng ${formatRectRef(selectedRect)}`}
          quickCreateSourcePath={`dynamic-excel:range:${formatRectRef(selectedRect)}`}
          onFocus={() => onActiveTargetChange({ kind: "RANGE", rect: selectedRect })}
          onChange={(options) =>
            onSpecChange(setMatrixRangeStringListOptions(
              spec,
              dataRect,
              selectedRect,
              options,
              selectedType,
              valueSourceWithOptions(getCellValueSource(spec, dataRect, selectedRect.r0, selectedRect.c0), options),
            ), {
              kind: "RANGE",
              rect: selectedRect,
            })
          }
          onSourceChange={(valueSource) =>
            onSpecChange(setMatrixRangeStringListOptions(
              spec,
              dataRect,
              selectedRect,
              getCellStringListOptions(spec, dataRect, selectedRect.r0, selectedRect.c0),
              selectedType,
              valueSource,
            ), {
              kind: "RANGE",
              rect: selectedRect,
            })
          }
        />
      )}

      <TableContainer sx={{ maxHeight: 360, border: 1, borderColor: "divider", borderRadius: 1 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Vùng</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Kiểu dữ liệu</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRanges.map((range) => (
              <TableRow
                key={`${range.kind}:${range.id ?? formatRectRef(range.rect)}`}
                hover
                onClick={() => onSelectRect(range.rect)}
                onMouseEnter={() =>
                  range.kind === "BLANK" || range.kind === "FORMULA" || range.kind === "TITLE"
                    ? onActiveTargetChange({ kind: "SPECIAL", rect: range.rect, role: range.kind })
                    : onActiveTargetChange({ kind: "RANGE", id: range.id, rect: range.rect })
                }
                sx={{ cursor: "pointer" }}
              >
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant="body2" fontWeight={650}>{formatRectRef(range.rect)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {rectRows(range.rect)} x {rectCols(range.rect)}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={range.label}
                    sx={{ bgcolor: range.color, color: "text.primary" }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Alert severity="info" variant="outlined">
        Bảng ma trận luôn lưu phân vùng phủ kín vùng dữ liệu. Chọn vùng trên bản xem trước rồi đổi kiểu dữ liệu để hệ thống tự tách các vùng còn lại.
      </Alert>
    </Stack>
  );
}
