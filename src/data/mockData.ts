// src/data/mock-work/mockData.ts
import type { ParentWork, ReportingUnitRow } from '../types/work';
import {
  WORK_STATUS_FILTER
} from '../constants/status';

// Đơn vị nhận nhiệm vụ (dùng cho select multiple)
export const MOCK_UNITS = [
  { id: 'p1', name: 'Phòng A' },
  { id: 'p2', name: 'Phòng B' },
  { id: 'p3', name: 'Phòng C' },
];

// Ví dụ danh sách Work để dùng cho WorkListPage (demo)
export const MOCK_WORK_LIST: ParentWork[] = [
  {
    id: 'W_A',
    code: 'NV-001',
    name: 'Nhiệm vụ A giao cho đơn vị hiện tại',
    fromDate: '2025-01-01',
    toDate: '2025-03-31',
    leader: 'Đ/c A1 - Bộ trưởng',
    focalOfficer: 'Đ/c B',
    status: WORK_STATUS_FILTER.COMPLETED,
  },
  {
    id: 'W_B',
    code: 'NV-002',
    name: 'Nhiệm vụ B giao (con của A)',
    fromDate: '2025-02-01',
    toDate: '2025-04-30',
    leader: 'Đ/c C1 - Thứ trưởng',
    focalOfficer: 'Đ/c D',
    status: WORK_STATUS_FILTER.DELAYED,
  },
];

// Ví dụ danh sách báo cáo đơn vị (demo)
export const MOCK_REPORTING_UNITS: ReportingUnitRow[] = [
  {
    id: 'u1',
    unitName: 'Phòng A',
    officerName: 'Nguyễn Văn A',
    officerPhone: '0912 xxxx',
    officerEmail: '',
    status: 'NOT_REPORTED',
    hasDifficulties: false,
  },
  {
    id: 'u2',
    unitName: 'Phòng B',
    officerName: 'Trần Thị B',
    status: 'REPORTED',
    hasDifficulties: true,
    submittedAt: '2025-11-20',
  },
];

/// ========== MOCK CHO WorkNodePage ==========

// Tạo mock 1 work (cha hoặc con) theo id + type
export const createMockParentWork = (
  id: string,
  type: 'TASK' | 'INDICATOR'
): ParentWork => ({
  id,
  code: (type === 'TASK' ? 'NV-' : 'CT-') + id,
  name: (type === 'TASK' ? 'Nhiệm vụ ' : 'Chỉ tiêu ') + id,
  fromDate: '2025-01-01',
  toDate: '2025-12-31',
  leader: 'Đ/c A - Phó Giám đốc',
  focalOfficer: 'Đ/c B - Cán bộ đầu mối',
  status: WORK_STATUS_FILTER.COMPLETED,
  // parentId: có thể set ở ngoài nếu cần
});

// Tạo mock danh sách con cho một work
export const createMockChildrenForWork = (parentId: string): ParentWork[] => [
  {
    id: `${parentId}-C1`,
    code: 'NV-C1',
    name: 'Nhiệm vụ con 1',
    fromDate: '2025-01-01',
    toDate: '2025-03-31',
    leader: 'Đ/c C - Trưởng phòng',
    focalOfficer: 'Đ/c D',
    parentId,
    status: WORK_STATUS_FILTER.NOT_STARTED,
  },
  {
    id: `${parentId}-C2`,
    code: 'NV-C2',
    name: 'Nhiệm vụ con 2',
    fromDate: '2025-04-01',
    toDate: '2025-06-30',
    leader: 'Đ/c E - Chỉ huy đội',
    focalOfficer: 'Đ/c F',
    parentId,
    status: WORK_STATUS_FILTER.AT_RISK,
  },
];

// =======================
// MOCK LEADER LIST (đơn giản)
// =======================

// Tách phần tên trước " - "
const extractLeaderName = (full: string): string => {
  if (!full) return '';
  return full.split(' - ')[0].trim();
};

// Lấy leader từ danh sách cha
const leadersFromWork = MOCK_WORK_LIST.map(w => extractLeaderName(w.leader));

// Lấy leader từ danh sách children (nếu cần)
const leadersFromChildren = [
  ...createMockChildrenForWork('W_A').map(w => extractLeaderName(w.leader)),
  ...createMockChildrenForWork('W_B').map(w => extractLeaderName(w.leader)),
];

// Gom lại, loại trùng
export const MOCK_LEADER_OPTIONS: string[] = Array.from(
  new Set([...leadersFromWork, ...leadersFromChildren])
).filter(Boolean);
