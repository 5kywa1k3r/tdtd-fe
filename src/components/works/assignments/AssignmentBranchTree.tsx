import React from "react";
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";

import type { WorkAssignmentListResponse } from "../../../types/workAssignment";
import type { AssignmentTableRow } from "./WorkAssignmentTable";

const ACTIVE_BG = "rgba(37, 99, 235, 0.10)";
const ACTIVE_BORDER = "rgba(37, 99, 235, 0.28)";
const HOVER_BG = "rgba(37, 99, 235, 0.08)";
const MAX_TREE_DEPTH = 32;

export function toAssignmentRow(x: WorkAssignmentListResponse): AssignmentTableRow {
  return {
    id: String(x?.id ?? ""),
    name: x?.name ?? null,
    code: x?.code ?? null,
    flowTemplateId: x?.flowTemplateId ?? null,
    flowTemplateVersionNo: x?.flowTemplateVersionNo ?? null,
    flowInstanceId: x?.flowInstanceId ?? null,
    flowStepId: x?.flowStepId ?? null,
    flowStepCode: x?.flowStepCode ?? null,
    flowStepOrder: x?.flowStepOrder ?? null,
    flowBranchId: x?.flowBranchId ?? null,
    parentFlowBranchId: x?.parentFlowBranchId ?? null,
    flowAttemptNo: x?.flowAttemptNo ?? null,
    flowRole: x?.flowRole ?? null,
    flowEffectiveStatus: x?.flowEffectiveStatus ?? null,
    issuedByUnitId: x?.issuedByUnitId ?? null,
    targetUnitIds: x?.targetUnitIds ?? null,
    allowSubFlow: x?.allowSubFlow ?? null,
    isFlowFinalNode: x?.isFlowFinalNode ?? null,
    invalidatedByFlowEventId: x?.invalidatedByFlowEventId ?? null,
    dynamicExcelId: x?.dynamicExcelId ?? null,
    dynamicExcelCode: x?.dynamicExcelCode ?? null,
    dynamicExcelName: x?.dynamicExcelName ?? null,
    dynamicFormTemplateId: x?.dynamicFormTemplateId ?? null,
    dynamicFormTemplateCode: x?.dynamicFormTemplateCode ?? null,
    dynamicFormTemplateName: x?.dynamicFormTemplateName ?? null,
    dynamicFormDataSourceRulesJson: x?.dynamicFormDataSourceRulesJson ?? null,
    autoApproveConditionJson: x?.autoApproveConditionJson ?? null,
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
    startDate: x?.startDate ?? null,
    dueDate: x?.dueDate ?? null,
    completedDate: x?.completedDate ?? null,
    completedAtUtc: x?.completedAtUtc ?? null,
    completedByUserId: x?.completedByUserId ?? null,
    evaluationTemplateId: x?.evaluationTemplateId ?? null,
    evaluationTemplateCode: x?.evaluationTemplateCode ?? null,
    evaluationTemplateLabel: x?.evaluationTemplateLabel ?? null,
    evaluationCode: x?.evaluationCode ?? null,
    evaluationLabel: x?.evaluationLabel ?? null,
    evaluatedAssignmentCount: x?.evaluatedAssignmentCount ?? 0,
    worstEvaluationCode: x?.worstEvaluationCode ?? null,
    worstEvaluationLabel: x?.worstEvaluationLabel ?? null,
    dueAtUtc: x?.dueAtUtc ?? null,
    parentAssignmentId: x?.parentAssignmentId ?? null,
    rootAssignmentId: x?.rootAssignmentId ?? null,
    level: x?.level ?? null,
    path: x?.path ?? null,
  };
}

export function getAssignmentLabel(row?: AssignmentTableRow | null) {
  if (!row) return "";
  const name = row.name?.trim() || row.dynamicFormTemplateName?.trim() || row.dynamicExcelName?.trim();
  return name || row.id;
}

export function getAssignmentDisplayName(row?: AssignmentTableRow | null) {
  if (!row) return "";
  return row.name?.trim() || row.dynamicFormTemplateName?.trim() || row.dynamicExcelName?.trim() || row.id;
}

