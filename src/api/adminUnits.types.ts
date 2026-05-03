export type UnitDto = {
  id: string;
  fullName: string;
  shortName?: string;
  symbol?: string | null;
  parentUnitId?: string | null;
  code: string; // "" is system root
  level: number;
  version?: number;
  primaryUnitTypeCode?: string | null;
  isVirtual?: boolean;
  unitTypeCodes?: string[];
  note?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
};

export type UnitHistoryDto = {
  version: number;
  changedAt: string;
  changedBy?: { id: string; username: string; fullName?: string };
  snapshot: UnitDto;
};

export type CreateUnitReq = {
  fullName: string;
  shortName?: string | null;
  symbol?: string | null;
  parentUnitId?: string | null;
  primaryUnitTypeCode: string;
  isVirtual?: boolean;
  unitTypeCodes?: string[];
};

export type UpdateUnitReq = {
  fullName: string;
  shortName?: string | null;
  symbol?: string | null;
  primaryUnitTypeCode: string;
  isVirtual?: boolean;
  unitTypeCodes?: string[];
  note?: string | null;
};
