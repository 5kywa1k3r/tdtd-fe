// src/types/work.ts
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

  leaderDirectiveUserId: string;
  leaderWatchCount: number;

  dueDate?: string | null;
  createdAtUtc: string;
}

export interface WorkDetail {
  id: string;
  autoCode: string;
  code?: string | null;
  name: string;
  description?: string | null;
  note?: string | null;

  status: WorkStatusCore;
  createdByUserId?: string | null;

  leaderDirectiveUserId: string;
  leaderWatchUserIds: string[];

  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;

  priority: WorkPriorityCore;
  type: WorkTypeCore;

  createdAtUtc: string;
  updatedAtUtc: string;

  owner?: UserRefDTO | null;
  leaderDirective?: UserRefDTO | null;
  leaderWatch?: UserRefDTO[];
}

export interface ParentWork {
  id: string;
  autoCode: string;
  code?: string | null;
  name: string;

  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;

  leaderDirectiveUserId: string;
  leaderWatchCount: number;
  createdAtUtc: string;

  parentId?: string | null;
  status: WorkStatusCore;
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
  { value: WORK_STATUS.S1, label: "Trạng thái 1" },
  { value: WORK_STATUS.S2, label: "Trạng thái 2" },
  { value: WORK_STATUS.S3, label: "Trạng thái 3" },
  { value: WORK_STATUS.S4, label: "Trạng thái 4" },
  { value: WORK_STATUS.S5, label: "Trạng thái 5" },
] as const;

export interface WorkListRow {
  id: string;
  autoCode: string;
  code?: string | null;
  name: string;
  status: WorkStatusCore;

  leaderDirectiveUserId: string;
  leaderWatchCount: number;

  dueDate?: string | null;
  createdAtUtc: string;

  attachmentCount: number;
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

  leaderDirectiveUserId: string;
  leaderWatchUserIds: string[];

  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;

  createdAtUtc: string;
  updatedAtUtc: string;

  owner?: UserRefDTO | null;
  leaderDirective?: UserRefDTO | null;
  leaderWatch?: UserRefDTO[];
}

export interface ParentWork {
  id: string;
  autoCode: string;
  code?: string | null;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;
  leaderDirectiveUserId: string;
  leaderWatchCount: number;
  createdAtUtc: string;
  parentId?: string | null;
  status: WorkStatusCore;
}