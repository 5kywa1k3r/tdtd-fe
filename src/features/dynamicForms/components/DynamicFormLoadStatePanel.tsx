import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";

type DynamicFormLoadStatePanelProps = {
  forbidden: boolean;
  onBack: () => void;
  onRetry: () => void;
};

export default function DynamicFormLoadStatePanel({
  forbidden,
  onBack,
  onRetry,
}: DynamicFormLoadStatePanelProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        maxWidth: 720,
        mx: "auto",
        mt: { xs: 1, sm: 3 },
        overflow: "hidden",
      }}
    >
      <Alert
        severity={forbidden ? "warning" : "error"}
        role="alert"
        sx={{
          alignItems: "flex-start",
          py: { xs: 1.5, sm: 2 },
          "& .MuiAlert-message": { width: "100%", minWidth: 0 },
        }}
      >
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography fontWeight={800}>
              {forbidden
                ? "Bạn không có quyền xem biểu mẫu này"
                : "Không tải được biểu mẫu"}
            </Typography>
            <Typography variant="body2">
              {forbidden
                ? "Biểu mẫu có thể không tồn tại hoặc tài khoản hiện tại chưa được cấp quyền."
                : "Hãy thử tải lại. Nếu lỗi vẫn tiếp diễn, quay về danh sách biểu mẫu."}
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="stretch">
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}>
              Về danh sách biểu mẫu
            </Button>
            {!forbidden && (
              <Button variant="contained" startIcon={<RefreshIcon />} onClick={onRetry}>
                Thử lại
              </Button>
            )}
          </Stack>
        </Stack>
      </Alert>
    </Paper>
  );
}
