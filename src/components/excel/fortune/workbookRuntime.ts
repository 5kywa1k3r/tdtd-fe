import type { Rect } from "./regions";
import { buildCellRefsForValues, buildInputCellRefs } from "./specialRanges";
import { getCellDataType, normalizeSpecDataTypeMetadata } from "./dataTypes";
import type { HeaderSpec } from "./types";

export type RuntimeWorkbookCellValue = string | string[] | number | boolean | null;

export type RuntimeWorkbookValuePatch = {
  index: number;
  value: RuntimeWorkbookCellValue;
};

type FormulaEvaluationValue = number | "#VALUE!" | "#DIV/0!" | null;

function safeClone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function normalizeRuntimeValue(value: RuntimeWorkbookCellValue | undefined): RuntimeWorkbookCellValue {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return items.length > 0 ? items : null;
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export function normalizeRuntimeValues1D(
  values: RuntimeWorkbookCellValue[] | null | undefined,
  expectedLength?: number,
): RuntimeWorkbookCellValue[] {
  const source = Array.isArray(values) ? values : [];
  const length =
    typeof expectedLength === "number" && expectedLength >= 0
      ? Math.floor(expectedLength)
      : source.length;

  const next = source.slice(0, length).map((value) => normalizeRuntimeValue(value));
  while (next.length < length) next.push(null);
  return next;
}

export function buildRuntimeValuesPatch(
  previous: RuntimeWorkbookCellValue[] | null | undefined,
  next: RuntimeWorkbookCellValue[] | null | undefined,
): RuntimeWorkbookValuePatch[] {
  const normalizedNext = normalizeRuntimeValues1D(next);
  const normalizedPrevious = normalizeRuntimeValues1D(previous, normalizedNext.length);
  const patch: RuntimeWorkbookValuePatch[] = [];

  for (let index = 0; index < normalizedNext.length; index += 1) {
    if (JSON.stringify(normalizedPrevious[index]) === JSON.stringify(normalizedNext[index])) continue;
    patch.push({ index, value: normalizedNext[index] });
  }

  return patch;
}

export function applyRuntimeValuesPatch(
  previous: RuntimeWorkbookCellValue[] | null | undefined,
  patch: RuntimeWorkbookValuePatch[] | null | undefined,
  expectedLength?: number,
): RuntimeWorkbookCellValue[] {
  const next = normalizeRuntimeValues1D(previous, expectedLength);
  for (const item of patch ?? []) {
    const index = Math.floor(Number(item?.index));
    if (!Number.isInteger(index) || index < 0 || index >= next.length) continue;
    next[index] = normalizeRuntimeValue(item.value);
  }
  return next;
}

export function applyValues1DToWorkbookOrdered(
  workbook: any[],
  input: {
    values1D: RuntimeWorkbookCellValue[];
    r0: number;
    c0: number;
    w: number;
    h: number;
    spec?: HeaderSpec | null;
  },
): any[] {
  if (!Array.isArray(workbook) || workbook.length === 0) return workbook;

  const { values1D, r0, c0, w, h, spec } = input;
  if (!Array.isArray(values1D) || w <= 0 || h <= 0) return workbook;

  const next = safeClone(workbook);
  const sheet = next[0];
  if (!sheet) return next;
  const sheetId = String(sheet.id ?? sheet.index ?? "sheet-1");

  const rowCount = Math.max(sheet.row ?? 0, r0 + h, 1);
  const colCount = Math.max(sheet.column ?? 0, c0 + w, 1);
  const dataRect: Rect = { r0, c0, r1: r0 + h - 1, c1: c0 + w - 1 };
  const normalizedSpec = spec ? normalizeSpecDataTypeMetadata(spec) : null;
  const cellRefs = buildCellRefsForValues(dataRect, spec, values1D.length);
  if (cellRefs.length !== values1D.length) return next;

  const data = Array.isArray(sheet.data)
    ? safeClone(sheet.data)
    : Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => null));

  while (data.length < rowCount) {
    data.push(Array.from({ length: colCount }, () => null));
  }

  for (let r = 0; r < data.length; r += 1) {
    while (data[r].length < colCount) data[r].push(null);
  }

  let celldata = Array.isArray(sheet.celldata) ? safeClone(sheet.celldata) : [];

  for (let index = 0; index < cellRefs.length; index += 1) {
    const { r, c } = cellRefs[index];
    const raw = values1D[index];
    const existing = data[r]?.[c] ?? findCelldataValue(celldata, r, c);
    const dataType = normalizedSpec ? getCellDataType(normalizedSpec, dataRect, r, c) : undefined;
    const nextCell = buildOverlayCell(existing, raw, dataType);

    data[r][c] = nextCell;
    celldata = upsertCelldataCell(celldata, r, c, nextCell);
  }

  sheet.id = sheetId;
  sheet.index = sheet.index ?? sheetId;
  sheet.name = sheet.name ?? "Sheet1";
  sheet.row = rowCount;
  sheet.column = colCount;
  sheet.data = data;
  sheet.celldata = celldata;
  normalizeWorkbookNumberInputCells(next, dataRect, spec);
  recalculateSimpleNumericFormulas(next);

  return next;
}

