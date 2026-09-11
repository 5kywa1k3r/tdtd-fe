import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import type {
  FlowActorRole,
  FlowDefinitionNodeV2,
  FlowDefinitionPayloadV2,
  FlowGatewayKindV2,
} from "../../api/dynamicFlowTemplateApi";
import { DynamicFlowJsonEditor } from "./DynamicFlowJsonEditor";

const ACTOR_ROLES: FlowActorRole[] = [
  "ISSUER",
  "ASSIGNEE",
  "COORDINATOR",
  "REVIEWER",
  "FINALIZER",
];

const GATEWAY_KINDS: FlowGatewayKindV2[] = [
  "FORK",
  "JOIN_ALL",
  "JOIN_ANY",
  "JOIN_N_OF_M",
  "CONDITION",
  "REVIEW",
  "SUBFLOW",
  "SCHEDULE",
  "ROLLBACK_FINALIZE",
];

type Props = {
  payload: FlowDefinitionPayloadV2;
  readOnly: boolean;
  onChange: (payload: FlowDefinitionPayloadV2) => void;
  onEditorValidityChange: (editorId: string, valid: boolean) => void;
  onRawDirtyChange: (editorId: string, dirty: boolean) => void;
  rawText?: string;
  onRawTextChange: (editorId: string, text: string | null) => void;
};

function nextIdentity(prefix: string, existing: Iterable<string>) {
  const used = new Set(existing);
  let number = used.size + 1;
  while (used.has(`${prefix}-${number}`)) number += 1;
  return `${prefix}-${number}`;
}

function graphLayout(payload: FlowDefinitionPayloadV2) {
  const nodeById = new Map(payload.nodes.map((node) => [node.nodeId, node]));
  const incoming = new Map(payload.nodes.map((node) => [node.nodeId, 0]));
  const children = new Map<string, string[]>();
  payload.edges.forEach((edge) => {
    if (!nodeById.has(edge.fromNodeId) || !nodeById.has(edge.toNodeId)) return;
    incoming.set(edge.toNodeId, (incoming.get(edge.toNodeId) ?? 0) + 1);
    children.set(edge.fromNodeId, [...(children.get(edge.fromNodeId) ?? []), edge.toNodeId]);
  });

  const levels = new Map<string, number>();
  const queue = payload.nodes
    .filter((node) => (incoming.get(node.nodeId) ?? 0) === 0)
    .map((node) => node.nodeId);
  if (queue.length === 0 && payload.nodes[0]) queue.push(payload.nodes[0].nodeId);
  queue.forEach((id) => levels.set(id, 0));
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor];
    const nextLevel = (levels.get(id) ?? 0) + 1;
    (children.get(id) ?? []).forEach((childId) => {
      levels.set(childId, Math.max(levels.get(childId) ?? 0, nextLevel));
      incoming.set(childId, (incoming.get(childId) ?? 1) - 1);
      if (incoming.get(childId) === 0) queue.push(childId);
    });
  }

  const rowByLevel = new Map<number, number>();
  const flowNodes: Node[] = payload.nodes.map((node, index) => {
    const level = levels.get(node.nodeId) ?? Math.floor(index / 6);
    const row = rowByLevel.get(level) ?? 0;
    rowByLevel.set(level, row + 1);
    const color =
      node.nodeKind === "FORM_STEP" ? "#dbeafe" : node.nodeKind === "FINAL" ? "#dcfce7" : "#fef3c7";
    return {
      id: node.nodeId,
      position: { x: level * 300, y: row * 130 },
      data: {
        label: (
          <Box sx={{ py: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{node.nodeKind}</Typography>
            <Typography fontWeight={800}>{node.name || node.nodeCode}</Typography>
            <Typography variant="caption">{node.nodeCode}</Typography>
          </Box>
        ),
      },
      style: {
        width: 210,
        border: node.nodeId === payload.entryStepId ? "2px solid #2563eb" : "1px solid #94a3b8",
        borderRadius: 12,
        background: color,
      },
    };
  });
  const flowEdges: Edge[] = payload.edges.map((edge) => ({
    id: edge.transitionId,
    source: edge.fromNodeId,
    target: edge.toNodeId,
    label: edge.condition ? "Điều kiện" : undefined,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 1.5 },
  }));
  return { nodes: flowNodes, edges: flowEdges };
}

