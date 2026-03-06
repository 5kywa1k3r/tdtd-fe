// src/components/excel/fortune/reportWorkbook.ts
import { normalizeToSingleSheet } from "./normalizeWorkbook";

export interface ReportRect {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

export function rectRows(rect: ReportRect) {
  return rect.r1 - rect.r0 + 1;
}

export function rectCols(rect: ReportRect) {
  return rect.c1 - rect.c0 + 1;
}

export function cloneDeepJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function ensureWorkbookShape(
  workbookData: any[],
  totalRows: number,
  totalCols: number
) {
  return normalizeToSingleSheet(workbookData, totalRows, totalCols);
}

export function isCellInRect(r: number, c: number, rect: ReportRect) {
  return r >= rect.r0 && r <= rect.r1 && c >= rect.c0 && c <= rect.c1;
}

function getSheetCell(sheet: any, r: number, c: number) {
  if (!sheet) return null;
  if (!Array.isArray(sheet.data)) sheet.data = [];
  if (!Array.isArray(sheet.data[r])) sheet.data[r] = [];
  return sheet.data[r][c] ?? null;
}

function setSheetCell(sheet: any, r: number, c: number, value: any) {
  if (!sheet) return;
  if (!Array.isArray(sheet.data)) sheet.data = [];
  if (!Array.isArray(sheet.data[r])) sheet.data[r] = [];
  sheet.data[r][c] = value;
}

export function restoreOutsideDataRect(
  editedWorkbook: any[],
  originalWorkbook: any[],
  totalRows: number,
  totalCols: number,
  dataRect: ReportRect
) {
  const edited = cloneDeepJson(
    ensureWorkbookShape(editedWorkbook, totalRows, totalCols)
  );
  const original = cloneDeepJson(
    ensureWorkbookShape(originalWorkbook, totalRows, totalCols)
  );

  const editedSheet = edited?.[0];
  const originalSheet = original?.[0];

  if (!editedSheet || !originalSheet) return edited;

  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      if (isCellInRect(r, c, dataRect)) continue;
      setSheetCell(editedSheet, r, c, cloneDeepJson(getSheetCell(originalSheet, r, c)));
    }
  }

  editedSheet.config = cloneDeepJson(originalSheet.config ?? {});
  editedSheet.row = originalSheet.row ?? totalRows;
  editedSheet.column = originalSheet.column ?? totalCols;
  editedSheet.name = originalSheet.name ?? editedSheet.name;
  editedSheet.id = originalSheet.id ?? editedSheet.id;

  return edited;
}