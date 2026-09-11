import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DYNAMIC_FORM_CREATE_PATH, dynamicFormPath } from "../../routes/dynamicFormRoutes";
import type { SortDirection } from "../../components/common/AppTable";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import {
  useCloneDynamicFormMutation,
  useDeleteDynamicFormMutation,
  useGetDynamicFormQuery,
  usePublishDynamicFormMutation,
  useSearchDynamicFormsMutation,
} from "../../api/dynamicFormApi";
import type { DynamicFormRow, DynamicFormSearchReq } from "../../api/dynamicFormApi";
import type { ApiError } from "../../types/apiError";
import { normalizeApiError } from "../../utils/apiError";
import DynamicFormFilterBar, {
  type DynamicFormFilterValue,
} from "../../features/dynamicForms/components/DynamicFormFilterBar";
import { DynamicFormListTable } from "../../features/dynamicForms/components/DynamicFormListTable";
import { DynamicFormListStatePanel } from "../../features/dynamicForms/components/DynamicFormListStatePanel";
import DynamicFormPreview from "../../features/dynamicForms/components/DynamicFormPreview";

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
  const [publish, publishState] = usePublishDynamicFormMutation();
  const [clone, cloneState] = useCloneDynamicFormMutation();
  const [del, deleteState] = useDeleteDynamicFormMutation();

  const rows = searchState.data?.rows ?? [];
  const total = searchState.data?.totalRows ?? 0;
  const searchErrorStatus = (searchState.error as ApiError | undefined)?.status;
  const isInitialLoading = searchState.isUninitialized || (searchState.isLoading && !searchState.data);

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
      tagCodes: null,
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<DynamicFormRow | null>(null);
  const previewQuery = useGetDynamicFormQuery(
    { id: previewTarget?.id ?? "" },
    { skip: !previewTarget },
  );

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
    if (kind === "publish" && !row.actions.canPublish) return;
    if (kind === "delete" && !row.actions.canDelete) return;
    setActionError(null);
    setConfirmKind(kind);
    setTarget(row);
  };

  const confirm = async () => {
    if (!target || !confirmKind) return;
    try {
      setActionError(null);
      if (confirmKind === "publish") {
        if (!target.actions.canPublish) return;
        await publish({ id: target.id, expectedRevision: target.revision }).unwrap();
      } else {
        if (!target.actions.canDelete) return;
        await del({ id: target.id, expectedRevision: target.revision }).unwrap();
      }
      setConfirmKind(null);
      setTarget(null);
      await search(req);
    } catch (error) {
      setActionError(normalizeApiError(error).message);
      setConfirmKind(null);
      setTarget(null);
      await search(req);
    }
  };

  const cloneRow = async (row: DynamicFormRow) => {
    if (!row.actions.canClone || cloneState.isLoading) return;
    try {
      setActionError(null);
      const result = await clone({
        id: row.id,
        body: { name: `${row.name} - Bản sao` },
      }).unwrap();
      navigate(dynamicFormPath(result.id, "edit"));
    } catch (error) {
      setActionError(normalizeApiError(error).message);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <DynamicFormFilterBar
        value={filterValue}
        onChange={setFilterValue}
        onSearch={doSearch}
        onReset={clearFilters}
        onCreate={() => navigate(DYNAMIC_FORM_CREATE_PATH)}
      />

      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ mt: 1 }}>
          {actionError}
        </Alert>
      )}

      {isInitialLoading ? (
        <DynamicFormListStatePanel state="loading" />
      ) : searchState.isError ? (
        <DynamicFormListStatePanel
          state={searchErrorStatus === 403 ? "forbidden" : "error"}
          onRetry={() => search(req)}
        />
      ) : rows.length === 0 ? (
        <DynamicFormListStatePanel state="empty" />
      ) : (
        <Box aria-busy={searchState.isLoading || undefined}>
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
            onRowDoubleClick={(row) => {
              if (row.actions.canRead) navigate(dynamicFormPath(row.id));
            }}
            onPreview={(row) => {
              if (row.actions.canRead) setPreviewTarget(row);
            }}
            onView={(row) => {
              if (row.actions.canRead) navigate(dynamicFormPath(row.id));
            }}
            onEdit={(row) => {
              if (row.actions.canUpdate) navigate(dynamicFormPath(row.id, "edit"));
            }}
            onPublish={(row) => ask("publish", row)}
            onClone={cloneRow}
            onDelete={(row) => ask("delete", row)}
          />
        </Box>
      )}

      <ConfirmDialog
        open={Boolean(confirmKind)}
        title={confirmKind === "publish" ? "Công bố biểu mẫu" : "Xóa biểu mẫu"}
        message={
          <Typography variant="body2">
            {confirmKind === "publish" ? "Công bố" : "Xóa"} <b>{target?.code}</b>?
          </Typography>
        }
        confirmText={confirmKind === "publish" ? "Công bố" : "Xóa"}
        cancelText="Hủy"
        variant={confirmKind === "delete" ? "danger" : "warning"}
        confirmLoading={publishState.isLoading || deleteState.isLoading}
        onConfirm={confirm}
        onClose={() => {
          setConfirmKind(null);
          setTarget(null);
        }}
      />

      <Dialog
        open={Boolean(previewTarget)}
        maxWidth="lg"
        fullWidth
        onClose={() => setPreviewTarget(null)}
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          <Stack spacing={0.25}>
            <Typography fontWeight={850}>{previewTarget?.name ?? "Nhập thử"}</Typography>
            {previewTarget?.code && (
              <Typography variant="caption" color="text.secondary">
                {previewTarget.code}
              </Typography>
            )}
          </Stack>
          <IconButton
            aria-label="Đóng"
            onClick={() => setPreviewTarget(null)}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {previewQuery.isFetching && (
            <Box sx={{ minHeight: 260, display: "grid", placeItems: "center" }}>
              <CircularProgress />
            </Box>
          )}
          {previewQuery.isError && (
            <Typography color="error">Không tải được biểu mẫu để nhập thử.</Typography>
          )}
          {previewQuery.data && (
            <DynamicFormPreview detail={previewQuery.data} dense interactive />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
