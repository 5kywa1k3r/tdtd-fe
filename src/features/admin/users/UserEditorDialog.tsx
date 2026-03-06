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
import { useEffect, useState } from 'react';

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
  const isSys = roles.includes(Role.SYSTEM_ADMIN);
  const isMgrLevel = roles.includes(Role.MANAGER_LEVEL);

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
    setPositionCode('');    
    if (isAdmin) {
      // ADMIN: unit tùy policy;  đang hiển thị ROOT cố định
      setUnitId(''); // không cần chọn
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
    setError(null);
    // edit: không cho đổi unit ở UI này (policy hiện tại)
    // setUnitId(detail.unitId ?? '');
  }, [open, isEdit, detail]);

  // ===== UNIT LOGIC =====
  const canPickUnit = isCreate && (isSys || isMgrLevel);

  // ADMIN + MANAGER_UNIT: fixed = me.unitId (hoặc ROOT theo policy UI)
  const fixedUnitId = isAdmin || !!mgrUnitId ? (me?.unitId ?? null) : null;

  const effectiveUnitId =
    fixedUnitId ??
    (unitId ? unitId : (canPickUnit ? (me?.unitId ?? null) : (me?.unitId ?? null)));

  // ===== ROLE LOGIC =====
  const showRolePicker = isCreate && isSys && !isAdmin;

  const buildFinalRoles = () => {
    if (isAdmin) return [Role.SYSTEM_ADMIN];

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

      if (!effectiveUnitId) {
        setError('Không xác định được đơn vị.');
        return;
      }

      const finalRoles = buildFinalRoles();

      const created = await createUser({
        username: u,
        password,
        positionCode,
        fullName: fn,
        unitId: effectiveUnitId,
        roles: finalRoles.length ? finalRoles : undefined,
      } as any).unwrap();

      onCreated?.({ id: created?.id });
      onClose();
    } catch (e: any) {
      setError(e?.data?.title ?? e?.message ?? 'Tạo user thất bại.');
      onFailed?.(e, 'create');
    }
  };
  const submitEdit = async () => {
    try {
      setError(null);

      if (!editUserId) {
        setError('Thiếu userId để cập nhật.');
        return;
      }

      const u = username.trim();
      const fn = fullName.trim();

      if (!u || !fn) {
        setError('Vui lòng nhập Username và Họ tên.');
        return;
      }

      const updated = await updateUser({
        userId: editUserId,
        body: { username: u, fullName: fn, positionCode },
      } as any).unwrap();

      onUpdated?.({ id: updated?.id ?? editUserId });
      onClose();
    } catch (e: any) {
      setError(e?.data?.title ?? e?.message ?? 'Cập nhật thất bại.');
      onFailed?.(e, 'update');
    }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Sửa user' : 'Tạo user'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {isEdit && detailLoading && (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Đang tải thông tin user...
            </Typography>
          )}

          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={false} //  cho sửa username cả edit
          />

          {isCreate && (
            <TextField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText={`Mặc định: ${DEFAULT_PASSWORD}`}
            />
          )}

          <TextField
            label="Họ tên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          {/* POSITION */}
          <PositionSelect
            value={positionCode}
            onChange={(v) => setPositionCode(v)}
            unitCode={unitCode || null}
            label="Chức vụ"
            allowEmpty={false}
          />

          {/* UNIT */}
          {isCreate && (
            <>
              {isAdmin ? (
                <Typography variant="body2">
                  Đơn vị: ROOT (cố định)
                </Typography>
              ) : mgrUnitId ? (
                <Typography variant="body2">
                  Tạo user cho đơn vị: {mgrUnitId}
                </Typography>
              ) : canPickUnit ? (
                <LazyUnitMultiSelect
                  value={unitId ? [unitId] : []}
                  onChange={(v) => {
                    const id = v?.[0] ?? '';
                    setUnitId(id);
                  }}
                  onChangeMeta={(selected) => {
                    const first = selected?.[0];
                    setUnitCode(first?.code ?? '');
                  }}
                  mode="single"
                  label="Đơn vị"
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
        <Button onClick={onClose}>Hủy</Button>
        <Button
          variant="contained"
          onClick={isEdit ? submitEdit : submitCreate}
          disabled={cState.isLoading || uState.isLoading || (isEdit && detailLoading)}
        >
          Lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
}