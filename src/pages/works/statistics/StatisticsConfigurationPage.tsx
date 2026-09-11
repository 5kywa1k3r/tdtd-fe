import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import { useGetWorkAssignmentByIdQuery } from "../../../api/workAssignmentApi";
import DomainContextStrip from "../../../components/navigation/DomainContextStrip";
import {
  apiErrorStatus,
  isStatisticsConfigurationTab,
  STATISTICS_CONFIGURATION_TAB_LABELS,
  STATISTICS_CONFIGURATION_TABS,
  statisticsConfigurationPath,
  type StatisticsConfigurationTab,
} from "./statisticsConfigurationModel";
import { StatConfigSurfaceStateView } from "./StatConfigSurfaceState";
import {
  AdvancedConfigPanel,
  BasicConfigPanel,
  DiffConfigPanel,
  LabelsAndFormPanel,
  ReadinessPanel,
  StatisticsOverviewPanel,
} from "./StatisticsConfigurationPanels";

export default function StatisticsConfigurationPage() {
  const navigate = useNavigate();
  const {
    workId = "",
    scopeAssignmentId = "",
    tab: routeTab,
  } = useParams<{
    workId: string;
    scopeAssignmentId: string;
    tab?: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const assignmentQuery = useGetWorkAssignmentByIdQuery(
    { id: scopeAssignmentId },
    { skip: !scopeAssignmentId },
  );
  const activeTab: StatisticsConfigurationTab = isStatisticsConfigurationTab(routeTab)
    ? routeTab
    : "overview";
  const unsupportedTab = Boolean(routeTab && !isStatisticsConfigurationTab(routeTab));
  const sectionId = searchParams.get("section")?.trim() ?? "";

  useEffect(() => {
    if (!unsupportedTab || !workId || !scopeAssignmentId) return;
    navigate(statisticsConfigurationPath(workId, scopeAssignmentId, "overview"), {
      replace: true,
    });
  }, [navigate, scopeAssignmentId, unsupportedTab, workId]);

  if (!workId || !scopeAssignmentId) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" role="alert">
          Thiếu workId hoặc scopeAssignmentId trên route cấu hình thống kê.
        </Alert>
      </Box>
    );
  }

  const assignment = assignmentQuery.data;
  const routeMismatch = Boolean(assignment && assignment.workId !== workId);
  const dynamicFormTemplateId = assignment?.dynamicFormTemplateId?.trim() ?? "";
  const assignmentErrorState = assignmentQuery.isError
    ? apiErrorStatus(assignmentQuery.error) === 401 || apiErrorStatus(assignmentQuery.error) === 403
      ? "FORBIDDEN"
      : "ERROR"
    : null;

  const changeTab = (tab: StatisticsConfigurationTab) => {
    navigate({
      pathname: statisticsConfigurationPath(workId, scopeAssignmentId, tab),
      search: searchParams.toString() ? `?${searchParams.toString()}` : "",
    });
  };

  const changeSection = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("section", value);
    else next.delete("section");
    setSearchParams(next, { replace: true });
  };

  const route = {
    assignmentId: scopeAssignmentId,
    dynamicFormTemplateId,
  };

  return (
    <Stack
      spacing={2}
      sx={{
        p: { xs: 1.25, sm: 2, lg: 2.5 },
        maxWidth: 1500,
        mx: "auto",
        width: "100%",
        boxSizing: "border-box",
      }}
      data-testid="statistics-configuration-workspace"
      data-boundary="P8_CONFIGURATION_ONLY"
    >
      <DomainContextStrip
        ariaLabel="Ngữ cảnh cấu hình thống kê"
        breadcrumbs={[
          { label: "Công việc", to: `/works/${encodeURIComponent(workId)}` },
          { label: "Thống kê" },
          { label: "Cấu hình" },
          { label: STATISTICS_CONFIGURATION_TAB_LABELS[activeTab] },
        ]}
        items={[
          { label: "Work", value: workId },
          { label: "Scope assignment", value: scopeAssignmentId },
          { label: "Biểu mẫu", value: dynamicFormTemplateId || "Đang xác thực" },
          { label: "Trạng thái", value: routeMismatch ? "Sai phạm vi" : assignment ? "Đã xác thực phạm vi" : "Đang tải", color: routeMismatch ? "error" : assignment ? "success" : "default" },
          { label: "Quyền", value: "Theo permission response của từng cấu hình" },
        ]}
      />
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack spacing={1.5}>
          <Button
            startIcon={<ArrowBackRoundedIcon />}
            sx={{ alignSelf: "flex-start" }}
            onClick={() => navigate(`/works/${encodeURIComponent(workId)}`)}
          >
            Quay lại công việc
          </Button>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
          >
            <Box>
              <Typography component="h1" variant="h5" fontWeight={850}>
                Cấu hình thống kê
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Canonical owner: work {workId} · scope assignment {scopeAssignmentId}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" label="CẤU HÌNH" color="primary" />
              <Chip size="small" variant="outlined" label="CAS + VERSION + HASH" />
              <Chip size="small" variant="outlined" label="SERVER PERMISSIONS" />
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        <Tabs
          value={activeTab}
          onChange={(_event, value: StatisticsConfigurationTab) => changeTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Các vùng cấu hình thống kê"
        >
          {STATISTICS_CONFIGURATION_TABS.map((tab) => (
            <Tab
              key={tab}
              value={tab}
              id={`statistics-config-tab-${tab}`}
              aria-controls={`statistics-config-panel-${tab}`}
              label={STATISTICS_CONFIGURATION_TAB_LABELS[tab]}
            />
          ))}
        </Tabs>
      </Paper>

      {assignmentQuery.isLoading ? <StatConfigSurfaceStateView state="LOADING" /> : null}
      {assignmentErrorState ? <StatConfigSurfaceStateView state={assignmentErrorState} /> : null}
      {routeMismatch ? (
        <StatConfigSurfaceStateView
          state="UNSUPPORTED"
          detail="scopeAssignmentId không thuộc workId trên route; không tải owner để tránh lộ chéo dữ liệu."
        />
      ) : null}
      {!assignmentQuery.isLoading && !assignmentErrorState && assignment && !routeMismatch && !dynamicFormTemplateId ? (
        <StatConfigSurfaceStateView
          state="UNSUPPORTED"
          detail="Assignment chưa pin Dynamic Form template canonical."
        />
      ) : null}

      {assignment && !routeMismatch && dynamicFormTemplateId ? (
        <Box
          role="tabpanel"
          id={`statistics-config-panel-${activeTab}`}
          aria-labelledby={`statistics-config-tab-${activeTab}`}
          tabIndex={0}
          sx={{ minWidth: 0, outlineOffset: 4 }}
        >
          {activeTab === "overview" ? <StatisticsOverviewPanel route={route} /> : null}
          {activeTab === "labels-form" ? <LabelsAndFormPanel dynamicFormTemplateId={dynamicFormTemplateId} /> : null}
          {activeTab === "basic" ? <BasicConfigPanel route={route} /> : null}
          {activeTab === "advanced" ? (
            <AdvancedConfigPanel
              route={route}
              sectionId={sectionId}
              onSectionIdChange={changeSection}
            />
          ) : null}
          {activeTab === "diff" ? <DiffConfigPanel route={route} /> : null}
          {activeTab === "readiness" ? (
            <ReadinessPanel
              route={route}
              dynamicFormOwnerId={dynamicFormTemplateId}
              sectionId={sectionId}
            />
          ) : null}
        </Box>
      ) : null}
    </Stack>
  );
}
