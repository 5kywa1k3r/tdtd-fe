import type {
  DynamicFormEditorSubmit,
  DynamicFormEditorValue,
  DynamicFormField,
  DynamicFormFieldType,
  DynamicFormSection,
  DynamicFormStatisticColumn,
  DynamicFormStatisticColumnLabel,
  DynamicFormStatisticConfig,
  DynamicFormTableIndexMapItem,
  DynamicFormTableMode,
} from "./dynamicForm.types";

export const fieldTypeLabels: Record<DynamicFormFieldType, string> = {
  shortText: "Văn bản ngắn",
  longText: "Văn bản dài",
  number: "Số",
  date: "Ngày",
  singleSelect: "Chọn một",
  multiSelect: "Chọn nhiều",
  boolean: "Có/không",
};

export const tableModeLabels: Record<DynamicFormTableMode, string> = {
  FIXED_GRID: "Bảng cố định",
  APPEND_ROWS: "Thêm theo dòng",
  APPEND_COLUMNS: "Thêm theo cột",
  MATRIX: "Bảng ma trận",
  SUMMARY_TEMPLATE: "Mẫu tổng hợp",
};

export type DynamicExcelSpecKind = "TOP" | "LEFT" | "MATRIX";

export const excelSpecKindLabels: Record<DynamicExcelSpecKind, string> = {
  TOP: "Bảng ngang",
  LEFT: "Bảng dọc",
  MATRIX: "Bảng ma trận",
};

const legacyFieldLabels: Partial<Record<DynamicFormFieldType, string[]>> = {
  shortText: ["Short text", "shortText"],
  longText: ["Long text", "LongDate", "longText"],
  number: ["Number", "number"],
  date: ["Date", "date"],
  singleSelect: ["Single select", "singleSelect"],
  multiSelect: ["Multi select", "multiSelect"],
  boolean: ["Boolean", "boolean"],
};

export const FIELD_DISPLAY_NAME_PLACEHOLDER = "Chưa đặt tên hiển thị";

const genericFieldDisplayNamePattern =
  /^(field|truong|number|date|short\s*text|shorttext|long\s*text|longtext|boolean|single\s*select|singleselect|multi\s*select|multiselect|so|ngay|van\s*ban\s*ngan|van\s*ban\s*dai|chon\s*mot|chon\s*nhieu|co\s*khong)[\s_-]*\d*$/i;

const baseTableModesBySpecKind: Record<DynamicExcelSpecKind, DynamicFormTableMode[]> = {
  TOP: ["FIXED_GRID", "APPEND_ROWS"],
  LEFT: ["FIXED_GRID", "APPEND_COLUMNS"],
  MATRIX: ["FIXED_GRID", "MATRIX"],
};

const allInputTableModes: DynamicFormTableMode[] = [
  "FIXED_GRID",
  "APPEND_ROWS",
  "APPEND_COLUMNS",
  "MATRIX",
];

export function normalizeExcelSpecKind(value: unknown): DynamicExcelSpecKind | null {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return normalized === "TOP" || normalized === "LEFT" || normalized === "MATRIX"
    ? normalized
    : null;
}

export function isTableModeAllowedForExcelSpecKind(
  tableMode: DynamicFormTableMode,
  specKind: DynamicExcelSpecKind | null | undefined,
) {
  if (tableMode === "SUMMARY_TEMPLATE") return true;
  if (!specKind) return true;
  return baseTableModesBySpecKind[specKind].includes(tableMode);
}

export function getAllowedTableModesForExcelSpecKind(
  specKind: DynamicExcelSpecKind | null | undefined,
  currentMode?: DynamicFormTableMode | null,
) {
  const base = specKind ? baseTableModesBySpecKind[specKind] : allInputTableModes;
  const modes = [...base];
  if (currentMode && !modes.includes(currentMode)) {
    modes.push(currentMode);
  }
  return modes;
}

export function getExcelSpecKindFromBlockLike(value: unknown) {
  const obj = typeof value === "string" ? parseJsonObject(value) : isPlainObject(value) ? value : null;
  if (!obj) return null;
  return normalizeExcelSpecKind(
    obj.excelSpecKind ?? obj.ExcelSpecKind ?? obj.sourceKind ?? obj.SourceKind ?? obj.kind,
  );
}

