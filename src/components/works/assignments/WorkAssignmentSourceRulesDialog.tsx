import React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useGetDynamicFormQuery } from "../../../api/dynamicFormApi";
import { buildEditorValue } from "../../../features/dynamicForms/dynamicFormSchema";
import type {
  DynamicFormDataSourceRuleType,
  DynamicFormDataSourceRulesDocument,
  DynamicFormSectionDataSourceRule,
  WorkAssignmentListResponse,
  WorkAssignmentResponse,
} from "../../../types/workAssignment";

type SourceOption = {
  id: string;
  label: string;
};

type Props = {
  open: boolean;
  assignment: WorkAssignmentResponse | null;
  children: WorkAssignmentListResponse[];
  childrenLoading?: boolean;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (dynamicFormDataSourceRulesJson: string | null) => void;
};

const SOURCE_RULE_OPTIONS: Array<{ value: DynamicFormDataSourceRuleType; label: string; help: string }> = [
  {
    value: "MANUAL",
    label: "Nhập tay",
    help: "Reporter nhập trực tiếp phần này.",
  },
  {
    value: "AGGREGATE_CHILDREN",
    label: "Tự tổng hợp từ cấp dưới",
    help: "Lấy dữ liệu từ báo cáo đã duyệt của công việc con trực tiếp.",
  },
  {
    value: "MAP_CHILD",
    label: "Gắn một phần từ cấp dưới",
    help: "Map dữ liệu từ section/field/block của công việc con trực tiếp.",
  },
  {
    value: "MIXED",
    label: "Kết hợp",
    help: "Một phần nhập tay, một phần lấy từ công việc con.",
  },
];

