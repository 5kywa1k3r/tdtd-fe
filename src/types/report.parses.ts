import type {
  MyReportTemplateDetailResponse,
  WorkAssignmentReportResponse,
} from "./report";

import type {
  ParsedMyReportTemplateDetail,
  ParsedWorkAssignmentReportDetail,
  ReportCellValue,
} from "./report.helper";

export function safeParseJson<T>(input?: string | null, fallback?: T): T | undefined {
  if (!input) return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

export function parseMyReportTemplateDetail(
  detail: MyReportTemplateDetailResponse
): ParsedMyReportTemplateDetail {
  return {
    ...detail,
    spec: safeParseJson<any>(detail.specJson, null),
    templateWorkbookData: safeParseJson<any[]>(detail.templateWorkbookJson, []) ?? [],
  };
}

function safeClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function extractTemplateSnapshot(templateSnapshotJson?: string | null) {
  const snapshot = safeParseJson<any>(templateSnapshotJson, null);
  return snapshot && typeof snapshot === "object" ? snapshot : null;
}

function extractTemplateWorkbookFromSnapshot(templateSnapshotJson?: string | null): any[] {
  const snapshot = extractTemplateSnapshot(templateSnapshotJson);
  if (!snapshot) return [];

  if (typeof snapshot.rawWorkbookDataJson === "string") {
    const parsed = safeParseJson<any[]>(snapshot.rawWorkbookDataJson, []);
    if (Array.isArray(parsed)) return parsed;
  }

  if (Array.isArray(snapshot.rawWorkbookData)) {
    return snapshot.rawWorkbookData;
  }

  return [];
}

function extractSpecFromSnapshot(templateSnapshotJson?: string | null): any {
  const snapshot = extractTemplateSnapshot(templateSnapshotJson);
  if (!snapshot) return null;

  if (typeof snapshot.specJson === "string") {
    return safeParseJson<any>(snapshot.specJson, null);
  }

  return snapshot.spec ?? null;
}

function buildCelldataFromData(data: any[][] | undefined) {
  if (!Array.isArray(data)) return [];

  const celldata: any[] = [];
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell == null) continue;
      celldata.push({ r, c, v: cell });
    }
  }

  return celldata;
}

function inferRowCount(sheet: any) {
  const fromRow = typeof sheet?.row === "number" ? sheet.row : 0;
  const fromData = Array.isArray(sheet?.data) ? sheet.data.length : 0;
  const fromCelldata = Array.isArray(sheet?.celldata)
    ? Math.max(
        0,
        ...sheet.celldata.map((x: any) => (typeof x?.r === "number" ? x.r + 1 : 0))
      )
    : 0;

  return Math.max(fromRow, fromData, fromCelldata, 1);
}

function inferColCount(sheet: any) {
  const fromColumn = typeof sheet?.column === "number" ? sheet.column : 0;
  const fromData = Array.isArray(sheet?.data)
    ? Math.max(0, ...sheet.data.map((row: any[]) => (Array.isArray(row) ? row.length : 0)))
    : 0;
  const fromCelldata = Array.isArray(sheet?.celldata)
    ? Math.max(
        0,
        ...sheet.celldata.map((x: any) => (typeof x?.c === "number" ? x.c + 1 : 0))
      )
    : 0;

  return Math.max(fromColumn, fromData, fromCelldata, 1);
}

