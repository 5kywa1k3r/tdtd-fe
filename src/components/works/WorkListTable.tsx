import React, { useMemo } from "react";
import { Chip, IconButton, Stack, Tooltip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { AppTable, type AppTableColumn, type SortDirection } from "../common/AppTable";
import type { WorkListRow } from "../../types/work";
import { WorkStatusChip } from "../common/WorkStatusChip";
import CommonDateText from "../common/CommonDateText";
import CommonLabelText from "../common/CommonLabelText";
import { UITextKey, uiText } from '../../constants/uiText';

export type WorkSortField = "autoCode" | "name" | "dueDate" | "createdAtUtc" | "priority";

interface WorkListTableProps {
  rows: WorkListRow[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  sortField: WorkSortField;
  sortDirection: SortDirection;
  onSortChange: (field: WorkSortField, direction: SortDirection) => void;
  onRowDoubleClick?: (row: WorkListRow) => void;
  onEdit?: (row: WorkListRow) => void;
  onDelete?: (row: WorkListRow) => void;
  nameColumnHeader: string;
}

const typeLabel = (t?: number | null) => (t === 2 ? "Chỉ tiêu" : "Nhiệm vụ");
const priorityLabel = (p?: number | null) => {
  if (p === 3) return "Cao";
  if (p === 1) return "Thấp";
  return "Trung bình";
};

const manualEvalLabel = (row: WorkListRow) => {
  if ((row.evaluatedAssignmentCount ?? 0) <= 0) return "Chưa đánh giá";
  return row.worstEvaluationLabel || row.worstEvaluationCode || "Đã đánh giá";
};

export const WorkListTable: React.FC<WorkListTableProps> = ({
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortField,
  sortDirection,
  onSortChange,
  onRowDoubleClick,
  onDelete,
  nameColumnHeader,
}) => {
  const columns: AppTableColumn<WorkListRow>[] = useMemo(
    () => [
      {
        field: "actions",
        header: "Thao tác",
        width: 120,
        align: "center",
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title={uiText(UITextKey.TextXem)}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRowDoubleClick?.(row);
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={uiText(UITextKey.TextXoa)}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(row);
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
      {
        field: "autoCode",
        header: "Mã",
        sortable: true,
        width: 160,
        render: (row) => <CommonLabelText text={row.autoCode} fontWeight={600} />,
      },
      {
        field: "name",
        header: nameColumnHeader,
        sortable: true,
        width: "28%",
        render: (row) => <CommonLabelText text={row.name} />,
      },
      {
        field: "status",
        header: "Tiến độ",
        sortable: false,
        width: 170,
        render: (row) => <WorkStatusChip status={row.status} />,
      },
      {
        field: "evaluationTemplateLabel",
        header: "Bộ tiêu chí",
        sortable: false,
        width: 180,
        render: (row) => (
          <CommonLabelText text={row.evaluationTemplateLabel || row.evaluationTemplateCode || "-"} />
        ),
      },
      {
        field: "worstEvaluationLabel",
        header: "Đánh giá thủ công",
        sortable: false,
        width: 160,
        render: (row) => (
          <Chip
            size="small"
            variant={(row.evaluatedAssignmentCount ?? 0) > 0 ? "filled" : "outlined"}
            label={manualEvalLabel(row)}
          />
        ),
      },
      {
        field: "type",
        header: "Loại",
        sortable: true,
        width: 110,
        render: (row) => typeLabel(row.type),
      },
      {
        field: "priority",
        header: "Ưu tiên",
        sortable: true,
        width: 120,
        render: (row) => priorityLabel(row.priority),
      },
      {
        field: "dueDate",
        header: "Hạn",
        sortable: true,
        width: 120,
        render: (row) => <CommonDateText value={row.dueDate} />,
      },
      {
        field: "createdAtUtc",
        header: "Ngày tạo",
        sortable: true,
        width: 130,
        render: (row) => <CommonDateText value={row.createdAtUtc} />,
      },
    ],
    [nameColumnHeader, onDelete, onRowDoubleClick]
  );

  return (
    <AppTable<WorkListRow, WorkSortField>
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
  );
};
