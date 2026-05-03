import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";

import {
  useActivateWorkAssignmentMutation,
  useCreateWorkAssignmentMutation,
  useDeactivateWorkAssignmentMutation,
  useGetMyParentCandidatesQuery,
  useGetWorkAssignmentByIdQuery,
  useGetWorkAssignmentsByWorkQuery,
} from "../../../api/workAssignmentApi";

import WorkAssignmentTable, { type AssignmentTableRow } from "./WorkAssignmentTable";
import WorkAssignmentCreateDialog, {
  defaultAssignmentCreateValue,
  type AssignmentCreateValue,
} from "./WorkAssignmentCreateDialog";
import WorkAssignmentEvaluationDialog from "./WorkAssignmentEvaluationDialog";

import type {
  WorkAssignmentListResponse,
  WorkAssignmentResponse,
} from "../../../types/workAssignment";
import { toAssignmentDraft } from "../../../types/workAssignment";
import DynamicExcelGridPreviewDialog from "../../excel/fortune/DynamicExcelGridPreviewDialog";
import WorkAssignmentFilterBar, {
  type WorkAssignmentFilterValue,
} from "./WorkAssignmentFilterBar";
import { normalizeVi } from "../../../helpers/normalize";

type Props = {
  workId: string;
  workStartDate: string | null;
  workEndDate: string | null;
  isWorkOwner?: boolean;
  onOpenAggregation?: (row: AssignmentTableRow) => void;
};

const defaultAssignmentFilterValue = (): WorkAssignmentFilterValue => ({
  q: "",
  assignmentType: "ALL",
  isActive: "ALL",
  progressStatus: "ALL",
});

function getAssignmentSearchText(row: AssignmentTableRow) {
  const template = [
    row.dynamicFormTemplateCode || row.dynamicExcelCode,
    row.dynamicFormTemplateName || row.dynamicExcelName,
  ].filter(Boolean).join(" ");
  const assignees = (row.assignees ?? [])
    .map((item) => item?.fullName?.trim() || item?.username?.trim() || item?.userName?.trim())
    .filter(Boolean)
    .join(" ");

  return [
    template,
    assignees,
    row.evaluationTemplateCode,
    row.evaluationTemplateLabel,
    row.worstEvaluationCode,
    row.worstEvaluationLabel,
  ]
    .filter(Boolean)
    .join(" ");
}

function toAssignmentRow(x: WorkAssignmentListResponse): AssignmentTableRow {
  return {
    id: String(x?.id ?? ""),
    dynamicExcelId: x?.dynamicExcelId ?? null,
    dynamicExcelCode: x?.dynamicExcelCode ?? null,
    dynamicExcelName: x?.dynamicExcelName ?? null,
    dynamicFormTemplateId: x?.dynamicFormTemplateId ?? null,
    dynamicFormTemplateCode: x?.dynamicFormTemplateCode ?? null,
    dynamicFormTemplateName: x?.dynamicFormTemplateName ?? null,
    assignmentType: x?.assignmentType ?? null,
    aggregationType: x?.aggregationType ?? null,
    assignees: x?.assignees ?? [],
    isActive: x?.isActive ?? true,
    createdAtUtc: x?.createdAtUtc ?? null,
    updatedAtUtc: x?.updatedAtUtc ?? null,
    progressStatus: x?.progressStatus ?? 0,
    progressStatusUpdatedAtUtc: x?.progressStatusUpdatedAtUtc ?? null,
    latestPeriodKey: x?.latestPeriodKey ?? null,
    latestDueAtUtc: x?.latestDueAtUtc ?? null,
    hasAnyDuePeriod: x?.hasAnyDuePeriod ?? false,
    hasOverduePeriod: x?.hasOverduePeriod ?? false,
    evaluationTemplateId: x?.evaluationTemplateId ?? null,
    evaluationTemplateCode: x?.evaluationTemplateCode ?? null,
    evaluationTemplateLabel: x?.evaluationTemplateLabel ?? null,
    evaluationCode: x?.evaluationCode ?? null,
    evaluationLabel: x?.evaluationLabel ?? null,
    evaluatedAssignmentCount: x?.evaluatedAssignmentCount ?? 0,
    worstEvaluationCode: x?.worstEvaluationCode ?? null,
    worstEvaluationLabel: x?.worstEvaluationLabel ?? null,
    dueAtUtc: x?.dueAtUtc ?? null,
  };
}

