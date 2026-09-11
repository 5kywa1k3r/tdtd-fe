import React, { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import CloseIcon from "@mui/icons-material/Close";
import { useBlocker } from "react-router-dom";

import type {
  DynamicFormEditorSubmit,
  DynamicFormEditorValue,
  DynamicFormField,
  DynamicFormFieldType,
  DynamicFormSection,
  DynamicFormTableMode,
  DynamicFormValueSource,
} from "../dynamicForm.types";
import {
  canUseFieldStatistic,
  createDefaultField,
  createDefaultSection,
  createId,
  defaultOptionLabelForFieldType,
  defaultOptionsForFieldType,
  DYNAMIC_FORM_CANVAS_HEIGHT,
  DYNAMIC_FORM_CANVAS_WIDTH,
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
  getStatisticAggregateOperationOptions,
  getStatisticBucketModeOptions,
  getTableStatisticAggregateOperationOptions,
  normalizeTableStatisticAggregateOps,
  normalizeTableStatisticDataType,
  moveDynamicFormField,
  normalizeFields,
  normalizeSections,
  normalizeStatisticAggregateOps,
  normalizeStatisticBucketMode,
  normalizeStatisticConfig,
  removeDynamicFormBlockJson,
  setDynamicFormBlockJson,
  tableModeLabels,
  toSubmit,
  type DynamicFormTableStatisticAggregateOperation,
  type DynamicFormTableStatisticDataType,
} from "../dynamicFormSchema";
import LabelPicker from "../../../components/labels/LabelPicker";
import LabelManagerDialog from "../../../components/labels/LabelManagerDialog";
import { DynamicExcelPicker } from "../../../components/works/assignments/DynamicExcelPicker";
import type { LabelDataType } from "../../../api/labelApi";
import { useQuickCreateLabelEnumCatalogMutation } from "../../../api/labelEnumCatalogApi";
import { dataTypeLabel } from "../../../components/excel/fortune/dataTypes";
import DynamicExcelConfigDialog from "../../../components/excel/fortune/DynamicExcelConfigDialog";
import { UITextKey, uiText } from '../../../constants/uiText';
import { LabelEnumCatalogSelect } from "../../../components/labels/labelUi";
import DynamicFormExcelBlockPreview from "../components/DynamicFormExcelBlockPreview";
import { UnsavedChangesDialog } from "../../../components/common/UnsavedChangesDialog";
import { ApiErrorCode } from "../../../constants/errorCodes";
import { normalizeApiError } from "../../../utils/apiError";

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  initialValue: DynamicFormEditorValue;
  busy?: boolean;
  locked?: boolean;
  allowStatisticConfigEdit?: boolean;
  workspaceHeightOffset?: number;
  onBack: () => void;
  onReload?: () => Promise<unknown> | unknown;
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
  { type: "richText", icon: <ArticleOutlinedIcon fontSize="small" /> },
  { type: "stringList", icon: <FormatListBulletedIcon fontSize="small" /> },
  { type: "number", icon: <NumbersIcon fontSize="small" /> },
  { type: "date", icon: <EventIcon fontSize="small" /> },
  { type: "fullDate", icon: <EventIcon fontSize="small" /> },
  { type: "singleSelect", icon: <RadioButtonCheckedIcon fontSize="small" /> },
  { type: "multiSelect", icon: <ChecklistIcon fontSize="small" /> },
  { type: "boolean", icon: <CheckBoxIcon fontSize="small" /> },
];

const fieldTypeSelectOptions = Object.entries(fieldTypeLabels);
const CANVAS_FIELD_MIN_WIDTH = 180;
const CANVAS_FIELD_MIN_HEIGHT = 64;
const CANVAS_FIELD_MARGIN = 20;
const CANVAS_CONTENT_MARGIN = 40;
const CANVAS_HEADER_BOTTOM = 112;
const CANVAS_SNAP_GRID_SIZE = 20;
const CANVAS_SNAP_THRESHOLD = 8;
const TEXT_INPUT_COMMIT_DEBOUNCE_MS = 300;
const CANVAS_DROP_MIME = "application/x-dynamic-form-builder";
const CANVAS_ZOOM_LEVELS = [0.55, 0.7, 0.85, 1, 1.15, 1.3];

type PendingEditorDraftRegistry = {
  setPending: (draftId: string, pending: boolean, flushDraft: () => void) => void;
  flushPending: () => void;
};

const PendingEditorDraftContext = React.createContext<PendingEditorDraftRegistry | null>(null);

function usePendingEditorDraft(
  draftId: string,
  pending: boolean,
  flushDraft: () => void,
) {
  const registry = React.useContext(PendingEditorDraftContext);
  const flushDraftRef = useRef(flushDraft);
  flushDraftRef.current = flushDraft;
  const flushLatestDraft = React.useCallback(() => flushDraftRef.current(), []);

  useEffect(() => {
    registry?.setPending(draftId, pending, flushLatestDraft);
    return () => registry?.setPending(draftId, false, flushLatestDraft);
  }, [draftId, flushLatestDraft, pending, registry]);

  return React.useCallback(
    (nextPending: boolean) =>
      registry?.setPending(draftId, nextPending, flushLatestDraft),
    [draftId, flushLatestDraft, registry],
  );
}

function fieldTypeButtonLabel(type: DynamicFormFieldType) {
  if (type === "date") return "Ngày/kỳ";
  if (type === "fullDate") return "Ngày đầy đủ";
  return fieldTypeLabels[type];
}

function fieldTypeTooltip(type: DynamicFormFieldType) {
  if (type === "date") return "Ngày/kỳ: nhập dd/MM/yyyy, MM/yyyy hoặc yyyy.";
  if (type === "fullDate") return "Ngày đầy đủ: nhập dd/MM/yyyy.";
  if (type === "longText") return "Nội dung dài một ô.";
  if (type === "richText") return "Soạn thảo như văn bản: in đậm, in nghiêng và chèn bảng cơ bản.";
  if (type === "stringList") return "Danh sách nội dung: nhập nhiều ý tự do để nối chuỗi, tìm kiếm và xuất dữ liệu.";
  return fieldTypeLabels[type];
}

