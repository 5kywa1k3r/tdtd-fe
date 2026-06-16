import type {
  DataTypeOverride,
  DynamicExcelDataType,
  DynamicExcelStringListOption,
  DynamicExcelValueSource,
  DynamicExcelValueSourceType,
  HeaderSpec,
} from "./types";
import type { Rect } from "./regions";
import { normalizeSpecialRanges } from "./specialRanges";

export const DEFAULT_DYNAMIC_EXCEL_DATA_TYPE: DynamicExcelDataType = "NUMBER";

const RAW_DATA_TYPE_OPTIONS: Array<{ value: DynamicExcelDataType; label: string; tooltip?: string }> = [
  { value: "NUMBER", label: "Số" },
  { value: "SHORT_TEXT", label: "Nội dung cố định" },
  { value: "MULTI_SELECT", label: "Nội dung cố định (chọn nhiều)" },
  { value: "DATE", label: "Ngày/kỳ", tooltip: "Định dạng: dd/MM/yyyy, MM/yyyy hoặc yyyy." },
  { value: "FULL_DATE", label: "Ngày đầy đủ", tooltip: "Định dạng: dd/MM/yyyy." },
  { value: "BOOLEAN", label: "Đúng/Sai" },
];

const DATA_TYPE_VI_LABELS: Record<DynamicExcelDataType, { label: string; tooltip?: string }> = {
  NUMBER: { label: "Số" },
  SHORT_TEXT: { label: "Nội dung cố định" },
  MULTI_SELECT: { label: "Nội dung cố định (chọn nhiều)" },
  DATE: { label: "Ngày/kỳ", tooltip: "Định dạng: dd/MM/yyyy, MM/yyyy hoặc yyyy." },
  FULL_DATE: { label: "Ngày đầy đủ", tooltip: "Định dạng: dd/MM/yyyy." },
  BOOLEAN: { label: "Đúng/Sai" },
  IGNORE: {
    label: "Bỏ qua nhập",
    tooltip: "Tương thích dữ liệu cũ; cấu hình mới nên dùng vùng Bỏ trống không nhập.",
  },
};

export const DATA_TYPE_OPTIONS = RAW_DATA_TYPE_OPTIONS.map((option) => ({
  ...option,
  ...DATA_TYPE_VI_LABELS[option.value],
}));

export const DATA_TYPE_COLORS: Record<DynamicExcelDataType, string> = {
  NUMBER: "#E8F5E9",
  DATE: "#E3F2FD",
  FULL_DATE: "#D6EAF8",
  BOOLEAN: "#FFF3E0",
  SHORT_TEXT: "#F3E5F5",
  MULTI_SELECT: "#E8EAF6",
  IGNORE: "#ECEFF1",
};

const DATA_TYPE_SET = new Set<DynamicExcelDataType>(
  DATA_TYPE_OPTIONS.map((option) => option.value),
);

const VALUE_SOURCE_TYPE_SET = new Set<DynamicExcelValueSourceType>([
  "FIXED_ENUM",
  "ENUM_CATALOG",
  "SYSTEM_UNIT",
  "SYSTEM_USER",
  "SYSTEM_POSITION",
  "SYSTEM_UNIT_TYPE",
]);

export function normalizeDataType(value: unknown): DynamicExcelDataType {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (normalized === "FULLDATE" || normalized === "STRICT_DATE") return "FULL_DATE";
  if (normalized === "SHORTTEXT" || normalized === "TEXT" || normalized === "STRING") return "SHORT_TEXT";
  if (normalized === "MULTISELECT" || normalized === "MULTI_SELECT") return "MULTI_SELECT";
  if (normalized === "STRINGLIST" || normalized === "STRING_LIST") return "SHORT_TEXT";
  if (normalized === "IGNORE" || normalized === "IGNORED" || normalized === "SKIP") return "IGNORE";
  return DATA_TYPE_SET.has(normalized as DynamicExcelDataType)
    ? (normalized as DynamicExcelDataType)
    : DEFAULT_DYNAMIC_EXCEL_DATA_TYPE;
}