function toDetailDialogValue(x: WorkAssignmentResponse): AssignmentCreateValue {
  const draft = toAssignmentDraft(x);

  return {
    createMode: draft.createMode ?? "root",
    parentAssignmentId: draft.parentAssignmentId ?? null,

    dynamicExcelId: draft.dynamicExcelId ?? "",
    dynamicExcelCode: draft.dynamicExcelCode ?? "",
    dynamicExcelName: draft.dynamicExcelName ?? "",
    dynamicFormTemplateId: draft.dynamicFormTemplateId ?? "",
    dynamicFormTemplateCode: draft.dynamicFormTemplateCode ?? "",
    dynamicFormTemplateName: draft.dynamicFormTemplateName ?? "",

    assignmentType: draft.assignmentType,
    aggregationType: draft.aggregationType,
    schedule: draft.schedule ?? null,
    dueAtUtc: draft.dueAtUtc ?? null,

    assigneeUnitIds: Array.isArray((x as any)?.assignees)
      ? Array.from(
          new Set((x as any).assignees.map((item: any) => item?.unitId).filter(Boolean))
        )
      : [],
    leaderWatcherUserIds: draft.leaderWatcherUserIds ?? [],

    description: draft.description ?? "",
    isActive: draft.isActive,
    allowUserCreatedReports: draft.allowUserCreatedReports ?? true,
  };
}

