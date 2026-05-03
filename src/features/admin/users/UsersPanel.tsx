import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
import { LazyUnitMultiSelect } from '../../../components/common/LazyUnitMultiSelect';
import { PositionSelect } from '../../../components/common/PositionSelect';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

import { Permission } from '../../../constants/permissions';
import { hasPermission } from '../../../utils/rbac';

const DEFAULT_PASSWORD = '123456@Aa';

const toolbarButtonSx = {
  height: 40,
  px: 1.75,
  whiteSpace: 'nowrap',
};

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
    setUnitTypeCodeInput('');
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
            alignItems: 'flex-start',
            gap: 1,
            mb: 2,
          }}
        >
          {/* LEFT FILTERS */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
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
                  if (!id) {
                    setUnitCodePrefixInput('');
                    setUnitTypeCodeInput('');
                  }
                }}
                onChangeMeta={(selected) => {
                  const first = selected?.[0];
                  setUnitCodePrefixInput(first?.code ?? '');
                  setUnitTypeCodeInput(first?.primaryUnitTypeCode ?? '');
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
                unitTypeCode={unitTypeCodeInput || null}
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
                sx={toolbarButtonSx}
              >
                Tìm kiếm
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                sx={toolbarButtonSx}
              >
                Xóa lọc
              </Button>
            </Box>
          </Box>

          {/* RIGHT SIDE */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              alignSelf: 'flex-start',
              flexWrap: 'wrap',
              justifyContent: { xs: 'flex-start', lg: 'flex-end' },
              gap: 1,
              flex: '0 0 auto',
              marginLeft: { xs: 0, sm: 'auto' },
            }}
          >
            {canCreate && (
              <>
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
                      setImportPreview({ file, result });
                    } catch (e: any) {
                      notifyError(e, 'Kiểm tra file import thất bại.');
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={() => downloadTemplate('/admin/users/import-template', 'xlsx', 'user-import-template.xlsx')}
                  sx={toolbarButtonSx}
                >
                  Mẫu XLSX
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={() => downloadTemplate('/admin/users/import-template', 'csv', 'user-import-template.csv')}
                  sx={toolbarButtonSx}
                >
                  Mẫu CSV
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UploadFileIcon />}
                  onClick={() => importInputRef.current?.click()}
                  sx={toolbarButtonSx}
                >
                  Import
                </Button>
              </>
            )}
            {canCreate && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setEditor({ mode: 'create' })}
                sx={toolbarButtonSx}
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

        <Dialog open={!!importPreview} onClose={() => setImportPreview(null)} fullWidth maxWidth="md">
          <DialogTitle>Kết quả kiểm tra import user</DialogTitle>
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
                  notifySuccess('Import user thành công.');
                } catch (e: any) {
                  notifyError(e, 'Import user thất bại.');
                }
              }}
            >
              Xác nhận import
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
          title="Ngừng dùng user"
          message={
            <Box>
              Bạn có chắc muốn ngừng dùng user <b>{deleteTarget?.username}</b>?
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
              notifySuccess('Đã ngừng dùng user.');
            } catch (e: any) {
              setSnack({ type: 'error', message: e?.data?.title ?? e?.message ?? 'Ngừng dùng user thất bại.' });
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
