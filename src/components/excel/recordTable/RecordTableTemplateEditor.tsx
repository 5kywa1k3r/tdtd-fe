import React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

import type {
  DynamicExcelRecordColumn,
  DynamicExcelRecordDataType,
  DynamicExcelRecordTableSpec,
} from "../../../api/dynamicExcelApi";

const DATA_TYPE_OPTIONS: Array<{ value: DynamicExcelRecordDataType; label: string }> = [
  { value: "text", label: "Văn bản" },
  { value: "number", label: "Số" },
  { value: "date", label: "Ngày" },
  { value: "boolean", label: "Có/không" },
];

const DEFAULT_COLUMNS: DynamicExcelRecordColumn[] = [
  { key: "ho_so", label: "Hồ sơ", dataType: "text", required: true },
  { key: "so_luong", label: "Số lượng", dataType: "number" },
  { key: "ngay_tiep_nhan", label: "Ngày tiếp nhận", dataType: "date" },
];

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
  const initialSpec = React.useMemo(() => parseRecordTableSpec(initialSpecJson), [initialSpecJson]);
  const [name, setName] = React.useState(meta.name ?? "");
  const [columns, setColumns] = React.useState<DynamicExcelRecordColumn[]>(initialSpec.columns);
  const [advancedSpec, setAdvancedSpec] = React.useState<
    Pick<DynamicExcelRecordTableSpec, "calculatedColumns" | "calculatedRows" | "aggregateColumns" | "aggregateRows" | "validationRules">
  >({
    calculatedColumns: initialSpec.calculatedColumns,
    calculatedRows: initialSpec.calculatedRows,
    aggregateColumns: initialSpec.aggregateColumns,
    aggregateRows: initialSpec.aggregateRows,
    validationRules: initialSpec.validationRules,
  });
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setName(meta.name ?? "");
  }, [meta.name]);

  React.useEffect(() => {
    setColumns(initialSpec.columns);
    setAdvancedSpec({
      calculatedColumns: initialSpec.calculatedColumns,
      calculatedRows: initialSpec.calculatedRows,
      aggregateColumns: initialSpec.aggregateColumns,
      aggregateRows: initialSpec.aggregateRows,
      validationRules: initialSpec.validationRules,
    });
  }, [initialSpec]);

  const updateColumn = (index: number, patch: Partial<DynamicExcelRecordColumn>) => {
    setColumns((current) =>
      current.map((column, i) => (i === index ? { ...column, ...patch } : column)),
    );
  };

  const addColumn = () => {
    const nextIndex = columns.length + 1;
    setColumns((current) => [
      ...current,
      {
        key: `cot_${nextIndex}`,
        label: `Cột ${nextIndex}`,
        dataType: "number",
      },
    ]);
  };

  const removeColumn = (index: number) => {
    setColumns((current) => current.filter((_column, i) => i !== index));
  };

  const handleSave = async () => {
    setError(null);
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Tên bảng dữ liệu phát sinh không được trống.");
      return;
    }

    const normalizedColumns = columns.map(normalizeRecordColumn).filter(Boolean) as DynamicExcelRecordColumn[];
    if (normalizedColumns.length === 0) {
      setError("Cần có ít nhất một cột dữ liệu.");
      return;
    }

    const duplicateKey = findDuplicateKey(normalizedColumns.map((column) => column.key));
    if (duplicateKey) {
      setError(`Mã cột bị trùng: ${duplicateKey}.`);
      return;
    }

    if (normalizedColumns.some((column) => !column.label.trim())) {
      setError("Tên hiển thị của cột không được trống.");
      return;
    }

    const nextSpec: DynamicExcelRecordTableSpec = {
      orientation: "ROWS",
      columns: normalizedColumns,
      ...advancedSpec,
    };

    setSaving(true);
    try {
      await onSaved({
        name: normalizedName,
        recordTableSpecJson: JSON.stringify(stripEmptyAdvancedSpec(nextSpec)),
      });
    } finally {
      setSaving(false);
    }
  };

  const preservedAdvancedCount =
    (advancedSpec.calculatedColumns?.length ?? 0) +
    (advancedSpec.calculatedRows?.length ?? 0) +
    (advancedSpec.aggregateColumns?.length ?? 0) +
    (advancedSpec.aggregateRows?.length ?? 0) +
    (advancedSpec.validationRules?.length ?? 0);

  return (
    <Box sx={{ p: 2 }}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
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
              label="Tên bảng"
              value={name}
              onChange={(event) => setName(event.target.value)}
              InputProps={{ readOnly }}
              fullWidth
            />
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>
                Cấu hình cột dữ liệu
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mỗi dòng báo cáo sẽ nhập theo các cột bên dưới. Chỉ đặt tên, kiểu dữ liệu và bắt buộc nhập.
              </Typography>
            </Box>
            {!readOnly && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={addColumn}>
                Thêm cột
              </Button>
            )}
          </Stack>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={210}>Mã cột</TableCell>
                  <TableCell>Tên hiển thị</TableCell>
                  <TableCell width={180}>Kiểu dữ liệu</TableCell>
                  <TableCell width={120} align="center">Bắt buộc</TableCell>
                  {!readOnly && <TableCell width={70} align="center" />}
                </TableRow>
              </TableHead>
              <TableBody>
                {columns.map((column, index) => (
                  <TableRow key={`${column.key}_${index}`}>
                    <TableCell>
                      <TextField
                        size="small"
                        value={column.key}
                        disabled={readOnly}
                        fullWidth
                        onChange={(event) =>
                          updateColumn(index, { key: normalizeKeyDraft(event.target.value) })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={column.label}
                        disabled={readOnly}
                        fullWidth
                        onChange={(event) => updateColumn(index, { label: event.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={column.dataType}
                        disabled={readOnly}
                        fullWidth
                        onChange={(event) =>
                          updateColumn(index, {
                            dataType: event.target.value as DynamicExcelRecordDataType,
                          })
                        }
                      >
                        {DATA_TYPE_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={Boolean(column.required)}
                        disabled={readOnly}
                        onChange={(event) => updateColumn(index, { required: event.target.checked })}
                      />
                    </TableCell>
                    {!readOnly && (
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => removeColumn(index)}
                          disabled={columns.length <= 1}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {preservedAdvancedCount > 0 && (
            <Alert severity="info">
              Bảng này có {preservedAdvancedCount} cấu hình tính toán/kiểm tra nâng cao đã lưu từ trước. Màn đơn giản hiện giữ nguyên các cấu hình đó khi lưu.
            </Alert>
          )}

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

function parseRecordTableSpec(raw?: string | null): DynamicExcelRecordTableSpec {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.columns)) {
      return {
        orientation: "ROWS",
        ...parsed,
        columns: parsed.columns
          .map(normalizeRecordColumn)
          .filter(Boolean) as DynamicExcelRecordColumn[],
      };
    }
  } catch {
    // fall through to defaults
  }

  return {
    orientation: "ROWS",
    columns: DEFAULT_COLUMNS,
  };
}

function normalizeRecordColumn(value: unknown): DynamicExcelRecordColumn | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<DynamicExcelRecordColumn>;
  const key = normalizeKeyDraft(source.key || source.label || "");
  const label = String(source.label || source.key || "").trim();
  const dataType = normalizeDataType(source.dataType);
  if (!key && !label) return null;
  return {
    key: key || normalizeKeyDraft(label) || "cot",
    label: label || key,
    dataType,
    required: Boolean(source.required),
  };
}

function normalizeDataType(value: unknown): DynamicExcelRecordDataType {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "number" || raw === "date" || raw === "boolean" || raw === "text") {
    return raw;
  }
  return "text";
}

function normalizeKeyDraft(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findDuplicateKey(values: string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) return value;
    seen.add(key);
  }
  return null;
}

function stripEmptyAdvancedSpec(spec: DynamicExcelRecordTableSpec): DynamicExcelRecordTableSpec {
  return Object.fromEntries(
    Object.entries(spec).filter(([_key, value]) => !Array.isArray(value) || value.length > 0),
  ) as DynamicExcelRecordTableSpec;
}
