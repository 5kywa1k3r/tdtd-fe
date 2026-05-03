import {
  Box, Button, Divider, Drawer, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useGetUnitHistoryQuery,
} from '../../../api/adminUnitsApi';
import { useListUnitTypesQuery } from '../../../api/adminCatalogApi';

type ParentDisplay = {
  fullName: string;
  code: string;
  shortName?: string;
  symbol?: string;
  primaryUnitTypeCode?: string | null;
  unitTypeCodes?: string[];
  isVirtual?: boolean;
};

type SelectedDisplay = {
  unitId: string;
  code: string;
  fullName: string;
  shortName?: string | null;
  symbol?: string | null;
  primaryUnitTypeCode?: string | null;
  unitTypeCodes?: string[] | null;
  isVirtual?: boolean;
};

const actionButtonSx = {
  height: 36,
  px: 1.75,
  whiteSpace: 'nowrap',
};

export function UnitEditorDrawer(props: {
  open: boolean;
  editor: { mode: 'create' | 'edit'; unitId?: string; parentUnitId?: string | null } | null;
  parentDisplay?: ParentDisplay;
  selectedDisplay?: SelectedDisplay; //  mới
  onClose: () => void;
  onCreated?: (u: { id: string }) => void;
  onUpdated?: (u: { id: string }) => void;
  onFailed?: (err: any, op: 'create' | 'update') => void;
}) {
  const editor = props.editor;
  const isEdit = editor?.mode === 'edit' && !!editor.unitId;
  const isCreate = editor?.mode === 'create';
  const parentUnitId = isCreate ? (editor?.parentUnitId ?? null) : null;

  // Form state
  const [fullName, setFullName] = useState('');
  const [shortName, setShortName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [primaryUnitTypeCode, setPrimaryUnitTypeCode] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const { data: unitTypes = [] } = useListUnitTypesQuery({ isDeleted: false });

  const [createUnit, cState] = useCreateUnitMutation();
  const [updateUnit, uState] = useUpdateUnitMutation();

  const { data: history } = useGetUnitHistoryQuery(
    isEdit ? { unitId: editor!.unitId!, take: 50 } : (undefined as any),
    { skip: !isEdit }
  );

  useEffect(() => {
    if (!editor) return;

    if (editor.mode === 'edit') {
      const s = props.selectedDisplay;
      setFullName(s?.fullName ?? '');
      setShortName((s?.shortName ?? '') || '');
      setSymbol((s?.symbol ?? '') || '');
      setPrimaryUnitTypeCode(s?.primaryUnitTypeCode ?? s?.unitTypeCodes?.[0] ?? '');
      setIsVirtual(!!s?.isVirtual);
    } else {
      setFullName('');
      setShortName('');
      setSymbol('');
      setPrimaryUnitTypeCode('');
      setIsVirtual(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const onSubmit = async () => {
    if (!editor) return;

    const name = fullName.trim();
    if (!name) return;

    const sname = shortName.trim() || null;
    const sym = symbol.trim() || null;
    const typeCode = primaryUnitTypeCode.trim();
    if (!typeCode) return;

    if (editor.mode === 'create') {
      //  KHÔNG quên khai báo created
      const created = await createUnit({
        fullName: name,
        shortName: sname,
        symbol: sym,
        parentUnitId: parentUnitId ?? null,
        primaryUnitTypeCode: typeCode,
        isVirtual,
        unitTypeCodes: [],
      } as any).unwrap();

      props.onCreated?.({ id: created.id }); // hoặc props.onCreated?.(created)
      props.onClose();
      return;
    }

    const updated = await updateUnit({
      unitId: editor.unitId!,
      body: {
        fullName: name,
        shortName: sname,
        symbol: sym,
        primaryUnitTypeCode: typeCode,
        isVirtual,
        unitTypeCodes: [],
        // note: note?.trim() ?? null (nếu có field note trong UI)
      } as any,
    }).unwrap();

    props.onUpdated?.({ id: updated.id });
    props.onClose();
  };

  const selected = props.selectedDisplay;
  const parent = props.parentDisplay;

  return (
    <Drawer anchor="right" open={props.open} onClose={props.onClose}>
      <Box sx={{ width: 520, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {isEdit ? 'Cập nhật đơn vị' : 'Tạo đơn vị cấp dưới'}
        </Typography>

      {/*  box biết đang sửa cái nào */}
      
      {isEdit && (
        selected ? (
          <Box sx={{ p: 1.5, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>Đang sửa</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {selected.fullName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Mã: {selected.code}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            Không tìm thấy dữ liệu đơn vị đang chọn (có thể đã bị lọc/xóa mềm). Hãy chọn lại.
          </Typography>
        )
      )}

      {/*  box cha khi create */}
      {isCreate && (
        parent ? (
          <Box sx={{ p: 1.5, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>Đơn vị cấp trên</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {parent.fullName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Mã: {parent.code}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            Không tìm thấy đơn vị cấp trên (có thể đã bị lọc/xóa mềm). Hãy chọn lại.
          </Typography>
        )
      )}

        <Stack spacing={2}>
          <TextField label="Tên đầy đủ" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
          <TextField label="Tên rút gọn" value={shortName} onChange={(e) => setShortName(e.target.value)} />
          <TextField label="Ký hiệu" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          <TextField
            select
            label="Loại đơn vị"
            value={primaryUnitTypeCode}
            onChange={(e) => setPrimaryUnitTypeCode(e.target.value)}
            required
          >
            <MenuItem value="">-- Chọn loại đơn vị --</MenuItem>
            {unitTypes.map((type) => (
              <MenuItem key={type.code} value={type.code}>
                {type.name}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Switch checked={isVirtual} onChange={(e) => setIsVirtual(e.target.checked)} />}
            label="Unit ao gom nhom, khong tao user truc tiep"
          />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" variant="outlined" onClick={props.onClose} sx={actionButtonSx}>Huỷ</Button>
            <Button
              size="small"
              variant="contained"
              onClick={onSubmit}
              disabled={cState.isLoading || uState.isLoading}
              sx={actionButtonSx}
            >
              Lưu
            </Button>
          </Stack>
        </Stack>

        {isEdit && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Lịch sử (take=50)
            </Typography>

            <Box sx={{ maxHeight: 240, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1 }}>
              {(history ?? []).map((h) => (
                <Box key={h.version} sx={{ py: 1 }}>
                  <Typography variant="caption" sx={{ opacity: 0.75 }}>
                    v{h.version} • {new Date(h.changedAt).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">{h.snapshot.fullName}</Typography>
                  <Divider sx={{ mt: 1 }} />
                </Box>
              ))}

              {!history?.length && (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Chưa có lịch sử.
                </Typography>
              )}
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
