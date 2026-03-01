import React, { useCallback, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap, type Node, type Edge, useReactFlow } from "reactflow";
import "reactflow/dist/style.css";

import StatusNode from "./StatusNode";
import { type NodeData, statusColor, statusLabel } from "./treeMock";
import { Dialog, DialogContent, DialogTitle, Divider, Stack, Typography, Button } from "@mui/material";

type TreeFlowProps = {
  nodes: Node<NodeData>[];
  edges: Edge[];
  onNodeSelect?: (node: Node<NodeData>) => void;
  height?: number | string; // để nhét vào layout dễ
};

const nodeTypes = { statusNode: StatusNode };

export default function TreeFlow({ nodes, edges, onNodeSelect, height = "calc(100vh - 120px)" }: TreeFlowProps) {
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Node<NodeData> | null>(null);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<NodeData>) => {
      setSelected(node);
      setOpen(true);
      onNodeSelect?.(node);

      setCenter(node.position.x + 110, node.position.y, { zoom: 1.1, duration: 250 });
    },
    [onNodeSelect, setCenter]
  );

  const legendItems = useMemo(
    () => (["TODO", "IN_PROGRESS", "BLOCKED", "REVIEW", "DONE"] as const).map((s) => ({ s })),
    []
  );

  return (
    <div style={{ position: "relative", height }} className="rf-wrap">
      {/* toolbar mini */}
      <div className="toolbar">
        <button className="btn" onClick={() => zoomIn({ duration: 200 })}>＋ Zoom in</button>
        <button className="btn" onClick={() => zoomOut({ duration: 200 })}>－ Zoom out</button>
        <button className="btn" onClick={() => fitView({ padding: 0.2, duration: 250 })}>Fit</button>

        <div className="legend">
          {legendItems.map((it) => (
            <span key={it.s} className="badge">
              <span className="dot" style={{ background: statusColor(it.s) }} />
              {statusLabel(it.s)}
            </span>
          ))}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.2}
        maxZoom={2.2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap nodeStrokeWidth={3} nodeColor={(n) => statusColor((n.data as NodeData).status)} />
      </ReactFlow>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chi tiết node {selected?.id ? `(${selected.id})` : ""}</DialogTitle>
        <DialogContent>
          {selected && (
            <Stack spacing={1.2}>
              <Typography fontWeight={800}>{selected.data.title}</Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: statusColor(selected.data.status),
                    color: statusColor(selected.data.status),
                    fontWeight: 700,
                  }}
                >
                  {statusLabel(selected.data.status)}
                </Button>
                <Button size="small" variant="outlined" sx={{ fontWeight: 700 }}>
                  👤 {selected.data.assignee}
                </Button>
              </Stack>

              <Divider />

              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {selected.data.description}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Cập nhật: {selected.data.updatedAt}
              </Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
