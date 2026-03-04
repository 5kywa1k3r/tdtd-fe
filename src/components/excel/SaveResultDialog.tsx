import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Stack, Typography } from "@mui/material";
import type { ValidationIssue } from "./fortune/types";

export function SaveResultDialog(props: {
  open: boolean;
  ok: boolean;
  issues: ValidationIssue[];
  onClose: () => void;
}) {
  const { open, ok, issues, onClose } = props;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Kết quả lưu</DialogTitle>
      <DialogContent dividers>
        {ok ? (
          <Alert severity="success">Hợp lệ. Đã sẵn sàng lưu cấu hình header.</Alert>
        ) : (
          <Stack spacing={1}>
            <Alert severity="error">Không hợp lệ. Sửa các lỗi sau:</Alert>
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
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
