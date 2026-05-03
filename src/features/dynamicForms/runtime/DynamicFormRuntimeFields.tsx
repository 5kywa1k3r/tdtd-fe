import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type { DynamicFormField, DynamicFormSection } from "../dynamicForm.types";

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

function asNumberText(value: DynamicFormRuntimeValue | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value;
  return "";
}

function asBoolean(value: DynamicFormRuntimeValue | undefined) {
  return value === true;
}

function asStringArray(value: DynamicFormRuntimeValue | undefined) {
  return Array.isArray(value) ? value : [];
}

function renderField(
  field: DynamicFormField,
  value: DynamicFormRuntimeValue | undefined,
  locked: boolean,
  onChange: (value: DynamicFormRuntimeValue) => void,
) {
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
          label={field.label}
          sx={{ m: 0, minWidth: 0 }}
        />
        {field.isStatistic && <Chip size="small" variant="outlined" label="Thống kê" />}
      </Box>
    );
  }

  if (field.type === "singleSelect") {
    return (
      <TextField
        fullWidth
        select
        size="small"
        label={field.label}
        required={field.required}
        disabled={locked}
        value={asText(value)}
        onChange={(event) => onChange(event.target.value || null)}
        sx={{ minHeight: field.minHeight }}
      >
        {(field.options ?? []).map((option) => (
          <MenuItem key={option.code} value={option.code}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === "multiSelect") {
    return (
      <TextField
        fullWidth
        select
        size="small"
        label={field.label}
        required={field.required}
        disabled={locked}
        value={asStringArray(value)}
        onChange={(event) => {
          const next = event.target.value;
          onChange(Array.isArray(next) ? next : String(next).split(",").filter(Boolean));
        }}
        SelectProps={{
          multiple: true,
          renderValue: (selected) => {
            const selectedValues = Array.isArray(selected) ? selected : [];
            return selectedValues
              .map((code) => field.options?.find((option) => option.code === code)?.label ?? code)
              .join(", ");
          },
        }}
        sx={{ minHeight: field.minHeight }}
      >
        {(field.options ?? []).map((option) => (
          <MenuItem key={option.code} value={option.code}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <TextField
      fullWidth
      size="small"
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      label={field.label}
      required={field.required}
      disabled={locked}
      value={field.type === "number" ? asNumberText(value) : asText(value)}
      onChange={(event) => {
        const raw = event.target.value;
        if (field.type === "number") {
          onChange(raw === "" ? null : Number(raw));
          return;
        }

        onChange(raw || null);
      }}
      multiline={field.type === "longText"}
      minRows={field.type === "longText" ? 3 : undefined}
      InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
      sx={{ minHeight: field.minHeight }}
    />
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
                            label="Thống kê"
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
