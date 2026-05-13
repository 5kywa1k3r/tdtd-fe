import type {
  DashboardNodeAssigneeDto,
  DashboardNodeReportSummaryDto,
  DashboardProgressCountDto,
} from "./dashboard";
import type { PagedResult } from "./pagedResult";

export type DashboardMindMapBucket =
  | "ALL"
  | "TODO"
  | "DONE"
  | "PENDING"
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "OVERDUE";

export type DashboardMindMapScopeRequest = {
  fromUtc?: string | null;
  toUtc?: string | null;
  unitIds: string[];
};

export type DashboardMindMapFilters = {
  fromDate: string;
  toDate: string;
  unitIds: string[];
};

export type DashboardNodeManualEvaluationDto = {
  hasManualEvaluations: boolean;
  evaluatedAssignmentCount: number;
  evaluationCode?: string | null;
  evaluationLabel?: string | null;
  worstEvaluationCode?: string | null;
  worstEvaluationLabel?: string | null;
};

export type DashboardMindMapWorkDto = {
  id: string;
  code: string;
  name: string;
  status: number;
  activeRootAssignmentCount: number;
  hasOverduePeriod: boolean;
  hasManualEvaluations: boolean;
  worstEvaluationCode?: string | null;
  worstEvaluationLabel?: string | null;
  rootAssignmentProgressCounts: DashboardProgressCountDto;
};

export type DashboardMindMapNodeDto = {
  id: string;
  workId: string;
  parentAssignmentId?: string | null;
  rootAssignmentId: string;
  level: number;
  code: string;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  dynamicExcelCode: string;
  dynamicExcelName: string;
  description?: string | null;
  summaryText: string;
  isActive: boolean;
  progressStatus: number;
  hasAnyDuePeriod: boolean;
  hasOverduePeriod: boolean;
  worstPeriodStatus?: number | null;
  worstOverdueReasonCode?: string | null;
  worstOverdueReasonLabel?: string | null;
  latestDueAtUtc?: string | null;
  activeChildCount: number;
  hasChildren: boolean;
  manualEvaluation: DashboardNodeManualEvaluationDto;
  reportSummary: DashboardNodeReportSummaryDto;
  assignees: DashboardNodeAssigneeDto[];
  childProgressCounts: DashboardProgressCountDto;
};

export type DashboardMindMapWorkResponse = {
  work: DashboardMindMapWorkDto;
  rootAssignments: PagedResult<DashboardMindMapNodeDto>;
};

export type DashboardMindMapCursorResult<T> = {
  rows: T[];
  totalRows: number;
  limit: number;
  nextCursor?: string | null;
  hasMore: boolean;
};

export type DashboardMindMapTemplateGroupDto = {
  assignmentId: string;
  dynamicFormTemplateId: string;
  dynamicFormTemplateCode: string;
  dynamicFormTemplateName: string;
  dynamicExcelId?: string | null;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
  userCount: number;
  reportCount: number;
  overdueCount: number;
  latestDueAtUtc?: string | null;
  reportBar: DashboardStackedBarDto;
};

export type DashboardMindMapTemplateUserDto = {
  assignmentId: string;
  dynamicFormTemplateId: string;
  dynamicFormTemplateCode: string;
  dynamicFormTemplateName: string;
  dynamicExcelId?: string | null;
  assigneeUserId: string;
  assigneeUsername: string;
  assigneeFullName: string;
  unitId?: string | null;
  unitLabel?: string | null;
  totalReports: number;
  overdueCount: number;
  latestDueAtUtc?: string | null;
  reportBar: DashboardStackedBarDto;
};

export type DashboardMindMapTemplateReportsSearchRequest = {
  assigneeUserIds: string[];
  statusBuckets?: DashboardMindMapBucket[];
  fromUtc?: string | null;
  toUtc?: string | null;
  q?: string | null;
  cursor?: string | null;
  limit?: number;
};

export type DashboardMindMapNodeChildrenSearchRequest = DashboardMindMapScopeRequest & {
  page?: number;
  pageSize?: number;
};

export type DashboardMindMapNodeUnitsSearchRequest = DashboardMindMapScopeRequest & {
  bucket?: DashboardMindMapBucket | null;
  q?: string | null;
  page?: number;
  pageSize?: number;
};

