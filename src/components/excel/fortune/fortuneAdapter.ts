// src/components/excel/fortune/fortuneAdapter.ts
import type { Rect } from "./regions";
import type { HeaderCell } from "./types";

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

/**
 * Hydrate values1D (snapshot số) vào đúng dataRect.
 * - Chỉ dùng cho mode xem/nhập submission.
 * - KHÔNG ghi đè khi values1D[i] = null (giữ nguyên cell cũ để không làm mất dữ liệu user thiết kế).
 * - Giữ nguyên style/formula/other props của cell nếu có.
 */
export function applyValues1DToSheet(sheet: any, dataRect: Rect, values1D: (number | null)[]) {
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

    if (cell && typeof cell === "object") {
      grid[rr][cc] = { ...cell, v, m: String(v) };
    } else {
      grid[rr][cc] = { v, m: String(v) };
    }
  }
}

function span(x?: any) {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function getCellText(v: any): string {
  const pick = (x: any) => (x == null ? "" : String(x));
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return pick(v).trim();

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