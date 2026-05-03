import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import PreviewIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ShortTextIcon from "@mui/icons-material/ShortText";
import SubjectIcon from "@mui/icons-material/Subject";
import NumbersIcon from "@mui/icons-material/Numbers";
import EventIcon from "@mui/icons-material/Event";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import ChecklistIcon from "@mui/icons-material/Checklist";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

import type {
  DynamicFormEditorSubmit,
  DynamicFormEditorValue,
  DynamicFormField,
  DynamicFormFieldType,
  DynamicFormSection,
  DynamicFormTableMode,
} from "../dynamicForm.types";
import {
  createDefaultField,
  createDefaultSection,
  createId,
  defaultAggregateOps,
  defaultStatistic,
  fieldTypeLabels,
  normalizeLabelCodes,
  normalizeFields,
  normalizeSections,
  normalizeTableMode,
  tableModeLabels,
  toSubmit,
} from "../dynamicFormSchema";
import LabelPicker from "../../../components/labels/LabelPicker";

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  initialValue: DynamicFormEditorValue;
  busy?: boolean;
  locked?: boolean;
  onBack: () => void;
  onSave?: (payload: DynamicFormEditorSubmit) => Promise<void>;
  onPublish?: () => Promise<void>;
};

const palette: Array<{ type: DynamicFormFieldType; icon: React.ReactNode }> = [
  { type: "shortText", icon: <ShortTextIcon fontSize="small" /> },
  { type: "longText", icon: <SubjectIcon fontSize="small" /> },
  { type: "number", icon: <NumbersIcon fontSize="small" /> },
  { type: "date", icon: <EventIcon fontSize="small" /> },
  { type: "singleSelect", icon: <RadioButtonCheckedIcon fontSize="small" /> },
  { type: "multiSelect", icon: <ChecklistIcon fontSize="small" /> },
  { type: "boolean", icon: <CheckBoxIcon fontSize="small" /> },
];

