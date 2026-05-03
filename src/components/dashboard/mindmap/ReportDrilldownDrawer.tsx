import { useDeferredValue, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Divider,
  Drawer,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useSearchDashboardMindMapNodeReportsQuery } from "../../../api/dashboardMindMapApi";
import type {
  DashboardMindMapBucket,
  DashboardMindMapReportRowDto,
  DashboardMindMapScopeRequest,
} from "../../../types/dashboardMindMap";
import { formatDateTime } from "../../../utils/dashboardUi";
import { AppTable, type AppTableColumn } from "../../common/AppTable";

type ReportDrilldownDrawerProps = {
  open: boolean;
  nodeId: string | null;
  bucket: DashboardMindMapBucket;
  scope: DashboardMindMapScopeRequest;
  onClose: () => void;
};

const BUCKET_LABELS: Partial<Record<DashboardMindMapBucket, string>> = {
  ALL: "Tat ca",
  TODO: "Chua lam",
  DONE: "Da lam",
  PENDING: "Chua mo",
  DRAFT: "Ban nhap",
  SUBMITTED: "Da gui",
  APPROVED: "Da duyet",
  OVERDUE: "Cham muon",
};

function getErrorMessage(error: unknown): string {
  const source = error as {
    data?: { message?: string; error?: string };
    message?: string;
    error?: string;
  };

  return source?.data?.message || source?.data?.error || source?.message || source?.error || "Khong tai duoc danh sach report.";
}

function noteBlock(label: string, value?: string | null) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
        {value?.trim() || "-"}
      </Typography>
    </Box>
  );
}

export default function ReportDrilldownDrawer(props: ReportDrilldownDrawerProps) {
  const { open, nodeId, bucket, scope, onClose } = props;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword.trim());

  const { data, isFetching, error } = useSearchDashboardMindMapNodeReportsQuery(
    {
      assignmentId: nodeId ?? "",
      req: {
        ...scope,
        bucket,
        q: deferredKeyword || undefined,
        page,
        pageSize,
      },
    },
    {
      skip: !open || !nodeId,
    },
  );

  const columns = useMemo<AppTableColumn<DashboardMindMapReportRowDto>[]>(
    () => [
      {
        field: "assignmentName",
        header: "Assignment",
        width: 220,
        render: (row) => (
          <Stack spacing={0.45}>
            <Typography variant="body2" fontWeight={700}>
              {row.assignmentCode || "-"} - {row.assignmentName || "Chua ro ten"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.periodKey || "-"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "assigneeFullName",
        header: "Nguoi / don vi",
        width: 190,
        render: (row) => (
          <Stack spacing={0.45}>
            <Typography variant="body2" fontWeight={700}>
              {row.assigneeFullName || row.assigneeUsername || "Chua ro nguoi dung"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.unitLabel || "Chua ro don vi"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "timeline",
        header: "Timeline",
        width: 190,
        render: (row) => (
          <Stack spacing={0.35}>
            <Typography variant="caption" color="text.secondary">
              Han: {formatDateTime(row.dueAtUtc)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gui: {formatDateTime(row.submittedAtUtc)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Duyet: {formatDateTime(row.approvedAtUtc)}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "notes",
        header: "Noi dung bao cao / danh gia",
        render: (row) => (
          <Stack spacing={1}>
            {noteBlock("Trang thai tien do", row.currentProgressStatus)}
            {noteBlock("Ly do bao cao", row.reportReason)}
            {noteBlock("Kho khan", row.difficulties)}
            {noteBlock("Giai phap de xuat", row.proposedSolution)}
            {noteBlock("Ly do cham", row.lateReason)}
            {noteBlock("Phan hoi / tra lai", row.reviewerComment || row.returnReason)}
            {noteBlock("Danh gia reviewer", row.reviewerEvaluation)}
          </Stack>
        ),
      },
    ],
    [],
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{
        sx: { zIndex: (theme) => theme.zIndex.modal + 30 },
      }}
      PaperProps={{
        sx: {
          width: { xs: "100%", md: 1040 },
          p: 2,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
        },
      }}
    >
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Drilldown theo report
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            Nhom hien tai: {BUCKET_LABELS[bucket] ?? bucket}. Du lieu lay theo subtree cua node dang chon.
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          <TextField
            label="Tim nhanh"
            placeholder="Assignment, nguoi dung, don vi, ky bao cao..."
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(0);
            }}
            sx={{ flex: 1 }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${data?.totalRows ?? 0} dong`} />
            <Chip color="primary" variant="outlined" label={BUCKET_LABELS[bucket] ?? bucket} />
          </Stack>
        </Stack>

        <Divider />

        {error ? <Alert severity="error">{getErrorMessage(error)}</Alert> : null}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <AppTable
            rows={data?.rows ?? []}
            columns={columns}
            rowKey={(row) => row.workReportPeriodId}
            enablePagination
            paginationMode="server"
            page={page}
            pageSize={pageSize}
            totalRows={data?.totalRows ?? 0}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </Box>

        {isFetching ? (
          <Typography variant="caption" color="text.secondary">
            Dang tai danh sach report...
          </Typography>
        ) : null}
      </Stack>
    </Drawer>
  );
}
