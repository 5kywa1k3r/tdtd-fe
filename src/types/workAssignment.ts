import type { UserRefDTO } from "./userRefDto";

export type AssignmentType = "ONCE" | "PERIODIC_REPORT";
export type AggregationType = "MATRIX" | "UNIT_ROW_COL";
export type ReportCycleType = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL";
export type ComputationType = "SUM" | "MEAN" | "MAX" | "MIN";
export type DynamicFormDataSourceRuleType =
  | "MANUAL"
  | "AGGREGATE_CHILDREN"
  | "MAP_CHILD"
  | "MIXED";

export type DynamicFormSectionDataSourceRule = {
  sectionId: string;
  sourceRule: DynamicFormDataSourceRuleType;
  sourceAssignmentIds?: string[];
  sourceSectionId?: string | null;
  sourceBlockId?: string | null;
  sourceFieldId?: string | null;
  note?: string | null;
};

export type DynamicFormDataSourceRulesDocument = {
  version: number;
  sectionRules: DynamicFormSectionDataSourceRule[];
  fieldRules?: unknown[];
  blockRules?: unknown[];
};

export type WorkAssignmentAutoApproveConditionOperator =
  | "eq"
  | "neq"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "notEmpty";

export type WorkAssignmentAutoApproveConditionDocument = {
  version: number;
  enabled: boolean;
  fieldId?: string | null;
  fieldKey?: string | null;
  fieldType?: string | null;
  operator: WorkAssignmentAutoApproveConditionOperator;
  value?: string | number | boolean | null;
};

export type QuarterDayRuleDto = { quarter: number; days: number[] };
export type SemiAnnualDayRuleDto = { half: number; days: number[] };

export type AssignmentScheduleDto = {
  cycleType?: ReportCycleType | null;
  startDate?: string | null;
  weekDays?: number[] | null;
  monthDays?: number[] | null;
  quarterDays?: QuarterDayRuleDto[] | null;
  semiAnnualDays?: SemiAnnualDayRuleDto[] | null;
  note?: string | null;
};

export type WorkAssignmentAssigneeRef = {
  userId: string;
  username?: string | null;
  fullName?: string | null;
  unitId?: string | null;
  unitSymbol?: string | null;
  unitShortName?: string | null;
  unitName?: string | null;
  positionCode?: string | null;
  positionName?: string | null;
};

export type WorkAssignmentStatusFields = {
  progressStatus: number;
  progressStatusUpdatedAtUtc?: string | null;
  latestPeriodKey?: string | null;
  latestDueAtUtc?: string | null;
  hasAnyDuePeriod: boolean;
  hasOverduePeriod: boolean;

  evaluationCode?: string | null;
  evaluationLabel?: string | null;
  hasManualEvaluations?: boolean;
  evaluatedAssignmentCount?: number;
  worstEvaluationCode?: string | null;
  worstEvaluationLabel?: string | null;

  worstPeriodStatus?: number | null;
  worstOverdueReasonCode?: string | null;
  worstOverdueReasonLabel?: string | null;
};

export type WorkAssignmentListResponse = WorkAssignmentStatusFields & {
  id: string;
  workId: string;

  dynamicExcelId: string;
  dynamicExcelCode: string;
  dynamicExcelName: string;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  dynamicFormDataSourceRulesJson?: string | null;
  autoApproveConditionJson?: string | null;

  assignmentType: AssignmentType;
  aggregationType: AggregationType;

  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  completedAtUtc?: string | null;
  completedByUserId?: string | null;
  dueAtUtc?: string | null;

  assignees: WorkAssignmentAssigneeRef[];
  leaderWatchers?: UserRefDTO[] | null;

  description?: string | null;
  isActive: boolean;
  allowUserCreatedReports?: boolean;

  createdAtUtc: string;
  updatedAtUtc: string;

  parentAssignmentId?: string | null;
  rootAssignmentId: string;
  level: number;
  code: string;
  path: string;

  evaluationTemplateId?: string | null;
  evaluationTemplateCode?: string | null;
  evaluationTemplateLabel?: string | null;
};

