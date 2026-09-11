import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, it, vi } from "vitest";

const { baseQueryMock } = vi.hoisted(() => ({ baseQueryMock: vi.fn() }));

vi.mock("../../src/api/base/axiosBaseQuery", () => ({
  axiosBaseQuery: () => (request: unknown) => baseQueryMock(request),
}));

import { baseApi } from "../../src/api/base/baseApi";
import {
  canConfirmDynamicFlowRuntime,
  canOpenDynamicFlowRuntimeAssignment,
  canOpenDynamicFlowRuntimeReport,
  canReviewDynamicFlowRuntimeReport,
  canSubmitDynamicFlowRuntimeReport,
  dynamicFlowRuntimeApi,
  type DynamicFlowConfirmRequest,
  type DynamicFlowPreflightResponse,
} from "../../src/api/dynamicFlowRuntimeApi";

function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  });
}

afterEach(() => {
  baseQueryMock.mockReset();
});

describe("dynamic Flow runtime API requests", () => {
  it("replays confirm with the exact same command and snapshot identity", async () => {
    baseQueryMock.mockResolvedValue({
      data: {
        commandId: "command-stable-1",
        requestHash: "request-hash-1",
        snapshotToken: "snapshot-token-1",
        status: "MATERIALIZING",
        businessWritePerformed: true,
        flowInstanceId: "instance-1",
        instanceState: "MATERIALIZING",
        stepInstanceIds: [],
        assignmentIds: [],
      },
    });
    const store = makeStore();
    const preflightBody = {
      flowTemplateVersionId: "version-locked-12",
      commandId: "command-stable-1",
      targetUnitIds: ["unit-a", "unit-b"],
      periodKey: "2026-07",
      scheduleIdentityJson: '{"cycle":"MONTHLY","day":24}',
    };
    const confirmBody: DynamicFlowConfirmRequest = {
      ...preflightBody,
      snapshotToken: "snapshot-token-1",
    };

    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.preflightDynamicFlowRuntime.initiate({
        workId: "work / 1",
        body: preflightBody,
        limit: 2,
        cursor: "opaque+/=cursor",
      }),
    ).unwrap();
    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.confirmDynamicFlowRuntime.initiate({
        workId: "work / 1",
        body: confirmBody,
      }),
    ).unwrap();
    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.confirmDynamicFlowRuntime.initiate({
        workId: "work / 1",
        body: { ...confirmBody },
      }),
    ).unwrap();

    expect(baseQueryMock.mock.calls.map(([request]) => request)).toEqual([
      {
        url: "/works/work%20%2F%201/dynamic-flows/preflight",
        method: "POST",
        data: preflightBody,
        params: { limit: 2, cursor: "opaque+/=cursor" },
      },
      {
        url: "/works/work%20%2F%201/dynamic-flows/confirm",
        method: "POST",
        data: confirmBody,
      },
      {
        url: "/works/work%20%2F%201/dynamic-flows/confirm",
        method: "POST",
        data: confirmBody,
      },
    ]);
    expect(JSON.stringify(baseQueryMock.mock.calls[1][0].data)).toBe(
      JSON.stringify(baseQueryMock.mock.calls[2][0].data),
    );
    expect(confirmBody).not.toHaveProperty("flowRole");
    expect(confirmBody).not.toHaveProperty("capabilities");
    expect(confirmBody).not.toHaveProperty("actorUserId");
  });

  it("passes actor-bound cursors through unchanged to canonical read routes", async () => {
    baseQueryMock.mockResolvedValue({ data: { items: [], total: 0, limit: 2, hasMore: false, nextCursor: null } });
    const store = makeStore();
    const cursor = "opaque.HMAC+/=cursor";

    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.getDynamicFlowRuntimeInstances.initiate({
        workId: "work-1",
        state: "ACTIVE",
        limit: 2,
        cursor,
      }),
    ).unwrap();
    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.getDynamicFlowRuntimeSteps.initiate({
        workId: "work-1",
        instanceId: "instance / 1",
        limit: 2,
        cursor,
      }),
    ).unwrap();
    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.getDynamicFlowRuntimeInbox.initiate({
        state: "ASSIGNED",
        limit: 2,
        cursor,
      }),
    ).unwrap();
    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.getDynamicFlowRuntimeTimeline.initiate({
        workId: "work-1",
        instanceId: "instance / 1",
        limit: 2,
        cursor,
      }),
    ).unwrap();
    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.getDynamicFlowRuntimeRecovery.initiate({
        workId: "work-1",
        instanceId: "instance / 1",
      }),
    ).unwrap();

    expect(baseQueryMock.mock.calls.map(([request]) => request)).toEqual([
      {
        url: "/works/work-1/dynamic-flows/instances",
        method: "GET",
        params: { state: "ACTIVE", limit: 2, cursor },
      },
      {
        url: "/works/work-1/dynamic-flows/instances/instance%20%2F%201/steps",
        method: "GET",
        params: { limit: 2, cursor },
      },
      {
        url: "/dynamic-flows/inbox",
        method: "GET",
        params: { state: "ASSIGNED", limit: 2, cursor },
      },
      {
        url: "/works/work-1/dynamic-flows/instances/instance%20%2F%201/timeline",
        method: "GET",
        params: { limit: 2, cursor },
      },
      {
        url: "/works/work-1/dynamic-flows/instances/instance%20%2F%201/recovery",
        method: "GET",
      },
    ]);
  });

  it("replays FLOW-T03 forward with the exact command and CAS body", async () => {
    baseQueryMock.mockResolvedValue({
      data: {
        commandId: "forward-command-1",
        status: "ACCEPTED_PENDING_MATERIALIZATION",
        businessWritePerformed: true,
        replayed: false,
        flowInstanceId: "instance-1",
        executionEpoch: 1,
        instanceRevision: 8,
        stepInstanceId: "step-a",
        nextStepInstanceId: "step-b",
        nextAssignmentId: "assignment-b",
        activatedTransitionId: "transition-a-b",
        eventId: "event-a-b",
      },
    });
    const store = makeStore();
    const body = {
      commandId: "forward-command-1",
      expectedInstanceRevision: 7,
      expectedStepRevision: 4,
    };
    const args = {
      workId: "work / 1",
      instanceId: "instance-1",
      assignmentId: "assignment / a",
      body,
    };

    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.forwardDynamicFlowRuntimeStep.initiate(args),
    ).unwrap();
    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.forwardDynamicFlowRuntimeStep.initiate({
        ...args,
        body: { ...body },
      }),
    ).unwrap();

    expect(baseQueryMock.mock.calls.map(([request]) => request)).toEqual([
      {
        url: "/works/work%20%2F%201/dynamic-flows/assignments/assignment%20%2F%20a/forward",
        method: "POST",
        data: body,
      },
      {
        url: "/works/work%20%2F%201/dynamic-flows/assignments/assignment%20%2F%20a/forward",
        method: "POST",
        data: body,
      },
    ]);
  });

  it("replays FLOW-T09 child launch on the exact parent step route and CAS body", async () => {
    baseQueryMock.mockResolvedValue({
      data: {
        commandId: "subflow-command-1",
        status: "MATERIALIZED",
        businessWritePerformed: true,
        replayed: false,
        parentInstanceId: "parent-1",
        parentStepInstanceId: "parent-step-1",
        childInstanceId: "child-1",
        childFlowTemplateId: "child-family-1",
        childFlowVersionId: "child-version-3",
        ancestryDepth: 1,
        parentState: "WAITING_CHILD",
        childState: "ACTIVE",
        eventId: "event-child-1",
      },
    });
    const store = makeStore();
    const body = {
      commandId: "subflow-command-1",
      expectedParentInstanceRevision: 7,
      expectedParentStepRevision: 4,
    };
    const args = {
      workId: "work / 1",
      parentInstanceId: "parent / 1",
      parentStepInstanceId: "step / 1",
      body,
    };

    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.launchDynamicFlowRuntimeSubflow.initiate(args),
    ).unwrap();
    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.launchDynamicFlowRuntimeSubflow.initiate({
        ...args,
        body: { ...body },
      }),
    ).unwrap();

    expect(baseQueryMock.mock.calls.map(([request]) => request)).toEqual([
      {
        url: "/works/work%20%2F%201/dynamic-flows/instances/parent%20%2F%201/steps/step%20%2F%201/subflow",
        method: "POST",
        data: body,
      },
      {
        url: "/works/work%20%2F%201/dynamic-flows/instances/parent%20%2F%201/steps/step%20%2F%201/subflow",
        method: "POST",
        data: body,
      },
    ]);
  });

  it("uses server-owned FLOW-T10 schedule, occurrence, and rerun routes", async () => {
    baseQueryMock.mockResolvedValue({ data: [] });
    const store = makeStore();
    const createBody = {
      flowTemplateVersionId: "version-10",
      commandId: "schedule-command-1",
      targetUnitIds: ["unit-1"],
      timeZoneId: "Asia/Ho_Chi_Minh",
      localTime: "08:00",
      effectiveFromUtc: "2026-07-27T00:00:00Z",
    };

    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.createDynamicFlowPeriodicSchedule.initiate({
        workId: "work / 1",
        body: createBody,
      }),
    ).unwrap();
    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.getDynamicFlowPeriodicSchedules.initiate({
        workId: "work / 1",
      }),
    ).unwrap();
    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.getDynamicFlowPeriodicOccurrences.initiate({
        workId: "work / 1",
        scheduleId: "schedule / 1",
      }),
    ).unwrap();
    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.rerunDynamicFlowPeriodicOccurrence.initiate({
        workId: "work / 1",
        scheduleId: "schedule / 1",
        periodKey: "2026-07-27",
        body: { commandId: "manual-rerun-1" },
      }),
    ).unwrap();

    expect(baseQueryMock.mock.calls.map(([request]) => request)).toEqual([
      {
        url: "/works/work%20%2F%201/dynamic-flows/periodic-schedules",
        method: "POST",
        data: createBody,
      },
      {
        url: "/works/work%20%2F%201/dynamic-flows/periodic-schedules",
        method: "GET",
      },
      {
        url:
          "/works/work%20%2F%201/dynamic-flows/periodic-schedules/" +
          "schedule%20%2F%201/occurrences",
        method: "GET",
      },
      {
        url:
          "/works/work%20%2F%201/dynamic-flows/periodic-schedules/" +
          "schedule%20%2F%201/occurrences/2026-07-27/rerun",
        method: "POST",
        data: { commandId: "manual-rerun-1" },
      },
      {
        url:
          "/works/work%20%2F%201/dynamic-flows/periodic-schedules/" +
          "schedule%20%2F%201/occurrences",
        method: "GET",
      },
    ]);
  });

  it("uses exact FLOW-T11 supplemental add and cancel identities", async () => {
    baseQueryMock.mockResolvedValue({
      data: {
        commandId: "supplemental-command",
        status: "SUPPLEMENTAL_STEP_ADDED",
        businessWritePerformed: true,
        replayed: false,
        flowInstanceId: "instance-1",
        executionEpoch: 2,
        instanceRevision: 8,
        supplementalStepId: "supplemental-1",
        stepInstanceId: "supplemental-1",
        assignmentId: "assignment-1",
        completionRequired: true,
        state: "ASSIGNED",
        eventId: "event-1",
      },
    });
    const store = makeStore();
    const addBody = {
      commandId: "supplemental-command",
      expectedInstanceRevision: 7,
      formNodeId: "form / node",
      targetUnitId: "unit-1",
      completionRequired: true,
    };
    const cancelBody = {
      commandId: "supplemental-cancel-command",
      expectedInstanceRevision: 8,
      expectedStepRevision: 2,
      reason: "No longer required",
    };

    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.addDynamicFlowRuntimeSupplementalStep.initiate({
        workId: "work / 1",
        instanceId: "instance / 1",
        body: addBody,
      }),
    ).unwrap();
    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.cancelDynamicFlowRuntimeSupplementalStep.initiate({
        workId: "work / 1",
        instanceId: "instance / 1",
        supplementalStepId: "supplemental / 1",
        body: cancelBody,
      }),
    ).unwrap();

    expect(baseQueryMock.mock.calls.map(([request]) => request)).toEqual([
      {
        url:
          "/works/work%20%2F%201/dynamic-flows/instances/" +
          "instance%20%2F%201/supplemental-steps",
        method: "POST",
        data: addBody,
      },
      {
        url:
          "/works/work%20%2F%201/dynamic-flows/instances/" +
          "instance%20%2F%201/supplemental-steps/" +
          "supplemental%20%2F%201/cancel",
        method: "POST",
        data: cancelBody,
      },
    ]);
    expect(addBody).not.toHaveProperty("actorUserId");
    expect(addBody).not.toHaveProperty("capabilities");
  });

  it("uses the exact FLOW-T12 instance epoch command route and CAS body", async () => {
    baseQueryMock.mockResolvedValue({
      data: {
        commandId: "epoch-command-1",
        action: "EPOCH_ROLLBACK",
        flowInstanceId: "instance-1",
        previousExecutionEpoch: 2,
        executionEpoch: 3,
        instanceRevision: 12,
        instanceState: "ACTIVE",
        eventId: "event-epoch-1",
        rebuildIntentId: "intent-1",
        invalidatedStepCount: 1,
        invalidatedGatewayCount: 0,
        invalidatedAssignmentCount: 1,
        invalidatedReportCount: 0,
        businessWritePerformed: true,
        replayed: false,
      },
    });
    const store = makeStore();
    const body = {
      commandId: "epoch-command-1",
      expectedExecutionEpoch: 2,
      expectedInstanceRevision: 11,
      checkpointNodeId: "entry",
    };

    await store.dispatch(
      dynamicFlowRuntimeApi.endpoints.executeDynamicFlowEpochCommand.initiate({
        workId: "work / 1",
        instanceId: "instance / 1",
        action: "rollback",
        body,
      }),
    ).unwrap();

    expect(baseQueryMock.mock.calls[0][0]).toEqual({
      url:
        "/works/work%20%2F%201/dynamic-flows/instances/" +
        "instance%20%2F%201/rollback",
      method: "POST",
      data: body,
    });
    expect(body).not.toHaveProperty("actorUserId");
    expect(body).not.toHaveProperty("capabilities");
  });
});

