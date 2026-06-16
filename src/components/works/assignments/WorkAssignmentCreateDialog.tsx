import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { LazyUnitMultiSelect } from "../../common/LazyUnitMultiSelect";
import { HybridUnitUserPicker } from "../../pickers/HybridUnitUserPicker";
import { DynamicFormPicker } from "./DynamicFormPicker";
import { PeriodicScheduleEditor } from "./PeriodicScheduleEditor";
import SingleDayKeyField, {
  dayKeyToIsoDate,
  isoDateToDayKey,
  normalizeDayKey,
} from "../../common/SingleDayKeyField";
import { UITextKey, uiText } from '../../../constants/uiText';
import { useGetDynamicFormQuery } from "../../../api/dynamicFormApi";
import { buildEditorValue, fieldTypeLabels } from "../../../features/dynamicForms/dynamicFormSchema";
import type { DynamicFormField } from "../../../features/dynamicForms/dynamicForm.types";
import type { UserRefDTO } from "../../../types/userRefDto";
import type {
  DynamicFormDataSourceRuleType,
  DynamicFormDataSourceRulesDocument,
  DynamicFormSectionDataSourceRule,
  WorkAssignmentAutoApproveConditionDocument,
  WorkAssignmentAutoApproveConditionOperator,
} from "../../../types/workAssignment";

export interface ParentCandidateOption {
  id: string;
  code?: string | null;
  name?: string | null;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  completedAtUtc?: string | null;
  dueAtUtc?: string | null;
  latestDueAtUtc?: string | null;
}

export interface AssignmentCreateValue {
  name: string;
  createMode: "root" | "child";
  parentAssignmentId: string | null;

  dynamicExcelId: string;
  dynamicExcelCode?: string;
  dynamicExcelName?: string;
  dynamicFormTemplateId: string;
  dynamicFormTemplateCode?: string;
  dynamicFormTemplateName?: string;
  dynamicFormDataSourceRulesJson?: string | null;
  autoApproveConditionJson?: string | null;

  assignmentType: "ONCE" | "PERIODIC_REPORT";
  aggregationType: "MATRIX" | "UNIT_ROW_COL";
  schedule: any | null;

  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  completedAtUtc?: string | null;
  completedByUserId?: string | null;

  assigneeUserIds: string[];
  assigneeUserRefs?: UserRefDTO[];
  assigneeUnitIds: string[];
  leaderWatcherUserIds: string[];

  description: string;
  isActive: boolean;
  allowUserCreatedReports: boolean;
  dueAtUtc?: string | null;
}

export function defaultAssignmentCreateValue(): AssignmentCreateValue {
  return {
    name: "",
    createMode: "root",
    parentAssignmentId: null,

    dynamicExcelId: "",
    dynamicExcelCode: "",
    dynamicExcelName: "",
    dynamicFormTemplateId: "",
    dynamicFormTemplateCode: "",
    dynamicFormTemplateName: "",
    dynamicFormDataSourceRulesJson: null,
    autoApproveConditionJson: null,

    assignmentType: "ONCE",
    aggregationType: "MATRIX",
    schedule: null,

    startDate: null,
    dueDate: null,
    completedDate: null,

    assigneeUserIds: [],
    assigneeUserRefs: [],
    assigneeUnitIds: [],
    leaderWatcherUserIds: [],

    description: "",
    isActive: true,
    allowUserCreatedReports: true,
    dueAtUtc: null,
  };
}

interface Props {
  open: boolean;
  value: AssignmentCreateValue;
  onChange: (value: AssignmentCreateValue) => void;
  onClose: () => void;
  onSubmit?: () => void;

  parentCandidates: ParentCandidateOption[];
  parentCandidatesLoading?: boolean;

  isWorkOwner?: boolean;
  disabled?: boolean;

  workStartDate?: string | null;
  workEndDate?: string | null;

  mode?: "create" | "view";
  title?: string;
  submitLabel?: string;
  hideSubmit?: boolean;

  viewAssigneeDisplay?: string;
  viewLeaderWatcherDisplay?: string;
  viewAssigneeItems?: string[];
  viewLeaderWatcherItems?: string[];
}

function getParentLabel(x: ParentCandidateOption) {
  const code = x.code?.trim() || x.dynamicFormTemplateCode?.trim() || x.dynamicExcelCode?.trim();
  const name = x.name?.trim() || x.dynamicFormTemplateName?.trim() || x.dynamicExcelName?.trim();
  if (code && name) return `${code} - ${name}`;
  return code || name || x.id;
}

function getTemplateFallbackName(value: AssignmentCreateValue) {
  return value.dynamicFormTemplateName?.trim() || value.dynamicExcelName?.trim() || "";
}

function getTemplateLabel(value: AssignmentCreateValue) {
  const code = value.dynamicFormTemplateCode?.trim() || value.dynamicExcelCode?.trim();
  const name = value.dynamicFormTemplateName?.trim() || value.dynamicExcelName?.trim();
  if (code && name) return `${code} - ${name}`;
  return code || name || value.dynamicFormTemplateId || value.dynamicExcelId || "";
}

