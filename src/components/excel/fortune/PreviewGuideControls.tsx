import type { ReactNode } from "react";
import { Chip, IconButton, Stack, Tooltip } from "@mui/material";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

export function GuideToggleButton({
  enabled,
  disabled = false,
  onToggle,
  activeLabel = "Ẩn chú giải",
  inactiveLabel = "Hiện chú giải",
}: {
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  const label = enabled ? activeLabel : inactiveLabel;

  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          onClick={onToggle}
          disabled={disabled}
          aria-label={label}
          sx={{
            width: 34,
            height: 34,
            border: 1,
            borderColor: enabled ? "primary.main" : "divider",
            bgcolor: enabled ? "primary.main" : "background.paper",
            color: enabled ? "primary.contrastText" : "text.secondary",
            boxShadow: enabled ? "0 6px 16px rgba(25, 118, 210, 0.18)" : "none",
            "&:hover": {
              bgcolor: enabled ? "primary.dark" : "action.hover",
              borderColor: enabled ? "primary.dark" : "text.secondary",
            },
            "&.Mui-disabled": {
              bgcolor: "action.disabledBackground",
              borderColor: "divider",
            },
          }}
        >
          {enabled ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function GuideLegend({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}) {
  if (!visible) return null;
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
      {children}
    </Stack>
  );
}

export function GuideLegendChip({ label, color }: { label: string; color: string }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={label}
      sx={{
        bgcolor: color,
        borderColor: "divider",
        color: "text.primary",
        fontWeight: 650,
      }}
    />
  );
}
