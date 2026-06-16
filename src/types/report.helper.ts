import type { MyReportTemplateDetailResponse, WorkAssignmentReportResponse } from "./report";

/* =========================
 * FE helper types
 * ========================= */

export interface ReportDataRect {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

export type ReportCellValue = string | string[] | number | boolean | null;

export interface ParsedMyReportTemplateDetail
  extends Omit<MyReportTemplateDetailResponse, "specJson" | "templateWorkbookJson"> {
  spec: any;
  templateWorkbookData: any[];
}

export interface ParsedWorkAssignmentReportDetail
  extends Omit<WorkAssignmentReportResponse, "specJson" | "values1DJson"> {
  renderWorkbookData: any[];
  spec: any;
  values1D: ReportCellValue[];
  dataRect: ReportDataRect;
}

export interface WorkReportEditorState {
  reportId: string;
  workReportPeriodId: string;
  status: number;
  periodStatus?: number | null;

  workbook?: any[];
  spec?: any;
  values1D: ReportCellValue[];

  lateReason: string;

  reviewerComment: string;
  returnReason: string;

  w: number;
  h: number;
  dataRectR0: number;
  dataRectC0: number;
  dataRectR1: number;
  dataRectC1: number;

  dueAtUtc?: string | null;
}
