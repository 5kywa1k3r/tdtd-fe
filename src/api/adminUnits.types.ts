export type UnitDto = {
  id: string;
  fullName: string;
  shortName?: string;
  parentUnitId?: string | null;
  code: string; // "" is system root
  level: number;
  unitTypeCodes?: string[];
  note?: string;
};

export type UnitHistoryDto = {
  version: number;
  changedAt: string;
  changedBy?: { id: string; username: string; fullName?: string };
  snapshot: UnitDto;
};

export type CreateUnitReq = {
  fullName: string;
  shortName?: string;
  parentUnitId?: string | null;
  unitTypeCodes?: string[];
};

export type UpdateUnitReq = {
  fullName: string;
  shortName?: string;
  parentUnitId?: string | null;
  unitTypeCodes?: string[];
  note?: string;
  saveHistoryForWholeSubtree?: boolean;
};