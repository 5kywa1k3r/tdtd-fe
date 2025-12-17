// src/pages/work/WorkListPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';

import { useAppDispatch, useAppSelector } from '../../hooks';
import { setWorkList } from '../../stores/works/workSlice';
import type { ParentWork } from '../../types/work';

import { MOCK_WORK_LIST } from '../../data/mockData';
import { WorkListTable } from '../../components/works/WorkListTable';
import type { SortDirection } from '../../components/common/AppTable';
import { WorkForm } from '../../components/works/WorkForm';
import { WorkFilter, type WorkFilterValues } from '../../components/works/WorkFilter';
import { STATUS_FILTER_OPTIONS } from '../../constants/status';
import { WorkListToolbar } from '../../components/common/WorkListToolbar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface WorkListPageProps {
  type: 'TASK' | 'INDICATOR';
}

const DEFAULT_PAGE_SIZE = 10;

const WorkListPage = ({ type }: WorkListPageProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const rows = useAppSelector((s) => s.work.workList);

  const [openCreate, setOpenCreate] = useState(false);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<string>('fromDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const basePath = type === 'TASK' ? '/tasks' : '/indicators';
  const nameColumnHeader = type === 'TASK' ? 'Tên nhiệm vụ' : 'Tên chỉ tiêu';
  const totalRows = MOCK_WORK_LIST.length;

  useEffect(() => {
    let data = [...MOCK_WORK_LIST];

    data.sort((a: any, b: any) => {
      const va = a[sortField];
      const vb = b[sortField];

      if (va == null && vb == null) return 0;
      if (va == null) return -1;
      if (vb == null) return 1;
      if (va < vb) return sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    const start = page * pageSize;
    const pageData = data.slice(start, start + pageSize);

    dispatch(setWorkList(pageData));
  }, [dispatch, page, pageSize, sortField, sortDirection, type]);

  const handleSortChange = (field: string, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setPage(0);
  };

  const handlePageChange = (newPage: number) => setPage(newPage);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(0);
  };

  const [filter, setFilter] = useState<WorkFilterValues>({
    leader: null,
    fromDate: null,
    toDate: null,
    code: '',
    unitIds: [],
    status: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<ParentWork | null>(null);

  const openDelete = (row: ParentWork) => setDeleteTarget(row);
  const closeDelete = () => setDeleteTarget(null);

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    // TODO: thay bằng thunk API sau
    // dispatch(deleteWorkThunk(deleteTarget.id))
    console.log('delete', deleteTarget.id);
    closeDelete();
  };

  return (
    <Box sx={{ flex: 1, p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Thanh action: Filter + Tạo mới */}
        <Box>
          <WorkListToolbar
            type={type}
            onCreate={() => setOpenCreate(true)}
          />
        </Box>

        <Box>
          <WorkFilter
            value={filter}
            onChange={setFilter}
            statusOptions={STATUS_FILTER_OPTIONS}
          />
        </Box>
      {/* Bảng */}
      <WorkListTable
        rows={rows as ParentWork[]}
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
        onEdit={(row) => navigate(`${basePath}/${row.id}/edit`)} // route 
        onDelete={(row) => openDelete(row)}
      />

      {/* Dialog tạo */}
      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          {type === 'TASK' ? 'Tạo nhiệm vụ mới' : 'Tạo chỉ tiêu mới'}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2, pb: 3 }}>
          <WorkForm
            type={type}
            mode="create"
            onCancel={() => setOpenCreate(false)}
            onSaved={() => {
              setOpenCreate(false);
              // TODO reload list
            }}    
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa công việc"
        message={`Xóa "${deleteTarget?.name}"?`}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onClose={closeDelete}
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
};

export default WorkListPage;
