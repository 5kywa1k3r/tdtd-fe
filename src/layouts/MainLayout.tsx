// src/layouts/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const APP_BAR_HEIGHT = 64; // hoặc dùng theme.mixins.toolbar.minHeight

export const MainLayout = () => {
  return (
    <>
      {/* Thanh header trên cùng */}
      <Header />

      {/* Vùng bên dưới header: chiếm toàn bộ phần còn lại, có sidebar + main */}
      <Box
        sx={{
          position: 'fixed',
          top: APP_BAR_HEIGHT,   // ⬅️ bắt đầu ngay bên dưới header
          left: 0,
          right: 0,
          bottom: 0,             // ⬅️ kéo tới đáy màn hình
          display: 'flex',
          bgcolor: 'background.default',
        }}
      >
        {/* Sidebar bên trái */}
        <Sidebar />

        {/* MAIN CONTENT – scroll chỉ ở đây */}
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            pt: 2,
            px: { xs: 1.5, md: 3, lg: 4 },
            pb: 3,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </>
  );
};
