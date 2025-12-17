// src/components/common/UnitMultiSelect.tsx
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
} from '@mui/material';

import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InputAdornment from '@mui/material/InputAdornment';

import { normalizeVi } from '../../helpers/normalize';
import type { UnitNode, UnitId } from '../../data/unitMock';

const emptyIcon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;
const indeterminateIcon = <IndeterminateCheckBoxIcon fontSize="small" />;

type SpecialId = '__ALL__';

export interface UnitMultiSelectProps {
  options: UnitNode[]; // cây UNIT_TREE
  value: UnitId[]; // list leaf UnitId được chọn
  onChange: (value: UnitId[]) => void;
}

interface FlatInfo {
  id: UnitId;
  name: string;
  parentId?: UnitId;
  childrenIds: UnitId[];
  depth: number;
  isLeaf: boolean;
}

// ===== helper: flatten tree & descendant map =====
function buildFlatInfo(options: UnitNode[]): {
  flatMap: Map<UnitId, FlatInfo>;
  rootIds: UnitId[];
} {
  const flatMap = new Map<UnitId, FlatInfo>();
  const rootIds: UnitId[] = [];

  const walk = (node: UnitNode, parentId: UnitId | undefined, depth: number) => {
    const childrenIds = (node.children ?? []).map((c) => c.id);
    const info: FlatInfo = {
      id: node.id,
      name: node.name,
      parentId,
      childrenIds,
      depth,
      isLeaf: childrenIds.length === 0,
    };
    flatMap.set(node.id, info);
    if (parentId === undefined) {
      rootIds.push(node.id);
    }
    node.children?.forEach((child) => walk(child, node.id, depth + 1));
  };

  options.forEach((root) => walk(root, undefined, 0));
  return { flatMap, rootIds };
}

function buildDescendantMap(nodes: UnitNode[]): Map<UnitId, UnitId[]> {
  const map = new Map<UnitId, UnitId[]>();

  const walk = (node: UnitNode): UnitId[] => {
    if (node.children && node.children.length > 0) {
      const leaves: UnitId[] = [];
      node.children.forEach((c) => {
        leaves.push(...walk(c));
      });
      map.set(node.id, leaves);
      return leaves;
    } else {
      map.set(node.id, [node.id]);
      return [node.id];
    }
  };

  nodes.forEach(walk);
  return map;
}

