import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
} from "@mui/material";

export type ActionResultDialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  detail?: string;
  severity?: "success" | "error" | "info" | "warning";
  okText?: string;
};

export const ActionResultDialog: React.FC<ActionResultDialogProps> = ({
  open,
  onClose,
  title,
  message,
  detail,
  severity = "info",
  okText = "Đóng",
}) => {
  const defaultTitle =
    severity === "success"
      ? "Thành công"
      : severity === "error"
        ? "Thất bại"
        : severity === "warning"
          ? "Thông báo"
          : "Thông tin";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1.25 }}>
        {title ?? defaultTitle}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={0.75}>
          {message && <Typography variant="body2">{message}</Typography>}
          {detail && (
            <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "pre-wrap" }}>
              {detail}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          {okText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};