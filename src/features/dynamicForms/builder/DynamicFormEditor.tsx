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
  defaultStatistic,
  excelSpecKindLabels,
  fieldTypeLabels,
  getAllowedTableModesForExcelSpecKind,
  getDynamicFormFieldDisplayName,
  getDynamicFormFieldNameValue,
  getDynamicFormBlockJsonList,
  getExcelSpecKindFromBlockLike,
  isGenericFieldDisplayName,
  isTableModeAllowedForExcelSpecKind,
  MAX_DYNAMIC_FORM_FIELDS,
  MAX_DYNAMIC_FORM_LABEL_STATISTIC_TARGETS,
  MAX_DYNAMIC_FORM_TABLE_BLOCKS,
  moveDynamicFormBlockJson,
  normalizeLabelCodes,
  normalizeFields,
  normalizeSections,
  normalizeTableMode,
  removeDynamicFormBlockJson,
  setDynamicFormBlockSectionId,
  setDynamicFormBlockJson,
  tableModeLabels,
  toSubmit,
} from "../dynamicFormSchema";
import LabelPicker from "../../../components/labels/LabelPicker";
import LabelManagerDialog from "../../../components/labels/LabelManagerDialog";
import { DynamicExcelPicker } from "../../../components/works/assignments/DynamicExcelPicker";
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
  allowStatisticConfigEdit = false,
  onBack,
  onSave,
  onPublish,
  onImportDynamicExcelBlock,
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
  const selectedExcelBlockSectionId =
    getExcelBlockSectionId(selectedExcelBlockJson) ?? selectedSection?.id ?? sections[0]?.id ?? "";

  const setPatch = (patch: Partial<DynamicFormEditorValue>) =>
    setValue((current) => ({ ...current, ...patch }));

  const updateExcelBlock = (nextBlockJson: string | null | undefined) => {
    setPatch(
      setDynamicFormBlockJson(
        value.blocksJson,
        value.excelBlockJson,
        effectiveSelectedBlockIndex,
        nextBlockJson,
      ),
    );
  };

  const moveExcelBlock = (direction: -1 | 1) => {
    const nextPatch = moveDynamicFormBlockJson(
      value.blocksJson,
      value.excelBlockJson,
      effectiveSelectedBlockIndex,
      direction,
    );
    setPatch(nextPatch);
    setSelectedBlockIndex(effectiveSelectedBlockIndex + direction);
  };

  const removeExcelBlock = () => {
    if (!selectedExcelBlockJson) return;
    const ok = window.confirm("Xóa bảng này khỏi bản nháp biểu mẫu?");
    if (!ok) return;

    const nextPatch = removeDynamicFormBlockJson(
      value.blocksJson,
      value.excelBlockJson,
      effectiveSelectedBlockIndex,
    );
    setPatch(nextPatch);
    setSelectedBlockIndex(Math.max(0, effectiveSelectedBlockIndex - 1));
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
    if (!onImportDynamicExcelBlock || readOnly || importingBlock) return;
    if (excelBlockJsonList.length >= MAX_DYNAMIC_FORM_TABLE_BLOCKS) {
      setError(`Biểu mẫu động chỉ được có tối đa ${MAX_DYNAMIC_FORM_TABLE_BLOCKS} bảng Excel động.`);
      return;
    }

    setImportingBlock(true);
    setError(null);
    try {
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
  const excelBlockTagCodes = getExcelBlockLabelCodes(selectedExcelBlockJson, "tagCodes");
  const excelBlockAllowedRowLabelCodes = getExcelBlockLabelCodes(
    selectedExcelBlockJson,
    "allowedRowLabelCodes",
  );
  const excelBlockDataRows = getExcelBlockDataRows(selectedExcelBlockJson);
  const excelBlockLabelColumnsText = getExcelBlockLabelColumnsText(selectedExcelBlockJson);
  const excelBlockStatisticColumnsText = getExcelBlockStatisticColumnsText(selectedExcelBlockJson);
  const excelBlockStatisticLabelColumnsText =
    getExcelBlockStatisticLabelColumnsText(selectedExcelBlockJson);
  const excelBlockTableMode = getExcelBlockTableMode(selectedExcelBlockJson);
  const excelBlockSpecKind = getExcelSpecKindFromBlockLike(selectedExcelBlockJson);
  const excelBlockTableModeOptions = getAllowedTableModesForExcelSpecKind(
    excelBlockSpecKind,
    excelBlockTableMode,
  );
  const excelBlockTableModeAllowed = isTableModeAllowedForExcelSpecKind(
    excelBlockTableMode,
    excelBlockSpecKind,
  );
  const excelBlockIndexMapCount = getExcelBlockIndexMapCount(selectedExcelBlockJson);
  const visibleExcelBlockDataRows = excelBlockDataRows.slice(0, 100);

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
              <TextField
                size="small"
                label={uiText(UITextKey.TextTenForm)}
                value={value.name}
                disabled={readOnly}
                onChange={(e) => setPatch({ name: e.target.value })}
              />
              <TextField
                size="small"
                label={uiText(UITextKey.TextMoTa)}
                multiline
                minRows={3}
                value={value.description ?? ""}
                disabled={readOnly}
                onChange={(e) => setPatch({ description: e.target.value })}
              />
              <LabelPicker
                value={value.tagCodes}
                disabled={readOnly}
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
              {!readOnly && onImportDynamicExcelBlock && (
                <>
                  <Divider />
                  <Typography fontWeight={700}>{uiText(UITextKey.TextTableBlocks)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {excelBlockJsonList.length}/{MAX_DYNAMIC_FORM_TABLE_BLOCKS} bảng, nhập vào phần đang chọn.
                  </Typography>
                  <DynamicExcelPicker
                    value={null}
                    onChange={(item) => {
                      if (item?.id) void importDynamicExcelBlock(item.id);
                    }}
                    disabled={busy || importingBlock || excelBlockJsonList.length >= MAX_DYNAMIC_FORM_TABLE_BLOCKS}
                  />
                </>
              )}
              {selectedExcelBlockJson && (
                <>
                  <Divider />
                  <Typography fontWeight={700}>{uiText(UITextKey.TextExcelBlock)}</Typography>
                  {excelBlockJsonList.length > 1 && (
                    <Select
                      size="small"
                      value={String(effectiveSelectedBlockIndex)}
                      onChange={(e: SelectChangeEvent) =>
                        setSelectedBlockIndex(Number(e.target.value))
                      }
                    >
                      {excelBlockJsonList.map((blockJson, index) => (
                        <MenuItem
                          key={`${getExcelBlockTitle(blockJson, index)}_${index}`}
                          value={String(index)}
                        >
                          {getExcelBlockTitle(blockJson, index)}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                  {!readOnly && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip
                        size="small"
                        label={`${effectiveSelectedBlockIndex + 1}/${excelBlockJsonList.length}`}
                        variant="outlined"
                      />
                      <Tooltip title={uiText(UITextKey.TextMoveUp)}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => moveExcelBlock(-1)}
                            disabled={effectiveSelectedBlockIndex <= 0}
                          >
                            <ArrowUpwardIcon fontSize="inherit" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={uiText(UITextKey.TextMoveDown)}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => moveExcelBlock(1)}
                            disabled={effectiveSelectedBlockIndex >= excelBlockJsonList.length - 1}
                          >
                            <ArrowDownwardIcon fontSize="inherit" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={uiText(UITextKey.TextRemoveBlock)}>
                        <span>
                          <IconButton size="small" onClick={removeExcelBlock}>
                            <DeleteOutlineIcon fontSize="inherit" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  )}
                  <Select
                    size="small"
                    value={selectedExcelBlockSectionId}
                    disabled={readOnly}
                    onChange={(e: SelectChangeEvent) =>
                      updateExcelBlock(
                        setDynamicFormBlockSectionId(selectedExcelBlockJson, e.target.value),
                      )
                    }
                  >
                    {sections.map((section) => (
                      <MenuItem key={section.id} value={section.id}>
                        {section.title}
                      </MenuItem>
                    ))}
                  </Select>
                  <Select
                    size="small"
                    value={excelBlockTableMode}
                    disabled={readOnly}
                    onChange={(e: SelectChangeEvent) =>
                      updateExcelBlock(
                        setExcelBlockTableMode(
                          selectedExcelBlockJson,
                          e.target.value as DynamicFormTableMode,
                        ),
                      )
                    }
                  >
                    {excelBlockTableModeOptions.map((modeValue) => (
                      <MenuItem key={modeValue} value={modeValue}>
                        {tableModeLabels[modeValue]}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary">
                    {excelBlockSpecKind
                      ? `${excelSpecKindLabels[excelBlockSpecKind]} chỉ cho chọn các kiểu bảng phù hợp với hướng nhập liệu. `
                      : "Chưa xác định được loại bảng Excel động, chỉ nên giữ cấu hình mặc định. "}
                    Kiểu bảng quyết định cách tạo mã chỉ số thống kê. Bảng cố định hiện có
                    {excelBlockIndexMapCount > 0
                      ? ` ${excelBlockIndexMapCount} mã chỉ số.`
                      : " chưa có bản đồ vị trí."}
                  </Typography>
                  {!excelBlockTableModeAllowed && (
                    <Alert severity="warning">
                      Kiểu nhập bảng hiện tại không phù hợp với loại bảng Excel động này. Hãy chọn lại trước khi lưu.
                    </Alert>
                  )}
                  <LabelPicker
                    value={excelBlockTagCodes}
                    disabled={readOnly}
                    label={uiText(UITextKey.TextBlockLabels)}
                    placeholder={uiText(UITextKey.TextChonNhanBlock)}
                    onChange={(codes) =>
                      updateExcelBlock(
                        setExcelBlockLabelCodes(
                          selectedExcelBlockJson,
                          "tagCodes",
                          codes,
                        ),
                      )
                    }
                  />
                  <LabelPicker
                    value={excelBlockAllowedRowLabelCodes}
                    disabled={readOnly}
                    label={uiText(UITextKey.TextAllowedRowLabels)}
                    placeholder={uiText(UITextKey.TextChonNhanDong)}
                    helperText={uiText(UITextKey.TextDanhSachNhanChoNguoiNhapBaoCaoChon)}
                    onChange={(codes) =>
                      updateExcelBlock(
                        setExcelBlockLabelCodes(
                          selectedExcelBlockJson,
                          "allowedRowLabelCodes",
                          codes,
                        ),
                      )
                    }
                  />
                  <TextField
                    size="small"
                    label={uiText(UITextKey.TextLabelColumns)}
                    value={excelBlockLabelColumnsText}
                    disabled={readOnly}
                    placeholder={uiText(UITextKey.TextVD13)}
                    helperText={uiText(UITextKey.TextNhapSoThuTuCotExcelDungLamMetadata)}
                    onChange={(e) =>
                      updateExcelBlock(
                        setExcelBlockLabelColumnsFromText(
                          selectedExcelBlockJson,
                          e.target.value,
                        ),
                      )
                    }
                  />
                  <TextField
                    size="small"
                    label={uiText(UITextKey.TextStatisticColumns)}
                    value={excelBlockStatisticColumnsText}
                    disabled={statisticReadOnly}
                    placeholder={uiText(UITextKey.TextVD24)}
                    helperText={`Cột được thống kê. Có thể gắn nhãn cho cột nếu cần; tối đa ${MAX_DYNAMIC_FORM_LABEL_STATISTIC_TARGETS} trường hoặc cột thống kê.`}
                    onChange={(e) =>
                      updateExcelBlock(
                        setExcelBlockStatisticColumnsFromText(
                          selectedExcelBlockJson,
                          e.target.value,
                        ),
                      )
                    }
                  />
                  <TextField
                    size="small"
                    label={uiText(UITextKey.TextStatisticColumnLabels)}
                    value={excelBlockStatisticLabelColumnsText}
                    disabled={statisticReadOnly || !excelBlockStatisticColumnsText.trim()}
                    placeholder={uiText(UITextKey.TextVD2Revenue4Cost)}
                    helperText={uiText(UITextKey.TextChiGanLabelChoCotDaNamTrongStatistic)}
                    onChange={(e) =>
                      updateExcelBlock(
                        setExcelBlockStatisticLabelColumnsFromText(
                          selectedExcelBlockJson,
                          e.target.value,
                        ),
                      )
                    }
                  />
                  {visibleExcelBlockDataRows.length > 0 && (
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Nhãn mặc định theo dòng
                      </Typography>
                      {visibleExcelBlockDataRows.map((rowIndex) => (
                        <LabelPicker
                          key={rowIndex}
                          size="small"
                          value={getExcelBlockRowDefaultCodes(selectedExcelBlockJson, rowIndex)}
                          allowedCodes={
                            excelBlockAllowedRowLabelCodes.length > 0
                              ? excelBlockAllowedRowLabelCodes
                              : undefined
                          }
                          disabled={readOnly}
                          label={`Dòng ${rowIndex + 1}`}
                          placeholder={uiText(UITextKey.TextChonNhan)}
                          limitTags={2}
                          lazySearch
                          onChange={(codes) =>
                            updateExcelBlock(
                              setExcelBlockRowDefaultCodes(
                                selectedExcelBlockJson,
                                rowIndex,
                                codes,
                              ),
                            )
                          }
                        />
                      ))}
                      {excelBlockDataRows.length > visibleExcelBlockDataRows.length && (
                        <Typography variant="caption" color="text.secondary">
                          Đang hiển thị 100 dòng đầu tiên để biểu mẫu không quá nặng.
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
                    {section.title}
                  </Button>
                ))}
              </Stack>

              <Divider />

              {!readOnly && !preview && (
                <Stack spacing={1}>
                  <Typography fontWeight={700}>{uiText(UITextKey.TextFields)}</Typography>
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
                      label={uiText(UITextKey.TextSectionTitle)}
                      value={selectedSection.title}
                      disabled={readOnly}
                      onChange={(e) => updateSection(selectedSection.id, { title: e.target.value })}
                    />
                    <TextField
                      size="small"
                      label={uiText(UITextKey.TextSectionDescription)}
                      value={selectedSection.description ?? ""}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateSection(selectedSection.id, { description: e.target.value })
                      }
                    />
                    <LabelPicker
                      value={selectedSection.tagCodes ?? []}
                      disabled={readOnly}
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
                      <Typography color="text.secondary">{uiText(UITextKey.TextNoFields)}</Typography>
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
              statisticReadOnly={statisticReadOnly}
              onChange={(patch) => {
                if (!selectedField) return;
                updateField(selectedField.id, patch);
              }}
            />
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
  const displayName = getDynamicFormFieldDisplayName(field);

  if (field.type === "boolean") {
    return <FormControlLabel control={<Checkbox disabled />} label={displayName} />;
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
      label={displayName}
      disabled
      InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
    />
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

  const optionText = (field.options ?? [])
    .map((option) => `${option.code}:${option.label}`)
    .join("\n");
  const fieldName = field.name ?? field.displayName ?? field.label ?? "";
  const fieldNameInvalid =
    !fieldName.trim() || isGenericFieldDisplayName(field.type, fieldName);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
      <Stack spacing={1.5}>
        <Typography fontWeight={800}>{uiText(UITextKey.TextField)}</Typography>
        <TextField
          size="small"
          label="Tên trường dữ liệu"
          value={fieldName}
          disabled={readOnly}
          required
          error={fieldNameInvalid}
          helperText={
            fieldNameInvalid
              ? "Nhập tên/câu hỏi cụ thể, không dùng tên kiểu dữ liệu như Number, Date, Số hoặc Ngày."
              : "Cho phép tiếng Việt, dấu cách và ký tự đặc biệt. Đây là text hiển thị trên form/report, không phải nhãn dữ liệu dùng cho thống kê."
          }
          onChange={(e) =>
            onChange({
              name: e.target.value,
              displayName: e.target.value,
              label: e.target.value,
            })
          }
        />
        <TextField
          size="small"
          label="Mã kỹ thuật của trường dữ liệu"
          value={field.key}
          disabled={readOnly}
          helperText="Dùng ổn định để lưu dữ liệu và truy vấn kỹ thuật; tên hiển thị cho user nằm ở ô trên."
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
                    : [{ code: "A", label: "Lựa chọn A" }]
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
          value={field.statisticLabelCodes ?? []}
          disabled={statisticReadOnly || !field.isStatistic}
          label="Nhãn dữ liệu/thống kê"
          placeholder={uiText(UITextKey.TextChonNhanField)}
          helperText="Label code dùng cho thống kê, trích xuất, mapping và phải bật thống kê trước khi gắn."
          onChange={(codes) =>
            onChange({
              statisticLabelCodes: codes,
            })
          }
        />

        <Grid container spacing={1}>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              size="small"
              label={uiText(UITextKey.TextCols)}
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
              label={uiText(UITextKey.TextHeight)}
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
          label={uiText(UITextKey.TextRequired)}
        />

        <FormControlLabel
          control={
            <Switch
              checked={field.isStatistic}
              disabled={statisticReadOnly}
              onChange={(e) =>
                onChange({
                  isStatistic: e.target.checked,
                  statistic: e.target.checked
                    ? { ...defaultStatistic(), aggregateOps: defaultAggregateOps(field.type) }
                    : undefined,
                  statisticLabelCodes: e.target.checked ? field.statisticLabelCodes : [],
                })
              }
            />
          }
          label={uiText(UITextKey.TextStatistic)}
        />

        {field.isStatistic && (
          <Stack spacing={1}>
            <FormControlLabel
              control={
                <Checkbox
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
              label={uiText(UITextKey.TextDetail)}
            />
            <FormControlLabel
              control={
                <Checkbox
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
              label={uiText(UITextKey.TextTree)}
            />
          </Stack>
        )}

        {(field.type === "singleSelect" || field.type === "multiSelect") && (
          <TextField
            size="small"
            label={uiText(UITextKey.TextOptions)}
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

type ExcelBlockLabelField = "tagCodes" | "allowedRowLabelCodes";

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

type ExcelBlockStatisticLabelColumn = {
  columnIndex?: number;
  columnKey?: string;
  header?: string;
  statisticLabelCode?: string;
  aggregateOps?: string[];
  showInDetail?: boolean;
  showInTree?: boolean;
};

type ExcelBlockStatisticColumn = {
  columnIndex?: number;
  columnKey?: string;
  header?: string;
  aggregateOps?: string[];
  showInDetail?: boolean;
  showInTree?: boolean;
};

type ExcelBlockRowLabelDefault = {
  sheetId?: string;
  rowKey?: string;
  rowIndex?: number;
  rowLabelCodes?: string[];
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
  const columns = Array.isArray(obj?.rowLabelColumns) ? obj.rowLabelColumns : [];
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
    delete obj.rowLabelColumns;
  } else {
    obj.rowLabelColumns = columns.map((columnIndex) => ({
      sheetId: "sheet_1",
      columnIndex,
      mode: "split",
      separator: ";",
    }));
  }

  return JSON.stringify(obj);
}

function getExcelBlockStatisticLabelColumnsText(json: string | null | undefined): string {
  const obj = parseExcelBlockJson(json);
  const columns = Array.isArray(obj?.statisticColumnLabels) ? obj.statisticColumnLabels : [];
  return columns
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const column = item as ExcelBlockStatisticLabelColumn;
      const statisticLabelCode = normalizeLabelCodes(column.statisticLabelCode ? [column.statisticLabelCode] : [])[0];
      if (!statisticLabelCode) return null;
      const columnRef =
        typeof column.columnIndex === "number" && Number.isInteger(column.columnIndex)
          ? String(column.columnIndex + 1)
          : column.columnKey || column.header || "";
      return columnRef ? `${columnRef}:${statisticLabelCode}` : null;
    })
    .filter((item): item is string => Boolean(item))
    .join(", ");
}

function getExcelBlockStatisticColumnsText(json: string | null | undefined): string {
  const obj = parseExcelBlockJson(json);
  const columns = Array.isArray(obj?.statisticColumns) ? obj.statisticColumns : [];
  return columns
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const column = item as ExcelBlockStatisticColumn;
      if (typeof column.columnIndex === "number" && Number.isInteger(column.columnIndex)) {
        return String(column.columnIndex + 1);
      }
      return column.columnKey || column.header || null;
    })
    .filter((item): item is string => Boolean(item))
    .join(", ");
}

function setExcelBlockStatisticColumnsFromText(
  json: string | null | undefined,
  text: string,
): string | null {
  const obj = parseExcelBlockJson(json);
  if (!obj) return json ?? null;

  const byColumn = new Map<string, ExcelBlockStatisticColumn>();
  for (const part of text.split(/[,\n;]+/)) {
    const columnText = part.trim();
    if (!columnText) continue;

    const columnNumber = Number(columnText);
    const column =
      Number.isInteger(columnNumber) && columnNumber > 0
        ? {
            columnIndex: columnNumber - 1,
            columnKey: `col_${columnNumber}`,
          }
        : {
            columnKey: columnText.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_"),
            header: columnText,
          };

    byColumn.set(column.columnKey, {
      ...column,
      aggregateOps: ["count", "sum"],
      showInDetail: true,
      showInTree: false,
    });
  }

  const columns = Array.from(byColumn.values());
  if (columns.length === 0) {
    delete obj.statisticColumns;
    delete obj.statisticColumnLabels;
  } else {
    const allowed = new Set(columns.map((column) => column.columnKey));
    obj.statisticColumns = columns;
    if (Array.isArray(obj.statisticColumnLabels)) {
      const columnLabels = obj.statisticColumnLabels.filter((item) => {
        if (!item || typeof item !== "object") return false;
        const column = item as ExcelBlockStatisticLabelColumn;
        const columnKey =
          column.columnKey ??
          (typeof column.columnIndex === "number" ? `col_${column.columnIndex + 1}` : undefined);
        return Boolean(columnKey && allowed.has(columnKey));
      });
      if (columnLabels.length === 0) {
        delete obj.statisticColumnLabels;
      } else {
        obj.statisticColumnLabels = columnLabels;
      }
    }
  }

  return JSON.stringify(obj);
}

function setExcelBlockStatisticLabelColumnsFromText(
  json: string | null | undefined,
  text: string,
): string | null {
  const obj = parseExcelBlockJson(json);
  if (!obj) return json ?? null;
  const statisticColumns = Array.isArray(obj.statisticColumns)
    ? (obj.statisticColumns.filter((item) => item && typeof item === "object") as ExcelBlockStatisticColumn[])
    : [];
  const allowed = new Set(
    statisticColumns.map((column) =>
      column.columnKey ??
      (typeof column.columnIndex === "number" ? `col_${column.columnIndex + 1}` : ""),
    ),
  );

  const byColumn = new Map<string, ExcelBlockStatisticLabelColumn>();
  for (const part of text.split(/[,\n;]+/)) {
    const [rawColumn, rawLabel] = part.split(":");
    const statisticLabelCode = normalizeLabelCodes(rawLabel ? [rawLabel] : [])[0];
    const columnText = rawColumn?.trim();
    if (!columnText || !statisticLabelCode) continue;

    const columnNumber = Number(columnText);
    const column =
      Number.isInteger(columnNumber) && columnNumber > 0
        ? {
            columnIndex: columnNumber - 1,
            columnKey: `col_${columnNumber}`,
          }
        : {
            columnKey: columnText.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_"),
            header: columnText.trim(),
          };
    if (!allowed.has(column.columnKey)) continue;

    byColumn.set(column.columnKey, {
      ...column,
      statisticLabelCode,
      aggregateOps: ["count", "sum"],
      showInDetail: true,
      showInTree: false,
    });
  }

  const columns = Array.from(byColumn.values());
  if (columns.length === 0) {
    delete obj.statisticColumnLabels;
  } else {
    obj.statisticColumnLabels = columns;
  }

  return JSON.stringify(obj);
}

function getExcelBlockRowDefaultCodes(
  json: string | null | undefined,
  rowIndex: number,
): string[] {
  const row = getExcelBlockRowDefault(json, rowIndex);
  return normalizeLabelCodes(row?.rowLabelCodes);
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
      rowLabelCodes: normalized,
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
