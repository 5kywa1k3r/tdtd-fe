import { Navigate } from 'react-router-dom';
import { getTokenFromStorage } from '../stores/authStorage';
import { useGetMeQuery } from '../api/base/meApi';

export function RequireAuth({ children }: { children: JSX.Element }) {
  const token = getTokenFromStorage();
  const { isLoading, isError } = useGetMeQuery(undefined, { skip: !token });

  if (!token) return <Navigate to="/login" replace />;
  if (isLoading) return null; //  thay bằng spinner
  if (isError) return <Navigate to="/login" replace />;

  return children;
}