function findCelldataValue(celldata: any[], r: number, c: number) {
  return celldata.find((item) => Number(item?.r) === r && Number(item?.c) === c)?.v ?? null;
}

function buildOverlayCell(existing: any, raw: RuntimeWorkbookCellValue, dataType?: string) {
  if (isBlankRuntimeCellValue(raw)) {
    if (!existing || typeof existing !== "object") return null;
    const next = { ...existing };
    delete next.v;
    delete next.m;
    delete next.ct;
    return Object.keys(next).length > 0 ? next : null;
  }

  const displayValue = Array.isArray(raw) ? raw.join("; ") : String(raw);
  const next = existing && typeof existing === "object"
    ? { ...existing, v: displayValue, m: displayValue }
    : { v: displayValue, m: displayValue };
  return dataType === "NUMBER" ? withNumberCellMetadata(next) : next;
}

function upsertCelldataCell(celldata: any[], r: number, c: number, cell: any) {
  const index = celldata.findIndex((item) => Number(item?.r) === r && Number(item?.c) === c);
  if (cell == null) {
    return index >= 0 ? celldata.filter((_item, itemIndex) => itemIndex !== index) : celldata;
  }

  const nextItem = { r, c, v: cell };
  if (index >= 0) {
    const next = celldata.slice();
    next[index] = nextItem;
    return next;
  }

  return [...celldata, nextItem];
}

function isBlankRuntimeCellValue(value: RuntimeWorkbookCellValue | undefined) {
  return value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
}

export function normalizeWorkbookNumberInputCells(
  workbook: any[] | null | undefined,
  dataRect: Rect,
  spec?: HeaderSpec | null,
) {
  if (!Array.isArray(workbook) || workbook.length === 0 || !spec) return workbook ?? [];

  const sheet = workbook[0];
  if (!sheet) return workbook;

  const normalizedSpec = normalizeSpecDataTypeMetadata(spec);
  const refs = buildInputCellRefs(dataRect, normalizedSpec);
  if (refs.length === 0) return workbook;

  const data = Array.isArray(sheet.data) ? sheet.data : (sheet.data = []);
  let celldata = Array.isArray(sheet.celldata) ? sheet.celldata : [];

  for (const ref of refs) {
    if (getCellDataType(normalizedSpec, dataRect, ref.r, ref.c) !== "NUMBER") continue;

    data[ref.r] = Array.isArray(data[ref.r]) ? data[ref.r] : [];
    const existing = data[ref.r][ref.c] ?? findCelldataValue(celldata, ref.r, ref.c);
    const nextCell = withNumberCellMetadata(existing);
    data[ref.r][ref.c] = nextCell;
    celldata = upsertCelldataCell(celldata, ref.r, ref.c, nextCell);
  }

  sheet.celldata = celldata;
  return workbook;
}

