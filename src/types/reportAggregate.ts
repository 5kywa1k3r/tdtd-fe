import type { AggregateScopeMode } from "./aggregateTypes";

/* =========================
 * Aggregate table
 * ========================= */

export interface AggregateTableRequest {
  parentAssignmentId: string;
  dynamicExcelId: string;

  // SINGLE_PERIOD | PERIOD_RANGE | CUMULATIVE_TO_PERIOD | ALL_PERIODS
  periodScopeMode?: string | null;

  // dùng khi SINGLE_PERIOD
  periodKey?: string | null;

  // dùng khi PERIOD_RANGE
  periodKeyFrom?: string | null;
  periodKeyTo?: string | null;

  // APPROVED_ONLY
  sourceStatusMode?: string | null;
  selectedUnitIds?: string[] | null;

  // GROUP_BY_ASSIGNMENT_SUM | GROUP_BY_USER_SUM | SUM_ALL
  aggregateMode?: string | null;
}

export interface AggregateTableRowDto {
  workAssignmentId?: string | null;

  userId?: string | null;
  userName?: string | null;
  fullName?: string | null;
  unitSymbol?: string | null;
  unitShortName?: string | null;
  sourceRowIndex?: number | null;
  sourceRowNumber?: number | null;
  sourceRowKey?: string | null;
  sourceRowLabel?: string | null;

  values: Array<number | null>;
}

export interface AggregateRecordTableColumnDto {
  key: string;
  label: string;
  dataType: "text" | "number" | "date" | "boolean" | string;
  isCalculated?: boolean | null;
}

export interface AggregateRecordTableRowDto {
  reportId?: string | null;
  workAssignmentId?: string | null;
  userId?: string | null;
  userName?: string | null;
  fullName?: string | null;
  unitSymbol?: string | null;
  unitShortName?: string | null;
  periodKey?: string | null;
  sourceRowIndex?: number | null;
  sourceRowKey?: string | null;
  values: Record<string, unknown>;
}

export interface AggregateSourceRowDto {
  reportId: string;
  workAssignmentId: string;
  assigneeUserId?: string | null;

  userName?: string | null;
  fullName?: string | null;
  unitSymbol?: string | null;
  unitShortName?: string | null;

  reportStatus: number;
  periodKey?: string | null;
  periodInstanceKey?: string | null;
  periodKind?: string | null;
  reportDate?: string | null;

  submittedAtUtc?: string | null;
  approvedAtUtc?: string | null;
}

export interface AggregateTableResponse {
  dynamicExcelId: string;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;

  periodScopeMode?: string | null;
  periodKey?: string | null;
  periodKeyFrom?: string | null;
  periodKeyTo?: string | null;

  aggregateMode?: string | null;
  selectedUnitIds?: string[] | null;

  periodCount?: number | null;
  includedPeriodKeys: string[];

  dataRectR0?: number | null;
  dataRectC0?: number | null;
  dataRectR1?: number | null;
  dataRectC1?: number | null;
  w?: number | null;
  h?: number | null;

  metaColumns: string[];
  rows: AggregateTableRowDto[];
  tableKind?: "NUMERIC_GRID" | "RECORD_TABLE" | string | null;
  recordOrientation?: string | null;
  recordColumns?: AggregateRecordTableColumnDto[] | null;
  recordRows?: AggregateRecordTableRowDto[] | null;
  warnings?: string[] | null;
  sources: AggregateSourceRowDto[];
}

export interface DynamicFormAggregateRequest {
  scopeAssignmentId: string;
  scopeMode?: AggregateScopeMode | null;
  dynamicFormTemplateId: string;
  blockId?: string | null;
  tableMode?: "FIXED_GRID" | string | null;
  metricKeys?: string[] | null;
  periodScopeMode?: string | null;
  periodKey?: string | null;
  periodKeyFrom?: string | null;
  periodKeyTo?: string | null;
  sourceStatusMode?: string | null;
  selectedUnitIds?: string[] | null;
}

export interface DynamicFormAggregateMetaDto {
  scopeAssignmentId: string;
  scopeMode: string;
  dynamicFormTemplateId: string;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  blockId: string;
  tableMode: string;
  periodScopeMode?: string | null;
  periodKey?: string | null;
  periodKeyFrom?: string | null;
  periodKeyTo?: string | null;
  sourceStatusMode?: string | null;
  selectedUnitIds: string[];
  sourceAssignmentCount: number;
  sourceReportCount: number;
  metricCount: number;
}

export interface DynamicFormAggregateColumnDto {
  key: string;
  label: string;
  type: string;
}

export interface DynamicFormAggregateRowDto {
  metricKey: string;
  rowKey: string;
  columnKey: string;
  index: number;
  label?: string | null;
  groupType?: string | null;
  groupKey?: string | null;
  groupLabel?: string | null;
  workAssignmentId?: string | null;
  unitSymbol?: string | null;
  unitShortName?: string | null;
  userName?: string | null;
  fullName?: string | null;
  sourceMetricKey?: string | null;
  layoutIndex?: number | null;
  outputGroupIndex?: number | null;
  outputRowIndex?: number | null;
  outputRowNumber?: number | null;
  rowsPerGroup?: number | null;
  reportCount?: number | null;
  count: number;
  sum?: number | null;
  min?: number | null;
  max?: number | null;
  average?: number | null;
}

export interface DynamicFormAggregateResponse {
  meta: DynamicFormAggregateMetaDto;
  columns: DynamicFormAggregateColumnDto[];
  rows: DynamicFormAggregateRowDto[];
  sources: AggregateSourceRowDto[];
  warnings: string[];
}
