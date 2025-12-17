// src/pages/DashboardPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { MissionDashboardTable } from '../../components/dashboard/MissionDashboardTable';

import {
  Box,
  Paper,
  Typography,
  Stack,
  Checkbox,
  FormControlLabel,
} from '@mui/material';

import {
  MantineDateHierarchyFilter,
  type DateHierarchyFilterValue,
} from '../../components/common/MantineDateHierarchyFilter';

import { UnitMultiSelect } from '../../components/common/UnitMultiSelect';

import { SummaryCard } from '../../components/dashboard/SummaryCard';
import {
  StatusPieChart,
  StatusBreakdownBarChart,
} from '../../components/charts';
import type {
  StatusPieItem,
  StatusBreakdownItem,
} from '../../components/charts';

import type { WorkStatusCore } from '../../constants/status';
import {
  STATUS_LABELS,
  WORK_STATUS_CORE_LIST,
} from '../../constants/status';

import type {
  DashboardMockData,
  MissionItem,
  MissionType,
} from '../../data/dashboardMock';
import { getDashboardMockData } from '../../data/dashboardMock';

import { UNIT_LABEL_MAP, type UnitId } from '../../data/unitMock';

const PAGE_SIZE = 10;

export function DashboardPage() {
  const [dateFilter, setDateFilter] = useState<DateHierarchyFilterValue>();
  const [data, setData] = useState<DashboardMockData | null>(null);
  const [selectedStatus, setSelectedStatus] =
    useState<WorkStatusCore | null>(null);

  const [typeFilter, setTypeFilter] = useState<MissionType[]>([
    'MISSION',
    'TARGET',
  ]);

  const [unitFilter, setUnitFilter] = useState<UnitId[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const handleTypeToggle = (type: MissionType) => {
    setTypeFilter((prev) => {
      const exists = prev.includes(type);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
    setPage(1);
  };

  const handleDateFilterChange = (v: DateHierarchyFilterValue) => {
    setDateFilter(v);
    setPage(1);
  };

  useEffect(() => {
    if (!dateFilter) return;

    const load = async () => {
      const res = await getDashboardMockData(dateFilter);
      setData(res);

      if (!selectedStatus) {
        setSelectedStatus('COMPLETED');
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const unitOptions = data?.units ?? [];

  const filteredMissions: MissionItem[] = useMemo(() => {
    if (!data) return [];

    return data.missions.filter((m) => {
      const okType = typeFilter.includes(m.type);
      const okUnit =
        unitFilter.length === 0 || unitFilter.includes(m.unitId);
      return okType && okUnit;
    });
  }, [data, typeFilter, unitFilter]);

  const summary = useMemo(() => {
    const byStatus: Record<WorkStatusCore, number> = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      AT_RISK: 0,
      DELAYED: 0,
      COMPLETED: 0,
    };

    filteredMissions.forEach((m) => {
      byStatus[m.status] += 1;
    });

    return {
      total: filteredMissions.length,
      byStatus,
    };
  }, [filteredMissions]);

  const pieData: StatusPieItem[] = useMemo(() => {
    const map: Record<WorkStatusCore, number> = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      AT_RISK: 0,
      DELAYED: 0,
      COMPLETED: 0,
    };

    filteredMissions.forEach((m) => {
      map[m.status] += 1;
    });

    return WORK_STATUS_CORE_LIST.map((s) => ({
      status: s,
      label: STATUS_LABELS[s],
      value: map[s],
    }));
  }, [filteredMissions]);

  const barData: StatusBreakdownItem[] = useMemo(() => {
    if (!selectedStatus) return [];

    const unitMap = new Map<UnitId, number>();

    filteredMissions
      .filter((m) => m.status === selectedStatus)
      .forEach((m) => {
        unitMap.set(m.unitId, (unitMap.get(m.unitId) ?? 0) + 1);
      });

    return Array.from(unitMap.entries()).map(([unitId, count]) => ({
      unit: UNIT_LABEL_MAP[unitId] ?? unitId,
      count,
    }));
  }, [filteredMissions, selectedStatus]);

  const paginatedMissions: MissionItem[] = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMissions.slice(start, start + PAGE_SIZE);
  }, [filteredMissions, page]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredMissions.length / PAGE_SIZE)
  );

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <Box
      sx={{
        px: 2,          // giữ ngang
        pt: 0,         
        pb: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,         // khoảng cách giữa filter và table = 16px
      }}
    >
      {/* ============================ BỘ LỌC ============================ */}
      <Paper
        sx={{
          p: 1.5,                    // 12px
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',         // cho nhẹ, tránh đè lên header
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems="stretch"
        >
          {/* Cột trái: Loại + Đơn vị */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={typeFilter.includes('MISSION')}
                    onChange={() => handleTypeToggle('MISSION')}
                  />
                }
                label="Nhiệm vụ"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={typeFilter.includes('TARGET')}
                    onChange={() => handleTypeToggle('TARGET')}
                  />
                }
                label="Chỉ tiêu"
              />
            </Stack>

            <UnitMultiSelect
              options={unitOptions}
              value={unitFilter}
              onChange={(v) => {
                setUnitFilter(v);
                setPage(1);
              }}
            />
          </Box>

          {/* Cột phải: Thời gian (không còn chữ "Thời gian") */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end', // canh đáy cho thẳng hàng ô đơn vị
            }}
          >
            <MantineDateHierarchyFilter onChange={handleDateFilterChange} />
          </Box>
        </Stack>
      </Paper>

      {/* ============================ SUMMARY ============================ */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ flex: '1 1 260px', minWidth: 260 }}>
            <SummaryCard
              title="Tổng số nhiệm vụ / chỉ tiêu"
              value={summary.total}
              valueColor="primary.main"
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {WORK_STATUS_CORE_LIST.map((s) => (
            <Box key={s} sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <SummaryCard
                title={STATUS_LABELS[s]}
                value={summary.byStatus[s]}
                valueColor={
                  s === 'COMPLETED'
                    ? 'success.main'
                    : s === 'DELAYED'
                    ? 'error.main'
                    : s === 'AT_RISK'
                    ? 'warning.main'
                    : 'primary.main'
                }
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* ============================ PIE + BAR ============================ */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <Paper
          sx={{
            p: 2,
            flex: '1 1 360px',
            minWidth: 360,
            height: 360,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Cơ cấu trạng thái
          </Typography>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <StatusPieChart
              data={pieData}
              selected={selectedStatus}
              onSelect={setSelectedStatus}
            />
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 2,
            flex: '1 1 360px',
            minWidth: 360,
            height: 360,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Chi tiết theo đơn vị
            {selectedStatus ? ` – ${STATUS_LABELS[selectedStatus]}` : ''}
          </Typography>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <StatusBreakdownBarChart data={barData} status={selectedStatus} />
          </Box>
        </Paper>
      </Box>

      {/* ============================ LIST ============================ */}
        <MissionDashboardTable
          rows={paginatedMissions}        // dữ liệu của trang hiện tại
          total={filteredMissions.length} // tổng số dòng
          page={page - 1}                 // AppTable dùng 0-based
          pageSize={PAGE_SIZE}
          onPageChange={(p) => setPage(p + 1)}       // chuyển về 1-based cho state hiện tại
          onPageSizeChange={(size) => {
            setPage(1);                   // reset về trang đầu
            setPageSize(size);            // nếu muốn cho đổi size
          }}
        />
    </Box>
  );
}
