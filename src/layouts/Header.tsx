// src/layouts/Headers.tsx
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppTheme } from '../theme/ThemeProviderCustom';

export const Header = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const { setThemeName } = useAppTheme();

  const handleUserClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleClose();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      elevation={0} // không bóng — header gọn, sang
      sx={(theme) => ({
        zIndex: theme.zIndex.drawer + 1,
        background: theme.customGradients.headerBackground,
        borderRadius: 0, // bỏ bo góc, header full-width
      })}
    >
      <Toolbar>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          PHẦN MỀM THEO DÕI TIẾN ĐỘ NHIỆM VỤ, CHỈ TIÊU
        </Typography>

        <IconButton color="inherit" sx={{ mr: 1 }}>
          <NotificationsNoneIcon />
        </IconButton>

        <IconButton color="inherit" onClick={handleUserClick}>
          <AccountCircleIcon />
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={handleClose}>Thông tin người dùng</MenuItem>
          <MenuItem onClick={handleClose}>Quản trị tài khoản</MenuItem>

          {/* ===== Line separator ===== */}
          <MenuItem disabled sx={{ opacity: 0.7, fontWeight: 600 }}>
            Giao diện
          </MenuItem>

          <MenuItem
            onClick={() => {
              setThemeName('navy');
              handleClose();
            }}
          >
            🌙 Navy Calm
          </MenuItem>

          <MenuItem
            onClick={() => {
              setThemeName('blueGray');
              handleClose();
            }}
          >
            🌤️ Blue Gray Soft
          </MenuItem>

          <MenuItem
            onClick={() => {
              setThemeName('forest');
              handleClose();
            }}
          >
            🌲 Forest Slate
          </MenuItem>

          <MenuItem onClick={handleLogout}>Đăng xuất</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
