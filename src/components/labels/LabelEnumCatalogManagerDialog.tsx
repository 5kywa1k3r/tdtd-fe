import React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";

import {
  type LabelEnumCatalogRow,
  type LabelEnumOption,
  useCreateLabelEnumCatalogMutation,
  useDeleteLabelEnumCatalogMutation,
  useGetLabelEnumCatalogQuery,
  useSearchLabelEnumCatalogsMutation,
  useUpdateLabelEnumCatalogMutation,
} from "../../api/labelEnumCatalogApi";
import { getApiErrorMessage } from "../../utils/apiError";

type Props = {
  open: boolean;
  onClose: () => void;
};

type FormState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  options: Array<LabelEnumOption & { key: string }>;
};

const emptyForm = (): FormState => ({
  code: "",
  name: "",
  description: "",
  isActive: true,
  options: [{ key: "seed", code: "lua_chon_1", label: "Lựa chọn 1", order: 0, isActive: true }],
});

function formatScope(row: Pick<LabelEnumCatalogRow, "scopeType" | "scopeUnitCode" | "scopeLevel" | "scopeId">) {
  if (row.scopeType === "GLOBAL") return "Toàn hệ thống";
  if (row.scopeType === "UNIT") return `MU: ${row.scopeUnitCode || row.scopeId || "-"}`;
  return `ML: cấp ${row.scopeLevel ?? "-"} (${row.scopeUnitCode || row.scopeId || "-"})`;
}

function toFormOptions(options?: LabelEnumOption[] | null) {
  const rows = options?.length
    ? options
    : [{ code: "lua_chon_1", label: "Lựa chọn 1", order: 0, isActive: true }];
  return rows.map((option, index) => ({
    key: `${option.code || "option"}_${index}_${Date.now()}`,
    code: option.code ?? "",
    label: option.label ?? "",
    order: Number(option.order ?? index),
    isActive: option.isActive !== false,
  }));
}

function normalizeOptions(options: FormState["options"]): LabelEnumOption[] {
  const seen = new Set<string>();
  const rows: LabelEnumOption[] = [];
  options.forEach((option, index) => {
    const code = option.code.trim().toLowerCase();
    if (!code || seen.has(code)) return;
    seen.add(code);
    rows.push({
      code,
      label: option.label.trim() || code,
      order: Number.isFinite(option.order) ? Number(option.order) : index,
      isActive: option.isActive !== false,
    });
  });
  return rows;
}

