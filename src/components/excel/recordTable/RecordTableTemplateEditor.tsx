import React from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

const DEFAULT_RECORD_TABLE_SPEC = JSON.stringify(
  {
    orientation: "ROWS",
    columns: [
      { key: "ho_so", label: "Hồ sơ", dataType: "text", required: true },
      { key: "sl_x", label: "Số lượng đối tượng X", dataType: "number" },
      { key: "sl_y", label: "Số lượng đối tượng Y", dataType: "number" },
      { key: "ngay_mo", label: "Ngày mở", dataType: "date" },
      { key: "ngay_ket_thuc", label: "Ngày kết thúc", dataType: "date" },
    ],
    calculatedColumns: [
      {
        key: "tong_doi_tuong",
        label: "Tổng đối tượng",
        dataType: "number",
        expression: { op: "add", args: [{ col: "sl_x" }, { col: "sl_y" }] },
      },
      {
        key: "so_ngay",
        label: "Số ngày xử lý",
        dataType: "number",
        expression: { op: "dateDiffDays", args: [{ col: "ngay_mo" }, { col: "ngay_ket_thuc" }] },
      },
    ],
    validationRules: [
      {
        key: "ngay_ket_thuc_sau_ngay_mo",
        message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày mở.",
        condition: { op: "gte", args: [{ col: "ngay_ket_thuc" }, { col: "ngay_mo" }] },
      },
    ],
  },
  null,
  2,
);

export type RecordTableTemplateEditorPayload = {
  name: string;
  recordTableSpecJson: string;
};

export type RecordTableTemplateEditorProps = {
  mode: "create" | "edit" | "view";
  meta: { code?: string | null; name?: string | null };
  initialSpecJson?: string | null;
  onBack: () => void;
  onSaved: (payload: RecordTableTemplateEditorPayload) => Promise<void> | void;
};

export default function RecordTableTemplateEditor({
  mode,
  meta,
  initialSpecJson,
  onBack,
  onSaved,
}: RecordTableTemplateEditorProps) {
  const readOnly = mode === "view";
  const [name, setName] = React.useState(meta.name ?? "");
  const [specJson, setSpecJson] = React.useState(initialSpecJson?.trim() || DEFAULT_RECORD_TABLE_SPEC);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Tên biểu mẫu không được trống.");
      return;
    }
    try {
      const parsed = JSON.parse(specJson);
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.columns)) {
        setError("Cấu hình phải có mảng columns.");
        return;
      }
      setSaving(true);
      await onSaved({ name: name.trim(), recordTableSpecJson: JSON.stringify(parsed) });
    } catch {
      setError("Cấu hình bảng dữ liệu phát sinh không phải JSON hợp lệ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              size="small"
              label="Mã"
              value={meta.code ?? ""}
              InputProps={{ readOnly: true }}
              sx={{ minWidth: { md: 220 } }}
            />
            <TextField
              size="small"
              label="Tên biểu mẫu"
              value={name}
              onChange={(event) => setName(event.target.value)}
              InputProps={{ readOnly }}
              fullWidth
            />
          </Stack>

          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
              Cấu hình bảng dữ liệu phát sinh
            </Typography>
            <TextField
              value={specJson}
              onChange={(event) => setSpecJson(event.target.value)}
              InputProps={{ readOnly }}
              fullWidth
              multiline
              minRows={18}
              spellCheck={false}
            />
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onBack}>Quay lại</Button>
            {!readOnly && (
              <Button
                variant="contained"
                startIcon={<SaveOutlinedIcon fontSize="small" />}
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