export function stripEmptyNumberInputCellMetadata(
  workbook: any[] | null | undefined,
  dataRect: Rect,
  spec?: HeaderSpec | null,
) {
  if (!Array.isArray(workbook) || workbook.length === 0 || !spec) return workbook ?? [];

  const sheet = workbook[0];
  if (!sheet) return workbook;

  const normalizedSpec = normalizeSpecDataTypeMetadata(spec);
  const refs = buildInputCellRefs(dataRect, normalizedSpec);
  if (refs.length === 0) return workbook;

  const data = Array.isArray(sheet.data) ? sheet.data : [];
  let celldata = Array.isArray(sheet.celldata) ? sheet.celldata : [];

  for (const ref of refs) {
    if (getCellDataType(normalizedSpec, dataRect, ref.r, ref.c) !== "NUMBER") continue;

    const row = Array.isArray(data[ref.r]) ? data[ref.r] : null;
    if (row) row[ref.c] = stripEmptyNumberCellMetadata(row[ref.c]);

    const fromCelldata = findCelldataValue(celldata, ref.r, ref.c);
    if (fromCelldata != null) {
      celldata = upsertCelldataCell(
        celldata,
        ref.r,
        ref.c,
        stripEmptyNumberCellMetadata(fromCelldata),
      );
    }
  }

  sheet.celldata = celldata;
  return workbook;
}

export function recalculateSimpleNumericFormulas(workbook: any[] | null | undefined) {
  if (!Array.isArray(workbook) || workbook.length === 0) return workbook ?? [];

  for (const sheet of workbook) {
    if (!sheet || typeof sheet !== "object") continue;
    const refs = getFormulaRefs(sheet);
    if (refs.length === 0) continue;

    const memo = new Map<string, FormulaEvaluationValue>();
    for (const ref of refs) {
      const cell = getSheetCell(sheet, ref.r, ref.c);
      if (!isFormulaCell(cell)) continue;

      const value = evaluateFormulaCell(sheet, ref.r, ref.c, memo, new Set<string>());
      if (value == null) continue;

      const nextCell = {
        ...cell,
        v: value,
        m: String(value),
      };
      if (typeof value === "number") {
        nextCell.ct = withNumberFormat(cell.ct);
      }
      setSheetCell(sheet, ref.r, ref.c, nextCell);
    }
  }

  return workbook;
}

function withNumberCellMetadata(cell: any) {
  const next =
    cell && typeof cell === "object" && !Array.isArray(cell)
      ? { ...cell }
      : cell == null
        ? {}
        : { v: cell, m: String(cell) };

  const numeric = parseNumberLike(next.v ?? next.m);
  if (numeric != null) {
    next.v = numeric;
    next.m = String(numeric);
  }

  next.ct = withNumberFormat(next.ct);
  return next;
}

function stripEmptyNumberCellMetadata(cell: any) {
  if (!cell || typeof cell !== "object" || Array.isArray(cell)) return cell ?? null;
  if (hasMeaningfulCellValue(cell)) return cell;
  if (cell.ct?.t !== "n") return cell;

  const next = { ...cell };
  delete next.ct;
  return Object.keys(next).length > 0 ? next : null;
}

function hasMeaningfulCellValue(cell: any) {
  if (!cell || typeof cell !== "object" || Array.isArray(cell)) return cell != null;
  if (typeof cell.f === "string" && cell.f.trim()) return true;
  if (typeof cell.v === "number" && Number.isFinite(cell.v)) return true;
  if (typeof cell.v === "boolean") return true;
  if (typeof cell.v === "string" && cell.v.trim()) return true;
  if (typeof cell.m === "number" && Number.isFinite(cell.m)) return true;
  if (typeof cell.m === "string" && cell.m.trim()) return true;
  return false;
}

function withNumberFormat(value: any) {
  const ct = value && typeof value === "object" && !Array.isArray(value)
    ? { ...value }
    : {};
  delete ct.s;
  if (String(ct.fa ?? "").trim() === "@") delete ct.fa;
  ct.t = "n";
  return ct;
}

