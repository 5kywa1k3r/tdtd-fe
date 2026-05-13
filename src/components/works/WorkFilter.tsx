// src/components/works/WorkFilter.tsx
import React from 'react';
import { TextField, MenuItem, Button } from '@mui/material';
import type { WorkPriorityCore, WorkStatusCore } from '../../types/work';
import { WORK_PRIORITY_OPTIONS } from '../../types/work';
import { ListPageToolbar, listToolbarButtonSx } from '../common/ListPageToolbar';
import { UITextKey, uiText } from '../../constants/uiText';

export interface WorkFilterValues {
  q: string;
  status: WorkStatusCore | null;
  leaderDirectiveUserId: string | null;
  priority: WorkPriorityCore | null;
}

export type Option<T = number | string> = {
  value: T;
  label: string;
};

interface WorkFilterProps {
  value: WorkFilterValues;
  onChange: (v: WorkFilterValues) => void;
  statusOptions: readonly Option<WorkStatusCore>[];
  onSubmit?: (v: WorkFilterValues) => void;
  onReset?: () => void;
  leaderOptions: { id: string; name: string }[];
  primaryActions?: React.ReactNode;
}

const filterFieldSx = (basis: number, grow = false) => ({
  flex: {
    xs: '1 1 100%',
    sm: `1 1 ${basis}px`,
    lg: `${grow ? 1 : 0} 1 ${basis}px`,
  },
  minWidth: 0,
});

export const WorkFilter: React.FC<WorkFilterProps> = ({
  value,
  onChange,
  statusOptions,
  onSubmit,
  onReset,
  leaderOptions,
  primaryActions,
}) => {
  const setField = (field: keyof WorkFilterValues, val: any) => onChange({ ...value, [field]: val });

  const handleReset = () => {
    onChange({ q: '', status: null, leaderDirectiveUserId: null, priority: null });
    onReset?.();
  };

  const filters = (
    <>
      <TextField
        size="small"
        label={uiText(UITextKey.TextTuKhoaMaTen)}
        value={value.q}
        onChange={(e) => setField('q', e.target.value)}
        sx={filterFieldSx(260, true)}
      />

      <TextField
        select
        size="small"
        label={uiText(UITextKey.TextLanhDaoChiDao)}
        value={value.leaderDirectiveUserId ?? ''}
        onChange={(e) => setField('leaderDirectiveUserId', e.target.value || null)}
        sx={filterFieldSx(220)}
      >
        <MenuItem value="">{uiText(UITextKey.TextTatCa)}</MenuItem>
        {leaderOptions.map((x) => (
          <MenuItem key={x.id} value={x.id}>
            {x.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label={uiText(UITextKey.TextTrangThai)}
        value={value.status ?? ''}
        onChange={(e) => setField('status', e.target.value ? (Number(e.target.value) as WorkStatusCore) : null)}
        sx={filterFieldSx(160)}
      >
        <MenuItem value="">{uiText(UITextKey.TextTatCa)}</MenuItem>
        {statusOptions.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label={uiText(UITextKey.TextUuTien)}
        value={value.priority ?? ''}
        onChange={(e) => setField('priority', e.target.value ? (Number(e.target.value) as WorkPriorityCore) : null)}
        sx={filterFieldSx(140)}
      >
        <MenuItem value="">{uiText(UITextKey.TextTatCa)}</MenuItem>
        {WORK_PRIORITY_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
    </>
  );

  return (
    <ListPageToolbar
      filters={filters}
      filterActions={
        <>
          <Button variant="contained" size="small" onClick={() => onSubmit?.(value)} sx={listToolbarButtonSx}>
            {uiText(UITextKey.CommonSearch)}
          </Button>
          <Button variant="outlined" size="small" onClick={handleReset} sx={listToolbarButtonSx}>
            Xóa lọc
          </Button>
        </>
      }
      primaryActions={primaryActions}
    />
  );
};
