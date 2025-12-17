import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { WorkStatusCore } from '../../constants/status';
import {
  STATUS_LABELS,
  STATUS_COLORS
} from '../../constants/status';
import type { StatusBreakdownItem } from './types';

interface StatusBreakdownBarChartProps {
  data: StatusBreakdownItem[];
  status: WorkStatusCore | null;
  height?: number;
}

export function StatusBreakdownBarChart({
  data,
  status,
  height = 300,
}: StatusBreakdownBarChartProps) {
  if (!status) {
    return (
      <div style={{ fontSize: 12, color: '#777' }}>
        Bấm vào phần trạng thái trên biểu đồ tròn để xem chi tiết.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"         // 🔥 xoay ngang đúng chuẩn
        margin={{
          top: 10,
          right: 20,
          left: 60,
          bottom: 10,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />

        {/* Trục đơn vị (theo chiều dọc) */}
        <YAxis
          dataKey="unit"
          type="category"
          width={150}            // đủ rộng để tên đơn vị không bị cắt
        />

        {/* Trục số lượng (thành bar ngang) */}
        <XAxis type="number" allowDecimals={false} />

        <Tooltip />

        <Bar
          dataKey="count"
          name={STATUS_LABELS[status]}
          fill={STATUS_COLORS[status]}     // 🔥 dùng màu chuẩn từ constants
          radius={[4, 4, 4, 4]}            // bo góc đẹp hơn
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
