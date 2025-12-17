import type { HeaderSpec } from "./types";

export type Rect = { r0: number; c0: number; rows: number; cols: number };

// Bảng luôn bắt đầu từ A1
export function getTableRect(spec: HeaderSpec): Rect {
  if (spec.kind === "TOP") {
    return { r0: 0, c0: 0, rows: spec.topRows + spec.dataRows, cols: spec.topCols };
  }
  if (spec.kind === "LEFT") {
    return { r0: 0, c0: 0, rows: spec.leftRows, cols: spec.leftCols + spec.dataCols };
  }
  // MATRIX
  return { r0: 0, c0: 0, rows: spec.topRows + spec.leftRows, cols: spec.leftCols + spec.topCols };
}