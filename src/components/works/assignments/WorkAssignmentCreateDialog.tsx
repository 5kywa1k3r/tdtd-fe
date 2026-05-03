import React from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import PreviewOutlinedIcon from "@mui/icons-material/PreviewOutlined";

import { LazyUnitMultiSelect } from "../../common/LazyUnitMultiSelect";
import { HybridUnitUserPicker } from "../../pickers/HybridUnitUserPicker";
import { DynamicFormPicker } from "./DynamicFormPicker";
import { PeriodicScheduleEditor } from "./PeriodicScheduleEditor";
import SingleDayKeyField, { dayKeyToIsoDate, isoDateToDayKey } from "../../common/SingleDayKeyField";

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
  onPreviewDynamicExcel?: (dynamicExcelId: string) => void;

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

const WorkAssignmentCreateDialog: React.FC<Props> = ({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
  onPreviewDynamicExcel,
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
        dynamicExcelId: "",
        dynamicExcelCode: "",
        dynamicExcelName: "",
      });
    },
    [emitChange]
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

  const handlePreviewTemplate = React.useCallback(() => {
    if (!value.dynamicExcelId) return;
    onPreviewDynamicExcel?.(value.dynamicExcelId);
  }, [onPreviewDynamicExcel, value.dynamicExcelId]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
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
                <ToggleButton value="root">Giao công việc</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          ) : !isWorkOwner && !isView ? (
            <Alert severity="info">Chọn nhánh công việc gốc</Alert>
          ) : null}

          {mustChooseParent &&
            (isView ? (
              <TextField
                size="small"
                label="Nhánh công việc"
                value={selectedParent ? getParentLabel(selectedParent) : value.parentAssignmentId || ""}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            ) : (
              <TextField
                select
                size="small"
                label="Nhánh công việc"
                value={value.parentAssignmentId ?? ""}
                disabled={readonly || parentCandidatesLoading}
                onChange={handleParentChange}
                helperText={
                  parentCandidatesLoading
                    ? "Đang tải danh sách công việc hợp lệ..."
                    : "Chỉ hiển thị các công việc hợp lệ của current user."
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
              label="Biểu mẫu"
              value={getTemplateLabel(value)}
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: value.dynamicExcelId ? (
                  <InputAdornment position="end">
                    <Tooltip title="Preview biểu mẫu">
                      <IconButton edge="end" onClick={handlePreviewTemplate}>
                        <PreviewOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ) : undefined,
              }}
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

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select={!isView}
              size="small"
              label="Định kỳ / Một lần"
              value={value.assignmentType}
              disabled={readonly}
              onChange={isView ? undefined : handleAssignmentTypeChange}
              sx={{ minWidth: 220 }}
              InputProps={isView ? { readOnly: true } : undefined}
            >
              {!isView && <MenuItem value="ONCE">Giao một lần</MenuItem>}
              {!isView && <MenuItem value="PERIODIC_REPORT">Định kỳ báo cáo</MenuItem>}
            </TextField>
            {value.assignmentType === "ONCE" && (isView ? (
              <SingleDayKeyField
                label="Hạn nộp"
                value={value.dueAtUtc ? isoDateToDayKey(String(value.dueAtUtc).slice(0, 10)) : ""}
                disabled
                fullWidth
              />
            ) : (
              <SingleDayKeyField
                label="Hạn nộp"
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
              label="Báo cáo chủ động"
            />
          </Stack>

          {isView ? (
            <>
              <TextField
                size="small"
                label="Đơn vị được giao"
                value={viewAssigneeDisplay || "-"}
                fullWidth
                multiline
                minRows={2}
                InputProps={{ readOnly: true }}
              />

              <TextField
                size="small"
                label="Lãnh đạo, chỉ huy theo dõi"
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
                label="Đơn vị được giao"
                value={value.assigneeUnitIds}
                onChange={handleAssigneeUnitsChange}
              />

              <Alert severity="info">
                Chỉ chọn đơn vị. Khi lưu, hệ thống sẽ map sang tài khoản quản trị đơn vị theo quy tắc mu_.
              </Alert>

              <HybridUnitUserPicker
                kind="leaders"
                mode="multiple"
                label="Lãnh đạo, chỉ huy theo dõi"
                placeholder="Chọn lãnh đạo, chỉ huy theo dõi"
                value={value.leaderWatcherUserIds}
                disabled={readonly}
                onChange={handleLeaderWatcherChange}
              />
            </>
          )}

          <TextField
            size="small"
            label="Mô tả"
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
