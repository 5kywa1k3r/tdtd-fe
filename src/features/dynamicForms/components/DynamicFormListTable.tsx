import React, { useMemo, useState } from "react";
import {
  Box,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TablePagination,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PublishIcon from "@mui/icons-material/Publish";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

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
  onPreview?: (row: DynamicFormRow) => void;
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

function lineageShortLabel(value: string) {
  if (value === "ROOT") return "Gốc";
  if (value === "VERSION") return "Kế tiếp";
  if (value === "CLONE") return "Bản sao mới";
  if (value === "WRAPPED") return "Từ bảng động";
  if (value === "LEGACY") return "Dữ liệu cũ";
  return value || "—";
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
  onPreview,
  onView,
  onEdit,
  onPublish,
  onClone,
  onDelete,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [actionMenu, setActionMenu] = useState<{
    anchorEl: HTMLElement;
    row: DynamicFormRow;
  } | null>(null);

  const closeActionMenu = () => setActionMenu(null);
  const runMenuAction = (action?: (row: DynamicFormRow) => void) => {
    if (actionMenu) action?.(actionMenu.row);
    closeActionMenu();
  };

  const columns: AppTableColumn<DynamicFormRow>[] = useMemo(
    () => [
      {
        field: "actions",
        header: "",
        width: 136,
        align: "center",
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={0.25} justifyContent="center">
            <Tooltip title="Nhập thử">
              <span>
                <IconButton
                  aria-label={`Nhập thử biểu mẫu ${row.code}`}
                  size="small"
                  disabled={!row.actions.canRead}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview?.(row);
                  }}
                >
                  <PlayCircleOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={uiText(UITextKey.TextXem)}>
              <span>
                <IconButton
                  aria-label={`Xem biểu mẫu ${row.code}`}
                  size="small"
                  disabled={!row.actions.canRead}
                  onClick={(e) => {
                    e.stopPropagation();
                    onView?.(row);
                    if (!onView) onRowDoubleClick?.(row);
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={uiText(UITextKey.TextSua2)}>
              <span>
                <IconButton
                  aria-label={`Sửa biểu mẫu ${row.code}`}
                  size="small"
                  disabled={!row.actions.canUpdate}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(row);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Thao tác khác">
              <span>
                <IconButton
                  aria-label={`Thao tác khác biểu mẫu ${row.code}`}
                  size="small"
                  disabled={
                    !row.actions.canPublish &&
                    !row.actions.canClone &&
                    !row.actions.canDelete
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenu({ anchorEl: e.currentTarget, row });
                  }}
                >
                  <MoreVertIcon fontSize="small" />
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
                aria-label={`Sao chép mã biểu mẫu ${row.code}`}
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
        width: 160,
        render: (row) => (
          <Tooltip
            title={
              row.publishedSchemaHash
                ? `Họ ${row.familyId} · Hash ${row.publishedSchemaHash}`
                : `Họ ${row.familyId}`
            }
          >
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip size="small" color="primary" variant="outlined" label={`v${row.versionNo}`} />
              <Typography variant="caption" color="text.secondary">
                {lineageShortLabel(row.lineageStatus)}
              </Typography>
            </Stack>
          </Tooltip>
        ),
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
    [onEdit, onPreview, onRowDoubleClick, onView],
  );

  return (
    <Box>
      {isMobile ? (
        <Stack spacing={1} data-testid="dynamic-form-mobile-list">
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" fullWidth>
              <InputLabel id="dynamic-form-mobile-sort-label">Sắp xếp</InputLabel>
              <Select
                labelId="dynamic-form-mobile-sort-label"
                label="Sắp xếp"
                value={sortField}
                onChange={(event) =>
                  onSortChange(event.target.value as SortField, sortDirection)
                }
              >
                <MenuItem value="createdAtUtc">Ngày tạo</MenuItem>
                <MenuItem value="code">Mã biểu mẫu</MenuItem>
                <MenuItem value="name">Tên biểu mẫu</MenuItem>
                <MenuItem value="versionNo">Phiên bản</MenuItem>
                <MenuItem value="createdByUsername">Người tạo</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title={sortDirection === "asc" ? "Tăng dần" : "Giảm dần"}>
              <IconButton
                aria-label={sortDirection === "asc" ? "Đổi sang giảm dần" : "Đổi sang tăng dần"}
                onClick={() =>
                  onSortChange(sortField, sortDirection === "asc" ? "desc" : "asc")
                }
                sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}
              >
                {sortDirection === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
              </IconButton>
            </Tooltip>
          </Stack>

          {rows.map((row) => (
            <Paper
              key={row.id}
              component="article"
              variant="outlined"
              aria-label={`Biểu mẫu ${row.code}`}
              data-testid={`dynamic-form-mobile-card-${row.id}`}
              sx={{ p: 1.25, borderRadius: 1.5, minWidth: 0 }}
            >
              <Stack spacing={1} minWidth={0}>
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  justifyContent="space-between"
                  minWidth={0}
                >
                  <Tooltip title={row.code}>
                    <Chip
                      label={row.code}
                      size="small"
                      variant="outlined"
                      sx={{
                        minWidth: 0,
                        maxWidth: "calc(100% - 42px)",
                        "& .MuiChip-label": {
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        },
                      }}
                    />
                  </Tooltip>
                  <Tooltip title={uiText(UITextKey.TextCopy)}>
                    <IconButton
                      aria-label={`Sao chép mã biểu mẫu ${row.code}`}
                      size="small"
                      onClick={() => copyText(row.code)}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Typography fontWeight={800} sx={{ overflowWrap: "anywhere" }}>
                  {row.name}
                </Typography>

                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    color={row.isPublished ? "success" : "default"}
                    variant={row.isPublished ? "filled" : "outlined"}
                    label={row.isPublished ? "Đã công bố" : "Bản nháp"}
                  />
                  <Tooltip
                    title={
                      row.publishedSchemaHash
                        ? `Họ ${row.familyId} · Hash ${row.publishedSchemaHash}`
                        : `Họ ${row.familyId}`
                    }
                  >
                    <Chip size="small" color="primary" variant="outlined" label={`v${row.versionNo}`} />
                  </Tooltip>
                  <Chip size="small" variant="outlined" label={lineageShortLabel(row.lineageStatus)} />
                  {!row.isActive && (
                    <Chip
                      size="small"
                      label={uiText(UITextKey.TextInactive)}
                      color="warning"
                      variant="outlined"
                    />
                  )}
                  {row.canViewByCloneGrant && (
                    <Chip
                      size="small"
                      label="Được cấp quyền sao chép"
                      color="info"
                      variant="outlined"
                    />
                  )}
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="space-between"
                  alignItems="flex-end"
                  minWidth={0}
                >
                  <Stack minWidth={0}>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {row.createdByUsername}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <CommonDateText value={row.createdAtUtc} />
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={0.25} flexShrink={0}>
                    <Tooltip title="Nhập thử">
                      <span>
                        <IconButton
                          aria-label={`Nhập thử biểu mẫu ${row.code}`}
                          size="small"
                          disabled={!row.actions.canRead}
                          onClick={() => onPreview?.(row)}
                        >
                          <PlayCircleOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={uiText(UITextKey.TextXem)}>
                      <span>
                        <IconButton
                          aria-label={`Xem biểu mẫu ${row.code}`}
                          size="small"
                          disabled={!row.actions.canRead}
                          onClick={() => {
                            onView?.(row);
                            if (!onView) onRowDoubleClick?.(row);
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={uiText(UITextKey.TextSua2)}>
                      <span>
                        <IconButton
                          aria-label={`Sửa biểu mẫu ${row.code}`}
                          size="small"
                          disabled={!row.actions.canUpdate}
                          onClick={() => onEdit?.(row)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Thao tác khác">
                      <span>
                        <IconButton
                          aria-label={`Thao tác khác biểu mẫu ${row.code}`}
                          size="small"
                          disabled={
                            !row.actions.canPublish &&
                            !row.actions.canClone &&
                            !row.actions.canDelete
                          }
                          onClick={(event) =>
                            setActionMenu({ anchorEl: event.currentTarget, row })
                          }
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          ))}

          <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={pageSize}
              rowsPerPageOptions={[5, 10, 25, 50]}
              onPageChange={(_, nextPage) => onPageChange(nextPage)}
              onRowsPerPageChange={(event) => onPageSizeChange(Number(event.target.value))}
              labelRowsPerPage="Số dòng"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
              slotProps={{
                select: {
                  inputProps: { "aria-label": "Số dòng mỗi trang" },
                },
                actions: {
                  previousButton: { "aria-label": "Trang trước" },
                  nextButton: { "aria-label": "Trang sau" },
                },
              }}
              sx={{
                "& .MuiTablePagination-toolbar": {
                  minHeight: 52,
                  px: 1,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                },
                "& .MuiTablePagination-spacer": { display: "none" },
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                  my: 0,
                },
              }}
            />
          </Paper>
        </Stack>
      ) : (
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
          onRowDoubleClick={(row) => {
            if (row.actions.canRead) onRowDoubleClick?.(row);
          }}
        />
      )}
      <Menu
        anchorEl={actionMenu?.anchorEl}
        open={Boolean(actionMenu)}
        onClose={closeActionMenu}
        MenuListProps={{
          "aria-label": actionMenu
            ? `Thao tác khác biểu mẫu ${actionMenu.row.code}`
            : "Thao tác khác biểu mẫu",
        }}
      >
        <MenuItem
          aria-label={actionMenu ? `Công bố biểu mẫu ${actionMenu.row.code}` : "Công bố biểu mẫu"}
          disabled={!actionMenu?.row.actions.canPublish}
          onClick={() => runMenuAction(onPublish)}
        >
          <ListItemIcon>
            <PublishIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{uiText(UITextKey.TextPublish)}</ListItemText>
        </MenuItem>
        <MenuItem
          aria-label={
            actionMenu
              ? `Sao chép thành biểu mẫu mới ${actionMenu.row.code}`
              : "Sao chép thành biểu mẫu mới"
          }
          disabled={!actionMenu?.row.actions.canClone}
          onClick={() => runMenuAction(onClone)}
        >
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sao chép thành biểu mẫu mới</ListItemText>
        </MenuItem>
        <MenuItem
          aria-label={actionMenu ? `Xóa biểu mẫu ${actionMenu.row.code}` : "Xóa biểu mẫu"}
          disabled={!actionMenu?.row.actions.canDelete}
          onClick={() => runMenuAction(onDelete)}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{uiText(UITextKey.TextXoa2)}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};
