import {
  buildDynamicFormSchemaPayload,
  type DynamicFormSchemaBlock,
  type DynamicFormSchemaField,
} from "../../api/contracts/dynamicFormSchemaContract";
import type {
  P8DynamicFormStatisticsMutationPayload,
  P8DynamicFormStatisticsReadback,
  P8StatConfigMutationEnvelope,
} from "../../api/statConfigApi";
import type { DynamicFormEditorSubmit } from "../../features/dynamicForms/dynamicForm.types";

const LABEL_CODE_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,63}$/;
const COMMAND_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA256_PATTERN = /^[a-fA-F0-9]{64}$/;

function hasAsciiControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f)
    );
  });
}

const INPUT_TABLE_MODES = new Set([
  "FIXED_GRID",
  "APPEND_ROWS",
  "APPEND_COLUMNS",
  "MATRIX",
]);

const FIELD_OPERATIONS: Readonly<Record<string, ReadonlySet<string>>> = {
  NUMBER: new Set(["COUNT", "SUM", "AVG", "MIN", "MAX", "LATEST"]),
  DATE: new Set(["COUNT", "MIN", "MAX", "LATEST"]),
  FULL_DATE: new Set(["COUNT", "MIN", "MAX", "LATEST"]),
  BOOLEAN: new Set(["COUNT", "TRUE_COUNT", "FALSE_COUNT"]),
  SINGLE_SELECT: new Set(["COUNT", "BUCKET_COUNT", "LATEST"]),
  MULTI_SELECT: new Set(["COUNT", "BUCKET_COUNT"]),
  SHORT_TEXT: new Set(["COUNT", "LATEST", "CONCAT"]),
  LONG_TEXT: new Set(["COUNT", "LATEST", "CONCAT"]),
  STRING_LIST: new Set(["COUNT"]),
};

const TABLE_OPERATIONS: Readonly<Record<string, ReadonlySet<string>>> = {
  NUMBER: new Set(["COUNT", "SUM", "MIN", "MAX", "AVERAGE"]),
  SHORT_TEXT: new Set(["COUNT", "BUCKET_COUNT"]),
  MULTI_SELECT: new Set(["COUNT", "BUCKET_COUNT"]),
  BOOLEAN: new Set(["COUNT", "TRUE_COUNT", "FALSE_COUNT"]),
  DATE: new Set(["COUNT", "EARLIEST", "LATEST"]),
  FULL_DATE: new Set(["COUNT", "EARLIEST", "LATEST"]),
};

const FIELD_TYPE_MAP: Readonly<Record<string, string>> = {
  number: "NUMBER",
  date: "DATE",
  fullDate: "FULL_DATE",
  boolean: "BOOLEAN",
  singleSelect: "SINGLE_SELECT",
  multiSelect: "MULTI_SELECT",
  shortText: "SHORT_TEXT",
  longText: "LONG_TEXT",
  stringList: "STRING_LIST",
};

export type P8ExactDynamicFormStatisticSettings = {
  aggregateOps: string[];
  bucketMode: "NONE" | "OPTION" | "DATE";
  showInDetail: boolean;
  showInTree: boolean;
};

export type P8ExactDynamicFormStatisticField = {
  fieldId: string;
  isStatistic: boolean;
  statistic: P8ExactDynamicFormStatisticSettings | null;
  statisticLabelCodes: string[];
};

export type P8ExactDynamicFormStatisticTableMetric = {
  metricKey: string;
  dataType: string;
  aggregateOps: string[];
};

export type P8ExactDynamicFormStatisticMetricLabelTarget = {
  metricKey: string;
  statisticLabelCode: string;
};

export type P8ExactDynamicFormStatisticTable = {
  blockId: string;
  tableMode: string;
  statisticsDisabled: boolean;
  metrics: P8ExactDynamicFormStatisticTableMetric[];
  metricLabelTargets: P8ExactDynamicFormStatisticMetricLabelTarget[];
  allowedRowLabelCodes: string[];
};

export type P8DynamicFormStatisticMutationStep =
  | {
      kind: "FIELDS";
      payload: { fields: P8ExactDynamicFormStatisticField[] };
    }
  | {
      kind: "TABLES";
      payload: { tables: P8ExactDynamicFormStatisticTable[] };
    };

