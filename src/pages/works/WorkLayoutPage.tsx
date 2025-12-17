import { Outlet } from "react-router-dom";
import {
  Box
} from "@mui/material";

interface WorkLayoutProps {
  type: "TASK" | "INDICATOR";
  title: string;
  description: string;
}

export const WorkLayout = ({
  type: _type,
  title: _title,
  description: _description,
}: WorkLayoutProps) => {

  return (
    <Box
      sx={{
        width: "100%",
      }}
    >
      <Outlet />
      {/* <Card
        elevation={3}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
          background: theme.palette.background.paper,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Outlet />
        </CardContent>
      </Card> */}
    </Box>
  );
};

export default WorkLayout;
