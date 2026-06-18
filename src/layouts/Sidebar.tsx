// src/layouts/Sidebar.tsx
import {
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Toolbar,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DynamicFormIcon from "@mui/icons-material/DynamicForm";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import { useLocation, useNavigate } from "react-router-dom";

import { useGetMeQuery } from "../api/base/meApi";
import { Role, isManagerUnitRole } from "../constants/roles";

export const drawerWidth = 260;

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const meQuery = useGetMeQuery();
  const roles = meQuery.data?.roles ?? [];
  const canManageLabels = roles.some(
    (role) =>
      role === Role.SYSTEM_ADMIN ||
      role === Role.MANAGER_LEVEL ||
      isManagerUnitRole(role),
  );
  const canSeeOperations = canManageLabels;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const drawerContent = (
    <>
      <Toolbar />

      <List>
        <ListItemButton
          selected={isActive("/") || isActive("/dashboard")}
          onClick={() => navigate("/dashboard")}
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Tổng quan" />
        </ListItemButton>
      </List>

      <Divider />

      <List
        subheader={(
          <ListSubheader component="div">
            Nhiệm vụ / Chỉ tiêu
          </ListSubheader>
        )}
      >
        <ListItemButton
          selected={isActive("/works") || isActive("/tasks") || isActive("/indicators")}
          onClick={() => navigate("/works")}
        >
          <ListItemIcon>
            <AssignmentIcon />
          </ListItemIcon>
          <ListItemText primary="Danh sách công việc" />
        </ListItemButton>
      </List>

      <Divider />

      <List
        subheader={(
          <ListSubheader component="div">
            Công cụ
          </ListSubheader>
        )}
      >
        <ListItemButton
          selected={isActive("/dynamic-excel")}
          onClick={() => navigate("/dynamic-excel")}
        >
          <ListItemIcon>
            <TableChartOutlinedIcon />
          </ListItemIcon>
          <ListItemText primary="Bảng biểu động" />
        </ListItemButton>
        <ListItemButton
          selected={isActive("/dynamic-forms")}
          onClick={() => navigate("/dynamic-forms")}
        >
          <ListItemIcon>
            <DynamicFormIcon />
          </ListItemIcon>
          <ListItemText primary="Biểu mẫu động" />
        </ListItemButton>
        {canManageLabels && (
          <ListItemButton
            selected={isActive("/labels")}
            onClick={() => navigate("/labels")}
          >
            <ListItemIcon>
              <LocalOfferOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Quản lý nhãn" />
          </ListItemButton>
        )}
        {canSeeOperations && (
          <ListItemButton
            selected={isActive("/operations")}
            onClick={() => navigate("/operations")}
          >
            <ListItemIcon>
              <ManageSearchIcon />
            </ListItemIcon>
            <ListItemText primary="Vận hành hệ thống" />
          </ListItemButton>
        )}
      </List>
    </>
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        display: { xs: "none", md: "block" },
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};
