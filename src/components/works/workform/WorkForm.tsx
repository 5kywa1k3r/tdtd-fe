import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { MantineDateRangeFilter } from "../../common/dateRanger/MantineDateRangeFilter";
import { ActionResultDialog } from "../../common/ActionResultDialog";
import SingleDayKeyField, { isoDateToDayKey, dayKeyToIsoDate } from "../../common/SingleDayKeyField";
import { useWorkFormState, type WorkFormDraft } from "./parts/useWorkFormState";
import EvaluationTemplateSelector from "../../evaluation/EvaluationTemplateSelector";
import { UITextKey, uiText } from '../../../constants/uiText';

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

type WorkTextDraft = Required<Pick<WorkFormDraft, "name" | "description">>;
type WorkNoteDraft = Required<Pick<WorkFormDraft, "note">>;

interface WorkMainTextFieldsProps {
  isView: boolean;
  nameLabel: string;
  name: string;
  description: string;
  onDraftChange: (next: WorkTextDraft) => void;
}

const WorkMainTextFields = React.memo(function WorkMainTextFields({
  isView,
  nameLabel,
  name,
  description,
  onDraftChange,
}: WorkMainTextFieldsProps) {
  const initialDraft = useMemo(() => ({ name, description }), [name, description]);
  const draftRef = useRef<WorkTextDraft>(initialDraft);
  const [draft, setDraft] = useState<WorkTextDraft>(initialDraft);

  useEffect(() => {
    draftRef.current = initialDraft;
    setDraft(initialDraft);
    onDraftChange(initialDraft);
  }, [initialDraft, onDraftChange]);

  const commitDraft = useCallback(
    (patch: Partial<WorkTextDraft>) => {
      const next = { ...draftRef.current, ...patch };
      draftRef.current = next;
      setDraft(next);
      onDraftChange(next);
    },
    [onDraftChange]
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      commitDraft({ name: e.target.value });
    },
    [commitDraft]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      commitDraft({ description: e.target.value });
    },
    [commitDraft]
  );

  return (
    <>
      <Tooltip title={draft.name.trim() || ""} arrow disableHoverListener={!draft.name.trim()}>
        <Box>
          <Field
            isView={isView}
            name="name"
            label={nameLabel}
            value={draft.name}
            onChange={handleNameChange}
            fullWidth
            required
          />
        </Box>
      </Tooltip>

      <Field
        isView={isView}
        name="description"
        label={uiText(UITextKey.TextMoTa2)}
        value={draft.description}
        onChange={handleDescriptionChange}
        fullWidth
        multiline
        minRows={2}
      />
    </>
  );
});

interface WorkNoteFieldProps {
  isView: boolean;
  note: string;
  onDraftChange: (next: WorkNoteDraft) => void;
}