export function dataTypeLabel(value: unknown) {
  const dataType = normalizeDataType(value);
  if (DATA_TYPE_VI_LABELS[dataType]?.label) return DATA_TYPE_VI_LABELS[dataType].label;
  const label = DATA_TYPE_OPTIONS.find((option) => option.value === dataType)?.label;
  if (label) return label;
  return DATA_TYPE_OPTIONS.find((option) => option.value === dataType)?.label ?? "Số";
}

export function isDynamicExcelEnumDataType(dataType: DynamicExcelDataType) {
  return dataType === "SHORT_TEXT" || dataType === "MULTI_SELECT";
}

export function getDefaultEnumOptions(dataType: DynamicExcelDataType): DynamicExcelStringListOption[] {
  if (dataType === "SHORT_TEXT") return [{ code: "NOI_DUNG", label: "Nội dung" }];
  return [{ code: "OPT_1", label: "Lựa chọn 1" }];
}

export function normalizeStringListOptions(value: unknown): DynamicExcelStringListOption[] {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const options: DynamicExcelStringListOption[] = [];

  source.forEach((item, index) => {
    const raw =
      typeof item === "string"
        ? { code: item, label: item }
        : item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : null;
    if (!raw) return;

    const fallback = `OPT_${index + 1}`;
    const code = String(raw.code ?? raw.value ?? raw.id ?? fallback).trim() || fallback;
    const key = code.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    const label = String(raw.label ?? raw.name ?? raw.text ?? code).trim() || code;
    options.push({ code, label });
  });

  return options;
}

export function normalizeValueSource(
  value: unknown,
  fallbackOptions: DynamicExcelStringListOption[] = [],
): DynamicExcelValueSource | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const sourceTypeRaw = String(raw.sourceType ?? raw.type ?? raw.valueSourceType ?? "").trim().toUpperCase();
  const sourceType = VALUE_SOURCE_TYPE_SET.has(sourceTypeRaw as DynamicExcelValueSourceType)
    ? (sourceTypeRaw as DynamicExcelValueSourceType)
    : null;
  if (!sourceType) return null;

  const options = sourceType === "FIXED_ENUM"
    ? normalizeStringListOptions(Array.isArray(raw.options) ? raw.options : fallbackOptions)
    : [];
  const catalogId = String(raw.catalogId ?? raw.valueSourceCatalogId ?? "").trim();
  const catalogCode = String(raw.catalogCode ?? raw.valueSourceCatalogCode ?? "").trim();
  const catalogName = String(raw.catalogName ?? raw.valueSourceCatalogName ?? "").trim();

  return {
    sourceType,
    labelCode: typeof raw.labelCode === "string" && raw.labelCode.trim() ? raw.labelCode.trim() : undefined,
    labelName: typeof raw.labelName === "string" && raw.labelName.trim() ? raw.labelName.trim() : undefined,
    catalogId: catalogId || undefined,
    catalogCode: catalogCode || undefined,
    catalogName: catalogName || undefined,
    options,
  };
}

export function isSystemValueSource(value?: DynamicExcelValueSource | null) {
  return Boolean(value && value.sourceType !== "FIXED_ENUM");
}

export function normalizeDataTypeOverrides(value: unknown): DataTypeOverride[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): DataTypeOverride | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const scope = typeof row.scope === "string" ? row.scope.trim().toUpperCase() : "";
      const dataType = normalizeDataType(row.dataType);

      if (scope === "COLUMN") {
        const index = toNonNegativeInt(row.index);
        const options = normalizeStringListOptions(row.options);
        return index == null
          ? null
          : { scope: "COLUMN", index, dataType, options, valueSource: normalizeValueSource(row.valueSource, options) };
      }

      if (scope === "ROW") {
        const index = toNonNegativeInt(row.index);
        const options = normalizeStringListOptions(row.options);
        return index == null
          ? null
          : { scope: "ROW", index, dataType, options, valueSource: normalizeValueSource(row.valueSource, options) };
      }

      if (scope === "RANGE") {
        const rect = normalizeRect(row);
        if (!rect) return null;
        const options = normalizeStringListOptions(row.options);
        return {
          scope: "RANGE",
          id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : undefined,
          ...rect,
          dataType,
          options,
          valueSource: normalizeValueSource(row.valueSource, options),
        };
      }

      return null;
    })
    .filter((item): item is DataTypeOverride => Boolean(item));
}

