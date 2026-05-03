// src/types/report.ts
import type {
  WorkAssignmentReportStatus,
  WorkReportPeriodStatus,
} from "./reportStatus";

export interface PagedResult<T> {
  rows: T[];
  totalRows: number;
  page: number;
  pageSize: number;
}

/* =========================
 * Outer list: template groups
 * ========================= */

export interface MyReportTemplateSearchRequest {
  page: number;
  pageSize: number;
  q?: string | null;
  isActive?: boolean | null;
  hasReport?: boolean | null;
  hasOverduePeriod?: boolean | null;
  sortField?: string | null;
  sortDirection?: "asc" | "desc" | string | null;
}

export interface MyReportTemplateRow {
  dynamicExcelId: string;
  dynamicExcelCode: string;
  dynamicExcelName: string;

  bindingCount: number;
  periodCount: number;
  reportCount: number;

  latestPeriodKey?: string | null;
  latestPeriodStatus?: WorkReportPeriodStatus | null;
  latestDueAtUtc?: string | null;

  latestReportId?: string | null;
  latestPeriodId?: string | null;
  latestUpdatedAtUtc?: string | null;

  hasOverduePeriod?: boolean | null;
}

/* =========================
 * Template detail + periods
 * ========================= */

export interface WorkReportPeriodRow {
  id: string;
  workId: string;
  workAssignmentId: string;
  workTemplateAssigneeId: string;

  dynamicExcelId: string;
  dynamicExcelCode: string;
  dynamicExcelName: string;

  assigneeUserId?: string | null;

  periodKey: string;
  periodInstanceKey?: string | null;
  periodKind?: string | null;
  reportTitle?: string | null;
  reportDate?: string | null;
  linkedScheduledPeriodId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  dueAtUtc?: string | null;

  status: WorkReportPeriodStatus;
  isOverdue: boolean;

  currentReportId?: string | null;
  reportVersionCount: number;

  lastDraftSavedAtUtc?: string | null;
  lastSubmittedAtUtc?: string | null;
  lastReviewedAtUtc?: string | null;

  currentProgressStatus?: string | null;
  reportReason?: string | null;
  difficulties?: string | null;
  proposedSolution?: string | null;

  lateReason?: string | null;
  reviewerComment?: string | null;
  returnReason?: string | null;
}

export interface MyReportTemplateDetailResponse {
  workId: string;
  dynamicExcelId: string;
  dynamicExcelCode: string;
  dynamicExcelName: string;

  workTemplateAssigneeId: string;
  workAssignmentId: string;

  specJson: string;
  templateWorkbookJson: string;

  periods: WorkReportPeriodRow[];
}

/* =========================
 * Report detail / editor
 * ========================= */

export interface WorkAssignmentReportResponse {
  id: string;
  workId: string;
  workAssignmentId: string;
  workReportPeriodId: string;
  assigneeUserId?: string | null;

  periodKey: string;
  periodInstanceKey?: string | null;
  periodKind?: string | null;
  reportTitle?: string | null;
  reportDate?: string | null;
  linkedScheduledPeriodId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  dueAtUtc?: string | null;

  status: WorkAssignmentReportStatus | number;
  reportStatus?: WorkAssignmentReportStatus | number | null;
  periodStatus?: WorkReportPeriodStatus | number | null;

  templateSnapshotJson?: string | null;
  scheduleSnapshotJson?: string | null;

  dynamicExcelTemplateId?: string | null;
  dynamicExcelTemplateCode?: string | null;
  dynamicExcelTemplateName?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  specJson: string;

  dataRectR0: number;
  dataRectC0: number;
  dataRectR1: number;
  dataRectC1: number;

  w: number;
  h: number;

  values1DJson?: string | null;
  fieldValuesJson?: string | null;
  tableValuesJson?: string | null;

  currentProgressStatus?: string | null;
  reportReason?: string | null;
  difficulties?: string | null;
  proposedSolution?: string | null;

