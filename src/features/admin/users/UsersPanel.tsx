import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Snackbar,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { Box } from '@mui/system';

import {
  useSearchUsersQuery,
  useSoftDeleteUserMutation,
  useResetPasswordMutation,
} from '../../../api/adminUsersApi';
import { useGetMeQuery } from '../../../api/base/meApi';
import { UserEditorDialog } from './UserEditorDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';

import { UsersTable, type AdminUserRow } from '../../../components/admin/UsersTable';
import { LazyUnitMultiSelect } from '../../../components/common/LazyUnitMultiSelect';
import { PositionSelect } from '../../../components/common/PositionSelect';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

import { Permission } from '../../../constants/permissions';
import { hasPermission } from '../../../utils/rbac';

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

  type DeleteFilter = 'active' | 'deleted' | 'all';
  const [deleteFilter] = useState<DeleteFilter>('active');
  const isDeleted = deleteFilter === 'all' ? undefined : deleteFilter === 'deleted';

  // ===== INPUT FILTERS (chỉ là UI, chưa apply) =====
  const [qInput, setQInput] = useState('');
  const [selectedUnitIdInput, setSelectedUnitIdInput] = useState<string>('');
  const [unitCodePrefixInput, setUnitCodePrefixInput] = useState<string>('');
  const [positionCodeInput, setPositionCodeInput] = useState<string>('');

  // ===== APPLIED FILTERS (bấm Tìm kiếm mới cập nhật) =====
  const [applied, setApplied] = useState<{
    q: string;
    unitCodePrefix?: string;
    positionCode?: string;
  }>({
    q: '',
    unitCodePrefix: undefined,
    positionCode: undefined,
  });

  // ===== server paging/sort =====
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // mặc định sort theo chức vụ (BE: sortField = positionCode)
  const [sortField, setSortField] = useState<string | undefined>('positionCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data, isFetching, refetch } = useSearchUsersQuery({
    q: applied.q,
    isDeleted,
    unitCodePrefix: applied.unitCodePrefix,
    positionCode: applied.positionCode,
    page,
    pageSize,
    sortField,
    sortDirection: sortField ? sortDirection : undefined,
  });

  // snackbar
  const [snack, setSnack] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notifySuccess = (msg: string) => {
    setSnack({ type: 'success', message: msg });
    refetch();
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

  // reset password dialog (detailed)
  const [resetTarget, setResetTarget] = useState<{ userId: string; username: string; isMe?: boolean } | null>(null);

  // confirm dialogs
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [resetConfirmTarget, setResetConfirmTarget] = useState<AdminUserRow | null>(null);

  const applySearch = () => {
    const next = {
      q: qInput.trim(),
      unitCodePrefix: unitCodePrefixInput.trim() ? unitCodePrefixInput.trim() : undefined,
      positionCode: positionCodeInput || undefined,
    };
    setApplied(next);
    setPage(0);
  };

  const clearFilters = () => {
    setQInput('');
    setSelectedUnitIdInput('');
    setUnitCodePrefixInput('');
    setPositionCodeInput('');

    setApplied({ q: '', unitCodePrefix: undefined, positionCode: undefined });
    setPage(0);
  };

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
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearch();
              }}
              sx={{ flex: '1 1 260px', minWidth: 220 }}
            />

            <Box sx={{ flex: '1 1 260px', minWidth: 220 }}>
              <LazyUnitMultiSelect
                value={selectedUnitIdInput ? [selectedUnitIdInput] : []}
                onChange={(v) => {
                  const id = v?.[0] ?? '';
                  setSelectedUnitIdInput(id);
                  if (!id) setUnitCodePrefixInput('');
                }}
                onChangeMeta={(selected) => {
                  const first = selected?.[0];
                  setUnitCodePrefixInput(first?.code ?? '');
                }}
                mode="single"
                label="Đơn vị"
              />
            </Box>

            <Box sx={{ flex: '1 1 260px', minWidth: 220 }}>
              <PositionSelect
                value={positionCodeInput}
                onChange={(v) => setPositionCodeInput(v)}
                unitCode={unitCodePrefixInput || null}
                label="Chức vụ"
              />
            </Box>

            {/* ACTION BUTTONS: Search + Clear */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SearchIcon />}
                onClick={applySearch}
                sx={{ height: 40, px: 2, whiteSpace: 'nowrap' }}
              >
                Tìm kiếm
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                sx={{ height: 40, px: 2, whiteSpace: 'nowrap' }}
              >
                Xóa lọc
              </Button>
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
            setResetConfirmTarget(row);
          }}
        />

        <UserEditorDialog
          open={!!editor}
          editor={editor}
          onClose={() => setEditor(null)}
          onCreated={() => notifySuccess('Tạo tài khoản thành công.')}
          onUpdated={() => notifySuccess('Cập nhật tài khoản thành công.')}
          onFailed={(e, op) => {
            notifyError(e, op === 'create' ? 'Tạo tài khoản thất bại.' : 'Cập nhật thất bại.');
          }}
        />

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