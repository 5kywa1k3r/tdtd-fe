import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';

import {
  type UnitTypeDto,
  type UnitTypePositionRuleDto,
  useCreateUnitTypeMutation,
  useDeleteUnitTypeMutation,
  useListPositionsQuery,
  useListUnitTypesQuery,
  useUpdateUnitTypeMutation,
} from '../../../api/adminCatalogApi';
import { AppTable, type AppTableColumn } from '../../../components/common/AppTable';
import CommonDateText from '../../../components/common/CommonDateText';
import CommonLabelText from '../../../components/common/CommonLabelText';
import BooleanChip from '../../../components/common/BooleanChip';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { normalizeVi } from '../../../helpers/normalize';
import { releaseFocusBeforeModal } from '../../../utils/focus';
import { UITextKey, uiText } from '../../../constants/uiText';

type UnitTypeFilter = 'active' | 'deleted' | 'all';
type EditorState =
  | { mode: 'create' }
  | { mode: 'edit'; item: UnitTypeDto }
  | null;

const actionButtonSx = {
  height: 36,
  px: 1.75,
  whiteSpace: 'nowrap',
};

function parseError(err: any, fallback: string) {
  return err?.data?.message ?? err?.data?.title ?? err?.message ?? fallback;
}

export function UnitTypesPanel() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<UnitTypeFilter>('active');
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnitTypeDto | null>(null);
  const [snack, setSnack] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isDeleted = filter === 'all' ? undefined : filter === 'deleted';
  const { data = [], isFetching, refetch } = useListUnitTypesQuery({ isDeleted });
  const [createUnitType, createState] = useCreateUnitTypeMutation();
  const [updateUnitType, updateState] = useUpdateUnitTypeMutation();
  const [deleteUnitType, deleteState] = useDeleteUnitTypeMutation();

  const rows = useMemo(() => {
    const keyword = normalizeVi(q.trim());
    if (!keyword) return data;
    return data.filter((item) =>
      normalizeVi([item.code, item.name].filter(Boolean).join(' ')).includes(keyword),
    );
  }, [data, q]);

  const columns = useMemo<AppTableColumn<UnitTypeDto>[]>(
    () => [
      {
        field: 'code',
        header: 'Mã loại',
        sortable: true,
        width: 160,
        render: (row) => <CommonLabelText text={row.code} fontWeight={700} />,
      },
      {
        field: 'name',
        header: 'Tên loại đơn vị',
        sortable: true,
        width: '34%',
        render: (row) => <CommonLabelText text={row.name} />,
      },
      {
        field: 'isDeleted',
        header: 'Trạng thái',
        sortable: true,
        width: 130,
        align: 'center',
        render: (row) => (
          <BooleanChip
            value={!row.isDeleted}
            trueLabel="Đang dùng"
            falseLabel="Đã xóa"
            trueColor="success"
          />
        ),
      },
      {
        field: 'updatedAtUtc',
        header: 'Cập nhật',
        sortable: true,
        width: 160,
        render: (row) => <CommonDateText value={row.updatedAtUtc || row.createdAtUtc} withTime />,
      },
      {
        field: 'actions',
        header: 'Thao tác',
        sortable: false,
        width: 130,
        align: 'center',
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title={uiText(UITextKey.TextSua)}>
              <span>
                <IconButton
                  size="small"
                  disabled={row.isDeleted}
                  onClick={(event) => {
                    releaseFocusBeforeModal(event);
                    setEditor({ mode: 'edit', item: row });
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={uiText(UITextKey.TextXoaMem2)}>
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={row.isDeleted}
                  onClick={(event) => {
                    releaseFocusBeforeModal(event);
                    setDeleteTarget(row);
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [],
  );

  const notify = (type: 'success' | 'error', message: string) => setSnack({ type, message });

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
            <TextField
              size="small"
              placeholder={uiText(UITextKey.TextTimMaHoacTenLoaiDonVi)}
              value={q}
              onChange={(event) => setQ(event.target.value)}
              InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, opacity: 0.55 }} /> }}
              sx={{ flex: '1 1 280px', minWidth: 240 }}
            />
            <TextField
              select
              size="small"
              label={uiText(UITextKey.TextTrangThai)}
              value={filter}
              onChange={(event) => setFilter(event.target.value as UnitTypeFilter)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="active">{uiText(UITextKey.TextDangDung)}</MenuItem>
              <MenuItem value="deleted">{uiText(UITextKey.TextDaXoa)}</MenuItem>
              <MenuItem value="all">{uiText(UITextKey.TextTatCa)}</MenuItem>
            </TextField>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => void refetch()}
              disabled={isFetching}
              sx={actionButtonSx}
            >
              Làm mới
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={(event) => {
                releaseFocusBeforeModal(event);
                setEditor({ mode: 'create' });
              }}
              sx={actionButtonSx}
            >
              Thêm loại
            </Button>
          </Stack>

          <Alert severity="info">
            Chỉ cho xóa mềm loại đơn vị khi chưa được unit hoặc chức vụ đang dùng. Nếu đã phát sinh dữ liệu, hãy đổi tên
            hoặc tạo loại mới thay vì xóa để tránh lệch catalog.
          </Alert>

          <Box sx={{ minHeight: 320 }}>
            <AppTable<UnitTypeDto>
              rows={rows}
              columns={columns}
              rowKey={(row) => row.id}
              selectable={false}
              initialSortField="code"
              initialSortDirection="asc"
              initialPageSize={10}
              onRowDoubleClick={(row) => {
                if (!row.isDeleted) {
                  releaseFocusBeforeModal();
                  setEditor({ mode: 'edit', item: row });
                }
              }}
            />
          </Box>
        </Stack>

        <UnitTypeEditorDialog
          editor={editor}
          saving={createState.isLoading || updateState.isLoading}
          onClose={() => setEditor(null)}
          onSubmit={async (payload) => {
            try {
              if (editor?.mode === 'edit') {
                await updateUnitType({
                  id: editor.item.id,
                  data: { name: payload.name, positionRules: payload.positionRules },
                }).unwrap();
                notify('success', 'Đã cập nhật loại đơn vị.');
              } else {
                await createUnitType({ code: payload.code, name: payload.name }).unwrap();
                notify('success', 'Đã tạo loại đơn vị.');
              }
              setEditor(null);
            } catch (err: any) {
              notify('error', parseError(err, 'Không lưu được loại đơn vị.'));
            }
          }}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          title={uiText(UITextKey.TextXoaLoaiDonVi)}
          variant="warning"
          message={
            <Typography variant="body2">
              Xóa mềm loại <b>{deleteTarget?.code}</b>. Backend sẽ chặn nếu loại này đang được unit hoặc chức vụ sử dụng.
            </Typography>
          }
          confirmText="Xóa"
          cancelText="Hủy"
          confirmLoading={deleteState.isLoading}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (!deleteTarget) return;
            try {
              await deleteUnitType(deleteTarget.id).unwrap();
              notify('success', 'Đã xóa loại đơn vị.');
              setDeleteTarget(null);
            } catch (err: any) {
              notify('error', parseError(err, 'Không xóa được loại đơn vị.'));
            }
          }}
        />

        <Snackbar
          open={!!snack}
          autoHideDuration={2600}
          onClose={() => setSnack(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert severity={snack?.type ?? 'success'} variant="filled" onClose={() => setSnack(null)}>
            {snack?.message}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}

function UnitTypeEditorDialog({
  editor,
  saving,
  onClose,
  onSubmit,
}: {
  editor: EditorState;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    code: string;
    name: string;
    positionRules?: UnitTypePositionRuleDto[];
  }) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [positionRules, setPositionRules] = useState<UnitTypePositionRuleDto[]>([]);
  const [error, setError] = useState('');
  const { data: positions = [] } = useListPositionsQuery({ isDeleted: false }, { skip: !editor });

  const open = !!editor;
  const isEdit = editor?.mode === 'edit';

  useEffect(() => {
    if (!editor) return;
    setCode(editor.mode === 'edit' ? editor.item.code : '');
    setName(editor.mode === 'edit' ? editor.item.name : '');
    setPositionRules(editor.mode === 'edit' ? editor.item.positionRules ?? [] : []);
    setError('');
  }, [editor]);

  const setRuleEnabled = (positionCode: string, checked: boolean) => {
    const normalized = positionCode.trim().toUpperCase();
    setPositionRules((current) => {
      const existing = current.find((item) => item.positionCode === normalized);
      if (existing) {
        return current.map((item) =>
          item.positionCode === normalized ? { ...item, isEnabled: checked } : item,
        );
      }

      return [
        ...current,
        {
          positionCode: normalized,
          isEnabled: checked,
          maxUsersPerUnit: null,
          sortOrder: current.length,
        },
      ];
    });
  };

  const setRuleMax = (positionCode: string, value: string) => {
    const normalized = positionCode.trim().toUpperCase();
    const parsed = value.trim() === '' ? null : Number(value);
    setPositionRules((current) =>
      current.map((item) =>
        item.positionCode === normalized
          ? {
              ...item,
              maxUsersPerUnit:
                parsed == null || Number.isNaN(parsed) ? null : Math.max(0, Math.floor(parsed)),
            }
          : item,
      ),
    );
  };

  const handleSubmit = async () => {
    const nextCode = code.trim().toUpperCase();
    const nextName = name.trim();
    if (!isEdit && !nextCode) {
      setError('Bắt buộc nhập mã loại.');
      return;
    }
    if (!nextName) {
      setError('Bắt buộc nhập tên loại đơn vị.');
      return;
    }
    await onSubmit({
      code: nextCode,
      name: nextName,
      positionRules: positionRules
        .filter((rule) => rule.isEnabled)
        .map((rule, index) => ({ ...rule, sortOrder: index })),
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Sửa loại đơn vị' : 'Thêm loại đơn vị'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            size="small"
            label={uiText(UITextKey.TextMaLoai)}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            disabled={isEdit}
            required
            helperText={isEdit ? 'Mã loại không đổi sau khi tạo để giữ ổn định dữ liệu đơn vị/chức vụ.' : undefined}
          />
          <TextField
            size="small"
            label={uiText(UITextKey.TextTenLoaiDonVi)}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          {isEdit && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Quy định chức vụ
              </Typography>
              <Stack spacing={1}>
                {positions.map((position) => {
                  const rule = positionRules.find((item) => item.positionCode === position.code);
                  const enabled = rule?.isEnabled === true;
                  return (
                    <Stack
                      key={position.id}
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ sm: 'center' }}
                    >
                      <FormControlLabel
                        sx={{ flex: 1, minWidth: 0 }}
                        control={
                          <Checkbox
                            checked={enabled}
                            onChange={(event) => setRuleEnabled(position.code, event.target.checked)}
                          />
                        }
                        label={`${position.code} - ${position.name}`}
                      />
                      <TextField
                        size="small"
                        label={uiText(UITextKey.TextMaxUserUnit)}
                        type="number"
                        value={rule?.maxUsersPerUnit ?? ''}
                        disabled={!enabled}
                        onChange={(event) => setRuleMax(position.code, event.target.value)}
                        sx={{ width: 140 }}
                      />
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button size="small" variant="outlined" onClick={onClose} disabled={saving} sx={actionButtonSx}>
          Hủy
        </Button>
        <Button size="small" variant="contained" onClick={handleSubmit} disabled={saving} sx={actionButtonSx}>
          Lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
}