describe("dynamic Flow runtime server capability guards", () => {
  it("fails closed unless preview eligibility, command, and snapshot are all server-confirmed", () => {
    const eligible = {
      eligibility: "ELIGIBLE_CANDIDATE",
      blockedUntilPhase: null,
      commandId: "command-1",
      snapshotToken: "snapshot-1",
      flowPin: { archetypeId: "FLOW-T01" },
    } as DynamicFlowPreflightResponse;

    expect(canConfirmDynamicFlowRuntime(eligible)).toBe(true);
    expect(canConfirmDynamicFlowRuntime({ ...eligible, eligibility: "BLOCKED_PHASE" })).toBe(false);
    expect(canConfirmDynamicFlowRuntime({ ...eligible, blockedUntilPhase: "P6" })).toBe(false);
    expect(
      canConfirmDynamicFlowRuntime({
        ...eligible,
        flowPin: { ...eligible.flowPin, archetypeId: "FLOW-T03" },
      }),
    ).toBe(true);
    expect(
      canConfirmDynamicFlowRuntime({
        ...eligible,
        flowPin: { ...eligible.flowPin, archetypeId: "FLOW-T04" },
      }),
    ).toBe(true);
    expect(
      canConfirmDynamicFlowRuntime({
        ...eligible,
        flowPin: { ...eligible.flowPin, archetypeId: "FLOW-T05" },
      }),
    ).toBe(true);
    expect(
      canConfirmDynamicFlowRuntime({
        ...eligible,
        flowPin: { ...eligible.flowPin, archetypeId: "FLOW-T06" },
      }),
    ).toBe(true);
    expect(
      canConfirmDynamicFlowRuntime({
        ...eligible,
        flowPin: { ...eligible.flowPin, archetypeId: "FLOW-T07" },
      }),
    ).toBe(true);
    expect(
      canConfirmDynamicFlowRuntime({
        ...eligible,
        flowPin: { ...eligible.flowPin, archetypeId: "FLOW-T08" },
      }),
    ).toBe(true);
    expect(
      canConfirmDynamicFlowRuntime({
        ...eligible,
        flowPin: { ...eligible.flowPin, archetypeId: "FLOW-T09" },
      }),
    ).toBe(true);
    expect(
      canConfirmDynamicFlowRuntime({
        ...eligible,
        flowPin: { ...eligible.flowPin, archetypeId: "FLOW-T10" },
      }),
    ).toBe(false);
    expect(
      canConfirmDynamicFlowRuntime({
        ...eligible,
        flowPin: { ...eligible.flowPin, archetypeId: "FLOW-T11" },
      }),
    ).toBe(true);
    expect(
      canConfirmDynamicFlowRuntime({
        ...eligible,
        flowPin: { ...eligible.flowPin, archetypeId: "FLOW-T12" },
      }),
    ).toBe(true);
    expect(canConfirmDynamicFlowRuntime({ ...eligible, commandId: "" })).toBe(false);
    expect(canConfirmDynamicFlowRuntime({ ...eligible, snapshotToken: "" })).toBe(false);
    expect(canConfirmDynamicFlowRuntime(undefined)).toBe(false);
  });

  it("requires an exact authorized target as well as the literal server capability", () => {
    const base = {
      assignmentId: "assignment-1",
      reportId: "report-open",
      reportIds: ["report-open", "report-submit", "report-review"],
      submitReportId: "report-submit",
      reviewReportId: "report-review",
      capabilities: {
        canOpenAssignment: true,
        canOpenReport: true,
        canSubmitReport: true,
        canReviewReport: true,
      },
    };

    expect(canOpenDynamicFlowRuntimeAssignment(base)).toBe(true);
    expect(canOpenDynamicFlowRuntimeReport(base)).toBe(true);
    expect(canSubmitDynamicFlowRuntimeReport(base)).toBe(true);
    expect(canReviewDynamicFlowRuntimeReport(base)).toBe(true);

    expect(canOpenDynamicFlowRuntimeAssignment({ ...base, capabilities: null })).toBe(false);
    expect(canOpenDynamicFlowRuntimeReport({ ...base, reportIds: [] })).toBe(false);
    expect(canSubmitDynamicFlowRuntimeReport({ ...base, submitReportId: "other-report" })).toBe(false);
    expect(canReviewDynamicFlowRuntimeReport({
      ...base,
      capabilities: { ...base.capabilities, canReviewReport: false },
    })).toBe(false);
  });
});
