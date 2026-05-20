import { useEffect, useMemo, useRef, useState } from "react";
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";

import type {
  DynamicExcelDataType,
  HeaderKind,
  HeaderSpec,
} from "./types";
import type { HeaderMeta } from "../HeaderInput";
import { SaveResultDialog } from "../SaveResultDialog";
import type { DynamicExcelTableMode } from "../../../api/dynamicExcelApi";

import { Workbook } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";

import { normalizeToSingleSheet } from "./normalizeWorkbook";
import { computeRegions, getAnchors, getTableRect, type Rect as RegionRect } from "./regions";

import { extractMasterCells, extractNumericValues1D } from "./fortuneAdapter";
import { validateHeader, validateNoMergeInDataRange, validateSpecLimits } from "./validate";

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
  getColumnDataType,
  getColumnStringListOptions,
  getDefaultEnumOptions,
  getDefaultDataType,
  getMatrixDataTypeRanges,
  getRowDataType,
  getRowStringListOptions,
  isDynamicExcelEnumDataType,
  normalizeDataType,
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
]);

export type ExcelDesignerMode = "create" | "view" | "edit";

type ActiveTarget =
  | { kind: "HEADER" }
  | { kind: "DATA" }
  | { kind: "COLUMN"; index: number }
  | { kind: "ROW"; index: number }
  | { kind: "RANGE"; rect: RegionRect; id?: string };

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
  }) => void;
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

