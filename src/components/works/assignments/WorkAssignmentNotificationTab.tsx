import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import DoneOutlinedIcon from "@mui/icons-material/DoneOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";

import {
  useMarkNotificationReadMutation,
  useSearchNotificationsMutation,
} from "../../../api/notificationApi";
import type { NotificationRow, NotificationSearchResponse } from "../../../types/notification";
import { subscribeNotificationRealtime } from "../../../services/notificationRealtime";
import {
  getNotificationActionStateLabel,
  getNotificationPrimaryTagLabel,
  normalizeNotificationText,
} from "../../../utils/notificationUi";
import CommonDateText from "../../common/CommonDateText";

const PAGE_SIZE = 30;

type NotificationFilter = "ALL" | "UNREAD" | "ACTION";

type Props = {
  workId: string;
  focusedAssignmentId?: string | null;
  onClearAssignmentFocus?: () => void;
  onOpenAssignment: (assignmentId: string) => void;
  onOpenActions: () => void;
  onOpenReports: () => void;
  onOpenReview: () => void;
};

function getNotificationTone(row: NotificationRow) {
  const severity = String(row.severity || "").toUpperCase();
  const type = String(row.type || "").toUpperCase();

  if (severity === "DUE" || type.includes("OVERDUE")) return "#dc2626";
  if (severity === "WARNING" || type.includes("RISK")) return "#d97706";
  if (row.requiresAction) return "#2563eb";
  return "#64748b";
}

function getNotificationActionLabel(row: NotificationRow) {
  const type = String(row.type || "").toUpperCase();
  if (type.includes("REPORT")) return "Mở báo cáo";
  if (type.includes("REVIEW")) return "Mở duyệt";
  if (type.includes("HANDOVER") || type.includes("CLONE") || row.requiresAction) {
    return "Mở xử lý";
  }
  if (row.workAssignmentId) return "Mở phần việc";
  return "Mở chi tiết";
}