export type DashboardMindMapNodeReportsSearchRequest = DashboardMindMapScopeRequest & {
  bucket?: DashboardMindMapBucket | null;
  q?: string | null;
  page?: number;
  pageSize?: number;
};

export type DashboardMindMapTableMetricReportsSearchRequest = DashboardMindMapScopeRequest & {
  dynamicFormTemplateId?: string | null;
  dynamicExcelTemplateId?: string | null;
  blockId?: string | null;
  tableMode?: string | null;
  metricKey: string;
  reportStatus?: number | null;
  page?: number;
  pageSize?: number;
};

export type DashboardMindMapFieldMetricReportsSearchRequest = DashboardMindMapScopeRequest & {
  dynamicFormTemplateId?: string | null;
  fieldId: string;
  bucketKey?: string | null;
  reportStatus?: number | null;
  page?: number;
  pageSize?: number;
};

export type DashboardMindMapLabelReportsSearchRequest = DashboardMindMapScopeRequest & {
  dynamicFormTemplateId?: string | null;
  dynamicExcelTemplateId?: string | null;
  blockId?: string | null;
  labelCode: string;
  reportStatus?: number | null;
  page?: number;
  pageSize?: number;
};

export type DashboardStackedBarSegmentDto = {
  key: DashboardMindMapBucket | string;
  label: string;
  value: number;
  color: string;
};

export type DashboardStackedBarDto = {
  key: string;
  label: string;
  total: number;
  segments: DashboardStackedBarSegmentDto[];
};

export type DashboardMindMapLabelSummaryDto = {
  labelCode: string;
  labelName?: string | null;
  labelColor?: string | null;
  rowCount: number;
  reportCount: number;
  scopeType: string;
  scopeId: string;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateName?: string | null;
  dynamicExcelTemplateId?: string | null;
  blockId: string;
};

export type DashboardMindMapTableSummaryDto = {
  scopeType: string;
  scopeId: string;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateName?: string | null;
  dynamicExcelTemplateId?: string | null;
  blockId: string;
  tableMode: string;
  metricKey: string;
  rowKey: string;
  columnKey: string;
  valueCount: number;
  sum: number;
  min?: number | null;
  max?: number | null;
  average?: number | null;
  reportCount: number;
};

export type DashboardMindMapFieldSummaryDto = {
  scopeType: string;
  scopeId: string;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateName?: string | null;
  fieldId: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  bucketKey?: string | null;
  bucketLabel?: string | null;
  valueCount: number;
  numericValueCount: number;
  sum?: number | null;
  min?: number | null;
  max?: number | null;
  average?: number | null;
  trueCount: number;
  falseCount: number;
  latestDateUtc?: string | null;
  reportCount: number;
};

export type DashboardMindMapNodeSummaryDto = {
  node: DashboardMindMapNodeDto;
  descendantAssignmentCount: number;
  activeAssignmentCount: number;
  totalAssigneeCount: number;
  reportSummary: DashboardNodeReportSummaryDto;
  unitBar: DashboardStackedBarDto;
  reportBar: DashboardStackedBarDto;
  labelSummaries: DashboardMindMapLabelSummaryDto[];
  tableSummaries: DashboardMindMapTableSummaryDto[];
  fieldSummaries: DashboardMindMapFieldSummaryDto[];
};

export type DashboardMindMapUnitRowDto = {
  assigneeUserId?: string | null;
  assigneeUsername?: string | null;
  assigneeFullName?: string | null;
  unitId?: string | null;
  unitLabel?: string | null;
  bucket: DashboardMindMapBucket;
  totalReports: number;
  todoCount: number;
  doneCount: number;
  overdueCount: number;
  latestPeriodKey?: string | null;
  latestDueAtUtc?: string | null;
  currentProgressStatus?: string | null;
  difficulties?: string | null;
  lateReason?: string | null;
  returnReason?: string | null;
  reviewerComment?: string | null;
  worstOverdueReasonCode?: string | null;
  worstOverdueReasonLabel?: string | null;
};

