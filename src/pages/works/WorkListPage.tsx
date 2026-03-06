import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Dialog, DialogContent } from '@mui/material';

import { WorkListTable, type WorkSortField } from '../../components/works/WorkListTable';
import type { SortDirection } from '../../components/common/AppTable';

import { WorkForm } from '../../components/works/workform/WorkForm';
import { WorkFilter, type WorkFilterValues } from '../../components/works/WorkFilter';
import { WorkListToolbar } from '../../components/common/WorkListToolbar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

import type { ParentWork } from '../../types/work';
import { useSearchWorksQuery, useDeleteWorkMutation } from '../../api/workApi';

import { WORK_TYPE, WORK_STATUS_OPTIONS } from '../../types/work';

interface WorkListPageProps {
  type: 'TASK' | 'INDICATOR';
}

const DEFAULT_PAGE_SIZE = 10;

const WorkListPage = ({ type }: WorkListPageProps) => {
  const navigate = useNavigate();

  const basePath = type === 'TASK' ? '/tasks' : '/indicators';
  const nameColumnHeader = type === 'TASK' ? 'Tên nhiệm vụ' : 'Tên chỉ tiêu';

  const [openCreate, setOpenCreate] = useState(false);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [sortField, setSortField] = useState<WorkSortField>('createdAtUtc');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [filter, setFilter] = useState<WorkFilterValues>({
    q: '',
    status: null,
    leaderDirectiveUserId: null,
    priority: null,
  });

  // ✅ dùng constant chuẩn hoá enum số
  const STATUS_OPTIONS = useMemo(() => WORK_STATUS_OPTIONS, []);

  const { data, isFetching } = useSearchWorksQuery({
    q: filter.q || undefined,
    status: filter.status ?? null,
    leaderDirectiveUserId: filter.leaderDirectiveUserId ?? null,

    // ✅ ÉP THEO TAB: gửi số 1/2 đúng BE enum
    type: WORK_TYPE[type],

    // ✅ priority là số 1/2/3
    priority: filter.priority ?? null,

    page,
    pageSize,
    sortField,
    sortDirection,
  });

  // ✅ map đúng WorkListRow hiện tại của BE:
  // (Id, AutoCode, Code, Name, Status, Priority, LeaderDirectiveUserId, LeaderWatchCount, DueDate, CreatedAtUtc)
  const rows: ParentWork[] = useMemo(
    () =>
      (data?.rows ?? []).map((x: any) => ({
        id: x.id,
        autoCode: x.autoCode,
        code: x.code ?? null,
        name: x.name,

        // fields UI đang dùng
        dueDate: x.dueDate ?? null,
        createdAtUtc: x.createdAtUtc,
        status: x.status,

        leaderDirectiveUserId: x.leaderDirectiveUserId,
        leaderWatchCount: x.leaderWatchCount,

        // ✅ NEW: ưu tiên số
        // priority: x.priority ?? 2, // default MEDIUM=2 nếu BE thiếu
      })),
    [data],
  );

  const totalRows = data?.totalRows ?? 0;

  const handleSortChange = (field: WorkSortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setPage(0);
  };

  const handlePageChange = (newPage: number) => setPage(newPage);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(0);
  };

  const [deleteTarget, setDeleteTarget] = useState<ParentWork | null>(null);
  const openDelete = (row: ParentWork) => setDeleteTarget(row);
  const closeDelete = () => setDeleteTarget(null);

  const [deleteWork, { isLoading: deleting }] = useDeleteWorkMutation();

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteWork(deleteTarget.id).unwrap();
    closeDelete();
  };

  return (
    <Box sx={{ flex: 1, p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <WorkListToolbar type={type} onCreate={() => setOpenCreate(true)} />
      </Box>

      <Box>
        <WorkFilter
          value={filter}
          onChange={(v) => setFilter(v)}
          statusOptions={STATUS_OPTIONS}
          leaderOptions={[]}
          onSubmit={() => setPage(0)}
          onReset={() => setPage(0)}
        />
      </Box>

      <WorkListTable
        rows={rows}
        total={totalRows}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onRowDoubleClick={(row) => navigate(`${basePath}/${row.id}`)}
        nameColumnHeader={nameColumnHeader}
        onEdit={(row) => navigate(`${basePath}/${row.id}/edit`)}
        onDelete={(row) => openDelete(row)}
      />

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="md">
        <DialogContent dividers sx={{ pt: 2, pb: 3 }}>
          <WorkForm
            type={type}
            mode="create"
            onCancel={() => setOpenCreate(false)}
            onSaved={() => setOpenCreate(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa"
        message={`Xóa "${deleteTarget?.name}"?`}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        confirmLoading={deleting}
        onClose={closeDelete}
        onConfirm={handleConfirmDelete}
      />

      {isFetching ? null : null}
    </Box>
  );
};

export default WorkListPage;