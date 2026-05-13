import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";

import { AppTable, type AppTableColumn, type SortDirection } from "../../components/common/AppTable";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { listToolbarButtonSx } from "../../components/common/ListPageToolbar";
import { useGetMeQuery } from "../../api/base/meApi";
import {
  type CreateLabelReq,
  type LabelRow,
  type LabelScopeType,
  type LabelSearchReq,
  useCreateLabelMutation,
  useDeleteLabelMutation,
  useSearchLabelsMutation,
  useUpdateLabelMutation,
} from "../../api/labelApi";
import { UITextKey, uiText } from '../../constants/uiText';

type LabelFormState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  color: string;
  groupCode: string;
  dataType: LabelRow["dataType"];
  scopeType: LabelScopeType;
  scopeId: string;
  isActive: boolean;
};

const defaultFormState = (): LabelFormState => ({
  code: "",
  name: "",
  description: "",
  color: "#2563EB",
  groupCode: "",
  dataType: "NUMBER",
  scopeType: "GLOBAL",
  scopeId: "",
  isActive: true,
});

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN");
}

function scopeLabel(row: Pick<LabelRow, "scopeType" | "scopeId">) {
  if (row.scopeType === "GLOBAL") return "Toàn hệ thống";
  if (row.scopeType === "LEVEL") return `Level ${row.scopeId ?? ""}`;
  return `Đơn vị ${row.scopeId ?? ""}`;
}

const LABEL_DATA_TYPE_OPTIONS: Array<{ value: LabelRow["dataType"]; label: string }> = [
  { value: "NUMBER", label: "Số" },
  { value: "SHORT_TEXT", label: "Văn bản ngắn" },
  { value: "LONG_TEXT", label: "Văn bản dài" },
  { value: "DATE", label: "Ngày" },
  { value: "BOOLEAN", label: "Có/không" },
];

function dataTypeLabel(value?: string | null) {
  return LABEL_DATA_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? "Số";
}

function canManageLabels(roles?: string[]) {
  return Boolean(
    roles?.some(
      (role) =>
        role === "SYSTEM_ADMIN" ||
        role === "MANAGER_LEVEL" ||
        role.startsWith("MANAGER_UNIT:"),
    ),
  );
}

