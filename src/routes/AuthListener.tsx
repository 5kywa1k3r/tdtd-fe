import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks';
import { logout } from '../stores/authSlice';
import { AUTH_LOGOUT_EVENT } from '../utils/AuthEvents';

export const AuthListener = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => {
      dispatch(logout());
      navigate('/login', { replace: true });
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handler);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handler);
  }, [dispatch, navigate]);

  return null;
};
