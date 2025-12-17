// src/types/navigation.ts
export interface NavItem {
  id: string;
  label: string;
  path?: string;            // route, nếu có
  children?: NavItem[];     // menu con
}
