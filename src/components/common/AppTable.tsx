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

export interface AppTableColumn<T> {
  field: keyof T | string;
  header: string;
  width?: string | number;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  /** Nếu cần custom cell */
  render?: (row: T) => ReactNode;
  /** Giá trị dùng để sort (nếu cần khác field hiển thị) */
  getSortValue?: (row: T) => string | number | Date;
}

interface AppTableProps<T> {
  rows: T[];
  columns: AppTableColumn<T>[];
  rowKey: (row: T) => string;

  // selection
  selectable?: boolean;
  selectionMode?: 'single' | 'multiple';
  selectedRowIds?: string[]; // nếu muốn control
  onSelectedRowIdsChange?: (ids: string[]) => void;

  // sort
  /** 'client' = sort trong AppTable, 'server' = chỉ phát sự kiện ra ngoài */
  sortMode?: 'client' | 'server';
  /** client-mode: sort ban đầu */
  initialSortField?: string;
  initialSortDirection?: SortDirection;
  /** server-mode: sort control từ bên ngoài */
  sortField?: string;
  sortDirection?: SortDirection;
  onSortChange?: (field: string, direction: SortDirection) => void;

  // pagination
  enablePagination?: boolean;

  /** client-mode: page/pageSize ban đầu */
  initialPage?: number;
  initialPageSize?: number;
  rowsPerPageOptions?: number[];

  /** server-mode: control từ bên ngoài */
  paginationMode?: 'client' | 'server';
  page?: number;
  pageSize?: number;
  totalRows?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;

  // events
  onRowDoubleClick?: (row: T) => void;
}

