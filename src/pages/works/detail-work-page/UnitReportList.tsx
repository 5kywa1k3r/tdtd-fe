import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  Grid,
  TextField,
  Divider,
  MenuItem,
} from '@mui/material';

import { useAppDispatch, useAppSelector } from '../../../hooks';
import { fetchUnitValues, fetchFieldRevisions, upsertUnitFieldValue } from '../../../stores/unitReportSlice';
import { openSupplementWindow, closeSupplementWindow, fetchSupplementWindows } from '../../../stores/supplementSlice';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { FieldHistoryDialog } from '../../../components/common/FieldHistoryDialog';
import type { DynamicField, SchemaVersion, SupplementWindow, UnitFieldValue } from '../../../types/dynamicReport';

const nowISO = () => new Date().toISOString();

const MOCK_UNITS = [
  { id: 'U001', name: 'Đơn vị A' },
  { id: 'U002', name: 'Đơn vị B' },
];

export const UnitReportList: React.FC<{ workId: string; activeVersion: SchemaVersion }> = ({ workId, activeVersion }) => {
  const dispatch = useAppDispatch();
  const { values, revisions, loading } = useAppSelector(s => (s as any).unitReport);
  const { windows } = useAppSelector(s => (s as any).supplement);

  const [unitId, setUnitId] = useState(MOCK_UNITS[0].id);

  const [confirm, setConfirm] = useState<null | { kind: 'OPEN_SELF'|'OPEN_REQUEST'|'CLOSE_WINDOW'; payload?: any }>(null);
  const [openHistory, setOpenHistory] = useState(false);
  const [historyFieldKey, setHistoryFieldKey] = useState<string | null>(null);

  const unitValuesMap = useMemo(() => {
    const map = new Map<string, UnitFieldValue>();
    (values as UnitFieldValue[]).forEach(v => map.set(v.fieldKey, v));
    return map;
  }, [values]);

  const fieldList: DynamicField[] = useMemo(() => {
    const all = Object.values(activeVersion.fields);
    return all.filter(f => f.isActive);
  }, [activeVersion.fields]);

  const reload = async () => {
    await dispatch(fetchUnitValues({ workId, schemaVersionId: activeVersion.id, unitId }) as any);
    await dispatch(fetchSupplementWindows(workId) as any);
  };

  React.useEffect(() => { void reload(); }, [unitId, activeVersion.id]);

  const isFieldUnlockedByRequest = (fieldKey: string) => {
    return (windows as SupplementWindow[]).some(w =>
      w.workId === workId &&
      w.schemaVersionId === activeVersion.id &&
      w.unitId === unitId &&
      w.fieldKey === fieldKey &&
      w.mode === 'REQUEST_SUBORDINATE' &&
      w.status === 'OPEN'
    );
  };

  const openHistoryForField = async (fieldKey: string) => {
    setHistoryFieldKey(fieldKey);
    await dispatch(fetchFieldRevisions({ workId, schemaVersionId: activeVersion.id, unitId, fieldKey }) as any);
    setOpenHistory(true);
  };

  const saveField = async (fieldKey: string, layer: 'REPORTED'|'SUPPLEMENT', newValue: any, changeSource: any, windowId?: string) => {
    const cur = unitValuesMap.get(fieldKey);
    const next: UnitFieldValue = {
      workId,
      schemaVersionId: activeVersion.id,
      unitId,
      fieldKey,
      status: cur?.status ?? 'DRAFT',
      valueReported: layer === 'REPORTED' ? newValue : cur?.valueReported,
      valueSupplement: layer === 'SUPPLEMENT' ? newValue : cur?.valueSupplement,
      updatedAt: nowISO(),
    };

    await dispatch(upsertUnitFieldValue({
      workId,
      value: next,
      revision: {
        changeSource,
        windowId,
        layer,
        oldValue: layer === 'REPORTED' ? cur?.valueReported : cur?.valueSupplement,
        newValue,
        changedByUnitId: 'PARENT_UNIT', // demo
      } as any,
    }) as any);

    await dispatch(fetchUnitValues({ workId, schemaVersionId: activeVersion.id, unitId }) as any);
  };

  // dialogs actions
  const doOpenSelf = async (fieldKey: string) => {
    await dispatch(openSupplementWindow({
      workId,
      win: {
        workId,
        schemaVersionId: activeVersion.id,
        unitId,
        fieldKey,
        mode: 'SELF_SUPPLEMENT',
        openedByUnitId: 'PARENT_UNIT',
        note: 'Bổ sung bởi cấp trên',
      } as any,
    }) as any);
    setConfirm(null);
    await dispatch(fetchSupplementWindows(workId) as any);
  };

  const doOpenRequest = async (fieldKey: string) => {
    await dispatch(openSupplementWindow({
      workId,
      win: {
        workId,
        schemaVersionId: activeVersion.id,
        unitId,
        fieldKey,
        mode: 'REQUEST_SUBORDINATE',
        openedByUnitId: 'PARENT_UNIT',
        note: 'Yêu cầu báo cáo bổ sung',
        deadline: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      } as any,
    }) as any);
    setConfirm(null);
    await dispatch(fetchSupplementWindows(workId) as any);
  };

  const doCloseWindow = async (windowId: string) => {
    await dispatch(closeSupplementWindow({ workId, windowId }) as any);
    setConfirm(null);
    await dispatch(fetchSupplementWindows(workId) as any);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>Đơn vị nhập báo cáo</Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Chọn đơn vị → nhập dữ liệu theo fieldKey. Có luồng bổ sung A/B và lưu lịch sử từng field nhỏ.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            label="Đơn vị"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            sx={{ width: 220 }}
          >
            {MOCK_UNITS.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
          </TextField>

          <Button variant="outlined" onClick={reload} disabled={loading}>Tải lại</Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        {fieldList.map((f) => {
          const cur = unitValuesMap.get(f.fieldKey);
          const unlocked = isFieldUnlockedByRequest(f.fieldKey);

          return (
            <Grid size={{ xs: 12, md: 6 }} key={f.fieldKey}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontWeight: 900 }}>{f.name}</Typography>
                      <Button size="small" onClick={() => openHistoryForField(f.fieldKey)}>Lịch sử</Button>
                    </Stack>

                    <Typography variant="caption" sx={{ opacity: 0.75 }}>
                      fieldKey: {f.fieldKey} • {f.config.type} • unlocked: {unlocked ? 'YES' : 'NO'}
                    </Typography>

                    <Divider />

                    {f.config.type === 'TEXT' ? (
                      <TextField
                        multiline
                        minRows={3}
                        label="Dữ liệu đơn vị (reported)"
                        value={(cur?.valueReported ?? '') as string}
                        onChange={(e) => {
                          // chỉ cho sửa khi bình thường hoặc đang mở theo request
                          if (!unlocked) return;
                          void saveField(f.fieldKey, 'REPORTED', e.target.value, 'SUPPLEMENT_REQUEST', windows.find((w: SupplementWindow) =>
                            w.unitId === unitId && w.fieldKey === f.fieldKey && w.mode === 'REQUEST_SUBORDINATE' && w.status === 'OPEN'
                          )?.id);
                        }}
                        helperText={unlocked ? 'Đang mở khóa theo yêu cầu bổ sung.' : 'Muốn sửa: cấp trên phải “Yêu cầu bổ sung”.'}
                      />
                    ) : (
                      <TextField
                        label="(Demo) Sheet JSON (reported)"
                        value={JSON.stringify(cur?.valueReported ?? {}, null, 2)}
                        multiline
                        minRows={3}
                        onChange={(e) => {
                          if (!unlocked) return;
                          let parsed: any = {};
                          try { parsed = JSON.parse(e.target.value); } catch {}
                          void saveField(f.fieldKey, 'REPORTED', parsed, 'SUPPLEMENT_REQUEST',
                            windows.find((w: SupplementWindow) =>
                              w.unitId === unitId && w.fieldKey === f.fieldKey && w.mode === 'REQUEST_SUBORDINATE' && w.status === 'OPEN'
                            )?.id);
                        }}
                      />
                    )}

                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        variant="outlined"
                        onClick={() => setConfirm({ kind: 'OPEN_REQUEST', payload: { fieldKey: f.fieldKey } })}
                      >
                        Yêu cầu bổ sung (mở khóa)
                      </Button>

                      <Button
                        variant="contained"
                        onClick={() => setConfirm({ kind: 'OPEN_SELF', payload: { fieldKey: f.fieldKey } })}
                      >
                        Cấp trên tự bổ sung
                      </Button>
                    </Stack>

                    {/* demo: bổ sung layer SUPPLEMENT ngay tại đây khi đã mở SELF window */}
                    {(() => {
                      const win = (windows as SupplementWindow[]).find(w =>
                        w.unitId === unitId && w.fieldKey === f.fieldKey && w.mode === 'SELF_SUPPLEMENT' && w.status === 'OPEN'
                      );
                      if (!win) return null;

                      return (
                        <Stack spacing={1}>
                          <Divider />
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            Bổ sung (SUPPLEMENT) • window OPEN
                          </Typography>

                          <TextField
                            multiline
                            minRows={2}
                            label="Dữ liệu bổ sung (cấp trên)"
                            value={(cur?.valueSupplement ?? '') as string}
                            onChange={(e) => void saveField(f.fieldKey, 'SUPPLEMENT', e.target.value, 'SUPPLEMENT_SELF', win.id)}
                          />

                          <Button
                            color="warning"
                            variant="contained"
                            onClick={() => setConfirm({ kind: 'CLOSE_WINDOW', payload: { windowId: win.id } })}
                          >
                            Đóng bổ sung
                          </Button>
                        </Stack>
                      );
                    })()}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirm?.kind === 'OPEN_SELF'}
        variant="info"
        title="Bổ sung dữ liệu"
        message={
          <Stack spacing={1}>
            <Typography variant="body2">
              Bạn đang mở chế độ “cấp trên tự nhập bổ sung” cho field nhỏ.
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Mọi cập nhật sẽ lưu lịch sử và dùng cho tổng hợp theo effectiveRule.
            </Typography>
          </Stack>
        }
        confirmText="Tiếp tục"
        cancelText="Hủy"
        confirmLoading={loading}
        onConfirm={() => doOpenSelf(confirm?.payload?.fieldKey)}
        onClose={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm?.kind === 'OPEN_REQUEST'}
        variant="warning"
        title="Yêu cầu báo cáo bổ sung"
        message={
          <Stack spacing={1}>
            <Typography variant="body2">
              Bạn sẽ mở khóa để đơn vị chỉnh sửa field nhỏ trong một khoảng thời gian.
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Hệ thống sẽ ghi thời gian mở/đóng và lưu lịch sử cập nhật.
            </Typography>
          </Stack>
        }
        confirmText="Gửi yêu cầu"
        cancelText="Hủy"
        confirmLoading={loading}
        onConfirm={() => doOpenRequest(confirm?.payload?.fieldKey)}
        onClose={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm?.kind === 'CLOSE_WINDOW'}
        variant="warning"
        title="Đóng bổ sung"
        message="Sau khi đóng, cửa sổ bổ sung sẽ kết thúc. Dữ liệu bổ sung vẫn được giữ và dùng khi tổng hợp."
        confirmText="Đóng bổ sung"
        cancelText="Hủy"
        confirmLoading={loading}
        onConfirm={() => doCloseWindow(confirm?.payload?.windowId)}
        onClose={() => setConfirm(null)}
      />

      <FieldHistoryDialog
        open={openHistory}
        title={`Lịch sử field: ${historyFieldKey ?? ''}`}
        revisions={revisions}
        onClose={() => setOpenHistory(false)}
      />
    </Stack>
  );
};
