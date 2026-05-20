import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Workbook } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";
import type { Sheet } from "@fortune-sheet/core";

import {
  extractTypedValues1D,
  type WorkbookCellValue,
  type WorkbookValueValidationIssue,
} from "./fortuneAdapter";
import {
  getCellDataType,
  getCellStringListOptions,
  isDynamicExcelEnumDataType,
  normalizeSpecDataTypeMetadata,
} from "./dataTypes";
import { cloneDeepJson, ensureWorkbookShape, type ReportRect } from "./reportWorkbook";
import { computeRegions, getTableRect, type Rect as RegionRect } from "./regions";
import type { DynamicExcelDataType, DynamicExcelStringListOption, HeaderSpec } from "./types";
import { MARK_COLORS, markRect, type Backup, type Rect as MarkRect } from "./designerMarking";

export type WorkbookDataGridMode = "edit" | "view";

export interface WorkbookDataGridSavePayload {
  rawWorkbookData: Sheet[];
  values1D: WorkbookCellValue[];
  validationIssues: WorkbookValueValidationIssue[];
}

export interface WorkbookDataGridProps {
  initialSpec: any;
  initialWorkbookData: Sheet[];
  dataRect: ReportRect;

  mode?: WorkbookDataGridMode;
  readOnly?: boolean;
  saving?: boolean;

  showActions?: boolean;
  saveLabel?: string;
  backLabel?: string;
  excludedDataColumns?: number[];

  onBack?: () => void;
  onChangeRaw?: (workbookData: Sheet[], payload?: WorkbookDataGridSavePayload) => void;
  onSave?: (payload: WorkbookDataGridSavePayload) => void;
}

