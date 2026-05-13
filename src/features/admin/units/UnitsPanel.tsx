import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';

import { useGetMeQuery } from '../../../api/base/meApi';
import {
  type ImportResult,
  type UnitDto,
  useImportUnitsMutation,
  useSearchSubtreeByCodePrefixQuery,
  useSoftDeleteUnitMutation,
} from '../../../api/adminUnitsApi';
import { api } from '../../../api/base/axios';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { UnitEditorDrawer } from './UnitEditorDrawer';
import { releaseFocusBeforeModal } from '../../../utils/focus';
import { UITextKey, uiText } from '../../../constants/uiText';

type EditorState =
  | { mode: 'create'; parentUnitId: string | null }
  | { mode: 'edit'; unitId: string }
  | null;

type UnitNode = UnitDto & { children: UnitNode[] };

const actionButtonSx = {
  height: 36,
  px: 1.75,
  whiteSpace: 'nowrap',
};

const toolbarButtonSx = {
  ...actionButtonSx,
  width: '100%',
  minWidth: 0,
  px: 1.25,
  '& .MuiButton-startIcon': { mr: 0.75 },
};

const toolbarPrimaryButtonSx = {
  ...toolbarButtonSx,
  gridColumn: '1 / -1',
};

async function downloadTemplate(format: 'xlsx' | 'csv', fileName: string) {
  const res = await api.get('/admin/units/import-template', { params: { format }, responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(blobUrl);
}

function buildTree(units: UnitDto[]): UnitNode[] {
  const map = new Map<string, UnitNode>();
  units.forEach((unit) => map.set(unit.id, { ...unit, children: [] }));

  const roots: UnitNode[] = [];
  map.forEach((node) => {
    const parent = node.parentUnitId ? map.get(node.parentUnitId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  const sortNodes = (nodes: UnitNode[]) => {
    nodes.sort((a, b) => String(a.code).localeCompare(String(b.code)));
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);

  return roots;
}

function filterTree(nodes: UnitNode[], keyword: string): UnitNode[] {
  const key = keyword.trim().toLowerCase();
  if (!key) return nodes;

  return nodes
    .map((node) => {
      const children = filterTree(node.children, key);
      const text = `${node.fullName} ${node.shortName ?? ''} ${node.symbol ?? ''} ${node.code}`.toLowerCase();
      if (text.includes(key) || children.length > 0) return { ...node, children };
      return null;
    })
    .filter((node): node is UnitNode => node !== null);
}

function renderTree(nodes: UnitNode[]) {
  return nodes.map((node) => (
    <TreeItem
      key={node.id}
      itemId={node.id}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, py: 0.25 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {node.shortName || node.fullName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {node.code}
          </Typography>
          {node.primaryUnitTypeCode && <Chip size="small" label={node.primaryUnitTypeCode} sx={{ height: 20 }} />}
          {node.isVirtual && <Chip size="small" label={uiText(UITextKey.TextVU)} color="warning" variant="outlined" sx={{ height: 20 }} />}
        </Box>
      }
    >
      {node.children.length > 0 ? renderTree(node.children) : null}
    </TreeItem>
  ));
}

export function UnitsPanel() {
  const { data: me, isLoading: meLoading } = useGetMeQuery();
  const roles = me?.roles ?? [];
  const isSystemAdmin = useMemo(
    () => roles.includes('SYSTEM_ADMIN') || me?.accountKind === 'SYSTEM_ADMIN',
    [me?.accountKind, roles],
  );
  const canManageUnits = useMemo(
    () => roles.includes('ADMIN') || isSystemAdmin,
    [isSystemAdmin, roles],
  );
  const isLevelWideManager = useMemo(
    () => (roles.includes('MANAGER_LEVEL') || me?.accountKind === 'LEVEL_MANAGER') && !me?.unitId,
    [me?.accountKind, me?.unitId, roles],
  );
  const prefix = canManageUnits || isLevelWideManager ? '' : (me?.unitCode ?? '');

  const {
    data: flatUnitsRaw,
    isLoading,
    isError,
    refetch: refetchUnits,
  } = useSearchSubtreeByCodePrefixQuery(prefix!, {
    skip: meLoading || (!canManageUnits && !isLevelWideManager && !prefix),
  });

  const flatUnits = useMemo(
    () => ((flatUnitsRaw ?? []) as UnitDto[]).filter((unit) => !unit.isDeleted),
    [flatUnitsRaw],
  );

  const unitById = useMemo(() => {
    const map = new Map<string, UnitDto>();
    flatUnits.forEach((unit) => map.set(unit.id, unit));
    return map;
  }, [flatUnits]);

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [pendingSelectedUnitId, setPendingSelectedUnitId] = useState<string | null>(null);
  const selectedUnit = selectedUnitId ? unitById.get(selectedUnitId) : undefined;

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const fullTree = useMemo(() => buildTree(flatUnits), [flatUnits]);
  const tree = useMemo(() => filterTree(fullTree, deferredSearch), [fullTree, deferredSearch]);
  const allTreeIds = useMemo(() => flatUnits.map((unit) => unit.id), [flatUnits]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const [editor, setEditor] = useState<EditorState>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [softDeleteUnit, dState] = useSoftDeleteUnitMutation();
  const [importUnits, importState] = useImportUnitsMutation();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] = useState<{ file: File; result: ImportResult } | null>(null);
  const canUseHiddenRootAsCreateParent = !isLoading && !isError && flatUnits.length === 0;
  const createParentUnitId =
    selectedUnitId ?? (canUseHiddenRootAsCreateParent && !canManageUnits ? (me?.unitId ?? null) : null);

  useEffect(() => {
    if (pendingSelectedUnitId) {
      if (unitById.has(pendingSelectedUnitId)) {
        setSelectedUnitId(pendingSelectedUnitId);
        setPendingSelectedUnitId(null);
      }
      return;
    }

    if (selectedUnitId && unitById.has(selectedUnitId)) return;
    if (me?.unitId && unitById.has(me.unitId)) {
      setSelectedUnitId(me.unitId);
      return;
    }
    setSelectedUnitId(flatUnits[0]?.id ?? null);
  }, [flatUnits, me?.unitId, pendingSelectedUnitId, selectedUnitId, unitById]);

  if (!meLoading && !canManageUnits && !isLevelWideManager && (!me?.unitId || !me?.unitCode)) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">{uiText(UITextKey.TextThieuUnitIdUnitCodeTrongMeKhongTheTaiCay)}</Typography>
        </CardContent>
      </Card>
    );
  }

  const parentDisplay =
    editor?.mode === 'create' && editor.parentUnitId
      ? unitById.get(editor.parentUnitId)
      : undefined;
  const effectiveParentDisplay =
    parentDisplay ??
    (editor?.mode === 'create' && canManageUnits && !editor.parentUnitId
      ? {
          fullName: 'Cấp gốc hệ thống',
          code: 'ROOT',
          shortName: 'Hệ thống',
          symbol: undefined,
          primaryUnitTypeCode: null,
          unitTypeCodes: [],
          isVirtual: false,
        }
      : undefined) ??
    (editor?.mode === 'create' && me && editor.parentUnitId === me.unitId
      ? {
          fullName: 'Cấp gốc hệ thống',
          code: me.unitCode,
          shortName: 'Hệ thống',
          symbol: undefined,
          primaryUnitTypeCode: me.unitTypeCodes?.[0] ?? null,
          unitTypeCodes: me.unitTypeCodes ?? [],
          isVirtual: false,
        }
      : undefined);

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 7fr) minmax(280px, 3fr)' },
            gap: 2,
            alignItems: 'stretch',
          }}
        >
          <Box
            sx={{
              borderRight: { md: '1px solid' },
              borderColor: 'divider',
              pr: { md: 2 },
              minHeight: 520,
            }}
          >
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <TextField
                  size="small"
                  label={uiText(UITextKey.TextTimDonVi2)}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  sx={{ flex: '1 1 280px', minWidth: 220 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setExpandedItems(allTreeIds)}
                  disabled={allTreeIds.length === 0}
                  sx={actionButtonSx}
                >
                  Mở
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setExpandedItems([])}
                  disabled={expandedItems.length === 0}
                  sx={actionButtonSx}
                >
                  Thu gọn
                </Button>
              </Stack>

              <Divider />

              {isLoading ? (
                <Typography variant="body2" color="text.secondary">{uiText(UITextKey.TextDangTaiCayDonVi)}</Typography>
              ) : isError ? (
                <Typography variant="body2" color="error">{uiText(UITextKey.TextKhongTaiDuocCayDonVi)}</Typography>
              ) : tree.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{uiText(UITextKey.TextKhongCoDonViPhuHop)}</Typography>
              ) : (
                <Box sx={{ maxHeight: 620, overflow: 'auto', pr: 1 }}>
                  <SimpleTreeView
                    selectedItems={selectedUnitId ?? ''}
                    expandedItems={expandedItems}
                    onExpandedItemsChange={(_, itemIds) => setExpandedItems(itemIds)}
                    onSelectedItemsChange={(_, itemId) => {
                      if (typeof itemId === 'string') setSelectedUnitId(itemId);
                    }}
                  >
                    {renderTree(tree)}
                  </SimpleTreeView>
                </Box>
              )}
            </Stack>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(124px, 1fr))',
                  gap: 1,
                  alignItems: 'center',
                }}
              >
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  hidden
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    try {
                      const result = await importUnits({ file, dryRun: true }).unwrap();
                      releaseFocusBeforeModal();
                      setImportPreview({ file, result });
                    } catch {
                      setImportPreview(null);
                    }
                  }}
                />
                {canManageUnits && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={(event) => {
                      releaseFocusBeforeModal(event);
                      if (canManageUnits || createParentUnitId) {
                        setEditor({ mode: 'create', parentUnitId: createParentUnitId });
                      }
                    }}
                    disabled={!canManageUnits && !createParentUnitId}
                    sx={toolbarPrimaryButtonSx}
                  >
                    Thêm đơn vị
                  </Button>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={() => downloadTemplate('xlsx', 'unit-import-template.xlsx')}
                  sx={toolbarButtonSx}
                >
                  Mẫu XLSX
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={() => downloadTemplate('csv', 'unit-import-template.csv')}
                  sx={toolbarButtonSx}
                >
                  Mẫu CSV
                </Button>
                {canManageUnits && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadFileIcon />}
                    onClick={(event) => {
                      releaseFocusBeforeModal(event);
                      importInputRef.current?.click();
                    }}
                    sx={toolbarButtonSx}
                  >
                    Nhập dữ liệu
                  </Button>
                )}
              </Box>

              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography variant="caption" color="text.secondary">{uiText(UITextKey.TextDangChon)}</Typography>
                  {canManageUnits && selectedUnit && (
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title={uiText(UITextKey.TextSuaDonVi)}>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            releaseFocusBeforeModal(event);
                            if (selectedUnitId) setEditor({ mode: 'edit', unitId: selectedUnitId });
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={uiText(UITextKey.TextNgungDungDonVi)}>
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={(event) => {
                            releaseFocusBeforeModal(event);
                            if (selectedUnitId) setConfirmDeleteOpen(true);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
                {selectedUnit ? (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{selectedUnit.fullName}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip label={`Mã: ${selectedUnit.code}`} />
                      <Chip label={`Cấp: ${selectedUnit.level}`} />
                      <Chip label={`Loại: ${selectedUnit.primaryUnitTypeCode || '-'}`} color="primary" variant="outlined" />
                      {selectedUnit.isVirtual && <Chip label={uiText(UITextKey.TextUnitAo)} color="warning" variant="outlined" />}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Tên rút gọn: <b>{selectedUnit.shortName || '-'}</b> · Ký hiệu: <b>{selectedUnit.symbol || '-'}</b>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ParentId: {selectedUnit.parentUnitId || '-'}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">{uiText(UITextKey.TextChuaChonDonVi)}</Typography>
                )}
              </Box>

              {!canManageUnits && (
                <Alert severity="info">{uiText(UITextKey.TextSYSTEMADMINMoiDuocThemSuaNgungDungHoac)}</Alert>
              )}
            </Stack>
          </Box>
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
          parentDisplay={
            effectiveParentDisplay
              ? {
                  fullName: effectiveParentDisplay.fullName,
                  code: effectiveParentDisplay.code,
                  shortName: effectiveParentDisplay.shortName ?? undefined,
                  symbol: effectiveParentDisplay.symbol ?? undefined,
                  primaryUnitTypeCode: effectiveParentDisplay.primaryUnitTypeCode ?? null,
                  unitTypeCodes: effectiveParentDisplay.unitTypeCodes ?? [],
                  isVirtual: !!effectiveParentDisplay.isVirtual,
                }
              : undefined
          }
          selectedDisplay={
            selectedUnit
              ? {
                  unitId: selectedUnit.id,
                  code: selectedUnit.code,
                  fullName: selectedUnit.fullName,
                  shortName: selectedUnit.shortName ?? null,
                  symbol: selectedUnit.symbol ?? null,
                  primaryUnitTypeCode: selectedUnit.primaryUnitTypeCode ?? null,
                  unitTypeCodes: selectedUnit.unitTypeCodes ?? [],
                  isVirtual: !!selectedUnit.isVirtual,
                }
              : undefined
          }
          onClose={() => setEditor(null)}
          onCreated={(unit) => {
            setPendingSelectedUnitId(unit.id);
            setSelectedUnitId(unit.id);
            void refetchUnits();
          }}
          onUpdated={(unit) => {
            setSelectedUnitId(unit.id);
            void refetchUnits();
          }}
        />

        <Dialog open={!!importPreview} onClose={() => setImportPreview(null)} fullWidth maxWidth="md">
          <DialogTitle>{uiText(UITextKey.TextKetQuaKiemTraImportDonVi)}</DialogTitle>
          <DialogContent>
            {importPreview && (
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Alert severity={importPreview.result.errorRows > 0 ? 'error' : 'success'}>
                  Tổng {importPreview.result.totalRows} dòng, hợp lệ {importPreview.result.validRows}, lỗi {importPreview.result.errorRows}.
                </Alert>
                {importPreview.result.errors.slice(0, 50).map((err, idx) => (
                  <Typography key={`${err.rowNumber}-${err.field}-${idx}`} variant="body2">
                    Dòng {err.rowNumber}, cột {err.field}: {err.message}
                  </Typography>
                ))}
                {(importPreview.result.rows?.length ?? 0) > 0 && (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                      Code dự kiến do BE sinh
                    </Typography>
                    {importPreview.result.rows?.slice(0, 50).map((row) => (
                      <Typography key={`${row.rowNumber}-${row.externalKey ?? ''}`} variant="body2">
                        Dòng {row.rowNumber}: {row.fullName || row.externalKey || '-'} · cha {row.parentCode || 'ROOT'} · code {row.generatedCode || '-'}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button size="small" variant="outlined" onClick={() => setImportPreview(null)} sx={actionButtonSx}>{uiText(UITextKey.TextDong)}</Button>
            <Button
              size="small"
              variant="contained"
              disabled={!importPreview || importPreview.result.errorRows > 0 || importState.isLoading}
              sx={actionButtonSx}
              onClick={async () => {
                if (!importPreview) return;
                await importUnits({ file: importPreview.file, dryRun: false }).unwrap();
                setImportPreview(null);
              }}
            >
              Xác nhận nhập
            </Button>
          </DialogActions>
        </Dialog>

        <ConfirmDialog
          open={confirmDeleteOpen}
          title={uiText(UITextKey.TextNgungDungDonVi)}
          variant="warning"
          message={
            <Typography variant="body2">
              Thao tác này chỉ đánh dấu ngừng dùng cho đơn vị và các đơn vị con, nên sẽ không dùng cho dữ liệu mới.
              Dữ liệu cũ vẫn được giữ lại; hệ thống sẽ chặn nếu còn người dùng thường đang hoạt động.
            </Typography>
          }
          confirmText="Ngừng dùng"
          cancelText={uiText(UITextKey.TextHuy3)}
          confirmLoading={dState.isLoading}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={async () => {
            if (!selectedUnitId) return;
            await softDeleteUnit({ unitId: selectedUnitId }).unwrap();
            setConfirmDeleteOpen(false);
          }}
        />
      </CardContent>
    </Card>
  );
}
