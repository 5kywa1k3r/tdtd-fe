import type { UnitDto } from '../../../api/adminUnitsApi';

// UnitMultiSelect đang dùng UnitNode shape: { id, name, children? }
export type UnitNode = {
  id: string;
  name: string;
  children?: UnitNode[];
};

export function buildUnitTreeFromFlat(units: UnitDto[]): UnitNode[] {
  // backend có thể trả system root code==""; nếu cần giữ nguyên rule cũ thì filter
  const list = (units ?? []).filter((x) => x.code !== '');

  const byId = new Map<string, UnitNode>();
  list.forEach((u) => {
    byId.set(u.id, { id: u.id, name: u.shortName?.trim() || u.fullName, children: [] });
  });

  const roots: UnitNode[] = [];

  list.forEach((u) => {
    const node = byId.get(u.id)!;
    const pid = u.parentUnitId ?? null;

    if (!pid || !byId.has(pid)) {
      roots.push(node);
    } else {
      byId.get(pid)!.children!.push(node);
    }
  });

  // (tuỳ) sort theo code để cây ổn định
  const codeById = new Map(list.map((u) => [u.id, u.code] as const));
  const sortRec = (nodes: UnitNode[]) => {
    nodes.sort((a, b) => (codeById.get(a.id) ?? '').localeCompare(codeById.get(b.id) ?? ''));
    nodes.forEach((n) => n.children && sortRec(n.children));
  };
  sortRec(roots);

  return roots;
}