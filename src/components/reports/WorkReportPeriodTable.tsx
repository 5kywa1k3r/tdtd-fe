import { useMemo } from "react";
import { Button, Stack } from "@mui/material";

import { AppTable, type AppTableColumn } from "../common/AppTable";
import CommonDateText from "../common/CommonDateText";
import CommonLabelText from "../common/CommonLabelText";
import BooleanChip from "../common/BooleanChip";
import ReportPeriodStatusChip from "./ReportPeriodStatusChip";
import type { WorkReportPeriodRow } from "../../types/report";
import { WorkReportPeriodStatus } from "../../types/reportStatus";

type Props = {
  rows: WorkReportPeriodRow[];
  onOpen?: (row: WorkReportPeriodRow) => void;
  onRowDoubleClick?: (row: WorkReportPeriodRow) => void;
};

export default function WorkReportPeriodTable({
  rows,
  onOpen,
  onRowDoubleClick,
}: Props) {
  const columns = useMemo<AppTableColumn<WorkReportPeriodRow>[]>(
    () => [
      {
        field: "actions",
        header: "Thao tác",
        width: 110,
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                onOpen?.(row);
              }}
              disabled={!onOpen}
            >
              Mở
            </Button>
          </Stack>
        ),
      },
      {
        field: "periodKey",
        header: "Kỳ",
        width: 120,
        sortable: true,
        getSortValue: (row) => row.periodKey || "",
        render: (row) => <CommonLabelText text={row.periodKey || "-"} />,
      },
      {
        field: "status",
        header: "Trạng thái kỳ",
        width: 150,
        align: "center",
        sortable: true,
        getSortValue: (row) => row.status ?? -1,
        render: (row) => (
          <ReportPeriodStatusChip
            status={row.status}
            isReturned={
              !!row.returnReason &&
              (row.status === WorkReportPeriodStatus.Draft ||
                row.status === WorkReportPeriodStatus.OverdueDraft)
            }
          />
        ),
      },
      {
        field: "dueAtUtc",
        header: "Hạn nộp",
        width: 130,
        sortable: true,
        getSortValue: (row) => row.dueAtUtc || "",
        render: (row) => <CommonDateText value={row.dueAtUtc} />,
      },
      {
        field: "isOverdue",
        header: "Quá hạn",
        width: 110,
        align: "center",
        sortable: true,
        getSortValue: (row) => (row.isOverdue ? 1 : 0),
        render: (row) => (
          <BooleanChip
            value={row.isOverdue}
            trueLabel="Có"
            falseLabel="Không"
            trueColor="error"
          />
        ),
      },
      {
        field: "reportVersionCount",
        header: "Phiên bản",
        width: 110,
        align: "center",
        sortable: true,
        getSortValue: (row) => row.reportVersionCount ?? 0,
        render: (row) => row.reportVersionCount ?? 0,
      },
      {
        field: "lastDraftSavedAtUtc",
        header: "Lưu nháp gần nhất",
        width: 170,
        sortable: true,
        getSortValue: (row) => row.lastDraftSavedAtUtc || "",
        render: (row) => <CommonDateText value={row.lastDraftSavedAtUtc} withTime />,
      },
      {
        field: "lastSubmittedAtUtc",
        header: "Nộp gần nhất",
        width: 170,
        sortable: true,
        getSortValue: (row) => row.lastSubmittedAtUtc || "",
        render: (row) => <CommonDateText value={row.lastSubmittedAtUtc} withTime />,
      },
      {
        field: "lastReviewedAtUtc",
        header: "Duyệt gần nhất",
        width: 170,
        sortable: true,
        getSortValue: (row) => row.lastReviewedAtUtc || "",
        render: (row) => <CommonDateText value={row.lastReviewedAtUtc} withTime />,
      },
    ],
    [onOpen]
  );

  return (
    <AppTable<WorkReportPeriodRow>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      selectable={false}
      initialSortField="dueAtUtc"
      initialSortDirection="desc"
      initialPageSize={10}
      rowsPerPageOptions={[10, 20, 50, 100]}
      onRowDoubleClick={onRowDoubleClick}
    />
  );
}
