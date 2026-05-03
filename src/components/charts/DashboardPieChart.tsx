import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Stack, Typography } from "@mui/material";

import type { DashboardPieSliceDto } from "../../types/dashboard";

type Props = {
  title: string;
  data: DashboardPieSliceDto[];
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  height?: number;
  emptyText?: string;
  helperText?: string;
};

export default function DashboardPieChart({
  title,
  data,
  selectedKey,
  onSelect,
  height = 300,
  emptyText = "Chưa có dữ liệu để hiển thị biểu đồ.",
  helperText,
}: Props) {
  return (
    <Stack spacing={0.5} sx={{ height: "100%" }}>
      <Typography variant="h6" fontWeight={700}>
        {title}
      </Typography>

      {helperText ? (
        <Typography variant="caption" color="text.secondary">
          {helperText}
        </Typography>
      ) : onSelect ? (
        <Typography variant="caption" color="text.secondary">
          Bấm vào lát cắt để xem chi tiết theo đơn vị.
        </Typography>
      ) : null}

      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              dataKey="value"
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={92}
              innerRadius={32}
              nameKey="label"
              label
              onClick={(item: any) => {
                const key = item?.key as string | undefined;
                if (key && onSelect) onSelect(key);
              }}
            >
              {data.map((entry) => {
                const isSelected = !!selectedKey && selectedKey === entry.key;
                return (
                  <Cell
                    key={entry.key}
                    fill={entry.color}
                    stroke={isSelected ? "#111827" : entry.color}
                    strokeWidth={isSelected ? 3 : 1}
                    cursor={onSelect ? "pointer" : "default"}
                  />
                );
              })}
            </Pie>
            <Tooltip formatter={(value: unknown, name: unknown) => [`${value}`, `${name}`]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Stack>
  );
}
