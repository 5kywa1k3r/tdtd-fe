export type UnitLevel = number;

export type PositionOption = {
  code: string;
  name: string;

  /** order theo chục để dễ chèn */
  order: number;

  /** rank để so sánh cấp bậc (cùng rank = ngang cấp) */
  rank: number;

  /** unit levels được phép (level = unitCode.length/3) */
  allowedLevels: UnitLevel[];

  /** alias legacy để map/hiển thị */
  aliases?: string[];
};

export const POSITIONS: PositionOption[] = [
  // ===== TỈNH =====
  { code: 'GIAM_DOC_CAT', name: 'Giám đốc Công an tỉnh', order: 10, rank: 100, allowedLevels: [1] },
  { code: 'PHO_GIAM_DOC_CAT', name: 'Phó giám đốc Công an tỉnh', order: 11, rank: 90, allowedLevels: [1] },

  // ===== PHÒNG =====
  { code: 'TRUONG_PHONG', name: 'Trưởng phòng', order: 20, rank: 80, allowedLevels: [2] },
  { code: 'PHO_TRUONG_PHONG_PHU_TRACH', name: 'Phó trưởng phòng phụ trách', order: 21, rank: 80, allowedLevels: [2] },
  { code: 'PHO_TRUONG_PHONG', name: 'Phó trưởng phòng', order: 22, rank: 70, allowedLevels: [2] },

  // ===== ĐỘI =====
  { code: 'DOI_TRUONG', name: 'Đội trưởng', order: 30, rank: 60, allowedLevels: [3] },
  { code: 'PHO_DOI_TRUONG_PHU_TRACH', name: 'Phó đội trưởng phụ trách', order: 31, rank: 60, allowedLevels: [3] },
  { code: 'PHO_DOI_TRUONG', name: 'Phó đội trưởng', order: 32, rank: 50, allowedLevels: [3] },

  // ===== PHƯỜNG, XÃ =====
  { code: 'TRUONG_CONG_AN_PHUONG', name: 'Trưởng Công an phường', order: 40, rank: 40, allowedLevels: [4] },
  { code: 'TRUONG_CONG_AN_XA', name: 'Trưởng Công an xã', order: 41, rank: 40, allowedLevels: [4] },
  { code: 'PHO_TRUONG_CONG_AN_PHUONG_PHU_TRACH', name: 'Phó Trưởng Công an phường phụ trách', order: 42, rank: 40, allowedLevels: [4] },
  { code: 'PHO_TRUONG_CONG_AN_XA_PHU_TRACH', name: 'Phó Trưởng Công an xã phụ trách', order: 43, rank: 40, allowedLevels: [4] },
  { code: 'PHO_TRUONG_CONG_AN_PHUONG', name: 'Phó Trưởng Công an phường', order: 44, rank: 30, allowedLevels: [4] },
  { code: 'PHO_TRUONG_CONG_AN_XA', name: 'Phó Trưởng Công an xã', order: 45, rank: 30, allowedLevels: [4] },
].sort((a, b) => a.order - b.order);

export function normalizePositionCode(code?: string | null): string {
  const s = (code ?? '').trim();
  if (!s) return '';
  return s;
}

export function getUnitLevel(unitCode?: string | null): number {
  const code = (unitCode ?? '').trim();
  if (!code) return 0;
  return Math.floor(code.length / 3);
}

export function getPositionsByUnitCode(unitCode?: string | null): PositionOption[] {
  const level = getUnitLevel(unitCode);
  if (level === 0) return [];
  return POSITIONS.filter((p) => p.allowedLevels.includes(level));
}

// Map name by code + alias
export const POSITION_NAME_BY_CODE: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const p of POSITIONS) {
    map[p.code] = p.name;
    for (const a of p.aliases ?? []) map[a] = p.name; // legacy name
  }
  return map;
})();

export const POSITION_ORDER_BY_CODE: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (const p of POSITIONS) {
    map[p.code] = p.order;
    for (const a of p.aliases ?? []) map[a] = p.order;
  }
  return map;
})();

export const POSITION_RANK_BY_CODE: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (const p of POSITIONS) {
    map[p.code] = p.rank;
    for (const a of p.aliases ?? []) map[a] = p.rank;
  }
  return map;
})();