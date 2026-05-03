import React from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";

import { useLazyGetDashboardOverviewQuery } from "../../api/dashboardApi";
import type {
  DashboardOverviewMode,
  DashboardOverviewResponse,
  DashboardPageFilters,
} from "../../types/dashboard";
import {
  dateInputToUtcEnd,
  dateInputToUtcStart,
} from "../../utils/dashboardUi";
import DashboardPieChart from "../../components/dashboard/charts/DashboardPieChart";
import DashboardUnitBarChart from "../../components/dashboard/charts/DashboardUnitBarChart";
import DashboardSummaryCards from "../../components/dashboard/summary/DashboardSummaryCards";
import DashboardSummaryFilters from "../../components/dashboard/summary/DashboardSummaryFilters";
import DashboardWorksTable from "../../components/dashboard/summary/DashboardWorksTable";
import WorkMindMapLaunchDialog from "../../components/dashboard/mindmap/WorkMindMapLaunchDialog";

const WorkMindMapPage = React.lazy(() => import("./mindmap/WorkMindMapPage"));

const DEFAULT_FILTERS: DashboardPageFilters = {
  mode: "WORK_TASK",
  fromDate: "",
  toDate: "",
  unitIds: [],
  assignmentId: "",
};

const MODE_TITLES: Record<DashboardOverviewMode, string> = {
  WORK_TASK: "Bảng thống kê tổng hợp công việc",
  WORK_TARGET: "Bảng thống kê chỉ tiêu",
  ASSIGNMENT_RECEIVED: "Bảng thống kê công việc được giao",
  ASSIGNMENT_CREATED: "Bảng thống kê công việc đã giao",
  REPORT: "Bảng thống kê báo cáo",
};

const MODE_DESCRIPTIONS: Record<DashboardOverviewMode, string> = {
  WORK_TASK:
    "Hiển thị các nhiệm vụ do chính bạn tạo. Biểu đồ tròn mô tả cơ cấu nhiệm vụ, còn nhóm thẻ trạng thái mô tả công việc được giao.",
  WORK_TARGET:
    "Hiển thị các chỉ tiêu do chính bạn tạo. Biểu đồ tròn mô tả cơ cấu chỉ tiêu, còn nhóm thẻ trạng thái mô tả các công việc đã giao.",
  ASSIGNMENT_RECEIVED:
    "Hiển thị các công việc thuộc nhánh được giao. Biểu đồ tròn mô tả cơ cấu báo cáo hoặc kỳ trong nhánh được giao.",
  ASSIGNMENT_CREATED:
    "Hiển thị các công việc thuộc nhánh do bạn giao. Biểu đồ tròn mô tả cơ cấu công việc đã giao, còn nhóm thẻ trạng thái mô tả báo cáo hoặc kỳ trong nhánh.",
  REPORT:
    "Hiển thị trực tiếp danh sách kỳ báo cáo trong các nhánh công việc mà bạn có quyền tổng hợp.",
};

const PIE_TITLES: Record<DashboardOverviewMode, string> = {
  WORK_TASK: "Cơ cấu trạng thái công việc",
  WORK_TARGET: "Cơ cấu trạng thái công việc được giao",
  ASSIGNMENT_RECEIVED: "Cơ cấu trạng thái báo cáo / kỳ",
  ASSIGNMENT_CREATED: "Cơ cấu trạng thái công việc đã giao",
  REPORT: "Cơ cấu trạng thái kỳ báo cáo",
};

const PIE_HELPERS: Record<DashboardOverviewMode, string> = {
  WORK_TASK:
    "Biểu đồ tròn biểu diễn trạng thái của nhiệm vụ, chỉ tiêu. Bấm lát cắt để xem đơn vị có giá trị cao nhất theo trạng thái công việc đã giao.",
  WORK_TARGET:
    "Biểu đồ tròn biểu diễn trạng thái của nhiệm vụ, chỉ tiêu. Bấm lát cắt để xem top đơn vị theo trạng thái công việc đã giao gốc.",
  ASSIGNMENT_RECEIVED:
    "Biểu đồ tròn  biểu diễn trạng thái của báo cáo hoặc kỳ trong nhánh công việc được giao.",
  ASSIGNMENT_CREATED:
    "Biểu đồ tròn đang biểu diễn trạng thái công việc đã giao. Nhóm thẻ phía trên đang mô tả báo cáo hoặc kỳ trong nhánh.",
  REPORT:
    "Biểu đồ tròn đang biểu diễn trạng thái của kỳ báo cáo trong phạm vi lọc.",
};

function readFiltersFromSearchParams(
  searchParams: URLSearchParams
): DashboardPageFilters {
  const mode = (searchParams.get("mode") || DEFAULT_FILTERS.mode) as DashboardOverviewMode;

  return {
    mode,
    fromDate: searchParams.get("fromDate") ?? "",
    toDate: searchParams.get("toDate") ?? "",
    unitIds: searchParams
      .getAll("unitIds")
      .map((x) => x.trim())
      .filter(Boolean),
    assignmentId: searchParams.get("assignmentId") ?? "",
  };
}