export function AppTable<T>({
  rows,
  columns,
  rowKey,
  // selection
  selectable = false,
  selectionMode = 'multiple',
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
}: AppTableProps<T>) {
  const theme = useTheme();

  // ================== SELECTION STATE ==================
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const effectiveSelectedIds = selectedRowIds ?? internalSelectedIds;

  const setSelected = (ids: string[]) => {
    if (onSelectedRowIdsChange) onSelectedRowIdsChange(ids);
    if (!selectedRowIds) setInternalSelectedIds(ids);
  };

  // ================== SORT STATE ==================
  const [internalSortField, setInternalSortField] = useState<string | undefined>(
    initialSortField,
  );
  const [internalSortDirection, setInternalSortDirection] =
    useState<SortDirection>(initialSortDirection);

  const effectiveSortField = sortMode === 'server' ? sortField : internalSortField;
  const effectiveSortDirection: SortDirection =
    sortMode === 'server'
      ? sortDirection ?? 'asc'
      : internalSortDirection;

  const handleSortClick = (field: string) => {
    const currentField = effectiveSortField;
    const currentDirection = effectiveSortDirection ?? 'asc';

    let direction: SortDirection = 'asc';
    if (currentField === field && currentDirection === 'asc') {
      direction = 'desc';
    }

    if (sortMode === 'client') {
      setInternalSortField(field);
      setInternalSortDirection(direction);
    }

    onSortChange && onSortChange(field, direction);
  };

  // ================== SORT (CLIENT / SERVER) ==================
  const sortedRows = useMemo(() => {
    // server-mode: không sort trong bảng
    if (sortMode === 'server' || !effectiveSortField) return rows;

    const col = columns.find((c) => String(c.field) === effectiveSortField);
    if (!col) return rows;

    const getVal = (row: T) => {
      if (col.getSortValue) return col.getSortValue(row);
      return (row as any)[col.field];
    };

    const copied = [...rows];
    copied.sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);

      if (va == null && vb == null) return 0;
      if (va == null) return -1;
      if (vb == null) return 1;

      if (va < vb) return effectiveSortDirection === 'asc' ? -1 : 1;
      if (va > vb) return effectiveSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copied;
  }, [rows, columns, effectiveSortField, effectiveSortDirection, sortMode]);

  // ================== PAGINATION STATE ==================
  const [internalPage, setInternalPage] = useState(initialPage);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);

  const effectivePage =
    paginationMode === 'server'
      ? page ?? 0
      : internalPage;

  const effectivePageSize =
    paginationMode === 'server'
      ? pageSize ?? internalPageSize
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
      onPageChange && onPageChange(newPage);
    } else {
      setInternalPage(newPage);
      onPageChange && onPageChange(newPage);
    }
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newSize = parseInt(event.target.value, 10);

    if (paginationMode === 'server') {
      onPageSizeChange && onPageSizeChange(newSize);
      onPageChange && onPageChange(0);
    } else {
      setInternalPageSize(newSize);
      setInternalPage(0);
      onPageSizeChange && onPageSizeChange(newSize);
    }
  };

  // ================== SELECTION HELPERS ==================
  const allRowIds = sortedRows.map((r) => rowKey(r));
  const isAllSelected =
    selectable &&
    selectionMode === 'multiple' &&
    allRowIds.length > 0 &&
    allRowIds.every((id) => effectiveSelectedIds.includes(id));

  const handleToggleAll = () => {
    if (!selectable || selectionMode !== 'multiple') return;
    if (isAllSelected) {
      setSelected([]);
    } else {
      setSelected(allRowIds);
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
  const isDark = theme.palette.mode === 'dark';

  const wrapperStyle: React.CSSProperties = {
    // @ts-ignore – dùng CSS variables
    '--app-table-bg': theme.palette.background.paper,

    // Viền ngoài của bảng
    '--app-table-border-color': isDark
      ? alpha(theme.palette.primary.light, 0.8)
      : alpha(theme.palette.primary.main, 0.8),

    // Header: gradient theo primary (gần giống thanh trên cùng)
    '--app-table-header-bg': isDark
      ? alpha(theme.palette.primary.light, 1)
      : alpha(theme.palette.primary.main, 1),

    // Chữ header: luôn là contrastText để rõ
    '--app-table-header-text': theme.palette.primary.contrastText,

    // Viền body
    '--app-table-body-border': isDark
      ? alpha(theme.palette.primary.light, 0.5)
      : alpha(theme.palette.primary.main, 0.16),

    // Nền so le + hover
    '--app-table-row-alt-bg': isDark
      ? alpha(theme.palette.primary.main, 0.24)
      : alpha(theme.palette.primary.main, 0.06),

    '--app-table-row-hover-bg': isDark
      ? alpha(theme.palette.primary.light, 0.35)
      : alpha(theme.palette.primary.main, 0.16),

    // Màu action
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
                    indeterminate={
                      effectiveSelectedIds.length > 0 && !isAllSelected
                    }
                    checked={isAllSelected}
                    onChange={handleToggleAll}
                  />
                )}
              </TableCell>
            )}

            {columns.map((col) => {
              const field = String(col.field);
              const active = effectiveSortField === field;

              return (
                <TableCell
                  key={field}
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
                          transform: 'scale(1)',          // bình thường
                          transition: 'transform 120ms ease-out',
                        },
                        '&:hover': {
                          color: 'inherit',
                          opacity: 1,
                          transform: 'scale(1.06)',       // ↑ tăng cỡ chữ 15%
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
                onDoubleClick={
                  onRowDoubleClick ? () => onRowDoubleClick(row) : undefined
                }
                className={
                  'app-table-row' +
                  (onRowDoubleClick ? ' app-table-row--clickable' : '')
                }
              >
                {selectable && (
                  <TableCell
                    padding="checkbox"
                    className="app-table-selection-cell"
                  >
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onChange={() => handleToggleOne(id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}

                {columns.map((col) => (
                  <TableCell
                    key={String(col.field)}
                    align={col.align ?? 'left'}
                  >
                    {col.render ? col.render(row) : (row as any)[col.field]}
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
          count={paginationMode === 'server' && totalRows != null ? totalRows : sortedRows.length}
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
