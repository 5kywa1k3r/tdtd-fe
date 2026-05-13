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

import { useSearchDashboardMindMapNodeUnitsQuery } from "../../../api/dashboardMindMapApi";
import type {
  DashboardMindMapBucket,
  DashboardMindMapScopeRequest,
  DashboardMindMapUnitRowDto,
} from "../../../types/dashboardMindMap";
import { formatDateTime } from "../../../utils/dashboardUi";
import { AppTable, type AppTableColumn } from "../../common/AppTable";
import { UITextKey, uiText } from '../../../constants/uiText';

type UnitDrilldownDrawerProps = {
  open: boolean;
  nodeId: string | null;
  bucket: DashboardMindMapBucket;
  scope: DashboardMindMapScopeRequest;
  onClose: () => void;
};

const BUCKET_LABELS: Partial<Record<DashboardMindMapBucket, string>> = {
  ALL: "Tất cả",
  TODO: "Chưa làm",
  DONE: "Đã làm",
  OVERDUE: "Chậm muộn",
};

function getErrorMessage(error: unknown): string {
  const source = error as {
    data?: { message?: string; error?: string };
    message?: string;
    error?: string;
  };

  return source?.data?.message || source?.data?.error || source?.message || source?.error || "Không tải được danh sách đơn vị.";
}

function renderTextBlock(title: string, value?: string | null) {
  return (
    <Box>
      <Typography variant="caption" fontWeight={700} color="text.secondary">
        {title}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
        {value?.trim() || "-"}
      </Typography>
    </Box>
  );
}

export default function UnitDrilldownDrawer(props: UnitDrilldownDrawerProps) {
  const { open, nodeId, bucket, scope, onClose } = props;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword.trim());

  const { data, isFetching, error } = useSearchDashboardMindMapNodeUnitsQuery(
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

  const columns = useMemo<AppTableColumn<DashboardMindMapUnitRowDto>[]>(
    () => [
      {
        field: "assigneeFullName",
        header: "Người / đơn vị",
        width: 220,
        render: (row) => (
          <Stack spacing={0.45}>
            <Typography variant="body2" fontWeight={700}>
              {row.assigneeFullName || row.assigneeUsername || "Chưa rõ người dùng"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.assigneeUsername || "-"}
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              label={row.unitLabel || "Chưa rõ đơn vị"}
              sx={{ width: "fit-content" }}
            />
          </Stack>
        ),
      },
      {
        field: "totalReports",
        header: "Tổng quan",
        width: 180,
        render: (row) => (
          <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`Tổng ${row.totalReports}`} />
            <Chip size="small" color="success" variant="outlined" label={`Đã làm ${row.doneCount}`} />
            <Chip size="small" variant="outlined" label={`Chưa làm ${row.todoCount}`} />
            <Chip size="small" color="error" variant="outlined" label={`Chậm ${row.overdueCount}`} />
          </Stack>
        ),
      },
      {
        field: "latestPeriodKey",
        header: "Kỳ gần nhất",
        width: 150,
        render: (row) => (
          <Stack spacing={0.35}>
            <Typography variant="body2" fontWeight={700}>
              {row.latestPeriodKey || "-"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Hạn {formatDateTime(row.latestDueAtUtc)}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "notes",
        header: "Khó khăn / lý do",
        render: (row) => (
          <Stack spacing={1}>
            {renderTextBlock("Khó khăn", row.difficulties)}
            {renderTextBlock("Lý do chậm", row.lateReason)}
            {renderTextBlock(
              "Góp ý phản hồi",
              row.reviewerComment || row.returnReason || row.worstOverdueReasonLabel,
            )}
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
          width: { xs: "100%", md: 980 },
          p: 2,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
        },
      }}
    >
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Chi tiết theo đơn vị
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            Nhóm hiện tại: {BUCKET_LABELS[bucket] ?? bucket}. Bộ lọc phạm vi của trang đang được áp dụng.
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          <TextField
            label={uiText(UITextKey.TextTimNhanh)}
            placeholder={uiText(UITextKey.TextTenUserUsernameDonViKy)}
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(0);
            }}
            sx={{ flex: 1 }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${data?.totalRows ?? 0} dòng`} />
            <Chip color="primary" variant="outlined" label={BUCKET_LABELS[bucket] ?? bucket} />
          </Stack>
        </Stack>

        <Divider />

        {error ? <Alert severity="error">{getErrorMessage(error)}</Alert> : null}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <AppTable
            rows={data?.rows ?? []}
            columns={columns}
            rowKey={(row) => `${row.assigneeUserId ?? "-"}::${row.unitId ?? "-"}`}
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
            Đang tải dữ liệu đơn vị...
          </Typography>
        ) : null}
      </Stack>
    </Drawer>
  );
}
