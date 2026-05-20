import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
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
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import NumbersIcon from "@mui/icons-material/Numbers";
import EventIcon from "@mui/icons-material/Event";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import ChecklistIcon from "@mui/icons-material/Checklist";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";

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
  defaultOptionLabelForFieldType,
  defaultOptionsForFieldType,
  defaultStatistic,
  fieldTypeLabels,
  getDynamicFormFieldDisplayName,
  getDynamicFormFieldNameValue,
  getDynamicFormBlockJsonList,
  isGenericFieldDisplayName,
  MAX_DYNAMIC_FORM_FIELDS,
  MAX_DYNAMIC_FORM_TABLE_BLOCKS,
  appendDynamicFormBlockJson,
  excelSpecKindLabels,
  normalizeFields,
  normalizeSections,
  removeDynamicFormBlockJson,
  tableModeLabels,
  toSubmit,
} from "../dynamicFormSchema";
import LabelPicker from "../../../components/labels/LabelPicker";
import LabelManagerDialog from "../../../components/labels/LabelManagerDialog";
import { DynamicExcelPicker } from "../../../components/works/assignments/DynamicExcelPicker";
import type { LabelDataType } from "../../../api/labelApi";
import { useGetDynamicExcelQuery } from "../../../api/dynamicExcelApi";
import { dataTypeLabel } from "../../../components/excel/fortune/dataTypes";
import DynamicExcelConfigDialog from "../../../components/excel/fortune/DynamicExcelConfigDialog";
import WorkbookDataGrid from "../../../components/excel/fortune/WorkbookDataGrid";
import { UITextKey, uiText } from '../../../constants/uiText';

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  initialValue: DynamicFormEditorValue;
  busy?: boolean;
  locked?: boolean;
  allowStatisticConfigEdit?: boolean;
  onBack: () => void;
  onSave?: (payload: DynamicFormEditorSubmit) => Promise<void>;
  onPublish?: () => Promise<void>;
  onImportDynamicExcelBlock?: (
    dynamicExcelId: string,
    sectionId?: string | null,
  ) => Promise<DynamicFormEditorValue | null>;
  onBuildDynamicExcelBlock?: (
    dynamicExcelId: string,
    sectionId?: string | null,
  ) => Promise<string | null>;
};

const palette: Array<{ type: DynamicFormFieldType; icon: React.ReactNode }> = [
  { type: "shortText", icon: <ShortTextIcon fontSize="small" /> },
  { type: "longText", icon: <SubjectIcon fontSize="small" /> },
  { type: "stringList", icon: <FormatListBulletedIcon fontSize="small" /> },
  { type: "number", icon: <NumbersIcon fontSize="small" /> },
  { type: "date", icon: <EventIcon fontSize="small" /> },
  { type: "fullDate", icon: <EventIcon fontSize="small" /> },
  { type: "singleSelect", icon: <RadioButtonCheckedIcon fontSize="small" /> },
  { type: "multiSelect", icon: <ChecklistIcon fontSize="small" /> },
  { type: "boolean", icon: <CheckBoxIcon fontSize="small" /> },
];

const fieldTypeSelectOptions = Object.entries(fieldTypeLabels);

function fieldTypeButtonLabel(type: DynamicFormFieldType) {
  if (type === "date") return "Ngày/kỳ";
  if (type === "fullDate") return "Ngày đầy đủ";
  return fieldTypeLabels[type];
}

function fieldTypeTooltip(type: DynamicFormFieldType) {
  if (type === "date") return "Ngày/kỳ: nhập dd/MM/yyyy, MM/yyyy hoặc yyyy.";
  if (type === "fullDate") return "Ngày đầy đủ: nhập dd/MM/yyyy.";
  if (type === "longText") return "Nội dung dài một ô, giữ tương thích với kiểu nội dung cũ.";
  if (type === "stringList") return "Danh sách nội dung: nhập nhiều ý tự do để nối chuỗi, tìm kiếm và xuất dữ liệu.";
  return fieldTypeLabels[type];
}

function FieldTypePaletteButton({
  item,
  onClick,
}: {
  item: { type: DynamicFormFieldType; icon: React.ReactNode };
  onClick: () => void;
}) {
  const label = fieldTypeButtonLabel(item.type);

  return (
    <Tooltip title={fieldTypeTooltip(item.type)}>
      <Button
        fullWidth
        variant="outlined"
        startIcon={item.icon}
        onClick={onClick}
        sx={{
          minHeight: 34,
          justifyContent: "flex-start",
          textTransform: "none",
          px: 1,
          py: 0.5,
          minWidth: 0,
          "& .MuiButton-startIcon": {
            ml: 0,
            mr: 0.75,
            flexShrink: 0,
          },
        }}
      >
        <Box
          component="span"
          sx={{
            display: "block",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "0.86rem",
            fontWeight: 650,
            lineHeight: 1.2,
          }}
        >
          {label}
        </Box>
      </Button>
    </Tooltip>
  );
}

