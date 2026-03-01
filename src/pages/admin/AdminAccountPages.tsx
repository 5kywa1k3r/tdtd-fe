import { Box, Tab, Tabs } from '@mui/material';
import { useState } from 'react';
import { UnitsPanel } from '../../features/admin/units/UnitsPanel';
import { UsersPanel } from '../../features/admin/users/UsersPanel';

export default function AdminAccountsPage() {
  const [tab, setTab] = useState<'units' | 'users'>('units');

  return (
    <Box sx={{ p: 2 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="units" label="Đơn vị" />
        <Tab value="users" label="Người dùng" />
      </Tabs>

      {tab === 'units' ? <UnitsPanel /> : <UsersPanel />}
    </Box>
  );
}