// ===== helper: dynamic summary using width (≈ 3/4 textbox) =====
function buildDynamicSummary(names: string[], maxWidth: number): string {
  if (names.length === 0) return '';

  if (typeof window === 'undefined') {
    return names.join(', ');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return names.join(', ');

  // gần đúng font mặc định MUI
  ctx.font =
    '14px Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  let result = '';
  let used = 0;

  for (let i = 0; i < names.length; i += 1) {
    const part = i === 0 ? names[i] : `, ${names[i]}`;
    const width = ctx.measureText(part).width;

    if (used + width > maxWidth) {
      if (!result) {
        // đảm bảo luôn có ít nhất 1 mục
        result = part;
      }
      result += ', ...';
      return result;
    }

    result += part;
    used += width;
  }

  return result;
}

export const UnitMultiSelect: React.FC<UnitMultiSelectProps> = ({
  options,
  value,
  onChange,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  // đường path đang "xổ" ra (đa cấp): [id khối, id đội, ...]
  const [activePath, setActivePath] = React.useState<UnitId[]>([]);

  // search theo cấp: index = level (cột)
  const [searchByLevel, setSearchByLevel] = React.useState<string[]>([]);

  // ref dùng để đo width textbox
  const inputBoxRef = React.useRef<HTMLDivElement | null>(null);

  // ===== build flat info & descendant map =====
  const { flatMap, rootIds } = React.useMemo(
    () => buildFlatInfo(options),
    [options]
  );
  const descendantsMap = React.useMemo(
    () => buildDescendantMap(options),
    [options]
  );

  // tất cả leaf (đơn vị cuối)
  const allLeaves = React.useMemo(
    () =>
      Array.from(flatMap.values())
        .filter((n) => n.isLeaf)
        .map((n) => n.id),
    [flatMap]
  );
  const totalLeafCount = allLeaves.length;

  const selectedSet = React.useMemo(
    () => new Set<UnitId>(value),
    [value]
  );

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // ===== toggle logic =====
  const getCheckState = (id: UnitId | SpecialId) => {
    if (id === '__ALL__') {
      const selectedCount = allLeaves.filter((d) =>
        selectedSet.has(d)
      ).length;
      if (selectedCount === 0) return 'unchecked';
      if (selectedCount === allLeaves.length) return 'checked';
      return 'indeterminate';
    }

    const desc = descendantsMap.get(id as UnitId) ?? [id as UnitId];
    const selectedCount = desc.filter((d) => selectedSet.has(d)).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === desc.length) return 'checked';
    return 'indeterminate';
  };

  const applyToggle = (id: UnitId | SpecialId) => {
    const current = new Set<UnitId>(value);

    if (id === '__ALL__') {
      const allSelected = allLeaves.every((d) => current.has(d));
      if (allSelected) {
        allLeaves.forEach((d) => current.delete(d));
      } else {
        allLeaves.forEach((d) => current.add(d));
      }
      onChange(Array.from(current));
      return;
    }

    const desc = descendantsMap.get(id as UnitId) ?? [id as UnitId];
    const allSelected = desc.every((d) => current.has(d));

    if (allSelected) {
      desc.forEach((d) => current.delete(d));
    } else {
      desc.forEach((d) => current.add(d));
    }

    onChange(Array.from(current));
  };

  // ===== compressed names cho summary (đa cấp) =====
  const compressedNames = React.useMemo(() => {
    if (!value || value.length === 0) return [];

    const leafSet = new Set<UnitId>(value);
    const covered = new Set<UnitId>();
    const names: string[] = [];

    // node theo depth tăng dần để ưu tiên node cha
    const nodesInDepthOrder = Array.from(flatMap.values()).sort(
      (a, b) => a.depth - b.depth
    );

    nodesInDepthOrder.forEach((info) => {
      const desc = descendantsMap.get(info.id);
      if (!desc || desc.length === 0) return;

      const allSelected = desc.every((id) => leafSet.has(id));
      if (!allSelected) return;

      const hasUncovered = desc.some((id) => !covered.has(id));
      if (!hasUncovered) return;

      names.push(info.name);
      desc.forEach((id) => covered.add(id));
    });

    // leaf lẻ còn lại
    leafSet.forEach((id) => {
      if (!covered.has(id)) {
        const info = flatMap.get(id);
        if (info) names.push(info.name);
      }
    });

    return names;
  }, [value, flatMap, descendantsMap]);

  // ===== summary label theo width (3/4 textbox) =====
  const summaryLabel = React.useMemo(() => {
    // không chọn gì / chọn hết → ô trống
    if (!value || value.length === 0 || value.length === totalLeafCount) {
      return '';
    }

    const names = compressedNames;
    if (!names || names.length === 0) return '';

    // 1–2 tên: hiện full, không đo width
    if (names.length <= 2) {
      return names.join(', ');
    }

    // >=3 tên: đo theo ~3/4 chiều rộng textbox
    const inputWidth =
      inputBoxRef.current?.getBoundingClientRect().width ?? 240;

    // 3/4 độ rộng textbox, trừ bớt cho padding + icon
    const maxWidth = Math.max(80, (inputWidth * 3) / 4 - 40);

    return buildDynamicSummary(names, maxWidth);
  }, [value, totalLeafCount, compressedNames]);


  const tooltipLabel = React.useMemo(() => {
    if (!value || value.length === 0 || value.length === totalLeafCount) {
      return 'Tất cả đơn vị';
    }
    if (compressedNames.length === 0) return 'Tất cả đơn vị';
    return compressedNames.join(', ');
  }, [value, totalLeafCount, compressedNames]);

  // ===== build các cột (mỗi cấp 1 cột) =====
  interface Column {
    level: number;
    parentId: UnitId | null; // null = root
    nodeIds: (UnitId | SpecialId)[];
  }

  const columns: Column[] = React.useMemo(() => {
    const cols: Column[] = [];

    // cột 0: root + "Tất cả đơn vị"
    cols.push({
      level: 0,
      parentId: null,
      nodeIds: ['__ALL__', ...rootIds],
    });

    // các cột sâu hơn dựa theo activePath
    activePath.forEach((nodeId, idx) => {
      const info = flatMap.get(nodeId);
      if (!info) return;
      if (info.childrenIds.length === 0) return;
      cols.push({
        level: idx + 1,
        parentId: nodeId,
        nodeIds: info.childrenIds,
      });
    });

    return cols;
  }, [rootIds, flatMap, activePath]);

  // ===== search theo level =====
  const handleSearchChange = (level: number, text: string) => {
    setSearchByLevel((prev) => {
      const next = [...prev];
      next[level] = text;
      return next;
    });
  };

  const handleOpenChildColumn = (level: number, nodeId: UnitId) => {
    // level = index của CỘT hiện tại (0 = root, 1 = con của root, ...)
    setActivePath((prev) => {
      const next = prev.slice(0, level); // giữ các cấp trước cột này
      next[level] = nodeId;              // set node được “mở” ở cấp tiếp theo
      return next;
    });
  };

  const handleCloseFromLevel = (level: number) => {
    // level = chỉ số cột (1 = cột con đầu tiên của root)
    if (level <= 0) {
      setActivePath([]);
    } else {
      setActivePath((prev) => prev.slice(0, level - 1));
    }
  };

  // ===== render =====
  return (
    <>
      <Tooltip title={tooltipLabel} arrow>
        <Box sx={{ width: '100%' }} ref={inputBoxRef}>
          <TextField
            size="small"
            fullWidth
            label="Đơn vị"
            placeholder=""          // không placeholder xám
            value={summaryLabel}    // hiển thị trực tiếp ở input
            onClick={handleOpen}
            slotProps={{
              input: {
                readOnly: true,
                sx: { cursor: 'pointer' },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Trạng thái ô: trống = chưa chọn • gạch = chọn một phần • tích = chọn hết">
                      <IconButton
                        size="small"
                        tabIndex={-1}
                        sx={{ color: 'text.disabled', mr: 0.5 }}
                      >
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
        {columns.map((col, colIndex) => {
          const level = col.level;
          const searchValue = searchByLevel[level] ?? '';

          const filteredNodeIds = col.nodeIds.filter((id) => {
            if (id === '__ALL__') return true; // luôn hiển thị
            const info = flatMap.get(id as UnitId);
            if (!info) return false;
            return normalizeVi(info.name).includes(normalizeVi(searchValue));
          });

          const isRoot = level === 0;
          // parent của cột hiện tại (dùng cho title & nút back)
          const parentInfo =
            col.parentId ? flatMap.get(col.parentId) : undefined;

          return (
            <Box
              key={level}
              sx={{
                width: 260,
                borderRight:
                  colIndex < columns.length - 1
                    ? (theme) => `1px solid ${theme.palette.divider}`
                    : 'none',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* header mỗi cấp: search riêng + back (từ cấp > 0) */}
              <Box
                sx={{
                  p: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                {!isRoot && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mr: 1 }}>
                      {parentInfo?.name ?? ''}
                    </Typography>
                    <Tooltip title="Thu gọn cấp này">
                      <IconButton
                        size="small"
                        onClick={() => handleCloseFromLevel(level)}
                      >
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}

                <TextField
                  size="small"
                  placeholder={isRoot ? 'Tìm đơn vị / khối...' : 'Tìm đơn vị con...'}
                  fullWidth
                  value={searchValue}
                  onChange={(e) =>
                    handleSearchChange(level, e.target.value)
                  }
                />
              </Box>

              <Divider />

              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                <List dense>
                  {filteredNodeIds.map((id) => {
                    if (id === '__ALL__') {
                      return (
                        <ListItemButton
                          key={id}
                          selected={activePath.length === 0}
                          onClick={() => {
                            setActivePath([]);
                          }}
                        >
                          <Checkbox
                            edge="start"
                            disableRipple
                            icon={emptyIcon}
                            checkedIcon={checkedIcon}
                            indeterminateIcon={indeterminateIcon}
                            indeterminate={
                              getCheckState('__ALL__') === 'indeterminate'
                            }
                            checked={
                              getCheckState('__ALL__') === 'checked'
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              applyToggle('__ALL__');
                            }}
                            sx={{ mr: 1 }}
                          />
                          <ListItemText primary="Tất cả đơn vị" />
                        </ListItemButton>
                      );
                    }

                    const info = flatMap.get(id as UnitId);
                    if (!info) return null;

                    const state = getCheckState(id as UnitId);
                    const checked = state === 'checked';
                    const indeterminate = state === 'indeterminate';
                    const hasChildren = info.childrenIds.length > 0;

                    const isActiveOnThisLevel = level >= 1 && activePath[level] === info.id;

                    return (
                      <ListItemButton
                        key={id}
                        selected={isActiveOnThisLevel}
                        onClick={() => {
                          // toggle chính node
                          applyToggle(id as UnitId);
                        }}
                      >
                        <Checkbox
                          edge="start"
                          disableRipple
                          icon={emptyIcon}
                          checkedIcon={checkedIcon}
                          indeterminateIcon={indeterminateIcon}
                          indeterminate={indeterminate}
                          checked={checked}
                          onClick={(e) => {
                            e.stopPropagation();
                            applyToggle(id as UnitId);
                          }}
                          sx={{ mr: 1 }}
                        />
                        <ListItemText primary={info.name} />
                        {hasChildren && (
                          <Tooltip title="Xem đơn vị con">
                            <IconButton
                              size="small"
                              edge="end"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenChildColumn(level, info.id);
                              }}
                            >
                              <ChevronRightIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </ListItemButton>
                    );
                  })}
                </List>
              </Box>
            </Box>
          );
        })}
      </Popover>
    </>
  );
};