export type P8DynamicFormStatisticMutationPlan = {
  tableSource: "NONE" | "CANONICAL_BLOCKS" | "LEGACY_READ_ONLY";
  steps: P8DynamicFormStatisticMutationStep[];
};

export class P8DynamicFormStatisticAdapterError extends Error {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, message: string) {
    super(`${code} at ${path}: ${message}`);
    this.name = "P8DynamicFormStatisticAdapterError";
    this.code = code;
    this.path = path;
  }
}

/**
 * Converts the editor's typed schema companion into strict P8 config-only
 * mutations. Field and table mutations are deliberately separate because the
 * backend rejects a payload containing both collections.
 */
export function buildP8DynamicFormStatisticMutationPlan(
  submit: DynamicFormEditorSubmit,
): P8DynamicFormStatisticMutationPlan {
  const schema = buildDynamicFormSchemaPayload(submit);
  const fields = schema.fields.map(mapField);
  const hasCanonicalBlocks = Boolean(submit.blocksJson?.trim());
  const hasLegacyBlock = !hasCanonicalBlocks && Boolean(submit.excelBlockJson?.trim());
  const tables = hasCanonicalBlocks
    ? schema.blocks
        .map((block, index) => ({ block, index }))
        .filter(({ block, index }) => isP8InputBlock(block, index))
        .map(({ block, index }) => mapTable(block, index))
    : [];

  const statisticFieldCount = fields.filter((field) => field.isStatistic).length;
  if (statisticFieldCount > 30) {
    fail(
      "FIELD_STATISTIC_TARGET_LIMIT_30",
      "$.schema.fields",
      `found ${statisticFieldCount} statistic fields`,
    );
  }

  const tableMetricCount = tables.reduce((total, table) => total + table.metrics.length, 0);
  if (tableMetricCount > 30) {
    fail(
      "TABLE_STATISTIC_TARGET_LIMIT_30",
      "$.schema.blocks",
      `found ${tableMetricCount} configured table metrics`,
    );
  }

  ensureUniqueStatisticLabelTargets(fields, tables);

  const steps: P8DynamicFormStatisticMutationStep[] = [];
  if (fields.length > 0) steps.push({ kind: "FIELDS", payload: { fields } });
  if (tables.length > 0) steps.push({ kind: "TABLES", payload: { tables } });

  return {
    tableSource: hasCanonicalBlocks
      ? "CANONICAL_BLOCKS"
      : hasLegacyBlock
        ? "LEGACY_READ_ONLY"
        : "NONE",
    steps,
  };
}

/** Builds one replay-safe strict envelope from the latest P8 readback CAS. */
export function buildP8DynamicFormStatisticMutationEnvelope(
  step: P8DynamicFormStatisticMutationStep,
  current: Pick<P8DynamicFormStatisticsReadback, "revision" | "configHash">,
  commandId: string,
): P8StatConfigMutationEnvelope<P8DynamicFormStatisticsMutationPayload> {
  const normalizedCommandId = commandId.trim();
  if (!COMMAND_ID_PATTERN.test(normalizedCommandId)) {
    fail("STAT_CONFIG_COMMAND_ID_INVALID", "$.commandId", "commandId must match the P8 token contract");
  }
  if (!Number.isSafeInteger(current.revision) || current.revision < 0) {
    fail("STAT_CONFIG_EXPECTED_REVISION_REQUIRED", "$.expectedRevision", "revision must be a non-negative safe integer");
  }
  const configHash = current.configHash.trim();
  if (!SHA256_PATTERN.test(configHash)) {
    fail("STAT_CONFIG_EXPECTED_HASH_INVALID", "$.expectedConfigHash", "configHash must be a SHA-256 hex string");
  }

  return {
    commandId: normalizedCommandId,
    expectedRevision: current.revision,
    expectedConfigHash: configHash.toLowerCase(),
    payload: step.payload,
  };
}

