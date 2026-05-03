import { memo } from "react";
import { Box, Chip, IconButton, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import { Handle, Position, type NodeProps } from "reactflow";

import type { DashboardMindMapNodeDto } from "../../../types/dashboardMindMap";
import {
  formatDateOnly,
  getAssigneeLabel,
  getProgressStatusChipColor,
  getProgressStatusLabel,
} from "../../../utils/dashboardUi";

export type SummaryAnchorPosition = {
  left: number;
  top: number;
};

export type AssignmentMindNodeData = {
  node: DashboardMindMapNodeDto;
  expanded: boolean;
  isFocused: boolean;
  loadingChildren: boolean;
  hiddenChildCount: number;
  canLoadMoreChildren: boolean;
  onToggleExpand: (node: DashboardMindMapNodeDto) => void;
  onLoadMoreChildren: (node: DashboardMindMapNodeDto) => void;
  onOpenSummary: (node: DashboardMindMapNodeDto, anchorPosition: SummaryAnchorPosition) => void;
};

function AssignmentMindNodeComponent(props: NodeProps<AssignmentMindNodeData>) {
  const { data } = props;
  const {
    node,
    expanded,
    isFocused,
    loadingChildren,
    hiddenChildCount,
    canLoadMoreChildren,
    onToggleExpand,
    onLoadMoreChildren,
    onOpenSummary,
  } = data;

  const openSummary = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    onOpenSummary(node, {
      left: rect.right + 12,
      top: rect.top + rect.height / 2,
    });
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 8, height: 8, background: "#cbd5e1", border: 0 }}
      />

      <Box
        onClick={(event) => openSummary(event.currentTarget)}
        sx={{
          width: 320,
          borderRadius: 4,
          border: "1px solid",
          borderColor: isFocused ? "primary.main" : "rgba(148,163,184,0.35)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
          boxShadow: isFocused
            ? "0 24px 60px rgba(37,99,235,0.14)"
            : "0 20px 46px rgba(15,23,42,0.08)",
          p: 1.5,
          cursor: "pointer",
          transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 26px 58px rgba(15,23,42,0.12)",
            borderColor: "rgba(59,130,246,0.45)",
          },
        }}
      >
        <Stack spacing={1.2}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {node.code || node.dynamicExcelCode}
              </Typography>
              <Typography
                variant="subtitle2"
                fontWeight={800}
                sx={{
                  mt: 0.35,
                  lineHeight: 1.35,
                  display: "-webkit-box",
                  overflow: "hidden",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {node.dynamicExcelName}
              </Typography>
            </Box>

            <Stack direction="row" spacing={0.5} alignItems="flex-start">
              {node.hasChildren ? (
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleExpand(node);
                  }}
                  sx={{
                    border: "1px solid rgba(148,163,184,0.3)",
                    bgcolor: expanded ? "rgba(37,99,235,0.08)" : "white",
                  }}
                >
                  {expanded ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                </IconButton>
              ) : null}

              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  openSummary(event.currentTarget);
                }}
                sx={{ border: "1px solid rgba(148,163,184,0.3)", bgcolor: "white" }}
              >
                <LaunchRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              color={getProgressStatusChipColor(node.progressStatus)}
              label={getProgressStatusLabel(node.progressStatus)}
            />
            {node.hasOverduePeriod ? (
              <Chip size="small" color="error" variant="outlined" label="Co report cham muon" />
            ) : null}
            {node.manualEvaluation?.hasManualEvaluations ? (
              <Chip size="small" color="warning" variant="outlined" label="Co danh gia tay" />
            ) : null}
          </Stack>

          <Stack direction="row" spacing={1.2}>
            <Stack direction="row" spacing={0.6} alignItems="center" minWidth={0}>
              <Groups2OutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {node.assignees.length > 0
                  ? getAssigneeLabel(node.assignees[0])
                  : "Chua co nguoi phu trach"}
                {node.assignees.length > 1 ? ` +${node.assignees.length - 1}` : ""}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.6} alignItems="center">
              <ScheduleOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                Han {formatDateOnly(node.latestDueAtUtc)}
              </Typography>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              variant="outlined"
              label={`${node.activeChildCount} nhanh con`}
              color={node.activeChildCount > 0 ? "primary" : "default"}
            />
            <Chip
              size="small"
              variant="outlined"
              label={node.hasAnyDuePeriod ? "Co ky bao cao" : "Chua co ky bao cao"}
              color={node.hasAnyDuePeriod ? "success" : "default"}
            />
            {loadingChildren ? (
              <Chip size="small" label="Dang tai nhanh..." />
            ) : canLoadMoreChildren ? (
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label={`Tai them ${hiddenChildCount} nhanh`}
                onClick={(event) => {
                  event.stopPropagation();
                  onLoadMoreChildren(node);
                }}
              />
            ) : hiddenChildCount > 0 ? (
              <Chip size="small" color="warning" variant="outlined" label={`Con ${hiddenChildCount} nhanh an`} />
            ) : null}
          </Stack>
        </Stack>
      </Box>

      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 8, height: 8, background: "#94a3b8", border: 0 }}
      />
    </>
  );
}

const AssignmentMindNode = memo(AssignmentMindNodeComponent);

export default AssignmentMindNode;