export type WorkAssignmentResponse = WorkAssignmentStatusFields & {
  id: string;
  workId: string;

  dynamicExcelId: string;
  dynamicExcelCode: string;
  dynamicExcelName: string;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  dynamicFormDataSourceRulesJson?: string | null;
  autoApproveConditionJson?: string | null;

  workType: string;
  assignmentType: AssignmentType;
  aggregationType: AggregationType;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  completedAtUtc?: string | null;
  completedByUserId?: string | null;
  dueAtUtc?: string | null;

  schedule?: AssignmentScheduleDto | null;

  assignees: WorkAssignmentAssigneeRef[];
  leaderWatcherUserIds?: string[] | null;
  leaderWatchers?: UserRefDTO[] | null;

  description?: string | null;
  isActive: boolean;
  allowUserCreatedReports?: boolean;

  createdAtUtc: string;
  updatedAtUtc: string;

  parentAssignmentId?: string | null;
  rootAssignmentId: string;
  level: number;
  code: string;
  path: string;

  evaluationTemplateId?: string | null;
  evaluationTemplateCode?: string | null;
  evaluationTemplateLabel?: string | null;

  hasData?: boolean;
  templateLocked?: boolean;
  evaluationNote?: string | null;
  evaluatedAtUtc?: string | null;
  evaluatedByUserId?: string | null;
};

export type SaveWorkAssignmentRequest = {
  parentAssignmentId?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicFormDataSourceRulesJson?: string | null;
  autoApproveConditionJson?: string | null;
  assignmentType: AssignmentType;
  aggregationType: AggregationType;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  dueAtUtc?: string | null;
  schedule?: AssignmentScheduleDto | null;
  assigneeUserIds: string[];
  assigneeUnitIds?: string[];
  leaderWatcherUserIds?: string[];
  description?: string | null;
  isActive?: boolean;
  allowUserCreatedReports?: boolean;
};

export type UpdateWorkAssignmentDataSourceRulesRequest = {
  dynamicFormDataSourceRulesJson?: string | null;
};

export type UpdateWorkAssignmentAutoApproveConditionRequest = {
  autoApproveConditionJson?: string | null;
};

export type HandoverWorkAssignmentRequest = {
  fromAssigneeUserId: string;
  toAssigneeUserId: string;
  reason?: string | null;
  comment?: string | null;
};

export type WorkAssignmentHandoverResponse = {
  assignment: WorkAssignmentResponse;
  fromAssigneeUserId: string;
  toAssigneeUserId: string;
  workTemplateAssigneeId: string;
  periodCount: number;
  reportCount: number;
  queueItemCount: number;
};

export type AssignmentDraft = {
  localId: string;
  id?: string;
  workId?: string;
  parentAssignmentId?: string | null;
  createMode?: "root" | "child";

  dynamicExcelId: string;
  dynamicExcelCode?: string;
  dynamicExcelName?: string;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  dynamicFormDataSourceRulesJson?: string | null;
  autoApproveConditionJson?: string | null;

  assignmentType: AssignmentType;
  aggregationType: AggregationType;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  completedAtUtc?: string | null;
  completedByUserId?: string | null;
  dueAtUtc?: string | null;
  schedule: AssignmentScheduleDto | null;

  assigneeUserIds: string[];
  assigneeRefs?: WorkAssignmentAssigneeRef[];
  leaderWatcherUserIds: string[];
  leaderWatcherRefs?: UserRefDTO[];

  description?: string | null;
  isActive: boolean;
  allowUserCreatedReports?: boolean;

  progressStatus?: number;
  progressStatusUpdatedAtUtc?: string | null;
  latestPeriodKey?: string | null;
  latestDueAtUtc?: string | null;
  hasAnyDuePeriod?: boolean;
  hasOverduePeriod?: boolean;

  evaluationTemplateId?: string | null;
  evaluationTemplateCode?: string | null;
  evaluationTemplateLabel?: string | null;
  evaluationCode?: string | null;
  evaluationLabel?: string | null;
  hasManualEvaluations?: boolean;
  evaluatedAssignmentCount?: number;
  worstEvaluationCode?: string | null;
  worstEvaluationLabel?: string | null;

  mode: "create" | "edit" | "view";
  isDirty?: boolean;
  templateLocked?: boolean;
  hasData?: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;
};

