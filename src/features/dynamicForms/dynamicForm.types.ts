export type DynamicFormFieldType =
  | "shortText"
  | "longText"
  | "number"
  | "date"
  | "singleSelect"
  | "multiSelect"
  | "boolean";

export type DynamicFormStatisticConfig = {
  showInDetail: boolean;
  showInTree: boolean;
  aggregateOps: string[];
  bucketMode: "none" | "option" | "date";
};

export type DynamicFormTableMode =
  | "FIXED_GRID"
  | "APPEND_ROWS"
  | "APPEND_COLUMNS"
  | "MATRIX"
  | "SUMMARY_TEMPLATE";

export type DynamicFormTableIndexMapItem = {
  index: number;
  rowKey: string;
  columnKey: string;
  metricKey: string;
};

export type DynamicFormTableMetricRule = {
  metricKey: string;
  label?: string | null;
  sourceType: "TABLE_CELL" | "TABLE_ROW" | "TABLE_COLUMN" | "MATRIX_CELL";
  aggregateOps: string[];
  rowKey?: string | null;
  columnKey?: string | null;
};

export type DynamicFormStatisticColumnLabel = {
  columnIndex?: number | null;
  columnKey?: string | null;
  header?: string | null;
  statisticLabelCode: string;
  aggregateOps?: string[];
  showInDetail?: boolean;
  showInTree?: boolean;
};

export type DynamicFormStatisticColumn = {
  columnIndex?: number | null;
  columnKey?: string | null;
  header?: string | null;
  aggregateOps?: string[];
  showInDetail?: boolean;
  showInTree?: boolean;
};

export type DynamicFormSummaryTemplateRepeatFor =
  | "selectedUnits"
  | "scopeAssignments"
  | "none";

export type DynamicFormSummaryTemplateRowLayoutItem = {
  repeatFor: DynamicFormSummaryTemplateRepeatFor;
  rowsPerUnit: number;
  label?: string | null;
  metrics: string[];
};

export type DynamicFormSummaryTemplateOutputLayout = {
  sourceBlockId: string;
  sourceTableMode?: "FIXED_GRID" | "APPEND_ROWS" | "APPEND_COLUMNS" | "MATRIX" | null;
  groupBy: string[];
  rowLayout: DynamicFormSummaryTemplateRowLayoutItem[];
};

export type DynamicFormSection = {
  id: string;
  title: string;
  description?: string | null;
  tagCodes?: string[];
  order: number;
};

export type DynamicFormField = {
  id: string;
  sectionId: string;
  key: string;
  name?: string | null;
  displayName?: string | null;
  label: string;
  type: DynamicFormFieldType;
  required: boolean;
  colSpan: number;
  minHeight: number;
  order: number;
  options?: Array<{ code: string; label: string }>;
  statisticLabelCodes?: string[];
  isStatistic: boolean;
  statistic?: DynamicFormStatisticConfig;
};

export type DynamicFormEditorValue = {
  code?: string | null;
  name: string;
  description?: string | null;
  tagCodes: string[];
  schemaVersion: number;
  isActive: boolean;
  sections: DynamicFormSection[];
  fields: DynamicFormField[];
  excelBlockJson?: string | null;
  blocksJson?: string | null;
};

export type DynamicFormEditorSubmit = {
  code?: string | null;
  name: string;
  description?: string | null;
  tagCodes: string[] | null;
  schemaVersion: number;
  isActive: boolean;
  sectionsJson: string;
  fieldsJson: string;
  excelBlockJson?: string | null;
  blocksJson?: string | null;
};
