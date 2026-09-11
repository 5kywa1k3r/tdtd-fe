import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import type {
  DynamicFormRow,
  DynamicFormVersionHistoryResp,
} from "../../../api/dynamicFormApi";

export type DynamicFormVersionHistoryPanelProps = {
  history?: DynamicFormVersionHistoryResp;
  currentVersionId: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onOpenVersion: (version: DynamicFormRow) => void;
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
}

function shortHash(value?: string | null) {
  if (!value) return "Chưa có hash công bố";
  return value.length <= 16 ? value : `${value.slice(0, 16)}…`;
}

export function DynamicFormVersionHistoryPanel({
  history,
  currentVersionId,
  loading = false,
  error = false,
  onRetry,
  onOpenVersion,
}: DynamicFormVersionHistoryPanelProps) {
  if (loading) {
    return (
      <Paper variant="outlined" sx={{ minHeight: 220, display: "grid", placeItems: "center" }}>
        <Stack spacing={1} alignItems="center">
          <CircularProgress size={24} />
          <Typography variant="body2">Đang tải lịch sử phiên bản…</Typography>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Thử lại
            </Button>
          ) : undefined
        }
      >
        Không tải được lịch sử phiên bản.
      </Alert>
    );
  }

  const versions = history?.versions ?? [];
  if (versions.length === 0) {
    return <Alert severity="info">Họ biểu mẫu này chưa có phiên bản để hiển thị.</Alert>;
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1, sm: 1.5 }, minWidth: 0 }}>
      <Stack spacing={1}>
        <Box>
          <Typography fontWeight={850}>Lịch sử phiên bản</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            {history?.code} · Họ {history?.familyId}
          </Typography>
        </Box>

        <List disablePadding aria-label="Lịch sử phiên bản biểu mẫu">
          {versions.map((version) => {
            const current = version.id === currentVersionId;
            const canOpen = version.actions.canRead;
            return (
              <ListItemButton
                key={version.id}
                selected={current}
                disabled={!canOpen}
                aria-label={`Mở phiên bản v${version.versionNo}${current ? " hiện tại" : ""}`}
                onClick={() => onOpenVersion(version)}
                sx={{
                  mb: 0.75,
                  border: "1px solid",
                  borderColor: current ? "primary.main" : "divider",
                  borderRadius: 1,
                  alignItems: "stretch",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  sx={{ width: "100%", minWidth: 0 }}
                >
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    <Chip size="small" color="primary" label={`v${version.versionNo}`} />
                    <Chip
                      size="small"
                      color={version.isPublished ? "success" : "warning"}
                      variant={version.isPublished ? "filled" : "outlined"}
                      label={version.isPublished ? "Đã công bố" : "Bản nháp"}
                    />
                    {current && <Chip size="small" variant="outlined" label="Đang xem" />}
                    <Typography variant="body2" fontWeight={750} sx={{ alignSelf: "center" }}>
                      {version.name}
                    </Typography>
                  </Stack>

                  <Stack spacing={0.25} sx={{ minWidth: 0, textAlign: { xs: "left", sm: "right" } }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(version.createdAtUtc)} · {version.createdByUsername}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontFamily="monospace"
                      sx={{ overflowWrap: "anywhere" }}
                    >
                      {shortHash(version.publishedSchemaHash)}
                    </Typography>
                  </Stack>
                </Stack>
              </ListItemButton>
            );
          })}
        </List>
      </Stack>
    </Paper>
  );
}

export default DynamicFormVersionHistoryPanel;
