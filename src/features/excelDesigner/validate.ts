import type { Anchor, HeaderCell, HeaderSpec, ValidationIssue } from "./types";
import { getTableRect } from "./getTableRect";

/* ================= helpers ================= */

const span = (x?: number) => (x && x > 0 ? x : 1);

type Rect = { r0: number; c0: number; rows: number; cols: number };

const inRect = (r: number, c: number, a: Rect) =>
  r >= a.r0 && r < a.r0 + a.rows && c >= a.c0 && c < a.c0 + a.cols;

const rectsOverlap = (A: Rect, B: Rect) => {
  const ar2 = A.r0 + A.rows;
  const ac2 = A.c0 + A.cols;
  const br2 = B.r0 + B.rows;
  const bc2 = B.c0 + B.cols;
  return A.r0 < br2 && ar2 > B.r0 && A.c0 < bc2 && ac2 > B.c0;
};

const cellRect = (c: HeaderCell): Rect => ({
  r0: c.r,
  c0: c.c,
  rows: span(c.rowSpan),
  cols: span(c.colSpan),
});

function normalizeBase0(cells: HeaderCell[]): HeaderCell[] {
  if (cells.length === 0) return cells;
  const hasZeroR = cells.some((x) => x.r === 0);
  const hasZeroC = cells.some((x) => x.c === 0);
  const minR = Math.min(...cells.map((x) => x.r));
  const minC = Math.min(...cells.map((x) => x.c));

  // nếu không có 0 và min >= 1 thì coi là 1-based -> convert
  const shiftR = !hasZeroR && minR >= 1 ? 1 : 0;
  const shiftC = !hasZeroC && minC >= 1 ? 1 : 0;

  if (shiftR === 0 && shiftC === 0) return cells;

  return cells.map((x) => ({
    ...x,
    r: x.r - shiftR,
    c: x.c - shiftC,
  }));
}

/* ================= chain coverage ================= */

function validateTopChains(args: {
  top: Rect;
  table: Rect;
  masters: HeaderCell[];
  issues: ValidationIssue[];
}) {
  const { top, masters, issues } = args;
  const topR1 = top.r0;
  const topR2 = top.r0 + top.rows - 1;

  for (let c = top.c0; c < top.c0 + top.cols; c++) {
    const segs: Array<{ s: number; e: number }> = [];

    for (const cell of masters) {
      const R = cellRect(cell);
      if (!rectsOverlap(R, top)) continue;
      if (!(c >= R.c0 && c < R.c0 + R.cols)) continue;

      const s = Math.max(R.r0, topR1);
      const e = Math.min(R.r0 + R.rows - 1, topR2);
      if (s <= e) segs.push({ s, e });
    }

    if (segs.length === 0) {
      issues.push({
        code: "LEAF_NOT_MERGED",
        message: `Cột TOP ${c - top.c0 + 1} thiếu coverage.`,
        at: { r: topR2, c },
      });
      continue;
    }

    segs.sort((a, b) => a.s - b.s || a.e - b.e);
    const merged: Array<{ s: number; e: number }> = [];
    for (const seg of segs) {
      const last = merged[merged.length - 1];
      if (!last || seg.s > last.e + 1) merged.push({ ...seg });
      else last.e = Math.max(last.e, seg.e);
    }

    // phải phủ liên tục toàn cột trong vùng TOP
    if (merged[0].s !== topR1 || merged[merged.length - 1].e !== topR2 || merged.length !== 1) {
      issues.push({
        code: "LEAF_NOT_MERGED",
        message: `Cột TOP ${c - top.c0 + 1} phải phủ liên tục từ hàng ${topR1 + 1} đến ${topR2 + 1} (merge chain bị hở).`,
        at: { r: topR2, c },
      });
    }
  }
}

