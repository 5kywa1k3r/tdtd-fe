import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useLazyGetWorkDashboardDetailQuery } from "../../api/dashboardApi";
import type {
  WorkDashboardDetailDto,
  WorkDashboardDetailFilters,
} from "../../types/dashboard";
import {
  dateInputToUtcEnd,
  dateInputToUtcStart,
  parseBooleanQuery,
} from "../../utils/dashboardUi";
import WorkOverviewCard from "../../components/dashboard/detail/WorkOverviewCard";
import WorkReportSummaryCard from "../../components/dashboard/detail/WorkReportSummaryCard";
import WorkRootAssignmentsTable from "../../components/dashboard/detail/WorkRootAssignmentsTable";
import WorkDetailFilters from "../../components/dashboard/detail/WorkDetailFilters";

const DEFAULT_FILTERS: WorkDashboardDetailFilters = {
  fromDate: "",
  toDate: "",
  unitIds: [],
  includeRootAssignments: true,
  includeReportSummary: true,
};

function readFiltersFromSearchParams(
  searchParams: URLSearchParams
): WorkDashboardDetailFilters {
  return {
    fromDate: searchParams.get("fromDate") ?? "",
    toDate: searchParams.get("toDate") ?? "",
    unitIds: searchParams
      .getAll("unitIds")
      .map((x) => x.trim())
      .filter(Boolean),
    includeRootAssignments: parseBooleanQuery(
      searchParams.get("includeRootAssignments"),
      true
    ),
    includeReportSummary: parseBooleanQuery(
      searchParams.get("includeReportSummary"),
      true
    ),
  };
}

function buildSearchParams(
  filters: WorkDashboardDetailFilters
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);

  for (const unitId of filters.unitIds) {
    if (unitId?.trim()) params.append("unitIds", unitId.trim());
  }

  if (!filters.includeRootAssignments) {
    params.set("includeRootAssignments", "false");
  }

  if (!filters.includeReportSummary) {
    params.set("includeReportSummary", "false");
  }

  return params;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;

  const e = error as any;
  return (
    e?.data?.message ||
    e?.data?.error ||
    e?.error ||
    e?.message ||
    fallback
  );
}

export default function WorkDashboardDetailPage() {
  const navigate = useNavigate();
  const { workId = "" } = useParams<{ workId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFiltersRef = React.useRef<WorkDashboardDetailFilters | null>(
    null
  );

  if (!initialFiltersRef.current) {
    const parsed = readFiltersFromSearchParams(searchParams);
    initialFiltersRef.current = {
      ...DEFAULT_FILTERS,
      ...parsed,
    };
  }

  const [triggerDetail] = useLazyGetWorkDashboardDetailQuery();

  const [draftFilters, setDraftFilters] =
    React.useState<WorkDashboardDetailFilters>(initialFiltersRef.current);
  const [appliedFilters, setAppliedFilters] =
    React.useState<WorkDashboardDetailFilters>(initialFiltersRef.current);
  const [data, setData] = React.useState<WorkDashboardDetailDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const requestIdRef = React.useRef(0);

  const runLoad = React.useCallback(
    async (filters: WorkDashboardDetailFilters, forceRefresh = false) => {
      if (!workId) return;

      const requestId = ++requestIdRef.current;

      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const result = await triggerDetail({
          workId,
          req: {
            fromUtc: dateInputToUtcStart(filters.fromDate),
            toUtc: dateInputToUtcEnd(filters.toDate),
            unitIds: filters.unitIds,
            includeRootAssignments: filters.includeRootAssignments,
            includeReportSummary: filters.includeReportSummary,
            forceRefresh,
          },
        }).unwrap();

        if (requestId !== requestIdRef.current) return;
        setData(result);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(
          getErrorMessage(err, "Không tải được chi tiết bảng thống kê nhiệm vụ.")
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [triggerDetail, workId]
  );

  React.useEffect(() => {
    void runLoad(appliedFilters, false);
  }, [appliedFilters, runLoad]);

  React.useEffect(() => {
    setSearchParams(buildSearchParams(appliedFilters), { replace: true });
  }, [appliedFilters, setSearchParams]);

  const handleApply = React.useCallback(() => {
    setAppliedFilters({
      ...draftFilters,
      unitIds: [...draftFilters.unitIds],
    });
  }, [draftFilters]);

  const handleReset = React.useCallback(() => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }, []);

  const handleRefresh = React.useCallback(() => {
    void runLoad(appliedFilters, true);
  }, [appliedFilters, runLoad]);

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
          >
            Quay lại
          </Button>

          <Box>
            <Typography variant="h5" fontWeight={700}>
              Chi tiết bảng thống kê nhiệm vụ / chỉ tiêu
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Khoảng ngày lọc ở đây chỉ dùng để tính bảng thống kê, không phải mã kỳ hoặc mã ngày của báo cáo.
            </Typography>
          </Box>
        </Stack>

        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Đang làm mới..." : "Làm mới"}
        </Button>
      </Stack>

      <WorkDetailFilters
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={handleApply}
        onReset={handleReset}
        loading={loading || refreshing}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading && !data ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: "center" }}>
          <CircularProgress size={30} />
        </Paper>
      ) : !data ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: "center" }}>
          Không có dữ liệu.
        </Paper>
      ) : (
        <Stack spacing={2}>
          <WorkOverviewCard work={data.work} />

          {appliedFilters.includeReportSummary && data.reportSummary ? (
            <WorkReportSummaryCard summary={data.reportSummary} />
          ) : null}

          {appliedFilters.includeRootAssignments ? (
            <WorkRootAssignmentsTable rows={data.rootAssignments} />
          ) : null}
        </Stack>
      )}
    </Stack>
  );
}