const WorkAssignTab: React.FC<Props> = ({
  workId,
  workStartDate,
  workEndDate,
  isWorkOwner = false,
  onOpenAggregation,
}) => {
  const { data, isFetching, error, refetch } = useGetWorkAssignmentsByWorkQuery(
    { workId },
    { skip: !workId }
  );

  const [createWorkAssignment, createState] = useCreateWorkAssignmentMutation();
  const [deactivateWorkAssignment, deactivateState] = useDeactivateWorkAssignmentMutation();
  const [activateWorkAssignment, activateState] = useActivateWorkAssignmentMutation();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createValue, setCreateValue] = React.useState<AssignmentCreateValue>(
    defaultAssignmentCreateValue()
  );

  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [evaluateTarget, setEvaluateTarget] = React.useState<AssignmentTableRow | null>(null);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "" });
  const [previewDynamicExcelId, setPreviewDynamicExcelId] = React.useState<string | null>(null);
  const [filterValue, setFilterValue] = React.useState<WorkAssignmentFilterValue>(
    defaultAssignmentFilterValue()
  );

  const rows = React.useMemo(
    () => ((data ?? []) as WorkAssignmentListResponse[]).map(toAssignmentRow),
    [data]
  );

  const filteredRows = React.useMemo(() => {
    const keyword = normalizeVi(filterValue.q || "");

    return rows.filter((row) => {
      if (keyword) {
        const haystack = normalizeVi(getAssignmentSearchText(row));
        if (!haystack.includes(keyword)) return false;
      }

      if (
        filterValue.assignmentType !== "ALL" &&
        row.assignmentType !== filterValue.assignmentType
      ) {
        return false;
      }

      if (filterValue.isActive === "ACTIVE" && !row.isActive) return false;
      if (filterValue.isActive === "INACTIVE" && row.isActive) return false;

      if (filterValue.progressStatus === "NOT_STARTED" && row.progressStatus !== 0) return false;
      if (filterValue.progressStatus === "IN_PROGRESS" && row.progressStatus !== 1) return false;
      if (filterValue.progressStatus === "COMPLETED" && row.progressStatus !== 2) return false;
      if (filterValue.progressStatus === "AT_RISK" && row.progressStatus !== 3) return false;
      if (filterValue.progressStatus === "OVERDUE" && row.progressStatus !== 4) return false;

      return true;
    });
  }, [filterValue, rows]);

  const { data: parentCandidatesData, isFetching: parentCandidatesLoading } =
    useGetMyParentCandidatesQuery({ workId }, { skip: !workId || (!createOpen && !detailId) });

  const parentCandidates = React.useMemo(
    () =>
      ((parentCandidatesData ?? []) as WorkAssignmentListResponse[]).map((x) => ({
        id: String(x?.id ?? ""),
        dynamicFormTemplateCode: x?.dynamicFormTemplateCode ?? null,
        dynamicFormTemplateName: x?.dynamicFormTemplateName ?? null,
        dynamicExcelCode: x?.dynamicExcelCode ?? null,
        dynamicExcelName: x?.dynamicExcelName ?? null,
      })),
    [parentCandidatesData]
  );

  const { data: detailData, isFetching: detailLoading } = useGetWorkAssignmentByIdQuery(
    { id: detailId ?? "" },
    { skip: !detailId }
  );

  const detailValue = React.useMemo(
    () =>
      detailData
        ? toDetailDialogValue(detailData as WorkAssignmentResponse)
        : defaultAssignmentCreateValue(),
    [detailData]
  );

  const busy =
    isFetching ||
    createState.isLoading ||
    deactivateState.isLoading ||
    activateState.isLoading;

  const showMessage = React.useCallback((message: string) => {
    setSnackbar({ open: true, message });
  }, []);

  const openCreateRoot = React.useCallback(() => {
    setCreateValue({
      ...defaultAssignmentCreateValue(),
      createMode: isWorkOwner ? "root" : "child",
      parentAssignmentId: null,
    });
    setCreateOpen(true);
  }, [isWorkOwner]);

  const handleSubmitCreate = async () => {
    const mustChooseParent = !isWorkOwner || createValue.createMode === "child";

    if (!createValue.dynamicFormTemplateId) {
      showMessage("Bắt buộc chọn Dynamic Form.");
      return;
    }

    if ((createValue.assigneeUnitIds ?? []).length === 0) {
      showMessage("Bắt buộc chọn ít nhất 1 đơn vị được giao.");
      return;
    }

    if (mustChooseParent && !createValue.parentAssignmentId) {
      showMessage("Bắt buộc chọn công việc hợp lệ.");
      return;
    }

    if (createValue.assignmentType === "ONCE" && !createValue.dueAtUtc) {
      showMessage("Công việc giao một lần bắt buộc phải có hạn nộp.");
      return;
    }

    if (createValue.assignmentType === "PERIODIC_REPORT" && !createValue.schedule) {
      showMessage("Công việc giao định kỳ bắt buộc phải có cấu hình lịch.");
      return;
    }

    try {
      await createWorkAssignment({
        workId,
        body: {
          parentAssignmentId:
            createValue.createMode === "root" && isWorkOwner
              ? null
              : createValue.parentAssignmentId,
          dynamicFormTemplateId: createValue.dynamicFormTemplateId,
          assignmentType: createValue.assignmentType,
          aggregationType: createValue.aggregationType,
          assigneeUserIds: [],
          assigneeUnitIds: createValue.assigneeUnitIds,
          leaderWatcherUserIds: createValue.leaderWatcherUserIds,
          description: createValue.description?.trim() || null,
          isActive: createValue.isActive,
          allowUserCreatedReports: createValue.allowUserCreatedReports,
          dueAtUtc: createValue.assignmentType === "ONCE" ? createValue.dueAtUtc ?? null : null,
          schedule:
            createValue.assignmentType === "PERIODIC_REPORT" ? createValue.schedule : null,
        },
      }).unwrap();

      setCreateOpen(false);
      setCreateValue(defaultAssignmentCreateValue());
      showMessage("Đã giao việc.");
      await refetch();
    } catch (err: any) {
      showMessage(err?.data?.message || err?.message || "Giao việc thất bại.");
    }
  };

  const handleToggleActive = async (row: AssignmentTableRow) => {
    try {
      if (row.isActive) {
        await deactivateWorkAssignment({ id: row.id, workId }).unwrap();
        showMessage("Đã ngừng hiệu lực assignment.");
      } else {
        await activateWorkAssignment({ id: row.id, workId }).unwrap();
        showMessage("Đã kích hoạt lại assignment.");
      }

      await refetch();
    } catch (err: any) {
      showMessage(
        err?.data?.message || err?.message || "Cập nhật trạng thái assignment thất bại."
      );
    }
  };

  const handleOpenAggregate = React.useCallback(
    (row: AssignmentTableRow) => {
      if (!row.dynamicFormTemplateId && !row.dynamicExcelId) {
        showMessage("Assignment chưa có biểu mẫu để tổng hợp.");
        return;
      }

      onOpenAggregation?.(row);
    },
    [onOpenAggregation, showMessage]
  );

  const handleOpenEvaluate = React.useCallback(
    (row: AssignmentTableRow) => {
      if (!row.evaluationTemplateId) {
        showMessage("Assignment chưa được gắn bộ tiêu chí đánh giá.");
        return;
      }

      setEvaluateTarget(row);
    },
    [showMessage]
  );

  return (
    <Box sx={{ height: "100%", minHeight: 0 }}>
      <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void refetch()}>
            Làm mới
          </Button>

          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateRoot}>
            Giao việc
          </Button>
        </Stack>

        <WorkAssignmentFilterBar
          value={filterValue}
          onChange={setFilterValue}
          onReset={() => setFilterValue(defaultAssignmentFilterValue())}
          onReload={() => void refetch()}
          loading={busy}
        />

        {error && <Alert severity="error">Không tải được danh sách assignment.</Alert>}

        <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {busy && rows.length === 0 ? (
            <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : rows.length === 0 ? (
            <Alert severity="info">
              Chưa có công việc đã giao nào. Bấm <b>Giao việc</b> để tạo mới.
            </Alert>
          ) : filteredRows.length === 0 ? (
            <Alert severity="info">Không có assignment phù hợp với bộ lọc hiện tại.</Alert>
          ) : (
            <WorkAssignmentTable
              rows={filteredRows}
              onViewDetail={(row) => setDetailId(row.id)}
              onEvaluate={handleOpenEvaluate}
              onOpenAggregate={handleOpenAggregate}
              onToggleActive={handleToggleActive}
            />
          )}
        </Box>
      </Stack>

      <WorkAssignmentCreateDialog
        open={createOpen}
        value={createValue}
        onChange={setCreateValue}
        onClose={() => {
          if (createState.isLoading) return;
          setCreateOpen(false);
          setCreateValue(defaultAssignmentCreateValue());
        }}
        onSubmit={handleSubmitCreate}
        onPreviewDynamicExcel={(id) => {
          const active = document.activeElement as HTMLElement | null;
          active?.blur();
          setPreviewDynamicExcelId(id);
        }}
        parentCandidates={parentCandidates}
        parentCandidatesLoading={parentCandidatesLoading}
        isWorkOwner={isWorkOwner}
        disabled={createState.isLoading}
        workStartDate={workStartDate}
        workEndDate={workEndDate}
        mode="create"
        title="Giao việc"
        submitLabel="Tạo mới"
      />

      <WorkAssignmentCreateDialog
        open={!!detailId}
        value={detailValue}
        onChange={() => undefined}
        onClose={() => setDetailId(null)}
        onPreviewDynamicExcel={(id) => {
          setDetailId(null);
          setTimeout(() => setPreviewDynamicExcelId(id), 0);
        }}
        parentCandidates={parentCandidates}
        parentCandidatesLoading={parentCandidatesLoading}
        isWorkOwner={isWorkOwner}
        disabled={detailLoading}
        workStartDate={workStartDate}
        workEndDate={workEndDate}
        mode="view"
        title="Chi tiết assignment"
        hideSubmit
        viewAssigneeDisplay={
          Array.isArray((detailData as any)?.assignees) && (detailData as any).assignees.length > 0
            ? Array.from(
                new Set(
                  (detailData as any).assignees
                    .map((x: any) => x?.unitShortName || x?.unitName || x?.unitId)
                    .filter(Boolean)
                )
              ).join(", ")
            : "-"
        }
        viewLeaderWatcherDisplay={
          Array.isArray((detailData as any)?.leaderWatchers) &&
          (detailData as any).leaderWatchers.length > 0
            ? (detailData as any).leaderWatchers
                .map((x: any) => x?.fullName || x?.username || x?.userId)
                .filter(Boolean)
                .join(", ")
            : Array.isArray(detailValue.leaderWatcherUserIds) &&
                detailValue.leaderWatcherUserIds.length > 0
              ? detailValue.leaderWatcherUserIds.join(", ")
              : "-"
        }
      />

      <WorkAssignmentEvaluationDialog
        open={!!evaluateTarget}
        assignmentId={evaluateTarget?.id ?? ""}
        assignmentLabel={
          evaluateTarget
            ? [
                evaluateTarget.dynamicFormTemplateCode || evaluateTarget.dynamicExcelCode,
                evaluateTarget.dynamicFormTemplateName || evaluateTarget.dynamicExcelName,
              ]
                .filter(Boolean)
                .join(" - ")
            : ""
        }
        evaluationTemplateId={evaluateTarget?.evaluationTemplateId ?? null}
        currentEvaluationCode={evaluateTarget?.evaluationCode ?? null}
        currentEvaluationLabel={evaluateTarget?.evaluationLabel ?? null}
        onClose={() => setEvaluateTarget(null)}
        onSaved={async (message) => {
          setEvaluateTarget(null);
          showMessage(message || "Đã lưu đánh giá assignment.");
          await refetch();
        }}
        onError={showMessage}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
      />

      <DynamicExcelGridPreviewDialog
        open={!!previewDynamicExcelId}
        dynamicExcelId={previewDynamicExcelId}
        onClose={() => setPreviewDynamicExcelId(null)}
      />
    </Box>
  );
};

export default WorkAssignTab;