export default function WorkbookDataGrid(props: WorkbookDataGridProps) {
  const {
    initialSpec,
    initialWorkbookData,
    dataRect,

    mode = "edit",
    readOnly = false,
    saving = false,

    showActions = true,
    saveLabel = "Lưu draft",
    backLabel = "Quay lại",

    excludedDataColumns = [],

    onBack,
    onChangeRaw,
    onSave,
  } = props;

  const isView = mode === "view" || readOnly;

  const [workbookData, setWorkbookData] = React.useState<Sheet[]>(
    () => buildGridWorkbook(initialWorkbookData, dataRect, initialSpec, isView)
  );

  const workbookRef = React.useRef<Sheet[]>(workbookData);
  const [workbookKey, setWorkbookKey] = React.useState(0);
  const [shouldRenderWorkbook, setShouldRenderWorkbook] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const cloned = buildGridWorkbook(initialWorkbookData, dataRect, initialSpec, isView);
    setWorkbookData(cloned);
    workbookRef.current = cloned;
    setWorkbookKey((x) => x + 1);
    setError(null);
  }, [initialWorkbookData, dataRect, initialSpec, isView]);

  React.useEffect(() => {
    setShouldRenderWorkbook(false);
    const id = window.requestAnimationFrame(() => {
      setShouldRenderWorkbook(true);
    });

    return () => window.cancelAnimationFrame(id);
  }, [workbookKey]);

  const settings = React.useMemo(() => {
    return {
      data: workbookData as Sheet[],
      row: workbookData?.[0]?.row,
      column: workbookData?.[0]?.column,
      allowEdit: !isView,
      showSheetTabs: false,
      hooks: {
        beforeRenderCell: (cell: any, cellInfo: FortuneCellRenderInfo, renderCtx: CanvasRenderingContext2D) =>
          renderMultiSelectChipsCell(
            cell,
            cellInfo,
            renderCtx,
            dataRect,
            excludedDataColumns,
            initialSpec,
          ),
      },
      onChange: (data: any) => {
        if (isView) return;
        if (Array.isArray(data)) {
          const nextWorkbookData = data as Sheet[];
          workbookRef.current = nextWorkbookData;
          setWorkbookData(nextWorkbookData);
          onChangeRaw?.(
            nextWorkbookData,
            buildWorkbookSavePayload(nextWorkbookData, dataRect, excludedDataColumns, initialSpec) ?? undefined,
          );
        }
      },
    };
  }, [workbookData, dataRect, excludedDataColumns, initialSpec, isView, onChangeRaw]);

  const enumCells = React.useMemo(
    () => buildEnumCellOptions(workbookData, dataRect, excludedDataColumns, initialSpec),
    [workbookData, dataRect, excludedDataColumns, initialSpec],
  );

  const handleEnumCellChange = React.useCallback(
    (cell: EnumCellOption, nextValue: unknown) => {
      if (isView) return;

      setError(null);
      setWorkbookData((prev) => {
        const next = setWorkbookEnumCell(prev, cell.r, cell.c, cell.options, cell.dataType, nextValue);
        workbookRef.current = next;
        const payload = buildWorkbookSavePayload(next, dataRect, excludedDataColumns, initialSpec);
        onChangeRaw?.(next, payload ?? undefined);
        return next;
      });
      setWorkbookKey((x) => x + 1);
    },
    [dataRect, excludedDataColumns, initialSpec, isView, onChangeRaw],
  );

  const handleSave = React.useCallback(() => {
    try {
      setError(null);

      const latestRaw =
        Array.isArray(workbookRef.current) && workbookRef.current.length > 0
          ? workbookRef.current
          : workbookData;

      const payload = buildWorkbookSavePayload(latestRaw, dataRect, excludedDataColumns, initialSpec);
      if (!payload) {
        throw new Error("Không lấy được dữ liệu sheet để lưu.");
      }
      if (payload.validationIssues.length > 0) {
        throw new Error(payload.validationIssues[0].message);
      }

      onSave?.(payload);
    } catch (e: any) {
      setError(e?.message || "Không thể chuẩn bị dữ liệu để lưu.");
    }
  }, [workbookData, dataRect, excludedDataColumns, initialSpec, onSave]);

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      {error && <Alert severity="error">{error}</Alert>}

      <Card
        variant="outlined"
        sx={{ flex: 1, minHeight: 350, display: "flex", flexDirection: "column" }}
      >
        <CardContent
          sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}
        >
          <Box
            className="tdtdSheet"
            sx={{
              width: "100%",
              height: 350,
              minHeight: 350,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 2,
              "& .luckysheet-bottom-controll-row": {
                display: "none !important",
              },
              "& .fortune-sheettab-button": {
                display: "none !important",
              },
            }}
          >
            {shouldRenderWorkbook ? (
              <Workbook key={workbookKey} {...settings} />
            ) : (
              <Stack sx={{ height: "100%" }} alignItems="center" justifyContent="center">
                <CircularProgress size={24} />
              </Stack>
            )}
          </Box>

          {showActions && (
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
              <Button variant="outlined" onClick={onBack}>
                {backLabel}
              </Button>

              <Button
                variant="contained"
                onClick={handleSave}
                disabled={isView || saving}
              >
                {saveLabel}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {enumCells.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography fontWeight={700}>Enum cố định trong bảng</Typography>
                <Chip size="small" variant="outlined" label={`${enumCells.length} ô`} />
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  gap: 1,
                  maxHeight: 260,
                  overflow: "auto",
                }}
              >
                {enumCells.map((cell) => {
                  const isMulti = cell.dataType === "MULTI_SELECT";
                  const selectedCodes = Array.isArray(cell.value)
                    ? cell.value
                    : cell.value
                      ? [cell.value]
                      : [];

                  return (
                    <TextField
                      key={`${cell.r}:${cell.c}`}
                      select
                      size="small"
                      label={cell.cellRef}
                      value={cell.value}
                      disabled={isView || cell.options.length === 0}
                      helperText={cell.options.length === 0 ? "Chưa cấu hình options." : isMulti ? "Chọn một hoặc nhiều giá trị từ danh sách đã cấu hình." : "Chọn một giá trị từ danh sách đã cấu hình."}
                      onChange={(event) => handleEnumCellChange(cell, event.target.value)}
                      SelectProps={{
                        multiple: isMulti,
                        renderValue: isMulti
                          ? (selected) => {
                              const values = Array.isArray(selected) ? selected.map(String) : [];
                              return (
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                  {values.map((code) => {
                                    const option = cell.options.find((item) => item.code === code);
                                    return (
                                      <Chip
                                        key={code}
                                        size="small"
                                        label={option?.label || code}
                                      />
                                    );
                                  })}
                                </Box>
                              );
                            }
                          : undefined,
                      }}
                    >
                      {!isMulti && (
                        <MenuItem value="">
                          <em>Để trống</em>
                        </MenuItem>
                      )}
                      {cell.options.map((option) => (
                        <MenuItem key={option.code} value={option.code}>
                          {isMulti && <Checkbox size="small" checked={selectedCodes.includes(option.code)} />}
                          {option.label || option.code}
                        </MenuItem>
                      ))}
                    </TextField>
                  );
                })}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

type EnumCellOption = {
  r: number;
  c: number;
  cellRef: string;
  dataType: DynamicExcelDataType;
  value: string | string[];
  options: DynamicExcelStringListOption[];
};

type FortuneCellRenderInfo = {
  row: number;
  column: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

function buildEnumCellOptions(
  workbookData: Sheet[],
  dataRect: ReportRect,
  excludedDataColumns: number[],
  spec: HeaderSpec | null | undefined,
): EnumCellOption[] {
  if (!isHeaderSpec(spec)) return [];

  const normalizedSpec = normalizeSpecDataTypeMetadata(spec);
  const excluded = buildExcludedColumnSet(excludedDataColumns);
  const sheet = workbookData?.[0] as any;
  const grid: any[][] = Array.isArray(sheet?.data) ? sheet.data : [];
  const cells: EnumCellOption[] = [];

  for (let r = dataRect.r0; r <= dataRect.r1; r += 1) {
    const row = grid[r] ?? [];
    for (let c = dataRect.c0; c <= dataRect.c1; c += 1) {
      if (excluded.has(c)) continue;
      const dataType = getCellDataType(normalizedSpec, dataRect, r, c);
      if (!isDynamicExcelEnumDataType(dataType)) continue;

      const options = getCellStringListOptions(normalizedSpec, dataRect, r, c);
      const raw = getWorkbookCellText(row[c]);
      const value = dataType === "MULTI_SELECT"
        ? resolveStringListOptions(raw, options).map((option) => option.code)
        : resolveStringListOption(raw, options)?.code ?? "";
      cells.push({
        r,
        c,
        cellRef: toExcelRef(r, c),
        dataType,
        value,
        options,
      });
    }
  }

  return cells;
}

function setWorkbookEnumCell(
  workbookData: Sheet[],
  r: number,
  c: number,
  options: DynamicExcelStringListOption[],
  dataType: DynamicExcelDataType,
  value: unknown,
): Sheet[] {
  const next = cloneDeepJson(workbookData) as Sheet[];
  const sheet = next[0] as any;
  if (!sheet) return next;

  if (!Array.isArray(sheet.data)) sheet.data = [];
  if (!Array.isArray(sheet.data[r])) sheet.data[r] = [];

  const selected = resolveSelectedEnumOptions(options, dataType, value);
  const codeText = selected.map((option) => option.code).join("; ");
  const labelText = selected.map((option) => option.label || option.code).join("; ");
  const nextCell = selected.length > 0
    ? {
        ...(sheet.data[r][c] && typeof sheet.data[r][c] === "object" ? sheet.data[r][c] : {}),
        v: codeText,
        m: labelText,
      }
    : null;

  sheet.data[r][c] = nextCell;
  sheet.celldata = upsertCelldataCell(sheet.celldata, r, c, nextCell);
  return next;
}

function renderMultiSelectChipsCell(
  cell: any,
  cellInfo: FortuneCellRenderInfo,
  renderCtx: CanvasRenderingContext2D,
  dataRect: ReportRect,
  excludedDataColumns: number[],
  spec: HeaderSpec | null | undefined,
) {
  if (!isHeaderSpec(spec)) return true;

  const r = Number(cellInfo.row);
  const c = Number(cellInfo.column);
  if (!Number.isInteger(r) || !Number.isInteger(c)) return true;
  if (r < dataRect.r0 || r > dataRect.r1 || c < dataRect.c0 || c > dataRect.c1) return true;
  if (buildExcludedColumnSet(excludedDataColumns).has(c)) return true;

  const normalizedSpec = normalizeSpecDataTypeMetadata(spec);
  if (getCellDataType(normalizedSpec, dataRect, r, c) !== "MULTI_SELECT") return true;

  const options = getCellStringListOptions(normalizedSpec, dataRect, r, c);
  const selected = resolveStringListOptions(getWorkbookCellText(cell), options);
  if (selected.length === 0) return true;

  drawMultiSelectChips(renderCtx, cellInfo, cell, selected);
  return false;
}

function drawMultiSelectChips(
  ctx: CanvasRenderingContext2D,
  cellInfo: FortuneCellRenderInfo,
  cell: any,
  selected: DynamicExcelStringListOption[],
) {
  const x = Math.min(cellInfo.startX, cellInfo.endX);
  const y = Math.min(cellInfo.startY, cellInfo.endY);
  const width = Math.abs(cellInfo.endX - cellInfo.startX);
  const height = Math.abs(cellInfo.endY - cellInfo.startY);
  if (width <= 0 || height <= 0) return;

  const background = typeof cell?.bg === "string" && cell.bg.trim() ? cell.bg : "#fff";
  const contentX = x + 4;
  const contentY = y + 2;
  const contentRight = x + width - 4;
  const chipHeight = Math.max(14, Math.min(20, height - 5));
  const chipY = y + Math.max(2, (height - chipHeight) / 2);
  const fontSize = Math.max(10, Math.min(12, chipHeight - 7));
  const colors = ["#e3f2fd", "#e8f5e9", "#fff3e0", "#f3e5f5", "#e0f2f1"];

  ctx.save();
  ctx.fillStyle = background;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + width - 0.5, y);
  ctx.lineTo(x + width - 0.5, y + height);
  ctx.moveTo(x, y + height - 0.5);
  ctx.lineTo(x + width, y + height - 0.5);
  ctx.stroke();
  ctx.closePath();

  ctx.beginPath();
  ctx.rect(contentX, contentY, Math.max(0, contentRight - contentX), Math.max(0, height - 4));
  ctx.clip();
  ctx.font = `${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = "middle";

  let cursorX = contentX;
  let hidden = 0;
  for (let index = 0; index < selected.length; index += 1) {
    const option = selected[index];
    const label = option.label || option.code;
    const textWidth = ctx.measureText(label).width;
    const chipWidth = Math.ceil(textWidth + 14);
    const remaining = contentRight - cursorX;

    if (remaining < 22) {
      hidden = selected.length - index;
      break;
    }

    if (chipWidth > remaining) {
      if (index === 0) {
        const fittedLabel = fitCanvasText(ctx, label, Math.max(8, remaining - 14));
        drawCanvasChip(ctx, cursorX, chipY, remaining, chipHeight, fittedLabel, colors[index % colors.length]);
        hidden = selected.length - 1;
      } else {
        hidden = selected.length - index;
      }
      break;
    }

    drawCanvasChip(ctx, cursorX, chipY, chipWidth, chipHeight, label, colors[index % colors.length]);
    cursorX += chipWidth + 4;
  }

  if (hidden > 0 && contentRight - cursorX >= 26) {
    const label = `+${hidden}`;
    const chipWidth = Math.min(contentRight - cursorX, Math.ceil(ctx.measureText(label).width + 14));
    drawCanvasChip(ctx, cursorX, chipY, chipWidth, chipHeight, label, "#eceff1");
  }

  ctx.restore();
}

function drawCanvasChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  fill: string,
) {
  const radius = Math.min(8, height / 2);
  ctx.fillStyle = fill;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.14)";
  ctx.lineWidth = 1;
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1f2933";
  ctx.fillText(label, x + 7, y + height / 2);
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fitCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const suffix = "...";
  let next = text;
  while (next.length > 1 && ctx.measureText(`${next}${suffix}`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}${suffix}`;
}

function resolveSelectedEnumOptions(
  options: DynamicExcelStringListOption[],
  dataType: DynamicExcelDataType,
  value: unknown,
) {
  const rawCodes = dataType === "MULTI_SELECT"
    ? Array.isArray(value) ? value.map(String) : String(value ?? "").split(";")
    : [String(value ?? "")];
  const wanted = rawCodes.map((item) => item.trim()).filter(Boolean);
  const seen = new Set<string>();
  const selected: DynamicExcelStringListOption[] = [];

  for (const code of wanted) {
    const option = options.find((item) => item.code === code);
    if (!option) continue;

    const key = option.code.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(option);
  }

  return selected;
}

function upsertCelldataCell(celldata: unknown, r: number, c: number, cell: unknown) {
  const rows = Array.isArray(celldata) ? cloneDeepJson(celldata) as any[] : [];
  const index = rows.findIndex((item) => Number(item?.r) === r && Number(item?.c) === c);
  if (cell == null) {
    return index >= 0 ? rows.filter((_item, itemIndex) => itemIndex !== index) : rows;
  }

  const nextItem = { r, c, v: cell };
  if (index >= 0) rows[index] = nextItem;
  else rows.push(nextItem);
  return rows;
}

function resolveStringListOption(
  raw: string,
  options: DynamicExcelStringListOption[],
): DynamicExcelStringListOption | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  return options.find((option) =>
    option.code.trim().toLowerCase() === normalized ||
    option.label.trim().toLowerCase() === normalized
  ) ?? null;
}

