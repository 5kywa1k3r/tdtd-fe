import { Box, Tab, Tabs } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { canCrudEvaluationTemplate } from '../../components/evaluation/evaluationTemplateWhitelist';
import { UnitTypesPanel } from '../../features/admin/unitTypes/UnitTypesPanel';
import { UnitsPanel } from '../../features/admin/units/UnitsPanel';
import { UsersPanel } from '../../features/admin/users/UsersPanel';
import { getMeSnapshot } from '../../stores/authStorage';
import EvaluationTemplateManagementPage from '../evaluation/EvaluationTemplateManagementPage';

type AdminAccountTab = 'unitTypes' | 'evaluation' | 'units' | 'users';

export default function AdminAccountsPage() {
  const me = getMeSnapshot();
  const [searchParams, setSearchParams] = useSearchParams();
  const roles = me?.roles ?? [];
  const canManageCatalog = roles.includes('ADMIN') || roles.includes('SYSTEM_ADMIN');
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
        canSeeEvaluation ? { value: 'evaluation' as const, label: 'Bộ mã đánh giá' } : null,
        { value: 'units' as const, label: 'Đơn vị' },
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
    <Box sx={{ p: 2 }}>
      <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
        {tabs.map((item) => (
          <Tab key={item.value} value={item.value} label={item.label} />
        ))}
      </Tabs>

      {tab === 'unitTypes' && <UnitTypesPanel />}
      {tab === 'evaluation' && <EvaluationTemplateManagementPage />}
      {tab === 'units' && <UnitsPanel />}
      {tab === 'users' && <UsersPanel />}
    </Box>
  );
}
