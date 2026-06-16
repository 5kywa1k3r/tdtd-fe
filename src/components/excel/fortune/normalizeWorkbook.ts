// src/components/excel/fortune/normalizeWorkbook.ts

type AnyObj = Record<string, any>;

function cloneGrid2D(data: any): any[][] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => (Array.isArray(row) ? [...row] : []));
}

function ensureMatrixSize(data: any[][], rows: number, cols: number) {
  const out = Array.isArray(data) ? data : [];

  while (out.length < rows) out.push([]);

  for (let r = 0; r < rows; r++) {
    const row = Array.isArray(out[r]) ? out[r] : (out[r] = []);
    while (row.length < cols) row.push(null);
    if (row.length > cols) row.length = cols;
  }

  if (out.length > rows) out.length = rows;

  return out;
}

function sanitizeMerge(merge: any, rows: number, cols: number) {
  if (!merge || typeof merge !== "object") return {};

  const out: AnyObj = { ...merge };

  for (const k of Object.keys(out)) {
    const m = out[k];
    if (!m || typeof m !== "object") {
      delete out[k];
      continue;
    }

    const r = Number(m.r);
    const c = Number(m.c);
    const rs = Number(m.rs ?? 1);
    const cs = Number(m.cs ?? 1);

    if (!Number.isFinite(r) || !Number.isFinite(c) || !Number.isFinite(rs) || !Number.isFinite(cs)) {
      delete out[k];
      continue;
    }

    const r1 = r + rs - 1;
    const c1 = c + cs - 1;

    if (r < 0 || c < 0 || rs <= 0 || cs <= 0 || r >= rows || c >= cols || r1 >= rows || c1 >= cols) {
      delete out[k];
    }
  }

  return out;
}

function buildMergeRects(merge: AnyObj) {
  const rects: Array<{ r0: number; c0: number; r1: number; c1: number }> = [];
  for (const item of Object.values<any>(merge)) {
    const r0 = Math.floor(Number(item?.r ?? item?.row ?? item?.r0));
    const c0 = Math.floor(Number(item?.c ?? item?.col ?? item?.c0));
    const rs = Math.max(1, Math.floor(Number(item?.rs ?? item?.rowspan ?? item?.rowSpan ?? item?.rows ?? 1)));
    const cs = Math.max(1, Math.floor(Number(item?.cs ?? item?.colspan ?? item?.colSpan ?? item?.cols ?? 1)));
    if (!Number.isFinite(r0) || !Number.isFinite(c0) || !Number.isFinite(rs) || !Number.isFinite(cs)) continue;
    if (rs <= 1 && cs <= 1) continue;
    rects.push({ r0, c0, r1: r0 + rs - 1, c1: c0 + cs - 1 });
  }
  return rects;
}

function findMergeRectForCell(
  rects: Array<{ r0: number; c0: number; r1: number; c1: number }>,
  r: number,
  c: number,
) {
  return rects.find((rect) => r >= rect.r0 && r <= rect.r1 && c >= rect.c0 && c <= rect.c1) ?? null;
}

export function sanitizeMergeBorderInfo(borderInfo: any, merge: AnyObj) {
  if (!Array.isArray(borderInfo) || !merge || typeof merge !== "object") return Array.isArray(borderInfo) ? borderInfo : [];

  const mergeRects = buildMergeRects(merge);
  if (mergeRects.length === 0) return borderInfo;

  return borderInfo
    .map((item: any) => {
      const value = item?.value;
      const r = Number(value?.row_index);
      const c = Number(value?.col_index);
      if (item?.rangeType !== "cell" || !Number.isFinite(r) || !Number.isFinite(c) || !value || typeof value !== "object") {
        return item;
      }

      const mergeRect = findMergeRectForCell(mergeRects, r, c);
      if (!mergeRect) return item;

      const nextValue = { ...value };
      if (r > mergeRect.r0) delete nextValue.t;
      if (r < mergeRect.r1) delete nextValue.b;
      if (c > mergeRect.c0) delete nextValue.l;
      if (c < mergeRect.c1) delete nextValue.r;

      return Object.keys(nextValue).length > 2 ? { ...item, value: nextValue } : null;
    })
    .filter(Boolean);
}

