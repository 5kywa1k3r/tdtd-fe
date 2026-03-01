import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useEffect, useMemo, useState } from 'react';

import { useGetMeQuery } from '../../../api/base/meApi';
import { useSearchSubtreeByCodePrefixQuery, useSoftDeleteUnitMutation } from './adminUnitsApi';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { UnitEditorDrawer } from './UnitEditorDrawer';
import { LazyUnitMultiSelect } from '../../../components/common/LazyUnitMultiSelect';

type EditorState =
  | { mode: 'create'; parentUnitId: string }
  | { mode: 'edit'; unitId: string }
  | null;

export function UnitsPanel() {
  const { data: me, isLoading: meLoading } = useGetMeQuery();
  const isSystemAdmin = useMemo(() => me?.roles?.includes('SYSTEM_ADMIN'), [me?.roles]);

  const prefix = me?.unitCode;

  // guard me payload
  if (!meLoading && (!me?.unitId || !me?.unitCode)) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">
            Thiếu unitId/unitCode trong /me. Không thể tải cây đơn vị.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { data: flatUnitsRaw, isLoading, isError } = useSearchSubtreeByCodePrefixQuery(prefix!, {
    skip: meLoading || !prefix,
  });

  //  IMPORTANT: filter out soft-deleted units from UI tree + lookup maps
  const flatUnits = useMemo(() => {
    const arr = (flatUnitsRaw ?? []) as any[];
    return arr.filter((u) => !u?.isDeleted);
  }, [flatUnitsRaw]);

  const unitById = useMemo(() => {
    const m = new Map<
      string,
      {
        id: string;
        fullName: string;
        shortName: string;
        symbol: string;
        code: string;
        level?: number;
        unitTypeCodes?: string[];
      }
    >();

    (flatUnits ?? []).forEach((u) => {
      m.set(u.id, {
        id: u.id,
        fullName: u.fullName,
        shortName: u.shortName ?? u.fullName,
        symbol: u.symbol ?? '',
        code: u.code,
        level: u.level,
        unitTypeCodes: u.unitTypeCodes ?? [],
      });
    });

    return m;
  }, [flatUnits]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedUnitId: string | null = selectedIds[0] ?? null;

  const selectedUnit = useMemo(() => {
    if (!selectedUnitId) return undefined;
    return unitById.get(selectedUnitId);
  }, [selectedUnitId, unitById]);

  // auto select me.unitId once
  useEffect(() => {
    if (!me?.unitId) return;
    if (selectedIds.length > 0) return;
    setSelectedIds([me.unitId]);
  }, [me?.unitId]);

  const [editor, setEditor] = useState<EditorState>(null);

  const parentDisplay = useMemo(() => {
    if (!editor || editor.mode !== 'create') return undefined;
    const p = unitById.get(editor.parentUnitId);
    return p
      ? {
          fullName: p.fullName,
          code: p.code,
          shortName: p.shortName,
          symbol: p.symbol,
          unitTypeCodes: p.unitTypeCodes,
        }
      : undefined;
  }, [editor, unitById]);

  // delete confirm
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [softDeleteUnit, dState] = useSoftDeleteUnitMutation();

  const openCreateChild = () => selectedUnitId && setEditor({ mode: 'create', parentUnitId: selectedUnitId });
  const openEdit = () => selectedUnitId && setEditor({ mode: 'edit', unitId: selectedUnitId });
  const openDelete = () => selectedUnitId && setConfirmDeleteOpen(true);

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1,
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            {!isSystemAdmin && (
              <Typography variant="caption" sx={{ opacity: 0.65 }}>
                SYSTEM_ADMIN mới được thêm/sửa/xóa đơn vị
              </Typography>
            )}
          </Box>

          {isSystemAdmin && (
            <Box
              sx={{
                ml: { xs: 0, sm: 'auto' },
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={openCreateChild}
                disabled={!selectedUnitId}
                sx={{ height: 40, whiteSpace: 'nowrap' }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Thêm đơn vị cấp dưới
                </Box>
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={openEdit}
                disabled={!selectedUnitId}
                sx={{ height: 40, whiteSpace: 'nowrap' }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Sửa
                </Box>
              </Button>

              <Button
                color="error"
                variant="outlined"
                size="small"
                startIcon={<DeleteOutlineIcon />}
                onClick={openDelete}
                disabled={!selectedUnitId}
                sx={{ height: 40, whiteSpace: 'nowrap' }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Xóa
                </Box>
              </Button>
            </Box>
          )}
        </Box>

        {/*  Selected info box */}
        <Box
          sx={{
            mb: 1.5,
            p: 1.25,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Đang chọn
          </Typography>

          {selectedUnit ? (
            <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
                {selectedUnit.fullName}{' '}
                <Typography component="span" variant="body2" sx={{ opacity: 0.7 }}>
                  ({selectedUnit.code})
                </Typography>
              </Typography>

              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                Tên rút gọn: <b>{selectedUnit.shortName ?? '—'}</b> · Ký hiệu: <b>{selectedUnit.symbol ?? '—'}</b>
              </Typography>

              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                Hệ lực lượng:{' '}
                <b>
                  {selectedUnit.unitTypeCodes?.length
                    ? selectedUnit.unitTypeCodes.join(', ')
                    : '—'}
                </b>
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Chưa chọn đơn vị.
            </Typography>
          )}
        </Box>

        {/* Select only */}
        <Box>
          {isLoading ? (
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Đang tải…
            </Typography>
          ) : isError ? (
            <Typography variant="body2" color="error">
              Không tải được cây đơn vị.
            </Typography>
          ) : (
            <LazyUnitMultiSelect
              value={selectedIds}
              onChange={(v) => setSelectedIds(v as unknown as string[])}
              mode="single"
              label="Đơn vị"
            />
          )}
        </Box>

        <UnitEditorDrawer
          open={!!editor}
          editor={
            editor
              ? editor.mode === 'create'
                ? { mode: 'create', parentUnitId: editor.parentUnitId }
                : { mode: 'edit', unitId: editor.unitId }
              : null
          }
          parentDisplay={parentDisplay}
          selectedDisplay={
            selectedUnitId
              ? (() => {
                  const s = unitById.get(selectedUnitId);
                  return s
                    ? {
                        unitId: String(s.id),
                        code: s.code,
                        fullName: s.fullName,
                        shortName: s.shortName ?? null,
                        symbol: s.symbol ?? null,
                        unitTypeCodes: s.unitTypeCodes ?? null,
                      }
                    : undefined;
                })()
              : undefined
          }
          onClose={() => setEditor(null)}
          onCreated={(u) => {
            //  chọn luôn đơn vị mới
            setSelectedIds([u.id as string]);
          }}
        />

        <ConfirmDialog
          open={confirmDeleteOpen}
          title="Xóa đơn vị"
          variant="danger"
          message={
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Xóa mềm subtree. Nếu subtree có user, backend sẽ chặn.
            </Typography>
          }
          confirmText="Xóa"
          cancelText="Hủy"
          confirmLoading={dState.isLoading}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={async () => {
            if (!selectedUnitId) return;
            await softDeleteUnit({ unitId: String(selectedUnitId) }).unwrap();
            setConfirmDeleteOpen(false);
          }}
        />
      </CardContent>
    </Card>
  );
}