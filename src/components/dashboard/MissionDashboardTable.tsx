// src/components/dashboard/MissionDashboardTable.tsx
import React from 'react';
import { Paper, Typography, Divider } from '@mui/material';
import dayjs from 'dayjs';

import type { AppTableColumn, SortDirection } from '../common/AppTable';
import { AppTable } from '../common/AppTable';

// 👇 type dữ liệu nhiệm vụ (mock dashboard hiện tại)
import type { MissionItem } from '../../data/dashboardMock';

// 👇 unit mock + map tên đơn vị
import { UNIT_LABEL_MAP } from '../../data/unitMock';
import type { UnitId } from '../../data/unitMock';

// 👇 status constants đang dùng
import {
  STATUS_LABELS
} from '../../constants/status';
import { StatusChip } from '../common/StatusChip';

// ================== COLUMNS CHO DASHBOARD ==================

const missionDashboardColumns: AppTableColumn<MissionItem>[] = [
  {
    field: 'title',
    header: 'Tên nhiệm vụ / chỉ tiêu',
    sortable: true,
    width: '30%',
  },
  {
    field: 'unitId',
    header: 'Đơn vị',
    sortable: true,
    width: '18%',
    render: (row) => {
      const id = row.unitId as UnitId;
      return UNIT_LABEL_MAP[id] ?? row.unitId;
    },
  },
  {
    field: 'type',
    header: 'Loại',
    sortable: true,
    width: '10%',
    render: (row) => row.type,
  },
  {
    field: 'startDate',
    header: 'Từ ngày',
    sortable: true,
    width: '12%',
    render: (row) => dayjs(row.startDate).format('DD/MM/YYYY'),
    getSortValue: (row) => new Date(row.startDate),
  },
  {
    field: 'dueDate',
    header: 'Đến ngày',
    sortable: true,
    width: '12%',
    render: (row) => dayjs(row.dueDate).format('DD/MM/YYYY'),
    getSortValue: (row) => new Date(row.dueDate),
  },
  {
    field: 'status',
    header: 'Trạng thái',
    sortable: true,
    width: '18%',
    render: (row) => <StatusChip status={row.status} />,
    getSortValue: (row) => STATUS_LABELS[row.status],
  },
];

// ================== PROPS & COMPONENT ==================

interface MissionDashboardTableProps {
  rows: MissionItem[];

  total?: number;
  page?: number;          // 0-based cho AppTable
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;

  sortField?: string;
  sortDirection?: SortDirection;
  onSortChange?: (field: string, direction: SortDirection) => void;

  onRowDoubleClick?: (row: MissionItem) => void;
}

export const MissionDashboardTable: React.FC<MissionDashboardTableProps> = ({
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortField,
  sortDirection,
  onSortChange,
  onRowDoubleClick,
}) => {
  const isServerPaging =
    typeof total === 'number' &&
    typeof page === 'number' &&
    typeof pageSize === 'number';

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
        Danh sách nhiệm vụ / chỉ tiêu
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <AppTable<MissionItem>
        rows={rows}
        columns={missionDashboardColumns}
        rowKey={(r) => r.id}
        selectable={false}
        onRowDoubleClick={onRowDoubleClick}
        // SORT
        sortMode={onSortChange ? 'server' : 'client'}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={onSortChange}
        // PAGINATION
        enablePagination
        paginationMode={isServerPaging ? 'server' : 'client'}
        page={page}
        pageSize={pageSize}
        totalRows={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </Paper>
  );
};
