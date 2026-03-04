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

export type ValidationIssueCode =
  | "VUOT_PHAM_VI_BANG"        // Ô vượt ra ngoài bảng
  | "NOI_DUNG_NGOAI_TIEU_DE"   // Có nội dung nằm ngoài vùng tiêu đề
  | "LAN_RANH_GIOI"            // Phủ cả vùng tiêu đề và vùng dữ liệu

export type ValidationIssue = {
  code: ValidationIssueCode;
  message: string; // Thông báo đầy đủ tiếng Việt
  at?: { r: number; c: number }; // Tọa độ nội bộ (0-based) để highlight
};