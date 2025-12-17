// src/components/common/CommonTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

export type ColumnAlign = "left" | "right" | "center" | "justify" | "inherit";

export interface CommonTableColumn<T> {
  /** Key để lấy dữ liệu từ row nếu không dùng render */
  key: string;
  /** Tiêu đề cột */
  header: string;
  /** Căn lề */
  align?: ColumnAlign;
  /** Độ rộng (tùy chọn) */
  width?: number | string;
  /** Hàm render tuỳ biến, nếu cần */
  render?: (row: T, index: number) => ReactNode;
}

export interface CommonTableProps<T> {
  columns: CommonTableColumn<T>[];
  rows: T[];
  getRowId: (row: T, index: number) => string | number;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
}

/**
 * Bảng dùng chung:
 *  - Nhận columns (cấu hình cột)
 *  - Nhận rows (dữ liệu)
 *  - Hỗ trợ click vào cả dòng
 */
export function CommonTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  emptyMessage = "Không có dữ liệu.",
}: CommonTableProps<T>) {
  const hasRows = rows && rows.length > 0;

  return (
    <TableContainer
      component={Paper}
      elevation={0}
        sx={{
          boxShadow: 'none',
          border: 'none',
          background: 'transparent',
        }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                align={col.align}
                sx={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {!hasRows ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => (
              <TableRow
                key={getRowId(row, rowIndex)}
                hover
                sx={onRowClick ? { cursor: "pointer" } : undefined}
                onClick={
                  onRowClick
                    ? () => {
                        onRowClick(row, rowIndex);
                      }
                    : undefined
                }
              >
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align}>
                    {col.render
                      ? col.render(row, rowIndex)
                      : (row as any)[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default CommonTable;
