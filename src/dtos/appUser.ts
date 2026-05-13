export type AppUser = {
  id: string;
  username: string;
  fullName: string;
  unitTypeCode?: string[];
  unitTypeCodes?: string[];
  unitId: string;
  unitCode: string;
  unitSymbol?: string;
  unitName: string;
  positionCode?: string;
  accountKind?: string;
  roles: string[];
  isDeleted: boolean;
};
