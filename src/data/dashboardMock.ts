// src/data/dashboardMock.ts
import dayjs from 'dayjs';
import type { DateHierarchyFilterValue } from '../types/dateHierarchy';
import type { WorkStatusCore } from '../constants/status';
import {
  WORK_STATUS_FILTER,
  STATUS_LABELS,
  WORK_STATUS_CORE_LIST,
} from '../constants/status';
import type { StatusPieItem } from '../components/charts';

//  import cây đơn vị
import type { UnitId, UnitNode } from '../data/unitMock';
import { UNIT_TREE } from '../data/unitMock';

export type MissionType = 'MISSION' | 'TARGET';

export interface MissionItem {
  id: string;
  title: string;
  unitId: UnitId;          //  thay vì unit: string
  category: string;
  type: MissionType;       // Nhiệm vụ / Chỉ tiêu
  startDate: string;
  dueDate: string;
  completedDate?: string;
  status: WorkStatusCore;
}

export interface MissionSummary {
  total: number;
  byStatus: Record<WorkStatusCore, number>;
}

export interface DashboardMockData {
  filter: DateHierarchyFilterValue;
  missionSummary: MissionSummary;
  missionStatusPie: StatusPieItem[];
  missions: MissionItem[];
  units: UnitNode[];       //  trả về cây đơn vị
}

const now = dayjs();

//  sửa toàn bộ mock: unit → unitId = UnitId
export const MOCK_MISSIONS: MissionItem[] = [
  {
    id: 'M1',
    title: 'Xây dựng kế hoạch công tác quý I',
    unitId: 'DOI_THAM_MUU',
    category: 'Kế hoạch',
    type: 'MISSION',
    startDate: now.subtract(5, 'day').toISOString(),
    dueDate: now.add(5, 'day').toISOString(),
    completedDate: now.add(1, 'day').toISOString(),
    status: WORK_STATUS_FILTER.COMPLETED,
  },
  {
    id: 'M2',
    title: 'Tổng hợp số liệu báo cáo tháng',
    unitId: 'DOI_TONG_HOP',
    category: 'Báo cáo định kỳ',
    type: 'MISSION',
    startDate: now.startOf('month').add(1, 'day').toISOString(),
    dueDate: now.endOf('month').toISOString(),
    status: WORK_STATUS_FILTER.IN_PROGRESS,
  },
  {
    id: 'M3',
    title: 'Thực hiện nhiệm vụ chuyên đề A',
    unitId: 'DOI_NGHIEP_VU_1',
    category: 'Chuyên đề',
    type: 'MISSION',
    startDate: now.subtract(10, 'day').toISOString(),
    dueDate: now.add(2, 'day').toISOString(),
    status: WORK_STATUS_FILTER.DELAYED,
  },
  {
    id: 'M4',
    title: 'Kiểm tra công tác tại cơ sở',
    unitId: 'DOI_NGHIEP_VU_2',
    category: 'Kiểm tra',
    type: 'MISSION',
    startDate: now.subtract(2, 'day').toISOString(),
    dueDate: now.add(3, 'day').toISOString(),
    status: WORK_STATUS_FILTER.AT_RISK,
  },
  {
    id: 'M5',
    title: 'Xây dựng đề án chuyển đổi số',
    unitId: 'PHONG_CONG_NGHE',
    category: 'Đề án',
    type: 'TARGET',
    startDate: now.add(5, 'day').toISOString(),
    dueDate: now.add(40, 'day').toISOString(),
    status: WORK_STATUS_FILTER.NOT_STARTED,
  },

  // ===== Thêm để test bar chart =====
  {
    id: 'M6',
    title: 'Hoàn thành chuyên đề B',
    unitId: 'DOI_NGHIEP_VU_1',
    category: 'Chuyên đề',
    type: 'MISSION',
    startDate: now.subtract(20, 'day').toISOString(),
    dueDate: now.subtract(5, 'day').toISOString(),
    completedDate: now.subtract(3, 'day').toISOString(),
    status: WORK_STATUS_FILTER.COMPLETED,
  },
  {
    id: 'M7',
    title: 'Hoàn thành báo cáo tổng kết năm',
    unitId: 'DOI_TONG_HOP',
    category: 'Báo cáo tổng kết',
    type: 'TARGET',
    startDate: now.subtract(30, 'day').toISOString(),
    dueDate: now.subtract(1, 'day').toISOString(),
    completedDate: now.subtract(1, 'day').toISOString(),
    status: WORK_STATUS_FILTER.COMPLETED,
  },
  {
    id: 'M8',
    title: 'Chuẩn bị kế hoạch công tác quý II',
    unitId: 'PHONG_CONG_NGHE',
    category: 'Kế hoạch',
    type: 'MISSION',
    startDate: now.add(10, 'day').toISOString(),
    dueDate: now.add(60, 'day').toISOString(),
    status: WORK_STATUS_FILTER.NOT_STARTED,
  },
  {
    id: 'M9',
    title: 'Theo dõi tiến độ hồ sơ chuyên đề C',
    unitId: 'DOI_NGHIEP_VU_2',
    category: 'Theo dõi',
    type: 'MISSION',
    startDate: now.subtract(3, 'day').toISOString(),
    dueDate: now.add(20, 'day').toISOString(),
    status: WORK_STATUS_FILTER.IN_PROGRESS,
  },
  {
    id: 'M10',
    title: 'Rà soát lại quy trình nội bộ',
    unitId: 'DOI_THAM_MUU',
    category: 'Rà soát',
    type: 'TARGET',
    startDate: now.subtract(7, 'day').toISOString(),
    dueDate: now.add(1, 'day').toISOString(),
    status: WORK_STATUS_FILTER.AT_RISK,
  },
  {
    id: 'M11',
    title: 'Hoàn thiện báo cáo chuyên đề D',
    unitId: 'VAN_PHONG_CO_QUAN',
    category: 'Báo cáo chuyên đề',
    type: 'MISSION',
    startDate: now.subtract(12, 'day').toISOString(),
    dueDate: now.subtract(1, 'day').toISOString(),
    status: WORK_STATUS_FILTER.DELAYED,
  },
];

