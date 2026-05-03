import { Chip } from "@mui/material";
import {
  getWorkReportPeriodStatusLabel,
  WorkReportPeriodStatus,
} from "../../types/reportStatus";

export interface ReportPeriodStatusChipProps {
  status?: number | null;
  size?: "small" | "medium";
  isReturned?: boolean;
}

export default function ReportPeriodStatusChip(
  props: ReportPeriodStatusChipProps
) {
  const { status, size = "small", isReturned = false } = props;

  if (status == null) {
    return <Chip size={size} variant="outlined" label="Chưa có" />;
  }

  if (
    isReturned &&
    (status === WorkReportPeriodStatus.Draft ||
      status === WorkReportPeriodStatus.OverdueDraft)
  ) {
    const isOverdue = status === WorkReportPeriodStatus.OverdueDraft;
    return (
      <Chip
        size={size}
        color="error"
        label={isOverdue ? "Quá hạn - Bị trả lại" : "Bị trả lại"}
      />
    );
  }

  const label = getWorkReportPeriodStatusLabel(status);

  if (
    status === WorkReportPeriodStatus.Approved ||
    status === WorkReportPeriodStatus.OverdueApproved
  ) {
    return <Chip size={size} color="success" label={label} />;
  }

  if (
    status === WorkReportPeriodStatus.Submitted ||
    status === WorkReportPeriodStatus.OverdueSubmitted
  ) {
    return <Chip size={size} color="info" label={label} />;
  }

  if (status === WorkReportPeriodStatus.Draft) {
    return <Chip size={size} color="warning" label={label} />;
  }

  if (
    status === WorkReportPeriodStatus.OverduePending ||
    status === WorkReportPeriodStatus.OverdueDraft
  ) {
    return <Chip size={size} color="error" label={label} />;
  }

  return <Chip size={size} variant="outlined" label={label} />;
}