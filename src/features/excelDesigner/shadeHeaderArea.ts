import type { Anchor, HeaderSpec } from "./types";

type Rect = { r0: number; c0: number; rows: number; cols: number };

function pushBg(celldata: any[], r: number, c: number, bg: string) {
  // Luckysheet-style: { r, c, v: { bg } }
  celldata.push({ r, c, v: { bg } });
}

export function shadeHeaderArea(params: {
  sheet: any;
  spec: HeaderSpec;
  topAnchor: Anchor;
  leftAnchor: Anchor;
  bg: string;
}) {
  const { sheet, spec, topAnchor, leftAnchor, bg } = params;

  const top: Rect | null =
    spec.kind === "TOP" || spec.kind === "MATRIX"
      ? { r0: topAnchor.r0, c0: topAnchor.c0, rows: spec.topRows, cols: spec.topCols }
      : null;

  const left: Rect | null =
    spec.kind === "LEFT" || spec.kind === "MATRIX"
      ? { r0: leftAnchor.r0, c0: leftAnchor.c0, rows: spec.leftRows, cols: spec.leftCols }
      : null;

  sheet.celldata = sheet.celldata ?? [];

  if (top) {
    for (let r = top.r0; r < top.r0 + top.rows; r++) {
      for (let c = top.c0; c < top.c0 + top.cols; c++) pushBg(sheet.celldata, r, c, bg);
    }
  }
  if (left) {
    for (let r = left.r0; r < left.r0 + left.rows; r++) {
      for (let c = left.c0; c < left.c0 + left.cols; c++) pushBg(sheet.celldata, r, c, bg);
    }
  }
}