function buildSearchParams(filters: DashboardPageFilters): URLSearchParams {
  const params = new URLSearchParams();

  params.set("mode", filters.mode);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  if (filters.assignmentId) params.set("assignmentId", filters.assignmentId);

  for (const unitId of filters.unitIds) {
    if (unitId?.trim()) params.append("unitIds", unitId.trim());
  }

  return params;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;

  const e = error as {
    data?: { message?: string; error?: string };
    error?: string;
    message?: string;
  };
  return e?.data?.message || e?.data?.error || e?.error || e?.message || fallback;
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFiltersRef = React.useRef<DashboardPageFilters | null>(null);

  if (!initialFiltersRef.current) {
    initialFiltersRef.current = {
      ...DEFAULT_FILTERS,
      ...readFiltersFromSearchParams(searchParams),
    };
  }

  const [triggerOverview] = useLazyGetDashboardOverviewQuery();

  const [draftFilters, setDraftFilters] = React.useState<DashboardPageFilters>(
    initialFiltersRef.current
  );
  const [appliedFilters, setAppliedFilters] = React.useState<DashboardPageFilters>(
    initialFiltersRef.current
  );
  const [data, setData] = React.useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [selectedPieKey, setSelectedPieKey] = React.useState<string | null>(null);
  const [mindMapPickerOpen, setMindMapPickerOpen] = React.useState(false);
  const [mindMapCanvasOpen, setMindMapCanvasOpen] = React.useState(false);

  const requestIdRef = React.useRef(0);

  const runLoad = React.useCallback(
    async (filters: DashboardPageFilters) => {
      const requestId = ++requestIdRef.current;

      setLoading(true);
      setError("");

      try {
        const result = await triggerOverview({
          mode: filters.mode,
          fromUtc: dateInputToUtcStart(filters.fromDate),
          toUtc: dateInputToUtcEnd(filters.toDate),
          unitIds: filters.unitIds,
          assignmentId: filters.mode === "REPORT" ? filters.assignmentId || null : null,
          topUnitCount: 3,
          forceRefresh: false,
        }).unwrap();

        if (requestId !== requestIdRef.current) return;
        setData(result);
        setSelectedPieKey(result.pie[0]?.key ?? null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(getErrorMessage(err, "Không tải được dashboard."));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [triggerOverview]
  );

  React.useEffect(() => {
    void runLoad(appliedFilters);
  }, [appliedFilters, runLoad]);

  React.useEffect(() => {
    setSearchParams(buildSearchParams(appliedFilters), { replace: true });
  }, [appliedFilters, setSearchParams]);

  const handleApply = React.useCallback(() => {
    setAppliedFilters({
      ...draftFilters,
      unitIds: [...draftFilters.unitIds],
      assignmentId: draftFilters.mode === "REPORT" ? draftFilters.assignmentId : "",
    });
  }, [draftFilters]);

  const handleReset = React.useCallback(() => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }, []);

  const pieData = data?.pie ?? [];
  const selectedPie = pieData.find((item) => item.key === selectedPieKey) ?? pieData[0] ?? null;
  const unitChartRows = selectedPie ? data?.unitCharts?.[selectedPie.key] ?? [] : [];
  const showUnitChart = true;

  return (
    <Stack spacing={2.5}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          background:
            "linear-gradient(180deg, rgba(248,250,252,0.95) 0%, rgba(255,255,255,1) 100%)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {MODE_TITLES[appliedFilters.mode]}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 980 }}>
              {MODE_DESCRIPTIONS[appliedFilters.mode]}
            </Typography>
          </Box>

        </Stack>
      </Paper>

      <DashboardSummaryFilters
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={handleApply}
        onReset={handleReset}
        onOpenMindMap={() => setMindMapPickerOpen(true)}
        loading={loading}
        assignmentRequest={{
          fromUtc: dateInputToUtcStart(draftFilters.fromDate),
          toUtc: dateInputToUtcEnd(draftFilters.toDate),
          unitIds: draftFilters.unitIds,
        }}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <DashboardSummaryCards cards={data?.cards ?? []} loading={loading && !data} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: showUnitChart ? 4 : 12 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: "100%" }}>
            <DashboardPieChart
              title={PIE_TITLES[appliedFilters.mode]}
              helperText={PIE_HELPERS[appliedFilters.mode]}
              data={pieData}
              selectedKey={selectedPie?.key ?? null}
              onSelect={showUnitChart ? setSelectedPieKey : undefined}
              height={300}
              emptyText="Chưa có dữ liệu cơ cấu để hiển thị."
            />
          </Paper>
        </Grid>

        {showUnitChart ? (
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: "100%" }}>
              <DashboardUnitBarChart
                title="3 đơn vị có giá trị cao nhất"
                rows={unitChartRows}
                selectedLabel={selectedPie?.label ?? null}
                height={300}
                emptyText="Chưa có dữ liệu đơn vị cho lát cắt đang chọn."
              />
            </Paper>
          </Grid>
        ) : null}
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Stack spacing={0.75}>
          <Typography variant="h6" fontWeight={700}>
            Bảng dữ liệu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data?.range?.label || "Toàn bộ khoảng thời gian"}
          </Typography>
        </Stack>
      </Paper>

      {loading && !data ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress size={30} />
        </Paper>
      ) : (
        <DashboardWorksTable mode={appliedFilters.mode} rows={data?.rows ?? []} />
      )}

      <WorkMindMapLaunchDialog
        open={mindMapPickerOpen}
        onClose={() => setMindMapPickerOpen(false)}
        onOpenCanvas={() => {
          setMindMapPickerOpen(false);
          setMindMapCanvasOpen(true);
        }}
      />

      <Dialog
        fullScreen
        open={mindMapCanvasOpen}
        onClose={() => setMindMapCanvasOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: "#f8fafc",
          },
        }}
      >
        <DialogContent sx={{ p: 0, overflow: "hidden" }}>
          <React.Suspense
            fallback={(
              <Box sx={{ display: "grid", minHeight: "100vh", placeItems: "center" }}>
                <CircularProgress size={30} />
              </Box>
            )}
          >
            <WorkMindMapPage embedded canvasOnly />
          </React.Suspense>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