function buildMergeChildKeys(merge: AnyObj) {
  const keys = new Set<string>();
  for (const m of Object.values<any>(merge)) {
    const r0 = Number(m?.r);
    const c0 = Number(m?.c);
    const rs = Number(m?.rs ?? 1);
    const cs = Number(m?.cs ?? 1);
    if (!Number.isFinite(r0) || !Number.isFinite(c0) || !Number.isFinite(rs) || !Number.isFinite(cs)) continue;

    for (let r = r0; r < r0 + rs; r += 1) {
      for (let c = c0; c < c0 + cs; c += 1) {
        if (r === r0 && c === c0) continue;
        keys.add(`${r},${c}`);
      }
    }
  }
  return keys;
}

function clearMergeChildren(sheet: AnyObj, merge: AnyObj) {
  const childKeys = buildMergeChildKeys(merge);
  if (childKeys.size === 0) return;

  const data = Array.isArray(sheet.data) ? sheet.data : [];
  for (const key of childKeys) {
    const [rs, cs] = key.split(",");
    const r = Number(rs);
    const c = Number(cs);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    const row = data[r];
    if (Array.isArray(row)) row[c] = null;
  }

  sheet.celldata = (Array.isArray(sheet.celldata) ? sheet.celldata : []).filter((it: any) => {
    const r = Number(it?.r);
    const c = Number(it?.c);
    return !childKeys.has(`${r},${c}`);
  });
}

function buildCelldataFirstIndex(sheet: AnyObj) {
  const idx = new Map<string, number>();
  const cd = Array.isArray(sheet.celldata) ? sheet.celldata : [];
  for (let i = 0; i < cd.length; i += 1) {
    const item = cd[i];
    const r = Number(item?.r);
    const c = Number(item?.c);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    const key = `${r},${c}`;
    if (!idx.has(key)) idx.set(key, i);
  }
  return idx;
}

function upsertCelldata(sheet: AnyObj, r: number, c: number, v: AnyObj, firstIdx: Map<string, number>) {
  sheet.celldata = Array.isArray(sheet.celldata) ? sheet.celldata : [];
  const key = `${r},${c}`;
  const index = firstIdx.get(key);
  if (typeof index === "number" && index >= 0 && index < sheet.celldata.length) {
    sheet.celldata[index] = { r, c, v };
    return;
  }

  sheet.celldata.push({ r, c, v });
  firstIdx.set(key, sheet.celldata.length - 1);
}

function normalizeFormulaText(formula: any) {
  if (typeof formula !== "string") return null;
  const text = formula.trim();
  if (!text) return null;
  return text.startsWith("=") ? text : `=${text}`;
}

function normalizeFormulaCell(cell: any) {
  if (!cell || typeof cell !== "object" || Array.isArray(cell)) return null;
  const formula = normalizeFormulaText(cell.f);
  if (!formula) return null;
  if (cell.f !== formula) cell.f = formula;
  return formula;
}

export function syncFormulaCalcChain(sheet: AnyObj) {
  const sheetId = String(sheet?.id ?? sheet?.index ?? "sheet-1");
  const data = Array.isArray(sheet?.data) ? sheet.data : [];
  const chain: Array<{ r: number; c: number; id: string }> = [];
  const seen = new Set<string>();

  const addFormulaCell = (r: number, c: number, cell: any) => {
    if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) return;
    if (!normalizeFormulaCell(cell)) return;
    const key = `${r},${c}`;
    if (seen.has(key)) return;
    seen.add(key);
    chain.push({ r, c, id: sheetId });
  };

  for (let r = 0; r < data.length; r += 1) {
    const row = Array.isArray(data[r]) ? data[r] : [];
    for (let c = 0; c < row.length; c += 1) {
      addFormulaCell(r, c, row[c]);
    }
  }

  const celldata = Array.isArray(sheet?.celldata) ? sheet.celldata : [];
  for (const item of celldata) {
    const r = Math.floor(Number(item?.r));
    const c = Math.floor(Number(item?.c));
    const cell = item?.v;
    const formula = normalizeFormulaCell(cell);
    if (!formula) continue;

    if (Array.isArray(data) && r >= 0 && c >= 0) {
      data[r] = Array.isArray(data[r]) ? data[r] : [];
      const dataFormula = normalizeFormulaCell(data[r][c]);
      if (!dataFormula) data[r][c] = cell;
    }
    addFormulaCell(r, c, cell);
  }

  sheet.calcChain = chain;
}