export default function DynamicFormEditor({
  mode,
  initialValue,
  busy = false,
  locked = false,
  onBack,
  onSave,
  onPublish,
}: Props) {
  const readOnly = mode === "view" || locked;
  const [preview, setPreview] = useState(mode === "view");
  const [value, setValue] = useState<DynamicFormEditorValue>(() => ({
    ...initialValue,
    sections: normalizeSections(initialValue.sections),
    fields: normalizeFields(initialValue.fields, normalizeSections(initialValue.sections)),
  }));

  const [selectedSectionId, setSelectedSectionId] = useState(
    value.sections[0]?.id ?? createDefaultSection().id,
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    value.fields[0]?.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  const sections = useMemo(() => normalizeSections(value.sections), [value.sections]);
  const fields = useMemo(() => normalizeFields(value.fields, sections), [sections, value.fields]);
  const selectedSection = sections.find((x) => x.id === selectedSectionId) ?? sections[0];
  const selectedField = fields.find((x) => x.id === selectedFieldId) ?? null;

  const setPatch = (patch: Partial<DynamicFormEditorValue>) =>
    setValue((current) => ({ ...current, ...patch }));

  const updateSection = (id: string, patch: Partial<DynamicFormSection>) => {
    setValue((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === id ? { ...section, ...patch } : section,
      ),
    }));
  };

  const updateField = (id: string, patch: Partial<DynamicFormField>) => {
    setValue((current) => ({
      ...current,
      fields: current.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    }));
  };

  const addSection = () => {
    const next: DynamicFormSection = {
      id: createId("section"),
      title: `Section ${sections.length + 1}`,
      description: null,
      order: sections.length,
    };
    setValue((current) => ({ ...current, sections: [...current.sections, next] }));
    setSelectedSectionId(next.id);
    setSelectedFieldId(null);
  };

  const addField = (type: DynamicFormFieldType) => {
    if (!selectedSection) return;
    const field = createDefaultField(
      type,
      selectedSection.id,
      fields.filter((x) => x.sectionId === selectedSection.id).length,
    );
    setValue((current) => ({ ...current, fields: [...current.fields, field] }));
    setSelectedFieldId(field.id);
  };

  const removeField = (fieldId: string) => {
    setValue((current) => ({ ...current, fields: current.fields.filter((x) => x.id !== fieldId) }));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  const moveField = (fieldId: string, direction: -1 | 1) => {
    const sameSection = fields.filter((x) => x.sectionId === selectedSection?.id);
    const index = sameSection.findIndex((x) => x.id === fieldId);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= sameSection.length) return;

    const first = sameSection[index];
    const second = sameSection[swapIndex];
    setValue((current) => ({
      ...current,
      fields: current.fields.map((field) => {
        if (field.id === first.id) return { ...field, order: second.order };
        if (field.id === second.id) return { ...field, order: first.order };
        return field;
      }),
    }));
  };

  const save = async () => {
    if (!onSave || readOnly) return;
    const payload = toSubmit({ ...value, sections, fields });
    if (!payload.name) {
      setError("Ten form khong duoc trong.");
      return;
    }
    setError(null);
    await onSave(payload);
  };

  const selectedSectionFields = fields.filter((x) => x.sectionId === selectedSection?.id);
  const excelBlockLabelCodes = getExcelBlockLabelCodes(value.excelBlockJson, "labelCodes");
  const excelBlockAllowedLabelCodes = getExcelBlockLabelCodes(
    value.excelBlockJson,
    "allowedLabelCodes",
  );
  const excelBlockDataRows = getExcelBlockDataRows(value.excelBlockJson);
  const excelBlockLabelColumnsText = getExcelBlockLabelColumnsText(value.excelBlockJson);
  const excelBlockTableMode = getExcelBlockTableMode(value.excelBlockJson);
  const excelBlockIndexMapCount = getExcelBlockIndexMapCount(value.excelBlockJson);
  const visibleExcelBlockDataRows = excelBlockDataRows.slice(0, 100);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Tooltip title="Back">
            <IconButton onClick={onBack}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Dynamic Form
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {value.code || "New form"}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={preview ? "preview" : "edit"}
            onChange={(_, next) => {
              if (next) setPreview(next === "preview");
            }}
          >
            <ToggleButton value="edit" disabled={mode === "view"}>
              <EditIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="preview">
              <PreviewIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>

          {onPublish && !readOnly && (
            <Button variant="outlined" onClick={onPublish} disabled={busy}>
              Publish
            </Button>
          )}

          {!readOnly && (
            <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy}>
              Save
            </Button>
          )}
        </Stack>
      </Stack>

      {locked && <Alert severity="info">Published forms are read-only. Clone to create a new version.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Stack spacing={1.5}>
              <TextField size="small" label="Ma" value={value.code ?? ""} disabled />
              <TextField
                size="small"
                label="Ten form"
                value={value.name}
                disabled={readOnly}
                onChange={(e) => setPatch({ name: e.target.value })}
              />
              <TextField
                size="small"
                label="Mo ta"
                multiline
                minRows={3}
                value={value.description ?? ""}
                disabled={readOnly}
                onChange={(e) => setPatch({ description: e.target.value })}
              />
              <LabelPicker
                value={value.labels}
                disabled={readOnly}
                label="Form labels"
                placeholder="Chọn nhãn form"
                onChange={(codes) => setPatch({ labels: codes })}
              />
              {value.excelBlockJson && (
                <>
                  <Divider />
                  <Typography fontWeight={700}>Excel block</Typography>
                  <Select
                    size="small"
                    value={excelBlockTableMode}
                    disabled={readOnly}
                    onChange={(e: SelectChangeEvent) =>
                      setPatch({
                        excelBlockJson: setExcelBlockTableMode(
                          value.excelBlockJson,
                          e.target.value as DynamicFormTableMode,
                        ),
                      })
                    }
                  >
                    {Object.entries(tableModeLabels).map(([modeValue, label]) => (
                      <MenuItem key={modeValue} value={modeValue}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary">
                    Table mode quy dinh cach tao metricKey thong ke. Fixed grid hien co
                    {excelBlockIndexMapCount > 0
                      ? ` ${excelBlockIndexMapCount} metric key.`
                      : " chua co index map."}
                  </Typography>
                  <LabelPicker
                    value={excelBlockLabelCodes}
                    disabled={readOnly}
                    label="Block labels"
                    placeholder="Chọn nhãn block"
                    onChange={(codes) =>
                      setPatch({
                        excelBlockJson: setExcelBlockLabelCodes(
                          value.excelBlockJson,
                          "labelCodes",
                          codes,
                        ),
                      })
                    }
                  />
                  <LabelPicker
                    value={excelBlockAllowedLabelCodes}
                    disabled={readOnly}
                    label="Allowed row labels"
                    placeholder="Chọn nhãn dòng"
                    helperText="Danh sách nhãn cho người nhập báo cáo chọn ở các dòng bảng."
                    onChange={(codes) =>
                      setPatch({
                        excelBlockJson: setExcelBlockLabelCodes(
                          value.excelBlockJson,
                          "allowedLabelCodes",
                          codes,
                        ),
                      })
                    }
                  />
                  <TextField
                    size="small"
                    label="Label columns"
                    value={excelBlockLabelColumnsText}
                    disabled={readOnly}
                    placeholder="VD: 1, 3"
                    helperText="Nhap so thu tu cot Excel dung lam metadata nhan; cac cot nay se bi loai khoi values1D."
                    onChange={(e) =>
                      setPatch({
                        excelBlockJson: setExcelBlockLabelColumnsFromText(
                          value.excelBlockJson,
                          e.target.value,
                        ),
                      })
                    }
                  />
                  {visibleExcelBlockDataRows.length > 0 && (
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Row label defaults
                      </Typography>
                      {visibleExcelBlockDataRows.map((rowIndex) => (
                        <LabelPicker
                          key={rowIndex}
                          size="small"
                          value={getExcelBlockRowDefaultCodes(value.excelBlockJson, rowIndex)}
                          allowedCodes={
                            excelBlockAllowedLabelCodes.length > 0
                              ? excelBlockAllowedLabelCodes
                              : undefined
                          }
                          disabled={readOnly}
                          label={`Row ${rowIndex + 1}`}
                          placeholder="Chon nhan"
                          limitTags={2}
                          lazySearch
                          onChange={(codes) =>
                            setPatch({
                              excelBlockJson: setExcelBlockRowDefaultCodes(
                                value.excelBlockJson,
                                rowIndex,
                                codes,
                              ),
                            })
                          }
                        />
                      ))}
                      {excelBlockDataRows.length > visibleExcelBlockDataRows.length && (
                        <Typography variant="caption" color="text.secondary">
                          Dang hien thi 100 dong dau tien de tranh form qua nang.
                        </Typography>
                      )}
                    </Stack>
                  )}
                </>
              )}
              <FormControlLabel
                control={
                  <Switch
                    checked={value.isActive}
                    disabled={readOnly}
                    onChange={(e) => setPatch({ isActive: e.target.checked })}
                  />
                }
                label="Active"
              />

              <Divider />

              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography fontWeight={700}>Sections</Typography>
                {!readOnly && (
                  <Tooltip title="Add section">
                    <IconButton size="small" onClick={addSection}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>

              <Stack spacing={0.75}>
                {sections.map((section) => (
                  <Button
                    key={section.id}
                    variant={section.id === selectedSection?.id ? "contained" : "outlined"}
                    onClick={() => {
                      setSelectedSectionId(section.id);
                      setSelectedFieldId(null);
                    }}
                    sx={{ justifyContent: "flex-start", textTransform: "none" }}
                  >
                    {section.title}
                  </Button>
                ))}
              </Stack>

              <Divider />

              {!readOnly && !preview && (
                <Stack spacing={1}>
                  <Typography fontWeight={700}>Fields</Typography>
                  <Grid container spacing={1}>
                    {palette.map((item) => (
                      <Grid key={item.type} size={{ xs: 6 }}>
                        <Tooltip title={fieldTypeLabels[item.type]}>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={item.icon}
                            onClick={() => addField(item.type)}
                            sx={{ justifyContent: "flex-start", textTransform: "none" }}
                          >
                            {fieldTypeLabels[item.type]}
                          </Button>
                        </Tooltip>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              {selectedSection && !preview && (
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                  <Stack spacing={1}>
                    <TextField
                      size="small"
                      label="Section title"
                      value={selectedSection.title}
                      disabled={readOnly}
                      onChange={(e) => updateSection(selectedSection.id, { title: e.target.value })}
                    />
                    <TextField
                      size="small"
                      label="Section description"
                      value={selectedSection.description ?? ""}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateSection(selectedSection.id, { description: e.target.value })
                      }
                    />
                    <LabelPicker
                      value={selectedSection.labelCodes ?? []}
                      disabled={readOnly}
                      label="Section labels"
                      placeholder="Chọn nhãn section"
                      onChange={(codes) =>
                        updateSection(selectedSection.id, { labelCodes: codes })
                      }
                    />
                  </Stack>
                </Paper>
              )}

              <Box
                sx={{
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  p: 2,
                  minHeight: 420,
                  bgcolor: "background.default",
                }}
              >
                <Stack spacing={1.5}>
                  <Box>
                    <Typography fontWeight={800}>{selectedSection?.title}</Typography>
                    {selectedSection?.description && (
                      <Typography variant="body2" color="text.secondary">
                        {selectedSection.description}
                      </Typography>
                    )}
                  </Box>

                  <Grid container spacing={1.5}>
                    {selectedSectionFields.map((field) => (
                      <Grid key={field.id} size={{ xs: 12, sm: field.colSpan }}>
                        <FieldCard
                          field={field}
                          selected={field.id === selectedFieldId}
                          preview={preview}
                          readOnly={readOnly}
                          onSelect={() => setSelectedFieldId(field.id)}
                          onDelete={() => removeField(field.id)}
                          onMoveUp={() => moveField(field.id, -1)}
                          onMoveDown={() => moveField(field.id, 1)}
                        />
                      </Grid>
                    ))}
                  </Grid>

                  {selectedSectionFields.length === 0 && (
                    <Box
                      sx={{
                        minHeight: 180,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: (theme) => `1px dashed ${theme.palette.divider}`,
                        borderRadius: 1,
                      }}
                    >
                      <Typography color="text.secondary">No fields</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <FieldSettingsPanel
              field={selectedField}
              readOnly={readOnly}
              onChange={(patch) => {
                if (!selectedField) return;
                updateField(selectedField.id, patch);
              }}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

function FieldCard({
  field,
  selected,
  preview,
  readOnly,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  field: DynamicFormField;
  selected: boolean;
  preview: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <Paper
      variant="outlined"
      onClick={onSelect}
      sx={{
        p: 1.25,
        borderRadius: 1,
        minHeight: field.minHeight,
        borderColor: selected ? "primary.main" : "divider",
        cursor: "pointer",
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} noWrap>
              {field.label}
            </Typography>
            {field.required && <Chip label="Required" size="small" variant="outlined" />}
            {field.isStatistic && <Chip label="Stat" size="small" color="primary" variant="outlined" />}
          </Stack>

          {!preview && !readOnly && (
            <Stack direction="row" spacing={0.25}>
              <Tooltip title="Up">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveUp();
                  }}
                >
                  <ArrowUpwardIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Down">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveDown();
                  }}
                >
                  <ArrowDownwardIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <DeleteOutlineIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Stack>

        {preview ? (
          <FieldPreview field={field} />
        ) : (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip label={field.key} size="small" />
            <Chip label={fieldTypeLabels[field.type]} size="small" variant="outlined" />
            <Chip label={`${field.colSpan}/12`} size="small" variant="outlined" />
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

function FieldPreview({ field }: { field: DynamicFormField }) {
  if (field.type === "boolean") {
    return <FormControlLabel control={<Checkbox disabled />} label={field.label} />;
  }

  if (field.type === "singleSelect" || field.type === "multiSelect") {
    return (
      <Select size="small" fullWidth multiple={field.type === "multiSelect"} value={[]} disabled displayEmpty>
        {(field.options ?? []).map((option) => (
          <MenuItem key={option.code} value={option.code}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    );
  }

  return (
    <TextField
      fullWidth
      size="small"
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      multiline={field.type === "longText"}
      minRows={field.type === "longText" ? 3 : undefined}
      label={field.label}
      disabled
      InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
    />
  );
}

function FieldSettingsPanel({
  field,
  readOnly,
  onChange,
}: {
  field: DynamicFormField | null;
  readOnly: boolean;
  onChange: (patch: Partial<DynamicFormField>) => void;
}) {
  if (!field) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
        <Typography color="text.secondary">No field selected</Typography>
      </Paper>
    );
  }

  const optionText = (field.options ?? [])
    .map((option) => `${option.code}:${option.label}`)
    .join("\n");

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
      <Stack spacing={1.5}>
        <Typography fontWeight={800}>Field</Typography>
        <TextField
          size="small"
          label="Label"
          value={field.label}
          disabled={readOnly}
          onChange={(e) => onChange({ label: e.target.value })}
        />
        <TextField
          size="small"
          label="Key"
          value={field.key}
          disabled={readOnly}
          onChange={(e) => onChange({ key: e.target.value })}
        />
        <Select
          size="small"
          value={field.type}
          disabled={readOnly}
          onChange={(e: SelectChangeEvent) => {
            const nextType = e.target.value as DynamicFormFieldType;
            onChange({
              type: nextType,
              options:
                nextType === "singleSelect" || nextType === "multiSelect"
                  ? field.options?.length
                    ? field.options
                    : [{ code: "A", label: "Option A" }]
                  : undefined,
              statistic: field.isStatistic
                ? { ...defaultStatistic(), aggregateOps: defaultAggregateOps(nextType) }
                : undefined,
            });
          }}
        >
          {Object.entries(fieldTypeLabels).map(([type, label]) => (
            <MenuItem key={type} value={type}>
              {label}
            </MenuItem>
          ))}
        </Select>

        <LabelPicker
          value={field.labelCodes ?? []}
          disabled={readOnly}
          label="Field labels"
          placeholder="Chọn nhãn field"
          onChange={(codes) => onChange({ labelCodes: codes })}
        />

        <Grid container spacing={1}>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Cols"
              type="number"
              value={field.colSpan}
              disabled={readOnly}
              inputProps={{ min: 3, max: 12 }}
              onChange={(e) => onChange({ colSpan: Number(e.target.value) })}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Height"
              type="number"
              value={field.minHeight}
              disabled={readOnly}
              inputProps={{ min: 56, max: 320 }}
              onChange={(e) => onChange({ minHeight: Number(e.target.value) })}
            />
          </Grid>
        </Grid>

        <FormControlLabel
          control={
            <Switch
              checked={field.required}
              disabled={readOnly}
              onChange={(e) => onChange({ required: e.target.checked })}
            />
          }
          label="Required"
        />

        <FormControlLabel
          control={
            <Switch
              checked={field.isStatistic}
              disabled={readOnly}
              onChange={(e) =>
                onChange({
                  isStatistic: e.target.checked,
                  statistic: e.target.checked
                    ? { ...defaultStatistic(), aggregateOps: defaultAggregateOps(field.type) }
                    : undefined,
                })
              }
            />
          }
          label="Statistic"
        />

        {field.isStatistic && (
          <Stack spacing={1}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.statistic?.showInDetail ?? true}
                  disabled={readOnly}
                  onChange={(e) =>
                    onChange({
                      statistic: {
                        ...(field.statistic ?? defaultStatistic()),
                        showInDetail: e.target.checked,
                      },
                    })
                  }
                />
              }
              label="Detail"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.statistic?.showInTree ?? false}
                  disabled={readOnly}
                  onChange={(e) =>
                    onChange({
                      statistic: {
                        ...(field.statistic ?? defaultStatistic()),
                        showInTree: e.target.checked,
                      },
                    })
                  }
                />
              }
              label="Tree"
            />
          </Stack>
        )}

        {(field.type === "singleSelect" || field.type === "multiSelect") && (
          <TextField
            size="small"
            label="Options"
            value={optionText}
            disabled={readOnly}
            multiline
            minRows={4}
            onChange={(e) =>
              onChange({
                options: e.target.value
                  .split("\n")
                  .map((line, index) => {
                    const [rawCode, ...rest] = line.split(":");
                    const code = rawCode?.trim() || `OPT_${index + 1}`;
                    const label = rest.join(":").trim() || code;
                    return { code, label };
                  })
                  .filter((option) => option.code),
              })
            }
          />
        )}
      </Stack>
    </Paper>
  );
}

type ExcelBlockLabelField = "labelCodes" | "allowedLabelCodes";

function getExcelBlockLabelCodes(
  json: string | null | undefined,
  field: ExcelBlockLabelField,
): string[] {
  const obj = parseExcelBlockJson(json);
  const value = obj?.[field];
  return Array.isArray(value)
    ? normalizeLabelCodes(value.filter((item): item is string => typeof item === "string"))
    : [];
}

function setExcelBlockLabelCodes(
  json: string | null | undefined,
  field: ExcelBlockLabelField,
  codes: string[],
): string | null {
  const obj = parseExcelBlockJson(json);
  if (!obj) return json ?? null;

  const normalized = normalizeLabelCodes(codes);
  if (normalized.length === 0) {
    delete obj[field];
  } else {
    obj[field] = normalized;
  }

  return JSON.stringify(obj);
}

type ExcelBlockDataRect = {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
};

type ExcelBlockLabelColumn = {
  sheetId?: string;
  columnIndex?: number;
  mode?: "single" | "split";
  separator?: string;
};

type ExcelBlockRowLabelDefault = {
  sheetId?: string;
  rowKey?: string;
  rowIndex?: number;
  labelCodes?: string[];
  locked?: boolean;
  source?: string;
};

function getExcelBlockTableMode(json: string | null | undefined): DynamicFormTableMode {
  const obj = parseExcelBlockJson(json);
  return normalizeTableMode(obj?.tableMode);
}

function setExcelBlockTableMode(
  json: string | null | undefined,
  tableMode: DynamicFormTableMode,
): string | null {
  const obj = parseExcelBlockJson(json);
  if (!obj) return json ?? null;

  obj.tableMode = normalizeTableMode(tableMode);
  obj.blockId = getExcelBlockBlockId(obj);
  if (obj.tableMode === "FIXED_GRID" && !Array.isArray(obj.indexMap)) {
    obj.indexMap = buildFixedGridIndexMap(obj);
  } else if (obj.tableMode !== "FIXED_GRID") {
    delete obj.indexMap;
  }

  return JSON.stringify(obj);
}

function getExcelBlockIndexMapCount(json: string | null | undefined): number {
  const obj = parseExcelBlockJson(json);
  return Array.isArray(obj?.indexMap) ? obj.indexMap.length : 0;
}

function getExcelBlockDataRows(json: string | null | undefined): number[] {
  const rect = getExcelBlockDataRect(json);
  if (!rect) return [];

  const r0 = Math.max(0, Math.floor(rect.r0));
  const r1 = Math.max(r0, Math.floor(rect.r1));
  return Array.from({ length: r1 - r0 + 1 }, (_, index) => r0 + index);
}

function getExcelBlockLabelColumnsText(json: string | null | undefined): string {
  const obj = parseExcelBlockJson(json);
  const columns = Array.isArray(obj?.labelColumns) ? obj.labelColumns : [];
  return columns
    .map((item) =>
      item && typeof item === "object"
        ? Number((item as ExcelBlockLabelColumn).columnIndex)
        : NaN,
    )
    .filter((value) => Number.isInteger(value) && value >= 0)
    .map((value) => String(value + 1))
    .join(", ");
}

function setExcelBlockLabelColumnsFromText(
  json: string | null | undefined,
  text: string,
): string | null {
  const obj = parseExcelBlockJson(json);
  if (!obj) return json ?? null;

  const columns = Array.from(
    new Set(
      text
        .split(/[,\s;]+/)
        .map((part) => Number(part.trim()))
        .filter((value) => Number.isInteger(value) && value > 0)
        .map((value) => value - 1),
    ),
  ).sort((a, b) => a - b);

  if (columns.length === 0) {
    delete obj.labelColumns;
  } else {
    obj.labelColumns = columns.map((columnIndex) => ({
      sheetId: "sheet_1",
      columnIndex,
      mode: "split",
      separator: ";",
    }));
  }

  return JSON.stringify(obj);
}

function getExcelBlockRowDefaultCodes(
  json: string | null | undefined,
  rowIndex: number,
): string[] {
  const row = getExcelBlockRowDefault(json, rowIndex);
  return normalizeLabelCodes(row?.labelCodes);
}

function setExcelBlockRowDefaultCodes(
  json: string | null | undefined,
  rowIndex: number,
  codes: string[],
): string | null {
  const obj = parseExcelBlockJson(json);
  if (!obj) return json ?? null;

  const normalized = normalizeLabelCodes(codes);
  const rows = Array.isArray(obj.rowLabelDefaults)
    ? (obj.rowLabelDefaults.filter(
        (item) => item && typeof item === "object",
      ) as ExcelBlockRowLabelDefault[])
    : [];
  const nextRows = rows.filter((row) => getRowIndex(row) !== rowIndex);

  if (normalized.length > 0) {
    nextRows.push({
      sheetId: "sheet_1",
      rowKey: buildRowKey(rowIndex),
      rowIndex,
      labelCodes: normalized,
      locked: false,
      source: "TEMPLATE_SAMPLE",
    });
  }

  if (nextRows.length === 0) {
    delete obj.rowLabelDefaults;
  } else {
    obj.rowLabelDefaults = nextRows.sort((a, b) => getRowIndex(a) - getRowIndex(b));
  }

  return JSON.stringify(obj);
}

function getExcelBlockDataRect(json: string | null | undefined): ExcelBlockDataRect | null {
  const obj = parseExcelBlockJson(json);
  const raw = obj?.dataRect;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const rect = raw as Record<string, unknown>;
  const r0 = Number(rect.r0 ?? rect.R0);
  const c0 = Number(rect.c0 ?? rect.C0);
  const r1 = Number(rect.r1 ?? rect.R1);
  const c1 = Number(rect.c1 ?? rect.C1);
  if (![r0, c0, r1, c1].every(Number.isFinite)) return null;
  if (r1 < r0 || c1 < c0) return null;

  return { r0, c0, r1, c1 };
}

function getExcelBlockRowDefault(
  json: string | null | undefined,
  rowIndex: number,
): ExcelBlockRowLabelDefault | null {
  const obj = parseExcelBlockJson(json);
  const rows = Array.isArray(obj?.rowLabelDefaults) ? obj.rowLabelDefaults : [];
  return (
    (rows.find(
      (item) => item && typeof item === "object" && getRowIndex(item as ExcelBlockRowLabelDefault) === rowIndex,
    ) as ExcelBlockRowLabelDefault | undefined) ?? null
  );
}

function getRowIndex(row: ExcelBlockRowLabelDefault) {
  const value = Number(row.rowIndex);
  if (Number.isInteger(value) && value >= 0) return value;

  const match = typeof row.rowKey === "string" ? row.rowKey.match(/R(\d+)$/i) : null;
  return match ? Number(match[1]) - 1 : Number.MAX_SAFE_INTEGER;
}

function buildRowKey(rowIndex: number) {
  return `sheet_1:R${rowIndex + 1}`;
}

function parseExcelBlockJson(json: string | null | undefined): Record<string, unknown> | null {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getExcelBlockBlockId(obj: Record<string, unknown>) {
  const raw =
    typeof obj.blockId === "string"
      ? obj.blockId
      : typeof obj.id === "string"
        ? obj.id
        : typeof obj.dynamicExcelTemplateId === "string"
          ? `excel_${obj.dynamicExcelTemplateId}`
          : "excel_block";

  return normalizeMetricPart(raw, "excel_block");
}

function buildFixedGridIndexMap(obj: Record<string, unknown>) {
  const blockId = getExcelBlockBlockId(obj);
  const width = getPositiveInt(obj.w ?? obj.W);
  const height = getPositiveInt(obj.h ?? obj.H);
  if (width <= 0 || height <= 0) return [];

  return Array.from({ length: width * height }, (_, index) => {
    const rowKey = `row_${Math.floor(index / width) + 1}`;
    const columnKey = `col_${(index % width) + 1}`;
    return {
      index,
      rowKey,
      columnKey,
      metricKey: `table:${blockId}.row:${rowKey}.column:${columnKey}`,
    };
  });
}

function getPositiveInt(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function normalizeMetricPart(value: unknown, fallback: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}
