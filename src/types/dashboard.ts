import type { Dayjs } from "dayjs";

export type DashboardProgressCountDto = {
  notStarted: number;
  inProgress: number;
  completed: number;
  atRiskOverdue: number;
  overdue: number;
  total: number;
};

export type DashboardRangeDto = {
  fromUtc: string;
  toUtc: string;
  label: string;
};

export type DashboardOverviewMode =
  | "WORK_TASK"
  | "WORK_TARGET"
  | "ASSIGNMENT_RECEIVED"
  | "ASSIGNMENT_CREATED"
  | "REPORT";

export type DashboardOverviewRequest = {
  mode: DashboardOverviewMode;
  fromUtc?: string | null;
  toUtc?: string | null;
  unitIds: string[];
  assignmentId?: string | null;
  topUnitCount?: number;
  forceRefresh?: boolean;
};

export type DashboardOverviewMetricDto = {
  key: string;
  label: string;
  value: number;
  valueColor?: string | null;
  secondaryLabel?: string | null;
  secondaryValue?: string | number | null;
  category?: "summary" | "status" | null;
  description?: string | null;
};

export type DashboardPieSliceDto = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export type DashboardUnitBarSegmentDto = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export type DashboardUnitBarRowDto = {
  unitId?: string | null;
  unitLabel: string;
  total: number;
  segments: DashboardUnitBarSegmentDto[];
};

export type DashboardOverviewTableRowDto = {
  id: string;
  workId?: string | null;
  workCode?: string | null;
  workName?: string | null;
  workType?: string | null;
  workStatus?: number | null;

  assignmentId?: string | null;
  assignmentCode?: string | null;
  assignmentName?: string | null;
  assignmentProgressStatus?: number | null;

  firstAssigneeName?: string | null;
  firstAssigneeUsername?: string | null;
  unitId?: string | null;
  unitLabel?: string | null;

  reportTotal?: number;
  pendingCount?: number;
  draftCount?: number;
  submittedCount?: number;
  approvedCount?: number;
  overdueCount?: number;

  periodKey?: string | null;
  reportStatusKey?: string | null;
  dueAtUtc?: string | null;
  updatedAtUtc?: string | null;
};

export type DashboardOverviewResponse = {
  range: DashboardRangeDto;
  mode: DashboardOverviewMode;
  cards: DashboardOverviewMetricDto[];
  pie: DashboardPieSliceDto[];
  unitCharts: Record<string, DashboardUnitBarRowDto[]>;
  rows: DashboardOverviewTableRowDto[];
};

export type DashboardReportAssignmentOptionDto = {
  assignmentId: string;
  label: string;
  workId?: string | null;
  workName?: string | null;
  assignmentCode?: string | null;
  assignmentName?: string | null;
};

export type DashboardReportAssignmentOptionsRequest = {
  fromUtc?: string | null;
  toUtc?: string | null;
  unitIds: string[];
};

export type MyWorksDashboardRequest = {
  fromUtc?: string | null;
  toUtc?: string | null;
  unitIds: string[];
  keyword?: string | null;
  forceRefresh?: boolean;
};

export type MyWorkSummaryRowDto = {
  workId: string;
  workCode?: string | null;
  workName: string;
  workType?: string | null;
  status: number;
  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;
  updatedAtUtc?: string | null;
  activeRootAssignmentCount: number;
  rootAssignmentProgressCounts: DashboardProgressCountDto;
  hasManualEvaluations: boolean;
  evaluatedAssignmentCount: number;
  worstEvaluationCode?: string | null;
  worstEvaluationLabel?: string | null;
};

export type MyWorksDashboardSummaryDto = {
  totalWorks: number;
  activeRootAssignmentCount: number;
  manualEvaluatedWorkCount: number;
  rootAssignmentProgressCounts: DashboardProgressCountDto;
};

export type MyWorksDashboardResponse = {
  range: DashboardRangeDto;
  summary: MyWorksDashboardSummaryDto;
  works: MyWorkSummaryRowDto[];
};

export type DashboardNodeReportSummaryDto = {
  total: number;
  pendingCount: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  overduePendingCount: number;
  overdueDraftCount: number;
  overdueSubmittedCount: number;
  overdueApprovedCount?: number | null;
};

export type DashboardNodeAssigneeDto = {
  userId: string;
  username: string;
  fullName: string;
  unitId?: string | null;
  unitName?: string | null;
  unitSymbol?: string | null;
  unitShortName?: string | null;
};

export type WorkDashboardRootAssignmentRowDto = {
  assignmentId: string;
  workId: string;
  code?: string | null;
  dynamicExcelId: string;
  dynamicExcelCode: string;
  dynamicExcelName: string;
  description?: string | null;
  isActive: boolean;
  progressStatus: number;
  hasAnyDuePeriod: boolean;
  hasOverduePeriod: boolean;
  worstPeriodStatus?: number | null;
  worstOverdueReasonCode?: string | null;
  worstOverdueReasonLabel?: string | null;
  latestDueAtUtc?: string | null;
  activeChildCount: number;
  childProgressCounts: DashboardProgressCountDto;
  hasManualEvaluations: boolean;
  evaluatedAssignmentCount: number;
  evaluationCode?: string | null;
  evaluationLabel?: string | null;
  worstEvaluationCode?: string | null;
  worstEvaluationLabel?: string | null;
  reportSummary: DashboardNodeReportSummaryDto;
  assignees: DashboardNodeAssigneeDto[];
};

export type WorkDashboardDetailRequest = {
  fromUtc?: string | null;
  toUtc?: string | null;
  unitIds: string[];
  includeRootAssignments?: boolean;
  includeReportSummary?: boolean;
  forceRefresh?: boolean;
};

export type WorkDashboardDetailDto = {
  work: MyWorkSummaryRowDto;
  rootAssignments: WorkDashboardRootAssignmentRowDto[];
  reportSummary?: DashboardNodeReportSummaryDto | null;
};

export type DashboardDateRangeValue = {
  from: Dayjs | null;
  to: Dayjs | null;
};

export type DashboardPageFilters = {
  mode: DashboardOverviewMode;
  fromDate: string;
  toDate: string;
  unitIds: string[];
  assignmentId: string;
};

export type WorkDashboardDetailFilters = {
  fromDate: string;
  toDate: string;
  unitIds: string[];
  includeRootAssignments: boolean;
  includeReportSummary: boolean;
};

export type DashboardPieDatum = {
  key: string;
  label: string;
  value: number;
  color: string;
};