export function normalizeSpecDataTypeMetadata<T extends HeaderSpec>(spec: T): T {
  return {
    ...spec,
    defaultDataType: normalizeDataType(spec.defaultDataType),
    defaultOptions: normalizeStringListOptions(spec.defaultOptions),
    dataTypeOverrides: normalizeDataTypeOverrides(spec.dataTypeOverrides),
    specialRanges: normalizeSpecialRanges(spec.specialRanges),
  };
}

export function getDefaultDataType(spec: HeaderSpec): DynamicExcelDataType {
  return normalizeDataType(spec.defaultDataType);
}

export function getDefaultStringListOptions(spec: HeaderSpec): DynamicExcelStringListOption[] {
  return normalizeStringListOptions(spec.defaultOptions);
}

export function getColumnDataType(
  spec: HeaderSpec,
  columnIndex: number,
): DynamicExcelDataType {
  const override = normalizeDataTypeOverrides(spec.dataTypeOverrides)
    .filter((item) => item.scope === "COLUMN" && item.index === columnIndex)
    .at(-1);
  return override?.dataType ?? getDefaultDataType(spec);
}

export function getColumnStringListOptions(
  spec: HeaderSpec,
  columnIndex: number,
): DynamicExcelStringListOption[] {
  const override = normalizeDataTypeOverrides(spec.dataTypeOverrides)
    .filter((item) => item.scope === "COLUMN" && item.index === columnIndex)
    .at(-1);
  return normalizeStringListOptions(override?.options?.length ? override.options : spec.defaultOptions);
}

export function getColumnValueSource(
  spec: HeaderSpec,
  columnIndex: number,
): DynamicExcelValueSource | null {
  const override = normalizeDataTypeOverrides(spec.dataTypeOverrides)
    .filter((item) => item.scope === "COLUMN" && item.index === columnIndex)
    .at(-1);
  return override?.valueSource ?? null;
}

export function getRowDataType(spec: HeaderSpec, rowIndex: number): DynamicExcelDataType {
  const override = normalizeDataTypeOverrides(spec.dataTypeOverrides)
    .filter((item) => item.scope === "ROW" && item.index === rowIndex)
    .at(-1);
  return override?.dataType ?? getDefaultDataType(spec);
}

export function getRowStringListOptions(
  spec: HeaderSpec,
  rowIndex: number,
): DynamicExcelStringListOption[] {
  const override = normalizeDataTypeOverrides(spec.dataTypeOverrides)
    .filter((item) => item.scope === "ROW" && item.index === rowIndex)
    .at(-1);
  return normalizeStringListOptions(override?.options?.length ? override.options : spec.defaultOptions);
}

export function getRowValueSource(spec: HeaderSpec, rowIndex: number): DynamicExcelValueSource | null {
  const override = normalizeDataTypeOverrides(spec.dataTypeOverrides)
    .filter((item) => item.scope === "ROW" && item.index === rowIndex)
    .at(-1);
  return override?.valueSource ?? null;
}

export function getRangeDataType(
  spec: HeaderSpec,
  rect: Rect,
): DynamicExcelDataType {
  const override = normalizeDataTypeOverrides(spec.dataTypeOverrides)
    .filter(
      (item) =>
        item.scope === "RANGE" &&
        item.r0 === rect.r0 &&
        item.c0 === rect.c0 &&
        item.r1 === rect.r1 &&
        item.c1 === rect.c1,
    )
    .at(-1);
  return override?.dataType ?? getDefaultDataType(spec);
}

