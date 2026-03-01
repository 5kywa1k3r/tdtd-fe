// src/layouts/Sidebar.tsx
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Divider,
  Toolbar,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FlagIcon from '@mui/icons-material/Flag';
import { useLocation, useNavigate } from 'react-router-dom';
import TableChartIcon from '@mui/icons-material/TableChart';
//TEST
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export const drawerWidth = 260;

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path ||
    location.pathname.startsWith(path + '/');

  const drawerContent = (
    <>
      {/* đẩy nội dung xuống dưới AppBar */}
      <Toolbar />

      <List>
        <ListItemButton
          selected={isActive('/') || isActive('/dashboard')}
          onClick={() => navigate('/dashboard')}
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Tổng quan" />
        </ListItemButton>
      </List>

      <Divider />

      {/* TEST */}
      <ListItemButton
        selected={isActive('/uploads-test')}
        onClick={() => navigate('/uploads-test')}
      >
        <ListItemIcon>
          <CloudUploadIcon />
        </ListItemIcon>
        <ListItemText primary="Upload test" />
      </ListItemButton>
      {/* TEST */}
      
      <List
        subheader={
          <ListSubheader component="div">
            Nhiệm vụ
          </ListSubheader>
        }
      >
        <ListItemButton
          selected={isActive('/tasks') && !isActive('/tasks/create')}
          onClick={() => navigate('/tasks')}
        >
          <ListItemIcon>
            <AssignmentIcon />
          </ListItemIcon>
          <ListItemText primary="Danh sách nhiệm vụ" />
        </ListItemButton>
      </List>

      <Divider />

      <List
        subheader={
          <ListSubheader component="div">
            Chỉ tiêu
          </ListSubheader>
        }
      >
        <ListItemButton
          selected={isActive('/indicators') && !isActive('/indicators/create')}
          onClick={() => navigate('/indicators')}
        >
          <ListItemIcon>
            <FlagIcon />
          </ListItemIcon>
          <ListItemText primary="Danh sách chỉ tiêu" />
        </ListItemButton>
      </List>

      <Divider />

      <List
        subheader={
          <ListSubheader component="div">
            Công cụ
          </ListSubheader>
        }
      >
        <ListItemButton
          selected={isActive('/dynamic-excel')}
          onClick={() => navigate('/dynamic-excel')}
        >
          <ListItemIcon>
            <TableChartIcon />
          </ListItemIcon>
          <ListItemText primary="Bảng biểu động" />
        </ListItemButton>
      </List>
    </>
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' }, // ẩn trên màn nhỏ
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};
