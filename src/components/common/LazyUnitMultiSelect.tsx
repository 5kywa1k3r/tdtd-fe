import * as React from 'react';
import {
  Box,
  Checkbox,
  Popover,
  TextField,
  Typography,
  Tooltip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  CircularProgress,
  Stack,
  Chip,
} from '@mui/material';

import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SelectAllOutlinedIcon from '@mui/icons-material/SelectAllOutlined';
import InputAdornment from '@mui/material/InputAdornment';

import { normalizeVi } from '../../helpers/normalize';
import {
  useGetUnitChildrenQuery,
  type UnitPickNode,
} from '../../api/adminUnitsApi';

const emptyIcon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;
const indeterminateIcon = <IndeterminateCheckBoxIcon fontSize="small" />;

export type UnitSelectMode = 'single' | 'multiple';
export type VirtualUnitBehavior = 'select' | 'reject';

export type UnitPickMeta = {
  id: string;
  code: string;
  fullName: string;
  shortName?: string;
  symbol?: string;
  level?: number;
  primaryUnitTypeCode?: string | null;
  isVirtual?: boolean;
};

export interface LazyUnitMultiSelectProps {
  value: string[]; // selected unitIds (exclusive)
  onChange: (value: string[]) => void;
  onChangeMeta?: (selected: UnitPickMeta[]) => void;
  mode?: UnitSelectMode;
  label?: string;
  virtualUnitBehavior?: VirtualUnitBehavior;
}

type Ref<T> = { current: T };

interface FlatInfo {
  id: string;
  fullName: string;
  code: string;
  shortName?: string;
  symbol?: string;
  level?: number;
  primaryUnitTypeCode?: string | null;
  isVirtual?: boolean;
  parentId?: string | null;
  depth: number;
}

interface Column {
  level: number;
  parentId: string | null; // null => level 0
}

type CheckState = 'checked' | 'indeterminate' | 'unchecked';

function measureSummary(names: string[], maxWidth: number): string {
  if (names.length === 0) return '';
  if (typeof window === 'undefined') return names.join(', ');

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return names.join(', ');

  ctx.font =
    '14px Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  let result = '';
  let used = 0;

  for (let i = 0; i < names.length; i += 1) {
    const part = i === 0 ? names[i] : `, ${names[i]}`;
    const w = ctx.measureText(part).width;

    if (used + w > maxWidth) {
      if (!result) result = names[i];
      return result + ', ...';
    }

    result += part;
    used += w;
  }

  return result;
}

type ColumnViewProps = {
  open: boolean;
  col: Column;
  colIndex: number;
  colCount: number;

  searchValue: string;
  onSearchChange: (level: number, text: string) => void;

  mode: UnitSelectMode;

  activePath: string[];
  setActivePath: React.Dispatch<React.SetStateAction<string[]>>;

  applyToggle: (id: string) => void | Promise<void>;
  getCheckState: (id: string) => CheckState;
  getInfo: (id: string) => FlatInfo | undefined;

  handleCloseFromLevel: (level: number) => void;
  handleOpenChildColumn: (level: number, nodeId: string) => void;

  infoMapRef: Ref<Map<string, FlatInfo>>;
  childrenCountRef: Ref<Map<string, number>>;

  onToggleColumnSelection: (ids: string[]) => void | Promise<void>;
  virtualUnitBehavior: VirtualUnitBehavior;
};