export function getRangeStringListOptions(
  spec: HeaderSpec,
  rect: Rect,
): DynamicExcelStringListOption[] {
  const override = normalizeDataTypeOverrides(spec.dataTypeOverrides)
    .filter(
      (item) =>
        item.scope === "RANGE" &&
        item.r0 === rect.r0 &&
        item.c0 === rect.c0 &&
        item.r1 === rect.r1 &&
        item.c1 === rect.c1,
    )
    .at(-1);
  return normalizeStringListOptions(override?.options?.length ? override.options : spec.defaultOptions);
}

export function getRangeValueSource(spec: HeaderSpec, rect: Rect): DynamicExcelValueSource | null {
  const override = normalizeDataTypeOverrides(spec.dataTypeOverrides)
    .filter(
      (item) =>
        item.scope === "RANGE" &&
        item.r0 === rect.r0 &&
        item.c0 === rect.c0 &&
        item.r1 === rect.r1 &&
        item.c1 === rect.c1,
    )
    .at(-1);
  return override?.valueSource ?? null;
}

export function getCellDataType(
  spec: HeaderSpec,
  dataRect: Rect,
  rowIndex: number,
  columnIndex: number,
): DynamicExcelDataType {
  if (spec.kind === "TOP") return getColumnDataType(spec, columnIndex);
  if (spec.kind === "LEFT") return getRowDataType(spec, rowIndex);

  const range = getMatrixDataTypeRanges(spec, dataRect).find((item) =>
    rowIndex >= item.r0 &&
    rowIndex <= item.r1 &&
    columnIndex >= item.c0 &&
    columnIndex <= item.c1
  );
  return range?.dataType ?? getDefaultDataType(spec);
}

export function getCellStringListOptions(
  spec: HeaderSpec,
  dataRect: Rect,
  rowIndex: number,
  columnIndex: number,
): DynamicExcelStringListOption[] {
  if (spec.kind === "TOP") return getColumnStringListOptions(spec, columnIndex);
  if (spec.kind === "LEFT") return getRowStringListOptions(spec, rowIndex);

  const range = getMatrixDataTypeRanges(spec, dataRect).find((item) =>
    rowIndex >= item.r0 &&
    rowIndex <= item.r1 &&
    columnIndex >= item.c0 &&
    columnIndex <= item.c1
  );
  return normalizeStringListOptions(range?.options?.length ? range.options : spec.defaultOptions);
}

export function getCellValueSource(
  spec: HeaderSpec,
  dataRect: Rect,
  rowIndex: number,
  columnIndex: number,
): DynamicExcelValueSource | null {
  if (spec.kind === "TOP") return getColumnValueSource(spec, columnIndex);
  if (spec.kind === "LEFT") return getRowValueSource(spec, rowIndex);

  const range = getMatrixDataTypeRanges(spec, dataRect).find((item) =>
    rowIndex >= item.r0 &&
    rowIndex <= item.r1 &&
    columnIndex >= item.c0 &&
    columnIndex <= item.c1
  );
  return range?.valueSource ?? null;
}

export function getMatrixDataTypeRanges(
  spec: HeaderSpec,
  dataRect: Rect,
): Array<Extract<DataTypeOverride, { scope: "RANGE" }>> {
  const ranges = normalizeDataTypeOverrides(spec.dataTypeOverrides)
    .filter((item): item is Extract<DataTypeOverride, { scope: "RANGE" }> => item.scope === "RANGE")
    .map((item) => ({
      ...item,
      ...clampRectToBounds(item, dataRect),
      dataType: normalizeDataType(item.dataType),
    }))
    .filter((item) => rectWithin(item, dataRect));

  if (ranges.length > 0) return ranges;

  return [
    {
      scope: "RANGE",
      id: "range_1",
      ...dataRect,
      dataType: getDefaultDataType(spec),
      options: getDefaultStringListOptions(spec),
    },
  ];
}