const WorkNoteField = React.memo(function WorkNoteField({
  isView,
  note,
  onDraftChange,
}: WorkNoteFieldProps) {
  const [draft, setDraft] = useState<WorkNoteDraft>(() => ({ note }));
  const draftRef = useRef<WorkNoteDraft>({ note });

  useEffect(() => {
    const next = { note };
    draftRef.current = next;
    setDraft(next);
    onDraftChange(next);
  }, [note, onDraftChange]);

  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = { note: e.target.value };
      draftRef.current = next;
      setDraft(next);
      onDraftChange(next);
    },
    [onDraftChange]
  );

  return (
    <Field
      isView={isView}
      label={uiText(UITextKey.TextGhiChu)}
      name="note"
      value={draft.note}
      onChange={handleNoteChange}
      fullWidth
      multiline
      minRows={3}
    />
  );
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

  const textDraftRef = useRef<WorkTextDraft>({
    name: state.name,
    description: state.description,
  });
  const noteDraftRef = useRef<WorkNoteDraft>({
    note: state.note,
  });

  useEffect(() => {
    textDraftRef.current = {
      name: state.name,
      description: state.description,
    };
  }, [state.name, state.description]);

  const handleTextDraftChange = useCallback((next: WorkTextDraft) => {
    textDraftRef.current = next;
  }, []);

  useEffect(() => {
    noteDraftRef.current = {
      note: state.note,
    };
  }, [state.note]);

  const handleNoteDraftChange = useCallback((next: WorkNoteDraft) => {
    noteDraftRef.current = next;
  }, []);

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

  const readableLockedFieldSx = isView
    ? {
        "& .MuiInputBase-root.Mui-disabled": {
          bgcolor: "#f8fafc",
          color: "#0f172a",
          opacity: 1,
        },
        "& .MuiInputBase-input.Mui-disabled": {
          WebkitTextFillColor: "#0f172a",
          color: "#0f172a",
          opacity: 1,
        },
        "& .MuiInputLabel-root.Mui-disabled": {
          color: "#475569",
          opacity: 1,
        },
        "& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
          borderColor: "#cbd5e1",
        },
        "& .MuiSelect-icon.Mui-disabled, & .MuiAutocomplete-endAdornment .MuiSvgIcon-root": {
          color: "#475569",
          opacity: 1,
        },
        "& input:disabled, & textarea:disabled": {
          WebkitTextFillColor: "#0f172a",
          color: "#0f172a",
          opacity: 1,
        },
        "& .MuiSelect-nativeInput": {
          opacity: 0,
          pointerEvents: "none",
        },
      }
    : undefined;

  const handleSave = async () => {
    const draft = {
      ...textDraftRef.current,
      ...noteDraftRef.current,
    };
    const err = validate(nameLabel, draft);
    if (err) {
      showErr(err);
      return;
    }

    try {
      if (isEdit && initialData?.id) {
        const payload = buildUpdatePayload(draft);
        const saved = await updateWork({ id: initialData.id, data: payload }).unwrap();
        onSaved?.(saved?.id);
        showOk("Cập nhật thành công.");
      } else {
        const payload = buildCreatePayload(draft);
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

  return (
    <>
      <Stack spacing={2} sx={readableLockedFieldSx}>
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
              <WorkMainTextFields
                isView={isView}
                nameLabel={nameLabel}
                name={state.name}
                description={state.description}
                onDraftChange={handleTextDraftChange}
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="flex-start">
                <Box sx={{ minWidth: 320, flex: 1 }}>
                  <MantineDateRangeFilter
                    name="workDateRange"
                    disabled={isView}
                    value={dateValue}
                    onChange={(v) => {
                      setState((s) => ({
                        ...s,
                        startDate: v.from ? v.from.format("YYYY-MM-DD") : "",
                        endDate: v.to ? v.to.format("YYYY-MM-DD") : "",
                      }));
                    }}
                    placeholder={uiText(UITextKey.TextTuNgayDenNgay)}
                    zIndex={20000}
                    inputHeight={40}
                  />
                </Box>

                <Box sx={{ width: { xs: "100%", md: 220 } }}>
                  <Field
                    isView={isView}
                    select
                    fullWidth
                    label={uiText(UITextKey.TextUuTien)}
                    name="priority"
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
                  <SingleDayKeyField
                    label={uiText(UITextKey.TextHan)}
                    name="dueDate"
                    value={isoDateToDayKey(state.dueDate)}
                    disabled={isView}
                    fullWidth
                    onChange={(dayKey) =>
                      setState((s) => ({
                        ...s,
                        dueDate: dayKey ? dayKeyToIsoDate(dayKey) : "",
                      }))
                    }
                  />
                </Box>
              </Stack>

            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Stack spacing={1.5} direction={{ xs: "column", md: "row" }} alignItems="stretch">
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <HybridUnitUserPicker
                    kind="leaders"
                    mode="single"
                    label={uiText(UITextKey.TextLanhDaoChiDao)}
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
                    label={uiText(UITextKey.TextLanhDaoChiHuyTheoDoi)}
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
            <Stack spacing={1}>
              <EvaluationTemplateSelector
                value={state.evaluationTemplateId}
                onChange={(next) => setState((s) => ({ ...s, evaluationTemplateId: next }))}
                disabled={isView || busy}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <WorkNoteField
              isView={isView}
              note={state.note}
              onDraftChange={handleNoteDraftChange}
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
