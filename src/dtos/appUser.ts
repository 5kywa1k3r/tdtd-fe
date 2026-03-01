export type AppUser = {
  id: string;
  username: string;
  fullName: string;
  unitTypeCode: string[];
  unitId: string;
  unitCode: string;
  unitName: string;
  roles: string[];
  isDeleted: boolean;
};