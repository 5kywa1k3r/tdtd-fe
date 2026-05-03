export type PeriodScopeMode =
  | "SINGLE_PERIOD"
  | "PERIOD_RANGE"
  | "CUMULATIVE_TO_PERIOD"
  | "ALL_PERIODS";
export type SourceStatusMode = "APPROVED_ONLY" | "APPROVED_AND_SUBMITTED";
export type AggregateScopeMode = "DIRECT_CHILDREN" | "SUBTREE";
export type AggregateMode =
  | "SUM_BY_CELL"
  | "HORIZONTAL_BY_USER"
  | "VERTICAL_BY_USER";

export type AggregateMetricOption = {
  metricKey: string;
  rowKey?: string | null;
  columnKey?: string | null;
  index?: number | null;
  label?: string | null;
};

export type AggregateFilterState = {
  dynamicExcelId: string;
  scopeMode: AggregateScopeMode;
  metricKeys: string[];
  selectedUnitIds: string[];
  periodScopeMode: PeriodScopeMode;
  periodDate: string;
  periodDateFrom: string;
  periodDateTo: string;
  sourceStatusMode: SourceStatusMode;
  aggregateMode: AggregateMode;
};

export type ReportRect = {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
};

export type HeaderSpec =
  | {
      kind: "TOP";
      topRows: number;
      topCols: number;
      dataRows: number;
    }
  | {
      kind: "LEFT";
      leftRows: number;
      leftCols: number;
      dataCols: number;
    }
  | {
      kind: "MATRIX";
      topRows: number;
      topCols: number;
      leftRows: number;
      leftCols: number;
    };

export type DynamicExcelSpecLike = {
  headerSpec?: HeaderSpec;
};
