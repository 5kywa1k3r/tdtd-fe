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
  type LabelUsage,
  type LabelValueOption,
  type LabelValueSourceType,
  useCreateLabelMutation,
  useDeleteLabelMutation,
  useSearchLabelsMutation,
  useUpdateLabelMutation,
} from "../../api/labelApi";
import { UITextKey, uiText } from '../../constants/uiText';
import { getApiErrorMessage } from "../../utils/apiError";
import {
  formatLabelDataType,
  formatLabelUsage,
  formatLabelValueSourceType,
  isValidLabelColor,
  LABEL_DATA_TYPE_OPTIONS,
  LABEL_USAGE_OPTIONS,
  LabelColorPalette,
  LabelColorPreview,
  LabelPreviewChip,
  LabelValueSourceEditor,
  labelValueSourceApplies,
  labelUsageUsesDataType,
  normalizeLabelValueOptions,
} from "../../components/labels/labelUi";
import LabelEnumCatalogManagerDialog from "../../components/labels/LabelEnumCatalogManagerDialog";

type LabelFormState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  color: string;
  groupCode: string;
  usage: LabelUsage;
  dataType: LabelRow["dataType"];
  valueSourceType: LabelValueSourceType;
  valueOptions: LabelValueOption[];
  valueSourceCatalogId: string;
  valueSourceCatalogCode: string;
  valueSourceCatalogName: string;
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
  usage: "CLASSIFICATION",
  dataType: "NUMBER",
  valueSourceType: "NONE",
  valueOptions: [],
  valueSourceCatalogId: "",
  valueSourceCatalogCode: "",
  valueSourceCatalogName: "",
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
  const [enumCatalogOpen, setEnumCatalogOpen] = useState(false);
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
        field: "actions",
        header: "Thao tác",
        width: 120,
        align: "left",
        render: (row) => (
          <Stack direction="row" spacing={0.25} justifyContent="flex-start">
            <Tooltip title={uiText(UITextKey.TextTaoNhanMoi)}>
              <span>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    openCreate();
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={uiText(UITextKey.TextSua)}>
              <span>
                <IconButton
                  size="small"
                  disabled={!row.canManage || row.isSystem}
                  onClick={(event) => {
                    event.stopPropagation();
                    openEdit(row);
                  }}
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
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteTarget(row);
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
        field: "name",
        header: "Tên nhãn",
        sortable: true,
        width: "34%",
        render: (row) => (
          <Stack direction="row" alignItems="center" sx={{ minWidth: 0, maxWidth: "100%" }}>
            <LabelPreviewChip name={row.name} code={row.code} color={row.color} />
          </Stack>
        ),
      },
      {
        field: "usage",
        header: "Mục đích",
        sortable: true,
        width: 150,
        render: (row) => formatLabelUsage(row.usage),
      },
      {
        field: "groupCode",
        header: "Nhóm",
        sortable: true,
        render: (row) => row.groupCode || "-",
      },
      {
        field: "dataType",
        header: "Kiểu thống kê",
        render: (row) => labelUsageUsesDataType(row.usage) ? formatLabelDataType(row.dataType) : "Không áp dụng",
      },
      {
        field: "valueSourceType",
        header: "Nguồn giá trị",
        render: (row) =>
          labelUsageUsesDataType(row.usage) && labelValueSourceApplies(row.dataType)
            ? formatLabelValueSourceType(row.valueSourceType)
            : "Không áp dụng",
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
            label={row.isActive ? "Hoạt động" : "Ngừng hoạt động"}
          />
        ),
      },
      {
        field: "updatedAtUtc",
        header: "Cập nhật",
        sortable: true,
        render: (row) => formatDate(row.updatedAtUtc),
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
      usage: row.usage ?? "CLASSIFICATION",
      dataType: row.dataType ?? "NUMBER",
      valueSourceType: row.valueSourceType ?? "NONE",
      valueOptions: normalizeLabelValueOptions(row.valueOptions),
      valueSourceCatalogId: row.valueSourceCatalogId ?? "",
      valueSourceCatalogCode: row.valueSourceCatalogCode ?? "",
      valueSourceCatalogName: row.valueSourceCatalogName ?? "",
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
      usage: form.usage,
      dataType: form.dataType,
      valueSourceType:
        labelUsageUsesDataType(form.usage) && labelValueSourceApplies(form.dataType)
          ? form.valueSourceType
          : "NONE",
      valueOptions:
        form.valueSourceType === "FIXED_ENUM" && labelValueSourceApplies(form.dataType)
          ? normalizeLabelValueOptions(form.valueOptions)
          : [],
      valueSourceCatalogId:
        form.valueSourceType === "ENUM_CATALOG" && labelValueSourceApplies(form.dataType)
          ? form.valueSourceCatalogId.trim() || null
          : null,
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
            usage: payload.usage,
            dataType: payload.dataType,
            valueSourceType: payload.valueSourceType,
            valueOptions: payload.valueOptions,
            valueSourceCatalogId: payload.valueSourceCatalogId,
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
      setSnackbar(getApiErrorMessage(error));
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
      setSnackbar(getApiErrorMessage(error));
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
              {uiText(UITextKey.TextQuanLyNhanDynamicForm)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {uiText(UITextKey.TextMoTaQuanLyMaLabel)}
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
          <Button variant="outlined" onClick={() => setEnumCatalogOpen(true)} sx={listToolbarButtonSx}>
            Danh mục lựa chọn riêng
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
          onRowClick={openEdit}
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
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              size="small"
              label={uiText(UITextKey.TextTenNhan2)}
              value={form.name}
              disabled={busy}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              InputLabelProps={{ shrink: true }}
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
                error={!isValidLabelColor(form.color)}
                helperText={!isValidLabelColor(form.color) ? uiText(UITextKey.TextMauNhanKhongHopLe) : " "}
              />
            </Stack>
            <TextField
              select
              size="small"
              label="Mục đích sử dụng"
              value={form.usage}
              disabled={busy}
              helperText={labelUsageUsesDataType(form.usage) ? "Kiểu dữ liệu bắt buộc và phải khớp với nơi gắn nhãn." : "Nhãn này chỉ dùng để phân loại, không tham gia thống kê."}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  usage: event.target.value as LabelUsage,
                  valueSourceType: labelUsageUsesDataType(event.target.value) ? prev.valueSourceType : "NONE",
                  valueOptions: labelUsageUsesDataType(event.target.value) ? prev.valueOptions : [],
                  valueSourceCatalogId: labelUsageUsesDataType(event.target.value) ? prev.valueSourceCatalogId : "",
                  valueSourceCatalogCode: labelUsageUsesDataType(event.target.value) ? prev.valueSourceCatalogCode : "",
                  valueSourceCatalogName: labelUsageUsesDataType(event.target.value) ? prev.valueSourceCatalogName : "",
                }))
              }
              InputLabelProps={{ shrink: true }}
            >
              {LABEL_USAGE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
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
                usage={form.usage}
                dataType={form.dataType}
                showDataType
              />
            </Stack>
            {labelUsageUsesDataType(form.usage) && (
              <TextField
                select
                size="small"
                label="Kiểu dữ liệu"
                value={form.dataType}
                disabled={busy}
                helperText={uiText(UITextKey.TextChiApDungKhiGanNhanThongKe)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    dataType: event.target.value as LabelRow["dataType"],
                    valueSourceType: labelValueSourceApplies(event.target.value) ? prev.valueSourceType : "NONE",
                    valueOptions: labelValueSourceApplies(event.target.value) ? prev.valueOptions : [],
                    valueSourceCatalogId: labelValueSourceApplies(event.target.value) ? prev.valueSourceCatalogId : "",
                    valueSourceCatalogCode: labelValueSourceApplies(event.target.value) ? prev.valueSourceCatalogCode : "",
                    valueSourceCatalogName: labelValueSourceApplies(event.target.value) ? prev.valueSourceCatalogName : "",
                  }))
                }
                InputLabelProps={{ shrink: true }}
              >
                {LABEL_DATA_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {labelUsageUsesDataType(form.usage) && (
              <LabelValueSourceEditor
                dataType={form.dataType}
                valueSourceType={form.valueSourceType}
                valueOptions={form.valueOptions}
                valueSourceCatalogId={form.valueSourceCatalogId}
                valueSourceCatalogName={form.valueSourceCatalogName}
                disabled={busy}
                onSourceTypeChange={(valueSourceType) =>
                  setForm((prev) => ({
                    ...prev,
                    valueSourceType,
                    valueOptions:
                      valueSourceType === "FIXED_ENUM" && prev.valueOptions.length === 0
                        ? [{ code: "OPT_1", label: "Lựa chọn 1" }]
                        : prev.valueOptions,
                    valueSourceCatalogId: valueSourceType === "ENUM_CATALOG" ? prev.valueSourceCatalogId : "",
                    valueSourceCatalogCode: valueSourceType === "ENUM_CATALOG" ? prev.valueSourceCatalogCode : "",
                    valueSourceCatalogName: valueSourceType === "ENUM_CATALOG" ? prev.valueSourceCatalogName : "",
                  }))
                }
                onOptionsChange={(valueOptions) => setForm((prev) => ({ ...prev, valueOptions }))}
                onCatalogChange={(catalog) =>
                  setForm((prev) => ({
                    ...prev,
                    valueSourceCatalogId: catalog?.id ?? "",
                    valueSourceCatalogCode: catalog?.code ?? "",
                    valueSourceCatalogName: catalog?.name ?? "",
                  }))
                }
              />
            )}
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
            disabled={busy || !form.code.trim() || !form.name.trim() || !isValidLabelColor(form.color)}
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
      <LabelEnumCatalogManagerDialog open={enumCatalogOpen} onClose={() => setEnumCatalogOpen(false)} />
    </Box>
  );
}
