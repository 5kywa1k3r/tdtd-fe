import * as React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

type UnsavedChangesDialogProps = {
  open: boolean;
  title?: string;
  message: React.ReactNode;
  saveText?: string;
  discardText?: string;
  cancelText?: string;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  title = "Có thay đổi chưa lưu",
  message,
  saveText = "Lưu rồi đóng",
  discardText = "Đóng không lưu",
  cancelText = "Tiếp tục chỉnh sửa",
  saving = false,
  onSave,
  onDiscard,
  onCancel,
}) => (
  <Dialog open={open} onClose={saving ? undefined : onCancel} fullWidth maxWidth="sm">
    <DialogTitle sx={{ fontWeight: 800 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <WarningAmberRoundedIcon color="warning" />
        <span>{title}</span>
      </Stack>
    </DialogTitle>

    <DialogContent dividers>
      {typeof message === "string" ? (
        <Typography variant="body2">{message}</Typography>
      ) : (
        message
      )}
    </DialogContent>

    <DialogActions sx={{ px: 3, py: 2, gap: 0.5, flexWrap: "wrap" }}>
      <Button variant="outlined" onClick={onCancel} disabled={saving}>
        {cancelText}
      </Button>
      <Button color="warning" variant="outlined" onClick={onDiscard} disabled={saving}>
        {discardText}
      </Button>
      <Button color="primary" variant="contained" onClick={onSave} disabled={saving}>
        {saveText}
      </Button>
    </DialogActions>
  </Dialog>
);
