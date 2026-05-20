// src/components/excel/fortune/fortuneAdapter.ts
import type { Rect } from "./regions";
import type { DynamicExcelStringListOption, HeaderCell, HeaderSpec } from "./types";
import {
  getCellDataType,
  getCellStringListOptions,
  isDynamicExcelEnumDataType,
} from "./dataTypes";
import {
  getDateInputFormatLabel,
  normalizeDateInputValue,
} from "../../../utils/dateInputFormat";

export type WorkbookCellValue = string | string[] | number | boolean | null;

export type WorkbookValueValidationIssue = {
  r: number;
  c: number;
  cellRef: string;
  dataType: string;
  value: string;
  message: string;
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

export function extractNumericValues1D(sheet: any, dataRect: Rect): (number | null)[] {
  const grid: any[][] = Array.isArray(sheet?.data) ? sheet.data : [];

  const out: (number | null)[] = [];
  for (let r = dataRect.r0; r <= dataRect.r1; r++) {
    const row = grid[r] ?? [];
    for (let c = dataRect.c0; c <= dataRect.c1; c++) {
      out.push(parseNumberFromCell(row[c]));
    }
  }
  return out;
}

export function extractTypedValues1D(
  sheet: any,
  dataRect: Rect,
  spec: HeaderSpec | null | undefined,
): {
  values1D: WorkbookCellValue[];
  issues: WorkbookValueValidationIssue[];
} {
  const grid: any[][] = Array.isArray(sheet?.data) ? sheet.data : [];
  const values1D: WorkbookCellValue[] = [];
  const issues: WorkbookValueValidationIssue[] = [];

  for (let r = dataRect.r0; r <= dataRect.r1; r++) {
    const row = grid[r] ?? [];
    for (let c = dataRect.c0; c <= dataRect.c1; c++) {
      const dataType = spec ? getCellDataType(spec, dataRect, r, c) : "NUMBER";
      const options = isDynamicExcelEnumDataType(dataType) && spec
        ? getCellStringListOptions(spec, dataRect, r, c)
        : [];
      const parsed = parseTypedCellValue(row[c], dataType, options);
      values1D.push(parsed.value);
      if (parsed.issue) {
        const cellRef = toExcelRef(r, c);
        issues.push({
          r,
          c,
          cellRef,
          dataType,
          value: parsed.raw,
          message: `${cellRef}: ${parsed.issue}`,
        });
      }
    }
  }

  return { values1D, issues };
}

/**
 * Hydrate values1D (snapshot số) vào đúng dataRect.
 * - Chỉ dùng cho mode xem/nhập submission.
 * - KHÔNG ghi đè khi values1D[i] = null (giữ nguyên cell cũ để không làm mất dữ liệu user thiết kế).
 * - Giữ nguyên style/formula/other props của cell nếu có.
 */
export function applyValues1DToSheet(sheet: any, dataRect: Rect, values1D: WorkbookCellValue[]) {
  const rows = dataRect.r1 - dataRect.r0 + 1;
  const cols = dataRect.c1 - dataRect.c0 + 1;
  const need = rows * cols;

  if (!Array.isArray(values1D) || values1D.length !== need) return;

  const grid: any[][] = Array.isArray(sheet?.data) ? sheet.data : (sheet.data = []);

  for (let i = 0; i < need; i++) {
    const v = values1D[i];
    if (v == null) continue;

    const rr = dataRect.r0 + Math.floor(i / cols);
    const cc = dataRect.c0 + (i % cols);

    grid[rr] = Array.isArray(grid[rr]) ? grid[rr] : (grid[rr] = []);
    const cell = grid[rr][cc];

    const displayValue = formatWorkbookCellDisplayValue(v);

    if (cell && typeof cell === "object") {
      grid[rr][cc] = { ...cell, v: displayValue, m: displayValue };
    } else {
      grid[rr][cc] = { v: displayValue, m: displayValue };
    }
  }
}

function formatWorkbookCellDisplayValue(value: WorkbookCellValue) {
  return Array.isArray(value) ? value.join("; ") : String(value);
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
): { value: WorkbookCellValue; raw: string; issue?: string } {
  const raw = getCellText(cell);
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
    if (options.length === 0) {
      return { value: null, raw, issue: "chưa cấu hình danh sách lựa chọn." };
    }

    const matched = resolveEnumOption(raw, options);

    return matched
      ? { value: matched.code, raw }
      : { value: null, raw, issue: "không thuộc danh sách lựa chọn đã cấu hình." };
  }

  if (dataType === "MULTI_SELECT") {
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
