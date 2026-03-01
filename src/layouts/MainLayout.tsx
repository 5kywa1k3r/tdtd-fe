// src/layouts/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
export const MainLayout = () => {
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Header />

      <Box
        sx={{
          display: 'flex',
          flex: 1,
          mt: '64px', // bằng chiều cao AppBar
          overflow: 'hidden',
        }}
      >
        <Sidebar />

        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: { xs: 1.5, md: 3, lg: 4 },
            pt: 2,
            pb: 3,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