export const MAX_DYNAMIC_FORM_FIELDS = 200;
export const MAX_DYNAMIC_FORM_TABLE_BLOCKS = 10;
export const MAX_DYNAMIC_FORM_LABEL_STATISTIC_TARGETS = 30;

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultSection(): DynamicFormSection {
  return {
    id: createId("section"),
    title: "Phần 1",
    description: null,
    tagCodes: [],
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
    name: "",
    displayName: "",
    label: "",
    type,
    required: false,
    colSpan: 12,
    minHeight: type === "longText" ? 112 : 72,
    order,
    options:
      type === "singleSelect" || type === "multiSelect"
        ? [
            { code: "A", label: "Lựa chọn A" },
            { code: "B", label: "Lựa chọn B" },
          ]
        : undefined,
    statisticLabelCodes: [],
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
      title: x.title?.trim() || `Phần ${index + 1}`,
      description: x.description ?? null,
      tagCodes: normalizeLabelCodes(x.tagCodes),
      order: index,
    }))
    .sort((a, b) => a.order - b.order);
}

type NormalizeFieldsOptions = {
  trimDisplayNames?: boolean;
};

export function normalizeFields(
  fields: DynamicFormField[],
  sections: DynamicFormSection[],
  options: NormalizeFieldsOptions = {},
): DynamicFormField[] {
  const sectionIds = new Set(sections.map((x) => x.id));
  const fallbackSectionId = sections[0]?.id ?? createDefaultSection().id;
  const trimDisplayNames = options.trimDisplayNames ?? true;

  return fields
    .map((x, index) => {
      const type = isFieldType(x.type) ? x.type : "shortText";
      const statisticLabelCodes = normalizeLabelCodes(x.statisticLabelCodes);
      const isStatistic = Boolean(x.isStatistic);
      const name = normalizeFieldDisplayName(
        type,
        x.name ?? x.displayName ?? x.label,
        trimDisplayNames,
      );
      return {
        id: x.id || createId("field"),
        sectionId: sectionIds.has(x.sectionId) ? x.sectionId : fallbackSectionId,
        key: x.key?.trim() || `field_${index + 1}`,
        name,
        displayName: name,
        label: name,
        type,
        required: Boolean(x.required),
        colSpan: clampSpan(x.colSpan),
        minHeight: clampHeight(x.minHeight),
        order: index,
        options: normalizeOptions(type, x.options),
        statisticLabelCodes,
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

export function getDynamicFormFieldNameValue(
  field: Pick<DynamicFormField, "name" | "displayName" | "label" | "type">,
) {
  return normalizeOptionalFieldText(field.name ?? field.displayName ?? field.label) ?? "";
}

export function getDynamicFormFieldDisplayName(
  field: Pick<DynamicFormField, "name" | "displayName" | "label" | "type">,
) {
  return getDynamicFormFieldNameValue(field) || FIELD_DISPLAY_NAME_PLACEHOLDER;
}

export function isGenericFieldDisplayName(
  type: DynamicFormFieldType,
  value: string | null | undefined,
) {
  const trimmed = normalizeOptionalFieldText(value);
  if (!trimmed) return false;

  const normalized = normalizeForComparison(trimmed);
  const genericValues = [
    type,
    fieldTypeLabels[type],
    ...(legacyFieldLabels[type] ?? []),
  ].map(normalizeForComparison);

  return genericValues.includes(normalized) || genericFieldDisplayNamePattern.test(normalized);
}

export function validateFieldDisplayNames(
  fields: DynamicFormField[],
  sections: DynamicFormSection[] = [],
) {
  const sectionTitles = new Map(sections.map((section) => [section.id, section.title]));
  const invalid = fields.find((field) => {
    const name = getDynamicFormFieldNameValue(field);
    return !name || isGenericFieldDisplayName(field.type, name);
  });
  if (!invalid) return;

  const sectionTitle = sectionTitles.get(invalid.sectionId);
  const locator = sectionTitle
    ? ` trong phần "${sectionTitle}"`
    : invalid.key
      ? ` "${invalid.key}"`
      : "";
  throw new Error(
    `Trường dữ liệu${locator} cần có Tên hiển thị riêng cho người nhập. Không dùng tên kiểu dữ liệu như Number, Date, Số hoặc Ngày; nhãn dữ liệu/thống kê được cấu hình riêng bằng label code.`,
  );
}

function normalizeFieldDisplayName(
  _type: DynamicFormFieldType,
  value: string | null | undefined,
  trimDisplayName = true,
) {
  if (!trimDisplayName) return value ?? "";
  return normalizeOptionalFieldText(value) ?? "";
}

function normalizeOptionalFieldText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeForComparison(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function buildEditorValue(input: {
  code?: string | null;
  name?: string | null;
  description?: string | null;
  tagCodes?: string[] | null;
  schemaVersion?: number | null;
  isActive?: boolean | null;
  sectionsJson?: string | null;
  fieldsJson?: string | null;
  excelBlockJson?: string | null;
  blocksJson?: string | null;
}): DynamicFormEditorValue {
  const sections = normalizeSections(parseJsonArray<DynamicFormSection>(input.sectionsJson, []));
  const fields = normalizeFields(parseJsonArray<DynamicFormField>(input.fieldsJson, []), sections);
  const blocksJson = normalizeBlocksJson(input.blocksJson, input.excelBlockJson, sections[0]?.id);

  return {
    code: input.code ?? null,
    name: input.name ?? "",
    description: input.description ?? "",
    tagCodes: normalizeLabelCodes(input.tagCodes),
    schemaVersion: Math.max(1, input.schemaVersion ?? 1),
    isActive: input.isActive ?? true,
    sections,
    fields,
    excelBlockJson: getPrimaryDynamicFormBlockJson(blocksJson, input.excelBlockJson),
    blocksJson,
  };
}

export function toSubmit(value: DynamicFormEditorValue): DynamicFormEditorSubmit {
  const sections = normalizeSections(value.sections);

  const fields = normalizeFields(value.fields, sections);
  if (fields.length > MAX_DYNAMIC_FORM_FIELDS) {
    throw new Error(`Biểu mẫu động chỉ được có tối đa ${MAX_DYNAMIC_FORM_FIELDS} trường dữ liệu.`);
  }
  validateFieldDisplayNames(fields, sections);
  const blocksJson = normalizeBlocksJson(value.blocksJson, value.excelBlockJson, sections[0]?.id);
  const blockCount = getDynamicFormBlockJsonList(blocksJson, null, sections[0]?.id).length;
  if (blockCount > MAX_DYNAMIC_FORM_TABLE_BLOCKS) {
    throw new Error(`Biểu mẫu động chỉ được có tối đa ${MAX_DYNAMIC_FORM_TABLE_BLOCKS} bảng Excel động.`);
  }
  validateExcelBlockTableModeCompatibility(blocksJson);
  validateUniqueLabelStatisticTargets(fields, blocksJson);

  const excelBlockJson = getPrimaryDynamicFormBlockJson(blocksJson, value.excelBlockJson);
  return {
    code: value.code ?? null,
    name: value.name.trim(),
    description: value.description?.trim() || null,
    tagCodes: normalizeLabelCodes(value.tagCodes),
    schemaVersion: Math.max(1, value.schemaVersion || 1),
    isActive: value.isActive,
    sectionsJson: JSON.stringify(sections),
    fieldsJson: JSON.stringify(fields),
    excelBlockJson,
    blocksJson,
  };
}

export function normalizeExcelBlockJson(
  json?: string | null,
  fallbackSectionId?: string | null,
): string | null {
  const obj = parseJsonObject(json);
  if (!obj) return json?.trim() ? json : null;

  return JSON.stringify(normalizeExcelBlockObject(obj, fallbackSectionId));
}

export function normalizeBlocksJson(
  json?: string | null,
  excelBlockJson?: string | null,
  fallbackSectionId?: string | null,
): string | null {
  const normalizedExcelBlock = parseJsonObject(normalizeExcelBlockJson(excelBlockJson, fallbackSectionId));
  if (!json?.trim()) {
    return normalizedExcelBlock ? JSON.stringify([normalizedExcelBlock]) : null;
  }

  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return json.trim();
    if (parsed.length <= 1 && normalizedExcelBlock) {
      return JSON.stringify([normalizedExcelBlock]);
    }

    return JSON.stringify(
      parsed.map((item) =>
        isPlainObject(item) ? normalizeExcelBlockObject(item, fallbackSectionId) : item,
      ),
    );
  } catch {
    return json.trim();
  }
}

export function getDynamicFormBlockJsonList(
  blocksJson?: string | null,
  excelBlockJson?: string | null,
  fallbackSectionId?: string | null,
): string[] {
  const blocks = parseJsonObjectArray(blocksJson);
  if (blocks.length > 0) {
    return blocks.map((block) => JSON.stringify(normalizeExcelBlockObject(block, fallbackSectionId)));
  }

  const excelBlock = normalizeExcelBlockJson(excelBlockJson, fallbackSectionId);
  return excelBlock ? [excelBlock] : [];
}

export function getDynamicFormBlockCount(
  blocksJson?: string | null,
  excelBlockJson?: string | null,
) {
  return getDynamicFormBlockJsonList(blocksJson, excelBlockJson).length;
}

export function getPrimaryDynamicFormBlockJson(
  blocksJson?: string | null,
  excelBlockJson?: string | null,
): string | null {
  return getDynamicFormBlockJsonList(blocksJson, excelBlockJson)[0] ?? null;
}

export function setDynamicFormBlockJson(
  blocksJson: string | null | undefined,
  excelBlockJson: string | null | undefined,
  blockIndex: number,
  nextBlockJson: string | null | undefined,
): Pick<DynamicFormEditorValue, "excelBlockJson" | "blocksJson"> {
  const normalizedNextBlock = normalizeExcelBlockJson(nextBlockJson);
  const blocks = getDynamicFormBlockJsonList(blocksJson, excelBlockJson);

  if (normalizedNextBlock) {
    const targetIndex = Math.min(
      Math.max(0, Math.floor(blockIndex)),
      Math.max(0, blocks.length - 1),
    );
    if (blocks.length === 0) {
      blocks.push(normalizedNextBlock);
    } else {
      blocks[targetIndex] = normalizedNextBlock;
    }
  }

  return buildBlocksPatch(blocks);
}

export function setDynamicFormBlockSectionId(
  blockJson: string | null | undefined,
  sectionId: string,
): string | null {
  const obj = parseJsonObject(blockJson);
  if (!obj) return blockJson?.trim() ? blockJson : null;

  obj.sectionId = sectionId;
  return JSON.stringify(normalizeExcelBlockObject(obj, sectionId));
}

export function removeDynamicFormBlockJson(
  blocksJson: string | null | undefined,
  excelBlockJson: string | null | undefined,
  blockIndex: number,
): Pick<DynamicFormEditorValue, "excelBlockJson" | "blocksJson"> {
  const blocks = getDynamicFormBlockJsonList(blocksJson, excelBlockJson);
  const targetIndex = Math.floor(blockIndex);
  if (targetIndex < 0 || targetIndex >= blocks.length) {
    return buildBlocksPatch(blocks);
  }

  blocks.splice(targetIndex, 1);
  return buildBlocksPatch(blocks);
}

export function moveDynamicFormBlockJson(
  blocksJson: string | null | undefined,
  excelBlockJson: string | null | undefined,
  blockIndex: number,
  direction: -1 | 1,
): Pick<DynamicFormEditorValue, "excelBlockJson" | "blocksJson"> {
  const blocks = getDynamicFormBlockJsonList(blocksJson, excelBlockJson);
  const fromIndex = Math.floor(blockIndex);
  const toIndex = fromIndex + direction;
  if (
    fromIndex < 0 ||
    fromIndex >= blocks.length ||
    toIndex < 0 ||
    toIndex >= blocks.length
  ) {
    return buildBlocksPatch(blocks);
  }

  const [block] = blocks.splice(fromIndex, 1);
  blocks.splice(toIndex, 0, block);
  return buildBlocksPatch(blocks);
}

function buildBlocksPatch(
  blocks: Array<string | null | undefined>,
): Pick<DynamicFormEditorValue, "excelBlockJson" | "blocksJson"> {
  const blockObjects = blocks
    .map((block) => parseJsonObject(block))
    .filter((block): block is Record<string, unknown> => Boolean(block))
    .map((block) => normalizeExcelBlockObject(block));

  return {
    excelBlockJson: blockObjects[0] ? JSON.stringify(blockObjects[0]) : null,
    blocksJson: blockObjects.length > 0 ? JSON.stringify(blockObjects) : null,
  };
}

function normalizeExcelBlockObject(
  obj: Record<string, unknown>,
  fallbackSectionId?: string | null,
): Record<string, unknown> {
  obj = { ...obj };
  delete obj.rawWorkbookDataJson;
  delete obj.RawWorkbookDataJson;
  delete obj.rawWorkbookData;
  delete obj.RawWorkbookData;
  delete obj.specJson;
  delete obj.SpecJson;
  delete obj.spec;
  delete obj.Spec;

  const blockId = normalizeBlockId(obj);
  obj.blockId = blockId;
  const excelSpecKind = normalizeExcelSpecKind(
    obj.excelSpecKind ?? obj.ExcelSpecKind ?? obj.sourceKind ?? obj.SourceKind ?? obj.kind,
  );
  delete obj.ExcelSpecKind;
  delete obj.SourceKind;
  if (excelSpecKind) {
    obj.excelSpecKind = excelSpecKind;
  } else {
    delete obj.excelSpecKind;
  }
  obj.tableMode = normalizeTableMode(obj.tableMode);
  const sectionId = readString(obj.sectionId) ?? readString(obj.SectionId) ?? fallbackSectionId ?? null;
  delete obj.SectionId;
  if (sectionId) obj.sectionId = sectionId;

  if (obj.tableMode === "FIXED_GRID") {
    const indexMap = normalizeIndexMap(obj.indexMap, blockId);
    obj.indexMap = indexMap.length > 0 ? indexMap : buildFixedGridIndexMap(obj, blockId);
  } else {
    delete obj.indexMap;
  }

  if (obj.tableMode === "SUMMARY_TEMPLATE") {
    normalizeSummaryTemplateLayout(obj, blockId);
  }

  const statisticColumns = normalizeStatisticColumns(obj.statisticColumns);
  if (statisticColumns.length > 0) {
    obj.statisticColumns = statisticColumns;
  } else {
    delete obj.statisticColumns;
  }

  const statisticColumnKeys = new Set(statisticColumns.map(getStatisticColumnIdentity));
  const statisticColumnLabels = normalizeStatisticColumnLabels(
    obj.statisticColumnLabels,
    statisticColumnKeys,
  );
  if (statisticColumnLabels.length > 0) {
    obj.statisticColumnLabels = statisticColumnLabels;
  } else {
    delete obj.statisticColumnLabels;
  }

  return obj;
}

function validateExcelBlockTableModeCompatibility(blocksJson?: string | null) {
  if (!blocksJson?.trim()) return;
  const blocks = parseJsonObjectArray(blocksJson);
  blocks.forEach((block, index) => {
    const tableMode = normalizeTableMode(block.tableMode);
    const excelSpecKind = getExcelSpecKindFromBlockLike(block);
    if (isTableModeAllowedForExcelSpecKind(tableMode, excelSpecKind)) return;

    const specLabel = excelSpecKind ? excelSpecKindLabels[excelSpecKind] : "không xác định";
    throw new Error(
      `Bảng Excel động ${index + 1} thuộc loại ${specLabel}, không dùng được kiểu nhập "${tableModeLabels[tableMode]}".`,
    );
  });
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

function normalizeStatisticColumns(value: unknown): DynamicFormStatisticColumn[] {
  const rows = Array.isArray(value) ? value : [];
  const byColumn = new Map<string, DynamicFormStatisticColumn>();

  for (const item of rows) {
    if (!isPlainObject(item)) continue;

    const columnIndex = getNonNegativeInt(item.columnIndex);
    const columnKey = readString(item.columnKey) ?? (columnIndex != null ? `col_${columnIndex + 1}` : null);
    const header = readString(item.header);
    const key = columnKey ?? header;
    if (!key) continue;

    byColumn.set(key.toLowerCase(), {
      ...(columnIndex != null ? { columnIndex } : {}),
      ...(columnKey ? { columnKey: normalizeMetricPart(columnKey, columnKey) } : {}),
      ...(header ? { header } : {}),
      aggregateOps: ["count", "sum"],
      showInDetail: true,
      showInTree: false,
    });
  }

  return Array.from(byColumn.values());
}

function normalizeStatisticColumnLabels(
  value: unknown,
  statisticColumnKeys?: Set<string>,
): DynamicFormStatisticColumnLabel[] {
  const rows = Array.isArray(value) ? value : [];
  const byColumn = new Map<string, DynamicFormStatisticColumnLabel>();

  for (const item of rows) {
    if (!isPlainObject(item)) continue;
    const statisticLabelCode = normalizeLabelCodes([readString(item.statisticLabelCode) ?? ""])[0];
    if (!statisticLabelCode) continue;

    const columnIndex = getNonNegativeInt(item.columnIndex);
    const columnKey = readString(item.columnKey) ?? (columnIndex != null ? `col_${columnIndex + 1}` : null);
    const header = readString(item.header);
    const key = columnKey ?? header;
    if (!key) continue;

    const normalizedColumn: DynamicFormStatisticColumn = {
      ...(columnIndex != null ? { columnIndex } : {}),
      ...(columnKey ? { columnKey: normalizeMetricPart(columnKey, columnKey) } : {}),
      ...(header ? { header } : {}),
    };
    const identity = getStatisticColumnIdentity(normalizedColumn);
    if (statisticColumnKeys && !statisticColumnKeys.has(identity)) continue;

    byColumn.set(identity, {
      ...normalizedColumn,
      statisticLabelCode,
      aggregateOps: ["count", "sum"],
      showInDetail: true,
      showInTree: false,
    });
  }

  return Array.from(byColumn.values());
}

function getStatisticColumnIdentity(column: DynamicFormStatisticColumn) {
  return (column.columnKey || column.header || `col_${Number(column.columnIndex ?? -1) + 1}`).toLowerCase();
}

function validateUniqueLabelStatisticTargets(
  fields: DynamicFormField[],
  blocksJson?: string | null,
) {
  const seen = new Map<string, string>();
  let targetCount = 0;

  for (const field of fields) {
    if (!field.isStatistic && normalizeLabelCodes(field.statisticLabelCodes).length > 0) {
      throw new Error("Trường gắn nhãn phải được bật thống kê.");
    }
    if (!field.isStatistic) continue;
    const labels = normalizeLabelCodes(field.statisticLabelCodes);
    targetCount += 1;
    for (const label of labels) {
      addUniqueLabelTarget(seen, label, `field:${field.key || field.id}`);
    }
  }

  for (const blockJson of getDynamicFormBlockJsonList(blocksJson, null)) {
    const block = parseJsonObject(blockJson);
    const blockId = block ? normalizeBlockId(block) : "excel_block";
    const statisticColumns = normalizeStatisticColumns(block?.statisticColumns);
    const statisticColumnKeys = new Set(statisticColumns.map(getStatisticColumnIdentity));
    targetCount += statisticColumns.length;
    const columns = normalizeStatisticColumnLabels(block?.statisticColumnLabels, statisticColumnKeys);
    for (const column of columns) {
      addUniqueLabelTarget(
        seen,
        column.statisticLabelCode,
        `table:${blockId}.column:${column.columnKey || column.header || column.columnIndex}`,
      );
    }
  }

  if (targetCount > MAX_DYNAMIC_FORM_LABEL_STATISTIC_TARGETS) {
    throw new Error(
      `Biểu mẫu động chỉ được có tối đa ${MAX_DYNAMIC_FORM_LABEL_STATISTIC_TARGETS} trường hoặc cột gắn nhãn thống kê.`,
    );
  }
}

function addUniqueLabelTarget(seen: Map<string, string>, labelCode: string, target: string) {
  const existing = seen.get(labelCode);
  if (existing) {
    throw new Error(`Nhãn '${labelCode}' đã gắn cho ${existing}, không được gắn tiếp cho ${target}.`);
  }

  seen.set(labelCode, target);
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

function parseJsonObjectArray(json?: string | null): Record<string, unknown>[] {
  if (!json?.trim()) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed)
      ? parsed.filter(isPlainObject).map((item) => ({ ...item }))
      : [];
  } catch {
    return [];
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

function getNonNegativeInt(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
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
  const rows = options?.length ? options : [{ code: "A", label: "Lựa chọn A" }];
  return rows.map((x, index) => ({
    code: x.code?.trim() || `OPT_${index + 1}`,
    label: x.label?.trim() || `Lựa chọn ${index + 1}`,
  }));
}
