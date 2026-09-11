import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AddTaskOutlinedIcon from "@mui/icons-material/AddTaskOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

import {
  useGetDynamicFlowRuntimeInboxQuery,
  useGetDynamicFlowRuntimeInstancesQuery,
  useGetDynamicFlowPeriodicOccurrencesQuery,
  useGetDynamicFlowPeriodicSchedulesQuery,
  useRerunDynamicFlowPeriodicOccurrenceMutation,
  type DynamicFlowPeriodicSchedule,
  type DynamicFlowRuntimeStepState,
} from "../../../api/dynamicFlowRuntimeApi";
import { getMeSnapshot } from "../../../stores/authStorage";
import DynamicFlowLaunchWizard from "./DynamicFlowLaunchWizard";
import DynamicFlowRuntimeStateBadge from "./DynamicFlowRuntimeStateBadge";
import {
  createDynamicFlowRuntimeCommandId,
  isRuntimeCapabilityEnabled,
  runtimeErrorPresentation,
} from "./dynamicFlowRuntimeModel";

const INBOX_STATES: Array<{ value: DynamicFlowRuntimeStepState; label: string }> = [
  { value: "ASSIGNED", label: "Được giao" },
  { value: "IN_PROGRESS", label: "Đang thực hiện" },
  { value: "RETURNED", label: "Bị trả lại" },
  { value: "SUBMITTED", label: "Đã gửi" },
];

type Props = {
  workId: string;
  onOpenInstance: (
    instanceId: string,
    tab?: "overview" | "work-to-do" | "timeline",
    targetWorkId?: string,
    identity?: {
      stepInstanceId?: string | null;
      branchId?: string | null;
      attemptNo?: number | null;
      assignmentId?: string | null;
      reportId?: string | null;
    },
  ) => void;
};

function PeriodicScheduleRow({
  workId,
  schedule,
  onOpenInstance,
}: {
  workId: string;
  schedule: DynamicFlowPeriodicSchedule;
  onOpenInstance: Props["onOpenInstance"];
}) {
  const occurrences = useGetDynamicFlowPeriodicOccurrencesQuery({
    workId,
    scheduleId: schedule.scheduleId,
  });
  const [rerun, rerunState] =
    useRerunDynamicFlowPeriodicOccurrenceMutation();
  const missed = (occurrences.data ?? []).filter(
    (occurrence) => occurrence.state === "MISSED",
  );

  return (
    <Box
      data-testid={`p6-periodic-schedule-${schedule.scheduleId}`}
      sx={{ border: "1px solid #dbeafe", borderRadius: 1, p: 1 }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        spacing={1}
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 750 }}>
            {schedule.scheduleKey} · {schedule.cadence} {schedule.localTime}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Múi giờ {schedule.normalizedTimeZoneId} · kỳ tiếp theo{" "}
            {new Date(schedule.nextDueAtUtc).toLocaleString()}
          </Typography>
        </Box>
        <DynamicFlowRuntimeStateBadge state={schedule.state} />
      </Stack>
      {occurrences.isLoading ? (
        <Typography variant="caption">Đang tải các kỳ chạy…</Typography>
      ) : null}
      {missed.map((occurrence) => (
        <Stack
          key={occurrence.occurrenceId}
          data-testid={`p6-periodic-missed-${occurrence.periodKey}`}
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={1}
          sx={{ mt: 1 }}
        >
          <Box>
            <Typography variant="body2">
              Kỳ {occurrence.periodKey} · MISSED
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {occurrence.reasonCode ?? "MISSED"}
            </Typography>
          </Box>
          <Button
            size="small"
            disabled={rerunState.isLoading}
            onClick={() =>
              void rerun({
                workId,
                scheduleId: schedule.scheduleId,
                periodKey: occurrence.periodKey,
                body: { commandId: createDynamicFlowRuntimeCommandId() },
              })
            }
          >
            Chạy lại kỳ này
          </Button>
        </Stack>
      ))}
      {(occurrences.data ?? [])
        .filter(
          (occurrence) =>
            occurrence.state === "LAUNCHED" &&
            Boolean(occurrence.flowInstanceId),
        )
        .slice(0, 3)
        .map((occurrence) => (
          <Button
            key={occurrence.occurrenceId}
            size="small"
            sx={{ mt: 0.5, mr: 0.5 }}
            onClick={() =>
              onOpenInstance(
                occurrence.flowInstanceId!,
                "overview",
              )
            }
          >
            Mở kỳ {occurrence.periodKey}
          </Button>
        ))}
    </Box>
  );
}

