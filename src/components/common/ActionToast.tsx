import * as React from "react";
import { Alert, Snackbar } from "@mui/material";

export type ActionToastSeverity = "success" | "error" | "info" | "warning";

export type ActionToastState = {
  open: boolean;
  message: string;
  severity?: ActionToastSeverity;
};

type ActionToastProps = ActionToastState & {
  autoHideDuration?: number;
  onClose: () => void;
};

export const ActionToast: React.FC<ActionToastProps> = ({
  open,
  message,
  severity = "info",
  autoHideDuration = 2600,
  onClose,
}) => (
  <Snackbar
    open={open}
    autoHideDuration={autoHideDuration}
    anchorOrigin={{ vertical: "top", horizontal: "right" }}
    onClose={(_event, reason) => {
      if (reason === "clickaway") return;
      onClose();
    }}
  >
    <Alert
      elevation={6}
      variant="filled"
      severity={severity}
      onClose={onClose}
      sx={{ minWidth: 280, maxWidth: 520 }}
    >
      {message}
    </Alert>
  </Snackbar>
);