function validateLeftChains(args: {
  left: Rect;
  masters: HeaderCell[];
  issues: ValidationIssue[];
}) {
  const { left, masters, issues } = args;
  const leftC1 = left.c0;
  const leftC2 = left.c0 + left.cols - 1;

  for (let r = left.r0; r < left.r0 + left.rows; r++) {
    const segs: Array<{ s: number; e: number }> = [];

    for (const cell of masters) {
      const R = cellRect(cell);
      if (!rectsOverlap(R, left)) continue;
      if (!(r >= R.r0 && r < R.r0 + R.rows)) continue;

      const s = Math.max(R.c0, leftC1);
      const e = Math.min(R.c0 + R.cols - 1, leftC2);
      if (s <= e) segs.push({ s, e });
    }

    if (segs.length === 0) {
      issues.push({
        code: "LEAF_NOT_MERGED",
        message: `Hàng LEFT ${r - left.r0 + 1} thiếu coverage.`,
        at: { r, c: leftC2 },
      });
      continue;
    }

    segs.sort((a, b) => a.s - b.s || a.e - b.e);
    const merged: Array<{ s: number; e: number }> = [];
    for (const seg of segs) {
      const last = merged[merged.length - 1];
      if (!last || seg.s > last.e + 1) merged.push({ ...seg });
      else last.e = Math.max(last.e, seg.e);
    }

    if (merged[0].s !== leftC1 || merged[merged.length - 1].e !== leftC2 || merged.length !== 1) {
      issues.push({
        code: "LEAF_NOT_MERGED",
        message: `Hàng LEFT ${r - left.r0 + 1} phải phủ liên tục từ cột ${leftC1 + 1} đến ${leftC2 + 1} (merge chain bị hở).`,
        at: { r, c: leftC2 },
      });
    }
  }
}

/* ================= main ================= */