function normalizeTemplateWorkbook(input: any[] | undefined): any[] {
  const src = Array.isArray(input) ? safeClone(input) : [];
  if (!Array.isArray(src) || src.length === 0) return [];

  return src.map((raw: any, idx: number) => {
    const rowCount = inferRowCount(raw);
    const colCount = inferColCount(raw);

    const data = Array.isArray(raw?.data) ? safeClone(raw.data) : [];
    const celldata = buildCelldataFromData(data);

    return {
      name: raw?.name ?? `Sheet${idx + 1}`,
      index: raw?.index ?? raw?.id ?? `sheet-${idx + 1}`,
      order: typeof raw?.order === "number" ? raw.order : idx,
      status: idx === 0 ? 1 : 0,
      row: Math.max(rowCount, 1),
      column: Math.max(colCount, 1),
      config: raw?.config && typeof raw.config === "object" ? safeClone(raw.config) : {},
      data,
      celldata,
      scrollLeft: 0,
      scrollTop: 0,
      zoomRatio: 1,
      defaultRowHeight: raw?.defaultRowHeight ?? 19,
      defaultColWidth: raw?.defaultColWidth ?? 73,
      showGridLines: raw?.showGridLines ?? 1,
      hide: raw?.hide ?? 0,
      isPivotTable: raw?.isPivotTable ?? false,
      luckysheet_select_save:
        Array.isArray(raw?.luckysheet_select_save) && raw.luckysheet_select_save.length > 0
          ? safeClone(raw.luckysheet_select_save)
          : [
              {
                row: [0, 0],
                column: [0, 0],
                row_focus: 0,
                column_focus: 0,
                left: 0,
                width: 73,
                top: 0,
                height: 19,
                left_move: 0,
                width_move: 73,
                top_move: 0,
                height_move: 19,
              },
            ],
      luckysheet_alternateformat_save: raw?.luckysheet_alternateformat_save ?? [],
      luckysheet_alternateformat_save_modelCustom:
        raw?.luckysheet_alternateformat_save_modelCustom ?? [],
    };
  });
}

function applyValues1DToWorkbook(
  workbook: any[],
  input: {
    values1D: ReportCellValue[];
    r0: number;
    c0: number;
    w: number;
    h: number;
  }
): any[] {
  if (!Array.isArray(workbook) || workbook.length === 0) return workbook;

  const { values1D, r0, c0, w, h } = input;
  if (!Array.isArray(values1D) || w <= 0 || h <= 0) return workbook;

  const next = safeClone(workbook);
  const sheet = next[0];
  if (!sheet) return next;

  const rowCount = Math.max(sheet.row ?? 0, r0 + h, 1);
  const colCount = Math.max(sheet.column ?? 0, c0 + w, 1);

  const data = Array.isArray(sheet.data)
    ? safeClone(sheet.data)
    : Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => null));

  while (data.length < rowCount) {
    data.push(Array.from({ length: colCount }, () => null));
  }

  for (let r = 0; r < data.length; r++) {
    while (data[r].length < colCount) {
      data[r].push(null);
    }
  }

  for (let rr = 0; rr < h; rr++) {
    for (let cc = 0; cc < w; cc++) {
      const idx = rr * w + cc;
      const row = r0 + rr;
      const col = c0 + cc;
      const raw = values1D[idx];

      data[row][col] =
        raw == null || raw === ""
          ? null
          : {
              v: raw,
              m: String(raw),
            };
    }
  }

  sheet.row = rowCount;
  sheet.column = colCount;
  sheet.data = data;
  sheet.celldata = buildCelldataFromData(data);

  return next;
}

export function parseReportDetail(
  report: WorkAssignmentReportResponse
): ParsedWorkAssignmentReportDetail {
  const spec =
    extractSpecFromSnapshot(report.templateSnapshotJson) ??
    safeParseJson<any>(report.specJson, null);

  const templateWorkbook = normalizeTemplateWorkbook(
    extractTemplateWorkbookFromSnapshot(report.templateSnapshotJson)
  );

  const values1D =
    safeParseJson<ReportCellValue[]>(report.values1DJson, []) ?? [];

  const hydratedWorkbook = applyValues1DToWorkbook(templateWorkbook, {
    values1D,
    r0: report.dataRectR0,
    c0: report.dataRectC0,
    w: report.w,
    h: report.h,
  });

  return {
    ...report,
    renderWorkbookData: hydratedWorkbook,
    spec,
    values1D,
    dataRect: {
      r0: report.dataRectR0,
      c0: report.dataRectC0,
      r1: report.dataRectR1,
      c1: report.dataRectC1,
    },
  };
}