export default function LabelEnumCatalogManagerDialog({ open, onClose }: Props) {
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = React.useState(0);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm());
  const [snackbar, setSnackbar] = React.useState("");

  const [search, searchState] = useSearchLabelEnumCatalogsMutation();
  const detailQuery = useGetLabelEnumCatalogQuery({ id: selectedId ?? "" }, { skip: !selectedId });
  const [createCatalog, createState] = useCreateLabelEnumCatalogMutation();
  const [updateCatalog, updateState] = useUpdateLabelEnumCatalogMutation();
  const [deleteCatalog, deleteState] = useDeleteLabelEnumCatalogMutation();
  const busy = createState.isLoading || updateState.isLoading || deleteState.isLoading;
  const rows = searchState.data?.rows ?? [];
  const totalRows = searchState.data?.totalRows ?? 0;
  const pageSize = 10;

  const runSearch = React.useCallback(() => {
    if (!open) return;
    search({
      q: q.trim() || null,
      isActive: active === "ALL" ? null : active === "ACTIVE",
      page,
      pageSize,
      sortField: "updatedAtUtc",
      sortDirection: "desc",
    });
  }, [active, open, page, q, search]);

  React.useEffect(() => {
    runSearch();
  }, [runSearch]);

  React.useEffect(() => {
    const detail = detailQuery.data;
    if (!detail || !formOpen || form.id !== detail.id) return;
    setForm({
      id: detail.id,
      code: detail.code,
      name: detail.name,
      description: detail.description ?? "",
      isActive: detail.isActive,
      options: toFormOptions(detail.options),
    });
  }, [detailQuery.data, form.id, formOpen]);

  const openCreate = () => {
    setSelectedId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (row: LabelEnumCatalogRow) => {
    setSelectedId(row.id);
    setForm({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      isActive: row.isActive,
      options: toFormOptions(null),
    });
    setFormOpen(true);
  };

  const patchOption = (index: number, patch: Partial<LabelEnumOption>) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    }));
  };

  const addOption = () => {
    setForm((current) => ({
      ...current,
      options: [
        ...current.options,
        {
          key: `${Date.now()}_${current.options.length + 1}`,
          code: `lua_chon_${current.options.length + 1}`,
          label: `Lựa chọn ${current.options.length + 1}`,
          order: current.options.length,
          isActive: true,
        },
      ],
    }));
  };

  const removeOption = (index: number) => {
    setForm((current) => ({
      ...current,
      options: current.options.filter((_option, optionIndex) => optionIndex !== index),
    }));
  };

  const save = async () => {
    const options = normalizeOptions(form.options);
    if (!form.name.trim() || options.filter((option) => option.isActive !== false).length === 0) return;
    try {
      if (form.id) {
        await updateCatalog({
          id: form.id,
          body: {
            name: form.name.trim(),
            description: form.description.trim() || null,
            options,
            isActive: form.isActive,
          },
        }).unwrap();
      } else {
        await createCatalog({
          code: form.code.trim() || null,
          name: form.name.trim(),
          description: form.description.trim() || null,
          options,
          isActive: form.isActive,
        }).unwrap();
      }
      setFormOpen(false);
      setSnackbar("Đã lưu danh mục enum.");
      runSearch();
    } catch (error) {
      setSnackbar(getApiErrorMessage(error));
    }
  };

  const removeCatalog = async (row: LabelEnumCatalogRow) => {
    const ok = window.confirm(`Xóa danh mục enum "${row.name}"?`);
    if (!ok) return;
    try {
      await deleteCatalog({ id: row.id }).unwrap();
      setSnackbar("Đã xóa danh mục enum.");
      runSearch();
    } catch (error) {
      setSnackbar(getApiErrorMessage(error));
    }
  };

  return (
    <>
      <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="lg">
        <DialogTitle>Quản lý danh mục enum riêng</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info" variant="outlined">
              Danh mục enum riêng dùng lại cho Dynamic Form và Dynamic Excel. Hệ thống lưu mã lựa chọn để thống kê, tên hiển thị chỉ dùng cho giao diện nhập liệu.
            </Alert>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
              <TextField
                size="small"
                label="Tìm theo mã hoặc tên"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setPage(0);
                    runSearch();
                  }
                }}
                sx={{ minWidth: 260, flex: 1 }}
              />
              <TextField
                select
                size="small"
                label="Trạng thái"
                value={active}
                onChange={(event) => {
                  setActive(event.target.value as typeof active);
                  setPage(0);
                }}
                sx={{ width: 160 }}
              >
                <MenuItem value="ALL">Tất cả</MenuItem>
                <MenuItem value="ACTIVE">Đang dùng</MenuItem>
                <MenuItem value="INACTIVE">Tạm dừng</MenuItem>
              </TextField>
              <Button variant="contained" startIcon={<SearchIcon />} onClick={runSearch}>
                Tìm
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                Tạo danh mục
              </Button>
            </Stack>

            <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1, maxHeight: 520 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 110, fontWeight: 800 }}>Thao tác</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Danh mục</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Phạm vi</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Lựa chọn</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Trạng thái</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Người tạo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Tooltip title="Sửa danh mục enum">
                          <span>
                            <IconButton size="small" disabled={!row.canManage} onClick={() => openEdit(row)}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Xóa danh mục enum">
                          <span>
                            <IconButton size="small" color="error" disabled={!row.canManage} onClick={() => removeCatalog(row)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{row.code}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{formatScope(row)}</TableCell>
                      <TableCell>{row.activeOptionCount}/{row.totalOptionCount}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={row.isActive ? "success" : "default"}
                          variant={row.isActive ? "filled" : "outlined"}
                          label={row.isActive ? "Đang dùng" : "Tạm dừng"}
                        />
                      </TableCell>
                      <TableCell>{row.createdByUsername}</TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                          Chưa có danh mục enum phù hợp.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Tổng số: {totalRows}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" disabled={page <= 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                  Trang trước
                </Button>
                <Button size="small" disabled={(page + 1) * pageSize >= totalRows} onClick={() => setPage((current) => current + 1)}>
                  Trang sau
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={formOpen} onClose={() => !busy && setFormOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{form.id ? "Sửa danh mục enum" : "Tạo danh mục enum"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {detailQuery.isFetching && form.id && <Alert severity="info">Đang tải chi tiết danh mục enum...</Alert>}
            <TextField
              size="small"
              label="Mã danh mục"
              value={form.code}
              disabled={busy || Boolean(form.id)}
              helperText="Để trống khi tạo mới để hệ thống tự sinh mã từ tên danh mục."
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
            />
            <TextField
              size="small"
              label="Tên danh mục"
              value={form.name}
              disabled={busy}
              required
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <TextField
              size="small"
              label="Mô tả"
              value={form.description}
              disabled={busy}
              multiline
              minRows={2}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isActive}
                  disabled={busy}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
              }
              label="Cho phép sử dụng"
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>Lựa chọn trong enum</Typography>
                <Typography variant="caption" color="text.secondary">
                  Mã lựa chọn được lưu vào báo cáo; không đổi mã nếu lựa chọn đã phát sinh dữ liệu.
                </Typography>
              </Box>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addOption} disabled={busy}>
                Thêm lựa chọn
              </Button>
            </Stack>

            <Stack spacing={1} sx={{ maxHeight: 420, overflow: "auto", pr: 0.5 }}>
              {form.options.map((option, index) => (
                <Stack
                  key={option.key}
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  alignItems={{ md: "center" }}
                >
                  <TextField
                    size="small"
                    label="Mã lựa chọn"
                    value={option.code}
                    disabled={busy}
                    onChange={(event) => patchOption(index, { code: event.target.value })}
                    sx={{ width: { md: 180 } }}
                  />
                  <TextField
                    size="small"
                    label="Tên hiển thị"
                    value={option.label}
                    disabled={busy}
                    onChange={(event) => patchOption(index, { label: event.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    label="Thứ tự"
                    type="number"
                    value={option.order ?? index}
                    disabled={busy}
                    onChange={(event) => patchOption(index, { order: Number(event.target.value) })}
                    sx={{ width: { md: 110 } }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={option.isActive !== false}
                        disabled={busy}
                        onChange={(event) => patchOption(index, { isActive: event.target.checked })}
                      />
                    }
                    label="Đang dùng"
                    sx={{ width: { md: 130 } }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    disabled={busy || form.options.length <= 1}
                    onClick={() => removeOption(index)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={busy}>Hủy</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={busy || !form.name.trim() || normalizeOptions(form.options).filter((option) => option.isActive !== false).length === 0}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3000}
        onClose={() => setSnackbar("")}
        message={snackbar}
      />
    </>
  );
}
