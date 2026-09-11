import { useEffect, useRef } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Stack,
} from "@mui/material";
import type { StatRunUiState } from "./statRunUiModel";

const PRESENTATION: Record<StatRunUiState, { title: string; detail: string; severity: "info" | "success" | "warning" | "error" }> = {
  LOADING: { title: "Đang tải", detail: "Đang đọc trạng thái chính thức từ máy chủ.", severity: "info" },
  EMPTY: { title: "Chưa có dữ liệu", detail: "Máy chủ không trả về hàng dữ liệu nào cho phạm vi và bộ lọc này.", severity: "info" },
  QUEUED: { title: "Đã xếp hàng", detail: "Yêu cầu đã được tiếp nhận và đang chờ worker xử lý.", severity: "info" },
  RUNNING: { title: "Đang xử lý", detail: "Kết quả đang được tính trên máy chủ.", severity: "info" },
  RETRYING: { title: "Đang thử lại", detail: "Máy chủ đang chờ lần thử tiếp theo theo chính sách retry.", severity: "warning" },
  READY: { title: "Sẵn sàng", detail: "Kết quả canonical hiện tại đã sẵn sàng.", severity: "success" },
  FAILED: { title: "Xử lý thất bại", detail: "Job kết thúc với lỗi ổn định từ máy chủ.", severity: "error" },
  CANCELLED: { title: "Đã hủy hoặc đặt lại", detail: "Job không còn ở trạng thái thực thi.", severity: "warning" },
  STALE: { title: "Dữ liệu đã cũ", detail: "Kết quả không còn khớp source/config pin hiện tại; không được trình bày như dữ liệu mới.", severity: "warning" },
  ERROR: { title: "Không tải được dữ liệu", detail: "Có lỗi khi gọi API. Hãy thử lại.", severity: "error" },
  FORBIDDEN: { title: "Không có quyền truy cập", detail: "Máy chủ từ chối quyền trước khi tiết lộ tài nguyên.", severity: "error" },
  READONLY: { title: "Chỉ đọc", detail: "Bạn có thể xem dữ liệu nhưng không có thao tác thay đổi trạng thái tại màn hình này.", severity: "info" },
  CONFLICT: { title: "Xung đột phiên bản", detail: "Pin hoặc revision đã thay đổi. Hãy tải lại dữ liệu mới nhất.", severity: "warning" },
  UNSUPPORTED: { title: "Chưa được hỗ trợ", detail: "Capability hoặc route này chưa được máy chủ kích hoạt.", severity: "warning" },
  SOURCE_GONE: { title: "Nguồn không còn khả dụng", detail: "Nguồn đã bị xóa, đổi phạm vi hoặc không còn hiệu lực.", severity: "warning" },
};

export function StatRunStateView({
  state,
  detail,
  onRetry,
}: {
  state: StatRunUiState;
  detail?: string | null;
  onRetry?: () => void;
}) {
  const focusRef = useRef<HTMLDivElement>(null);
  const presentation = PRESENTATION[state];
  const isBusy = state === "LOADING" || state === "QUEUED" || state === "RUNNING" || state === "RETRYING";
  const isAssertive = state === "FAILED" || state === "ERROR" || state === "FORBIDDEN";

  useEffect(() => {
    if (!isBusy) focusRef.current?.focus();
  }, [isBusy, state]);

  return (
    <Box
      ref={focusRef}
      tabIndex={-1}
      role={isAssertive ? undefined : "status"}
      aria-live={isAssertive ? undefined : "polite"}
      aria-atomic="true"
      data-testid={`stat-run-state-${state.toLowerCase()}`}
      sx={{ outline: "none" }}
    >
      <Alert
        severity={presentation.severity}
        role={isAssertive ? "alert" : undefined}
        aria-live={isAssertive ? "assertive" : undefined}
        aria-atomic={isAssertive ? "true" : undefined}
        icon={isBusy ? <CircularProgress size={20} color="inherit" aria-hidden="true" /> : undefined}
      >
        <AlertTitle>{presentation.title}</AlertTitle>
        <Stack spacing={1}>
          <span>{detail || presentation.detail}</span>
          {onRetry && ["ERROR", "CONFLICT", "SOURCE_GONE"].includes(state) ? (
            <Button size="small" variant="outlined" onClick={onRetry} sx={{ alignSelf: "flex-start" }}>
              Thử lại
            </Button>
          ) : null}
        </Stack>
      </Alert>
    </Box>
  );
}
