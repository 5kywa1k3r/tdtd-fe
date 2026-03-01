import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Chip,
} from '@mui/material';

import { AttachmentPicker, type AttachmentItem as PickerAttachmentItem } from '../common/AttachmentPicker';
import { PRIORITY_OPTIONS } from '../../constants/priority';
import type { Priority } from '../../constants/priority';
import { UnitMultiSelect } from '../common/UnitMultiSelect'
//---------------MOCK DATA-------------//
import { UNIT_TREE } from '../../data/unitMock';
import type { UnitId } from '../../data/unitMock';

import {
  MOCK_LEADER_OPTIONS,
  MOCK_REPORTING_UNITS,
} from '../../data/mockData';
//---------------MOCK DATA-------------//

type WorkType = 'TASK' | 'INDICATOR';
type WorkFormMode = 'create' | 'edit' | 'view';

// ====== Dữ liệu chi tiết để xem (metadata file, không có File object)
export type WorkAttachmentMeta = {
  id: string;
  fileName: string;
  fileSize?: number | null;
  mimeType?: string | null;
  description?: string | null;
};

export type WorkDetailData = {
  id: string;
  type: WorkType;
  code?: string | null;
  name: string;

  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD

  unit?: { id: string; name: string } | null;
  leader?: { id: string; name: string } | null;
  focalOfficer?: { id: string; name: string } | null;

  priority?: Priority | null;
  basisText?: string | null;
  note?: string | null;

  basisAttachments?: WorkAttachmentMeta[] | null;
};

interface WorkFormProps {
  type: WorkType;
  onCancel: () => void;
  onSaved?: () => void;
  mode?: WorkFormMode;              // create | view
  initialData?: WorkDetailData;     // chỉ dùng khi view
  priorityOptions?: { value: Priority; label: string }[];
}

