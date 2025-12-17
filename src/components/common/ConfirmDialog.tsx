import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: React.ReactNode;

  confirmText?: string;
  cancelText?: string;

  variant?: ConfirmDialogVariant;
  confirmLoading?: boolean;

  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Xác nhận',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
  confirmLoading = false,
  onConfirm,
  onClose,
}) => {
  const confirmColor =
    variant === 'danger' ? 'error' : variant === 'warning' ? 'warning' : 'primary';

  return (
    <Dialog
      open={open}
      onClose={confirmLoading ? undefined : onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontWeight: 800 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningAmberRoundedIcon color={confirmColor} />
          <span>{title}</span>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {typeof message === 'string' ? (
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {message}
          </Typography>
        ) : (
          message
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={confirmLoading}
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          color={confirmColor as any}
          onClick={onConfirm}
          disabled={confirmLoading}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
