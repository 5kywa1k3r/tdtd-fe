import { useEffect } from 'react';
import { useAppDispatch } from './hooks';
import { AUTH_LOGOUT_EVENT } from './utils/AuthEvents';
import { logout } from './stores/authSlice';
import { baseApi } from './api/base/baseApi';
import { clearAuthStorage } from './stores/authStorage';
import { useNavigate } from 'react-router-dom';

export function AppBootstrap() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => {
      clearAuthStorage();
      dispatch(logout());
      dispatch(baseApi.util.resetApiState());
      navigate('/login');
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handler);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handler);
  }, [dispatch, navigate]);

  return null;
}