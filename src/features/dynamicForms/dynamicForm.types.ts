export type DynamicFormFieldType =
  | "shortText"
  | "longText"
  | "stringList"
  | "number"
  | "date"
  | "fullDate"
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

export type DynamicFormMetricLabelRange = {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
};

export type DynamicFormMetricLabelTarget = {
  targetKind: "METRIC" | "RANGE";
  statisticLabelCode: string;
  metricKey?: string | null;
  range?: DynamicFormMetricLabelRange | null;
  dataType?: string | null;
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
  key?: string | null;
  name?: string | null;
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
