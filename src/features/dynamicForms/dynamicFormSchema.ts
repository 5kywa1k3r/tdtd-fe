import type {
  DynamicFormEditorSubmit,
  DynamicFormEditorValue,
  DynamicFormField,
  DynamicFormFieldType,
  DynamicFormSection,
  DynamicFormStatisticConfig,
  DynamicFormTableIndexMapItem,
  DynamicFormTableMode,
} from "./dynamicForm.types";

export const fieldTypeLabels: Record<DynamicFormFieldType, string> = {
  shortText: "Text",
  longText: "Long text",
  number: "Number",
  date: "Date",
  singleSelect: "Single select",
  multiSelect: "Multi select",
  boolean: "Boolean",
};

export const tableModeLabels: Record<DynamicFormTableMode, string> = {
  FIXED_GRID: "Fixed grid",
  APPEND_ROWS: "Append rows",
  APPEND_COLUMNS: "Append columns",
  MATRIX: "Matrix",
  SUMMARY_TEMPLATE: "Summary template",
};

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultSection(): DynamicFormSection {
  return {
    id: createId("section"),
    title: "Section 1",
    description: null,
    labelCodes: [],
    order: 0,
  };
}

export function defaultStatistic(): DynamicFormStatisticConfig {
  return {
    showInDetail: true,
    showInTree: false,
    aggregateOps: ["count"],
    bucketMode: "none",
  };
}

export function defaultAggregateOps(type: DynamicFormFieldType) {
  if (type === "number") return ["count", "sum"];
  if (type === "boolean") return ["count", "trueCount", "falseCount"];
  if (type === "singleSelect" || type === "multiSelect") return ["count", "bucketCount"];
  if (type === "date") return ["count", "latest"];
  return ["count"];
}

export function createDefaultField(
  type: DynamicFormFieldType,
  sectionId: string,
  order: number,
): DynamicFormField {
  const id = createId("field");
  return {
    id,
    sectionId,
    key: `${type}_${order + 1}`,
    label: fieldTypeLabels[type],
    type,
    required: false,
    colSpan: 12,
    minHeight: type === "longText" ? 112 : 72,
    order,
    options:
      type === "singleSelect" || type === "multiSelect"
        ? [
            { code: "A", label: "Option A" },
            { code: "B", label: "Option B" },
          ]
        : undefined,
    labelCodes: [],
    isStatistic: false,
    statistic: undefined,
  };
}