export function setMatrixRangeDataType(
  spec: HeaderSpec,
  dataRect: Rect,
  selectedRect: Rect,
  dataType: DynamicExcelDataType,
): HeaderSpec {
  const selected = clampRectToBounds(selectedRect, dataRect);
  const nextType = normalizeDataType(dataType);
  const existing = getMatrixDataTypeRanges(spec, dataRect);
  const nextRanges: Array<Extract<DataTypeOverride, { scope: "RANGE" }>> = [];

  for (const range of existing) {
    for (const piece of subtractRect(range, selected)) {
      nextRanges.push({
        scope: "RANGE",
        ...piece,
        dataType: range.dataType,
        options: range.options,
        valueSource: range.valueSource,
      });
    }
  }

  nextRanges.push({
    scope: "RANGE",
    ...selected,
    dataType: nextType,
    options: isDynamicExcelEnumDataType(nextType) ? getDefaultEnumOptions(nextType) : undefined,
  });

  const normalized = nextRanges
    .filter((item) => rectWithin(item, dataRect))
    .sort((a, b) => a.r0 - b.r0 || a.c0 - b.c0 || a.r1 - b.r1 || a.c1 - b.c1)
    .map((item, index) => ({ ...item, id: `range_${index + 1}` }));

  const nonRangeOverrides = normalizeDataTypeOverrides(spec.dataTypeOverrides).filter(
    (item) => item.scope !== "RANGE",
  );

  return {
    ...spec,
    defaultDataType: DEFAULT_DYNAMIC_EXCEL_DATA_TYPE,
    dataTypeOverrides: [...nonRangeOverrides, ...normalized],
  };
}

export function setColumnDataType(
  spec: HeaderSpec,
  columnIndex: number,
  dataType: DynamicExcelDataType,
): HeaderSpec {
  const nextType = normalizeDataType(dataType);
  const fallback = getDefaultDataType(spec);
  const overrides = normalizeDataTypeOverrides(spec.dataTypeOverrides).filter(
    (item) => !(item.scope === "COLUMN" && item.index === columnIndex),
  );

  if (nextType !== fallback) {
    overrides.push({
      scope: "COLUMN",
      index: columnIndex,
      dataType: nextType,
      options: isDynamicExcelEnumDataType(nextType) ? getDefaultEnumOptions(nextType) : undefined,
    });
  }

  return { ...spec, dataTypeOverrides: overrides };
}

export function setColumnStringListOptions(
  spec: HeaderSpec,
  columnIndex: number,
  options: DynamicExcelStringListOption[],
  dataType: DynamicExcelDataType = "SHORT_TEXT",
  valueSource?: DynamicExcelValueSource | null,
): HeaderSpec {
  const nextType = normalizeDataType(dataType);
  const normalizedOptions = normalizeStringListOptions(options);
  const normalizedSource = normalizeValueSource(valueSource, normalizedOptions);
  const overrides = normalizeDataTypeOverrides(spec.dataTypeOverrides).filter(
    (item) => !(item.scope === "COLUMN" && item.index === columnIndex),
  );
  overrides.push({
    scope: "COLUMN",
    index: columnIndex,
    dataType: isDynamicExcelEnumDataType(nextType) ? nextType : "SHORT_TEXT",
    options: normalizedSource?.sourceType === "FIXED_ENUM"
      ? normalizeStringListOptions(normalizedSource.options?.length ? normalizedSource.options : normalizedOptions)
      : normalizedOptions,
    valueSource: normalizedSource,
  });
  return { ...spec, dataTypeOverrides: overrides };
}

export function setRowDataType(
  spec: HeaderSpec,
  rowIndex: number,
  dataType: DynamicExcelDataType,
): HeaderSpec {
  const nextType = normalizeDataType(dataType);
  const fallback = getDefaultDataType(spec);
  const overrides = normalizeDataTypeOverrides(spec.dataTypeOverrides).filter(
    (item) => !(item.scope === "ROW" && item.index === rowIndex),
  );

  if (nextType !== fallback) {
    overrides.push({
      scope: "ROW",
      index: rowIndex,
      dataType: nextType,
      options: isDynamicExcelEnumDataType(nextType) ? getDefaultEnumOptions(nextType) : undefined,
    });
  }

  return { ...spec, dataTypeOverrides: overrides };
}

