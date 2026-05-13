import { Navigate } from 'react-router-dom';
import { useGetMeQuery } from '../api/base/meApi';
import type { JSX } from "react";

const accountKindRole = (accountKind?: string) => {
  if (accountKind === 'SYSTEM_ADMIN') return 'SYSTEM_ADMIN';
  if (accountKind === 'LEVEL_MANAGER') return 'MANAGER_LEVEL';
  if (accountKind === 'UNIT_MANAGER') return 'MANAGER_UNIT';
  return null;
};

const hasAnyRole = (roles: string[] | undefined, allow: string[], accountKind?: string) => {
  const fromAccountKind = accountKindRole(accountKind);
  if (fromAccountKind && allow.includes(fromAccountKind)) return true;

  return !!roles?.some((role) =>
    allow.some((allowed) => role === allowed || role.startsWith(`${allowed}:`)),
  );
};

export function RequireRole(props: { allow: string[]; children: JSX.Element }) {
  const { data: me, isLoading } = useGetMeQuery();

  if (isLoading) return null;
  if (!hasAnyRole(me?.roles, props.allow, me?.accountKind)) return <Navigate to="/dashboard" replace />;

  return props.children;
}