export function getEntryAssignmentRows(rows: AssignmentTableRow[]) {
  const visibleIds = new Set(rows.map((row) => row.id).filter(Boolean));
  return rows.filter((row) => {
    const parentId = row.parentAssignmentId?.trim();
    return !parentId || !visibleIds.has(parentId);
  });
}

export function getAssignmentScopeIds(
  selected: AssignmentTableRow | null | undefined,
  rows: AssignmentTableRow[]
) {
  if (!selected?.id) return [];
  const selectedPath = selected.path?.trim();

  return rows
    .filter((row) => {
      if (!row.id) return false;
      if (row.id === selected.id) return true;
      if (!selectedPath) return false;
      const rowPath = row.path?.trim();
      return Boolean(rowPath && rowPath.startsWith(`${selectedPath}/`));
    })
    .map((row) => row.id)
    .filter((id, index, arr) => arr.indexOf(id) === index);
}

export function findAssignmentPath(
  targetId: string,
  roots: AssignmentTableRow[],
  childrenByParentId: Record<string, AssignmentTableRow[]>
): AssignmentTableRow[] | null {
  const normalizedTargetId = targetId.trim();
  if (!normalizedTargetId) return null;

  const visit = (
    node: AssignmentTableRow,
    path: AssignmentTableRow[],
    seen: Set<string>
  ): AssignmentTableRow[] | null => {
    const nodeId = node.id?.trim();
    if (!nodeId || seen.has(nodeId) || path.length > MAX_TREE_DEPTH) return null;

    const nextPath = [...path, node];
    if (nodeId === normalizedTargetId) return nextPath;

    const nextSeen = new Set(seen);
    nextSeen.add(nodeId);
    const children = childrenByParentId[nodeId] ?? [];

    for (const child of children) {
      const found = visit(child, nextPath, nextSeen);
      if (found) return found;
    }

    return null;
  };

  for (const root of roots) {
    const found = visit(root, [], new Set<string>());
    if (found) return found;
  }

  return null;
}

type AssignmentBranchTreeProps = {
  rootRows: AssignmentTableRow[];
  childrenByParentId: Record<string, AssignmentTableRow[]>;
  activeId: string | null;
  pathIds: string[];
  collapsed?: boolean;
  loading?: boolean;
  error?: boolean;
  onToggleCollapsed?: () => void;
  onSelectRoot: () => void;
  onSelectNode: (id: string) => void;
};

