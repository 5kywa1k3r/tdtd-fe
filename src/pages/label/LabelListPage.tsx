import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';

import type { LabelOption } from '../../components/label/labelTypes';
import { MOCK_LABELS } from '../../data/labelMock';

export default function LabelListPage() {
  const navigate = useNavigate();

  // mock trước; sau này đổi sang store/api
  const [labels, setLabels] = useState<LabelOption[]>(MOCK_LABELS);

  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return labels;
    return labels.filter(x => x.name.toLowerCase().includes(s));
  }, [labels, q]);

  const handleDelete = (id: string) => {
    // mock confirm đơn giản; sau muốn đẹp thì dùng Dialog
    const ok = window.confirm('Xóa nhãn này?');
    if (!ok) return;

    setLabels(prev => prev.filter(x => x.id !== id));
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} mb={2}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">Quản lý nhãn</Typography>
          <Typography variant="body2" color="text.secondary">
            Tạo/sửa/xóa nhãn dùng cho nhiệm vụ, chỉ tiêu, bảng biểu…
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/labels/create')}
        >
          Tạo nhãn
        </Button>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch" mb={2}>
            <TextField
              size="small"
              label="Tìm nhãn"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" style={{ marginRight: 8 }} />,
              }}
            />

            <Chip
              label={`${filtered.length} nhãn`}
              variant="outlined"
              sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
            />
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={1}>
            {filtered.map((x) => (
              <Box
                key={x.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  p: 1,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Chip label={x.name} size="small" />
                  <Typography variant="body2" color="text.secondary" noWrap>
                    ID: {x.id}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/labels/${x.id}/edit`)}
                    title="Sửa"
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>

                  <IconButton
                    size="small"
                    onClick={() => handleDelete(x.id)}
                    title="Xóa"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            ))}

            {filtered.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Không có nhãn nào khớp từ khóa.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}