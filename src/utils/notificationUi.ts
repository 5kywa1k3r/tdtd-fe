import type { NotificationRow } from "../types/notification";

const TYPE_LABELS: Record<string, string> = {
  WORK_DUE: "Công việc đến hạn",
  ASSIGNMENT_DUE: "Phần việc đến hạn",
  REPORT_DUE: "Báo cáo đến hạn",
  ASSIGNMENT_ASSIGNED: "Được giao việc",
  ASSIGNMENT_HANDOVER_RECEIVED: "Nhận bàn giao",
  ASSIGNMENT_HANDOVER_COMPLETED: "Đã bàn giao",
  ASSIGNMENT_HANDOVER_REQUESTED: "Yêu cầu bàn giao",
  ASSIGNMENT_HANDOVER_APPROVED: "Bàn giao đã duyệt",
  ASSIGNMENT_HANDOVER_REJECTED: "Bàn giao bị từ chối",
  DYNAMIC_FORM_CLONE_REQUESTED: "Yêu cầu sao chép biểu mẫu",
  DYNAMIC_FORM_CLONE_APPROVED: "Sao chép biểu mẫu đã duyệt",
  DYNAMIC_FORM_CLONE_REJECTED: "Sao chép biểu mẫu bị từ chối",
  REPORT_REVIEW_REQUIRED: "Cần duyệt báo cáo",
  ASSIGNMENT_EVALUATION_REQUIRED: "Cần đánh giá",
  ASSIGNMENT_AT_RISK: "Phần việc có nguy cơ",
  ASSIGNMENT_OVERDUE: "Phần việc quá hạn",
  REPORT_PERIOD_AT_RISK: "Kỳ báo cáo có nguy cơ",
  REPORT_PERIOD_OVERDUE: "Kỳ báo cáo quá hạn",
  DYNAMIC_FORM_STATISTIC_REBUILD: "Cập nhật thống kê",
};

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "Chung",
  HANDOVER: "Bàn giao",
  APPROVAL: "Phê duyệt",
  REPORT: "Báo cáo",
  STATUS: "Trạng thái",
};

const ACTION_STATE_LABELS: Record<string, string> = {
  OPEN: "Cần xử lý",
  RESOLVED: "Đã xử lý",
  DISMISSED: "Đã bỏ qua",
  PENDING: "Chờ xử lý",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};

const SEVERITY_LABELS: Record<string, string> = {
  INFO: "Thông tin",
  WARNING: "Cảnh báo",
  DUE: "Đến hạn",
  ERROR: "Lỗi",
};

const LEGACY_NOTIFICATION_TEXT: Record<string, string> = {
  "Bao cao den han": "Báo cáo đến hạn",
  "Cong viec den han": "Công việc đến hạn",
  "Assignment den han": "Phần việc đến hạn",
  "Ban duoc giao assignment": "Bạn được giao việc",
  "Ban nhan ban giao assignment": "Bạn nhận bàn giao phần việc",
  "Ban da ban giao assignment": "Bạn đã bàn giao phần việc",
  "Có yêu cầu clone Dynamic Form": "Có yêu cầu sao chép biểu mẫu động",
  "Yêu cầu clone Dynamic Form đã được duyệt": "Yêu cầu sao chép biểu mẫu động đã được duyệt",
  "Yêu cầu clone Dynamic Form bị từ chối": "Yêu cầu sao chép biểu mẫu động bị từ chối",
  "Cập nhật thống kê Dynamic Form đã hoàn tất": "Cập nhật thống kê biểu mẫu động đã hoàn tất",
  "Cập nhật thống kê Dynamic Form bị lỗi": "Cập nhật thống kê biểu mẫu động bị lỗi",
};

function normalizeCode(value?: string | null) {
  return String(value ?? "").trim().toUpperCase();
}

function fallbackCodeLabel(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getNotificationTypeLabel(value?: string | null) {
  const code = normalizeCode(value);
  return TYPE_LABELS[code] ?? fallbackCodeLabel(value);
}

export function getNotificationCategoryLabel(value?: string | null) {
  const code = normalizeCode(value);
  return CATEGORY_LABELS[code] ?? fallbackCodeLabel(value);
}

export function getNotificationActionStateLabel(value?: string | null) {
  const code = normalizeCode(value);
  return ACTION_STATE_LABELS[code] ?? fallbackCodeLabel(value);
}

export function getNotificationSeverityLabel(value?: string | null) {
  const code = normalizeCode(value);
  return SEVERITY_LABELS[code] ?? fallbackCodeLabel(value);
}

export function getNotificationPrimaryTagLabel(row: NotificationRow) {
  return (
    getNotificationTypeLabel(row.type) ||
    getNotificationCategoryLabel(row.category) ||
    getNotificationSeverityLabel(row.severity) ||
    "Thông báo"
  );
}

export function normalizeNotificationText(value?: string | null) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return LEGACY_NOTIFICATION_TEXT[text] ?? text;
}