export default function LabelListPage() {
  const meQuery = useGetMeQuery();
  const isSystemAdmin = meQuery.data?.roles?.includes("SYSTEM_ADMIN") === true;
  const isManager = canManageLabels(meQuery.data?.roles);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<NonNullable<LabelSearchReq["sortField"]>>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [q, setQ] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [active, setActive] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [applied, setApplied] = useState({
    q: "",
    groupCode: "",
    active: "ALL" as "ALL" | "ACTIVE" | "INACTIVE",
  });

  const [search, searchState] = useSearchLabelsMutation();
  const [createLabel, createState] = useCreateLabelMutation();
  const [updateLabel, updateState] = useUpdateLabelMutation();
  const [deleteLabel, deleteState] = useDeleteLabelMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<LabelFormState>(defaultFormState());
  const [deleteTarget, setDeleteTarget] = useState<LabelRow | null>(null);
  const [snackbar, setSnackbar] = useState("");

  const req = useMemo<LabelSearchReq>(
    () => ({
      q: applied.q.trim() || null,
      groupCode: applied.groupCode.trim() || null,
      isActive:
        applied.active === "ALL" ? null : applied.active === "ACTIVE",
      page,
      pageSize,
      sortField,
      sortDirection,
    }),
    [applied, page, pageSize, sortDirection, sortField],
  );

  useEffect(() => {
    search(req);
  }, [req, search]);

  const rows = searchState.data?.rows ?? [];
  const total = searchState.data?.totalRows ?? 0;
  const busy = createState.isLoading || updateState.isLoading || deleteState.isLoading;

  const columns = useMemo<AppTableColumn<LabelRow>[]>(
    () => [
      {
        field: "name",
        header: "Tên nhãn",
        sortable: true,
        render: (row) => (
          <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                bgcolor: row.color ?? "grey.400",
                border: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {row.code}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        field: "groupCode",
        header: "Nhóm",
        sortable: true,
        render: (row) => row.groupCode || "-",
      },
      {
        field: "dataType",
        header: "Kiểu dữ liệu",
        render: (row) => dataTypeLabel(row.dataType),
      },
      {
        field: "scopeType",
        header: "Phạm vi",
        render: (row) => scopeLabel(row),
      },
      {
        field: "isActive",
        header: "Trạng thái",
        render: (row) => (
          <Chip
            size="small"
            color={row.isActive ? "success" : "default"}
            variant={row.isActive ? "filled" : "outlined"}
            label={row.isActive ? "Active" : "Inactive"}
          />
        ),
      },
      {
        field: "updatedAtUtc",
        header: "Cập nhật",
        sortable: true,
        render: (row) => formatDate(row.updatedAtUtc),
      },
      {
        field: "actions",
        header: "",
        width: 110,
        align: "right",
        render: (row) => (
          <Stack direction="row" justifyContent="flex-end">
            <Tooltip title={uiText(UITextKey.TextSua)}>
              <span>
                <IconButton
                  size="small"
                  disabled={!row.canManage || row.isSystem}
                  onClick={() => openEdit(row)}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={uiText(UITextKey.TextXoa)}>
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={!row.canManage || row.isSystem}
                  onClick={() => setDeleteTarget(row)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [],
  );

  const applySearch = () => {
    setApplied({ q, groupCode, active });
    setPage(0);
  };

  const resetSearch = () => {
    setQ("");
    setGroupCode("");
    setActive("ALL");
    setApplied({ q: "", groupCode: "", active: "ALL" });
    setPage(0);
  };

  const openCreate = () => {
    setForm(defaultFormState());
    setFormOpen(true);
  };

  const openEdit = (row: LabelRow) => {
    setForm({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      color: row.color ?? "#2563EB",
      groupCode: row.groupCode ?? "",
      dataType: row.dataType ?? "NUMBER",
      scopeType: row.scopeType,
      scopeId: row.scopeId ?? "",
      isActive: row.isActive,
    });
    setFormOpen(true);
  };

  const saveForm = async () => {
    const payload: CreateLabelReq = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      color: form.color.trim() || null,
      groupCode: form.groupCode.trim() || null,
      dataType: form.dataType,
      scopeType: isSystemAdmin ? form.scopeType : null,
      scopeId: isSystemAdmin ? form.scopeId.trim() || null : null,
      isActive: form.isActive,
    };

    try {
      if (form.id) {
        await updateLabel({
          id: form.id,
          body: {
            name: payload.name,
            description: payload.description,
            color: payload.color,
            groupCode: payload.groupCode,
            dataType: payload.dataType,
            isActive: payload.isActive,
          },
        }).unwrap();
      } else {
        await createLabel(payload).unwrap();
      }

      setFormOpen(false);
      setSnackbar("Đã lưu nhãn.");
      search(req);
    } catch (error) {
      console.error(error);
      setSnackbar("Lưu nhãn thất bại.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLabel({ id: deleteTarget.id }).unwrap();
      setDeleteTarget(null);
      setSnackbar("Đã xóa nhãn.");
      search(req);
    } catch (error) {
      console.error(error);
      setSnackbar("Xóa nhãn thất bại.");
    }
  };

  if (!isManager) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">
          Chỉ tài khoản quản lý đơn vị, quản lý level hoặc SYSTEM_ADMIN được quản lý nhãn.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Quản lý nhãn
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nhãn dùng để chuẩn hóa biểu mẫu động, bảng Excel và thống kê cơ cấu/lũy kế.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ display: "none" }}>
            Tạo nhãn
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap={{ xs: "wrap", lg: "nowrap" }} useFlexGap alignItems="center">
          <TextField
            size="small"
            label={uiText(UITextKey.TextTimNhan2)}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applySearch();
            }}
            sx={{ minWidth: 220, flex: "1 1 300px" }}
          />
          <TextField
            size="small"
            label={uiText(UITextKey.TextNhom2)}
            value={groupCode}
            onChange={(event) => setGroupCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applySearch();
            }}
            sx={{ minWidth: 170, flex: "0 1 190px" }}
          />
          <TextField
            select
            size="small"
            label={uiText(UITextKey.TextTrangThai)}
            value={active}
            onChange={(event) => setActive(event.target.value as typeof active)}
            sx={{ minWidth: 150, flex: "0 0 150px" }}
          >
            <MenuItem value="ALL">{uiText(UITextKey.TextTatCa)}</MenuItem>
            <MenuItem value="ACTIVE">{uiText(UITextKey.TextActive)}</MenuItem>
            <MenuItem value="INACTIVE">{uiText(UITextKey.TextInactive)}</MenuItem>
          </TextField>
          <Button variant="contained" startIcon={<SearchIcon />} onClick={applySearch} sx={listToolbarButtonSx}>
            Tìm
          </Button>
          <Button variant="outlined" startIcon={<ClearIcon />} onClick={resetSearch} sx={listToolbarButtonSx}>
            Xóa lọc
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ ...listToolbarButtonSx, ml: { xs: 0, lg: "auto" } }}>
            {uiText(UITextKey.TextTaoNhanMoi)}
          </Button>
        </Stack>

        <AppTable<LabelRow, NonNullable<LabelSearchReq["sortField"]>>
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          sortMode="server"
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={(field, direction) => {
            setSortField(field);
            setSortDirection(direction);
            setPage(0);
          }}
          paginationMode="server"
          page={page}
          pageSize={pageSize}
          totalRows={total}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(0);
          }}
          onRowDoubleClick={openEdit}
        />
      </Stack>

      <Dialog open={formOpen} onClose={() => !busy && setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? "Sửa nhãn" : "Tạo nhãn"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              size="small"
              label={uiText(UITextKey.TextMaNhan2)}
              value={form.code}
              disabled={Boolean(form.id) || busy}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              helperText={uiText(UITextKey.TextChiDungChuThuongSoDauHoac)}
              required
            />
            <TextField
              size="small"
              label={uiText(UITextKey.TextTenNhan2)}
              value={form.name}
              disabled={busy}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label={uiText(UITextKey.TextNhom2)}
                value={form.groupCode}
                disabled={busy}
                onChange={(event) => setForm((prev) => ({ ...prev, groupCode: event.target.value }))}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label={uiText(UITextKey.TextMau2)}
                value={form.color}
                disabled={busy}
                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                sx={{ width: 140 }}
              />
            </Stack>
            <TextField
              select
              size="small"
              label="Kiểu dữ liệu"
              value={form.dataType}
              disabled={busy}
              helperText="Cùng một nhãn chỉ nên dùng cho cùng kiểu dữ liệu để thống kê/gộp không bị mơ hồ."
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dataType: event.target.value as LabelRow["dataType"] }))
              }
            >
              {LABEL_DATA_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            {isSystemAdmin && !form.id && (
              <Stack direction="row" spacing={1}>
                <TextField
                  select
                  size="small"
                  label={uiText(UITextKey.TextPhamVi2)}
                  value={form.scopeType}
                  disabled={busy}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      scopeType: event.target.value as LabelScopeType,
                      scopeId: event.target.value === "GLOBAL" ? "" : prev.scopeId,
                    }))
                  }
                  sx={{ width: 180 }}
                >
                  <MenuItem value="GLOBAL">{uiText(UITextKey.TextToanHeThong)}</MenuItem>
                  <MenuItem value="LEVEL">{uiText(UITextKey.TextLevel)}</MenuItem>
                  <MenuItem value="UNIT">{uiText(UITextKey.TextDonVi)}</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  label={uiText(UITextKey.TextScopeId)}
                  value={form.scopeId}
                  disabled={busy || form.scopeType === "GLOBAL"}
                  onChange={(event) => setForm((prev) => ({ ...prev, scopeId: event.target.value }))}
                  sx={{ flex: 1 }}
                />
              </Stack>
            )}
            <TextField
              size="small"
              label={uiText(UITextKey.TextMoTa2)}
              value={form.description}
              disabled={busy}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              multiline
              minRows={3}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  disabled={busy}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
              }
              label={uiText(UITextKey.TextActive)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={busy}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={saveForm}
            disabled={busy || !form.code.trim() || !form.name.trim()}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={uiText(UITextKey.TextXoaNhan2)}
        message={
          <Typography variant="body2">
            Xóa nhãn <b>{deleteTarget?.code}</b>?
          </Typography>
        }
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={2500}
        onClose={() => setSnackbar("")}
        message={snackbar}
      />
    </Box>
  );
}
