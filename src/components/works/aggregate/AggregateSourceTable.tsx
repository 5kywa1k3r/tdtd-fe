import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { AppTable, type AppTableColumn } from "../../common/AppTable";
import type { AggregateSourceRowDto } from "../../../types/reportAggregate";
import {
  formatDayKeyLabel,
  getSourceStatusLabel,
  getSourceUnitLabel,
  getSourceUserLabel,
} from "../../../components/works/aggregate/aggregateUtils";

export type AggregateSourceTableProps = {
  rows: AggregateSourceRowDto[];
};

function formatSourceDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const AggregateSourceTable: React.FC<AggregateSourceTableProps> = ({ rows }) => {
  const columns = React.useMemo<AppTableColumn<AggregateSourceRowDto>[]>(
    () => [
      {
        field: "reportId",
        header: "Report",
        width: 160,
        sortable: false,
        render: (row) => row.reportId,
      },
      {
        field: "workAssignmentId",
        header: "Assignment",
        width: 160,
        sortable: false,
        render: (row) => row.workAssignmentId,
      },
      {
        field: "fullName",
        header: "Người dùng",
        width: "20%",
        sortable: false,
        render: (row) => (
          <Typography variant="body2" noWrap title={getSourceUserLabel(row)}>
            {getSourceUserLabel(row)}
          </Typography>
        ),
      },
      {
        field: "unitShortName",
        header: "Đơn vị",
        width: "16%",
        sortable: false,
        render: (row) => (
          <Typography variant="body2" noWrap title={getSourceUnitLabel(row)}>
            {getSourceUnitLabel(row)}
          </Typography>
        ),
      },
      {
        field: "periodKey",
        header: "Kỳ",
        width: 130,
        sortable: false,
        render: (row) => formatDayKeyLabel(row.periodKey),
      },
      {
        field: "periodInstanceKey",
        header: "Instance",
        width: 150,
        sortable: false,
        render: (row) => row.periodInstanceKey || "-",
      },
      {
        field: "reportDate",
        header: "Ngày BC",
        width: 120,
        sortable: false,
        render: (row) => formatSourceDate(row.reportDate),
      },
      {
        field: "periodKind",
        header: "Loại",
        width: 120,
        sortable: false,
        render: (row) => row.periodKind || "-",
      },
      {
        field: "reportStatus",
        header: "Trạng thái",
        width: 130,
        sortable: false,
        render: (row) => (
          <Chip size="small" variant="outlined" label={getSourceStatusLabel(row.reportStatus)} />
        ),
      },
    ],
    []
  );

  return (
    <Box sx={{ minHeight: 280 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Nguồn dùng để tổng hợp
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.72 }}>
          {rows.length} báo cáo
        </Typography>
      </Stack>
      <AppTable<AggregateSourceRowDto>
        rows={rows}
        columns={columns}
        rowKey={(row) => row.reportId}
        selectable={false}
      />
    </Box>
  );
};

export default AggregateSourceTable;
