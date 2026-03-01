import { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Box } from '@mui/system';

import { useSearchUsersQuery, useSoftDeleteUserMutation, useResetPasswordMutation } from './adminUsersApi';
import { useGetMeQuery } from '../../../api/base/meApi';
import { UserEditorDialog } from './UserEditorDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';

import { UsersTable, type AdminUserRow } from '../../../components/admin/UsersTable';
import { LazyUnitMultiSelect } from '../../../components/common/LazyUnitMultiSelect';
import { PositionSelect } from '../../../components/common/PositionSelect';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

import { Permission } from '../../../constants/permissions';
import { hasPermission } from '../../../utils/rbac';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

const DEFAULT_PASSWORD = '123456@Aa';

export function UsersPanel() {
  const { data: me } = useGetMeQuery();
  const roles = me?.roles ?? [];
  const isAdmin = roles.includes('ADMIN');
  const isSys = roles.includes('SYSTEM_ADMIN');

  const canCreate = useMemo(
    () => isAdmin || hasPermission(roles, Permission.USER_CREATE),
    [isAdmin, roles],
  );

  const canUpdate = useMemo(
    () => isAdmin || isSys || hasPermission(roles, Permission.USER_UPDATE),
    [isAdmin, isSys, roles],
  );

  const canDelete = canUpdate;

  // ===== filters =====
  const [q, setQ] = useState('');
  const qDebounced = useDebouncedValue(q, 200);

  // chọn 1 đơn vị cha để lấy prefix
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [unitCodePrefix, setUnitCodePrefix] = useState<string>('');

  // position filter ('' = all)
  const [positionCode, setPositionCode] = useState<string>('');

  // reset password dialog (detailed)
  const [resetTarget, setResetTarget] = useState<{ userId: string; username: string; isMe?: boolean } | null>(null);

  // confirm dialogs
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [resetConfirmTarget, setResetConfirmTarget] = useState<AdminUserRow | null>(null);

  // snackbar
  const [snack, setSnack] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  type DeleteFilter = 'active' | 'deleted' | 'all';
  const [deleteFilter] = useState<DeleteFilter>('active');

  const isDeleted =
    deleteFilter === 'all' ? undefined : deleteFilter === 'deleted';

  // ===== server paging/sort =====
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // mặc định sort theo chức vụ (BE: sortField = positionCode)
  const [sortField, setSortField] = useState<string | undefined>('positionCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [qDebounced, unitCodePrefix, positionCode, deleteFilter]);

  const { data, isFetching, refetch } = useSearchUsersQuery({
    q: qDebounced,
    isDeleted,
    unitCodePrefix: unitCodePrefix.trim() ? unitCodePrefix.trim() : undefined,
    positionCode: positionCode || undefined,
    page,
    pageSize,
    sortField,
    sortDirection: sortField ? sortDirection : undefined,
  });

  const notifySuccess = (msg: string) => {
    setSnack({ type: 'success', message: msg });
    refetch();            // ✅ kéo list mới nhất
  };

  const notifyError = (e: any, fallback: string) => {
    setSnack({ type: 'error', message: e?.data?.title ?? e?.message ?? fallback });
  };

  const rows: AdminUserRow[] = useMemo(() => {
    const src = data?.rows ?? [];
    return src.map((u: any) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      unitId: u.unitId ?? '',
      unitShortName: u.unitShortName ?? '',
      unitSymbol: u.unitSymbol ?? '',
      unitCode: u.unitCode ?? u._unitCode ?? '',
      positionCode: u.positionCode ?? '',
      isDeleted: !!u.isDeleted,
      roles: Array.isArray(u.roles) ? u.roles : [],
    }));
  }, [data?.rows]);

  const [softDeleteUser, dState] = useSoftDeleteUserMutation();
  const [resetPassword, rState] = useResetPasswordMutation();

  type Editor =
    | { mode: 'create' }
    | { mode: 'edit'; userId: string }
    | null;

  const [editor, setEditor] = useState<Editor>(null);

  return (
    <Card>
      <CardContent>
        {/* Filters */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1,
            mb: 2,
          }}
        >
          {/* LEFT FILTERS */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              flex: '1 1 720px',
              minWidth: 280,
            }}
          >
            <TextField
              size="small"
              placeholder="Tìm username / fullName"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ flex: '1 1 260px', minWidth: 220 }}
            />

            <Box sx={{ flex: '1 1 260px', minWidth: 220 }}>
              <LazyUnitMultiSelect
                value={selectedUnitId ? [selectedUnitId] : []}
                onChange={(v) => {
                  const id = v?.[0] ?? '';
                  setSelectedUnitId(id);
                  if (!id) setUnitCodePrefix('');
                  setPage(0);
                }}
                onChangeMeta={(selected) => {
                  const first = selected?.[0];
                  setUnitCodePrefix(first?.code ?? '');
                  setPage(0);
                }}
                mode="single"
                label="Đơn vị"
              />
            </Box>

            <Box sx={{ flex: '1 1 260px', minWidth: 220 }}>
              <PositionSelect
                value={positionCode}
                onChange={(v) => {
                  setPositionCode(v);
                  setPage(0);
                }}
                unitCode={unitCodePrefix || null}
                label="Chức vụ"
              />
            </Box>
          </Box>

          {/* RIGHT SIDE */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flex: '0 0 auto',
              marginLeft: { xs: 0, sm: 'auto' },
            }}
          >
            <Typography variant="body2" sx={{ opacity: 0.7, whiteSpace: 'nowrap' }}>
              {isFetching ? 'Đang tải…' : `${data?.totalRows ?? 0} kết quả`}
            </Typography>

            {canCreate && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setEditor({ mode: 'create' })}
                sx={{ height: 40, px: 2, whiteSpace: 'nowrap' }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Tạo user
                </Box>
              </Button>
            )}
          </Box>
        </Box>

        <UsersTable
          rows={rows}
          canUpdate={canUpdate}
          canDelete={canDelete}
          meId={me?.id}
          meRoles={me?.roles ?? []}
          page={data?.page ?? page}
          pageSize={data?.pageSize ?? pageSize}
          totalRows={data?.totalRows ?? 0}
          sortField={sortField}
          sortDirection={sortDirection}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(0);
          }}
          onSortChange={(f, d) => {
            setSortField(f);
            setSortDirection(d);
            setPage(0);
          }}
          onRowDoubleClick={(row) => {
            if (!canUpdate) return;
            setEditor({ mode: 'edit', userId: row.id });
          }}
          onEdit={(row) => setEditor({ mode: 'edit', userId: row.id })}
          onDelete={(row) => {
            if (!canDelete) return;
            setDeleteTarget(row);
          }}
          onResetPassword={(row) => {
            // bệ hạ muốn confirm khi reset: mở confirm trước
            setResetConfirmTarget(row);
          }}
        />

        <UserEditorDialog
          open={!!editor}
          editor={editor}
          onClose={() => setEditor(null)}
          onCreated={() => {
            notifySuccess('Tạo tài khoản thành công.');
            // nếu muốn nhảy về trang 0 để thấy record mới:
            // setPage(0);
          }}
          onUpdated={() => {
            notifySuccess('Cập nhật tài khoản thành công.');
          }}
          onFailed={(e, op) => {
            notifyError(e, op === 'create' ? 'Tạo tài khoản thất bại.' : 'Cập nhật thất bại.');
          }}
        />

        {/* dialog reset (detailed) - giữ nguyên nếu bệ hạ vẫn muốn dùng */}
        <ResetPasswordDialog
          open={!!resetTarget}
          target={resetTarget}
          onClose={() => setResetTarget(null)}
        />

        {/* Confirm delete */}
        <ConfirmDialog
          open={!!deleteTarget}
          title="Xác nhận xóa"
          message={
            <Box>
              Bạn có chắc muốn <b>disable</b> user <b>{deleteTarget?.username}</b>?
            </Box>
          }
          confirmText="Xóa"
          cancelText="Hủy"
          variant="danger"
          confirmLoading={dState.isLoading}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (!deleteTarget) return;
            try {
              await softDeleteUser({ userId: deleteTarget.id }).unwrap();
              notifySuccess('Xóa user thành công.');
            } catch (e: any) {
              setSnack({ type: 'error', message: e?.data?.title ?? e?.message ?? 'Xóa user thất bại.' });
            } finally {
              setDeleteTarget(null);
            }
          }}
        />

        {/* Confirm reset password (quick reset to default) */}
        <ConfirmDialog
          open={!!resetConfirmTarget}
          title="Đặt lại mật khẩu"
          message={
            <Box>
              Reset mật khẩu cho <b>{resetConfirmTarget?.username}</b> về{' '}
              <b>{DEFAULT_PASSWORD}</b>?
            </Box>
          }
          confirmText="Đặt lại"
          cancelText="Hủy"
          variant="warning"
          confirmLoading={rState.isLoading}
          onClose={() => setResetConfirmTarget(null)}
          onConfirm={async () => {
            if (!resetConfirmTarget) return;

            try {
              await resetPassword({
                userId: resetConfirmTarget.id,
                body: { newPassword: DEFAULT_PASSWORD },
              }).unwrap();

              setSnack({ type: 'success', message: 'Đặt lại mật khẩu thành công.' });
              notifySuccess('Đặt lại mật khẩu thành công.');
            } catch (e: any) {
              setSnack({ type: 'error', message: e?.data?.title ?? e?.message ?? 'Đặt lại mật khẩu thất bại.' });
            } finally {
              setResetConfirmTarget(null);
            }
          }}
        />

        {/* Snackbar */}
        <Snackbar
          open={!!snack}
          autoHideDuration={2500}
          onClose={() => setSnack(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnack(null)}
            severity={snack?.type ?? 'success'}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snack?.message}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}