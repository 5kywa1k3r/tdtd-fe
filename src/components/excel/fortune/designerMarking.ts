// src/components/excel/fortune/designerMarking.ts

export type Rect = { r0: number; c0: number; r1: number; c1: number };

export const MARK_COLORS = {
  HEADER_BG: "#FFF2CC",
  DATA_BG: "#E9FFF3",
  LOCK_BG: "#F3F4F6",
} as const;

export type Backup = { bg?: string };

const keyOf = (r: number, c: number) => `${r},${c}`;

function ensureCelldata(sheet: any) {
  sheet.celldata = Array.isArray(sheet?.celldata) ? sheet.celldata : [];
  return sheet.celldata as any[];
}

function ensureRow(sheet: any, r: number) {
  sheet.data = Array.isArray(sheet?.data) ? sheet.data : [];
  sheet.data[r] = Array.isArray(sheet.data[r]) ? sheet.data[r] : [];
  return sheet.data[r] as any[];
}

function getCellFromData(sheet: any, r: number, c: number): any {
  const row = Array.isArray(sheet?.data) ? sheet.data[r] : null;
  return Array.isArray(row) ? row[c] : null;
}

/**
 * ✅ map last-wins (để đọc cell hiện tại)
 */
function buildCelldataMap(sheet: any) {
  const m = new Map<string, any>();
  const cd = Array.isArray(sheet?.celldata) ? sheet.celldata : [];
  for (const it of cd) {
    const r = Number(it?.r);
    const c = Number(it?.c);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    if (it?.v && typeof it.v === "object") m.set(keyOf(r, c), it.v);
  }
  return m;
}

/**
 * ✅ index FIRST-wins (để ghi đè đúng entry mà engine có thể đang đọc)
 * Nếu celldata có trùng key, ta sẽ update entry đầu tiên thay vì push thêm.
 */
function buildCelldataFirstIndex(sheet: any) {
  const idx = new Map<string, number>();
  const cd = ensureCelldata(sheet);
  for (let i = 0; i < cd.length; i++) {
    const it = cd[i];
    const r = Number(it?.r);
    const c = Number(it?.c);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    const k = keyOf(r, c);
    if (!idx.has(k)) idx.set(k, i); // FIRST wins
  }
  return idx;
}

/**
 * ✅ lấy cell base ưu tiên data, fallback celldata
 */
function getBaseCell(sheet: any, r: number, c: number, cdMap: Map<string, any>): any {
  const d = getCellFromData(sheet, r, c);
  if (d && typeof d === "object") return d;
  const v = cdMap.get(keyOf(r, c));
  return v && typeof v === "object" ? v : null;
}

/**
 * ✅ UPSERT celldata: nếu đã có entry (r,c) thì update tại chỗ, không push thêm.
 */
function upsertCelldata(sheet: any, r: number, c: number, fullCellObj: any, firstIdx: Map<string, number>) {
  const cd = ensureCelldata(sheet);
  const k = keyOf(r, c);
  const i = firstIdx.get(k);

  if (typeof i === "number" && i >= 0 && i < cd.length) {
    cd[i] = { r, c, v: fullCellObj };
  } else {
    cd.push({ r, c, v: fullCellObj });
    // entry mới trở thành “first” cho key này
    firstIdx.set(k, cd.length - 1);
  }
}

function backupBg(sheet: any, r: number, c: number, cdMap: Map<string, any>): Backup {
  const cell = getBaseCell(sheet, r, c, cdMap);
  const bg = cell && typeof cell === "object" ? cell.bg : undefined;
  return { bg };
}

function shouldRollback(sheet: any, r: number, c: number, markedBg: string, cdMap: Map<string, any>): boolean {
  const cell = getBaseCell(sheet, r, c, cdMap);
  if (!cell || typeof cell !== "object") return false;
  return cell.bg === markedBg;
}

function applyBg(
  sheet: any,
  r: number,
  c: number,
  bg: string | undefined,
  cdMap: Map<string, any>,
  firstIdx: Map<string, number>
) {
  const row = ensureRow(sheet, r);

  const base = getBaseCell(sheet, r, c, cdMap);
  const next = base && typeof base === "object" ? { ...base } : {};

  if (bg === undefined) delete next.bg;
  else next.bg = bg;

  row[c] = next;

  // ✅ celldata UPSERT (không push trùng key)
  upsertCelldata(sheet, r, c, next, firstIdx);

  // ✅ update map để bước sau đọc được cell mới
  cdMap.set(keyOf(r, c), next);
}

