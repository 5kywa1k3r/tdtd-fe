import type { Sheet } from "@fortune-sheet/core";
import type {
  AggregateSourceRowDto,
  AggregateTableResponse,
  AggregateTableRowDto,
} from "../../../types/reportAggregate";
import type { DynamicExcelSpecLike, HeaderSpec, ReportRect } from "../../../types/aggregateTypes";

export function parseJsonSafe<T>(value?: string | null, fallback?: T): T {
  if (!value) return fallback as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback as T;
  }
}

export function cloneDeepJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeDayKeyInput(value?: string | null): string {
  if (!value) return "";
  const digitsOnly = String(value).replace(/\D/g, "");
  if (digitsOnly.length === 8) return digitsOnly;
  return String(value).trim();
}

export function dayKeyToDateInput(dayKey?: string | null): string {
  const raw = normalizeDayKeyInput(dayKey);
  if (!/^\d{8}$/.test(raw)) return "";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export function formatDayKeyLabel(dayKey?: string | null): string {
  const raw = normalizeDayKeyInput(dayKey);
  if (!/^\d{8}$/.test(raw)) return raw || "-";
  return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`;
}

export function formatPeriodRangeLabel(from?: string | null, to?: string | null): string {
  const left = formatDayKeyLabel(from);
  const right = formatDayKeyLabel(to);
  if (!from && !to) return "Toàn bộ kỳ";
  if (from && to) return `${left} → ${right}`;
  return from ? `Từ ${left}` : `Đến ${right}`;
}

function cell(v: any) {
  return {
    v,
    m: v == null ? "" : String(v),
    fs: 12,
    ht: 0,
    vt: 0,
  };
}

function makeEmptyGrid(rows: number, cols: number) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => cell(null))
  );
}

function makeSheet(name: string, rows: number, cols: number): Sheet {
  return {
    name,
    index: "0",
    order: 0,
    status: 1,
    row: rows,
    column: cols,
    data: makeEmptyGrid(rows, cols),
    celldata: [],
    config: {},
  } as unknown as Sheet;
}

function ensureSheetData(sheet: any, rows: number, cols: number) {
  if (!Array.isArray(sheet.data)) {
    sheet.data = makeEmptyGrid(rows, cols);
  }

  while (sheet.data.length < rows) {
    sheet.data.push(Array.from({ length: cols }, () => cell(null)));
  }

  for (let r = 0; r < sheet.data.length; r++) {
    if (!Array.isArray(sheet.data[r])) sheet.data[r] = [];
    while (sheet.data[r].length < cols) {
      sheet.data[r].push(cell(null));
    }
  }
}

function setCellValue(sheet: any, r: number, c: number, v: any) {
  ensureSheetData(sheet, r + 1, c + 1);
  const oldCell = sheet.data[r][c];
  if (oldCell && typeof oldCell === "object") {
    sheet.data[r][c] = {
      ...oldCell,
      v,
      m: v == null ? "" : String(v),
      fs: 12,
      ht: 0,
      vt: 0,
    };
    return;
  }

  sheet.data[r][c] = cell(v);
}

export function resolveTemplateRect(rect?: ReportRect | null): ReportRect {
  if (!rect) return { r0: 0, c0: 0, r1: 0, c1: 0 };
  return rect;
}

export function resolveResultRect(
  result: AggregateTableResponse | null,
  fallbackRect: ReportRect
): ReportRect {
  if (!result) return fallbackRect;

  return {
    r0: result.dataRectR0 ?? fallbackRect.r0,
    c0: result.dataRectC0 ?? fallbackRect.c0,
    r1: result.dataRectR1 ?? fallbackRect.r1,
    c1: result.dataRectC1 ?? fallbackRect.c1,
  };
}

export function valuesLengthFromRect(rect: ReportRect) {
  return Math.max(0, rect.r1 - rect.r0 + 1) * Math.max(0, rect.c1 - rect.c0 + 1);
}

function applyValues1DToRect(sheet: any, rect: ReportRect, values: Array<number | null>) {
  let idx = 0;
  for (let r = rect.r0; r <= rect.r1; r++) {
    for (let c = rect.c0; c <= rect.c1; c++) {
      setCellValue(sheet, r, c, values[idx] ?? null);
      idx += 1;
    }
  }
}

function tryResolveHeaderSpec(spec: any): HeaderSpec | null {
  if (!spec || typeof spec !== "object") return null;
  if (spec.headerSpec?.kind) return spec.headerSpec as HeaderSpec;
  if (spec.kind) return spec as HeaderSpec;
  return null;
}

function buildValueLabels(rect: ReportRect, spec?: DynamicExcelSpecLike | null) {
  const headerSpec = tryResolveHeaderSpec(spec);
  const labels: string[] = [];
  let idx = 1;

  for (let r = rect.r0; r <= rect.r1; r++) {
    for (let c = rect.c0; c <= rect.c1; c++) {
      if (headerSpec?.kind === "TOP") {
        labels.push(`D${r - rect.r0 + 1}.${c - rect.c0 + 1}`);
      } else if (headerSpec?.kind === "LEFT") {
        labels.push(`N${r - rect.r0 + 1}.${c - rect.c0 + 1}`);
      } else {
        labels.push(`V${idx}`);
      }
      idx += 1;
    }
  }

  return labels;
}

export function buildWorkbookForCellSum(
  templateWorkbook: Sheet[],
  rect: ReportRect,
  row?: AggregateTableRowDto | null
): { workbook: Sheet[]; previewRect: ReportRect } {
  const workbook = cloneDeepJson(templateWorkbook ?? []);
  const firstSheet: any = workbook?.[0];

  if (!firstSheet) {
    const blank = makeSheet("Aggregate", rect.r1 + 1, rect.c1 + 1);
    applyValues1DToRect(blank, rect, row?.values ?? []);
    return {
      workbook: [blank],
      previewRect: rect,
    };
  }

  applyValues1DToRect(firstSheet, rect, row?.values ?? []);
  return {
    workbook,
    previewRect: rect,
  };
}

export function buildWorkbookHorizontalByUser(
  rows: AggregateTableRowDto[],
  rect: ReportRect,
  spec?: DynamicExcelSpecLike | null
): { workbook: Sheet[]; previewRect: ReportRect } {
  const valueLabels = buildValueLabels(rect, spec);
  const metaHeaders = [
    "Mã người dùng",
    "Tài khoản",
    "Họ tên",
    "Ký hiệu đơn vị",
    "Tên đơn vị",
  ];
  const headers = [...metaHeaders, ...valueLabels];

  const rowCount = Math.max(2, rows.length + 1);
  const colCount = Math.max(1, headers.length);
  const sheet: any = makeSheet("Aggregate", rowCount, colCount);

  headers.forEach((header, idx) => setCellValue(sheet, 0, idx, header));

  rows.forEach((row, idx) => {
    const rr = idx + 1;
    setCellValue(sheet, rr, 0, row.userId ?? "");
    setCellValue(sheet, rr, 1, row.userName ?? "");
    setCellValue(sheet, rr, 2, row.fullName ?? "");
    setCellValue(sheet, rr, 3, row.unitSymbol ?? "");
    setCellValue(sheet, rr, 4, row.unitShortName ?? "");

    (row.values ?? []).forEach((value, valueIdx) => {
      setCellValue(sheet, rr, metaHeaders.length + valueIdx, value);
    });
  });

  return {
    workbook: [sheet as Sheet],
    previewRect: {
      r0: 1,
      c0: metaHeaders.length,
      r1: rowCount - 1,
      c1: colCount - 1,
    },
  };
}

export function buildWorkbookVerticalByUser(
  rows: AggregateTableRowDto[],
  rect: ReportRect,
  spec?: DynamicExcelSpecLike | null
): { workbook: Sheet[]; previewRect: ReportRect } {
  const valueLabels = buildValueLabels(rect, spec);
  const leftLabels = [
    "Mã người dùng",
    "Tài khoản",
    "Họ tên",
    "Ký hiệu đơn vị",
    "Tên đơn vị",
    ...valueLabels,
  ];

  const rowCount = Math.max(1, leftLabels.length);
  const colCount = Math.max(2, rows.length + 1);
  const sheet: any = makeSheet("Aggregate", rowCount, colCount);

  leftLabels.forEach((label, idx) => setCellValue(sheet, idx, 0, label));

  rows.forEach((row, idx) => {
    const cc = idx + 1;
    setCellValue(sheet, 0, cc, row.userId ?? "");
    setCellValue(sheet, 1, cc, row.userName ?? "");
    setCellValue(sheet, 2, cc, row.fullName ?? "");
    setCellValue(sheet, 3, cc, row.unitSymbol ?? "");
    setCellValue(sheet, 4, cc, row.unitShortName ?? "");

    (row.values ?? []).forEach((value, valueIdx) => {
      setCellValue(sheet, 5 + valueIdx, cc, value);
    });
  });

  return {
    workbook: [sheet as Sheet],
    previewRect: {
      r0: 5,
      c0: 1,
      r1: rowCount - 1,
      c1: colCount - 1,
    },
  };
}

export function getSourceStatusLabel(status?: number | null) {
  switch (status) {
    case 0:
      return "Nháp";
    case 1:
      return "Đã nộp";
    case 2:
      return "Đã duyệt";
    default:
      return "-";
  }
}

export function getSourceUserLabel(row: AggregateSourceRowDto) {
  return row.fullName?.trim() || row.userName?.trim() || row.assigneeUserId || "-";
}

export function getSourceUnitLabel(row: AggregateSourceRowDto) {
  return row.unitShortName?.trim() || row.unitSymbol?.trim() || "-";
}

export function getAggregateUserLabel(row: AggregateTableRowDto) {
  return row.fullName?.trim() || row.userName?.trim() || row.userId || "-";
}

export function getAggregateUnitLabel(row: AggregateTableRowDto) {
  return row.unitShortName?.trim() || row.unitSymbol?.trim() || "-";
}
