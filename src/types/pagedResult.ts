export type PagedResult<T> = {
  rows: T[];
  totalRows: number;
  page: number; // 0-based
  pageSize: number;
};