function mapField(field: DynamicFormSchemaField, index: number): P8ExactDynamicFormStatisticField {
  const path = `$.schema.fields[${index}]`;
  const fieldId = requireIdentity(field.id ?? field.key, `${path}.id`, "FIELD_ID_REQUIRED");
  if (field.isStatistic !== true) {
    return {
      fieldId,
      isStatistic: false,
      statistic: null,
      statisticLabelCodes: [],
    };
  }

  const fieldType = FIELD_TYPE_MAP[requireString(field.type, `${path}.type`, "FIELD_TYPE_REQUIRED")];
  if (!fieldType) {
    fail("FIELD_TYPE_STATISTIC_FORBIDDEN", `${path}.type`, "field type is not supported by the P8 statistic contract");
  }
  const statistic = requireRecord(field.statistic, `${path}.statistic`, "STATISTIC_CONFIG_REQUIRED");
  const aggregateOps = normalizeOperations(
    statistic.aggregateOps,
    `${path}.statistic.aggregateOps`,
    FIELD_OPERATIONS[fieldType],
    normalizeFieldOperation,
  );
  const bucketMode = normalizeBucketMode(statistic.bucketMode, fieldType, `${path}.statistic.bucketMode`);
  const showInDetail = requireBoolean(
    statistic.showInDetail,
    `${path}.statistic.showInDetail`,
    "SHOW_IN_DETAIL_REQUIRED",
  );
  const showInTree = requireBoolean(
    statistic.showInTree,
    `${path}.statistic.showInTree`,
    "SHOW_IN_TREE_REQUIRED",
  );

  return {
    fieldId,
    isStatistic: true,
    statistic: { aggregateOps, bucketMode, showInDetail, showInTree },
    statisticLabelCodes: normalizeLabelCodes(field.statisticLabelCodes, `${path}.statisticLabelCodes`, false),
  };
}

function isP8InputBlock(block: DynamicFormSchemaBlock, index: number): boolean {
  const path = `$.schema.blocks[${index}].tableMode`;
  const tableMode = requireString(block.tableMode, path, "TABLE_MODE_REQUIRED").toUpperCase();
  if (tableMode === "SUMMARY_TEMPLATE") return false;
  if (!INPUT_TABLE_MODES.has(tableMode)) {
    fail("DYNAMIC_FORM_TABLE_MODE_INVALID", path, `unsupported table mode ${tableMode}`);
  }
  return true;
}

function mapTable(block: DynamicFormSchemaBlock, index: number): P8ExactDynamicFormStatisticTable {
  const path = `$.schema.blocks[${index}]`;
  const blockId = requireIdentity(block.blockId, `${path}.blockId`, "BLOCK_ID_REQUIRED");
  const tableMode = requireString(block.tableMode, `${path}.tableMode`, "TABLE_MODE_REQUIRED").toUpperCase();
  const blockRecord = block as Record<string, unknown>;
  const rawRules = optionalRecordArray(blockRecord.metricRules, `${path}.metricRules`);
  const metrics = rawRules
    .map((rule, ruleIndex) => mapTableMetric(blockRecord, rule, index, ruleIndex))
    .filter((metric): metric is P8ExactDynamicFormStatisticTableMetric => metric !== null);
  const configuredMetricKeys = new Set(metrics.map((metric) => metric.metricKey));
  const metricLabelTargets = mapMetricLabelTargets(
    blockRecord.metricLabelTargets,
    configuredMetricKeys,
    `${path}.metricLabelTargets`,
  );

  return {
    blockId,
    tableMode,
    statisticsDisabled: optionalBoolean(blockRecord.statisticsDisabled, `${path}.statisticsDisabled`) ?? false,
    metrics,
    metricLabelTargets,
    allowedRowLabelCodes: normalizeLabelCodes(
      blockRecord.allowedRowLabelCodes,
      `${path}.allowedRowLabelCodes`,
      true,
    ),
  };
}

function mapTableMetric(
  block: Record<string, unknown>,
  rule: Record<string, unknown>,
  blockIndex: number,
  ruleIndex: number,
): P8ExactDynamicFormStatisticTableMetric | null {
  const path = `$.schema.blocks[${blockIndex}].metricRules[${ruleIndex}]`;
  const rawOperations = rule.aggregateOps;
  if (rawOperations == null || (Array.isArray(rawOperations) && rawOperations.length === 0)) {
    return null;
  }
  const metricKey = requireIdentity(rule.metricKey, `${path}.metricKey`, "METRIC_KEY_REQUIRED");
  const dataType = resolveMetricDataType(block, rule, metricKey, blockIndex, ruleIndex);
  const aggregateOps = normalizeOperations(
    rawOperations,
    `${path}.aggregateOps`,
    TABLE_OPERATIONS[dataType],
    normalizeTableOperation,
  );
  return { metricKey, dataType, aggregateOps };
}