export function validateHeader(params: {
  spec: HeaderSpec;
  topAnchor: Anchor;
  leftAnchor: Anchor;
  sheetRows: number;
  sheetCols: number;
  masterCells: HeaderCell[];
}) {
  const { spec, topAnchor, leftAnchor } = params;
  const masters = normalizeBase0(params.masterCells);

  const issues: ValidationIssue[] = [];
  const table = getTableRect(spec);

  // build master map + owner coverage
  const masterMap = new Map<string, HeaderCell>();
  for (const m of masters) masterMap.set(`${m.r}:${m.c}`, m);

  const owner: (string | null)[][] = Array.from({ length: table.rows }, () => Array(table.cols).fill(null));

  // fill owner + merge out of table
  for (const m of masters) {
    const key = `${m.r}:${m.c}`;
    const R = cellRect(m);

    for (let r = R.r0; r < R.r0 + R.rows; r++) {
      for (let c = R.c0; c < R.c0 + R.cols; c++) {
        if (!inRect(r, c, table)) {
          issues.push({
            code: "OUTSIDE_HEADER",
            message: `Merge phủ ra ngoài vùng bảng tại (${r + 1},${c + 1}).`,
            at: { r, c },
          });
          continue;
        }
        owner[r - table.r0][c - table.c0] = key;
      }
    }
  }

  // rects by kind
  const top: Rect | null =
    spec.kind === "TOP" || spec.kind === "MATRIX"
      ? { r0: topAnchor.r0, c0: topAnchor.c0, rows: (spec as any).topRows, cols: (spec as any).topCols }
      : null;

  const left: Rect | null =
    spec.kind === "LEFT" || spec.kind === "MATRIX"
      ? { r0: leftAnchor.r0, c0: leftAnchor.c0, rows: (spec as any).leftRows, cols: (spec as any).leftCols }
      : null;

  // corner gap only for MATRIX (khối trống giao 2 header)
  const cornerGap: Rect | null =
    spec.kind === "MATRIX"
      ? { r0: topAnchor.r0, c0: 0, rows: (spec as any).topRows, cols: (spec as any).leftCols }
      : null;

  const isInHeaderUnion = (r: number, c: number) => {
    if (spec.kind === "TOP") return !!top && inRect(r, c, top);
    if (spec.kind === "LEFT") return !!left && inRect(r, c, left);

    // MATRIX = union(top,left) - cornerGap
    const inTop = !!top && inRect(r, c, top);
    const inLeft = !!left && inRect(r, c, left);
    const inGap = !!cornerGap && inRect(r, c, cornerGap);
    return (inTop || inLeft) && !inGap;
  };

  const overlapsHeaderUnion = (R: Rect) => {
    if (spec.kind !== "MATRIX") {
      return (top && rectsOverlap(R, top)) || (left && rectsOverlap(R, left));
    }
    // MATRIX: overlap union nếu có ít nhất 1 cell nằm trong union
    for (let r = R.r0; r < R.r0 + R.rows; r++) {
      for (let c = R.c0; c < R.c0 + R.cols; c++) {
        if (!inRect(r, c, table)) continue;
        if (isInHeaderUnion(r, c)) return true;
      }
    }
    return false;
  };

  const overlapsNonHeader = (R: Rect) => {
    for (let r = R.r0; r < R.r0 + R.rows; r++) {
      for (let c = R.c0; c < R.c0 + R.cols; c++) {
        if (!inRect(r, c, table)) continue;
        if (!isInHeaderUnion(r, c)) return true;
      }
    }
    return false;
  };

  /* =================================================
     RULE 1: HEADER CELLS must be non-empty (coverage-based)
     - ô header nào không có owner => trống
     - ô header có owner => text của master phải != ""
     ================================================= */

  if (top) {
    for (let r = top.r0; r < top.r0 + top.rows; r++) {
      for (let c = top.c0; c < top.c0 + top.cols; c++) {
        // MATRIX: bỏ qua corner gap
        if (spec.kind === "MATRIX" && cornerGap && inRect(r, c, cornerGap)) continue;

        const key = owner[r - table.r0]?.[c - table.c0] ?? null;
        if (!key) {
          issues.push({
            code: "EMPTY_HEADER",
            message: `Ô header trống tại (${r + 1},${c + 1}).`,
            at: { r, c },
          });
          continue;
        }
        const m = masterMap.get(key);
        const txt = (m?.text ?? "").trim();
        if (!txt) {
          issues.push({
            code: "EMPTY_HEADER",
            message: `Ô header trống tại merge master (${(m?.r ?? r) + 1},${(m?.c ?? c) + 1}).`,
            at: { r: m?.r ?? r, c: m?.c ?? c },
          });
        }
      }
    }
  }

  if (left) {
    for (let r = left.r0; r < left.r0 + left.rows; r++) {
      for (let c = left.c0; c < left.c0 + left.cols; c++) {
        // MATRIX: bỏ qua corner gap
        if (spec.kind === "MATRIX" && cornerGap && inRect(r, c, cornerGap)) continue;

        const key = owner[r - table.r0]?.[c - table.c0] ?? null;
        if (!key) {
          issues.push({
            code: "EMPTY_HEADER",
            message: `Ô header trống tại (${r + 1},${c + 1}).`,
            at: { r, c },
          });
          continue;
        }
        const m = masterMap.get(key);
        const txt = (m?.text ?? "").trim();
        if (!txt) {
          issues.push({
            code: "EMPTY_HEADER",
            message: `Ô header trống tại merge master (${(m?.r ?? r) + 1},${(m?.c ?? c) + 1}).`,
            at: { r: m?.r ?? r, c: m?.c ?? c },
          });
        }
      }
    }
  }

  /* =================================================
     RULE 2: NON-HEADER must be empty
     (có owner + master text != "" => lỗi)
     ================================================= */

  for (let r = table.r0; r < table.r0 + table.rows; r++) {
    for (let c = table.c0; c < table.c0 + table.cols; c++) {
      if (isInHeaderUnion(r, c)) continue;

      const key = owner[r - table.r0]?.[c - table.c0] ?? null;
      if (!key) continue;

      const m = masterMap.get(key);
      const txt = (m?.text ?? "").trim();
      if (txt) {
        issues.push({
          code: "OUTSIDE_HEADER",
          message: `Ô ngoài header phải trống nhưng có giá trị tại (${r + 1},${c + 1}).`,
          at: { r, c },
        });
      }
    }
  }

  /* =================================================
     RULE 3: cấm merge cross boundary (header ↔ non-header)
     ================================================= */

  for (const m of masters) {
    const R = cellRect(m);
    if (!rectsOverlap(R, table)) continue;

    const inHeader = overlapsHeaderUnion(R);
    const inNonHeader = overlapsNonHeader(R);

    if (inHeader && inNonHeader) {
      issues.push({
        code: "OUTSIDE_HEADER",
        message: `Merge không được lấn giữa header và phần trống (master ${m.r + 1},${m.c + 1}).`,
        at: { r: m.r, c: m.c },
      });
    }
  }

  /* =================================================
     RULE 4: chain coverage theo TOP/LEFT
     ================================================= */

  if (top) validateTopChains({ top, table, masters, issues });
  if (left) validateLeftChains({ left, masters, issues });

  /* ================= meta preview ================= */

  const headerMasters = masters
    .filter((m) => overlapsHeaderUnion(cellRect(m)))
    .map((m) => ({
      r: m.r,
      c: m.c,
      text: (m.text ?? "").trim(),
      rowSpan: span(m.rowSpan),
      colSpan: span(m.colSpan),
    }));

  return {
    ok: issues.length === 0,
    issues,
    meta: { kind: spec.kind, table, topAnchor, leftAnchor, top, left, cornerGap, headerMasters },
  };
}
