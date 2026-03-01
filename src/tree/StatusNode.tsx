import { Handle, Position, type NodeProps } from "reactflow";
import { type NodeData, statusColor, statusLabel } from "./treeMock";

export default function StatusNode(props: NodeProps<NodeData>) {
  const { data } = props;
  const c = statusColor(data.status);

  return (
    <div className="node-card">
      <div className="node-topbar" style={{ background: c }} />
      <div className="node-body">
        <div className="node-title">{data.title}</div>

        <div className="node-meta">
          <span className="badge">
            <span className="dot" style={{ background: c }} />
            {statusLabel(data.status)}
          </span>
          <span className="badge">👤 {data.assignee}</span>
        </div>
      </div>

      {/* cổng nối */}
      <Handle type="target" position={Position.Left} style={{ opacity: 0.6 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0.6 }} />
    </div>
  );
}
