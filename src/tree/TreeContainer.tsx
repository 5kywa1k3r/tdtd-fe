import React, { useMemo } from "react";
import { type Node, type Edge } from "reactflow";
import TreeFlow from "./TreeFlow";
import { type NodeData, buildDenseTreeMock } from "./treeMock";

export default function TreeFlowContainer() {
  const { nodes: mockNodes, edges: mockEdges } = useMemo(() => buildDenseTreeMock(), []);

  const nodes: Node<NodeData>[] = useMemo(
    () =>
      mockNodes.map((n) => ({
        id: n.id,
        position: { x: n.x, y: n.y },
        type: "statusNode",
        data: n.data,
      })),
    [mockNodes]
  );

  const edges: Edge[] = useMemo(
    () =>
      mockEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        style: { strokeWidth: 2 },
      })),
    [mockEdges]
  );

  return <TreeFlow nodes={nodes} edges={edges} />;
}
