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
  aggregateConfigId?: string | null;
  identityColumns?: string[] | null;
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
  aggregateConfigId?: string | null;
  identityColumns: string[];
  sourceAssignmentCount: number;
  sourceReportCount: number;
  metricCount: number;
}

export interface DynamicFormStackedTableColumnDto {
  key: string;
  label: string;
  role: "IDENTITY" | "METRIC" | string;
  type: string;
  metricKey?: string | null;
  sourceKey?: string | null;
}

export interface DynamicFormStackedTableRowDto {
  rowKey: string;
  cells: Record<string, unknown>;
  sourceReportIds: string[];
  sourceAssignmentIds: string[];
}

export interface DynamicFormStackedTableDto {
  sourceTableMode: string;
  rowMode: string;
  columns: DynamicFormStackedTableColumnDto[];
  rows: DynamicFormStackedTableRowDto[];
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
  stackedTable?: DynamicFormStackedTableDto | null;
  sources: AggregateSourceRowDto[];
  warnings: string[];
}

export interface WorkAssignmentAggregateConfigDto {
  id?: string | null;
  workId: string;
  assignmentId: string;
  sourceDynamicFormTemplateId?: string | null;
  sourceBlockId?: string | null;
  sourceTableMode?: string | null;
  targetDynamicFormTemplateId?: string | null;
  targetBlockId?: string | null;
  aggregateKind: string;
  identityColumns: string[];
  periodAggregationRule: string;
  metricMappingsJson?: string | null;
  versionNo: number;
  isActive: boolean;
}

export interface SaveWorkAssignmentAggregateConfigRequest {
  sourceDynamicFormTemplateId?: string | null;
  sourceBlockId?: string | null;
  sourceTableMode?: string | null;
  targetDynamicFormTemplateId?: string | null;
  targetBlockId?: string | null;
  aggregateKind?: string | null;
  identityColumns?: string[] | null;
  periodAggregationRule?: string | null;
  metricMappingsJson?: string | null;
}

export interface WorkAssignmentBasicSummaryRuleDto {
  targetKind: "FIELD" | "TABLE" | string;
  targetKey: string;
  operation: string;
}

export interface WorkAssignmentBasicSummaryDefaultMethodsDto {
  number?: string | null;
  date?: string | null;
  boolean?: string | null;
  text?: string | null;
  selection?: string | null;
}

export interface WorkAssignmentBasicSummarySourceViewRequestDto {
  q?: string | null;
  periodKey?: string | null;
  unitId?: string | null;
  assigneeUserId?: string | null;
  page?: number;
  pageSize?: number;
}

export interface WorkAssignmentBasicSummaryRequest {
  scopeAssignmentId: string;
  dynamicFormTemplateId?: string | null;
  selectedUnitIds?: string[] | null;
  periodScopeMode?: string | null;
  periodKey?: string | null;
  periodKeyFrom?: string | null;
  periodKeyTo?: string | null;
  defaultMethods?: WorkAssignmentBasicSummaryDefaultMethodsDto | null;
  rules?: WorkAssignmentBasicSummaryRuleDto[] | null;
  sourceView?: WorkAssignmentBasicSummarySourceViewRequestDto | null;
  forceRefresh?: boolean;
  includeSourceRows?: boolean;
  maxTextChars?: number;
}

export interface WorkAssignmentBasicSummaryConfigDto {
  id?: string | null;
  workId: string;
  assignmentId: string;
  dynamicFormTemplateId: string;
  defaultMethods: WorkAssignmentBasicSummaryDefaultMethodsDto;
  rules: WorkAssignmentBasicSummaryRuleDto[];
  versionNo: number;
  isActive: boolean;
}

export interface SaveWorkAssignmentBasicSummaryConfigRequest {
  defaultMethods?: WorkAssignmentBasicSummaryDefaultMethodsDto | null;
  rules?: WorkAssignmentBasicSummaryRuleDto[] | null;
}

