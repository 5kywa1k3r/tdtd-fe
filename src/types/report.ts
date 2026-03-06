// src/types/report.ts
import type { WorkAssignmentReportStatus } from "./reportStatus";

export interface PagedResult<T> {
  rows: T[];
  totalRows: number;
  page: number; // 0-based
  pageSize: number;
}

/* =========================
 * Outer list: group theo template
 * ========================= */

export interface MyReportTemplateSearchRequest {
  page: number; // 0-based
  pageSize: number;
  q?: string | null;
  isActive?: boolean | null;
  hasReport?: boolean | null;
  sortField?: string | null;
  sortDirection?: "asc" | "desc" | string | null;
}

export interface MyReportTemplateRow {
  dynamicExcelId: string;
  dynamicExcelCode: string;
  dynamicExcelName: string;

  assignmentCount: number;
  reportCount: number;

  latestPeriodKey?: string | null;
  latestReportStatus?: WorkAssignmentReportStatus | null;
  latestUpdatedAtUtc?: string | null;
  latestReportId?: string | null;
}

/* =========================
 * Inner list: report theo assignment
 * ========================= */

export interface WorkAssignmentReportListRow {
  id: string;
  workId: string;
  workAssignmentId: string;

  periodKey: string;
  status: WorkAssignmentReportStatus;

  versionNo: number;
  isCurrent: boolean;

  dynamicExcelTemplateId: string;
  dynamicExcelTemplateCode: string;
  dynamicExcelTemplateName: string;

  submittedAtUtc?: string | null;
  updatedAtUtc: string;
}

export interface WorkAssignmentReportSearchRequest {
  page: number; // 0-based
  pageSize: number;

  workId?: string | null;
  workAssignmentId?: string | null;

  q?: string | null;
  periodKey?: string | null;
  status?: WorkAssignmentReportStatus | null;
  isCurrent?: boolean | null;

  sortField?: string | null;
  sortDirection?: "asc" | "desc" | string | null;
}

/* =========================
 * Detail report
 * ========================= */

export interface WorkAssignmentReportResponse {
  id: string;
  workId: string;
  workAssignmentId: string;

  periodKey: string;
  periodStart?: string | null;
  periodEnd?: string | null;

  status: WorkAssignmentReportStatus;

  templateSnapshotJson: string;
  scheduleSnapshotJson: string;

  dynamicExcelTemplateId: string;
  dynamicExcelTemplateCode: string;
  dynamicExcelTemplateName: string;

  rawWorkbookDataJson: string;
  specJson: string;

  dataRectR0: number;
  dataRectC0: number;
  dataRectR1: number;
  dataRectC1: number;

  w: number;
  h: number;

  values1DJson: string;
  note?: string | null;

  versionNo: number;
  isCurrent: boolean;

  submittedAtUtc?: string | null;
  submittedByUserId?: string | null;

  createdAtUtc: string;
  updatedAtUtc: string;
}

/* =========================
 * Init draft / Save draft
 * ========================= */

export interface InitWorkAssignmentReportRequest {
  periodKey: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  note?: string | null;
}

export interface SaveWorkAssignmentReportDraftRequest {
  rawWorkbookDataJson: string;
  values1D: Array<number | null>;
  note?: string | null;
}

/* =========================
 * Optional FE helper types
 * ========================= */

export interface ReportDataRect {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

export interface ParsedWorkAssignmentReportDetail
  extends Omit<
    WorkAssignmentReportResponse,
    "rawWorkbookDataJson" | "specJson" | "values1DJson"
  > {
  rawWorkbookData: any[];
  spec: any;
  values1D: Array<number | null>;
  dataRect: ReportDataRect;
}