// src/components/excel/fortune/regions.ts
import type { HeaderSpec, Anchor } from "./types";

export type Rect = { r0: number; c0: number; r1: number; c1: number };

/**
 * Rect inclusive (r0..r1, c0..c1).
 * Clamp min 0, và đảm bảo r1>=r0 / c1>=c0 để không tạo rect âm.
 */
function rect(r0: number, c0: number, r1: number, c1: number): Rect {
  const rr0 = Math.max(0, Math.floor(r0));
  const cc0 = Math.max(0, Math.floor(c0));
  const rr1 = Math.max(rr0, Math.floor(r1));
  const cc1 = Math.max(cc0, Math.floor(c1));
  return { r0: rr0, c0: cc0, r1: rr1, c1: cc1 };
}

export function rectRows(R: Rect) {
  return R.r1 - R.r0 + 1;
}

export function rectCols(R: Rect) {
  return R.c1 - R.c0 + 1;
}

export function computeRegions(spec: HeaderSpec, table: Rect) {
  // ✅ table là Rect inclusive (r0..r1, c0..c1)
  if (spec.kind === "TOP") {
    const headerRect = rect(0, 0, spec.topRows - 1, spec.topCols - 1);
    const dataRect = rect(spec.topRows, 0, table.r1, table.c1);

    return {
      headerRect,
      headerRects: [headerRect],
      dataRect,
    };
  }

  if (spec.kind === "LEFT") {
    const headerRect = rect(0, 0, spec.leftRows - 1, spec.leftCols - 1);
    const dataRect = rect(0, spec.leftCols, table.r1, table.c1);

    return {
      headerRect,
      headerRects: [headerRect],
      dataRect,
    };
  }

  // MATRIX
  const topRows = spec.topRows;
  const leftCols = spec.leftCols;

  // góc giao (được phép trống) -> KHÔNG mark
  const cornerRect = rect(0, 0, topRows - 1, leftCols - 1);

  // phần header trên (trừ góc)
  const topHeaderRect = rect(0, leftCols, topRows - 1, table.c1);

  // phần header trái (trừ góc)
  const leftHeaderRect = rect(topRows, 0, table.r1, leftCols - 1);

  const dataRect = rect(topRows, leftCols, table.r1, table.c1);

  // headerRect legacy (để debug)
  const headerRect = rect(0, 0, topRows - 1, table.c1);

  return {
    headerRect,
    headerRects: [topHeaderRect, leftHeaderRect],
    cornerRect,
    topHeaderRect,
    leftHeaderRect,
    dataRect,
  };
}

export function getAnchors(spec: HeaderSpec): { topAnchor: Anchor; leftAnchor: Anchor } {
  if (spec.kind === "TOP") return { topAnchor: { r0: 0, c0: 0 }, leftAnchor: { r0: 0, c0: 0 } };
  if (spec.kind === "LEFT") return { topAnchor: { r0: 0, c0: 0 }, leftAnchor: { r0: 0, c0: 0 } };

  // MATRIX:
  // - top header bắt đầu sau leftCols
  // - left header bắt đầu sau topRows
  return {
    topAnchor: { r0: 0, c0: spec.leftCols },
    leftAnchor: { r0: spec.topRows, c0: 0 },
  };
}

// Bảng luôn bắt đầu từ A1
export function getTableRect(spec: HeaderSpec): Rect {
  if (spec.kind === "TOP") {
    const rows = spec.topRows + spec.dataRows;
    const cols = spec.topCols;
    return rect(0, 0, rows - 1, cols - 1);
  }

  if (spec.kind === "LEFT") {
    const rows = spec.leftRows;
    const cols = spec.leftCols + spec.dataCols;
    return rect(0, 0, rows - 1, cols - 1);
  }

  // MATRIX
  const rows = spec.topRows + spec.leftRows;
  const cols = spec.leftCols + spec.topCols;
  return rect(0, 0, rows - 1, cols - 1);
}