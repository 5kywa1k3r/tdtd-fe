export type HeaderKind = "TOP" | "LEFT" | "MATRIX";

export type HeaderSpec =
  | {
      kind: "TOP";
      topRows: number;   // số hàng header
      topCols: number;   // số cột header (= số cột bảng)
      dataRows: number;  // số hàng dữ liệu
    }
  | {
      kind: "LEFT";
      leftRows: number;  // số hàng header (= số hàng bảng)
      leftCols: number;  // số cột header
      dataCols: number;  // số cột dữ liệu
    }
  | {
      kind: "MATRIX";
      topRows: number;
      topCols: number;
      leftRows: number;
      leftCols: number;
    };

export type Anchor = { r0: number; c0: number };

export type HeaderCell = {
  r: number;
  c: number;
  text?: string;
  rowSpan?: number;
  colSpan?: number;
};

export type ValidationIssue = {
  code: "OUTSIDE_HEADER" | "EMPTY_HEADER" | "LEAF_NOT_MERGED";
  message: string;
  at?: { r: number; c: number };
};
