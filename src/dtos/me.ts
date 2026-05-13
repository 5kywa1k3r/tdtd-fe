export type MeDto = {
  id: string;
  username: string;
  fullName: string;
  unitId: string;
  unitName: string;
  unitCode?: string;
  unitTypeCodes?: string[];
  positionCode?: string;
  accountKind?: string;
  roles: string[];
  isDeleted: boolean;
};
