// src/types/report.ts
import type {
  WorkAssignmentReportStatus,
  WorkReportPeriodStatus,
} from "./reportStatus";
import type { DynamicFormAggregateRequest } from "./reportAggregate";

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
  scopeAssignmentId?: string | null;
  sortField?: string | null;
  sortDirection?: "asc" | "desc" | string | null;
}

export interface MyReportTemplateRow {
  dynamicFormTemplateId: string;
  dynamicFormTemplateCode: string;
  dynamicFormTemplateName: string;
  dynamicExcelId?: string | null;
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
  assignmentType?: string | null;
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
  startedDate?: string | null;
  completedDate?: string | null;
  canEditCompletedDate?: boolean | null;
  requiresCompletedDate?: boolean | null;
  completedDateMin?: string | null;
  completedDateMax?: string | null;
  completedDatePolicyReason?: string | null;
  isHistoricalData?: boolean | null;
  historicalDataApproved?: boolean | null;
  historicalDataApprovedAtUtc?: string | null;
  historicalDataApprovedByUserId?: string | null;
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

  lateReason?: string | null;
  reviewerComment?: string | null;
  returnReason?: string | null;
}

export interface MyReportTemplateAssignmentOption {
  workAssignmentId: string;
  workTemplateAssigneeId: string;
  assignmentCode?: string | null;
  assignmentType?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  dueAtUtc?: string | null;
  isActive?: boolean | null;
}

export interface MyReportTemplateDetailResponse {
  workId: string;
  dynamicFormTemplateId: string;
  dynamicFormTemplateCode: string;
  dynamicFormTemplateName: string;
  dynamicExcelId?: string | null;
  dynamicExcelCode: string;
  dynamicExcelName: string;

  workTemplateAssigneeId: string;
  workAssignmentId: string;

  specJson: string;
  templateWorkbookJson: string;
  templateSnapshotJson?: string | null;

  assignmentOptions?: MyReportTemplateAssignmentOption[] | null;
  periods: WorkReportPeriodRow[];
}

/* =========================
 * Report detail / editor
 * ========================= */

export type WorkReportDataOrigin =
  | "MANUAL_INPUT"
  | "AUTO_SUMMARY"
  | "COPIED_SUMMARY"
  | "PARTIAL_MAPPING";

export type WorkReportCumulativeContributionMode = "INCLUDE" | "EXCLUDE";

export interface DynamicFlowFieldPermission {
  targetKey: string;
  fieldId?: string | null;
  fieldKey?: string | null;
  read?: boolean | null;
  write?: boolean | null;
  required?: boolean | null;
  hidden?: boolean | null;
  locked?: boolean | null;
  lockedAfterSubmit?: boolean | null;
  sourcePolicyId?: string | null;
}

export interface DynamicFlowTableColumnPermission {
  targetKey: string;
  blockId: string;
  columnKey: string;
  read?: boolean | null;
  write?: boolean | null;
  required?: boolean | null;
  hidden?: boolean | null;
  locked?: boolean | null;
  lockedAfterSubmit?: boolean | null;
  sourcePolicyId?: string | null;
}

export interface DynamicFlowPolicyEvaluationResult {
  fields?: Record<string, DynamicFlowFieldPermission> | null;
  tableColumns?: Record<string, DynamicFlowTableColumnPermission> | null;
}

export interface WorkAssignmentReportResponse {
  id: string;
  workId: string;
  workAssignmentId: string;
  assignmentType?: string | null;
  workReportPeriodId: string;
  assigneeUserId?: string | null;

  periodKey: string;
  periodInstanceKey?: string | null;
  periodKind?: string | null;
  reportTitle?: string | null;
  reportDate?: string | null;
  startedDate?: string | null;
  completedDate?: string | null;
  canEditCompletedDate?: boolean | null;
  requiresCompletedDate?: boolean | null;
  completedDateMin?: string | null;
  completedDateMax?: string | null;
  completedDatePolicyReason?: string | null;
  isHistoricalData?: boolean | null;
  historicalDataApproved?: boolean | null;
  historicalDataApprovedAtUtc?: string | null;
  historicalDataApprovedByUserId?: string | null;
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
  dynamicFlowPermissions?: DynamicFlowPolicyEvaluationResult | null;
  dataOrigin?: WorkReportDataOrigin | string | null;
  cumulativeContributionMode?: WorkReportCumulativeContributionMode | string | null;
  cumulativeContributionPolicyJson?: string | null;
  summarySourceJson?: string | null;
  aggregateSourceReportIds?: string[] | null;
  aggregateSourceAssignmentIds?: string[] | null;
  aggregateSourceUpdatedAtUtc?: string | null;
  aggregateSnapshotDirty?: boolean | null;
  aggregateSnapshotDirtyAtUtc?: string | null;
  aggregateSnapshotRefreshedAtUtc?: string | null;
  aggregateRefreshError?: string | null;

  isLateSubmission: boolean;
  lateReason?: string | null;

  reviewerComment?: string | null;
  returnReason?: string | null;

  versionNo: number;
  isCurrent: boolean;
  isActive: boolean;
  deactivatedAtUtc?: string | null;
  deactivatedByUserId?: string | null;
  deactivationReason?: string | null;
  reactivatedAtUtc?: string | null;
  reactivatedByUserId?: string | null;

