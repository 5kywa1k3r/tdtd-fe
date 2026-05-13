import * as React from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

import { normalizeVi } from '../../helpers/normalize';
import { useGetUnitChildrenQuery, type UnitPickNode } from '../../api/adminUnitsApi';
import { getTokenFromStorage } from '../../stores/authStorage';
import { ROLE_PREFIX } from '../../constants/roles';
import { UITextKey, uiText } from '../../constants/uiText';

const emptyIcon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export type AccountSelectMode = 'single' | 'multiple';
export type AccountTypeFilter = 'ALL' | 'UNIT_ACCOUNT' | 'NORMAL_USER';

export type AccountPickMeta = {
  id: string;
  username: string;
  fullName?: string;
  unitId?: string;
  unitName?: string;
  unitShortName?: string;
  roles?: string[];
  isManagerUnit?: boolean;
};

type FlatUnitInfo = {
  id: string;
  fullName: string;
  code: string;
  shortName?: string;
  symbol?: string;
  level?: number;
  parentId?: string | null;
};

type UnitColumn = {
  level: number;
  parentId: string | null;
};

export interface LazyUnitAccountSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  onChangeMeta?: (selected: AccountPickMeta[]) => void;
  label?: string;
  mode?: AccountSelectMode;
  rootParentId?: string | null;
  scopeRootId?: string | null;
  autoPickManagerUnit?: boolean;
  accountTypeFilter?: AccountTypeFilter;
  onAccountTypeFilterChange?: (value: AccountTypeFilter) => void;
  loadAccountsByUnit?: (args: {
    unitId: string;
    q?: string;
    scopeRootId?: string | null;
    signal?: AbortSignal;
  }) => Promise<AccountPickMeta[]>;
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
    const width = ctx.measureText(part).width;
    if (used + width > maxWidth) {
      if (!result) result = names[i];
      return result + ', ...';
    }
    result += part;
    used += width;
  }
  return result;
}

function scheduleSelectionUpdate(run: () => void) {
  React.startTransition(run);
}

function isPrivilegedUsername(username?: string | null) {
  const value = (username ?? '').trim().toLowerCase();
  return value.startsWith('mu_') || value.startsWith('ml_');
}

function formatUsername(username?: string | null) {
  const raw = (username ?? '').trim();
  if (!raw) return '';
  if (isPrivilegedUsername(raw)) {
    return raw.replace(/^(mu_|ml_)/i, '').toUpperCase();
  }
  return raw;
}

function isManagerUnitAccount(account: AccountPickMeta) {
  if (account.isManagerUnit) return true;
  if (isPrivilegedUsername(account.username)) return true;
  const roles = account.roles ?? [];
  return roles.some((r) => (r ?? '').startsWith(ROLE_PREFIX.MANAGER_UNIT));
}

async function defaultLoadAccountsByUnit(args: {
  unitId: string;
  q?: string;
  scopeRootId?: string | null;
  signal?: AbortSignal;
}): Promise<AccountPickMeta[]> {
  const search = new URLSearchParams();
  if (args.q?.trim()) search.set('q', args.q.trim());
  if (args.scopeRootId?.trim()) search.set('scopeRootId', args.scopeRootId.trim());

  const token = getTokenFromStorage();
  const res = await fetch(
    `/api/units/${encodeURIComponent(args.unitId)}/accounts/pick${search.toString() ? `?${search}` : ''}`,
    {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: args.signal,
    },
  );

  if (!res.ok) {
    throw new Error('Không tải được danh sách tài khoản theo đơn vị.');
  }

  const data = await res.json();
  const rows = Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];

  return rows.map((x: any) => ({
    id: x.id ?? x.userId ?? '',
    username: x.username ?? '',
    fullName: x.fullName ?? x.name ?? '',
    unitId: x.unitId ?? '',
    unitName: x.unitName ?? '',
    unitShortName: x.unitShortName ?? '',
    roles: Array.isArray(x.roles) ? x.roles : [],
    isManagerUnit: !!x.isManagerUnit,
  }));
}

