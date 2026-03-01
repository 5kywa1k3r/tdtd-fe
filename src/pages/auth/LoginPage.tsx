import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  InputAdornment,
  Alert,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';

import { useLoginMutation } from '../../api/auth/authApi';
import { getTokenFromStorage } from '../../stores/authStorage';

function extractErrorMessage(err: unknown): string {
  if (!err) return 'Đăng nhập thất bại.';

  const anyErr = err as any;
  const data = anyErr?.data ?? anyErr?.error?.data ?? anyErr;

  if (typeof data === 'string') return data;
  if (data?.message) return data.message;

  return 'Sai tài khoản hoặc mật khẩu.';
}

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRememberLocal] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();

  // Nếu đã login thì đá vào app
  useEffect(() => {
    if (getTokenFromStorage()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
      return;
    }

    try {
      await login({ username: username.trim(), password }).unwrap();
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMessage(extractErrorMessage(err));
    }
  };

  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.customGradients.loginBackground,
        padding: 2,
      })}
    >
      <Box sx={{ position: 'relative', width: 400, maxWidth: '100%' }}>
        <Box
          sx={(theme) => ({
            position: 'absolute',
            top: -48,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 96,
            height: 96,
            borderRadius: '50%',
            backgroundColor: theme.palette.primary.dark,
            border: '4px solid rgba(255,255,255,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
            zIndex: 2,
          })}
        >
          <PersonIcon sx={{ fontSize: 44, color: 'white' }} />
        </Box>

        <Paper
          elevation={8}
          sx={(theme) => ({
            pt: 7,
            pb: 4,
            px: 4,
            borderRadius: 3,
            backgroundColor: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 18px 36px rgba(0,0,0,0.28)',
            color: theme.palette.text.primary,
          })}
        >
          <form onSubmit={handleSubmit}>
            <Typography
              variant="h6"
              align="center"
              sx={(theme) => ({
                mb: 2,
                letterSpacing: 1,
                fontWeight: 700,
                color: theme.palette.primary.dark,
              })}
            >
              ĐĂNG NHẬP HỆ THỐNG
            </Typography>

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}

            <TextField
              label="Email / Tên đăng nhập"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              autoComplete="username"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Mật khẩu"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              autoComplete="current-password"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Box
              sx={(theme) => ({
                mt: 1,
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12,
                color: theme.palette.text.secondary,
              })}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={remember}
                    onChange={(e) => setRememberLocal(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ fontSize: 12 }}>
                    Nhớ mật khẩu
                  </Typography>
                }
              />

              <Link
                component="button"
                type="button"
                underline="hover"
                sx={(theme) => ({
                  fontSize: 12,
                  color: theme.palette.primary.main,
                  fontWeight: 500,
                })}
              >
                Quên mật khẩu?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              disabled={isLoading}
              sx={(theme) => ({
                py: 1.2,
                borderRadius: 999,
                textTransform: 'uppercase',
                letterSpacing: 3,
                fontSize: 13,
                fontWeight: 600,
                background: theme.customGradients.loginButton,
                color: theme.palette.primary.dark,
              })}
            >
              {isLoading ? 'ĐANG ĐĂNG NHẬP...' : 'LOGIN'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Box>
  );
};