function isWithinRange(
  dateStr: string,
  from: dayjs.Dayjs,
  to: dayjs.Dayjs
): boolean {
  const d = dayjs(dateStr);
  return !d.isBefore(from, 'day') && !d.isAfter(to, 'day');
}

function buildMissionStatusPie(missions: MissionItem[]): StatusPieItem[] {
  const counts: Record<WorkStatusCore, number> = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    AT_RISK: 0,
    DELAYED: 0,
    COMPLETED: 0,
  };

  missions.forEach((m) => {
    counts[m.status] += 1;
  });

  return WORK_STATUS_CORE_LIST.map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
    value: counts[s],
  }));
}

export async function getDashboardMockData(
  filter: DateHierarchyFilterValue
): Promise<DashboardMockData> {
  const { from, to } = filter;

  const missionsInRange = MOCK_MISSIONS.filter((m) =>
    isWithinRange(m.startDate, from, to)
  );

  const byStatus: Record<WorkStatusCore, number> = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    AT_RISK: 0,
    DELAYED: 0,
    COMPLETED: 0,
  };

  missionsInRange.forEach((m) => {
    byStatus[m.status] += 1;
  });

  const missionSummary: MissionSummary = {
    total: missionsInRange.length,
    byStatus,
  };

  const missionStatusPie = buildMissionStatusPie(missionsInRange);

  //  trả luôn cây UNIT_TREE, dropdown tự xử lý "Tất cả đơn vị"
  const units: UnitNode[] = UNIT_TREE;

  return {
    filter,
    missionSummary,
    missionStatusPie,
    missions: missionsInRange,
    units,
  };
}
