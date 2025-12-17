// src/types/dateHierarchy.ts
import { Dayjs } from 'dayjs';

export type DateHierarchyLevel = 'year' | 'quarter' | 'month' | 'week' | 'day';

export interface DateHierarchyFilterValue {
  level: DateHierarchyLevel;
  from: Dayjs;
  to: Dayjs;
}
