import {
  Alert,
  AlertTitle,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import type { StatConfigSurfaceState } from "./statisticsConfigurationModel";

const copy: Record<
  Exclude<StatConfigSurfaceState, "LOADING">,
  { severity: "error" | "info" | "success" | "warning"; title: string; text: string }
> = {
  EMPTY: {
    severity: "info",
    title: "Chưa có cấu hình",
    text: "Owner chưa có version cấu hình. Bạn có thể tạo draft nếu API cấp quyền quản lý.",
  },
  ERROR: {
    severity: "error",
    title: "Không tải được cấu hình",
    text: "Không thể đọc trạng thái canonical. Hãy thử lại; dữ liệu đang nhập chưa bị tự động ghi đè.",
  },
  FORBIDDEN: {
    severity: "error",
    title: "Không có quyền truy cập",
    text: "Máy chủ đã từ chối quyền đọc owner này. Giao diện không suy đoán quyền từ vai trò phía client.",
  },
  READONLY: {
    severity: "info",
    title: "Chỉ đọc",
    text: "Bạn được xem cấu hình và version nhưng không có quyền thay đổi draft.",
  },
  LOCKED: {
    severity: "success",
    title: "Version đã khóa",
    text: "Version và config hash là bất biến. Tạo draft kế tiếp để tiếp tục cấu hình.",
  },
  STALE_CONFLICT: {
    severity: "warning",
    title: "Cấu hình đã thay đổi",
    text: "Revision hoặc config hash trên máy chủ không còn khớp. Nội dung local được giữ để bạn tải lại và rebase rõ ràng.",
  },
  SUCCESS: {
    severity: "success",
    title: "Cấu hình đã đồng bộ",
    text: "Readback canonical khớp version, revision và config hash hiện tại.",
  },
  RETRYING: {
    severity: "warning",
    title: "Đang thử lại validation",
    text: "Readiness job đang chờ lần thử tiếp theo. Không có result hoặc dataset nào được tạo.",
  },
  UNSUPPORTED: {
    severity: "warning",
    title: "Chưa được hỗ trợ",
    text: "Owner hoặc dependency này chưa đủ điều kiện cấu hình canonical. Các thao tác ghi đang bị chặn an toàn.",
  },
};

export function StatConfigSurfaceStateView({
  state,
  detail,
  compact = false,
}: {
  state: StatConfigSurfaceState;
  detail?: string | null;
  compact?: boolean;
}) {
  if (state === "LOADING") {
    return (
      <Box
        role="status"
        aria-live="polite"
        data-state="LOADING"
        sx={{ display: "flex", alignItems: "center", gap: 1.25, py: compact ? 1 : 2 }}
      >
        <CircularProgress size={20} />
        <Typography>Đang tải cấu hình canonical…</Typography>
      </Box>
    );
  }

  const content = copy[state];
  return (
    <Alert
      severity={content.severity}
      role={content.severity === "error" ? "alert" : "status"}
      aria-live={content.severity === "error" ? "assertive" : "polite"}
      data-state={state}
      tabIndex={state === "ERROR" || state === "STALE_CONFLICT" ? -1 : undefined}
      sx={compact ? { py: 0.25 } : undefined}
    >
      <AlertTitle>{content.title}</AlertTitle>
      <Stack spacing={0.5}>
        <span>{content.text}</span>
        {detail ? <Typography variant="caption">{detail}</Typography> : null}
      </Stack>
    </Alert>
  );
}
