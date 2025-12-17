import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  TextField,
  MenuItem,
  Divider,
  Chip,
} from '@mui/material';
import { useAppSelector } from '../../../hooks';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { api_aggregate } from '../../../services/dynamicReportApi';
import type { AggregationSelection, SchemaVersion } from '../../../types/dynamicReport';

export const AggregationBuilderPage: React.FC<{ workId: string }> = ({ workId }) => {
  const { versions } = useAppSelector(s => (s as any).dynamicSchema);

  const [versionIds, setVersionIds] = useState<string[]>([]);
  const [fieldKeys, setFieldKeys] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<'LATEST_VERSION_WINS'|'MERGE_ALL'>('LATEST_VERSION_WINS');

  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const allFieldKeys = useMemo(() => {
    const ks = new Set<string>();
    (versions as SchemaVersion[]).forEach(v => Object.keys(v.fields).forEach(k => ks.add(k)));
    return Array.from(ks);
  }, [versions]);

  const onAggregate = () => setConfirm(true);

  const doAggregate = async () => {
    setLoading(true);
    const sel: AggregationSelection = { workId, versionIds, fieldKeys, strategy };
    const res = await api_aggregate(sel);
    setResult(res as any[]);
    setLoading(false);
    setConfirm(false);
  };

  const toStringArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean); // fallback
    return [];
  };

  return (
    <Stack spacing={2}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Trình tổng hợp báo cáo</Typography>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Chọn phiên bản + thuộc tính (fieldKey) để tổng hợp. Có thể tổng hợp đa-version.
              </Typography>
            </Stack>

            <TextField
              select
              label="Chiến lược hợp nhất"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
            >
              <MenuItem value="LATEST_VERSION_WINS">Version mới nhất thắng</MenuItem>
              <MenuItem value="MERGE_ALL">Merge tất cả</MenuItem>
            </TextField>

            <TextField
              select
              label="Chọn version (multi)"
              slotProps={{
                select: {
                multiple: true,
                },
              }}
              value={versionIds}
              onChange={(e) => setVersionIds(toStringArray(e.target.value))}
              helperText="Chọn một hoặc nhiều version để làm nguồn tổng hợp."
            >
              {(versions as SchemaVersion[]).map(v => (
                <MenuItem key={v.id} value={v.id}>
                  v{v.versionNo} • {new Date(v.createdAt).toLocaleString()}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Chọn fieldKey (multi)"
              slotProps={{
                select: {
                multiple: true,
                },
              }}
              value={fieldKeys}
              onChange={(e) => setFieldKeys(toStringArray(e.target.value))}
              helperText="Chọn các thuộc tính/bảng biểu đã thiết kế."
            >
              {allFieldKeys.map(k => (
                <MenuItem key={k} value={k}>{k}</MenuItem>
              ))}
            </TextField>

            <Button
              variant="contained"
              onClick={onAggregate}
              disabled={loading || versionIds.length === 0 || fieldKeys.length === 0}
            >
              Tổng hợp
            </Button>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Kết quả (demo raw)</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {result.slice(0, 20).map((r, idx) => (
                <Chip
                  key={idx}
                  label={`${r.unitId} • ${r.fieldKey} • v=${r.schemaVersionId}`}
                />
              ))}
              {result.length === 0 && (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Chưa có dữ liệu tổng hợp.
                </Typography>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm}
        variant="info"
        title="Tổng hợp từ nhiều phiên bản"
        message={
          <Stack spacing={1}>
            <Typography variant="body2">
              Bạn sắp tổng hợp từ {versionIds.length} phiên bản, {fieldKeys.length} thuộc tính.
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Nếu fieldKey không tồn tại ở một số version, engine sẽ bỏ qua hoặc dùng chiến lược hợp nhất.
            </Typography>
          </Stack>
        }
        confirmText="Tiếp tục tổng hợp"
        cancelText="Quay lại"
        confirmLoading={loading}
        onConfirm={doAggregate}
        onClose={() => setConfirm(false)}
      />
    </Stack>
  );
};
