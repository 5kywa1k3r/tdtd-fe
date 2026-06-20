// src/components/excel/fortune/fortuneAdapter.ts
import type { Rect } from "./regions";
import type { DynamicExcelStringListOption, HeaderCell, HeaderSpec } from "./types";
import {
  getCellDataType,
  getCellStringListOptions,
  getCellValueSource,
  isDynamicExcelEnumDataType,
  isSystemValueSource,
} from "./dataTypes";
import {
  getDateInputFormatLabel,
  normalizeDateInputValue,
} from "../../../utils/dateInputFormat";
import {
  buildCellRefsForValues,
  buildInputCellRefs,
  type DynamicExcelInputCellRef,
} from "./specialRanges";

export type WorkbookCellValue = string | string[] | number | boolean | null;

export type WorkbookValueValidationIssue = {
  r: number;
  c: number;
  cellRef: string;
  dataType: string;
  value: string;
  message: string;
};

export type ExtractTypedValuesOptions = {
  excludedDataColumns?: number[];
};

function parseNumberFromCell(cell: any): number | null {
  if (!cell || typeof cell !== "object") return null;

  const v = (cell as any).v;
  if (typeof v === "number" && Number.isFinite(v)) return v;

  if (typeof v === "string") {
    const s = v.replaceAll(",", "").trim();
    if (!s) return null;
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }

  const m = (cell as any).m;
  if (typeof m === "string") {
    const s = m.replaceAll(",", "").trim();
    if (!s) return null;
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }

  return null;
}

export function extractNumericValues1D(
  sheet: any,
  dataRect: Rect,
  spec?: HeaderSpec | null,
): (number | null)[] {
  const grid: any[][] = Array.isArray(sheet?.data) ? sheet.data : [];
  const cellRefs = buildInputCellRefs(dataRect, spec);

  const out: (number | null)[] = [];
  for (const ref of cellRefs) {
    const row = grid[ref.r] ?? [];
    out.push(parseNumberFromCell(row[ref.c]));
  }
  return out;
}

export function extractTypedValues1D(
  sheet: any,
  dataRect: Rect,
  spec: HeaderSpec | null | undefined,
  options?: ExtractTypedValuesOptions,
): {
  values1D: WorkbookCellValue[];
  valuesHash: string;
  issues: WorkbookValueValidationIssue[];
  cellRefs: DynamicExcelInputCellRef[];
} {
  const grid: any[][] = Array.isArray(sheet?.data) ? sheet.data : [];
  const values1D: WorkbookCellValue[] = [];
  const issues: WorkbookValueValidationIssue[] = [];
  const cellRefs = buildInputCellRefs(dataRect, spec);
  const excluded = buildExcludedColumnSet(options?.excludedDataColumns ?? []);
  let hash = WORKBOOK_VALUES_HASH_SEED;

  for (const ref of cellRefs) {
    const row = grid[ref.r] ?? [];
    const dataType = spec ? getCellDataType(spec, dataRect, ref.r, ref.c) : "NUMBER";
    const options = isDynamicExcelEnumDataType(dataType) && spec
      ? getCellStringListOptions(spec, dataRect, ref.r, ref.c)
      : [];
    const valueSource = isDynamicExcelEnumDataType(dataType) && spec
      ? getCellValueSource(spec, dataRect, ref.r, ref.c)
      : null;
    const parsed = parseTypedCellValue(row[ref.c], dataType, options, isSystemValueSource(valueSource));
    const excludedColumn = excluded.has(ref.c);
    const value = excludedColumn ? null : normalizeWorkbookCellValue(parsed.value);
    values1D.push(value);
    hash = appendWorkbookCellValueHash(hash, value);
    if (parsed.issue && !excludedColumn) {
      const cellRef = toExcelRef(ref.r, ref.c);
      issues.push({
        r: ref.r,
        c: ref.c,
        cellRef,
        dataType,
        value: parsed.raw,
        message: `${cellRef}: ${parsed.issue}`,
      });
    }
  }

  return { values1D, valuesHash: finishWorkbookValuesHash(hash, values1D.length), issues, cellRefs };
}

const WORKBOOK_VALUES_HASH_SEED = 2166136261;

function appendWorkbookHashText(hash: number, text: string) {
  let next = hash;
  for (let i = 0; i < text.length; i += 1) {
    next ^= text.charCodeAt(i);
    next = Math.imul(next, 16777619);
  }
  return next >>> 0;
}

function finishWorkbookValuesHash(hash: number, length: number) {
  return appendWorkbookHashText(hash, `len:${length}|`).toString(36);
}

