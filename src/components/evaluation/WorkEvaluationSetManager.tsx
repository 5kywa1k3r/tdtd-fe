import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";

import type {
  CreateEvaluationTemplateRequest,
  EvaluationTemplateDto,
} from "../../types/evaluationTemplate";
import {
  useCreateEvaluationTemplateMutation,
  useDeactivateEvaluationTemplateMutation,
  useGetEvaluationTemplatesQuery,
} from "../../api/evaluationTemplateApi";
import { UITextKey, uiText } from '../../constants/uiText';

type Props = {
  disabled?: boolean;
  unitCodeScope?: string | null;
};

type ItemState = { code: string; label: string; order: number; isActive: boolean };

type FormState = {
  representativeCode: string;
  representativeLabel: string;
  isActive: boolean;
  unitCodeScope?: string | null;
  items: ItemState[];
};

const emptyForm = (): FormState => ({
  representativeCode: "",
  representativeLabel: "",
  isActive: true,
  unitCodeScope: null,
  items: [
    { code: "", label: "", order: 1, isActive: true },
    { code: "", label: "", order: 2, isActive: true },
  ],
});

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

export default function WorkEvaluationSetManager({ disabled, unitCodeScope = "PV01" }: Props) {
  const { data, isFetching, refetch } = useGetEvaluationTemplatesQuery({ includeInactive: true });
  const [createTemplate, createState] = useCreateEvaluationTemplateMutation();
  const [deactivateTemplate, deactivateState] = useDeactivateEvaluationTemplateMutation();

  const options = useMemo(
    () => (data ?? []).filter((x) => !unitCodeScope || !x.unitCodeScope || x.unitCodeScope === unitCodeScope),
    [data, unitCodeScope]
  );
  const [selectedId, setSelectedId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!selectedId && options.length > 0) {
      setSelectedId(options[0].id);
    }
  }, [options, selectedId]);

  const selected = useMemo(
    () => options.find((x) => x.id === selectedId) ?? null,
    [options, selectedId]
  );

  const busy = createState.isLoading || deactivateState.isLoading;

  const openCreate = () => {
    setForm({ ...emptyForm(), unitCodeScope });
    setError("");
    setDialogOpen(true);
  };

  const validate = () => {
    if (!form.representativeCode.trim()) return "Phải nhập mã đại diện.";
    if (!form.representativeLabel.trim()) return "Phải nhập tên bộ mã.";
    const clean = form.items.filter((x) => x.code.trim() || x.label.trim());
    if (clean.length === 0) return "Phải có ít nhất 1 mã con.";
    if (clean.some((x) => !x.code.trim() || !x.label.trim())) return "Các mã con phải có đủ mã và nhãn.";
    const repCode = normalizeCode(form.representativeCode);
    const normalized = clean.map((x) => normalizeCode(x.code));
    const dup = normalized.filter((x, i, arr) => arr.indexOf(x) !== i);
    if (dup.length > 0) return `Mã con bị trùng: ${dup[0]}`;
    if (normalized.some((x) => x === repCode)) return "Mã con không được trùng mã đại diện.";
    return "";
  };

  const handleSave = async () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    try {
      const payload: CreateEvaluationTemplateRequest = {
        representativeCode: normalizeCode(form.representativeCode),
        representativeLabel: form.representativeLabel.trim(),
        unitCodeScope: form.unitCodeScope?.trim() || null,
        items: form.items
          .filter((x) => x.code.trim() || x.label.trim())
          .map((x, index) => ({
            code: normalizeCode(x.code),
            label: x.label.trim(),
            order: x.order || index + 1,
          })),
      };
      const created = await createTemplate(payload).unwrap();
      setSelectedId(created.id);
      setDialogOpen(false);
    } catch (e: any) {
      setError(e?.data?.message || e?.data?.title || e?.message || "Không lưu được bộ mã đánh giá.");
    }
  };

  const handleDeactivate = async (opt: EvaluationTemplateDto) => {
    await deactivateTemplate(opt.id).unwrap();
    await refetch();
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} spacing={1.5}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">{uiText(UITextKey.TextBoMaDanhGiaThuCong)}</Typography>
              <Typography variant="body2" color="text.secondary">
                Quản lý bộ mã đánh giá dùng chung. Đầu việc chọn một bộ để dùng, công việc chọn từ các mã con của bộ đó.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" color="primary" label={`Tổng bộ: ${options.length}`} />
              <Chip size="small" color="success" variant="outlined" label={`Đang dùng: ${options.filter((x) => x.isActive).length}`} />
              <Tooltip title={uiText(UITextKey.TextTaiLai)}>
                <span>
                  <IconButton size="small" onClick={() => refetch()} disabled={isFetching}>
                    <RefreshOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
            <Autocomplete
              fullWidth
              options={options}
              value={selected}
              onChange={(_, value) => setSelectedId(value?.id ?? "")}
              getOptionLabel={(option) => `${option.representativeLabel} (${option.representativeCode})`}
              renderInput={(params) => <TextField {...params} size="small" label={uiText(UITextKey.TextChonBoMaDeXemNhanh)} placeholder={uiText(UITextKey.TextChonBoMaDanhGia)} />}
              renderOption={(props, option) => (
                <li {...props}>
                  <Stack spacing={0.25}>
                    <Typography fontWeight={700}>{option.representativeLabel}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.representativeCode} - {option.items.filter((x) => x.isActive).length} mã con đang dùng
                    </Typography>
                  </Stack>
                </li>
              )}
            />

            <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate} disabled={disabled || busy}>
              Thêm mới
            </Button>
          </Stack>

          {selected ? (
            <Card variant="outlined" sx={{ bgcolor: "grey.50" }}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800}>
                        {selected.representativeLabel}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selected.representativeCode}
                        {selected.unitCodeScope ? ` - ${selected.unitCodeScope}` : ""}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {selected.isActive && (
                        <Button size="small" color="warning" variant="outlined" startIcon={<BlockOutlinedIcon />} onClick={() => handleDeactivate(selected)} disabled={disabled || busy}>
                          Ngừng dùng
                        </Button>
                      )}
                    </Stack>
                  </Stack>

                  <Divider />

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {selected.items.map((item) => (
                      <Chip
                        key={item.code}
                        color={item.isActive ? "primary" : "default"}
                        variant={item.isActive ? "filled" : "outlined"}
                        label={`${item.label} (${item.code})`}
                      />
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="info">{uiText(UITextKey.TextChuaCoBoMaDanhGiaChonThemMoi)}</Alert>
          )}
        </Stack>
      </CardContent>

      <Dialog open={dialogOpen} onClose={() => !busy && setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{uiText(UITextKey.TextThemBoMaDanhGia)}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField
                size="small"
                fullWidth
                label={uiText(UITextKey.TextMaDaiDien)}
                value={form.representativeCode}
                onChange={(e) => setForm((s) => ({ ...s, representativeCode: e.target.value }))}
              />
              <TextField
                size="small"
                fullWidth
                label={uiText(UITextKey.TextTenBoMa)}
                value={form.representativeLabel}
                onChange={(e) => setForm((s) => ({ ...s, representativeLabel: e.target.value }))}
              />
            </Stack>

            <TextField
              size="small"
              label={uiText(UITextKey.TextPhamViDonVi)}
              value={form.unitCodeScope ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, unitCodeScope: e.target.value || null }))}
              helperText={uiText(UITextKey.TextViDuPV01)}
            />

            <Stack spacing={1}>
              <Typography fontWeight={700}>{uiText(UITextKey.TextCacMaConDiKem)}</Typography>
              {form.items.map((item, index) => (
                <Stack key={`new-${index}`} direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField
                    size="small"
                    label={uiText(UITextKey.TextMaCon)}
                    value={item.code}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        items: s.items.map((x, i) => (i === index ? { ...x, code: e.target.value } : x)),
                      }))
                    }
                    sx={{ width: { xs: "100%", md: 180 } }}
                  />
                  <TextField
                    size="small"
                    label={uiText(UITextKey.TextNhanHienThi)}
                    value={item.label}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        items: s.items.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)),
                      }))
                    }
                    fullWidth
                  />
                </Stack>
              ))}
              <Box>
                <Button
                  size="small"
                  variant="text"
                  onClick={() =>
                    setForm((s) => ({
                      ...s,
                      items: [...s.items, { code: "", label: "", order: s.items.length + 1, isActive: true }],
                    }))
                  }
                >
                  Thêm mã con
                </Button>
              </Box>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={busy}>{uiText(UITextKey.TextHuy3)}</Button>
          <Button onClick={handleSave} variant="contained" disabled={busy}>
            {busy ? "Đang lưu..." : "Tạo mới"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