export function emptyAssignmentDraft(): AssignmentDraft {
  return {
    localId: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    parentAssignmentId: null,
    createMode: "root",
    dynamicExcelId: "",
    dynamicExcelCode: "",
    dynamicExcelName: "",
    dynamicFormTemplateId: "",
    dynamicFormTemplateCode: "",
    dynamicFormTemplateName: "",
    dynamicFormDataSourceRulesJson: null,
    autoApproveConditionJson: null,
    assignmentType: "ONCE",
    aggregationType: "MATRIX",
    startDate: null,
    dueDate: null,
    completedDate: null,
    schedule: null,
    assigneeUserIds: [],
    assigneeRefs: [],
    leaderWatcherUserIds: [],
    leaderWatcherRefs: [],
    description: "",
    isActive: true,
    allowUserCreatedReports: true,
    progressStatus: 0,
    progressStatusUpdatedAtUtc: null,
    latestPeriodKey: null,
    latestDueAtUtc: null,
    hasAnyDuePeriod: false,
    hasOverduePeriod: false,
    evaluationTemplateId: null,
    evaluationTemplateCode: null,
    evaluationTemplateLabel: null,
    evaluationCode: null,
    evaluationLabel: null,
    hasManualEvaluations: false,
    evaluatedAssignmentCount: 0,
    worstEvaluationCode: null,
    worstEvaluationLabel: null,
    mode: "create",
    isDirty: true,
    templateLocked: false,
    hasData: false,
    dueAtUtc: null
  };
}

export function toAssignmentDraft(x: WorkAssignmentResponse): AssignmentDraft {
  return {
    localId: `assignment_${x.id}`,
    id: x.id,
    workId: x.workId,
    parentAssignmentId: x.parentAssignmentId ?? null,
    createMode: x.parentAssignmentId ? "child" : "root",
    dynamicExcelId: x.dynamicExcelId,
    dynamicExcelCode: x.dynamicExcelCode,
    dynamicExcelName: x.dynamicExcelName,
    dynamicFormTemplateId: x.dynamicFormTemplateId ?? null,
    dynamicFormTemplateCode: x.dynamicFormTemplateCode ?? null,
    dynamicFormTemplateName: x.dynamicFormTemplateName ?? null,
    dynamicFormDataSourceRulesJson: x.dynamicFormDataSourceRulesJson ?? null,
    autoApproveConditionJson: x.autoApproveConditionJson ?? null,
    assignmentType: x.assignmentType,
    aggregationType: x.aggregationType,
    startDate: x.startDate ?? null,
    dueDate: x.dueDate ?? null,
    completedDate: x.completedDate ?? null,
    completedAtUtc: x.completedAtUtc ?? null,
    completedByUserId: x.completedByUserId ?? null,
    schedule: x.schedule ?? null,
    assigneeUserIds: Array.isArray(x.assignees) ? x.assignees.map((a) => a.userId).filter(Boolean) : [],
    assigneeRefs: x.assignees ?? [],
    leaderWatcherUserIds: Array.isArray(x.leaderWatcherUserIds) ? x.leaderWatcherUserIds : [],
    leaderWatcherRefs: x.leaderWatchers ?? [],
    description: x.description ?? "",
    isActive: Boolean(x.isActive ?? true),
    allowUserCreatedReports: Boolean(x.allowUserCreatedReports ?? true),
    progressStatus: x.progressStatus ?? 0,
    progressStatusUpdatedAtUtc: x.progressStatusUpdatedAtUtc ?? null,
    latestPeriodKey: x.latestPeriodKey ?? null,
    latestDueAtUtc: x.latestDueAtUtc ?? null,
    hasAnyDuePeriod: x.hasAnyDuePeriod ?? false,
    hasOverduePeriod: x.hasOverduePeriod ?? false,
    evaluationTemplateId: x.evaluationTemplateId ?? null,
    evaluationTemplateCode: x.evaluationTemplateCode ?? null,
    evaluationTemplateLabel: x.evaluationTemplateLabel ?? null,
    evaluationCode: x.evaluationCode ?? null,
    evaluationLabel: x.evaluationLabel ?? null,
    hasManualEvaluations: x.hasManualEvaluations ?? false,
    evaluatedAssignmentCount: x.evaluatedAssignmentCount ?? 0,
    worstEvaluationCode: x.worstEvaluationCode ?? null,
    worstEvaluationLabel: x.worstEvaluationLabel ?? null,
    mode: "view",
    isDirty: false,
    templateLocked: x.templateLocked ?? false,
    hasData: x.hasData ?? false,
    createdAtUtc: x.createdAtUtc,
    updatedAtUtc: x.updatedAtUtc,
    dueAtUtc: x.dueAtUtc
  };
}

export type CompleteWorkAssignmentRequest = {
  completedDate?: string | null;
  note?: string | null;
};