function appendWorkbookCellValueHash(hash: number, value: WorkbookCellValue | undefined) {
  const normalized = normalizeWorkbookCellValue(value);
  if (normalized === null) return appendWorkbookHashText(hash, "n|");
  if (typeof normalized === "number") return appendWorkbookHashText(hash, `d:${normalized}|`);
  if (typeof normalized === "boolean") return appendWorkbookHashText(hash, normalized ? "b:1|" : "b:0|");
  if (Array.isArray(normalized)) {
    let next = appendWorkbookHashText(hash, `a:${normalized.length}|`);
    for (const item of normalized) {
      next = appendWorkbookHashText(next, `${item.length}:${item}|`);
    }
    return next;
  }
  return appendWorkbookHashText(hash, `s:${normalized.length}:${normalized}|`);
}

export function normalizeWorkbookCellValue(value: WorkbookCellValue | undefined): WorkbookCellValue {
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

export function hashWorkbookValues(
  values: WorkbookCellValue[] | null | undefined,
  expectedLength?: number,
) {
  const source = Array.isArray(values) ? values : [];
  const length =
    typeof expectedLength === "number" && expectedLength >= 0
      ? Math.floor(expectedLength)
      : source.length;

  let hash = WORKBOOK_VALUES_HASH_SEED;
  for (let i = 0; i < length; i += 1) {
    hash = appendWorkbookCellValueHash(hash, source[i]);
  }
  return finishWorkbookValuesHash(hash, length);
}

/**
 * Hydrate values1D (snapshot số) vào đúng dataRect.
 * - Chỉ dùng cho mode xem/nhập submission.
 * - KHÔNG ghi đè khi values1D[i] = null (giữ nguyên cell cũ để không làm mất dữ liệu user thiết kế).
 * - Giữ nguyên style/formula/other props của cell nếu có.
 */
export function applyValues1DToSheet(
  sheet: any,
  dataRect: Rect,
  values1D: WorkbookCellValue[],
  spec?: HeaderSpec | null,
) {
  const cellRefs = buildCellRefsForValues(dataRect, spec, values1D?.length);
  if (!Array.isArray(values1D) || values1D.length !== cellRefs.length) return;

  const grid: any[][] = Array.isArray(sheet?.data) ? sheet.data : (sheet.data = []);

  for (let i = 0; i < cellRefs.length; i++) {
    const v = values1D[i];
    if (v == null) continue;

    const { r: rr, c: cc } = cellRefs[i];
    const dataType = spec ? getCellDataType(spec, dataRect, rr, cc) : undefined;

    grid[rr] = Array.isArray(grid[rr]) ? grid[rr] : (grid[rr] = []);
    const cell = grid[rr][cc];

    const cellValue = buildWorkbookCellValue(v, dataType);
    if (cell && typeof cell === "object") {
      grid[rr][cc] = { ...cell, ...cellValue };
    } else {
      grid[rr][cc] = cellValue;
    }
  }
}

function buildWorkbookCellValue(value: WorkbookCellValue, dataType?: string) {
  const displayValue = Array.isArray(value) ? value.join("; ") : String(value);
  if (dataType !== "NUMBER") return { v: displayValue, m: displayValue };

  const numeric = parseNumberLike(value) ?? parseNumberLike(displayValue);
  const ct = { t: "n" };
  return numeric == null
    ? { v: displayValue, m: displayValue, ct }
    : { v: numeric, m: String(numeric), ct };
}

function parseNumberLike(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return null;

  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function span(x?: any) {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function getCellText(v: any): string {
  const pick = (x: any) => (x == null ? "" : String(x));
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return pick(v).trim();
  }

  if (v.m != null) return pick(v.m).trim();
  if (v.v != null) return pick(v.v).trim();
  if (v.ct?.s != null) return pick(v.ct.s).trim();

  return "";
}

function getCellStoredValueText(v: any): string {
  const pick = (x: any) => (x == null ? "" : String(x));
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return pick(v).trim();
  }
  if (v.v != null) return pick(v.v).trim();
  if (v.m != null) return pick(v.m).trim();
  if (v.ct?.s != null) return pick(v.ct.s).trim();
  return "";
}

export function extractMasterCells(sheet: any): HeaderCell[] {
  const out: HeaderCell[] = [];

  // textAt ưu tiên sheet.data (raw save chắc chắn có), celldata chỉ là patch engine
  const textAt = new Map<string, string>();

  // 1) from sheet.data
  const grid: any[][] = Array.isArray(sheet?.data) ? sheet.data : [];
  for (let r = 0; r < grid.length; r++) {
    const row = Array.isArray(grid[r]) ? grid[r] : [];
    for (let c = 0; c < row.length; c++) {
      const txt = getCellText(row[c]);
      if (txt) textAt.set(`${r}:${c}`, txt);
    }
  }

  // 2) from celldata (fallback/override if needed)
  const celldata = Array.isArray(sheet?.celldata) ? sheet.celldata : [];
  for (const it of celldata) {
    const r = Number(it?.r);
    const c = Number(it?.c);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    const txt = getCellText(it?.v);
    if (txt) textAt.set(`${r}:${c}`, txt);
  }

  // 3) merge masters from config.merge
  const merge = sheet?.config?.merge ?? {};
  for (const k of Object.keys(merge)) {
    const m = merge[k];
    const r = Number(m?.r ?? m?.row ?? m?.r0);
    const c = Number(m?.c ?? m?.col ?? m?.c0);
    const rs = span(m?.rs ?? m?.rowspan ?? m?.rowSpan ?? m?.rows);
    const cs = span(m?.cs ?? m?.colspan ?? m?.colSpan ?? m?.cols);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;

    out.push({
      r,
      c,
      rowSpan: rs,
      colSpan: cs,
      text: textAt.get(`${r}:${c}`) ?? "",
    });
  }

  // 4) non-merged cells that have text (as 1x1 master)
  for (const [key, txt] of textAt.entries()) {
    const [rS, cS] = key.split(":");
    const r = Number(rS);
    const c = Number(cS);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;

    const isMergeMaster = out.some(
      (x) =>
        x.r === r &&
        x.c === c &&
        (((x.rowSpan ?? 1) > 1) || ((x.colSpan ?? 1) > 1))
    );
    if (isMergeMaster) continue;

    out.push({ r, c, rowSpan: 1, colSpan: 1, text: txt });
  }

  return out;
}

function parseTypedCellValue(
  cell: any,
  dataType: string,
  options: DynamicExcelStringListOption[] = [],
  allowRawEnumCode = false,
): { value: WorkbookCellValue; raw: string; issue?: string } {
  const raw = allowRawEnumCode ? getCellStoredValueText(cell) : getCellText(cell);
  if (dataType === "IGNORE") return { value: null, raw };
  if (!raw) return { value: null, raw };

  if (dataType === "NUMBER") {
    const value = parseNumberFromCell(cell);
    return value == null
      ? { value: null, raw, issue: "phải là số." }
      : { value, raw };
  }

  if (dataType === "DATE" || dataType === "FULL_DATE") {
    const mode = dataType === "FULL_DATE" ? "full" : "flexible";
    const value = normalizeDateInputValue(raw, mode);
    return value == null
      ? {
          value: null,
          raw,
          issue: `phải đúng định dạng ${getDateInputFormatLabel(mode)}.`,
        }
      : { value, raw };
  }

  if (dataType === "BOOLEAN") {
    const value = parseBooleanCellValue(cell, raw);
    return value == null
      ? { value: null, raw, issue: "phải là true/false hoặc 1/0." }
      : { value, raw };
  }

  if (dataType === "SHORT_TEXT") {
    if (allowRawEnumCode) return { value: raw, raw };

    if (options.length === 0) {
      return { value: null, raw, issue: "chưa cấu hình danh sách lựa chọn." };
    }

    const matched = resolveEnumOption(raw, options);

    return matched
      ? { value: matched.code, raw }
      : { value: null, raw, issue: "không thuộc danh sách lựa chọn đã cấu hình." };
  }

  if (dataType === "MULTI_SELECT") {
    if (allowRawEnumCode) {
      const codes = splitMultiSelectRaw(raw);
      return { value: codes.length > 0 ? codes : null, raw };
    }

    if (options.length === 0) {
      return { value: null, raw, issue: "chưa cấu hình danh sách lựa chọn." };
    }

    const parts = splitMultiSelectRaw(raw);
    if (parts.length === 0) return { value: null, raw };

    const codes: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();
    for (const part of parts) {
      const matched = resolveEnumOption(part, options);
      if (!matched) {
        invalid.push(part);
        continue;
      }

      const key = matched.code.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      codes.push(matched.code);
    }

    return invalid.length === 0
      ? { value: codes.length > 0 ? codes : null, raw }
      : { value: null, raw, issue: `không thuộc danh sách lựa chọn đã cấu hình: ${invalid.join("; ")}.` };
  }

  return { value: raw, raw };
}

function splitMultiSelectRaw(raw: string) {
  return raw
    .split(/[;\n]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildExcludedColumnSet(excludedDataColumns: number[]) {
  return new Set(
    excludedDataColumns
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0),
  );
}

function resolveEnumOption(
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

function parseBooleanCellValue(cell: any, raw: string): boolean | null {
  if (cell && typeof cell === "object" && typeof cell.v === "boolean") return cell.v;

  const normalized = raw.trim().toLowerCase();
  if (["true", "1", "yes", "y", "co", "có"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "khong", "không"].includes(normalized)) return false;
  return null;
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