function mapMetricLabelTargets(
  value: unknown,
  configuredMetricKeys: ReadonlySet<string>,
  path: string,
): P8ExactDynamicFormStatisticMetricLabelTarget[] {
  const rows = optionalRecordArray(value, path);
  const pairs = new Set<string>();
  const targets = rows.map((target, index) => {
    const targetPath = `${path}[${index}]`;
    if (target.targetKind === "RANGE" || target.range != null || !stringValue(target.metricKey)) {
      fail(
        "P8_METRIC_KEY_TARGET_REQUIRED",
        `${targetPath}.metricKey`,
        "P8 table labels must target a configured metricKey; range targets are legacy-only",
      );
    }
    const metricKey = requireIdentity(target.metricKey, `${targetPath}.metricKey`, "METRIC_KEY_REQUIRED");
    if (!configuredMetricKeys.has(metricKey)) {
      fail(
        "TABLE_METRIC_LABEL_TARGET_NOT_CONFIGURED",
        `${targetPath}.metricKey`,
        `metric ${metricKey} has no configured aggregate operations`,
      );
    }
    const statisticLabelCode = normalizeLabelCode(
      target.statisticLabelCode,
      `${targetPath}.statisticLabelCode`,
    );
    const pair = `${metricKey}\0${statisticLabelCode}`;
    if (pairs.has(pair)) {
      fail("DUPLICATE_METRIC_LABEL_TARGET", targetPath, "metricKey/label pair is duplicated");
    }
    pairs.add(pair);
    return { metricKey, statisticLabelCode };
  });
  return targets.sort(
    (left, right) =>
      left.metricKey.localeCompare(right.metricKey) ||
      left.statisticLabelCode.localeCompare(right.statisticLabelCode),
  );
}

function resolveMetricDataType(
  block: Record<string, unknown>,
  rule: Record<string, unknown>,
  metricKey: string,
  blockIndex: number,
  ruleIndex: number,
): string {
  const path = `$.schema.blocks[${blockIndex}].metricRules[${ruleIndex}].dataType`;
  const explicit = stringValue(rule.dataType) ?? stringValue(rule.targetDataType);
  if (explicit) return normalizeTableDataType(explicit, path);

  const indexMap = optionalRecordArray(block.indexMap, `$.schema.blocks[${blockIndex}].indexMap`);
  const matches = indexMap.filter((item) => stringValue(item.metricKey) === metricKey);
  if (matches.length > 1) {
    fail("DUPLICATE_INDEX_MAP_METRIC_KEY", `$.schema.blocks[${blockIndex}].indexMap`, metricKey);
  }
  const match = matches[0];
  const indexType = match && (stringValue(match.dataType) ?? stringValue(match.targetDataType));
  if (indexType) return normalizeTableDataType(indexType, path);

  const defaultType = stringValue(block.defaultDataType) ?? stringValue(block.dataType);
  if (!defaultType) {
    fail("TABLE_METRIC_DATATYPE_UNRESOLVED", path, `cannot resolve dataType for metric ${metricKey}`);
  }
  return normalizeTableDataType(defaultType, path);
}

function normalizeTableDataType(value: string, path: string): string {
  const normalized = normalizeToken(value);
  const alias = normalized === "FULLDATE" ? "FULL_DATE" : normalized;
  if (!TABLE_OPERATIONS[alias]) {
    fail("TABLE_METRIC_DATATYPE_UNSUPPORTED", path, `unsupported table dataType ${value}`);
  }
  return alias;
}

function normalizeOperations(
  value: unknown,
  path: string,
  allowed: ReadonlySet<string> | undefined,
  normalize: (value: string) => string,
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail("AGGREGATE_OPS_REQUIRED", path, "aggregateOps must be a non-empty array");
  }
  const seen = new Set<string>();
  return value.map((item, index) => {
    const operation = normalize(requireString(item, `${path}[${index}]`, "OPERATION_REQUIRED"));
    if (seen.has(operation)) {
      fail("DUPLICATE_OPERATION", `${path}[${index}]`, operation);
    }
    if (!allowed?.has(operation)) {
      fail("STATISTIC_OPERATION_INCOMPATIBLE", `${path}[${index}]`, operation);
    }
    seen.add(operation);
    return operation;
  });
}

function normalizeFieldOperation(value: string): string {
  const token = normalizeToken(value);
  if (token === "AVERAGE") return "AVG";
  if (token === "MINIMUM") return "MIN";
  if (token === "MAXIMUM") return "MAX";
  return token;
}

