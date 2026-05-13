import React from "react";
import {
  Box,
  Button,
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
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

export type RecordTableDataType = "text" | "number" | "date" | "boolean";

export type RecordTableColumn = {
  key: string;
  label: string;
  dataType: RecordTableDataType;
  required?: boolean;
};

export type RecordTableRuntimeRow = {
  rowKey: string;
  values: Record<string, string | number | boolean | null>;
};

export type RecordTableSpec = {
  orientation?: "ROWS" | "COLUMNS" | string;
  columns: RecordTableColumn[];
  calculatedColumns?: unknown[];
  calculatedRows?: unknown[];
  aggregateColumns?: unknown[];
  aggregateRows?: unknown[];
};

export function parseRecordTableSpecJson(specJson?: string | null): RecordTableSpec | null {
  if (!specJson?.trim()) return null;
  try {
    const parsed = JSON.parse(specJson);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.columns)) return null;
    return {
      ...parsed,
      columns: parsed.columns
        .filter((item: unknown): item is Record<string, unknown> =>
          Boolean(item && typeof item === "object" && !Array.isArray(item)),
        )
        .map((item: Record<string, unknown>) => ({
          key: String(item.key ?? "").trim(),
          label: String(item.label ?? item.key ?? "").trim(),
          dataType: normalizeDataType(item.dataType ?? item.type),
          required: Boolean(item.required),
        }))
        .filter((item: RecordTableColumn) => item.key),
    };
  } catch {
    return null;
  }
}

export function extractRecordRowsFromTableValues(
  tableValuesJson: string | null | undefined,
  blockId: string,
  dynamicExcelTemplateId?: string | null,
): RecordTableRuntimeRow[] {
  if (!tableValuesJson?.trim()) return [];
  try {
    const root = JSON.parse(tableValuesJson);
    const blocks = Array.isArray(root?.blocks) ? root.blocks : root?.records ? [root] : [];
    const block =
      blocks.find((item: any) => normalizeBlockId(item?.blockId) === normalizeBlockId(blockId)) ??
      blocks.find((item: any) => dynamicExcelTemplateId && item?.dynamicExcelTemplateId === dynamicExcelTemplateId) ??
      blocks.find((item: any) => item?.tableKind === "RECORD_TABLE");
    const records: unknown[] = Array.isArray(block?.records) ? block.records : [];
    return records
      .filter((item: unknown): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object" && !Array.isArray(item)),
      )
      .map((item, index) => ({
        rowKey: String(item.rowKey ?? item.id ?? `row_${index + 1}`),
        values:
          item.values && typeof item.values === "object" && !Array.isArray(item.values)
            ? normalizeRecordValues(item.values as Record<string, unknown>)
            : normalizeRecordValues(item),
      }));
  } catch {
    return [];
  }
}

export function buildRecordTableBlockPayload(input: {
  blockId: string;
  dynamicExcelTemplateId?: string | null;
  orientation?: string | null;
  records: RecordTableRuntimeRow[];
}) {
  return {
    blockId: normalizeBlockId(input.blockId),
    dynamicExcelTemplateId: input.dynamicExcelTemplateId ?? null,
    tableKind: "RECORD_TABLE",
    orientation: input.orientation?.trim().toUpperCase() === "COLUMNS" ? "COLUMNS" : "ROWS",
    records: input.records
      .map((row, index) => ({
        rowKey: row.rowKey || `row_${index + 1}`,
        rowOrder: index + 1,
        values: row.values,
      }))
      .filter((row) => Object.values(row.values).some((value) => value !== null && value !== "")),
  };
}

export type RecordTableRuntimeEditorProps = {
  spec: RecordTableSpec | null;
  rows: RecordTableRuntimeRow[];
  readOnly?: boolean;
  disabled?: boolean;
  onChange: (rows: RecordTableRuntimeRow[]) => void;
};

