import React from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import RestoreIcon from "@mui/icons-material/Restore";

import { HybridUnitUserPicker } from "../../pickers/HybridUnitUserPicker";
import { DynamicFormPicker } from "./DynamicFormPicker";
import { PeriodicScheduleEditor } from "./PeriodicScheduleEditor";
import type { AssignmentDraft } from "../../../types/workAssignment";
import { UITextKey, uiText } from '../../../constants/uiText';

type Props = {
  draft: AssignmentDraft;
  disabled?: boolean;
  isUsedAssigneeConflict?: (
    userId: string,
    currentLocalId: string,
    dynamicExcelId: string
  ) => boolean;
  onChange: (next: AssignmentDraft) => void;
  onSave: () => void;
  onCancelCreate?: () => void;
  workStartDate?: string | null;
  workEndDate?: string | null;
};

export const WorkAssignmentRowEditor: React.FC<Props> = ({
  draft,
  disabled,
  workStartDate,
  workEndDate,
  onChange,
  onSave,
  onCancelCreate,
}) => {
  const theme = useTheme();

  const isCreate = draft.mode === "create" && !draft.id;
  const isExisting = !!draft.id;

  const rowDisabled = !!disabled || isExisting;
  const templateDisabled = rowDisabled;

  const hasStatusChanged = isExisting && !!draft.isDirty;

  const cardSx = React.useMemo(
    () => ({
      border: `1px solid ${theme.palette.divider}`,
      opacity: draft.isActive ? 1 : 0.62,
      bgcolor: draft.isActive
        ? "background.paper"
        : alpha(theme.palette.action.disabledBackground, 0.35),
      transition: "all 0.2s ease",
    }),
    [draft.isActive, theme]
  );

  return (
    <Card variant="outlined" sx={cardSx}>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {draft.dynamicFormTemplateName || draft.dynamicExcelName
                  ? `${draft.dynamicFormTemplateCode || draft.dynamicExcelCode || ""} - ${draft.dynamicFormTemplateName || draft.dynamicExcelName}`
                  : isCreate
                  ? "Giao việc"
                  : "Cấu hình biểu mẫu"}
              </Typography>

              <Chip
                size="small"
                label={
                  draft.assignmentType === "ONCE"
                    ? "Giao một lần"
                    : "Định kỳ báo cáo"
                }
                color={draft.assignmentType === "ONCE" ? "default" : "primary"}
                variant="outlined"
              />

              <Chip
                size="small"
                color={draft.isActive ? "success" : "default"}
                label={draft.isActive ? "Đang hiệu lực" : "Ngừng hiệu lực"}
              />

              {draft.hasData && (
                <Chip size="small" color="info" variant="outlined" label={uiText(UITextKey.TextDaCoDuLieu)} />
              )}

              {draft.templateLocked && (
                <Chip
                  size="small"
                  color="info"
                  variant="outlined"
                  label={uiText(UITextKey.TextKhoaBieuMau)}
                />
              )}

              {hasStatusChanged && (
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={uiText(UITextKey.TextChuaLuuThayDoi)}
                />
              )}
            </Stack>
          </Stack>

          {isExisting && (
            <Alert severity="info">
              Assignment đã tạo không chỉnh sửa trực tiếp. Chỉ cho phép bật/tắt hiệu lực
              rồi bấm <b>Lưu trạng thái</b>. Muốn đổi cấu hình, hãy giao công việc mới.
            </Alert>
          )}

          {(draft.hasData || draft.templateLocked) && (
            <Alert severity="info">
              Biểu mẫu này đã phát sinh dữ liệu nên không thể đổi biểu mẫu nguồn.
            </Alert>
          )}

          <Divider />

          <Stack spacing={2}>
            <DynamicFormPicker
              value={draft.dynamicFormTemplateId}
              valueCode={draft.dynamicFormTemplateCode}
              valueName={draft.dynamicFormTemplateName}
              disabled={templateDisabled}
              onChange={(item) =>
                onChange({
                  ...draft,
                  dynamicFormTemplateId: item?.id ?? "",
                  dynamicFormTemplateCode: item?.code ?? "",
                  dynamicFormTemplateName: item?.name ?? "",
                  dynamicExcelId: "",
                  dynamicExcelCode: "",
                  dynamicExcelName: "",
                  isDirty: true,
                })
              }
            />

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              flexWrap="wrap"
              useFlexGap
            >
              <TextField
                select
                size="small"
                label={uiText(UITextKey.TextLoaiGiao)}
                value={draft.assignmentType}
                disabled={rowDisabled}
                onChange={(e) => {
                  const nextType = e.target.value as AssignmentDraft["assignmentType"];
                  onChange({
                    ...draft,
                    assignmentType: nextType,
                    dueAtUtc: nextType === "ONCE" ? draft.dueAtUtc ?? null : null,
                    schedule:
                      nextType === "ONCE"
                        ? null
                        : draft.schedule ?? { cycleType: "WEEKLY" },
                    isDirty: true,
                  });
                }}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="ONCE">{uiText(UITextKey.TextGiaoMotLan)}</MenuItem>
                <MenuItem value="PERIODIC_REPORT">{uiText(UITextKey.TextDinhKyBaoCao)}</MenuItem>
              </TextField>

              <FormControlLabel
                sx={{ ml: 0.5 }}
                control={
                  <Switch
                    checked={!!draft.isActive}
                    disabled={!!disabled}
                    onChange={(_, checked) =>
                      onChange({
                        ...draft,
                        isActive: checked,
                        isDirty: true,
                      })
                    }
                  />
                }
                label={draft.isActive ? "Đang hiệu lực" : "Ngừng hiệu lực"}
              />
            </Stack>

            <HybridUnitUserPicker
              kind="assignees"
              mode="multiple"
              label={uiText(UITextKey.TextCanBoDauMoi)}
              placeholder={uiText(UITextKey.TextChonCanBoDauMoi)}
              value={draft.assigneeUserIds}
              valueRefs={draft.assigneeRefs as any}
              disabled={rowDisabled}
              onChange={(ids) =>
                onChange({
                  ...draft,
                  assigneeUserIds: ids,
                  isDirty: true,
                })
              }
            />

            <HybridUnitUserPicker
              kind="leaders"
              mode="multiple"
              label={uiText(UITextKey.TextLanhDaoChiHuyTheoDoi)}
              placeholder={uiText(UITextKey.TextChonLanhDaoChiHuyTheoDoi)}
              value={draft.leaderWatcherUserIds}
              valueRefs={draft.leaderWatcherRefs as any}
              disabled={rowDisabled}
              onChange={(ids) =>
                onChange({
                  ...draft,
                  leaderWatcherUserIds: ids,
                  isDirty: true,
                })
              }
            />

            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              label={uiText(UITextKey.TextMoTa2)}
              value={draft.description ?? ""}
              disabled={rowDisabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  description: e.target.value,
                  isDirty: true,
                })
              }
            />

            {draft.assignmentType === "ONCE" && (
              <TextField
                size="small"
                type="datetime-local"
                fullWidth
                label="Hạn nộp báo cáo"
                value={draft.dueAtUtc ? draft.dueAtUtc.slice(0, 16) : ""}
                disabled={rowDisabled}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    dueAtUtc: e.target.value ? new Date(e.target.value).toISOString() : null,
                    isDirty: true,
                  })
                }
                InputLabelProps={{ shrink: true }}
              />
            )}

            {draft.assignmentType === "PERIODIC_REPORT" && (
              <PeriodicScheduleEditor
                value={draft.schedule}
                disabled={rowDisabled}
                workStartDate={workStartDate}
                workEndDate={workEndDate}
                onChange={(v) =>
                  onChange({
                    ...draft,
                    schedule: v,
                    isDirty: true,
                  })
                }
              />
            )}
          </Stack>

          <Divider />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {isCreate && (
              <>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<RestoreIcon />}
                  onClick={onCancelCreate}
                  disabled={disabled}
                >
                  Hủy bỏ
                </Button>

                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={onSave}
                  disabled={disabled}
                >
                  Tạo mới
                </Button>
              </>
            )}

            {isExisting && (
              <Button
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                onClick={onSave}
                disabled={disabled || !hasStatusChanged}
              >
                Lưu trạng thái
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
