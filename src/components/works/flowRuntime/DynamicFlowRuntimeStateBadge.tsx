import type { ReactElement } from "react";
import { Chip } from "@mui/material";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import PublishedWithChangesOutlinedIcon from "@mui/icons-material/PublishedWithChangesOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

import {
  runtimeStatePresentation,
  runtimeStateTextColor,
} from "./dynamicFlowRuntimeModel";

type Props = {
  state: string;
  size?: "small" | "medium";
};

export default function DynamicFlowRuntimeStateBadge({ state, size = "small" }: Props) {
  const presentation = runtimeStatePresentation(state);
  let icon: ReactElement;

  switch (presentation.icon) {
    case "active":
    case "completed":
      icon = <CheckCircleOutlineOutlinedIcon />;
      break;
    case "partial":
      icon = <WarningAmberOutlinedIcon />;
      break;
    case "retrying":
      icon = <AutorenewOutlinedIcon />;
      break;
    case "reconciled":
      icon = <PublishedWithChangesOutlinedIcon />;
      break;
    case "failed":
      icon = <ErrorOutlineOutlinedIcon />;
      break;
    default:
      icon = <HourglassEmptyOutlinedIcon />;
      break;
  }

  const color =
    presentation.tone === "success"
      ? "success"
      : presentation.tone === "warning"
        ? "warning"
        : presentation.tone === "error"
          ? "error"
          : presentation.tone === "info"
            ? "info"
            : "default";

  return (
    <Chip
      icon={icon}
      label={presentation.label}
      color={color}
      variant="outlined"
      size={size}
      role="status"
      sx={{
        color: runtimeStateTextColor(state),
        borderColor: runtimeStateTextColor(state),
        maxWidth: "100%",
        height: "auto",
        py: 0.35,
        "& .MuiChip-label": { whiteSpace: "normal", overflowWrap: "anywhere" },
      }}
    />
  );
}
