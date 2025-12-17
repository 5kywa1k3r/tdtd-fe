// src/components/common/StatusChip.tsx
import * as React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import {
  STATUS_LABELS,
  type WorkStatusCore,
  type WorkStatusFilterValue,
} from '../../constants/status';

type ChipColor = ChipProps['color'];

const STATUS_CHIP_COLORS: Record<WorkStatusCore, ChipColor> = {
  NOT_STARTED: 'default',
  IN_PROGRESS: 'primary',
  AT_RISK: 'warning',
  DELAYED: 'error',
  COMPLETED: 'success',
};

// ============== Helper: map status -> chip meta ==============
export function getStatusMeta(
  status: WorkStatusCore | WorkStatusFilterValue,
): { label: string; color: ChipColor } {
  // nếu lỡ truyền 'ALL' vào thì coi như default
  if (status === 'ALL') {
    return {
      label: STATUS_LABELS.ALL,
      color: 'default',
    };
  }

  const core = status as WorkStatusCore;
  return {
    label: STATUS_LABELS[core],
    color: STATUS_CHIP_COLORS[core],
  };
}

interface StatusChipProps {
  status?: WorkStatusCore | WorkStatusFilterValue;
  size?: ChipProps['size'];
}

/**
 * Hiển thị chip trạng thái nhiệm vụ/chỉ tiêu dùng chung toàn app
 */
export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  size = 'small',
}) => {
  if (!status) {
    return (
      <Chip
        size={size}
        label="Chưa thiết lập"
        variant="outlined"
        color="default"
      />
    );
  }

  const meta = getStatusMeta(status);

  return (
    <Chip
      size={size}
      label={meta.label}
      color={meta.color}
      variant={meta.color === 'default' ? 'outlined' : 'filled'}
    />
  );
};
