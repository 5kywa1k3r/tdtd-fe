import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Stack, Typography } from "@mui/material";
import type { ValidationIssue } from "./fortune/types";
import { UITextKey, uiText } from '../../constants/uiText';

export function SaveResultDialog(props: {
  open: boolean;
  ok: boolean;
  issues: ValidationIssue[];
  onClose: () => void;
}) {
  const { open, ok, issues, onClose } = props;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{uiText(UITextKey.TextKetQuaLuu)}</DialogTitle>
      <DialogContent dividers>
        {ok ? (
          <Alert severity="success">Đã lưu cấu hình bảng biểu động.</Alert>
        ) : (
          <Stack spacing={1}>
            <Alert severity="error">{uiText(UITextKey.TextKhongHopLeSuaCacLoiSau)}</Alert>
            {issues.slice(0, 100).map((it, idx) => (
              <Alert key={idx} severity="warning">
                <Typography fontWeight={800}>{it.code}</Typography>
                <Typography>
                  {it.message}
                  {it.at ? ` (ô: ${it.at.r + 1}, ${it.at.c + 1})` : ""}
                </Typography>
              </Alert>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{uiText(UITextKey.TextDong)}</Button>
      </DialogActions>
    </Dialog>
  );
}