export default function WorkAssignmentNotificationTab({
  workId,
  focusedAssignmentId,
  onClearAssignmentFocus,
  onOpenAssignment,
  onOpenActions,
  onOpenReports,
  onOpenReview,
}: Props) {
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState<NotificationFilter>("ALL");
  const [items, setItems] = React.useState<NotificationRow[]>([]);
  const [cursor, setCursor] = React.useState<{ occurredAtUtc: string; id: string } | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [searchNotifications, searchState] = useSearchNotificationsMutation();
  const [markRead, markReadState] = useMarkNotificationReadMutation();

  const applyPage = React.useCallback((response: NotificationSearchResponse, append: boolean) => {
    setItems((prev) => (append ? [...prev, ...response.items] : response.items));
    setHasMore(Boolean(response.hasMore));
    setCursor(
      response.nextCursorOccurredAtUtc && response.nextCursorId
        ? { occurredAtUtc: response.nextCursorOccurredAtUtc, id: response.nextCursorId }
        : null
    );
  }, []);

  const loadFirst = React.useCallback(
    async () => {
      if (!workId) return;

      const page = await searchNotifications({
        workId,
        workAssignmentId: focusedAssignmentId || null,
        pageSize: PAGE_SIZE,
        unreadOnly: filter === "UNREAD" ? true : null,
        requiresAction: filter === "ACTION" ? true : null,
      }).unwrap();

      applyPage(page, false);
    },
    [applyPage, filter, focusedAssignmentId, searchNotifications, workId]
  );

  const loadMore = React.useCallback(
    async () => {
      if (!workId || !cursor) return;

      const page = await searchNotifications({
        workId,
        workAssignmentId: focusedAssignmentId || null,
        pageSize: PAGE_SIZE,
        unreadOnly: filter === "UNREAD" ? true : null,
        requiresAction: filter === "ACTION" ? true : null,
        cursorOccurredAtUtc: cursor.occurredAtUtc,
        cursorId: cursor.id,
      }).unwrap();

      applyPage(page, true);
    },
    [applyPage, cursor, filter, focusedAssignmentId, searchNotifications, workId]
  );

  React.useEffect(() => {
    setCursor(null);
    void loadFirst();
  }, [loadFirst]);

  React.useEffect(() => {
    let timer: ReturnType<typeof window.setTimeout> | null = null;

    const unsubscribe = subscribeNotificationRealtime(() => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        void loadFirst();
      }, 300);
    });

    return () => {
      unsubscribe();
      if (timer) window.clearTimeout(timer);
    };
  }, [loadFirst]);

  const markRowRead = React.useCallback(
    async (row: NotificationRow) => {
      if (row.readAtUtc) return;
      await markRead(row.id).unwrap();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((item) => (item.id === row.id ? { ...item, readAtUtc: now } : item)));
    },
    [markRead]
  );

  const openRowTarget = React.useCallback(
    async (row: NotificationRow) => {
      await markRowRead(row);

      if (row.actionUrl) {
        navigate(row.actionUrl);
        return;
      }

      const type = String(row.type || "").toUpperCase();
      if (type.includes("REVIEW")) {
        onOpenReview();
        return;
      }

      if (row.workAssignmentReportId || row.workReportPeriodId || type.includes("REPORT")) {
        onOpenReports();
        return;
      }

      if (type.includes("HANDOVER") || type.includes("CLONE") || type.includes("EVALUATION") || row.requiresAction) {
        onOpenActions();
        return;
      }

      if (row.workAssignmentId) {
        onOpenAssignment(row.workAssignmentId);
      }
    },
    [markRowRead, navigate, onOpenActions, onOpenAssignment, onOpenReports, onOpenReview]
  );

  const loading = searchState.isLoading;

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={1.25}
        sx={{ flexShrink: 0 }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "8px",
              display: "grid",
              placeItems: "center",
              color: "#0f5bd8",
              bgcolor: alpha("#2563eb", 0.1),
              flexShrink: 0,
            }}
          >
            <NotificationsActiveOutlinedIcon fontSize="small" />
          </Box>
          <Stack spacing={0.2} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 850, color: "#0f172a" }}>
              Thông báo trong công việc
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: { xs: "normal", md: "nowrap" },
              }}
            >
              Theo dõi thông báo đã phát sinh và mở ngược về đúng phần việc, báo cáo hoặc luồng xử lý.
            </Typography>
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          {focusedAssignmentId && (
            <Button
              variant="outlined"
              onClick={onClearAssignmentFocus}
              sx={{ borderRadius: "8px", bgcolor: "#fff", borderColor: "#dbe4f0" }}
            >
              Bỏ lọc phần việc
            </Button>
          )}
          <TextField
            select
            size="small"
            label="Bộ lọc"
            value={filter}
            onChange={(event) => setFilter(event.target.value as NotificationFilter)}
            sx={{
              minWidth: { xs: "100%", sm: 180 },
              "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" },
            }}
          >
            <MenuItem value="ALL">Tất cả</MenuItem>
            <MenuItem value="UNREAD">Chưa đọc</MenuItem>
            <MenuItem value="ACTION">Cần xử lý</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void loadFirst()}
            disabled={loading}
            sx={{ borderRadius: "8px", bgcolor: "#fff", borderColor: "#dbe4f0" }}
          >
            Làm mới
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: { md: 0.5 } }}>
        {loading && items.length === 0 ? (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Alert severity="info">Chưa có thông báo nào thuộc công việc này.</Alert>
        ) : (
          <Stack spacing={1.25}>
            {items.map((row) => {
              const tone = getNotificationTone(row);
              const unread = !row.readAtUtc;
              const title = normalizeNotificationText(row.title);
              const body = normalizeNotificationText(row.body);
              const actionStateLabel = getNotificationActionStateLabel(row.actionState);

              return (
                <Card
                  key={row.id}
                  elevation={0}
                  sx={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    bgcolor: unread ? alpha("#2563eb", 0.035) : "#fff",
                    boxShadow: "0 8px 22px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.25}
                      alignItems={{ xs: "stretch", md: "flex-start" }}
                      justifyContent="space-between"
                    >
                      <Stack spacing={1} sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                          <Chip
                            size="small"
                            label={getNotificationPrimaryTagLabel(row)}
                            sx={{
                              height: 24,
                              color: tone,
                              bgcolor: alpha(tone, 0.1),
                              border: `1px solid ${alpha(tone, 0.16)}`,
                              borderRadius: "6px",
                              fontWeight: 800,
                            }}
                          />
                          {unread && (
                            <Chip
                              size="small"
                              label="Chưa đọc"
                              color="primary"
                              variant="outlined"
                              sx={{ height: 24, borderRadius: "6px", fontWeight: 800 }}
                            />
                          )}
                          {row.requiresAction && (
                            <Chip
                              size="small"
                              label={actionStateLabel || "Cần xử lý"}
                              sx={{ height: 24, borderRadius: "6px", fontWeight: 800 }}
                            />
                          )}
                        </Stack>

                        <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ color: "#0f172a", fontWeight: 850 }}>
                            {title}
                          </Typography>
                          {body && (
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                              {body}
                            </Typography>
                          )}
                        </Stack>

                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                          {row.assignmentCode && (
                            <Chip
                              size="small"
                              icon={<AssignmentOutlinedIcon />}
                              label={row.assignmentCode}
                              sx={{ borderRadius: "6px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}
                            />
                          )}
                          {row.dueAtUtc && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                Hạn:
                              </Typography>
                              <CommonDateText value={row.dueAtUtc} withTime variant="caption" color="text.secondary" />
                            </Stack>
                          )}
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              Thời điểm:
                            </Typography>
                            <CommonDateText value={row.occurredAtUtc} withTime variant="caption" color="text.secondary" />
                          </Stack>
                        </Stack>
                      </Stack>

                      <Stack direction={{ xs: "row", md: "column" }} spacing={1} justifyContent="flex-end">
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<OpenInNewOutlinedIcon />}
                          onClick={() => void openRowTarget(row)}
                          sx={{ borderRadius: "8px", minWidth: 126 }}
                        >
                          {getNotificationActionLabel(row)}
                        </Button>
                        {!row.readAtUtc && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DoneOutlinedIcon />}
                            disabled={markReadState.isLoading}
                            onClick={() => void markRowRead(row)}
                            sx={{ borderRadius: "8px", bgcolor: "#fff", minWidth: 126 }}
                          >
                            Đã đọc
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}

            <Button
              variant="outlined"
              disabled={!hasMore || loading}
              onClick={() => void loadMore()}
              sx={{ alignSelf: "center", borderRadius: "8px", bgcolor: "#fff" }}
            >
              {hasMore ? "Tải thêm" : "Hết thông báo"}
            </Button>
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
