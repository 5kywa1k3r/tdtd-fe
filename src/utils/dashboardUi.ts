import dayjs, { type Dayjs } from "dayjs";
import type {
  DashboardDateRangeValue,
  DashboardNodeAssigneeDto,
  DashboardNodeReportSummaryDto,
  DashboardPieDatum,
  DashboardProgressCountDto,
  MyWorkSummaryRowDto,
  WorkDashboardRootAssignmentRowDto,
} from "../types/dashboard";

const PROGRESS_COLORS = {
  notStarted: "#90A4AE",
  inProgress: "#42A5F5",
  completed: "#66BB6A",
  atRiskOverdue: "#FFA726",
  overdue: "#EF5350",
} as const;

const REPORT_COLORS = {
  pendingCount: "#90A4AE",
  draftCount: "#42A5F5",
  submittedCount: "#FFA726",
  approvedCount: "#66BB6A",
  overduePendingCount: "#FF7043",
  overdueDraftCount: "#FF8A65",
  overdueSubmittedCount: "#E53935",
  overdueApprovedCount: "#8D6E63",
} as const;

export function dateInputToUtcStart(dateValue: string): string | null {
  if (!dateValue) return null;
  return new Date(`${dateValue}T00:00:00`).toISOString();
}

export function dateInputToUtcEnd(dateValue: string): string | null {
  if (!dateValue) return null;
  return new Date(`${dateValue}T23:59:59.999`).toISOString();
}

export function dateInputToDayjs(dateValue: string): Dayjs | null {
  return dateValue ? dayjs(dateValue, "YYYY-MM-DD") : null;
}

export function dayjsToDateInput(value: Dayjs | null | undefined): string {
  return value ? value.format("YYYY-MM-DD") : "";
}

export function filtersToDateRange(fromDate: string, toDate: string): DashboardDateRangeValue {
  return {
    from: dateInputToDayjs(fromDate),
    to: dateInputToDayjs(toDate),
  };
}

export function dateRangeToFilterValue(value: DashboardDateRangeValue): Pick<DashboardDateRangeValue, "from" | "to"> {
  return {
    from: value.from ?? null,
    to: value.to ?? null,
  };
}

export function formatDateOnly(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function getWorkStatusLabel(status: number): string {
  switch (status) {
    case 1:
      return "Chua bat dau";
    case 2:
      return "Dang thuc hien";
    case 3:
      return "Hoan thanh";
    case 4:
      return "Co nguy co qua han";
    case 5:
      return "Qua han";
    default:
      return `Trang thai ${status}`;
  }
}

export function getProgressStatusLabel(status: number): string {
  switch (status) {
    case 0:
      return "Chua thuc hien";
    case 1:
      return "Dang thuc hien";
    case 2:
      return "Da hoan thanh";
    case 3:
      return "Co nguy co cham muon";
    case 4:
      return "Cham muon";
    default:
      return `Tien do ${status}`;
  }
}

export function getWorkStatusChipColor(status: number): "default" | "primary" | "success" | "warning" | "error" {
  switch (status) {
    case 2:
      return "primary";
    case 3:
      return "success";
    case 4:
      return "warning";
    case 5:
      return "error";
    default:
      return "default";
  }
}

export function getProgressStatusChipColor(status: number): "default" | "primary" | "success" | "warning" | "error" {
  switch (status) {
    case 1:
      return "primary";
    case 2:
      return "success";
    case 3:
      return "warning";
    case 4:
      return "error";
    default:
      return "default";
  }
}

export function parseBooleanQuery(value: string | null | undefined, defaultValue: boolean): boolean {
  if (value == null || value === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return defaultValue;
}

export function countOverdueReports(x?: DashboardNodeReportSummaryDto | null): number {
  if (!x) return 0;
  return (
    Number(x.overduePendingCount ?? 0) +
    Number(x.overdueDraftCount ?? 0) +
    Number(x.overdueSubmittedCount ?? 0) +
    Number(x.overdueApprovedCount ?? 0)
  );
}

export function countWaitingReports(x?: DashboardNodeReportSummaryDto | null): number {
  if (!x) return 0;
  return Number(x.pendingCount ?? 0) + Number(x.draftCount ?? 0) + Number(x.submittedCount ?? 0);
}

export function getAssigneeLabel(x: DashboardNodeAssigneeDto): string {
  const unitText = x.unitSymbol || x.unitShortName || x.unitName || "";
  if (unitText) return `${x.fullName} - ${unitText}`;
  return x.fullName || x.username;
}

export function getWorkRowKey(x: MyWorkSummaryRowDto): string {
  return x.workId;
}

export function getRootAssignmentRowKey(x: WorkDashboardRootAssignmentRowDto): string {
  return x.assignmentId;
}

export function buildProgressPieData(counts?: DashboardProgressCountDto | null): DashboardPieDatum[] {
  const source = counts ?? {
    notStarted: 0,
    inProgress: 0,
    completed: 0,
    atRiskOverdue: 0,
    overdue: 0,
    total: 0,
  };

  return [
    { key: "notStarted", label: "Chua thuc hien", value: Number(source.notStarted ?? 0), color: PROGRESS_COLORS.notStarted },
    { key: "inProgress", label: "Dang thuc hien", value: Number(source.inProgress ?? 0), color: PROGRESS_COLORS.inProgress },
    { key: "completed", label: "Da hoan thanh", value: Number(source.completed ?? 0), color: PROGRESS_COLORS.completed },
    { key: "atRiskOverdue", label: "Co nguy co cham muon", value: Number(source.atRiskOverdue ?? 0), color: PROGRESS_COLORS.atRiskOverdue },
    { key: "overdue", label: "Cham muon", value: Number(source.overdue ?? 0), color: PROGRESS_COLORS.overdue },
  ].filter((x) => x.value > 0);
}

export function buildReportPieData(summary?: DashboardNodeReportSummaryDto | null): DashboardPieDatum[] {
  if (!summary) return [];

  return [
    { key: "pendingCount", label: "Chua mo", value: Number(summary.pendingCount ?? 0), color: REPORT_COLORS.pendingCount },
    { key: "draftCount", label: "Ban nhap", value: Number(summary.draftCount ?? 0), color: REPORT_COLORS.draftCount },
    { key: "submittedCount", label: "Da gui", value: Number(summary.submittedCount ?? 0), color: REPORT_COLORS.submittedCount },
    { key: "approvedCount", label: "Da duyet", value: Number(summary.approvedCount ?? 0), color: REPORT_COLORS.approvedCount },
    { key: "overduePendingCount", label: "Qua han chua mo", value: Number(summary.overduePendingCount ?? 0), color: REPORT_COLORS.overduePendingCount },
    { key: "overdueDraftCount", label: "Qua han ban nhap", value: Number(summary.overdueDraftCount ?? 0), color: REPORT_COLORS.overdueDraftCount },
    { key: "overdueSubmittedCount", label: "Qua han da gui", value: Number(summary.overdueSubmittedCount ?? 0), color: REPORT_COLORS.overdueSubmittedCount },
    { key: "overdueApprovedCount", label: "Qua han da duyet", value: Number(summary.overdueApprovedCount ?? 0), color: REPORT_COLORS.overdueApprovedCount },
  ].filter((x) => x.value > 0);
}
