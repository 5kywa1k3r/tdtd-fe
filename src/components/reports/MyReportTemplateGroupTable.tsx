// src/components/reports/MyReportTemplateGroupTable.tsx
import React, { useMemo } from "react";
import dayjs from "dayjs";
import { IconButton, Stack, Tooltip } from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";

import {
  AppTable,
  type AppTableColumn,
  type SortDirection,
} from "../common/AppTable";

import type { MyReportTemplateRow } from "../../types/report";
import { WorkAssignmentReportStatusChip } from "../common/WorkAssignmentReportStatusChip";

export type MyReportTemplateSortField = "latestUpdatedAtUtc";

interface MyReportTemplateGroupTableProps {
  rows: MyReportTemplateRow[];
  total: number;

  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  sortField: MyReportTemplateSortField;
  sortDirection: SortDirection;
  onSortChange: (
    field: MyReportTemplateSortField,
    direction: SortDirection
  ) => void;

  onOpen?: (row: MyReportTemplateRow) => void;
  onRowDoubleClick?: (row: MyReportTemplateRow) => void;
}

export const MyReportTemplateGroupTable: React.FC<MyReportTemplateGroupTableProps> = ({
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortField,
  sortDirection,
  onSortChange,
  onOpen,
  onRowDoubleClick,
}) => {
  const columns: AppTableColumn<MyReportTemplateRow>[] = useMemo(
    () => [
      {
        field: "actions",
        header: "Thao tác",
        width: 90,
        align: "center",
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="Mở">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen?.(row);
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
      {
        field: "dynamicExcelCode",
        header: "Mã biểu mẫu",
        sortable: false,
        width: 150,
      },
      {
        field: "dynamicExcelName",
        header: "Tên biểu mẫu",
        sortable: false,
        width: "38%",
      },
      {
        field: "assignmentCount",
        header: "Số assignment",
        sortable: false,
        width: 120,
        align: "center",
      },
      {
        field: "reportCount",
        header: "Số report",
        sortable: false,
        width: 100,
        align: "center",
      },
      {
        field: "latestPeriodKey",
        header: "Kỳ gần nhất",
        sortable: false,
        width: 130,
        align: "center",
        render: (row) => row.latestPeriodKey || "",
      },
      {
        field: "latestReportStatus",
        header: "Trạng thái",
        sortable: false,
        width: 130,
        align: "center",
        render: (row) => (
          <WorkAssignmentReportStatusChip status={row.latestReportStatus} />
        ),
      },
      {
        field: "latestUpdatedAtUtc",
        header: "Cập nhật gần nhất",
        sortable: true,
        width: 160,
        render: (row) =>
          row.latestUpdatedAtUtc
            ? dayjs(row.latestUpdatedAtUtc).format("DD/MM/YYYY HH:mm")
            : "",
      },
    ],
    [onOpen]
  );

  return (
    <AppTable<MyReportTemplateRow, MyReportTemplateSortField>
      rows={rows}
      columns={columns}
      rowKey={(row) => row.dynamicExcelId}
      selectable={false}
      sortMode="server"
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      enablePagination
      paginationMode="server"
      page={page}
      pageSize={pageSize}
      totalRows={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowDoubleClick={onRowDoubleClick}
    />
  );
};

export default MyReportTemplateGroupTable;