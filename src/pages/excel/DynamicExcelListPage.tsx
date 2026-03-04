import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DynamicExcelListTable } from "../../components/excel/DynamicExcelListTable";
import type { SortDirection } from "../../components/common/AppTable";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";

import {
  useDeleteDynamicExcelMutation,
  useSearchDynamicExcelMutation,
} from "../../api/dynamicExcelApi";
import type {
  DynamicExcelRow,
  DynamicExcelSearchReq,
} from "../../api/dynamicExcelApi";

// ✅ dùng Mantine date range (hiển thị DD/MM/YYYY, to=endOf(day))
import {
  MantineDateRangeFilter,
  type DateRangeFilterValue,
} from "../../components/common/MantineDateRangeFilter";

export default function DynamicExcelListPage() {
  const navigate = useNavigate();

  // server state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] =
    useState<DynamicExcelSearchReq["sortField"]>("createdAtUtc");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // ===== DRAFT (đang gõ) =====
  const [codeDraft, setCodeDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [dateDraft, setDateDraft] = useState<DateRangeFilterValue>({
    from: null,
    to: null,
  });

  // ===== APPLIED (đã bấm search) =====
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [dateApplied, setDateApplied] = useState<DateRangeFilterValue>({
    from: null,
    to: null,
  });

  const [search, searchState] = useSearchDynamicExcelMutation();
  const [del] = useDeleteDynamicExcelMutation();
  const rows = searchState.data?.items ?? [];
  const total = searchState.data?.total ?? 0;

  const req = useMemo<DynamicExcelSearchReq>(
    () => ({
      code: code.trim() || undefined,
      name: name.trim() || undefined,

      // ✅ inclusive: from=startOf(day), to=endOf(day) đã được MantineDateRangeFilter đảm bảo
      createdFromUtc: dateApplied.from ? dateApplied.from.toISOString() : null,
      createdToUtc: dateApplied.to ? dateApplied.to.toISOString() : null,

      q: undefined,
      createdBy: undefined,
      labels: null,

      page,
      pageSize,
      sortField: sortField ?? "createdAtUtc",
      sortDirection: sortDirection ?? "desc",
    }),
    [code, name, dateApplied.from, dateApplied.to, page, pageSize, sortField, sortDirection]
  );

  // ✅ chỉ search khi req đổi
  useEffect(() => {
    search(req);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  const doSearch = () => {
    setCode(codeDraft);
    setName(nameDraft);
    setDateApplied(dateDraft);
    setPage(0);
  };

  const clearFilters = () => {
    setCodeDraft("");
    setNameDraft("");
    setDateDraft({ from: null, to: null });

    setCode("");
    setName("");
    setDateApplied({ from: null, to: null });

    setPage(0);
  };

  const onEnterSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch();
  };

  // delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DynamicExcelRow | null>(null);

  const openCreate = () => navigate("/dynamic-excel/create");
  const openView = (row: DynamicExcelRow) => navigate(`/dynamic-excel/${row.id}`);
  const openEdit = (row: DynamicExcelRow) => navigate(`/dynamic-excel/${row.id}/edit`);
  const askDelete = (row: DynamicExcelRow) => {
    setDeleteTarget(row);
    setConfirmOpen(true);
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Search bar */}
      <Stack
        direction="row"
        spacing={1}
        mb={2}
        flexWrap="wrap"
        useFlexGap
        alignItems="center"
      >
        <TextField
          size="small"
          label="Mã"
          value={codeDraft}
          onChange={(e) => setCodeDraft(e.target.value)}
          onKeyDown={onEnterSearch}
          sx={{ minWidth: 180, flex: "1 1 200px" }}
        />

        <TextField
          size="small"
          label="Tên"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={onEnterSearch}
          sx={{ minWidth: 220, flex: "1 1 260px" }}
        />

        {/* ✅ 1 ô chọn khoảng ngày (dd/MM/yyyy) */}
        <Box sx={{ minWidth: 320, flex: "1 1 360px" }}>
          <MantineDateRangeFilter
            value={dateDraft}
            onChange={(v) => setDateDraft(v)}
            placeholder="Chọn khoảng ngày"
          />
        </Box>

        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={doSearch}
          sx={{ height: 40, flexShrink: 0, px: 2, whiteSpace: "nowrap" }}
        >
          Tìm kiếm
        </Button>

        <Button
          variant="outlined"
          startIcon={<ClearIcon />}
          onClick={clearFilters}
          sx={{ height: 40, flexShrink: 0, px: 2, whiteSpace: "nowrap" }}
        >
          Xóa lọc
        </Button>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ height: 40, flexShrink: 0, whiteSpace: "nowrap" }}
        >
          Tạo mới
        </Button>
      </Stack>

      <DynamicExcelListTable
        rows={rows as any}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
        sortField={sortField ?? "createdAtUtc"}
        sortDirection={sortDirection}
        onSortChange={(field, dir) => {
          setSortField(field as any);
          setSortDirection(dir);
          setPage(0);
        }}
        onRowDoubleClick={openView as any}
        onView={openView as any}
        onEdit={openEdit as any}
        onDelete={askDelete as any}
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
              Xóa mềm (soft delete).
            </Typography>
          </>
        }
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await del({ id: deleteTarget.id }).unwrap();
          setConfirmOpen(false);
          setDeleteTarget(null);
          search(req);
        }}
        onClose={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </Box>
  );
}