export default function DynamicFlowRuntimeEntryPanel({ workId, onOpenInstance }: Props) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [inboxState, setInboxState] =
    useState<DynamicFlowRuntimeStepState>("ASSIGNED");
  const actorAvailable = Boolean(getMeSnapshot()?.id);
  const instances = useGetDynamicFlowRuntimeInstancesQuery(
    { workId, limit: 5 },
    { skip: !workId || !actorAvailable },
  );
  const inbox = useGetDynamicFlowRuntimeInboxQuery(
    { state: inboxState, limit: 25 },
    { skip: !workId || !actorAvailable },
  );
  const periodic = useGetDynamicFlowPeriodicSchedulesQuery(
    { workId },
    { skip: !workId || !actorAvailable },
  );
  const inboxRows = (inbox.data?.items ?? []).slice(0, 5);
  const firstError = instances.error ?? inbox.error ?? periodic.error;
  const errorPresentation = firstError ? runtimeErrorPresentation(firstError) : null;

  return (
    <Card
      elevation={0}
      component="section"
      data-testid="p5-runtime-entry"
      aria-labelledby="p5-runtime-entry-title"
      sx={{
        border: "1px solid #bfdbfe",
        bgcolor: "#f8fbff",
        borderRadius: "8px",
        flexShrink: 0,
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, md: 2 }, "&:last-child": { pb: { xs: 1.5, md: 2 } } }}>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={1}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <AccountTreeOutlinedIcon color="primary" />
              <Box>
                <Typography id="p5-runtime-entry-title" variant="subtitle1" sx={{ fontWeight: 850 }}>
                  Flow runtime
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Khởi chạy FLOW-T01/T02 và mở exact instance trong trải nghiệm công việc này.
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              startIcon={<AddTaskOutlinedIcon />}
              data-testid="p5-runtime-open-wizard"
              onClick={() => setWizardOpen(true)}
              disabled={!actorAvailable}
            >
              Mở wizard Flow
            </Button>
          </Stack>

          {!actorAvailable ? (
            <Alert severity="error">
              Không xác định actor; launch và runtime reads được khóa fail-closed.
            </Alert>
          ) : null}
          {errorPresentation ? (
            <Alert severity={errorPresentation.kind === "forbidden" ? "warning" : "error"}>
              {errorPresentation.message}
            </Alert>
          ) : null}

          {instances.isLoading || inbox.isLoading ? (
            <Stack direction="row" spacing={1} alignItems="center" role="status">
              <CircularProgress size={18} />
              <Typography variant="body2">Đang tải instance và inbox…</Typography>
            </Stack>
          ) : null}

          <Stack direction={{ xs: "column", lg: "row" }} spacing={2} divider={<Divider flexItem />}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Instance của công việc
              </Typography>
              {!instances.isLoading && (instances.data?.items.length ?? 0) === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Chưa có Flow instance hiển thị cho actor hiện tại.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {(instances.data?.items ?? []).map((row) => (
                    <Stack
                      key={row.flowInstanceId}
                      data-testid={`p5-runtime-instance-${row.flowInstanceId}`}
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      alignItems={{ xs: "stretch", sm: "center" }}
                      justifyContent="space-between"
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
                          Flow v{row.flowTemplateVersionNo} · {row.periodKey}
                        </Typography>
                        <DynamicFlowRuntimeStateBadge state={row.state} />
                      </Box>
                      <Button
                        size="small"
                        aria-label={`Mở Flow instance ${row.flowInstanceId}`}
                        data-testid={`p5-runtime-open-instance-${row.flowInstanceId}`}
                        endIcon={<ArrowForwardOutlinedIcon />}
                        disabled={
                          !isRuntimeCapabilityEnabled(
                            row.capabilities.canViewOverview,
                          )
                        }
                        title={
                          isRuntimeCapabilityEnabled(
                            row.capabilities.canViewOverview,
                          )
                            ? undefined
                            : "Server không cấp canViewOverview; bị khóa fail-closed."
                        }
                        onClick={() => onOpenInstance(row.flowInstanceId, "overview")}
                      >
                        Mở
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                <InboxOutlinedIcon fontSize="small" />
                <Typography variant="subtitle2">Inbox Flow toàn cục của tôi</Typography>
              </Stack>
              <TextField
                select
                size="small"
                label="Trạng thái inbox do server lọc"
                value={inboxState}
                onChange={(event) =>
                  setInboxState(event.target.value as DynamicFlowRuntimeStepState)
                }
                sx={{ mb: 1, minWidth: 220 }}
              >
                {INBOX_STATES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              {!inbox.isLoading && inboxRows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Inbox actor không có bước {inboxState} hiển thị.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {inboxRows.map((row) => (
                    <Stack
                      key={`${row.stepInstanceId}:${row.branchId}:${row.attemptNo}`}
                      data-testid={`p5-runtime-inbox-${row.stepInstanceId}-${row.attemptNo}`}
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      justifyContent="space-between"
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
                          {row.flowStepCode} · nhánh {row.branchId} · lần {row.attemptNo}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                          Work {row.workId}
                        </Typography>
                        <DynamicFlowRuntimeStateBadge state={row.state} />
                      </Box>
                      <Button
                        size="small"
                        aria-label={`Mở việc ${row.stepInstanceId} nhánh ${row.branchId} lần ${row.attemptNo}`}
                        data-testid={`p5-runtime-open-inbox-${row.stepInstanceId}-${row.attemptNo}`}
                        onClick={() =>
                          onOpenInstance(row.flowInstanceId, "work-to-do", row.workId, {
                            stepInstanceId: row.stepInstanceId,
                            branchId: row.branchId,
                            attemptNo: row.attemptNo,
                            assignmentId: row.assignmentId,
                            reportId: row.reportId,
                          })
                        }
                      >
                        Mở việc
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>

          {(periodic.data?.length ?? 0) > 0 ? (
            <Box component="section" aria-label="Lịch Flow định kỳ">
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                FLOW-T10 định kỳ
              </Typography>
              <Stack spacing={1}>
                {(periodic.data ?? []).map((schedule) => (
                  <PeriodicScheduleRow
                    key={schedule.scheduleId}
                    workId={workId}
                    schedule={schedule}
                    onOpenInstance={onOpenInstance}
                  />
                ))}
              </Stack>
            </Box>
          ) : null}

          <Alert severity="info">
            FLOW-T01..T12 đã có runtime production qua catalog 1.3 được niêm phong · mapping/source rules:
            P7 · statistics/aggregation: P8.
          </Alert>
        </Stack>
      </CardContent>

      <DynamicFlowLaunchWizard
        open={wizardOpen}
        workId={workId}
        onClose={() => setWizardOpen(false)}
        onOpenedInstance={(instanceId) => {
          setWizardOpen(false);
          onOpenInstance(instanceId, "overview");
        }}
      />
    </Card>
  );
}
