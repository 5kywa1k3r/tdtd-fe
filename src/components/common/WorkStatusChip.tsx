// src/components/common/WorkStatusChip.tsx
import * as React from 'react';
import { Chip, type ChipProps } from '@mui/material';

type ChipColor = ChipProps['color'];

// BE B1: status là số 1..5 (bệ hạ sẽ đổi label sau nếu cần)
export type WorkStatusCode = 1 | 2 | 3 | 4 | 5;

const STATUS_LABEL: Record<WorkStatusCode, string> = {
  1: 'Chưa bắt đầu',
  2: 'Đang thực hiện',
  3: 'Có rủi ro',
  4: 'Chậm tiến độ',
  5: 'Hoàn thành',
};

const STATUS_COLOR: Record<WorkStatusCode, ChipColor> = {
  1: 'default',
  2: 'primary',
  3: 'warning',
  4: 'error',
  5: 'success',
};

export interface WorkStatusChipProps {
  status?: number | null;
  size?: ChipProps['size'];
}

export const WorkStatusChip: React.FC<WorkStatusChipProps> = ({ status, size = 'small' }) => {
  if (!status) {
    return (
      <Chip size={size} label="Chưa thiết lập" variant="outlined" color="default" />
    );
  }

  const s = status as WorkStatusCode;
  const label = STATUS_LABEL[s] ?? `Trạng thái ${status}`;
  const color = STATUS_COLOR[s] ?? 'default';

  return (
    <Chip
      size={size}
      label={label}
      color={color}
      variant={color === 'default' ? 'outlined' : 'filled'}
    />
  );
};