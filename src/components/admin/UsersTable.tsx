import React, { useMemo } from 'react';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { AppTable, type AppTableColumn } from '../common/AppTable';
import { POSITION_NAME_BY_CODE } from '../../constants/position';

export type AdminUserRow = {
  id: string;
  username: string;
  fullName: string;

  unitId: string;
  unitShortName: string;
  unitSymbol: string;
  unitCode: string;

  positionCode?: string;
  isDeleted: boolean;
  roles: string[];
};

interface UsersTableProps {
  rows: AdminUserRow[];

  // permissions
  canUpdate: boolean;
  canDelete: boolean;
  meId?: string;
  meRoles?: string[];

  // server paging/sort (AppTable server mode)
  page: number;
  pageSize: number;
  totalRows: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;

  // actions
  onEdit?: (row: AdminUserRow) => void;
  onDelete?: (row: AdminUserRow) => void;
  onResetPassword?: (row: AdminUserRow) => void;

  onRowDoubleClick?: (row: AdminUserRow) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  rows,
  canUpdate,
  canDelete,
  meId,
  meRoles = [],
  page,
  pageSize,
  totalRows,
  sortField,
  sortDirection,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onEdit,
  onDelete,
  onRowDoubleClick,
  onResetPassword,
}) => {
  const hasRole = (roles: string[] | undefined, r: string) =>
    (roles ?? []).some((x) => x.toUpperCase() === r.toUpperCase());

  const meIsAdmin = hasRole(meRoles, 'ADMIN');
  const meIsSys = hasRole(meRoles, 'SYSTEM_ADMIN');

  const canEditRow = (row: AdminUserRow) => {
    if (row.id === meId) return false;
    if (!canUpdate) return false;

    // nobody touches ADMIN
    if (hasRole(row.roles, 'ADMIN')) return false;

    // ADMIN: only manage SYSTEM_ADMIN
    if (meIsAdmin) return hasRole(row.roles, 'SYSTEM_ADMIN');

    // SYS_ADMIN: cannot manage other SYS_ADMIN (but allow self)
    if (meIsSys) {
      if (hasRole(row.roles, 'SYSTEM_ADMIN') && row.id !== meId) return false;
      return true;
    }

    // managers/others: cannot manage SYSTEM_ADMIN/ADMIN
    if (hasRole(row.roles, 'SYSTEM_ADMIN')) return false;
    return true;
  };

  const canDeleteRow = (row: AdminUserRow) => {
    if (!canDelete) return false;
    if (row.isDeleted) return false;
    return canEditRow(row);
  };

  const columns: AppTableColumn<AdminUserRow>[] = useMemo(
    () => [
      {
        field: 'username',
        header: 'Tài khoản',
        sortable: true,
        width: 180,
        render: (row) => <b>{row.username}</b>,
      },
      {
        field: 'fullName',
        header: 'Họ tên',
        sortable: true,
        width: 220,
      },
      {
        field: 'positionCode',
        header: 'Chức vụ',
        sortable: true,
        width: 240,
        render: (row) => POSITION_NAME_BY_CODE[row.positionCode ?? ''] ?? '',
      },
      {
        field: 'unit',
        header: 'Đơn vị',
        sortable: true,
        width: '32%',
        render: (row) => (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.unitShortName ?? ''}
            </span>
            <Tooltip title={`${row.unitSymbol ? row.unitSymbol + ' - ' : ''}${row.unitShortName ?? ''}`}>
              <InfoOutlinedIcon fontSize="small" sx={{ opacity: 0.65 }} />
            </Tooltip>
          </Stack>
        ),
      },
      {
        field: 'isDeleted',
        header: 'Trạng thái',
        sortable: true,
        width: 120,
        render: (row) => (row.isDeleted ? 'Disabled' : 'Active'),
      },
      {
        field: 'actions',
        header: 'Thao tác',
        sortable: false,
        width: 140,
        align: 'center',
        render: (row) => {
          const editOk = canEditRow(row) && !row.isDeleted;
          const delOk = canDeleteRow(row) && !row.isDeleted;
          const resetOk = editOk;

          return (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Sửa">
                  <span>
                    <IconButton
                      size="small"
                      disabled={!editOk}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!editOk) return;
                        onEdit?.(row);
                      }}
                      sx={{ '&:hover': { transform: 'scale(1.05)' } }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Đặt lại mật khẩu">
                  <span>
                    <IconButton
                      size="small"
                      disabled={!resetOk}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!resetOk) return;
                        onResetPassword?.(row);
                      }}
                      sx={{ '&:hover': { transform: 'scale(1.05)' } }}
                    >
                      <RestartAltIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Xóa">
                  <span>
                    <IconButton
                      size="small"
                      disabled={!delOk}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!delOk) return;
                        onDelete?.(row);
                      }}
                      sx={{ '&:hover': { transform: 'scale(1.05)' } }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Box>
          );
        },
      },
    ],
    [canUpdate, canDelete, meIsAdmin, meIsSys, meId, meRoles, onEdit, onDelete, onResetPassword],
  );

  return (
    <AppTable<AdminUserRow>
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      selectable={false}
      enablePagination
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      totalRows={totalRows}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      rowsPerPageOptions={[10, 25, 50]}
      sortMode="server"
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      onRowDoubleClick={onRowDoubleClick}
    />
  );
};