// src/types/reportStatus.ts

export const WorkAssignmentReportStatus = {
  Draft: 0,
  Submitted: 1,
  Approved: 2,
  Rejected: 3,
} as const;

export type WorkAssignmentReportStatus =
  (typeof WorkAssignmentReportStatus)[keyof typeof WorkAssignmentReportStatus];

export const WorkAssignmentReportStatusLabel: Record<number, string> = {
  [WorkAssignmentReportStatus.Draft]: "Nháp",
  [WorkAssignmentReportStatus.Submitted]: "Đã nộp",
  [WorkAssignmentReportStatus.Approved]: "Đã duyệt",
  [WorkAssignmentReportStatus.Rejected]: "Từ chối",
};

export function getWorkAssignmentReportStatusLabel(status?: number | null): string {
  if (status == null) return "Chưa có";
  return WorkAssignmentReportStatusLabel[status] ?? `Trạng thái ${status}`;
}