import React, { useMemo } from "react";
import { Box, Chip, IconButton, Stack, Tooltip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PublishIcon from "@mui/icons-material/Publish";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import { AppTable, type AppTableColumn, type SortDirection } from "../../../components/common/AppTable";
import CommonDateText from "../../../components/common/CommonDateText";
import CommonLabelText from "../../../components/common/CommonLabelText";
import type { DynamicFormRow, DynamicFormSearchReq } from "../../../api/dynamicFormApi";
import { UITextKey, uiText } from '../../../constants/uiText';

type SortField = NonNullable<DynamicFormSearchReq["sortField"]>;

interface DynamicFormListTableProps {
  rows: DynamicFormRow[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  onRowDoubleClick?: (row: DynamicFormRow) => void;
  onView?: (row: DynamicFormRow) => void;
  onEdit?: (row: DynamicFormRow) => void;
  onPublish?: (row: DynamicFormRow) => void;
  onClone?: (row: DynamicFormRow) => void;
  onDelete?: (row: DynamicFormRow) => void;
}

function copyText(text: string) {
  try {
    void navigator.clipboard?.writeText(text);
  } catch {
    // ignore
  }
}

export const DynamicFormListTable: React.FC<DynamicFormListTableProps> = ({
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
  onView,
  onEdit,
  onPublish,
  onClone,
  onDelete,
}) => {
  const columns: AppTableColumn<DynamicFormRow>[] = useMemo(
    () => [
      {
        field: "actions",
        header: "",
        width: 168,
        align: "center",
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={0.25} justifyContent="center">
            <Tooltip title={uiText(UITextKey.TextXem)}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onView?.(row);
                  if (!onView) onRowDoubleClick?.(row);
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={uiText(UITextKey.TextSua2)}>
              <span>
                <IconButton
                  size="small"
                  disabled={row.isPublished || row.canMutate === false}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(row);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={uiText(UITextKey.TextPublish)}>
              <span>
                <IconButton
                  size="small"
                  disabled={row.isPublished || row.canMutate === false}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPublish?.(row);
                  }}
                >
                  <PublishIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={row.canClone === false ? "Chưa có quyền sao chép" : uiText(UITextKey.TextClone)}>
              <span>
                <IconButton
                  size="small"
                  disabled={row.canClone === false}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClone?.(row);
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={uiText(UITextKey.TextXoa2)}>
              <span>
                <IconButton
                  size="small"
                  disabled={row.isPublished || row.canMutate === false}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(row);
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      },
      {
        field: "code",
        header: "Mã",
        sortable: true,
        width: 230,
        render: (row) => (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Tooltip title={row.code}>
              <Chip
                label={row.code}
                size="small"
                variant="outlined"
                sx={{
                  height: 24,
                  fontSize: 12,
                  maxWidth: 180,
                  "& .MuiChip-label": {
                    px: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                }}
              />
            </Tooltip>

            <Tooltip title={uiText(UITextKey.TextCopy)}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  copyText(row.code);
                }}
              >
                <ContentCopyIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
      {
        field: "name",
        header: "Tên",
        sortable: true,
        width: "30%",
        render: (row) => <CommonLabelText text={row.name} />,
      },
      {
        field: "status",
        header: "Trạng thái",
        width: 150,
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={0.75}>
            <Chip
              size="small"
              label={row.isPublished ? "Đã công bố" : "Bản nháp"}
              color={row.isPublished ? "success" : "default"}
              variant={row.isPublished ? "filled" : "outlined"}
            />
            {!row.isActive && <Chip size="small" label={uiText(UITextKey.TextInactive)} color="warning" variant="outlined" />}
            {row.canViewByCloneGrant && (
              <Chip size="small" label="Được cấp quyền sao chép" color="info" variant="outlined" />
            )}
          </Stack>
        ),
      },
      {
        field: "versionNo",
        header: "Phiên bản",
        sortable: true,
        width: 100,
        render: (row) => <CommonLabelText text={`v${row.versionNo}`} />,
      },
      {
        field: "createdAtUtc",
        header: "Ngày tạo",
        sortable: true,
        width: 160,
        render: (row) => <CommonDateText value={row.createdAtUtc} />,
        getSortValue: (row) => row.createdAtUtc || "",
      },
      {
        field: "createdByUsername",
        header: "Người tạo",
        sortable: true,
        width: 150,
        render: (row) => <CommonLabelText text={row.createdByUsername} />,
      },
    ],
    [onClone, onDelete, onEdit, onPublish, onRowDoubleClick, onView],
  );

  return (
    <Box>
      <AppTable<DynamicFormRow, SortField>
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
    </Box>
  );
};
