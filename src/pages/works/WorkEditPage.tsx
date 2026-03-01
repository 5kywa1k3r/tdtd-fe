import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { WorkForm } from '../../components/works/WorkForm';
import type { WorkDetailData } from '../../components/works/WorkForm';

//  mock tách file riêng (map theo id)
import { MOCK_WORK_DETAIL_MAP } from '../../data/mockWorkDetail';

type WorkType = 'TASK' | 'INDICATOR';

interface WorkEditPageProps {
  type: WorkType;
}

const WorkEditPage = ({ type }: WorkEditPageProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const detail = useMemo<WorkDetailData | null>(() => {
    if (!id) return null;
    return MOCK_WORK_DETAIL_MAP[id] ?? null;
  }, [id]);

  const title = type === 'TASK' ? 'Cập nhật nhiệm vụ' : 'Cập nhật chỉ tiêu';

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
          </Typography>
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

        <WorkForm
          type={type}
          mode="edit"
          initialData={detail}
          onCancel={() => navigate(-1)}
          onSaved={() => {
            // TODO: gọi thunk update rồi quay lại detail
            navigate(`../${id}`); // từ /:id/edit → /:id
          }}
        />
      </Stack>
    </Box>
  );
};

export default WorkEditPage;
