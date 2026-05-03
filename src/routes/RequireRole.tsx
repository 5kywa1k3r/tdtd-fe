import { Navigate } from 'react-router-dom';
import { useGetMeQuery } from '../api/base/meApi';
import type { JSX } from "react";

const hasAnyRole = (roles: string[] | undefined, allow: string[]) =>
  !!roles?.some((role) =>
    allow.some((allowed) => role === allowed || role.startsWith(`${allowed}:`)),
  );

export function RequireRole(props: { allow: string[]; children: JSX.Element }) {
  const { data: me, isLoading } = useGetMeQuery();

  if (isLoading) return null;
  if (!hasAnyRole(me?.roles, props.allow)) return <Navigate to="/dashboard" replace />;

  return props.children;
}
