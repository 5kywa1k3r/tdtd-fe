// src/components/works/WorkFilter.tsx
import React from 'react';
import { TextField, MenuItem, Button, Box } from '@mui/material';
import type { WorkPriorityCore, WorkStatusCore } from '../../types/work';
import { WORK_PRIORITY_OPTIONS } from '../../types/work';

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
}

export const WorkFilter: React.FC<WorkFilterProps> = ({
  value,
  onChange,
  statusOptions,
  onSubmit,
  onReset,
  leaderOptions,
}) => {
  const setField = (field: keyof WorkFilterValues, val: any) => onChange({ ...value, [field]: val });

  const handleReset = () => {
    onChange({ q: '', status: null, leaderDirectiveUserId: null, priority: null });
    onReset?.();
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', width: '100%' }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 220 }}>
          <TextField
            fullWidth
            size="small"
            label="Từ khóa (mã/tên)"
            value={value.q}
            onChange={(e) => setField('q', e.target.value)}
          />
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 220 }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Lãnh đạo chỉ đạo"
            value={value.leaderDirectiveUserId ?? ''}
            onChange={(e) => setField('leaderDirectiveUserId', e.target.value || null)}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {leaderOptions.map((x) => (
              <MenuItem key={x.id} value={x.id}>
                {x.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 180 }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Trạng thái"
            value={value.status ?? ''}
            onChange={(e) => setField('status', e.target.value ? (Number(e.target.value) as WorkStatusCore) : null)}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {statusOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* ✅ NEW: Ưu tiên (số 1/2/3) */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' }, minWidth: 160 }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Ưu tiên"
            value={value.priority ?? ''}
            onChange={(e) => setField('priority', e.target.value ? (Number(e.target.value) as WorkPriorityCore) : null)}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {WORK_PRIORITY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, ml: { xs: 0, md: 'auto' } }}>
          <Button variant="outlined" size="small" onClick={handleReset}>
            Xóa lọc
          </Button>
          <Button variant="contained" size="small" onClick={() => onSubmit?.(value)}>
            Tìm kiếm
          </Button>
        </Box>
      </Box>
    </Box>
  );
};