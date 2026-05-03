import { Box, Button, Stack, Typography } from "@mui/material";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";

type MindMapEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function MindMapEmptyState(props: MindMapEmptyStateProps) {
  const { title, description, actionLabel, onAction } = props;

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{
        minHeight: 420,
        px: 3,
        textAlign: "center",
        borderRadius: 4,
        border: "1px dashed",
        borderColor: "divider",
        background:
          "radial-gradient(circle at top, rgba(15,23,42,0.04), rgba(255,255,255,0) 55%)",
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          color: "primary.main",
          bgcolor: "rgba(37,99,235,0.08)",
        }}
      >
        <HubOutlinedIcon />
      </Box>

      <Typography variant="h6" fontWeight={800}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
        {description}
      </Typography>

      {actionLabel && onAction ? (
        <Button variant="outlined" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  );
}
