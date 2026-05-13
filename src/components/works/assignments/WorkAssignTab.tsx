import React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import HistoryIcon from "@mui/icons-material/History";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

import { AppTable, type AppTableColumn } from "../../common/AppTable";
import CommonDateText from "../../common/CommonDateText";
import { ConfirmDialog } from "../../common/ConfirmDialog";
import { LazyUnitAccountSelect } from "../../common/LazyUnitAccountSelect";
import { useGetDynamicFormQuery } from "../../../api/dynamicFormApi";
import {
  useActivateWorkAssignmentMutation,
  useCreateWorkAssignmentMutation,
  useDeactivateWorkAssignmentMutation,
  useGetChildrenAssignmentsQuery,
  useGetMyParentCandidatesQuery,
  useGetWorkAssignmentByIdQuery,
  useGetWorkAssignmentsByWorkQuery,
  useHandoverWorkAssignmentMutation,
  useSearchWorkAssignmentHandoverHistoryMutation,
  useUpdateWorkAssignmentDataSourceRulesMutation,
  type WorkAssignmentHandoverHistoryRow,
} from "../../../api/workAssignmentApi";
import DynamicFormPreview from "../../../features/dynamicForms/components/DynamicFormPreview";

import WorkAssignmentTable, { type AssignmentTableRow } from "./WorkAssignmentTable";
import WorkAssignmentCreateDialog, {
  defaultAssignmentCreateValue,
  type AssignmentCreateValue,
} from "./WorkAssignmentCreateDialog";
import WorkAssignmentEvaluationDialog from "./WorkAssignmentEvaluationDialog";
import WorkAssignmentNotificationTab from "./WorkAssignmentNotificationTab";
import WorkAssignmentSourceRulesDialog from "./WorkAssignmentSourceRulesDialog";
import WorkTaskActionCenterPage from "../../../pages/works/actions/WorkTaskActionCenterPage";

import type { WorkAssignmentListResponse, WorkAssignmentResponse } from "../../../types/workAssignment";
import { toAssignmentDraft } from "../../../types/workAssignment";
import WorkAssignmentFilterBar, {
  type WorkAssignmentFilterValue,
} from "./WorkAssignmentFilterBar";
import { normalizeVi } from "../../../helpers/normalize";
import { UITextKey, uiText } from "../../../constants/uiText";

type Props = {
  workId: string;
  workStartDate: string | null;
  workEndDate: string | null;
  isWorkOwner?: boolean;
  onOpenAggregation?: (row: AssignmentTableRow) => void;
  onOpenReports?: () => void;
  onOpenReview?: () => void;
};

type AssignSection = "LIST" | "ACTIONS" | "NOTIFICATIONS" | "HANDOVER";
const ENABLE_DIRECT_HANDOVER_SECTION = false;

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

function getAssignmentLabel(row?: AssignmentTableRow | null) {
  if (!row) return "";
  const code = row.dynamicFormTemplateCode?.trim() || row.dynamicExcelCode?.trim();
  const name = row.dynamicFormTemplateName?.trim() || row.dynamicExcelName?.trim();
  const label = [code, name].filter(Boolean).join(" - ");
  return label || row.id;
}

function getAssigneeLabel(item?: {
  userId?: string | null;
  username?: string | null;
  userName?: string | null;
  fullName?: string | null;
  unitShortName?: string | null;
  unitName?: string | null;
  unitSymbol?: string | null;
} | null) {
  if (!item) return "";
  const name = item.fullName?.trim() || item.username?.trim() || item.userName?.trim();
  const unit = item.unitShortName?.trim() || item.unitName?.trim() || item.unitSymbol?.trim();
  return [name || item.userId, unit].filter(Boolean).join(" - ");
}

function getUserRefLabel(item?: {
  userId?: string | null;
  username?: string | null;
  fullName?: string | null;
  unitShortName?: string | null;
  unitName?: string | null;
  unitSymbol?: string | null;
} | null) {
  if (!item) return "-";
  const name = item.fullName?.trim() || item.username?.trim() || item.userId?.trim();
  const unit = item.unitShortName?.trim() || item.unitName?.trim() || item.unitSymbol?.trim();
  return [name, unit].filter(Boolean).join(" - ") || "-";
}

