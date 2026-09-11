import { baseApi } from "./base/baseApi";

export type StatisticDiffSourceKind = "FIELD" | "TABLE";
export type StatisticDiffPeriodCompareMode = "SAME_PERIOD" | "PREVIOUS_PERIOD";
export type StatisticDiffOperator =
  | "CHANGED"
  | "DELTA"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "BUCKET_CHANGED"
  | "MISSING";
export type StatisticDiffJoinKey = "PERIOD" | "ROW_KEY";

export type StatisticDiffTarget = {
  sourceKind: StatisticDiffSourceKind | string;
  dynamicFormTemplateId?: string | null;
  fieldId?: string | null;
  fieldKey?: string | null;
  statisticLabelCode?: string | null;
  blockId?: string | null;
  metricKey?: string | null;
  metricLabelCode?: string | null;
  rowKey?: string | null;
  columnKey?: string | null;
  conceptCode?: string | null;
  bucketKey?: string | null;
  sourceScopeMode?: string | null;
  sourceFlowInstanceId?: string | null;
  sourceFlowStepId?: string | null;
  sourceFlowBranchId?: string | null;
  sourceFlowEffectiveStatus?: string | null;
};

export type StatisticDiffConfig = {
  id: string;
  workId: string;
  assignmentId: string;
  dynamicFormTemplateId?: string | null;
  name: string;
  current: StatisticDiffTarget;
  comparison: StatisticDiffTarget;
  periodCompareMode: StatisticDiffPeriodCompareMode | string;
  operator: StatisticDiffOperator | string;
  joinKey: StatisticDiffJoinKey | string;
  requireSameConcept: boolean;
  configJson: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type StatisticDiffConfigQuery = {
  workId: string;
  assignmentId?: string | null;
  dynamicFormTemplateId?: string | null;
};

export type StatisticDiffSaveRequest = {
  id?: string | null;
  workId?: string | null;
  assignmentId?: string | null;
  dynamicFormTemplateId?: string | null;
  name?: string | null;
  current?: StatisticDiffTarget | null;
  comparison?: StatisticDiffTarget | null;
  periodCompareMode?: StatisticDiffPeriodCompareMode | string | null;
  operator?: StatisticDiffOperator | string | null;
  joinKey?: StatisticDiffJoinKey | string | null;
  requireSameConcept?: boolean | null;
  configJson?: string | null;
};

export type StatisticDiffRunRequest = {
  configId?: string | null;
  workId?: string | null;
  assignmentId?: string | null;
  dynamicFormTemplateId?: string | null;
  current?: StatisticDiffTarget | null;
  comparison?: StatisticDiffTarget | null;
  periodKey?: string | null;
  periodCompareMode?: StatisticDiffPeriodCompareMode | string | null;
  operator?: StatisticDiffOperator | string | null;
  joinKey?: StatisticDiffJoinKey | string | null;
  requireSameConcept?: boolean | null;
  selectedUnitIds?: string[] | null;
  assigneeUserId?: string | null;
  reportStatus?: number | null;
  limit?: number | null;
};

export type StatisticDiffValue = {
  sourceKind: string;
  label?: string | null;
  conceptCode?: string | null;
  dataCategory?: string | null;
  valueSignature?: string | null;
  numericValue?: number | null;
  valueCount: number;
  reportCount: number;
  bucketKey?: string | null;
  bucketLabel?: string | null;
};

export type StatisticDiffRow = {
  key: string;
  currentPeriodKey: string;
  comparisonPeriodKey: string;
  rowKey?: string | null;
  conceptCode?: string | null;
  dataCategory?: string | null;
  current?: StatisticDiffValue | null;
  comparison?: StatisticDiffValue | null;
  delta?: number | null;
  changed: boolean;
  matchesOperator: boolean;
  missingSide?: string | null;
};

export type StatisticDiffRunResponse = {
  workId: string;
  assignmentId: string;
  configId?: string | null;
  currentPeriodKey: string;
  comparisonPeriodKey: string;
  periodCompareMode: string;
  operator: string;
  joinKey: string;
  requireSameConcept: boolean;
  currentSourceAssignmentCount: number;
  comparisonSourceAssignmentCount: number;
  currentProjectionCount: number;
  comparisonProjectionCount: number;
  comparedRowCount: number;
  matchedOperatorCount: number;
  truncated: boolean;
  rows: StatisticDiffRow[];
};

export const statisticDiffApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listStatisticDiffConfigs: build.query<StatisticDiffConfig[], StatisticDiffConfigQuery>({
      query: (params) => ({
        url: "work-report-statistic-diffs/configs",
        method: "GET",
        params,
      }),
      providesTags: [{ type: "StatisticDiffConfig", id: "LIST" }],
    }),

    saveStatisticDiffConfig: build.mutation<StatisticDiffConfig, StatisticDiffSaveRequest>({
      query: (data) => ({
        url: "work-report-statistic-diffs/configs",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "StatisticDiffConfig", id: "LIST" }],
    }),

    deleteStatisticDiffConfig: build.mutation<void, string>({
      query: (configId) => ({
        url: `work-report-statistic-diffs/configs/${configId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "StatisticDiffConfig", id: "LIST" }],
    }),

    runStatisticDiff: build.mutation<StatisticDiffRunResponse, StatisticDiffRunRequest>({
      query: (data) => ({
        url: "work-report-statistic-diffs/run",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "StatisticDiffResult", id: "RUN" }],
    }),
  }),
});

export const {
  useListStatisticDiffConfigsQuery,
  useSaveStatisticDiffConfigMutation,
  useDeleteStatisticDiffConfigMutation,
  useRunStatisticDiffMutation,
} = statisticDiffApi;
