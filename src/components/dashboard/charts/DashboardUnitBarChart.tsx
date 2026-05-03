import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Stack, Typography } from "@mui/material";

import type { DashboardUnitBarRowDto } from "../../../types/dashboard";

type Props = {
  title: string;
  rows: DashboardUnitBarRowDto[];
  selectedLabel?: string | null;
  height?: number;
  emptyText?: string;
};

export default function DashboardUnitBarChart({
  title,
  rows,
  selectedLabel,
  height = 320,
  emptyText = "Chưa có dữ liệu đơn vị để hiển thị.",
}: Props) {
  const chartData = rows.map((row) => {
    const data: Record<string, string | number> = {
      unitLabel: row.unitLabel,
      total: row.total,
    };

    for (const segment of row.segments) {
      data[segment.key] = segment.value;
    }

    return data;
  });

  const segmentDefs = rows[0]?.segments ?? [];
  const dynamicHeight = Math.max(height, chartData.length * 56 + 40);

  return (
    <Stack spacing={0.5} sx={{ height: "100%" }}>
      <Typography variant="h6" fontWeight={700}>
        {title}
      </Typography>
      {selectedLabel ? (
        <Typography variant="caption" color="text.secondary">
          Đang xem lát cắt: {selectedLabel}
        </Typography>
      ) : null}

      {chartData.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={dynamicHeight}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
            barCategoryGap={14}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="unitLabel"
              width={140}
              interval={0}
            />
            <Tooltip />
            <Legend />
            {segmentDefs.map((segment) => (
              <Bar
                key={segment.key}
                dataKey={segment.key}
                name={segment.label}
                fill={segment.color}
                radius={[0, 6, 6, 0]}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </Stack>
  );
}
