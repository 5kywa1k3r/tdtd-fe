import * as React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Chip,
  Paper,
  Tooltip
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { useNavigate } from 'react-router-dom';

import { useAppTheme } from '../theme/ThemeProviderCustom';
import { useAppDispatch } from '../hooks';
import { logout } from '../stores/authSlice';

import { getMeSnapshot, type MeSnapshot } from '../stores/authStorage';
import { Role, isManagerUnitRole } from '../constants/roles';

const hasAnyRole = (roles: string[] | undefined, allow: string[]) => {
  if (!roles?.length) return false;

  const set = new Set(roles.map(r => (r ?? '').trim().toUpperCase()));

  // accept MANAGER_UNIT:<unitId>
  if (allow.includes(Role.MANAGER_UNIT)) {
    if (set.has(Role.MANAGER_UNIT)) return true;
    if (roles.some(r => isManagerUnitRole((r ?? '').trim()))) return true;
  }

  return allow.some(a => set.has(a.toUpperCase()));
};

type MeRowProps = {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
};

export function MeRow({ icon, label, value }: MeRowProps) {
  const v = value?.trim() || '—';

  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        borderRadius: 2,
        px: 1.5,
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        backgroundColor: theme.palette.background.paper,
      })}
    >
      <Box
        sx={(theme) => ({
          width: 32,
          height: 32,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          flex: '0 0 auto',
          color: theme.palette.primary.main,
          backgroundColor: theme.palette.action.hover,
        })}
      >
        {icon}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="caption"
          sx={(theme) => ({
            color: theme.palette.text.secondary,
            fontWeight: 500,
            letterSpacing: 0.3,
          })}
        >
          {label}
        </Typography>

        {/* ✅ value luôn 1 dòng, ellipsis, hover xem full */}
        <Tooltip title={v} placement="top" arrow disableHoverListener={v.length < 18}>
          <Typography
            sx={{
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.25,
            }}
          >
            {v}
          </Typography>
        </Tooltip>
      </Box>
    </Paper>
  );
}

export const Header = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [openMeDialog, setOpenMeDialog] = React.useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { setThemeName } = useAppTheme();

  const me: MeSnapshot | null = getMeSnapshot();

  const fullName = me?.fullName?.trim() || '';
  const username = me?.username?.trim() || '';
  const unitName = me?.unitName?.trim() || '';

  const displayLine1 = fullName || username || 'Tài khoản';
  const displayLine2 = fullName && username ? username : '';

  const canSeeAdmin = hasAnyRole(me?.roles, [
    Role.SYSTEM_ADMIN,
    Role.ADMIN,
    Role.MANAGER_LEVEL,
    Role.MANAGER_UNIT,
  ]);

  const handleUserClick = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleOpenMeDialog = () => {
    handleCloseMenu();
    setOpenMeDialog(true);
  };

  const handleLogout = () => {
    handleCloseMenu();
    dispatch(logout());
    navigate('/login');
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={(theme) => ({
          zIndex: theme.zIndex.appBar,
          background: theme.customGradients.headerBackground,
          borderRadius: 0,
        })}
      >
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>
            PHẦN MỀM THEO DÕI TIẾN ĐỘ NHIỆM VỤ, CHỈ TIÊU
          </Typography>

          <IconButton color="inherit" sx={{ mr: 0.5 }}>
            <NotificationsNoneIcon />
          </IconButton>

          {/* cụm user gọn */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 999,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <IconButton color="inherit" onClick={handleUserClick} sx={{ p: 0.75 }}>
              <AccountCircleIcon />
            </IconButton>

            <Box sx={{ lineHeight: 1.05 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {displayLine1}
              </Typography>
              {displayLine2 && (
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  {displayLine2}
                </Typography>
              )}
            </Box>
          </Stack>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                mt: 1,
                borderRadius: 2,
                minWidth: 230,
                overflow: 'hidden',
              },
            }}
          >
            <MenuItem onClick={handleOpenMeDialog}>Thông tin người dùng</MenuItem>

            {canSeeAdmin && (
              <MenuItem
                onClick={() => {
                  handleCloseMenu();
                  navigate('/admin/accounts');
                }}
              >
                Quản trị tài khoản
              </MenuItem>
            )}

            <Divider />

            <MenuItem disabled sx={{ opacity: 0.7, fontWeight: 700 }}>
              Giao diện
            </MenuItem>

            <MenuItem onClick={() => { setThemeName('navy'); handleCloseMenu(); }}>
              🌙 Navy Calm
            </MenuItem>
            <MenuItem onClick={() => { setThemeName('blueGray'); handleCloseMenu(); }}>
              🌤️ Blue Gray Soft
            </MenuItem>
            <MenuItem onClick={() => { setThemeName('forest'); handleCloseMenu(); }}>
              🌲 Forest Slate
            </MenuItem>

            <Divider />

            <MenuItem onClick={handleLogout}>Đăng xuất</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

  {/* Popup thông tin người dùng */}
  <Dialog
    open={openMeDialog}
    onClose={() => setOpenMeDialog(false)}
    fullWidth
    maxWidth="xs"
    PaperProps={{
      sx: {
        borderRadius: 3,
        overflow: 'hidden',
      },
    }}
  >
    <DialogTitle sx={{ pb: 1.25 }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
        <AccountCircleIcon fontSize="large" />

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={fullName || undefined}
          >
            {fullName || 'Thông tin người dùng'}
          </Typography>

          {/* ✅ 1 dòng cố định, không wrap */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              mt: 0.75,
              minWidth: 0,
              flexWrap: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {username && (
              <Chip
                size="small"
                label={username}
                title={username}
                sx={(theme) => ({
                  maxWidth: '45%',
                  fontWeight: 800,
                  borderRadius: 1.5,
                  color: theme.palette.primary.contrastText,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                })}
              />
            )}

            {unitName && (
              <Chip
                size="small"
                label={unitName}
                title={unitName}
                sx={(theme) => ({
                  maxWidth: username ? '55%' : '100%',
                  fontWeight: 800,
                  borderRadius: 1.5,
                  color: theme.palette.primary.contrastText,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                })}
              />
            )}
          </Stack>
        </Box>
      </Stack>
    </DialogTitle>

    <DialogContent sx={{ pt: 1.5, pb: 2 }} dividers>
      <Stack spacing={1.25}>
        <MeRow
          icon={<BadgeOutlinedIcon fontSize="small" />}
          label="Username"
          value={username}
        />
        <MeRow
          icon={<PersonOutlineIcon fontSize="small" />}
          label="Họ tên"
          value={fullName}
        />
        <MeRow
          icon={<BusinessOutlinedIcon fontSize="small" />}
          label="Đơn vị"
          value={unitName}
        />
      </Stack>
    </DialogContent>

    <DialogActions sx={{ px: 2, py: 1.5 }}>
      <Button onClick={() => setOpenMeDialog(false)} variant="contained">
        Đóng
      </Button>
    </DialogActions>
  </Dialog>
    </>
  );
};