import { Chip } from "@mui/material";
import {
  getWorkAssignmentProgressStatusLabel,
  WorkAssignmentProgressStatus,
} from "../../types/reportStatus";

export interface AssignmentProgressChipProps {
  status?: number | null;
  size?: "small" | "medium";
}

export default function AssignmentProgressChip(
  props: AssignmentProgressChipProps
) {
  const { status, size = "small" } = props;

  const label = getWorkAssignmentProgressStatusLabel(status);

  if (status === WorkAssignmentProgressStatus.Completed) {
    return <Chip size={size} color="success" label={label} />;
  }

  if (status === WorkAssignmentProgressStatus.InProgress) {
    return <Chip size={size} color="info" label={label} />;
  }

  if (status === WorkAssignmentProgressStatus.AtRiskOverdue) {
    return <Chip size={size} color="warning" label={label} />;
  }

  if (status === WorkAssignmentProgressStatus.Overdue) {
    return <Chip size={size} color="error" label={label} />;
  }

  return <Chip size={size} variant="outlined" label={label} />;
}