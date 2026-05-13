import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import type { ReactFlowInstance, Viewport } from "reactflow";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  useGetDashboardMindMapWorkTreeQuery,
  useLazyGetDashboardMindMapChildrenQuery,
  useLazyGetDashboardMindMapRootAssignmentsQuery,
  useLazyGetDashboardMindMapTemplateGroupsQuery,
  useLazyGetDashboardMindMapTemplateUsersQuery,
  useLazySearchDashboardMindMapTemplateReportsQuery,
} from "../../../api/dashboardMindMapApi";
import { useSearchWorksQuery } from "../../../api/workApi";
import type { SummaryAnchorPosition } from "../../../components/dashboard/mindmap/AssignmentMindNode";
import MindMapCanvas from "../../../components/dashboard/mindmap/MindMapCanvas";
import type {
  AssignmentBranchKind,
  MindMapGraphChip,
  MindMapGraphNodeData,
  MindMapStatusAccent,
  UserReportFilters,
} from "../../../components/dashboard/mindmap/MindMapGraphNode";
import LabelDrilldownDrawer from "../../../components/dashboard/mindmap/LabelDrilldownDrawer";
import NodeSummaryPopover from "../../../components/dashboard/mindmap/NodeSummaryPopover";
import FieldMetricDrilldownDrawer from "../../../components/dashboard/mindmap/FieldMetricDrilldownDrawer";
import ReportDrilldownDrawer from "../../../components/dashboard/mindmap/ReportDrilldownDrawer";
import TableMetricDrilldownDrawer from "../../../components/dashboard/mindmap/TableMetricDrilldownDrawer";
import UnitDrilldownDrawer from "../../../components/dashboard/mindmap/UnitDrilldownDrawer";
import WorkMindMapToolbar, {
  type WorkMindMapOption,
} from "../../../components/dashboard/mindmap/WorkMindMapToolbar";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import {
  closeReportDrawer,
  closeSummary,
  closeUnitDrawer,
  openReportDrawer,
  openSummary,
  openUnitDrawer,
  setExpandedNodes,
  setSelectedWork,
  setSelectedWorkType,
  setViewport,
  toggleExpandedNode,
} from "../../../stores/dashboardMindMapSlice";
import type {
  DashboardMindMapNodeDto,
  DashboardMindMapFieldSummaryDto,
  DashboardMindMapLabelSummaryDto,
  DashboardMindMapReportRowDto,
  DashboardMindMapScopeRequest,
  DashboardMindMapTemplateGroupDto,
  DashboardMindMapTemplateUserDto,
  DashboardMindMapTableSummaryDto,
  DashboardMindMapWorkDto,
} from "../../../types/dashboardMindMap";
import { getWorkAssignmentReportStatusLabel } from "../../../types/reportStatus";
import type { WorkListRow, WorkTypeCore } from "../../../types/work";
import { WORK_TYPE } from "../../../types/work";
import {
  dateInputToUtcEnd,
  dateInputToUtcStart,
  formatDateOnly,
} from "../../../utils/dashboardUi";

type CursorMeta = {
  nextCursor?: string | null;
  totalRows: number;
  hasMore: boolean;
};

const GRAPH_INITIAL_LIMIT = 5;
const ROOT_INITIAL_LIMIT = 20;
const MAX_VISIBLE_NODE_COUNT = 100;
const EMPTY_SCOPE: DashboardMindMapScopeRequest = {
  unitIds: [],
};

const REPORT_STATUS_OPTIONS = [
  { value: "PENDING" as const, label: "Chưa bắt đầu" },
  { value: "DRAFT" as const, label: "Bản nháp" },
  { value: "SUBMITTED" as const, label: "Đã gửi" },
  { value: "APPROVED" as const, label: "Đã duyệt" },
  { value: "OVERDUE" as const, label: "Quá hạn" },
];

const DEFAULT_REPORT_FILTERS: UserReportFilters = {
  statusBuckets: [],
  fromDate: "",
  toDate: "",
};

const WORK_STATUS = {
  NotStarted: 1,
  InProgress: 2,
  Completed: 3,
  AtRiskOverdue: 4,
  Overdue: 5,
} as const;

const ASSIGNMENT_PROGRESS_STATUS = {
  NotStarted: 0,
  InProgress: 1,
  Completed: 2,
  AtRiskOverdue: 3,
  Overdue: 4,
} as const;

type MindMapChipColor = NonNullable<MindMapGraphChip["color"]>;
type EmptyNodeReason =
  | "root-assignments"
  | "assignment-children"
  | "assignment-reports"
  | "template-users"
  | "user-reports";

const STATUS_ACCENTS: Record<string, MindMapStatusAccent> = {
  default: { color: "rgba(148,163,184,0.42)", background: "rgba(248,250,252,0.86)" },
  success: { color: "rgba(34,197,94,0.72)", background: "rgba(240,253,244,0.9)" },
  warning: { color: "rgba(245,158,11,0.76)", background: "rgba(255,251,235,0.92)" },
  error: { color: "rgba(239,68,68,0.74)", background: "rgba(254,242,242,0.92)" },
  info: { color: "rgba(14,165,233,0.7)", background: "rgba(240,249,255,0.9)" },
  primary: { color: "rgba(37,99,235,0.7)", background: "rgba(239,246,255,0.92)" },
};

function chipColorToAccent(color?: MindMapGraphChip["color"]): MindMapStatusAccent {
  return STATUS_ACCENTS[color ?? "default"] ?? STATUS_ACCENTS.default;
}

function isOverdueDoneWork(work: DashboardMindMapWorkDto): boolean {
  return work.status === WORK_STATUS.Completed && work.hasOverduePeriod;
}

function getMindMapWorkStatusLabel(work: DashboardMindMapWorkDto): string {
  if (isOverdueDoneWork(work)) return "Quá hạn đã làm";

  switch (work.status) {
    case WORK_STATUS.NotStarted:
      return "Chưa bắt đầu";
    case WORK_STATUS.InProgress:
      return "Đang thực hiện";
    case WORK_STATUS.Completed:
      return "Hoàn thành";
    case WORK_STATUS.AtRiskOverdue:
      return "Có nguy cơ quá hạn";
    case WORK_STATUS.Overdue:
      return "Quá hạn";
    default:
      return `Trạng thái ${work.status}`;
  }
}

function getMindMapWorkStatusChipColor(work: DashboardMindMapWorkDto): MindMapChipColor {
  if (isOverdueDoneWork(work)) return "warning";

  switch (work.status) {
    case WORK_STATUS.InProgress:
      return "primary";
    case WORK_STATUS.Completed:
      return "success";
    case WORK_STATUS.AtRiskOverdue:
      return "warning";
    case WORK_STATUS.Overdue:
      return "error";
    default:
      return "default";
  }
}

function isOverdueDoneAssignment(node: DashboardMindMapNodeDto): boolean {
  return node.progressStatus === ASSIGNMENT_PROGRESS_STATUS.Completed && node.hasOverduePeriod;
}

