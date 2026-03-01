import type { HeaderSpec } from "../features/excelDesigner/types";

export type LabelLite = { id: string; name: string };

export type DynamicExcelItem = {
  id: string;
  code: string;
  name: string;
  labels: LabelLite[];
  createdAt: string;

  // ExcelDesigner load lại
  spec: HeaderSpec;
  workbookData: any[];
};

const DEFAULT_SPEC: HeaderSpec = { kind: "TOP", topRows: 3, topCols: 6, dataRows: 10 };

const MOCK_WORKBOOK = [
  {
    id: "sheet-1",
    name: "Sheet1",
    row: 20,
    column: 12,
    celldata: [
      { r: 0, c: 0, v: { v: "TOP 1" } },
      { r: 0, c: 1, v: { v: "TOP 2" } },
      { r: 1, c: 0, v: { v: "A" } },
      { r: 3, c: 2, v: { v: 123 } },
    ],
    config: { merge: {} },
  },
];

export const MOCK_DYNAMIC_EXCEL_LIST: DynamicExcelItem[] = [
  {
    id: "t1",
    code: "BBD-001",
    name: "Bảng tổng hợp tuần",
    labels: [{ id: "l1", name: "Tuần" }],
    createdAt: "2026-01-02T03:10:00Z",
    spec: DEFAULT_SPEC,
    workbookData: MOCK_WORKBOOK,
  },
  {
    id: "t2",
    code: "BBD-002",
    name: "Bảng theo dõi nhiệm vụ",
    labels: [{ id: "l2", name: "Nhiệm vụ" }],
    createdAt: "2026-01-05T15:30:00Z",
    spec: DEFAULT_SPEC,
    workbookData: MOCK_WORKBOOK,
  },
];