function getFormulaRefs(sheet: any) {
  const refs: Array<{ r: number; c: number }> = [];
  const seen = new Set<string>();
  const add = (r: unknown, c: unknown) => {
    const rr = Math.floor(Number(r));
    const cc = Math.floor(Number(c));
    if (!Number.isFinite(rr) || !Number.isFinite(cc) || rr < 0 || cc < 0) return;
    const key = `${rr}:${cc}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push({ r: rr, c: cc });
  };

  const calcChain = Array.isArray(sheet?.calcChain) ? sheet.calcChain : [];
  for (const item of calcChain) add(item?.r, item?.c);

  if (refs.length > 0) return refs;

  const data = Array.isArray(sheet?.data) ? sheet.data : [];
  for (let r = 0; r < data.length; r += 1) {
    const row = Array.isArray(data[r]) ? data[r] : [];
    for (let c = 0; c < row.length; c += 1) {
      if (isFormulaCell(row[c])) add(r, c);
    }
  }

  const celldata = Array.isArray(sheet?.celldata) ? sheet.celldata : [];
  for (const item of celldata) {
    if (isFormulaCell(item?.v)) add(item?.r, item?.c);
  }

  return refs;
}

function isFormulaCell(cell: any) {
  return Boolean(cell && typeof cell === "object" && !Array.isArray(cell) && typeof cell.f === "string" && cell.f.trim());
}

function evaluateFormulaCell(
  sheet: any,
  r: number,
  c: number,
  memo: Map<string, FormulaEvaluationValue>,
  visiting: Set<string>,
): FormulaEvaluationValue {
  const key = `${r}:${c}`;
  if (memo.has(key)) return memo.get(key) ?? null;
  if (visiting.has(key)) return null;

  const cell = getSheetCell(sheet, r, c);
  if (!isFormulaCell(cell)) return null;

  visiting.add(key);
  const value = evaluateSimpleFormula(String(cell.f), sheet, memo, visiting);
  visiting.delete(key);
  memo.set(key, value);
  return value;
}

function evaluateSimpleFormula(
  formula: string,
  sheet: any,
  memo: Map<string, FormulaEvaluationValue>,
  visiting: Set<string>,
): FormulaEvaluationValue {
  const expression = formula.trim().replace(/^=/, "").trim();
  if (!expression) return null;

  const terms = splitTopLevelAddTerms(expression);
  if (!terms) return null;

  let total = 0;
  for (const term of terms) {
    const value = evaluateNumericTerm(term.text, sheet, memo, visiting, "ADD");
    if (value == null) return null;
    if (isFormulaError(value)) return value;
    total += term.sign * value;
  }
  return total;
}

function evaluateNumericTerm(
  raw: string,
  sheet: any,
  memo: Map<string, FormulaEvaluationValue>,
  visiting: Set<string>,
  mode: "ADD" | "SUM",
): FormulaEvaluationValue {
  const text = raw.trim();
  if (!text) return 0;

  const factors = splitTopLevelMultiplyTerms(text);
  if (factors && factors.length > 1) {
    let total: number | null = null;
    for (const factor of factors) {
      const value = evaluateNumericTerm(factor.text, sheet, memo, visiting, mode);
      if (value == null) return null;
      if (isFormulaError(value)) return value;
      if (total == null) {
        total = value;
      } else if (factor.op === "*") {
        total *= value;
      } else {
        if (value === 0) return "#DIV/0!";
        total /= value;
      }
    }
    return total;
  }

  const sumArgs = parseSumArgs(text);
  if (sumArgs) {
    let total = 0;
    for (const arg of sumArgs) {
      const value = evaluateNumericTerm(arg, sheet, memo, visiting, "SUM");
      if (value == null) return null;
      if (isFormulaError(value)) return value;
      total += value;
    }
    return total;
  }

  const range = parseCellRange(text);
  if (range) {
    let total = 0;
    for (let r = range.r0; r <= range.r1; r += 1) {
      for (let c = range.c0; c <= range.c1; c += 1) {
        const value = getNumericCellValue(sheet, r, c, memo, visiting, "SUM");
        if (isFormulaError(value)) return value;
        total += value ?? 0;
      }
    }
    return total;
  }

  const ref = parseCellRef(text);
  if (ref) {
    return getNumericCellValue(sheet, ref.r, ref.c, memo, visiting, mode);
  }

  const literal = parseNumberLike(text);
  if (literal != null) return literal;

  return null;
}

function getNumericCellValue(
  sheet: any,
  r: number,
  c: number,
  memo: Map<string, FormulaEvaluationValue>,
  visiting: Set<string>,
  mode: "ADD" | "SUM",
): FormulaEvaluationValue {
  const cell = getSheetCell(sheet, r, c);
  if (isFormulaCell(cell)) {
    return evaluateFormulaCell(sheet, r, c, memo, visiting);
  }
  if (!cell || typeof cell !== "object" || Array.isArray(cell)) {
    const literal = parseNumberLike(cell);
    return literal ?? 0;
  }

  const raw = cell.v ?? cell.m;
  const value = parseNumberLike(raw);
  if (value != null) return value;

  if (raw == null || raw === "") return 0;
  return mode === "SUM" ? 0 : "#VALUE!";
}

function isFormulaError(value: FormulaEvaluationValue): value is "#VALUE!" | "#DIV/0!" {
  return value === "#VALUE!" || value === "#DIV/0!";
}

function splitTopLevelAddTerms(expression: string): Array<{ sign: 1 | -1; text: string }> | null {
  const terms: Array<{ sign: 1 | -1; text: string }> = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  let sign: 1 | -1 = 1;

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      if (depth < 0) return null;
      continue;
    }
    if (depth !== 0 || (char !== "+" && char !== "-")) continue;

    if (index === start) {
      sign = char === "-" ? -1 : 1;
      start = index + 1;
      continue;
    }

    terms.push({ sign, text: expression.slice(start, index) });
    sign = char === "-" ? -1 : 1;
    start = index + 1;
  }

  if (depth !== 0 || quote) return null;
  terms.push({ sign, text: expression.slice(start) });
  return terms;
}

function splitTopLevelMultiplyTerms(expression: string): Array<{ op: "*" | "/"; text: string }> | null {
  const factors: Array<{ op: "*" | "/"; text: string }> = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  let op: "*" | "/" = "*";
  let hasOperator = false;

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      if (depth < 0) return null;
      continue;
    }
    if (depth !== 0 || (char !== "*" && char !== "/")) continue;

    if (index === start) return null;
    factors.push({ op, text: expression.slice(start, index) });
    op = char;
    start = index + 1;
    hasOperator = true;
  }

  if (depth !== 0 || quote || !hasOperator || start >= expression.length) return null;
  factors.push({ op, text: expression.slice(start) });
  return factors;
}

function parseSumArgs(text: string): string[] | null {
  const match = /^SUM\((.*)\)$/i.exec(text.trim());
  if (!match) return null;
  return splitTopLevelCommaArgs(match[1]);
}

function splitTopLevelCommaArgs(text: string) {
  const args: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      args.push(text.slice(start, index));
      start = index + 1;
    }
  }

  args.push(text.slice(start));
  return args.map((arg) => arg.trim()).filter(Boolean);
}

function parseCellRange(text: string) {
  const [left, right, ...extra] = text.split(":");
  if (!left || !right || extra.length > 0) return null;
  const start = parseCellRef(left);
  const end = parseCellRef(right);
  if (!start || !end) return null;
  return {
    r0: Math.min(start.r, end.r),
    c0: Math.min(start.c, end.c),
    r1: Math.max(start.r, end.r),
    c1: Math.max(start.c, end.c),
  };
}

function parseCellRef(text: string) {
  const normalized = text.trim().replace(/\$/g, "").toUpperCase();
  const match = /^([A-Z]{1,3})([1-9]\d*)$/.exec(normalized);
  if (!match) return null;
  return { r: Number(match[2]) - 1, c: columnNameToIndex(match[1]) };
}

function columnNameToIndex(name: string) {
  let value = 0;
  for (const char of name.toUpperCase()) {
    value = value * 26 + (char.charCodeAt(0) - 64);
  }
  return value - 1;
}

function getSheetCell(sheet: any, r: number, c: number) {
  const row = Array.isArray(sheet?.data) ? sheet.data[r] : null;
  if (Array.isArray(row) && row[c] != null) return row[c];
  return findCelldataValue(Array.isArray(sheet?.celldata) ? sheet.celldata : [], r, c);
}

function setSheetCell(sheet: any, r: number, c: number, cell: any) {
  sheet.data = Array.isArray(sheet.data) ? sheet.data : [];
  sheet.data[r] = Array.isArray(sheet.data[r]) ? sheet.data[r] : [];
  sheet.data[r][c] = cell;
  sheet.celldata = upsertCelldataCell(Array.isArray(sheet.celldata) ? sheet.celldata : [], r, c, cell);
}

function parseNumberLike(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return null;

  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : null;
}
