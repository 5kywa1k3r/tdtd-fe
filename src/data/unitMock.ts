// src/data/unitMock.ts
export type UnitId =
  | 'KHOI_THAM_MUU'
  | 'DOI_THAM_MUU'
  | 'DOI_TONG_HOP'
  | 'VAN_PHONG_CO_QUAN'
  | 'KHOI_NGHIEP_VU'
  | 'DOI_NGHIEP_VU_1'
  | 'DOI_NGHIEP_VU_2'
  | 'KHOI_KY_THUAT'
  | 'PHONG_CONG_NGHE';

export interface UnitNode {
  id: UnitId;
  name: string;
  children?: UnitNode[];
}

export const UNIT_TREE: UnitNode[] = [
  {
    id: 'KHOI_THAM_MUU',
    name: 'Khối Tham mưu',
    children: [
      { id: 'DOI_THAM_MUU', name: 'Đội Tham mưu' },
      { id: 'DOI_TONG_HOP', name: 'Đội Tổng hợp' },
      { id: 'VAN_PHONG_CO_QUAN', name: 'Văn phòng Cơ quan' },
    ],
  },
  {
    id: 'KHOI_NGHIEP_VU',
    name: 'Khối Nghiệp vụ',
    children: [
      { id: 'DOI_NGHIEP_VU_1', name: 'Đội Nghiệp vụ 1' },
      { id: 'DOI_NGHIEP_VU_2', name: 'Đội Nghiệp vụ 2' },
    ],
  },
  {
    id: 'KHOI_KY_THUAT',
    name: 'Khối Kỹ thuật',
    children: [{ id: 'PHONG_CONG_NGHE', name: 'Phòng Công nghệ' }],
  },
];

export interface FlatUnitOption {
  id: UnitId;
  name: string;
  parentId?: UnitId;
  level: number;
}

export function flattenUnitTree(
  nodes: UnitNode[],
  level = 0,
  parentId?: UnitId
): FlatUnitOption[] {
  const result: FlatUnitOption[] = [];
  for (const node of nodes) {
    result.push({
      id: node.id,
      name: node.name,
      parentId,
      level,
    });

    if (node.children) {
      result.push(...flattenUnitTree(node.children, level + 1, node.id));
    }
  }
  return result;
}

export const UNIT_LABEL_MAP: Record<UnitId, string> = (() => {
  const flat = flattenUnitTree(UNIT_TREE);
  const map: Record<UnitId, string> = {} as any;
  flat.forEach((u) => (map[u.id] = u.name));
  return map;
})();
