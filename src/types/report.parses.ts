// src/types/report.parsers.ts
import type {
  ParsedWorkAssignmentReportDetail,
  WorkAssignmentReportResponse,
} from "./report";

export function parseReportDetail(
  report: WorkAssignmentReportResponse
): ParsedWorkAssignmentReportDetail {
  let rawWorkbookData: any[] = [];
  let spec: any = null;
  let values1D: Array<number | null> = [];

  try {
    rawWorkbookData = report.rawWorkbookDataJson
      ? JSON.parse(report.rawWorkbookDataJson)
      : [];
  } catch {
    rawWorkbookData = [];
  }

  try {
    spec = report.specJson ? JSON.parse(report.specJson) : null;
  } catch {
    spec = null;
  }

  try {
    values1D = report.values1DJson ? JSON.parse(report.values1DJson) : [];
  } catch {
    values1D = [];
  }

  return {
    ...report,
    rawWorkbookData,
    spec,
    values1D,
    dataRect: {
      r0: report.dataRectR0,
      c0: report.dataRectC0,
      r1: report.dataRectR1,
      c1: report.dataRectC1,
    },
  };
}