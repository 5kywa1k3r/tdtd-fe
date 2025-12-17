// src/components/works/WorkFilter.tsx
import React from 'react';
import dayjs from 'dayjs';
import { TextField, MenuItem, Button, Box } from '@mui/material';

import { MantineDateRangeFilter } from '../../components/common/MantineDateRangeFilter';
import { UnitMultiSelect } from '../../components/common/UnitMultiSelect';
import { UNIT_TREE, type UnitId } from '../../data/unitMock';
import { MOCK_LEADER_OPTIONS } from '../../data/mockData';

import type { WorkStatusFilterValue } from '../../constants/status';

export interface WorkFilterValues {
  fromDate: dayjs.Dayjs | null;
  toDate: dayjs.Dayjs | null;
  code: string;
  unitIds: UnitId[];
  status: WorkStatusFilterValue | null;
  leader: string | null;              // << NEW FIELD
}

interface Option {
  value: WorkStatusFilterValue;
  label: string;
}

interface WorkFilterProps {
  value: WorkFilterValues;
  onChange: (v: WorkFilterValues) => void;
  statusOptions: Option[];
  onSubmit?: (v: WorkFilterValues) => void;
  onReset?: () => void;
}

export const WorkFilter: React.FC<WorkFilterProps> = ({
  value,
  onChange,
  statusOptions,
  onSubmit,
  onReset,
}) => {
  const setField = (field: keyof WorkFilterValues, val: any) => {
    onChange({ ...value, [field]: val });
  };

  const handleSubmit = () => onSubmit?.(value);

  const handleReset = () => {
    onChange({
      fromDate: null,
      toDate: null,
      code: '',
      unitIds: [],
      status: null,
      leader: null,
    });
    onReset?.();
  };

return (
  <Box sx={{ width: '100%' }}>
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
        width: '100%',
      }}
    >
      {/* 1. Khoảng thời gian */}
      <Box
        sx={{
          flex: { xs: '1 1 100%', md: '1 1 0' },
          minWidth: 240,
        }}
      >
        <MantineDateRangeFilter
          value={{ from: value.fromDate, to: value.toDate }}
          onChange={(r) =>
            onChange({
              ...value,
              fromDate: r.from,
              toDate: r.to,
            })
          }
          placeholder="Chọn khoảng thời gian"
        />
      </Box>

      {/* 2. Mã nhiệm vụ */}
      <Box
        sx={{
          flex: { xs: '1 1 100%', md: '1 1 0' },
          minWidth: 160,
        }}
      >
        <TextField
          fullWidth
          size="small"
          label="Mã nhiệm vụ"
          value={value.code}
          onChange={(e) => setField('code', e.target.value)}
        />
      </Box>

      {/* 3. Đơn vị */}
      <Box
        sx={{
          flex: { xs: '1 1 100%', md: '1 1 0' },
          minWidth: 200,
        }}
      >
        <UnitMultiSelect
          options={UNIT_TREE}
          value={value.unitIds}
          onChange={(ids) => setField('unitIds', ids)}
        />
      </Box>

      {/* 4. Lãnh đạo */}
      <Box
        sx={{
          flex: { xs: '1 1 100%', md: '1 1 0' },
          minWidth: 180,
        }}
      >
        <TextField
          select
          fullWidth
          size="small"
          label="Lãnh đạo"
          value={value.leader ?? ''}
          onChange={(e) => setField('leader', e.target.value || null)}
        >
          <MenuItem value="">Tất cả</MenuItem>
          {MOCK_LEADER_OPTIONS.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* 5. Trạng thái */}
      <Box
        sx={{
          flex: { xs: '1 1 100%', md: '1 1 0' },
          minWidth: 180,
        }}
      >
        <TextField
          select
          fullWidth
          size="small"
          label="Trạng thái"
          value={value.status ?? ''}
          onChange={(e) =>
            setField(
              'status',
              (e.target.value || null) as WorkStatusFilterValue | null
            )
          }
        >
          <MenuItem value="">Tất cả</MenuItem>
          {statusOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* 6. Nút hành động */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          flexShrink: 0,
          ml: { xs: 0, md: 'auto' },   // đẩy sang phải khi đủ chỗ
        }}
      >
        <Button variant="outlined" size="small" onClick={handleReset}>
          Xóa lọc
        </Button>
        <Button variant="contained" size="small" onClick={handleSubmit}>
          Tìm kiếm
        </Button>
      </Box>
    </Box>
  </Box>
);

};
