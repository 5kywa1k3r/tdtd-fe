// src/components/excel/fortune/validate.ts
import type { Anchor, HeaderCell, HeaderSpec, ValidationIssue } from "./types";
import { computeRegions, getTableRect, type Rect } from "./regions";

/* ================= helpers ================= */

const span = (x?: number) => (x && x > 0 ? x : 1);

const rectRows = (R: Rect) => R.r1 - R.r0 + 1;
const rectCols = (R: Rect) => R.c1 - R.c0 + 1;

const inRect = (r: number, c: number, a: Rect) =>
  r >= a.r0 && r <= a.r1 && c >= a.c0 && c <= a.c1;

const rectsOverlap = (A: Rect, B: Rect) =>
  A.r0 <= B.r1 && A.r1 >= B.r0 && A.c0 <= B.c1 && A.c1 >= B.c0;

const cellRect = (c: HeaderCell): Rect => {
  const rs = span(c.rowSpan);
  const cs = span(c.colSpan);
  return {
    r0: c.r,
    c0: c.c,
    r1: c.r + rs - 1,
    c1: c.c + cs - 1,
  };
};

/* ================= Excel coordinate ================= */

function colToExcel(col: number): string {
  let s = "";
  let n = col + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function toExcel(r: number, c: number): string {
  return `${colToExcel(c)}${r + 1}`;
}

function rectToExcel(R: Rect): string {
  const start = toExcel(R.r0, R.c0);
  const end = toExcel(R.r1, R.c1);
  return `${start}:${end}`;
}

const hasText = (m?: HeaderCell | null) => ((m?.text ?? "").trim().length > 0);

/* ================= main ================= */

export function validateHeader(params: {
  spec: HeaderSpec;
  topAnchor: Anchor;
  leftAnchor: Anchor;
  sheetRows: number; // giữ để compatible (chưa dùng)
  sheetCols: number; // giữ để compatible (chưa dùng)
  masterCells: HeaderCell[];
}) {
  const { spec, topAnchor, leftAnchor } = params;

  const issues: ValidationIssue[] = [];
  const table = getTableRect(spec);
  const masters = params.masterCells ?? [];

  /* ===== xác định vùng tiêu đề (Rect inclusive) ===== */

  const top: Rect | null =
    spec.kind === "TOP" || spec.kind === "MATRIX"
      ? {
          r0: topAnchor.r0,
          c0: topAnchor.c0,
          r1: topAnchor.r0 + (spec as any).topRows - 1,
          c1: topAnchor.c0 + (spec as any).topCols - 1,
        }
      : null;

  const left: Rect | null =
    spec.kind === "LEFT" || spec.kind === "MATRIX"
      ? {
          r0: leftAnchor.r0,
          c0: leftAnchor.c0,
          r1: leftAnchor.r0 + (spec as any).leftRows - 1,
          c1: leftAnchor.c0 + (spec as any).leftCols - 1,
        }
      : null;

  // MATRIX: vùng giao “góc trên trái” được phép để trống
  const cornerGap: Rect | null =
    spec.kind === "MATRIX"
      ? {
          r0: topAnchor.r0,
          c0: leftAnchor.c0,
          r1: topAnchor.r0 + (spec as any).topRows - 1,
          c1: leftAnchor.c0 + (spec as any).leftCols - 1,
        }
      : null;

  const isInHeader = (r: number, c: number) => {
    if (spec.kind === "TOP") return !!top && inRect(r, c, top);
    if (spec.kind === "LEFT") return !!left && inRect(r, c, left);

    // MATRIX = union(top,left) trừ cornerGap
    const inTop = !!top && inRect(r, c, top);
    const inLeft = !!left && inRect(r, c, left);
    const inGap = !!cornerGap && inRect(r, c, cornerGap);

    return (inTop || inLeft) && !inGap;
  };

  const overlapsHeaderUnion = (R: Rect) => {
    if (spec.kind !== "MATRIX") return (top && rectsOverlap(R, top)) || (left && rectsOverlap(R, left));

    for (let r = R.r0; r <= R.r1; r++) {
      for (let c = R.c0; c <= R.c1; c++) {
        if (!inRect(r, c, table)) continue;
        if (isInHeader(r, c)) return true;
      }
    }
    return false;
  };

  const overlapsNonHeader = (R: Rect) => {
    for (let r = R.r0; r <= R.r1; r++) {
      for (let c = R.c0; c <= R.c1; c++) {
        if (!inRect(r, c, table)) continue;
        if (!isInHeader(r, c)) return true;
      }
    }
    return false;
  };
  /* =========================================================
     RULE 1: Không được vượt phạm vi bảng
     ========================================================= */

  for (const m of masters) {
    const R = cellRect(m);
    for (let r = R.r0; r <= R.r1; r++) {
      for (let c = R.c0; c <= R.c1; c++) {
        if (!inRect(r, c, table)) {
          issues.push({
            code: "VUOT_PHAM_VI_BANG",
            message: `Ô ${toExcel(r, c)} vượt ra ngoài phạm vi bảng (${rectToExcel(table)}). Vui lòng thu gọn lại trong phạm vi bảng.`,
            at: { r, c },
          });
        }
      }
    }
  }

  /* =========================================================
     RULE 2: Ngoài vùng tiêu đề phải để trống (chỉ bắt lỗi nếu có chữ)
     ========================================================= */

  for (const m of masters) {
    if (!hasText(m)) continue;

    const R = cellRect(m);
    for (let r = R.r0; r <= R.r1; r++) {
      for (let c = R.c0; c <= R.c1; c++) {
        if (!inRect(r, c, table)) continue;

        if (!isInHeader(r, c)) {
          issues.push({
            code: "NOI_DUNG_NGOAI_TIEU_DE",
            message: `Ô ${toExcel(r, c)} nằm ngoài vùng tiêu đề nhưng lại có nội dung. Vui lòng đưa nội dung vào vùng tiêu đề.`,
            at: { r, c },
          });
        }
      }
    }
  }

  /* =========================================================
     RULE 3: Không được phủ đồng thời vùng tiêu đề và vùng dữ liệu (chỉ xét ô có chữ)
     ========================================================= */

  for (const m of masters) {
    if (!hasText(m)) continue;

    const R = cellRect(m);
    const inHeader = overlapsHeaderUnion(R);
    const inNonHeader = overlapsNonHeader(R);

    if (inHeader && inNonHeader) {
      issues.push({
        code: "LAN_RANH_GIOI",
        message: `Ô bắt đầu tại ${toExcel(m.r, m.c)} đang bao phủ cả vùng tiêu đề và vùng dữ liệu. Vui lòng tách riêng: tiêu đề chỉ nằm trong vùng tiêu đề.`,
        at: { r: m.r, c: m.c },
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    meta: {
      kind: spec.kind,
      tableRange: rectToExcel(table),
      topRange: top ? rectToExcel(top) : null,
      leftRange: left ? rectToExcel(left) : null,
      cornerGapRange: cornerGap ? rectToExcel(cornerGap) : null,
    },
  };
}

/* ================= Spec limits ================= */

export type DesignerLimitIssue = {
  code: "SHEET_TOO_LARGE" | "HEADER_TOO_LARGE" | "DATA_TOO_LARGE";
  message: string;
};

export const DESIGNER_LIMITS = {
  MAX_DATA_CELLS: 250,     // values1D length
  MAX_HEADER_ROWS: 30,     // headerRect height
  MAX_HEADER_COLS: 30,     // headerRect width
  MAX_SHEET_CELLS: 5000,   // max render cells (tableRect)
} as const;

export function validateSpecLimits(spec: HeaderSpec) {
  const table = getTableRect(spec);
  const { headerRect, dataRect } = computeRegions(spec, table);

  const sheetRows = rectRows(table);
  const sheetCols = rectCols(table);
  const sheetCells = sheetRows * sheetCols;

  const headerRows = rectRows(headerRect);
  const headerCols = rectCols(headerRect);

  const dataRows = rectRows(dataRect);
  const dataCols = rectCols(dataRect);
  const dataCells = dataRows * dataCols;

  const issues: DesignerLimitIssue[] = [];

  if (sheetCells > DESIGNER_LIMITS.MAX_SHEET_CELLS) {
    issues.push({
      code: "SHEET_TOO_LARGE",
      message: `Bảng quá lớn (${sheetCols}x${sheetRows} = ${sheetCells} ô). Giới hạn: ${DESIGNER_LIMITS.MAX_SHEET_CELLS} ô.`,
    });
  }

  if (headerRows > DESIGNER_LIMITS.MAX_HEADER_ROWS || headerCols > DESIGNER_LIMITS.MAX_HEADER_COLS) {
    issues.push({
      code: "HEADER_TOO_LARGE",
      message: `Vùng tiêu đề quá lớn (${headerCols} cột x ${headerRows} hàng). Khuyến nghị tối đa: ${DESIGNER_LIMITS.MAX_HEADER_COLS} cột và ${DESIGNER_LIMITS.MAX_HEADER_ROWS} hàng.`,
    });
  }

  if (dataCells > DESIGNER_LIMITS.MAX_DATA_CELLS) {
    issues.push({
      code: "DATA_TOO_LARGE",
      message: `Vùng dữ liệu quá lớn (${dataCols}x${dataRows} = ${dataCells} ô). Giới hạn values1D: ${DESIGNER_LIMITS.MAX_DATA_CELLS} ô.`,
    });
  }

  return { ok: issues.length === 0, issues, table, headerRect, dataRect };
}

export function validateNoMergeInDataRange(merge: Record<string, any>, dataRect: Rect) {
  const issues: any[] = [];
  const mm = merge ?? {};

  for (const m of Object.values<any>(mm)) {
    const r0 = Number(m?.r ?? -1);
    const c0 = Number(m?.c ?? -1);
    const rs = Number(m?.rs ?? 1);
    const cs = Number(m?.cs ?? 1);

    if (r0 < 0 || c0 < 0) continue;

    const r1 = r0 + rs - 1;
    const c1 = c0 + cs - 1;

    const intersect =
      r0 <= dataRect.r1 &&
      r1 >= dataRect.r0 &&
      c0 <= dataRect.c1 &&
      c1 >= dataRect.c0;

    if (intersect) {
      issues.push({
        code: "DATA_MERGE_NOT_ALLOWED",
        message: `Không cho phép merge trong vùng dữ liệu. Merge tại ô ${toExcel(r0, c0)}.`,
      });
    }
  }

  return issues;
}