import { Navigate } from 'react-router-dom';
import { Alert, Box } from '@mui/material';
import { getTokenFromStorage } from '../stores/authStorage';
import { useGetMeQuery } from '../api/base/meApi';
import type { JSX } from "react";
import { getApiErrorMessage } from '../utils/apiError';

export function RequireAuth({ children }: { children: JSX.Element }) {
  const token = getTokenFromStorage();
  const { isLoading, isError, error } = useGetMeQuery(undefined, { skip: !token });
  const errorStatus = typeof (error as { status?: unknown } | undefined)?.status === 'number'
    ? (error as { status: number }).status
    : undefined;

  if (!token) return <Navigate to="/login" replace />;
  if (isLoading) return null; //  thay bằng spinner
  if (isError && errorStatus === 401) return <Navigate to="/login" replace />;
  if (isError) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          px: 2,
          bgcolor: 'background.default',
        }}
      >
        <Alert severity="error" sx={{ width: '100%', maxWidth: 520 }}>
          {getApiErrorMessage(error)}
        </Alert>
      </Box>
    );
  }

  return children;
}
