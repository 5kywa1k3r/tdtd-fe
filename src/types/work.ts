// src/types/work.ts
import type { WorkStatusCore } from '../constants/status';

export type ReportScheduleType =
  | 'BY_DATE'
  | 'BY_DATE_LIST'
  | 'BY_WEEK'
  | 'BY_WEEK_LIST'
  | 'WEEKDAY_EVERY_WEEK'
  | 'BY_MONTH'
  | 'WEEK_OF_MONTH'
  | 'BY_QUARTER'
  | 'BY_QUARTER_LIST'
  | 'HALF_YEAR'
  | 'YEARLY';

export interface ParentWork {
  id: string;
  code: string;
  name: string;
  fromDate: string;
  toDate: string;
  leader: string;
  focalOfficer: string;
  // 👇 thêm để biết nó là con của ai (optional)
  parentId?: string | null;
  status: WorkStatusCore;
}

export interface CommonAttributes {
  name: string;
  fromDate: string;
  toDate: string;
  basis: string; // Căn cứ giao work
  priority: 'NORMAL' | 'URGENT' | 'VERY_URGENT';
  directingLeader: string;
  unitIds: string[]; // DANH SÁCH đơn vị nhận nhiệm vụ
  scheduleType: ReportScheduleType | '';
  scheduleConfig: any; // tạm để any, sau refine sau
}

export type ReportStatus = 'NOT_REPORTED' | 'REPORTED' | 'LATE';

export interface ReportingUnitRow {
  id: string;
  unitName: string;
  officerName: string;
  officerPhone?: string;
  officerEmail?: string;
  status: ReportStatus;
  hasDifficulties: boolean;
  submittedAt?: string; // ngày báo cáo
}

export interface ReportingUnitDetail {
  id: string;
  basis: string;
  content?: string; // nội dung thực hiện / hoặc mô tả bảng biểu
  difficulties?: string;
  submittedAt?: string;
  solution?: string; // phương án xử lý
  comment?: string; // nhận xét đánh giá
}

// UI mode: TREE = giao diện (1) – nhiệm vụ + danh sách con
//          DETAIL = giao diện (2) – cập nhật nhiệm vụ
export type WorkUiMode = 'TREE' | 'DETAIL';

export interface WorkState {
  // Work đang được xem / chỉnh
  parentWork: ParentWork | null;

  showHeader: boolean;
  mode: 'VIEW' | 'ADDING_WORK' | 'ADDING_TEMPLATE';
  templates: { id: string; name: string }[];

  // Giao diện hiện tại: TREE hay DETAIL
  uiMode: WorkUiMode;

  // Form thuộc tính chung dùng khi bấm "Thêm"
  commonAttributes: CommonAttributes;

  // Danh sách work con trực tiếp (cây)
  children: ParentWork[];

  // Danh sách work trong màn WorkList (có thể được giao từ nhiều thằng)
  workList: ParentWork[];

  // Phần báo cáo
  reportingUnits: ReportingUnitRow[];
  selectedUnitDetail: ReportingUnitDetail | null;

  loading: boolean;
  error?: string;
}

//REAL CODE, trên là mock up
import type { WorkStatus } from '../constants/workStatus';

export type WorkType = 'TASK' | 'INDICATOR';

export type UserLite = { id: string; name: string; rank?: number | null };

export type WorkRow = {
  id: string;
  type: WorkType;
  code: string | null;
  name: string;

  status: WorkStatus;
  fromDate: string;
  toDate: string;

  unitIds: string[];

  leader?: UserLite | null;         // lãnh đạo chỉ đạo
  watcherLeader?: UserLite | null;  // lãnh đạo theo dõi
  focalOfficer?: { id: string; name: string } | null;

  canEdit: boolean;                 // BE quyết định
};

export type WorkDetail = WorkRow & {
  priority?: 'LOW'|'MEDIUM'|'HIGH'|null;
  basisText?: string | null;
  note?: string | null;
  basisAttachments?: {
    id: string;
    fileName: string;
    fileSize?: number | null;
    mimeType?: string | null;
    description?: string | null;
    downloadUrl?: string | null;
  }[];
};