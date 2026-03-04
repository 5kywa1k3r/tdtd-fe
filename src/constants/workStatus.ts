export type WorkStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'AT_RISK'
  | 'DELAYED'
  | 'COMPLETED';

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang thực hiện',
  AT_RISK: 'Có nguy cơ trễ hạn',
  DELAYED: 'Trễ hạn',
  COMPLETED: 'Hoàn thành',
};

export type WorkStatusFilterValue = WorkStatus | 'ALL';