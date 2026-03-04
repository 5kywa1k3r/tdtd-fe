// src/components/excel/fortune/normalizeSpec.ts
import type { HeaderSpec } from "./types";

export type NormalizedSpec = {
  kind: "TOP" | "LEFT" | "MATRIX";
  topRows: number;
  topCols: number;
  leftRows: number;
  leftCols: number;
};

function toPosInt(x: any, fallback: number) {
  const n = Number(x);
  if (!Number.isFinite(n)) return fallback;
  const v = Math.floor(n);
  return v > 0 ? v : fallback;
}

export function normalizeSpec(spec: HeaderSpec): NormalizedSpec {
  const kind = spec?.kind as NormalizedSpec["kind"];

  if (kind === "TOP") {
    return {
      kind: "TOP",
      topRows: toPosInt((spec as any).topRows, 1),
      topCols: toPosInt((spec as any).topCols, 1),
      leftRows: 0,
      leftCols: 0,
    };
  }

  if (kind === "LEFT") {
    return {
      kind: "LEFT",
      topRows: 0,
      topCols: 0,
      leftRows: toPosInt((spec as any).leftRows, 1),
      leftCols: toPosInt((spec as any).leftCols, 1),
    };
  }

  // MATRIX
  return {
    kind: "MATRIX",
    topRows: toPosInt((spec as any).topRows, 1),
    topCols: toPosInt((spec as any).topCols, 1),
    leftRows: toPosInt((spec as any).leftRows, 1),
    leftCols: toPosInt((spec as any).leftCols, 1),
  };
}