  submittedAtUtc?: string | null;
  submittedByUserId?: string | null;

  returnedAtUtc?: string | null;
  returnedByUserId?: string | null;

  approvedAtUtc?: string | null;
  approvedByUserId?: string | null;
  autoApproved?: boolean | null;
  autoApprovedAtUtc?: string | null;
  autoApprovedByUserId?: string | null;
  autoApproveConditionSnapshotJson?: string | null;
  autoApprovalLocked?: boolean | null;
  autoApprovalConfirmedAtUtc?: string | null;
  autoApprovalConfirmedByUserId?: string | null;

  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface WorkAssignmentReportSectionSummaryRow {
  sectionId: string;
  sectionTitle: string;
  sectionOrder: number;
  fieldCount: number;
  blockCount: number;
  hasData: boolean;
  lastUpdatedAtUtc?: string | null;
  lastUpdatedByUserId?: string | null;
  sourcePayloadUpdatedAtUtc?: string | null;
}

export interface WorkAssignmentReportSectionDetailResponse
  extends WorkAssignmentReportSectionSummaryRow {
  reportId: string;
  dynamicFormTemplateId?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  fieldsJson: string;
  blocksJson: string;
  fieldValuesJson?: string | null;
  tableValuesJson?: string | null;
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
  startedDate?: string | null;
  completedDate?: string | null;
  isHistoricalData?: boolean | null;
  historicalDataApproved?: boolean | null;
  historicalDataApprovedAtUtc?: string | null;
  historicalDataApprovedByUserId?: string | null;
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
  dataOrigin?: WorkReportDataOrigin | string | null;
  aggregateSnapshotDirty?: boolean | null;
  aggregateSnapshotDirtyAtUtc?: string | null;
  aggregateSnapshotRefreshedAtUtc?: string | null;
  aggregateRefreshError?: string | null;

  versionNo: number;
  isCurrent: boolean;
  isActive: boolean;
  deactivatedAtUtc?: string | null;
  deactivationReason?: string | null;

  submittedAtUtc?: string | null;
  submittedByUserId?: string | null;

  approvedAtUtc?: string | null;
  approvedByUserId?: string | null;
  autoApproved?: boolean | null;
  autoApprovedAtUtc?: string | null;
  autoApprovedByUserId?: string | null;
  autoApprovalLocked?: boolean | null;
  autoApprovalConfirmedAtUtc?: string | null;
  autoApprovalConfirmedByUserId?: string | null;

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
  isActive?: boolean | null;
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
  values1D: Array<string | string[] | number | boolean | null>;
  fieldValuesJson?: string | null;
  tableValuesJson?: string | null;
  dataOrigin?: WorkReportDataOrigin | string | null;
  cumulativeContributionMode?: WorkReportCumulativeContributionMode | string | null;
  cumulativeContributionPolicyJson?: string | null;
  summarySourceJson?: string | null;

  completedDate?: string | null;
  lateReason?: string | null;

  note?: string | null;
}

export interface WorkReportValuePatchItem {
  index: number;
  value: string | string[] | number | boolean | null;
}

export interface WorkReportTableBlockPatch {
  blockId: string;
  blockJson: string;
}

export interface SaveWorkAssignmentReportDraftPatchRequest {
  values1DLength?: number | null;
  values1DPatch?: WorkReportValuePatchItem[] | null;
  fieldValuesJson?: string | null;
  tableBlockPatches?: WorkReportTableBlockPatch[] | null;
  dataOrigin?: WorkReportDataOrigin | string | null;
  cumulativeContributionMode?: WorkReportCumulativeContributionMode | string | null;
  cumulativeContributionPolicyJson?: string | null;
  summarySourceJson?: string | null;

  completedDate?: string | null;
  lateReason?: string | null;

  note?: string | null;
}

export interface ApplyDynamicFormAggregateDraftRequest {
  aggregateRequest: DynamicFormAggregateRequest;
  dataOrigin?: WorkReportDataOrigin | string | null;
  cumulativeContributionMode?: WorkReportCumulativeContributionMode | string | null;
  cumulativeContributionPolicyJson?: string | null;
  summarySourceJson?: string | null;
  targetBlockId?: string | null;
  valueSelector?: "SUM" | "AVERAGE" | "MIN" | "MAX" | "COUNT" | string | null;
  clearExistingValues?: boolean | null;
  reportMapConfigJson?: string | null;
  allowSubmittedSources?: boolean | null;
}

export interface ReturnWorkAssignmentReportRequest {
  returnReason: string;
  reviewerComment?: string | null;
}

export interface SubmitWorkAssignmentReportRequest {
  values1D?: Array<string | string[] | number | boolean | null>;
  fieldValuesJson?: string | null;
  tableValuesJson?: string | null;
  dataOrigin?: WorkReportDataOrigin | string | null;
  cumulativeContributionMode?: WorkReportCumulativeContributionMode | string | null;
  cumulativeContributionPolicyJson?: string | null;
  summarySourceJson?: string | null;

  completedDate?: string | null;
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