function ColumnView({
  open,
  col,
  colIndex,
  colCount,
  searchValue,
  onSearchChange,
  mode,
  activePath,
  setActivePath,
  applyToggle,
  getCheckState,
  getInfo,
  handleCloseFromLevel,
  handleOpenChildColumn,
  infoMapRef,
  childrenCountRef,
  onToggleColumnSelection,
  virtualUnitBehavior,
}: ColumnViewProps) {
  const level = col.level;
  const parentId = col.parentId;

  const q = useGetUnitChildrenQuery({ parentId: parentId ?? null }, { skip: !open });

  const nodes: UnitPickNode[] = q.data ?? [];
  const loading = q.isFetching;

  React.useEffect(() => {
    const map = infoMapRef.current;

    const put = (n: any, p: string | null) => {
      const fn = n.fullName ?? n.fullname ?? '';
      const sn = n.shortName ?? n.shortname ?? '';
      const code = n.code ?? '';
      const symbol = n.symbol ?? '';
      const lvl = n.level ?? undefined;
      const primaryUnitTypeCode = n.primaryUnitTypeCode ?? null;
      const isVirtual = !!n.isVirtual;

      map.set(n.id, {
        id: n.id,
        fullName: fn,
        code,
        shortName: sn || undefined,
        symbol: symbol || undefined,
        level: lvl,
        primaryUnitTypeCode,
        isVirtual,
        parentId: p,
        depth: level,
      });
    };

    if (parentId === null) {
      nodes.forEach((n: any) => put(n, null));
    } else {
      nodes.forEach((n: any) => put(n, parentId));
      childrenCountRef.current.set(parentId, nodes.length);

      if (nodes.length === 0) {
        setActivePath((prev) => {
          const idx = prev.indexOf(parentId);
          if (idx < 0) return prev;
          const next = prev.slice(0, idx + 1);
          if (next.length === prev.length) return prev;
          return next;
        });
      }
    }
  }, [nodes, parentId, level, infoMapRef, childrenCountRef, setActivePath]);

  const filtered = React.useMemo(() => {
    const key = normalizeVi(searchValue);
    if (!key) return nodes;

    return nodes.filter((n: any) => {
      const sn = n.shortName ?? n.shortname ?? '';
      const fn = n.fullName ?? n.fullname ?? '';
      return normalizeVi(sn || fn).includes(key);
    });
  }, [nodes, searchValue]);

  const columnIds = React.useMemo(
    () => filtered.map((n: any) => n.id as string).filter(Boolean),
    [filtered],
  );

  const columnState = React.useMemo<CheckState>(() => {
    if (columnIds.length === 0 || mode === 'single') return 'unchecked';

    const states = columnIds.map((id) => getCheckState(id));
    const checkedCount = states.filter((state) => state === 'checked').length;
    const hasAnySelection = states.some(
      (state) => state === 'checked' || state === 'indeterminate',
    );

    if (!hasAnySelection) return 'unchecked';
    if (checkedCount === columnIds.length) return 'checked';
    return 'indeterminate';
  }, [columnIds, getCheckState, mode]);

  const isRoot = parentId === null;
  const parentInfo = parentId ? getInfo(parentId) : undefined;

  return (
    <Box
      sx={{
        width: 260,
        borderRight:
          colIndex < colCount - 1 ? (theme) => `1px solid ${theme.palette.divider}` : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="subtitle2" sx={{ minWidth: 0 }} noWrap>
            {isRoot ? 'Đơn vị' : (parentInfo?.shortName ?? parentInfo?.fullName ?? '')}
          </Typography>

          {!isRoot && (
            <Tooltip title="Thu gọn cấp này">
              <IconButton size="small" onClick={() => handleCloseFromLevel(level)}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        <TextField
          size="small"
          placeholder={isRoot ? 'Tìm đơn vị...' : 'Tìm đơn vị cấp dưới...'}
          fullWidth
          value={searchValue}
          onChange={(e) => onSearchChange(level, e.target.value)}
        />
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loading && nodes.length === 0 ? (
          <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
            <CircularProgress size={16} />
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Đang tải…
            </Typography>
          </Box>
        ) : (
          <List dense>
            {mode === 'multiple' && (
              <ListItemButton
                onClick={() => void onToggleColumnSelection(columnIds)}
                disabled={columnIds.length === 0}
              >
                <Checkbox
                  edge="start"
                  disableRipple
                  icon={emptyIcon}
                  checkedIcon={checkedIcon}
                  indeterminateIcon={indeterminateIcon}
                  indeterminate={columnState === 'indeterminate'}
                  checked={columnState === 'checked'}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onToggleColumnSelection(columnIds);
                  }}
                  sx={{ mr: 1 }}
                />
                <SelectAllOutlinedIcon fontSize="small" style={{ marginRight: 8, opacity: 0.7 }} />
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={600}>
                      Chọn tất cả
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {columnIds.length > 0
                        ? `Chọn toàn bộ ${columnIds.length} đơn vị ở cột này`
                        : 'Không có đơn vị để chọn'}
                    </Typography>
                  }
                />
              </ListItemButton>
            )}

            {mode === 'multiple' && <Divider sx={{ my: 0.5 }} />}

            {filtered.map((n: any) => {
              const id = n.id as string;
              const isVirtual = !!n.isVirtual;

              const state = getCheckState(id);
              const checked = state === 'checked';
              const indeterminate = state === 'indeterminate';

              const isActiveOnThisLevel = level >= 1 && activePath[level] === id;

              const primary =
                n.shortName ??
                n.shortname ??
                n.fullName ??
                n.fullname ??
                '';

              return (
                <ListItemButton
                  key={id}
                  selected={isActiveOnThisLevel}
                  onClick={() => void applyToggle(id)}
                >
                  <Checkbox
                    edge="start"
                    disableRipple
                    icon={emptyIcon}
                    checkedIcon={checkedIcon}
                    indeterminateIcon={indeterminateIcon}
                    indeterminate={mode === 'single' ? false : indeterminate}
                    checked={checked}
                    onClick={(e) => {
                      e.stopPropagation();
                      void applyToggle(id);
                    }}
                    sx={{ mr: 1 }}
                  />
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap title={primary} sx={{ minWidth: 0 }}>
                          {primary}
                        </Typography>
                        {isVirtual && (
                          <Tooltip
                            title={
                              virtualUnitBehavior === 'reject'
                                ? 'Unit ao khong the dung lam don vi chua user'
                                : 'Unit ao'
                            }
                          >
                            <Chip size="small" label="VU" variant="outlined" sx={{ height: 18 }} />
                          </Tooltip>
                        )}
                      </Stack>
                    }
                  />

                  <Tooltip title="Xem đơn vị cấp dưới">
                    <IconButton
                      size="small"
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenChildColumn(level, id);
                      }}
                    >
                      <ChevronRightIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemButton>
              );
            })}

            {filtered.length === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Không có dữ liệu
                </Typography>
              </Box>
            )}
          </List>
        )}
      </Box>
    </Box>
  );
}

