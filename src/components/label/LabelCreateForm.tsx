import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export type LabelMode = 'create' | 'detail' | 'edit';

export type LabelOption = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  open: boolean;
  mode: LabelMode;

  // mode detail/edit cần cái này
  label?: LabelOption | null;

  // gọi khi user đóng popup (X/ESC/backdrop)
  onRequestClose: () => void;

  // create/edit xong trả label mới/đã sửa
  onSaved?: (saved: LabelOption) => void;
};

function genId() {
  return String(Date.now());
}

export function LabelCreateForm({
  open,
  mode,
  label,
  onRequestClose,
  onSaved,
}: Props) {
  const isReadOnly = mode === 'detail';

  const initialName = useMemo(() => {
    if (mode === 'create') return '';
    return label?.name ?? '';
  }, [mode, label?.name]);

  const [name, setName] = useState(initialName);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDirty(false);
    }
  }, [open, initialName]);

  const title =
    mode === 'create' ? 'Tạo nhãn' : mode === 'edit' ? 'Sửa nhãn' : 'Chi tiết nhãn';

  const canSave = !isReadOnly && name.trim().length > 0;

  const handleClose = () => {
    if (dirty && !isReadOnly) {
      const ok = window.confirm('Bạn đang có thay đổi chưa lưu. Đóng popup?');
      if (!ok) return;
    }
    onRequestClose();
  };

  const handleSave = () => {
    if (!canSave) return;

    const trimmed = name.trim();

    // mock save: sau này thay bằng call API
    const saved: LabelOption =
      mode === 'create'
        ? { id: genId(), code: '', name: trimmed }
        : { id: label?.id ?? genId(), code: label?.code ?? '', name: trimmed };

    onSaved?.(saved);
    onRequestClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {mode !== 'create' && (
            <TextField
              label="ID"
              value={label?.id ?? ''}
              size="small"
              fullWidth
              InputProps={{ readOnly: true }}
            />
          )}

          <TextField
            label="Tên nhãn"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!dirty) setDirty(true);
            }}
            size="small"
            fullWidth
            disabled={isReadOnly}
            placeholder="VD: Khẩn / Định kỳ / Báo cáo tháng"
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={handleClose}>
          Đóng
        </Button>+

        {!isReadOnly && (
          <Button variant="contained" onClick={handleSave} disabled={!canSave}>
            Lưu
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
