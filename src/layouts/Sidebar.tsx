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
import FlagIcon from "@mui/icons-material/Flag";
import TableChartIcon from "@mui/icons-material/TableChart";
import DynamicFormIcon from "@mui/icons-material/DynamicForm";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
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
          <ListItemText primary="Tong quan" />
        </ListItemButton>
      </List>

      <Divider />

      <List
        subheader={(
          <ListSubheader component="div">
            Nhiem vu
          </ListSubheader>
        )}
      >
        <ListItemButton
          selected={isActive("/tasks") && !isActive("/tasks/create")}
          onClick={() => navigate("/tasks")}
        >
          <ListItemIcon>
            <AssignmentIcon />
          </ListItemIcon>
          <ListItemText primary="Danh sach nhiem vu" />
        </ListItemButton>
      </List>

      <Divider />

      <List
        subheader={(
          <ListSubheader component="div">
            Chi tieu
          </ListSubheader>
        )}
      >
        <ListItemButton
          selected={isActive("/indicators") && !isActive("/indicators/create")}
          onClick={() => navigate("/indicators")}
        >
          <ListItemIcon>
            <FlagIcon />
          </ListItemIcon>
          <ListItemText primary="Danh sach chi tieu" />
        </ListItemButton>
      </List>

      <Divider />

      <List
        subheader={(
          <ListSubheader component="div">
            Cong cu
          </ListSubheader>
        )}
      >
        <ListItemButton
          selected={isActive("/dynamic-excel")}
          onClick={() => navigate("/dynamic-excel")}
        >
          <ListItemIcon>
            <TableChartIcon />
          </ListItemIcon>
          <ListItemText primary="Bang bieu dong" />
        </ListItemButton>
        <ListItemButton
          selected={isActive("/dynamic-forms")}
          onClick={() => navigate("/dynamic-forms")}
        >
          <ListItemIcon>
            <DynamicFormIcon />
          </ListItemIcon>
          <ListItemText primary="Dynamic forms" />
        </ListItemButton>
        {canManageLabels && (
          <ListItemButton
            selected={isActive("/labels")}
            onClick={() => navigate("/labels")}
          >
            <ListItemIcon>
              <LocalOfferOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Quan ly nhan" />
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
