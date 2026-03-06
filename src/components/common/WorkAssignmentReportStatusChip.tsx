// src/components/common/WorkAssignmentReportStatusChip.tsx
import { Chip } from "@mui/material";
import type { ChipProps } from "@mui/material";

import {
  WorkAssignmentReportStatus,
  getWorkAssignmentReportStatusLabel,
} from "../../types/reportStatus";

interface WorkAssignmentReportStatusChipProps {
  status?: number | null;
  size?: ChipProps["size"];
  variant?: ChipProps["variant"];
}

function getChipColor(status?: number | null): ChipProps["color"] {
  switch (status) {
    case WorkAssignmentReportStatus.Draft:
      return "default";
    case WorkAssignmentReportStatus.Submitted:
      return "primary";
    case WorkAssignmentReportStatus.Approved:
      return "success";
    case WorkAssignmentReportStatus.Rejected:
      return "error";
    default:
      return "default";
  }
}

export function WorkAssignmentReportStatusChip({
  status,
  size = "small",
  variant = "outlined",
}: WorkAssignmentReportStatusChipProps) {
  return (
    <Chip
      size={size}
      variant={variant}
      color={getChipColor(status)}
      label={getWorkAssignmentReportStatusLabel(status)}
    />
  );
}