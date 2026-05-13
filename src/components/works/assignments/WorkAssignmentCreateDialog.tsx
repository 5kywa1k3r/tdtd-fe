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
import SingleDayKeyField, { dayKeyToIsoDate, isoDateToDayKey } from "../../common/SingleDayKeyField";
import { UITextKey, uiText } from '../../../constants/uiText';
import { useGetDynamicFormQuery } from "../../../api/dynamicFormApi";
import { buildEditorValue } from "../../../features/dynamicForms/dynamicFormSchema";
import type {
  DynamicFormDataSourceRuleType,
  DynamicFormDataSourceRulesDocument,
  DynamicFormSectionDataSourceRule,
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

  assignmentType: "ONCE" | "PERIODIC_REPORT";
  aggregationType: "MATRIX" | "UNIT_ROW_COL";
  schedule: any | null;

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

    assignmentType: "ONCE",
    aggregationType: "MATRIX",
    schedule: null,

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
  title = "Giao công việc",
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
                <ToggleButton value="root">{uiText(UITextKey.TextGiaoCongViec)}</ToggleButton>
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

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select={!isView}
              size="small"
              label={uiText(UITextKey.TextDinhKyMotLan)}
              value={value.assignmentType}
              disabled={readonly}
              onChange={isView ? undefined : handleAssignmentTypeChange}
              sx={{ minWidth: 220 }}
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
              />
            ) : (
              <SingleDayKeyField
                label={uiText(UITextKey.TextHanNop)}
                value={value.dueAtUtc ? isoDateToDayKey(String(value.dueAtUtc).slice(0, 10)) : ""}
                disabled={readonly}
                fullWidth
                onChange={(dayKey) =>
                  emitChange({
                    dueAtUtc: dayKey ? `${dayKeyToIsoDate(dayKey)}T23:59:59.999Z` : null,
                  })
                }
              />
            ))}

            <FormControlLabel
              control={<Switch checked={value.isActive} disabled />}
              label={value.isActive ? "Đang hiệu lực" : "Ngừng hiệu lực"}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={value.allowUserCreatedReports}
                  disabled={readonly}
                  onChange={(_, checked) => emitChange({ allowUserCreatedReports: checked })}
                />
              }
              label={uiText(UITextKey.TextBaoCaoChuDong)}
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
                label={uiText(UITextKey.TextDonViDuocGiao)}
                value={value.assigneeUnitIds}
                onChange={handleAssigneeUnitsChange}
              />

              <Alert severity="info">
                Chỉ chọn đơn vị. Khi lưu, hệ thống sẽ map sang tài khoản quản trị đơn vị theo quy tắc mu_.
              </Alert>

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
              workStartDate={workStartDate}
              workEndDate={workEndDate}
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
