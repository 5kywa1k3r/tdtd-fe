export type DynamicFieldType = 'TEXT' | 'SHEET';
export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

export interface DateRangeISO {
  from: string; // ISO
  to: string;   // ISO
}

export interface DynamicFieldConfig {
  type: DynamicFieldType;
  range: DateRangeISO;

  // TEXT
  textMode?: 'PLAIN' | 'RICH';
  // SHEET
  sheetTemplateId?: string;
  sheetOptions?: {
    aggregateMode: 'SUM_CELLS' | 'MERGE_BLOCKS';
    sumOnlyNumeric?: boolean;
    textJoinDelimiter?: string;
  };

  // aggregation choice for text
  textAggregate?: 'JOIN' | 'FIRST_NON_EMPTY' | 'LATEST';
  effectiveRule?: 'PREFER_REPORTED' | 'PREFER_SUPPLEMENT' | 'MERGE';
}

export interface DynamicField {
  id: string;         // per version
  fieldKey: string;   // stable logical key
  name: string;
  description?: string;
  config: DynamicFieldConfig;
  isActive: boolean;  // retire = false
  retiredAt?: string;
  updatedAt?: string;
}

export interface DynamicSection {
  id: string;
  title: string;
  description?: string;
  columns: 1 | 2 | 3 | 4;
  fieldOrder: string[]; // list of fieldKey in order
}

export interface SchemaVersion {
  id: string;
  workId: string;
  versionNo: number;
  createdAt: string;
  createdBy?: string;
  note?: string;

  sections: DynamicSection[];
  fields: Record<string /*fieldKey*/, DynamicField>;
}

export type UnitReportStatus = 'DRAFT' | 'SUBMITTED' | 'RETURNED';

export interface UnitFieldValue {
  workId: string;
  schemaVersionId: string;
  unitId: string;
  fieldKey: string;

  valueReported?: any;    // text or sheet json
  valueSupplement?: any;  // overlay by parent
  updatedAt?: string;

  status: UnitReportStatus;
}

export type ChangeSource =
  | 'NORMAL_SUBMIT'
  | 'SUPPLEMENT_SELF'
  | 'SUPPLEMENT_REQUEST';

export interface UnitFieldRevision {
  id: string;
  workId: string;
  schemaVersionId: string;
  unitId: string;
  fieldKey: string;

  changedAt: string;
  changedBy?: string; // userId
  changedByUnitId?: string;

  changeSource: ChangeSource;
  windowId?: string;

  oldValue?: any;
  newValue?: any;

  // optional: which layer changed
  layer?: 'REPORTED' | 'SUPPLEMENT';
}

export type SupplementMode = 'SELF_SUPPLEMENT' | 'REQUEST_SUBORDINATE';
export type SupplementStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface SupplementWindow {
  id: string;
  workId: string;
  schemaVersionId: string;
  unitId: string;
  fieldKey: string;

  mode: SupplementMode;
  status: SupplementStatus;

  openedByUnitId: string;
  openedAt: string;
  closedAt?: string;

  note?: string;
  deadline?: string;
}

export type MergeStrategy = 'LATEST_VERSION_WINS' | 'MERGE_ALL';

export interface AggregationSelection {
  workId: string;
  versionIds: string[];
  fieldKeys: string[];
  strategy: MergeStrategy;
}
