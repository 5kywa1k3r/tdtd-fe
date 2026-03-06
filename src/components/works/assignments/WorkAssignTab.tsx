import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import {
  useCreateWorkAssignmentMutation,
  useDeleteWorkAssignmentMutation,
  useGetWorkAssignmentsByWorkQuery,
  useUpdateWorkAssignmentMutation,
} from "../../../api/workAssignmentApi";
import {
  emptyAssignmentDraft,
  toAssignmentDraft,
  toSaveReq,
  type AssignmentDraft,
} from "../../../types/workAssignment";
import { WorkAssignmentRowEditor } from "./WorkAssignmentRowEditor";
import { DynamicExcelPreviewDialog } from "./DynamicExcelPreviewDialog";

type Props = {
  workId: string;
  workStartDate: string | null;
  workEndDate: string | null;
};

function mergeDraftsFromServer(
  prev: AssignmentDraft[],
  nextFromServer: AssignmentDraft[]
): AssignmentDraft[] {
  const createDrafts = prev.filter((x) => x.mode === "create" && !x.id);

  const prevById = new Map(prev.filter((x) => x.id).map((x) => [x.id as string, x]));
  const mergedServer = nextFromServer.map((serverDraft) => {
    const local = serverDraft.id ? prevById.get(serverDraft.id) : undefined;

    if (!local) return serverDraft;

    // Nếu đang sửa dở và có thay đổi local thì giữ local
    if (local.mode === "edit" && local.isDirty) {
      return {
        ...local,
        // đồng bộ vài field từ server nếu muốn giữ metadata mới
        createdAtUtc: serverDraft.createdAtUtc,
        updatedAtUtc: serverDraft.updatedAtUtc,
        hasData: serverDraft.hasData,
        templateLocked: serverDraft.templateLocked,
      };
    }

    return serverDraft;
  });

  return [...createDrafts, ...mergedServer];
}

export const WorkAssignTab: React.FC<Props> = ({
  workId,
  workStartDate,
  workEndDate,
}) => {
  const { data, isFetching, error } = useGetWorkAssignmentsByWorkQuery({ workId });

  const [createWorkAssignment, createState] = useCreateWorkAssignmentMutation();
  const [updateWorkAssignment, updateState] = useUpdateWorkAssignmentMutation();
  const [deleteWorkAssignment, deleteState] = useDeleteWorkAssignmentMutation();

  const [drafts, setDrafts] = React.useState<AssignmentDraft[]>([]);
  const [previewDynamicExcelId, setPreviewDynamicExcelId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fromServer = (data ?? []).map(toAssignmentDraft);
    setDrafts((prev) => mergeDraftsFromServer(prev, fromServer));
  }, [data]);

  const busy =
    isFetching ||
    createState.isLoading ||
    updateState.isLoading ||
    deleteState.isLoading;

  const patchDraft = (
    localId: string,
    updater: (x: AssignmentDraft) => AssignmentDraft
  ) => {
    setDrafts((prev) => prev.map((x) => (x.localId === localId ? updater(x) : x)));
  };

  const addDraftRow = () => {
    setDrafts((prev) => [emptyAssignmentDraft(), ...prev]);
  };

  const saveDraft = async (draft: AssignmentDraft) => {
    const body = toSaveReq(draft);

    if (draft.id) {
      await updateWorkAssignment({
        id: draft.id,
        body,
        workId,
      }).unwrap();
    } else {
      await createWorkAssignment({
        workId,
        body,
      }).unwrap();
    }
  };

  const softDelete = async (draft: AssignmentDraft) => {
    if (draft.mode === "create" && !draft.id) {
      setDrafts((prev) => prev.filter((x) => x.localId !== draft.localId));
      return;
    }

    if (!draft.id) return;

    const ok = window.confirm("Xóa mềm assignment này?");
    if (!ok) return;

    await deleteWorkAssignment({ id: draft.id, workId }).unwrap();
  };

  return (
    <Box sx={{ height: "100%", minHeight: 0 }}>
      <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box />
          <Button variant="contained" startIcon={<AddIcon />} onClick={addDraftRow}>
            Thêm biểu mẫu
          </Button>
        </Stack>

        {error && (
          <Alert severity="error">
            Không tải được danh sách assignment.
          </Alert>
        )}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            pr: 0.5,
          }}
        >
          <Stack spacing={2}>
            {busy && drafts.length === 0 ? (
              <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
              </Box>
            ) : (
              drafts.map((draft) => (
                <WorkAssignmentRowEditor
                  key={draft.localId}
                  draft={draft}
                  disabled={busy}
                  workStartDate={workStartDate}
                  workEndDate={workEndDate}
                  onPreviewDynamicExcel={(id) => setPreviewDynamicExcelId(id)}
                  onChange={(next) => patchDraft(draft.localId, () => next)}
                  onSave={() => void saveDraft(draft)}
                  onDelete={() => void softDelete(draft)}
                  onEdit={() =>
                    patchDraft(draft.localId, (x) => ({
                      ...x,
                      mode: "edit",
                    }))
                  }
                  onView={() =>
                    patchDraft(draft.localId, (x) => ({
                      ...x,
                      mode: "view",
                      isDirty: false,
                    }))
                  }
                  onCancelCreate={() =>
                    setDrafts((prev) => prev.filter((x) => x.localId !== draft.localId))
                  }
                />
              ))
            )}

            {!busy && drafts.length === 0 && (
              <Alert severity="info">
                Chưa có assignment nào. Bấm <b>Thêm biểu mẫu giao</b> để tạo mới.
              </Alert>
            )}
          </Stack>
        </Box>
      </Stack>

      <DynamicExcelPreviewDialog
        open={!!previewDynamicExcelId}
        dynamicExcelId={previewDynamicExcelId}
        onClose={() => setPreviewDynamicExcelId(null)}
      />
    </Box>
  );
};