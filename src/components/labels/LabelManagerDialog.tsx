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
import { getApiErrorMessage } from "../../utils/apiError";
import {
  formatLabelDataType,
  isValidLabelColor,
  LABEL_DATA_TYPE_OPTIONS,
  LabelColorPalette,
  LabelColorPreview,
  LabelPreviewChip,
} from "./labelUi";

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

const emptyForm = (): LabelFormState => ({
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

function scopeLabel(row: Pick<LabelRow, "scopeType" | "scopeId">) {
  if (row.scopeType === "GLOBAL") return "Toàn hệ thống";
  if (row.scopeType === "LEVEL") return `Level ${row.scopeId ?? ""}`;
  return `Đơn vị ${row.scopeId ?? ""}`;
}

export default function LabelManagerDialog({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const meQuery = useGetMeQuery(undefined, { skip: !open });
  const roles = meQuery.data?.roles ?? [];
  const isManager = canManageLabels(roles);
  const isSystemAdmin = roles.includes("SYSTEM_ADMIN");

  const [q, setQ] = useState("");
  const [active, setActive] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
  const [applied, setApplied] = useState({ q: "", active: "ACTIVE" as typeof active });
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const [form, setForm] = useState<LabelFormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);

  const [search, searchState] = useSearchLabelsMutation();
  const [createLabel, createState] = useCreateLabelMutation();
  const [updateLabel, updateState] = useUpdateLabelMutation();
  const [deleteLabel, deleteState] = useDeleteLabelMutation();

  const req = useMemo<LabelSearchReq>(
    () => ({
      q: applied.q.trim() || null,
      isActive: applied.active === "ALL" ? null : applied.active === "ACTIVE",
      page,
      pageSize,
      sortField: "name",
      sortDirection: "asc",
    }),
    [applied, page],
  );

  useEffect(() => {
    if (!open || !isManager) return;
    search(req);
  }, [isManager, open, req, search]);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm());
      setError(null);
    }
  }, [open]);

  const rows = searchState.data?.rows ?? [];
  const total = searchState.data?.totalRows ?? 0;
  const busy = createState.isLoading || updateState.isLoading || deleteState.isLoading;
  const canSave =
    form.code.trim().length > 0 &&
    form.name.trim().length > 0 &&
    isValidLabelColor(form.color) &&
    (!isSystemAdmin || form.scopeType === "GLOBAL" || form.scopeId.trim().length > 0);

  const applySearch = () => {
    setApplied({ q, active });
    setPage(0);
  };

  const clearSearch = () => {
    setQ("");
    setActive("ACTIVE");
    setApplied({ q: "", active: "ACTIVE" });
    setPage(0);
  };

  const startCreate = () => {
    setForm(emptyForm());
    setError(null);
  };

  const startEdit = (row: LabelRow) => {
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
    setError(null);
  };

  const saveForm = async () => {
    if (!canSave || busy) return;

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
      setError(null);
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

      setForm(emptyForm());
      onChanged?.();
      search(req);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const removeLabel = async (row: LabelRow) => {
    if (!window.confirm(`Xóa nhãn ${row.code}?`)) return;

    try {
      setError(null);
      await deleteLabel({ id: row.id }).unwrap();
      if (form.id === row.id) setForm(emptyForm());
      onChanged?.();
      search(req);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{uiText(UITextKey.TextQuanLyNhanDynamicForm)}</DialogTitle>
      <DialogContent dividers>
        {!isManager ? (
          <Alert severity="warning">
            Chỉ SYSTEM_ADMIN, MANAGER_LEVEL hoặc MANAGER_UNIT mới được quản lý nhãn.
          </Alert>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.25fr) minmax(280px, 0.75fr)" },
              gap: 2,
            }}
          >
            <Stack spacing={1.25} minWidth={0}>
              {error && <Alert severity="error">{error}</Alert>}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <TextField
                  size="small"
                  label={uiText(UITextKey.TextTimNhan)}
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applySearch();
                  }}
                  sx={{ flex: "1 1 220px" }}
                />
                <TextField
                  select
                  size="small"
                  label={uiText(UITextKey.TextTrangThai2)}
                  value={active}
                  onChange={(event) => setActive(event.target.value as typeof active)}
                  sx={{ width: 150 }}
                >
                  <MenuItem value="ALL">{uiText(UITextKey.TextTatCa3)}</MenuItem>
                  <MenuItem value="ACTIVE">{uiText(UITextKey.TextActive)}</MenuItem>
                  <MenuItem value="INACTIVE">{uiText(UITextKey.TextInactive)}</MenuItem>
                </TextField>
                <Button size="small" variant="contained" startIcon={<SearchIcon />} onClick={applySearch}>
                  Tìm
                </Button>
                <Button size="small" variant="outlined" startIcon={<ClearIcon />} onClick={clearSearch}>
                  Reset
                </Button>
              </Stack>

              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, maxHeight: 440, overflow: "auto" }}>
                {searchState.isLoading && rows.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    Đang tải nhãn...
                  </Typography>
                ) : rows.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    Không có nhãn phù hợp.
                  </Typography>
                ) : (
                  rows.map((row) => (
                    <Stack
                      key={row.id}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ px: 1.25, py: 1, borderBottom: "1px solid", borderColor: "divider" }}
                    >
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
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" minWidth={0}>
                          <LabelPreviewChip name={row.name} code={row.code} color={row.color} />
                          {!row.isActive && <Chip size="small" label={uiText(UITextKey.TextInactive)} variant="outlined" />}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {row.code} | {formatLabelDataType(row.dataType)} | {row.groupCode || "-"} | {scopeLabel(row)}
                        </Typography>
                      </Box>
                      <Tooltip title={uiText(UITextKey.TextSuaNhan)}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={!row.canManage || row.isSystem || busy}
                            onClick={() => startEdit(row)}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={uiText(UITextKey.TextXoaNhan)}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!row.canManage || row.isSystem || busy}
                            onClick={() => void removeLabel(row)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  ))
                )}
              </Box>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  {total} nhãn
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" disabled={page === 0} onClick={() => setPage((x) => Math.max(0, x - 1))}>
                    Truoc
                  </Button>
                  <Button size="small" variant="outlined" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((x) => x + 1)}>
                    Sau
                  </Button>
                </Stack>
              </Stack>
            </Stack>

            <Stack spacing={1.25}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={800}>{form.id ? "Sửa nhãn" : "Tạo nhãn"}</Typography>
                <Tooltip title={uiText(UITextKey.TextTaoNhanMoi)}>
                  <IconButton size="small" onClick={startCreate} disabled={busy}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <TextField
                size="small"
                label={uiText(UITextKey.TextMaNhan)}
                value={form.code}
                disabled={Boolean(form.id) || busy}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                required
              />
              <TextField
                size="small"
                label={uiText(UITextKey.TextTenNhan)}
                value={form.name}
                disabled={busy}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label={uiText(UITextKey.TextNhom)}
                  value={form.groupCode}
                  disabled={busy}
                  onChange={(event) => setForm((prev) => ({ ...prev, groupCode: event.target.value }))}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label={uiText(UITextKey.TextMau)}
                  value={form.color}
                  disabled={busy}
                  onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                  sx={{ width: 130 }}
                  error={!isValidLabelColor(form.color)}
                  helperText={!isValidLabelColor(form.color) ? uiText(UITextKey.TextMauNhanKhongHopLe) : " "}
                />
              </Stack>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  {uiText(UITextKey.TextMauGoiY)}
                </Typography>
                <LabelColorPalette
                  value={form.color}
                  disabled={busy}
                  onChange={(color) => setForm((prev) => ({ ...prev, color }))}
                />
                <Typography variant="caption" color="text.secondary">
                  {uiText(UITextKey.TextXemTruocMauNhan)}
                </Typography>
                <LabelColorPreview
                  code={form.code}
                  name={form.name}
                  color={form.color}
                  groupCode={form.groupCode}
                  dataType={form.dataType}
                  showDataType
                />
              </Stack>
              <TextField
                select
                size="small"
                label={uiText(UITextKey.TextKieuDuLieuMacDinhThongKe)}
                value={form.dataType}
                disabled={busy}
                helperText={uiText(UITextKey.TextChiApDungKhiGanNhanThongKe)}
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
                    label={uiText(UITextKey.TextPhamVi)}
                    value={form.scopeType}
                    disabled={busy}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        scopeType: event.target.value as LabelScopeType,
                        scopeId: event.target.value === "GLOBAL" ? "" : prev.scopeId,
                      }))
                    }
                    sx={{ width: 150 }}
                  >
                    <MenuItem value="GLOBAL">{uiText(UITextKey.TextGlobal)}</MenuItem>
                    <MenuItem value="LEVEL">{uiText(UITextKey.TextLevel)}</MenuItem>
                    <MenuItem value="UNIT">{uiText(UITextKey.TextUnit)}</MenuItem>
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
                label={uiText(UITextKey.TextMoTa)}
                value={form.description}
                disabled={busy}
                multiline
                minRows={3}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    disabled={busy}
                    onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                }
                label={uiText(UITextKey.TextActive)}
              />
              <Button variant="contained" onClick={saveForm} disabled={busy || !canSave}>
                Lưu nhãn
              </Button>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Dong
        </Button>
      </DialogActions>
    </Dialog>
  );
}