function resolveStringListOptions(
  raw: string,
  options: DynamicExcelStringListOption[],
): DynamicExcelStringListOption[] {
  const seen = new Set<string>();
  const resolved: DynamicExcelStringListOption[] = [];
  for (const item of splitEnumCellText(raw)) {
    const option = resolveStringListOption(item, options);
    if (!option) continue;

    const key = option.code.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push(option);
  }
  return resolved;
}

function splitEnumCellText(raw: string) {
  return raw
    .split(/[;\n]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getWorkbookCellText(cell: any): string {
  const pick = (value: unknown) => (value == null ? "" : String(value));
  if (cell == null) return "";
  if (typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean") {
    return pick(cell).trim();
  }
  if (cell.m != null) return pick(cell.m).trim();
  if (cell.v != null) return pick(cell.v).trim();
  if (cell.ct?.s != null) return pick(cell.ct.s).trim();
  return "";
}

function toExcelRef(r: number, c: number) {
  return `${toExcelColumn(c)}${r + 1}`;
}

function toExcelColumn(c: number) {
  let text = "";
  let n = Math.max(0, Math.floor(c)) + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    text = String.fromCharCode(65 + mod) + text;
    n = Math.floor((n - 1) / 26);
  }
  return text;
}

function buildWorkbookSavePayload(
  workbookData: Sheet[],
  dataRect: ReportRect,
  excludedDataColumns: number[],
  spec: HeaderSpec | null | undefined,
): WorkbookDataGridSavePayload | null {
  const normalized = normalizeWorkbookForGrid(workbookData, dataRect);
  const sheet = normalized?.[0];
  if (!sheet) return null;
  const extracted = extractTypedValues1D(sheet, dataRect, spec);
  const excluded = buildExcludedColumnSet(excludedDataColumns);

  return {
    rawWorkbookData: normalized,
    values1D: applyExcludedDataColumns(
      extracted.values1D,
      dataRect,
      excludedDataColumns,
    ),
    validationIssues: extracted.issues.filter((issue) => !excluded.has(issue.c)),
  };
}

function applyExcludedDataColumns(
  values1D: WorkbookCellValue[],
  dataRect: ReportRect,
  excludedDataColumns: number[],
) {
  if (!excludedDataColumns.length || values1D.length === 0) return values1D;

  const excluded = buildExcludedColumnSet(excludedDataColumns);
  if (excluded.size === 0) return values1D;

  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (width <= 0 || height <= 0) return values1D;

  const next = values1D.slice();
  for (let rr = 0; rr < height; rr++) {
    for (let cc = 0; cc < width; cc++) {
      const absoluteCol = dataRect.c0 + cc;
      if (excluded.has(absoluteCol)) {
        next[rr * width + cc] = null;
      }
    }
  }

  return next;
}

function buildExcludedColumnSet(excludedDataColumns: number[]) {
  return new Set(
    excludedDataColumns
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0),
  );
}

