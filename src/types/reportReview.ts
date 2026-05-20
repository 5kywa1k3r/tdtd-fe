import type { WorkReportPeriodStatus } from "./reportStatus";

export type ReviewStatusBucket =
  | "ALL"
  | "PENDING"
  | "SUBMITTED"
  | "APPROVED"
  | "OVERDUE"
  | "RETURNED";

export interface ReviewSummarySearchRequest {
  workId: string;
  q?: string | null;
  dynamicExcelId?: string | null;
  periodKey?: string | null;
  waitingReviewOnly?: boolean | null;
  reviewStatusBucket?: ReviewStatusBucket | null;
  assigneeUserIds?: string[] | null;
  assigneeUserId?: string | null;
  assigneeUnitIds?: string[] | null;
  assigneeUnitId?: string | null;
  page: number;
  pageSize: number;
}

export interface ReviewSummaryAssigneeDto {
  userId?: string | null;
  userName?: string | null;
  fullName?: string | null;
  unitId?: string | null;
  unitName?: string | null;
  unitShortName?: string | null;
}

export interface ReviewSummaryRowDto {
  assignmentId: string;
  workId: string;

  dynamicExcelId: string;
  dynamicExcelCode: string;
  dynamicExcelName: string;

  assignees: ReviewSummaryAssigneeDto[];

  progressStatus: number;
  progressStatusUpdatedAtUtc?: string | null;

  latestPeriodKey?: string | null;
  latestPeriodStatus?: WorkReportPeriodStatus | number | null;
  latestDueAtUtc?: string | null;
  hasAnyDuePeriod: boolean;
  hasOverduePeriod: boolean;

  evaluationCode?: string | null;
  evaluationLabel?: string | null;

  worstPeriodStatus?: number | null;
  worstOverdueReasonCode?: string | null;
  worstOverdueReasonLabel?: string | null;
}

export interface ReviewReportFlatSearchRequest {
  workId: string;
  assignmentId: string;
  q?: string | null;
  dynamicExcelId?: string | null;
  periodKey?: string | null;
  waitingReviewOnly?: boolean | null;
  reportStatus?: number | null;
  reviewStatusBucket?: ReviewStatusBucket | null;
  assigneeUserIds?: string[] | null;
  assigneeUserId?: string | null;
  assigneeUnitIds?: string[] | null;
  assigneeUnitId?: string | null;
  page: number;
  pageSize: number;
}

export interface ReviewReportFlatRowDto {
  assignmentId: string;
  workId: string;

  dynamicExcelId: string;
  dynamicExcelCode: string;
  dynamicExcelName: string;

  assigneeUserId?: string | null;
  assigneeUserName?: string | null;
  assigneeFullName?: string | null;
  assigneeUnitId?: string | null;
  assigneeUnitName?: string | null;
  assigneeUnitShortName?: string | null;

  workReportPeriodId?: string | null;

  periodKey: string;
  startedDate?: string | null;
  completedDate?: string | null;
  isHistoricalData?: boolean | null;
  historicalDataApproved?: boolean | null;
  historicalDataApprovedAtUtc?: string | null;
  historicalDataApprovedByUserId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  dueAtUtc?: string | null;
  periodStatus?: number | null;

  reportId?: string | null;
  reportStatus?: number | null;
  reportIsActive?: boolean | null;
  reportDeactivatedAtUtc?: string | null;
  reportDeactivationReason?: string | null;
  submittedAtUtc?: string | null;
  approvedAtUtc?: string | null;
  autoApproved?: boolean | null;
  autoApprovedAtUtc?: string | null;
  autoApprovedByUserId?: string | null;
  autoApprovalLocked?: boolean | null;
  autoApprovalConfirmedAtUtc?: string | null;
  autoApprovalConfirmedByUserId?: string | null;
  returnedAtUtc?: string | null;
  returnReason?: string | null;
  reviewerComment?: string | null;

  progressStatus: number;
  progressStatusUpdatedAtUtc?: string | null;
  hasAnyDuePeriod: boolean;
  hasOverduePeriod: boolean;

  evaluationCode?: string | null;
  evaluationLabel?: string | null;
  worstPeriodStatus?: number | null;
  worstOverdueReasonCode?: string | null;
  worstOverdueReasonLabel?: string | null;
}

export interface ApproveReportRequest {
  comment?: string | null;
  reviewerComment?: string | null;
  confirmHistoricalDataApproval?: boolean;
}

export interface ReturnReportRequest {
  comment: string;
}

export interface RecallApprovedReportRequest {
  comment: string;
}

export interface ReportActiveRequest {
  comment?: string | null;
}