function makeGateway(kind: FlowGatewayKindV2) {
  return {
    kind,
    expectedIncomingNodeIds: [],
    requiredIncomingCount: null,
    reviewRole: null,
    subflowFamilyId: null,
    subflowVersionId: null,
    scheduleKey: null,
    rollbackTargetNodeId: null,
  };
}

export function DynamicFlowTopologyWorkspace({
  payload,
  readOnly,
  onChange,
  onEditorValidityChange,
  onRawDirtyChange,
  rawText,
  onRawTextChange,
}: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState(payload.entryStepId);
  const [edgeFrom, setEdgeFrom] = useState(payload.entryStepId);
  const [edgeTo, setEdgeTo] = useState("");
  const [showSemanticTable, setShowSemanticTable] = useState(true);
  const graph = useMemo(() => graphLayout(payload), [payload]);
  const selectedNode = payload.nodes.find((node) => node.nodeId === selectedNodeId) ?? null;

  const updateNode = (nodeId: string, patch: Partial<FlowDefinitionNodeV2>) => {
    onChange({
      ...payload,
      nodes: payload.nodes.map((node) =>
        node.nodeId === nodeId ? ({ ...node, ...patch } as FlowDefinitionNodeV2) : node,
      ),
    });
  };

  const addNode = (kind: "FORM_STEP" | "GATEWAY" | "FINAL") => {
    const nodeId = nextIdentity("node", payload.nodes.map((node) => node.nodeId));
    const nodeCode = nextIdentity("NODE", payload.nodes.map((node) => node.nodeCode));
    let node: FlowDefinitionNodeV2;
    if (kind === "FORM_STEP") {
      node = {
        nodeId,
        nodeCode,
        nodeKind: "FORM_STEP",
        name: "Bước biểu mẫu mới",
        formNodeId: payload.formNodes[0]?.formNodeId ?? "",
        declaredRoles: ["ASSIGNEE"],
        gateway: null,
      };
    } else if (kind === "GATEWAY") {
      node = {
        nodeId,
        nodeCode,
        nodeKind: "GATEWAY",
        name: "Gateway mới",
        formNodeId: null,
        declaredRoles: [],
        gateway: makeGateway("CONDITION"),
      };
    } else {
      node = {
        nodeId,
        nodeCode,
        nodeKind: "FINAL",
        name: "Kết thúc",
        formNodeId: null,
        declaredRoles: [],
        gateway: null,
      };
    }
    onChange({ ...payload, nodes: [...payload.nodes, node] });
    setSelectedNodeId(nodeId);
    if (!edgeTo) setEdgeTo(nodeId);
  };

  const removeNode = (nodeId: string) => {
    const nextNodes = payload.nodes.filter((node) => node.nodeId !== nodeId);
    const nextEntry = nodeId === payload.entryStepId ? nextNodes[0]?.nodeId ?? "" : payload.entryStepId;
    onChange({
      ...payload,
      entryStepId: nextEntry,
      nodes: nextNodes,
      edges: payload.edges.filter(
        (edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId,
      ),
      resultOwnerStepId: payload.resultOwnerStepId === nodeId ? null : payload.resultOwnerStepId,
      statisticsOwnerStepId:
        payload.statisticsOwnerStepId === nodeId ? null : payload.statisticsOwnerStepId,
    });
    setSelectedNodeId(nextEntry);
  };

  const addEdge = () => {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return;
    const transitionId = nextIdentity(
      "transition",
      payload.edges.map((edge) => edge.transitionId),
    );
    onChange({
      ...payload,
      edges: [
        ...payload.edges,
        { transitionId, fromNodeId: edgeFrom, toNodeId: edgeTo, condition: null },
      ],
    });
  };

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
        gap={1}
      >
        <Box>
          <Typography variant="h6" fontWeight={850}>Sơ đồ topology</Typography>
          <Typography variant="body2" color="text.secondary">
            Canvas hỗ trợ kéo, thu phóng, minimap và vẫn có bảng ngữ nghĩa để dùng bằng bàn phím.
          </Typography>
        </Box>
        {!readOnly ? (
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => addNode("FORM_STEP")}>
              Bước biểu mẫu
            </Button>
            <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => addNode("GATEWAY")}>
              Gateway
            </Button>
            <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => addNode("FINAL")}>
              Kết thúc
            </Button>
          </Stack>
        ) : null}
      </Stack>

      {payload.archetypeId === "FLOW-T03" ? (
        <Alert severity="success" data-testid="p6-t03-builder-contract">
          P6-01 thực thi topology tuần tự: mỗi nút phải là FORM_STEP, mỗi bước chỉ có một liên kết đi
          tiếp và mỗi nút dùng đúng Form version đã khóa. Runtime không suy phiên bản hiện tại.
        </Alert>
      ) : payload.archetypeId.startsWith("FLOW-T") &&
        ![
          "FLOW-T01",
          "FLOW-T02",
          "FLOW-T03",
          "FLOW-T04",
          "FLOW-T05",
          "FLOW-T06",
          "FLOW-T07",
          "FLOW-T08",
          "FLOW-T09",
          "FLOW-T10",
          "FLOW-T11",
          "FLOW-T12",
        ].includes(payload.archetypeId) ? (
        <Alert severity="info">
          Archetype này không thuộc FLOW-T01..T12 của catalog 1.3 production đã niêm phong.
        </Alert>
      ) : null}
      {payload.archetypeId === "FLOW-T04" ? (
        <Alert severity="success" data-testid="p6-t04-builder-contract">
          P6-02 thực thi đúng A → FORK → B/C: một FORM_STEP đầu vào, một gateway FORK và đúng hai
          FORM_STEP terminal. Mỗi nhánh giữ exact Form version, branch, gateway và contribution riêng.
        </Alert>
      ) : null}
      {payload.archetypeId === "FLOW-T05" ? (
        <Alert severity="success" data-testid="p6-t05-builder-contract">
          P6-03 thực thi JOIN ALL theo phiên bản: tập contribution kỳ vọng được khóa khi fan-out, mỗi
          nhánh chỉ đóng góp một lần và gateway chỉ release khi không còn contribution thiếu.
        </Alert>
      ) : null}
      {payload.archetypeId === "FLOW-T06" ? (
        <Alert severity="success" data-testid="p6-t06-builder-contract">
          P6-04 thực thi JOIN ANY/N_OF_M theo phiên bản: 1 ≤ N ≤ M, tập contribution được khóa khi
          fan-out; một CAS winner đóng gateway, nhánh chưa claim chuyển CANCELLED_BY_GATEWAY và completion
          đến muộn chỉ được ghi LATE_IGNORED.
        </Alert>
      ) : null}
      {payload.archetypeId === "FLOW-T07" ? (
        <Alert severity="success" data-testid="p6-t07-builder-contract">
          P6-05 thực thi điều kiện có kiểu trên snapshot fact bất biến do server tạo: biểu thức chỉ dùng AST,
          nhánh được xét theo thứ tự và nhánh TRUE cuối cùng là mặc định. Runtime lưu hash đầu vào, phiên bản
          evaluator và edge đã chọn; UI không đọc hoặc tự đánh giá fact.
        </Alert>
      ) : null}
      {payload.archetypeId === "FLOW-T08" ? (
        <Alert severity="success" data-testid="p6-t08-builder-contract">
          P6-06 thực thi review loop trên đúng một FORM_STEP đã khóa phiên bản. Mỗi lần trả lại tạo
          attempt và assignment mới của cùng logical target; lịch sử cũ chỉ đọc và runtime dừng ổn
          định khi đạt maxReviewCycles (mặc định 10, hợp lệ 1..50).
        </Alert>
      ) : null}

      {payload.nodes.length === 0 ? (
        <Alert severity="info">Sơ đồ chưa có nút. Thêm một nút để bắt đầu định nghĩa.</Alert>
      ) : (
        <Paper
          variant="outlined"
          role="region"
          aria-label="Canvas topology quy trình"
          sx={{ height: { xs: 480, md: 620 }, minHeight: 480, overflow: "hidden", borderRadius: 2 }}
        >
          <ReactFlow
            nodes={graph.nodes}
            edges={graph.edges}
            fitView
            fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
            minZoom={0.12}
            maxZoom={1.8}
            nodesDraggable={false}
            nodesConnectable={false}
            onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
            onNodeDragStop={(_event, node) => setSelectedNodeId(node.id)}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
            <MiniMap pannable zoomable ariaLabel="Bản đồ thu nhỏ topology" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </Paper>
      )}

      <FormControlLabel
        control={
          <Switch
            checked={showSemanticTable}
            onChange={(event) => setShowSemanticTable(event.target.checked)}
          />
        }
        label="Hiện bảng topology hỗ trợ bàn phím"
      />

      {showSemanticTable ? (
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="flex-start">
          <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minWidth: 0 }}>
            <Table size="small" aria-label="Danh sách nút topology">
              <TableHead>
                <TableRow>
                  <TableCell>Mã nút</TableCell>
                  <TableCell>Loại</TableCell>
                  <TableCell>Tên</TableCell>
                  <TableCell>Vai trò</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payload.nodes.map((node) => (
                  <TableRow
                    key={node.nodeId}
                    data-dynamic-flow-node-id={node.nodeId}
                    selected={node.nodeId === selectedNodeId}
                    hover
                    tabIndex={0}
                    onClick={() => setSelectedNodeId(node.nodeId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setSelectedNodeId(node.nodeId);
                    }}
                  >
                    <TableCell>{node.nodeCode}</TableCell>
                    <TableCell><Chip size="small" label={node.nodeKind} /></TableCell>
                    <TableCell>{node.name || "—"}</TableCell>
                    <TableCell>{node.declaredRoles.join(", ") || "—"}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Xóa nút">
                        <span>
                          <IconButton
                            size="small"
                            disabled={readOnly}
                            aria-label={`Xóa nút ${node.nodeCode}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              removeNode(node.nodeId);
                            }}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper variant="outlined" sx={{ p: 2, width: { xs: "100%", lg: 360 }, flexShrink: 0 }}>
            <Typography fontWeight={850} sx={{ mb: 1.5 }}>Thuộc tính nút</Typography>
            {!selectedNode ? (
              <Typography color="text.secondary">Chọn một nút trên canvas hoặc trong bảng.</Typography>
            ) : (
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  label="ID ổn định"
                  value={selectedNode.nodeId}
                  disabled
                  inputProps={{ "data-dynamic-flow-node-control": "nodeId" }}
                />
                <TextField
                  size="small"
                  label="Mã nút"
                  value={selectedNode.nodeCode}
                  disabled={readOnly}
                  onChange={(event) => updateNode(selectedNode.nodeId, { nodeCode: event.target.value })}
                  inputProps={{ "data-dynamic-flow-node-control": "nodeCode" }}
                />
                <TextField
                  size="small"
                  label="Tên hiển thị"
                  value={selectedNode.name ?? ""}
                  disabled={readOnly}
                  onChange={(event) => updateNode(selectedNode.nodeId, { name: event.target.value || null })}
                  inputProps={{ "data-dynamic-flow-node-control": "name" }}
                />
                <Button
                  id="dynamic-flow-control-entryStepId"
                  size="small"
                  variant={payload.entryStepId === selectedNode.nodeId ? "contained" : "outlined"}
                  disabled={readOnly}
                  onClick={() => onChange({ ...payload, entryStepId: selectedNode.nodeId })}
                >
                  {payload.entryStepId === selectedNode.nodeId ? "Đang là nút bắt đầu" : "Đặt làm nút bắt đầu"}
                </Button>
                {selectedNode.nodeKind === "FORM_STEP" ? (
                  <>
                    <TextField
                      select
                      size="small"
                      label="Nút biểu mẫu"
                      value={selectedNode.formNodeId}
                      disabled={readOnly}
                      onChange={(event) => updateNode(selectedNode.nodeId, { formNodeId: event.target.value })}
                      inputProps={{ "data-dynamic-flow-node-control": "formNodeId" }}
                    >
                      {payload.formNodes.map((form) => (
                        <MenuItem key={form.formNodeId} value={form.formNodeId}>
                          {form.formNodeId} · {form.role}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Stack>
                      <Typography variant="caption" color="text.secondary">Vai trò khai báo</Typography>
                      {ACTOR_ROLES.map((role) => (
                        <FormControlLabel
                          key={role}
                          control={
                            <Switch
                              size="small"
                              checked={selectedNode.declaredRoles.includes(role)}
                              disabled={readOnly}
                              inputProps={{
                                "data-dynamic-flow-node-control": "declaredRoles",
                              } as never}
                              onChange={(event) =>
                                updateNode(selectedNode.nodeId, {
                                  declaredRoles: event.target.checked
                                    ? [...selectedNode.declaredRoles, role]
                                    : selectedNode.declaredRoles.filter((item) => item !== role),
                                })
                              }
                            />
                          }
                          label={role}
                        />
                      ))}
                    </Stack>
                  </>
                ) : null}
                {selectedNode.nodeKind === "GATEWAY" ? (
                  <TextField
                    select
                    size="small"
                    label="Loại gateway"
                    value={selectedNode.gateway.kind}
                    disabled={readOnly}
                    inputProps={{ "data-dynamic-flow-node-control": "gateway" }}
                    onChange={(event) =>
                      updateNode(selectedNode.nodeId, {
                        gateway: { ...selectedNode.gateway, kind: event.target.value as FlowGatewayKindV2 },
                      })
                    }
                  >
                    {GATEWAY_KINDS.map((kind) => <MenuItem key={kind} value={kind}>{kind}</MenuItem>)}
                  </TextField>
                ) : null}
              </Stack>
            )}
          </Paper>
        </Stack>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={850} sx={{ mb: 1 }}>Thêm liên kết</Typography>
        <Stack direction={{ xs: "column", md: "row" }} gap={1.5}>
          <TextField
            select
            size="small"
            label="Từ nút"
            value={edgeFrom}
            disabled={readOnly}
            onChange={(event) => setEdgeFrom(event.target.value)}
            sx={{ minWidth: 220 }}
          >
            {payload.nodes.map((node) => <MenuItem key={node.nodeId} value={node.nodeId}>{node.nodeCode}</MenuItem>)}
          </TextField>
          <TextField
            select
            size="small"
            label="Đến nút"
            value={edgeTo}
            disabled={readOnly}
            onChange={(event) => setEdgeTo(event.target.value)}
            sx={{ minWidth: 220 }}
          >
            {payload.nodes.map((node) => <MenuItem key={node.nodeId} value={node.nodeId}>{node.nodeCode}</MenuItem>)}
          </TextField>
          <Button variant="outlined" disabled={readOnly || !edgeFrom || !edgeTo || edgeFrom === edgeTo} onClick={addEdge}>
            Thêm liên kết
          </Button>
        </Stack>
      </Paper>

      <DynamicFlowJsonEditor
        editorId="topology-edges"
        label="Liên kết và AST điều kiện"
        description="Chỉ các toán tử condition trong catalog 1.3 hiện hành được backend chấp nhận khi lưu/khóa."
        value={payload.edges}
        disabled={readOnly}
        rows={12}
        expect="array"
        onChange={(edges) => onChange({ ...payload, edges })}
        onValidityChange={onEditorValidityChange}
        onRawDirtyChange={onRawDirtyChange}
        rawText={rawText}
        onRawTextChange={onRawTextChange}
      />
    </Stack>
  );
}