function normalizeWorkbookForGrid(workbookData: Sheet[] | undefined | null, dataRect: ReportRect) {
  const rows = Math.max(
    1,
    getWorkbookRowCount(workbookData),
    Number(dataRect?.r1 ?? -1) + 1,
  );
  const cols = Math.max(
    1,
    getWorkbookColumnCount(workbookData),
    Number(dataRect?.c1 ?? -1) + 1,
  );

  return cloneDeepJson(ensureWorkbookShape(workbookData ?? [], rows, cols)) as Sheet[];
}

function getWorkbookRowCount(workbookData: Sheet[] | undefined | null) {
  const sheet: any = Array.isArray(workbookData) ? workbookData[0] : null;
  const fromRow = typeof sheet?.row === "number" ? sheet.row : 0;
  const fromData = Array.isArray(sheet?.data) ? sheet.data.length : 0;
  const fromCelldata = Array.isArray(sheet?.celldata)
    ? Math.max(
        0,
        ...sheet.celldata.map((item: any) => (typeof item?.r === "number" ? item.r + 1 : 0)),
      )
    : 0;

  return Math.max(fromRow, fromData, fromCelldata, 0);
}

function getWorkbookColumnCount(workbookData: Sheet[] | undefined | null) {
  const sheet: any = Array.isArray(workbookData) ? workbookData[0] : null;
  const fromColumn = typeof sheet?.column === "number" ? sheet.column : 0;
  const fromData = Array.isArray(sheet?.data)
    ? Math.max(0, ...sheet.data.map((row: any) => (Array.isArray(row) ? row.length : 0)))
    : 0;
  const fromCelldata = Array.isArray(sheet?.celldata)
    ? Math.max(
        0,
        ...sheet.celldata.map((item: any) => (typeof item?.c === "number" ? item.c + 1 : 0)),
      )
    : 0;

  return Math.max(fromColumn, fromData, fromCelldata, 0);
}

