import { Box, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { SortDirection } from "../../components/common/AppTable";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import {
  useCloneDynamicFormMutation,
  useDeleteDynamicFormMutation,
  usePublishDynamicFormMutation,
  useSearchDynamicFormsMutation,
} from "../../api/dynamicFormApi";
import type { DynamicFormRow, DynamicFormSearchReq } from "../../api/dynamicFormApi";
import DynamicFormFilterBar, {
  type DynamicFormFilterValue,
} from "../../features/dynamicForms/components/DynamicFormFilterBar";
import { DynamicFormListTable } from "../../features/dynamicForms/components/DynamicFormListTable";

const defaultFilterValue = (): DynamicFormFilterValue => ({
  code: "",
  name: "",
  status: "ALL",
  active: "ALL",
  dateRange: {
    from: null,
    to: null,
  },
});

export default function DynamicFormListPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] =
    useState<DynamicFormSearchReq["sortField"]>("createdAtUtc");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [filterValue, setFilterValue] = useState<DynamicFormFilterValue>(defaultFilterValue());
  const [appliedFilterValue, setAppliedFilterValue] =
    useState<DynamicFormFilterValue>(defaultFilterValue());

  const [search, searchState] = useSearchDynamicFormsMutation();
  const [publish] = usePublishDynamicFormMutation();
  const [clone] = useCloneDynamicFormMutation();
  const [del] = useDeleteDynamicFormMutation();

  const rows = searchState.data?.rows ?? [];
  const total = searchState.data?.totalRows ?? 0;

  const req = useMemo<DynamicFormSearchReq>(
    () => ({
      code: appliedFilterValue.code.trim() || undefined,
      name: appliedFilterValue.name.trim() || undefined,
      createdFromUtc: appliedFilterValue.dateRange.from
        ? appliedFilterValue.dateRange.from.toISOString()
        : null,
      createdToUtc: appliedFilterValue.dateRange.to
        ? appliedFilterValue.dateRange.to.toISOString()
        : null,
      isPublished:
        appliedFilterValue.status === "ALL" ? null : appliedFilterValue.status === "PUBLISHED",
      isActive:
        appliedFilterValue.active === "ALL" ? null : appliedFilterValue.active === "ACTIVE",
      q: undefined,
      createdBy: undefined,
      labels: null,
      page,
      pageSize,
      sortField: sortField ?? "createdAtUtc",
      sortDirection: sortDirection ?? "desc",
    }),
    [appliedFilterValue, page, pageSize, sortDirection, sortField],
  );

  useEffect(() => {
    search(req);
  }, [req, search]);

  const [confirmKind, setConfirmKind] = useState<"publish" | "delete" | null>(null);
  const [target, setTarget] = useState<DynamicFormRow | null>(null);

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

  const ask = (kind: "publish" | "delete", row: DynamicFormRow) => {
    setConfirmKind(kind);
    setTarget(row);
  };

  const confirm = async () => {
    if (!target || !confirmKind) return;
    if (confirmKind === "publish") {
      await publish({ id: target.id }).unwrap();
    } else {
      await del({ id: target.id }).unwrap();
    }
    setConfirmKind(null);
    setTarget(null);
    search(req);
  };

  const cloneRow = async (row: DynamicFormRow) => {
    const result = await clone({ id: row.id, body: { name: `${row.name} - Copy` } }).unwrap();
    navigate(`/dynamic-forms/${result.id}/edit`);
  };

  return (
    <Box sx={{ p: 2 }}>
      <DynamicFormFilterBar
        value={filterValue}
        onChange={setFilterValue}
        onSearch={doSearch}
        onReset={clearFilters}
        onCreate={() => navigate("/dynamic-forms/create")}
      />

      <DynamicFormListTable
        rows={rows}
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
          setSortField(field);
          setSortDirection(dir);
          setPage(0);
        }}
        onRowDoubleClick={(row) => navigate(`/dynamic-forms/${row.id}`)}
        onView={(row) => navigate(`/dynamic-forms/${row.id}`)}
        onEdit={(row) => navigate(`/dynamic-forms/${row.id}/edit`)}
        onPublish={(row) => ask("publish", row)}
        onClone={cloneRow}
        onDelete={(row) => ask("delete", row)}
      />

      <ConfirmDialog
        open={Boolean(confirmKind)}
        title={confirmKind === "publish" ? "Publish form" : "Delete form"}
        message={
          <Typography variant="body2">
            {confirmKind === "publish" ? "Publish" : "Delete"} <b>{target?.code}</b>?
          </Typography>
        }
        confirmText={confirmKind === "publish" ? "Publish" : "Delete"}
        cancelText="Cancel"
        variant={confirmKind === "delete" ? "danger" : "warning"}
        onConfirm={confirm}
        onClose={() => {
          setConfirmKind(null);
          setTarget(null);
        }}
      />
    </Box>
  );
}