export type DashboardMindMapReportRowDto = {
  workReportPeriodId: string;
  reportId?: string | null;
  assignmentId: string;
  assignmentCode?: string | null;
  assignmentName?: string | null;
  assigneeUserId?: string | null;
  assigneeFullName?: string | null;
  assigneeUsername?: string | null;
  unitId?: string | null;
  unitLabel?: string | null;
  bucket: DashboardMindMapBucket;
  periodKey?: string | null;
  periodStatus?: number | null;
  reportStatus?: number | null;
  dueAtUtc?: string | null;
  submittedAtUtc?: string | null;
  approvedAtUtc?: string | null;
  currentProgressStatus?: string | null;
  reportReason?: string | null;
  difficulties?: string | null;
  proposedSolution?: string | null;
  lateReason?: string | null;
  returnReason?: string | null;
  reviewerComment?: string | null;
  reviewerEvaluation?: string | null;
};

export type DashboardMindMapTableMetricReportRowDto = {
  workAssignmentReportId: string;
  workReportPeriodId: string;
  assignmentId: string;
  assignmentCode?: string | null;
  assignmentName: string;
  assigneeUserId?: string | null;
  assigneeFullName?: string | null;
  assigneeUsername?: string | null;
  unitId?: string | null;
  unitLabel?: string | null;
  periodKey: string;
  periodInstanceKey: string;
  periodKind: string;
  reportStatus: number;
  blockId: string;
  tableMode: string;
  metricKey: string;
  rowKey: string;
  columnKey: string;
  valueCount: number;
  sum: number;
  min?: number | null;
  max?: number | null;
  average?: number | null;
  sourceKeys: string[];
  submittedAtUtc?: string | null;
  approvedAtUtc?: string | null;
};

export type DashboardMindMapFieldMetricReportRowDto = {
  workAssignmentReportId: string;
  workReportPeriodId: string;
  assignmentId: string;
  assignmentCode?: string | null;
  assignmentName: string;
  assigneeUserId?: string | null;
  assigneeFullName?: string | null;
  assigneeUsername?: string | null;
  unitId?: string | null;
  unitLabel?: string | null;
  periodKey: string;
  periodInstanceKey: string;
  periodKind: string;
  reportStatus: number;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateName?: string | null;
  fieldId: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  bucketKey?: string | null;
  bucketLabel?: string | null;
  valueCount: number;
  numericValueCount: number;
  sum?: number | null;
  min?: number | null;
  max?: number | null;
  average?: number | null;
  trueCount: number;
  falseCount: number;
  latestDateUtc?: string | null;
  sourceKeys: string[];
  submittedAtUtc?: string | null;
  approvedAtUtc?: string | null;
};

export type DashboardMindMapLabelReportRowDto = {
  workAssignmentReportId: string;
  workReportPeriodId: string;
  assignmentId: string;
  assignmentCode?: string | null;
  assignmentName: string;
  assigneeUserId?: string | null;
  assigneeFullName?: string | null;
  assigneeUsername?: string | null;
  unitId?: string | null;
  unitLabel?: string | null;
  periodKey: string;
  periodInstanceKey: string;
  periodKind: string;
  reportStatus: number;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateName?: string | null;
  dynamicExcelTemplateId?: string | null;
  labelCode: string;
  labelName?: string | null;
  labelColor?: string | null;
  rowCount: number;
  blockIds: string[];
  rowKeys: string[];
  sources: string[];
  submittedAtUtc?: string | null;
  approvedAtUtc?: string | null;
};

export type DashboardMindMapNodeChildrenResult = PagedResult<DashboardMindMapNodeDto>;
export type DashboardMindMapCursorNodeResult = DashboardMindMapCursorResult<DashboardMindMapNodeDto>;
export type DashboardMindMapTemplateUsersResult = DashboardMindMapCursorResult<DashboardMindMapTemplateUserDto>;
export type DashboardMindMapTemplateReportsResult = DashboardMindMapCursorResult<DashboardMindMapReportRowDto>;
export type DashboardMindMapNodeUnitsResult = PagedResult<DashboardMindMapUnitRowDto>;
export type DashboardMindMapNodeReportsResult = PagedResult<DashboardMindMapReportRowDto>;
export type DashboardMindMapTableMetricReportsResult = PagedResult<DashboardMindMapTableMetricReportRowDto>;
export type DashboardMindMapFieldMetricReportsResult = PagedResult<DashboardMindMapFieldMetricReportRowDto>;
export type DashboardMindMapLabelReportsResult = PagedResult<DashboardMindMapLabelReportRowDto>;
