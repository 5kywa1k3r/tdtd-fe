import { type UserRefDTO } from "./userRefDto";

export const WORK_STATUS = {
  S1: 1,
  S2: 2,
  S3: 3,
  S4: 4,
  S5: 5,
} as const;
export type WorkStatusCore = typeof WORK_STATUS[keyof typeof WORK_STATUS];

export const WORK_TYPE = {
  TASK: 1,
  INDICATOR: 2,
} as const;
export type WorkTypeCore = typeof WORK_TYPE[keyof typeof WORK_TYPE];

export const WORK_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
} as const;
export type WorkPriorityCore = typeof WORK_PRIORITY[keyof typeof WORK_PRIORITY];

export interface WorkListRow {
  id: string;
  autoCode: string;
  code?: string | null;
  name: string;

  status: WorkStatusCore;
  priority: WorkPriorityCore;
  type: WorkTypeCore;

  createdByUserId?: string | null;
  ownerName?: string | null;

  leaderDirectiveUserId?: string | null;
  leaderWatchCount: number;

  evaluationTemplateId?: string | null;
  evaluationTemplateCode?: string | null;
  evaluationTemplateLabel?: string | null;

  hasManualEvaluations?: boolean;
  evaluatedAssignmentCount?: number;
  worstEvaluationCode?: string | null;
  worstEvaluationLabel?: string | null;

  dueDate?: string | null;
  createdAtUtc: string;
  attachmentCount?: number;
}

export interface WorkDetail {
  id: string;
  autoCode: string;
  code?: string | null;
  name: string;
  description?: string | null;
  note?: string | null;

  status: WorkStatusCore;
  priority: WorkPriorityCore;
  type: WorkTypeCore;

  createdByUserId?: string | null;
  leaderDirectiveUserId?: string | null;
  leaderWatchUserIds: string[];

  evaluationTemplateId?: string | null;
  evaluationTemplateCode?: string | null;
  evaluationTemplateLabel?: string | null;

  hasManualEvaluations?: boolean;
  evaluatedAssignmentCount?: number;
  worstEvaluationCode?: string | null;
  worstEvaluationLabel?: string | null;

  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;

  createdAtUtc: string;
  updatedAtUtc: string;

  owner?: UserRefDTO | null;
  leaderDirective?: UserRefDTO | null;
  leaderWatch?: UserRefDTO[];
}

export interface ParentWork extends WorkListRow {
  parentId?: string | null;
}

export const WORK_TYPE_OPTIONS = [
  { value: WORK_TYPE.TASK, label: "Nhiệm vụ" },
  { value: WORK_TYPE.INDICATOR, label: "Chỉ tiêu" },
] as const;

export const WORK_PRIORITY_OPTIONS = [
  { value: WORK_PRIORITY.LOW, label: "Thấp" },
  { value: WORK_PRIORITY.MEDIUM, label: "Trung bình" },
  { value: WORK_PRIORITY.HIGH, label: "Cao" },
] as const;

export const WORK_STATUS_OPTIONS = [
  { value: WORK_STATUS.S1, label: "Chưa bắt đầu" },
  { value: WORK_STATUS.S2, label: "Đang thực hiện" },
  { value: WORK_STATUS.S3, label: "Hoàn thành" },
  { value: WORK_STATUS.S4, label: "Có nguy cơ quá hạn" },
  { value: WORK_STATUS.S5, label: "Quá hạn" },
] as const;

export function getWorkStatusLabel(status?: WorkStatusCore | null): string {
  switch (status) {
    case WORK_STATUS.S1:
      return "Chưa bắt đầu";
    case WORK_STATUS.S2:
      return "Đang thực hiện";
    case WORK_STATUS.S3:
      return "Hoàn thành";
    case WORK_STATUS.S4:
      return "Có nguy cơ quá hạn";
    case WORK_STATUS.S5:
      return "Quá hạn";
    default:
      return "Chưa rõ";
  }
}
