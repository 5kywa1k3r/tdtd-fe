// src/components/reports/WorkAssignmentReportTable.tsx
import React, { useMemo } from "react";
import dayjs from "dayjs";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

import {
  AppTable,
  type AppTableColumn,
  type SortDirection,
} from "../../../components/common/AppTable";

import type { WorkAssignmentReportListRow } from "../../../types/report";
import { WorkAssignmentReportStatusChip } from "../../../components/common/WorkAssignmentReportStatusChip";

export type WorkAssignmentReportSortField = "updatedAtUtc";

interface WorkAssignmentReportTableProps {
  rows: WorkAssignmentReportListRow[];
  total: number;

  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  sortField: WorkAssignmentReportSortField;
  sortDirection: SortDirection;
  onSortChange: (
    field: WorkAssignmentReportSortField,
    direction: SortDirection
  ) => void;

  onOpen?: (row: WorkAssignmentReportListRow) => void;
  onInitDraft?: () => void;
  onRowDoubleClick?: (row: WorkAssignmentReportListRow) => void;

  creating?: boolean;
}

export const WorkAssignmentReportTable: React.FC<
  WorkAssignmentReportTableProps
> = ({
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
  onInitDraft,
  onRowDoubleClick,
  creating = false,
}) => {
  const columns: AppTableColumn<WorkAssignmentReportListRow>[] = useMemo(
    () => [
      {
        field: "actions",
        header: "Thao tác",
        width: 120,
        align: "center",
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="Mở báo cáo">
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
        field: "periodKey",
        header: "Kỳ báo cáo",
        sortable: false,
        width: 150,
      },
      {
        field: "status",
        header: "Trạng thái",
        sortable: false,
        width: 130,
        align: "center",
        render: (row) => <WorkAssignmentReportStatusChip status={row.status} />,
      },
      {
        field: "dynamicExcelTemplateCode",
        header: "Mã biểu mẫu",
        sortable: false,
        width: 150,
      },
      {
        field: "dynamicExcelTemplateName",
        header: "Tên biểu mẫu",
        sortable: false,
        width: "34%",
      },
      {
        field: "submittedAtUtc",
        header: "Ngày nộp",
        sortable: false,
        width: 140,
        render: (row) =>
          row.submittedAtUtc
            ? dayjs(row.submittedAtUtc).format("DD/MM/YYYY HH:mm")
            : "",
      },
      {
        field: "updatedAtUtc",
        header: "Cập nhật",
        sortable: true,
        width: 150,
        render: (row) =>
          row.updatedAtUtc
            ? dayjs(row.updatedAtUtc).format("DD/MM/YYYY HH:mm")
            : "",
      },
    ],
    [onOpen]
  );

  return (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>
          Danh sách báo cáo theo kỳ
        </Typography>

        <Tooltip title="Tạo báo cáo mới">
          <span>
            <IconButton onClick={onInitDraft} disabled={creating}>
              <AddCircleOutlineIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <AppTable<WorkAssignmentReportListRow, WorkAssignmentReportSortField>
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
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
    </Stack>
  );
};

export default WorkAssignmentReportTable;