import type { Rect } from "./regions";
import type { HeaderSpecialRange, HeaderSpecialRole, HeaderSpec } from "./types";

export type DynamicExcelInputCellRef = {
  index: number;
  dataOffset: number;
  r: number;
  c: number;
  rowOffset: number;
  colOffset: number;
  rowKey: string;
  columnKey: string;
};

export type HeaderSpecialRangeIssue = {
  code: "SPECIAL_RANGE_OUTSIDE_DATA" | "SPECIAL_RANGE_OVERLAP" | "SPECIAL_RANGE_NO_INPUT";
  message: string;
  at?: { r: number; c: number };
};

type SpecialCellMask = {
  dataRect: Rect;
  width: number;
  flags: Uint8Array;
};

const SPECIAL_ROLES = new Set<HeaderSpecialRole>(["HEADER", "FORMULA", "TITLE", "STYLE", "BLANK"]);

export const SPECIAL_RANGE_COLORS: Record<HeaderSpecialRole, string> = {
  FORMULA: "#FFF8E1",
  TITLE: "#F3E5F5",
  BLANK: "#ECEFF1",
  HEADER: "#F3E5F5",
  STYLE: "#ECEFF1",
};

export function normalizeSpecialRangeRole(value: unknown): HeaderSpecialRole | null {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  const normalized = raw === "FORMULAR"
    ? "FORMULA"
    : raw === "HEADER"
      ? "TITLE"
      : raw === "STYLE" || raw === "EMPTY" || raw === "EMPTY_INPUT"
        ? "BLANK"
        : raw;
  return SPECIAL_ROLES.has(normalized as HeaderSpecialRole)
    ? (normalized as HeaderSpecialRole)
    : null;
}

export function normalizeSpecialRanges(value: unknown): HeaderSpecialRange[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index): HeaderSpecialRange | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const role = normalizeSpecialRangeRole(row.role ?? row.kind ?? row.type);
      const rect = normalizeRect(row);
      if (!role || !rect) return null;

      const label = typeof row.label === "string" && row.label.trim() ? row.label.trim() : undefined;
      const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : `special_${index + 1}`;
      return { id, role, ...rect, label };
    })
    .filter((item): item is HeaderSpecialRange => Boolean(item))
    .sort((a, b) => a.r0 - b.r0 || a.c0 - b.c0 || a.r1 - b.r1 || a.c1 - b.c1 || a.role.localeCompare(b.role))
    .map((item, index) => ({ ...item, id: item.id || `special_${index + 1}` }));
}

export function normalizeSpecSpecialRanges<T extends HeaderSpec>(spec: T): T {
  const specialRanges = normalizeSpecialRanges(spec.specialRanges);
  return {
    ...spec,
    ...(specialRanges.length > 0 ? { specialRanges } : { specialRanges: [] }),
  };
}

