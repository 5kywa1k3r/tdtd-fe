import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { useResetPasswordMutation } from '../../../api/adminUsersApi';
import { UITextKey, uiText } from '../../../constants/uiText';

type Target = { userId: string; username: string; isMe?: boolean } | null;

export function ResetPasswordDialog({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: Target;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [resetPassword, st] = useResetPasswordMutation();

  useEffect(() => {
    if (!open) return;
    setNewPassword('');
    setError(null);
  }, [open]);

  const submit = async () => {
    try {
      setError(null);

      const pw = newPassword.trim();
      if (pw.length < 6) {
        setError('Mật khẩu tối thiểu 6 ký tự.');
        return;
      }
      if (!target) {
        setError('Thiếu người dùng.');
        return;
      }

      await resetPassword({
        userId: target.userId,
        body: { newPassword: pw },
        mayAffectMe: !!target.isMe,
      } as any).unwrap();

      onClose();
    } catch (e: any) {
      setError(e?.data?.title ?? e?.message ?? 'Đặt lại mật khẩu thất bại.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{uiText(UITextKey.TextResetMatKhau)}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            User: <b>{target?.username ?? ''}</b>
          </Typography>

          <TextField
            autoFocus
            label={uiText(UITextKey.TextMatKhauMoi)}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText={uiText(UITextKey.TextToiThieu6KyTu)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button size="small" variant="outlined" onClick={onClose} disabled={st.isLoading} sx={{ height: 36, px: 1.75 }}>
          Hủy
        </Button>
        <Button size="small" variant="contained" onClick={submit} disabled={st.isLoading} sx={{ height: 36, px: 1.75 }}>
          Đặt lại
        </Button>
      </DialogActions>
    </Dialog>
  );
}
