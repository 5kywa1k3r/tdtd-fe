import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Divider,
} from '@mui/material';
import { type UnitFieldRevision } from '../../types/dynamicReport';

interface Props {
  open: boolean;
  title?: string;
  revisions: UnitFieldRevision[];
  onClose: () => void;
}

export const FieldHistoryDialog: React.FC<Props> = ({ open, title = 'Lịch sử chỉnh sửa', revisions, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {revisions.length === 0 && (
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Chưa có lịch sử.
            </Typography>
          )}

          {revisions.map((r) => (
            <Stack key={r.id} spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {r.changeSource}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {new Date(r.changedAt).toLocaleString()}
                </Typography>
              </Stack>

              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Layer: {r.layer ?? 'N/A'} • Window: {r.windowId ?? '—'}
              </Typography>

              <Divider />
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="contained" onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};