function normalizeSourceRule(value: unknown): DynamicFormDataSourceRuleType {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (normalized === "AGGREGATE_CHILDREN" || normalized === "MAP_CHILD" || normalized === "MIXED") {
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

function serializeDataSourceRules(
  sectionRules: DynamicFormSectionDataSourceRule[],
  originalJson?: string | null,
) {
  const original = parseDataSourceRules(originalJson);
  return JSON.stringify({
    version: Math.max(1, original?.version ?? 1),
    sectionRules,
    fieldRules: original?.fieldRules ?? [],
    blockRules: original?.blockRules ?? [],
  } satisfies DynamicFormDataSourceRulesDocument);
}

function getAssignmentLabel(row: WorkAssignmentListResponse | WorkAssignmentResponse | null | undefined) {
  if (!row) return "";
  const code = row.dynamicFormTemplateCode?.trim() || row.dynamicExcelCode?.trim();
  const name = row.dynamicFormTemplateName?.trim() || row.dynamicExcelName?.trim();
  const assignees = (row.assignees ?? [])
    .map((x) => x.fullName || x.username || x.unitShortName || x.unitName || x.userId)
    .filter(Boolean)
    .join(", ");
  const template = code && name ? `${code} - ${name}` : code || name || row.id;
  return assignees ? `${template} | ${assignees}` : template;
}

function buildSourceOptions(
  children: WorkAssignmentListResponse[],
  selectedIds: string[],
): SourceOption[] {
  const byId = new Map<string, SourceOption>();
  children.forEach((child) => {
    if (!child.id) return;
    byId.set(child.id, { id: child.id, label: getAssignmentLabel(child) });
  });
  selectedIds.forEach((id) => {
    if (!byId.has(id)) {
      byId.set(id, { id, label: `Nguồn đã lưu (${id})` });
    }
  });
  return Array.from(byId.values());
}

const WorkAssignmentSourceRulesDialog: React.FC<Props> = ({
  open,
  assignment,
  children,
  childrenLoading = false,
  saving = false,
  onClose,
  onSubmit,
}) => {
  const [rulesJson, setRulesJson] = React.useState<string | null>(null);
  const dynamicFormTemplateId = assignment?.dynamicFormTemplateId?.trim() ?? "";
  const locked = Boolean(assignment?.hasData);

  React.useEffect(() => {
    if (!open) return;
    setRulesJson(assignment?.dynamicFormDataSourceRulesJson ?? null);
  }, [assignment?.dynamicFormDataSourceRulesJson, open]);

  const dynamicFormQuery = useGetDynamicFormQuery(
    { id: dynamicFormTemplateId },
    { skip: !open || !dynamicFormTemplateId }
  );

  const dynamicForm = React.useMemo(
    () => (dynamicFormQuery.data ? buildEditorValue(dynamicFormQuery.data) : null),
    [dynamicFormQuery.data]
  );

  const sectionRules = React.useMemo(
    () => buildSectionRules(dynamicForm?.sections ?? [], rulesJson),
    [dynamicForm?.sections, rulesJson]
  );

  const allSectionsAutomatic =
    sectionRules.length > 0 && sectionRules.every((rule) => rule.sourceRule === "AGGREGATE_CHILDREN");
  const hasNonManualSection = sectionRules.some((rule) => rule.sourceRule !== "MANUAL");

  const updateRule = React.useCallback(
    (sectionId: string, patch: Partial<DynamicFormSectionDataSourceRule>) => {
      const nextRules = sectionRules.map((rule) => {
        if (rule.sectionId !== sectionId) return rule;
        const nextRule = normalizeSourceRule(patch.sourceRule ?? rule.sourceRule);
        return {
          ...rule,
          ...patch,
          sourceRule: nextRule,
          sourceAssignmentIds: nextRule === "MANUAL" ? [] : patch.sourceAssignmentIds ?? rule.sourceAssignmentIds ?? [],
        };
      });
      setRulesJson(serializeDataSourceRules(nextRules, rulesJson));
    },
    [rulesJson, sectionRules]
  );

  const handleSubmit = React.useCallback(() => {
    onSubmit(serializeDataSourceRules(sectionRules, rulesJson));
  }, [onSubmit, rulesJson, sectionRules]);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle>Cấu hình nguồn dữ liệu</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {getAssignmentLabel(assignment) || "Công việc"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Chọn cách lấy dữ liệu theo từng phần của biểu mẫu. Nguồn tổng hợp chỉ được chọn từ công việc con trực tiếp.
            </Typography>
          </Box>

          {locked ? (
            <Alert severity="warning">
              Công việc đã có báo cáo nên cấu hình nguồn dữ liệu đang bị khóa để tránh làm sai dữ liệu đã nhập.
            </Alert>
          ) : null}

          {childrenLoading ? (
            <Alert severity="info">Đang tải danh sách công việc con...</Alert>
          ) : children.length === 0 ? (
            <Alert severity="info">
              Chưa có công việc con. Có thể lưu rule trước; phần chọn nguồn cụ thể sẽ bổ sung sau khi đã chia việc xuống dưới.
            </Alert>
          ) : null}

          <Stack direction="row" spacing={1} alignItems="center">
            {allSectionsAutomatic ? (
              <Chip size="small" color="info" label="Report tự tổng hợp" />
            ) : hasNonManualSection ? (
              <Chip size="small" variant="outlined" label="Có phần lấy từ cấp dưới" />
            ) : (
              <Chip size="small" variant="outlined" label="Nhập tay" />
            )}
          </Stack>

          {dynamicFormQuery.isLoading || dynamicFormQuery.isFetching ? (
            <Alert severity="info">Đang tải cấu trúc biểu mẫu...</Alert>
          ) : !dynamicForm ? (
            <Alert severity="warning">Chưa tải được cấu trúc biểu mẫu để cấu hình theo phần.</Alert>
          ) : (
            <Stack spacing={1.25}>
              {dynamicForm.sections.map((section, index) => {
                const rule = sectionRules.find((item) => item.sectionId === section.id);
                const sourceRule = rule?.sourceRule ?? "MANUAL";
                const selectedIds = rule?.sourceAssignmentIds ?? [];
                const options = buildSourceOptions(children, selectedIds);
                const selectedOptions = options.filter((option) => selectedIds.includes(option.id));
                const optionHelp = SOURCE_RULE_OPTIONS.find((item) => item.value === sourceRule)?.help ?? "";

                return (
                  <React.Fragment key={section.id}>
                    {index > 0 && <Divider />}
                    <Stack spacing={1}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1.5}
                        alignItems={{ xs: "stretch", md: "flex-start" }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {section.title || `Phần ${index + 1}`}
                          </Typography>
                          {section.description ? (
                            <Typography variant="caption" color="text.secondary">
                              {section.description}
                            </Typography>
                          ) : null}
                        </Box>

                        <TextField
                          select
                          size="small"
                          label="Cách lấy dữ liệu"
                          value={sourceRule}
                          disabled={locked || saving}
                          helperText={optionHelp}
                          onChange={(e) =>
                            updateRule(section.id, {
                              sourceRule: normalizeSourceRule(e.target.value),
                            })
                          }
                          sx={{ minWidth: { md: 320 } }}
                        >
                          {SOURCE_RULE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Stack>

                      {sourceRule !== "MANUAL" ? (
                        <Autocomplete
                          multiple
                          size="small"
                          options={options}
                          value={selectedOptions}
                          disableCloseOnSelect
                          disabled={locked || saving}
                          getOptionLabel={(option) => option.label}
                          isOptionEqualToValue={(option, selected) => option.id === selected.id}
                          onChange={(_, nextValue) =>
                            updateRule(section.id, {
                              sourceAssignmentIds: nextValue.map((item) => item.id),
                            })
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Công việc con làm nguồn"
                              helperText={
                                selectedIds.length === 0
                                  ? "Để trống nghĩa là chưa chốt nguồn cụ thể; hệ thống chưa materialize tự động từ rule này."
                                  : "BE chỉ chấp nhận công việc con trực tiếp của công việc đang cấu hình."
                              }
                            />
                          )}
                        />
                      ) : null}
                    </Stack>
                  </React.Fragment>
                );
              })}
            </Stack>
          )}

          {hasNonManualSection ? (
            <Alert severity="info">
              `Tự tổng hợp` và `Gắn một phần` hiện lưu contract theo section và danh sách công việc con. Mapping sâu theo field/block và preview dữ liệu sẽ nối tiếp ở bước sau.
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Đóng
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || locked || !dynamicForm}
        >
          Lưu cấu hình
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(WorkAssignmentSourceRulesDialog);
