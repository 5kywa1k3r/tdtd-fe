import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type {  WorkStatusCore } from '../../constants/status';
import {
  STATUS_COLORS,
  STATUS_LABELS
} from '../../constants/status';
import type { StatusPieItem } from './types';

interface StatusPieChartProps {
  data: StatusPieItem[];
  height?: number;
  selected?: WorkStatusCore | null;
  onSelect?: (status: WorkStatusCore) => void;
}

export function StatusPieChart({
  data,
  height = 260,
  selected = null,
  onSelect,
}: StatusPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          dataKey="value"
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={90}
          nameKey="label"
          label
          onClick={(entry) => {
            if (onSelect) {
              onSelect(entry.status as WorkStatusCore);
            }
          }}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={STATUS_COLORS[entry.status]}
              stroke={selected === entry.status ? '#000' : undefined}
              strokeWidth={selected === entry.status ? 2 : 1}
              cursor="pointer"
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: unknown, _name, props) => {
            const v = value as number;
            const status = (props.payload as StatusPieItem).status;
            return [`${v}`, STATUS_LABELS[status]];
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
