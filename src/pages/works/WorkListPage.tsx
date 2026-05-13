import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Dialog, DialogContent } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import { WorkListTable, type WorkSortField } from '../../components/works/WorkListTable';
import type { SortDirection } from '../../components/common/AppTable';

import { WorkForm } from '../../components/works/workform/WorkForm';
import { WorkFilter, type WorkFilterValues } from '../../components/works/WorkFilter';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { listToolbarButtonSx } from '../../components/common/ListPageToolbar';

import type { WorkListRow } from '../../types/work';
import { useSearchWorksQuery, useDeleteWorkMutation } from '../../api/workApi';

import { WORK_TYPE, WORK_STATUS_OPTIONS } from '../../types/work';
import { UITextKey, uiText } from '../../constants/uiText';

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

  const STATUS_OPTIONS = useMemo(() => WORK_STATUS_OPTIONS, []);

  const { data, isFetching } = useSearchWorksQuery({
    q: filter.q || undefined,
    status: filter.status ?? null,
    leaderDirectiveUserId: filter.leaderDirectiveUserId ?? null,
    type: WORK_TYPE[type],
    priority: filter.priority ?? null,
    page,
    pageSize,
    sortField,
    sortDirection,
  });

  const rows: WorkListRow[] = useMemo(
    () =>
      (data?.rows ?? []).map((x: any) => ({
        id: x.id,
        autoCode: x.autoCode,
        code: x.code ?? null,
        name: x.name,
        status: x.status,
        priority: x.priority,
        type: x.type,
        createdByUserId: x.createdByUserId ?? null,
        ownerName: x.ownerName ?? null,
        leaderDirectiveUserId: x.leaderDirectiveUserId ?? null,
        leaderWatchCount: x.leaderWatchCount ?? 0,
        evaluationTemplateId: x.evaluationTemplateId ?? null,
        evaluationTemplateCode: x.evaluationTemplateCode ?? null,
        evaluationTemplateLabel: x.evaluationTemplateLabel ?? null,
        hasManualEvaluations: x.hasManualEvaluations ?? false,
        evaluatedAssignmentCount: x.evaluatedAssignmentCount ?? 0,
        worstEvaluationCode: x.worstEvaluationCode ?? null,
        worstEvaluationLabel: x.worstEvaluationLabel ?? null,
        dueDate: x.dueDate ?? null,
        createdAtUtc: x.createdAtUtc,
        attachmentCount: x.attachmentCount ?? 0,
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

  const [deleteTarget, setDeleteTarget] = useState<WorkListRow | null>(null);
  const openDelete = (row: WorkListRow) => setDeleteTarget(row);
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
        <WorkFilter
          value={filter}
          onChange={(v) => setFilter(v)}
          statusOptions={STATUS_OPTIONS}
          leaderOptions={[]}
          onSubmit={() => setPage(0)}
          onReset={() => setPage(0)}
          primaryActions={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreate(true)}
              sx={listToolbarButtonSx}
            >
              {type === 'TASK' ? 'Tạo nhiệm vụ mới' : 'Tạo chỉ tiêu mới'}
            </Button>
          }
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
        title={uiText(UITextKey.TextXoa)}
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
