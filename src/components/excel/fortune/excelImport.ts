import type { HeaderSpec } from "./types";
import { computeRegions, getTableRect, rectCols, rectRows } from "./regions";
import { DESIGNER_LIMITS } from "./validate";
import { sanitizeMergeBorderInfo, syncFormulaCalcChain } from "./normalizeWorkbook";
import { compressCellsToSpecialRanges, normalizeSpecialRanges } from "./specialRanges";

export type ExcelImportSourceRange = {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
};

export type ImportedDynamicExcelWorkbook = {
  workbookData: any[];
  spec: HeaderSpec;
  summary: {
    sheetName: string;
    rows: number;
    cols: number;
    sourceRows: number;
    sourceCols: number;
    formulaCells: number;
    blankCells: number;
    titleCells: number;
    sourceRange: ExcelImportSourceRange;
  };
};

export type DynamicExcelImportPreview = {
  workbookData: any[];
  summary: {
    sheetName: string;
    rows: number;
    cols: number;
    sourceRows: number;
    sourceCols: number;
    detectedSourceRange: ExcelImportSourceRange;
    detectionMode: "END_MARKER";
  };
};

const BORDER_STYLE_CODES: Record<string, number> = {
  thin: 1,
  hair: 2,
  dotted: 3,
  dashed: 4,
  dashDot: 5,
  dashDotDot: 6,
  double: 7,
  medium: 8,
  mediumDashed: 9,
  mediumDashDot: 10,
  mediumDashDotDot: 11,
  slantDashDot: 12,
  thick: 13,
};

const BORDER_SIDE_KEYS: Record<string, string> = {
  left: "l",
  right: "r",
  top: "t",
  bottom: "b",
};

const MAX_IMPORT_PREVIEW_CELLS = DESIGNER_LIMITS.MAX_SHEET_CELLS;
const CSS_PIXELS_PER_POINT = 96 / 72;
const DEFAULT_IMPORT_ROW_HEIGHT_PX = 22;
const DEFAULT_IMPORT_COLUMN_WIDTH_PX = 73;
const MAX_IMPORT_ROW_HEIGHT_PX = 180;
const WRAP_CELL_HORIZONTAL_PADDING_PX = 8;
const TEXT_CELL_VERTICAL_PADDING_PX = 8;
const WRAP_LINE_HEIGHT_MULTIPLIER = 1.22;

export async function importXlsxForDynamicExcelSpec(
  file: File,
  spec: HeaderSpec,
  options: { sourceRange?: ExcelImportSourceRange } = {},
): Promise<ImportedDynamicExcelWorkbook> {
  const workbook = await loadExcelWorkbook(file);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("File Excel không có sheet để nhập.");
  }

  const detected = detectWorksheetImportRange(worksheet);
  const table = getTableRect(spec);
  const rows = rectRows(table);
  const cols = rectCols(table);
  const sourceRange = normalizeSourceRange(options.sourceRange ?? detected.sourceRange, rows, cols);
  if (!sameSourceRange(sourceRange, detected.sourceRange)) {
    throw new Error("Vùng import phải khớp với vùng được xác định bởi 2 marker #END.");
  }
  const importedSheet = buildFortuneSheetFromWorksheet(worksheet, rows, cols, sourceRange, spec);
  const formulaCells: Array<{ r: number; c: number }> = [];
  const blankCells: Array<{ r: number; c: number }> = [];
  const titleCells: Array<{ r: number; c: number }> = [];
  const markedCells = new Set<string>();
  const data = importedSheet.data;

  const dataRect = computeRegions(spec, table).dataRect;
  const mergeRects = buildShiftedMergeRects(worksheet, sourceRange);
  const addMarkedCells = (target: Array<{ r: number; c: number }>, r: number, c: number) => {
    const rect = getSpecialMarkRectForCell(r, c, mergeRects, dataRect);
    for (let rr = rect.r0; rr <= rect.r1; rr += 1) {
      for (let cc = rect.c0; cc <= rect.c1; cc += 1) {
        const key = `${rr}:${cc}`;
        if (markedCells.has(key)) continue;
        markedCells.add(key);
        target.push({ r: rr, c: cc });
      }
    }
  };

  for (let r = dataRect.r0; r <= dataRect.r1; r += 1) {
    for (let c = dataRect.c0; c <= dataRect.c1; c += 1) {
      const obj = data[r]?.[c];
      const sourceCell = worksheet.getCell(sourceRange.r0 + r + 1, sourceRange.c0 + c + 1) as any;
      if (obj?.f) {
        addMarkedCells(formulaCells, r, c);
      } else if (isBlankMarkerCell(sourceCell, obj)) {
        addMarkedCells(blankCells, r, c);
        clearMarkedCellDisplay(data, r, c, mergeRects, dataRect);
      } else if (isTitleTextCell(sourceCell, obj)) {
        addMarkedCells(titleCells, r, c);
      }
    }
  }

  const specialRanges = normalizeSpecialRanges([
    ...compressCellsToSpecialRanges(formulaCells, "FORMULA", "import_formula"),
    ...compressCellsToSpecialRanges(blankCells, "BLANK", "import_blank"),
    ...compressCellsToSpecialRanges(titleCells, "TITLE", "import_title"),
  ]);

  return {
    workbookData: [importedSheet],
    spec: {
      ...spec,
      specialRanges,
    },
    summary: {
      sheetName: worksheet.name || "Sheet1",
      rows,
      cols,
      sourceRows: Math.max(Number(worksheet.actualRowCount || worksheet.rowCount || 0), rows),
      sourceCols: Math.max(Number(worksheet.actualColumnCount || worksheet.columnCount || 0), cols),
      formulaCells: formulaCells.length,
      blankCells: blankCells.length,
      titleCells: titleCells.length,
      sourceRange,
    },
  };
}