function validateNoDataInRect(sheet: any, rect: { r0: number; c0: number; r1: number; c1: number }) {
  const cdMap = buildCelldataMap(sheet);

  for (let r = rect.r0; r <= rect.r1; r++) {
    for (let c = rect.c0; c <= rect.c1; c++) {
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

function clampCount(v: any, max = 200) {
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

  const normalizeAndMarkWorkbook = (raw: any[], nextSpec: HeaderSpec, _nextActive: ActiveTarget | null) => {
    const nextTable = getTableRect(nextSpec);
    const rows = rectRows(nextTable);
    const cols = rectCols(nextTable);
    const normalized = normalizeToSingleSheet(raw, rows, cols);
    const sheet = normalized[0];
    if (!sheet) return normalized;

    stripMarksForSave(sheet, visualBackupRef.current, MARKED_BACKGROUNDS);
    visualBackupRef.current.clear();

    const nextRegions = computeRegions(nextSpec, nextTable);
    const headerRects = (nextRegions as any).headerRects?.length
      ? ((nextRegions as any).headerRects as RegionRect[])
      : [nextRegions.headerRect];

    for (const rect of headerRects) {
      markRect(sheet, toMarkRect(rect), MARK_COLORS.HEADER_BG, visualBackupRef.current);
    }
    markRect(sheet, toMarkRect(nextRegions.dataRect), MARK_COLORS.DATA_BG, visualBackupRef.current);

    return [{ ...sheet }];
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

  const settings = useMemo(() => {
    return {
      data: workbookData,
      row: workbookData?.[0]?.row,
      column: workbookData?.[0]?.column,
      allowEdit: canEdit,
      showSheetTabs: false,
      onChange: (data: any) => {
        if (!canEdit) return;
        if (Array.isArray(data)) workbookRef.current = data;
      },
    };
  }, [workbookData, canEdit]);

  const getNormalizedLatest = (s: HeaderSpec) => {
    const nextTable = getTableRect(s);
    const rows = rectRows(nextTable);
    const cols = rectCols(nextTable);
    const raw = workbookRef.current?.length ? workbookRef.current : workbookData;
    const normalized = normalizeToSingleSheet(raw, rows, cols);
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

    const normalizedSpec = normalizeSpecDataTypeMetadata(nextSpec);
    const v = validateSpecLimits(normalizedSpec);
    if (!v.ok) {
      setDlgOk(false);
      setDlgIssues(v.issues);
      setDlgOpen(true);
      return;
    }

    const layoutChanged = specLayoutKey(spec) !== specLayoutKey(normalizedSpec);
    setSpec(normalizedSpec);
    setTableMode((current) => normalizeTableModeForKind(current, normalizedSpec.kind));
    setActiveTarget(nextActive);

    if (layoutChanged) {
      const raw = workbookRef.current?.length ? workbookRef.current : workbookData;
      const nextWorkbook = normalizeAndMarkWorkbook(raw, normalizedSpec, nextActive);
      setWorkbookData(nextWorkbook);
      workbookRef.current = nextWorkbook;
      setWorkbookKey((k) => k + 1);
    }
  };

  const refresh = () => {
    if (!canEdit) return;
    const next = normalizeAndMarkWorkbook(createEmptyWorkbook(rectRows(table), rectCols(table)), spec, activeTarget);
    setWorkbookData(next);
    workbookRef.current = next;
    setWorkbookKey((k) => k + 1);
  };

  const save = () => {
    if (!canEdit) return;

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

    const { normalized } = getNormalizedLatest(specToSave);
    const normalizedForSave = normalizeToSingleSheet(normalized, rectRows(vlim.table), rectCols(vlim.table));
    const sheetForSave = normalizedForSave[0];

    if (!sheetForSave) {
      setDlgOk(false);
      setDlgIssues([{ code: "NO_SHEET", message: "Không lấy được Sheet1." }]);
      setDlgOpen(true);
      return;
    }

    stripMarksForSave(sheetForSave, visualBackupRef.current, MARKED_BACKGROUNDS);

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
    const dataIssues = validateNoDataInRect(sheetForSave, dataRect);
    if (dataIssues.length) {
      setDlgOk(false);
      setDlgIssues(dataIssues);
      setDlgOpen(true);
      return;
    }

    const merge = sheetForSave?.config?.merge ?? {};
    const mergeIssues = validateNoMergeInDataRange(merge, dataRect);
    if (mergeIssues.length) {
      setDlgOk(false);
      setDlgIssues(mergeIssues);
      setDlgOpen(true);
      return;
    }

    const values1D = extractNumericValues1D(sheetForSave, dataRect);

    setDlgOk(true);
    setDlgIssues([]);
    setDlgOpen(true);

    onSaved?.({
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
    });
  };

  const headerRangeText = useMemo(() => {
    const headerRects = (regions as any).headerRects?.length
      ? ((regions as any).headerRects as RegionRect[])
      : [regions.headerRect];
    return headerRects.map(formatRectRef).join(", ");
  }, [regions]);

  const dataRangeText = formatRectRef(regions.dataRect);
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
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh} disabled={!canEdit}>
              Làm mới bảng
            </Button>
            <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={save} disabled={!canEdit}>
              Lưu
            </Button>
          </Stack>
        )}
      </Stack>

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

          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
              <Chip
                size="small"
                label={`Tiêu đề: ${headerRangeText}`}
                sx={{ bgcolor: MARK_COLORS.HEADER_BG, color: "text.primary" }}
                onMouseEnter={() => setActiveTarget({ kind: "HEADER" })}
              />
              <Chip
                size="small"
                label={`Dữ liệu: ${dataRangeText}`}
                sx={{ bgcolor: MARK_COLORS.DATA_BG, color: "text.primary" }}
                onMouseEnter={() => setActiveTarget({ kind: "DATA" })}
              />
              <Chip size="small" variant="outlined" label={`Loại bảng: ${headerKindLabel(spec.kind)}`} />
              <Chip size="small" variant="outlined" label={`Kiểu nhập/tổng hợp: ${tableModeLabel(tableMode)}`} />
            </Stack>
            <Button
              variant="outlined"
              startIcon={<TuneOutlinedIcon />}
              onClick={() => setConfigOpen(true)}
              sx={{ flexShrink: 0 }}
            >
              {canEdit ? "Cấu hình kiểu dữ liệu" : "Xem kiểu dữ liệu"}
            </Button>
          </Stack>

          <Box
            className="tdtdSheet"
            sx={{
              flex: 1,
              minHeight: 0,
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 1,
              overflow: "hidden",
              "& .luckysheet-bottom-controll-row": { display: "none !important" },
              "& .fortune-sheettab-button": { display: "none !important" },
              "& .fortune-sheettab-container-c": { display: "none !important" },
            }}
          >
            {shouldRenderWorkbook ? <Workbook key={workbookKey} {...settings} /> : null}
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={configOpen}
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
            onSpecChange={setNextSpec}
            onActiveTargetChange={() => {}}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

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
                label="Số dòng tiêu đề"
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
                label="Số dòng dữ liệu"
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
                label="Số dòng dữ liệu"
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
                label="Số dòng tiêu đề trên"
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
                label="Số dòng dữ liệu"
                value={spec.leftRows}
                disabled={disabled}
                onFocus={() => onActiveTargetChange({ kind: "DATA" })}
                onChange={(value) => onSpecChange({ ...spec, leftRows: value }, { kind: "DATA" })}
              />
              <NumberField
                label="Số cột tiêu đề trái"
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

function DataTypeConfigPanel({
  spec,
  disabled,
  dataRect,
  onSpecChange,
  onActiveTargetChange,
}: {
  spec: HeaderSpec;
  disabled: boolean;
  dataRect: RegionRect;
  onSpecChange: (spec: HeaderSpec, active?: ActiveTarget | null) => void;
  onActiveTargetChange: (target: ActiveTarget | null) => void;
}) {
  const [selectedRect, setSelectedRect] = useState<RegionRect>(dataRect);

  useEffect(() => {
    setSelectedRect(dataRect);
  }, [dataRect.r0, dataRect.c0, dataRect.r1, dataRect.c1]);

  const handleSelect = (rect: RegionRect) => {
    const targetRect =
      spec.kind === "TOP"
        ? { r0: dataRect.r0, c0: rect.c0, r1: dataRect.r1, c1: rect.c0 }
        : spec.kind === "LEFT"
          ? { r0: rect.r0, c0: dataRect.c0, r1: rect.r0, c1: dataRect.c1 }
          : rect;
    setSelectedRect(targetRect);
    if (spec.kind === "TOP") onActiveTargetChange({ kind: "COLUMN", index: targetRect.c0 });
    else if (spec.kind === "LEFT") onActiveTargetChange({ kind: "ROW", index: targetRect.r0 });
    else onActiveTargetChange({ kind: "RANGE", rect: targetRect });
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(280px, 0.72fr) minmax(640px, 1.28fr)" },
        minHeight: 0,
      }}
    >
      <Box sx={{ p: 2, borderRight: { md: 1 }, borderColor: "divider", minWidth: 0 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight={850}>
            Bảng dữ liệu
          </Typography>
          <DataTypePreviewGrid
            spec={spec}
            dataRect={dataRect}
            selectedRect={selectedRect}
            disabled={disabled}
            onSelect={handleSelect}
          />
        </Stack>
      </Box>

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

          {spec.kind === "TOP" && (
            <ColumnTypeConfig
              spec={spec}
              dataRect={dataRect}
              disabled={disabled}
              onSpecChange={onSpecChange}
              onActiveTargetChange={onActiveTargetChange}
            />
          )}

          {spec.kind === "LEFT" && (
            <RowTypeConfig
              spec={spec}
              dataRect={dataRect}
              disabled={disabled}
              onSpecChange={onSpecChange}
              onActiveTargetChange={onActiveTargetChange}
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
            />
          )}
        </Stack>
      </Box>
    </Box>
  );
}

function DataTypePreviewGrid({
  spec,
  dataRect,
  selectedRect,
  disabled,
  onSelect,
}: {
  spec: HeaderSpec;
  dataRect: RegionRect;
  selectedRect: RegionRect;
  disabled: boolean;
  onSelect: (rect: RegionRect) => void;
}) {
  const [anchor, setAnchor] = useState<{ r: number; c: number } | null>(null);
  const rows = Array.from({ length: Math.min(rectRows(dataRect), 30) }, (_item, index) => dataRect.r0 + index);
  const columns = Array.from({ length: Math.min(rectCols(dataRect), 24) }, (_item, index) => dataRect.c0 + index);
  const truncated = rows.length < rectRows(dataRect) || columns.length < rectCols(dataRect);

  const makeRect = (r: number, c: number, start = anchor): RegionRect => {
    const a = start ?? { r, c };
    return {
      r0: Math.min(a.r, r),
      c0: Math.min(a.c, c),
      r1: Math.max(a.r, r),
      c1: Math.max(a.c, c),
    };
  };

  const isSelected = (r: number, c: number) =>
    r >= selectedRect.r0 && r <= selectedRect.r1 && c >= selectedRect.c0 && c <= selectedRect.c1;

  return (
    <Stack spacing={1}>
      <TableContainer sx={{ maxHeight: "min(46dvh, 420px)", border: 1, borderColor: "divider", borderRadius: 1 }}>
        <Table size="small" stickyHeader sx={{ tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, bgcolor: "background.paper" }} />
              {columns.map((columnIndex) => (
                <TableCell key={columnIndex} align="center" sx={{ width: 44, fontWeight: 850, px: 0.5 }}>
                  {formatColumnRef(columnIndex)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell sx={{ fontWeight: 850, bgcolor: "background.paper", px: 0.5 }}>{formatRowRef(rowIndex)}</TableCell>
                {columns.map((columnIndex) => {
                  const dataType = getCellDataType(spec, dataRect, rowIndex, columnIndex);
                  const selected = isSelected(rowIndex, columnIndex);
                  return (
                    <TableCell
                      key={columnIndex}
                      align="center"
                      onMouseDown={(event) => {
                        if (disabled) return;
                        event.preventDefault();
                        const point = { r: rowIndex, c: columnIndex };
                        setAnchor(point);
                        onSelect(makeRect(rowIndex, columnIndex, point));
                      }}
                      onMouseEnter={() => {
                        if (disabled || !anchor) return;
                        onSelect(makeRect(rowIndex, columnIndex));
                      }}
                      onMouseUp={() => setAnchor(null)}
                      sx={{
                        height: 26,
                        px: 0.25,
                        py: 0.25,
                        fontSize: "0.72rem",
                        cursor: disabled ? "default" : "crosshair",
                        bgcolor: DATA_TYPE_COLORS[dataType],
                        border: selected ? "2px solid" : "1px solid",
                        borderColor: selected ? "primary.main" : "divider",
                        userSelect: "none",
                      }}
                    >
                      {dataType === "NUMBER"
                        ? "N"
                        : dataType === "DATE"
                          ? "D"
                          : dataType === "FULL_DATE"
                            ? "DF"
                            : dataType === "BOOLEAN"
                              ? "B"
                              : "T"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {truncated && (
        <Alert severity="info" variant="outlined">
          Bản xem trước đang hiển thị tối đa 30 dòng và 24 cột đầu tiên của vùng dữ liệu.
        </Alert>
      )}
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {DATA_TYPE_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            size="small"
            label={option.label}
            sx={{ bgcolor: DATA_TYPE_COLORS[option.value], color: "text.primary" }}
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
  return (
    <TextField
      size="small"
      label={label}
      type="number"
      value={value}
      disabled={disabled}
      onFocus={onFocus}
      onChange={(event) => onChange(clampCount(event.target.value))}
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

function StringListOptionsField({
  value,
  dataType,
  disabled,
  onFocus,
  onChange,
}: {
  value: Array<{ code: string; label: string }>;
  dataType: DynamicExcelDataType;
  disabled: boolean;
  onFocus?: () => void;
  onChange: (value: Array<{ code: string; label: string }>) => void;
}) {
  const options = normalizeStringListOptions(value);
  const optionNoun = dataType === "SHORT_TEXT" ? "nội dung" : "lựa chọn";
  const commit = (nextOptions: Array<{ code: string; label: string }>) => {
    onChange(normalizeStringListOptions(nextOptions));
  };

  const addOption = () => {
    const nextIndex = options.length + 1;
    const [base] = getDefaultEnumOptions(dataType);
    commit([
      ...options,
      {
        code: dataType === "SHORT_TEXT" && nextIndex === 1 ? base.code : `OPT_${nextIndex}`,
        label: dataType === "SHORT_TEXT"
          ? nextIndex === 1
            ? base.label
            : `${base.label} ${nextIndex}`
          : `Lựa chọn ${nextIndex}`,
      },
    ]);
  };

  const updateOption = (
    index: number,
    patch: Partial<{ code: string; label: string }>,
  ) => {
    commit(
      options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    );
  };

  const removeOption = (index: number) => {
    commit(options.filter((_option, optionIndex) => optionIndex !== index));
  };

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {dataType === "SHORT_TEXT" ? "Nội dung" : "Lựa chọn"}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Reporter chọn theo danh sách enum cố định; hệ thống lưu mã để thống kê.
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

      {options.length === 0 ? (
        <Alert severity="warning">
          Cần thêm ít nhất một {optionNoun} trước khi lưu kiểu enum cố định.
        </Alert>
      ) : null}

      <Stack spacing={0.75}>
        {options.map((option, index) => (
          <Stack
            key={`${option.code}_${index}`}
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
              sx={{ flex: { sm: "0 0 160px" } }}
            />
            <TextField
              size="small"
              label="Nội dung"
              value={option.label}
              disabled={disabled}
              onFocus={onFocus}
              onChange={(event) => updateOption(index, { label: event.target.value })}
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
      </Stack>
    </Stack>
  );
}

function ColumnTypeConfig({
  spec,
  dataRect,
  disabled,
  onSpecChange,
  onActiveTargetChange,
}: {
  spec: HeaderSpec;
  dataRect: RegionRect;
  disabled: boolean;
  onSpecChange: (spec: HeaderSpec, active?: ActiveTarget | null) => void;
  onActiveTargetChange: (target: ActiveTarget | null) => void;
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
                  onMouseEnter={() => onActiveTargetChange({ kind: "COLUMN", index: columnIndex })}
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
                            disabled={disabled}
                            onFocus={() => onActiveTargetChange({ kind: "COLUMN", index: columnIndex })}
                            onChange={(options) =>
                              onSpecChange(setColumnStringListOptions(spec, columnIndex, options, dataType), {
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
}: {
  spec: HeaderSpec;
  dataRect: RegionRect;
  disabled: boolean;
  onSpecChange: (spec: HeaderSpec, active?: ActiveTarget | null) => void;
  onActiveTargetChange: (target: ActiveTarget | null) => void;
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
                  onMouseEnter={() => onActiveTargetChange({ kind: "ROW", index: rowIndex })}
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
                            disabled={disabled}
                            onFocus={() => onActiveTargetChange({ kind: "ROW", index: rowIndex })}
                            onChange={(options) =>
                              onSpecChange(setRowStringListOptions(spec, rowIndex, options, dataType), {
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
}: {
  spec: HeaderSpec;
  dataRect: RegionRect;
  selectedRect: RegionRect;
  disabled: boolean;
  onSpecChange: (spec: HeaderSpec, active?: ActiveTarget | null) => void;
  onActiveTargetChange: (target: ActiveTarget | null) => void;
}) {
  const ranges = getMatrixDataTypeRanges(spec, dataRect);
  const selectedType = getCellDataType(spec, dataRect, selectedRect.r0, selectedRect.c0);

  const applyType = (dataType: DynamicExcelDataType) => {
    const nextSpec = setMatrixRangeDataType(spec, dataRect, selectedRect, dataType);
    onSpecChange(nextSpec, { kind: "RANGE", rect: selectedRect });
  };

  return (
    <Stack spacing={1}>
      <Typography variant="body2" fontWeight={750}>
        Vùng dữ liệu ma trận
      </Typography>
      <DataTypeSelect
        label={`Vùng đang chọn ${formatRectRef(selectedRect)}`}
        value={selectedType}
        disabled={disabled}
        onFocus={() => onActiveTargetChange({ kind: "RANGE", rect: selectedRect })}
        onChange={applyType}
      />
      {isDynamicExcelEnumDataType(selectedType) && (
        <StringListOptionsField
          value={getCellStringListOptions(spec, dataRect, selectedRect.r0, selectedRect.c0)}
          dataType={selectedType}
          disabled={disabled}
          onFocus={() => onActiveTargetChange({ kind: "RANGE", rect: selectedRect })}
          onChange={(options) =>
            onSpecChange(setMatrixRangeStringListOptions(spec, dataRect, selectedRect, options, selectedType), {
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
            {ranges.map((range) => (
              <TableRow
                key={range.id ?? formatRectRef(range)}
                hover
                onMouseEnter={() => onActiveTargetChange({ kind: "RANGE", id: range.id, rect: range })}
              >
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant="body2" fontWeight={650}>{formatRectRef(range)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {rectRows(range)} x {rectCols(range)}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={dataTypeLabel(range.dataType)}
                    sx={{ bgcolor: DATA_TYPE_COLORS[range.dataType], color: "text.primary" }}
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
