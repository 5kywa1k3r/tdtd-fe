import React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

import { useGetDynamicFormQuery } from "../../../api/dynamicFormApi";
import { buildEditorValue } from "../../../features/dynamicForms/dynamicFormSchema";
import type { WorkAssignmentResponse } from "../../../types/workAssignment";
import { AutoApproveConditionEditor } from "./WorkAssignmentCreateDialog";

type Props = {
  open: boolean;
  assignment: WorkAssignmentResponse | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (autoApproveConditionJson: string | null) => void;
};

function getAssignmentLabel(row: WorkAssignmentResponse | null | undefined) {
  if (!row) return "";
  const name = row.dynamicFormTemplateName?.trim() || row.dynamicExcelName?.trim();
  return name || row.name?.trim() || row.id;
}

const WorkAssignmentAutoApproveConditionDialog: React.FC<Props> = ({
  open,
  assignment,
  saving = false,
  onClose,
  onSubmit,
}) => {
  const [conditionJson, setConditionJson] = React.useState<string | null>(null);
  const dynamicFormTemplateId = assignment?.dynamicFormTemplateId?.trim() ?? "";

  React.useEffect(() => {
    if (!open) return;
    setConditionJson(assignment?.autoApproveConditionJson ?? null);
  }, [assignment?.autoApproveConditionJson, open]);

  const dynamicFormQuery = useGetDynamicFormQuery(
    { id: dynamicFormTemplateId },
    { skip: !open || !dynamicFormTemplateId }
  );

  const dynamicForm = React.useMemo(
    () => (dynamicFormQuery.data ? buildEditorValue(dynamicFormQuery.data) : null),
    [dynamicFormQuery.data]
  );

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Cấu hình tự duyệt báo cáo</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {getAssignmentLabel(assignment) || "Công việc"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cấu hình này chỉ áp dụng cho các lần reporter nộp báo cáo sau khi lưu.
            </Typography>
          </Box>

          <Alert severity="info">
            Chỉ cấu hình điều kiện theo field Số, Chọn một hoặc Chọn nhiều; nếu không có field phù hợp thì bật tự duyệt sẽ không áp điều kiện.
          </Alert>

          {dynamicFormQuery.isLoading || dynamicFormQuery.isFetching ? (
            <Alert severity="info">Đang tải cấu trúc biểu mẫu...</Alert>
          ) : !dynamicForm ? (
            <Alert severity="warning">Chưa tải được cấu trúc biểu mẫu để cấu hình tự duyệt.</Alert>
          ) : (
            <AutoApproveConditionEditor
              fields={dynamicForm.fields}
              value={conditionJson}
              disabled={saving}
              onChange={setConditionJson}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Đóng
        </Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(conditionJson)}
          disabled={saving || !dynamicForm}
        >
          Lưu cấu hình
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(WorkAssignmentAutoApproveConditionDialog);
