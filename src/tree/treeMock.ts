export type Status = "TODO" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "DONE";

export type NodeData = {
  title: string;
  assignee: string;
  status: Status;
  description: string;
  updatedAt: string;
};

const ASSIGNEES = ["Hùng", "Nam", "Lan", "Hà", "Minh", "Thảo", "Khoa", "Vy"];
const STATUSES: Status[] = ["TODO", "IN_PROGRESS", "BLOCKED", "REVIEW", "DONE"];

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

export function statusColor(s: Status) {
  // 5 màu trạng thái
  switch (s) {
    case "TODO":
      return "#94A3B8"; // xám
    case "IN_PROGRESS":
      return "#3B82F6"; // xanh dương
    case "BLOCKED":
      return "#EF4444"; // đỏ
    case "REVIEW":
      return "#F59E0B"; // vàng/cam
    case "DONE":
      return "#22C55E"; // xanh lá
  }
}

export function statusLabel(s: Status) {
  switch (s) {
    case "TODO":
      return "Chưa làm";
    case "IN_PROGRESS":
      return "Đang làm";
    case "BLOCKED":
      return "Bị chặn";
    case "REVIEW":
      return "Chờ duyệt";
    case "DONE":
      return "Hoàn thành";
  }
}

// Mock cây “dày”: 1 root -> 5 nhánh -> mỗi nhánh 4-5 con -> mỗi con 2 con nhỏ
export function buildDenseTreeMock() {
  const nodes: Array<{
    id: string;
    x: number;
    y: number;
    data: NodeData;
  }> = [];
  const edges: Array<{ id: string; source: string; target: string }> = [];

  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");

  let idCounter = 1;
  const nextId = () => `n-${idCounter++}`;

  const rootId = nextId();
  nodes.push({
    id: rootId,
    x: 0,
    y: 0,
    data: {
      title: "TỔNG QUAN DỰ ÁN (Root)",
      assignee: "PM - Tổng hợp",
      status: "IN_PROGRESS",
      description: "Node gốc mô tả tổng quan/cụm đầu việc lớn.",
      updatedAt: fmt(now),
    },
  });

  const level1Count = 5;
  const level1GapY = 160;
  const level1X = 360;

  const level2BaseX = 760;
  const level2GapY = 110;

  const level3BaseX = 1120;
  const level3GapY = 90;

  // Level 1
  const l1: string[] = [];
  for (let i = 0; i < level1Count; i++) {
    const id = nextId();
    l1.push(id);

    const st = pick(STATUSES, i + 1);
    nodes.push({
      id,
      x: level1X,
      y: (i - (level1Count - 1) / 2) * level1GapY,
      data: {
        title: `Module ${i + 1} - Cụm công việc`,
        assignee: pick(ASSIGNEES, i),
        status: st,
        description: `Mock mô tả cho Module ${i + 1}. Có thể là thu thập dữ liệu / phân tích / dashboard / cảnh báo...`,
        updatedAt: fmt(new Date(now.getTime() - (i + 2) * 3600_000)),
      },
    });

    edges.push({ id: `e-${rootId}-${id}`, source: rootId, target: id });
  }

  // Level 2 + Level 3
  for (let i = 0; i < l1.length; i++) {
    const parent = l1[i];
    const childCount = 4 + (i % 2); // 4 hoặc 5
    const baseY = nodes.find((n) => n.id === parent)!.y;

    const l2Ids: string[] = [];
    for (let j = 0; j < childCount; j++) {
      const id2 = nextId();
      l2Ids.push(id2);

      const st2 = pick(STATUSES, i + j + 2);
      nodes.push({
        id: id2,
        x: level2BaseX,
        y: baseY + (j - (childCount - 1) / 2) * level2GapY,
        data: {
          title: `Task ${i + 1}.${j + 1} - Đầu việc`,
          assignee: pick(ASSIGNEES, i + j + 2),
          status: st2,
          description: `Mock chi tiết đầu việc ${i + 1}.${j + 1}.`,
          updatedAt: fmt(new Date(now.getTime() - (i + j + 1) * 5400_000)),
        },
      });

      edges.push({ id: `e-${parent}-${id2}`, source: parent, target: id2 });
    }

    // Level 3: mỗi node level 2 có 2 node con nhỏ
    for (let j = 0; j < l2Ids.length; j++) {
      const p2 = l2Ids[j];
      const p2Y = nodes.find((n) => n.id === p2)!.y;

      for (let k = 0; k < 2; k++) {
        const id3 = nextId();
        const st3 = pick(STATUSES, i + j + k + 3);

        nodes.push({
          id: id3,
          x: level3BaseX,
          y: p2Y + (k === 0 ? -level3GapY / 2 : level3GapY / 2),
          data: {
            title: `Subtask ${i + 1}.${j + 1}.${k + 1}`,
            assignee: pick(ASSIGNEES, i + j + k + 1),
            status: st3,
            description: `Mock subtask ${i + 1}.${j + 1}.${k + 1}.`,
            updatedAt: fmt(new Date(now.getTime() - (i + j + k + 1) * 7200_000)),
          },
        });

        edges.push({ id: `e-${p2}-${id3}`, source: p2, target: id3 });
      }
    }
  }

  return { nodes, edges };
}
