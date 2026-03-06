export type UserDto = {
  id: string;
  username: string;
  fullName: string;
  unitId: string;
  unitName: string;
  roles: string[];
  isDeleted: boolean;
  note?: string;
};

export type CreateUserReq = {
  username: string;
  password: string;
  fullName: string;
  unitId: string;
  unitName: string;
  roles: string[];
  isDeleted: boolean;
};

export type UpdateUserReq = {
  fullName: string;
  unitId: string;
  unitName: string;
  roles?: string[];
  isDeleted: boolean;
  note?: string;
};