function getHandoverResultLabel(result?: string | null): string {
  const normalized = (result || "SUCCESS").toUpperCase();
  if (normalized === "SUCCESS") return "Thành công";
  if (normalized === "FAILED") return "Thất bại";
  return result || "-";
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
    dynamicFormDataSourceRulesJson: x?.dynamicFormDataSourceRulesJson ?? null,
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
    dynamicFormDataSourceRulesJson: draft.dynamicFormDataSourceRulesJson ?? null,

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
  onOpenReports,
  onOpenReview,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isFetching, error, refetch } = useGetWorkAssignmentsByWorkQuery(
    { workId },
    { skip: !workId }
  );

  const [createWorkAssignment, createState] = useCreateWorkAssignmentMutation();
  const [deactivateWorkAssignment, deactivateState] = useDeactivateWorkAssignmentMutation();
  const [activateWorkAssignment, activateState] = useActivateWorkAssignmentMutation();
  const [handoverWorkAssignment, handoverState] = useHandoverWorkAssignmentMutation();
  const [searchHistory, historyState] = useSearchWorkAssignmentHandoverHistoryMutation();
  const [updateDataSourceRules, updateDataSourceRulesState] =
    useUpdateWorkAssignmentDataSourceRulesMutation();

  const querySection = React.useMemo<AssignSection>(() => {
    const rawTab = (searchParams.get("tab") || "").trim().toUpperCase();
    const rawSection = (searchParams.get("section") || "").trim().toUpperCase();
    if (rawTab === "ACTIONS" || rawSection === "ACTIONS") return "ACTIONS";
    if (rawTab === "NOTIFICATIONS" || rawSection === "NOTIFICATIONS") return "NOTIFICATIONS";
    return "LIST";
  }, [searchParams]);
  const queryAssignmentId = React.useMemo(
    () => (searchParams.get("assignmentId") || "").trim(),
    [searchParams]
  );

  const [section, setSection] = React.useState<AssignSection>(querySection);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createValue, setCreateValue] = React.useState<AssignmentCreateValue>(
    defaultAssignmentCreateValue()
  );

  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [sourceRulesTargetId, setSourceRulesTargetId] = React.useState<string | null>(null);
  const [evaluateTarget, setEvaluateTarget] = React.useState<AssignmentTableRow | null>(null);
  const [previewDynamicFormId, setPreviewDynamicFormId] = React.useState<string | null>(null);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "" });
  const [filterValue, setFilterValue] = React.useState<WorkAssignmentFilterValue>(
    defaultAssignmentFilterValue()
  );

  const [handoverAssignmentId, setHandoverAssignmentId] = React.useState("");
  const [fromAssigneeUserId, setFromAssigneeUserId] = React.useState("");
  const [toAssigneeUserIds, setToAssigneeUserIds] = React.useState<string[]>([]);
  const [handoverReason, setHandoverReason] = React.useState("");
  const [handoverComment, setHandoverComment] = React.useState("");
  const [confirmHandoverOpen, setConfirmHandoverOpen] = React.useState(false);
  const [historyPage, setHistoryPage] = React.useState(0);
  const [historyPageSize, setHistoryPageSize] = React.useState(10);

  const rows = React.useMemo(
    () => ((data ?? []) as WorkAssignmentListResponse[]).map(toAssignmentRow),
    [data]
  );

  React.useEffect(() => {
    if (handoverAssignmentId && rows.some((row) => row.id === handoverAssignmentId)) return;
    setHandoverAssignmentId(rows[0]?.id ?? "");
  }, [handoverAssignmentId, rows]);

  React.useEffect(() => {
    setSection(querySection);
  }, [querySection]);

  const handleSetSection = React.useCallback(
    (next: AssignSection) => {
      setSection(next);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", "ASSIGN");
      if (next === "ACTIONS") {
        nextParams.set("section", "ACTIONS");
      } else if (next === "NOTIFICATIONS") {
        nextParams.set("section", "NOTIFICATIONS");
      } else {
        nextParams.delete("section");
      }
      if (next !== "LIST") {
        nextParams.delete("assignmentId");
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const openAssignmentDetail = React.useCallback(
    (assignmentId: string) => {
      if (!assignmentId) return;
      setDetailId(assignmentId);
      setSection("LIST");
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", "ASSIGN");
      nextParams.delete("section");
      nextParams.set("assignmentId", assignmentId);
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const closeAssignmentDetail = React.useCallback(() => {
    setDetailId(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("assignmentId");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const clearAssignmentFocus = React.useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("assignmentId");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  React.useEffect(() => {
    if (section !== "LIST" || !queryAssignmentId) return;
    if (detailId === queryAssignmentId) return;
    setDetailId(queryAssignmentId);
  }, [detailId, queryAssignmentId, section]);

  const selectedHandoverAssignment = React.useMemo(
    () => rows.find((row) => row.id === handoverAssignmentId) ?? null,
    [handoverAssignmentId, rows]
  );

  React.useEffect(() => {
    const assignees = selectedHandoverAssignment?.assignees ?? [];
    if (fromAssigneeUserId && assignees.some((x) => x.userId === fromAssigneeUserId)) return;
    setFromAssigneeUserId(assignees.find((x) => Boolean(x.userId))?.userId ?? "");
  }, [fromAssigneeUserId, selectedHandoverAssignment]);

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

  const { data: sourceRulesAssignmentData, isFetching: sourceRulesAssignmentLoading } =
    useGetWorkAssignmentByIdQuery(
      { id: sourceRulesTargetId ?? "" },
      { skip: !sourceRulesTargetId }
    );

  const { data: sourceRulesChildrenData, isFetching: sourceRulesChildrenLoading } =
    useGetChildrenAssignmentsQuery(
      { parentAssignmentId: sourceRulesTargetId ?? "" },
      { skip: !sourceRulesTargetId }
    );

  const previewDynamicFormQuery = useGetDynamicFormQuery(
    { id: previewDynamicFormId ?? "" },
    { skip: !previewDynamicFormId }
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
    activateState.isLoading ||
    handoverState.isLoading ||
    updateDataSourceRulesState.isLoading;

  const runHistorySearch = React.useCallback(
    (page = historyPage, pageSize = historyPageSize) => {
      if (!workId || section !== "HANDOVER") return;
      void searchHistory({
        workId,
        body: {
          workAssignmentId: handoverAssignmentId || null,
          page,
          pageSize,
        },
      });
    },
    [handoverAssignmentId, historyPage, historyPageSize, searchHistory, section, workId]
  );

  React.useEffect(() => {
    if (section !== "HANDOVER") return;
    runHistorySearch(0, historyPageSize);
    setHistoryPage(0);
  }, [historyPageSize, runHistorySearch, section, handoverAssignmentId]);

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
      showMessage("Bắt buộc chọn biểu mẫu động.");
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
          dynamicFormDataSourceRulesJson: createValue.dynamicFormDataSourceRulesJson ?? null,
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
        showMessage("Đã ngừng hiệu lực công việc.");
      } else {
        await activateWorkAssignment({ id: row.id, workId }).unwrap();
        showMessage("Đã kích hoạt lại công việc.");
      }

      await refetch();
    } catch (err: any) {
      showMessage(
        err?.data?.message || err?.message || "Cập nhật trạng thái công việc thất bại."
      );
    }
  };

  const handleOpenAggregate = React.useCallback(
    (row: AssignmentTableRow) => {
      if (!row.dynamicFormTemplateId) {
        showMessage("Công việc chưa có biểu mẫu để tổng hợp.");
        return;
      }

      onOpenAggregation?.(row);
    },
    [onOpenAggregation, showMessage]
  );

  const handleOpenSourceRules = React.useCallback(
    (row: AssignmentTableRow) => {
      if (!row.dynamicFormTemplateId) {
        showMessage("Công việc chưa có biểu mẫu động để cấu hình nguồn dữ liệu.");
        return;
      }

      setSourceRulesTargetId(row.id);
    },
    [showMessage]
  );

  const handleSaveSourceRules = React.useCallback(
    async (dynamicFormDataSourceRulesJson: string | null) => {
      if (!sourceRulesTargetId) return;

      try {
        await updateDataSourceRules({
          id: sourceRulesTargetId,
          workId,
          body: { dynamicFormDataSourceRulesJson },
        }).unwrap();

        setSourceRulesTargetId(null);
        showMessage("Đã lưu cấu hình nguồn dữ liệu.");
        await refetch();
      } catch (err: any) {
        showMessage(
          err?.data?.message || err?.message || "Lưu cấu hình nguồn dữ liệu thất bại."
        );
      }
    },
    [refetch, showMessage, sourceRulesTargetId, updateDataSourceRules, workId]
  );

  const handleOpenEvaluate = React.useCallback(
    (row: AssignmentTableRow) => {
      if (!row.evaluationTemplateId) {
        showMessage("Công việc chưa được gắn bộ tiêu chí đánh giá.");
        return;
      }

      setEvaluateTarget(row);
    },
    [showMessage]
  );

  const handleRequestHandover = React.useCallback(() => {
    if (!selectedHandoverAssignment) {
      showMessage("Chưa chọn công việc để bàn giao.");
      return;
    }
    if (!fromAssigneeUserId) {
      showMessage("Chưa chọn người đang phụ trách.");
      return;
    }
    if (!toAssigneeUserIds[0]) {
      showMessage("Chưa chọn tài khoản nhận bàn giao.");
      return;
    }
    if (fromAssigneeUserId === toAssigneeUserIds[0]) {
      showMessage("Người nhận bàn giao phải khác người đang phụ trách.");
      return;
    }

    setConfirmHandoverOpen(true);
  }, [fromAssigneeUserId, selectedHandoverAssignment, showMessage, toAssigneeUserIds]);

  const handleConfirmHandover = async () => {
    if (!selectedHandoverAssignment || !fromAssigneeUserId || !toAssigneeUserIds[0]) return;

    try {
      const rs = await handoverWorkAssignment({
        id: selectedHandoverAssignment.id,
        workId,
        body: {
          fromAssigneeUserId,
          toAssigneeUserId: toAssigneeUserIds[0],
          reason: handoverReason.trim() || null,
          comment: handoverComment.trim() || null,
        },
      }).unwrap();

      setConfirmHandoverOpen(false);
      setHandoverReason("");
      setHandoverComment("");
      setToAssigneeUserIds([]);
      showMessage(
        `Đã bàn giao. Cập nhật ${rs.periodCount} kỳ, ${rs.reportCount} báo cáo, ${rs.queueItemCount} tác vụ chờ.`
      );
      await refetch();
      runHistorySearch(0, historyPageSize);
      setHistoryPage(0);
    } catch (err: any) {
      showMessage(err?.data?.message || err?.message || "Bàn giao thất bại.");
    }
  };

  const historyRows = historyState.data?.rows ?? [];
  const historyTotal = historyState.data?.totalRows ?? 0;

  const historyColumns = React.useMemo<AppTableColumn<WorkAssignmentHandoverHistoryRow>[]>(
    () => [
      {
        field: "createdAtUtc",
        header: "Thời gian",
        width: 150,
        render: (row) => <CommonDateText value={row.createdAtUtc} />,
      },
      {
        field: "assignmentCode",
        header: "Công việc",
        width: 150,
        render: (row) => <Typography variant="body2">{row.assignmentCode || "-"}</Typography>,
      },
      {
        field: "template",
        header: "Biểu mẫu",
        width: "22%",
        render: (row) => (
          <Typography variant="body2" noWrap title={row.dynamicFormTemplateName ?? ""}>
            {[row.dynamicFormTemplateCode, row.dynamicFormTemplateName].filter(Boolean).join(" - ") || "-"}
          </Typography>
        ),
      },
      {
        field: "fromAssignee",
        header: "Từ",
        width: "18%",
        render: (row) => <Typography variant="body2">{getUserRefLabel(row.fromAssignee)}</Typography>,
      },
      {
        field: "toAssignee",
        header: "Sang",
        width: "18%",
        render: (row) => <Typography variant="body2">{getUserRefLabel(row.toAssignee)}</Typography>,
      },
      {
        field: "counts",
        header: "Ảnh hưởng",
        width: 150,
        render: (row) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            <Chip size="small" label={`${row.periodCount} kỳ`} />
            <Chip size="small" label={`${row.reportCount} báo cáo`} />
            <Chip size="small" label={`${row.queueItemCount} tác vụ chờ`} />
          </Stack>
        ),
      },
      {
        field: "result",
        header: "Kết quả",
        width: 110,
        render: (row) => (
          <Chip
            size="small"
            label={getHandoverResultLabel(row.result)}
            color={(row.result || "").toUpperCase() === "SUCCESS" ? "success" : "default"}
            variant="outlined"
          />
        ),
      },
    ],
    []
  );

  return (
    <Box sx={{ height: "100%", minHeight: 0 }}>
      <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
        <Tabs
          value={section === "HANDOVER" && !ENABLE_DIRECT_HANDOVER_SECTION ? "LIST" : section}
          onChange={(_, value) => handleSetSection(value as AssignSection)}
          sx={{
            borderBottom: "1px solid #e2e8f0",
            flexShrink: 0,
            minHeight: 44,
            "& .MuiTab-root": {
              minHeight: 44,
              fontWeight: 800,
              textTransform: "none",
              color: "#64748b",
              letterSpacing: 0,
            },
            "& .Mui-selected": { color: "#0f5bd8" },
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: 3,
              bgcolor: "#0f5bd8",
            },
          }}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab
            icon={<AssignmentOutlinedIcon />}
            iconPosition="start"
            value="LIST"
            label="Danh sách giao việc"
          />
          <Tab
            icon={<FactCheckOutlinedIcon />}
            iconPosition="start"
            value="ACTIONS"
            label="Công việc cần thực hiện"
          />
          <Tab
            icon={<NotificationsActiveOutlinedIcon />}
            iconPosition="start"
            value="NOTIFICATIONS"
            label="Thông báo"
          />
          {ENABLE_DIRECT_HANDOVER_SECTION && (
            <Tab icon={<SwapHorizIcon />} iconPosition="start" value="HANDOVER" label="Bàn giao" />
          )}
        </Tabs>

        {section === "LIST" ? (
          <>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", md: "center" }}
              spacing={1.25}
              sx={{ flexShrink: 0 }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: "8px",
                    display: "grid",
                    placeItems: "center",
                    color: "#0f5bd8",
                    bgcolor: alpha("#2563eb", 0.1),
                    flexShrink: 0,
                  }}
                >
                  <AssignmentOutlinedIcon fontSize="small" />
                </Box>
                <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 850, color: "#0f172a" }}>
                    Danh sách giao việc
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: { xs: "normal", md: "nowrap" },
                    }}
                  >
                    Quản lý người được giao, biểu mẫu báo cáo, kỳ hạn và tiến độ thực hiện.
                  </Typography>
                </Stack>
              </Stack>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateRoot}
                sx={{ borderRadius: "8px", minWidth: 120, boxShadow: "0 8px 18px rgba(37,99,235,0.22)" }}
              >
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

            {error && <Alert severity="error">{uiText(UITextKey.TextKhongTaiDuocDanhSachAssignment)}</Alert>}

            <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              {busy && rows.length === 0 ? (
                <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
                  <CircularProgress />
                </Box>
              ) : rows.length === 0 ? (
                <Box
                  sx={{
                    py: { xs: 5, md: 7 },
                    px: 2,
                    minHeight: 260,
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%)",
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                  }}
                >
                  <Stack spacing={1.25} alignItems="center">
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: "8px",
                        display: "grid",
                        placeItems: "center",
                        color: "#0f5bd8",
                        bgcolor: alpha("#2563eb", 0.1),
                      }}
                    >
                      <AssignmentOutlinedIcon sx={{ fontSize: 34 }} />
                    </Box>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 850, color: "#0f172a" }}>
                        Chưa có công việc đã giao nào.
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Bấm Giao việc để tạo mới nhiệm vụ/chỉ tiêu.
                      </Typography>
                    </Stack>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={openCreateRoot}
                      sx={{ mt: 0.5, borderRadius: "8px", bgcolor: "#fff" }}
                    >
                      Giao việc ngay
                    </Button>
                  </Stack>
                </Box>
              ) : filteredRows.length === 0 ? (
                <Alert severity="info">{uiText(UITextKey.TextKhongCoAssignmentPhuHopVoiBoLocHien)}</Alert>
              ) : (
                <WorkAssignmentTable
                  rows={filteredRows}
                  onViewDetail={(row) => openAssignmentDetail(row.id)}
                  onPreviewTemplate={(row) => {
                    if (!row.dynamicFormTemplateId) {
                      showMessage("Công việc chưa có biểu mẫu động để xem trước.");
                      return;
                    }
                    setPreviewDynamicFormId(row.dynamicFormTemplateId);
                  }}
                  onEvaluate={handleOpenEvaluate}
                  onOpenAggregate={handleOpenAggregate}
                  onConfigureSourceRules={handleOpenSourceRules}
                  onToggleActive={handleToggleActive}
                />
              )}
            </Box>
          </>
        ) : section === "ACTIONS" ? (
          <WorkTaskActionCenterPage
            workId={workId}
            onOpenAssignments={() => handleSetSection("LIST")}
            onOpenReports={onOpenReports ?? (() => undefined)}
            onOpenReview={onOpenReview ?? (() => undefined)}
          />
        ) : section === "NOTIFICATIONS" ? (
          <WorkAssignmentNotificationTab
            workId={workId}
            focusedAssignmentId={queryAssignmentId || null}
            onClearAssignmentFocus={clearAssignmentFocus}
            onOpenAssignment={openAssignmentDetail}
            onOpenActions={() => handleSetSection("ACTIONS")}
            onOpenReports={onOpenReports ?? (() => undefined)}
            onOpenReview={onOpenReview ?? (() => undefined)}
          />
        ) : ENABLE_DIRECT_HANDOVER_SECTION ? (
          <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, flexShrink: 0 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                    <Stack spacing={0.25}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        Bàn giao công việc
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Chuyển người phụ trách, báo cáo, kỳ báo cáo và tác vụ đang chờ sang tài khoản mới.
                      </Typography>
                    </Stack>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={() => {
                        void refetch();
                        runHistorySearch(historyPage, historyPageSize);
                      }}
                    >
                      Làm mới
                    </Button>
                  </Stack>

                  <Divider />

                  {rows.length === 0 ? (
                    <Alert severity="info">Chưa có công việc để bàn giao.</Alert>
                  ) : (
                    <Stack spacing={2}>
                      <TextField
                        select
                        size="small"
                        label="Công việc"
                        value={handoverAssignmentId}
                        onChange={(e) => {
                          setHandoverAssignmentId(e.target.value);
                          setToAssigneeUserIds([]);
                        }}
                        fullWidth
                      >
                        {rows.map((row) => (
                          <MenuItem key={row.id} value={row.id}>
                            {getAssignmentLabel(row)}
                          </MenuItem>
                        ))}
                      </TextField>

                      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                        <TextField
                          select
                          size="small"
                          label="Người đang phụ trách"
                          value={fromAssigneeUserId}
                          onChange={(e) => setFromAssigneeUserId(e.target.value)}
                          fullWidth
                        >
                          {(selectedHandoverAssignment?.assignees ?? [])
                            .filter((item) => Boolean(item.userId))
                            .map((item) => (
                            <MenuItem key={item.userId} value={item.userId ?? ""}>
                              {getAssigneeLabel(item)}
                            </MenuItem>
                          ))}
                        </TextField>

                        <LazyUnitAccountSelect
                          mode="single"
                          label="Tài khoản nhận bàn giao"
                          value={toAssigneeUserIds}
                          onChange={setToAssigneeUserIds}
                          accountTypeFilter="ALL"
                          autoPickManagerUnit={false}
                        />
                      </Stack>

                      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                        <TextField
                          size="small"
                          label="Lý do"
                          value={handoverReason}
                          onChange={(e) => setHandoverReason(e.target.value)}
                          fullWidth
                        />
                        <TextField
                          size="small"
                          label="Ghi chú"
                          value={handoverComment}
                          onChange={(e) => setHandoverComment(e.target.value)}
                          fullWidth
                        />
                      </Stack>

                      <Stack direction="row" justifyContent="flex-end">
                        <Button
                          variant="contained"
                          startIcon={<SwapHorizIcon />}
                          onClick={handleRequestHandover}
                          disabled={handoverState.isLoading}
                        >
                          Thực hiện bàn giao
                        </Button>
                      </Stack>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <HistoryIcon fontSize="small" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Lịch sử bàn giao
                  </Typography>
                </Stack>
                <Button size="small" variant="outlined" onClick={() => runHistorySearch(historyPage, historyPageSize)}>
                  Tải lại
                </Button>
              </Stack>

              {historyState.error ? (
                <Alert severity="error">Không tải được lịch sử bàn giao.</Alert>
              ) : historyRows.length === 0 && !historyState.isLoading ? (
                <Alert severity="info">Chưa có lịch sử bàn giao cho công việc đang chọn.</Alert>
              ) : (
                <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                  <AppTable<WorkAssignmentHandoverHistoryRow>
                    rows={historyRows}
                    columns={historyColumns}
                    rowKey={(row) => row.id}
                    selectable={false}
                    enablePagination
                    paginationMode="server"
                    page={historyPage}
                    pageSize={historyPageSize}
                    totalRows={historyTotal}
                    onPageChange={(page) => {
                      setHistoryPage(page);
                      runHistorySearch(page, historyPageSize);
                    }}
                    onPageSizeChange={(size) => {
                      setHistoryPageSize(size);
                      setHistoryPage(0);
                      runHistorySearch(0, size);
                    }}
                  />
                </Box>
              )}
            </Stack>
          </Stack>
        ) : null}
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
        parentCandidates={parentCandidates}
        parentCandidatesLoading={parentCandidatesLoading}
        isWorkOwner={isWorkOwner}
        disabled={createState.isLoading}
        workStartDate={workStartDate}
        workEndDate={workEndDate}
        mode="create"
        title={uiText(UITextKey.TextGiaoViec)}
        submitLabel="Tạo mới"
      />

      <WorkAssignmentCreateDialog
        open={!!detailId}
        value={detailValue}
        onChange={() => undefined}
        onClose={closeAssignmentDetail}
        parentCandidates={parentCandidates}
        parentCandidatesLoading={parentCandidatesLoading}
        isWorkOwner={isWorkOwner}
        disabled={detailLoading}
        workStartDate={workStartDate}
        workEndDate={workEndDate}
        mode="view"
        title={uiText(UITextKey.TextChiTietAssignment)}
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

      <WorkAssignmentSourceRulesDialog
        open={!!sourceRulesTargetId}
        assignment={(sourceRulesAssignmentData as WorkAssignmentResponse) ?? null}
        children={(sourceRulesChildrenData ?? []) as WorkAssignmentListResponse[]}
        childrenLoading={sourceRulesChildrenLoading || sourceRulesAssignmentLoading}
        saving={updateDataSourceRulesState.isLoading}
        onClose={() => {
          if (updateDataSourceRulesState.isLoading) return;
          setSourceRulesTargetId(null);
        }}
        onSubmit={handleSaveSourceRules}
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
          showMessage(message || "Đã lưu đánh giá công việc.");
          await refetch();
        }}
        onError={showMessage}
      />

      <Dialog
        open={Boolean(previewDynamicFormId)}
        onClose={() => setPreviewDynamicFormId(null)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Xem trước biểu mẫu động
          {previewDynamicFormQuery.data
            ? ` - ${[
                previewDynamicFormQuery.data.code,
                previewDynamicFormQuery.data.name,
              ].filter(Boolean).join(" - ")}`
            : ""}
        </DialogTitle>
        <DialogContent dividers>
          {previewDynamicFormQuery.isLoading || previewDynamicFormQuery.isFetching ? (
            <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : previewDynamicFormQuery.isError || !previewDynamicFormQuery.data ? (
            <Alert severity="error">Không tải được biểu mẫu động để xem trước.</Alert>
          ) : (
            <DynamicFormPreview detail={previewDynamicFormQuery.data} dense />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDynamicFormId(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmHandoverOpen}
        title="Xác nhận bàn giao"
        message={
          <Stack spacing={1}>
            <Typography variant="body2">
              Bàn giao <b>{getAssignmentLabel(selectedHandoverAssignment)}</b> từ{" "}
              <b>
                {getAssigneeLabel(
                  selectedHandoverAssignment?.assignees?.find((x) => x.userId === fromAssigneeUserId)
                )}
              </b>{" "}
              sang <b>{toAssigneeUserIds[0] || "-"}</b>?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hệ thống sẽ chuyển người phụ trách, các kỳ báo cáo, báo cáo và tác vụ đang chờ sang
              tài khoản nhận bàn giao. Dấu vết người tạo/người duyệt cũ vẫn được giữ nguyên.
            </Typography>
          </Stack>
        }
        confirmText="Bàn giao"
        cancelText="Hủy"
        variant="warning"
        confirmLoading={handoverState.isLoading}
        onConfirm={handleConfirmHandover}
        onClose={() => setConfirmHandoverOpen(false)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default WorkAssignTab;
