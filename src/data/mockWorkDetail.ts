import { WORK_STATUS_FILTER } from '../constants/status';
import type { WorkDetailData } from '../components/works/WorkForm';

export type WorkAttachmentMock = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  description?: string | null;
};

export type WorkDetailMock = {
  id: string;
  type: 'TASK' | 'INDICATOR';

  code: string;
  name: string;

  fromDate: string;
  toDate: string;

  status: keyof typeof WORK_STATUS_FILTER;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  unit: {
    id: string;
    name: string;
  };

  leader: string;
  focalOfficer: string;

  basisText?: string;
  basisAttachments: WorkAttachmentMock[];

  note?: string;
};

export const MOCK_WORK_DETAIL_MAP: Record<string, WorkDetailData> = {
  W_A: {
    id: 'W_A',
    type: 'TASK',
    code: 'NV-001',
    name: 'Nhiệm vụ A giao cho đơn vị hiện tại',
    fromDate: '2025-01-01',
    toDate: '2025-03-31',
    priority: 'HIGH',
    leader: { id: 'L1', name: 'Đ/c A1 - Bộ trưởng' },
    focalOfficer: { id: 'O1', name: 'Đ/c B' },
    basisText: 'Căn cứ Kế hoạch số 12/KH-CA ngày 05/01/2025.',
    note: 'Dữ liệu mock cho trang chi tiết.',
    basisAttachments: [
      {
        id: 'ATT_1',
        fileName: 'Ke_hoach_12-KH-CA.pdf',
        fileSize: 345678,
        mimeType: 'application/pdf',
        description: 'Kế hoạch gốc',
      },
    ],
  },
};

export const MOCK_WORK_DETAIL: WorkDetailMock = {
  id: 'W_A',
  type: 'TASK',

  code: 'NV-001',
  name: 'Nhiệm vụ A giao cho đơn vị hiện tại',

  fromDate: '2025-01-01',
  toDate: '2025-03-31',

  status: WORK_STATUS_FILTER.COMPLETED,
  priority: 'HIGH',

  unit: {
    id: 'p1',
    name: 'Phòng A',
  },

  leader: 'Đ/c A1 - Bộ trưởng',
  focalOfficer: 'Đ/c B',

  basisText:
    'Căn cứ Kế hoạch số 12/KH-CA ngày 05/01/2025 của Công an tỉnh.',

  basisAttachments: [
    {
      id: 'ATT-1',
      fileName: 'Ke_hoach_12-KH-CA.pdf',
      fileSize: 345678,
      mimeType: 'application/pdf',
      description: 'Kế hoạch gốc',
    },
    {
      id: 'ATT-2',
      fileName: 'Cong_van_chi_dao.docx',
      fileSize: 123456,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      description: 'Công văn chỉ đạo',
    },
  ],

  note: 'Ưu tiên triển khai trong quý I.',
};

