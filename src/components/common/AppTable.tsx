import './AppTable.css';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableSortLabel,
  Checkbox,
  TablePagination,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc';
export type SelectScope = 'page' | 'all';

/**
 * - field: key của row hoặc string custom (dùng cho sort/server sort)
 * - render: custom cell
 * - getSortValue: giá trị sort client (string/number/Date). Nên trả ISO hoặc Date nếu là ngày.
 */
export interface AppTableColumn<T> {
  field: keyof T | string;
  header: string;
  width?: string | number;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  getSortValue?: (row: T) => string | number | Date;
}

export interface AppTableProps<T, F extends string = string> {
  rows: T[];
  columns: AppTableColumn<T>[];
  rowKey: (row: T) => string;

  // selection
  selectable?: boolean;
  selectionMode?: 'single' | 'multiple';
  /**
   * page: tick header chỉ chọn trong trang hiện tại (pagedRows)
   * all:  tick header chọn allRowIds (sortedRows) — chỉ thật sự hợp lý cho client pagination
   */
  selectScope?: SelectScope;

  selectedRowIds?: string[]; // controlled
  onSelectedRowIdsChange?: (ids: string[]) => void;

  // sort
  sortMode?: 'client' | 'server';

  // client-mode: sort ban đầu
  initialSortField?: F;
  initialSortDirection?: SortDirection;

  // server-mode: controlled từ bên ngoài
  sortField?: F;
  sortDirection?: SortDirection;
  onSortChange?: (field: F, direction: SortDirection) => void;

  // pagination
  enablePagination?: boolean;

  // client-mode: page/pageSize ban đầu
  initialPage?: number;
  initialPageSize?: number;
  rowsPerPageOptions?: number[];

  // server-mode: controlled
  paginationMode?: 'client' | 'server';
  page?: number;
  pageSize?: number;
  totalRows?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;

  // events
  onRowDoubleClick?: (row: T) => void;
}

function assertServerPaginationProps<T, F extends string>(props: AppTableProps<T, F>) {
  if (props.paginationMode !== 'server') return;
  // server-mode nên truyền đủ để tránh UI tự “đoán”
  if (props.page == null || props.pageSize == null || props.totalRows == null) {
    // eslint-disable-next-line no-console
    console.warn(
      '[AppTable] paginationMode="server" requires page, pageSize, totalRows to be provided.',
    );
  }
}

function assertServerSortProps<T, F extends string>(props: AppTableProps<T, F>) {
  if (props.sortMode !== 'server') return;
  if (props.sortField == null || props.sortDirection == null) {
    // eslint-disable-next-line no-console
    console.warn(
      '[AppTable] sortMode="server" requires sortField and sortDirection to be provided.',
    );
  }
}