export default function RecordTableRuntimeEditor({
  spec,
  rows,
  readOnly = false,
  disabled = false,
  onChange,
}: RecordTableRuntimeEditorProps) {
  const columns = spec?.columns ?? [];

  const updateCell = React.useCallback(
    (rowIndex: number, column: RecordTableColumn, rawValue: unknown) => {
      const next = rows.map((row, index) => {
        if (index !== rowIndex) return row;
        return {
          ...row,
          values: {
            ...row.values,
            [column.key]: normalizeInputValue(rawValue, column.dataType),
          },
        };
      });
      onChange(next);
    },
    [onChange, rows],
  );

  const addRow = React.useCallback(() => {
    onChange([
      ...rows,
      {
        rowKey: `row_${rows.length + 1}`,
        values: {},
      },
    ]);
  }, [onChange, rows]);

  const removeRow = React.useCallback(
    (rowIndex: number) => {
      onChange(rows.filter((_row, index) => index !== rowIndex));
    },
    [onChange, rows],
  );

  if (!spec) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Chưa có cấu hình bảng dữ liệu phát sinh.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="subtitle2" fontWeight={800}>
            Bảng dữ liệu phát sinh
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {columns.length} cột thu thập, {rows.length} dòng
          </Typography>
        </Box>
        {!readOnly && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon fontSize="small" />}
            onClick={addRow}
            disabled={disabled}
          >
            Thêm dòng
          </Button>
        )}
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={64} align="right">
                STT
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column.key} sx={{ minWidth: 180 }}>
                  {column.label || column.key}
                  {column.required ? " *" : ""}
                </TableCell>
              ))}
              {!readOnly && <TableCell width={56} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={row.rowKey || rowIndex} hover>
                <TableCell align="right">{rowIndex + 1}</TableCell>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <RecordValueInput
                      column={column}
                      value={row.values[column.key] ?? null}
                      readOnly={readOnly}
                      disabled={disabled}
                      onChange={(value) => updateCell(rowIndex, column, value)}
                    />
                  </TableCell>
                ))}
                {!readOnly && (
                  <TableCell align="center">
                    <Tooltip title="Xóa dòng">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => removeRow(rowIndex)}
                          disabled={disabled}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + (readOnly ? 1 : 2)}>
                  <Typography variant="body2" color="text.secondary">
                    Chưa phát sinh dữ liệu.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

function RecordValueInput({
  column,
  value,
  readOnly,
  disabled,
  onChange,
}: {
  column: RecordTableColumn;
  value: string | number | boolean | null;
  readOnly: boolean;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  if (column.dataType === "boolean") {
    return (
      <TextField
        select
        size="small"
        value={value === true ? "true" : value === false ? "false" : ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        InputProps={{ readOnly }}
        fullWidth
      >
        <MenuItem value="">-</MenuItem>
        <MenuItem value="true">Có</MenuItem>
        <MenuItem value="false">Không</MenuItem>
      </TextField>
    );
  }

  return (
    <TextField
      size="small"
      type={column.dataType === "number" ? "number" : column.dataType === "date" ? "date" : "text"}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      InputProps={{ readOnly }}
      fullWidth
    />
  );
}

function normalizeBlockId(value?: string | null) {
  return value?.trim() || "excel_block";
}

function normalizeDataType(value: unknown): RecordTableDataType {
  const normalized = String(value ?? "text").trim().toLowerCase();
  if (normalized === "string") return "text";
  if (normalized === "decimal") return "number";
  if (normalized === "datetime") return "date";
  if (normalized === "bool") return "boolean";
  return normalized === "number" || normalized === "date" || normalized === "boolean"
    ? normalized
    : "text";
}

function normalizeInputValue(value: unknown, type: RecordTableDataType) {
  if (value === "" || value == null) return null;
  if (type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (type === "boolean") {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return null;
  }
  return String(value);
}

function normalizeRecordValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([key]) => key !== "rowKey" && key !== "rowOrder" && key !== "id")
      .map(([key, value]) => [key, value == null || value === "" ? null : value as string | number | boolean]),
  ) as Record<string, string | number | boolean | null>;
}