function FieldTypePaletteButton({
  item,
  onClick,
  onDragStart,
}: {
  item: { type: DynamicFormFieldType; icon: React.ReactNode };
  onClick: () => void;
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void;
}) {
  const label = fieldTypeButtonLabel(item.type);

  return (
    <Tooltip title={fieldTypeTooltip(item.type)}>
      <Button
        fullWidth
        variant="outlined"
        startIcon={item.icon}
        draggable={Boolean(onDragStart)}
        onClick={onClick}
        onDragStart={onDragStart}
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

function normalizeEditorState(input: DynamicFormEditorValue): DynamicFormEditorValue {
  const sections = normalizeSections(input.sections);
  return {
    ...input,
    sections,
    fields: normalizeFields(input.fields, sections),
  };
}

function editorStateFingerprint(value: DynamicFormEditorValue): string {
  return JSON.stringify({
    code: value.code ?? null,
    name: value.name,
    description: value.description ?? null,
    tagCodes: value.tagCodes,
    schemaVersion: value.schemaVersion,
    isActive: value.isActive,
    sections: value.sections,
    fields: value.fields,
    excelBlockJson: value.excelBlockJson ?? null,
    blocksJson: value.blocksJson ?? null,
  });
}

export default function DynamicFormEditor({
  mode,
  initialValue,
  busy = false,
  locked = false,
  allowStatisticConfigEdit = false,
  workspaceHeightOffset = 0,
  onBack,
  onReload,
  onSave,
  onPublish,
  onImportDynamicExcelBlock,
  onBuildDynamicExcelBlock,
}: Props) {
  const readOnly = mode === "view" || locked;
  const statisticReadOnly = mode === "view" || (locked && !allowStatisticConfigEdit);
  const [preview, setPreview] = useState(mode === "view");
  const [value, setValue] = useState<DynamicFormEditorValue>(() =>
    normalizeEditorState(initialValue),
  );
  const [baselineFingerprint, setBaselineFingerprint] = useState(() =>
    editorStateFingerprint(normalizeEditorState(initialValue)),
  );

  const [selectedSectionId, setSelectedSectionId] = useState(
    value.fields[0]?.sectionId ?? value.sections[0]?.id ?? createDefaultSection().id,
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    value.fields[0]?.id ?? null,
  );
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [importingBlock, setImportingBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(0.85);
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({});
  const [detailPanelOpen, setDetailPanelOpen] = useState(Boolean(value.fields[0]?.id));
  const [canvasGuides, setCanvasGuides] = useState<CanvasGuideLine[]>([]);
  const [savingFromDialog, setSavingFromDialog] = useState(false);
  const [revisionConflict, setRevisionConflict] = useState(false);
  const [reloadingLatest, setReloadingLatest] = useState(false);
  const [pendingDraftCount, setPendingDraftCount] = useState(0);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const allowNavigationAfterSaveRef = useRef(false);
  const pendingDraftsRef = useRef(new Map<string, () => void>());

  const pendingDraftRegistry = useMemo<PendingEditorDraftRegistry>(
    () => ({
      setPending: (draftId, pending, flushDraft) => {
        const drafts = pendingDraftsRef.current;
        const wasPending = drafts.has(draftId);
        if (pending) drafts.set(draftId, flushDraft);
        else drafts.delete(draftId);
        if (pending !== wasPending) setPendingDraftCount(drafts.size);
      },
      flushPending: () => {
        for (const flushDraft of [...pendingDraftsRef.current.values()]) {
          flushDraft();
        }
      },
    }),
    [],
  );

  const sections = useMemo(() => normalizeSections(value.sections), [value.sections]);
  const fields = useMemo(
    () => normalizeFields(value.fields, sections, { trimDisplayNames: false }),
    [sections, value.fields],
  );
  const currentFingerprint = useMemo(
    () => editorStateFingerprint({ ...value, sections, fields }),
    [fields, sections, value],
  );
  const latestEditorStateRef = useRef({ value, sections, fields, currentFingerprint });
  latestEditorStateRef.current = { value, sections, fields, currentFingerprint };
  const isDirty = currentFingerprint !== baselineFingerprint || pendingDraftCount > 0;
  const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!isDirty || allowNavigationAfterSaveRef.current) return false;
    const currentTarget = `${currentLocation.pathname}${currentLocation.search}${currentLocation.hash}`;
    const nextTarget = `${nextLocation.pathname}${nextLocation.search}${nextLocation.hash}`;
    return currentTarget !== nextTarget;
  });
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
  const importBlockedByDirty = Boolean(onImportDynamicExcelBlock) && isDirty;
  const attachDynamicExcelBlockDisabled =
    busy || importingBlock || importBlockedByDirty || excelBlockJsonList.length >= MAX_DYNAMIC_FORM_TABLE_BLOCKS;

  useEffect(() => {
    if (selectedFieldId || selectedExcelBlockJson) {
      setDetailPanelOpen(true);
    }
  }, [selectedExcelBlockJson, selectedFieldId]);

  useEffect(() => {
    if (!isDirty) return;
    const guardBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guardBeforeUnload);
    return () => window.removeEventListener("beforeunload", guardBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (navigationBlocker.state === "blocked" && !isDirty) {
      navigationBlocker.proceed();
    }
  }, [isDirty, navigationBlocker]);

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

  const selectSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setSelectedFieldId(null);
  };

  const removeSection = (sectionId: string) => {
    if (readOnly) return;
    const sectionIndex = sections.findIndex((section) => section.id === sectionId);
    if (sectionIndex < 0) return;
    if (sections.length <= 1) {
      setError("Cần giữ ít nhất một phần trong biểu mẫu.");
      return;
    }

    const targetSection =
      sections[sectionIndex - 1] ?? sections[sectionIndex + 1] ?? sections[0];
    if (!targetSection) return;
    const ok = window.confirm("Xóa phần này và chuyển các trường sang phần liền kề?");
    if (!ok) return;

    setValue((current) => {
      const nextSections = normalizeSections(
        current.sections
          .filter((section) => section.id !== sectionId)
          .map((section, index) => ({ ...section, order: index })),
      );
      return {
        ...current,
        sections: nextSections,
        fields: current.fields.map((field) =>
          field.sectionId === sectionId ? { ...field, sectionId: targetSection.id } : field,
        ),
        excelBlockJson: reassignSectionInBlockJson(
          current.excelBlockJson,
          sectionId,
          targetSection.id,
        ),
        blocksJson: reassignSectionInBlocksJson(
          current.blocksJson,
          sectionId,
          targetSection.id,
        ),
      };
    });
    setSelectedSectionId(targetSection.id);
    setSelectedFieldId(null);
    setSelectedBlockIndex(0);
    setDetailPanelOpen(false);
    setError(null);
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

  const addField = (
    type: DynamicFormFieldType,
    geometry?: Partial<Pick<DynamicFormField, "canvasX" | "canvasY" | "canvasW" | "canvasH">>,
  ) => {
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
    const nextField = geometry
      ? {
          ...field,
          ...geometry,
          colSpan: geometry.canvasW ? widthToColSpan(geometry.canvasW) : field.colSpan,
          minHeight: geometry.canvasH ? clampCanvasHeight(geometry.canvasH) : field.minHeight,
        }
      : field;
    setValue((current) => ({ ...current, fields: [...current.fields, nextField] }));
    setSelectedFieldId(nextField.id);
  };

  const addFieldAtCanvasPoint = (type: DynamicFormFieldType, x: number, y: number) => {
    if (!selectedSection) return;
    const base = createDefaultField(
      type,
      selectedSection.id,
      fields.filter((field) => field.sectionId === selectedSection.id).length,
    );
    const canvasW = base.canvasW ?? 320;
    const canvasH = base.canvasH ?? Math.max(base.minHeight, 88);
    const snapped = snapCanvasMoveBox(
      {
        x: x - 24,
        y: y - 18,
        width: canvasW,
        height: canvasH,
      },
      fields.filter((field) => field.sectionId === selectedSection.id),
      null,
    );
    addField(type, {
      canvasX: snapped.x,
      canvasY: snapped.y,
      canvasW: snapped.width,
      canvasH: snapped.height,
    });
    setCanvasGuides(snapped.guides);
    window.setTimeout(() => setCanvasGuides([]), 450);
  };

  const moveFieldToCanvasPoint = (
    fieldId: string,
    x: number,
    y: number,
    offsetX = 0,
    offsetY = 0,
  ) => {
    const field = fields.find((item) => item.id === fieldId);
    if (!field) return;
    const canvasW = field.canvasW ?? canvasWidthFromColSpan(field.colSpan);
    const canvasH = field.canvasH ?? Math.max(field.minHeight, CANVAS_FIELD_MIN_HEIGHT);
    const snapped = snapCanvasMoveBox(
      {
        x: x - offsetX,
        y: y - offsetY,
        width: canvasW,
        height: canvasH,
      },
      fields.filter((item) => item.sectionId === field.sectionId),
      fieldId,
    );
    updateField(fieldId, {
      canvasX: snapped.x,
      canvasY: snapped.y,
      canvasW: snapped.width,
      canvasH: snapped.height,
    });
    setCanvasGuides(snapped.guides);
    window.setTimeout(() => setCanvasGuides([]), 450);
  };

  const updatePreviewValue = (fieldId: string, nextValue: unknown) => {
    setPreviewValues((current) => ({ ...current, [fieldId]: nextValue }));
  };

  const getCanvasPointFromEvent = (event: React.DragEvent<HTMLElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (event.clientX - rect.left) / canvasZoom,
      y: (event.clientY - rect.top) / canvasZoom,
    };
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (readOnly || preview) return;

    const point = getCanvasPointFromEvent(event);
    const payload = readCanvasDragPayload(event.dataTransfer.getData(CANVAS_DROP_MIME));
    if (!point || !payload) return;

    if (payload.kind === "fieldType") {
      addFieldAtCanvasPoint(payload.type, point.x, point.y);
      return;
    }

    moveFieldToCanvasPoint(
      payload.fieldId,
      point.x,
      point.y,
      payload.offsetX,
      payload.offsetY,
    );
  };

  const handleCanvasDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (readOnly || preview) return;
    if (event.dataTransfer.types.includes(CANVAS_DROP_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  };

  const setNextCanvasZoom = (direction: -1 | 1) => {
    const currentIndex = CANVAS_ZOOM_LEVELS.reduce(
      (bestIndex, zoom, index) =>
        Math.abs(zoom - canvasZoom) < Math.abs(CANVAS_ZOOM_LEVELS[bestIndex] - canvasZoom)
          ? index
          : bestIndex,
      0,
    );
    const nextIndex = Math.min(
      CANVAS_ZOOM_LEVELS.length - 1,
      Math.max(0, currentIndex + direction),
    );
    setCanvasZoom(CANVAS_ZOOM_LEVELS[nextIndex]);
  };

  const handleMutationError = (err: unknown, fallback: string) => {
    const apiError = normalizeApiError(err);
    if (apiError.errorCode === ApiErrorCode.DynamicFormRevisionConflict) {
      setRevisionConflict(true);
      setError(null);
      return;
    }
    setError(apiError.message || fallback);
  };

  const importDynamicExcelBlock = async (dynamicExcelId: string) => {
    if ((!onImportDynamicExcelBlock && !onBuildDynamicExcelBlock) || readOnly || importingBlock) return;
    if (onImportDynamicExcelBlock && isDirty) {
      setError("Hãy lưu hoặc bỏ các thay đổi hiện tại trước khi nhập bảng Excel động.");
      return;
    }
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
          const normalizedNext = normalizeEditorState(next);
          setValue(normalizedNext);
          setBaselineFingerprint(editorStateFingerprint(normalizedNext));
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
      handleMutationError(err, "Không nhập được bảng Excel động.");
    } finally {
      setImportingBlock(false);
    }
  };

  const removeField = (fieldId: string) => {
    setValue((current) => ({ ...current, fields: current.fields.filter((x) => x.id !== fieldId) }));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  const moveField = (fieldId: string, direction: -1 | 1) => {
    setValue((current) => ({
      ...current,
      fields: moveDynamicFormField(current.fields, fieldId, direction),
    }));
  };

  const save = async (): Promise<boolean> => {
    if (!onSave || (readOnly && !allowStatisticConfigEdit)) return false;
    try {
      if (pendingDraftsRef.current.size > 0) {
        flushSync(() => pendingDraftRegistry.flushPending());
      }
      const latest = latestEditorStateRef.current;
      const latestExcelBlockJsonList = getDynamicFormBlockJsonList(
        latest.value.blocksJson,
        latest.value.excelBlockJson,
        latest.sections[0]?.id,
      );
      const blankSection = latest.sections.find((section) => !section.title?.trim());
      if (blankSection) {
        setPreview(false);
        setSelectedSectionId(blankSection.id);
        setError("Tiêu đề phần không được để trống.");
        return false;
      }

      if (latestExcelBlockJsonList.length > MAX_DYNAMIC_FORM_TABLE_BLOCKS) {
        setError(`Biểu mẫu động chỉ được có tối đa ${MAX_DYNAMIC_FORM_TABLE_BLOCKS} bảng Excel động.`);
        return false;
      }

      if (latest.fields.length > MAX_DYNAMIC_FORM_FIELDS) {
        setError(`Biểu mẫu động chỉ được có tối đa ${MAX_DYNAMIC_FORM_FIELDS} trường dữ liệu.`);
        return false;
      }

      const payload = toSubmit({
        ...latest.value,
        sections: latest.sections,
        fields: latest.fields,
      });
      if (!payload.name) {
        setError("Tên biểu mẫu không được để trống.");
        return false;
      }
      setError(null);
      setRevisionConflict(false);
      await onSave(payload);
      setBaselineFingerprint(latest.currentFingerprint);
      return true;
    } catch (err) {
      handleMutationError(err, "Không lưu được biểu mẫu động.");
      return false;
    }
  };

  const navigateAfterSuccessfulSave = () => {
    allowNavigationAfterSaveRef.current = true;
    onBack();
    window.setTimeout(() => {
      allowNavigationAfterSaveRef.current = false;
    }, 0);
  };

  const saveAndBack = async (): Promise<boolean> => {
    const saved = await save();
    if (saved) navigateAfterSuccessfulSave();
    return saved;
  };

  const requestBack = () => onBack();

  const saveAndLeave = async () => {
    setSavingFromDialog(true);
    const saved = await save();
    setSavingFromDialog(false);
    if (!saved) return;
    if (navigationBlocker.state === "blocked") {
      navigationBlocker.proceed();
      return;
    }
    navigateAfterSuccessfulSave();
  };

  const publishForm = async () => {
    if (!onPublish) return;
    if (isDirty) {
      setError("Hãy lưu thay đổi hiện tại trước khi công bố biểu mẫu.");
      return;
    }
    try {
      setError(null);
      setRevisionConflict(false);
      await onPublish();
    } catch (err) {
      handleMutationError(err, "Không công bố được biểu mẫu động.");
    }
  };

  const reloadLatest = async () => {
    setReloadingLatest(true);
    try {
      if (onReload) {
        await onReload();
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(normalizeApiError(err).message || "Không tải được bản mới nhất.");
    } finally {
      setReloadingLatest(false);
    }
  };

  const selectedSectionFields = fields.filter((x) => x.sectionId === selectedSection?.id);
  const excelBlocksInSelectedSection = excelBlockJsonList
    .map((blockJson, index) => ({ blockJson, index }))
    .filter(({ blockJson }) => {
      const sectionId = getExcelBlockSectionId(blockJson) ?? sections[0]?.id ?? "";
      return sectionId === selectedSection?.id;
    });
  const selectedBlockInSection =
    excelBlocksInSelectedSection.find(({ index }) => index === effectiveSelectedBlockIndex) ??
    excelBlocksInSelectedSection[0] ??
    null;
  const detailBlockJson = selectedField ? null : selectedBlockInSection?.blockJson ?? null;
  const detailOpen = detailPanelOpen && (Boolean(selectedField) || Boolean(detailBlockJson));
  const sectionTabItems = sections.map((section) => ({
    section,
    fieldCount: fields.filter((field) => field.sectionId === section.id).length,
    blockCount: excelBlockJsonList.filter((blockJson) => {
      const sectionId = getExcelBlockSectionId(blockJson) ?? sections[0]?.id ?? "";
      return sectionId === section.id;
    }).length,
  }));

  return (
    <PendingEditorDraftContext.Provider value={pendingDraftRegistry}>
      <Box
        sx={{
          height: { xs: "auto", lg: `calc(100vh - ${88 + workspaceHeightOffset}px)` },
          minHeight: { xs: "auto", lg: 720 },
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          bgcolor: "#edf2f6",
          p: { xs: 1, md: 1.5 },
          overflow: "hidden",
        }}
      >
      <DynamicFormWorkspaceHeader
        code={value.code}
        name={value.name}
        description={value.description ?? ""}
        tagCodes={value.tagCodes}
        isActive={value.isActive}
        sections={sectionTabItems}
        selectedSection={selectedSection}
        preview={preview}
        readOnly={readOnly}
        busy={busy || importingBlock}
        allowStatisticConfigEdit={allowStatisticConfigEdit}
        hasPublish={Boolean(onPublish)}
        isDirty={isDirty}
        publishBlocked={isDirty}
        onBack={requestBack}
        onSave={saveAndBack}
        onPublish={onPublish ? publishForm : undefined}
        onPatchForm={setPatch}
        onSelectSection={selectSection}
        onAddSection={addSection}
        onRemoveSection={removeSection}
        onUpdateSection={updateSection}
        onOpenLabelManager={() => setLabelManagerOpen(true)}
      />

      {locked && (
        <Alert severity="info">
          {allowStatisticConfigEdit
            ? "Biểu mẫu đã công bố: chỉ các trường/cột thống kê được cập nhật theo giới hạn hằng tháng."
            : "Biểu mẫu đã công bố và đang ở chế độ chỉ xem."}
        </Alert>
      )}
      {onPublish && isDirty && (
        <Alert severity="warning">
          Có thay đổi chưa lưu. Hãy lưu trước khi công bố biểu mẫu.
        </Alert>
      )}
      {importBlockedByDirty && (
        <Alert severity="warning">
          Chức năng nhập bảng Excel động tạm khóa để không ghi đè thay đổi chưa lưu. Hãy lưu hoặc rời màn hình rồi mở lại.
        </Alert>
      )}
      {revisionConflict && (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              disabled={reloadingLatest}
              onClick={() => void reloadLatest()}
            >
              {reloadingLatest ? "Đang tải..." : "Tải bản mới"}
            </Button>
          }
        >
          Biểu mẫu đã được thay đổi ở nơi khác. Tải bản mới sẽ thay thế các thay đổi cục bộ chưa lưu trên màn hình này.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: detailOpen ? "292px minmax(0, 1fr) 368px" : "292px minmax(0, 1fr) 0px",
          },
          gap: 1.25,
          transition: "grid-template-columns 180ms ease",
          overflow: { xs: "visible", lg: "hidden" },
        }}
      >
        <DynamicFormFieldSidebar
          fields={selectedSectionFields}
          excelBlocks={excelBlocksInSelectedSection}
          selectedFieldId={selectedFieldId}
          selectedBlockIndex={effectiveSelectedBlockIndex}
          preview={preview}
          readOnly={readOnly}
          canAttachDynamicExcelBlock={canAttachDynamicExcelBlock}
          attachDynamicExcelBlockDisabled={attachDynamicExcelBlockDisabled}
          onTogglePreview={() => setPreview((current) => !current)}
          onAddField={addField}
          onSelectField={(fieldId) => {
            setSelectedFieldId(fieldId);
            setDetailPanelOpen(true);
          }}
          onDeleteField={removeField}
          onMoveField={moveField}
          onStartFieldDrag={(event, field) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(
              CANVAS_DROP_MIME,
              JSON.stringify({ kind: "field", fieldId: field.id, offsetX: 16, offsetY: 16 }),
            );
          }}
          onImportDynamicExcelBlock={importDynamicExcelBlock}
          onSelectExcelBlock={(index) => {
            setSelectedBlockIndex(index);
            setSelectedFieldId(null);
            setDetailPanelOpen(true);
          }}
          onRemoveExcelBlock={removeExcelBlockAt}
        />

        <Box
          sx={{
            minWidth: 0,
            minHeight: { xs: 640, lg: 0 },
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              mb: 1,
              px: 0.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={850} noWrap>
                {selectedSection ? getSectionTitleLabel(selectedSection) : "Trang biểu mẫu"}
              </Typography>
              {selectedSection?.description && (
                <Typography variant="caption" color="text.secondary" noWrap component="div">
                  {selectedSection.description}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
              <Tooltip title="Thu nhỏ">
                <IconButton size="small" onClick={() => setNextCanvasZoom(-1)}>
                  <ZoomOutIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Chip size="small" variant="outlined" label={`${Math.round(canvasZoom * 100)}%`} />
              <Tooltip title="Phóng to">
                <IconButton size="small" onClick={() => setNextCanvasZoom(1)}>
                  <ZoomInIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Vừa khung">
                <IconButton size="small" onClick={() => setCanvasZoom(0.7)}>
                  <FitScreenIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          <DynamicFormPageCanvas
            canvasRef={canvasRef}
            section={selectedSection}
            fields={selectedSectionFields}
            excelBlocks={excelBlocksInSelectedSection}
            selectedFieldId={selectedFieldId}
            selectedBlockIndex={effectiveSelectedBlockIndex}
            preview={preview}
            readOnly={readOnly}
            zoom={canvasZoom}
            previewValues={previewValues}
            canAttachDynamicExcelBlock={false}
            attachDynamicExcelBlockDisabled={attachDynamicExcelBlockDisabled}
            alignmentGuides={canvasGuides}
            showHeader={false}
            fillHeight
            showExcelBlocks={false}
            onZoomIn={() => setNextCanvasZoom(1)}
            onZoomOut={() => setNextCanvasZoom(-1)}
            onZoomFit={() => setCanvasZoom(0.7)}
            onCanvasDrop={handleCanvasDrop}
            onCanvasDragOver={handleCanvasDragOver}
            onImportDynamicExcelBlock={importDynamicExcelBlock}
            onSelectField={(fieldId) => {
              setSelectedFieldId(fieldId);
              setDetailPanelOpen(true);
            }}
            onRenameField={(fieldId, name) => updateField(fieldId, { name })}
            onResizeField={(fieldId, patch) => updateField(fieldId, patch)}
            onDeleteField={removeField}
            onPreviewValueChange={updatePreviewValue}
            onAlignmentGuidesChange={setCanvasGuides}
            onSelectExcelBlock={(index) => {
              setSelectedBlockIndex(index);
              setSelectedFieldId(null);
              setDetailPanelOpen(true);
            }}
            onRemoveExcelBlock={removeExcelBlockAt}
          />
        </Box>

        <DynamicFormDetailDrawer
          open={detailOpen}
          field={selectedField}
          blockJson={detailBlockJson}
          readOnly={readOnly}
          statisticReadOnly={statisticReadOnly}
          statisticConfigVisible={allowStatisticConfigEdit}
          statisticConfigEnabled={
            allowStatisticConfigEdit && Boolean(value.blocksJson?.trim())
          }
          onClose={() => setDetailPanelOpen(false)}
          onChangeField={(patch) => {
            if (!selectedField) return;
            updateField(selectedField.id, patch);
          }}
          onChangeBlock={(nextBlockJson) => {
            const blockIndex = selectedBlockInSection?.index;
            if (blockIndex == null || !allowStatisticConfigEdit || statisticReadOnly) return;
            setValue((current) => {
              if (!current.blocksJson?.trim()) return current;
              return {
                ...current,
                ...setDynamicFormBlockJson(
                  current.blocksJson,
                  current.excelBlockJson,
                  blockIndex,
                  nextBlockJson,
                ),
              };
            });
          }}
        />
      </Box>

      <LabelManagerDialog
        open={labelManagerOpen}
        onClose={() => setLabelManagerOpen(false)}
      />
      <UnsavedChangesDialog
        open={navigationBlocker.state === "blocked"}
        message="Biểu mẫu đang có thay đổi chưa lưu. Bạn muốn lưu trước khi rời trang hay bỏ các thay đổi này?"
        saving={savingFromDialog || busy}
        onSave={() => void saveAndLeave()}
        onDiscard={() => {
          if (navigationBlocker.state === "blocked") navigationBlocker.proceed();
        }}
        onCancel={() => {
          if (navigationBlocker.state === "blocked") navigationBlocker.reset();
        }}
      />
      </Box>
    </PendingEditorDraftContext.Provider>
  );
}

type SectionTabItem = {
  section: DynamicFormSection;
  fieldCount: number;
  blockCount: number;
};

function DynamicFormWorkspaceHeader({
  code,
  name,
  description,
  tagCodes,
  isActive,
  sections,
  selectedSection,
  preview,
  readOnly,
  busy,
  allowStatisticConfigEdit,
  hasPublish,
  isDirty,
  publishBlocked,
  onBack,
  onSave,
  onPublish,
  onPatchForm,
  onSelectSection,
  onAddSection,
  onRemoveSection,
  onUpdateSection,
  onOpenLabelManager,
}: {
  code?: string | null;
  name: string;
  description: string;
  tagCodes: string[];
  isActive: boolean;
  sections: SectionTabItem[];
  selectedSection?: DynamicFormSection;
  preview: boolean;
  readOnly: boolean;
  busy: boolean;
  allowStatisticConfigEdit: boolean;
  hasPublish: boolean;
  isDirty: boolean;
  publishBlocked: boolean;
  onBack: () => void;
  onSave: () => Promise<boolean>;
  onPublish?: () => Promise<void>;
  onPatchForm: (patch: Partial<DynamicFormEditorValue>) => void;
  onSelectSection: (sectionId: string) => void;
  onAddSection: () => void;
  onRemoveSection: (sectionId: string) => void;
  onUpdateSection: (id: string, patch: Partial<DynamicFormSection>) => void;
  onOpenLabelManager: () => void;
}) {
  const canSave = !readOnly || allowStatisticConfigEdit;

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: { xs: 1, md: 1.25 },
        display: "flex",
        flexDirection: "column",
        gap: 1,
        minWidth: 0,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", md: "flex-start" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
          <Tooltip title={uiText(UITextKey.TextBack)}>
            <IconButton onClick={onBack} sx={{ mt: 0.25 }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(240px, 360px) minmax(260px, 1fr)" },
              gap: 1,
            }}
          >
            <Stack spacing={0.75}>
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  variant="outlined"
                  label={code || "Biểu mẫu mới"}
                  sx={{ maxWidth: 220 }}
                />
                {preview && <Chip size="small" color="primary" label="Nhập thử" />}
                {isDirty && <Chip size="small" color="warning" label="Chưa lưu" />}
              </Stack>
              <DebouncedTextField
                draftId="form:name"
                size="small"
                label={uiText(UITextKey.TextTenForm)}
                value={name}
                disabled={readOnly}
                onCommit={(nextName) => onPatchForm({ name: nextName })}
              />
            </Stack>

            <Stack spacing={0.75}>
              <DebouncedTextField
                draftId="form:description"
                size="small"
                label={uiText(UITextKey.TextMoTa)}
                value={description}
                disabled={readOnly}
                onCommit={(nextDescription) => onPatchForm({ description: nextDescription })}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <LabelPicker
                    value={tagCodes}
                    disabled={readOnly}
                    usage="tag"
                    label={uiText(UITextKey.TextFormLabels)}
                    placeholder={uiText(UITextKey.TextChonNhanForm)}
                    onChange={(codes) => onPatchForm({ tagCodes: codes })}
                  />
                </Box>
                <Tooltip title="Quản lý nhãn">
                  <span>
                    <IconButton size="small" onClick={onOpenLabelManager}>
                      <LabelOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <FormControlLabel
                  sx={{ flexShrink: 0, mr: 0 }}
                  control={
                    <Switch
                      checked={isActive}
                      disabled={readOnly}
                      onChange={(event) => onPatchForm({ isActive: event.target.checked })}
                    />
                  }
                  label={uiText(UITextKey.TextActive)}
                />
              </Stack>
            </Stack>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
          {hasPublish && !readOnly && (
            <Tooltip
              title={publishBlocked ? "Hãy lưu các thay đổi hiện tại trước khi công bố." : ""}
            >
              <span>
                <Button
                  variant="outlined"
                  onClick={() => void onPublish?.()}
                  disabled={busy || publishBlocked}
                >
                  Công bố
                </Button>
              </span>
            </Tooltip>
          )}
          {canSave && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => void onSave()}
              disabled={busy}
            >
              Lưu
            </Button>
          )}
        </Stack>
      </Stack>

      <DynamicFormSectionTabs
        sections={sections}
        selectedSectionId={selectedSection?.id ?? ""}
        readOnly={readOnly}
        onSelect={onSelectSection}
        onAdd={onAddSection}
        onRemove={onRemoveSection}
      />

      {selectedSection && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(220px, 320px) minmax(260px, 1fr) minmax(220px, 280px)",
            },
            gap: 1,
            alignItems: "flex-start",
          }}
        >
          <DebouncedTextField
            draftId={`section:${selectedSection.id}:title`}
            size="small"
            label={uiText(UITextKey.TextSectionTitle)}
            value={selectedSection.title}
            disabled={readOnly}
            resetKey={selectedSection.id}
            error={!selectedSection.title.trim()}
            helperText={
              !selectedSection.title.trim()
                ? "Tiêu đề phần không được để trống."
                : undefined
            }
            onCommit={(title) => onUpdateSection(selectedSection.id, { title })}
          />
          <DebouncedTextField
            draftId={`section:${selectedSection.id}:description`}
            size="small"
            label={uiText(UITextKey.TextSectionDescription)}
            value={selectedSection.description ?? ""}
            disabled={readOnly}
            resetKey={selectedSection.id}
            onCommit={(nextDescription) =>
              onUpdateSection(selectedSection.id, { description: nextDescription })
            }
          />
          <LabelPicker
            value={selectedSection.tagCodes ?? []}
            disabled={readOnly}
            usage="tag"
            label={uiText(UITextKey.TextSectionLabels)}
            placeholder={uiText(UITextKey.TextChonNhanSection)}
            onChange={(codes) => onUpdateSection(selectedSection.id, { tagCodes: codes })}
          />
        </Box>
      )}
    </Box>
  );
}

