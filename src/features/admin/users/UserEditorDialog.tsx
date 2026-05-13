import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  Chip,
  Alert,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import { useGetMeQuery } from '../../../api/base/meApi';
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetUserByIdQuery
} from '../../../api/adminUsersApi';
import { LazyUnitMultiSelect } from '../../../components/common/LazyUnitMultiSelect';

import {
  Role,
  makeManagerUnitRole,
  isManagerUnitRole,
  getManagerUnitId,
} from '../../../constants/roles';
import { PositionSelect } from '../../../components/common/PositionSelect';
import { UITextKey, uiText } from '../../../constants/uiText';

const DEFAULT_PASSWORD = '123456@Aa';

type Editor =
  | { mode: 'create' }
  | { mode: 'edit'; userId: string }
  | null;

export function UserEditorDialog({
  open,
  editor,
  onClose,
  onCreated,
  onUpdated,
  onFailed,
}: {
  open: boolean;
  editor: Editor;
  onClose: () => void;
  onCreated?: (u: { id: string }) => void;
  onUpdated?: (u: { id: string }) => void;
  onFailed?: (err: any, op: 'create' | 'update') => void;
}) {
  const { data: me } = useGetMeQuery();

  const roles = me?.roles ?? [];
  const isAdmin = roles.includes(Role.ADMIN);
  const isSys = roles.includes(Role.SYSTEM_ADMIN) || me?.accountKind === 'SYSTEM_ADMIN';
  const isMgrLevel = roles.includes(Role.MANAGER_LEVEL) || me?.accountKind === 'LEVEL_MANAGER';

  const mgrUnitRole = roles.find(isManagerUnitRole);
  const mgrUnitId = mgrUnitRole ? getManagerUnitId(mgrUnitRole) : null;

  const isCreate = editor?.mode === 'create';
  const isEdit = editor?.mode === 'edit';
  const editUserId = editor?.mode === 'edit' ? editor.userId : null;

  // ===== LOAD DETAIL WHEN EDIT =====
  const { data: detail, isFetching: detailLoading } = useGetUserByIdQuery(
    { userId: editUserId! },
    { skip: !open || !isEdit || !editUserId },
  );

  // ===== FORM =====
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [fullName, setFullName] = useState('');

  //  chỉ dùng 1 state cho unit (single)
  const [unitId, setUnitId] = useState<string>('');
  const [unitCode, setUnitCode] = useState<string>('');
  const [unitTypeCode, setUnitTypeCode] = useState<string>('');
  const [positionCode, setPositionCode] = useState<string>('');
  const [pickedRoles, setPickedRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [createUser, cState] = useCreateUserMutation();
  const [updateUser, uState] = useUpdateUserMutation();

  // ===== RESET FORM (CREATE) =====
  useEffect(() => {
    if (!open || !isCreate) return;

    setUsername('');
    setPassword(DEFAULT_PASSWORD);
    setFullName('');
    setError(null);
    setUnitCode('');
    setUnitTypeCode('');
    setPositionCode('');
    if (isAdmin) {
      // ADMIN creates SYSTEM_ADMIN against the system unit; do not expose the ROOT label in UI.
      setUnitId('');
      setPickedRoles([Role.SYSTEM_ADMIN]);
    } else if (mgrUnitId) {
      setUnitId(mgrUnitId);
      setPickedRoles([]);
    } else {
      setUnitId(me?.unitId ?? '');
      setPickedRoles([]);
    }
  }, [open, isCreate, isAdmin, mgrUnitId, me?.unitId]);

  // ===== PREFILL (EDIT) =====
  useEffect(() => {
    if (!open || !isEdit) return;
    if (!detail) return;

    setUsername(detail.username ?? '');
    setFullName(detail.fullName ?? '');
    setPositionCode(detail.positionCode ?? '');
    setUnitId(detail.unitId ?? '');
    setUnitCode(detail.unitCode ?? '');
    setUnitTypeCode('');
    setError(null);
    // edit: không cho đổi unit ở UI này (policy hiện tại)
    // setUnitId(detail.unitId ?? '');
  }, [open, isEdit, detail]);

  // ===== UNIT LOGIC =====
  const canPickUnit = isCreate && (isSys || isMgrLevel);
  const editingSystemAdmin =
    isEdit &&
    (detail?.accountKind === 'SYSTEM_ADMIN' ||
      (detail?.roles ?? []).includes(Role.SYSTEM_ADMIN));
  const creatingSystemAdmin = isCreate && isAdmin;
  const systemAdminTarget = creatingSystemAdmin || editingSystemAdmin;

  // ADMIN + MANAGER_UNIT: fixed unit, managers use the unit encoded in their role.
  const fixedUnitId = isAdmin ? null : (mgrUnitId ?? null);

  const effectiveUnitId =
    isEdit
      ? (detail?.unitId ?? unitId ?? null)
      : fixedUnitId ??
        (unitId ? unitId : (canPickUnit ? (me?.unitId ?? null) : (me?.unitId ?? null)));

  const ownUnitTypeCode =
    effectiveUnitId === me?.unitId ? (me?.unitTypeCodes?.[0] ?? null) : null;
  const effectiveUnitTypeCode = unitTypeCode || ownUnitTypeCode || null;
  const selectedUnitValue = useMemo(() => (unitId ? [unitId] : []), [unitId]);

  // ===== ROLE LOGIC =====
  const showRolePicker = false;

  const buildFinalRoles = () => {
    if (isAdmin) return [Role.SYSTEM_ADMIN];
    if (isSys) return [];

    if (isSys) {
      let final = [...pickedRoles];

      if (final.includes(Role.MANAGER_UNIT)) {
        if (!effectiveUnitId || effectiveUnitId === 'ROOT') {
          throw new Error('Phải chọn đơn vị hợp lệ cho MANAGER_UNIT.');
        }
        final = final.filter((r) => r !== Role.MANAGER_UNIT);
        final.push(makeManagerUnitRole(effectiveUnitId));
      }

      return final;
    }

    return []; // manager-level & manager-unit -> default USER (BE xử lý)
  };

  // ===== SUBMIT =====
  const submitCreate = async () => {
    try {
      setError(null);

      const u = username.trim();
      const fn = fullName.trim();

      if (!u || !password || !fn) {
        setError('Vui lòng nhập đầy đủ thông tin.');
        return;
      }

      const finalRoles = buildFinalRoles();
      const createSystemAdmin = finalRoles.includes(Role.SYSTEM_ADMIN);

      if (!createSystemAdmin && !effectiveUnitId) {
        setError('Không xác định được đơn vị.');
        return;
      }

      if (!createSystemAdmin && !positionCode) {
        setError('Vui lòng chọn chức vụ.');
        return;
      }

      const created = await createUser({
        username: u,
        password,
        positionCode: createSystemAdmin ? null : positionCode,
        fullName: fn,
        unitId: createSystemAdmin ? null : effectiveUnitId,
        roles: finalRoles.length ? finalRoles : undefined,
      }).unwrap();

      onCreated?.({ id: created?.id });
      onClose();
    } catch (e: any) {
      setError(e?.data?.title ?? e?.message ?? 'Tạo người dùng thất bại.');
      onFailed?.(e, 'create');
    }
  };
  const submitEdit = async () => {
    try {
      setError(null);

      if (!editUserId) {
        setError('Thiếu mã người dùng để cập nhật.');
        return;
      }

      const u = username.trim();
      const fn = fullName.trim();

      if (!u || !fn) {
        setError('Vui lòng nhập tên đăng nhập và họ tên.');
        return;
      }

      if (!systemAdminTarget && !positionCode) {
        setError('Vui lòng chọn chức vụ.');
        return;
      }

      const updated = await updateUser({
        userId: editUserId,
        body: { username: u, fullName: fn, positionCode: systemAdminTarget ? null : positionCode },
      }).unwrap();

      onUpdated?.({ id: updated?.id ?? editUserId });
      onClose();
    } catch (e: any) {
      setError(e?.data?.title ?? e?.message ?? 'Cập nhật thất bại.');
      onFailed?.(e, 'update');
    }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Sửa người dùng' : 'Tạo người dùng'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {isEdit && detailLoading && (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Đang tải thông tin người dùng...
            </Typography>
          )}

          <TextField
            label={uiText(UITextKey.TextUsername)}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={false} //  cho sửa username cả edit
          />

          {isCreate && (
            <TextField
              label={uiText(UITextKey.TextPassword)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText={`Mặc định: ${DEFAULT_PASSWORD}`}
            />
          )}

          <TextField
            label={uiText(UITextKey.TextHoTen)}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          {/* POSITION */}
          {!systemAdminTarget ? (
            <PositionSelect
              value={positionCode}
              onChange={(v) => setPositionCode(v)}
              unitCode={unitCode || null}
              unitTypeCode={effectiveUnitTypeCode}
              label={uiText(UITextKey.TextChucVu)}
              allowEmpty={false}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              SYSTEM_ADMIN không gắn chức vụ.
            </Typography>
          )}

          {/* UNIT */}
          {isCreate && (
            <>
              {isAdmin ? (
                <Typography variant="body2">
                  SYSTEM_ADMIN không gắn đơn vị.
                </Typography>
              ) : mgrUnitId ? (
                <Typography variant="body2">
                  Tạo người dùng cho đơn vị: {mgrUnitId}
                </Typography>
              ) : canPickUnit ? (
                <LazyUnitMultiSelect
                  value={selectedUnitValue}
                  onChange={(v) => {
                    const id = v?.[0] ?? '';
                    setUnitId(id);
                    setUnitTypeCode('');
                  }}
                  onChangeMeta={(selected) => {
                    const first = selected?.[0];
                    setUnitCode(first?.code ?? '');
                    setUnitTypeCode(first?.primaryUnitTypeCode ?? '');
                  }}
                  mode="single"
                  virtualUnitBehavior="reject"
                  label={uiText(UITextKey.TextDonVi)}
                />
              ) : (
                <Typography variant="body2">
                  Đơn vị: {me?.unitId ?? '(chưa có)'}
                </Typography>
              )}
            </>
          )}
  
          {/* ROLE PICKER */}
          {showRolePicker && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Roles
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {[Role.MANAGER_LEVEL, Role.MANAGER_UNIT].map((r) => (
                  <Chip
                    key={r}
                    label={r}
                    disabled={
                      r === Role.MANAGER_UNIT &&
                      (!effectiveUnitId || effectiveUnitId === 'ROOT')
                    }
                    color={pickedRoles.includes(r) ? 'primary' : 'default'}
                    variant={pickedRoles.includes(r) ? 'filled' : 'outlined'}
                    onClick={() =>
                      setPickedRoles((prev) =>
                        prev.includes(r)
                          ? prev.filter((x) => x !== r)
                          : [...prev, r],
                      )
                    }
                  />
                ))}
              </Stack>
            </Box>
          )}

          {isCreate && isAdmin && (
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              ADMIN chỉ tạo SYSTEM_ADMIN.
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button size="small" variant="outlined" onClick={onClose} sx={{ height: 36, px: 1.75 }}>{uiText(UITextKey.TextHuy3)}</Button>
        <Button
          size="small"
          variant="contained"
          onClick={isEdit ? submitEdit : submitCreate}
          disabled={cState.isLoading || uState.isLoading || (isEdit && detailLoading)}
          sx={{ height: 36, px: 1.75 }}
        >
          Lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
}
