import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Chip, IconButton, Stack, Tooltip, Box } from '@mui/material';

import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { AppTable, type AppTableColumn, type SortDirection } from '../common/AppTable';
import type { DynamicExcelRow as DynamicExcelItem, DynamicExcelSearchReq } from '../../api/dynamicExcelApi';

type SortField = NonNullable<DynamicExcelSearchReq['sortField']>;

interface DynamicExcelListTableProps {
  rows: DynamicExcelItem[];
  total: number;

  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;

  onRowDoubleClick?: (row: DynamicExcelItem) => void;

  onView?: (row: DynamicExcelItem) => void;
  onEdit?: (row: DynamicExcelItem) => void;
  onDelete?: (row: DynamicExcelItem) => void;
}

function copyText(text: string) {
  try {
    void navigator.clipboard?.writeText(text);
  } catch {
    // ignore
  }
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
                  if (!onView) onRowDoubleClick?.(row);
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

      // ✅ Code: preview đẹp + copy
      {
        field: 'code',
        header: 'Mã',
        sortable: true,
        width: 190,
        render: (row) => (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Tooltip title={row.code}>
              <Chip
                label={row.code}
                size="small"
                variant="outlined"
                sx={{
                  height: 24,
                  fontSize: 12,
                  maxWidth: 150,
                  '& .MuiChip-label': {
                    px: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                }}
              />
            </Tooltip>

            <Tooltip title="Copy mã">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  copyText(row.code);
                }}
              >
                <ContentCopyIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },

      { field: 'name', header: 'Tên', sortable: true, width: '35%' },

      {
        field: 'createdAtUtc',
        header: 'Ngày tạo',
        sortable: true,
        width: 160,
        render: (row) => dayjs(row.createdAtUtc).format('DD/MM/YYYY'),
        getSortValue: (row) => new Date(row.createdAtUtc),
      },

      {
        field: 'createdByUsername',
        header: 'Người tạo',
        sortable: true,
        width: 160,
      },
    ],
    [onRowDoubleClick, onView, onEdit, onDelete],
  );

  return (
    <Box>
      <AppTable<DynamicExcelItem, SortField>
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
      {/* (không bắt buộc) */}
    </Box>
  );
};