import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import type { DynamicFormField, DynamicFormSection } from "../dynamicForm.types";
import { getDynamicFormFieldDisplayName } from "../dynamicFormSchema";
import { UITextKey, uiText } from '../../../constants/uiText';
import {
  getDateInputFormatLabel,
  normalizeDateInputValue,
  type DateInputMode,
} from "../../../utils/dateInputFormat";

export type DynamicFormRuntimeValue =
  | string
  | number
  | boolean
  | string[]
  | null;

export type DynamicFormRuntimeValues = Record<string, DynamicFormRuntimeValue>;

export type DynamicFormRuntimeFieldsProps = {
  sections: DynamicFormSection[];
  fields: DynamicFormField[];
  values: DynamicFormRuntimeValues;
  readOnly?: boolean;
  disabled?: boolean;
  onChange: (fieldId: string, value: DynamicFormRuntimeValue) => void;
};

function clampSpan(value: number | undefined) {
  if (!Number.isFinite(value)) return 12;
  return Math.min(12, Math.max(3, Math.floor(value ?? 12)));
}

function asText(value: DynamicFormRuntimeValue | undefined) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function asLongText(value: DynamicFormRuntimeValue | undefined) {
  if (Array.isArray(value)) return value.join("\n");
  return asText(value);
}

function asDateText(value: DynamicFormRuntimeValue | undefined, mode: DateInputMode) {
  if (typeof value !== "string") return "";
  return normalizeDateInputValue(value, mode) ?? value;
}

function asNumberText(value: DynamicFormRuntimeValue | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value;
  return "";
}

function asBoolean(value: DynamicFormRuntimeValue | undefined) {
  return value === true;
}

