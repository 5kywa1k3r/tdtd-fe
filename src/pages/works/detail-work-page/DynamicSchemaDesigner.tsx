import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  Grid,
  TextField,
  IconButton,
  Divider,
  MenuItem,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

import { useAppDispatch, useAppSelector } from '../../../hooks';
import { publishSchema, retireField, migrateSchemaValues } from '../../../stores/dynamicSchemaSlice';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import type { SchemaVersion, DynamicField, DynamicSection } from '../../../types/dynamicReport';

const uid = () => Math.random().toString(36).slice(2);
const nowISO = () => new Date().toISOString();

function buildEmptyDraft(workId: string): SchemaVersion {
  return {
    id: 'draft',
    workId,
    versionNo: 0,
    createdAt: nowISO(),
    sections: [
      { id: uid(), title: 'Khối 1', description: '', columns: 2, fieldOrder: [] },
    ],
    fields: {},
  };
}

export const DynamicSchemaDesigner: React.FC<{ workId: string; workRange: { from: string; to: string } }> = ({ workId, workRange }) => {
  const dispatch = useAppDispatch();
  const { draft, versions, activeVersionId, loading } = useAppSelector(s => (s as any).dynamicSchema);

  const d: SchemaVersion = draft ?? buildEmptyDraft(workId);
  const [confirm, setConfirm] = useState<null | { kind: 'PUBLISH' | 'MIGRATE' | 'RETIRE'; payload?: any }>(null);

  const activeVersion = useMemo(
    () => versions.find((v: SchemaVersion) => v.id === activeVersionId),
    [versions, activeVersionId],
  );

  const fieldList = useMemo(() => Object.values(d.fields) as DynamicField[], [d.fields]);

  const addField = (sectionId: string) => {
    const fieldKey = `field_${uid()}`;
    const next: DynamicField = {
      id: uid(),
      fieldKey,
      name: 'Thuộc tính mới',
      description: '',
      isActive: true,
      config: {
        type: 'TEXT',
        range: { from: workRange.from, to: workRange.to },
        textMode: 'PLAIN',
        textAggregate: 'JOIN',
        effectiveRule: 'PREFER_SUPPLEMENT',
      },
      updatedAt: nowISO(),
    };

    d.fields[fieldKey] = next;
    const sec = d.sections.find(s => s.id === sectionId);
    if (sec) sec.fieldOrder.push(fieldKey);
    // draft đang nằm trong store: bệ hạ map action setDraft/upsert nếu muốn strict immutable
    // demo: force rerender bằng trick
    setConfirm(null);
  };

  const updateField = (fieldKey: string, patch: Partial<DynamicField>) => {
    const cur = d.fields[fieldKey];
    if (!cur) return;
    d.fields[fieldKey] = { ...cur, ...patch, updatedAt: nowISO() };
    setConfirm(null);
  };

  const updateSection = (secId: string, patch: Partial<DynamicSection>) => {
    const idx = d.sections.findIndex(s => s.id === secId);
    if (idx < 0) return;
    d.sections[idx] = { ...d.sections[idx], ...patch };
    setConfirm(null);
  };

  const onPublish = () => setConfirm({ kind: 'PUBLISH' });
  const onMigrate = () => setConfirm({ kind: 'MIGRATE' });
  const onRetire = (fieldKey: string) => setConfirm({ kind: 'RETIRE', payload: { fieldKey } });

  const doPublish = async () => {
    await dispatch(publishSchema({ workId, draft: d }) as any);
    setConfirm(null);
  };

  const doMigrate = async () => {
    const from = activeVersion?.id;
    const to = (versions.at(-1) as SchemaVersion | undefined)?.id; // publish xong bệ hạ gọi migrate ngay sẽ đúng
    if (!from || !to || from === to) { setConfirm(null); return; }

    const compatibleFieldKeys = Object.values(d.fields)
      .filter(f => f.isActive)
      .map(f => f.fieldKey);

    await dispatch(migrateSchemaValues({ workId, fromVersionId: from, toVersionId: to, fieldKeys: compatibleFieldKeys }) as any);
    setConfirm(null);
  };

  const doRetire = async (fieldKey: string) => {
    await dispatch(retireField({ fieldKey }) as any);
    setConfirm(null);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>Thiết kế biểu mẫu</Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Dùng Section/Card + chia cột. Field có thể retire (ẩn) nhưng không xóa dữ liệu.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" disabled={loading} onClick={onMigrate}>
            Chuyển dữ liệu (migrate)
          </Button>
          <Button variant="contained" disabled={loading} onClick={onPublish}>
            Phát hành version
          </Button>
        </Stack>
      </Stack>

      {d.sections.map((sec) => (
        <Card key={sec.id} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    label="Tên khối (Section)"
                    value={sec.title}
                    onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                  />
                </Box>

                <TextField
                  select
                  label="Số cột"
                  value={sec.columns}
                  onChange={(e) => updateSection(sec.id, { columns: Number(e.target.value) as any })}
                  sx={{ width: 160 }}
                >
                  {[1,2,3,4].map(n => <MenuItem key={n} value={n}>{n} cột</MenuItem>)}
                </TextField>

                <Button
                  startIcon={<AddRoundedIcon />}
                  variant="outlined"
                  onClick={() => addField(sec.id)}
                >
                  Thêm thuộc tính
                </Button>
              </Stack>

              <Divider />

              <Grid container spacing={2}>
                {sec.fieldOrder.map((fieldKey) => {
                  const f = d.fields[fieldKey];
                  if (!f) return null;

                  return (
                    <Grid
                      size={{
                        xs: 12,
                        md:
                          sec.columns === 1
                            ? 12
                            : sec.columns === 2
                            ? 6
                            : sec.columns === 3
                            ? 4
                            : 3,
                      }}
                      key={fieldKey}
                    >
                      <Card variant="outlined" sx={{ borderRadius: 3, opacity: f.isActive ? 1 : 0.55 }}>
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography sx={{ fontWeight: 800 }}>
                                {f.name}
                              </Typography>

                              <IconButton size="small" onClick={() => onRetire(fieldKey)}>
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Stack>

                            <TextField
                              label="Tên"
                              value={f.name}
                              onChange={(e) => updateField(fieldKey, { name: e.target.value })}
                              fullWidth
                              size="small"
                            />

                            <TextField
                              label="Nội dung"
                              value={f.description ?? ''}
                              onChange={(e) => updateField(fieldKey, { description: e.target.value })}
                              fullWidth
                              size="small"
                            />

                            <Stack direction="row" spacing={1}>
                              <TextField
                                select
                                label="Định dạng"
                                value={f.config.type}
                                onChange={(e) => updateField(fieldKey, { config: { ...f.config, type: e.target.value as any } })}
                                size="small"
                                fullWidth
                              >
                                <MenuItem value="TEXT">Text</MenuItem>
                                <MenuItem value="SHEET">FortuneSheet</MenuItem>
                              </TextField>

                              <TextField
                                label="FieldKey"
                                value={f.fieldKey}
                                size="small"
                                fullWidth
                                disabled
                              />
                            </Stack>

                            <Stack direction="row" spacing={1}>
                              <TextField
                                label="Từ ngày (ISO)"
                                value={f.config.range.from}
                                onChange={(e) => updateField(fieldKey, { config: { ...f.config, range: { ...f.config.range, from: e.target.value } } })}
                                size="small"
                                fullWidth
                              />
                              <TextField
                                label="Đến ngày (ISO)"
                                value={f.config.range.to}
                                onChange={(e) => updateField(fieldKey, { config: { ...f.config, range: { ...f.config.range, to: e.target.value } } })}
                                size="small"
                                fullWidth
                              />
                            </Stack>

                            {!f.isActive && (
                              <Typography variant="caption" sx={{ color: 'warning.main' }}>
                                Thuộc tính đã ẩn (retire). Dữ liệu và lịch sử vẫn giữ.
                              </Typography>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      ))}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirm?.kind === 'PUBLISH'}
        variant="warning"
        title="Phát hành biểu mẫu"
        message={
          <Stack spacing={1}>
            <Typography variant="body2">Bạn sắp phát hành một phiên bản schema mới.</Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Dữ liệu đã nhập sẽ được giữ theo phiên bản cũ. Bạn có thể migrate dữ liệu tương thích sau đó.
            </Typography>
          </Stack>
        }
        confirmText="Phát hành"
        cancelText="Hủy"
        confirmLoading={loading}
        onConfirm={doPublish}
        onClose={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm?.kind === 'MIGRATE'}
        variant="info"
        title="Chuyển dữ liệu (migrate)"
        message={
          <Stack spacing={1}>
            <Typography variant="body2">
              Hệ thống sẽ chuyển dữ liệu tương thích (cùng type) từ version hiện hành sang version mới.
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Chỉ migrate theo fieldKey đang active.
            </Typography>
          </Stack>
        }
        confirmText="Thực hiện"
        cancelText="Hủy"
        confirmLoading={loading}
        onConfirm={doMigrate}
        onClose={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm?.kind === 'RETIRE'}
        variant="warning"
        title="Ẩn thuộc tính"
        message="Thuộc tính sẽ không còn hiển thị để nhập mới, nhưng dữ liệu và lịch sử vẫn được giữ lại."
        confirmText="Ẩn"
        cancelText="Hủy"
        confirmLoading={loading}
        onConfirm={() => doRetire(confirm?.payload?.fieldKey)}
        onClose={() => setConfirm(null)}
      />
    </Stack>
  );
};