function applyLocked(
  sheet: any,
  r: number,
  c: number,
  locked: boolean | null,
  cdMap: Map<string, any>,
  firstIdx: Map<string, number>
) {
  const row = ensureRow(sheet, r);

  const base = getBaseCell(sheet, r, c, cdMap);
  const next = base && typeof base === "object" ? { ...base } : {};

  if (locked == null) delete next.locked;
  else next.locked = locked;

  row[c] = next;

  // ✅ celldata UPSERT
  upsertCelldata(sheet, r, c, next, firstIdx);

  cdMap.set(keyOf(r, c), next);
}

/* ===================== PUBLIC API ===================== */

export function markRect(sheet: any, rect: Rect, color: string, backup: Map<string, Backup>) {
  const cdMap = buildCelldataMap(sheet);
  const firstIdx = buildCelldataFirstIndex(sheet);

  for (let r = rect.r0; r <= rect.r1; r++) {
    for (let c = rect.c0; c <= rect.c1; c++) {
      const k = keyOf(r, c);
      if (!backup.has(k)) backup.set(k, backupBg(sheet, r, c, cdMap));
      applyBg(sheet, r, c, color, cdMap, firstIdx);
    }
  }
}

export function unmarkRect(sheet: any, rect: Rect, markedBg: string, backup: Map<string, Backup>) {
  const cdMap = buildCelldataMap(sheet);
  const firstIdx = buildCelldataFirstIndex(sheet);

  for (let r = rect.r0; r <= rect.r1; r++) {
    for (let c = rect.c0; c <= rect.c1; c++) {
      const k = keyOf(r, c);
      const bak = backup.get(k);
      if (!bak) continue;

      if (shouldRollback(sheet, r, c, markedBg, cdMap)) {
        applyBg(sheet, r, c, bak.bg, cdMap, firstIdx);
      }

      backup.delete(k);
    }
  }
}

export function stripMarksForSave(sheet: any, backup: Map<string, Backup>, markedBgs: Set<string>) {
  const cdMap = buildCelldataMap(sheet);
  const firstIdx = buildCelldataFirstIndex(sheet);

  for (const [k, bak] of backup.entries()) {
    const [rs, cs] = k.split(",");
    const r = Number(rs);
    const c = Number(cs);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;

    const cell = getBaseCell(sheet, r, c, cdMap);
    const curBg = cell && typeof cell === "object" ? cell.bg : undefined;

    if (curBg && markedBgs.has(curBg)) {
      applyBg(sheet, r, c, bak.bg, cdMap, firstIdx);
    }
  }
}

export function lockRect(
  sheet: any,
  rect: Rect,
  opts?: { setBg?: boolean; backupBgMap?: Map<string, Backup> }
) {
  const setBgFlag = opts?.setBg ?? true;
  const backupBgMap = opts?.backupBgMap;

  const cdMap = buildCelldataMap(sheet);
  const firstIdx = buildCelldataFirstIndex(sheet);

  for (let r = rect.r0; r <= rect.r1; r++) {
    for (let c = rect.c0; c <= rect.c1; c++) {
      if (setBgFlag && backupBgMap) {
        const k = keyOf(r, c);
        if (!backupBgMap.has(k)) backupBgMap.set(k, backupBg(sheet, r, c, cdMap));
      }

      applyLocked(sheet, r, c, true, cdMap, firstIdx);
      if (setBgFlag) applyBg(sheet, r, c, MARK_COLORS.LOCK_BG, cdMap, firstIdx);
    }
  }
}

export function unlockRect(
  sheet: any,
  rect: Rect,
  opts?: { restoreBg?: boolean; backupBgMap?: Map<string, Backup> }
) {
  const restoreBg = opts?.restoreBg ?? false;
  const backupBgMap = opts?.backupBgMap;

  const cdMap = buildCelldataMap(sheet);
  const firstIdx = buildCelldataFirstIndex(sheet);

  for (let r = rect.r0; r <= rect.r1; r++) {
    for (let c = rect.c0; c <= rect.c1; c++) {
      applyLocked(sheet, r, c, null, cdMap, firstIdx);

      if (restoreBg && backupBgMap) {
        const k = keyOf(r, c);
        const bak = backupBgMap.get(k);
        if (bak) applyBg(sheet, r, c, bak.bg, cdMap, firstIdx);
        backupBgMap.delete(k);
      }
    }
  }
}