export default function AssignmentBranchTree({
  rootRows,
  childrenByParentId,
  activeId,
  pathIds,
  collapsed = false,
  loading = false,
  error = false,
  onToggleCollapsed,
  onSelectRoot,
  onSelectNode,
}: AssignmentBranchTreeProps) {
  const renderNode = (
    row: AssignmentTableRow,
    depth: number,
    ancestors: Set<string>
  ): React.ReactNode => {
    const rowId = row.id?.trim();
    if (!rowId || ancestors.has(rowId) || depth > MAX_TREE_DEPTH) return null;

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(rowId);
    const isActive = rowId === activeId;
    const children = (childrenByParentId[rowId] ?? []).filter((child) => {
      const childId = child.id?.trim();
      return Boolean(childId && childId !== rowId && !nextAncestors.has(childId));
    });
    const expanded = pathIds.includes(rowId);

    return (
      <Box key={rowId}>
        <Box
          role="button"
          tabIndex={0}
          onClick={() => onSelectNode(rowId)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onSelectNode(rowId);
          }}
          sx={{
            ml: depth * 1.5,
            px: 1,
            py: 0.8,
            borderRadius: "8px",
            cursor: "pointer",
            bgcolor: isActive ? ACTIVE_BG : "transparent",
            border: "1px solid",
            borderColor: isActive ? ACTIVE_BORDER : "transparent",
            "&:hover": { bgcolor: HOVER_BG },
          }}
        >
          <Stack spacing={0.45} sx={{ minWidth: 0 }}>
            <Chip
              size="small"
              variant={isActive ? "filled" : "outlined"}
              color={isActive ? "primary" : "default"}
              label={row.code || "Chưa có mã"}
              sx={{ width: "fit-content", maxWidth: "100%" }}
            />
            <Typography variant="caption" sx={{ fontWeight: isActive ? 800 : 600 }} noWrap>
              {getAssignmentDisplayName(row)}
            </Typography>
          </Stack>
        </Box>
        {expanded && children.length > 0 ? (
          <Stack spacing={0.4} sx={{ mt: 0.4 }}>
            {children.map((child) => renderNode(child, depth + 1, nextAncestors))}
          </Stack>
        ) : null}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: { xs: collapsed ? 44 : "100%", xl: collapsed ? 44 : 292 },
        flex: { xs: "0 0 auto", xl: collapsed ? "0 0 44px" : "0 0 292px" },
        alignSelf: { xs: collapsed ? "flex-end" : "stretch", xl: "stretch" },
        maxHeight: { xs: collapsed ? 44 : 280, xl: collapsed ? 44 : "100%" },
        minHeight: 0,
        overflow: "hidden",
        border: "1px solid #dbe4f0",
        borderRadius: "8px",
        bgcolor: "#fff",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
        p: collapsed ? 0.5 : 1,
        transition: (theme) =>
          theme.transitions.create(["width", "flex-basis", "max-height", "padding", "box-shadow"], {
            duration: 220,
            easing: theme.transitions.easing.easeInOut,
          }),
      }}
    >
      <Stack spacing={collapsed ? 0 : 0.8}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={collapsed ? "center" : "space-between"}
          spacing={1}
          sx={{ minWidth: 0 }}
        >
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{
              minWidth: 0,
              width: collapsed ? 0 : "auto",
              overflow: "hidden",
              opacity: collapsed ? 0 : 1,
              transform: collapsed ? "translateX(10px)" : "translateX(0)",
              transition: (theme) =>
                theme.transitions.create(["opacity", "transform", "width"], {
                  duration: 180,
                  easing: theme.transitions.easing.easeInOut,
                }),
              pointerEvents: collapsed ? "none" : "auto",
            }}
          >
            <AccountTreeOutlinedIcon sx={{ fontSize: 18, color: "#0f5bd8" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 850, color: "#0f172a" }} noWrap>
              Nhánh công việc
            </Typography>
          </Stack>
          <Tooltip title={collapsed ? "Hiện cây nhánh" : "Ẩn cây nhánh"}>
            <IconButton size="small" onClick={onToggleCollapsed}>
              {collapsed ? (
                <ChevronLeftOutlinedIcon fontSize="small" />
              ) : (
                <ChevronRightOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Stack>

        <Box
          sx={{
            minWidth: 270,
            overflow: "auto",
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? "translateX(16px)" : "translateX(0)",
            pointerEvents: collapsed ? "none" : "auto",
            transition: (theme) =>
              theme.transitions.create(["opacity", "transform"], {
                duration: 190,
                easing: theme.transitions.easing.easeInOut,
              }),
          }}
        >
          <Stack spacing={0.8}>
        {error ? (
          <Typography variant="caption" color="error">
            Không tải được một phần cây nhánh.
          </Typography>
        ) : null}

        <Box
          role="button"
          tabIndex={0}
          onClick={onSelectRoot}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onSelectRoot();
          }}
          sx={{
            px: 1,
            py: 0.8,
            borderRadius: "8px",
            cursor: "pointer",
            bgcolor: activeId ? "transparent" : ACTIVE_BG,
            border: "1px solid",
            borderColor: activeId ? "transparent" : ACTIVE_BORDER,
            "&:hover": { bgcolor: HOVER_BG },
          }}
        >
          <Stack spacing={0.45}>
            <Chip
              size="small"
              color={activeId ? "default" : "primary"}
              variant={activeId ? "outlined" : "filled"}
              label="WORK"
              sx={{ width: "fit-content" }}
            />
            <Typography variant="caption" sx={{ fontWeight: activeId ? 600 : 800 }} noWrap>
              Danh sách giao việc
            </Typography>
          </Stack>
        </Box>

        {rootRows.map((row) => renderNode(row, 0, new Set<string>()))}

        {loading ? (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ px: 1, py: 0.75 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">
              Đang tải nhánh...
            </Typography>
          </Stack>
        ) : null}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