export const LazyUnitMultiSelect: React.FC<LazyUnitMultiSelectProps> = ({
  value,
  onChange,
  onChangeMeta,
  mode = 'multiple',
  virtualUnitBehavior,
  label = 'Đơn vị',
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const [activePath, setActivePath] = React.useState<string[]>([]);
  const [searchByLevel, setSearchByLevel] = React.useState<string[]>([]);
  const inputBoxRef = React.useRef<HTMLDivElement | null>(null);

  const infoMapRef = React.useRef<Map<string, FlatInfo>>(new Map());
  const childrenCountRef = React.useRef<Map<string, number>>(new Map());

  const resolvedVirtualBehavior = React.useMemo<VirtualUnitBehavior>(
    () => virtualUnitBehavior ?? 'select',
    [virtualUnitBehavior],
  );

  const effectiveValue = React.useMemo<string[]>(() => {
    const v = value ?? [];
    if (mode !== 'single') return v;
    return v.length > 0 ? [v[0]] : [];
  }, [value, mode]);

  const selectedSet = React.useMemo(() => new Set<string>(effectiveValue), [effectiveValue]);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const getInfo = React.useCallback((id: string) => infoMapRef.current.get(id), []);

  const isAncestor = React.useCallback(
    (ancestorId: string, nodeId: string) => {
      if (ancestorId === nodeId) return false;
      let cur: string | null | undefined = nodeId;
      let guard = 0;
      while (cur && guard < 50) {
        const info = getInfo(cur);
        const p = info?.parentId ?? null;
        if (!p) return false;
        if (p === ancestorId) return true;
        cur = p;
        guard += 1;
      }
      return false;
    },
    [getInfo],
  );

  const hasSelectedDescendant = React.useCallback(
    (id: string) => {
      for (const s of selectedSet) {
        if (isAncestor(id, s)) return true;
      }
      return false;
    },
    [selectedSet, isAncestor],
  );

  const emitMeta = React.useCallback(
    (ids: string[]) => {
      if (!onChangeMeta) return;
      const metas: UnitPickMeta[] = ids.map((id) => {
        const info = infoMapRef.current.get(id);
        return {
          id,
          code: info?.code ?? '',
          fullName: info?.fullName ?? '',
          shortName: info?.shortName,
          symbol: info?.symbol,
          level: info?.level,
          primaryUnitTypeCode: info?.primaryUnitTypeCode,
          isVirtual: info?.isVirtual,
        };
      });
      onChangeMeta(metas);
    },
    [onChangeMeta],
  );

  const commitSelection = React.useCallback(
    (next: Set<string>) => {
      const nextIds = Array.from(next);
      onChange(nextIds);
      emitMeta(nextIds);
    },
    [emitMeta, onChange],
  );

  const resolveSelectableIds = React.useCallback(
    async (ids: string[]) => {
      const result: string[] = [];
      for (const id of Array.from(new Set(ids.filter(Boolean)))) {
        const info = getInfo(id);
        if (!info?.isVirtual) {
          result.push(id);
          continue;
        }

        if (resolvedVirtualBehavior === 'reject') {
          continue;
        }

        result.push(id);
      }

      return Array.from(new Set(result));
    },
    [getInfo, resolvedVirtualBehavior],
  );

  const applyToggle = React.useCallback(
    async (id: string) => {
      const current = new Set<string>(effectiveValue);
      const info = getInfo(id);

      if (info?.isVirtual && resolvedVirtualBehavior === 'reject') {
        return;
      }

      if (mode === 'single') {
        if (current.has(id)) {
          onChange([]);
          emitMeta([]);
        } else {
          onChange([id]);
          emitMeta([id]);
        }
        return;
      }

      const toggleIds = await resolveSelectableIds([id]);
      if (toggleIds.length === 0) return;

      const allChecked = toggleIds.every((toggleId) => current.has(toggleId));
      if (allChecked) {
        toggleIds.forEach((toggleId) => current.delete(toggleId));
        commitSelection(current);
        return;
      }

      const next = new Set<string>(current);

      for (const toggleId of toggleIds) {
        for (const s of current) {
          if (isAncestor(s, toggleId)) next.delete(s);
        }
        for (const s of current) {
          if (isAncestor(toggleId, s)) next.delete(s);
        }
        next.add(toggleId);
      }

      commitSelection(next);
    },
    [
      commitSelection,
      effectiveValue,
      emitMeta,
      getInfo,
      isAncestor,
      mode,
      onChange,
      resolveSelectableIds,
      resolvedVirtualBehavior,
    ],
  );

  const applyToggleMany = React.useCallback(
    async (ids: string[]) => {
      if (mode !== 'multiple' || ids.length === 0) return;

      const uniqueIds = await resolveSelectableIds(ids);
      if (uniqueIds.length === 0) return;

      const current = new Set<string>(effectiveValue);
      const allChecked = uniqueIds.every((id) => current.has(id));

      if (allChecked) {
        uniqueIds.forEach((id) => current.delete(id));
        commitSelection(current);
        return;
      }

      const next = new Set<string>(current);

      for (const id of uniqueIds) {
        for (const s of Array.from(next)) {
          if (isAncestor(s, id)) next.delete(s);
        }
      }

      for (const s of Array.from(next)) {
        if (uniqueIds.some((id) => isAncestor(id, s))) {
          next.delete(s);
        }
      }

      uniqueIds.forEach((id) => next.add(id));
      commitSelection(next);
    },
    [commitSelection, effectiveValue, isAncestor, mode, resolveSelectableIds],
  );

  const getCheckState = React.useCallback(
    (id: string): CheckState => {
      if (selectedSet.has(id)) return 'checked';
      if (mode !== 'single' && hasSelectedDescendant(id)) return 'indeterminate';
      return 'unchecked';
    },
    [selectedSet, hasSelectedDescendant, mode],
  );

  const compressedNames = React.useMemo(() => {
    const names: string[] = [];
    for (const id of effectiveValue) {
      const info = getInfo(id);
      names.push(info?.shortName ?? info?.fullName ?? '');
    }
    return names;
  }, [effectiveValue, getInfo]);

  const summaryLabel = React.useMemo(() => {
    if (effectiveValue.length === 0) return '';
    if (compressedNames.length <= 2) return compressedNames.join(', ');

    const inputWidth = inputBoxRef.current?.getBoundingClientRect().width ?? 240;
    const maxWidth = Math.max(80, (inputWidth * 3) / 4 - 40);
    return measureSummary(compressedNames, maxWidth);
  }, [effectiveValue.length, compressedNames]);

  const tooltipLabel = React.useMemo(() => {
    if (effectiveValue.length === 0) return 'Chưa chọn đơn vị';
    return compressedNames.join(', ');
  }, [effectiveValue.length, compressedNames]);

  const columns: Column[] = React.useMemo(() => {
    const cols: Column[] = [{ level: 0, parentId: null }];
    activePath.forEach((id, idx) => cols.push({ level: idx + 1, parentId: id }));
    return cols;
  }, [activePath]);

  const handleSearchChange = React.useCallback((level: number, text: string) => {
    setSearchByLevel((prev) => {
      const next = [...prev];
      next[level] = text;
      return next;
    });
  }, []);

  const handleOpenChildColumn = React.useCallback((level: number, nodeId: string) => {
    setActivePath((prev) => {
      const next = prev.slice(0, level);
      next[level] = nodeId;
      return next;
    });
  }, []);

  const handleCloseFromLevel = React.useCallback((level: number) => {
    if (level <= 0) setActivePath([]);
    else setActivePath((prev) => prev.slice(0, level - 1));
  }, []);

  return (
    <>
      <Tooltip title={tooltipLabel} arrow>
        <Box sx={{ width: '100%' }} ref={inputBoxRef}>
          <TextField
            size="small"
            fullWidth
            label={label}
            value={summaryLabel}
            onClick={handleOpen}
            slotProps={{
              input: {
                readOnly: true,
                sx: { cursor: 'pointer' },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Có thể chọn từng đơn vị hoặc dùng “Chọn tất cả” ở từng cột để lấy toàn bộ các đơn vị đang hiển thị trong cột đó.">
                      <IconButton size="small" tabIndex={-1} sx={{ color: 'text.disabled', mr: 0.5 }}>
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              display: 'flex',
              maxHeight: 420,
              maxWidth: 900,
              overflowX: 'auto',
            },
          },
        }}
      >
        {columns.map((col, idx) => (
          <ColumnView
            key={`${col.level}:${col.parentId ?? 'ROOT'}`}
            open={open}
            col={col}
            colIndex={idx}
            colCount={columns.length}
            searchValue={searchByLevel[col.level] ?? ''}
            onSearchChange={handleSearchChange}
            mode={mode}
            activePath={activePath}
            setActivePath={setActivePath}
            applyToggle={applyToggle}
            getCheckState={getCheckState}
            getInfo={getInfo}
            handleCloseFromLevel={handleCloseFromLevel}
            handleOpenChildColumn={handleOpenChildColumn}
            infoMapRef={infoMapRef}
            childrenCountRef={childrenCountRef}
            onToggleColumnSelection={applyToggleMany}
            virtualUnitBehavior={resolvedVirtualBehavior}
          />
        ))}
      </Popover>
    </>
  );
};

export default LazyUnitMultiSelect;