export async function previewXlsxForDynamicExcelImport(file: File): Promise<DynamicExcelImportPreview> {
  const workbook = await loadExcelWorkbook(file);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("File Excel không có sheet để nhập.");
  }

  const detected = detectWorksheetImportRange(worksheet);
  const sourceRows = Math.max(1, detected.previewRows);
  const sourceCols = Math.max(1, detected.previewCols);
  assertPreviewSize(sourceRows, sourceCols);
  const workbookData = [
    buildFortuneSheetFromWorksheet(worksheet, sourceRows, sourceCols, {
      r0: 0,
      c0: 0,
      r1: sourceRows - 1,
      c1: sourceCols - 1,
    }),
  ];

  return {
    workbookData,
    summary: {
      sheetName: worksheet.name || "Sheet1",
      rows: sourceRows,
      cols: sourceCols,
      sourceRows,
      sourceCols,
      detectedSourceRange: detected.sourceRange,
      detectionMode: detected.mode,
    },
  };
}

function assertPreviewSize(rows: number, cols: number) {
  const cells = rows * cols;
  if (cells <= MAX_IMPORT_PREVIEW_CELLS) return;

  throw new Error(
    `Vùng preview Excel quá lớn (${cols} cột x ${rows} dòng = ${cells} ô). Giới hạn ${MAX_IMPORT_PREVIEW_CELLS} ô. Hãy đặt marker #END sát vùng cần nhập hoặc xóa các dòng/cột trống có định dạng rồi thử lại.`,
  );
}

async function createExcelJsWorkbook() {
  // The package root can resolve to the Node/CJS entry in Vite dev and hang while
  // loading workbooks in the browser. Use ExcelJS' browser bundle explicitly.
  // @ts-expect-error ExcelJS does not ship declarations for its dist browser bundle.
  const module = await import("exceljs/dist/exceljs.min.js");
  const WorkbookCtor = (module as any).Workbook ?? (module as any).default?.Workbook;
  if (typeof WorkbookCtor !== "function") {
    throw new Error("Không tải được thư viện đọc Excel. Vui lòng tải lại trang rồi thử lại.");
  }
  return new WorkbookCtor();
}

async function loadExcelWorkbook(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = await createExcelJsWorkbook();

  try {
    await workbook.xlsx.load(buffer as any);
    return workbook;
  } catch (error) {
    const normalized = await normalizeSpreadsheetNamespacePrefixesInXlsx(buffer);
    if (!normalized.changed) {
      throw createExcelReadError(error);
    }

    const retryWorkbook = await createExcelJsWorkbook();
    try {
      await retryWorkbook.xlsx.load(normalized.buffer as any);
      return retryWorkbook;
    } catch (retryError) {
      throw createExcelReadError(retryError, error);
    }
  }
}

async function normalizeSpreadsheetNamespacePrefixesInXlsx(
  buffer: ArrayBuffer,
): Promise<{ buffer: ArrayBuffer; changed: boolean }> {
  const module = await import("jszip");
  const JSZipCtor = (module as any).default ?? module;
  if (typeof JSZipCtor?.loadAsync !== "function") {
    throw new Error("Không tải được bộ đọc file Excel. Vui lòng tải lại trang rồi thử lại.");
  }

  const zip = await JSZipCtor.loadAsync(buffer);
  const updates: Array<{ name: string; xml: string }> = [];

  for (const [name, entry] of Object.entries(zip.files ?? {}) as Array<[string, any]>) {
    if (entry?.dir || !/\.(xml|rels)$/i.test(name)) continue;
    const xml = await entry.async("string");
    const normalized = normalizeSpreadsheetMainNamespaceElementPrefixes(stripUnsupportedImportXml(xml, name));
    if (normalized !== xml) {
      updates.push({ name, xml: normalized });
    }
  }

  if (!updates.length) {
    return { buffer, changed: false };
  }

  for (const update of updates) {
    zip.file(update.name, update.xml);
  }

  const normalizedBuffer = await zip.generateAsync({ type: "arraybuffer" });
  return { buffer: normalizedBuffer, changed: true };
}