function DynamicFormSectionTabs({
  sections,
  selectedSectionId,
  readOnly,
  onSelect,
  onAdd,
  onRemove,
}: {
  sections: SectionTabItem[];
  selectedSectionId: string;
  readOnly: boolean;
  onSelect: (sectionId: string) => void;
  onAdd: () => void;
  onRemove: (sectionId: string) => void;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-end",
        gap: 0.5,
        overflowX: "auto",
        borderBottom: "1px solid",
        borderColor: "divider",
        pb: 0,
      }}
    >
      {sections.map(({ section, fieldCount, blockCount }) => {
        const active = section.id === selectedSectionId;
        return (
          <Box
            key={section.id}
            component="button"
            type="button"
            onClick={() => onSelect(section.id)}
            sx={{
              minWidth: 156,
              maxWidth: 240,
              height: 38,
              px: 1,
              border: "1px solid",
              borderColor: active ? "primary.main" : "divider",
              borderBottomColor: active ? "background.paper" : "divider",
              borderRadius: "8px 8px 0 0",
              bgcolor: active ? "background.paper" : "#f4f7fa",
              color: "text.primary",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              transform: active ? "translateY(1px)" : "none",
              transition: "background-color 160ms ease, border-color 160ms ease",
              "&:hover": {
                bgcolor: active ? "background.paper" : "#e9eef4",
              },
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1, textAlign: "left" }}>
              <Typography variant="body2" fontWeight={active ? 850 : 700} noWrap>
                {getSectionTitleLabel(section)}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {fieldCount} trường{blockCount ? `, ${blockCount} bảng` : ""}
              </Typography>
            </Box>
            {!readOnly && active && sections.length > 1 && (
              <Tooltip title="Xóa phần">
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(section.id);
                  }}
                  sx={{ width: 26, height: 26, flexShrink: 0 }}
                >
                  <DeleteOutlineIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      })}

      {!readOnly && (
        <Tooltip title={uiText(UITextKey.TextAddSection)}>
          <IconButton
            size="small"
            onClick={onAdd}
            sx={{
              width: 34,
              height: 34,
              mb: 0.25,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              bgcolor: "#fff",
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

function DynamicFormFieldSidebar({
  fields,
  excelBlocks,
  selectedFieldId,
  selectedBlockIndex,
  preview,
  readOnly,
  canAttachDynamicExcelBlock,
  attachDynamicExcelBlockDisabled,
  onTogglePreview,
  onAddField,
  onSelectField,
  onDeleteField,
  onMoveField,
  onStartFieldDrag,
  onImportDynamicExcelBlock,
  onSelectExcelBlock,
  onRemoveExcelBlock,
}: {
  fields: DynamicFormField[];
  excelBlocks: Array<{ blockJson: string; index: number }>;
  selectedFieldId: string | null;
  selectedBlockIndex: number;
  preview: boolean;
  readOnly: boolean;
  canAttachDynamicExcelBlock: boolean;
  attachDynamicExcelBlockDisabled: boolean;
  onTogglePreview: () => void;
  onAddField: (type: DynamicFormFieldType) => void;
  onSelectField: (fieldId: string) => void;
  onDeleteField: (fieldId: string) => void;
  onMoveField: (fieldId: string, direction: -1 | 1) => void;
  onStartFieldDrag: (
    event: React.DragEvent<HTMLElement>,
    field: DynamicFormField,
  ) => void;
  onImportDynamicExcelBlock: (dynamicExcelId: string) => Promise<void>;
  onSelectExcelBlock: (index: number) => void;
  onRemoveExcelBlock: (index: number) => void;
}) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1,
        minHeight: 0,
        overflow: "auto",
      }}
    >
      <Stack spacing={1.25}>
        <Button
          fullWidth
          variant={preview ? "contained" : "outlined"}
          startIcon={preview ? <EditIcon /> : <PreviewIcon />}
          onClick={onTogglePreview}
        >
          {preview ? "Quay lại thiết kế" : "Nhập thử"}
        </Button>

        {!readOnly && !preview && (
          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={850}>
              Danh sách trường
            </Typography>
            <Grid container spacing={0.75}>
              {palette.map((item) => (
                <Grid key={item.type} size={{ xs: 6 }}>
                  <FieldTypePaletteButton
                    item={item}
                    onClick={() => onAddField(item.type)}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "copyMove";
                      event.dataTransfer.setData(
                        CANVAS_DROP_MIME,
                        JSON.stringify({ kind: "fieldType", type: item.type }),
                      );
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Stack>
        )}

        <Divider />

        <Stack spacing={0.75}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={850}>
              Trường trong phần
            </Typography>
            <Chip size="small" label={fields.length} variant="outlined" />
          </Stack>
          {fields.map((field) => (
            <FieldListCard
              key={field.id}
              field={field}
              selected={field.id === selectedFieldId}
              preview={preview}
              readOnly={readOnly}
              onSelect={() => onSelectField(field.id)}
              onDelete={() => onDeleteField(field.id)}
              onMoveUp={() => onMoveField(field.id, -1)}
              onMoveDown={() => onMoveField(field.id, 1)}
              onStartDrag={(event) => onStartFieldDrag(event, field)}
            />
          ))}
          {fields.length === 0 && (
            <Box
              sx={{
                minHeight: 96,
                display: "grid",
                placeItems: "center",
                border: "1px dashed",
                borderColor: "divider",
                color: "text.secondary",
                px: 1,
                textAlign: "center",
              }}
            >
              <Typography variant="body2">{uiText(UITextKey.TextNoFields)}</Typography>
            </Box>
          )}
        </Stack>

        {(canAttachDynamicExcelBlock || excelBlocks.length > 0) && (
          <>
            <Divider />
            <Stack spacing={0.75}>
              {canAttachDynamicExcelBlock && (
                <DynamicExcelPicker
                  value={null}
                  onChange={(item) => {
                    if (item?.id) void onImportDynamicExcelBlock(item.id);
                  }}
                  disabled={attachDynamicExcelBlockDisabled}
                  triggerMode="button"
                  triggerLabel="Thêm bảng biểu động"
                />
              )}
              {excelBlocks.map(({ blockJson, index }) => (
                <ExcelBlockCard
                  key={`${getExcelBlockTitle(blockJson, index)}_${index}`}
                  blockJson={blockJson}
                  index={index}
                  selected={index === selectedBlockIndex && !selectedFieldId}
                  preview={preview}
                  readOnly={readOnly}
                  onSelect={() => onSelectExcelBlock(index)}
                  onRemove={() => onRemoveExcelBlock(index)}
                />
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </Box>
  );
}

function FieldListCard({
  field,
  selected,
  preview,
  readOnly,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
  onStartDrag,
}: {
  field: DynamicFormField;
  selected: boolean;
  preview: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onStartDrag: (event: React.DragEvent<HTMLElement>) => void;
}) {
  const canMove = !readOnly && !preview;
  return (
    <Paper
      variant="outlined"
      onClick={onSelect}
      sx={{
        p: 0.75,
        borderRadius: 1,
        borderColor: selected ? "primary.main" : "divider",
        boxShadow: selected ? "0 0 0 2px rgba(25, 118, 210, 0.16)" : "none",
        cursor: "pointer",
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center">
        {canMove && (
          <Tooltip title="Kéo vào vùng thiết kế">
            <Box
              component="span"
              draggable
              onDragStart={onStartDrag}
              sx={{
                width: 24,
                height: 24,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
                cursor: "grab",
                flexShrink: 0,
              }}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          </Tooltip>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" fontWeight={800} noWrap>
            {getDynamicFormFieldDisplayName(field)}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
            <Chip size="small" label={fieldTypeLabels[field.type]} variant="outlined" />
            {field.required && <Chip size="small" label="Bắt buộc" variant="outlined" />}
            {field.isStatistic && (
              <Chip size="small" label="Thống kê" color="primary" variant="outlined" />
            )}
          </Stack>
        </Box>
        {canMove && (
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
            <Tooltip title={uiText(UITextKey.TextMoveUp)}>
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onMoveUp();
                }}
              >
                <ArrowUpwardIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title={uiText(UITextKey.TextMoveDown)}>
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onMoveDown();
                }}
              >
                <ArrowDownwardIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title={uiText(UITextKey.TextXoa2)}>
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
              >
                <DeleteOutlineIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

function DynamicFormDetailDrawer({
  open,
  field,
  blockJson,
  readOnly,
  statisticReadOnly,
  statisticConfigVisible,
  statisticConfigEnabled,
  onClose,
  onChangeField,
  onChangeBlock,
}: {
  open: boolean;
  field: DynamicFormField | null;
  blockJson: string | null;
  readOnly: boolean;
  statisticReadOnly: boolean;
  statisticConfigVisible: boolean;
  statisticConfigEnabled: boolean;
  onClose: () => void;
  onChangeField: (patch: Partial<DynamicFormField>) => void;
  onChangeBlock?: (nextBlockJson: string) => void;
}) {
  return (
    <Box
      sx={{
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        opacity: open ? 1 : 0,
        transform: open ? "translateX(0)" : "translateX(18px)",
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 180ms ease, transform 180ms ease",
        display: { xs: open ? "block" : "none", lg: "block" },
      }}
    >
      <Stack spacing={1} sx={{ height: "100%", minHeight: 0 }}>
        <Box
          sx={{
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            px: 1.25,
            py: 0.85,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={850} noWrap>
              {field ? getDynamicFormFieldDisplayName(field) : blockJson ? "Bảng biểu" : "Chi tiết"}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {field ? fieldTypeLabels[field.type] : blockJson ? "Cấu hình bảng" : ""}
            </Typography>
          </Box>
          <Tooltip title="Đóng">
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ minHeight: 0, overflow: "auto" }}>
          {blockJson && !field ? (
            <ExcelBlockSummaryPanel
              blockJson={blockJson}
              statisticReadOnly={statisticReadOnly}
              statisticConfigVisible={statisticConfigVisible}
              statisticConfigEnabled={statisticConfigEnabled}
              onChangeBlock={onChangeBlock}
            />
          ) : (
            <FieldSettingsPanel
              field={field}
              readOnly={readOnly}
              statisticReadOnly={statisticReadOnly}
              onChange={onChangeField}
            />
          )}
        </Box>
      </Stack>
    </Box>
  );
}

type CanvasGuideLine = {
  axis: "x" | "y";
  value: number;
};

type CanvasBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CanvasSnapResult = CanvasBox & {
  guides: CanvasGuideLine[];
};

type CanvasDragPayload =
  | { kind: "fieldType"; type: DynamicFormFieldType }
  | { kind: "field"; fieldId: string; offsetX: number; offsetY: number };

function DynamicFormPageCanvas({
  canvasRef,
  section,
  fields,
  excelBlocks,
  selectedFieldId,
  selectedBlockIndex,
  preview,
  readOnly,
  zoom,
  previewValues,
  canAttachDynamicExcelBlock,
  attachDynamicExcelBlockDisabled,
  alignmentGuides,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onCanvasDrop,
  onCanvasDragOver,
  onImportDynamicExcelBlock,
  onSelectField,
  onRenameField,
  onResizeField,
  onDeleteField,
  onPreviewValueChange,
  onAlignmentGuidesChange,
  onSelectExcelBlock,
  onRemoveExcelBlock,
  showHeader = true,
  fillHeight = false,
  showExcelBlocks = true,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  section?: DynamicFormSection;
  fields: DynamicFormField[];
  excelBlocks: Array<{ blockJson: string; index: number }>;
  selectedFieldId: string | null;
  selectedBlockIndex: number;
  preview: boolean;
  readOnly: boolean;
  zoom: number;
  previewValues: Record<string, unknown>;
  canAttachDynamicExcelBlock: boolean;
  attachDynamicExcelBlockDisabled: boolean;
  alignmentGuides: CanvasGuideLine[];
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onCanvasDrop: (event: React.DragEvent<HTMLElement>) => void;
  onCanvasDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onImportDynamicExcelBlock: (dynamicExcelId: string) => Promise<void>;
  onSelectField: (fieldId: string) => void;
  onRenameField: (fieldId: string, name: string) => void;
  onResizeField: (fieldId: string, patch: Partial<DynamicFormField>) => void;
  onDeleteField: (fieldId: string) => void;
  onPreviewValueChange: (fieldId: string, value: unknown) => void;
  onAlignmentGuidesChange: (guides: CanvasGuideLine[]) => void;
  onSelectExcelBlock: (index: number) => void;
  onRemoveExcelBlock: (index: number) => void;
  showHeader?: boolean;
  fillHeight?: boolean;
  showExcelBlocks?: boolean;
}) {
  return (
    <Stack spacing={1.25} sx={{ height: fillHeight ? "100%" : undefined, minHeight: 0 }}>
      {showHeader && (
      <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1, bgcolor: "background.paper" }}>
        <Stack spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={800} noWrap>
              Trang biểu mẫu
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {section ? getSectionTitleLabel(section) : "Chưa chọn phần"}
            </Typography>
          </Box>
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
          >
            {canAttachDynamicExcelBlock && (
              <Box sx={{ width: { xs: "100%", sm: 260 }, flexShrink: 0 }}>
                <DynamicExcelPicker
                  value={null}
                  onChange={(item) => {
                    if (item?.id) void onImportDynamicExcelBlock(item.id);
                  }}
                  disabled={attachDynamicExcelBlockDisabled}
                  triggerMode="button"
                  triggerLabel="Thêm bảng biểu động"
                />
              </Box>
            )}
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ ml: "auto" }}>
              <Tooltip title="Thu nhỏ">
                <IconButton size="small" onClick={onZoomOut}>
                  <ZoomOutIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Chip size="small" variant="outlined" label={`${Math.round(zoom * 100)}%`} />
              <Tooltip title="Phóng to">
                <IconButton size="small" onClick={onZoomIn}>
                  <ZoomInIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Vừa khung">
                <IconButton size="small" onClick={onZoomFit}>
                  <FitScreenIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Stack>
      </Paper>
      )}

      <Box
        sx={{
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          bgcolor: "#f3f5f7",
          p: { xs: 1, sm: 2 },
          overflow: "auto",
          flex: fillHeight ? 1 : undefined,
          maxHeight: fillHeight ? "none" : "calc(100vh - 240px)",
          minHeight: fillHeight ? 0 : 560,
        }}
      >
        <Box
          sx={{
            width: DYNAMIC_FORM_CANVAS_WIDTH * zoom,
            height: DYNAMIC_FORM_CANVAS_HEIGHT * zoom,
            mx: "auto",
            position: "relative",
          }}
        >
          <Box
            ref={canvasRef}
            onDrop={onCanvasDrop}
            onDragOver={onCanvasDragOver}
            sx={{
              position: "relative",
              width: DYNAMIC_FORM_CANVAS_WIDTH,
              height: DYNAMIC_FORM_CANVAS_HEIGHT,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              bgcolor: "#fff",
              backgroundImage: `
                linear-gradient(to right, rgba(37, 99, 235, 0.055) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(37, 99, 235, 0.055) 1px, transparent 1px)
              `,
              backgroundSize: `${CANVAS_SNAP_GRID_SIZE}px ${CANVAS_SNAP_GRID_SIZE}px`,
              backgroundPosition: `${CANVAS_CONTENT_MARGIN}px ${CANVAS_HEADER_BOTTOM}px`,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: "0 18px 48px rgba(15, 23, 42, 0.12)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: 28,
                left: 40,
                right: 40,
                minHeight: 58,
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                pb: 1.25,
              }}
            >
              <Typography variant="h6" fontWeight={850} sx={{ lineHeight: 1.25 }}>
                {section ? getSectionTitleLabel(section) : "Biểu mẫu"}
              </Typography>
              {section?.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                  {section.description}
                </Typography>
              )}
            </Box>

            {fields.map((field) => (
              <CanvasFieldCard
                key={field.id}
                field={field}
                selected={field.id === selectedFieldId}
                preview={preview}
                readOnly={readOnly}
                zoom={zoom}
                value={previewValues[field.id]}
                onSelect={() => onSelectField(field.id)}
                onRename={(name) => onRenameField(field.id, name)}
                onResize={(patch) => onResizeField(field.id, patch)}
                onDelete={() => onDeleteField(field.id)}
                onPreviewValueChange={(nextValue) => onPreviewValueChange(field.id, nextValue)}
                snapFields={fields}
                onAlignmentGuidesChange={onAlignmentGuidesChange}
              />
            ))}

            <CanvasAlignmentGuides guides={alignmentGuides} />

            {fields.length === 0 && (
              <Box
                sx={{
                  position: "absolute",
                  top: 180,
                  left: 60,
                  right: 60,
                  height: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: (theme) => `1px dashed ${theme.palette.divider}`,
                  color: "text.secondary",
                  pointerEvents: "none",
                }}
              >
                <Typography>Chưa có trường dữ liệu</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {showExcelBlocks && excelBlocks.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1 }}>
          <Stack spacing={1}>
            <Typography fontWeight={800}>Bảng biểu trong phần</Typography>
            {excelBlocks.map(({ blockJson, index }) => (
              <ExcelBlockCard
                key={`${getExcelBlockTitle(blockJson, index)}_${index}`}
                blockJson={blockJson}
                index={index}
                selected={index === selectedBlockIndex && !selectedFieldId}
                preview={preview}
                readOnly={readOnly}
                onSelect={() => onSelectExcelBlock(index)}
                onRemove={() => onRemoveExcelBlock(index)}
              />
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type CanvasInteractionPreview = {
  box: CanvasBox;
  patch: Partial<DynamicFormField>;
  guides: CanvasGuideLine[];
};

function CanvasFieldCard({
  field,
  selected,
  preview,
  readOnly,
  zoom,
  value,
  onSelect,
  onRename,
  onResize,
  onDelete,
  onPreviewValueChange,
  snapFields,
  onAlignmentGuidesChange,
}: {
  field: DynamicFormField;
  selected: boolean;
  preview: boolean;
  readOnly: boolean;
  zoom: number;
  value: unknown;
  onSelect: () => void;
  onRename: (name: string) => void;
  onResize: (patch: Partial<DynamicFormField>) => void;
  onDelete: () => void;
  onPreviewValueChange: (value: unknown) => void;
  snapFields: DynamicFormField[];
  onAlignmentGuidesChange: (guides: CanvasGuideLine[]) => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const interactionFrameRef = useRef<number | null>(null);
  const interactionPreviewRef = useRef<CanvasInteractionPreview | null>(null);
  const interactionGuideKeyRef = useRef("");
  const geometry = getCanvasFieldGeometry(field);
  const displayName = getDynamicFormFieldDisplayName(field);
  const canEditLayout = !readOnly && !preview;
  const nameMissing = !getDynamicFormFieldNameValue(field);
  const nameGeneric = isGenericFieldDisplayName(field.type, getDynamicFormFieldNameValue(field));

  useEffect(() => {
    return () => {
      if (interactionFrameRef.current !== null) {
        window.cancelAnimationFrame(interactionFrameRef.current);
      }
    };
  }, []);

  const applyInteractionPreview = (box: CanvasBox) => {
    const node = cardRef.current;
    if (!node) return;
    node.style.transform = `translate3d(${box.x - geometry.x}px, ${box.y - geometry.y}px, 0)`;
    node.style.width = `${box.width}px`;
    node.style.height = `${box.height}px`;
  };

  const resetInteractionPreview = () => {
    const node = cardRef.current;
    if (!node) return;
    node.style.transform = "";
    node.style.width = "";
    node.style.height = "";
  };

  const scheduleInteractionPreview = (nextPreview: CanvasInteractionPreview) => {
    interactionPreviewRef.current = nextPreview;
    if (interactionFrameRef.current !== null) return;

    interactionFrameRef.current = window.requestAnimationFrame(() => {
      interactionFrameRef.current = null;
      const currentPreview = interactionPreviewRef.current;
      if (!currentPreview) return;

      applyInteractionPreview(currentPreview.box);
      const guideKey = getCanvasGuideKey(currentPreview.guides);
      if (guideKey !== interactionGuideKeyRef.current) {
        interactionGuideKeyRef.current = guideKey;
        onAlignmentGuidesChange(currentPreview.guides);
      }
    });
  };

  const finishInteractionPreview = () => {
    if (interactionFrameRef.current !== null) {
      window.cancelAnimationFrame(interactionFrameRef.current);
      interactionFrameRef.current = null;
    }

    const currentPreview = interactionPreviewRef.current;
    interactionPreviewRef.current = null;
    interactionGuideKeyRef.current = "";
    onAlignmentGuidesChange([]);

    if (currentPreview) {
      applyInteractionPreview(currentPreview.box);
      onResize(currentPreview.patch);
    }
    window.requestAnimationFrame(resetInteractionPreview);
  };

  const startMove = (event: React.MouseEvent<HTMLElement>) => {
    if (!canEditLayout) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startCanvasX = geometry.x;
    const startCanvasY = geometry.y;

    const handleMove = (moveEvent: MouseEvent) => {
      const snapped = snapCanvasMoveBox(
        {
          x: startCanvasX + (moveEvent.clientX - startX) / zoom,
          y: startCanvasY + (moveEvent.clientY - startY) / zoom,
          width: geometry.width,
          height: geometry.height,
        },
        snapFields,
        field.id,
      );
      scheduleInteractionPreview({
        box: snapped,
        patch: getCanvasFieldLayoutPatch(snapped),
        guides: snapped.guides,
      });
    };
    const handleUp = () => {
      finishInteractionPreview();
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const startResize = (event: React.MouseEvent<HTMLElement>, handle: ResizeHandle) => {
    if (!canEditLayout) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startCanvasX = geometry.x;
    const startCanvasY = geometry.y;
    const startW = geometry.width;
    const startH = geometry.height;

    const handleMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
      let nextX = startCanvasX;
      let nextY = startCanvasY;
      let nextW = startW;
      let nextH = startH;

      if (handle.includes("e")) {
        nextW = snapCanvasSize(startW + dx, "width");
      }
      if (handle.includes("s")) {
        nextH = snapCanvasSize(startH + dy, "height");
      }
      if (handle.includes("w")) {
        nextW = snapCanvasSize(startW - dx, "width");
        nextX = clampCanvasX(startCanvasX + (startW - nextW), nextW);
      }
      if (handle.includes("n")) {
        nextH = snapCanvasSize(startH - dy, "height");
        nextY = clampCanvasY(startCanvasY + (startH - nextH), nextH);
      }
      const snapped = snapCanvasResizeBox(
        { x: nextX, y: nextY, width: nextW, height: nextH },
        snapFields,
        field.id,
        handle,
      );
      scheduleInteractionPreview({
        box: snapped,
        patch: getCanvasFieldLayoutPatch(snapped),
        guides: snapped.guides,
      });
    };
    const handleUp = () => {
      finishInteractionPreview();
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  return (
    <Paper
      ref={cardRef}
      data-canvas-field
      variant="outlined"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      sx={{
        position: "absolute",
        left: geometry.x,
        top: geometry.y,
        width: geometry.width,
        height: geometry.height,
        p: 1,
        borderRadius: 1,
        borderColor: selected ? "primary.main" : "divider",
        boxShadow: selected ? "0 0 0 2px rgba(25, 118, 210, 0.18)" : "none",
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        overflow: "hidden",
        touchAction: "none",
        willChange: canEditLayout ? "transform, width, height" : undefined,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minHeight: 28 }}>
        {canEditLayout && (
          <Tooltip title="Di chuyển">
            <Box
              component="span"
              onMouseDown={startMove}
              sx={{
                width: 24,
                height: 24,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
                cursor: "grab",
                flexShrink: 0,
              }}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          </Tooltip>
        )}
        {canEditLayout ? (
          <CanvasFieldNameInput
            fieldId={field.id}
            value={field.name ?? ""}
            onCommit={onRename}
          />
        ) : (
          <Typography fontWeight={750} noWrap sx={{ flex: 1, minWidth: 0 }}>
            {displayName}
          </Typography>
        )}
        {(nameMissing || nameGeneric) && (
          <Chip label="Cần tên" size="small" color="warning" variant="outlined" />
        )}
        {field.required && <Chip label="*" size="small" color="primary" variant="outlined" />}
        {canEditLayout && (
          <Tooltip title={uiText(UITextKey.TextDelete)}>
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              <DeleteOutlineIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <CanvasFieldPreviewInput
          field={field}
          value={value}
          onChange={onPreviewValueChange}
        />
      </Box>

      {canEditLayout && (
        <CanvasResizeHandles selected={selected} onResizeStart={startResize} />
      )}
    </Paper>
  );
}

function CanvasFieldNameInput({
  fieldId,
  value,
  onCommit,
}: {
  fieldId: string;
  value: string;
  onCommit: (name: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const markPending = usePendingEditorDraft(
    `canvas-field:${fieldId}:name`,
    draft !== value,
    () => {
      if (draft !== value) onCommit(draft);
    },
  );

  useEffect(() => {
    setDraft(value);
  }, [fieldId, value]);

  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onCommit(draft), TEXT_INPUT_COMMIT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, onCommit, value]);

  const commitNow = () => {
    if (draft !== value) onCommit(draft);
    markPending(false);
  };

  return (
    <TextField
      variant="standard"
      value={draft}
      placeholder="Tên trường"
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        markPending(nextDraft !== value);
      }}
      onBlur={commitNow}
      InputProps={{ disableUnderline: true }}
      inputProps={{
        style: {
          fontWeight: 750,
          fontSize: 14,
          lineHeight: 1.2,
          padding: 0,
        },
      }}
      sx={{ flex: 1, minWidth: 0 }}
    />
  );
}

function CanvasResizeHandles({
  selected,
  onResizeStart,
}: {
  selected: boolean;
  onResizeStart: (event: React.MouseEvent<HTMLElement>, handle: ResizeHandle) => void;
}) {
  const lineOpacity = selected ? 0.8 : 0.18;
  const cornerOpacity = selected ? 0.92 : 0.36;
  const handles: Array<{
    handle: ResizeHandle;
    cursor: string;
    sx: Record<string, unknown>;
  }> = [
    { handle: "n", cursor: "ns-resize", sx: { top: -4, left: 16, right: 16, height: 8 } },
    { handle: "s", cursor: "ns-resize", sx: { bottom: -4, left: 16, right: 16, height: 8 } },
    { handle: "e", cursor: "ew-resize", sx: { top: 16, bottom: 16, right: -4, width: 8 } },
    { handle: "w", cursor: "ew-resize", sx: { top: 16, bottom: 16, left: -4, width: 8 } },
    { handle: "ne", cursor: "nesw-resize", sx: { top: -5, right: -5 } },
    { handle: "nw", cursor: "nwse-resize", sx: { top: -5, left: -5 } },
    { handle: "se", cursor: "nwse-resize", sx: { bottom: -5, right: -5 } },
    { handle: "sw", cursor: "nesw-resize", sx: { bottom: -5, left: -5 } },
  ];

  return (
    <>
      {handles.map(({ handle, cursor, sx }) => {
        const isCorner = handle.length === 2;
        return (
          <Box
            key={handle}
            onMouseDown={(event) => onResizeStart(event, handle)}
            sx={{
              position: "absolute",
              zIndex: 4,
              cursor,
              ...(isCorner
                ? {
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    border: "2px solid #fff",
                    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.28)",
                    opacity: cornerOpacity,
                  }
                : {
                    bgcolor: "primary.main",
                    opacity: lineOpacity,
                  }),
              ...sx,
            }}
          />
        );
      })}
    </>
  );
}

function CanvasAlignmentGuides({ guides }: { guides: CanvasGuideLine[] }) {
  if (guides.length === 0) return null;

  return (
    <>
      {guides.map((guide, index) => (
        <Box
          key={`${guide.axis}_${guide.value}_${index}`}
          sx={{
            position: "absolute",
            pointerEvents: "none",
            zIndex: 8,
            bgcolor: "primary.main",
            opacity: 0.82,
            ...(guide.axis === "x"
              ? {
                  left: guide.value,
                  top: CANVAS_HEADER_BOTTOM - 10,
                  width: 2,
                  height: DYNAMIC_FORM_CANVAS_HEIGHT - CANVAS_HEADER_BOTTOM,
                }
              : {
                  left: CANVAS_CONTENT_MARGIN - 10,
                  top: guide.value,
                  width: DYNAMIC_FORM_CANVAS_WIDTH - CANVAS_CONTENT_MARGIN * 2 + 20,
                  height: 2,
                }),
          }}
        />
      ))}
    </>
  );
}

function CanvasFieldPreviewInput({
  field,
  value,
  onChange,
}: {
  field: DynamicFormField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [draft, setDraft] = useState<unknown>(() => normalizeCanvasPreviewDraft(field, value));
  const draftKey = previewValueKey(value);
  const isChoice = field.type === "shortText" || field.type === "singleSelect" || field.type === "multiSelect";
  const isImmediate = field.type === "boolean" || isChoice;

  useEffect(() => {
    setDraft(normalizeCanvasPreviewDraft(field, value));
  }, [draftKey, field.id, field.type, value]);

  useEffect(() => {
    if (isImmediate || previewValuesEqual(draft, value)) return;
    const timer = window.setTimeout(() => onChange(draft), TEXT_INPUT_COMMIT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, isImmediate, onChange, value]);

  const updateDraft = (nextValue: unknown) => {
    setDraft(nextValue);
    if (isImmediate) onChange(nextValue);
  };

  const commitDraft = () => {
    if (!previewValuesEqual(draft, value)) onChange(draft);
  };

  if (field.type === "boolean") {
    return (
      <FormControlLabel
        sx={{ m: 0 }}
        control={
          <Checkbox
            size="small"
            checked={Boolean(draft)}
            onChange={(event) => updateDraft(event.target.checked)}
          />
        }
        label="Có"
      />
    );
  }

  if (isChoice) {
    const selectValue =
      field.type === "multiSelect"
        ? Array.isArray(draft)
          ? draft
          : []
        : typeof draft === "string"
          ? draft
          : "";

    return (
      <Select
        size="small"
        fullWidth
        multiple={field.type === "multiSelect"}
        value={selectValue}
        displayEmpty
        renderValue={(selected) => {
          const selectedValues = Array.isArray(selected) ? selected : selected ? [selected] : [];
          if (selectedValues.length === 0) {
            return (
              <Typography component="span" color="text.secondary">
                Nội dung
              </Typography>
            );
          }
          return selectedValues
            .map((code) => field.options?.find((option) => option.code === code)?.label ?? code)
            .join(", ");
        }}
        onChange={(event) => updateDraft(event.target.value)}
      >
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
      value={typeof draft === "string" || typeof draft === "number" ? draft : ""}
      multiline={field.type === "longText" || field.type === "stringList" || field.type === "richText"}
      minRows={field.type === "richText" ? 4 : field.type === "longText" || field.type === "stringList" ? 2 : undefined}
      placeholder={
        field.type === "date"
          ? "dd/MM/yyyy, MM/yyyy hoặc yyyy"
          : field.type === "fullDate"
            ? "dd/MM/yyyy"
            : "Nội dung"
      }
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitDraft}
      sx={{
        "& .MuiInputBase-root": {
          alignItems: "flex-start",
          minHeight: "100%",
        },
      }}
    />
  );
}

function normalizeCanvasPreviewDraft(field: DynamicFormField, value: unknown) {
  if (field.type === "multiSelect") return Array.isArray(value) ? value : [];
  if (field.type === "boolean") return Boolean(value);
  if (typeof value === "string" || typeof value === "number") return value;
  return "";
}

function previewValueKey(value: unknown) {
  if (Array.isArray(value)) return value.join("\u001f");
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function previewValuesEqual(first: unknown, second: unknown) {
  if (Array.isArray(first) || Array.isArray(second)) {
    const a = Array.isArray(first) ? first : [];
    const b = Array.isArray(second) ? second : [];
    return a.length === b.length && a.every((item, index) => item === b[index]);
  }
  return first === second;
}

function readCanvasDragPayload(value: string): CanvasDragPayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<CanvasDragPayload>;
    if (parsed.kind === "fieldType" && isPaletteFieldType(parsed.type)) {
      return { kind: "fieldType", type: parsed.type };
    }
    if (parsed.kind === "field" && typeof parsed.fieldId === "string") {
      return {
        kind: "field",
        fieldId: parsed.fieldId,
        offsetX: Number(parsed.offsetX) || 0,
        offsetY: Number(parsed.offsetY) || 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function reassignSectionInBlockJson(
  json: string | null | undefined,
  fromSectionId: string,
  toSectionId: string,
): string | null | undefined {
  const parsed = parseExcelBlockJson(json);
  if (!parsed) return json;
  if (
    readBlockString(parsed.sectionId) === fromSectionId ||
    readBlockString(parsed.SectionId) === fromSectionId
  ) {
    return JSON.stringify({ ...parsed, sectionId: toSectionId, SectionId: undefined });
  }
  return json;
}

function reassignSectionInBlocksJson(
  json: string | null | undefined,
  fromSectionId: string,
  toSectionId: string,
): string | null | undefined {
  if (!json?.trim()) return json;
  try {
    const parsed = JSON.parse(json);
    const reassign = (item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      const block = item as Record<string, unknown>;
      if (
        readBlockString(block.sectionId) === fromSectionId ||
        readBlockString(block.SectionId) === fromSectionId
      ) {
        return { ...block, sectionId: toSectionId, SectionId: undefined };
      }
      return block;
    };
    return JSON.stringify(Array.isArray(parsed) ? parsed.map(reassign) : reassign(parsed));
  } catch {
    return json;
  }
}

function isPaletteFieldType(value: unknown): value is DynamicFormFieldType {
  return typeof value === "string" && palette.some((item) => item.type === value);
}

function getCanvasFieldGeometry(field: DynamicFormField) {
  const width = clampCanvasWidth(field.canvasW ?? canvasWidthFromColSpan(field.colSpan));
  const height = clampCanvasHeight(field.canvasH ?? field.minHeight);
  return {
    x: clampCanvasX(field.canvasX ?? CANVAS_FIELD_MARGIN, width),
    y: clampCanvasY(field.canvasY ?? 112, height),
    width,
    height,
  };
}

function canvasWidthFromColSpan(colSpan: number) {
  return Math.round(((DYNAMIC_FORM_CANVAS_WIDTH - 80) * Math.min(12, Math.max(3, colSpan))) / 12);
}

function widthToColSpan(width: number) {
  return Math.min(
    12,
    Math.max(3, Math.round((clampCanvasWidth(width) / (DYNAMIC_FORM_CANVAS_WIDTH - 80)) * 12)),
  );
}

function getCanvasFieldLayoutPatch(box: CanvasBox): Partial<DynamicFormField> {
  return {
    canvasX: box.x,
    canvasY: box.y,
    canvasW: box.width,
    canvasH: box.height,
    colSpan: widthToColSpan(box.width),
    minHeight: clampCanvasHeight(box.height),
  };
}

function getCanvasGuideKey(guides: CanvasGuideLine[]) {
  return guides.map((guide) => `${guide.axis}:${guide.value}`).join("|");
}

function snapCanvasValue(value: number) {
  return Math.round(value / CANVAS_SNAP_GRID_SIZE) * CANVAS_SNAP_GRID_SIZE;
}

function snapCanvasSize(value: number, axis: "width" | "height") {
  const snapped = snapCanvasValue(value);
  return axis === "width" ? clampCanvasWidth(snapped) : clampCanvasHeight(snapped);
}

function snapCanvasMoveBox(
  box: CanvasBox,
  fields: DynamicFormField[],
  activeFieldId: string | null,
): CanvasSnapResult {
  const width = clampCanvasWidth(box.width);
  const height = clampCanvasHeight(box.height);
  let x = clampCanvasX(snapCanvasValue(box.x), width);
  let y = clampCanvasY(snapCanvasValue(box.y), height);
  const guides: CanvasGuideLine[] = [];
  const targets = getCanvasSnapTargets(fields, activeFieldId);
  const xSnap = findNearestSnap(
    [
      { value: x, role: "start" },
      { value: x + width / 2, role: "center" },
      { value: x + width, role: "end" },
    ],
    targets.x,
  );
  if (xSnap) {
    x = clampCanvasX(x + xSnap.delta, width);
    guides.push({ axis: "x", value: xSnap.target });
  }

  const ySnap = findNearestSnap(
    [
      { value: y, role: "start" },
      { value: y + height / 2, role: "center" },
      { value: y + height, role: "end" },
    ],
    targets.y,
  );
  if (ySnap) {
    y = clampCanvasY(y + ySnap.delta, height);
    guides.push({ axis: "y", value: ySnap.target });
  }

  return { x, y, width, height, guides };
}

function snapCanvasResizeBox(
  box: CanvasBox,
  fields: DynamicFormField[],
  activeFieldId: string,
  handle: ResizeHandle,
): CanvasSnapResult {
  let x = clampCanvasX(box.x, box.width);
  let y = clampCanvasY(box.y, box.height);
  let width = clampCanvasWidth(box.width);
  let height = clampCanvasHeight(box.height);
  const guides: CanvasGuideLine[] = [];
  const targets = getCanvasSnapTargets(fields, activeFieldId);

  if (handle.includes("e")) {
    const edgeSnap = findNearestSnap([{ value: x + width, role: "end" }], targets.x);
    if (edgeSnap) {
      width = clampCanvasWidth(edgeSnap.target - x);
      guides.push({ axis: "x", value: edgeSnap.target });
    }
  }
  if (handle.includes("w")) {
    const right = x + width;
    const edgeSnap = findNearestSnap([{ value: x, role: "start" }], targets.x);
    if (edgeSnap) {
      x = clampCanvasX(edgeSnap.target, width);
      width = clampCanvasWidth(right - x);
      x = clampCanvasX(right - width, width);
      guides.push({ axis: "x", value: edgeSnap.target });
    }
  }
  if (handle.includes("s")) {
    const edgeSnap = findNearestSnap([{ value: y + height, role: "end" }], targets.y);
    if (edgeSnap) {
      height = clampCanvasHeight(edgeSnap.target - y);
      guides.push({ axis: "y", value: edgeSnap.target });
    }
  }
  if (handle.includes("n")) {
    const bottom = y + height;
    const edgeSnap = findNearestSnap([{ value: y, role: "start" }], targets.y);
    if (edgeSnap) {
      y = clampCanvasY(edgeSnap.target, height);
      height = clampCanvasHeight(bottom - y);
      y = clampCanvasY(bottom - height, height);
      guides.push({ axis: "y", value: edgeSnap.target });
    }
  }

  return { x, y, width, height, guides };
}

function getCanvasSnapTargets(fields: DynamicFormField[], activeFieldId: string | null) {
  const x = [
    CANVAS_CONTENT_MARGIN,
    DYNAMIC_FORM_CANVAS_WIDTH / 2,
    DYNAMIC_FORM_CANVAS_WIDTH - CANVAS_CONTENT_MARGIN,
  ];
  const y = [
    CANVAS_HEADER_BOTTOM,
    CANVAS_HEADER_BOTTOM + CANVAS_SNAP_GRID_SIZE,
    DYNAMIC_FORM_CANVAS_HEIGHT / 2,
    DYNAMIC_FORM_CANVAS_HEIGHT - CANVAS_CONTENT_MARGIN,
  ];

  fields.forEach((field) => {
    if (field.id === activeFieldId) return;
    const geometry = getCanvasFieldGeometry(field);
    x.push(geometry.x, geometry.x + geometry.width / 2, geometry.x + geometry.width);
    y.push(geometry.y, geometry.y + geometry.height / 2, geometry.y + geometry.height);
  });

  return {
    x: uniqueRoundedTargets(x),
    y: uniqueRoundedTargets(y),
  };
}

function uniqueRoundedTargets(values: number[]) {
  return Array.from(new Set(values.map((value) => Math.round(value)))).sort((a, b) => a - b);
}

function findNearestSnap(
  edges: Array<{ value: number; role: "start" | "center" | "end" }>,
  targets: number[],
): { delta: number; target: number } | null {
  let best: { delta: number; target: number; distance: number } | null = null;
  for (const edge of edges) {
    for (const target of targets) {
      const delta = target - edge.value;
      const distance = Math.abs(delta);
      if (distance <= CANVAS_SNAP_THRESHOLD && (!best || distance < best.distance)) {
        best = { delta, target, distance };
      }
    }
  }
  if (!best) return null;
  return { delta: best.delta, target: best.target };
}

function clampCanvasWidth(value: unknown) {
  const n = Number(value);
  const normalized = Number.isFinite(n) ? Math.floor(n) : 320;
  return Math.min(
    DYNAMIC_FORM_CANVAS_WIDTH - CANVAS_FIELD_MARGIN * 2,
    Math.max(CANVAS_FIELD_MIN_WIDTH, normalized),
  );
}

function clampCanvasHeight(value: unknown) {
  const n = Number(value);
  const normalized = Number.isFinite(n) ? Math.floor(n) : 88;
  return Math.min(
    DYNAMIC_FORM_CANVAS_HEIGHT - CANVAS_FIELD_MARGIN * 2,
    Math.max(CANVAS_FIELD_MIN_HEIGHT, normalized),
  );
}

function clampCanvasX(value: unknown, width: number) {
  const n = Number(value);
  const normalized = Number.isFinite(n) ? Math.floor(n) : CANVAS_FIELD_MARGIN;
  return Math.min(
    DYNAMIC_FORM_CANVAS_WIDTH - width - CANVAS_FIELD_MARGIN,
    Math.max(CANVAS_FIELD_MARGIN, normalized),
  );
}

function clampCanvasY(value: unknown, height: number) {
  const n = Number(value);
  const normalized = Number.isFinite(n) ? Math.floor(n) : 112;
  return Math.min(
    DYNAMIC_FORM_CANVAS_HEIGHT - height - CANVAS_FIELD_MARGIN,
    Math.max(CANVAS_FIELD_MARGIN, normalized),
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
        {preview && (
          <DynamicFormExcelBlockPreview
            blockJson={blockJson}
            showHeader={false}
          />
        )}
      </Stack>
    </Paper>
  );
}

type TableStatisticMetricEditorRow = {
  metricKey: string;
  label: string;
  dataType: DynamicFormTableStatisticDataType | null;
  aggregateOps: DynamicFormTableStatisticAggregateOperation[];
  hasIncompatibleAggregateOps: boolean;
};

function ExcelBlockSummaryPanel({
  blockJson,
  statisticReadOnly,
  statisticConfigVisible,
  statisticConfigEnabled,
  onChangeBlock,
}: {
  blockJson: string;
  statisticReadOnly: boolean;
  statisticConfigVisible: boolean;
  statisticConfigEnabled: boolean;
  onChangeBlock?: (nextBlockJson: string) => void;
}) {
  const obj = parseExcelBlockJson(blockJson);
  const [configOpen, setConfigOpen] = useState(false);
  const summary = getExcelBlockConfigSummary(blockJson);
  const tableMode = normalizeExcelBlockTableMode(readBlockString(obj?.tableMode));
  const code =
    readBlockString(obj?.dynamicExcelCode) ??
    readBlockString(obj?.DynamicExcelCode) ??
    readBlockString(obj?.dynamicExcelTemplateId);
  const metricRules = readBlockRecordArray(obj?.metricRules);
  const metricRows = obj ? getTableStatisticMetricEditorRows(obj) : [];
  const metricLabelTargets = readBlockRecordArray(obj?.metricLabelTargets);
  const hasRangeTargets = metricLabelTargets.some(isLegacyTableStatisticRangeTarget);
  const hasDuplicateMetricKeys = hasDuplicateTableStatisticMetricKeys(obj);
  const statisticsDisabled = obj?.statisticsDisabled === true;
  const statisticsDisabledReason = readBlockString(obj?.statisticsDisabledReason);
  const persistedStatisticsDisabled = statisticsDisabled && Boolean(statisticsDisabledReason);
  const structuralStatisticReadOnly =
    tableMode === "SUMMARY_TEMPLATE" || hasRangeTargets || hasDuplicateMetricKeys;
  const statisticControlsDisabled =
    statisticReadOnly ||
    !statisticConfigEnabled ||
    structuralStatisticReadOnly ||
    statisticsDisabled;
  const rowLabelDataType = obj
    ? resolveTableStatisticRowLabelDataType(obj)
    : "NUMBER";
  const allowedRowLabelCodes = normalizeBlockLabelCodes(obj?.allowedRowLabelCodes);

  const commitStatisticBlock = (
    update: (current: Record<string, unknown>) => Record<string, unknown>,
  ) => {
    if (
      !obj ||
      !statisticConfigEnabled ||
      statisticReadOnly ||
      structuralStatisticReadOnly ||
      !onChangeBlock
    ) {
      return;
    }
    onChangeBlock(JSON.stringify(update(obj)));
  };

  const updateMetricAggregateOps = (
    row: TableStatisticMetricEditorRow,
    values: readonly unknown[],
  ) => {
    if (!row.dataType) return;
    const aggregateOps = normalizeTableStatisticAggregateOps(row.dataType, values);
    const currentRules = metricRules.map((rule) => ({ ...rule }));
    const ruleIndex = currentRules.findIndex(
      (rule) => readBlockString(rule.metricKey) === row.metricKey,
    );
    const nextRule = {
      ...(ruleIndex >= 0 ? currentRules[ruleIndex] : {}),
      metricKey: row.metricKey,
      dataType: row.dataType,
      aggregateOps,
    };
    if (ruleIndex >= 0) currentRules[ruleIndex] = nextRule;
    else currentRules.push(nextRule);

    commitStatisticBlock((current) => ({
      ...current,
      metricRules: currentRules,
      metricLabelTargets:
        aggregateOps.length > 0
          ? metricLabelTargets
          : metricLabelTargets.filter(
              (target) => readBlockString(target.metricKey) !== row.metricKey,
            ),
    }));
  };

  const updateMetricLabelCodes = (
    row: TableStatisticMetricEditorRow,
    codes: string[],
  ) => {
    if (!row.dataType || row.aggregateOps.length === 0) return;
    const retained = metricLabelTargets.filter(
      (target) => readBlockString(target.metricKey) !== row.metricKey,
    );
    const nextTargets = normalizeBlockLabelCodes(codes).map((statisticLabelCode) => ({
      targetKind: "METRIC",
      metricKey: row.metricKey,
      statisticLabelCode,
      dataType: row.dataType,
    }));
    commitStatisticBlock((current) => ({
      ...current,
      metricLabelTargets: [...retained, ...nextTargets],
    }));
  };

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

          {statisticConfigVisible && (
            <>
              <Divider />
              <Stack spacing={1.25}>
                <Typography fontWeight={700}>Chỉ tiêu thống kê của bảng</Typography>
                {!statisticConfigEnabled ? (
                  <Alert severity="info">
                    Bảng đang dùng nguồn ExcelBlock cũ. Cấu hình thống kê chỉ được đọc; cần
                    nguồn blocksJson chuẩn để ghi an toàn.
                  </Alert>
                ) : tableMode === "SUMMARY_TEMPLATE" ? (
                  <Alert severity="info">
                    Bảng mẫu tổng hợp không phải bảng nhập liệu nên không cấu hình chỉ tiêu P8.
                  </Alert>
                ) : hasRangeTargets ? (
                  <Alert severity="warning">
                    Bảng còn nhãn thống kê theo RANGE kiểu cũ. P8 chỉ ghi nhãn theo metricKey,
                    vì vậy cấu hình này được giữ nguyên ở chế độ chỉ đọc.
                  </Alert>
                ) : hasDuplicateMetricKeys ? (
                  <Alert severity="warning">
                    Bảng có metricKey trùng trong metricRules hoặc indexMap. Hãy sửa cấu trúc
                    bảng tại nguồn trước khi cấu hình thống kê.
                  </Alert>
                ) : (
                  <>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={statisticsDisabled}
                          disabled={
                            statisticReadOnly ||
                            !statisticConfigEnabled ||
                            persistedStatisticsDisabled
                          }
                          inputProps={{ "aria-label": "Tắt thống kê nền cho bảng" }}
                          onChange={(event) =>
                            commitStatisticBlock((current) => ({
                              ...current,
                              statisticsDisabled: event.target.checked,
                            }))
                          }
                        />
                      }
                      label="Tắt thống kê nền cho bảng"
                    />
                    {statisticsDisabled && (
                      <Alert severity="warning">
                        {statisticsDisabledReason
                          ? `Đã khóa: ${statisticsDisabledReason}. Không thể bật lại sau khi lưu.`
                          : "Các chỉ tiêu đang tạm khóa. Có thể bật lại trước khi lưu."}
                      </Alert>
                    )}

                    {metricRows.length === 0 ? (
                      <Alert severity="info">
                        Bảng chưa có metricKey trong metricRules hoặc indexMap để cấu hình.
                      </Alert>
                    ) : (
                      <Stack spacing={1}>
                        {metricRows.map((row) => {
                          const operationOptions = row.dataType
                            ? getTableStatisticAggregateOperationOptions(row.dataType)
                            : [];
                          const metricCodes = normalizeBlockLabelCodes(
                            metricLabelTargets
                              .filter(
                                (target) =>
                                  !isLegacyTableStatisticRangeTarget(target) &&
                                  readBlockString(target.metricKey) === row.metricKey,
                              )
                              .map((target) => target.statisticLabelCode),
                          );
                          return (
                            <Paper
                              key={row.metricKey}
                              variant="outlined"
                              sx={{ p: 1.25, borderRadius: 1 }}
                            >
                              <Stack spacing={1}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  justifyContent="space-between"
                                  spacing={1}
                                >
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={700} noWrap>
                                      {row.label}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                      {row.metricKey}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={row.dataType ?? "Không hỗ trợ"}
                                  />
                                </Stack>

                                {!row.dataType ? (
                                  <Alert severity="warning">
                                    Không xác định được dataType P8 hợp lệ cho metricKey này.
                                  </Alert>
                                ) : (
                                  <>
                                    {row.hasIncompatibleAggregateOps && (
                                      <Alert severity="warning">
                                        Một số phép tổng hợp cũ không tương thích và sẽ không
                                        được chọn.
                                      </Alert>
                                    )}
                                    <Stack spacing={0.5}>
                                      <Typography variant="caption" fontWeight={700}>
                                        Phép tổng hợp
                                      </Typography>
                                      <Select
                                        size="small"
                                        multiple
                                        value={row.aggregateOps}
                                        disabled={statisticControlsDisabled}
                                        inputProps={{
                                          "aria-label": `Phép tổng hợp ${row.metricKey}`,
                                        }}
                                        renderValue={(selected) =>
                                          (selected as string[])
                                            .map(
                                              (value) =>
                                                operationOptions.find(
                                                  (option) => option.value === value,
                                                )?.label ?? value,
                                            )
                                            .join(", ")
                                        }
                                        onChange={(event) => {
                                          const selected = event.target.value;
                                          updateMetricAggregateOps(
                                            row,
                                            typeof selected === "string"
                                              ? selected.split(",")
                                              : selected,
                                          );
                                        }}
                                      >
                                        {operationOptions.map((option) => (
                                          <MenuItem key={option.value} value={option.value}>
                                            <Checkbox
                                              checked={row.aggregateOps.includes(option.value)}
                                              size="small"
                                            />
                                            <Typography variant="body2">{option.label}</Typography>
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </Stack>
                                    <LabelPicker
                                      value={metricCodes}
                                      usage="tableTarget"
                                      allowedDataTypes={getTableStatisticLabelDataTypes(row.dataType)}
                                      label={`Nhãn chỉ tiêu · ${row.metricKey}`}
                                      placeholder="Chọn nhãn TABLE_TARGET"
                                      helperText={
                                        row.aggregateOps.length > 0
                                          ? "Nhãn chỉ được gắn đúng metricKey và dataType."
                                          : "Chọn ít nhất một phép tổng hợp trước khi gắn nhãn."
                                      }
                                      disabled={
                                        statisticControlsDisabled || row.aggregateOps.length === 0
                                      }
                                      onChange={(codes) => updateMetricLabelCodes(row, codes)}
                                    />
                                  </>
                                )}
                              </Stack>
                            </Paper>
                          );
                        })}
                      </Stack>
                    )}

                    <LabelPicker
                      value={allowedRowLabelCodes}
                      usage="tableTarget"
                      allowedDataTypes={getTableStatisticLabelDataTypes(rowLabelDataType)}
                      label="Nhãn dòng được phép"
                      placeholder="Chọn nhãn TABLE_TARGET cho dòng"
                      helperText={`Kiểu nhãn dòng: ${rowLabelDataType}.`}
                      disabled={statisticControlsDisabled}
                      onChange={(codes) =>
                        commitStatisticBlock((current) => ({
                          ...current,
                          allowedRowLabelCodes: normalizeBlockLabelCodes(codes),
                        }))
                      }
                    />
                  </>
                )}
              </Stack>
            </>
          )}
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

function getTableStatisticMetricEditorRows(
  block: Record<string, unknown>,
): TableStatisticMetricEditorRow[] {
  const rules = readBlockRecordArray(block.metricRules);
  const indexMap = readBlockRecordArray(block.indexMap);
  const orderedKeys: string[] = [];
  const seen = new Set<string>();
  for (const source of [...rules, ...indexMap]) {
    const metricKey = readBlockString(source.metricKey);
    if (!metricKey || seen.has(metricKey)) continue;
    seen.add(metricKey);
    orderedKeys.push(metricKey);
  }

  return orderedKeys.map((metricKey) => {
    const rule = rules.find((item) => readBlockString(item.metricKey) === metricKey) ?? null;
    const indexItem =
      indexMap.find((item) => readBlockString(item.metricKey) === metricKey) ?? null;
    const dataType = resolveTableStatisticMetricDataType(block, rule, indexItem);
    const rawAggregateOps = Array.isArray(rule?.aggregateOps) ? rule.aggregateOps : [];
    const aggregateOps = dataType
      ? normalizeTableStatisticAggregateOps(dataType, rawAggregateOps)
      : [];
    return {
      metricKey,
      label:
        readBlockString(rule?.label) ??
        readBlockString(indexItem?.label) ??
        metricKey,
      dataType,
      aggregateOps,
      hasIncompatibleAggregateOps:
        rawAggregateOps.length > 0 && aggregateOps.length !== rawAggregateOps.length,
    };
  });
}

function resolveTableStatisticMetricDataType(
  block: Record<string, unknown>,
  rule: Record<string, unknown> | null,
  indexItem: Record<string, unknown> | null,
): DynamicFormTableStatisticDataType | null {
  const explicitRuleType =
    readBlockString(rule?.dataType) ?? readBlockString(rule?.targetDataType);
  if (explicitRuleType) return normalizeTableStatisticDataType(explicitRuleType);
  const indexType =
    readBlockString(indexItem?.dataType) ?? readBlockString(indexItem?.targetDataType);
  if (indexType) return normalizeTableStatisticDataType(indexType);
  return normalizeTableStatisticDataType(
    readBlockString(block.defaultDataType) ?? readBlockString(block.dataType),
  );
}

function resolveTableStatisticRowLabelDataType(
  block: Record<string, unknown>,
): DynamicFormTableStatisticDataType {
  return (
    normalizeTableStatisticDataType(block.rowLabelDataType) ??
    normalizeTableStatisticDataType(block.defaultDataType) ??
    normalizeTableStatisticDataType(block.dataType) ??
    "NUMBER"
  );
}

function getTableStatisticLabelDataTypes(
  dataType: DynamicFormTableStatisticDataType,
): LabelDataType[] {
  if (dataType === "NUMBER") return ["NUMBER"];
  if (dataType === "SHORT_TEXT" || dataType === "MULTI_SELECT") return ["SHORT_TEXT"];
  if (dataType === "BOOLEAN") return ["BOOLEAN"];
  return ["DATE"];
}

function normalizeBlockLabelCodes(value: unknown): string[] {
  const rows = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(
      rows
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function readBlockRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function isLegacyTableStatisticRangeTarget(target: Record<string, unknown>): boolean {
  return (
    readBlockString(target.targetKind)?.toUpperCase() === "RANGE" ||
    Boolean(target.range) ||
    !readBlockString(target.metricKey)
  );
}

function hasDuplicateTableStatisticMetricKeys(
  block: Record<string, unknown> | null,
): boolean {
  if (!block) return false;
  return [readBlockRecordArray(block.metricRules), readBlockRecordArray(block.indexMap)].some(
    (rows) => {
      const seen = new Set<string>();
      for (const row of rows) {
        const metricKey = readBlockString(row.metricKey);
        if (!metricKey) continue;
        if (seen.has(metricKey)) return true;
        seen.add(metricKey);
      }
      return false;
    },
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
  const statistic =
    normalizeStatisticConfig(field.type, field.statistic) ?? defaultStatistic(field.type);
  const aggregateOperationOptions = getStatisticAggregateOperationOptions(field.type);
  const statisticBucketModeOptions = getStatisticBucketModeOptions(field.type);

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
            const nextOptions = isChoiceFieldType(nextType)
              ? field.options?.length
                ? field.options
                : defaultOptionsForFieldType(nextType)
              : undefined;
            onChange({
              type: nextType,
              options: nextOptions,
              valueSource: isChoiceFieldType(nextType)
                ? valueSourceWithChoiceOptions(field.valueSource, nextOptions ?? [], nextType)
                : undefined,
              isStatistic: keepStatistic,
              statistic: keepStatistic ? normalizeStatisticConfig(nextType, field.statistic) : undefined,
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
          helperText="Chỉ trường đã bật làm chỉ số tổng hợp mới được gán nhãn. Kiểu nhãn phải khớp với kiểu trường."
          onChange={(codes) =>
            onChange({
              statisticLabelCodes: codes,
            })
          }
        />

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
                    ? defaultStatistic(field.type)
                    : undefined,
                  statisticLabelCodes: e.target.checked ? field.statisticLabelCodes : [],
                });
              }}
            />
          }
          label="Bật làm chỉ số tổng hợp"
        />

        {field.isStatistic && canUseCurrentStatistic && (
          <Stack spacing={1}>
            <Stack spacing={0.5}>
              <Typography variant="body2" fontWeight={700}>
                Phương pháp tổng hợp
              </Typography>
              <Select
                size="small"
                multiple
                value={statistic.aggregateOps}
                disabled={statisticReadOnly}
                inputProps={{ "aria-label": "Phương pháp tổng hợp" }}
                renderValue={(selected) =>
                  selected
                    .map(
                      (value) =>
                        aggregateOperationOptions.find((option) => option.value === value)?.label ??
                        value,
                    )
                    .join(", ")
                }
                onChange={(event) => {
                  const selected = event.target.value;
                  const values = typeof selected === "string" ? selected.split(",") : selected;
                  onChange({
                    statistic: {
                      ...statistic,
                      aggregateOps: normalizeStatisticAggregateOps(field.type, values),
                    },
                  });
                }}
              >
                {aggregateOperationOptions.map((option) => {
                  const checked = statistic.aggregateOps.includes(option.value);
                  return (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                      disabled={checked && statistic.aggregateOps.length === 1}
                    >
                      <Checkbox checked={checked} size="small" />
                      <Typography variant="body2">{option.label}</Typography>
                    </MenuItem>
                  );
                })}
              </Select>
              <Typography variant="caption" color="text.secondary">
                Chỉ hiển thị các phép tổng hợp hợp lệ với kiểu dữ liệu của trường.
              </Typography>
            </Stack>

            <Stack spacing={0.5}>
              <Typography variant="body2" fontWeight={700}>
                Chế độ phân nhóm
              </Typography>
              <Select
                size="small"
                value={statistic.bucketMode}
                disabled={statisticReadOnly}
                inputProps={{ "aria-label": "Chế độ phân nhóm" }}
                onChange={(event) =>
                  onChange({
                    statistic: {
                      ...statistic,
                      bucketMode: normalizeStatisticBucketMode(field.type, event.target.value),
                    },
                  })
                }
              >
                {statisticBucketModeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </Stack>

            <FormControlLabel
              sx={{ alignItems: "flex-start", m: 0 }}
              control={
                <Checkbox
                  sx={{ mt: -0.5 }}
                  checked={statistic.showInDetail}
                  disabled={statisticReadOnly}
                  onChange={(e) =>
                    onChange({
                      statistic: {
                        ...statistic,
                        showInDetail: e.target.checked,
                      },
                    })
                  }
                />
              }
              label={
                <Stack spacing={0.25}>
                  <Typography variant="body2" fontWeight={700}>
                    Đưa vào tổng hợp chi tiết
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Lưu dữ liệu của trường này để dùng trong màn tổng hợp chi tiết của công việc. Người dùng có thể xem số dòng có dữ liệu, tổng với trường số, nhóm theo lựa chọn hoặc nội dung ngắn, và mở danh sách báo cáo nguồn để đối chiếu.
                  </Typography>
                </Stack>
              }
            />
            <FormControlLabel
              sx={{ alignItems: "flex-start", m: 0 }}
              control={
                <Checkbox
                  sx={{ mt: -0.5 }}
                  checked={statistic.showInTree}
                  disabled={statisticReadOnly}
                  onChange={(e) =>
                    onChange({
                      statistic: {
                        ...statistic,
                        showInTree: e.target.checked,
                      },
                    })
                  }
                />
              }
              label={
                <Stack spacing={0.25}>
                  <Typography variant="body2" fontWeight={700}>
                    Hiển thị chỉ số nhanh trên màn hình tổng hợp
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Đưa kết quả rút gọn của trường này lên màn hình tổng hợp công việc để theo dõi nhanh theo từng nhiệm vụ. Chỉ bật cho vài chỉ số quan trọng; khi cần kiểm tra dữ liệu gốc thì mở phần tổng hợp chi tiết.
                  </Typography>
                </Stack>
              }
            />
          </Stack>
        )}

        {(field.type === "shortText" || field.type === "singleSelect" || field.type === "multiSelect") && (
          <ChoiceOptionsEditor
            draftId={`field:${field.id}:options`}
            fieldType={field.type}
            options={field.options}
            valueSource={field.valueSource}
            disabled={readOnly}
            quickCreateName={`Danh mục ${getDynamicFormFieldDisplayName(field)}`}
            quickCreateSourcePath={`dynamic-form:field:${field.id}`}
            onChange={(options) =>
              onChange({
                options,
                valueSource: valueSourceWithChoiceOptions(field.valueSource, options, field.type),
              })
            }
            onSourceChange={(valueSource) =>
              onChange({
                valueSource,
                options: valueSource?.sourceType === "FIXED_ENUM"
                  ? valueSource.options ?? field.options
                  : field.options,
              })
            }
          />
        )}
      </Stack>
    </Paper>
  );
}

function DebouncedTextField({
  draftId,
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
  draftId: string;
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
  const markPending = usePendingEditorDraft(
    draftId,
    !disabled && draft !== value,
    () => {
      if (!disabled && draft !== value) onCommit(draft);
    },
  );

  useEffect(() => {
    setDraft(value);
  }, [resetKey, value]);

  useEffect(() => {
    if (disabled || draft === value) return;
    const timer = window.setTimeout(() => onCommit(draft), TEXT_INPUT_COMMIT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [disabled, draft, onCommit, value]);

  const commitNow = () => {
    if (draft !== value) onCommit(draft);
    markPending(false);
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
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        markPending(!disabled && nextDraft !== value);
      }}
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
  const markPending = usePendingEditorDraft(
    `field:${field.id}:name`,
    !disabled && draft !== committedName,
    () => {
      if (!disabled && draft !== committedName) onCommit(draft);
    },
  );
  const trimmedDraft = draft.trim();
  const fieldNameInvalid =
    !trimmedDraft || isGenericFieldDisplayName(field.type, trimmedDraft);

  useEffect(() => {
    setDraft(committedName);
  }, [field.id, committedName]);

  useEffect(() => {
    if (disabled || draft === committedName) return;
    const timer = window.setTimeout(() => onCommit(draft), TEXT_INPUT_COMMIT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [committedName, disabled, draft, onCommit]);

  const commitNow = () => {
    if (draft !== committedName) onCommit(draft);
    markPending(false);
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
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        markPending(!disabled && nextDraft !== committedName);
      }}
      onBlur={commitNow}
    />
  );
}

type ChoiceOption = NonNullable<DynamicFormField["options"]>[number];

function ChoiceOptionsEditor({
  draftId,
  fieldType,
  options,
  valueSource,
  disabled,
  quickCreateName,
  quickCreateSourcePath,
  onChange,
  onSourceChange,
}: {
  draftId: string;
  fieldType: DynamicFormFieldType;
  options?: DynamicFormField["options"];
  valueSource?: DynamicFormField["valueSource"];
  disabled: boolean;
  quickCreateName?: string;
  quickCreateSourcePath?: string;
  onChange: (options: ChoiceOption[]) => void;
  onSourceChange: (valueSource: DynamicFormValueSource | null) => void;
}) {
  const [rows, setRows] = useState<ChoiceOption[]>(() => toChoiceRows(options, fieldType));
  const markPending = usePendingEditorDraft(
    draftId,
    !disabled && !choiceRowsEqual(rows, toChoiceRows(options, fieldType)),
    () => {
      if (disabled) return;
      const normalized = normalizeChoiceRows(rows, fieldType);
      setRows(normalized);
      onChange(normalized);
    },
  );
  const [quickCreateCatalog, quickCreateState] = useQuickCreateLabelEnumCatalogMutation();
  const sourceType = valueSource?.sourceType ?? "FIXED_ENUM";
  const usesFixedOptions = sourceType === "FIXED_ENUM";
  const usesEnumCatalog = sourceType === "ENUM_CATALOG";
  const [catalogDraftName, setCatalogDraftName] = useState(valueSource?.catalogName || quickCreateName || "");
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    setRows(toChoiceRows(options, fieldType));
  }, [options, fieldType]);

  useEffect(() => {
    if (usesEnumCatalog && valueSource?.catalogName) {
      setCatalogDraftName(valueSource.catalogName);
    }
  }, [usesEnumCatalog, valueSource?.catalogName]);

  const commit = (nextRows: ChoiceOption[]) => {
    const normalized = normalizeChoiceRows(nextRows, fieldType);
    setRows(normalized);
    onChange(normalized);
    markPending(false);
  };

  const patchRow = (index: number, patch: Partial<ChoiceOption>) => {
    const nextRows = rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );
    setRows(nextRows);
    markPending(!choiceRowsEqual(nextRows, toChoiceRows(options, fieldType)));
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

  const createEnumCatalogFromOptions = async () => {
    const normalized = normalizeChoiceRows(rows, fieldType);
    const name = catalogDraftName.trim();
    if (!name || normalized.length === 0) return;

    try {
      setCatalogError(null);
      const catalog = await quickCreateCatalog({
        name,
        sourceFeature: "DYNAMIC_FORM",
        sourcePath: quickCreateSourcePath ?? "dynamic-form",
        options: normalized,
      }).unwrap();
      onChange(normalized);
      onSourceChange({
        sourceType: "ENUM_CATALOG",
        catalogId: catalog.id,
        catalogCode: catalog.code,
        catalogName: catalog.name,
      });
    } catch {
      setCatalogError("Không tạo được danh mục liệt kê từ danh sách hiện tại.");
    }
  };

  return (
    <Stack spacing={1}>
      <TextField
        select
        size="small"
        label="Nguồn dữ liệu nhập liệu"
        value={sourceType}
        disabled={disabled}
        helperText="Chọn nguồn dữ liệu; người báo cáo chọn một hoặc nhiều giá trị trong danh sách và hệ thống lưu mã."
        onChange={(event) => {
          const nextSourceType = event.target.value as DynamicFormValueSource["sourceType"];
          if (nextSourceType === "FIXED_ENUM") {
            onSourceChange({ sourceType: "FIXED_ENUM", options: normalizeChoiceRows(rows, fieldType) });
            return;
          }
          if (nextSourceType === "ENUM_CATALOG") {
            onSourceChange({
              sourceType: "ENUM_CATALOG",
              catalogId: valueSource?.catalogId,
              catalogCode: valueSource?.catalogCode,
              catalogName: valueSource?.catalogName,
            });
            return;
          }
          onSourceChange({ sourceType: nextSourceType });
        }}
      >
        <MenuItem value="FIXED_ENUM">Danh sách cố định</MenuItem>
        <MenuItem value="ENUM_CATALOG">Danh mục liệt kê riêng</MenuItem>
        <MenuItem value="SYSTEM_UNIT">Danh mục đơn vị</MenuItem>
        <MenuItem value="SYSTEM_USER">Danh mục người dùng</MenuItem>
        <MenuItem value="SYSTEM_POSITION">Danh mục chức vụ</MenuItem>
        <MenuItem value="SYSTEM_UNIT_TYPE">Danh mục loại đơn vị</MenuItem>
      </TextField>

      {!usesFixedOptions && (
        <Alert severity="info" variant="outlined">
          {usesEnumCatalog
            ? "Người báo cáo chọn từ danh mục liệt kê riêng được phân quyền; không nhập văn bản tự do."
            : "Người báo cáo chọn từ danh mục hệ thống; không nhập văn bản tự do."}
        </Alert>
      )}

      {usesEnumCatalog && (
        <LabelEnumCatalogSelect
          value={valueSource?.catalogId ?? ""}
          selectedName={valueSource?.catalogName ?? ""}
          disabled={disabled}
          helperText="Chọn danh mục liệt kê riêng đã được tài khoản quản lý tạo và phân quyền."
          onChange={(catalog) =>
            onSourceChange({
              sourceType: "ENUM_CATALOG",
              catalogId: catalog?.id,
              catalogCode: catalog?.code,
              catalogName: catalog?.name,
            })
          }
        />
      )}

      {usesFixedOptions && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", md: "flex-start" }}
        >
          <TextField
            size="small"
            label="Tên danh mục liệt kê mới"
            value={catalogDraftName}
            disabled={disabled || quickCreateState.isLoading}
            helperText="Tạo nhanh danh mục liệt kê riêng từ danh sách đang cấu hình."
            onChange={(event) => setCatalogDraftName(event.target.value)}
            sx={{ flex: 1 }}
          />
          <Button
            size="small"
            variant="outlined"
            disabled={
              disabled ||
              quickCreateState.isLoading ||
              !catalogDraftName.trim() ||
              normalizeChoiceRows(rows, fieldType).length === 0
            }
            onClick={createEnumCatalogFromOptions}
            sx={{ minHeight: 40 }}
          >
            Tạo danh mục
          </Button>
        </Stack>
      )}

      {catalogError && <Alert severity="error">{catalogError}</Alert>}

      {usesFixedOptions && (
        <>
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
          <Grid container spacing={1} alignItems="center" key={index}>
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
        </>
      )}
    </Stack>
  );
}

function toChoiceRows(options: DynamicFormField["options"] | undefined, fieldType: DynamicFormFieldType): ChoiceOption[] {
  return options?.length
    ? options.map((option) => ({ code: option.code ?? "", label: option.label ?? "" }))
    : defaultOptionsForFieldType(fieldType);
}

function choiceRowsEqual(left: ChoiceOption[], right: ChoiceOption[]) {
  return left.length === right.length && left.every(
    (row, index) => row.code === right[index]?.code && row.label === right[index]?.label,
  );
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

function isChoiceFieldType(fieldType: DynamicFormFieldType) {
  return fieldType === "shortText" || fieldType === "singleSelect" || fieldType === "multiSelect";
}

function valueSourceWithChoiceOptions(
  source: DynamicFormField["valueSource"],
  options: ChoiceOption[],
  fieldType: DynamicFormFieldType,
): DynamicFormValueSource | undefined {
  if (!source) return undefined;
  return source.sourceType === "FIXED_ENUM"
    ? { ...source, options: normalizeChoiceRows(options, fieldType) }
    : source;
}

function getStatisticLabelDataTypesForField(fieldType: DynamicFormFieldType): LabelDataType[] {
  if (fieldType === "number") return ["NUMBER"];
  if (fieldType === "shortText" || fieldType === "singleSelect" || fieldType === "multiSelect") return ["SHORT_TEXT"];
  if (fieldType === "date" || fieldType === "fullDate") return ["DATE"];
  if (fieldType === "boolean") return ["BOOLEAN"];
  if (fieldType === "longText" || fieldType === "stringList") return ["STRING_LIST"];
  return [];
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

function readBlockString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
