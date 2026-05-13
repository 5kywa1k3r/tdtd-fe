import { useCallback, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { Box } from '@mui/system';

import {
  useSearchUsersQuery,
  useSoftDeleteUserMutation,
  useResetPasswordMutation,
  useImportUsersMutation,
} from '../../../api/adminUsersApi';
import { api } from '../../../api/base/axios';
import { type ImportResult } from '../../../api/adminUnitsApi';
import { useGetMeQuery } from '../../../api/base/meApi';
import { UserEditorDialog } from './UserEditorDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';

import { UsersTable, type AdminUserRow } from '../../../components/admin/UsersTable';
import { LazyUnitMultiSelect, type UnitPickMeta } from '../../../components/common/LazyUnitMultiSelect';
import { PositionSelect } from '../../../components/common/PositionSelect';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import {
  listToolbarButtonSx,
  listToolbarIconButtonSx,
} from '../../../components/common/ListPageToolbar';

import { Permission } from '../../../constants/permissions';
import { hasPermission } from '../../../utils/rbac';
import { releaseFocusBeforeModal } from '../../../utils/focus';
import { UITextKey, uiText } from '../../../constants/uiText';
import { getApiErrorMessage } from '../../../utils/apiError';

const DEFAULT_PASSWORD = '123456@Aa';
async function downloadTemplate(url: string, format: 'xlsx' | 'csv', fileName: string) {
  const res = await api.get(url, { params: { format }, responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(blobUrl);
}

export function UsersPanel() {
  const { data: me } = useGetMeQuery();
  const roles = me?.roles ?? [];
  const isAdmin = roles.includes('ADMIN');
  const isSys = roles.includes('SYSTEM_ADMIN') || me?.accountKind === 'SYSTEM_ADMIN';
  const isManagerAccount =
    roles.includes('MANAGER_LEVEL') ||
    roles.some((role) => role.startsWith('MANAGER_UNIT:')) ||
    me?.accountKind === 'LEVEL_MANAGER' ||
    me?.accountKind === 'UNIT_MANAGER';

  const canCreate = useMemo(
    () => isAdmin || isSys || isManagerAccount || hasPermission(roles, Permission.USER_CREATE),
    [isAdmin, isManagerAccount, isSys, roles],
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
  const qInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedUnitIdInput, setSelectedUnitIdInput] = useState<string>('');
  const [unitCodePrefixInput, setUnitCodePrefixInput] = useState<string>('');
  const [unitTypeCodeInput, setUnitTypeCodeInput] = useState<string>('');
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

  const { data, refetch } = useSearchUsersQuery({
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

  const notifySuccess = useCallback((msg: string) => {
    setSnack({ type: 'success', message: msg });
    refetch();
  }, [refetch]);

  const notifyError = useCallback((e: any, fallback: string) => {
    setSnack({ type: 'error', message: getApiErrorMessage(e) || fallback });
  }, []);

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
      positionName: u.positionName ?? '',
      isDeleted: !!u.isDeleted,
      roles: Array.isArray(u.roles) ? u.roles : [],
    }));
  }, [data?.rows]);

  const [softDeleteUser, dState] = useSoftDeleteUserMutation();
  const [resetPassword, rState] = useResetPasswordMutation();
  const [importUsers, importState] = useImportUsersMutation();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] = useState<{ file: File; result: ImportResult } | null>(null);

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

  const selectedUnitValue = useMemo(
    () => (selectedUnitIdInput ? [selectedUnitIdInput] : []),
    [selectedUnitIdInput],
  );

  const handleUnitFilterChange = useCallback((v: string[]) => {
    const id = v?.[0] ?? '';
    setSelectedUnitIdInput(id);
    if (!id) {
      setUnitCodePrefixInput('');
      setUnitTypeCodeInput('');
    }
  }, []);

  const handleUnitFilterMetaChange = useCallback((selected: UnitPickMeta[]) => {
    const first = selected?.[0];
    setUnitCodePrefixInput(first?.code ?? '');
    setUnitTypeCodeInput(first?.primaryUnitTypeCode ?? '');
  }, []);

  const handlePositionFilterChange = useCallback((v: string) => setPositionCodeInput(v), []);

  const applySearch = useCallback(() => {
    const next = {
      q: qInputRef.current?.value.trim() ?? '',
      unitCodePrefix: unitCodePrefixInput.trim() ? unitCodePrefixInput.trim() : undefined,
      positionCode: positionCodeInput || undefined,
    };
    setApplied(next);
    setPage(0);
  }, [positionCodeInput, unitCodePrefixInput]);

  const clearFilters = useCallback(() => {
    if (qInputRef.current) {
      qInputRef.current.value = '';
    }
    setSelectedUnitIdInput('');
    setUnitCodePrefixInput('');
    setUnitTypeCodeInput('');
    setPositionCodeInput('');

    setApplied({ q: '', unitCodePrefix: undefined, positionCode: undefined });
    setPage(0);
  }, []);

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((s: number) => {
    setPageSize(s);
    setPage(0);
  }, []);
  const handleSortChange = useCallback((f: string, d: 'asc' | 'desc') => {
    setSortField(f);
    setSortDirection(d);
    setPage(0);
  }, []);

  const handleOpenCreate = useCallback((event: MouseEvent<HTMLElement>) => {
    releaseFocusBeforeModal(event);
    setEditor({ mode: 'create' });
  }, []);

  const handleRowDoubleClick = useCallback((row: AdminUserRow) => {
    if (!canUpdate) return;
    releaseFocusBeforeModal();
    setEditor({ mode: 'edit', userId: row.id });
  }, [canUpdate]);

  const handleEdit = useCallback((row: AdminUserRow) => {
    releaseFocusBeforeModal();
    setEditor({ mode: 'edit', userId: row.id });
  }, []);

  const handleDelete = useCallback((row: AdminUserRow) => {
    if (!canDelete) return;
    releaseFocusBeforeModal();
    setDeleteTarget(row);
  }, [canDelete]);

  const handleResetPassword = useCallback((row: AdminUserRow) => {
    releaseFocusBeforeModal();
    setResetConfirmTarget(row);
  }, []);

  return (
    <Card variant="outlined" sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        {/* Filters */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: { xs: 'wrap', xl: 'nowrap' },
            alignItems: 'center',
            gap: 1,
            mb: 1.5,
          }}
        >
          {/* LEFT FILTERS */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(220px, 1.1fr) minmax(220px, 1fr)',
                lg: 'minmax(240px, 1fr) minmax(240px, 1fr) minmax(220px, 0.8fr)',
                xl: 'minmax(220px, 1.15fr) minmax(220px, 1fr) minmax(180px, 0.8fr) auto',
              },
              alignItems: 'center',
              gap: 1,
              flex: '1 1 auto',
              minWidth: { xs: '100%', md: 0 },
            }}
          >
            <TextField
              id="admin-users-search-q"
              name="adminUsersSearch"
              size="small"
              placeholder={uiText(UITextKey.TextTimUsernameFullName)}
              inputRef={qInputRef}
              sx={{ minWidth: 0 }}
            />

            <Box sx={{ minWidth: 0 }}>
              <LazyUnitMultiSelect
                value={selectedUnitValue}
                onChange={handleUnitFilterChange}
                onChangeMeta={handleUnitFilterMetaChange}
                mode="single"
                id="admin-users-unit-filter"
                name="adminUsersUnitId"
                label={uiText(UITextKey.TextDonVi)}
              />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <PositionSelect
                value={positionCodeInput}
                onChange={handlePositionFilterChange}
                unitCode={unitCodePrefixInput || null}
                unitTypeCode={unitTypeCodeInput || null}
                id="admin-users-position-filter"
                name="adminUsersPositionCode"
                label={uiText(UITextKey.TextChucVu)}
              />
            </Box>

            {/* ACTION BUTTONS: Search + Clear */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                alignItems: 'center',
                gridColumn: { xs: '1 / -1', md: '1 / -1', xl: 'auto' },
                minWidth: 0,
              }}
            >
              <Button
                variant="contained"
                size="small"
                startIcon={<SearchIcon />}
                onClick={applySearch}
                sx={listToolbarButtonSx}
              >
                Tìm kiếm
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                sx={listToolbarButtonSx}
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
              alignSelf: 'center',
              flexWrap: 'nowrap',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              gap: 1,
              flex: '0 0 auto',
              minWidth: 0,
              marginLeft: { xs: 0, xl: 'auto' },
            }}
          >
            {canCreate && (
              <>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreate}
                  sx={listToolbarButtonSx}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    Tạo người dùng
                  </Box>
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  hidden
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    try {
                      const result = await importUsers({ file, dryRun: true }).unwrap();
                      releaseFocusBeforeModal();
                      setImportPreview({ file, result });
                    } catch (e: any) {
                      notifyError(e, 'Kiểm tra tệp nhập thất bại.');
                    }
                  }}
                />
                <Tooltip title="Tải mẫu XLSX">
                  <IconButton
                    size="small"
                    aria-label="Tải mẫu XLSX"
                    onClick={() => downloadTemplate('/admin/users/import-template', 'xlsx', 'user-import-template.xlsx')}
                    sx={listToolbarIconButtonSx}
                  >
                    <TableChartOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Tải mẫu CSV">
                  <IconButton
                    size="small"
                    aria-label="Tải mẫu CSV"
                    onClick={() => downloadTemplate('/admin/users/import-template', 'csv', 'user-import-template.csv')}
                    sx={listToolbarIconButtonSx}
                  >
                    <DescriptionOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Nhập dữ liệu (.xlsx hoặc .csv)">
                  <IconButton
                    size="small"
                    aria-label="Nhập dữ liệu từ tệp .xlsx hoặc .csv"
                    onClick={(event) => {
                      releaseFocusBeforeModal(event);
                      importInputRef.current?.click();
                    }}
                    sx={listToolbarIconButtonSx}
                  >
                    <UploadFileOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
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
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          onRowDoubleClick={handleRowDoubleClick}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onResetPassword={handleResetPassword}
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

        <Dialog open={!!importPreview} onClose={() => setImportPreview(null)} fullWidth maxWidth="md">
          <DialogTitle>{uiText(UITextKey.TextKetQuaKiemTraImportUser)}</DialogTitle>
          <DialogContent>
            {importPreview && (
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Alert severity={importPreview.result.errorRows > 0 ? 'error' : 'success'}>
                  Tổng {importPreview.result.totalRows} dòng, hợp lệ {importPreview.result.validRows}, lỗi {importPreview.result.errorRows}.
                </Alert>
                {importPreview.result.errors.slice(0, 50).map((err, idx) => (
                  <Typography key={`${err.rowNumber}-${err.field}-${idx}`} variant="body2">
                    Dòng {err.rowNumber}, cột {err.field}: {err.message}
                  </Typography>
                ))}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setImportPreview(null)}
              sx={{ height: 36, px: 1.75 }}
            >
              Đóng
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={!importPreview || importPreview.result.errorRows > 0 || importState.isLoading}
              sx={{ height: 36, px: 1.75 }}
              onClick={async () => {
                if (!importPreview) return;
                try {
                  await importUsers({ file: importPreview.file, dryRun: false }).unwrap();
                  setImportPreview(null);
                  notifySuccess('Nhập người dùng thành công.');
                } catch (e: any) {
                  notifyError(e, 'Nhập người dùng thất bại.');
                }
              }}
            >
              Xác nhận nhập
            </Button>
          </DialogActions>
        </Dialog>

        <ResetPasswordDialog
          open={!!resetTarget}
          target={resetTarget}
          onClose={() => setResetTarget(null)}
        />

        {/* Confirm delete */}
        <ConfirmDialog
          open={!!deleteTarget}
          title={uiText(UITextKey.TextNgungDungUser)}
          message={
            <Box>
              Bạn có chắc muốn ngừng dùng người dùng <b>{deleteTarget?.username}</b>?
            </Box>
          }
          confirmText="Ngừng dùng"
          cancelText="Hủy"
          variant="warning"
          confirmLoading={dState.isLoading}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (!deleteTarget) return;
            try {
              await softDeleteUser({ userId: deleteTarget.id }).unwrap();
              notifySuccess('Đã ngừng dùng người dùng.');
            } catch (e: any) {
              setSnack({ type: 'error', message: e?.data?.title ?? e?.message ?? 'Ngừng dùng người dùng thất bại.' });
            } finally {
              setDeleteTarget(null);
            }
          }}
        />

        {/* Confirm reset password (quick reset to default) */}
        <ConfirmDialog
          open={!!resetConfirmTarget}
          title={uiText(UITextKey.TextDatLaiMatKhau)}
          message={
            <Box>
              Đặt lại mật khẩu cho <b>{resetConfirmTarget?.username}</b> về{' '}
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
