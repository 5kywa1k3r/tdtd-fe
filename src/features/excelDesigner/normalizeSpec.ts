import type { HeaderSpec } from "./types";

export type NormalizedSpec = {
  kind: "TOP" | "LEFT" | "MATRIX";
  topRows: number;
  topCols: number;
  leftRows: number;
  leftCols: number;
};

export function normalizeSpec(spec: HeaderSpec): NormalizedSpec {
  if (spec.kind === "TOP") {
    return { kind: "TOP", topRows: spec.topRows, topCols: spec.topCols, leftRows: 0, leftCols: 0 };
  }
  if (spec.kind === "LEFT") {
    return { kind: "LEFT", topRows: 0, topCols: 0, leftRows: spec.leftRows, leftCols: spec.leftCols };
  }
  return {
    kind: "MATRIX",
    topRows: spec.topRows,
    topCols: spec.topCols,
    leftRows: spec.leftRows,
    leftCols: spec.leftCols,
  };
}