export function parseJsonArray<T>(json: string | null | undefined, fallback: T[]): T[] {
  if (!json?.trim()) return fallback;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeSections(sections: DynamicFormSection[]): DynamicFormSection[] {
  const fallback = createDefaultSection();
  const rows = sections.length > 0 ? sections : [fallback];
  return rows
    .map((x, index) => ({
      id: x.id || createId("section"),
      title: x.title?.trim() || `Section ${index + 1}`,
      description: x.description ?? null,
      labelCodes: normalizeLabelCodes(x.labelCodes),
      order: index,
    }))
    .sort((a, b) => a.order - b.order);
}

export function normalizeFields(
  fields: DynamicFormField[],
  sections: DynamicFormSection[],
): DynamicFormField[] {
  const sectionIds = new Set(sections.map((x) => x.id));
  const fallbackSectionId = sections[0]?.id ?? createDefaultSection().id;

  return fields
    .map((x, index) => {
      const type = isFieldType(x.type) ? x.type : "shortText";
      const isStatistic = Boolean(x.isStatistic);
      return {
        id: x.id || createId("field"),
        sectionId: sectionIds.has(x.sectionId) ? x.sectionId : fallbackSectionId,
        key: x.key?.trim() || `field_${index + 1}`,
        label: x.label?.trim() || fieldTypeLabels[type],
        type,
        required: Boolean(x.required),
        colSpan: clampSpan(x.colSpan),
        minHeight: clampHeight(x.minHeight),
        order: index,
        options: normalizeOptions(type, x.options),
        labelCodes: normalizeLabelCodes(x.labelCodes),
        isStatistic,
        statistic: isStatistic
          ? {
              ...defaultStatistic(),
              ...x.statistic,
              aggregateOps: x.statistic?.aggregateOps?.length
                ? x.statistic.aggregateOps
                : defaultAggregateOps(type),
            }
          : undefined,
      };
    })
    .sort((a, b) => a.order - b.order);
}

export function buildEditorValue(input: {
  code?: string | null;
  name?: string | null;
  description?: string | null;
  labels?: string[] | null;
  schemaVersion?: number | null;
  isActive?: boolean | null;
  sectionsJson?: string | null;
  fieldsJson?: string | null;
  excelBlockJson?: string | null;
}): DynamicFormEditorValue {
  const sections = normalizeSections(parseJsonArray<DynamicFormSection>(input.sectionsJson, []));
  const fields = normalizeFields(parseJsonArray<DynamicFormField>(input.fieldsJson, []), sections);

  return {
    code: input.code ?? null,
    name: input.name ?? "",
    description: input.description ?? "",
    labels: normalizeLabelCodes(input.labels),
    schemaVersion: Math.max(1, input.schemaVersion ?? 1),
    isActive: input.isActive ?? true,
    sections,
    fields,
    excelBlockJson: normalizeExcelBlockJson(input.excelBlockJson),
  };
}

export function toSubmit(value: DynamicFormEditorValue): DynamicFormEditorSubmit {
  const sections = normalizeSections(value.sections);
  const fields = normalizeFields(value.fields, sections);
  return {
    code: value.code ?? null,
    name: value.name.trim(),
    description: value.description?.trim() || null,
    labels: normalizeLabelCodes(value.labels),
    schemaVersion: Math.max(1, value.schemaVersion || 1),
    isActive: value.isActive,
    sectionsJson: JSON.stringify(sections),
    fieldsJson: JSON.stringify(fields),
    excelBlockJson: normalizeExcelBlockJson(value.excelBlockJson),
  };
}

export function normalizeExcelBlockJson(json?: string | null): string | null {
  const obj = parseJsonObject(json);
  if (!obj) return json?.trim() ? json : null;

  const blockId = normalizeBlockId(obj);
  obj.blockId = blockId;
  obj.tableMode = normalizeTableMode(obj.tableMode);

  if (obj.tableMode === "FIXED_GRID") {
    const indexMap = normalizeIndexMap(obj.indexMap, blockId);
    obj.indexMap = indexMap.length > 0 ? indexMap : buildFixedGridIndexMap(obj, blockId);
  } else {
    delete obj.indexMap;
  }

  if (obj.tableMode === "SUMMARY_TEMPLATE") {
    normalizeSummaryTemplateLayout(obj, blockId);
  }

  return JSON.stringify(obj);
}

export function normalizeTableMode(value: unknown): DynamicFormTableMode {
  return isTableMode(value) ? value : "FIXED_GRID";
}

export function normalizeLabelCodes(values?: string[] | null): string[] {
  return Array.from(
    new Set(
      (values ?? [])
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function isFieldType(value: unknown): value is DynamicFormFieldType {
  return (
    value === "shortText" ||
    value === "longText" ||
    value === "number" ||
    value === "date" ||
    value === "singleSelect" ||
    value === "multiSelect" ||
    value === "boolean"
  );
}

function isTableMode(value: unknown): value is DynamicFormTableMode {
  return (
    value === "FIXED_GRID" ||
    value === "APPEND_ROWS" ||
    value === "APPEND_COLUMNS" ||
    value === "MATRIX" ||
    value === "SUMMARY_TEMPLATE"
  );
}

function parseJsonObject(json?: string | null): Record<string, unknown> | null {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeSummaryTemplateLayout(
  obj: Record<string, unknown>,
  fallbackSourceBlockId: string,
) {
  const outputLayout = isPlainObject(obj.outputLayout) ? obj.outputLayout : null;
  const sourceBlockIdRaw =
    readString(obj.sourceBlockId) ??
    readString(outputLayout?.sourceBlockId) ??
    null;
  const sourceBlockId = sourceBlockIdRaw
    ? normalizeMetricPart(sourceBlockIdRaw, fallbackSourceBlockId)
    : null;
  const sourceTableMode = normalizeSourceTableMode(
    readString(obj.sourceTableMode) ?? readString(outputLayout?.sourceTableMode),
  );
  const groupBy = normalizeSummaryGroupBy(
    Array.isArray(obj.groupBy) ? obj.groupBy : outputLayout?.groupBy,
  );
  const rowLayout = normalizeSummaryRowLayout(
    Array.isArray(obj.rowLayout) ? obj.rowLayout : outputLayout?.rowLayout,
  );

  if (sourceBlockId) {
    obj.sourceBlockId = sourceBlockId;
  } else {
    delete obj.sourceBlockId;
  }

  if (sourceTableMode) {
    obj.sourceTableMode = sourceTableMode;
  } else {
    delete obj.sourceTableMode;
  }

  obj.groupBy = groupBy;
  obj.rowLayout = rowLayout;
  obj.outputLayout = {
    ...(sourceBlockId ? { sourceBlockId } : {}),
    ...(sourceTableMode ? { sourceTableMode } : {}),
    groupBy,
    rowLayout,
  };
}

function normalizeSourceTableMode(value: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized === "FIXED_GRID" ||
    normalized === "APPEND_ROWS" ||
    normalized === "APPEND_COLUMNS" ||
    normalized === "MATRIX"
    ? normalized
    : null;
}

function normalizeSummaryGroupBy(value: unknown) {
  const allowed = new Set([
    "UNIT",
    "ASSIGNMENT",
    "ROOT_ASSIGNMENT",
    "USER",
    "LABEL",
    "PERIOD",
  ]);
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows
    .map((item) => (typeof item === "string" ? item.trim().toUpperCase() : ""))
    .filter((item) => allowed.has(item));

  return Array.from(new Set(normalized.length > 0 ? normalized : ["UNIT"]));
}

function normalizeSummaryRowLayout(value: unknown) {
  const rows = Array.isArray(value) ? value : [];
  return rows
    .map((item) => {
      if (!isPlainObject(item)) return null;
      const metrics = Array.isArray(item.metrics)
        ? Array.from(
            new Set(
              item.metrics
                .map((metric) => readString(metric))
                .filter((metric): metric is string => Boolean(metric)),
            ),
          )
        : [];
      if (metrics.length === 0) return null;

      return {
        repeatFor: normalizeSummaryRepeatFor(item.repeatFor),
        rowsPerUnit: clampInt(item.rowsPerUnit, 1, 100, 1),
        ...(readString(item.label) ? { label: readString(item.label) } : {}),
        metrics,
      };
    })
    .filter((item): item is {
      repeatFor: "selectedUnits" | "scopeAssignments" | "none";
      rowsPerUnit: number;
      label?: string;
      metrics: string[];
    } => Boolean(item));
}

function normalizeSummaryRepeatFor(value: unknown) {
  return value === "scopeAssignments" || value === "none" ? value : "selectedUnits";
}

function normalizeBlockId(obj: Record<string, unknown>) {
  const raw =
    typeof obj.blockId === "string"
      ? obj.blockId
      : typeof obj.id === "string"
        ? obj.id
        : typeof obj.dynamicExcelTemplateId === "string"
          ? `excel_${obj.dynamicExcelTemplateId}`
          : "excel_block";

  return normalizeMetricPart(raw, "excel_block");
}

function normalizeIndexMap(
  value: unknown,
  blockId: string,
): DynamicFormTableIndexMapItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const indexValue = Number(row.index ?? index);
      const rowKey = normalizeMetricPart(row.rowKey, `row_${index + 1}`);
      const columnKey = normalizeMetricPart(row.columnKey, "value");
      return {
        index: Number.isInteger(indexValue) && indexValue >= 0 ? indexValue : index,
        rowKey,
        columnKey,
        metricKey:
          typeof row.metricKey === "string" && row.metricKey.trim()
            ? row.metricKey.trim()
            : buildMetricKey(blockId, rowKey, columnKey),
      };
    })
    .filter((item): item is DynamicFormTableIndexMapItem => Boolean(item));
}

function buildFixedGridIndexMap(
  obj: Record<string, unknown>,
  blockId: string,
): DynamicFormTableIndexMapItem[] {
  const width = getPositiveInt(obj.w ?? obj.W);
  const height = getPositiveInt(obj.h ?? obj.H);
  if (width <= 0 || height <= 0) return [];

  const rows: DynamicFormTableIndexMapItem[] = [];
  for (let r = 0; r < height; r += 1) {
    for (let c = 0; c < width; c += 1) {
      const index = r * width + c;
      const rowKey = `row_${r + 1}`;
      const columnKey = `col_${c + 1}`;
      rows.push({
        index,
        rowKey,
        columnKey,
        metricKey: buildMetricKey(blockId, rowKey, columnKey),
      });
    }
  }

  return rows;
}

function getPositiveInt(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeMetricPart(value: unknown, fallback: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function buildMetricKey(blockId: string, rowKey: string, columnKey: string) {
  return `table:${blockId}.row:${rowKey}.column:${columnKey}`;
}

function clampSpan(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 12;
  return Math.min(12, Math.max(3, Math.floor(n)));
}

function clampHeight(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 72;
  return Math.min(320, Math.max(56, Math.floor(n)));
}

function normalizeOptions(
  type: DynamicFormFieldType,
  options: DynamicFormField["options"],
): DynamicFormField["options"] {
  if (type !== "singleSelect" && type !== "multiSelect") return undefined;
  const rows = options?.length ? options : [{ code: "A", label: "Option A" }];
  return rows.map((x, index) => ({
    code: x.code?.trim() || `OPT_${index + 1}`,
    label: x.label?.trim() || `Option ${index + 1}`,
  }));
}