function buildGridWorkbook(
  workbookData: Sheet[] | undefined | null,
  dataRect: ReportRect,
  spec: unknown,
  markPreview: boolean,
) {
  const normalized = normalizeWorkbookForGrid(workbookData, dataRect);
  return markPreview ? markPreviewRegions(normalized, spec, dataRect) : normalized;
}

function markPreviewRegions(workbookData: Sheet[], spec: unknown, dataRect: ReportRect) {
  const cloned = cloneDeepJson(workbookData) as Sheet[];
  const sheet = cloned[0] as any;
  if (!sheet) return cloned;

  const backup = new Map<string, Backup>();
  const headerRects = getHeaderRects(spec);
  for (const rect of headerRects) {
    markRect(sheet, toMarkRect(rect), MARK_COLORS.HEADER_BG, backup);
  }
  markRect(sheet, toMarkRect(dataRect), MARK_COLORS.DATA_BG, backup);

  return cloned;
}

function getHeaderRects(spec: unknown): RegionRect[] {
  if (!isHeaderSpec(spec)) return [];
  try {
    const table = getTableRect(spec);
    const regions = computeRegions(spec, table);
    return (regions as any).headerRects?.length
      ? ((regions as any).headerRects as RegionRect[])
      : [regions.headerRect];
  } catch {
    return [];
  }
}

function isHeaderSpec(spec: unknown): spec is HeaderSpec {
  const kind = (spec as { kind?: unknown } | null)?.kind;
  return kind === "TOP" || kind === "LEFT" || kind === "MATRIX";
}

function toMarkRect(rect: ReportRect): MarkRect {
  return { r0: rect.r0, c0: rect.c0, r1: rect.r1, c1: rect.c1 };
}
