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
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';

import {
  type PositionDto,
  useCreatePositionMutation,
  useDeletePositionMutation,
  useListPositionsQuery,
  useListUnitTypesQuery,
  useUpdatePositionMutation,
} from '../../../api/adminCatalogApi';
import { AppTable, type AppTableColumn } from '../../../components/common/AppTable';
import CommonLabelText from '../../../components/common/CommonLabelText';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { normalizeVi } from '../../../helpers/normalize';
import { releaseFocusBeforeModal } from '../../../utils/focus';
import { UITextKey, uiText } from '../../../constants/uiText';

type EditorState = { mode: 'create' } | { mode: 'edit'; item: PositionDto } | null;

const buttonSx = { height: 36, px: 1.75, whiteSpace: 'nowrap' };

function parseError(err: any, fallback: string) {
  return err?.data?.message ?? err?.data?.title ?? err?.message ?? fallback;
}

export function PositionsPanel() {
  const [q, setQ] = useState('');
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] = useState<PositionDto | null>(null);
  const [snack, setSnack] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data = [], isFetching, refetch } = useListPositionsQuery({ isDeleted: false });
  const [createPosition, createState] = useCreatePositionMutation();
  const [updatePosition, updateState] = useUpdatePositionMutation();
  const [deletePosition, deleteState] = useDeletePositionMutation();

  const rows = useMemo(() => {
    const keyword = normalizeVi(q.trim());
    if (!keyword) return data;
    return data.filter((item) =>
      normalizeVi([item.code, item.name, ...(item.unitTypeCodes ?? [])].join(' ')).includes(keyword),
    );
  }, [data, q]);

  const columns = useMemo<AppTableColumn<PositionDto>[]>(
    () => [
      {
        field: 'code',
        header: 'Ma',
        sortable: true,
        width: 140,
        render: (row) => <CommonLabelText text={row.code} fontWeight={700} />,
      },
      {
        field: 'name',
        header: 'Tên chức vụ',
        sortable: true,
        width: '34%',
        render: (row) => <CommonLabelText text={row.name} />,
      },
      {
        field: 'unitTypeCodes',
        header: 'Loại đơn vị',
        sortable: false,
        width: '30%',
        render: (row) => <CommonLabelText text={(row.unitTypeCodes ?? []).join(', ')} />,
      },
      {
        field: 'rank',
        header: 'Rank',
        sortable: true,
        width: 90,
        align: 'center',
      },
      {
        field: 'actions',
        header: 'Thao tac',
        sortable: false,
        width: 120,
        align: 'center',
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title={uiText(UITextKey.TextSua2)}>
              <IconButton
                size="small"
                onClick={(event) => {
                  releaseFocusBeforeModal(event);
                  setEditor({ mode: 'edit', item: row });
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={uiText(UITextKey.TextXoaMem)}>
              <IconButton
                size="small"
                color="error"
                onClick={(event) => {
                  releaseFocusBeforeModal(event);
                  setDeleteTarget(row);
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
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
              placeholder={uiText(UITextKey.TextTimMaTenHoacLoaiDonVi)}
              value={q}
              onChange={(event) => setQ(event.target.value)}
              InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, opacity: 0.55 }} /> }}
              sx={{ flex: '1 1 280px', minWidth: 240 }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => void refetch()}
              disabled={isFetching}
              sx={buttonSx}
            >
              Lam moi
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={(event) => {
                releaseFocusBeforeModal(event);
                setEditor({ mode: 'create' });
              }}
              sx={buttonSx}
            >
              Thêm chức vụ
            </Button>
          </Stack>

          <Alert severity="info">
            Tạo danh mục chức vụ trước, sau đó gán giới hạn cho từng loại đơn vị ở tab Loại đơn vị.
          </Alert>

          <Box sx={{ minHeight: 320 }}>
            <AppTable<PositionDto>
              rows={rows}
              columns={columns}
              rowKey={(row) => row.id}
              selectable={false}
              initialSortField="code"
              initialSortDirection="asc"
              initialPageSize={10}
            />
          </Box>
        </Stack>

        <PositionEditorDialog
          editor={editor}
          saving={createState.isLoading || updateState.isLoading}
          onClose={() => setEditor(null)}
          onSubmit={async (payload) => {
            try {
              if (editor?.mode === 'edit') {
                await updatePosition({ id: editor.item.id, data: payload }).unwrap();
                notify('success', 'Đã cập nhật chức vụ.');
              } else {
                await createPosition(payload).unwrap();
                notify('success', 'Đã tạo chức vụ.');
              }
              setEditor(null);
            } catch (err) {
              notify('error', parseError(err, 'Không lưu được chức vụ.'));
            }
          }}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          title={uiText(UITextKey.TextXoaChucVu)}
          variant="warning"
          message={
            <Typography variant="body2">
              Ngừng dùng chức vụ <b>{deleteTarget?.code}</b>. Nên kiểm tra người dùng đang gán chức vụ trước khi xóa.
            </Typography>
          }
          confirmText="Xóa"
          cancelText="Hủy"
          confirmLoading={deleteState.isLoading}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (!deleteTarget) return;
            try {
              await deletePosition(deleteTarget.id).unwrap();
              notify('success', 'Đã xóa chức vụ.');
              setDeleteTarget(null);
            } catch (err) {
              notify('error', parseError(err, 'Không xóa được chức vụ.'));
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

function PositionEditorDialog({
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
    order: number;
    rank: number;
    unitTypeCodes: string[];
  }) => Promise<void>;
}) {
  const { data: unitTypes = [] } = useListUnitTypesQuery({ isDeleted: false }, { skip: !editor });
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [order, setOrder] = useState(0);
  const [rank, setRank] = useState(0);
  const [unitTypeCodes, setUnitTypeCodes] = useState<string[]>([]);
  const [error, setError] = useState('');

  const open = !!editor;
  const isEdit = editor?.mode === 'edit';

  useEffect(() => {
    if (!editor) return;
    setCode(editor.mode === 'edit' ? editor.item.code : '');
    setName(editor.mode === 'edit' ? editor.item.name : '');
    setOrder(editor.mode === 'edit' ? editor.item.order : 0);
    setRank(editor.mode === 'edit' ? editor.item.rank : 0);
    setUnitTypeCodes(editor.mode === 'edit' ? editor.item.unitTypeCodes ?? [] : []);
    setError('');
  }, [editor]);

  const toggleUnitType = (unitTypeCode: string, checked: boolean) => {
    setUnitTypeCodes((current) =>
      checked
        ? Array.from(new Set([...current, unitTypeCode]))
        : current.filter((code) => code !== unitTypeCode),
    );
  };

  const handleSubmit = async () => {
    const nextCode = code.trim().toUpperCase();
    const nextName = name.trim();
    if (!isEdit && !nextCode) {
      setError('Bắt buộc nhập mã chức vụ.');
      return;
    }
    if (!nextName) {
      setError('Bắt buộc nhập tên chức vụ.');
      return;
    }
    if (unitTypeCodes.length === 0) {
      setError('Bắt buộc chọn ít nhất một loại đơn vị.');
      return;
    }

    await onSubmit({
      code: nextCode,
      name: nextName,
      order,
      rank,
      unitTypeCodes,
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Sửa chức vụ' : 'Thêm chức vụ'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            size="small"
            label={uiText(UITextKey.TextMaChucVu)}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            disabled={isEdit}
            required
          />
          <TextField
            size="small"
            label={uiText(UITextKey.TextTenChucVu)}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={uiText(UITextKey.TextOrder)}
              value={order}
              onChange={(event) => setOrder(Number(event.target.value) || 0)}
            />
            <TextField
              fullWidth
              size="small"
              type="number"
              label={uiText(UITextKey.TextRank)}
              value={rank}
              onChange={(event) => setRank(Number(event.target.value) || 0)}
            />
          </Stack>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Loại đơn vị
            </Typography>
            <Stack spacing={0.5}>
              {unitTypes.map((unitType) => (
                <FormControlLabel
                  key={unitType.id}
                  control={
                    <Checkbox
                      checked={unitTypeCodes.includes(unitType.code)}
                      onChange={(event) => toggleUnitType(unitType.code, event.target.checked)}
                    />
                  }
                  label={`${unitType.code} - ${unitType.name}`}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button size="small" variant="outlined" onClick={onClose} disabled={saving} sx={buttonSx}>
          Hủy
        </Button>
        <Button size="small" variant="contained" onClick={handleSubmit} disabled={saving} sx={buttonSx}>
          Lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
}