function asStringArray(value: DynamicFormRuntimeValue | undefined) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function renderField(
  field: DynamicFormField,
  value: DynamicFormRuntimeValue | undefined,
  locked: boolean,
  onChange: (value: DynamicFormRuntimeValue) => void,
) {
  const displayName = getDynamicFormFieldDisplayName(field);

  if (field.type === "boolean") {
    return (
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          minHeight: field.minHeight,
          px: 1.25,
          py: 0.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={asBoolean(value)}
              disabled={locked}
              onChange={(event) => onChange(event.target.checked)}
            />
          }
          label={displayName}
          sx={{ m: 0, minWidth: 0 }}
        />
        {field.isStatistic && <Chip size="small" variant="outlined" label={uiText(UITextKey.TextThongKe)} />}
      </Box>
    );
  }

  if (field.type === "shortText" || field.type === "singleSelect") {
    const currentValue = asText(value);

    return (
      <TextField
        fullWidth
        select
        size="small"
        label={displayName}
        required={field.required}
        disabled={locked}
        value={currentValue}
        onChange={(event) => onChange(event.target.value || null)}
        SelectProps={{
          displayEmpty: true,
          renderValue: (selected) => {
            const code = typeof selected === "string" ? selected : "";
            if (!code) {
              return (
                <Typography component="span" color="text.secondary">
                  Chọn một lựa chọn
                </Typography>
              );
            }

            return field.options?.find((option) => option.code === code)?.label ?? code;
          },
        }}
        InputLabelProps={{ shrink: true }}
        sx={{ minHeight: field.minHeight }}
      >
        <MenuItem value="">Chưa chọn</MenuItem>
        {(field.options ?? []).map((option) => (
          <MenuItem key={option.code} value={option.code}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === "multiSelect") {
    const currentValues = asStringArray(value);

    return (
      <TextField
        fullWidth
        select
        size="small"
        label={displayName}
        required={field.required}
        disabled={locked}
        value={currentValues}
        onChange={(event) => {
          const next = event.target.value;
          onChange(Array.isArray(next) ? next : String(next).split(",").filter(Boolean));
        }}
        SelectProps={{
          multiple: true,
          displayEmpty: true,
          renderValue: (selected) => {
            const selectedValues = Array.isArray(selected) ? selected : [];
            if (selectedValues.length === 0) {
              return (
                <Typography component="span" color="text.secondary">
                  Chọn một hoặc nhiều lựa chọn
                </Typography>
              );
            }

            return selectedValues
              .map((code) => field.options?.find((option) => option.code === code)?.label ?? code)
              .join(", ");
          },
        }}
        InputLabelProps={{ shrink: true }}
        sx={{ minHeight: field.minHeight }}
      >
        {(field.options ?? []).map((option) => (
          <MenuItem key={option.code} value={option.code}>
            <Checkbox size="small" checked={currentValues.includes(option.code)} sx={{ mr: 1 }} />
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === "longText") {
    return (
      <TextField
        fullWidth
        size="small"
        label={displayName}
        required={field.required}
        disabled={locked}
        value={asLongText(value)}
        multiline
        minRows={3}
        onChange={(event) => onChange(event.target.value || null)}
        sx={{ minHeight: field.minHeight }}
      />
    );
  }

  if (field.type === "stringList") {
    return (
      <StringListRuntimeEditor
        label={displayName}
        value={asStringArray(value)}
        required={field.required}
        minHeight={field.minHeight}
        locked={locked}
        onChange={onChange}
      />
    );
  }

  return (
    <TextField
      fullWidth
      size="small"
      type={field.type === "number" ? "number" : "text"}
      label={displayName}
      required={field.required}
      disabled={locked}
      value={
        field.type === "number"
          ? asNumberText(value)
          : field.type === "date" || field.type === "fullDate"
            ? asDateText(value, field.type === "fullDate" ? "full" : "flexible")
            : asText(value)
      }
      onChange={(event) => {
        const raw = event.target.value;
        if (field.type === "number") {
          onChange(raw === "" ? null : Number(raw));
          return;
        }

        onChange(raw || null);
      }}
      placeholder={
        field.type === "date" || field.type === "fullDate"
          ? getDateInputFormatLabel(field.type === "fullDate" ? "full" : "flexible")
          : undefined
      }
      helperText={
        field.type === "date" || field.type === "fullDate"
          ? `Định dạng: ${getDateInputFormatLabel(field.type === "fullDate" ? "full" : "flexible")}`
          : undefined
      }
      InputLabelProps={field.type === "date" || field.type === "fullDate" ? { shrink: true } : undefined}
      sx={{ minHeight: field.minHeight }}
    />
  );
}

function StringListRuntimeEditor({
  label,
  value,
  required,
  minHeight,
  locked,
  onChange,
}: {
  label: string;
  value: string[];
  required: boolean;
  minHeight: number;
  locked: boolean;
  onChange: (value: DynamicFormRuntimeValue) => void;
}) {
  const rows = value.length > 0 ? value : [""];
  const commit = (nextRows: string[]) => {
    onChange(nextRows.length > 0 ? nextRows : null);
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        minHeight,
        p: 1,
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {label}{required ? " *" : ""}
          </Typography>
          {!locked && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon fontSize="small" />}
              onClick={() => commit([...rows, ""])}
            >
              Thêm ý
            </Button>
          )}
        </Stack>
        {rows.map((item, index) => (
          <Stack key={index} direction="row" spacing={0.75} alignItems="flex-start">
            <TextField
              fullWidth
              size="small"
              label={`Ý ${index + 1}`}
              value={item}
              disabled={locked}
              multiline
              minRows={2}
              onChange={(event) => {
                const next = [...rows];
                next[index] = event.target.value;
                commit(next);
              }}
            />
            {!locked && (
              <IconButton
                size="small"
                aria-label="Xóa ý"
                disabled={rows.length <= 1}
                onClick={() => commit(rows.filter((_row, rowIndex) => rowIndex !== index))}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default function DynamicFormRuntimeFields(props: DynamicFormRuntimeFieldsProps) {
  const { sections, fields, values, readOnly = false, disabled = false, onChange } = props;

  if (fields.length === 0) return null;

  const locked = readOnly || disabled;
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const fieldsBySection = fields.reduce<Record<string, DynamicFormField[]>>((acc, field) => {
    (acc[field.sectionId] ??= []).push(field);
    return acc;
  }, {});
  const statisticCount = fields.filter((field) => field.isStatistic).length;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1" fontWeight={700}>
              Trường bổ sung
            </Typography>
            {statisticCount > 0 && (
              <Chip size="small" variant="outlined" label={`${statisticCount} trường thống kê`} />
            )}
          </Stack>

          {sortedSections.map((section) => {
            const sectionFields = (fieldsBySection[section.id] ?? []).sort(
              (a, b) => a.order - b.order,
            );
            if (sectionFields.length === 0) return null;

            return (
              <Stack key={section.id} spacing={1.25}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {section.title}
                  </Typography>
                  {section.description && (
                    <Typography variant="body2" color="text.secondary">
                      {section.description}
                    </Typography>
                  )}
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(12, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  {sectionFields.map((field) => (
                    <Box
                      key={field.id}
                      sx={{
                        gridColumn: {
                          xs: "1 / -1",
                          sm: `span ${clampSpan(field.colSpan)}`,
                        },
                        minWidth: 0,
                      }}
                    >
                      <Stack spacing={0.5}>
                        {renderField(field, values[field.id], locked, (value) =>
                          onChange(field.id, value),
                        )}
                        {field.isStatistic && field.type !== "boolean" && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={uiText(UITextKey.TextThongKe)}
                            sx={{ alignSelf: "flex-start" }}
                          />
                        )}
                      </Stack>
                    </Box>
                  ))}
                </Box>
              </Stack>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