function normalizeTableOperation(value: string): string {
  const token = normalizeToken(value);
  if (token === "AVG") return "AVERAGE";
  if (token === "MINIMUM") return "MIN";
  if (token === "MAXIMUM") return "MAX";
  return token;
}

function normalizeBucketMode(value: unknown, fieldType: string, path: string): "NONE" | "OPTION" | "DATE" {
  const bucketMode = normalizeToken(requireString(value, path, "BUCKET_MODE_REQUIRED"));
  const allowed =
    bucketMode === "NONE" ||
    (bucketMode === "OPTION" && (fieldType === "SINGLE_SELECT" || fieldType === "MULTI_SELECT")) ||
    (bucketMode === "DATE" && (fieldType === "DATE" || fieldType === "FULL_DATE"));
  if (!allowed) {
    fail("FIELD_STATISTIC_BUCKET_MODE_INCOMPATIBLE", path, `${fieldType}/${bucketMode}`);
  }
  return bucketMode as "NONE" | "OPTION" | "DATE";
}

function ensureUniqueStatisticLabelTargets(
  fields: readonly P8ExactDynamicFormStatisticField[],
  tables: readonly P8ExactDynamicFormStatisticTable[],
): void {
  const owners = new Map<string, string>();
  const add = (code: string, owner: string) => {
    const existing = owners.get(code);
    if (existing && existing !== owner) {
      fail("TABLE_STATISTIC_LABEL_TARGET_CONFLICT", "$.payload", `${code}: ${existing} vs ${owner}`);
    }
    owners.set(code, owner);
  };
  fields.forEach((field) =>
    field.statisticLabelCodes.forEach((code) => add(code, `field:${field.fieldId}`)),
  );
  tables.forEach((table) =>
    table.metricLabelTargets.forEach((target) =>
      add(target.statisticLabelCode, `table:${table.blockId}.metric:${target.metricKey}`),
    ),
  );
}

function normalizeLabelCodes(value: unknown, path: string, rejectDuplicates: boolean): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) fail("LABEL_CODE_ARRAY_REQUIRED", path, "expected a string array");
  const seen = new Set<string>();
  const result = value.map((item, index) => {
    const code = normalizeLabelCode(item, `${path}[${index}]`);
    if (rejectDuplicates && seen.has(code)) {
      fail("DUPLICATE_ALLOWED_ROW_LABEL_CODE", `${path}[${index}]`, code);
    }
    seen.add(code);
    return code;
  });
  return Array.from(new Set(result)).sort((left, right) => left.localeCompare(right));
}

function normalizeLabelCode(value: unknown, path: string): string {
  const normalized = requireString(value, path, "LABEL_CODE_INVALID").toLowerCase();
  if (!LABEL_CODE_PATTERN.test(normalized)) {
    fail("LABEL_CODE_INVALID", path, String(value));
  }
  return normalized;
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s.-]+/g, "_")
    .toUpperCase();
}

function optionalRecordArray(value: unknown, path: string): Record<string, unknown>[] {
  if (value == null) return [];
  if (!Array.isArray(value)) fail("OBJECT_ARRAY_REQUIRED", path, "expected an object array");
  return value.map((item, index) => requireRecord(item, `${path}[${index}]`, "OBJECT_REQUIRED"));
}

function requireRecord(value: unknown, path: string, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code, path, "expected an object");
  }
  return value as Record<string, unknown>;
}

function requireIdentity(value: unknown, path: string, code: string): string {
  const identity = requireString(value, path, code);
  if (identity.length > 256 || hasAsciiControlCharacter(identity)) {
    fail("IDENTITY_INVALID", path, "identity is too long or contains a control character");
  }
  return identity;
}

function requireString(value: unknown, path: string, code: string): string {
  const normalized = stringValue(value);
  if (!normalized) fail(code, path, "non-empty string required");
  return normalized;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requireBoolean(value: unknown, path: string, code: string): boolean {
  if (typeof value !== "boolean") fail(code, path, "boolean required");
  return value;
}

function optionalBoolean(value: unknown, path: string): boolean | null {
  if (value == null) return null;
  if (typeof value !== "boolean") fail("BOOLEAN_REQUIRED", path, "boolean required");
  return value;
}

function fail(code: string, path: string, message: string): never {
  throw new P8DynamicFormStatisticAdapterError(code, path, message);
}

