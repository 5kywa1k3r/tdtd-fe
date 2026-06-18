import type {
  MyReportTemplateDetailResponse,
  WorkAssignmentReportResponse,
} from "./report";

import type {
  ParsedMyReportTemplateDetail,
  ParsedWorkAssignmentReportDetail,
  ReportCellValue,
} from "./report.helper";
import type { HeaderSpec } from "../components/excel/fortune/types";
import { applyValues1DToWorkbookOrdered } from "../components/excel/fortune/workbookRuntime";
import { parseValues1DJson } from "../components/excel/fortune/values1DCompression";

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
  const snapshotWorkbookData = extractTemplateWorkbookFromSnapshot(detail.templateSnapshotJson);
  const templateWorkbookData =
    snapshotWorkbookData.length > 0
      ? snapshotWorkbookData
      : safeParseJson<any[]>(detail.templateWorkbookJson, []) ?? [];
  const spec =
    extractSpecFromSnapshot(detail.templateSnapshotJson) ??
    safeParseJson<any>(detail.specJson, null);

  return {
    ...detail,
    spec,
    templateWorkbookData,
  };
}

function safeClone<T>(x: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(x);
  }
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

export function normalizeTemplateWorkbook(input: any[] | undefined): any[] {
  const src = Array.isArray(input) ? safeClone(input) : [];
  if (!Array.isArray(src) || src.length === 0) return [];

  return src.map((raw: any, idx: number) => {
    const rowCount = inferRowCount(raw);
    const colCount = inferColCount(raw);

    const sheetId = String(raw?.id ?? raw?.index ?? `sheet-${idx + 1}`);
    const data = Array.isArray(raw?.data) ? safeClone(raw.data) : [];
    const celldata =
      Array.isArray(raw?.celldata) && raw.celldata.length > 0
        ? safeClone(raw.celldata)
        : buildCelldataFromData(data);

    return {
      id: sheetId,
      name: raw?.name ?? `Sheet${idx + 1}`,
      index: raw?.index ?? sheetId,
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

export function applyValues1DToWorkbook(
  workbook: any[],
  input: {
    values1D: ReportCellValue[];
    r0: number;
    c0: number;
    w: number;
    h: number;
    spec?: HeaderSpec | null;
  }
): any[] {
  return applyValues1DToWorkbookOrdered(workbook, input);
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

  const values1D = parseValues1DJson(report.values1DJson) as ReportCellValue[];

  const hydratedWorkbook = applyValues1DToWorkbook(templateWorkbook, {
    values1D,
    r0: report.dataRectR0,
    c0: report.dataRectC0,
    w: report.w,
    h: report.h,
    spec,
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
