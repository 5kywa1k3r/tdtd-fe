// src/components/common/WorkStatusChip.tsx
import * as React from "react";
import { Chip, type ChipProps } from "@mui/material";

type ChipColor = ChipProps["color"];

export type WorkStatusCode = 1 | 2 | 3 | 4 | 5;

const STATUS_LABEL: Record<WorkStatusCode, string> = {
  1: "Chua bat dau",
  2: "Dang thuc hien",
  3: "Hoan thanh",
  4: "Co nguy co qua han",
  5: "Qua han",
};

const STATUS_COLOR: Record<WorkStatusCode, ChipColor> = {
  1: "default",
  2: "primary",
  3: "success",
  4: "warning",
  5: "error",
};

export interface WorkStatusChipProps {
  status?: number | null;
  size?: ChipProps["size"];
}

export const WorkStatusChip: React.FC<WorkStatusChipProps> = ({ status, size = "small" }) => {
  if (!status) {
    return (
      <Chip size={size} label="Chua thiet lap" variant="outlined" color="default" />
    );
  }

  const s = status as WorkStatusCode;
  const label = STATUS_LABEL[s] ?? `Trang thai ${status}`;
  const color = STATUS_COLOR[s] ?? "default";

  return (
    <Chip
      size={size}
      label={label}
      color={color}
      variant={color === "default" ? "outlined" : "filled"}
    />
  );
};