export interface WorkAssignmentBasicSummaryMetaDto {
  summaryType?: "BASIC" | string;
  contractVersion?: string | null;
  snapshotPayloadKind?: string | null;
  snapshotId: string;
  scopeAssignmentId: string;
  scopeMode: string;
  assignmentType: string;
  dynamicFormTemplateId: string;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  selectedUnitIds: string[];
  periodScopeMode?: string | null;
  periodKey?: string | null;
  periodKeyFrom?: string | null;
  periodKeyTo?: string | null;
  sourceAssignmentCount: number;
  sourceReportCount: number;
  fromSnapshot: boolean;
  snapshotDirty: boolean;
  snapshotDirtyAtUtc?: string | null;
  snapshotRefreshedAtUtc?: string | null;
  sourceSignatureHash?: string | null;
  isCalculating?: boolean;
  calculationStatus?: "QUEUED" | "RUNNING" | "DONE" | "FAILED" | string | null;
  calculationJobId?: string | null;
  calculationCorrelationId?: string | null;
  calculationQueuedAtUtc?: string | null;
  calculationStartedAtUtc?: string | null;
  calculationFinishedAtUtc?: string | null;
  calculationError?: string | null;
}

export interface WorkAssignmentBasicSummaryBucketDto {
  key: string;
  label: string;
  count: number;
}

export interface WorkAssignmentBasicSummaryItemDto {
  targetKind: "FIELD" | "TABLE" | string;
  targetKey: string;
  fieldId?: string | null;
  fieldKey?: string | null;
  blockId?: string | null;
  tableMode?: string | null;
  metricKey?: string | null;
  rowKey?: string | null;
  columnKey?: string | null;
  index?: number | null;
  label: string;
  dataType: string;
  operation: string;
  value?: unknown;
  valueCount: number;
  reportCount: number;
  sum?: number | null;
  min?: number | null;
  max?: number | null;
  mean?: number | null;
  trueCount?: number | null;
  falseCount?: number | null;
  minDateUtc?: string | null;
  maxDateUtc?: string | null;
  text?: string | null;
  textCharCount?: number | null;
  textTruncated: boolean;
  buckets: WorkAssignmentBasicSummaryBucketDto[];
}

export interface WorkAssignmentBasicSummarySourceDto {
  workAssignmentId: string;
  workAssignmentReportId: string;
  workReportPeriodId: string;
  assigneeUserId?: string | null;
  assigneeUsername?: string | null;
  assigneeFullName?: string | null;
  unitId?: string | null;
  unitSymbol?: string | null;
  unitShortName?: string | null;
  unitName?: string | null;
  periodKey: string;
  periodInstanceKey: string;
  periodKind: string;
  reportStatus: number;
  submittedAtUtc?: string | null;
  approvedAtUtc?: string | null;
  payloadUpdatedAtUtc?: string | null;
  payloadRevision: number;
  payloadHash?: string | null;
}

export interface WorkAssignmentBasicSummarySourcePageDto {
  rows: WorkAssignmentBasicSummarySourceDto[];
  totalRows: number;
  page: number;
  pageSize: number;
}

export interface WorkAssignmentBasicSummaryValueDto {
  value?: unknown;
  displayValue?: string | null;
  dataType: string;
  operation: string;
}

export interface WorkAssignmentBasicSummaryTableCellValueDto {
  metricKey: string;
  rowKey?: string | null;
  columnKey?: string | null;
  index?: number | null;
  value?: unknown;
  displayValue?: string | null;
  dataType: string;
  operation: string;
}

export interface WorkAssignmentBasicSummaryTableValuesDto {
  blockId: string;
  tableMode: string;
  values1D: unknown[];
  cells: WorkAssignmentBasicSummaryTableCellValueDto[];
}

export interface WorkAssignmentBasicSummaryValuesDto {
  fields: Record<string, WorkAssignmentBasicSummaryValueDto>;
  tables: WorkAssignmentBasicSummaryTableValuesDto[];
}

export interface WorkAssignmentBasicSummaryResponse {
  meta: WorkAssignmentBasicSummaryMetaDto;
  fields: WorkAssignmentBasicSummaryItemDto[];
  tables: WorkAssignmentBasicSummaryItemDto[];
  sources: WorkAssignmentBasicSummarySourceDto[];
  sourcesPage?: WorkAssignmentBasicSummarySourcePageDto | null;
  summaryValues?: WorkAssignmentBasicSummaryValuesDto | null;
  warnings: string[];
}
