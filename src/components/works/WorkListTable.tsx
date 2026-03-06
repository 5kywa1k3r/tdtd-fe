import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { IconButton, Stack, Tooltip } from '@mui/material';

import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { AppTable, type AppTableColumn, type SortDirection } from '../common/AppTable';
import type { ParentWork } from '../../types/work';
import { WorkStatusChip } from '../common/WorkStatusChip';

/** ✅ NEW */
export type WorkSortField = 'autoCode' | 'name' | 'dueDate' | 'createdAtUtc' | 'priority';

interface WorkListTableProps {
  rows: ParentWork[];
  total: number;

  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  sortField: WorkSortField;
  sortDirection: SortDirection;
  onSortChange: (field: WorkSortField, direction: SortDirection) => void;

  onRowDoubleClick?: (row: ParentWork) => void;

  onEdit?: (row: ParentWork) => void;
  onDelete?: (row: ParentWork) => void;

  nameColumnHeader: string;
}

/** ✅ NEW: label hiển thị */
const typeLabel = (t?: string | null) => (t === 'INDICATOR' ? 'Chỉ tiêu' : 'Nhiệm vụ');
const priorityLabel = (p?: string | null) => {
  if (p === 'HIGH') return 'Cao';
  if (p === 'LOW') return 'Thấp';
  return 'Trung bình';
};

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
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },

      { field: 'autoCode', header: 'Mã', sortable: true, width: 160 },

      { field: 'name', header: nameColumnHeader, sortable: true, width: '40%' },

      {
        field: 'status',
        header: 'Trạng thái',
        sortable: false,
        width: 180,
        render: (row) => <WorkStatusChip status={row.status} />,
      },

      /** ✅ NEW */
      {
        field: 'type',
        header: 'Loại',
        sortable: true,
        width: 110,
        render: (row) => typeLabel((row as any).type),
      },

      /** ✅ NEW */
      {
        field: 'priority',
        header: 'Ưu tiên',
        sortable: true,
        width: 120,
        render: (row) => priorityLabel((row as any).priority),
      },

      {
        field: 'dueDate',
        header: 'Hạn',
        sortable: true,
        width: 120,
        render: (row) => (row.dueDate ? dayjs(row.dueDate).format('DD/MM/YYYY') : ''),
      },

      {
        field: 'createdAtUtc',
        header: 'Ngày tạo',
        sortable: true,
        width: 130,
        render: (row) => dayjs(row.createdAtUtc).format('DD/MM/YYYY'),
      },
    ],
    [onRowDoubleClick, onEdit, onDelete, nameColumnHeader],
  );

  return (
    <AppTable<ParentWork, WorkSortField>
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