type UnitColumnViewProps = {
  open: boolean;
  col: UnitColumn;
  colCount: number;
  activePath: string[];
  activeUnitId: string | null;
  searchValue: string;
  onSearchChange: (level: number, text: string) => void;
  onUnitIntent: (unitId: string) => void;
  onPickWholeUnit: (unitId: string) => void;
  onOpenChildColumn: (level: number, nodeId: string) => void;
  onCloseFromLevel: (level: number) => void;
  getUnitInfo: (id: string) => FlatUnitInfo | undefined;
  isWholeUnitSelected: (unitId: string) => boolean;
  unitInfoMapRef: React.MutableRefObject<Map<string, FlatUnitInfo>>;
};

function UnitColumnView({
  open,
  col,
  colCount,
  activePath,
  activeUnitId,
  searchValue,
  onSearchChange,
  onUnitIntent,
  onPickWholeUnit,
  onOpenChildColumn,
  onCloseFromLevel,
  getUnitInfo,
  isWholeUnitSelected,
  unitInfoMapRef,
}: UnitColumnViewProps) {
  const q = useGetUnitChildrenQuery({ parentId: col.parentId ?? null }, { skip: !open });
  const nodes: UnitPickNode[] = q.data ?? [];
  const loading = q.isFetching;
  const deferredSearchValue = React.useDeferredValue(searchValue);

  React.useEffect(() => {
    const map = unitInfoMapRef.current;
    nodes.forEach((n: any) => {
      map.set(n.id, {
        id: n.id,
        fullName: n.fullName ?? n.fullname ?? '',
        code: n.code ?? '',
        shortName: n.shortName ?? n.shortname ?? '',
        symbol: n.symbol ?? '',
        level: n.level,
        parentId: col.parentId,
      });
    });
  }, [col.parentId, nodes, unitInfoMapRef]);

  const filtered = React.useMemo(() => {
    const key = normalizeVi(deferredSearchValue);
    if (!key) return nodes;
    return nodes.filter((n: any) => {
      const text = normalizeVi(n.shortName ?? n.shortname ?? n.fullName ?? n.fullname ?? '');
      return text.includes(key);
    });
  }, [nodes, deferredSearchValue]);

  const parentInfo = col.parentId ? getUnitInfo(col.parentId) : undefined;

  return (
    <Box
      sx={{
        width: 280,
        borderRight:
          col.level < colCount - 1 ? (theme) => `1px solid ${theme.palette.divider}` : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="subtitle2" noWrap sx={{ minWidth: 0 }}>
            {parentInfo?.shortName ?? parentInfo?.fullName ?? 'Đơn vị'}
          </Typography>
          {col.level > 0 ? (
            <IconButton size="small" onClick={() => onCloseFromLevel(col.level)}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>

        <TextField
          size="small"
          value={searchValue}
          onChange={(e) => onSearchChange(col.level, e.target.value)}
          placeholder={uiText(UITextKey.TextTimDonVi)}
          fullWidth
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
              const unitId = n.id as string;
              const text = n.shortName ?? n.shortname ?? n.fullName ?? n.fullname ?? '';
              const isActive = activePath[col.level] === unitId || activeUnitId === unitId;
              const wholeSelected = isWholeUnitSelected(unitId);

              return (
                <ListItemButton
                  key={unitId}
                  selected={isActive}
                  onClick={() => void onUnitIntent(unitId)}
                >
                  <Tooltip title={uiText(UITextKey.TextChonCaCayDonViNay)}>
                    <Checkbox
                      edge="start"
                      disableRipple
                      icon={emptyIcon}
                      checkedIcon={checkedIcon}
                      checked={wholeSelected}
                      onClick={(e) => {
                        e.stopPropagation();
                        void onPickWholeUnit(unitId);
                      }}
                      sx={{ mr: 0.5 }}
                    />
                  </Tooltip>
                  <AccountTreeOutlinedIcon fontSize="small" style={{ marginRight: 8, opacity: 0.7 }} />
                  <ListItemText
                    primary={
                      <Typography variant="body2" noWrap title={text}>
                        {text}
                      </Typography>
                    }
                  />
                  <Tooltip title={uiText(UITextKey.TextXemDonViCapDuoi)}>
                    <IconButton
                      size="small"
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenChildColumn(col.level, unitId);
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
                <Typography variant="body2" color="text.secondary">
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

const MemoizedUnitColumnView = React.memo(UnitColumnView);

export const LazyUnitAccountSelect: React.FC<LazyUnitAccountSelectProps> = ({
  value,
  onChange,
  onChangeMeta,
  label = 'Tài khoản',
  mode = 'multiple',
  rootParentId = null,
  scopeRootId = null,
  autoPickManagerUnit = true,
  accountTypeFilter = 'ALL',
  onAccountTypeFilterChange,
  loadAccountsByUnit = defaultLoadAccountsByUnit,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const [activePath, setActivePath] = React.useState<string[]>([]);
  const [searchByLevel, setSearchByLevel] = React.useState<string[]>([]);
  const [activeUnitId, setActiveUnitId] = React.useState<string | null>(null);
  const [accountQuery, setAccountQuery] = React.useState('');
  const [accountsLoading, setAccountsLoading] = React.useState(false);
  const [accountError, setAccountError] = React.useState('');
  const [accountsByUnit, setAccountsByUnit] = React.useState<Record<string, AccountPickMeta[]>>({});
  const [accountMetaMap, setAccountMetaMap] = React.useState<Record<string, AccountPickMeta>>({});
  const inputBoxRef = React.useRef<HTMLDivElement | null>(null);
  const unitInfoMapRef = React.useRef<Map<string, FlatUnitInfo>>(new Map());
  const deferredAccountQuery = React.useDeferredValue(accountQuery);

  const handleOpen = React.useCallback((e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget), []);
  const handleClose = React.useCallback(() => setAnchorEl(null), []);

  const selectedIds = React.useMemo(() => {
    if (mode === 'single') return (value ?? []).slice(0, 1);
    return value ?? [];
  }, [mode, value]);

  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  const getSelectedMetas = React.useCallback(
    (ids: string[]) => ids.map((id) => accountMetaMap[id]).filter(Boolean),
    [accountMetaMap],
  );

  const applySelection = React.useCallback(
    (nextIds: string[]) => {
      scheduleSelectionUpdate(() => {
        onChange(nextIds);
        if (onChangeMeta) {
          onChangeMeta(getSelectedMetas(nextIds));
        }
      });
    },
    [getSelectedMetas, onChange, onChangeMeta],
  );

  const getUnitInfo = React.useCallback((id: string) => unitInfoMapRef.current.get(id), []);

  const columns: UnitColumn[] = React.useMemo(() => {
    const cols: UnitColumn[] = [{ level: 0, parentId: rootParentId ?? null }];
    activePath.forEach((id, idx) => cols.push({ level: idx + 1, parentId: id }));
    return cols;
  }, [activePath, rootParentId]);

  const fetchAccounts = React.useCallback(
    async (unitId: string, force = false) => {
      if (!unitId) return [];
      if (!force && accountsByUnit[unitId]) {
        return accountsByUnit[unitId];
      }

      setAccountsLoading(true);
      setAccountError('');
      const controller = new AbortController();

      try {
        const rows = await loadAccountsByUnit({
          unitId,
          q: '',
          scopeRootId: scopeRootId ?? rootParentId ?? null,
          signal: controller.signal,
        });

        setAccountsByUnit((prev) => ({ ...prev, [unitId]: rows }));
        setAccountMetaMap((prev) => {
          const next = { ...prev };
          for (const row of rows) {
            next[row.id] = row;
          }
          return next;
        });

        return rows;
      } catch (err: any) {
        setAccountError(err?.message || 'Không tải được tài khoản.');
        return [];
      } finally {
        setAccountsLoading(false);
      }
    },
    [accountsByUnit, loadAccountsByUnit, rootParentId, scopeRootId],
  );

  const handlePickAccount = React.useCallback(
    (account: AccountPickMeta) => {
      if (mode === 'single') {
        applySelection([account.id]);
        handleClose();
        return;
      }

      const next = new Set(selectedIds);
      if (next.has(account.id)) next.delete(account.id);
      else next.add(account.id);

      applySelection(Array.from(next));
    },
    [applySelection, handleClose, mode, selectedIds],
  );

  const findManagerAccount = React.useCallback(
    (rows: AccountPickMeta[]) => rows.find(isManagerUnitAccount) ?? null,
    [],
  );

  const handleUnitIntent = React.useCallback(
    async (unitId: string) => {
      setActiveUnitId(unitId);
      setAccountError('');
      const rows = await fetchAccounts(unitId);
      if (!rows.length && autoPickManagerUnit) {
        setAccountError('Đơn vị này chưa có tài khoản phù hợp.');
      }
    },
    [autoPickManagerUnit, fetchAccounts],
  );

  const handlePickWholeUnit = React.useCallback(
    async (unitId: string) => {
      setActiveUnitId(unitId);
      const rows = await fetchAccounts(unitId);
      if (!rows.length) {
        setAccountError('Đơn vị này chưa có tài khoản để đại diện cả cây.');
        return;
      }

      const manager = findManagerAccount(rows);
      if (!manager) {
        setAccountError('Đơn vị này chưa có tài khoản manager unit để chọn cả cây.');
        return;
      }

      setAccountError('');
      handlePickAccount(manager);
    },
    [fetchAccounts, findManagerAccount, handlePickAccount],
  );

  const currentUnitAccounts = React.useMemo(() => {
    const unitId = activeUnitId ?? '';
    const rows = accountsByUnit[unitId] ?? [];
    const key = normalizeVi(deferredAccountQuery);

    return rows.filter((row) => {
      if (accountTypeFilter === 'UNIT_ACCOUNT' && !isManagerUnitAccount(row)) return false;
      if (accountTypeFilter === 'NORMAL_USER' && isManagerUnitAccount(row)) return false;
      if (!key) return true;
      const text = normalizeVi(
        [row.username, row.fullName, row.unitShortName, row.unitName].filter(Boolean).join(' '),
      );
      return text.includes(key);
    });
  }, [deferredAccountQuery, accountTypeFilter, accountsByUnit, activeUnitId]);

  const selectedMetas = React.useMemo(() => getSelectedMetas(selectedIds), [getSelectedMetas, selectedIds]);

  const summaryNames = React.useMemo(() => {
    return selectedMetas
      .map((x) => formatUsername(x.username) || x.fullName || x.id)
      .filter(Boolean);
  }, [selectedMetas]);

  const selectedWholeUnitSet = React.useMemo(() => {
    const next = new Set<string>();
    for (const meta of selectedMetas) {
      if (meta?.unitId && isManagerUnitAccount(meta)) {
        next.add(meta.unitId);
      }
    }
    return next;
  }, [selectedMetas]);

  const isWholeUnitSelected = React.useCallback(
    (unitId: string) => selectedWholeUnitSet.has(unitId),
    [selectedWholeUnitSet],
  );

  const summaryLabel = React.useMemo(() => {
    if (!summaryNames.length) return '';
    if (summaryNames.length <= 2) return summaryNames.join(', ');
    const inputWidth = inputBoxRef.current?.getBoundingClientRect().width ?? 240;
    return measureSummary(summaryNames, Math.max(80, (inputWidth * 3) / 4 - 40));
  }, [summaryNames]);

  const tooltipLabel = React.useMemo(() => {
    if (!summaryNames.length) return 'Chưa chọn tài khoản';
    return summaryNames.join(', ');
  }, [summaryNames]);

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
    setActivePath((prev) => prev.slice(0, Math.max(0, level - 1)));
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
                    <Tooltip title={uiText(UITextKey.TextTickODongDonViDeChonCaCay)}>
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
              maxHeight: 500,
              maxWidth: 1220,
              overflowX: 'auto',
            },
          },
        }}
      >
        {columns.map((col) => (
          <MemoizedUnitColumnView
            key={`${col.level}:${col.parentId ?? 'ROOT'}`}
            open={open}
            col={col}
            colCount={columns.length}
            activePath={activePath}
            activeUnitId={activeUnitId}
            searchValue={searchByLevel[col.level] ?? ''}
            onSearchChange={handleSearchChange}
            onUnitIntent={handleUnitIntent}
            onPickWholeUnit={handlePickWholeUnit}
            onOpenChildColumn={handleOpenChildColumn}
            onCloseFromLevel={handleCloseFromLevel}
            getUnitInfo={getUnitInfo}
            isWholeUnitSelected={isWholeUnitSelected}
            unitInfoMapRef={unitInfoMapRef}
          />
        ))}

        <Box sx={{ width: 380, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Typography variant="subtitle2" noWrap sx={{ minWidth: 0 }}>
                {activeUnitId ? getUnitInfo(activeUnitId)?.shortName ?? getUnitInfo(activeUnitId)?.fullName ?? 'Tài khoản' : 'Tài khoản'}
              </Typography>

              <TextField
                select
                size="small"
                label={uiText(UITextKey.TextLoai)}
                value={accountTypeFilter}
                onChange={(e) => onAccountTypeFilterChange?.(e.target.value as AccountTypeFilter)}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="ALL">{uiText(UITextKey.TextTatCa)}</MenuItem>
                <MenuItem value="UNIT_ACCOUNT">{uiText(UITextKey.TextTaiKhoanDonVi)}</MenuItem>
                <MenuItem value="NORMAL_USER">{uiText(UITextKey.TextNguoiDungThuong)}</MenuItem>
              </TextField>
            </Stack>

            <TextField
              size="small"
              value={accountQuery}
              onChange={(e) => setAccountQuery(e.target.value)}
              placeholder={uiText(UITextKey.TextTimUsernameHoTen)}
              fullWidth
            />
          </Box>

          <Divider />

          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {!activeUnitId ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Tick ở cột bên trái để chọn cả cây đơn vị. Click vào một đơn vị để xem và chọn tài khoản con ở panel này.
                </Typography>
              </Box>
            ) : accountsLoading ? (
              <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                <CircularProgress size={16} />
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Đang tải tài khoản…
                </Typography>
              </Box>
            ) : accountError ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="error">
                  {accountError}
                </Typography>
              </Box>
            ) : (
              <List dense>
                {currentUnitAccounts.map((account) => {
                  const checked = selectedSet.has(account.id);
                  const displayUsername = formatUsername(account.username) || account.fullName || account.id;
                  const secondary = isManagerUnitAccount(account)
                    ? 'Tài khoản đơn vị'
                    : account.fullName || 'Người dùng thường';

                  return (
                    <ListItemButton
                      key={account.id}
                      selected={checked}
                      onClick={() => handlePickAccount(account)}
                    >
                      <Checkbox
                        edge="start"
                        disableRipple
                        icon={emptyIcon}
                        checkedIcon={checkedIcon}
                        checked={checked}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickAccount(account);
                        }}
                        sx={{ mr: 1 }}
                      />
                      {isManagerUnitAccount(account) ? (
                        <ManageAccountsOutlinedIcon fontSize="small" style={{ marginRight: 8, opacity: 0.7 }} />
                      ) : (
                        <PersonOutlineOutlinedIcon fontSize="small" style={{ marginRight: 8, opacity: 0.7 }} />
                      )}
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap title={displayUsername}>
                            {displayUsername}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" noWrap title={secondary}>
                            {secondary}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  );
                })}

                {!currentUnitAccounts.length && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Đơn vị này chưa có tài khoản phù hợp.
                    </Typography>
                  </Box>
                )}
              </List>
            )}
          </Box>

          <Divider />

          <Box sx={{ p: 1 }}>
            <Button fullWidth variant="outlined" onClick={handleClose}>
              Đóng
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default LazyUnitAccountSelect;
