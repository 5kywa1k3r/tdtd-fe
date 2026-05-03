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

type LabelFormState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  color: string;
  groupCode: string;
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
            <Tooltip title="Sửa">
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
            <Tooltip title="Xóa">
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
              Nhãn dùng để chuẩn hóa Dynamic Form, table block và thống kê cơ cấu/lũy kế.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Tạo nhãn
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <TextField
            size="small"
            label="Tìm nhãn"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applySearch();
            }}
            sx={{ minWidth: 220, flex: "1 1 260px" }}
          />
          <TextField
            size="small"
            label="Nhóm"
            value={groupCode}
            onChange={(event) => setGroupCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applySearch();
            }}
            sx={{ minWidth: 180 }}
          />
          <TextField
            select
            size="small"
            label="Trạng thái"
            value={active}
            onChange={(event) => setActive(event.target.value as typeof active)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="ALL">Tất cả</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem>
          </TextField>
          <Button variant="contained" startIcon={<SearchIcon />} onClick={applySearch}>
            Tìm
          </Button>
          <Button variant="outlined" startIcon={<ClearIcon />} onClick={resetSearch}>
            Reset
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
              label="Mã nhãn"
              value={form.code}
              disabled={Boolean(form.id) || busy}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              helperText="Chỉ dùng chữ thường, số, dấu -, _ hoặc ."
              required
            />
            <TextField
              size="small"
              label="Tên nhãn"
              value={form.name}
              disabled={busy}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="Nhóm"
                value={form.groupCode}
                disabled={busy}
                onChange={(event) => setForm((prev) => ({ ...prev, groupCode: event.target.value }))}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Màu"
                value={form.color}
                disabled={busy}
                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                sx={{ width: 140 }}
              />
            </Stack>
            {isSystemAdmin && !form.id && (
              <Stack direction="row" spacing={1}>
                <TextField
                  select
                  size="small"
                  label="Phạm vi"
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
                  <MenuItem value="GLOBAL">Toàn hệ thống</MenuItem>
                  <MenuItem value="LEVEL">Level</MenuItem>
                  <MenuItem value="UNIT">Đơn vị</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  label="ScopeId"
                  value={form.scopeId}
                  disabled={busy || form.scopeType === "GLOBAL"}
                  onChange={(event) => setForm((prev) => ({ ...prev, scopeId: event.target.value }))}
                  sx={{ flex: 1 }}
                />
              </Stack>
            )}
            <TextField
              size="small"
              label="Mô tả"
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
              label="Active"
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
        title="Xóa nhãn"
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
