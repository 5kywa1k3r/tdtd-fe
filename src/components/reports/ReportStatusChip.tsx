import { Chip } from "@mui/material";
import {
  getWorkAssignmentReportStatusLabel,
  WorkAssignmentReportStatus,
} from "../../types/reportStatus";

export interface ReportStatusChipProps {
  status?: number | null;
  size?: "small" | "medium";
}

export default function ReportStatusChip(props: ReportStatusChipProps) {
  const { status, size = "small" } = props;

  const label = getWorkAssignmentReportStatusLabel(status);

  if (status === WorkAssignmentReportStatus.Approved) {
    return <Chip size={size} color="success" label={label} />;
  }

  if (status === WorkAssignmentReportStatus.Submitted) {
    return <Chip size={size} color="info" label={label} />;
  }

  if (status === WorkAssignmentReportStatus.Draft) {
    return <Chip size={size} color="warning" label={label} />;
  }

  return <Chip size={size} variant="outlined" label={label} />;
}