function getMindMapAssignmentStatusLabel(node: DashboardMindMapNodeDto): string {
  if (isOverdueDoneAssignment(node)) return "Quá hạn đã làm";

  switch (node.progressStatus) {
    case ASSIGNMENT_PROGRESS_STATUS.NotStarted:
      return "Chưa thực hiện";
    case ASSIGNMENT_PROGRESS_STATUS.InProgress:
      return "Đang thực hiện";
    case ASSIGNMENT_PROGRESS_STATUS.Completed:
      return "Đã hoàn thành";
    case ASSIGNMENT_PROGRESS_STATUS.AtRiskOverdue:
      return "Có nguy cơ chậm muộn";
    case ASSIGNMENT_PROGRESS_STATUS.Overdue:
      return "Chậm muộn";
    default:
      return `Tiến độ ${node.progressStatus}`;
  }
}

function getMindMapAssignmentStatusChipColor(node: DashboardMindMapNodeDto): MindMapChipColor {
  if (isOverdueDoneAssignment(node)) return "warning";

  switch (node.progressStatus) {
    case ASSIGNMENT_PROGRESS_STATUS.InProgress:
      return "primary";
    case ASSIGNMENT_PROGRESS_STATUS.Completed:
      return "success";
    case ASSIGNMENT_PROGRESS_STATUS.AtRiskOverdue:
      return "warning";
    case ASSIGNMENT_PROGRESS_STATUS.Overdue:
      return "error";
    default:
      return "default";
  }
}

function getMindMapReportPeriodStatusLabel(status?: number | null): string {
  switch (status) {
    case 0:
      return "Chưa bắt đầu";
    case 1:
      return "Bản nháp";
    case 2:
      return "Đã nộp";
    case 3:
      return "Đã duyệt";
    case 4:
      return "Quá hạn chưa bắt đầu";
    case 5:
      return "Quá hạn bản nháp";
    case 6:
      return "Quá hạn đã gửi";
    case 7:
      return "Quá hạn đã duyệt";
    case null:
    case undefined:
      return "Chưa có";
    default:
      return `Trạng thái kỳ ${status}`;
  }
}

function reportBucketToAccent(bucket?: string | null): MindMapStatusAccent {
  switch ((bucket ?? "").toUpperCase()) {
    case "DRAFT":
      return STATUS_ACCENTS.info;
    case "SUBMITTED":
      return STATUS_ACCENTS.primary;
    case "APPROVED":
      return STATUS_ACCENTS.success;
    case "OVERDUE":
      return STATUS_ACCENTS.error;
    default:
      return STATUS_ACCENTS.default;
  }
}

function parseWorkTypeFromSearchParams(searchParams: URLSearchParams): WorkTypeCore {
  const raw = Number(searchParams.get("type"));
  return raw === WORK_TYPE.INDICATOR ? WORK_TYPE.INDICATOR : WORK_TYPE.TASK;
}

function buildSearchParams(workType: WorkTypeCore): URLSearchParams {
  const params = new URLSearchParams();
  params.set("type", String(workType));
  return params;
}