function normalizeSpreadsheetMainNamespaceElementPrefixes(xml: string) {
  const prefixes = new Set<string>();
  const namespacePattern =
    /xmlns:([A-Za-z_][\w.-]*)=(["'])http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main\2/g;
  let match: RegExpExecArray | null;
  while ((match = namespacePattern.exec(xml))) {
    prefixes.add(match[1]);
  }

  let normalized = xml;
  for (const prefix of prefixes) {
    normalized = normalized.replace(new RegExp(`<(/?)${escapeRegExp(prefix)}:`, "g"), "<$1");
  }
  return normalized;
}

function stripUnsupportedImportXml(xml: string, name: string) {
  if (/\.rels$/i.test(name)) {
    // ExcelJS 4.4 can fail to reconcile comments/VML when WPS-style files use
    // absolute relationship targets. Comments are not part of the import contract.
    return xml.replace(
      /<Relationship\b(?=[^>]*Type=["'][^"']*(?:comments|vmlDrawing|person)[^"']*["'])[^>]*\/>\s*/gi,
      "",
    );
  }

  if (/^xl\/worksheets\/sheet\d+\.xml$/i.test(name)) {
    return xml.replace(/<([A-Za-z_][\w.-]*:)?legacyDrawing\b[^>]*\/>\s*/gi, "");
  }

  return xml;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createExcelReadError(error: unknown, originalError?: unknown) {
  const message = getErrorMessage(error);
  const originalMessage = originalError ? getErrorMessage(originalError) : "";
  const detail = [message, originalMessage].filter(Boolean).join(" / ");
  return new Error(
    `Không đọc được file Excel. File có thể đang dùng cấu trúc OOXML không tương thích hoặc không phải .xlsx hợp lệ. Hãy mở file bằng Excel/WPS rồi Save As .xlsx và thử lại.${detail ? ` Chi tiết: ${detail}` : ""}`,
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

function buildFortuneSheetFromWorksheet(
  worksheet: any,
  rows: number,
  cols: number,
  sourceRange: ExcelImportSourceRange,
  spec?: HeaderSpec,
) {
  const data: any[][] = [];
  const celldata: any[] = [];

  for (let r = 0; r < rows; r += 1) {
    const row: any[] = [];
    for (let c = 0; c < cols; c += 1) {
      const cell = worksheet.getCell(sourceRange.r0 + r + 1, sourceRange.c0 + c + 1) as any;
      const obj = buildFortuneCell(cell, sourceRange);
      row.push(obj);
      if (obj) {
        celldata.push({ r, c, v: obj });
      }
    }
    data.push(row);
  }

  const config: any = {
    merge: buildMergeConfig(worksheet, rows, cols, sourceRange),
    rowlen: buildRowlenConfig(worksheet, rows, sourceRange),
    columnlen: buildColumnlenConfig(worksheet, cols, sourceRange),
  };
  const borderInfo = sanitizeMergeBorderInfo(buildBorderInfo(worksheet, rows, cols, sourceRange), config.merge);
  if (borderInfo.length > 0) config.borderInfo = borderInfo;
  applyFortuneMergeCells(data, celldata, config.merge);
  if (spec) applyImportedWrapLayout(data, celldata, config, spec);

  const sheet = {
    name: worksheet.name || "Sheet1",
    id: "sheet-1",
    index: "0",
    order: 0,
    status: 1,
    row: rows,
    column: cols,
    data,
    celldata,
    config,
  };
  syncFormulaCalcChain(sheet);
  return sheet;
}

function applyImportedWrapLayout(data: any[][], celldata: any[], config: any, spec: HeaderSpec) {
  const table = getTableRect(spec);
  const regions = computeRegions(spec, table);
  const heuristicWrapRects = getImportHeuristicWrapRects(spec, regions);
  const rowlen = config.rowlen && typeof config.rowlen === "object" ? config.rowlen : (config.rowlen = {});
  const columnlen = config.columnlen && typeof config.columnlen === "object" ? config.columnlen : (config.columnlen = {});
  const celldataIndex = buildCelldataIndex(celldata);

  for (let r = 0; r < data.length; r += 1) {
    const row = data[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c += 1) {
      const cell = row[c];
      if (!isCellObject(cell) || isMergeChildCell(cell)) continue;

      const text = getFortuneCellDisplayText(cell);
      if (!text) continue;

      const cellRect = getFortuneCellRect(cell, r, c);
      const fontSizePx = getCellFontSizePx(cell);

      const width = getRectWidthPx(columnlen, cellRect);
      const shouldHeuristicWrap = heuristicWrapRects.some((rect) => rectsOverlap(rect, cellRect));
      const shouldWrap =
        cell.tb === "2" ||
        text.includes("\n") ||
        (shouldHeuristicWrap &&
          estimateTextWidthPx(text, fontSizePx) > Math.max(16, width - WRAP_CELL_HORIZONTAL_PADDING_PX));

      if (!shouldWrap) continue;

      if (cell.tb !== "2") {
        cell.tb = "2";
        upsertCelldataCell(celldata, celldataIndex, r, c, cell);
      }

      const requiredHeight = estimateWrappedCellHeightPx(text, fontSizePx, width);
      ensureRowSpanMinHeight(rowlen, cellRect, requiredHeight);
    }
  }
}

function getImportHeuristicWrapRects(
  spec: HeaderSpec,
  regions: ReturnType<typeof computeRegions>,
): ExcelImportSourceRange[] {
  if (spec.kind === "TOP") return [regions.headerRect as ExcelImportSourceRange];
  if (spec.kind === "MATRIX") {
    const matrixRegions = regions as typeof regions & {
      cornerRect?: ExcelImportSourceRange;
      topHeaderRect?: ExcelImportSourceRange;
    };
    return [matrixRegions.cornerRect, matrixRegions.topHeaderRect].filter(Boolean) as ExcelImportSourceRange[];
  }

  return [];
}

function buildCelldataIndex(celldata: any[]) {
  const index = new Map<string, number>();
  for (let i = 0; i < celldata.length; i += 1) {
    const r = Number(celldata[i]?.r);
    const c = Number(celldata[i]?.c);
    if (Number.isFinite(r) && Number.isFinite(c) && !index.has(`${r},${c}`)) index.set(`${r},${c}`, i);
  }
  return index;
}

function upsertCelldataCell(celldata: any[], index: Map<string, number>, r: number, c: number, cell: any) {
  const key = `${r},${c}`;
  const existing = index.get(key);
  if (typeof existing === "number" && existing >= 0 && existing < celldata.length) {
    celldata[existing] = { r, c, v: cell };
    return;
  }
  celldata.push({ r, c, v: cell });
  index.set(key, celldata.length - 1);
}

function isCellObject(cell: any) {
  return Boolean(cell && typeof cell === "object" && !Array.isArray(cell));
}

function isMergeChildCell(cell: any) {
  return isCellObject(cell?.mc) && cell.mc.rs == null && cell.mc.cs == null;
}

function getFortuneCellRect(cell: any, fallbackR: number, fallbackC: number): ExcelImportSourceRange {
  const mc = isCellObject(cell?.mc) ? cell.mc : null;
  const r0 = Number.isFinite(Number(mc?.r)) ? Math.floor(Number(mc.r)) : fallbackR;
  const c0 = Number.isFinite(Number(mc?.c)) ? Math.floor(Number(mc.c)) : fallbackC;
  const rs = Number.isFinite(Number(mc?.rs)) && Number(mc.rs) > 0 ? Math.floor(Number(mc.rs)) : 1;
  const cs = Number.isFinite(Number(mc?.cs)) && Number(mc.cs) > 0 ? Math.floor(Number(mc.cs)) : 1;
  return { r0, c0, r1: r0 + rs - 1, c1: c0 + cs - 1 };
}

function getFortuneCellDisplayText(cell: any) {
  const value = cell?.m ?? cell?.v ?? cell?.ct?.s ?? "";
  return value == null ? "" : String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function getCellFontSizePx(cell: any) {
  const fs = Number(cell?.fs);
  const pointSize = Number.isFinite(fs) && fs > 0 ? fs : 11;
  return Math.max(12, Math.min(48, pointsToCssPx(pointSize)));
}

function pointsToCssPx(points: number) {
  return points * CSS_PIXELS_PER_POINT;
}

function getConfigSizePx(config: any, index: number, fallback: number) {
  const raw = config?.[String(index)] ?? config?.[index];
  const size = Number(raw);
  return Number.isFinite(size) && size > 0 ? size : fallback;
}

function getRectWidthPx(columnlen: any, rect: ExcelImportSourceRange) {
  let width = 0;
  for (let c = rect.c0; c <= rect.c1; c += 1) {
    width += getConfigSizePx(columnlen, c, DEFAULT_IMPORT_COLUMN_WIDTH_PX);
  }
  return Math.max(16, width);
}

function getRectHeightPx(rowlen: any, rect: ExcelImportSourceRange) {
  let height = 0;
  for (let r = rect.r0; r <= rect.r1; r += 1) {
    height += getConfigSizePx(rowlen, r, DEFAULT_IMPORT_ROW_HEIGHT_PX);
  }
  return Math.max(1, height);
}

function ensureRowSpanMinHeight(rowlen: any, rect: ExcelImportSourceRange, requiredHeight: number) {
  const cappedRequired = Math.max(DEFAULT_IMPORT_ROW_HEIGHT_PX, Math.min(MAX_IMPORT_ROW_HEIGHT_PX * rectRows(rect), Math.ceil(requiredHeight)));
  const currentHeight = getRectHeightPx(rowlen, rect);
  if (currentHeight >= cappedRequired) return;

  const rows = rectRows(rect);
  const extraPerRow = (cappedRequired - currentHeight) / rows;
  for (let r = rect.r0; r <= rect.r1; r += 1) {
    const current = getConfigSizePx(rowlen, r, DEFAULT_IMPORT_ROW_HEIGHT_PX);
    rowlen[String(r)] = Math.min(MAX_IMPORT_ROW_HEIGHT_PX, Math.ceil(current + extraPerRow));
  }
}

function estimateWrappedCellHeightPx(text: string, fontSize: number, width: number) {
  const lineCount = estimateWrappedLineCount(text, fontSize, Math.max(16, width - WRAP_CELL_HORIZONTAL_PADDING_PX));
  const lineHeight = getFortuneLineHeightPx(fontSize);
  return Math.max(estimateSingleLineCellHeightPx(fontSize), lineCount * lineHeight + TEXT_CELL_VERTICAL_PADDING_PX);
}

function estimateSingleLineCellHeightPx(fontSize: number) {
  return Math.max(DEFAULT_IMPORT_ROW_HEIGHT_PX, getFortuneLineHeightPx(fontSize) + TEXT_CELL_VERTICAL_PADDING_PX);
}

function getFortuneLineHeightPx(fontSize: number) {
  return Math.max(17, Math.ceil(fontSize * WRAP_LINE_HEIGHT_MULTIPLIER));
}

function estimateWrappedLineCount(text: string, fontSize: number, availableWidth: number) {
  const paragraphs = text.split("\n");
  return Math.max(
    1,
    paragraphs.reduce((sum, paragraph) => sum + estimateParagraphLineCount(paragraph, fontSize, availableWidth), 0),
  );
}

function estimateParagraphLineCount(paragraph: string, fontSize: number, availableWidth: number) {
  const normalized = paragraph.trim();
  if (!normalized) return 1;

  const tokens = normalized.split(/(\s+)/).filter(Boolean);
  let lines = 1;
  let currentWidth = 0;

  for (const token of tokens) {
    const tokenWidth = estimateTextWidthPx(token, fontSize);
    if (/^\s+$/.test(token)) {
      currentWidth += tokenWidth;
      continue;
    }

    if (tokenWidth > availableWidth) {
      const tokenLines = Math.max(1, Math.ceil(tokenWidth / availableWidth));
      if (currentWidth > 0) lines += 1;
      lines += tokenLines - 1;
      currentWidth = tokenWidth % availableWidth;
      continue;
    }

    if (currentWidth > 0 && currentWidth + tokenWidth > availableWidth) {
      lines += 1;
      currentWidth = tokenWidth;
    } else {
      currentWidth += tokenWidth;
    }
  }

  return lines;
}

function estimateTextWidthPx(text: string, fontSize: number) {
  let units = 0;
  for (const char of text) {
    if (/\s/.test(char)) units += 0.24;
    else if (/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFFA0]/.test(char)) units += 1;
    else if (/[iljtfrI|]/.test(char)) units += 0.28;
    else if (/[mwMW]/.test(char)) units += 0.72;
    else if (isUppercaseLike(char)) units += 0.52;
    else if (/[A-ZÀ-ÝĐ]/.test(char)) units += 0.52;
    else if (/[0-9]/.test(char)) units += 0.48;
    else if (/[.,:;()\/\\\-+]/.test(char)) units += 0.24;
    else units += 0.42;
  }
  return units * fontSize;
}

function isUppercaseLike(char: string) {
  return /[A-Z]/.test(char) || (char.toLocaleUpperCase("vi-VN") === char && char.toLocaleLowerCase("vi-VN") !== char);
}

function rectsOverlap(a: ExcelImportSourceRange, b: ExcelImportSourceRange) {
  return a.r0 <= b.r1 && a.r1 >= b.r0 && a.c0 <= b.c1 && a.c1 >= b.c0;
}

function applyFortuneMergeCells(data: any[][], celldata: any[], merge: Record<string, any>) {
  if (!merge || typeof merge !== "object") return;
  const celldataIndex = new Map<string, number>();
  for (let index = 0; index < celldata.length; index += 1) {
    const item = celldata[index];
    const r = Number(item?.r);
    const c = Number(item?.c);
    if (Number.isFinite(r) && Number.isFinite(c) && !celldataIndex.has(`${r},${c}`)) {
      celldataIndex.set(`${r},${c}`, index);
    }
  }

  const removeCelldataCell = (r: number, c: number) => {
    for (let index = celldata.length - 1; index >= 0; index -= 1) {
      const item = celldata[index];
      if (Number(item?.r) === r && Number(item?.c) === c) celldata.splice(index, 1);
    }
  };
  const upsertMasterCelldata = (r: number, c: number, v: any) => {
    const key = `${r},${c}`;
    const index = celldataIndex.get(key);
    if (typeof index === "number" && index >= 0 && index < celldata.length) {
      celldata[index] = { r, c, v };
      return;
    }
    celldata.push({ r, c, v });
    celldataIndex.set(key, celldata.length - 1);
  };

  for (const item of Object.values<any>(merge)) {
    const r0 = Math.floor(Number(item?.r));
    const c0 = Math.floor(Number(item?.c));
    const rs = Math.max(1, Math.floor(Number(item?.rs ?? 1)));
    const cs = Math.max(1, Math.floor(Number(item?.cs ?? 1)));
    if (!Number.isFinite(r0) || !Number.isFinite(c0) || !Number.isFinite(rs) || !Number.isFinite(cs)) continue;
    if (rs <= 1 && cs <= 1) continue;

    data[r0] = Array.isArray(data[r0]) ? data[r0] : [];
    const current = data[r0][c0];
    const master = current && typeof current === "object" && !Array.isArray(current) ? { ...current } : {};
    master.mc = { r: r0, c: c0, rs, cs };
    data[r0][c0] = master;
    upsertMasterCelldata(r0, c0, master);

    for (let r = r0; r < r0 + rs; r += 1) {
      data[r] = Array.isArray(data[r]) ? data[r] : [];
      for (let c = c0; c < c0 + cs; c += 1) {
        if (r === r0 && c === c0) continue;
        data[r][c] = { mc: { r: r0, c: c0 } };
        removeCelldataCell(r, c);
      }
    }
  }
}

function normalizeSourceRange(range: ExcelImportSourceRange | undefined, rows: number, cols: number): ExcelImportSourceRange {
  const fallback = { r0: 0, c0: 0, r1: rows - 1, c1: cols - 1 };
  if (!range) return fallback;

  const normalized = {
    r0: Math.max(0, Math.floor(Number(range.r0))),
    c0: Math.max(0, Math.floor(Number(range.c0))),
    r1: Math.max(0, Math.floor(Number(range.r1))),
    c1: Math.max(0, Math.floor(Number(range.c1))),
  };
  if (normalized.r1 < normalized.r0 || normalized.c1 < normalized.c0) {
    throw new Error("Vùng import không hợp lệ.");
  }

  const sourceRows = normalized.r1 - normalized.r0 + 1;
  const sourceCols = normalized.c1 - normalized.c0 + 1;
  if (sourceRows !== rows || sourceCols !== cols) {
    throw new Error(
      `Vùng import có kích thước ${sourceRows}x${sourceCols}, không khớp cấu hình bảng ${rows}x${cols}.`,
    );
  }

  return normalized;
}

function detectWorksheetImportRange(worksheet: any): {
  sourceRange: ExcelImportSourceRange;
  mode: "END_MARKER";
  previewRows: number;
  previewCols: number;
} {
  const markerCells: Array<{ r: number; c: number }> = [];

  worksheet.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
    const r = rowNumber - 1;
    row.eachCell({ includeEmpty: false }, (cell: any, colNumber: number) => {
      const c = colNumber - 1;
      if (isEndMarkerCell(cell)) {
        markerCells.push({ r, c });
      }
    });
  });

  if (markerCells.length !== 2) {
    throw new Error(
      "File Excel import phải có đúng 2 marker #END: một marker cùng dòng đầu tiên, ngay sau cột cuối; và một marker cùng cột đầu tiên, ngay dưới dòng cuối.",
    );
  }

  const [firstMarker, secondMarker] = markerCells;
  const pair =
    firstMarker.r < secondMarker.r && firstMarker.c > secondMarker.c
      ? { rightMarker: firstMarker, bottomMarker: secondMarker }
      : secondMarker.r < firstMarker.r && secondMarker.c > firstMarker.c
        ? { rightMarker: secondMarker, bottomMarker: firstMarker }
        : null;

  if (!pair) {
    throw new Error(
      "Marker #END không đúng vị trí. Cần một #END ở ô đầu dòng ngay dưới vùng import và một #END ở ô đầu cột ngay bên phải vùng import.",
    );
  }

  const sourceRange = {
    r0: pair.rightMarker.r,
    c0: pair.bottomMarker.c,
    r1: pair.bottomMarker.r - 1,
    c1: pair.rightMarker.c - 1,
  };
  if (sourceRange.r1 < sourceRange.r0 || sourceRange.c1 < sourceRange.c0) {
    throw new Error("Marker #END tạo ra vùng import không hợp lệ.");
  }
  return {
    sourceRange,
    mode: "END_MARKER",
    previewRows: pair.bottomMarker.r + 1,
    previewCols: pair.rightMarker.c + 1,
  };
}

function sameSourceRange(left: ExcelImportSourceRange, right: ExcelImportSourceRange) {
  return left.r0 === right.r0 && left.c0 === right.c0 && left.r1 === right.r1 && left.c1 === right.c1;
}

function isEndMarkerCell(cell: any) {
  return String(readCellText(cell) ?? normalizeCellValue(readCellValue(cell), cell) ?? "").trim().toUpperCase() === "#END";
}

function buildFortuneCell(cell: any, sourceRange?: ExcelImportSourceRange) {
  if (isNonMasterMergedCell(cell)) return null;

  const obj: any = {};
  const formula = shiftFormulaReferencesForSourceRange(readFormula(cell), sourceRange);

  if (formula) {
    const normalizedFormula = formula.startsWith("=") ? formula : `=${formula}`;
    const result = readFormulaResult(cell);
    const displayValue = normalizeCellValue(result, cell) ?? normalizedFormula;
    obj.f = normalizedFormula;
    obj.v = displayValue;
    obj.m = String(displayValue);
  } else {
    const value = normalizeCellValue(readCellValue(cell), cell);
    if (value !== null && value !== undefined && value !== "") {
      obj.v = value;
      obj.m = String(readUsableCellText(cell) ?? value);
    }
  }

  const bg = colorToHex(cell?.fill?.fgColor);
  if (bg && bg !== "#000000") obj.bg = bg;

  const font = cell?.font;
  if (font) {
    if (font.bold) obj.bl = 1;
    if (font.italic) obj.it = 1;
    if (font.size) obj.fs = Math.round(Number(font.size));
    const fc = colorToHex(font.color);
    if (fc) obj.fc = fc;
    if (font.name) obj.ff = font.name;
  }

  const alignment = cell?.alignment;
  if (alignment) {
    const horizontal = String(alignment.horizontal || "").toLowerCase();
    const vertical = String(alignment.vertical || "").toLowerCase();
    const horizontalMap: Record<string, number> = { left: 1, center: 0, right: 2, justify: 3 };
    const verticalMap: Record<string, number> = { top: 1, middle: 0, center: 0, bottom: 2, justify: 0 };
    if (horizontal) obj.ht = horizontalMap[horizontal] ?? 0;
    if (vertical) obj.vt = verticalMap[vertical] ?? 0;
    if (alignment.wrapText) obj.tb = "2";
  }

  if (Object.keys(obj).length > 0 && obj.vt == null) obj.vt = 0;

  if (cell?.numFmt && cell.numFmt !== "General") {
    obj.ct = { fa: cell.numFmt };
  }

  return Object.keys(obj).length > 0 ? obj : null;
}

function readFormula(cell: any): string | null {
  const direct = typeof cell?.formula === "string" ? cell.formula.trim() : "";
  if (direct) return direct;

  const value = readCellValue(cell);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, any>;
  const formula = typeof record.formula === "string" ? record.formula.trim() : "";
  if (formula) return formula;

  const sharedFormula = typeof record.sharedFormula === "string" ? record.sharedFormula.trim() : "";
  return sharedFormula && !isCellAddressLike(sharedFormula) ? sharedFormula : null;
}

function readFormulaResult(cell: any) {
  const value = readCellValue(cell);
  if (value && typeof value === "object" && !Array.isArray(value) && "result" in value) {
    return (value as Record<string, any>).result;
  }
  try {
    return cell?.result ?? null;
  } catch {
    return null;
  }
}

function isCellAddressLike(value: string) {
  return /^\$?[A-Za-z]{1,3}\$?[1-9]\d*$/.test(value.trim());
}

function shiftFormulaReferencesForSourceRange(formula: string | null, sourceRange?: ExcelImportSourceRange): string | null {
  if (!formula) return formula;
  if (!sourceRange || (sourceRange.r0 === 0 && sourceRange.c0 === 0)) return formula;

  return formula.replace(
    /(?<![A-Za-z0-9_.$'!])(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![A-Za-z0-9_])/g,
    (match, colAbs: string, colName: string, rowAbs: string, rowText: string) => {
      const sourceC = columnNameToIndex(colName);
      const sourceR = Number(rowText) - 1;
      if (!Number.isFinite(sourceR) || !Number.isFinite(sourceC)) return match;
      if (
        sourceR < sourceRange.r0 ||
        sourceR > sourceRange.r1 ||
        sourceC < sourceRange.c0 ||
        sourceC > sourceRange.c1
      ) {
        return match;
      }

      return `${colAbs}${columnIndexToName(sourceC - sourceRange.c0)}${rowAbs}${sourceR - sourceRange.r0 + 1}`;
    },
  );
}

function normalizeCellValue(value: unknown, cell?: any): string | number | boolean | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return readUsableCellText(cell) || value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, any>;
    if (record.formula || record.sharedFormula) {
      return "result" in record ? normalizeCellValue(record.result, cell) : null;
    }
    if (typeof record.error === "string") return record.error;
    if (typeof record.text === "string") return record.text;
    if (Array.isArray(record.richText)) {
      return record.richText.map((part: any) => part?.text ?? "").join("");
    }
    if (record.hyperlink && typeof record.text === "string") return record.text;
  }
  return readUsableCellText(cell);
}

function readUsableCellText(cell: any): string | null {
  const text = readCellText(cell);
  if (text == null) return null;
  return text.trim() === "[object Object]" ? null : text;
}

function colorToHex(color: any): string | null {
  if (!color) return null;
  const argb = typeof color.argb === "string" ? color.argb.trim().toUpperCase() : "";
  if (/^[0-9A-F]{8}$/.test(argb)) return `#${argb.slice(2)}`;
  if (/^[0-9A-F]{6}$/.test(argb)) return `#${argb}`;
  return null;
}

function isYellow(hex: string | null) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r >= 220 && g >= 180 && b <= 150;
}

function isBlankMarkerCell(sourceCell: any, obj: any) {
  const marker = String(readCellText(sourceCell) ?? obj?.m ?? obj?.v ?? "").trim().toUpperCase();
  if (marker === "TR") return true;
  return isYellow(colorToHex(sourceCell?.fill?.fgColor) ?? obj?.bg ?? null);
}

function isTitleTextCell(sourceCell: any, obj: any) {
  if (obj?.f) return false;
  const text = readTitleTextValue(sourceCell, obj);
  return text != null && text.trim().length > 0;
}

function readTitleTextValue(sourceCell: any, obj: any): string | null {
  const value = readCellValue(sourceCell);
  if (typeof value === "string") return value;
  if (value instanceof Date) return null;
  if (typeof value === "number" || typeof value === "boolean") return null;

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, any>;
    if (record.formula || record.sharedFormula) return null;
    if (typeof record.text === "string") return record.text;
    if (Array.isArray(record.richText)) {
      return record.richText.map((part: any) => part?.text ?? "").join("");
    }
    if (record.hyperlink && typeof record.text === "string") return record.text;
    return null;
  }

  if (value == null && typeof obj?.v === "string") return obj.v;
  return null;
}

function readCellText(cell: any): string | null {
  try {
    const text = cell?.text;
    return text == null ? null : String(text);
  } catch {
    return null;
  }
}

function readCellValue(cell: any): unknown {
  try {
    return cell?.value ?? null;
  } catch {
    return null;
  }
}

function isNonMasterMergedCell(cell: any) {
  if (!cell?.isMerged) return false;
  try {
    return Boolean(cell.master && cell.address !== cell.master.address);
  } catch {
    return true;
  }
}

function buildShiftedMergeRects(worksheet: any, sourceRange: ExcelImportSourceRange): ExcelImportSourceRange[] {
  const rects: ExcelImportSourceRange[] = [];
  for (const mergeRef of readWorksheetMergeRefs(worksheet)) {
    const rect = parseA1Range(String(mergeRef));
    if (!rect) continue;
    if (
      rect.r0 < sourceRange.r0 ||
      rect.c0 < sourceRange.c0 ||
      rect.r1 > sourceRange.r1 ||
      rect.c1 > sourceRange.c1
    ) {
      continue;
    }

    rects.push({
      r0: rect.r0 - sourceRange.r0,
      c0: rect.c0 - sourceRange.c0,
      r1: rect.r1 - sourceRange.r0,
      c1: rect.c1 - sourceRange.c0,
    });
  }
  return rects;
}

function getSpecialMarkRectForCell(
  r: number,
  c: number,
  mergeRects: ExcelImportSourceRange[],
  dataRect: ExcelImportSourceRange,
): ExcelImportSourceRange {
  const mergeRect = mergeRects.find((rect) => rectContainsCell(rect, r, c));
  if (mergeRect && rectContainsRect(dataRect, mergeRect)) return mergeRect;
  return { r0: r, c0: c, r1: r, c1: c };
}

function clearMarkedCellDisplay(
  data: any[][],
  r: number,
  c: number,
  mergeRects: ExcelImportSourceRange[],
  dataRect: ExcelImportSourceRange,
) {
  const rect = getSpecialMarkRectForCell(r, c, mergeRects, dataRect);
  for (let rr = rect.r0; rr <= rect.r1; rr += 1) {
    for (let cc = rect.c0; cc <= rect.c1; cc += 1) {
      const obj = data[rr]?.[cc];
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
      delete obj.v;
      delete obj.m;
      delete obj.ct;
      if (Object.keys(obj).length === 0) data[rr][cc] = null;
    }
  }
}

function rectContainsCell(rect: ExcelImportSourceRange, r: number, c: number) {
  return r >= rect.r0 && r <= rect.r1 && c >= rect.c0 && c <= rect.c1;
}

function rectContainsRect(outer: ExcelImportSourceRange, inner: ExcelImportSourceRange) {
  return inner.r0 >= outer.r0 && inner.c0 >= outer.c0 && inner.r1 <= outer.r1 && inner.c1 <= outer.c1;
}

function buildMergeConfig(worksheet: any, rows: number, cols: number, sourceRange: ExcelImportSourceRange) {
  const merge: Record<string, any> = {};
  const merges = readWorksheetMergeRefs(worksheet);

  for (const mergeRef of merges) {
    const rect = parseA1Range(String(mergeRef));
    if (!rect) continue;
    if (
      rect.r0 < sourceRange.r0 ||
      rect.c0 < sourceRange.c0 ||
      rect.r1 > sourceRange.r1 ||
      rect.c1 > sourceRange.c1
    ) {
      continue;
    }

    const shifted = {
      r0: rect.r0 - sourceRange.r0,
      c0: rect.c0 - sourceRange.c0,
      r1: rect.r1 - sourceRange.r0,
      c1: rect.c1 - sourceRange.c0,
    };
    if (shifted.r0 < 0 || shifted.c0 < 0 || shifted.r1 >= rows || shifted.c1 >= cols) continue;
    const rs = shifted.r1 - shifted.r0 + 1;
    const cs = shifted.c1 - shifted.c0 + 1;
    merge[`${shifted.r0}_${shifted.c0}`] = { r: shifted.r0, c: shifted.c0, rs, cs };
  }

  return merge;
}

function readWorksheetMergeRefs(worksheet: any): string[] {
  const refs = new Set<string>();
  if (Array.isArray(worksheet?.model?.merges)) {
    for (const ref of worksheet.model.merges) refs.add(String(ref));
  }

  const rawMerges = worksheet?._merges;
  if (rawMerges && typeof rawMerges === "object") {
    for (const item of Object.values<any>(rawMerges)) {
      const model = item?.model ?? item;
      const top = Number(model?.top);
      const left = Number(model?.left);
      const bottom = Number(model?.bottom);
      const right = Number(model?.right);
      if (
        Number.isFinite(top) &&
        Number.isFinite(left) &&
        Number.isFinite(bottom) &&
        Number.isFinite(right)
      ) {
        refs.add(`${columnIndexToName(left - 1)}${top}:${columnIndexToName(right - 1)}${bottom}`);
      }
    }
  }

  return Array.from(refs);
}

function buildRowlenConfig(worksheet: any, rows: number, sourceRange: ExcelImportSourceRange) {
  const rowlen: Record<string, number> = {};
  for (let r = 1; r <= rows; r += 1) {
    const height = worksheet.getRow(sourceRange.r0 + r)?.height;
    if (Number.isFinite(height)) {
      rowlen[String(r - 1)] = Math.max(16, Math.min(180, Math.round(pointsToCssPx(Number(height)))));
    }
  }
  return rowlen;
}

function buildColumnlenConfig(worksheet: any, cols: number, sourceRange: ExcelImportSourceRange) {
  const columnlen: Record<string, number> = {};
  for (let c = 1; c <= cols; c += 1) {
    const width = worksheet.getColumn(sourceRange.c0 + c)?.width;
    if (Number.isFinite(width)) {
      columnlen[String(c - 1)] = Math.max(24, Math.min(420, Math.round(Number(width) * 7 + 5)));
    }
  }
  return columnlen;
}

function buildBorderInfo(worksheet: any, rows: number, cols: number, sourceRange: ExcelImportSourceRange) {
  const borderInfo: any[] = [];
  for (let r = 1; r <= rows; r += 1) {
    for (let c = 1; c <= cols; c += 1) {
      const cell = worksheet.getCell(sourceRange.r0 + r, sourceRange.c0 + c) as any;
      const value: any = { row_index: r - 1, col_index: c - 1 };
      for (const [sourceKey, targetKey] of Object.entries(BORDER_SIDE_KEYS)) {
        const side = cell?.border?.[sourceKey];
        const sideValue = borderSideToFortune(side);
        if (sideValue) value[targetKey] = sideValue;
      }
      if (Object.keys(value).length > 2) {
        borderInfo.push({ rangeType: "cell", value });
      }
    }
  }
  return borderInfo;
}

function borderSideToFortune(side: any) {
  const style = typeof side?.style === "string" ? side.style : "";
  if (!style) return null;
  return {
    style: BORDER_STYLE_CODES[style] ?? 1,
    color: colorToHex(side.color) || "#000000",
  };
}

function parseA1Range(ref: string) {
  const [start, end = start] = ref.split(":");
  const a = parseA1Cell(start);
  const b = parseA1Cell(end);
  if (!a || !b) return null;
  return {
    r0: Math.min(a.r, b.r),
    c0: Math.min(a.c, b.c),
    r1: Math.max(a.r, b.r),
    c1: Math.max(a.c, b.c),
  };
}

function parseA1Cell(ref: string) {
  const match = /^([A-Za-z]+)(\d+)$/.exec(ref.trim());
  if (!match) return null;
  return {
    r: Number(match[2]) - 1,
    c: columnNameToIndex(match[1]),
  };
}

function columnNameToIndex(name: string) {
  let out = 0;
  for (const char of name.toUpperCase()) {
    out = out * 26 + (char.charCodeAt(0) - 64);
  }
  return out - 1;
}

function columnIndexToName(index: number) {
  let n = Math.floor(index) + 1;
  let out = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    out = String.fromCharCode(65 + mod) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out || "A";
}