export function AppTable<T, F extends string = string>(props: AppTableProps<T, F>) {
  const {
    rows,
    columns,
    rowKey,

    // selection
    selectable = false,
    selectionMode = 'multiple',
    selectScope = 'page',
    selectedRowIds,
    onSelectedRowIdsChange,

    // sort
    sortMode = 'client',
    initialSortField,
    initialSortDirection = 'asc',
    sortField,
    sortDirection,
    onSortChange,

    // pagination
    enablePagination = true,
    initialPage = 0,
    initialPageSize = 10,
    rowsPerPageOptions = [10, 25, 50],
    paginationMode = 'client',
    page,
    pageSize,
    totalRows,
    onPageChange,
    onPageSizeChange,

    // events
    onRowDoubleClick,
  } = props;

  assertServerPaginationProps(props);
  assertServerSortProps(props);

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // ================== SELECTION STATE ==================
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const effectiveSelectedIds = selectedRowIds ?? internalSelectedIds;

  const setSelected = (ids: string[]) => {
    onSelectedRowIdsChange?.(ids);
    if (!selectedRowIds) setInternalSelectedIds(ids);
  };

  // ================== SORT STATE ==================
  const [internalSortField, setInternalSortField] = useState<F | undefined>(initialSortField);
  const [internalSortDirection, setInternalSortDirection] =
    useState<SortDirection>(initialSortDirection);

  const effectiveSortField: F | undefined = sortMode === 'server' ? sortField : internalSortField;

  const effectiveSortDirection: SortDirection =
    sortMode === 'server'
      ? (sortDirection ?? 'asc')
      : internalSortDirection;

  const handleSortClick = (field: F) => {
    const currentField = effectiveSortField;
    const currentDirection = effectiveSortDirection ?? 'asc';

    let direction: SortDirection = 'asc';
    if (currentField === field && currentDirection === 'asc') direction = 'desc';

    if (sortMode === 'client') {
      setInternalSortField(field);
      setInternalSortDirection(direction);
    }

    onSortChange?.(field, direction);
  };

  // ================== SORTED ROWS (CLIENT) ==================
  const sortedRows = useMemo(() => {
    if (sortMode === 'server' || !effectiveSortField) return rows;

    const col = columns.find((c) => String(c.field) === String(effectiveSortField));
    if (!col) return rows;

    const getVal = (row: T) => {
      if (col.getSortValue) return col.getSortValue(row);
      return (row as any)[col.field as any];
    };

    const copied = [...rows];
    copied.sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);

      if (va == null && vb == null) return 0;
      if (va == null) return -1;
      if (vb == null) return 1;

      // Chuẩn hoá Date về number để tránh so sánh lắt nhắt
      const na = va instanceof Date ? va.getTime() : (va as any);
      const nb = vb instanceof Date ? vb.getTime() : (vb as any);

      if (na < nb) return effectiveSortDirection === 'asc' ? -1 : 1;
      if (na > nb) return effectiveSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return copied;
  }, [rows, columns, effectiveSortField, effectiveSortDirection, sortMode]);

  // ================== PAGINATION STATE ==================
  const [internalPage, setInternalPage] = useState(initialPage);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);

  const effectivePage =
    paginationMode === 'server'
      ? (page ?? 0)
      : internalPage;

  /**
   * PATCH: server-mode không còn lấy internalPageSize để “đoán”.
   * - Nếu không truyền pageSize: fallback initialPageSize (ổn định, không phụ thuộc state runtime)
   */
  const effectivePageSize =
    paginationMode === 'server'
      ? (pageSize ?? initialPageSize)
      : internalPageSize;

  const pagedRows = useMemo(() => {
    if (!enablePagination) return sortedRows;

    // server-mode: rows đã là dữ liệu đúng trang
    if (paginationMode === 'server') return sortedRows;

    const start = effectivePage * effectivePageSize;
    return sortedRows.slice(start, start + effectivePageSize);
  }, [sortedRows, enablePagination, paginationMode, effectivePage, effectivePageSize]);

  const handleChangePage = (_: unknown, newPage: number) => {
    if (paginationMode === 'server') {
      onPageChange?.(newPage);
      return;
    }
    setInternalPage(newPage);
    onPageChange?.(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(event.target.value, 10);

    if (paginationMode === 'server') {
      onPageSizeChange?.(newSize);
      onPageChange?.(0);
      return;
    }

    setInternalPageSize(newSize);
    setInternalPage(0);
    onPageSizeChange?.(newSize);
    onPageChange?.(0);
  };

  // ================== SELECTION HELPERS ==================
  const allRowIds = useMemo(() => sortedRows.map((r) => rowKey(r)), [sortedRows, rowKey]);
  const pageRowIds = useMemo(() => pagedRows.map((r) => rowKey(r)), [pagedRows, rowKey]);

  /**
   * PATCH: default selectScope='page' để tránh “tick một phát chọn cả dataset”
   * - Nếu selectScope='all': chỉ hợp lý khi client pagination + client rows full dataset
   */
  const scopeIds = selectScope === 'all' ? allRowIds : pageRowIds;

  const isAllSelected =
    selectable &&
    selectionMode === 'multiple' &&
    scopeIds.length > 0 &&
    scopeIds.every((id) => effectiveSelectedIds.includes(id));

  const isIndeterminate =
    selectable &&
    selectionMode === 'multiple' &&
    scopeIds.length > 0 &&
    scopeIds.some((id) => effectiveSelectedIds.includes(id)) &&
    !isAllSelected;

  const handleToggleAll = () => {
    if (!selectable || selectionMode !== 'multiple') return;

    if (isAllSelected) {
      // bỏ chọn trong scope
      const remaining = effectiveSelectedIds.filter((id) => !scopeIds.includes(id));
      setSelected(remaining);
    } else {
      // chọn thêm tất cả trong scope (không xoá cái đã chọn trước đó ngoài scope)
      const merged = Array.from(new Set([...effectiveSelectedIds, ...scopeIds]));
      setSelected(merged);
    }
  };

  const handleToggleOne = (id: string) => {
    if (!selectable) return;

    if (selectionMode === 'single') {
      setSelected([id]);
      return;
    }

    if (effectiveSelectedIds.includes(id)) {
      setSelected(effectiveSelectedIds.filter((x) => x !== id));
    } else {
      setSelected([...effectiveSelectedIds, id]);
    }
  };

  // ================== THEME → CSS VARIABLES ==================
  const wrapperStyle: React.CSSProperties = {
    // @ts-ignore – dùng CSS variables
    '--app-table-bg': theme.palette.background.paper,

    '--app-table-border-color': isDark
      ? alpha(theme.palette.primary.light, 0.8)
      : alpha(theme.palette.primary.main, 0.8),

    '--app-table-header-bg': isDark
      ? alpha(theme.palette.primary.light, 1)
      : alpha(theme.palette.primary.main, 1),

    '--app-table-header-text': theme.palette.primary.contrastText,

    '--app-table-body-border': isDark
      ? alpha(theme.palette.primary.light, 0.5)
      : alpha(theme.palette.primary.main, 0.16),

    '--app-table-row-alt-bg': isDark
      ? alpha(theme.palette.primary.main, 0.24)
      : alpha(theme.palette.primary.main, 0.06),

    '--app-table-row-hover-bg': isDark
      ? alpha(theme.palette.primary.light, 0.35)
      : alpha(theme.palette.primary.main, 0.16),

    '--app-table-action-view-hover-color': theme.palette.primary.main,
    '--app-table-action-edit-hover-color': theme.palette.warning.main,
    '--app-table-action-delete-hover-color': theme.palette.error.main,
  };

  // ================== RENDER ==================
  return (
    <div className="app-table-wrapper" style={wrapperStyle}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {selectable && (
              <TableCell padding="checkbox" className="app-table-selection-cell">
                {selectionMode === 'multiple' && (
                  <Checkbox
                    size="small"
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={handleToggleAll}
                  />
                )}
              </TableCell>
            )}

            {columns.map((col) => {
              const field = String(col.field) as F;
              const active = String(effectiveSortField ?? '') === String(field);

              return (
                <TableCell
                  key={String(col.field)}
                  align={col.align ?? 'left'}
                  sx={{ width: col.width }}
                >
                  {col.sortable ? (
                    <TableSortLabel
                      active={active}
                      direction={active ? effectiveSortDirection : 'asc'}
                      onClick={() => handleSortClick(field)}
                      sx={{
                        '&, &.Mui-active': {
                          color: 'inherit',
                          opacity: 1,
                          transform: 'scale(1)',
                          transition: 'transform 120ms ease-out',
                        },
                        '&:hover': {
                          color: 'inherit',
                          opacity: 1,
                          transform: 'scale(1.06)',
                        },
                        '& .MuiTableSortLabel-icon': {
                          color: 'inherit !important',
                          opacity: 0.9,
                        },
                        '&:hover .MuiTableSortLabel-icon': {
                          opacity: 1,
                        },
                      }}
                    >
                      {col.header}
                    </TableSortLabel>
                  ) : (
                    col.header
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>

        <TableBody>
          {pagedRows.map((row) => {
            const id = rowKey(row);
            const isSelected = effectiveSelectedIds.includes(id);

            return (
              <TableRow
                key={id}
                hover
                selected={isSelected}
                onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
                className={
                  'app-table-row' + (onRowDoubleClick ? ' app-table-row--clickable' : '')
                }
              >
                {selectable && (
                  <TableCell padding="checkbox" className="app-table-selection-cell">
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onChange={() => handleToggleOne(id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}

                {columns.map((col, idx) => (
                  <TableCell key={`${String(col.field)}:${idx}`} align={col.align ?? 'left'}>
                    {col.render ? col.render(row) : (row as any)[col.field as any]}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {enablePagination && (
        <TablePagination
          component="div"
          count={
            paginationMode === 'server'
              ? (totalRows ?? 0)
              : sortedRows.length
          }
          page={effectivePage}
          rowsPerPage={effectivePageSize}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
        />
      )}
    </div>
  );
}