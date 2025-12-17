import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Stack,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { WorkForm } from '../../../components/works/WorkForm';
import { MOCK_WORK_DETAIL_MAP } from '../../../data/mockWorkDetail';

type WorkType = 'TASK' | 'INDICATOR';

interface WorkDetailPageProps {
  type: WorkType;
}

type DetailTab = 'COMMON' | 'DYNAMIC' | 'UNITS' | 'AGGREGATE';

const WorkDetailPage = ({ type }: WorkDetailPageProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [tab, setTab] = useState<DetailTab>('COMMON');

  const detail = useMemo(() => {
    if (!id) return null;
    return MOCK_WORK_DETAIL_MAP[id] ?? null;
  }, [id]);

  const title = type === 'TASK' ? 'Chi tiết nhiệm vụ' : 'Chi tiết chỉ tiêu';

  if (!id) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Thiếu id.</Typography>
      </Box>
    );
  }

  if (!detail) {
    return (
      <Box sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>``
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Không tìm thấy dữ liệu (mock) với id: {id}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
          >
            Quay lại
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, p: 2, pt: 0 }}>
      <Stack spacing={2}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Stack spacing={0.25}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {detail.code} • {detail.name}
            </Typography>
          </Stack>

          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
          >
            Quay lại
          </Button>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as DetailTab)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="COMMON" label="Thuộc tính chung" />
          <Tab value="DYNAMIC" label="Thiết kế biểu mẫu" />
          <Tab value="UNITS" label="Đơn vị báo cáo" />
          <Tab value="AGGREGATE" label="Tổng hợp báo cáo" />
        </Tabs>


        {/* Tab content */}
        {tab === 'COMMON' && (
          <WorkForm
            type={type}
            mode="view"
            initialData={detail}
            onCancel={() => navigate(-1)}
          />
        )}

        {tab === 'DYNAMIC' && (
          <Box sx={{ p: 2, opacity: 0.6 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Thiết kế biểu mẫu (page động)
            </Typography>
            <Typography variant="body2">
              Placeholder – sẽ gắn DynamicSchemaDesigner tại đây.
            </Typography>
          </Box>
        )}

        {tab === 'UNITS' && (
          <Box sx={{ p: 2, opacity: 0.6 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Đơn vị báo cáo
            </Typography>
            <Typography variant="body2">
              Placeholder – sẽ gắn UnitReportList tại đây.
            </Typography>
          </Box>
        )}

        {tab === 'AGGREGATE' && (
          <Box sx={{ p: 2, opacity: 0.6 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Tổng hợp báo cáo
            </Typography>
            <Typography variant="body2">
              Placeholder – sẽ gắn AggregationBuilderPage tại đây.
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default WorkDetailPage;
