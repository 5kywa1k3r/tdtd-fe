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
} from '@mui/material';

import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InputAdornment from '@mui/material/InputAdornment';

import { normalizeVi } from '../../helpers/normalize';
import { useGetUnitChildrenQuery, type UnitPickNode } from '../../features/admin/units/adminUnitsApi';

const emptyIcon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;
const indeterminateIcon = <IndeterminateCheckBoxIcon fontSize="small" />;

export type UnitSelectMode = 'single' | 'multiple';

export type UnitPickMeta = {
  id: string;
  code: string;
  fullName: string;
  shortName?: string;
  symbol?: string;
  level?: number;
};

export interface LazyUnitMultiSelectProps {
  value: string[]; // selected unitIds (exclusive)
  onChange: (value: string[]) => void;
  onChangeMeta?: (selected: UnitPickMeta[]) => void;
  mode?: UnitSelectMode;
  label?: string;
}

type Ref<T> = { current: T };

interface FlatInfo {
  id: string;
  fullName: string;
  code: string;
  shortName?: string;
  symbol?: string;
  level?: number;
  parentId?: string | null;
  depth: number;
}

interface Column {
  level: number;
  parentId: string | null; // null => level 0
}

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

  applyToggle: (id: string) => void;
  getCheckState: (id: string) => 'checked' | 'indeterminate' | 'unchecked';
  getInfo: (id: string) => FlatInfo | undefined;

  handleCloseFromLevel: (level: number) => void;
  handleOpenChildColumn: (level: number, nodeId: string) => void;

  infoMapRef: Ref<Map<string, FlatInfo>>;
  childrenCountRef: Ref<Map<string, number>>;
};

/**
 *  Tách ra top-level để không bị remount khi gõ => không mất focus
 */
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
}: ColumnViewProps) {
  const level = col.level;
  const parentId = col.parentId;

  //  chỉ query khi popover mở (đỡ spam), root vẫn ok
  const q = useGetUnitChildrenQuery({ parentId: parentId ?? null }, { skip: !open });

  const nodes: UnitPickNode[] = q.data ?? [];
  const loading = q.isFetching;

  // cache info (để label + ancestry)
  React.useEffect(() => {
    const map = infoMapRef.current;

    const put = (n: any, p: string | null) => {
      // API  có lúc trả fullname / fullName (legacy) => normalize
      const fn = n.fullName ?? n.fullname ?? '';
      const sn = n.shortName ?? n.shortname ?? '';
      const code = n.code ?? '';
      const symbol = n.symbol ?? '';
      const lvl = n.level ?? undefined;

      map.set(n.id, {
        id: n.id,
        fullName: fn,
        code,
        shortName: sn || undefined,
        symbol: symbol || undefined,
        level: lvl,
        parentId: p,
        depth: level,
      });
    };

    if (parentId === null) {
      nodes.forEach((n: any) => put(n, null));
    } else {
      nodes.forEach((n: any) => put(n, parentId));

      // vẫn có thể cache count (không dùng để ẩn nút > nữa)
      childrenCountRef.current.set(parentId, nodes.length);

      //  nếu mở 1 cột mà không có dữ liệu thì cắt path (tránh mở cột rỗng mãi)
      if (nodes.length === 0) {
        setActivePath((prev) => {
          const idx = prev.indexOf(parentId);
          if (idx < 0) return prev;
          const next = prev.slice(0, idx + 1);
          //  không đổi thì không set
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
        {!isRoot && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" sx={{ mr: 1 }}>
              {parentInfo?.shortName ?? parentInfo?.fullName ?? ''}
            </Typography>
            <Tooltip title="Thu gọn cấp này">
              <IconButton size="small" onClick={() => handleCloseFromLevel(level)}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

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
            {filtered.map((n: any) => {
              const id = n.id as string;

              const state = getCheckState(id);
              const checked = state === 'checked';
              const indeterminate = state === 'indeterminate';

              const isActiveOnThisLevel = level >= 1 && activePath[level] === id;

              //  luôn cho phép mở, backend quyết định có con hay không
              const canExpand = true;

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
                  onClick={() => applyToggle(id)}
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
                      applyToggle(id);
                    }}
                    sx={{ mr: 1 }}
                  />
                  <ListItemText primary={primary} />

                  {canExpand && (
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
                  )}
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
  label = 'Đơn vị',
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  // path đang mở theo cột: [id cấp 0, id cấp 1, ...]
  const [activePath, setActivePath] = React.useState<string[]>([]);
  // search theo level/cột
  const [searchByLevel, setSearchByLevel] = React.useState<string[]>([]);
  // đo width textbox
  const inputBoxRef = React.useRef<HTMLDivElement | null>(null);

  // cache info cho name/parent để làm exclusive check
  const infoMapRef = React.useRef<Map<string, FlatInfo>>(new Map());
  // cache: parentId -> children count (after first fetch)
  const childrenCountRef = React.useRef<Map<string, number>>(new Map());

  // normalize selected
  const effectiveValue = React.useMemo<string[]>(() => {
    const v = value ?? [];
    if (mode !== 'single') return v;
    return v.length > 0 ? [v[0]] : [];
  }, [value, mode]);

  const selectedSet = React.useMemo(() => new Set<string>(effectiveValue), [effectiveValue]);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const getInfo = React.useCallback((id: string) => infoMapRef.current.get(id), []);

  // ancestor check using loaded parent links
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
        };
      });
      onChangeMeta(metas);
    },
    [onChangeMeta],
  );

  const applyToggle = React.useCallback(
    (id: string) => {
      const current = new Set<string>(effectiveValue);

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

      if (current.has(id)) {
        current.delete(id);
        const nextIds = Array.from(current);
        onChange(nextIds);
        emitMeta(nextIds);
        return;
      }

      const next = new Set<string>(current);

      // chọn con -> bỏ cha
      for (const s of current) {
        if (isAncestor(s, id)) next.delete(s);
      }
      // chọn cha -> bỏ con
      for (const s of current) {
        if (isAncestor(id, s)) next.delete(s);
      }

      next.add(id);
      const nextIds = Array.from(next);
      onChange(nextIds);
      emitMeta(nextIds);
    },
    [effectiveValue, isAncestor, mode, onChange, emitMeta],
  );

  const getCheckState = React.useCallback(
    (id: string) => {
      if (selectedSet.has(id)) return 'checked';
      if (mode !== 'single' && hasSelectedDescendant(id)) return 'indeterminate';
      return 'unchecked';
    },
    [selectedSet, hasSelectedDescendant, mode],
  );

  // summary names: only selected ids
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
                    <Tooltip title="Trạng thái ô: trống = chưa chọn • gạch = chọn một phần • tích = đã chọn">
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
          />
        ))}
      </Popover>
    </>
  );
};