function mapWorkOptionFromListRow(row: WorkListRow): WorkMindMapOption {
  return {
    id: row.id,
    code: row.code || row.autoCode,
    name: row.name,
    status: row.status,
    type: row.type,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  const source = error as {
    data?: { message?: string; error?: string };
    message?: string;
    error?: string;
  };

  return source?.data?.message || source?.data?.error || source?.message || source?.error || fallback;
}

function workNodeId(workId: string) {
  return `work:${workId}`;
}

function templateNodeId(assignmentId: string, dynamicFormTemplateId: string) {
  return `template:${assignmentId}:${dynamicFormTemplateId}`;
}

function userNodeId(assignmentId: string, dynamicFormTemplateId: string, assigneeUserId: string) {
  return `user:${assignmentId}:${dynamicFormTemplateId}:${assigneeUserId}`;
}

function reportNodeId(report: DashboardMindMapReportRowDto) {
  return `report:${report.workReportPeriodId}`;
}

function loadMoreNodeId(parentId: string) {
  return `load-more:${parentId}`;
}

function emptyNodeId(parentId: string, reason: EmptyNodeReason) {
  return `empty:${reason}:${parentId}`;
}

function getEmptyNodeReason(id: string): EmptyNodeReason {
  return (id.split(":")[1] as EmptyNodeReason) || "assignment-children";
}

function hasOwn<T extends object>(source: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function makeMeta(totalRows: number, nextCursor?: string | null): CursorMeta {
  return {
    totalRows,
    nextCursor,
    hasMore: Boolean(nextCursor),
  };
}

function reportText(report: DashboardMindMapReportRowDto) {
  const parts = [
    report.currentProgressStatus ? `Tiến độ: ${report.currentProgressStatus}` : "",
    report.reportReason ? `Lý do báo cáo: ${report.reportReason}` : "",
    report.difficulties ? `Khó khăn: ${report.difficulties}` : "",
    report.proposedSolution ? `Đề xuất: ${report.proposedSolution}` : "",
    report.lateReason ? `Lý do chậm: ${report.lateReason}` : "",
    report.reviewerComment ? `Nhận xét: ${report.reviewerComment}` : "",
    report.reviewerEvaluation ? `Đánh giá: ${report.reviewerEvaluation}` : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" | ") : "Chưa có nội dung báo cáo tóm tắt.";
}

type WorkMindMapPageProps = {
  embedded?: boolean;
  canvasOnly?: boolean;
};

export default function WorkMindMapPage({ embedded = false, canvasOnly = false }: WorkMindMapPageProps = {}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workId: workIdParam } = useParams<{ workId?: string }>();
  const {
    selectedWorkType,
    selectedWorkId,
    expandedNodeIds,
    focusedNodeId,
    summaryNodeId,
    unitDrawer,
    reportDrawer,
    viewport,
  } = useAppSelector((state) => state.dashboardMindMap);

  const initialWorkTypeRef = useRef<WorkTypeCore>(
    embedded ? selectedWorkType : parseWorkTypeFromSearchParams(searchParams),
  );
  const urlStateReadyRef = useRef(selectedWorkType === initialWorkTypeRef.current);
  const [workSearchText, setWorkSearchText] = useState("");
  const deferredWorkSearchText = useDeferredValue(workSearchText.trim());
  const [assignmentNodesById, setAssignmentNodesById] = useState<Record<string, DashboardMindMapNodeDto>>({});
  const [rootAssignmentIds, setRootAssignmentIds] = useState<string[]>([]);
  const [assignmentChildIdsByParentId, setAssignmentChildIdsByParentId] = useState<Record<string, string[]>>({});
  const [assignmentBranchById, setAssignmentBranchById] = useState<Record<string, AssignmentBranchKind>>({});
  const [templateGroupsById, setTemplateGroupsById] = useState<Record<string, DashboardMindMapTemplateGroupDto>>({});
  const [templateGroupIdsByAssignmentId, setTemplateGroupIdsByAssignmentId] = useState<Record<string, string[]>>({});
  const [templateUsersById, setTemplateUsersById] = useState<Record<string, DashboardMindMapTemplateUserDto>>({});
  const [templateUserIdsByTemplateId, setTemplateUserIdsByTemplateId] = useState<Record<string, string[]>>({});
  const [templateSelectedUserIdsById, setTemplateSelectedUserIdsById] = useState<Record<string, string[]>>({});
  const [templateUserSearchTextById, setTemplateUserSearchTextById] = useState<Record<string, string>>({});
  const [reportFiltersByUserNodeId, setReportFiltersByUserNodeId] = useState<Record<string, UserReportFilters>>({});
  const [reportsById, setReportsById] = useState<Record<string, DashboardMindMapReportRowDto>>({});
  const [reportIdsByUserNodeId, setReportIdsByUserNodeId] = useState<Record<string, string[]>>({});
  const [cursorMetaByParentId, setCursorMetaByParentId] = useState<Record<string, CursorMeta>>({});
  const [loadingByNodeId, setLoadingByNodeId] = useState<Record<string, boolean>>({});
  const [graphError, setGraphError] = useState("");
  const [statusColorEnabled, setStatusColorEnabled] = useState(false);
  const [summaryAnchorPosition, setSummaryAnchorPosition] = useState<SummaryAnchorPosition | null>(null);
  const [tableMetricDrawer, setTableMetricDrawer] = useState<{
    open: boolean;
    nodeId: string | null;
    metric: DashboardMindMapTableSummaryDto | null;
  }>({
    open: false,
    nodeId: null,
    metric: null,
  });
  const [fieldMetricDrawer, setFieldMetricDrawer] = useState<{
    open: boolean;
    nodeId: string | null;
    metric: DashboardMindMapFieldSummaryDto | null;
  }>({
    open: false,
    nodeId: null,
    metric: null,
  });
  const [labelDrawer, setLabelDrawer] = useState<{
    open: boolean;
    nodeId: string | null;
    label: DashboardMindMapLabelSummaryDto | null;
  }>({
    open: false,
    nodeId: null,
    label: null,
  });
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
  const fitViewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templateUserSearchTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const reportFilterTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const effectiveWorkType = urlStateReadyRef.current ? selectedWorkType : initialWorkTypeRef.current;
  const currentWorkNodeId = selectedWorkId ? workNodeId(selectedWorkId) : "";

  const { data: worksResponse, isFetching: worksLoading } = useSearchWorksQuery(
    {
      type: effectiveWorkType,
      q: deferredWorkSearchText || undefined,
      status: null,
      priority: null,
      leaderDirectiveUserId: null,
      page: 0,
      pageSize: 20,
      sortField: "createdAtUtc",
      sortDirection: "desc",
    },
    { skip: canvasOnly },
  );

  const {
    data: workTreeData,
    isFetching: workTreeLoading,
    error: workTreeError,
    refetch: refetchWorkTree,
  } = useGetDashboardMindMapWorkTreeQuery(
    {
      workId: selectedWorkId,
      page: 0,
      pageSize: ROOT_INITIAL_LIMIT,
      scope: EMPTY_SCOPE,
    },
    {
      skip: !selectedWorkId,
    },
  );

  const [triggerRootAssignments] = useLazyGetDashboardMindMapRootAssignmentsQuery();
  const [triggerChildren] = useLazyGetDashboardMindMapChildrenQuery();
  const [triggerTemplateGroups] = useLazyGetDashboardMindMapTemplateGroupsQuery();
  const [triggerTemplateUsers] = useLazyGetDashboardMindMapTemplateUsersQuery();
  const [triggerTemplateReports] = useLazySearchDashboardMindMapTemplateReportsQuery();

  useEffect(() => {
    if (embedded) {
      urlStateReadyRef.current = true;
      return;
    }

    if (selectedWorkType !== initialWorkTypeRef.current) {
      dispatch(setSelectedWorkType(initialWorkTypeRef.current));
      return;
    }

    urlStateReadyRef.current = true;
  }, [dispatch, embedded, selectedWorkType]);

  useEffect(() => {
    if (embedded) return;

    const nextWorkId = workIdParam ?? "";
    if (nextWorkId !== selectedWorkId) {
      dispatch(setSelectedWork(nextWorkId));
    }
  }, [dispatch, embedded, selectedWorkId, workIdParam]);

  useEffect(() => {
    if (embedded || !urlStateReadyRef.current) return;

    setSearchParams(buildSearchParams(effectiveWorkType), {
      replace: true,
    });
  }, [effectiveWorkType, embedded, setSearchParams]);

  useEffect(() => {
    setAssignmentNodesById({});
    setRootAssignmentIds([]);
    setAssignmentChildIdsByParentId({});
    setAssignmentBranchById({});
    setTemplateGroupsById({});
    setTemplateGroupIdsByAssignmentId({});
    setTemplateUsersById({});
    setTemplateUserIdsByTemplateId({});
    setTemplateSelectedUserIdsById({});
    setTemplateUserSearchTextById({});
    setReportFiltersByUserNodeId({});
    setReportsById({});
    setReportIdsByUserNodeId({});
    setCursorMetaByParentId({});
    setLoadingByNodeId({});
    setSummaryAnchorPosition(null);
    setTableMetricDrawer({ open: false, nodeId: null, metric: null });
    setGraphError("");
    setFlowInstance(null);
    Object.values(templateUserSearchTimeoutsRef.current).forEach(clearTimeout);
    Object.values(reportFilterTimeoutsRef.current).forEach(clearTimeout);
    templateUserSearchTimeoutsRef.current = {};
    reportFilterTimeoutsRef.current = {};
    dispatch(setExpandedNodes(selectedWorkId ? [workNodeId(selectedWorkId)] : []));
    dispatch(closeSummary());
    dispatch(closeUnitDrawer());
    dispatch(closeReportDrawer());
  }, [dispatch, selectedWorkId]);

  useEffect(() => {
    if (!workTreeData || !selectedWorkId) return;

    const rows = workTreeData.rootAssignments.rows;
    setAssignmentNodesById((prev) => {
      const next = { ...prev };
      rows.forEach((node) => {
        next[node.id] = node;
      });
      return next;
    });
    setRootAssignmentIds(rows.map((node) => node.id));
    setCursorMetaByParentId((prev) => ({
      ...prev,
      [workNodeId(selectedWorkId)]: makeMeta(
        workTreeData.rootAssignments.totalRows,
        rows.length < workTreeData.rootAssignments.totalRows ? String(rows.length) : null,
      ),
    }));
  }, [selectedWorkId, workTreeData]);

  useEffect(() => {
    return () => {
      if (fitViewTimeoutRef.current) {
        clearTimeout(fitViewTimeoutRef.current);
        fitViewTimeoutRef.current = null;
      }
      Object.values(templateUserSearchTimeoutsRef.current).forEach(clearTimeout);
      Object.values(reportFilterTimeoutsRef.current).forEach(clearTimeout);
      templateUserSearchTimeoutsRef.current = {};
      reportFilterTimeoutsRef.current = {};
    };
  }, []);

  const workOptions = useMemo(
    () => (worksResponse?.rows ?? []).map(mapWorkOptionFromListRow),
    [worksResponse?.rows],
  );

  const selectedWork = useMemo<WorkMindMapOption | null>(() => {
    const fromOptions = workOptions.find((option) => option.id === selectedWorkId);
    if (fromOptions) return fromOptions;
    if (!workTreeData?.work || !selectedWorkId) return null;

    return {
      id: workTreeData.work.id,
      code: workTreeData.work.code,
      name: workTreeData.work.name,
      status: workTreeData.work.status,
      type: effectiveWorkType,
    };
  }, [effectiveWorkType, selectedWorkId, workOptions, workTreeData?.work]);

  const countVisibleNodes = useCallback((nodeId: string, expandedSet: Set<string>, childMap: Record<string, string[]>): number => {
    const childIds = expandedSet.has(nodeId) ? childMap[nodeId] ?? [] : [];
    return 1 + childIds.reduce((sum, childId) => sum + countVisibleNodes(childId, expandedSet, childMap), 0);
  }, []);

  const getTemplateUserIdsForDisplay = useCallback((templateId: string) => {
    const loadedIds = templateUserIdsByTemplateId[templateId] ?? [];
    const selectedIds = templateSelectedUserIdsById[templateId] ?? [];
    return selectedIds.length ? loadedIds.filter((id) => selectedIds.includes(id)) : loadedIds;
  }, [templateSelectedUserIdsById, templateUserIdsByTemplateId]);

  const buildGraphChildren = () => {
    const childMap: Record<string, string[]> = {};

    if (currentWorkNodeId) {
      childMap[currentWorkNodeId] = rootAssignmentIds;
      if (cursorMetaByParentId[currentWorkNodeId]?.hasMore) {
        childMap[currentWorkNodeId] = [...childMap[currentWorkNodeId], loadMoreNodeId(currentWorkNodeId)];
      }
      if (
        workTreeData?.work &&
        expandedNodeIds.includes(currentWorkNodeId) &&
        rootAssignmentIds.length === 0 &&
        !cursorMetaByParentId[currentWorkNodeId]?.hasMore &&
        !loadingByNodeId[currentWorkNodeId]
      ) {
        childMap[currentWorkNodeId] = [emptyNodeId(currentWorkNodeId, "root-assignments")];
      }
    }

    Object.keys(assignmentNodesById).forEach((assignmentId) => {
      const branch = assignmentBranchById[assignmentId];
      if (branch === "assignments") {
        const childIds = assignmentChildIdsByParentId[assignmentId] ?? [];
        const hasLoaded = hasOwn(assignmentChildIdsByParentId, assignmentId);
        const hasMore = cursorMetaByParentId[assignmentId]?.hasMore;
        childMap[assignmentId] = childIds;
        if (cursorMetaByParentId[assignmentId]?.hasMore) {
          childMap[assignmentId] = [...childMap[assignmentId], loadMoreNodeId(assignmentId)];
        }
        if (hasLoaded && childIds.length === 0 && !hasMore && !loadingByNodeId[assignmentId]) {
          childMap[assignmentId] = [emptyNodeId(assignmentId, "assignment-children")];
        }
      }

      if (branch === "reports") {
        const groupIds = templateGroupIdsByAssignmentId[assignmentId] ?? [];
        const hasLoaded = hasOwn(templateGroupIdsByAssignmentId, assignmentId);
        childMap[assignmentId] = groupIds;
        if (hasLoaded && groupIds.length === 0 && !loadingByNodeId[assignmentId]) {
          childMap[assignmentId] = [emptyNodeId(assignmentId, "assignment-reports")];
        }
      }
    });

    Object.keys(templateGroupsById).forEach((templateId) => {
      const userIds = getTemplateUserIdsForDisplay(templateId);
      const hasLoaded = hasOwn(templateUserIdsByTemplateId, templateId);
      const hasMore = cursorMetaByParentId[templateId]?.hasMore && (templateSelectedUserIdsById[templateId] ?? []).length === 0;
      childMap[templateId] = userIds;
      if (hasMore) {
        childMap[templateId] = [...childMap[templateId], loadMoreNodeId(templateId)];
      }
      if (hasLoaded && userIds.length === 0 && !hasMore && !loadingByNodeId[templateId]) {
        childMap[templateId] = [emptyNodeId(templateId, "template-users")];
      }
    });

    Object.keys(templateUsersById).forEach((userId) => {
      const reportIds = reportIdsByUserNodeId[userId] ?? [];
      const hasLoaded = hasOwn(reportIdsByUserNodeId, userId);
      const hasMore = cursorMetaByParentId[userId]?.hasMore;
      childMap[userId] = reportIds;
      if (hasMore) {
        childMap[userId] = [...childMap[userId], loadMoreNodeId(userId)];
      }
      if (hasLoaded && reportIds.length === 0 && !hasMore && !loadingByNodeId[userId]) {
        childMap[userId] = [emptyNodeId(userId, "user-reports")];
      }
    });

    return childMap;
  };

  const graphChildrenByParentId = buildGraphChildren();

  const visibleNodeCount = currentWorkNodeId && workTreeData?.work
    ? countVisibleNodes(currentWorkNodeId, new Set(expandedNodeIds), graphChildrenByParentId)
    : 0;

  const canAddNodes = (count: number) => {
    if (visibleNodeCount + count <= MAX_VISIBLE_NODE_COUNT) return true;
    setGraphError(`Màn hình đang hiển thị ${visibleNodeCount} mục. Thu gọn bớt nhánh trước khi mở thêm để giữ hiệu năng.`);
    return false;
  };

  const setLoading = (nodeId: string, loading: boolean) => {
    setLoadingByNodeId((prev) => ({ ...prev, [nodeId]: loading }));
  };

  const mergeAssignmentNodes = (nodes: DashboardMindMapNodeDto[]) => {
    setAssignmentNodesById((prev) => {
      const next = { ...prev };
      nodes.forEach((node) => {
        next[node.id] = node;
      });
      return next;
    });
  };

  const loadMoreRootAssignments = async () => {
    if (!selectedWorkId || !currentWorkNodeId) return;
    const meta = cursorMetaByParentId[currentWorkNodeId];
    if (!meta?.hasMore || !canAddNodes(GRAPH_INITIAL_LIMIT)) return;

    setGraphError("");
    setLoading(currentWorkNodeId, true);
    try {
      const result = await triggerRootAssignments({
        workId: selectedWorkId,
        cursor: meta.nextCursor,
        limit: GRAPH_INITIAL_LIMIT,
      }).unwrap();
      mergeAssignmentNodes(result.rows);
      setRootAssignmentIds((prev) => Array.from(new Set([...prev, ...result.rows.map((node) => node.id)])));
      setCursorMetaByParentId((prev) => ({
        ...prev,
        [currentWorkNodeId]: makeMeta(result.totalRows, result.nextCursor),
      }));
    } catch (error) {
      setGraphError(getErrorMessage(error, "Không tải thêm được công việc đầu vào."));
    } finally {
      setLoading(currentWorkNodeId, false);
    }
  };

  const loadAssignmentChildren = async (node: DashboardMindMapNodeDto, cursor?: string | null) => {
    if (!canAddNodes(GRAPH_INITIAL_LIMIT)) return;

    setGraphError("");
    setLoading(node.id, true);
    try {
      const result = await triggerChildren({
        assignmentId: node.id,
        cursor,
        limit: GRAPH_INITIAL_LIMIT,
      }).unwrap();
      mergeAssignmentNodes(result.rows);
      setAssignmentChildIdsByParentId((prev) => ({
        ...prev,
        [node.id]: Array.from(new Set([...(prev[node.id] ?? []), ...result.rows.map((child) => child.id)])),
      }));
      setCursorMetaByParentId((prev) => ({
        ...prev,
        [node.id]: makeMeta(result.totalRows, result.nextCursor),
      }));
    } catch (error) {
      setGraphError(getErrorMessage(error, "Không tải được công việc con."));
    } finally {
      setLoading(node.id, false);
    }
  };

  const loadTemplateGroups = async (node: DashboardMindMapNodeDto) => {
    setGraphError("");
    setLoading(node.id, true);
    try {
      const result = await triggerTemplateGroups({ assignmentId: node.id }).unwrap();
      const ids = result.map((group) => templateNodeId(group.assignmentId, group.dynamicFormTemplateId));
      setTemplateGroupsById((prev) => {
        const next = { ...prev };
        result.forEach((group) => {
          next[templateNodeId(group.assignmentId, group.dynamicFormTemplateId)] = group;
        });
        return next;
      });
      setTemplateGroupIdsByAssignmentId((prev) => ({ ...prev, [node.id]: ids }));
    } catch (error) {
      setGraphError(getErrorMessage(error, "Không tải được nhóm báo cáo theo biểu mẫu."));
    } finally {
      setLoading(node.id, false);
    }
  };

  const loadTemplateUsers = async (
    templateId: string,
    cursor?: string | null,
    q = templateUserSearchTextById[templateId] ?? "",
    replace = false,
  ) => {
    const group = templateGroupsById[templateId];
    if (!group || (!replace && !canAddNodes(GRAPH_INITIAL_LIMIT))) return;

    setGraphError("");
    setLoading(templateId, true);
    try {
      const result = await triggerTemplateUsers({
        assignmentId: group.assignmentId,
        dynamicFormTemplateId: group.dynamicFormTemplateId,
        q: q.trim() || undefined,
        cursor,
        limit: GRAPH_INITIAL_LIMIT,
      }).unwrap();
      const ids = result.rows.map((user) => userNodeId(group.assignmentId, group.dynamicFormTemplateId, user.assigneeUserId));
      setTemplateUsersById((prev) => {
        const next = { ...prev };
        result.rows.forEach((user) => {
          next[userNodeId(group.assignmentId, group.dynamicFormTemplateId, user.assigneeUserId)] = user;
        });
        return next;
      });
      setTemplateUserIdsByTemplateId((prev) => ({
        ...prev,
        [templateId]: replace ? ids : Array.from(new Set([...(prev[templateId] ?? []), ...ids])),
      }));
      setCursorMetaByParentId((prev) => ({
        ...prev,
        [templateId]: makeMeta(result.totalRows, result.nextCursor),
      }));
    } catch (error) {
      setGraphError(getErrorMessage(error, "Không tải được người dùng theo biểu mẫu."));
    } finally {
      setLoading(templateId, false);
    }
  };

  const loadUserReports = async (
    userId: string,
    cursor?: string | null,
    filters = reportFiltersByUserNodeId[userId] ?? DEFAULT_REPORT_FILTERS,
    replace = false,
  ) => {
    const user = templateUsersById[userId];
    if (!user || (!replace && !canAddNodes(GRAPH_INITIAL_LIMIT))) return;

    setGraphError("");
    setLoading(userId, true);
    try {
      const result = await triggerTemplateReports({
        assignmentId: user.assignmentId,
        dynamicFormTemplateId: user.dynamicFormTemplateId,
        req: {
          assigneeUserIds: [user.assigneeUserId],
          statusBuckets: filters.statusBuckets,
          fromUtc: dateInputToUtcStart(filters.fromDate),
          toUtc: dateInputToUtcEnd(filters.toDate),
          cursor,
          limit: GRAPH_INITIAL_LIMIT,
        },
      }).unwrap();
      const ids = result.rows.map(reportNodeId);
      setReportsById((prev) => {
        const next = { ...prev };
        result.rows.forEach((report) => {
          next[reportNodeId(report)] = report;
        });
        return next;
      });
      setReportIdsByUserNodeId((prev) => ({
        ...prev,
        [userId]: replace ? ids : Array.from(new Set([...(prev[userId] ?? []), ...ids])),
      }));
      setCursorMetaByParentId((prev) => ({
        ...prev,
        [userId]: makeMeta(result.totalRows, result.nextCursor),
      }));
    } catch (error) {
      setGraphError(getErrorMessage(error, "Không tải được báo cáo của người dùng."));
    } finally {
      setLoading(userId, false);
    }
  };

  const handleToggleWork = () => {
    if (!currentWorkNodeId) return;
    dispatch(toggleExpandedNode(currentWorkNodeId));
  };

  const handleExpandAssignmentBranch = async (node: DashboardMindMapNodeDto, branch: AssignmentBranchKind) => {
    const isSameOpen = expandedNodeIds.includes(node.id) && assignmentBranchById[node.id] === branch;
    if (isSameOpen) {
      dispatch(toggleExpandedNode(node.id));
      return;
    }

    setAssignmentBranchById((prev) => ({ ...prev, [node.id]: branch }));
    if (!expandedNodeIds.includes(node.id)) {
      dispatch(toggleExpandedNode(node.id));
    }

    if (branch === "assignments" && assignmentChildIdsByParentId[node.id] == null) {
      await loadAssignmentChildren(node);
    }

    if (branch === "reports" && templateGroupIdsByAssignmentId[node.id] == null) {
      await loadTemplateGroups(node);
    }
  };

  const handleToggleTemplate = async (templateId: string) => {
    const isExpanded = expandedNodeIds.includes(templateId);
    dispatch(toggleExpandedNode(templateId));
    if (!isExpanded && templateUserIdsByTemplateId[templateId] == null) {
      await loadTemplateUsers(templateId);
    }
  };

  const handleToggleUser = async (userId: string) => {
    const isExpanded = expandedNodeIds.includes(userId);
    dispatch(toggleExpandedNode(userId));
    if (!isExpanded && reportIdsByUserNodeId[userId] == null) {
      await loadUserReports(userId);
    }
  };

  const handleLoadMore = async (parentId: string) => {
    if (parentId === currentWorkNodeId) {
      await loadMoreRootAssignments();
      return;
    }

    if (assignmentNodesById[parentId]) {
      await loadAssignmentChildren(assignmentNodesById[parentId], cursorMetaByParentId[parentId]?.nextCursor);
      return;
    }

    if (templateGroupsById[parentId]) {
      await loadTemplateUsers(parentId, cursorMetaByParentId[parentId]?.nextCursor);
      return;
    }

    if (templateUsersById[parentId]) {
      await loadUserReports(parentId, cursorMetaByParentId[parentId]?.nextCursor);
    }
  };

  const handleUserSearchTextChange = (templateId: string, value: string) => {
    setTemplateUserSearchTextById((prev) => ({ ...prev, [templateId]: value }));
    setTemplateSelectedUserIdsById((prev) => ({ ...prev, [templateId]: [] }));
    setTemplateUserIdsByTemplateId((prev) => ({ ...prev, [templateId]: [] }));
    setCursorMetaByParentId((prev) => {
      const next = { ...prev };
      delete next[templateId];
      return next;
    });

    if (templateUserSearchTimeoutsRef.current[templateId]) {
      clearTimeout(templateUserSearchTimeoutsRef.current[templateId]);
    }
    templateUserSearchTimeoutsRef.current[templateId] = setTimeout(() => {
      void loadTemplateUsers(templateId, null, value, true);
      delete templateUserSearchTimeoutsRef.current[templateId];
    }, 280);
  };

  const handleReportFiltersChange = (userId: string, filters: UserReportFilters) => {
    setReportFiltersByUserNodeId((prev) => ({ ...prev, [userId]: filters }));
    setReportIdsByUserNodeId((prev) => ({ ...prev, [userId]: [] }));
    setCursorMetaByParentId((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    if (expandedNodeIds.includes(userId)) {
      if (reportFilterTimeoutsRef.current[userId]) {
        clearTimeout(reportFilterTimeoutsRef.current[userId]);
      }
      reportFilterTimeoutsRef.current[userId] = setTimeout(() => {
        void loadUserReports(userId, null, filters, true);
        delete reportFilterTimeoutsRef.current[userId];
      }, 220);
    }
  };

  const handleResetUserReports = (userId: string) => {
    const ids = reportIdsByUserNodeId[userId] ?? [];
    const meta = cursorMetaByParentId[userId];
    if (ids.length <= GRAPH_INITIAL_LIMIT) return;

    setReportIdsByUserNodeId((prev) => ({
      ...prev,
      [userId]: ids.slice(0, GRAPH_INITIAL_LIMIT),
    }));
    setCursorMetaByParentId((prev) => ({
      ...prev,
      [userId]: makeMeta(meta?.totalRows ?? ids.length, (meta?.totalRows ?? ids.length) > GRAPH_INITIAL_LIMIT ? String(GRAPH_INITIAL_LIMIT) : null),
    }));
  };

  const handleOpenSummary = (node: DashboardMindMapNodeDto, anchorPosition: SummaryAnchorPosition) => {
    dispatch(openSummary(node.id));
    setSummaryAnchorPosition(anchorPosition);
  };

  const handleCloseSummary = () => {
    dispatch(closeSummary());
    setSummaryAnchorPosition(null);
  };

  const handleOpenTableMetric = (nodeId: string, metric: DashboardMindMapTableSummaryDto) => {
    setTableMetricDrawer({
      open: true,
      nodeId,
      metric,
    });
  };

  const handleCloseTableMetric = () => {
    setTableMetricDrawer({
      open: false,
      nodeId: null,
      metric: null,
    });
  };

  const handleOpenFieldMetric = (nodeId: string, metric: DashboardMindMapFieldSummaryDto) => {
    setFieldMetricDrawer({
      open: true,
      nodeId,
      metric,
    });
  };

  const handleCloseFieldMetric = () => {
    setFieldMetricDrawer({
      open: false,
      nodeId: null,
      metric: null,
    });
  };

  const handleOpenLabel = (nodeId: string, label: DashboardMindMapLabelSummaryDto) => {
    setLabelDrawer({
      open: true,
      nodeId,
      label,
    });
  };

  const handleCloseLabel = () => {
    setLabelDrawer({
      open: false,
      nodeId: null,
      label: null,
    });
  };

  const handleFitView = () => {
    if (!flowInstance || visibleNodeCount === 0) return;
    flowInstance.fitView({ duration: 420, padding: 0.18 });
  };

  const handleCollapseAll = () => {
    dispatch(setExpandedNodes(currentWorkNodeId ? [currentWorkNodeId] : []));
  };

  const handleResetWork = () => {
    startTransition(() => {
      dispatch(setSelectedWork(""));
      if (!embedded) {
        navigate("/dashboard");
      }
    });
  };

  useEffect(() => {
    if (!flowInstance || visibleNodeCount === 0) return;

    if (fitViewTimeoutRef.current) {
      clearTimeout(fitViewTimeoutRef.current);
    }

    fitViewTimeoutRef.current = setTimeout(() => {
      flowInstance.fitView({ duration: 320, padding: 0.18 });
      fitViewTimeoutRef.current = null;
    }, 90);

    return () => {
      if (fitViewTimeoutRef.current) {
        clearTimeout(fitViewTimeoutRef.current);
        fitViewTimeoutRef.current = null;
      }
    };
  }, [flowInstance, visibleNodeCount]);

  const makeLoadMoreNode = (parentId: string): MindMapGraphNodeData => {
    const meta = cursorMetaByParentId[parentId];
    const remain = Math.max((meta?.totalRows ?? 0) - Number(meta?.nextCursor ?? 0), 0);
    return {
      kind: "loadMore",
      title: "Tải thêm mục",
      subtitle: remain > 0 ? `Còn khoảng ${remain} item chưa hiển thị` : undefined,
      loadMoreLabel: "Tải thêm",
      loading: Boolean(loadingByNodeId[parentId]),
      onLoadMore: () => void handleLoadMore(parentId),
    };
  };

  const makeEmptyNode = (id: string): MindMapGraphNodeData => {
    const reason = getEmptyNodeReason(id);
    const content: Record<EmptyNodeReason, { title: string; subtitle: string }> = {
      "root-assignments": {
        title: "Không có công việc đầu vào",
        subtitle: "Đầu việc này chưa có công việc trong phạm vi hiện tại.",
      },
      "assignment-children": {
        title: "Không có công việc con",
        subtitle: "Mục này chưa có nhánh con. Có thể mở nhánh báo cáo để xem kỳ báo cáo của mục hiện tại.",
      },
      "assignment-reports": {
        title: "Chưa có kỳ báo cáo",
        subtitle: "Mục này chưa có kỳ báo cáo sẵn sàng hoặc không có báo cáo trong phạm vi hiện tại.",
      },
      "template-users": {
        title: "Không có người dùng phù hợp",
        subtitle: "Thử đổi từ khóa tìm kiếm hoặc chọn tất cả người dùng.",
      },
      "user-reports": {
        title: "Không có báo cáo phù hợp",
        subtitle: "Thử đổi trạng thái, khoảng ngày hoặc chờ job materialize period chạy xong.",
      },
    };

    return {
      kind: "empty",
      eyebrow: "EMPTY",
      title: content[reason].title,
      subtitle: content[reason].subtitle,
      chips: [{ label: "Không có dữ liệu", color: "default" }],
    };
  };

  const graphNodesById: Record<string, MindMapGraphNodeData> = (() => {
    const next: Record<string, MindMapGraphNodeData> = {};

    if (workTreeData?.work && currentWorkNodeId) {
      const workStatusColor = getMindMapWorkStatusChipColor(workTreeData.work);
      next[currentWorkNodeId] = {
        kind: "work",
        eyebrow: "WORK",
        title: `${workTreeData.work.code} - ${workTreeData.work.name}`,
        subtitle: `Công việc đầu vào: ${rootAssignmentIds.length}/${workTreeData.rootAssignments.totalRows}. Màn hình tối đa ${MAX_VISIBLE_NODE_COUNT} mục.`,
        chips: [
          { label: getMindMapWorkStatusLabel(workTreeData.work), color: workStatusColor },
          { label: `${rootAssignmentIds.length}/${workTreeData.rootAssignments.totalRows} công việc`, color: "info" },
        ],
        statusAccent: statusColorEnabled ? chipColorToAccent(workStatusColor) : undefined,
        expanded: expandedNodeIds.includes(currentWorkNodeId),
        loading: Boolean(loadingByNodeId[currentWorkNodeId]),
        onToggleWork: handleToggleWork,
      };
    }

    Object.values(assignmentNodesById).forEach((node) => {
      const progressColor = getMindMapAssignmentStatusChipColor(node);
      const chips: MindMapGraphChip[] = [
        { label: getMindMapAssignmentStatusLabel(node), color: progressColor },
        { label: `${node.activeChildCount} nhánh con`, color: node.activeChildCount > 0 ? "primary" : "default" },
      ];
      if (node.hasAnyDuePeriod) chips.push({ label: "Có kỳ báo cáo", color: "success" });
      if (node.hasOverduePeriod) chips.push({ label: "Có báo cáo chậm", color: "error" });

      next[node.id] = {
        kind: "assignment",
        eyebrow: node.code || node.dynamicFormTemplateCode || node.dynamicExcelCode,
        title: node.dynamicFormTemplateName || node.dynamicExcelName,
        subtitle: node.assignees?.length
          ? `Phụ trách: ${node.assignees[0].fullName || node.assignees[0].username}${node.assignees.length > 1 ? ` +${node.assignees.length - 1}` : ""}`
          : "Chưa có người phụ trách",
        chips,
        expanded: expandedNodeIds.includes(node.id),
        focused: focusedNodeId === node.id,
        loading: Boolean(loadingByNodeId[node.id]),
        assignment: node,
        assignmentBranch: assignmentBranchById[node.id] ?? null,
        statusAccent: statusColorEnabled ? chipColorToAccent(progressColor) : undefined,
        canOpenSummary: true,
        onExpandAssignmentBranch: handleExpandAssignmentBranch,
        onOpenSummary: handleOpenSummary,
      };
    });

    Object.entries(templateGroupsById).forEach(([id, group]) => {
      const userOptions = (templateUserIdsByTemplateId[id] ?? [])
        .map((userId) => templateUsersById[userId])
        .filter(Boolean);
      next[id] = {
        kind: "template",
        eyebrow: group.dynamicFormTemplateCode || group.dynamicExcelCode || "BIỂU MẪU",
        title: group.dynamicFormTemplateName || group.dynamicExcelName || "Biểu mẫu động",
        subtitle: "Nhóm báo cáo theo biểu mẫu. Chọn người dùng nếu cần lọc nhanh trên màn hình.",
        chips: [
          { label: `${group.userCount} người dùng`, color: "primary" },
          { label: `${group.reportCount} báo cáo`, color: "info" },
          ...(group.overdueCount > 0 ? [{ label: `${group.overdueCount} cham`, color: "error" as const }] : []),
        ],
        stackedBar: group.reportBar,
        expanded: expandedNodeIds.includes(id),
        loading: Boolean(loadingByNodeId[id]),
        userOptions,
        userOptionsLoaded: hasOwn(templateUserIdsByTemplateId, id),
        selectedUserIds: templateSelectedUserIdsById[id] ?? [],
        userSearchText: templateUserSearchTextById[id] ?? "",
        onSelectedUsersChange: (userIds) => {
          setTemplateSelectedUserIdsById((prev) => ({ ...prev, [id]: userIds }));
        },
        onUserSearchTextChange: (value) => handleUserSearchTextChange(id, value),
        onUserSearchFocus: () => {
          if (!hasOwn(templateUserIdsByTemplateId, id)) {
            void loadTemplateUsers(id, null, templateUserSearchTextById[id] ?? "", true);
          }
        },
        onToggleGeneric: () => void handleToggleTemplate(id),
      };
    });

    Object.entries(templateUsersById).forEach(([id, user]) => {
      const currentReportIds = reportIdsByUserNodeId[id] ?? [];
      next[id] = {
        kind: "user",
        eyebrow: user.unitLabel || "NGƯỜI DÙNG",
        title: user.assigneeFullName || user.assigneeUsername || user.assigneeUserId,
        subtitle: `Báo cáo gần nhất: ${formatDateOnly(user.latestDueAtUtc)}`,
        chips: [
          { label: `${user.totalReports} báo cáo`, color: "info" },
          ...(user.overdueCount > 0 ? [{ label: `${user.overdueCount} chậm`, color: "error" as const }] : []),
        ],
        stackedBar: user.reportBar,
        expanded: expandedNodeIds.includes(id),
        loading: Boolean(loadingByNodeId[id]),
        reportFilters: reportFiltersByUserNodeId[id] ?? DEFAULT_REPORT_FILTERS,
        reportStatusOptions: REPORT_STATUS_OPTIONS,
        canResetReports: currentReportIds.length > GRAPH_INITIAL_LIMIT,
        onReportFiltersChange: (filters) => handleReportFiltersChange(id, filters),
        onResetReports: () => handleResetUserReports(id),
        onStackedBarSegmentClick: (bucket) => {
          const filters: UserReportFilters = {
            ...(reportFiltersByUserNodeId[id] ?? DEFAULT_REPORT_FILTERS),
            statusBuckets: bucket === "ALL" ? [] : [bucket],
          };
          if (expandedNodeIds.includes(id)) {
            handleReportFiltersChange(id, filters);
          } else {
            setReportFiltersByUserNodeId((prev) => ({ ...prev, [id]: filters }));
            dispatch(toggleExpandedNode(id));
            void loadUserReports(id, null, filters, true);
          }
        },
        onToggleGeneric: () => void handleToggleUser(id),
      };
    });

    Object.entries(reportsById).forEach(([id, report]) => {
      next[id] = {
        kind: "report",
        eyebrow: report.periodKey || "BÁO CÁO",
        title: getMindMapReportPeriodStatusLabel(report.periodStatus),
        subtitle: reportText(report),
        chips: [
          { label: `Hạn ${formatDateOnly(report.dueAtUtc)}`, color: report.bucket === "OVERDUE" ? "error" : "default" },
          ...(report.reportStatus != null
            ? [{ label: getWorkAssignmentReportStatusLabel(report.reportStatus), color: "success" as const }]
            : []),
        ],
        statusAccent: statusColorEnabled ? reportBucketToAccent(report.bucket) : undefined,
      };
    });

    Object.values(graphChildrenByParentId).forEach((childIds) => {
      childIds
        .filter((id) => id.startsWith("load-more:"))
        .forEach((id) => {
          const parentId = id.replace("load-more:", "");
          next[id] = makeLoadMoreNode(parentId);
        });

      childIds
        .filter((id) => id.startsWith("empty:"))
        .forEach((id) => {
          next[id] = makeEmptyNode(id);
        });
    });

    return next;
  })();

  const detailOverlays = (
    <>
      <NodeSummaryPopover
        open={Boolean(summaryNodeId && summaryAnchorPosition)}
        nodeId={summaryNodeId}
        scope={EMPTY_SCOPE}
        anchorPosition={summaryAnchorPosition}
        onClose={handleCloseSummary}
        onOpenUnitBucket={(nodeId, bucket) => {
          dispatch(openUnitDrawer({ nodeId, bucket }));
          handleCloseSummary();
        }}
        onOpenReportBucket={(nodeId, bucket) => {
          dispatch(openReportDrawer({ nodeId, bucket }));
          handleCloseSummary();
        }}
        onOpenTableMetric={(nodeId, metric) => {
          handleOpenTableMetric(nodeId, metric);
          handleCloseSummary();
        }}
        onOpenFieldMetric={(nodeId, metric) => {
          handleOpenFieldMetric(nodeId, metric);
          handleCloseSummary();
        }}
        onOpenLabel={(nodeId, label) => {
          handleOpenLabel(nodeId, label);
          handleCloseSummary();
        }}
      />

      <UnitDrilldownDrawer
        key={`unit_${unitDrawer.nodeId ?? "none"}_${unitDrawer.bucket}`}
        open={unitDrawer.open}
        nodeId={unitDrawer.nodeId}
        bucket={unitDrawer.bucket}
        scope={EMPTY_SCOPE}
        onClose={() => dispatch(closeUnitDrawer())}
      />

      <ReportDrilldownDrawer
        key={`report_${reportDrawer.nodeId ?? "none"}_${reportDrawer.bucket}`}
        open={reportDrawer.open}
        nodeId={reportDrawer.nodeId}
        bucket={reportDrawer.bucket}
        scope={EMPTY_SCOPE}
        onClose={() => dispatch(closeReportDrawer())}
      />

      <TableMetricDrilldownDrawer
        key={`table_metric_${tableMetricDrawer.nodeId ?? "none"}_${tableMetricDrawer.metric?.metricKey ?? "none"}`}
        open={tableMetricDrawer.open}
        nodeId={tableMetricDrawer.nodeId}
        metric={tableMetricDrawer.metric}
        scope={EMPTY_SCOPE}
        onClose={handleCloseTableMetric}
      />

      <FieldMetricDrilldownDrawer
        key={`field_metric_${fieldMetricDrawer.nodeId ?? "none"}_${fieldMetricDrawer.metric?.fieldId ?? "none"}_${fieldMetricDrawer.metric?.bucketKey ?? "value"}`}
        open={fieldMetricDrawer.open}
        nodeId={fieldMetricDrawer.nodeId}
        metric={fieldMetricDrawer.metric}
        scope={EMPTY_SCOPE}
        onClose={handleCloseFieldMetric}
      />

      <LabelDrilldownDrawer
        key={`label_${labelDrawer.nodeId ?? "none"}_${labelDrawer.label?.labelCode ?? "none"}`}
        open={labelDrawer.open}
        nodeId={labelDrawer.nodeId}
        label={labelDrawer.label}
        scope={EMPTY_SCOPE}
        onClose={handleCloseLabel}
      />
    </>
  );

  if (canvasOnly) {
    return (
      <Box sx={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
        {workTreeError ? (
          <Alert
            severity="error"
            sx={{ position: "absolute", zIndex: 20, top: 16, left: 16, maxWidth: 560 }}
          >
            {getErrorMessage(workTreeError, "Không tải được dữ liệu sơ đồ công việc.")}
          </Alert>
        ) : null}

        {graphError ? (
          <Alert
            severity="warning"
            sx={{ position: "absolute", zIndex: 20, top: workTreeError ? 76 : 16, left: 16, maxWidth: 560 }}
          >
            {graphError}
          </Alert>
        ) : null}

        <MindMapCanvas
          loading={Boolean(selectedWorkId) && workTreeLoading && !workTreeData}
          graphNodesById={graphNodesById}
          rootIds={currentWorkNodeId && workTreeData?.work ? [currentWorkNodeId] : []}
          childrenByParentId={graphChildrenByParentId}
          expandedNodeIds={expandedNodeIds}
          viewport={viewport as Viewport}
          onViewportChange={(nextViewport) => dispatch(setViewport(nextViewport))}
          onReady={(instance) => {
            setFlowInstance(instance);
          }}
          emptyTitle={selectedWorkId ? "Chưa tải được đầu việc" : "Chọn công việc để mở sơ đồ"}
          emptyDescription="Sơ đồ bắt đầu từ đầu việc, sau đó mở các công việc đầu vào và nhánh báo cáo khi bấm vào từng mục."
          onRetry={() => {
            if (selectedWorkId) {
              void refetchWorkTree();
            }
          }}
          fullScreen
          edgeToEdge
          statusColorEnabled={statusColorEnabled}
          onStatusColorEnabledChange={setStatusColorEnabled}
        />

        {detailOverlays}
      </Box>
    );
  }

  return (
    <Stack spacing={2.5}>
      <WorkMindMapToolbar
        workType={effectiveWorkType}
        selectedWork={selectedWork}
        workOptions={workOptions}
        workSearchText={workSearchText}
        visibleNodeCount={visibleNodeCount}
        rootCount={rootAssignmentIds.length}
        loadingWorks={worksLoading}
        onWorkTypeChange={(nextType) => {
          startTransition(() => {
            dispatch(setSelectedWorkType(nextType));
            dispatch(setSelectedWork(""));
            if (!embedded) {
              navigate("/dashboard");
            }
          });
          setWorkSearchText("");
        }}
        onWorkSearchTextChange={setWorkSearchText}
        onWorkChange={(work) => {
          startTransition(() => {
            dispatch(setSelectedWork(work?.id ?? ""));
            if (!embedded) {
              navigate("/dashboard");
            }
          });
        }}
        onFitView={handleFitView}
        onCollapseAll={handleCollapseAll}
        onResetWork={handleResetWork}
      />

      {workTreeError ? (
        <Alert severity="error">
          {getErrorMessage(workTreeError, "Không tải được dữ liệu sơ đồ công việc.")}
        </Alert>
      ) : null}

      {graphError ? <Alert severity="warning">{graphError}</Alert> : null}

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 4,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
        }}
      >
        <Stack spacing={2}>
          {selectedWork && workTreeData ? (
            <Stack
              direction={{ xs: "column", lg: "row" }}
              justifyContent="space-between"
              spacing={1.2}
            >
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  {workTreeData.work.code} - {workTreeData.work.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                  Đầu việc là mục gốc. Công việc đầu vào đã tải {rootAssignmentIds.length}/
                  {workTreeData.rootAssignments.totalRows}. Giới hạn hiển thị {MAX_VISIBLE_NODE_COUNT} mục.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  color={getMindMapWorkStatusChipColor(workTreeData.work)}
                  label={getMindMapWorkStatusLabel(workTreeData.work)}
                />
                <Chip variant="outlined" label={`${visibleNodeCount} mục đang hiển thị`} />
              </Stack>
            </Stack>
          ) : (
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Che do xem cay theo tung cap
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                Chọn một công việc ở phía trên để bắt đầu từ mục gốc, sau đó mở công việc đầu vào,
                công việc con hoặc báo cáo theo biểu mẫu.
              </Typography>
            </Box>
          )}

          <MindMapCanvas
            loading={Boolean(selectedWorkId) && workTreeLoading && !workTreeData}
            graphNodesById={graphNodesById}
            rootIds={currentWorkNodeId && workTreeData?.work ? [currentWorkNodeId] : []}
            childrenByParentId={graphChildrenByParentId}
            expandedNodeIds={expandedNodeIds}
            viewport={viewport as Viewport}
            onViewportChange={(nextViewport) => dispatch(setViewport(nextViewport))}
            onReady={(instance) => {
              setFlowInstance(instance);
            }}
            emptyTitle={selectedWorkId ? "Chưa tải được đầu việc" : "Chọn công việc để mở sơ đồ"}
            emptyDescription="Sơ đồ bắt đầu từ đầu việc, sau đó mở các công việc đầu vào và nhánh báo cáo khi bấm vào từng mục."
            onRetry={() => {
              if (selectedWorkId) {
                void refetchWorkTree();
              }
            }}
            fullScreen={embedded}
            statusColorEnabled={statusColorEnabled}
            onStatusColorEnabledChange={setStatusColorEnabled}
          />
        </Stack>
      </Paper>

      {detailOverlays}
    </Stack>
  );
}
