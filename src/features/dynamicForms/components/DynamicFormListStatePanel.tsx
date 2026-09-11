import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";

export type DynamicFormListStateKind = "loading" | "empty" | "forbidden" | "error";

type Props = {
  state: DynamicFormListStateKind;
  onRetry?: () => void;
};

const stateCopy: Record<Exclude<DynamicFormListStateKind, "loading">, { title: string; detail: string }> = {
  empty: {
    title: "Chưa có biểu mẫu phù hợp",
    detail: "Thay đổi bộ lọc hoặc tạo biểu mẫu mới để bắt đầu.",
  },
  forbidden: {
    title: "Bạn không có quyền xem danh sách biểu mẫu",
    detail: "Hãy kiểm tra lại tài khoản hoặc liên hệ quản trị viên để được cấp quyền.",
  },
  error: {
    title: "Không tải được danh sách biểu mẫu",
    detail: "Dữ liệu hiện tại chưa được thay bằng một danh sách rỗng. Hãy thử tải lại.",
  },
};

export function DynamicFormListStatePanel({ state, onRetry }: Props) {
  if (state === "loading") {
    return (
      <Paper
        role="status"
        aria-live="polite"
        aria-label="Đang tải danh sách biểu mẫu"
        variant="outlined"
        sx={{ minHeight: 260, display: "grid", placeItems: "center", px: { xs: 2, sm: 4 } }}
      >
        <Stack alignItems="center" spacing={1.5}>
          <CircularProgress size={28} />
          <Typography fontWeight={700}>Đang tải danh sách biểu mẫu...</Typography>
        </Stack>
      </Paper>
    );
  }

  const copy = stateCopy[state];
  if (state === "empty") {
    return (
      <Paper
        role="status"
        variant="outlined"
        sx={{ minHeight: 220, display: "grid", placeItems: "center", px: { xs: 2, sm: 4 } }}
      >
        <Stack alignItems="center" spacing={0.75} textAlign="center">
          <Typography fontWeight={800}>{copy.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {copy.detail}
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Box sx={{ py: 1 }}>
      <Alert
        severity={state === "forbidden" ? "warning" : "error"}
        role="alert"
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Thử lại
            </Button>
          ) : undefined
        }
        sx={{ alignItems: "center", "& .MuiAlert-message": { minWidth: 0 } }}
      >
        <Typography fontWeight={800}>{copy.title}</Typography>
        <Typography variant="body2">{copy.detail}</Typography>
      </Alert>
    </Box>
  );
}
