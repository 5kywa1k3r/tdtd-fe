// src/components/works/WorkListTable.tsx
import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { IconButton, Stack, Tooltip } from '@mui/material';

import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { AppTable, type AppTableColumn, type SortDirection } from '../common/AppTable';
import type { ParentWork } from '../../types/work';
import { StatusChip } from '../common/StatusChip';

interface WorkListTableProps {
  rows: ParentWork[];
  total: number;

  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  sortField: string;
  sortDirection: SortDirection;
  onSortChange: (field: string, direction: SortDirection) => void;

  onRowDoubleClick?: (row: ParentWork) => void;

  // NEW: edit/delete handlers
  onEdit?: (row: ParentWork) => void;
  onDelete?: (row: ParentWork) => void;

  nameColumnHeader: string;
}

export const WorkListTable: React.FC<WorkListTableProps> = ({
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
  onEdit,
  onDelete,
  nameColumnHeader,
}) => {
  const columns: AppTableColumn<ParentWork>[] = useMemo(
    () => [
      {
        field: 'actions',
        header: 'Thao tác',
        width: 120,
        align: 'center',
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="Xem">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRowDoubleClick?.(row);
                }}
                sx={{ '&:hover': { transform: 'scale(1.05)' } }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Sửa">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(row);
                }}
                sx={{ '&:hover': { transform: 'scale(1.05)' } }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Xóa">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(row);
                }}
                sx={{ '&:hover': { transform: 'scale(1.05)' } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },

      { field: 'code', header: 'Mã', sortable: true, width: 120 },

      { field: 'name', header: nameColumnHeader, sortable: true, width: '40%' },

      {
        field: 'status',
        header: 'Trạng thái',
        sortable: false,
        width: 180,
        render: (row) => <StatusChip status={row.status} />,
      },

      {
        field: 'fromDate',
        header: 'Từ ngày',
        sortable: true,
        width: 120,
        render: (row) => dayjs(row.fromDate).format('DD/MM/YYYY'),
      },
      {
        field: 'toDate',
        header: 'Đến ngày',
        sortable: true,
        width: 120,
        render: (row) => dayjs(row.toDate).format('DD/MM/YYYY'),
      },

      { field: 'leader', header: 'Lãnh đạo chỉ đạo', sortable: true, width: 180 },
      { field: 'focalOfficer', header: 'Cán bộ đầu mối', sortable: true, width: 180 },
    ],
    [onRowDoubleClick, onEdit, onDelete, nameColumnHeader],
  );

  return (
    <AppTable<ParentWork>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      selectable={false}
      sortMode="server"
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      enablePagination
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      totalRows={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowDoubleClick={onRowDoubleClick}
    />
  );
};
