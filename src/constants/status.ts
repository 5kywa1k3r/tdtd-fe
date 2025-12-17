// Trạng thái filter tổng (dropdown,…)
export const WORK_STATUS_FILTER = {
  ALL: 'ALL',
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  AT_RISK: 'AT_RISK',
  DELAYED: 'DELAYED',
  COMPLETED: 'COMPLETED',
} as const;

export type WorkStatusFilterValue =
  (typeof WORK_STATUS_FILTER)[keyof typeof WORK_STATUS_FILTER];

// 5 trạng thái "core" dùng cho nhiệm vụ / chỉ tiêu / pie chart
export type WorkStatusCore = Exclude<WorkStatusFilterValue, 'ALL'>;

export const WORK_STATUS_CORE_LIST: WorkStatusCore[] = [
  WORK_STATUS_FILTER.NOT_STARTED,
  WORK_STATUS_FILTER.IN_PROGRESS,
  WORK_STATUS_FILTER.AT_RISK,
  WORK_STATUS_FILTER.DELAYED,
  WORK_STATUS_FILTER.COMPLETED,
];

// Label hiển thị
export const STATUS_LABELS: Record<WorkStatusFilterValue, string> = {
  ALL: 'Tất cả trạng thái',
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang thực hiện',
  AT_RISK: 'Có nguy cơ trễ hạn',
  DELAYED: 'Trễ hạn',
  COMPLETED: 'Hoàn thành',
};

export const STATUS_FILTER_OPTIONS = WORK_STATUS_CORE_LIST.map((s) => ({
  value: s,
  label: STATUS_LABELS[s],
}));

// Màu mặc định cho 5 trạng thái (pie / bar)
export const STATUS_COLORS: Record<WorkStatusCore, string> = {
  NOT_STARTED: '#9e9e9e',
  IN_PROGRESS: '#42a5f5',
  AT_RISK: '#ffb300',
  DELAYED: '#ef5350',
  COMPLETED: '#66bb6a',
};
