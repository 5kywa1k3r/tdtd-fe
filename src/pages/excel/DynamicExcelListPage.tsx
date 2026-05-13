import { Box, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DynamicExcelListTable } from "../../components/excel/DynamicExcelListTable";
import DynamicExcelFilterBar, {
  type DynamicExcelFilterValue,
} from "../../components/excel/DynamicExcelFilterBar";
import type { SortDirection } from "../../components/common/AppTable";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";

import {
  useDeleteDynamicExcelMutation,
  useSearchDynamicExcelMutation,
} from "../../api/dynamicExcelApi";
import { useWrapDynamicExcelAsFormMutation } from "../../api/dynamicFormApi";
import type {
  DynamicExcelRow,
  DynamicExcelSearchReq,
} from "../../api/dynamicExcelApi";
import { UITextKey, uiText } from '../../constants/uiText';

const defaultFilterValue = (): DynamicExcelFilterValue => ({
  code: "",
  name: "",
  dateRange: {
    from: null,
    to: null,
  },
});

export default function DynamicExcelListPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] =
    useState<DynamicExcelSearchReq["sortField"]>("createdAtUtc");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [filterValue, setFilterValue] = useState<DynamicExcelFilterValue>(defaultFilterValue());
  const [appliedFilterValue, setAppliedFilterValue] =
    useState<DynamicExcelFilterValue>(defaultFilterValue());

  const [search, searchState] = useSearchDynamicExcelMutation();
  const [del] = useDeleteDynamicExcelMutation();
  const [wrapAsForm, wrapState] = useWrapDynamicExcelAsFormMutation();
  const rows = searchState.data?.rows ?? [];
  const total = searchState.data?.totalRows ?? 0;

  const req = useMemo<DynamicExcelSearchReq>(
    () => ({
      code: appliedFilterValue.code.trim() || undefined,
      name: appliedFilterValue.name.trim() || undefined,
      createdFromUtc: appliedFilterValue.dateRange.from
        ? appliedFilterValue.dateRange.from.toISOString()
        : null,
      createdToUtc: appliedFilterValue.dateRange.to
        ? appliedFilterValue.dateRange.to.toISOString()
        : null,
      q: undefined,
      createdBy: undefined,
      labels: null,
      page,
      pageSize,
      sortField: sortField ?? "createdAtUtc",
      sortDirection: sortDirection ?? "desc",
    }),
    [appliedFilterValue, page, pageSize, sortDirection, sortField]
  );

  useEffect(() => {
    search(req);

  }, [req]);

  const doSearch = () => {
    setAppliedFilterValue(filterValue);
    setPage(0);
  };

  const clearFilters = () => {
    const next = defaultFilterValue();
    setFilterValue(next);
    setAppliedFilterValue(next);
    setPage(0);
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DynamicExcelRow | null>(null);
  const [wrapConfirmOpen, setWrapConfirmOpen] = useState(false);
  const [wrapTarget, setWrapTarget] = useState<DynamicExcelRow | null>(null);

  const openCreate = () => navigate("/dynamic-excel/create");
  const openView = (row: DynamicExcelRow) => navigate(`/dynamic-excel/${row.id}`);
  const openEdit = (row: DynamicExcelRow) => navigate(`/dynamic-excel/${row.id}/edit`);
  const askDelete = (row: DynamicExcelRow) => {
    setDeleteTarget(row);
    setConfirmOpen(true);
  };
  const askWrapAsForm = (row: DynamicExcelRow) => {
    setWrapTarget(row);
    setWrapConfirmOpen(true);
  };

  return (
    <Box sx={{ p: 2 }}>
      <DynamicExcelFilterBar
        value={filterValue}
        onChange={setFilterValue}
        onSearch={doSearch}
        onReset={clearFilters}
        onCreate={openCreate}
      />

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
        onWrapAsForm={askWrapAsForm as any}
        onDelete={askDelete as any}
      />

      <ConfirmDialog
        open={wrapConfirmOpen}
        title={uiText(UITextKey.TextTaoDynamicForm)}
        message={
          <Typography variant="body2">
            Tạo hoặc mở biểu mẫu động chứa bảng <b>{wrapTarget?.code}</b>.
          </Typography>
        }
        confirmText="Tạo biểu mẫu"
        cancelText="Hủy"
        variant="info"
        confirmLoading={wrapState.isLoading}
        onConfirm={async () => {
          if (!wrapTarget) return;
          const form = await wrapAsForm({ dynamicExcelTemplateId: wrapTarget.id }).unwrap();
          setWrapConfirmOpen(false);
          setWrapTarget(null);
          navigate(`/dynamic-forms/${form.id}`);
        }}
        onClose={() => {
          if (wrapState.isLoading) return;
          setWrapConfirmOpen(false);
          setWrapTarget(null);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={uiText(UITextKey.TextXoaBangBieu)}
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
