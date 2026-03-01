import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';

import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { AppTable, type AppTableColumn, type SortDirection } from '../common/AppTable';
import type { DynamicExcelItem } from '../../data/mockDataTable';

interface DynamicExcelListTableProps {
  rows: DynamicExcelItem[];
  total: number;

  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  sortField: string;
  sortDirection: SortDirection;
  onSortChange: (field: string, direction: SortDirection) => void;

  onRowDoubleClick?: (row: DynamicExcelItem) => void;

  onView?: (row: DynamicExcelItem) => void;
  onEdit?: (row: DynamicExcelItem) => void;
  onDelete?: (row: DynamicExcelItem) => void;
}

export const DynamicExcelListTable: React.FC<DynamicExcelListTableProps> = ({
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
  onView,
  onEdit,
  onDelete,
}) => {
  const columns: AppTableColumn<DynamicExcelItem>[] = useMemo(
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
                  onView?.(row);
                  // fallback: nếu không truyền onView thì dùng doubleclick handler
                  if (!onView) onRowDoubleClick?.(row);
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

      { field: 'code', header: 'Mã', sortable: true, width: 140 },

      { field: 'name', header: 'Tên', sortable: true, width: '35%' },

      {
        field: 'labels',
        header: 'Nhãn',
        sortable: false,
        width: '30%',
        render: (row) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {row.labels?.length ? (
              row.labels.map((l) => (
                <Chip
                  key={l.id}
                  label={l.name}
                  size="small"
                  sx={{ height: 22, fontSize: 12 }}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                -
              </Typography>
            )}
          </Stack>
        ),
      },

      {
        field: 'createdAt',
        header: 'Ngày tạo',
        sortable: true,
        width: 140,
        render: (row) => dayjs(row.createdAt).format('DD/MM/YYYY'),
        getSortValue: (row) => new Date(row.createdAt),
      },
    ],
    [onRowDoubleClick, onView, onEdit, onDelete],
  );

  return (
    <AppTable<DynamicExcelItem>
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
