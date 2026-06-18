import * as React from "react";
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import {
  useGetNotificationUnreadCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useSearchNotificationsMutation,
} from "../../api/notificationApi";
import type { NotificationRow, NotificationSearchResponse } from "../../types/notification";
import { connectNotificationRealtime } from "../../services/notificationRealtime";
import { UITextKey, uiText } from '../../constants/uiText';
import { normalizeNotificationText } from "../../utils/notificationUi";

const PAGE_SIZE = 20;

function formatTime(value?: string | null) {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "";
}

function getWorkPath(row: NotificationRow) {
  const type = String(row.type || "").toUpperCase();
  if (type === "ASSIGNMENT_ASSIGNED" && row.workId) {
    const basePath = row.workType === 2 ? `/indicators/${row.workId}` : `/tasks/${row.workId}`;
    return basePath;
  }
  if (row.actionUrl) return row.actionUrl;
  if (!row.workId) return null;

  const basePath = row.workType === 2 ? `/indicators/${row.workId}` : `/tasks/${row.workId}`;
  if (
    row.requiresAction ||
    type.includes("HANDOVER") ||
    type.includes("CLONE") ||
    type.includes("REVIEW") ||
    type.includes("EVALUATION")
  ) {
    return `${basePath}?tab=ASSIGN&section=ACTIONS`;
  }
  if (type.includes("ASSIGNMENT") || type.includes("REPORT") || type.includes("DUE")) {
    return `${basePath}?tab=ASSIGN&section=NOTIFICATIONS${row.workAssignmentId ? `&assignmentId=${row.workAssignmentId}` : ""}`;
  }
  return basePath;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [items, setItems] = React.useState<NotificationRow[]>([]);
  const [cursor, setCursor] = React.useState<{ occurredAtUtc: string; id: string } | null>(null);
  const [hasMore, setHasMore] = React.useState(false);

  const open = Boolean(anchorEl);
  const openRef = React.useRef(open);
  openRef.current = open;

  const { data: unreadData, refetch: refetchUnread } = useGetNotificationUnreadCountQuery(undefined, {
    pollingInterval: 60000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const [searchNotifications, searchState] = useSearchNotificationsMutation();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, markAllState] = useMarkAllNotificationsReadMutation();

  const unreadCount = unreadData?.unreadCount ?? 0;
  const loading = searchState.isLoading;

  const applyPage = React.useCallback((response: NotificationSearchResponse, append: boolean) => {
    setItems((prev) => (append ? [...prev, ...response.items] : response.items));
    setHasMore(Boolean(response.hasMore));
    setCursor(
      response.nextCursorOccurredAtUtc && response.nextCursorId
        ? { occurredAtUtc: response.nextCursorOccurredAtUtc, id: response.nextCursorId }
        : null,
    );
  }, []);

  const loadFirst = React.useCallback(async () => {
    const page = await searchNotifications({ pageSize: PAGE_SIZE }).unwrap();
    applyPage(page, false);
    void refetchUnread();
  }, [applyPage, refetchUnread, searchNotifications]);

  const loadMore = React.useCallback(async () => {
    if (!cursor || loading) return;

    const page = await searchNotifications({
      pageSize: PAGE_SIZE,
      cursorOccurredAtUtc: cursor.occurredAtUtc,
      cursorId: cursor.id,
    }).unwrap();

    applyPage(page, true);
  }, [applyPage, cursor, loading, searchNotifications]);

  React.useEffect(() => {
    let connection: ReturnType<typeof connectNotificationRealtime> | null = null;
    const timer = window.setTimeout(() => {
      connection = connectNotificationRealtime({
        onChanged: () => {
          void refetchUnread();
          if (openRef.current) void loadFirst();
        },
      });
    }, 1500);

    return () => {
      window.clearTimeout(timer);
      connection?.stop();
    };
  }, [loadFirst, refetchUnread]);

  const handleOpen = async (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    if (items.length === 0) await loadFirst();
  };

  const handleClose = () => setAnchorEl(null);

  const handleMarkAllRead = async () => {
    await markAllRead().unwrap();
    const now = new Date().toISOString();
    setItems((prev) => prev.map((item) => ({ ...item, readAtUtc: item.readAtUtc ?? now })));
    void refetchUnread();
  };

  const handleClickItem = async (row: NotificationRow) => {
    if (!row.readAtUtc) {
      await markRead(row.id).unwrap();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((item) => (item.id === row.id ? { ...item, readAtUtc: now } : item)));
      void refetchUnread();
    }

    const path = getWorkPath(row);
    if (path) {
      handleClose();
      navigate(path);
    }
  };

  return (
    <>
      <Tooltip title={uiText(UITextKey.TextThongBao)}>
        <IconButton color="inherit" sx={{ mr: 0.5 }} onClick={handleOpen}>
          <Badge
            color="error"
            badgeContent={unreadCount > 99 ? "99+" : unreadCount}
            invisible={unreadCount <= 0}
          >
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1,
            width: { xs: "calc(100vw - 24px)", sm: 420 },
            maxWidth: "calc(100vw - 24px)",
            overflow: "hidden",
            borderRadius: 2,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }}>{uiText(UITextKey.TextThongBao)}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {unreadCount} chưa đọc
              </Typography>
            </Box>

            <Button
              size="small"
              startIcon={<DoneAllIcon fontSize="small" />}
              disabled={unreadCount <= 0 || markAllState.isLoading}
              onClick={handleMarkAllRead}
            >
              Đọc hết
            </Button>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ maxHeight: 440, overflowY: "auto" }}>
          {loading && items.length === 0 ? (
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ p: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Đang tải...
              </Typography>
            </Stack>
          ) : items.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Chưa có thông báo.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {items.map((item) => {
                const unread = !item.readAtUtc;
                const title = normalizeNotificationText(item.title);
                const body = normalizeNotificationText(item.body);
                const secondary = [
                  body,
                  item.dueAtUtc ? `Hạn ${formatTime(item.dueAtUtc)}` : null,
                  formatTime(item.occurredAtUtc),
                ]
                  .filter(Boolean)
                  .join(" - ");

                return (
                  <ListItemButton
                    key={item.id}
                    onClick={() => void handleClickItem(item)}
                    sx={{
                      alignItems: "flex-start",
                      gap: 1,
                      py: 1.15,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: unread ? "action.hover" : "background.paper",
                    }}
                  >
                    <FiberManualRecordIcon
                      sx={{
                        mt: 0.65,
                        fontSize: 10,
                        color: unread ? "primary.main" : "transparent",
                        flex: "0 0 auto",
                      }}
                    />
                    <ListItemText
                      primary={title}
                      secondary={secondary}
                      primaryTypographyProps={{
                        fontWeight: unread ? 800 : 600,
                        noWrap: true,
                        title,
                      }}
                      secondaryTypographyProps={{
                        sx: {
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        },
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>

        <Divider />

        <Box sx={{ p: 1 }}>
          <Button fullWidth size="small" disabled={!hasMore || loading} onClick={() => void loadMore()}>
            {hasMore ? "Tải thêm" : "Hết thông báo"}
          </Button>
        </Box>
      </Menu>
    </>
  );
}