export function compressCellsToSpecialRanges(
  cells: Array<{ r: number; c: number }>,
  role: HeaderSpecialRange["role"],
  idPrefix = `special_${String(role).toLowerCase()}`,
): HeaderSpecialRange[] {
  const byRow = new Map<number, number[]>();
  const seen = new Set<string>();

  for (const cell of cells) {
    const r = Math.floor(Number(cell?.r));
    const c = Math.floor(Number(cell?.c));
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0) continue;
    const key = `${r}:${c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cols = byRow.get(r) ?? [];
    cols.push(c);
    byRow.set(r, cols);
  }

  const closed: HeaderSpecialRange[] = [];
  let active = new Map<string, HeaderSpecialRange>();

  const closeInactiveRanges = (nextActive: Map<string, HeaderSpecialRange>) => {
    for (const [key, range] of active.entries()) {
      if (nextActive.get(key) === range) continue;
      closed.push(range);
    }
  };

  for (const r of [...byRow.keys()].sort((a, b) => a - b)) {
    const runs = buildContiguousColumnRuns(byRow.get(r) ?? []);
    const nextActive = new Map<string, HeaderSpecialRange>();

    for (const run of runs) {
      const key = `${run.c0}:${run.c1}`;
      const previous = active.get(key);
      if (previous && previous.r1 === r - 1) {
        previous.r1 = r;
        nextActive.set(key, previous);
        continue;
      }

      nextActive.set(key, {
        role,
        r0: r,
        c0: run.c0,
        r1: r,
        c1: run.c1,
      });
    }

    closeInactiveRanges(nextActive);
    active = nextActive;
  }

  for (const range of active.values()) {
    closed.push(range);
  }

  return normalizeSpecialRanges(
    closed
      .sort((a, b) => a.r0 - b.r0 || a.c0 - b.c0 || a.r1 - b.r1 || a.c1 - b.c1)
      .map((range, index) => ({ ...range, id: `${idPrefix}_${index + 1}` })),
  );
}

export function getSpecialRanges(spec: HeaderSpec | null | undefined): HeaderSpecialRange[] {
  return normalizeSpecialRanges(spec?.specialRanges);
}

export function isCellInRect(r: number, c: number, rect: Rect) {
  return r >= rect.r0 && r <= rect.r1 && c >= rect.c0 && c <= rect.c1;
}

export function rectsOverlap(a: Rect, b: Rect) {
  return a.r0 <= b.r1 && a.r1 >= b.r0 && a.c0 <= b.c1 && a.c1 >= b.c0;
}

export function rectContainsRect(outer: Rect, inner: Rect) {
  return inner.r0 >= outer.r0 && inner.c0 >= outer.c0 && inner.r1 <= outer.r1 && inner.c1 <= outer.c1;
}

export function findSpecialRangeAt(
  spec: HeaderSpec | null | undefined,
  r: number,
  c: number,
): HeaderSpecialRange | null {
  return getSpecialRanges(spec).find((range) => isCellInRect(r, c, range)) ?? null;
}

export function isSpecialCell(
  spec: HeaderSpec | null | undefined,
  r: number,
  c: number,
) {
  return Boolean(findSpecialRangeAt(spec, r, c));
}

export function isInputDataCell(
  spec: HeaderSpec | null | undefined,
  dataRect: Rect,
  r: number,
  c: number,
) {
  return isCellInRect(r, c, dataRect) && !isSpecialCell(spec, r, c);
}

export function createInputDataCellChecker(
  dataRect: Rect,
  spec: HeaderSpec | null | undefined,
) {
  const mask = buildSpecialCellMask(dataRect, spec);
  return (r: number, c: number) => isCellInRect(r, c, dataRect) && !isMaskedSpecialCell(mask, r, c);
}

function buildSpecialCellMask(
  dataRect: Rect,
  spec: HeaderSpec | null | undefined,
): SpecialCellMask | null {
  const ranges = getSpecialRanges(spec).filter((range) => rectsOverlap(range, dataRect));
  const width = dataRect.c1 - dataRect.c0 + 1;
  const height = dataRect.r1 - dataRect.r0 + 1;
  if (ranges.length === 0 || width <= 0 || height <= 0) return null;

  const flags = new Uint8Array(width * height);
  for (const range of ranges) {
    const r0 = Math.max(dataRect.r0, range.r0);
    const c0 = Math.max(dataRect.c0, range.c0);
    const r1 = Math.min(dataRect.r1, range.r1);
    const c1 = Math.min(dataRect.c1, range.c1);

    for (let r = r0; r <= r1; r += 1) {
      let offset = (r - dataRect.r0) * width + (c0 - dataRect.c0);
      for (let c = c0; c <= c1; c += 1) {
        flags[offset] = 1;
        offset += 1;
      }
    }
  }

  return { dataRect, width, flags };
}

function isMaskedSpecialCell(mask: SpecialCellMask | null, r: number, c: number) {
  if (!mask) return false;
  const { dataRect, width, flags } = mask;
  if (!isCellInRect(r, c, dataRect)) return false;
  return flags[(r - dataRect.r0) * width + (c - dataRect.c0)] === 1;
}

export function buildDataRectCellRefs(dataRect: Rect): DynamicExcelInputCellRef[] {
  const refs: DynamicExcelInputCellRef[] = [];
  const width = dataRect.c1 - dataRect.c0 + 1;
  if (width <= 0 || dataRect.r1 < dataRect.r0) return refs;

  for (let r = dataRect.r0; r <= dataRect.r1; r += 1) {
    for (let c = dataRect.c0; c <= dataRect.c1; c += 1) {
      const rowOffset = r - dataRect.r0;
      const colOffset = c - dataRect.c0;
      const dataOffset = rowOffset * width + colOffset;
      refs.push({
        index: dataOffset,
        dataOffset,
        r,
        c,
        rowOffset,
        colOffset,
        rowKey: `row_${rowOffset + 1}`,
        columnKey: `col_${colOffset + 1}`,
      });
    }
  }

  return refs;
}

export function buildInputCellRefs(
  dataRect: Rect,
  spec: HeaderSpec | null | undefined,
): DynamicExcelInputCellRef[] {
  const refs: DynamicExcelInputCellRef[] = [];
  const width = dataRect.c1 - dataRect.c0 + 1;
  if (width <= 0 || dataRect.r1 < dataRect.r0) return refs;

  const mask = buildSpecialCellMask(dataRect, spec);
  let index = 0;
  for (let r = dataRect.r0; r <= dataRect.r1; r += 1) {
    for (let c = dataRect.c0; c <= dataRect.c1; c += 1) {
      if (isMaskedSpecialCell(mask, r, c)) continue;
      const rowOffset = r - dataRect.r0;
      const colOffset = c - dataRect.c0;
      const dataOffset = rowOffset * width + colOffset;
      refs.push({
        index,
        dataOffset,
        r,
        c,
        rowOffset,
        colOffset,
        rowKey: `row_${rowOffset + 1}`,
        columnKey: `col_${colOffset + 1}`,
      });
      index += 1;
    }
  }

  return refs;
}

export function buildCellRefsForValues(
  dataRect: Rect,
  spec: HeaderSpec | null | undefined,
  valuesLength?: number | null,
): DynamicExcelInputCellRef[] {
  const inputRefs = buildInputCellRefs(dataRect, spec);
  const allRefs = buildDataRectCellRefs(dataRect);
  const length = Number(valuesLength);

  if (Number.isInteger(length) && length >= 0) {
    if (length === inputRefs.length) return inputRefs;
    if (length === allRefs.length) return allRefs;
  }

  return getSpecialRanges(spec).length > 0 ? inputRefs : allRefs;
}

export function validateSpecialRanges(
  spec: HeaderSpec | null | undefined,
  dataRect: Rect,
): HeaderSpecialRangeIssue[] {
  const ranges = getSpecialRanges(spec);
  const issues: HeaderSpecialRangeIssue[] = [];

  ranges.forEach((range) => {
    if (!rectContainsRect(dataRect, range)) {
      issues.push({
        code: "SPECIAL_RANGE_OUTSIDE_DATA",
        message: "Vùng đặc biệt phải nằm trong vùng dữ liệu.",
        at: { r: range.r0, c: range.c0 },
      });
    }
  });

  for (let i = 0; i < ranges.length; i += 1) {
    for (let j = i + 1; j < ranges.length; j += 1) {
      if (!rectsOverlap(ranges[i], ranges[j])) continue;
      issues.push({
        code: "SPECIAL_RANGE_OVERLAP",
        message: "Các vùng đặc biệt không được chồng lấn.",
        at: { r: Math.max(ranges[i].r0, ranges[j].r0), c: Math.max(ranges[i].c0, ranges[j].c0) },
      });
    }
  }

  if (ranges.length > 0 && buildInputCellRefs(dataRect, spec).length === 0) {
    issues.push({
      code: "SPECIAL_RANGE_NO_INPUT",
      message: "Vùng dữ liệu phải còn ít nhất một ô nhập sau khi loại các vùng đặc biệt.",
      at: { r: dataRect.r0, c: dataRect.c0 },
    });
  }

  return issues;
}

export function upsertSpecialRange(
  spec: HeaderSpec,
  rect: Rect,
  role: HeaderSpecialRole,
  id?: string,
): HeaderSpec {
  const normalized = normalizeRect({ ...rect, role });
  if (!normalized) return spec;
  const targetId = id || `special_${Date.now()}`;
  const ranges = getSpecialRanges(spec).filter((range) => range.id !== targetId);
  ranges.push({ id: targetId, role, ...normalized });
  return { ...spec, specialRanges: normalizeSpecialRanges(ranges) };
}

export function removeSpecialRange(spec: HeaderSpec, target: HeaderSpecialRange): HeaderSpec {
  const ranges = getSpecialRanges(spec).filter((range) => {
    if (target.id) return range.id !== target.id;
    return range.role !== target.role ||
      range.r0 !== target.r0 ||
      range.c0 !== target.c0 ||
      range.r1 !== target.r1 ||
      range.c1 !== target.c1;
  });
  return { ...spec, specialRanges: ranges };
}

function normalizeRect(row: Record<string, unknown>): Rect | null {
  const r0 = toNonNegativeInt(row.r0 ?? row.R0);
  const c0 = toNonNegativeInt(row.c0 ?? row.C0);
  const r1 = toNonNegativeInt(row.r1 ?? row.R1);
  const c1 = toNonNegativeInt(row.c1 ?? row.C1);
  if (r0 == null || c0 == null || r1 == null || c1 == null) return null;
  if (r1 < r0 || c1 < c0) return null;
  return { r0, c0, r1, c1 };
}

function toNonNegativeInt(value: unknown) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function buildContiguousColumnRuns(cols: number[]) {
  const sorted = [...cols].sort((a, b) => a - b);
  const runs: Array<{ c0: number; c1: number }> = [];
  let current: { c0: number; c1: number } | null = null;

  for (const c of sorted) {
    if (current && current.c1 + 1 === c) {
      current.c1 = c;
      continue;
    }

    if (current) runs.push(current);
    current = { c0: c, c1: c };
  }

  if (current) runs.push(current);
  return runs;
}
