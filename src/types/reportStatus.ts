// src/types/reportStatus.ts

export const WorkReportPeriodStatus = {
  Pending: 0,
  Draft: 1,
  Submitted: 2,
  Approved: 3,
  OverduePending: 4,
  OverdueDraft: 5,
  OverdueSubmitted: 6,
  OverdueApproved: 7,
} as const;

export type WorkReportPeriodStatus =
  (typeof WorkReportPeriodStatus)[keyof typeof WorkReportPeriodStatus];

export const WorkAssignmentReportStatus = {
  Draft: 0,
  Submitted: 1,
  Approved: 2,
} as const;

export type WorkAssignmentReportStatus =
  (typeof WorkAssignmentReportStatus)[keyof typeof WorkAssignmentReportStatus];

export const WorkAssignmentProgressStatus = {
  NotStarted: 0,
  InProgress: 1,
  Completed: 2,
  AtRiskOverdue: 3,
  Overdue: 4,
} as const;

export type WorkAssignmentProgressStatus =
  (typeof WorkAssignmentProgressStatus)[keyof typeof WorkAssignmentProgressStatus];

export const WorkReportPeriodStatusLabel: Record<number, string> = {
  [WorkReportPeriodStatus.Pending]: "Chưa bắt đầu",
  [WorkReportPeriodStatus.Draft]: "Nháp",
  [WorkReportPeriodStatus.Submitted]: "Đã nộp",
  [WorkReportPeriodStatus.Approved]: "Đã duyệt",
  [WorkReportPeriodStatus.OverduePending]: "Quá hạn chưa làm",
  [WorkReportPeriodStatus.OverdueDraft]: "Quá hạn nháp",
  [WorkReportPeriodStatus.OverdueSubmitted]: "Quá hạn đã nộp",
  [WorkReportPeriodStatus.OverdueApproved]: "Quá hạn đã duyệt",
};

export const WorkAssignmentReportStatusLabel: Record<number, string> = {
  [WorkAssignmentReportStatus.Draft]: "Nháp",
  [WorkAssignmentReportStatus.Submitted]: "Đã nộp",
  [WorkAssignmentReportStatus.Approved]: "Đã duyệt",
};

export const WorkAssignmentProgressStatusLabel: Record<number, string> = {
  [WorkAssignmentProgressStatus.NotStarted]: "Chưa thực hiện",
  [WorkAssignmentProgressStatus.InProgress]: "Đang thực hiện",
  [WorkAssignmentProgressStatus.Completed]: "Đã hoàn thành",
  [WorkAssignmentProgressStatus.AtRiskOverdue]: "Có nguy cơ chậm muộn",
  [WorkAssignmentProgressStatus.Overdue]: "Chậm muộn",
};

export function getWorkReportPeriodStatusLabel(status?: number | null): string {
  if (status == null) return "Chưa có";
  return WorkReportPeriodStatusLabel[status] ?? `Trạng thái kỳ ${status}`;
}

export function getWorkAssignmentReportStatusLabel(status?: number | null): string {
  if (status == null) return "Chưa có";
  return WorkAssignmentReportStatusLabel[status] ?? `Trạng thái báo cáo ${status}`;
}

export function getWorkAssignmentProgressStatusLabel(status?: number | null): string {
  if (status == null) return "Chưa có";
  return WorkAssignmentProgressStatusLabel[status] ?? `Tiến độ ${status}`;
}