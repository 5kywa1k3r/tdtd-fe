import { useMemo } from "react";
import { Stack, Typography } from "@mui/material";

import { AppTable, type AppTableColumn } from "../../common/AppTable";
import { StatusChip } from "../../common/StatusChip";
import CommonDateText from "../../common/CommonDateText";
import CommonLabelText from "../../common/CommonLabelText";
import type {
  DashboardOverviewMode,
  DashboardOverviewTableRowDto,
} from "../../../types/dashboard";
import type { WorkStatusCore } from "../../../constants/status";

type Props = {
  mode: DashboardOverviewMode;
  rows: DashboardOverviewTableRowDto[];
};

function toStatusCore(value?: number | string | null): WorkStatusCore | undefined {
  if (value === null || value === undefined) return undefined;

  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return toStatusCore(n);
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

function renderReportSummary(row: DashboardOverviewTableRowDto) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption">
        Tổng: <strong>{row.reportTotal ?? 0}</strong> · Chưa làm:{" "}
        <strong>{row.pendingCount ?? 0}</strong>
      </Typography>
      <Typography variant="caption">
        Nháp: <strong>{row.draftCount ?? 0}</strong> · Đã nộp:{" "}
        <strong>{row.submittedCount ?? 0}</strong>
      </Typography>
      <Typography variant="caption">
        Đã duyệt: <strong>{row.approvedCount ?? 0}</strong> · Quá hạn:{" "}
        <strong>{row.overdueCount ?? 0}</strong>
      </Typography>
    </Stack>
  );
}

export default function DashboardWorksTable({ mode, rows }: Props) {
  const columns: AppTableColumn<DashboardOverviewTableRowDto>[] = useMemo(() => {
    switch (mode) {
      case "WORK_TASK":
      case "WORK_TARGET":
        return [
          {
            field: "workCode",
            header: "Mã",
            width: 140,
            sortable: true,
            render: (row) => <CommonLabelText text={row.workCode} fontWeight={600} />,
          },
          {
            field: "workName",
            header: "Nội dung",
            width: "28%",
            sortable: true,
            render: (row) => <CommonLabelText text={row.workName} />,
          },
          {
            field: "workStatus",
            header: "Trạng thái work",
            width: 160,
            sortable: true,
            render: (row) => <StatusChip status={toStatusCore(row.workStatus)} />,
            getSortValue: (row) => Number(row.workStatus ?? 0),
          },
          {
            field: "reportTotal",
            header: "Công việc gốc",
            width: 130,
            align: "right",
            sortable: true,
          },
          {
            field: "pendingCount",
            header: "Chưa thực hiện",
            width: 120,
            align: "right",
            sortable: true,
          },
          {
            field: "draftCount",
            header: "Đang thực hiện",
            width: 120,
            align: "right",
            sortable: true,
          },
          {
            field: "submittedCount",
            header: "Hoàn thành",
            width: 120,
            align: "right",
            sortable: true,
          },
          {
            field: "approvedCount",
            header: "Nguy cơ chậm",
            width: 120,
            align: "right",
            sortable: true,
          },
          {
            field: "overdueCount",
            header: "Chậm muộn",
            width: 110,
            align: "right",
            sortable: true,
          },
          {
            field: "updatedAtUtc",
            header: "Cập nhật",
            width: 150,
            sortable: true,
            render: (row) => <CommonDateText value={row.updatedAtUtc} withTime />,
            getSortValue: (row) => row.updatedAtUtc || "",
          },
        ];

      case "ASSIGNMENT_CREATED":
      case "ASSIGNMENT_RECEIVED":
        return [
          {
            field: "assignmentCode",
            header: "Mã assignment",
            width: 150,
            sortable: true,
            render: (row) => <CommonLabelText text={row.assignmentCode} fontWeight={600} />,
          },
          {
            field: "workName",
            header: "Work",
            width: "20%",
            sortable: true,
            render: (row) => <CommonLabelText text={row.workName} />,
          },
          {
            field: "assignmentName",
            header: "Công việc",
            width: "22%",
            sortable: true,
            render: (row) => <CommonLabelText text={row.assignmentName} />,
          },
          {
            field: "assignmentProgressStatus",
            header: "Trạng thái assignment",
            width: 180,
            sortable: true,
            render: (row) => <StatusChip status={toStatusCore(row.assignmentProgressStatus)} />,
            getSortValue: (row) => Number(row.assignmentProgressStatus ?? 0),
          },
          {
            field: "firstAssigneeName",
            header: "Người thực hiện",
            width: 180,
            sortable: true,
            render: (row) => <CommonLabelText text={row.firstAssigneeName} />,
          },
          {
            field: "unitLabel",
            header: "Đơn vị",
            width: 150,
            sortable: true,
            render: (row) => <CommonLabelText text={row.unitLabel} />,
          },
          {
            field: "reportSummary",
            header: "Tổng hợp report",
            width: 250,
            sortable: false,
            render: (row) => renderReportSummary(row),
          },
          {
            field: "dueAtUtc",
            header: "Hạn gần nhất",
            width: 150,
            sortable: true,
            render: (row) => <CommonDateText value={row.dueAtUtc} withTime />,
            getSortValue: (row) => row.dueAtUtc || "",
          },
        ];

      case "REPORT":
      default:
        return [
          {
            field: "assignmentCode",
            header: "Assignment",
            width: 150,
            sortable: true,
            render: (row) => <CommonLabelText text={row.assignmentCode} fontWeight={600} />,
          },
          {
            field: "workName",
            header: "Work",
            width: "20%",
            sortable: true,
            render: (row) => <CommonLabelText text={row.workName} />,
          },
          {
            field: "assignmentName",
            header: "Công việc",
            width: "22%",
            sortable: true,
            render: (row) => <CommonLabelText text={row.assignmentName} />,
          },
          {
            field: "firstAssigneeName",
            header: "Người thực hiện",
            width: 180,
            sortable: true,
            render: (row) => <CommonLabelText text={row.firstAssigneeName} />,
          },
          {
            field: "unitLabel",
            header: "Đơn vị",
            width: 150,
            sortable: true,
            render: (row) => <CommonLabelText text={row.unitLabel} />,
          },
          {
            field: "periodKey",
            header: "Kỳ",
            width: 120,
            sortable: true,
            render: (row) => <CommonLabelText text={row.periodKey} />,
          },
          {
            field: "reportStatusKey",
            header: "Trạng thái kỳ",
            width: 170,
            sortable: true,
            render: (row) => <CommonLabelText text={row.reportStatusKey} />,
          },
          {
            field: "dueAtUtc",
            header: "Hạn báo cáo",
            width: 150,
            sortable: true,
            render: (row) => <CommonDateText value={row.dueAtUtc} withTime />,
            getSortValue: (row) => row.dueAtUtc || "",
          },
          {
            field: "updatedAtUtc",
            header: "Cập nhật",
            width: 150,
            sortable: true,
            render: (row) => <CommonDateText value={row.updatedAtUtc} withTime />,
            getSortValue: (row) => row.updatedAtUtc || "",
          },
        ];
    }
  }, [mode]);

  const initialSortField = mode === "REPORT" ? "dueAtUtc" : "updatedAtUtc";
  const initialSortDirection = mode === "REPORT" ? "asc" : "desc";

  return (
    <AppTable<DashboardOverviewTableRowDto>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      selectable={false}
      sortMode="client"
      initialSortField={initialSortField}
      initialSortDirection={initialSortDirection}
      enablePagination
      paginationMode="client"
      initialPage={0}
      initialPageSize={10}
      rowsPerPageOptions={[10, 25, 50]}
    />
  );
}
