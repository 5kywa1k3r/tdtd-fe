export type NotificationSeverity = "INFO" | "WARNING" | "DUE" | string;

export type NotificationType =
  | "WORK_DUE"
  | "ASSIGNMENT_DUE"
  | "REPORT_DUE"
  | "ASSIGNMENT_ASSIGNED"
  | "ASSIGNMENT_HANDOVER_RECEIVED"
  | "ASSIGNMENT_HANDOVER_COMPLETED"
  | "ASSIGNMENT_HANDOVER_REQUESTED"
  | "ASSIGNMENT_HANDOVER_APPROVED"
  | "ASSIGNMENT_HANDOVER_REJECTED"
  | "DYNAMIC_FORM_CLONE_REQUESTED"
  | "DYNAMIC_FORM_CLONE_APPROVED"
  | "DYNAMIC_FORM_CLONE_REJECTED"
  | "REPORT_REVIEW_REQUIRED"
  | "ASSIGNMENT_EVALUATION_REQUIRED"
  | "ASSIGNMENT_AT_RISK"
  | "ASSIGNMENT_OVERDUE"
  | "REPORT_PERIOD_AT_RISK"
  | "REPORT_PERIOD_OVERDUE"
  | "DYNAMIC_FORM_STATISTIC_REBUILD"
  | string;

export type NotificationRow = {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body?: string | null;
  workId?: string | null;
  workType?: number | null;
  workName?: string | null;
  workAssignmentId?: string | null;
  assignmentCode?: string | null;
  workReportPeriodId?: string | null;
  workAssignmentReportId?: string | null;
  category?: string | null;
  requiresAction?: boolean | null;
  actionState?: string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  requestId?: string | null;
  actionUrl?: string | null;
  resolvedAtUtc?: string | null;
  actorUserId?: string | null;
  sourceUserId?: string | null;
  targetUserId?: string | null;
  dueAtUtc?: string | null;
  occurredAtUtc: string;
  readAtUtc?: string | null;
  clickedAtUtc?: string | null;
  createdAtUtc: string;
};

export type NotificationSearchRequest = {
  cursorOccurredAtUtc?: string | null;
  cursorId?: string | null;
  pageSize?: number;
  workId?: string | null;
  workAssignmentId?: string | null;
  unreadOnly?: boolean | null;
  types?: string[] | null;
  category?: string | null;
  requiresAction?: boolean | null;
  actionState?: string | null;
};

export type NotificationSearchResponse = {
  items: NotificationRow[];
  nextCursorOccurredAtUtc?: string | null;
  nextCursorId?: string | null;
  hasMore: boolean;
  unreadCount: number;
};

export type NotificationUnreadCountResponse = {
  unreadCount: number;
};

export type NotificationRealtimeMessage = {
  notificationId: string;
  type: NotificationType;
  occurredAtUtc: string;
  changeKind?: "CREATED" | "READ" | "READ_MANY" | "READ_ALL" | string;
};
