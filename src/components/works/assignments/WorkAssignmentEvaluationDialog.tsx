import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import dayjs from "dayjs";

import { useGetEvaluationTemplateByIdQuery } from "../../../api/evaluationTemplateApi";
import {
  useEvaluateAssignmentMutation,
  useGetEvaluationLogsQuery,
} from "../../../api/reportApi";

type Props = {
  open: boolean;
  assignmentId: string;
  assignmentLabel?: string;
  evaluationTemplateId?: string | null;
  currentEvaluationCode?: string | null;
  currentEvaluationLabel?: string | null;
  onClose: () => void;
  onSaved?: (message?: string) => void | Promise<void>;
  onError?: (message: string) => void;
};

type EvaluationLogRowLike = {
  id?: string | null;
  action?: string | null;
  fromEvaluationCode?: string | null;
  fromEvaluationLabel?: string | null;
  toEvaluationCode?: string | null;
  toEvaluationLabel?: string | null;
  comment?: string | null;
  reason?: string | null;
  actionByUserId?: string | null;
  actionAtUtc?: string | null;
};

function getEvalLabel(code?: string | null, label?: string | null) {
  return label || code || "-";
}

const WorkAssignmentEvaluationDialog: React.FC<Props> = ({
  open,
  assignmentId,
  assignmentLabel,
  evaluationTemplateId,
  currentEvaluationCode,
  currentEvaluationLabel,
  onClose,
  onSaved,
  onError,
}) => {
  const [evaluationCode, setEvaluationCode] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setEvaluationCode(currentEvaluationCode ?? "");
    setComment("");
    setReason("");
  }, [open, currentEvaluationCode, assignmentId]);

  const {
    data: templateData,
    isFetching: templateLoading,
    error: templateError,
  } = useGetEvaluationTemplateByIdQuery(evaluationTemplateId ?? "", {
    skip: !open || !evaluationTemplateId,
  });

  const {
    data: logsData,
    isFetching: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useGetEvaluationLogsQuery(
    { assignmentId, page: 0, pageSize: 20 },
    { skip: !open || !assignmentId }
  );

  const [evaluateAssignment, evaluateState] = useEvaluateAssignmentMutation();

  const templateItems = React.useMemo(
    () =>
      [...(templateData?.items ?? [])]
        .filter((x) => x?.isActive !== false)
        .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0)),
    [templateData]
  );

  const logs = React.useMemo(
    () => ((logsData?.rows ?? []) as EvaluationLogRowLike[]),
    [logsData]
  );

  const handleSubmit = async () => {
    if (!assignmentId) {
      onError?.("Không xác định được assignment.");
      return;
    }

    if (!evaluationCode) {
      onError?.("Bắt buộc chọn mã đánh giá.");
      return;
    }

    try {
      await evaluateAssignment({
        assignmentId,
        data: {
          evaluationCode,
          comment: comment.trim() || null,
          reason: reason.trim() || null,
        },
      }).unwrap();

      await refetchLogs();
      await onSaved?.("Đã lưu đánh giá assignment.");
    } catch (err: any) {
      onError?.(err?.data?.message || err?.message || "Lưu đánh giá thất bại.");
    }
  };

  return (
    <Dialog open={open} onClose={evaluateState.isLoading ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Đánh giá assignment</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {assignmentLabel ? (
            <TextField
              size="small"
              label="Assignment"
              value={assignmentLabel}
              fullWidth
              InputProps={{ readOnly: true }}
            />
          ) : null}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              size="small"
              label="Bộ tiêu chí"
              value={
                templateData
                  ? `${templateData.representativeCode} - ${templateData.representativeLabel}`
                  : evaluationTemplateId || "-"
              }
              fullWidth
              InputProps={{ readOnly: true }}
            />

            <TextField
              size="small"
              label="Đánh giá hiện tại"
              value={getEvalLabel(currentEvaluationCode, currentEvaluationLabel)}
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Stack>

          {templateLoading && (
            <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {templateError && (
            <Alert severity="error">Không tải được bộ tiêu chí đánh giá.</Alert>
          )}

          {!templateLoading && !templateError && (
            <TextField
              select
              size="small"
              label="Kết quả đánh giá"
              value={evaluationCode}
              onChange={(e) => setEvaluationCode(e.target.value)}
              fullWidth
            >
              {templateItems.map((item) => (
                <MenuItem key={item.code} value={item.code}>
                  {item.code} - {item.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            size="small"
            label="Nhận xét"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <TextField
            size="small"
            label="Lý do"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <Divider />

          <Typography variant="subtitle2" fontWeight={600}>
            Lịch sử đánh giá
          </Typography>

          {logsLoading ? (
            <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : logsError ? (
            <Alert severity="error">Không tải được lịch sử đánh giá.</Alert>
          ) : logs.length === 0 ? (
            <Alert severity="info">Chưa có lịch sử đánh giá nào.</Alert>
          ) : (
            <Stack spacing={1.25}>
              {logs.map((row, index) => (
                <Box
                  key={row.id || `${row.actionAtUtc || "log"}_${index}`}
                  sx={{
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    borderRadius: 1.5,
                    p: 1.25,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                  >
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={row.action || "EVALUATE"}
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`Từ: ${getEvalLabel(
                          row.fromEvaluationCode,
                          row.fromEvaluationLabel
                        )}`}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`Sang: ${getEvalLabel(
                          row.toEvaluationCode,
                          row.toEvaluationLabel
                        )}`}
                        color="success"
                        variant="outlined"
                      />
                    </Stack>

                    <Typography variant="caption" color="text.secondary">
                      {row.actionAtUtc
                        ? dayjs(row.actionAtUtc).format("DD/MM/YYYY HH:mm")
                        : "-"}
                    </Typography>
                  </Stack>

                  {(row.comment || row.reason || row.actionByUserId) && (
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {row.comment ? (
                        <Typography variant="body2">
                          <b>Nhận xét:</b> {row.comment}
                        </Typography>
                      ) : null}

                      {row.reason ? (
                        <Typography variant="body2">
                          <b>Lý do:</b> {row.reason}
                        </Typography>
                      ) : null}

                      {row.actionByUserId ? (
                        <Typography variant="caption" color="text.secondary">
                          Người thao tác: {row.actionByUserId}
                        </Typography>
                      ) : null}
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={evaluateState.isLoading}>
          Đóng
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={
            evaluateState.isLoading ||
            !assignmentId ||
            !evaluationTemplateId ||
            !evaluationCode
          }
        >
          {evaluateState.isLoading ? "Đang lưu..." : "Lưu đánh giá"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(WorkAssignmentEvaluationDialog);