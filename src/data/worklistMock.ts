// src/data/workListMock.ts

export type WorkType = "TASK" | "INDICATOR";

export type WorkStatus = "COMPLETED" | "IN_PROGRESS" | "AT_RISK" | "DELAYED";

export interface WorkListItem {
  id: string;
  name: string;
  assignedCount: number;
  overallProgress: number; // 0–100
  status: WorkStatus;
}

export const MOCK_WORK_ITEMS: WorkListItem[] = [
  {
    id: "NV001",
    name: "Xây dựng báo cáo định kỳ tháng về công tác A",
    assignedCount: 10,
    overallProgress: 100,
    status: "COMPLETED",
  },
  {
    id: "NV002",
    name: "Triển khai kế hoạch kiểm tra chuyên đề quý I",
    assignedCount: 8,
    overallProgress: 60,
    status: "IN_PROGRESS",
  },
  {
    id: "NV003",
    name: "Rà soát, cập nhật dữ liệu hệ thống nghiệp vụ",
    assignedCount: 6,
    overallProgress: 45,
    status: "AT_RISK",
  },
  {
    id: "NV004",
    name: "Tổ chức tập huấn cho cán bộ chiến sĩ",
    assignedCount: 12,
    overallProgress: 20,
    status: "DELAYED",
  },
];