function stripStaleMergeMetadata(cell: any) {
  if (!cell || typeof cell !== "object" || Array.isArray(cell) || cell.mc == null) return cell;
  const next = { ...cell };
  delete next.mc;
  return Object.keys(next).length > 0 ? next : null;
}

function syncMergeCellMetadata(sheet: AnyObj, merge: AnyObj) {
  const masters = new Map<string, { r: number; c: number; rs: number; cs: number }>();
  for (const item of Object.values<any>(merge)) {
    const r = Math.floor(Number(item?.r));
    const c = Math.floor(Number(item?.c));
    const rs = Math.max(1, Math.floor(Number(item?.rs ?? 1)));
    const cs = Math.max(1, Math.floor(Number(item?.cs ?? 1)));
    if (!Number.isFinite(r) || !Number.isFinite(c) || !Number.isFinite(rs) || !Number.isFinite(cs)) continue;
    if (rs <= 1 && cs <= 1) continue;
    masters.set(`${r},${c}`, { r, c, rs, cs });
  }

  const data = Array.isArray(sheet.data) ? sheet.data : [];
  for (let r = 0; r < data.length; r += 1) {
    const row = Array.isArray(data[r]) ? data[r] : [];
    for (let c = 0; c < row.length; c += 1) {
      if (masters.has(`${r},${c}`)) continue;
      row[c] = stripStaleMergeMetadata(row[c]);
    }
  }

  sheet.celldata = (Array.isArray(sheet.celldata) ? sheet.celldata : [])
    .map((item: any) => {
      const r = Number(item?.r);
      const c = Number(item?.c);
      if (!Number.isFinite(r) || !Number.isFinite(c) || masters.has(`${r},${c}`)) return item;
      const nextValue = stripStaleMergeMetadata(item?.v);
      return nextValue ? { ...item, v: nextValue } : null;
    })
    .filter(Boolean);

  const firstIdx = buildCelldataFirstIndex(sheet);
  for (const master of masters.values()) {
    sheet.data[master.r] = Array.isArray(sheet.data[master.r]) ? sheet.data[master.r] : [];
    const current = sheet.data[master.r][master.c];
    const next = current && typeof current === "object" && !Array.isArray(current) ? { ...current } : {};
    next.mc = { r: master.r, c: master.c, rs: master.rs, cs: master.cs };
    sheet.data[master.r][master.c] = next;
    upsertCelldata(sheet, master.r, master.c, next, firstIdx);

    for (let r = master.r; r < master.r + master.rs; r += 1) {
      sheet.data[r] = Array.isArray(sheet.data[r]) ? sheet.data[r] : [];
      for (let c = master.c; c < master.c + master.cs; c += 1) {
        if (r === master.r && c === master.c) continue;
        sheet.data[r][c] = { mc: { r: master.r, c: master.c } };
      }
    }
  }
}

function sanitizeCelldata(celldata: any, rows: number, cols: number) {
  const cd = Array.isArray(celldata) ? celldata : [];
  return cd.filter((it) => {
    const r = Number(it?.r);
    const c = Number(it?.c);
    if (!Number.isFinite(r) || !Number.isFinite(c)) return false;
    return r >= 0 && r < rows && c >= 0 && c < cols;
  });
}

function dedupeCelldata(celldata: any[]) {
  const last = new Map<string, any>();
  for (const it of celldata) {
    const r = Number(it?.r);
    const c = Number(it?.c);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    last.set(`${r},${c}`, it); // last wins
  }
  return Array.from(last.values());
}

