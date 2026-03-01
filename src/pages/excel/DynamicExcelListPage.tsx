import { Box, Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DynamicExcelListTable } from "../../components/excel/DynamicExcelListTable";
import type { SortDirection } from "../../components/common/AppTable";

import { type DynamicExcelItem, MOCK_DYNAMIC_EXCEL_LIST } from "../../data/mockDataTable";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";

export default function DynamicExcelListPage() {
  const navigate = useNavigate();

  // mock server-state
  const [allRows, setAllRows] = useState<DynamicExcelItem[]>(MOCK_DYNAMIC_EXCEL_LIST);

  // server pagination/sort (mock)
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sorted = useMemo(() => {
    const copied = [...allRows];
    copied.sort((a: any, b: any) => {
      const va = a[sortField];
      const vb = b[sortField];

      if (va == null && vb == null) return 0;
      if (va == null) return -1;
      if (vb == null) return 1;

      if (va < vb) return sortDirection === "asc" ? -1 : 1;
      if (va > vb) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return copied;
  }, [allRows, sortField, sortDirection]);

  const paged = useMemo(() => {
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  // delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DynamicExcelItem | null>(null);

  const openCreate = () => {
    navigate("/dynamic-excel/create");
  };

  const openView = (row: DynamicExcelItem) => {
    navigate(`/dynamic-excel/${row.id}`);
  };

  const openEdit = (row: DynamicExcelItem) => {
    navigate(`/dynamic-excel/${row.id}/edit`);
  };

  const askDelete = (row: DynamicExcelItem) => {
    setDeleteTarget(row);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    setAllRows((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    setConfirmOpen(false);
    setDeleteTarget(null);

    // nếu xóa xong mà trang hiện tại vượt quá total -> kéo về trang trước (mock)
    // (optional)
    // setPage((p) => Math.max(0, Math.min(p, Math.floor((prev.length - 2) / pageSize))));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h6">Bảng biểu động</Typography>
          <Typography variant="body2" color="text.secondary">
            Danh sách cấu hình bảng biểu động (mock).
          </Typography>
        </Box>

        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Tạo mới
        </Button>
      </Stack>

      <DynamicExcelListTable
        rows={paged}
        total={allRows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={(field, dir) => {
          setSortField(field);
          setSortDirection(dir);
          setPage(0);
        }}
        onRowDoubleClick={openView}
        onView={openView}
        onEdit={openEdit}
        onDelete={askDelete}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Xóa bảng biểu"
        message={
          <>
            <Typography variant="body2">
              Bạn có chắc muốn xóa bảng <b>{deleteTarget?.code}</b>?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Thao tác này không thể hoàn tác (mock).
            </Typography>
          </>
        }
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </Box>
  );
}