export function setRowStringListOptions(
  spec: HeaderSpec,
  rowIndex: number,
  options: DynamicExcelStringListOption[],
  dataType: DynamicExcelDataType = "SHORT_TEXT",
  valueSource?: DynamicExcelValueSource | null,
): HeaderSpec {
  const nextType = normalizeDataType(dataType);
  const normalizedOptions = normalizeStringListOptions(options);
  const normalizedSource = normalizeValueSource(valueSource, normalizedOptions);
  const overrides = normalizeDataTypeOverrides(spec.dataTypeOverrides).filter(
    (item) => !(item.scope === "ROW" && item.index === rowIndex),
  );
  overrides.push({
    scope: "ROW",
    index: rowIndex,
    dataType: isDynamicExcelEnumDataType(nextType) ? nextType : "SHORT_TEXT",
    options: normalizedSource?.sourceType === "FIXED_ENUM"
      ? normalizeStringListOptions(normalizedSource.options?.length ? normalizedSource.options : normalizedOptions)
      : normalizedOptions,
    valueSource: normalizedSource,
  });
  return { ...spec, dataTypeOverrides: overrides };
}

export function setRangeDataType(
  spec: HeaderSpec,
  rect: Rect,
  dataType: DynamicExcelDataType,
  id?: string,
): HeaderSpec {
  const normalizedRect = clampRect(rect);
  const nextType = normalizeDataType(dataType);
  const fallback = getDefaultDataType(spec);
  const overrides = normalizeDataTypeOverrides(spec.dataTypeOverrides).filter(
    (item) =>
      !(
        item.scope === "RANGE" &&
        (id ? item.id === id : item.r0 === normalizedRect.r0 && item.c0 === normalizedRect.c0 && item.r1 === normalizedRect.r1 && item.c1 === normalizedRect.c1)
      ),
  );

  if (nextType !== fallback) {
    overrides.push({ scope: "RANGE", id, ...normalizedRect, dataType: nextType });
  }

  return { ...spec, dataTypeOverrides: overrides };
}

export function setMatrixRangeStringListOptions(
  spec: HeaderSpec,
  dataRect: Rect,
  rect: Rect,
  options: DynamicExcelStringListOption[],
  dataType: DynamicExcelDataType = "SHORT_TEXT",
  valueSource?: DynamicExcelValueSource | null,
): HeaderSpec {
  const normalizedRect = clampRectToBounds(rect, dataRect);
  const normalizedOptions = normalizeStringListOptions(options);
  const normalizedSource = normalizeValueSource(valueSource, normalizedOptions);
  const nextType = normalizeDataType(dataType);
  const enumType = isDynamicExcelEnumDataType(nextType) ? nextType : "SHORT_TEXT";
  const existing = getMatrixDataTypeRanges(spec, dataRect);
  const nextRanges: Array<Extract<DataTypeOverride, { scope: "RANGE" }>> = [];
  let replaced = false;

  for (const range of existing) {
    const same =
      range.r0 === normalizedRect.r0 &&
      range.c0 === normalizedRect.c0 &&
      range.r1 === normalizedRect.r1 &&
      range.c1 === normalizedRect.c1;
    if (same) replaced = true;
    nextRanges.push(
      same
        ? {
            ...range,
            dataType: enumType,
            options: normalizedSource?.sourceType === "FIXED_ENUM"
              ? normalizeStringListOptions(normalizedSource.options?.length ? normalizedSource.options : normalizedOptions)
              : normalizedOptions,
            valueSource: normalizedSource,
          }
        : range,
    );
  }

  if (!replaced) {
    nextRanges.push({
      scope: "RANGE",
      id: `range_${nextRanges.length + 1}`,
      ...normalizedRect,
      dataType: enumType,
      options: normalizedSource?.sourceType === "FIXED_ENUM"
        ? normalizeStringListOptions(normalizedSource.options?.length ? normalizedSource.options : normalizedOptions)
        : normalizedOptions,
      valueSource: normalizedSource,
    });
  }

  const nonRangeOverrides = normalizeDataTypeOverrides(spec.dataTypeOverrides).filter(
    (item) => item.scope !== "RANGE",
  );

  return { ...spec, dataTypeOverrides: [...nonRangeOverrides, ...nextRanges] };
}

