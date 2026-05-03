import * as React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import type {
  CreateEvaluationTemplateRequest,
  EvaluationTemplateDto,
  EvaluationTemplateItemRequest,
  UpdateEvaluationTemplateRequest,
} from '../../types/evaluationTemplate';

function normalizeItems(items: EvaluationTemplateItemRequest[]) {
  return items.map((x, index) => ({
    code: x.code.trim().toUpperCase(),
    label: x.label.trim(),
    order: Number.isFinite(x.order) ? x.order : index + 1,
  }));
}

type Props = {
  open: boolean;
  template?: EvaluationTemplateDto | null;
  readOnly?: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEvaluationTemplateRequest | UpdateEvaluationTemplateRequest) => Promise<void> | void;
};

export default function EvaluationTemplateDialog({ open, template, readOnly = false, onClose, onSubmit }: Props) {
  const isEdit = !!template;
  const [representativeCode, setRepresentativeCode] = React.useState('');
  const [representativeLabel, setRepresentativeLabel] = React.useState('');
  const [unitCodeScope, setUnitCodeScope] = React.useState('PV01');
  const [isActive, setIsActive] = React.useState(true);
  const [items, setItems] = React.useState<EvaluationTemplateItemRequest[]>([{ code: '', label: '', order: 1 }]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setRepresentativeCode(template?.representativeCode ?? '');
    setRepresentativeLabel(template?.representativeLabel ?? '');
    setUnitCodeScope(template?.unitCodeScope ?? 'PV01');
    setIsActive(template?.isActive ?? true);
    setItems(
      template?.items?.length
        ? template.items.map((x) => ({ code: x.code, label: x.label, order: x.order }))
        : [{ code: '', label: '', order: 1 }],
    );
    setError(null);
  }, [open, template]);

  const updateItem = (index: number, key: keyof EvaluationTemplateItemRequest, value: string | number) => {
    setItems((prev) => prev.map((x, i) => (i === index ? { ...x, [key]: value } : x)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { code: '', label: '', order: prev.length + 1 }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next.map((x, i) => ({ ...x, order: i + 1 })) : [{ code: '', label: '', order: 1 }];
    });
  };

  const handleSubmit = async () => {
    if (readOnly) return;

    const normalizedCode = representativeCode.trim().toUpperCase();
    const normalizedLabel = representativeLabel.trim();
    const normalizedItems = normalizeItems(items).filter((x) => x.code && x.label);

    if (!normalizedCode && !isEdit) {
      setError('Phải nhập mã đại diện.');
      return;
    }
    if (!normalizedLabel) {
      setError('Phải nhập tên bộ đánh giá.');
      return;
    }
    if (!normalizedItems.length) {
      setError('Phải có ít nhất một mã đi kèm.');
      return;
    }

    const seen = new Set<string>();
    for (const item of normalizedItems) {
      if (seen.has(item.code)) {
        setError(`Mã con bị trùng: ${item.code}`);
        return;
      }
      seen.add(item.code);
    }

    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await onSubmit({
          representativeLabel: normalizedLabel,
          unitCodeScope: unitCodeScope.trim() || null,
          isActive,
          items: normalizedItems,
        });
      } else {
        await onSubmit({
          representativeCode: normalizedCode,
          representativeLabel: normalizedLabel,
          unitCodeScope: unitCodeScope.trim() || null,
          items: normalizedItems,
        });
      }
      onClose();
    } catch (e: any) {
      setError(e?.data?.Message || e?.message || 'Không thể lưu bộ đánh giá.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{readOnly ? 'Xem bộ đánh giá' : isEdit ? 'Cập nhật bộ đánh giá' : 'Thêm bộ đánh giá'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Mã đại diện"
              value={representativeCode}
              onChange={(e) => setRepresentativeCode(e.target.value.toUpperCase())}
              disabled={readOnly || isEdit}
            />
            <TextField
              fullWidth
              label="Tên bộ đánh giá"
              value={representativeLabel}
              onChange={(e) => setRepresentativeLabel(e.target.value)}
              disabled={readOnly}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Phạm vi đơn vị"
              value={unitCodeScope}
              onChange={(e) => setUnitCodeScope(e.target.value.toUpperCase())}
              helperText="Ví dụ: PV01. Để trống nếu muốn dùng chung."
              disabled={readOnly}
            />
            {isEdit && !readOnly && (
              <TextField
                select
                fullWidth
                label="Trạng thái"
                value={isActive ? '1' : '0'}
                onChange={(e) => setIsActive(e.target.value === '1')}
              >
                <MenuItem value="1">Đang dùng</MenuItem>
                <MenuItem value="0">Ngừng dùng</MenuItem>
              </TextField>
            )}
          </Stack>

          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">Danh sách mã đi kèm</Typography>
              {!readOnly && (
                <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={addItem} sx={{ height: 36 }}>
                  Thêm mã
                </Button>
              )}
            </Stack>

            {items.map((item, index) => (
              <Stack key={index} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
                <TextField
                  label="Thứ tự"
                  type="number"
                  value={item.order}
                  onChange={(e) => updateItem(index, 'order', Number(e.target.value) || index + 1)}
                  sx={{ width: 110 }}
                  disabled={readOnly}
                />
                <TextField
                  fullWidth
                  label="Mã"
                  value={item.code}
                  onChange={(e) => updateItem(index, 'code', e.target.value.toUpperCase())}
                  disabled={readOnly}
                />
                <TextField
                  fullWidth
                  label="Tên hiển thị"
                  value={item.label}
                  onChange={(e) => updateItem(index, 'label', e.target.value)}
                  disabled={readOnly}
                />
                {!readOnly && (
                  <IconButton color="error" onClick={() => removeItem(index)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                )}
              </Stack>
            ))}
          </Stack>

          {error && <Typography color="error">{error}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button size="small" variant="outlined" onClick={onClose} disabled={saving} sx={{ height: 36, px: 1.75 }}>
          {readOnly ? 'Đóng' : 'Hủy'}
        </Button>
        {!readOnly && (
          <Button size="small" variant="contained" onClick={handleSubmit} disabled={saving} sx={{ height: 36, px: 1.75 }}>
            {isEdit ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
