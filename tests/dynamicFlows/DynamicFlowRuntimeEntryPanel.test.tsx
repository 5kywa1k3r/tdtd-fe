import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  instancesHook: vi.fn(),
  inboxHook: vi.fn(),
  schedulesHook: vi.fn(),
  occurrencesHook: vi.fn(),
  rerunHook: vi.fn(),
}));

vi.mock("../../src/stores/authStorage", () => ({
  getMeSnapshot: () => ({ id: "actor-1" }),
}));

vi.mock("../../src/api/dynamicFlowRuntimeApi", async () => {
  const actual = await vi.importActual<typeof import("../../src/api/dynamicFlowRuntimeApi")>(
    "../../src/api/dynamicFlowRuntimeApi",
  );
  return {
    ...actual,
    useGetDynamicFlowRuntimeInstancesQuery: mocks.instancesHook,
    useGetDynamicFlowRuntimeInboxQuery: mocks.inboxHook,
    useGetDynamicFlowPeriodicSchedulesQuery: mocks.schedulesHook,
    useGetDynamicFlowPeriodicOccurrencesQuery: mocks.occurrencesHook,
    useRerunDynamicFlowPeriodicOccurrenceMutation: mocks.rerunHook,
  };
});

vi.mock("../../src/components/works/flowRuntime/DynamicFlowLaunchWizard", () => ({
  default: () => null,
}));

import DynamicFlowRuntimeEntryPanel from "../../src/components/works/flowRuntime/DynamicFlowRuntimeEntryPanel";

beforeEach(() => {
  mocks.instancesHook.mockReset();
  mocks.inboxHook.mockReset();
  mocks.schedulesHook.mockReset();
  mocks.occurrencesHook.mockReset();
  mocks.rerunHook.mockReset();
  mocks.instancesHook.mockReturnValue({
    data: {
      items: [
        {
          workId: "work-1",
          flowInstanceId: "instance-readonly",
          flowTemplateVersionNo: 2,
          periodKey: "2026-07",
          state: "ACTIVE",
          capabilities: { canViewOverview: false },
        },
      ],
    },
    isLoading: false,
    error: null,
  });
  mocks.inboxHook.mockReturnValue({
    data: {
      items: [
        {
          workId: "work-2",
          flowInstanceId: "instance-2",
          stepInstanceId: "step-instance-2",
          flowStepCode: "REPORT",
          branchId: "branch-2",
          attemptNo: 3,
          assignmentId: "assignment-2",
          reportId: "report-2",
          state: "ASSIGNED",
        },
      ],
    },
    isLoading: false,
    error: null,
  });
  mocks.schedulesHook.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  });
  mocks.occurrencesHook.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  });
  mocks.rerunHook.mockReturnValue([
    vi.fn(),
    { isLoading: false },
  ]);
});

describe("DynamicFlowRuntimeEntryPanel", () => {
  it("fails closed on overview capability and keeps inbox state/identity server driven", async () => {
    const onOpenInstance = vi.fn();
    render(
      <DynamicFlowRuntimeEntryPanel
        workId="work-1"
        onOpenInstance={onOpenInstance}
      />,
    );

    expect(
      screen.getByTestId("p5-runtime-open-instance-instance-readonly"),
    ).toBeDisabled();
    expect(mocks.inboxHook).toHaveBeenLastCalledWith(
      { state: "ASSIGNED", limit: 25 },
      { skip: false },
    );

    fireEvent.mouseDown(
      screen.getByRole("combobox", { name: /Trạng thái inbox do server lọc/i }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Đang thực hiện" }));
    await waitFor(() =>
      expect(mocks.inboxHook).toHaveBeenLastCalledWith(
        { state: "IN_PROGRESS", limit: 25 },
        { skip: false },
      ),
    );

    fireEvent.click(screen.getByTestId("p5-runtime-open-inbox-step-instance-2-3"));
    expect(onOpenInstance).toHaveBeenCalledWith(
      "instance-2",
      "work-to-do",
      "work-2",
      {
        stepInstanceId: "step-instance-2",
        branchId: "branch-2",
        attemptNo: 3,
        assignmentId: "assignment-2",
        reportId: "report-2",
      },
    );
  });

  it("shows timezone and missed period with the server rerun action", () => {
    const rerun = vi.fn();
    mocks.schedulesHook.mockReturnValue({
      data: [
        {
          scheduleId: "schedule-1",
          workId: "work-1",
          flowTemplateVersionId: "version-10",
          flowTemplateVersionNo: 10,
          scheduleKey: "daily-report",
          timeZoneId: "SE Asia Standard Time",
          normalizedTimeZoneId: "Asia/Bangkok",
          cadence: "DAILY",
          localTime: "08:00",
          policyVersion: "P6-PERIODIC-1",
          scheduleIdentityHash: "a".repeat(64),
          nextDueAtUtc: "2026-07-28T01:00:00Z",
          state: "ACTIVE",
          revision: 2,
        },
      ],
      isLoading: false,
      error: null,
    });
    mocks.occurrencesHook.mockReturnValue({
      data: [
        {
          occurrenceId: "occurrence-1",
          scheduleId: "schedule-1",
          workId: "work-1",
          periodKey: "2026-07-27",
          timeZoneId: "Asia/Bangkok",
          policyVersion: "P6-PERIODIC-1",
          scheduledAtUtc: "2026-07-27T01:00:00Z",
          observedAtUtc: "2026-07-27T02:00:00Z",
          state: "MISSED",
          reasonCode: "MISSED_NO_CATCH_UP",
          flowInstanceId: null,
          manualCommandIds: [],
          revision: 1,
        },
      ],
      isLoading: false,
      error: null,
    });
    mocks.rerunHook.mockReturnValue([
      rerun,
      { isLoading: false },
    ]);

    render(
      <DynamicFlowRuntimeEntryPanel
        workId="work-1"
        onOpenInstance={vi.fn()}
      />,
    );

    expect(screen.getByText(/Múi giờ Asia\/Bangkok/i)).toBeVisible();
    expect(
      screen.getByTestId("p6-periodic-missed-2026-07-27"),
    ).toHaveTextContent("MISSED_NO_CATCH_UP");
    fireEvent.click(
      screen.getByRole("button", { name: "Chạy lại kỳ này" }),
    );
    expect(rerun).toHaveBeenCalledWith(
      expect.objectContaining({
        workId: "work-1",
        scheduleId: "schedule-1",
        periodKey: "2026-07-27",
        body: {
          commandId: expect.stringMatching(/^flow-runtime-/),
        },
      }),
    );
  });
});
