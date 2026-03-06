import React from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RestoreIcon from "@mui/icons-material/Restore";

import { HybridUnitUserPicker } from "../../pickers/HybridUnitUserPicker";
import { DynamicExcelPicker } from "./DynamicExcelPicker";
import { PeriodicScheduleEditor } from "./PeriodicScheduleEditor";
import type { AssignmentDraft } from "../../../types/workAssignment";

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
  onDelete: () => void;
  onEdit: () => void;
  onCancelCreate?: () => void;
  onView: () => void;
  onPreviewDynamicExcel: (dynamicExcelId: string) => void;
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
  onDelete,
  onEdit,
  onCancelCreate,
  onView,
  onPreviewDynamicExcel,
}) => {
  const theme = useTheme();

  const isView = draft.mode === "view";
  const rowDisabled = !!disabled || isView;
  const templateDisabled =
    rowDisabled || !!draft.templateLocked || !!draft.hasData;

  const cardSx = React.useMemo(
    () => ({
      border: `1px solid ${theme.palette.divider}`,
      opacity: draft.isActive ? 1 : 0.55,
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
                {draft.dynamicExcelName
                  ? `${draft.dynamicExcelCode ?? ""} — ${draft.dynamicExcelName}`
                  : "Cấu hình biểu mẫu"}
              </Typography>

              <Chip
                size="small"
                label={
                  draft.assignmentType === "ONCE"
                    ? "Tổng hợp"
                    : "Định kỳ báo cáo"
                }
                color={draft.assignmentType === "ONCE" ? "default" : "primary"}
                variant="outlined"
              />

              <Chip
                size="small"
                label={draft.aggregationType}
                color="secondary"
                variant="outlined"
              />

              {!draft.isActive && (
                <Chip size="small" color="warning" label="Đang vô hiệu hóa" />
              )}
            </Stack>

            <Stack direction="row" spacing={1}>
              {isView ? (
                <Tooltip title="Chuyển sang sửa">
                  <span>
                    <IconButton onClick={onEdit} disabled={disabled}>
                      <EditIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : (
                <Tooltip title="Xem">
                  <span>
                    <IconButton onClick={onView} disabled={disabled}>
                      <VisibilityIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              )}

              <Tooltip title={draft.mode === "create" ? "Hủy bỏ" : "Xóa"}>
                <span>
                  <IconButton onClick={onDelete} disabled={disabled} color="error">
                    <DeleteOutlineIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          {(draft.hasData || draft.templateLocked) && (
            <Alert severity="info">
              Biểu mẫu này đã phát sinh dữ liệu nên không thể đổi biểu mẫu nguồn.
            </Alert>
          )}

          <Divider />

          <Stack spacing={2}>
            <DynamicExcelPicker
              value={draft.dynamicExcelId}
              valueCode={draft.dynamicExcelCode}
              valueName={draft.dynamicExcelName}
              disabled={templateDisabled}
              onPreview={onPreviewDynamicExcel}
              onChange={(item) =>
                onChange({
                  ...draft,
                  dynamicExcelId: item?.id ?? "",
                  dynamicExcelCode: item?.code ?? "",
                  dynamicExcelName: item?.name ?? "",
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
                label="Loại giao"
                value={draft.assignmentType}
                disabled={rowDisabled}
                onChange={(e) => {
                  const nextType = e.target.value as AssignmentDraft["assignmentType"];
                  onChange({
                    ...draft,
                    assignmentType: nextType,
                    schedule:
                      nextType === "ONCE"
                        ? null
                        : draft.schedule ?? { cycleType: "WEEKLY" },
                    isDirty: true,
                  });
                }}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="ONCE">Giao một lần</MenuItem>
                <MenuItem value="PERIODIC_REPORT">Định kỳ báo cáo</MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label="Kiểu tính toán / tổng hợp"
                value={draft.aggregationType}
                disabled={rowDisabled}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    aggregationType: e.target.value as AssignmentDraft["aggregationType"],
                    isDirty: true,
                  })
                }
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="MATRIX">MATRIX</MenuItem>
                <MenuItem value="UNIT_ROW_COL">UNIT_ROW_COL</MenuItem>
              </TextField>

              {/* <TextField
                select
                size="small"
                label="Phép tính"
                value={draft.computationType}
                disabled={rowDisabled}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    computationType: e.target.value as AssignmentDraft["computationType"],
                    isDirty: true,
                  })
                }
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="SUM">SUM</MenuItem>
                <MenuItem value="MEAN">MEAN</MenuItem>
                <MenuItem value="MAX">MAX</MenuItem>
                <MenuItem value="MIN">MIN</MenuItem>
              </TextField> */}

              <FormControlLabel
                sx={{ ml: 0.5 }}
                control={
                  <Switch
                    checked={draft.isActive}
                    disabled={rowDisabled}
                    onChange={(_, checked) =>
                      onChange({
                        ...draft,
                        isActive: checked,
                        isDirty: true,
                      })
                    }
                  />
                }
                label={draft.isActive ? "Đang kích hoạt" : "Đang vô hiệu hóa"}
              />
            </Stack>

            <HybridUnitUserPicker
              kind="assignees"
              mode="multiple"
              label="Cán bộ đầu mối"
              placeholder="Chọn cán bộ đầu mối"
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
              label="Lãnh đạo, chỉ huy theo dõi"
              placeholder="Chọn lãnh đạo, chỉ huy theo dõi"
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
              label="Mô tả"
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
            {draft.mode === "create" && (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<RestoreIcon />}
                onClick={onCancelCreate}
                disabled={disabled}
              >
                Hủy bỏ
              </Button>
            )}

            {!isView && (
              <Button
                variant="contained"
                startIcon={
                  draft.mode === "create" ? <AddCircleOutlineIcon /> : <SaveIcon />
                }
                onClick={onSave}
                disabled={disabled}
              >
                {draft.mode === "create" ? "Tạo mới" : "Lưu thay đổi"}
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};