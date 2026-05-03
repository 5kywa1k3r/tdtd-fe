import {
  cloneDeepJson,
  ensureWorkbookShape,
  isCellInRect,
  type ReportRect,
} from "./reportWorkbook";
import { extractNumericValues1D } from "./fortuneAdapter";

export interface WorkbookDataGridSavePayload {
  rawWorkbookData: any[];
  values1D: Array<number | null>;
}

export interface OutsideChangeIssue {
  r: number;
  c: number;
}

function keyOf(r: number, c: number) {
  return `${r},${c}`;
}

function ensureRow(sheet: any, r: number) {
  sheet.data = Array.isArray(sheet?.data) ? sheet.data : [];
  sheet.data[r] = Array.isArray(sheet.data[r]) ? sheet.data[r] : [];
  return sheet.data[r] as any[];
}

function getCell(sheet: any, r: number, c: number) {
  if (!sheet) return null;
  const row = Array.isArray(sheet?.data) ? sheet.data[r] : null;
  return Array.isArray(row) ? row[c] ?? null : null;
}

function setCell(sheet: any, r: number, c: number, value: any) {
  const row = ensureRow(sheet, r);
  row[c] = value;
}

function buildCelldataIndex(sheet: any) {
  const map = new Map<string, number>();
  const cd = Array.isArray(sheet?.celldata) ? sheet.celldata : [];
  for (let i = 0; i < cd.length; i++) {
    const item = cd[i];
    const r = Number(item?.r);
    const c = Number(item?.c);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    map.set(keyOf(r, c), i);
  }
  return map;
}

function upsertCelldata(sheet: any, r: number, c: number, v: any) {
  sheet.celldata = Array.isArray(sheet?.celldata) ? sheet.celldata : [];
  const idxMap = buildCelldataIndex(sheet);
  const k = keyOf(r, c);
  const idx = idxMap.get(k);

  const nextItem = { r, c, v };
  if (idx == null) {
    sheet.celldata.push(nextItem);
  } else {
    sheet.celldata[idx] = nextItem;
  }
}

function normalizeComparableCell(cell: any) {
  if (!cell || typeof cell !== "object") return cell ?? null;
  const cloned = cloneDeepJson(cell);
  delete cloned.locked;
  return cloned;
}

function sameJson(a: any, b: any) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function setCellLocked(sheet: any, r: number, c: number, locked: boolean) {
  const cur = getCell(sheet, r, c);
  const next =
    cur && typeof cur === "object"
      ? { ...cur, locked }
      : ({ locked } as any);

  setCell(sheet, r, c, next);
  upsertCelldata(sheet, r, c, next);
}

export function prepareWorkbookForGrid(
  workbookData: any[],
  totalRows: number,
  totalCols: number,
  dataRect: ReportRect,
  opts?: {
    lockOutsideDataRect?: boolean;
  }
) {
  const normalized = cloneDeepJson(
    ensureWorkbookShape(workbookData ?? [], totalRows, totalCols)
  );

  const sheet = normalized?.[0];
  if (!sheet) return normalized;

  if (opts?.lockOutsideDataRect ?? true) {
    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < totalCols; c++) {
        setCellLocked(sheet, r, c, !isCellInRect(r, c, dataRect));
      }
    }
  }

  return normalized;
}

export function detectOutsideDataRectChanges(
  editedWorkbook: any[],
  originalWorkbook: any[],
  totalRows: number,
  totalCols: number,
  dataRect: ReportRect,
  maxIssues = 30
): OutsideChangeIssue[] {
  const edited = ensureWorkbookShape(editedWorkbook ?? [], totalRows, totalCols);
  const original = ensureWorkbookShape(originalWorkbook ?? [], totalRows, totalCols);

  const editedSheet = edited?.[0];
  const originalSheet = original?.[0];
  if (!editedSheet || !originalSheet) return [];

  const issues: OutsideChangeIssue[] = [];

  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      if (isCellInRect(r, c, dataRect)) continue;

      const a = normalizeComparableCell(getCell(editedSheet, r, c));
      const b = normalizeComparableCell(getCell(originalSheet, r, c));

      if (!sameJson(a, b)) {
        issues.push({ r, c });
        if (issues.length >= maxIssues) return issues;
      }
    }
  }

  return issues;
}

export function restoreOutsideDataRectOnly(
  editedWorkbook: any[],
  originalWorkbook: any[],
  totalRows: number,
  totalCols: number,
  dataRect: ReportRect
) {
  const edited = cloneDeepJson(
    ensureWorkbookShape(editedWorkbook ?? [], totalRows, totalCols)
  );
  const original = cloneDeepJson(
    ensureWorkbookShape(originalWorkbook ?? [], totalRows, totalCols)
  );

  const editedSheet = edited?.[0];
  const originalSheet = original?.[0];
  if (!editedSheet || !originalSheet) return edited;

  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      if (isCellInRect(r, c, dataRect)) continue;
      setCell(editedSheet, r, c, cloneDeepJson(getCell(originalSheet, r, c)));
    }
  }

  editedSheet.config = cloneDeepJson(originalSheet.config ?? {});
  editedSheet.row = originalSheet.row ?? totalRows;
  editedSheet.column = originalSheet.column ?? totalCols;
  editedSheet.name = originalSheet.name ?? editedSheet.name;
  editedSheet.id = originalSheet.id ?? editedSheet.id;

  return edited;
}

export function buildSavePayload(
  latestWorkbook: any[],
  originalWorkbook: any[],
  totalRows: number,
  totalCols: number,
  dataRect: ReportRect,
  opts?: {
    strictOutsideChanges?: boolean;
    lockOutsideDataRect?: boolean;
  }
): WorkbookDataGridSavePayload {
  const normalizedLatest = ensureWorkbookShape(
    latestWorkbook ?? [],
    totalRows,
    totalCols
  );

  const issues = detectOutsideDataRectChanges(
    normalizedLatest,
    originalWorkbook,
    totalRows,
    totalCols,
    dataRect
  );

  if ((opts?.strictOutsideChanges ?? false) && issues.length > 0) {
    const first = issues[0];
    throw new Error(
      `Phát hiện chỉnh sửa ngoài vùng nhập liệu tại ô (${first.r + 1}, ${first.c + 1}).`
    );
  }

  const restored = restoreOutsideDataRectOnly(
    normalizedLatest,
    originalWorkbook,
    totalRows,
    totalCols,
    dataRect
  );

  const finalWorkbook = prepareWorkbookForGrid(
    restored,
    totalRows,
    totalCols,
    dataRect,
    { lockOutsideDataRect: opts?.lockOutsideDataRect ?? true }
  );

  const sheet = finalWorkbook?.[0];
  if (!sheet) throw new Error("Không lấy được sheet để lưu.");

  const values1D = extractNumericValues1D(sheet, dataRect);

  return {
    rawWorkbookData: finalWorkbook,
    values1D,
  };
}