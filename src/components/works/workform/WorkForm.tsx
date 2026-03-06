import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Tooltip,
  MenuItem,
} from "@mui/material";

import { useCreateWorkMutation, useUpdateWorkMutation } from "../../../api/workApi";
import type { WorkDetail, WorkPriorityCore } from "../../../types/work";
import { WORK_PRIORITY_OPTIONS } from "../../../types/work";

import { HybridUnitUserPicker } from "../../pickers/HybridUnitUserPicker";
import { MantineDateRangeFilter } from "../../common/MantineDateRangeFilter";
import { ActionResultDialog } from "../../common/ActionResultDialog";
import { useWorkFormState } from "./parts/useWorkFormState";
import { WorkBasisFiles } from "./parts/WorkBasisFiles";

type WorkType = "TASK" | "INDICATOR";
type WorkFormMode = "create" | "edit" | "view";

interface WorkFormProps {
  type: WorkType;
  onCancel: () => void;
  onSaved?: (savedId?: string) => void;
  mode?: WorkFormMode;
  initialData?: WorkDetail;
}

const Field = React.memo(function Field(
  props: React.ComponentProps<typeof TextField> & { isView?: boolean }
) {
  const { isView, disabled, ...rest } = props;
  return <TextField size="small" {...rest} disabled={!!isView || !!disabled} />;
});

export const WorkForm: React.FC<WorkFormProps> = ({
  type,
  onCancel,
  onSaved,
  mode = "create",
  initialData,
}) => {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";
  const nameLabel = type === "TASK" ? "Tên nhiệm vụ" : "Tên chỉ tiêu";

  const [createWork, { isLoading: creating }] = useCreateWorkMutation();
  const [updateWork, { isLoading: updating }] = useUpdateWorkMutation();
  const busy = creating || updating;

  const {
    state,
    setState,
    dateValue,
    validate,
    buildCreatePayload,
    buildUpdatePayload,
  } = useWorkFormState(initialData, type);

  const [resultOpen, setResultOpen] = useState(false);
  const [resultOk, setResultOk] = useState(true);
  const [resultMsg, setResultMsg] = useState("");
  const [resultDetail, setResultDetail] = useState<string | undefined>(undefined);

  const showOk = (m: string) => {
    setResultOk(true);
    setResultMsg(m);
    setResultDetail(undefined);
    setResultOpen(true);
  };

  const showErr = (m: string, d?: string) => {
    setResultOk(false);
    setResultMsg(m);
    setResultDetail(d);
    setResultOpen(true);
  };

  const actionText = useMemo(() => {
    if (isView) return "Đóng";
    if (isCreate) return "Tạo mới";
    return "Cập nhật";
  }, [isView, isCreate]);

  const handleSave = async () => {
    const err = validate(nameLabel);
    if (err) {
      showErr(err);
      return;
    }

    try {
      if (isEdit && initialData?.id) {
        const payload = buildUpdatePayload();
        const saved = await updateWork({ id: initialData.id, data: payload }).unwrap();
        onSaved?.(saved?.id);
        showOk("Cập nhật thành công.");
      } else {
        const payload = buildCreatePayload();
        const saved = await createWork(payload).unwrap();
        onSaved?.(saved?.id);
        showOk("Tạo mới thành công.");
      }
    } catch (e: any) {
      console.error(e);
      const serverDetail =
        e?.data?.title ||
        e?.data?.message ||
        e?.error ||
        e?.message ||
        "Không rõ lỗi.";
      showErr("Lưu thất bại.", serverDetail);
    }
  };

  const workId = initialData?.id;

  return (
    <>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            size="small"
            color={type === "TASK" ? "primary" : "secondary"}
            label={type === "TASK" ? "NHIỆM VỤ" : "CHỈ TIÊU"}
            sx={{ fontWeight: 800 }}
          />

          {!isCreate && state.autoCode && (
            <Chip
              size="small"
              variant="outlined"
              label={state.autoCode}
              sx={{
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              }}
            />
          )}
        </Stack>

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Tooltip title={state.name.trim() || ""} arrow disableHoverListener={!state.name.trim()}>
                <Box>
                  <Field
                    isView={isView}
                    label={nameLabel}
                    value={state.name}
                    onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
                    fullWidth
                    required
                  />
                </Box>
              </Tooltip>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="flex-start">
                <Box sx={{ minWidth: 320, flex: 1 }}>
                  <MantineDateRangeFilter
                    disabled={isView}
                    value={dateValue}
                    onChange={(v) => {
                      setState((s) => ({
                        ...s,
                        startDate: v.from ? v.from.format("YYYY-MM-DD") : "",
                        endDate: v.to ? v.to.format("YYYY-MM-DD") : "",
                      }));
                    }}
                    placeholder="Từ ngày – đến ngày"
                    zIndex={20000}
                    inputHeight={40}
                  />
                </Box>

                <Box sx={{ width: { xs: "100%", md: 220 } }}>
                  <Field
                    isView={isView}
                    select
                    fullWidth
                    label="Ưu tiên"
                    value={state.priority}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        priority: Number(e.target.value) as WorkPriorityCore,
                      }))
                    }
                  >
                    {WORK_PRIORITY_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Field>
                </Box>

                <Box sx={{ width: { xs: "100%", md: 190 } }}>
                  <Field
                    isView={isView}
                    type="date"
                    fullWidth
                    label="Hạn"
                    value={state.dueDate}
                    onChange={(e) => setState((s) => ({ ...s, dueDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Stack>

              <Field
                isView={isView}
                label="Mô tả"
                value={state.description}
                onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
                fullWidth
                multiline
                minRows={2}
              />
            </Stack>
          </CardContent>
        </Card>

        {workId && <WorkBasisFiles workId={workId} disabled={!isEdit} />}

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Stack spacing={1.5} direction={{ xs: "column", md: "row" }} alignItems="stretch">
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <HybridUnitUserPicker
                    kind="leaders"
                    mode="single"
                    label="Lãnh đạo chỉ đạo"
                    disabled={isView}
                    value={state.leaderDirectiveUserId ? [state.leaderDirectiveUserId] : []}
                    onChange={(ids) => setState((s) => ({ ...s, leaderDirectiveUserId: ids[0] ?? "" }))}
                    valueRefs={initialData?.leaderDirective ? [initialData.leaderDirective] : []}
                  />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <HybridUnitUserPicker
                    kind="leaders"
                    mode="multiple"
                    label="Lãnh đạo, chỉ huy theo dõi"
                    disabled={isView}
                    value={state.leaderWatchUserIds}
                    valueRefs={initialData?.leaderWatch ?? []}
                    onChange={(ids) => setState((s) => ({ ...s, leaderWatchUserIds: ids }))}
                  />
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Field
              isView={isView}
              label="Ghi chú"
              value={state.note}
              onChange={(e) => setState((s) => ({ ...s, note: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />
          </CardContent>
        </Card>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button variant="outlined" onClick={onCancel} disabled={busy}>
            {isView ? "Đóng" : "Hủy"}
          </Button>

          {!isView && (
            <Button variant="contained" onClick={handleSave} disabled={busy}>
              {busy ? "Đang lưu..." : actionText}
            </Button>
          )}
        </Box>
      </Stack>

      <ActionResultDialog
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        severity={resultOk ? "success" : "error"}
        message={resultMsg}
        detail={resultDetail}
      />
    </>
  );
};