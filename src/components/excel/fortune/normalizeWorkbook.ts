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

  return [sheet];
}
