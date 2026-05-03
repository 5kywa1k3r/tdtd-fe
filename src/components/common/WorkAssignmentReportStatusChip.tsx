// src/components/reports/WorkAssignmentReportStatusChip.tsx
import React from "react";
import { Chip, type ChipProps } from "@mui/material";
import {
  getWorkAssignmentReportStatusLabel,
  WorkAssignmentReportStatus,
} from "../../types/reportStatus";

export interface WorkAssignmentReportStatusChipProps {
  status?: number | null;
  size?: ChipProps["size"];
  variant?: ChipProps["variant"];
}

export const WorkAssignmentReportStatusChip: React.FC<
  WorkAssignmentReportStatusChipProps
> = ({ status, size = "small", variant }) => {
  const label = getWorkAssignmentReportStatusLabel(status);

  if (status === WorkAssignmentReportStatus.Approved) {
    return (
      <Chip
        size={size}
        color="success"
        variant={variant ?? "filled"}
        label={label}
      />
    );
  }

  if (status === WorkAssignmentReportStatus.Submitted) {
    return (
      <Chip
        size={size}
        color="info"
        variant={variant ?? "filled"}
        label={label}
      />
    );
  }

  if (status === WorkAssignmentReportStatus.Draft) {
    return (
      <Chip
        size={size}
        color="warning"
        variant={variant ?? "filled"}
        label={label}
      />
    );
  }

  return (
    <Chip
      size={size}
      color="default"
      variant={variant ?? "outlined"}
      label={label}
    />
  );
};

export default WorkAssignmentReportStatusChip;