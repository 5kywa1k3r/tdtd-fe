import React from "react";
import {
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
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  dynamicExcelCode?: string | null;
  dynamicExcelName?: string | null;
}

export interface AssignmentCreateValue {
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
}

function getParentLabel(x: ParentCandidateOption) {
  const code = x.dynamicFormTemplateCode?.trim() || x.dynamicExcelCode?.trim();
  const name = x.dynamicFormTemplateName?.trim() || x.dynamicExcelName?.trim();
  if (code && name) return `${code} - ${name}`;
  return code || name || x.id;
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

const SOURCE_RULE_OPTIONS: Array<{ value: DynamicFormDataSourceRuleType; label: string; help: string }> = [
  {
    value: "MANUAL",
    label: "Nhập tay",
    help: "Reporter nhập dữ liệu trực tiếp trong phần này.",
  },
  {
    value: "AGGREGATE_CHILDREN",
    label: "Tự tổng hợp từ cấp dưới",
    help: "Hệ thống lấy dữ liệu từ các báo cáo con đã được duyệt.",
  },
  {
    value: "MAP_CHILD",
    label: "Map từ cấp dưới",
    help: "Dữ liệu được map từ phần tương ứng của công việc con.",
  },
  {
    value: "MIXED",
    label: "Kết hợp",
    help: "Một phần lấy từ cấp dưới, phần còn lại reporter nhập tay.",
  },
];

function normalizeSourceRule(value: unknown): DynamicFormDataSourceRuleType {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (
    normalized === "AGGREGATE_CHILDREN" ||
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

const AUTO_APPROVE_OPERATOR_LABELS: Record<WorkAssignmentAutoApproveConditionOperator, string> = {
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
  if (!enabled || !field?.id) return null;

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
    if (!value?.trim() || !condition.enabled || fields.length === 0 || selectedField) return;
    onChange(null);
  }, [condition.enabled, fields.length, onChange, selectedField, value]);

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
              Khi reporter nộp báo cáo và field thỏa điều kiện, hệ thống tự chuyển sang đã duyệt.
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={condition.enabled}
                disabled={disabled || selectableFields.length === 0}
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
          <Alert severity="info">Biểu mẫu chưa có field phù hợp để cấu hình tự duyệt.</Alert>
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
  const allSectionsAutomatic =
    sectionSourceRules.length > 0 &&
    sectionSourceRules.every((rule) => rule.sourceRule === "AGGREGATE_CHILDREN");
  const hasNonManualSection = sectionSourceRules.some((rule) => rule.sourceRule !== "MANUAL");

  const selectedParent = React.useMemo(() => {
    return parentCandidates.find((x) => x.id === value.parentAssignmentId) ?? null;
  }, [parentCandidates, value.parentAssignmentId]);
  const workStartDayKey = isoToDayKey(workStartDate);
  const workEndDayKey = isoToDayKey(workEndDate);
  const startDayKey = isoToDayKey(value.startDate);
  const completedDayKey = isoToDayKey(value.completedDate);
  const dueDayKey = isoToDayKey(value.dueAtUtc);
  const startMaxDayKey = minDayKey(
    workEndDayKey,
    completedDayKey,
    value.assignmentType === "ONCE" ? dueDayKey : ""
  );
  const completedMinDayKey = maxDayKey(workStartDayKey, startDayKey);
  const dueMinDayKey = maxDayKey(workStartDayKey, startDayKey);
  const dueMaxDayKey = minDayKey(workEndDayKey, completedDayKey);

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
        schedule:
          nextType === "ONCE"
            ? null
            : value.schedule ?? { cycleType: "WEEKLY" },
      });
    },
    [emitChange, value.dueAtUtc, value.schedule]
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
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                p: 1.5,
              }}
            >
              <Stack spacing={1.25}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Nguồn dữ liệu theo phần
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cấu hình này thuộc về lần giao việc, không phụ thuộc vào bản thân dynamic form.
                    </Typography>
                  </Box>
                  {allSectionsAutomatic ? (
                    <Chip size="small" color="info" label="Report tự tổng hợp" />
                  ) : hasNonManualSection ? (
                    <Chip size="small" variant="outlined" label="Có phần lấy từ cấp dưới" />
                  ) : (
                    <Chip size="small" variant="outlined" label="Nhập tay" />
                  )}
                </Stack>

                {selectedDynamicFormQuery.isLoading || selectedDynamicFormQuery.isFetching ? (
                  <Alert severity="info">Đang tải cấu trúc dynamic form...</Alert>
                ) : !selectedDynamicForm ? (
                  <Alert severity="warning">
                    Chưa tải được cấu trúc dynamic form để cấu hình theo section.
                  </Alert>
                ) : (
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
                )}

                {allSectionsAutomatic ? (
                  <Alert severity="info">
                    Khi toàn bộ section là tự tổng hợp, report sẽ mặc định khóa phần nhập dữ liệu và
                    dùng dữ liệu từ báo cáo cấp dưới đã duyệt.
                  </Alert>
                ) : hasNonManualSection ? (
                  <Alert severity="info">
                    Map/tổng hợp theo từng phần đã được lưu vào assignment. Phần nhập tay vẫn cho
                    reporter bổ sung dữ liệu đi kèm.
                  </Alert>
                ) : null}
              </Stack>
            </Box>
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
            {value.assignmentType === "ONCE" && (isView ? (
              <SingleDayKeyField
                label={uiText(UITextKey.TextHanNop)}
                value={value.dueAtUtc ? isoDateToDayKey(String(value.dueAtUtc).slice(0, 10)) : ""}
                disabled
                fullWidth
                minDayKey={dueMinDayKey}
                maxDayKey={dueMaxDayKey}
                sx={{ flex: { md: "1 1 180px" } }}
              />
            ) : (
              <SingleDayKeyField
                label={uiText(UITextKey.TextHanNop)}
                value={value.dueAtUtc ? isoDateToDayKey(String(value.dueAtUtc).slice(0, 10)) : ""}
                disabled={readonly}
                fullWidth
                minDayKey={dueMinDayKey}
                maxDayKey={dueMaxDayKey}
                sx={{ flex: { md: "1 1 180px" } }}
                onChange={(dayKey) =>
                  emitChange({
                    dueAtUtc: dayKey ? `${dayKeyToIsoDate(dayKey)}T23:59:59.999Z` : null,
                  })
                }
              />
            ))}

            <SingleDayKeyField
              label="Ngày bắt đầu nhiệm vụ"
              value={isoToDayKey(value.startDate)}
              disabled={readonly}
              fullWidth
              minDayKey={workStartDayKey}
              maxDayKey={startMaxDayKey}
              sx={{ flex: { md: "1 1 180px" } }}
              onChange={(dayKey) => emitChange({ startDate: dayKeyToApiDate(dayKey) })}
            />

            <SingleDayKeyField
              label="Hạn nộp nhiệm vụ"
              value={isoToDayKey(value.completedDate)}
              disabled={readonly}
              fullWidth
              minDayKey={completedMinDayKey}
              maxDayKey={workEndDayKey}
              sx={{ flex: { md: "1 1 180px" } }}
              onChange={(dayKey) => emitChange({ completedDate: dayKeyToApiDate(dayKey, true) })}
            />

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

          {isView ? (
            <>
              <TextField
                size="small"
                label={uiText(UITextKey.TextDonViDuocGiao)}
                value={viewAssigneeDisplay || "-"}
                fullWidth
                multiline
                minRows={2}
                InputProps={{ readOnly: true }}
              />

              <TextField
                size="small"
                label={uiText(UITextKey.TextLanhDaoChiHuyTheoDoi)}
                value={viewLeaderWatcherDisplay || "-"}
                fullWidth
                multiline
                minRows={2}
                InputProps={{ readOnly: true }}
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

          <TextField
            size="small"
            label={uiText(UITextKey.TextMoTa2)}
            value={value.description}
            disabled={readonly}
            onChange={handleDescriptionChange}
            fullWidth
            multiline
            minRows={2}
            InputProps={isView ? { readOnly: true } : undefined}
          />

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
