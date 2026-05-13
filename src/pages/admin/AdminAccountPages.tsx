import { Box, Tab, Tabs } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { canCrudEvaluationTemplate } from '../../components/evaluation/evaluationTemplateWhitelist';
import { PositionsPanel } from '../../features/admin/positions/PositionsPanel';
import { UnitTypesPanel } from '../../features/admin/unitTypes/UnitTypesPanel';
import { UnitsPanel } from '../../features/admin/units/UnitsPanel';
import { UsersPanel } from '../../features/admin/users/UsersPanel';
import { getMeSnapshot } from '../../stores/authStorage';
import EvaluationTemplateManagementPage from '../evaluation/EvaluationTemplateManagementPage';

type AdminAccountTab = 'unitTypes' | 'positions' | 'evaluation' | 'units' | 'users';

export default function AdminAccountsPage() {
  const me = getMeSnapshot();
  const [searchParams, setSearchParams] = useSearchParams();
  const roles = me?.roles ?? [];
  const isSystemAdmin = roles.includes('SYSTEM_ADMIN') || me?.accountKind === 'SYSTEM_ADMIN';
  const canManageCatalog = roles.includes('ADMIN') || isSystemAdmin;
  const canSeeEvaluation = canCrudEvaluationTemplate({
    unitCode: me?.unitCode,
    unitSymbol: me?.unitSymbol,
    username: me?.username,
    positionCode: me?.positionCode,
    roles,
  });

  const tabs = useMemo(
    () =>
      [
        canManageCatalog ? { value: 'unitTypes' as const, label: 'Loại đơn vị' } : null,
        canManageCatalog ? { value: 'positions' as const, label: 'Chức vụ' } : null,
        { value: 'units' as const, label: 'Đơn vị' },
        canSeeEvaluation ? { value: 'evaluation' as const, label: 'Bộ mã đánh giá' } : null,
        { value: 'users' as const, label: 'Người dùng' },
      ].filter(Boolean) as Array<{ value: AdminAccountTab; label: string }>,
    [canManageCatalog, canSeeEvaluation],
  );

  const requestedTab = searchParams.get('tab') as AdminAccountTab | null;
  const initialTab = tabs.some((item) => item.value === requestedTab)
    ? requestedTab!
    : tabs[0]?.value ?? 'units';
  const [tab, setTab] = useState<AdminAccountTab>(initialTab);

  useEffect(() => {
    const requested = tabs.some((item) => item.value === requestedTab) ? requestedTab : null;
    if (requested && requested !== tab) {
      setTab(requested);
      return;
    }
    if (!tabs.some((item) => item.value === tab)) {
      setTab(tabs[0]?.value ?? 'units');
    }
  }, [requestedTab, tab, tabs]);

  const handleTabChange = (_: unknown, value: AdminAccountTab) => {
    setTab(value);
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
      <Tabs
        value={tab}
        onChange={handleTabChange}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ minHeight: 44, '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 700 } }}
      >
        {tabs.map((item) => (
          <Tab key={item.value} value={item.value} label={item.label} />
        ))}
      </Tabs>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        {tab === 'unitTypes' && <UnitTypesPanel />}
        {tab === 'positions' && <PositionsPanel />}
        {tab === 'evaluation' && <EvaluationTemplateManagementPage />}
        {tab === 'units' && <UnitsPanel />}
        {tab === 'users' && <UsersPanel />}
      </Box>
    </Box>
  );
}