export const WorkForm: React.FC<WorkFormProps> = ({
  type,
  onCancel,
  onSaved,
  mode = 'create',
  initialData,
  priorityOptions = PRIORITY_OPTIONS,
}) => {
  //---------------MOCK DATA-------------//

  // leaderOptions dạng { id, name } để WorkForm dùng select
  const leaderOptions = MOCK_LEADER_OPTIONS.map((name) => ({
    id: name,
    name,
  }));
  const [unitIds, setUnitIds] = useState<UnitId[]>([]);

  // officerOptions: lấy từ reporting units (đã có sẵn mock)
  const officerOptions = Array.from(
    new Set(MOCK_REPORTING_UNITS.map((x) => x.officerName).filter(Boolean)),
  ).map((name) => ({ id: name, name }));

  //---------------MOCK DATA-------------//
  const isView = mode === 'view';
  const titleLower = type === 'TASK' ? 'nhiệm vụ' : 'chỉ tiêu';
  const nameLabel = type === 'TASK' ? 'Tên nhiệm vụ' : 'Tên chỉ tiêu';

  // ===== fields (create)
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  // giữ date dạng string (YYYY-MM-DD) như đang dùng
  const [fromDate, setFromDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
  const [leaderId, setLeaderId] = useState('');
  const [focalOfficerId, setFocalOfficerId] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');

  const [basisText, setBasisText] = useState('');
  const [note, setNote] = useState('');

  // Create: file thật để upload sau
  const [basisFiles, setBasisFiles] = useState<PickerAttachmentItem[]>([]);

  // View: metadata file (từ initialData)
  const viewFiles = useMemo(() => initialData?.basisAttachments ?? [], [initialData]);

  const minToDate = useMemo(() => fromDate, [fromDate]);

  // ===== hydrate cho view
  useEffect(() => {
    if (!initialData) return;

    setCode(initialData.code ?? '');
    setName(initialData.name ?? '');

    setFromDate(initialData.fromDate);
    setToDate(initialData.toDate);

    // nếu sau này initialData có unitIds
    // setUnitIds(initialData.unitIds ?? []);

    setLeaderId(initialData.leader?.id ?? '');
    setFocalOfficerId(initialData.focalOfficer?.id ?? '');

    setPriority(initialData.priority ?? 'MEDIUM');
    setBasisText(initialData.basisText ?? '');
    setNote(initialData.note ?? '');
  }, [initialData]);

  const validate = () => {
    if (!name.trim()) return `${nameLabel} không được để trống.`;
    if (!fromDate || !toDate) return 'Vui lòng chọn Từ ngày/Đến ngày.';
    if (dayjs(toDate).isBefore(dayjs(fromDate), 'day'))
      return '"Đến ngày" phải >= "Từ ngày".';
    if (unitIds.length === 0)
      return `Vui lòng chọn đơn vị nhận ${titleLower}.`;
    return null;
  };

  const handleSave = () => {
    const err = validate();
    if (err) {
      // eslint-disable-next-line no-alert
      alert(err);
      return;
    }

    // payload mock — thay bằng thunk/API sau
    const payload = {
      type,
      code: code.trim() || null,
      name: name.trim(),
      fromDate,
      toDate,
      unitIds,
      leaderId: leaderId || null,
      focalOfficerId: focalOfficerId || null,
      priority,
      basisText: basisText.trim() || null,
      note: note.trim() || null,
      basisFiles: basisFiles.map((x) => ({
        fileName: x.file.name,
        fileSize: x.file.size,
        mimeType: x.file.type,
        description: x.description,
      })),
    };


    // eslint-disable-next-line no-console
    console.log('WorkForm payload:', payload);

    onSaved?.();
  };

  const Field = (props: React.ComponentProps<typeof TextField>) => (
    <TextField {...props} disabled={isView || props.disabled} />
  );

  return (
    <Stack spacing={2}>
      {/* ===== Thông tin chung ===== */}
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Box sx={{ flex: 0.35, minWidth: 220 }}>
                <Field label="Mã" value={code} onChange={(e) => setCode(e.target.value)} fullWidth />
              </Box>

              <Box sx={{ flex: 1, minWidth: 280 }}>
                <Field
                  label={nameLabel}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                  required
                />
              </Box>
            </Stack>

            {/* ===== Date range: gom cụm hợp lý */}
            <Box>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
                <Field
                  label="Từ ngày"
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFromDate(v);
                    if (toDate && dayjs(toDate).isBefore(dayjs(v), 'day')) setToDate(v);
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                  sx={{ flex: 1 }}
                />

                <Typography
                  sx={{
                    px: 1,
                    color: 'text.secondary',
                    display: { xs: 'none', md: 'block' },
                  }}
                >
                  →
                </Typography>

                <Field
                  label="Đến ngày"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: minToDate }}
                  fullWidth
                  required
                  sx={{ flex: 1 }}
                />
              </Stack>
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Box sx={{ flex: 1, minWidth: 280 }}>
                <UnitMultiSelect
                  options={UNIT_TREE}
                  value={unitIds}
                  onChange={setUnitIds}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Field
                  select
                  label="Lãnh đạo chỉ đạo"
                  value={leaderId}
                  onChange={(e) => setLeaderId(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="">-- Chọn --</MenuItem>
                  {leaderOptions.map((x) => (
                    <MenuItem key={x.id} value={x.id}>
                      {x.name}
                    </MenuItem>
                  ))}
                </Field>
              </Box>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Box sx={{ flex: 0.8, minWidth: 220 }}>
                <Field
                  select
                  label="Mức độ ưu tiên"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  fullWidth
                >
                  {priorityOptions.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Field>
              </Box>

              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Field
                  select
                  label="Cán bộ đầu mối"
                  value={focalOfficerId}
                  onChange={(e) => setFocalOfficerId(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="">-- Chọn --</MenuItem>
                  {officerOptions.map((x) => (
                    <MenuItem key={x.id} value={x.id}>
                      {x.name}
                    </MenuItem>
                  ))}
                </Field>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* ===== Căn cứ + file ===== */}
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Field
              label={`Căn cứ giao ${titleLower}`}
              value={basisText}
              onChange={(e) => setBasisText(e.target.value)}
              fullWidth
              multiline
              minRows={3}
            />

            {/* Create: chọn file thật */}
            {!isView ? (
              <AttachmentPicker
                items={basisFiles}
                onChange={setBasisFiles}
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />
            ) : (
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Căn cứ giao nhiệm vụ (Tệp)
                </Typography>

                {viewFiles.length === 0 ? (
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Chưa có file nào.
                  </Typography>
                ) : (
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {viewFiles.map((f) => (
                      <Chip
                        key={f.id}
                        label={
                          f.description
                            ? `${f.fileName} • ${f.description}`
                            : f.fileName
                        }
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* ===== Ghi chú ===== */}
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Field
              label="Ghi chú"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* ===== Actions ===== */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" onClick={onCancel}>
          {isView ? 'Đóng' : 'Hủy'}
        </Button>

        {!isView && (
          <Button variant="contained" onClick={handleSave}>
            Lưu
          </Button>
        )}
      </Box>
    </Stack>
  );
};