  isLateSubmission: boolean;
  lateReason?: string | null;

  reviewerComment?: string | null;
  returnReason?: string | null;

  versionNo: number;
  isCurrent: boolean;

  submittedAtUtc?: string | null;
  submittedByUserId?: string | null;

  returnedAtUtc?: string | null;
  returnedByUserId?: string | null;

  approvedAtUtc?: string | null;
  approvedByUserId?: string | null;

  createdAtUtc: string;
  updatedAtUtc: string;
}

/* =========================
 * Search sâu / quản trị / history
 * ========================= */

export interface WorkAssignmentReportListRow {
  id: string;
  workId: string;
  workAssignmentId: string;
  workReportPeriodId: string;
  assigneeUserId?: string | null;

  periodKey: string;
  periodInstanceKey?: string | null;
  periodKind?: string | null;
  reportTitle?: string | null;
  reportDate?: string | null;
  linkedScheduledPeriodId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  dueAtUtc?: string | null;

  status: WorkAssignmentReportStatus | number;
  periodStatus?: WorkReportPeriodStatus | number | null;

  isLateSubmission: boolean;
  lateReason?: string | null;

  dynamicExcelTemplateId?: string | null;
  dynamicExcelTemplateCode?: string | null;
  dynamicExcelTemplateName?: string | null;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;

  currentProgressStatus?: string | null;
  reportReason?: string | null;
  difficulties?: string | null;
  proposedSolution?: string | null;

  versionNo: number;
  isCurrent: boolean;

  submittedAtUtc?: string | null;
  submittedByUserId?: string | null;

  approvedAtUtc?: string | null;
  approvedByUserId?: string | null;

  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface WorkAssignmentReportSearchRequest {
  page: number;
  pageSize: number;

  workId?: string | null;
  workAssignmentId?: string | null;
  workReportPeriodId?: string | null;
  assigneeUserId?: string | null;

  q?: string | null;
  periodKey?: string | null;
  status?: WorkAssignmentReportStatus | number | null;

  isCurrent?: boolean | null;
  isLateSubmission?: boolean | null;

  dueFromUtc?: string | null;
  dueToUtc?: string | null;
  submittedFromUtc?: string | null;
  submittedToUtc?: string | null;

  sortField?: string | null;
  sortDirection?: "asc" | "desc" | string | null;
}

/* =========================
 * Save / submit/ return
 * ========================= */

export interface SaveWorkAssignmentReportDraftRequest {
  values1D: Array<string | number | null>;
  fieldValuesJson?: string | null;
  tableValuesJson?: string | null;

  currentProgressStatus?: string | null;
  reportReason?: string | null;
  difficulties?: string | null;
  proposedSolution?: string | null;
  lateReason?: string | null;

  note?: string | null;
}

export interface ReturnWorkAssignmentReportRequest {
  returnReason: string;
  reviewerComment?: string | null;
}

export interface SubmitWorkAssignmentReportRequest {
  values1D?: Array<string | number | null>;
  fieldValuesJson?: string | null;
  tableValuesJson?: string | null;

  currentProgressStatus?: string | null;
  reportReason?: string | null;
  difficulties?: string | null;
  proposedSolution?: string | null;
  lateReason?: string | null;

  note?: string | null;
}

/* =========================
 * Logs
 * ========================= */

export interface WorkAssignmentReportLogRow {
  id: string;
  workId: string;
  workAssignmentId: string;
  workReportPeriodId: string;
  workAssignmentReportId: string;

  action: string;
  fromStatus: string;
  toStatus: string;

  actionByUserId: string;
  actionAtUtc: string;

  reason?: string | null;
  comment?: string | null;
  snapshotJson?: string | null;
}

export interface CreateUserCreatedReportRequest {
  periodKey?: string | null;
  reportTitle?: string | null;
  reportDate?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  dueAtUtc?: string | null;
  linkedScheduledPeriodId?: string | null;
}
