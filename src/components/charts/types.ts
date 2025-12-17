import type { WorkStatusCore } from '../../constants/status';

/**
 * Kiểu data cơ bản cho mọi chart.
 * Yêu cầu: mỗi điểm dữ liệu là object key: string -> string | number
 */
export interface ChartDataInput {
  [key: string]: string | number;
}

/**
 * Dùng cho pie chart 5 trạng thái.
 * Vẫn tương thích ChartDataInput nhờ extends.
 */
export interface StatusPieItem extends ChartDataInput {
  status: WorkStatusCore; // key logic
  label: string;          // label hiển thị
  value: number;          // số lượng
}

/**
 * Dùng cho bar chart breakdown theo đơn vị.
 * (vd: đơn vị nào có bao nhiêu nhiệm vụ với status X)
 */
export interface StatusBreakdownItem extends ChartDataInput {
  unit: string;
  count: number;
}