function toPositiveCount(value: any, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const count = Math.floor(n);
  return count > 0 ? count : fallback;
}

function createFallbackSheet(rows: number, cols: number): AnyObj {
  return {
    id: "sheet-1",
    index: "sheet-1",
    name: "Sheet1",
    order: 0,
    status: 1,
    row: rows,
    column: cols,
    config: { merge: {} },
    data: Array.from({ length: rows }, () => Array.from({ length: cols }, () => null)),
    celldata: [],
  };
}

/**
 * ✅ Nếu celldata rỗng: build lại từ data cho các ô có object (bg/v/m/ct/f/...)
 * FortuneSheet/Luckysheet nhiều lúc render style dựa celldata ổn định hơn data.
 */
function buildCelldataFromDataIfEmpty(sheet: AnyObj) {
  const cd = Array.isArray(sheet.celldata) ? sheet.celldata : [];
  if (cd.length > 0) return;

  const data = Array.isArray(sheet.data) ? sheet.data : [];
  const out: any[] = [];

  for (let r = 0; r < data.length; r++) {
    const row = Array.isArray(data[r]) ? data[r] : [];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (!cell || typeof cell !== "object") continue;

      // chỉ cần có style/value gì đó là đưa vào celldata
      if (
        cell.bg != null ||
        cell.v != null ||
        cell.m != null ||
        cell.f != null ||
        cell.ct != null ||
        cell.fc != null ||
        cell.ff != null ||
        cell.bl != null ||
        cell.it != null ||
        cell.mc != null
      ) {
        out.push({ r, c, v: cell });
      }
    }
  }

  sheet.celldata = out;
}

/**
 * Ép workbook về 1 sheet, resize rows/cols mà KHÔNG làm mất nội dung/style.
 * QUAN TRỌNG:
 * - FortuneSheet thường render style ổn định qua sheet.celldata => phải preserve/rebuild.
 */
export function normalizeToSingleSheet(raw: any, rows: number, cols: number) {
  const safeRows = toPositiveCount(rows, 1);
  const safeCols = toPositiveCount(cols, 1);
  const sheets = Array.isArray(raw) ? raw : [];
  const first = sheets[0] && typeof sheets[0] === "object" ? sheets[0] : null;
  const fallback = createFallbackSheet(safeRows, safeCols);

  const sheet0 = (first ?? fallback) as AnyObj;

  const sheet: AnyObj = { ...sheet0 };

  sheet.id = String(sheet0.id ?? sheet0.index ?? "sheet-1");
  sheet.index = sheet0.index ?? sheet.id;
  sheet.name = sheet0.name ?? "Sheet1";
  sheet.order = typeof sheet0.order === "number" ? sheet0.order : 0;
  sheet.status = typeof sheet0.status === "number" ? sheet0.status : 1;
  sheet.row = safeRows; // COUNT
  sheet.column = safeCols; // COUNT

  // data grid
  const grid = ensureMatrixSize(cloneGrid2D(sheet0.data), safeRows, safeCols);
  sheet.data = grid;

  // preserve celldata (lọc bounds) + dedupe
  sheet.celldata = dedupeCelldata(sanitizeCelldata(sheet0.celldata, safeRows, safeCols));

  // ✅ nếu celldata rỗng, rebuild từ data để bg/style render được trong view
  buildCelldataFromDataIfEmpty(sheet);

  // config + merge sanitize (giữ các config khác)
  sheet.config = sheet0.config && typeof sheet0.config === "object" ? { ...sheet0.config } : {};
  const merge0 = sheet0.config?.merge ?? {};
  sheet.config.merge = sanitizeMerge(merge0, safeRows, safeCols);
  clearMergeChildren(sheet, sheet.config.merge);
  syncMergeCellMetadata(sheet, sheet.config.merge);
  if (Array.isArray(sheet.config.borderInfo)) {
    sheet.config.borderInfo = sanitizeMergeBorderInfo(sheet.config.borderInfo, sheet.config.merge);
  }
  syncFormulaCalcChain(sheet);

  return [sheet];
}