export function removeDataTypeOverride(spec: HeaderSpec, target: DataTypeOverride): HeaderSpec {
  return {
    ...spec,
    dataTypeOverrides: normalizeDataTypeOverrides(spec.dataTypeOverrides).filter((item) => {
      if (item.scope !== target.scope) return true;
      if (item.scope === "COLUMN" && target.scope === "COLUMN") return item.index !== target.index;
      if (item.scope === "ROW" && target.scope === "ROW") return item.index !== target.index;
      if (item.scope === "RANGE" && target.scope === "RANGE") {
        if (target.id) return item.id !== target.id;
        return item.r0 !== target.r0 || item.c0 !== target.c0 || item.r1 !== target.r1 || item.c1 !== target.c1;
      }
      return true;
    }),
  };
}

export function formatCellRef(r: number, c: number) {
  return `${formatColumnRef(c)}${r + 1}`;
}

export function formatColumnRef(c: number) {
  let text = "";
  let n = Math.max(0, Math.floor(c)) + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    text = String.fromCharCode(65 + mod) + text;
    n = Math.floor((n - 1) / 26);
  }
  return text;
}

export function formatRectRef(rect: Rect) {
  return `${formatCellRef(rect.r0, rect.c0)}:${formatCellRef(rect.r1, rect.c1)}`;
}

export function formatRowRef(r: number) {
  return `${Math.max(0, Math.floor(r)) + 1}`;
}

export function clampRect(rect: Rect): Rect {
  const r0 = Math.max(0, Math.floor(Number(rect.r0) || 0));
  const c0 = Math.max(0, Math.floor(Number(rect.c0) || 0));
  const r1 = Math.max(r0, Math.floor(Number(rect.r1) || r0));
  const c1 = Math.max(c0, Math.floor(Number(rect.c1) || c0));
  return { r0, c0, r1, c1 };
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

function clampRectToBounds(rect: Rect, bounds: Rect): Rect {
  const normalized = clampRect(rect);
  const r0 = Math.max(bounds.r0, Math.min(bounds.r1, normalized.r0));
  const c0 = Math.max(bounds.c0, Math.min(bounds.c1, normalized.c0));
  const r1 = Math.max(r0, Math.min(bounds.r1, normalized.r1));
  const c1 = Math.max(c0, Math.min(bounds.c1, normalized.c1));
  return { r0, c0, r1, c1 };
}

function rectWithin(rect: Rect, bounds: Rect) {
  return rect.r0 >= bounds.r0 && rect.c0 >= bounds.c0 && rect.r1 <= bounds.r1 && rect.c1 <= bounds.c1;
}

function rectIntersection(a: Rect, b: Rect): Rect | null {
  const r0 = Math.max(a.r0, b.r0);
  const c0 = Math.max(a.c0, b.c0);
  const r1 = Math.min(a.r1, b.r1);
  const c1 = Math.min(a.c1, b.c1);
  if (r1 < r0 || c1 < c0) return null;
  return { r0, c0, r1, c1 };
}

function subtractRect(source: Rect, cut: Rect): Rect[] {
  const hit = rectIntersection(source, cut);
  if (!hit) return [source];

  const pieces: Rect[] = [];
  if (source.r0 < hit.r0) {
    pieces.push({ r0: source.r0, c0: source.c0, r1: hit.r0 - 1, c1: source.c1 });
  }
  if (hit.r1 < source.r1) {
    pieces.push({ r0: hit.r1 + 1, c0: source.c0, r1: source.r1, c1: source.c1 });
  }
  if (source.c0 < hit.c0) {
    pieces.push({ r0: hit.r0, c0: source.c0, r1: hit.r1, c1: hit.c0 - 1 });
  }
  if (hit.c1 < source.c1) {
    pieces.push({ r0: hit.r0, c0: hit.c1 + 1, r1: hit.r1, c1: source.c1 });
  }

  return pieces.filter((piece) => piece.r1 >= piece.r0 && piece.c1 >= piece.c0);
}
