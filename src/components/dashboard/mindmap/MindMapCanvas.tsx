import { useMemo, useState } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  type Edge,
  type Node,
  type ReactFlowInstance,
  type Viewport,
} from "reactflow";
import "reactflow/dist/style.css";

import MindMapEmptyState from "./MindMapEmptyState";
import MindMapGraphNode, { type MindMapGraphNodeData } from "./MindMapGraphNode";
import MindMapLegend from "./MindMapLegend";

type MindMapCanvasProps = {
  loading?: boolean;
  graphNodesById: Record<string, MindMapGraphNodeData>;
  rootIds: string[];
  childrenByParentId: Record<string, string[]>;
  expandedNodeIds: string[];
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  onReady?: (instance: ReactFlowInstance) => void;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  fullScreen?: boolean;
  edgeToEdge?: boolean;
  statusColorEnabled?: boolean;
  onStatusColorEnabledChange?: (enabled: boolean) => void;
};

const CARD_WIDTH = 340;
const CARD_HEIGHT = 205;
const COLUMN_GAP = 135;
const ROW_GAP = 38;

const nodeTypes = {
  mindMapGraphNode: MindMapGraphNode,
};

export default function MindMapCanvas(props: MindMapCanvasProps) {
  const {
    loading = false,
    graphNodesById,
    rootIds,
    childrenByParentId,
    expandedNodeIds,
    viewport,
    onViewportChange,
    onReady,
    onRetry,
    emptyTitle = "Chon work de mo mind map",
    emptyDescription = "Chon mot work o phia tren de bat dau xem cay assignment root.",
    fullScreen = false,
    edgeToEdge = false,
    statusColorEnabled = false,
    onStatusColorEnabledChange,
  } = props;
  const [legendOpen, setLegendOpen] = useState(false);

  const canvasHeight = edgeToEdge ? "100vh" : fullScreen ? "calc(100vh - 260px)" : "72vh";
  const canvasMinHeight = edgeToEdge ? "100vh" : fullScreen ? 620 : 560;

  const expandedSet = useMemo(() => new Set(expandedNodeIds), [expandedNodeIds]);

  const graph = useMemo(() => {
    const flowNodes: Node<MindMapGraphNodeData>[] = [];
    const flowEdges: Edge[] = [];

    const getVisibleChildren = (nodeId: string) => {
      return expandedSet.has(nodeId) ? childrenByParentId[nodeId] ?? [] : [];
    };

    const measureHeight = (nodeId: string): number => {
      const children = getVisibleChildren(nodeId);
      if (children.length === 0) return CARD_HEIGHT;

      const childrenHeight = children.reduce((sum, childId, index) => {
        const childHeight = measureHeight(childId);
        return sum + childHeight + (index === 0 ? 0 : ROW_GAP);
      }, 0);

      return Math.max(CARD_HEIGHT, childrenHeight);
    };

    const placeNode = (nodeId: string, level: number, top: number) => {
      const node = graphNodesById[nodeId];
      if (!node) return;

      const subtreeHeight = measureHeight(nodeId);
      const y = top + subtreeHeight / 2 - CARD_HEIGHT / 2;
      const childIds = getVisibleChildren(nodeId);

      flowNodes.push({
        id: nodeId,
        type: "mindMapGraphNode",
        position: {
          x: level * (CARD_WIDTH + COLUMN_GAP),
          y,
        },
        data: node,
        draggable: false,
      });

      let cursorTop = top;
      childIds.forEach((childId, index) => {
        const childHeight = measureHeight(childId);
        placeNode(childId, level + 1, cursorTop);
        flowEdges.push({
          id: `${nodeId}_${childId}`,
          source: nodeId,
          target: childId,
          animated: false,
          style: {
            stroke: "#94a3b8",
            strokeWidth: 1.35,
          },
        });
        cursorTop += childHeight + (index === childIds.length - 1 ? 0 : ROW_GAP);
      });
    };

    let rootTop = 20;
    rootIds.forEach((rootId, index) => {
      const rootHeight = measureHeight(rootId);
      placeNode(rootId, 0, rootTop);
      rootTop += rootHeight + (index === rootIds.length - 1 ? 0 : ROW_GAP * 2);
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [childrenByParentId, expandedSet, graphNodesById, rootIds]);

  if (loading && rootIds.length === 0) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={1.25}
        sx={{
          minHeight: canvasMinHeight,
          borderRadius: edgeToEdge ? 0 : 4,
          border: "1px dashed",
          borderColor: "divider",
          background:
            "radial-gradient(circle at top, rgba(15,23,42,0.04), rgba(255,255,255,0) 55%)",
        }}
      >
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary">
          Dang tai cay mind map...
        </Typography>
      </Stack>
    );
  }

  if (!loading && rootIds.length === 0) {
    return (
      <MindMapEmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={onRetry ? "Tai lai" : undefined}
        onAction={onRetry}
      />
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        height: canvasHeight,
        minHeight: canvasMinHeight,
        borderRadius: edgeToEdge ? 0 : 4,
        overflow: "hidden",
        background:
          "radial-gradient(circle at top, rgba(148,163,184,0.16), rgba(255,255,255,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
      }}
    >
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.28}
        maxZoom={1.45}
        defaultViewport={viewport}
        onMoveEnd={(_event, currentViewport) => onViewportChange(currentViewport)}
        onInit={onReady}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.2}
          color="rgba(148,163,184,0.32)"
        />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={2}
          nodeColor={() => "#dbeafe"}
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(148,163,184,0.25)",
          }}
        />
        <Controls
          showInteractive={false}
          style={{
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.2)",
            overflow: "hidden",
          }}
        />
        <Panel position="top-right">
          {legendOpen ? (
            <MindMapLegend
              statusColorEnabled={statusColorEnabled}
              onStatusColorEnabledChange={(enabled) => onStatusColorEnabledChange?.(enabled)}
            />
          ) : (
            <Button
              size="small"
              variant="contained"
              onClick={() => setLegendOpen(true)}
              sx={{
                borderRadius: 999,
                bgcolor: "rgba(15,23,42,0.88)",
                backdropFilter: "blur(10px)",
                "&:hover": { bgcolor: "rgba(15,23,42,0.96)" },
              }}
            >
              Hien legend
            </Button>
          )}
          {legendOpen ? (
            <Button
              size="small"
              variant="text"
              onClick={() => setLegendOpen(false)}
              sx={{ mt: 0.6, bgcolor: "rgba(255,255,255,0.78)" }}
            >
              An legend
            </Button>
          ) : null}
        </Panel>
        <Panel position="top-left">
          <Stack
            spacing={0.4}
            sx={{
              px: 1.2,
              py: 0.9,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(148,163,184,0.25)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Typography variant="caption" fontWeight={800}>
              Mind map canvas
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Work la node goc. Mo tung nhanh de tranh tai API lon.
            </Typography>
          </Stack>
        </Panel>
      </ReactFlow>

      {loading ? (
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={1}
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(255,255,255,0.62)",
            backdropFilter: "blur(6px)",
          }}
        >
          <CircularProgress size={30} />
          <Typography variant="body2" color="text.secondary">
            Dang cap nhat canvas...
          </Typography>
        </Stack>
      ) : null}
    </Box>
  );
}