function isoToDayKey(value?: string | null) {
  if (!value) return "";
  return isoDateToDayKey(String(value).slice(0, 10));
}

function dayKeyToApiDate(dayKey: string, endOfDay = false) {
  if (!dayKey) return null;
  return `${dayKeyToIsoDate(dayKey)}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
}

function maxDayKey(...values: Array<string | null | undefined>) {
  return values
    .map((value) => normalizeDayKey(value))
    .filter((value) => value.length === 8)
    .sort()
    .at(-1) ?? "";
}

function minDayKey(...values: Array<string | null | undefined>) {
  return values
    .map((value) => normalizeDayKey(value))
    .filter((value) => value.length === 8)
    .sort()[0] ?? "";
}

function formatDayKey(dayKey: string) {
  const normalized = normalizeDayKey(dayKey);
  if (normalized.length !== 8) return "";
  return `${normalized.slice(6, 8)}/${normalized.slice(4, 6)}/${normalized.slice(0, 4)}`;
}

function resolveInheritedDueDayKey(parent: ParentCandidateOption | null, workEndDayKey: string) {
  if (!parent) return workEndDayKey;

  return (
    isoToDayKey(parent.dueDate) ||
    (!parent.completedAtUtc ? isoToDayKey(parent.completedDate) : "") ||
    isoToDayKey(parent.dueAtUtc) ||
    isoToDayKey(parent.latestDueAtUtc) ||
    workEndDayKey
  );
}

const SOURCE_RULE_OPTIONS: Array<{ value: DynamicFormDataSourceRuleType; label: string; help: string }> = [
  {
    value: "MANUAL",
    label: "Nhập tay",
    help: "Người báo cáo nhập dữ liệu trực tiếp trong phần này.",
  },
  {
    value: "MAP_CHILD",
    label: "Gắn từ cấp dưới",
    help: "Dữ liệu được gắn từ phần tương ứng của công việc con.",
  },
  {
    value: "MIXED",
    label: "Kết hợp",
    help: "Một phần lấy từ cấp dưới, phần còn lại người báo cáo nhập tay.",
  },
];

function normalizeSourceRule(value: unknown): DynamicFormDataSourceRuleType {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (
    normalized === "MAP_CHILD" ||
    normalized === "MIXED"
  ) {
    return normalized;
  }

  return "MANUAL";
}

function parseDataSourceRules(json?: string | null): DynamicFormDataSourceRulesDocument | null {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as DynamicFormDataSourceRulesDocument;
  } catch {
    return null;
  }
}

function buildSectionRules(
  sections: Array<{ id: string }>,
  json?: string | null,
): DynamicFormSectionDataSourceRule[] {
  const parsed = parseDataSourceRules(json);
  const bySection = new Map<string, DynamicFormSectionDataSourceRule>();
  (parsed?.sectionRules ?? []).forEach((rule) => {
    if (!rule?.sectionId) return;
    bySection.set(rule.sectionId, rule);
  });

  return sections.map((section) => {
    const existing = bySection.get(section.id);
    return {
      sectionId: section.id,
      sourceRule: normalizeSourceRule(existing?.sourceRule),
      sourceAssignmentIds: Array.isArray(existing?.sourceAssignmentIds)
        ? existing.sourceAssignmentIds.filter(Boolean)
        : [],
      sourceSectionId: existing?.sourceSectionId ?? null,
      sourceBlockId: existing?.sourceBlockId ?? null,
      sourceFieldId: existing?.sourceFieldId ?? null,
      note: existing?.note ?? null,
    };
  });
}

function serializeDataSourceRules(sectionRules: DynamicFormSectionDataSourceRule[]) {
  return JSON.stringify({
    version: 1,
    sectionRules,
    fieldRules: [],
    blockRules: [],
  } satisfies DynamicFormDataSourceRulesDocument);
}

function sourceRuleLabel(value: DynamicFormDataSourceRuleType) {
  return SOURCE_RULE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function normalizeReadonlyItems(items?: string[], fallback?: string) {
  const directItems = (items ?? []).map((item) => item.trim()).filter(Boolean);
  if (directItems.length > 0) return directItems;

  const text = fallback?.trim();
  if (!text || text === "-") return [];

  return text
    .split(/\r?\n|,\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ReadonlyListDropdown({
  label,
  items,
  fallback,
}: {
  label: string;
  items?: string[];
  fallback?: string;
}) {
  const values = normalizeReadonlyItems(items, fallback);
  const preview = values.slice(0, 3).join(", ");

  return (
    <Accordion
      disableGutters
      variant="outlined"
      sx={{
        borderRadius: 1,
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon fontSize="small" />}
        sx={{
          minHeight: 48,
          "& .MuiAccordionSummary-content": {
            my: 1,
            minWidth: 0,
          },
        }}
      >
        <Stack spacing={0.25} sx={{ minWidth: 0, width: "100%" }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {label}
            </Typography>
            <Chip size="small" variant="outlined" label={`${values.length} mục`} />
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap>
            {preview || "-"}
            {values.length > 3 ? `, +${values.length - 3}` : ""}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {values.length > 0 ? (
          <Box sx={{ maxHeight: 240, overflowY: "auto", pr: 0.5, scrollbarGutter: "stable" }}>
            <Stack spacing={0.5}>
              {values.map((item, index) => (
                <Box
                  key={`${label}_${index}_${item}`}
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    px: 1,
                    py: 0.75,
                  }}
                >
                  <Typography variant="body2">{item}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

function ReadonlyTextDropdown({ label, value }: { label: string; value?: string | null }) {
  const text = value?.trim() || "-";
  const preview = text.length > 160 ? `${text.slice(0, 160)}...` : text;

  return (
    <Accordion
      disableGutters
      variant="outlined"
      sx={{
        borderRadius: 1,
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon fontSize="small" />}
        sx={{
          minHeight: 48,
          "& .MuiAccordionSummary-content": {
            my: 1,
            minWidth: 0,
          },
        }}
      >
        <Stack spacing={0.25} sx={{ minWidth: 0, width: "100%" }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {preview}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Box sx={{ maxHeight: 180, overflowY: "auto", pr: 0.5, scrollbarGutter: "stable" }}>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {text}
          </Typography>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

const AUTO_APPROVE_OPERATOR_LABELS: Record<WorkAssignmentAutoApproveConditionOperator, string> = {
  always: "Không điều kiện",
  eq: "Bằng",
  neq: "Khác",
  contains: "Có chứa",
  gt: "Lớn hơn",
  gte: "Lớn hơn hoặc bằng",
  lt: "Nhỏ hơn",
  lte: "Nhỏ hơn hoặc bằng",
  notEmpty: "Có dữ liệu",
};

const AUTO_APPROVE_FIELD_TYPES = new Set(["number", "singleSelect", "multiSelect"]);

function isAutoApproveConditionField(field: DynamicFormField | null | undefined): field is DynamicFormField {
  return Boolean(field?.id && AUTO_APPROVE_FIELD_TYPES.has(field.type));
}

function parseAutoApproveCondition(json?: string | null): WorkAssignmentAutoApproveConditionDocument {
  if (!json?.trim()) {
    return { version: 1, enabled: false, operator: "eq", value: null };
  }

  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { version: 1, enabled: false, operator: "eq", value: null };
    }

    return {
      version: 1,
      enabled: parsed.enabled !== false,
      fieldId: typeof parsed.fieldId === "string" ? parsed.fieldId : null,
      fieldKey: typeof parsed.fieldKey === "string" ? parsed.fieldKey : null,
      fieldType: typeof parsed.fieldType === "string" ? parsed.fieldType : null,
      operator: normalizeAutoApproveOperator(parsed.operator),
      value:
        typeof parsed.value === "string" ||
        typeof parsed.value === "number" ||
        typeof parsed.value === "boolean"
          ? parsed.value
          : null,
    };
  } catch {
    return { version: 1, enabled: false, operator: "eq", value: null };
  }
}

function normalizeAutoApproveOperator(value: unknown): WorkAssignmentAutoApproveConditionOperator {
  const raw = typeof value === "string" ? value : "";
  if (raw === "always") return "always";
  if (raw === "neq" || raw === "contains" || raw === "gt" || raw === "gte" || raw === "lt" || raw === "lte" || raw === "notEmpty") {
    return raw;
  }
  return "eq";
}

function getAutoApproveOperatorOptions(fieldType?: string | null): WorkAssignmentAutoApproveConditionOperator[] {
  if (fieldType === "number") {
    return ["eq", "neq", "gt", "gte", "lt", "lte", "notEmpty"];
  }
  if (fieldType === "singleSelect") return ["eq", "neq", "notEmpty"];
  if (fieldType === "multiSelect") return ["contains", "eq", "neq", "notEmpty"];
  return [];
}

function getFieldLabel(field: {
  id: string;
  key?: string | null;
  name?: string | null;
  type?: string | null;
}) {
  const name = field.name?.trim();
  const key = field.key?.trim();
  return [name || key || field.id, key && name ? key : null].filter(Boolean).join(" - ");
}

function buildAutoApproveConditionJson(
  enabled: boolean,
  field: DynamicFormField | null,
  operator: WorkAssignmentAutoApproveConditionOperator,
  value: string | number | boolean | null,
) {
  if (!enabled) return null;

  if (!field?.id) {
    return JSON.stringify({
      version: 1,
      enabled: true,
      fieldId: null,
      fieldKey: null,
      fieldType: null,
      operator: "always",
      value: null,
    } satisfies WorkAssignmentAutoApproveConditionDocument);
  }

  return JSON.stringify({
    version: 1,
    enabled: true,
    fieldId: field.id,
    fieldKey: field.key ?? field.id,
    fieldType: field.type ?? "shortText",
    operator,
    value: operator === "notEmpty" ? null : value,
  } satisfies WorkAssignmentAutoApproveConditionDocument);
}

export function AutoApproveConditionEditor({
  fields,
  value,
  disabled,
  onChange,
}: {
  fields: DynamicFormField[];
  value?: string | null;
  disabled?: boolean;
  onChange: (json: string | null) => void;
}) {
  const condition = React.useMemo(() => parseAutoApproveCondition(value), [value]);
  const selectableFields = React.useMemo(
    () => fields.filter(isAutoApproveConditionField),
    [fields]
  );
  const selectedField = React.useMemo(
    () =>
      selectableFields.find((field) => field.id === condition.fieldId) ??
      selectableFields.find((field) => field.key && field.key === condition.fieldKey) ??
      null,
    [condition.fieldId, condition.fieldKey, selectableFields]
  );
  const operatorOptions = getAutoApproveOperatorOptions(selectedField?.type);
  const operator = operatorOptions.includes(condition.operator)
    ? condition.operator
    : operatorOptions[0] ?? "eq";

  React.useEffect(() => {
    if (!value?.trim() || !condition.enabled || selectedField) return;
    if (selectableFields.length === 0) {
      if (!condition.fieldId && !condition.fieldKey) return;
      if (fields.length > 0) {
        onChange(buildAutoApproveConditionJson(true, null, "always", null));
      }
      return;
    }
    onChange(null);
  }, [
    condition.enabled,
    condition.fieldId,
    condition.fieldKey,
    fields.length,
    onChange,
    selectableFields.length,
    selectedField,
    value,
  ]);

  const emit = React.useCallback(
    (
      patch: Partial<{
        enabled: boolean;
        field: DynamicFormField | null;
        operator: WorkAssignmentAutoApproveConditionOperator;
        value: string | number | boolean | null;
      }>
    ) => {
      const nextEnabled = patch.enabled ?? condition.enabled;
      const nextField = patch.field === undefined ? selectedField : patch.field;
      const nextOperator = patch.operator ?? operator;
      const nextValue = patch.value === undefined ? condition.value ?? "" : patch.value;
      onChange(buildAutoApproveConditionJson(nextEnabled, nextField, nextOperator, nextValue));
    },
    [condition.enabled, condition.value, onChange, operator, selectedField]
  );

  const valueInput =
    operator === "notEmpty" || !selectedField ? null : selectedField.type === "singleSelect" || selectedField.type === "multiSelect" ? (
      <TextField
        select
        size="small"
        label="Giá trị"
        value={String(condition.value ?? "")}
        disabled={disabled}
        onChange={(event) => emit({ value: event.target.value })}
        sx={{ minWidth: { md: 240 } }}
      >
        {(selectedField.options ?? []).map((option: any) => (
          <MenuItem key={option.code} value={option.code}>
            {option.label || option.code}
          </MenuItem>
        ))}
      </TextField>
    ) : (
      <TextField
        size="small"
        type="number"
        label="Giá trị"
        value={condition.value ?? ""}
        disabled={disabled}
        onChange={(event) =>
          emit({
            value:
              event.target.value !== ""
                ? Number(event.target.value)
                : event.target.value,
          })
        }
        sx={{ minWidth: { md: 240 } }}
      />
    );

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
      <Stack spacing={1.25}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Tự duyệt báo cáo
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Khi người báo cáo nộp báo cáo và trường dữ liệu thỏa điều kiện, hệ thống tự chuyển sang đã duyệt.
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={condition.enabled}
                disabled={disabled}
                onChange={(event) => {
                  const firstField = selectedField ?? selectableFields[0] ?? null;
                  emit({
                    enabled: event.target.checked,
                    field: firstField,
                    operator: getAutoApproveOperatorOptions(firstField?.type)[0] ?? "eq",
                    value: firstField?.options?.[0]?.code ?? "",
                  });
                }}
              />
            }
            label={condition.enabled ? "Đang bật" : "Tắt"}
          />
        </Stack>

        {selectableFields.length === 0 ? (
          <Alert severity="info">
            Biểu mẫu không có field phù hợp; khi bật tự duyệt, hệ thống không áp điều kiện và báo cáo nộp lên sẽ tự duyệt luôn.
          </Alert>
        ) : condition.enabled ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ xs: "stretch", md: "flex-start" }}>
            <TextField
              select
              size="small"
              label="Field điều kiện"
              value={selectedField?.id ?? ""}
              disabled={disabled}
              onChange={(event) => {
                const nextField = selectableFields.find((field) => field.id === event.target.value) ?? null;
                emit({
                  field: nextField,
                  operator: getAutoApproveOperatorOptions(nextField?.type)[0] ?? "eq",
                  value: nextField?.options?.[0]?.code ?? "",
                });
              }}
              sx={{ minWidth: { md: 320 } }}
            >
              {selectableFields.map((field) => (
                <MenuItem key={field.id} value={field.id}>
                  {getFieldLabel(field)} ({fieldTypeLabels[field.type] ?? field.type})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Điều kiện"
              value={operator}
              disabled={disabled || !selectedField}
              onChange={(event) => emit({ operator: normalizeAutoApproveOperator(event.target.value) })}
              sx={{ minWidth: { md: 220 } }}
            >
              {operatorOptions.map((item) => (
                <MenuItem key={item} value={item}>
                  {AUTO_APPROVE_OPERATOR_LABELS[item]}
                </MenuItem>
              ))}
            </TextField>

            {valueInput}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}

const WorkAssignmentCreateDialog: React.FC<Props> = ({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
  parentCandidates,
  parentCandidatesLoading = false,
  isWorkOwner = false,
  disabled = false,
  workStartDate,
  workEndDate,
  mode = "create",
  title = "Giao việc/Phối hợp",
  submitLabel = "Tạo mới",
  hideSubmit = false,
  viewAssigneeDisplay = "",
  viewLeaderWatcherDisplay = "",
  viewAssigneeItems = [],
  viewLeaderWatcherItems = [],
}) => {
  const isView = mode === "view";
  const readonly = disabled || isView;
  const mustChooseParent = !isWorkOwner || value.createMode === "child";
  const selectedDynamicFormQuery = useGetDynamicFormQuery(
    { id: value.dynamicFormTemplateId },
    { skip: !open || !value.dynamicFormTemplateId }
  );
  const selectedDynamicForm = React.useMemo(
    () =>
      selectedDynamicFormQuery.data
        ? buildEditorValue(selectedDynamicFormQuery.data)
        : null,
    [selectedDynamicFormQuery.data]
  );
  const sectionSourceRules = React.useMemo(
    () => buildSectionRules(selectedDynamicForm?.sections ?? [], value.dynamicFormDataSourceRulesJson),
    [selectedDynamicForm?.sections, value.dynamicFormDataSourceRulesJson]
  );
  const hasNonManualSection = sectionSourceRules.some((rule) => rule.sourceRule !== "MANUAL");

  const selectedParent = React.useMemo(() => {
    return parentCandidates.find((x) => x.id === value.parentAssignmentId) ?? null;
  }, [parentCandidates, value.parentAssignmentId]);
  const workStartDayKey = isoToDayKey(workStartDate);
  const workEndDayKey = isoToDayKey(workEndDate);
  const startDayKey = isoToDayKey(value.startDate);
  const completedDayKey = isoToDayKey(value.completedDate);
  const dueDayKey = isoToDayKey(value.dueAtUtc);
  const isOnceAssignment = value.assignmentType === "ONCE";
  const inheritedDueDayKey = resolveInheritedDueDayKey(selectedParent, workEndDayKey);
  const assignmentDueDayKey = isOnceAssignment ? inheritedDueDayKey : completedDayKey;
  const inheritedDueLabel = formatDayKey(inheritedDueDayKey);
  const startMaxDayKey = minDayKey(
    workEndDayKey,
    isOnceAssignment ? dueDayKey : completedDayKey
  );
  const completedMinDayKey = maxDayKey(workStartDayKey, startDayKey);
  const dueMinDayKey = maxDayKey(workStartDayKey, startDayKey);
  const dueMaxDayKey = minDayKey(workEndDayKey, assignmentDueDayKey);

  const emitChange = React.useCallback(
    (patch: Partial<AssignmentCreateValue>) => {
      onChange({ ...value, ...patch });
    },
    [onChange, value]
  );

  const handleChangeMode = React.useCallback(
    (_: React.MouseEvent<HTMLElement>, modeValue: "root" | "child" | null) => {
      if (!modeValue || isView) return;

      emitChange({
        createMode: modeValue,
        parentAssignmentId: modeValue === "root" ? null : value.parentAssignmentId,
      });
    },
    [emitChange, isView, value.parentAssignmentId]
  );

  const handleParentChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      emitChange({
        parentAssignmentId: e.target.value || null,
      });
    },
    [emitChange]
  );

  const handleTemplateChange = React.useCallback(
    (item: { id: string; code: string; name: string } | null) => {
      emitChange({
        name: value.name?.trim() ? value.name : item?.name ?? "",
        dynamicFormTemplateId: item?.id ?? "",
        dynamicFormTemplateCode: item?.code ?? "",
        dynamicFormTemplateName: item?.name ?? "",
        dynamicFormDataSourceRulesJson: null,
        autoApproveConditionJson: null,
        dynamicExcelId: "",
        dynamicExcelCode: "",
        dynamicExcelName: "",
      });
    },
    [emitChange, value.name]
  );

  const handleNameChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      emitChange({ name: e.target.value });
    },
    [emitChange]
  );

  const handleSectionSourceRuleChange = React.useCallback(
    (sectionId: string, sourceRule: DynamicFormDataSourceRuleType) => {
      const nextRules = sectionSourceRules.map((rule) =>
        rule.sectionId === sectionId ? { ...rule, sourceRule } : rule
      );
      emitChange({
        dynamicFormDataSourceRulesJson: serializeDataSourceRules(nextRules),
      });
    },
    [emitChange, sectionSourceRules]
  );

  const handleAssignmentTypeChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextType = e.target.value as AssignmentCreateValue["assignmentType"];
      emitChange({
        assignmentType: nextType,
        dueAtUtc: nextType === "ONCE" ? value.dueAtUtc ?? null : null,
        completedDate: nextType === "ONCE" ? null : value.completedDate ?? null,
        schedule:
          nextType === "ONCE"
            ? null
            : value.schedule ?? { cycleType: "WEEKLY" },
      });
    },
    [emitChange, value.completedDate, value.dueAtUtc, value.schedule]
  );

  const handleAssigneeUnitsChange = React.useCallback(
    (ids: string[]) => {
      emitChange({ assigneeUnitIds: ids });
    },
    [emitChange]
  );

  const handleAssigneeUsersChange = React.useCallback(
    (ids: string[]) => {
      emitChange({ assigneeUserIds: ids });
    },
    [emitChange]
  );

  const handleLeaderWatcherChange = React.useCallback(
    (ids: string[]) => {
      emitChange({ leaderWatcherUserIds: ids });
    },
    [emitChange]
  );

  const handleDescriptionChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      emitChange({ description: e.target.value });
    },
    [emitChange]
  );

  const handleScheduleChange = React.useCallback(
    (schedule: any | null) => {
      emitChange({ schedule });
    },
    [emitChange]
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>{title}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {isWorkOwner && !isView ? (
            <Stack spacing={1}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={value.createMode}
                onChange={handleChangeMode}
              >
                <ToggleButton value="root">Giao việc/Phối hợp</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          ) : !isWorkOwner && !isView ? (
            <Alert severity="info">{uiText(UITextKey.TextChonNhanhCongViecGoc)}</Alert>
          ) : null}

          {mustChooseParent &&
            (isView ? (
              <TextField
                size="small"
                label={uiText(UITextKey.TextNhanhCongViec)}
                value={selectedParent ? getParentLabel(selectedParent) : value.parentAssignmentId || ""}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            ) : (
              <TextField
                select
                size="small"
                label={uiText(UITextKey.TextNhanhCongViec)}
                value={value.parentAssignmentId ?? ""}
                disabled={readonly || parentCandidatesLoading}
                onChange={handleParentChange}
                helperText={
                  parentCandidatesLoading
                    ? "Đang tải danh sách công việc hợp lệ..."
                    : "Chỉ hiển thị các công việc bạn có quyền chọn."
                }
                fullWidth
              >
                {parentCandidates.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {getParentLabel(item)}
                  </MenuItem>
                ))}
              </TextField>
            ))}

          <TextField
            size="small"
            label="Tên công việc được giao"
            value={value.name || (isView ? getTemplateFallbackName(value) : "")}
            disabled={readonly}
            onChange={handleNameChange}
            fullWidth
            required={!isView}
            InputProps={isView ? { readOnly: true } : undefined}
          />

          {isView ? (
            <TextField
              size="small"
              label={uiText(UITextKey.TextBieuMau)}
              value={getTemplateLabel(value)}
              fullWidth
              InputProps={{ readOnly: true }}
            />
          ) : (
            <DynamicFormPicker
              value={value.dynamicFormTemplateId}
              valueCode={value.dynamicFormTemplateCode}
              valueName={value.dynamicFormTemplateName}
              disabled={readonly}
              onChange={handleTemplateChange}
            />
          )}

          {value.dynamicFormTemplateId ? (
            <Accordion
              disableGutters
              variant="outlined"
              sx={{
                borderRadius: 1,
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon fontSize="small" />}
                sx={{
                  minHeight: 48,
                  "& .MuiAccordionSummary-content": {
                    my: 1,
                    minWidth: 0,
                  },
                }}
              >
                <Stack spacing={0.25} sx={{ minWidth: 0, width: "100%" }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Nguồn dữ liệu theo phần
                    </Typography>
                    <Chip size="small" variant="outlined" label={`${sectionSourceRules.length} phần`} />
                    {hasNonManualSection ? (
                      <Chip size="small" variant="outlined" label="Có phần lấy từ cấp dưới" />
                    ) : (
                      <Chip size="small" variant="outlined" label="Nhập tay" />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    Cấu hình theo section của lần giao việc này
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={1.25}>
                  <Typography variant="caption" color="text.secondary">
                    Cấu hình này thuộc về lần giao việc, không phụ thuộc vào bản thân biểu mẫu động.
                  </Typography>

                {selectedDynamicFormQuery.isLoading || selectedDynamicFormQuery.isFetching ? (
                  <Alert severity="info">Đang tải cấu trúc biểu mẫu động...</Alert>
                ) : !selectedDynamicForm ? (
                  <Alert severity="warning">
                    Chưa tải được cấu trúc biểu mẫu động để cấu hình theo section.
                  </Alert>
                ) : (
                  <Box sx={{ maxHeight: { xs: 300, md: 360 }, overflowY: "auto", pr: 0.5, scrollbarGutter: "stable" }}>
                    <Stack spacing={1}>
                      {selectedDynamicForm.sections.map((section, index) => {
                      const rule = sectionSourceRules.find((item) => item.sectionId === section.id);
                      const sourceRule = rule?.sourceRule ?? "MANUAL";
                      const optionHelp =
                        SOURCE_RULE_OPTIONS.find((item) => item.value === sourceRule)?.help ?? "";

                      return (
                        <React.Fragment key={section.id}>
                          {index > 0 && <Divider />}
                          <Stack
                            direction={{ xs: "column", md: "row" }}
                            spacing={1.5}
                            alignItems={{ xs: "stretch", md: "center" }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                {section.title || `Phần ${index + 1}`}
                              </Typography>
                              {section.description ? (
                                <Typography variant="caption" color="text.secondary">
                                  {section.description}
                                </Typography>
                              ) : null}
                            </Box>

                            {isView ? (
                              <TextField
                                size="small"
                                label="Cách lấy dữ liệu"
                                value={sourceRuleLabel(sourceRule)}
                                InputProps={{ readOnly: true }}
                                sx={{ minWidth: { md: 280 } }}
                              />
                            ) : (
                              <TextField
                                select
                                size="small"
                                label="Cách lấy dữ liệu"
                                value={sourceRule}
                                disabled={readonly}
                                helperText={optionHelp}
                                onChange={(e) =>
                                  handleSectionSourceRuleChange(
                                    section.id,
                                    normalizeSourceRule(e.target.value)
                                  )
                                }
                                sx={{ minWidth: { md: 320 } }}
                              >
                                {SOURCE_RULE_OPTIONS.map((option) => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            )}
                          </Stack>
                        </React.Fragment>
                      );
                      })}
                    </Stack>
                  </Box>
                )}

                {hasNonManualSection ? (
                  <Alert severity="info">
                    Gắn theo từng phần được lưu vào nhiệm vụ giao để dùng cho bước gắn dữ liệu thủ công sau này. Phần nhập tay vẫn cho người báo cáo bổ sung dữ liệu đi kèm.
                  </Alert>
                ) : null}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ) : null}

          {value.dynamicFormTemplateId ? (
            <AutoApproveConditionEditor
              fields={selectedDynamicForm?.fields ?? []}
              value={value.autoApproveConditionJson ?? null}
              disabled={readonly || selectedDynamicFormQuery.isLoading || selectedDynamicFormQuery.isFetching || !selectedDynamicForm}
              onChange={(autoApproveConditionJson) => emitChange({ autoApproveConditionJson })}
            />
          ) : null}

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "flex-start" }}
          >
            <TextField
              select={!isView}
              size="small"
              label="Hình thức theo dõi"
              value={value.assignmentType}
              disabled={readonly}
              onChange={isView ? undefined : handleAssignmentTypeChange}
              sx={{ minWidth: 220, flex: { md: "0 0 220px" } }}
              InputProps={isView ? { readOnly: true } : undefined}
            >
              {!isView && <MenuItem value="ONCE">{uiText(UITextKey.TextGiaoMotLan)}</MenuItem>}
              {!isView && <MenuItem value="PERIODIC_REPORT">{uiText(UITextKey.TextDinhKyBaoCao)}</MenuItem>}
            </TextField>

            <FormControlLabel
              control={<Switch checked={value.isActive} disabled />}
              label={value.isActive ? "Đang hiệu lực" : "Ngừng hiệu lực"}
              sx={{
                alignSelf: { md: "flex-start" },
                minHeight: 40,
                mt: { md: 0 },
                mx: 0,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            />

            <Chip
              size="small"
              color="success"
              variant="outlined"
              label="Báo cáo chủ động luôn bật"
              sx={{ alignSelf: { xs: "flex-start", md: "center" }, mt: { md: 0.75 }, flexShrink: 0 }}
            />
          </Stack>

          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
            <Stack spacing={1.25}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Thời hạn
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isOnceAssignment
                    ? "Giao một lần chỉ nhập hạn nộp báo cáo. Hạn nộp của nhiệm vụ tự kế thừa từ nhiệm vụ cha hoặc work."
                    : "Hạn nộp là mốc cuối của nhiệm vụ đang giao và giới hạn các kỳ báo cáo định kỳ được sinh."}
                </Typography>
              </Box>

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", md: "flex-start" }}
              >
                <SingleDayKeyField
                  label="Ngày bắt đầu"
                  value={isoToDayKey(value.startDate)}
                  disabled={readonly}
                  fullWidth
                  minDayKey={workStartDayKey}
                  maxDayKey={startMaxDayKey}
                  helperText="Ngày nhiệm vụ bắt đầu được theo dõi."
                  sx={{ flex: { md: "1 1 180px" } }}
                  onChange={(dayKey) => emitChange({ startDate: dayKeyToApiDate(dayKey) })}
                />

                {!isOnceAssignment && (
                  <SingleDayKeyField
                    label={uiText(UITextKey.TextHanNop)}
                    value={isoToDayKey(value.completedDate)}
                    disabled={readonly}
                    fullWidth
                    minDayKey={completedMinDayKey}
                    maxDayKey={workEndDayKey}
                    helperText="Mốc cuối của nhiệm vụ; lịch định kỳ không được vượt quá ngày này."
                    sx={{ flex: { md: "1 1 180px" } }}
                    onChange={(dayKey) => emitChange({ completedDate: dayKeyToApiDate(dayKey, true) })}
                  />
                )}

                {isOnceAssignment && (
                  <SingleDayKeyField
                    label="Hạn nộp báo cáo"
                    value={value.dueAtUtc ? isoDateToDayKey(String(value.dueAtUtc).slice(0, 10)) : ""}
                    disabled={readonly}
                    fullWidth
                    minDayKey={dueMinDayKey}
                    maxDayKey={dueMaxDayKey}
                    helperText={
                      inheritedDueLabel
                        ? `Không được sau hạn nhiệm vụ kế thừa ${inheritedDueLabel}.`
                        : "Áp dụng cho report của nhiệm vụ giao một lần."
                    }
                    sx={{ flex: { md: "1 1 180px" } }}
                    onChange={(dayKey) =>
                      emitChange({
                        dueAtUtc: dayKey ? `${dayKeyToIsoDate(dayKey)}T23:59:59.999Z` : null,
                      })
                    }
                  />
                )}
              </Stack>

              {value.assignmentType === "PERIODIC_REPORT" ? (
                <Alert severity="info">
                  Với báo cáo định kỳ, từng kỳ báo cáo lấy hạn theo lịch. Trường Hạn nộp chỉ giới hạn khoảng thời gian nhiệm vụ và các kỳ được sinh.
                </Alert>
              ) : null}
            </Stack>
          </Box>

          {isView ? (
            <>
              <ReadonlyListDropdown
                label={uiText(UITextKey.TextDonViDuocGiao)}
                items={viewAssigneeItems}
                fallback={viewAssigneeDisplay}
              />

              <ReadonlyListDropdown
                label={uiText(UITextKey.TextLanhDaoChiHuyTheoDoi)}
                items={viewLeaderWatcherItems}
                fallback={viewLeaderWatcherDisplay}
              />
            </>
          ) : (
            <>
              <LazyUnitMultiSelect
                mode="multiple"
                label="Đơn vị giao việc/phối hợp"
                value={value.assigneeUnitIds}
                onChange={handleAssigneeUnitsChange}
              />

              <Alert severity="info">
                Chọn đơn vị ngang cấp hoặc cấp dưới để giao việc/phối hợp. Nếu đơn vị đã ở cấp thấp nhất và cần giao cho cán bộ trong chính đơn vị, chọn trực tiếp tài khoản ở mục bên dưới.
              </Alert>

              <HybridUnitUserPicker
                kind="assignees"
                mode="multiple"
                label="Tài khoản phối hợp trực tiếp"
                placeholder="Chọn tài khoản trong đơn vị khi không còn đơn vị cấp dưới"
                value={value.assigneeUserIds}
                valueRefs={value.assigneeUserRefs}
                disabled={readonly}
                onChange={handleAssigneeUsersChange}
              />

              <HybridUnitUserPicker
                kind="leaders"
                mode="multiple"
                label={uiText(UITextKey.TextLanhDaoChiHuyTheoDoi)}
                placeholder={uiText(UITextKey.TextChonLanhDaoChiHuyTheoDoi)}
                value={value.leaderWatcherUserIds}
                disabled={readonly}
                onChange={handleLeaderWatcherChange}
              />
            </>
          )}

          {isView ? (
            <ReadonlyTextDropdown label={uiText(UITextKey.TextMoTa2)} value={value.description} />
          ) : (
            <TextField
              size="small"
              label={uiText(UITextKey.TextMoTa2)}
              value={value.description}
              disabled={readonly}
              onChange={handleDescriptionChange}
              fullWidth
              multiline
              minRows={2}
            />
          )}

          {value.assignmentType === "PERIODIC_REPORT" && (
            <PeriodicScheduleEditor
              value={value.schedule}
              disabled={readonly}
              workStartDate={value.startDate ?? workStartDate}
              workEndDate={value.completedDate ?? workEndDate}
              onChange={handleScheduleChange}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {isView ? "Đóng" : "Hủy"}
        </Button>

        {!hideSubmit && !isView && (
          <Button variant="contained" onClick={onSubmit} disabled={disabled}>
            {submitLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(WorkAssignmentCreateDialog);
