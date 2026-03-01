// src/api/workApi.ts
import type { Priority } from '../constants/priority';

export type WorkType = 'TASK' | 'INDICATOR';

export type WorkAttachmentMeta = {
  id: string;
  fileName: string;
  fileSize?: number | null;
  mimeType?: string | null;
  description?: string | null;
};

export type WorkDetailData = {
  id: string;
  type: WorkType;
  code?: string | null;
  name: string;

  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD

  unitIds: string[]; // lưu list unitId (FE đang chọn nhiều)

  leaderId?: string | null;
  focalOfficerId?: string | null;

  priority?: Priority | null;
  basisText?: string | null;
  note?: string | null;

  basisAttachments?: WorkAttachmentMeta[] | null;

  createdAt: string;
  updatedAt: string;
};

export type CreateWorkInput = Omit<WorkDetailData, 'id' | 'createdAt' | 'updatedAt'>;

const LS_KEY = 'tdtd_works_v1';

function uid(prefix = 'w') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function loadAll(): WorkDetailData[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkDetailData[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(list: WorkDetailData[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

export const workApi = {
  async create(input: CreateWorkInput): Promise<WorkDetailData> {
    const now = new Date().toISOString();
    const entity: WorkDetailData = {
      ...input,
      id: uid('work'),
      createdAt: now,
      updatedAt: now,
    };

    const list = loadAll();
    list.unshift(entity);
    saveAll(list);

    return entity;
  },

  async getById(id: string): Promise<WorkDetailData | null> {
    const list = loadAll();
    return list.find((x) => x.id === id) ?? null;
  },

  async list(): Promise<WorkDetailData[]> {
    return loadAll();
  },
};