export default function DynamicFormEditor({
  mode,
  initialValue,
  busy = false,
  locked = false,
  allowStatisticConfigEdit = false,
  onBack,
  onSave,
  onPublish,
  onImportDynamicExcelBlock,
  onBuildDynamicExcelBlock,
}: Props) {
  const readOnly = mode === "view" || locked;
  const statisticReadOnly = mode === "view" || (locked && !allowStatisticConfigEdit);
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
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [importingBlock, setImportingBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);

  const sections = useMemo(() => normalizeSections(value.sections), [value.sections]);
  const fields = useMemo(
    () => normalizeFields(value.fields, sections, { trimDisplayNames: false }),
    [sections, value.fields],
  );
  const selectedSection = sections.find((x) => x.id === selectedSectionId) ?? sections[0];
  const selectedField = fields.find((x) => x.id === selectedFieldId) ?? null;
  const excelBlockJsonList = useMemo(
    () => getDynamicFormBlockJsonList(value.blocksJson, value.excelBlockJson, sections[0]?.id),
    [sections, value.blocksJson, value.excelBlockJson],
  );
  const effectiveSelectedBlockIndex = Math.min(
    selectedBlockIndex,
    Math.max(0, excelBlockJsonList.length - 1),
  );
  const selectedExcelBlockJson = excelBlockJsonList[effectiveSelectedBlockIndex] ?? null;
  const dynamicExcelTemplateIdsInForm = useMemo(
    () =>
      new Set(
        excelBlockJsonList
          .map(getExcelBlockDynamicExcelTemplateId)
          .filter((id): id is string => Boolean(id)),
      ),
    [excelBlockJsonList],
  );
  const canAttachDynamicExcelBlock =
    !readOnly && Boolean(onImportDynamicExcelBlock || onBuildDynamicExcelBlock);
  const attachDynamicExcelBlockDisabled =
    busy || importingBlock || excelBlockJsonList.length >= MAX_DYNAMIC_FORM_TABLE_BLOCKS;

  const setPatch = (patch: Partial<DynamicFormEditorValue>) =>
    setValue((current) => ({ ...current, ...patch }));

  const removeExcelBlockAt = (blockIndex: number) => {
    const blockJson = excelBlockJsonList[blockIndex];
    if (!blockJson) return;
    const ok = window.confirm("Xóa bảng này khỏi bản nháp biểu mẫu?");
    if (!ok) return;

    const nextPatch = removeDynamicFormBlockJson(
      value.blocksJson,
      value.excelBlockJson,
      blockIndex,
    );
    setPatch(nextPatch);
    setSelectedBlockIndex(Math.max(0, blockIndex - 1));
  };

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
      title: `Phần ${sections.length + 1}`,
      description: null,
      order: sections.length,
    };
    setValue((current) => ({ ...current, sections: [...current.sections, next] }));
    setSelectedSectionId(next.id);
    setSelectedFieldId(null);
  };

  const addField = (type: DynamicFormFieldType) => {
    if (!selectedSection) return;
    if (fields.length >= MAX_DYNAMIC_FORM_FIELDS) {
      setError(`Biểu mẫu động chỉ được có tối đa ${MAX_DYNAMIC_FORM_FIELDS} trường dữ liệu.`);
      return;
    }

    const field = createDefaultField(
      type,
      selectedSection.id,
      fields.filter((x) => x.sectionId === selectedSection.id).length,
    );
    setValue((current) => ({ ...current, fields: [...current.fields, field] }));
    setSelectedFieldId(field.id);
  };

  const importDynamicExcelBlock = async (dynamicExcelId: string) => {
    if ((!onImportDynamicExcelBlock && !onBuildDynamicExcelBlock) || readOnly || importingBlock) return;
    if (dynamicExcelTemplateIdsInForm.has(dynamicExcelId)) {
      setError("Bảng Excel động này đã tồn tại trong biểu mẫu. Không được thêm lại ở cùng phần hoặc phần khác.");
      return;
    }
    if (excelBlockJsonList.length >= MAX_DYNAMIC_FORM_TABLE_BLOCKS) {
      setError(`Biểu mẫu động chỉ được có tối đa ${MAX_DYNAMIC_FORM_TABLE_BLOCKS} bảng Excel động.`);
      return;
    }

    setImportingBlock(true);
    setError(null);
    try {
      if (onImportDynamicExcelBlock) {
        const next = await onImportDynamicExcelBlock(dynamicExcelId, selectedSection?.id ?? null);
        if (next) {
          const nextSections = normalizeSections(next.sections);
          setValue({
            ...next,
            sections: nextSections,
            fields: normalizeFields(next.fields, nextSections),
          });
          const nextBlocks = getDynamicFormBlockJsonList(next.blocksJson, next.excelBlockJson);
          setSelectedBlockIndex(Math.max(0, nextBlocks.length - 1));
          setSelectedFieldId(null);
        }
      } else if (onBuildDynamicExcelBlock) {
        const nextBlockJson = await onBuildDynamicExcelBlock(dynamicExcelId, selectedSection?.id ?? null);
        if (nextBlockJson) {
          const nextId = getExcelBlockDynamicExcelTemplateId(nextBlockJson);
          if (nextId && dynamicExcelTemplateIdsInForm.has(nextId)) {
            setError("Bảng Excel động này đã tồn tại trong biểu mẫu. Không được thêm lại ở cùng phần hoặc phần khác.");
            return;
          }
          const nextPatch = appendDynamicFormBlockJson(
            value.blocksJson,
            value.excelBlockJson,
            nextBlockJson,
          );
          const next = { ...value, ...nextPatch };
          const nextSections = normalizeSections(next.sections);
          setValue({
            ...next,
            sections: nextSections,
            fields: normalizeFields(next.fields, nextSections),
          });
          const nextBlocks = getDynamicFormBlockJsonList(next.blocksJson, next.excelBlockJson);
          setSelectedBlockIndex(Math.max(0, nextBlocks.length - 1));
          setSelectedFieldId(null);
        }
      }
    } catch (err) {
      setError(readErrorMessage(err, "Không nhập được bảng Excel động."));
    } finally {
      setImportingBlock(false);
    }
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
    if (!onSave || (readOnly && !allowStatisticConfigEdit)) return;
    try {
      const blankSection = value.sections.find((section) => !section.title?.trim());
      if (blankSection) {
        setPreview(false);
        setSelectedSectionId(blankSection.id);
        setError("Tiêu đề phần không được để trống.");
        return;
      }

      if (excelBlockJsonList.length > MAX_DYNAMIC_FORM_TABLE_BLOCKS) {
        setError(`Biểu mẫu động chỉ được có tối đa ${MAX_DYNAMIC_FORM_TABLE_BLOCKS} bảng Excel động.`);
        return;
      }

      if (fields.length > MAX_DYNAMIC_FORM_FIELDS) {
        setError(`Biểu mẫu động chỉ được có tối đa ${MAX_DYNAMIC_FORM_FIELDS} trường dữ liệu.`);
        return;
      }

      const payload = toSubmit({ ...value, sections, fields });
      if (!payload.name) {
        setError("Tên biểu mẫu không được để trống.");
        return;
      }
      setError(null);
      await onSave(payload);
    } catch (err) {
      setError(readErrorMessage(err, "Không lưu được biểu mẫu động."));
    }
  };

  const selectedSectionFields = fields.filter((x) => x.sectionId === selectedSection?.id);
  const excelBlocksInSelectedSection = excelBlockJsonList
    .map((blockJson, index) => ({ blockJson, index }))
    .filter(({ blockJson }) => {
      const sectionId = getExcelBlockSectionId(blockJson) ?? sections[0]?.id ?? "";
      return sectionId === selectedSection?.id;
    });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Tooltip title={uiText(UITextKey.TextBack)}>
            <IconButton onClick={onBack}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Biểu mẫu động
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {value.code || "Biểu mẫu mới"}
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
              Công bố
            </Button>
          )}

          {(!readOnly || allowStatisticConfigEdit) && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={save}
              disabled={busy || importingBlock}
            >
              Lưu
            </Button>
          )}
        </Stack>
      </Stack>

      {locked && (
        <Alert severity="info">
          Biểu mẫu đã công bố chỉ được xem. Các trường/cột thống kê vẫn có thể cập nhật theo giới hạn hằng tháng.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Stack spacing={1.5}>
              <TextField size="small" label={uiText(UITextKey.TextMa2)} value={value.code ?? ""} disabled />
              <DebouncedTextField
                size="small"
                label={uiText(UITextKey.TextTenForm)}
                value={value.name}
                disabled={readOnly}
                onCommit={(name) => setPatch({ name })}
              />
              <DebouncedTextField
                size="small"
                label={uiText(UITextKey.TextMoTa)}
                multiline
                minRows={3}
                value={value.description ?? ""}
                disabled={readOnly}
                onCommit={(description) => setPatch({ description })}
              />
              <LabelPicker
                value={value.tagCodes}
                disabled={readOnly}
                usage="tag"
                label={uiText(UITextKey.TextFormLabels)}
                placeholder={uiText(UITextKey.TextChonNhanForm)}
                onChange={(codes) => setPatch({ tagCodes: codes })}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<LabelOutlinedIcon />}
                onClick={() => setLabelManagerOpen(true)}
              >
                Quản lý nhãn
              </Button>
              <FormControlLabel
                control={
                  <Switch
                    checked={value.isActive}
                    disabled={readOnly}
                    onChange={(e) => setPatch({ isActive: e.target.checked })}
                  />
                }
                label={uiText(UITextKey.TextActive)}
              />

              <Divider />

              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography fontWeight={700}>{uiText(UITextKey.TextSections)}</Typography>
                {!readOnly && (
                  <Tooltip title={uiText(UITextKey.TextAddSection)}>
                    <span>
                    <IconButton
                      size="small"
                      onClick={addSection}
                      disabled={preview}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Stack>

              <Typography variant="caption" color="text.secondary">
                {sections.length} phần
              </Typography>

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
                    {getSectionTitleLabel(section)}
                  </Button>
                ))}
              </Stack>

              <Divider />

              {!readOnly && !preview && (
                <Stack spacing={1}>
                  <Typography fontWeight={700}>{uiText(UITextKey.TextFields)}</Typography>
                  <Grid container spacing={0.75}>
                    {palette.map((item) => (
                      <Grid key={item.type} size={{ xs: 6 }}>
                        <FieldTypePaletteButton item={item} onClick={() => addField(item.type)} />
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
                    <DebouncedTextField
                      size="small"
                      label={uiText(UITextKey.TextSectionTitle)}
                      value={selectedSection.title}
                      disabled={readOnly}
                      resetKey={selectedSection.id}
                      error={!selectedSection.title.trim()}
                      helperText={!selectedSection.title.trim() ? "Tiêu đề phần không được để trống." : undefined}
                      onCommit={(title) => updateSection(selectedSection.id, { title })}
                    />
                    <DebouncedTextField
                      size="small"
                      label={uiText(UITextKey.TextSectionDescription)}
                      value={selectedSection.description ?? ""}
                      disabled={readOnly}
                      resetKey={selectedSection.id}
                      onCommit={(description) =>
                        updateSection(selectedSection.id, { description })
                      }
                    />
                    <LabelPicker
                      value={selectedSection.tagCodes ?? []}
                      disabled={readOnly}
                      usage="tag"
                      label={uiText(UITextKey.TextSectionLabels)}
                      placeholder={uiText(UITextKey.TextChonNhanSection)}
                      onChange={(codes) =>
                        updateSection(selectedSection.id, { tagCodes: codes })
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
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "flex-start" }}
                    justifyContent="space-between"
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={800}>{selectedSection ? getSectionTitleLabel(selectedSection) : ""}</Typography>
                      {selectedSection?.description && (
                        <Typography variant="body2" color="text.secondary">
                          {selectedSection.description}
                        </Typography>
                      )}
                    </Box>

                    {canAttachDynamicExcelBlock && (
                      <Box sx={{ width: { xs: "100%", sm: 260 }, flexShrink: 0 }}>
                        <DynamicExcelPicker
                          value={null}
                          onChange={(item) => {
                            if (item?.id) void importDynamicExcelBlock(item.id);
                          }}
                          disabled={attachDynamicExcelBlockDisabled}
                          triggerMode="button"
                          triggerLabel="Thêm bảng biểu động"
                        />
                      </Box>
                    )}
                  </Stack>

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
                    {excelBlocksInSelectedSection.map(({ blockJson, index }) => (
                      <Grid key={`${getExcelBlockTitle(blockJson, index)}_${index}`} size={{ xs: 12 }}>
                        <ExcelBlockCard
                          blockJson={blockJson}
                          index={index}
                          selected={index === effectiveSelectedBlockIndex && !selectedFieldId}
                          preview={preview}
                          readOnly={readOnly}
                          onSelect={() => {
                            setSelectedBlockIndex(index);
                            setSelectedFieldId(null);
                          }}
                          onRemove={() => {
                            removeExcelBlockAt(index);
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>

                  {selectedSectionFields.length === 0 && excelBlocksInSelectedSection.length === 0 && (
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
                      <Typography color="text.secondary">{uiText(UITextKey.TextNoFields)}</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            {selectedExcelBlockJson && !selectedField ? (
              <ExcelBlockSummaryPanel blockJson={selectedExcelBlockJson} />
            ) : (
              <FieldSettingsPanel
                field={selectedField}
                readOnly={readOnly}
                statisticReadOnly={statisticReadOnly}
                onChange={(patch) => {
                  if (!selectedField) return;
                  updateField(selectedField.id, patch);
                }}
              />
            )}
          </Grid>
        </Grid>
      </Paper>

      <LabelManagerDialog
        open={labelManagerOpen}
        onClose={() => setLabelManagerOpen(false)}
      />
    </Box>
  );
}

function getSectionTitleLabel(section: Pick<DynamicFormSection, "title">) {
  return section.title?.trim() || "Chưa đặt tiêu đề";
}

function ExcelBlockCard({
  blockJson,
  index,
  selected,
  preview,
  readOnly,
  onSelect,
  onRemove,
}: {
  blockJson: string;
  index: number;
  selected: boolean;
  preview: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const obj = parseExcelBlockJson(blockJson);
  const summary = getExcelBlockConfigSummary(blockJson);
  const code =
    readBlockString(obj?.dynamicExcelCode) ??
    readBlockString(obj?.DynamicExcelCode) ??
    readBlockString(obj?.dynamicExcelTemplateId);

  return (
    <Paper
      variant="outlined"
      onClick={onSelect}
      sx={{
        p: 1.25,
        borderRadius: 1,
        borderColor: selected ? "primary.main" : "divider",
        cursor: "pointer",
        bgcolor: selected ? "action.selected" : "background.paper",
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} noWrap>
              {getExcelBlockTitle(blockJson, index)}
            </Typography>
            {code && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {code}
              </Typography>
            )}
          </Box>
          {!readOnly && (
            <Tooltip title={uiText(UITextKey.TextRemoveBlock)}>
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove();
                }}
              >
                <DeleteOutlineIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Chip size="small" color="primary" variant="outlined" label="Bảng Excel động" />
          <Chip size="small" variant="outlined" label={summary.specKindLabel} />
          <Chip size="small" variant="outlined" label={summary.tableModeLabel} />
        </Stack>
        {preview && <ExcelBlockWorkbookPreview blockJson={blockJson} />}
      </Stack>
    </Paper>
  );
}

function ExcelBlockWorkbookPreview({ blockJson }: { blockJson: string }) {
  const summary = getExcelBlockConfigSummary(blockJson);
  const dynamicExcelId = summary.dynamicExcelId ?? "";
  const { data, isLoading, isError } = useGetDynamicExcelQuery(
    { id: dynamicExcelId },
    { skip: !dynamicExcelId },
  );

  const parsed = useMemo(() => {
    if (!data) return null;
    const dataRect = summary.dataRect ?? data.dataRect;
    if (!dataRect) return null;

    return {
      spec: safeParseJson(data.specJson, null),
      workbook: safeParseJson<any[]>(data.rawWorkbookDataJson, []) ?? [],
      dataRect,
    };
  }, [data, summary.dataRect]);

  if (!dynamicExcelId) {
    return (
      <Alert severity="warning" sx={{ mt: 0.5 }}>
        Bảng chưa có mã Excel động để xem trước.
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 160 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  if (isError || !parsed) {
    return <Alert severity="error">Không tải được bảng Excel động để xem trước.</Alert>;
  }

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: 260,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <WorkbookDataGrid
        initialSpec={parsed.spec}
        initialWorkbookData={parsed.workbook}
        dataRect={parsed.dataRect}
        mode="view"
        readOnly
        showActions={false}
      />
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
  const displayName = getDynamicFormFieldDisplayName(field);
  const nameMissing = !getDynamicFormFieldNameValue(field);
  const nameGeneric = isGenericFieldDisplayName(field.type, getDynamicFormFieldNameValue(field));

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
              {displayName}
            </Typography>
            {(nameMissing || nameGeneric) && (
              <Chip label="Cần đặt tên" size="small" color="warning" variant="outlined" />
            )}
            {field.required && <Chip label={uiText(UITextKey.TextRequired)} size="small" variant="outlined" />}
            {field.isStatistic && <Chip label={uiText(UITextKey.TextStat)} size="small" color="primary" variant="outlined" />}
          </Stack>

          {!preview && !readOnly && (
            <Stack direction="row" spacing={0.25}>
              <Tooltip title={uiText(UITextKey.TextUp)}>
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
              <Tooltip title={uiText(UITextKey.TextDown)}>
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
              <Tooltip title={uiText(UITextKey.TextDelete)}>
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
            <Chip label={fieldTypeLabels[field.type]} size="small" variant="outlined" />
            <Chip label={`Rộng ${field.colSpan}/12`} size="small" variant="outlined" />
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

function FieldPreview({ field }: { field: DynamicFormField }) {
  const displayName = getDynamicFormFieldDisplayName(field);

  if (field.type === "boolean") {
    return <FormControlLabel control={<Checkbox disabled />} label={displayName} />;
  }

  if (field.type === "shortText" || field.type === "singleSelect" || field.type === "multiSelect") {
    return (
      <Select
        size="small"
        fullWidth
        multiple={field.type === "multiSelect"}
        value={field.type === "multiSelect" ? [] : ""}
        disabled
        displayEmpty
        renderValue={(selected) => {
          const selectedValues = Array.isArray(selected) ? selected : selected ? [selected] : [];
          if (selectedValues.length === 0) {
            return (
              <Typography component="span" color="text.secondary">
                Chưa chọn
              </Typography>
            );
          }

          return selectedValues
            .map((code) => field.options?.find((option) => option.code === code)?.label ?? code)
            .join(", ");
        }}
      >
        <MenuItem value="" disabled>
          Chưa chọn
        </MenuItem>
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
      type={field.type === "number" ? "number" : "text"}
      multiline={field.type === "longText" || field.type === "stringList"}
      minRows={field.type === "longText" || field.type === "stringList" ? 3 : undefined}
      label={displayName}
      disabled
      placeholder={
        field.type === "date"
          ? "dd/MM/yyyy, MM/yyyy hoặc yyyy"
          : field.type === "fullDate"
            ? "dd/MM/yyyy"
            : undefined
      }
      InputLabelProps={field.type === "date" || field.type === "fullDate" ? { shrink: true } : undefined}
    />
  );
}

function ExcelBlockSummaryPanel({ blockJson }: { blockJson: string }) {
  const obj = parseExcelBlockJson(blockJson);
  const [configOpen, setConfigOpen] = useState(false);
  const summary = getExcelBlockConfigSummary(blockJson);
  const code =
    readBlockString(obj?.dynamicExcelCode) ??
    readBlockString(obj?.DynamicExcelCode) ??
    readBlockString(obj?.dynamicExcelTemplateId);

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
        <Stack spacing={1.5}>
          <Typography fontWeight={800}>Bảng Excel động</Typography>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Tên bảng
            </Typography>
            <Typography fontWeight={700}>{getExcelBlockTitle(blockJson, 0).replace(/^1\.\s*/, "")}</Typography>
          </Box>
          {code && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Mã bảng
              </Typography>
              <Typography>{code}</Typography>
            </Box>
          )}
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip size="small" color="primary" variant="outlined" label="Bảng Excel động" />
            <Chip size="small" variant="outlined" label={summary.specKindLabel} />
            <Chip size="small" variant="outlined" label={summary.tableModeLabel} />
            <Chip size="small" variant="outlined" label={`Vùng dữ liệu: ${summary.dataRangeLabel}`} />
            <Chip size="small" variant="outlined" label={`Kiểu dữ liệu mặc định: ${summary.defaultDataTypeLabel}`} />
          </Stack>
          <Divider />
          <Stack spacing={1}>
            <Typography fontWeight={700}>Cấu hình bảng</Typography>
            <Typography variant="body2" color="text.secondary">
              Bảng chỉ tạo chỉ tiêu thống kê khi biểu mẫu cấu hình rõ ô, dòng, cột hoặc vùng cần tổng hợp.
              Hệ thống không sinh chỉ tiêu cho toàn bộ ô trong vùng dữ liệu.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              disabled={!summary.dynamicExcelId}
              onClick={() => setConfigOpen(true)}
              sx={{ alignSelf: "flex-start" }}
            >
              Xem cấu hình bảng
            </Button>
          </Stack>
        </Stack>
      </Paper>
      <DynamicExcelConfigDialog
        open={configOpen}
        dynamicExcelId={summary.dynamicExcelId}
        onClose={() => setConfigOpen(false)}
      />
    </>
  );
}

function FieldSettingsPanel({
  field,
  readOnly,
  statisticReadOnly,
  onChange,
}: {
  field: DynamicFormField | null;
  readOnly: boolean;
  statisticReadOnly: boolean;
  onChange: (patch: Partial<DynamicFormField>) => void;
}) {
  if (!field) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
        <Typography color="text.secondary">{uiText(UITextKey.TextNoFieldSelected)}</Typography>
      </Paper>
    );
  }

  const canUseCurrentStatistic = canUseFieldStatistic(field.type);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
      <Stack spacing={1.5}>
        <Typography fontWeight={800}>{uiText(UITextKey.TextField)}</Typography>
        <FieldNameTextField
          field={field}
          disabled={readOnly}
          onCommit={(name) => onChange({ name })}
        />
        <Select
          size="small"
          value={field.type}
          disabled={readOnly}
          onChange={(e: SelectChangeEvent) => {
            const nextType = e.target.value as DynamicFormFieldType;
            const keepStatistic = field.isStatistic && canUseFieldStatistic(nextType);
            onChange({
              type: nextType,
              options:
                nextType === "shortText" || nextType === "singleSelect" || nextType === "multiSelect"
                  ? field.options?.length
                    ? field.options
                    : defaultOptionsForFieldType(nextType)
                  : undefined,
              isStatistic: keepStatistic,
              statistic: keepStatistic
                ? { ...defaultStatistic(), aggregateOps: defaultAggregateOps(nextType) }
                : undefined,
              statisticLabelCodes: keepStatistic ? [] : [],
            });
          }}
        >
          {fieldTypeSelectOptions.map(([type, label]) => (
            <MenuItem key={type} value={type}>
              {label}
            </MenuItem>
          ))}
        </Select>

        <LabelPicker
          value={field.statisticLabelCodes ?? []}
          disabled={statisticReadOnly || !field.isStatistic || !canUseCurrentStatistic}
          usage="statistic"
          allowedDataTypes={getStatisticLabelDataTypesForField(field.type)}
          label={uiText(UITextKey.TextFieldLabels)}
          placeholder={uiText(UITextKey.TextChonNhanField)}
          helperText={`${uiText(UITextKey.TextChiFieldDaBatStatisticMoiDuocGanLabel)} Kiểu nhãn phải khớp với kiểu trường.`}
          onChange={(codes) =>
            onChange({
              statisticLabelCodes: codes,
            })
          }
        />

        <Grid container spacing={1}>
          <Grid size={{ xs: 6 }}>
            <DimensionNumberField
              label="Chiều rộng"
              value={field.colSpan}
              min={3}
              max={12}
              disabled={readOnly}
              helperText="Từ 3 đến 12 cột lưới."
              onCommit={(value) => onChange({ colSpan: value })}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <DimensionNumberField
              label="Chiều dài"
              value={field.minHeight}
              min={56}
              max={320}
              disabled={readOnly}
              helperText="Đơn vị px, từ 56 đến 320."
              onCommit={(value) => onChange({ minHeight: value })}
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
          label={uiText(UITextKey.TextRequired)}
        />

        <FormControlLabel
          control={
            <Switch
              checked={field.isStatistic && canUseCurrentStatistic}
              disabled={statisticReadOnly || !canUseCurrentStatistic}
              onChange={(e) => {
                if (!canUseCurrentStatistic) return;
                onChange({
                  isStatistic: e.target.checked,
                  statistic: e.target.checked
                    ? { ...defaultStatistic(), aggregateOps: defaultAggregateOps(field.type) }
                    : undefined,
                  statisticLabelCodes: e.target.checked ? field.statisticLabelCodes : [],
                });
              }}
            />
          }
          label={uiText(UITextKey.TextStatistic)}
        />

        {field.isStatistic && canUseCurrentStatistic && (
          <Stack spacing={1}>
            <FormControlLabel
              sx={{ alignItems: "flex-start", m: 0 }}
              control={
                <Checkbox
                  sx={{ mt: -0.5 }}
                  checked={field.statistic?.showInDetail ?? true}
                  disabled={statisticReadOnly}
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
              label={
                <Stack spacing={0.25}>
                  <Typography variant="body2" fontWeight={700}>
                    Thống kê chi tiết
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Hiển thị trường này trong màn hình tổng hợp chi tiết của công việc để xem số lượng, tổng, nhóm giá trị hoặc nội dung theo từng báo cáo.
                  </Typography>
                </Stack>
              }
            />
            <FormControlLabel
              sx={{ alignItems: "flex-start", m: 0 }}
              control={
                <Checkbox
                  sx={{ mt: -0.5 }}
                  checked={field.statistic?.showInTree ?? false}
                  disabled={statisticReadOnly}
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
              label={
                <Stack spacing={0.25}>
                  <Typography variant="body2" fontWeight={700}>
                    Thống kê trên cây
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Đưa chỉ số rút gọn của trường này lên từng node trong cây công việc/dashboard. Chỉ nên bật cho các chỉ số thật sự cần theo dõi nhanh.
                  </Typography>
                </Stack>
              }
            />
          </Stack>
        )}

        {(field.type === "shortText" || field.type === "singleSelect" || field.type === "multiSelect") && (
          <ChoiceOptionsEditor
            fieldType={field.type}
            options={field.options}
            disabled={readOnly}
            onChange={(options) => onChange({ options })}
          />
        )}
      </Stack>
    </Paper>
  );
}

function DebouncedTextField({
  size = "small",
  label,
  value,
  disabled,
  multiline,
  minRows,
  resetKey,
  error,
  helperText,
  onCommit,
}: {
  size?: "small" | "medium";
  label: React.ReactNode;
  value: string;
  disabled: boolean;
  multiline?: boolean;
  minRows?: number;
  resetKey?: string;
  error?: boolean;
  helperText?: React.ReactNode;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [resetKey, value]);

  useEffect(() => {
    if (disabled || draft === value) return;
    const timer = window.setTimeout(() => onCommit(draft), 180);
    return () => window.clearTimeout(timer);
  }, [disabled, draft, onCommit, value]);

  const commitNow = () => {
    if (draft !== value) onCommit(draft);
  };

  return (
    <TextField
      size={size}
      label={label}
      value={draft}
      disabled={disabled}
      multiline={multiline}
      minRows={minRows}
      error={error}
      helperText={helperText}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitNow}
    />
  );
}

function FieldNameTextField({
  field,
  disabled,
  onCommit,
}: {
  field: DynamicFormField;
  disabled: boolean;
  onCommit: (name: string) => void;
}) {
  const committedName = field.name ?? "";
  const [draft, setDraft] = useState(committedName);
  const trimmedDraft = draft.trim();
  const fieldNameInvalid =
    !trimmedDraft || isGenericFieldDisplayName(field.type, trimmedDraft);

  useEffect(() => {
    setDraft(committedName);
  }, [field.id, committedName]);

  useEffect(() => {
    if (disabled || draft === committedName) return;
    const timer = window.setTimeout(() => onCommit(draft), 180);
    return () => window.clearTimeout(timer);
  }, [committedName, disabled, draft, onCommit]);

  const commitNow = () => {
    if (draft !== committedName) onCommit(draft);
  };

  return (
    <TextField
      size="small"
      label="Tên trường dữ liệu"
      value={draft}
      disabled={disabled}
      required
      error={fieldNameInvalid}
      helperText={
        fieldNameInvalid
          ? "Nhập tên/câu hỏi cụ thể, không dùng tên kiểu dữ liệu như Số hoặc Ngày."
          : "Cho phép tiếng Việt, dấu cách và ký tự đặc biệt. Đây là nội dung hiển thị trên biểu mẫu/báo cáo, không phải nhãn dữ liệu dùng cho thống kê."
      }
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitNow}
    />
  );
}

function DimensionNumberField({
  label,
  value,
  min,
  max,
  disabled,
  helperText,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  helperText: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    const next = Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, Math.floor(parsed)))
      : value;

    setDraft(String(next));
    if (next !== value) {
      onCommit(next);
    }
  };

  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      type="number"
      value={draft}
      disabled={disabled}
      inputProps={{ min, max, inputMode: "numeric" }}
      helperText={helperText}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      }}
    />
  );
}

type ChoiceOption = NonNullable<DynamicFormField["options"]>[number];

function ChoiceOptionsEditor({
  fieldType,
  options,
  disabled,
  onChange,
}: {
  fieldType: DynamicFormFieldType;
  options?: DynamicFormField["options"];
  disabled: boolean;
  onChange: (options: ChoiceOption[]) => void;
}) {
  const [rows, setRows] = useState<ChoiceOption[]>(() => toChoiceRows(options, fieldType));

  useEffect(() => {
    setRows(toChoiceRows(options, fieldType));
  }, [options, fieldType]);

  const commit = (nextRows: ChoiceOption[]) => {
    const normalized = normalizeChoiceRows(nextRows, fieldType);
    setRows(normalized);
    onChange(normalized);
  };

  const patchRow = (index: number, patch: Partial<ChoiceOption>) => {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  };

  const addRow = () => {
    const nextRows = [
      ...rows,
      {
        code: nextChoiceCode(rows),
        label: defaultOptionLabelForFieldType(fieldType, rows.length),
      },
    ];
    commit(nextRows);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    commit(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {fieldType === "shortText" ? "Nội dung" : "Lựa chọn"}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          disabled={disabled}
          onClick={addRow}
        >
          {fieldType === "shortText" ? "Thêm nội dung" : "Thêm dòng"}
        </Button>
      </Stack>

      <Stack spacing={1}>
        {rows.map((option, index) => (
          <Grid container spacing={1} alignItems="center" key={`${option.code}_${index}`}>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Mã"
                value={option.code}
                disabled={disabled}
                onChange={(event) => patchRow(index, { code: event.target.value })}
                onBlur={(event) =>
                  commit(
                    rows.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, code: event.target.value } : row,
                    ),
                  )
                }
              />
            </Grid>
            <Grid size={{ xs: 7 }}>
              <TextField
                fullWidth
                size="small"
                label="Nội dung"
                value={option.label}
                disabled={disabled}
                onChange={(event) => patchRow(index, { label: event.target.value })}
                onBlur={(event) =>
                  commit(
                    rows.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, label: event.target.value } : row,
                    ),
                  )
                }
              />
            </Grid>
            <Grid size={{ xs: 1 }}>
              <Tooltip title="Xóa lựa chọn">
                <span>
                  <IconButton
                    size="small"
                    disabled={disabled || rows.length <= 1}
                    onClick={() => removeRow(index)}
                  >
                    <DeleteOutlineIcon fontSize="inherit" />
                  </IconButton>
                </span>
              </Tooltip>
            </Grid>
          </Grid>
        ))}
      </Stack>
    </Stack>
  );
}

function toChoiceRows(options: DynamicFormField["options"] | undefined, fieldType: DynamicFormFieldType): ChoiceOption[] {
  return options?.length
    ? options.map((option) => ({ code: option.code ?? "", label: option.label ?? "" }))
    : defaultOptionsForFieldType(fieldType);
}

function normalizeChoiceRows(rows: ChoiceOption[], fieldType: DynamicFormFieldType): ChoiceOption[] {
  const sourceRows = rows.length > 0 ? rows : defaultOptionsForFieldType(fieldType);
  const usedCodes = new Set<string>();

  return sourceRows.map((row, index) => {
    const fallbackCode = choiceCodeAt(index);
    const baseCode = row.code.trim() || fallbackCode;
    let code = baseCode;
    let suffix = 2;

    while (usedCodes.has(code.toLowerCase())) {
      code = `${baseCode}_${suffix}`;
      suffix += 1;
    }

    usedCodes.add(code.toLowerCase());

    return {
      code,
      label: row.label.trim() || defaultOptionLabelForFieldType(fieldType, index),
    };
  });
}

function nextChoiceCode(rows: ChoiceOption[]) {
  const usedCodes = new Set(rows.map((row) => row.code.trim().toLowerCase()).filter(Boolean));
  for (let index = 0; index < 26; index += 1) {
    const code = choiceCodeAt(index);
    if (!usedCodes.has(code.toLowerCase())) return code;
  }

  let index = rows.length + 1;
  while (usedCodes.has(`opt_${index}`)) {
    index += 1;
  }
  return `OPT_${index}`;
}

function choiceCodeAt(index: number) {
  return index < 26 ? String.fromCharCode(65 + index) : `OPT_${index + 1}`;
}

function getStatisticLabelDataTypesForField(fieldType: DynamicFormFieldType): LabelDataType[] {
  if (fieldType === "number") return ["NUMBER"];
  if (fieldType === "shortText" || fieldType === "singleSelect" || fieldType === "multiSelect") return ["SHORT_TEXT"];
  if (fieldType === "date" || fieldType === "fullDate") return ["DATE"];
  if (fieldType === "boolean") return ["BOOLEAN"];
  if (fieldType === "longText" || fieldType === "stringList") return ["STRING_LIST"];
  return [];
}

function canUseFieldStatistic(fieldType: DynamicFormFieldType): boolean {
  return Boolean(fieldType);
}

function getExcelBlockTitle(json: string | null | undefined, index: number): string {
  const obj = parseExcelBlockJson(json);
  const name =
    readBlockString(obj?.dynamicExcelName) ??
    readBlockString(obj?.DynamicExcelName) ??
    readBlockString(obj?.name) ??
    readBlockString(obj?.blockId) ??
    readBlockString(obj?.id);

  return name ? `${index + 1}. ${name}` : `Phần bảng ${index + 1}`;
}

function getExcelBlockSectionId(json: string | null | undefined): string | null {
  const obj = parseExcelBlockJson(json);
  return readBlockString(obj?.sectionId) ?? readBlockString(obj?.SectionId);
}

function getExcelBlockDynamicExcelTemplateId(json: string | null | undefined): string | null {
  const obj = parseExcelBlockJson(json);
  return (
    readBlockString(obj?.dynamicExcelTemplateId) ??
    readBlockString(obj?.DynamicExcelTemplateId) ??
    readBlockString(obj?.excelBlockDynamicExcelTemplateId) ??
    readBlockString(obj?.ExcelBlockDynamicExcelTemplateId)
  );
}

type ExcelBlockRect = { r0: number; c0: number; r1: number; c1: number };

function getExcelBlockConfigSummary(json: string | null | undefined) {
  const obj = parseExcelBlockJson(json);
  const dataRect = obj ? readExcelBlockDataRect(obj) : null;
  const tableMode = normalizeExcelBlockTableMode(readBlockString(obj?.tableMode));
  const rawSpecKind = (
    readBlockString(obj?.excelSpecKind) ??
    readBlockString(obj?.ExcelSpecKind) ??
    readBlockString(obj?.kind)
  )?.toUpperCase();
  const specKind = (rawSpecKind === "LEFT" || rawSpecKind === "MATRIX" ? rawSpecKind : "TOP") as keyof typeof excelSpecKindLabels;

  return {
    dynamicExcelId: getExcelBlockDynamicExcelTemplateId(json),
    dataRect,
    specKindLabel: excelSpecKindLabels[specKind],
    tableModeLabel: tableModeLabels[tableMode],
    dataRangeLabel: dataRect ? formatExcelBlockRect(dataRect) : "Chưa xác định",
    defaultDataTypeLabel: dataTypeLabel(obj?.defaultDataType ?? obj?.dataType ?? "NUMBER"),
  };
}

function formatExcelBlockRect(rect: ExcelBlockRect) {
  return `R${rect.r0 + 1}C${rect.c0 + 1}:R${rect.r1 + 1}C${rect.c1 + 1}`;
}

function readExcelBlockDataRect(block: Record<string, unknown>): ExcelBlockRect | null {
  const raw = block.dataRect ?? block.DataRect;
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

function normalizeExcelBlockTableMode(value: string | null): DynamicFormTableMode {
  const raw = value?.toUpperCase();
  if (raw === "APPEND_ROWS" || raw === "APPEND_COLUMNS" || raw === "MATRIX" || raw === "SUMMARY_TEMPLATE") return raw;
  return "FIXED_GRID";
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

function safeParseJson<T>(input?: string | null, fallback?: T): T | undefined {
  if (!input) return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

function readBlockString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;

  const data = "data" in error ? (error as { data?: unknown }).data : null;
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  if ("message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
}
