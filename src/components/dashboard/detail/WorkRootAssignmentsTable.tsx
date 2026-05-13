import { useMemo } from "react";
import { Stack, Typography } from "@mui/material";

import { AppTable, type AppTableColumn } from "../../common/AppTable";
import { StatusChip } from "../../common/StatusChip";
import CommonDateText from "../../common/CommonDateText";
import CommonLabelText from "../../common/CommonLabelText";
import BooleanChip from "../../common/BooleanChip";
import type {
  DashboardNodeAssigneeDto,
  DashboardNodeReportSummaryDto,
  WorkDashboardRootAssignmentRowDto,
} from "../../../types/dashboard";
import type { WorkStatusCore } from "../../../constants/status";

type Props = {
  rows: WorkDashboardRootAssignmentRowDto[];
  onRowDoubleClick?: (row: WorkDashboardRootAssignmentRowDto) => void;
};

function toStatusCore(value?: number | string | null): WorkStatusCore | undefined {
  if (value === null || value === undefined) return undefined;

  if (typeof value === "string") {
    const v = value.trim().toUpperCase();
    if (
      v === "NOT_STARTED" ||
      v === "IN_PROGRESS" ||
      v === "COMPLETED" ||
      v === "AT_RISK" ||
      v === "DELAYED"
    ) {
      return v as WorkStatusCore;
    }
    return undefined;
  }

  switch (value) {
    case 0:
      return "NOT_STARTED";
    case 1:
      return "IN_PROGRESS";
    case 2:
      return "COMPLETED";
    case 3:
      return "AT_RISK";
    case 4:
      return "DELAYED";
    default:
      return undefined;
  }
}

function renderAssignees(assignees?: DashboardNodeAssigneeDto[] | null) {
  const list = assignees ?? [];
  if (list.length === 0) return "-";

  return (
    <Stack spacing={0.5}>
      {list.slice(0, 3).map((item) => (
        <Typography key={item.userId} variant="caption">
          {item.fullName || item.username}
          {item.unitSymbol ? ` - ${item.unitSymbol}` : ""}
        </Typography>
      ))}
      {list.length > 3 ? (
        <Typography variant="caption" color="text.secondary">
          +{list.length - 3} người
        </Typography>
      ) : null}
    </Stack>
  );
}

function countWaiting(summary?: DashboardNodeReportSummaryDto | null): number {
  const s = summary;
  if (!s) return 0;
  return (s.pendingCount ?? 0) + (s.draftCount ?? 0) + (s.submittedCount ?? 0);
}

function countOverdue(summary?: DashboardNodeReportSummaryDto | null): number {
  const s = summary;
  if (!s) return 0;

  return (
    (s.overduePendingCount ?? 0) +
    (s.overdueDraftCount ?? 0) +
    (s.overdueSubmittedCount ?? 0) +
    (s.overdueApprovedCount ?? 0)
  );
}

function renderReportSummary(summary?: DashboardNodeReportSummaryDto | null) {
  const s = summary;
  if (!s) return "-";

  return (
    <Stack spacing={0.25}>
      <Typography variant="caption">
        Tổng: <strong>{s.total}</strong> · Chờ xử lý: <strong>{countWaiting(s)}</strong>
      </Typography>
      <Typography variant="caption">
        Đã duyệt: <strong>{s.approvedCount}</strong> · Quá hạn:{" "}
        <strong>{countOverdue(s)}</strong>
      </Typography>
    </Stack>
  );
}

export default function WorkRootAssignmentsTable({
  rows,
  onRowDoubleClick,
}: Props) {
  const columns: AppTableColumn<WorkDashboardRootAssignmentRowDto>[] = useMemo(
    () => [
      {
        field: "dynamicExcelCode",
        header: "Mã biểu mẫu",
        width: 140,
        sortable: true,
        render: (row) => <CommonLabelText text={row.dynamicExcelCode} fontWeight={600} />,
      },
      {
        field: "dynamicExcelName",
        header: "Công việc được giao",
        width: "24%",
        sortable: true,
        render: (row) => (
          <Stack spacing={0.25}>
            <CommonLabelText text={row.dynamicExcelName || "-"} fontWeight={600} />
            <CommonLabelText
              text={row.description || ""}
              variant="caption"
              color="text.secondary"
              maxLines={2}
            />
          </Stack>
        ),
      },
      {
        field: "isActive",
        header: "Trạng thái sử dụng",
        width: 140,
        sortable: false,
        render: (row) => (
          <BooleanChip
            value={!!row.isActive}
            trueLabel="Đang dùng"
            falseLabel="Ngừng dùng"
            trueColor="success"
          />
        ),
      },
      {
        field: "progressStatus",
        header: "Tiến độ",
        width: 140,
        sortable: true,
        render: (row) => <StatusChip status={toStatusCore(row.progressStatus)} />,
        getSortValue: (row) => Number(row.progressStatus ?? 0),
      },
      {
        field: "assignees",
        header: "Người thực hiện",
        width: 210,
        sortable: false,
        render: (row) => renderAssignees(row.assignees),
      },
      {
        field: "activeChildCount",
        header: "Cấp dưới hoạt động",
        width: 120,
        align: "right",
        sortable: true,
      },
      {
        field: "reportSummary",
        header: "Báo cáo",
        width: 220,
        sortable: false,
        render: (row) => renderReportSummary(row.reportSummary),
      },
      {
        field: "latestDueAtUtc",
        header: "Hạn gần nhất",
        width: 150,
        sortable: true,
        render: (row) => <CommonDateText value={row.latestDueAtUtc} withTime />,
        getSortValue: (row) => row.latestDueAtUtc || "",
      },
    ],
    []
  );

  return (
    <AppTable<WorkDashboardRootAssignmentRowDto>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.assignmentId}
      selectable={false}
      sortMode="client"
      initialSortField="latestDueAtUtc"
      initialSortDirection="desc"
      enablePagination
      paginationMode="client"
      initialPage={0}
      initialPageSize={10}
      rowsPerPageOptions={[10, 25, 50]}
      onRowDoubleClick={onRowDoubleClick}
    />
  );
}
