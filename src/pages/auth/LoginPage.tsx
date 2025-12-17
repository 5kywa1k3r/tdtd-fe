// src/pages/auth/LoginPage.tsx
import { useState } from 'react';
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
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: call API login
    console.log({ email, password, remember });

    // Tạm bỏ qua auth -> login xong vào MainLayout (dashboard)
    navigate('/');
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
        {/* Avatar tròn phía trên */}
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

        {/* Card login */}
        <Paper
          elevation={8}
          sx={(theme) => ({
            pt: 7,
            pb: 4,
            px: 4,
            borderRadius: 3,
            backgroundColor: 'rgba(255,255,255,0.97)', // gần như trắng solid
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
                mb: 3,
                letterSpacing: 1,
                fontWeight: 700,
                color: theme.palette.primary.dark,
              })}
            >
              ĐĂNG NHẬP HỆ THỐNG
            </Typography>

            <TextField
              label="Email / Tên đăng nhập"
              variant="outlined"
              fullWidth
              size="medium"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  sx: { fontSize: 14 },
                },
              }}
            />

            <TextField
              label="Mật khẩu"
              type="password"
              variant="outlined"
              fullWidth
              size="medium"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  sx: { fontSize: 14 },
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
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                }
                label={
                  <Typography
                    variant="caption"
                    sx={{ userSelect: 'none', fontSize: 12 }}
                  >
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
                onClick={() => {
                  // TODO: điều hướng quên mật khẩu
                }}
              >
                Quên mật khẩu?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              sx={(theme) => ({
                py: 1.2,
                borderRadius: 999,
                textTransform: 'uppercase',
                letterSpacing: 3,
                fontSize: 13,
                fontWeight: 600,
                background: theme.customGradients.loginButton,
                color: theme.palette.primary.dark,
                boxShadow: '0 12px 24px rgba(0,0,0,0.25)',
                '&:hover': {
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,1), rgba(245,247,250,0.95))',
                  boxShadow: '0 14px 28px rgba(0,0,0,0.3)',
                },
              })}
            >
              LOGIN
            </Button>
          </form>
        </Paper>
      </Box>
    </Box>
  );
};
