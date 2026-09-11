import type { DynamicFormFlowCapabilityCatalogMetadata } from "../../generated/dynamicFormFlowCapabilityCatalog.generated";

type CapabilityDomains = DynamicFormFlowCapabilityCatalogMetadata["domains"];

export type DynamicFormSchemaFieldType = CapabilityDomains["dynamicFormFieldTypes"][number]["id"];
export type DynamicFormSchemaValueSourceType = CapabilityDomains["dynamicFormValueSources"][number]["id"];
export type DynamicFormSchemaTableMode = CapabilityDomains["dynamicFormTableModes"][number]["id"];

export type DynamicFormSchemaOption = {
  code?: string | null;
  label?: string | null;
  [property: string]: unknown;
};

export type DynamicFormSchemaValueSource = {
  sourceType?: DynamicFormSchemaValueSourceType | null;
  labelCode?: string | null;
  labelName?: string | null;
  catalogId?: string | null;
  catalogCode?: string | null;
  catalogName?: string | null;
  options?: DynamicFormSchemaOption[] | null;
  [property: string]: unknown;
};

export type DynamicFormSchemaSection = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  tagCodes?: string[] | null;
  order?: number | null;
  [property: string]: unknown;
};

export type DynamicFormSchemaField = {
  id?: string | null;
  sectionId?: string | null;
  key?: string | null;
  name?: string | null;
  type?: DynamicFormSchemaFieldType | null;
  required?: boolean | null;
  colSpan?: number | null;
  minHeight?: number | null;
  canvasX?: number | null;
  canvasY?: number | null;
  canvasW?: number | null;
  canvasH?: number | null;
  order?: number | null;
  options?: DynamicFormSchemaOption[] | null;
  valueSource?: DynamicFormSchemaValueSource | null;
  statisticLabelCodes?: string[] | null;
  isStatistic?: boolean | null;
  statistic?: unknown;
  [property: string]: unknown;
};

export type DynamicFormSchemaBlock = {
  blockId?: string | null;
  sectionId?: string | null;
  tableMode?: DynamicFormSchemaTableMode | null;
  dynamicExcelTemplateId?: string | null;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
  excelSpecKind?: string | null;
  [property: string]: unknown;
};

export type DynamicFormSchema = {
  sections: DynamicFormSchemaSection[];
  fields: DynamicFormSchemaField[];
  blocks: DynamicFormSchemaBlock[];
};

export type DynamicFormLegacySchemaPayload = {
  sectionsJson?: string | null;
  fieldsJson?: string | null;
  excelBlockJson?: string | null;
  blocksJson?: string | null;
};

export function buildDynamicFormSchemaPayload(input: DynamicFormLegacySchemaPayload): DynamicFormSchema {
  const blocks = input.blocksJson?.trim()
    ? parseObjectArray<DynamicFormSchemaBlock>(input.blocksJson, "blocksJson")
    : input.excelBlockJson?.trim()
      ? [parseObject<DynamicFormSchemaBlock>(input.excelBlockJson, "excelBlockJson")]
      : [];

  return {
    sections: parseObjectArray<DynamicFormSchemaSection>(input.sectionsJson, "sectionsJson"),
    fields: parseObjectArray<DynamicFormSchemaField>(input.fieldsJson, "fieldsJson"),
    blocks,
  };
}

function parseObjectArray<T>(raw: string | null | undefined, propertyName: string): T[] {
  if (!raw?.trim()) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.some((item) => !isPlainObject(item))) {
    throw new Error(`${propertyName} must be a JSON object array.`);
  }
  return value as T[];
}

function parseObject<T>(raw: string, propertyName: string): T {
  const value: unknown = JSON.parse(raw);
  if (!isPlainObject(value)) {
    throw new Error(`${propertyName} must be a JSON object.`);
  }
  return value as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
