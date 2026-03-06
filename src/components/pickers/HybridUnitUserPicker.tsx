import * as React from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
  InputAdornment,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import type { UnitPickRow, UserPickRow } from "../../api/pickersApi";
import {
  useGetPickerUnitChildrenQuery,
  useLazyLookupPickerAssigneeByUsernameQuery,
  useLazyLookupPickerLeaderByUsernameQuery,
  useLazySearchPickerAssigneesByUnitQuery,
  useLazySearchPickerLeadersByUnitQuery,
} from "../../api/pickersApi";
import { type UserRefDTO } from "../../types/userRefDto";

export type PickerKind = "leaders" | "assignees";
export type PickerMode = "single" | "multiple";

export type HybridUnitUserPickerProps = {
  kind: PickerKind;
  mode?: PickerMode;
  label?: string;
  placeholder?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;

  // ✅ NEW: snapshot từ BE để render chip/tooltip đẹp khi vào edit/view
  valueRefs?: UserRefDTO[];
};

function sameArray(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function normalizeIds(ids: string[], mode: PickerMode) {
  const uniq = Array.from(new Set(ids.filter(Boolean)));
  return mode === "single" ? (uniq.length ? [uniq[0]] : []) : uniq;
}

function isHiddenRootUnit(u: UnitPickRow): boolean {
  const code = (u.code ?? "").trim().toUpperCase();
  const name = String(u.shortName ?? u.fullName ?? "").trim().toUpperCase();
  if (code === "ROOT") return true;
  if (Number(u.level ?? 0) <= 0) return true;
  if (name === "ROOT" || name.includes("ĐƠN VỊ ẨN") || name.includes("HIDDEN ROOT")) return true;
  return false;
}

type UnitNodeProps = {
  unit: UnitPickRow;
  level: number;
  open: boolean;
  expanded: boolean;
  onToggleExpand: (unitId: string) => void;
  activeUnitId: string | null;
  onSelectUnit: (unitId: string) => void;
  unitMapRef: React.MutableRefObject<Map<string, UnitPickRow>>;
  expandedSet: Set<string>;
};

function UnitNode({
  unit,
  level,
  open,
  expanded,
  onToggleExpand,
  activeUnitId,
  onSelectUnit,
  unitMapRef,
  expandedSet,
}: UnitNodeProps) {
  const q = useGetPickerUnitChildrenQuery(
    { parentId: unit.id },
    { skip: !open || !expanded, refetchOnMountOrArgChange: false }
  );

  const childrenRaw = q.data ?? [];
  const children = React.useMemo(() => childrenRaw.filter((x) => !isHiddenRootUnit(x)), [childrenRaw]);

  React.useEffect(() => {
    unitMapRef.current.set(unit.id, unit);
    children.forEach((c) => unitMapRef.current.set(c.id, c));
  }, [unit, children, unitMapRef]);

  const isActive = activeUnitId === unit.id;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 1,
          py: 0.25,
          ml: level * 1.5,
          borderRadius: 1,
          cursor: "pointer",
          bgcolor: isActive ? "action.selected" : "transparent",
          "&:hover": { bgcolor: isActive ? "action.selected" : "action.hover" },
        }}
        onClick={() => onSelectUnit(unit.id)}
      >
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(unit.id);
          }}
          sx={{ mr: 0.5 }}
        >
          {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap title={unit.shortName || unit.fullName}>
            {unit.shortName || unit.fullName}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap title={unit.symbol ?? unit.code}>
            {unit.symbol ?? unit.code}
          </Typography>
        </Box>
      </Box>

      {expanded && (
        <Box sx={{ ml: 0.5 }}>
          {q.isFetching && children.length === 0 ? (
            <Box sx={{ px: 2, py: 1, display: "flex", gap: 1, alignItems: "center" }}>
              <CircularProgress size={14} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Đang tải…
              </Typography>
            </Box>
          ) : (
            children.map((c) => (
              <UnitNode
                key={c.id}
                unit={c}
                level={level + 1}
                open={open}
                expanded={expandedSet.has(c.id)}
                onToggleExpand={onToggleExpand}
                activeUnitId={activeUnitId}
                onSelectUnit={onSelectUnit}
                unitMapRef={unitMapRef}
                expandedSet={expandedSet}
              />
            ))
          )}

          {!q.isFetching && children.length === 0 && (
            <Box sx={{ px: 2.5, py: 0.5 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                (Không có đơn vị con)
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export const HybridUnitUserPicker: React.FC<HybridUnitUserPickerProps> = React.memo(function HybridUnitUserPicker({
  kind,
  mode = "single",
  label = "Chọn người dùng",
  placeholder,
  value,
  onChange,
  disabled,
  valueRefs, // ✅ NEW
}) {
  const theme = useTheme();

  const chipSx = React.useMemo(
    () => ({
      bgcolor: alpha(theme.palette.primary.main, 0.12),
      color: theme.palette.primary.main,
      fontWeight: 600,
      border: `1px solid ${theme.palette.divider}`,
      "& .MuiChip-deleteIcon": {
        color: theme.palette.primary.main,
        opacity: 0.75,
        "&:hover": { opacity: 1 },
      },
    }),
    [theme]
  );

  const chipMoreSx = React.useMemo(
    () => ({
      bgcolor: alpha(theme.palette.text.primary, 0.08),
      color: theme.palette.text.secondary,
      fontWeight: 700,
      border: `1px solid ${theme.palette.divider}`,
    }),
    [theme]
  );

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => new Set());
  const expandedSet = expandedIds;

  const [activeUnitId, setActiveUnitId] = React.useState<string | null>(null);

  const rootQ = useGetPickerUnitChildrenQuery(
    { parentId: null },
    { skip: !open, refetchOnMountOrArgChange: false }
  );

  const rootRaw = rootQ.data ?? [];
  const rootUnits = React.useMemo(() => rootRaw.filter((u) => !isHiddenRootUnit(u)), [rootRaw]);

  // default unit
  React.useEffect(() => {
    if (!open) return;
    if (rootQ.isFetching) return;
    if (activeUnitId) return;
    if (rootUnits.length > 0) {
      setActiveUnitId(rootUnits[0].id);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(rootUnits[0].id);
        return next;
      });
    }
  }, [open, rootQ.isFetching, activeUnitId, rootUnits]);

  const unitMapRef = React.useRef<Map<string, UnitPickRow>>(new Map());
  React.useEffect(() => {
    rootUnits.forEach((u) => unitMapRef.current.set(u.id, u));
  }, [rootUnits]);

  const unitSymbolByUnitId = React.useCallback((unitId?: string | null) => {
    if (!unitId) return "";
    const u = unitMapRef.current.get(unitId);
    return (u?.symbol ?? "").trim();
  }, []);

  const unitShortNameByUnitId = React.useCallback((unitId?: string | null) => {
    if (!unitId) return "";
    const u = unitMapRef.current.get(unitId);
    return (u?.shortName ?? u?.fullName ?? "").trim();
  }, []);

  const selected = React.useMemo(() => normalizeIds(value ?? [], mode), [value, mode]);
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  const userMapRef = React.useRef<Map<string, UserPickRow>>(new Map());

  // ✅ force re-render khi prime map (ref không trigger render)
  const [, bump] = React.useState(0);

  // ✅ PRIME: bơm snapshot refs vào userMapRef + unitMapRef để render chip/tooltip đẹp khi edit
  React.useEffect(() => {
    if (!valueRefs || valueRefs.length === 0) return;

    let changed = false;

    for (const r of valueRefs) {
      if (!r?.userId) continue;

      // prime unitMapRef: để unitSymbolByUnitId / unitShortNameByUnitId vẫn có data
      if (r.unitId) {
        const existedUnit = unitMapRef.current.get(r.unitId);
        if (!existedUnit) {
          unitMapRef.current.set(r.unitId, {
            id: r.unitId,
            code: null as any,
            symbol: r.unitSymbol ?? null,
            shortName: r.unitShortName ?? null,
            fullName: r.unitName ?? r.unitShortName ?? r.unitSymbol ?? null,
            level: null as any,
          } as UnitPickRow);
          changed = true;
        } else {
          // fill thiếu nhẹ, không overwrite dữ liệu thật
          const patch: Partial<UnitPickRow> = {};
          if (!existedUnit.symbol && r.unitSymbol) patch.symbol = r.unitSymbol as any;
          if (!existedUnit.shortName && r.unitShortName) patch.shortName = r.unitShortName as any;
          if (!existedUnit.fullName && (r.unitName || r.unitShortName || r.unitSymbol))
            patch.fullName = (r.unitName ?? r.unitShortName ?? r.unitSymbol) as any;

          if (Object.keys(patch).length > 0) {
            unitMapRef.current.set(r.unitId, { ...existedUnit, ...patch } as UnitPickRow);
            changed = true;
          }
        }
      }

      // prime userMapRef
      const existedUser = userMapRef.current.get(r.userId);
      if (!existedUser) {
        userMapRef.current.set(r.userId, {
          id: r.userId,
          username: r.username ?? "",
          fullName: r.fullName ?? r.username ?? r.userId,
          unitId: r.unitId ?? "",
        } as UserPickRow);
        changed = true;
      } else {
        // fill thiếu nhẹ
        const patch: Partial<UserPickRow> = {};
        if (!existedUser.username && r.username) patch.username = r.username as any;
        if (!existedUser.fullName && (r.fullName || r.username))
          patch.fullName = (r.fullName ?? r.username) as any;
        if ((!existedUser.unitId || existedUser.unitId === "") && r.unitId) patch.unitId = r.unitId as any;

        if (Object.keys(patch).length > 0) {
          userMapRef.current.set(r.userId, { ...existedUser, ...patch } as UserPickRow);
          changed = true;
        }
      }
    }

    if (changed) bump((x) => x + 1);
  }, [valueRefs]);

  const [usernameText, setUsernameText] = React.useState("");
  const [page, setPage] = React.useState(0);
  const pageSize = 20;

  const [rows, setRows] = React.useState<UserPickRow[]>([]);
  const [totalRows, setTotalRows] = React.useState(0);
  const [loadingUsers, setLoadingUsers] = React.useState(false);

  const [searchLeaders] = useLazySearchPickerLeadersByUnitQuery();
  const [lookupLeader] = useLazyLookupPickerLeaderByUsernameQuery();
  const [searchAssignees] = useLazySearchPickerAssigneesByUnitQuery();
  const [lookupAssignee] = useLazyLookupPickerAssigneeByUsernameQuery();

  const lastEmitRef = React.useRef<string[]>([]);
  const emit = React.useCallback(
    (ids: string[]) => {
      const out = normalizeIds(ids, mode);
      if (sameArray(lastEmitRef.current, out)) return;
      lastEmitRef.current = out;
      onChange(out);
    },
    [onChange, mode]
  );

  const openPopover = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    setAnchorEl(e.currentTarget);
  };
  const closePopover = () => setAnchorEl(null);

  const fetchUsers = React.useCallback(
    async (opts: { page: number; username?: string }) => {
      if (!activeUnitId) {
        setRows([]);
        setTotalRows(0);
        return;
      }
      setLoadingUsers(true);
      setRows([]);
      setTotalRows(0);
      try {
        const arg = {
          unitId: activeUnitId,
          username: opts.username?.trim() || undefined,
          page: opts.page,
          pageSize,
        };

        const res =
          kind === "leaders"
            ? await searchLeaders(arg, true).unwrap()
            : await searchAssignees(arg, true).unwrap();

        const r = res.rows ?? [];
        r.forEach((u) => userMapRef.current.set(u.id, u));
        setRows(r);
        setTotalRows(Number(res.totalRows ?? 0));
      } finally {
        setLoadingUsers(false);
      }
    },
    [activeUnitId, kind, searchLeaders, searchAssignees]
  );

  React.useEffect(() => {
    if (!open) return;
    if (!activeUnitId) return;
    setPage(0);
    void fetchUsers({ page: 0, username: usernameText.trim() || undefined });
  }, [open, activeUnitId, kind, fetchUsers, usernameText]);

  const handleSearchClick = () => {
    if (!open) return;
    setPage(0);
    void fetchUsers({ page: 0, username: usernameText.trim() || undefined });
  };

  const handleLookup = React.useCallback(async () => {
    const uname = usernameText.trim();
    if (!uname) return;

    const res =
      kind === "leaders"
        ? await lookupLeader({ username: uname, unitId: undefined }, true).unwrap()
        : await lookupAssignee({ username: uname, unitId: undefined }, true).unwrap();

    if (!res) return;
    userMapRef.current.set(res.id, res);

    if (mode === "single") {
      emit([res.id]);
      return;
    }
    const next = new Set(selected);
    next.add(res.id);
    emit(Array.from(next));
  }, [usernameText, kind, lookupLeader, lookupAssignee, mode, selected, emit]);

  const toggleUser = (id: string) => {
    if (mode === "single") {
      emit(selectedSet.has(id) ? [] : [id]);
      return;
    }
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    emit(Array.from(next));
  };

  const toggleExpand = (unitId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const handleSelectUnit = (unitId: string) => {
    setActiveUnitId(unitId);
    setPage(0);
    void fetchUsers({ page: 0, username: usernameText.trim() || undefined });
  };

  const renderChipLabel = (u: UserPickRow) => {
    const sym = unitSymbolByUnitId(u.unitId);
    return sym ? `${u.fullName} - ${sym}` : `${u.fullName}`;
  };

  const selectedUsers = React.useMemo(
    () => selected.map((id) => userMapRef.current.get(id)).filter(Boolean) as UserPickRow[],
    [selected]
  );

  const tooltipText = React.useMemo(() => {
    if (!selectedUsers.length) return "Chưa chọn";
    return selectedUsers
      .map((u) => `${u.username} — ${u.fullName} (${unitShortNameByUnitId(u.unitId)})`)
      .join("\n");
  }, [selectedUsers, unitShortNameByUnitId]);

  const previewIds = React.useMemo(() => selected.slice(0, 2), [selected]);
  const moreCount = Math.max(0, selected.length - previewIds.length);

  return (
    <>
      <TextField
        size="medium"
        fullWidth
        label={label}
        value=""
        onClick={openPopover}
        disabled={disabled}
        slotProps={{
          htmlInput: {
            readOnly: true,
            style: { pointerEvents: "none" }, // ✅ tránh input đè hover tooltip
          },
          input: {
            sx: {
              cursor: disabled ? "not-allowed" : "pointer",
              "& .MuiInputBase-input": { width: 0, minWidth: 0, p: 0 },
            },

            startAdornment: (
              <InputAdornment position="start" sx={{ mr: 0.5, maxWidth: "100%" }}>
                <Tooltip
                  title={
                    <Typography variant="caption" sx={{ whiteSpace: "pre-line" }}>
                      {tooltipText}
                    </Typography>
                  }
                  arrow
                  placement="top-start"
                  enterDelay={250}
                >
                  <Box
                    sx={{
                      pointerEvents: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selected.length === 0 ? (
                      <Typography variant="body2" sx={{ color: "text.disabled" }}>
                        {placeholder ?? "Chọn..."}
                      </Typography>
                    ) : (
                      <>
                        {previewIds.map((id) => {
                          const u = userMapRef.current.get(id);
                          const label2 = u ? renderChipLabel(u) : id;
                          return <Chip key={id} size="small" label={label2} sx={{ maxWidth: 220, ...chipSx }} />;
                        })}
                        {moreCount > 0 && <Chip size="small" label={`+${moreCount}`} sx={chipMoreSx} />}
                      </>
                    )}
                  </Box>
                </Tooltip>
              </InputAdornment>
            ),

            endAdornment: (
              <InputAdornment position="end">
                {selected.length > 0 && (
                  <Tooltip title="Xóa tất cả">
                    <IconButton
                      size="small"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        emit([]);
                      }}
                      sx={{ mr: 0.5 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Chọn đơn vị và đánh dấu người dùng hoặc tìm kiếm theo tên tài khoản">
                  <IconButton size="small" tabIndex={-1} sx={{ color: "text.disabled" }}>
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              width: 720,
              maxWidth: "76vw",
              maxHeight: "70vh",
              p: 1,
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        {/* ===== Selected bar (cuộn ngang) ===== */}
        <Box sx={{ px: 1, pt: 0.5, pb: 0.75 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color: "text.secondary", mr: 0.5, flexShrink: 0 }}>
              Đã chọn:
            </Typography>

            <Box sx={{ flex: 1, minWidth: 0, overflowX: "auto", pb: 0.25 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "max-content" }}>
                {selected.length === 0 ? (
                  <Typography variant="caption" sx={{ color: "text.disabled" }}>
                    (Chưa chọn)
                  </Typography>
                ) : (
                  selected.map((id) => {
                    const u = userMapRef.current.get(id);
                    const label2 = u ? renderChipLabel(u) : id;
                    return (
                      <Chip
                        key={id}
                        size="small"
                        label={label2}
                        onDelete={() => toggleUser(id)} // ✅ tắt/bỏ chọn từng người ở đây
                        sx={{ maxWidth: 260, flexShrink: 0, ...chipSx }}
                      />
                    );
                  })
                )}
              </Stack>
            </Box>

            {selected.length > 0 && (
              <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={() => emit([])}
                startIcon={<ClearIcon fontSize="small" />}
                sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
              >
                Xóa
              </Button>
            )}
          </Stack>
        </Box>

        <Divider />

        {/* ===== Search ===== */}
        <Box sx={{ p: 1 }}>
          <TextField
            size="small"
            fullWidth
            label="Tìm theo tên tài khoản"
            value={usernameText}
            onChange={(e) => setUsernameText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchClick();
              }
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Tìm kiếm trong đơn vị đang chọn">
                      <IconButton size="small" onClick={handleSearchClick}>
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Tìm kiếm nhanh theo tên tài khoản">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => void handleLookup()}
                        sx={{ ml: 0.5, minWidth: 86, whiteSpace: "nowrap" }}
                      >
                        Tìm nhanh
                      </Button>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <Divider />

        {/* ===== Body: 2 cột, mỗi cột scroll riêng ===== */}
        <Stack direction="row" spacing={1} sx={{ flex: 1, minHeight: 0, p: 1 }}>
          {/* LEFT: Unit tree */}
          <Box
            sx={{
              width: 350,
              borderRight: (t) => `1px solid ${t.palette.divider}`,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 0.5 }}>
              {rootQ.isFetching && rootUnits.length === 0 ? (
                <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "center" }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Đang tải…
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {rootUnits.map((u) => (
                    <UnitNode
                      key={u.id}
                      unit={u}
                      level={0}
                      open={open}
                      expanded={expandedSet.has(u.id)}
                      onToggleExpand={toggleExpand}
                      activeUnitId={activeUnitId}
                      onSelectUnit={handleSelectUnit}
                      unitMapRef={unitMapRef}
                      expandedSet={expandedSet}
                    />
                  ))}
                  {rootUnits.length === 0 && (
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" sx={{ opacity: 0.7 }}>
                        Không có dữ liệu
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Box>

          {/* RIGHT: Users */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {!activeUnitId ? (
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Chọn một đơn vị trong cây bên trái để xem user.
                  </Typography>
                </Box>
              ) : loadingUsers ? (
                <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "center" }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Đang tải…
                  </Typography>
                </Box>
              ) : (
                <List dense>
                  {rows.map((u) => {
                    const checked = selectedSet.has(u.id);
                    const sym = unitSymbolByUnitId(u.unitId) || unitSymbolByUnitId(activeUnitId);
                    return (
                      <ListItemButton key={u.id} onClick={() => toggleUser(u.id)}>
                        <Checkbox
                          edge="start"
                          disableRipple
                          icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                          checkedIcon={<CheckBoxIcon fontSize="small" />}
                          checked={checked}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUser(u.id);
                          }}
                          sx={{ mr: 1 }}
                        />
                        <ListItemText
                          primary={`${u.username} — ${u.fullName}`}
                          secondary={sym || ""}
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </ListItemButton>
                    );
                  })}

                  {rows.length === 0 && (
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" sx={{ opacity: 0.7 }}>
                        Không có dữ liệu
                      </Typography>
                    </Box>
                  )}
                </List>
              )}
            </Box>

            <Divider />

            {/* footer fixed */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {totalRows > 0
                  ? `Tổng: ${totalRows} • Trang ${page + 1}/${Math.max(1, Math.ceil(totalRows / pageSize))}`
                  : " "}
              </Typography>

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={page <= 0 || loadingUsers || !activeUnitId}
                  onClick={() => {
                    const next = Math.max(0, page - 1);
                    setPage(next);
                    void fetchUsers({ page: next, username: usernameText.trim() || undefined });
                  }}
                >
                  Trước
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={
                    page >= Math.max(0, Math.ceil(totalRows / pageSize) - 1) || loadingUsers || !activeUnitId
                  }
                  onClick={() => {
                    const maxPage = Math.max(0, Math.ceil(totalRows / pageSize) - 1);
                    const next = Math.min(maxPage, page + 1);
                    setPage(next);
                    void fetchUsers({ page: next, username: usernameText.trim() || undefined });
                  }}
                >
                  Sau
                </Button>

                <Button size="small" variant="outlined" onClick={closePopover}>
                  Đóng
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Popover>
    </>
  );
});