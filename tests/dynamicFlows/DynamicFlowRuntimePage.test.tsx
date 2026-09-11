import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  overviewData: undefined as unknown,
  overviewError: undefined as unknown,
  overviewLoading: false,
  recoveryData: undefined as unknown,
  recoveryError: undefined as unknown,
  recoveryLoading: false,
  stepsData: undefined as unknown,
  stepsError: undefined as unknown,
  stepsLoading: false,
  timelineData: undefined as unknown,
  timelineError: undefined as unknown,
  timelineLoading: false,
  overviewHook: vi.fn(),
  recoveryHook: vi.fn(),
  stepsHook: vi.fn(),
  timelineHook: vi.fn(),
  overviewRefetch: vi.fn(),
  recoveryRefetch: vi.fn(),
  stepsRefetch: vi.fn(),
  timelineRefetch: vi.fn(),
  forwardStep: vi.fn(),
  forwardResult: undefined as unknown,
  forwardError: undefined as unknown,
  forwardLoading: false,
  forwardReset: vi.fn(),
  launchSubflow: vi.fn(),
  subflowResult: undefined as unknown,
  subflowError: undefined as unknown,
  subflowLoading: false,
  subflowReset: vi.fn(),
  addSupplemental: vi.fn(),
  addSupplementalResult: undefined as unknown,
  addSupplementalError: undefined as unknown,
  addSupplementalLoading: false,
  addSupplementalReset: vi.fn(),
  cancelSupplemental: vi.fn(),
  cancelSupplementalResult: undefined as unknown,
  cancelSupplementalError: undefined as unknown,
  cancelSupplementalLoading: false,
  cancelSupplementalReset: vi.fn(),
  executeEpoch: vi.fn(),
  epochResult: undefined as unknown,
  epochError: undefined as unknown,
  epochLoading: false,
  epochReset: vi.fn(),
  completeAssignment: vi.fn(),
  completeReset: vi.fn(),
}));

vi.mock("../../src/api/workAssignmentApi", () => ({
  useCompleteWorkAssignmentMutation: () => [
    mocks.completeAssignment,
    { reset: mocks.completeReset, isLoading: false },
  ],
}));

vi.mock("../../src/api/dynamicFlowRuntimeApi", async () => {
  const actual = await vi.importActual<typeof import("../../src/api/dynamicFlowRuntimeApi")>(
    "../../src/api/dynamicFlowRuntimeApi",
  );
  return {
    ...actual,
    useGetDynamicFlowRuntimeInstanceQuery: (args: unknown, options: unknown) => {
      mocks.overviewHook(args, options);
      return {
        data: mocks.overviewData,
        error: mocks.overviewError,
        isLoading: mocks.overviewLoading,
        isFetching: false,
        refetch: mocks.overviewRefetch,
      };
    },
    useGetDynamicFlowRuntimeRecoveryQuery: (args: unknown, options: unknown) => {
      mocks.recoveryHook(args, options);
      return {
        data: mocks.recoveryData,
        error: mocks.recoveryError,
        isLoading: mocks.recoveryLoading,
        isFetching: false,
        refetch: mocks.recoveryRefetch,
      };
    },
    useGetDynamicFlowRuntimeStepsQuery: (args: unknown, options: unknown) => {
      mocks.stepsHook(args, options);
      return {
        data: mocks.stepsData,
        error: mocks.stepsError,
        isLoading: mocks.stepsLoading,
        isFetching: false,
        refetch: mocks.stepsRefetch,
      };
    },
    useGetDynamicFlowRuntimeTimelineQuery: (args: unknown, options: unknown) => {
      mocks.timelineHook(args, options);
      return {
        data: mocks.timelineData,
        error: mocks.timelineError,
        isLoading: mocks.timelineLoading,
        isFetching: false,
        refetch: mocks.timelineRefetch,
      };
    },
    useForwardDynamicFlowRuntimeStepMutation: () => [
      mocks.forwardStep,
      {
        data: mocks.forwardResult,
        error: mocks.forwardError,
        isLoading: mocks.forwardLoading,
        reset: mocks.forwardReset,
      },
    ],
    useLaunchDynamicFlowRuntimeSubflowMutation: () => [
      mocks.launchSubflow,
      {
        data: mocks.subflowResult,
        error: mocks.subflowError,
        isLoading: mocks.subflowLoading,
        reset: mocks.subflowReset,
      },
    ],
    useAddDynamicFlowRuntimeSupplementalStepMutation: () => [
      mocks.addSupplemental,
      {
        data: mocks.addSupplementalResult,
        error: mocks.addSupplementalError,
        isLoading: mocks.addSupplementalLoading,
        reset: mocks.addSupplementalReset,
      },
    ],
    useCancelDynamicFlowRuntimeSupplementalStepMutation: () => [
      mocks.cancelSupplemental,
      {
        data: mocks.cancelSupplementalResult,
        error: mocks.cancelSupplementalError,
        isLoading: mocks.cancelSupplementalLoading,
        reset: mocks.cancelSupplementalReset,
      },
    ],
    useExecuteDynamicFlowEpochCommandMutation: () => [
      mocks.executeEpoch,
      {
        data: mocks.epochResult,
        error: mocks.epochError,
        isLoading: mocks.epochLoading,
        reset: mocks.epochReset,
      },
    ],
  };
});

vi.mock("../../src/pages/works/report/WorkReportEditorPage", () => ({
  default: ({
    workId,
    reportId,
    forceReadOnly,
    dynamicFlowRuntimeEnabled,
  }: {
    workId: string;
    reportId: string;
    forceReadOnly?: boolean;
    dynamicFlowRuntimeEnabled?: boolean;
  }) => (
    <output data-testid="p3-report-renderer">
      {workId}:{reportId}:{forceReadOnly ? "readonly" : "writable"}:{dynamicFlowRuntimeEnabled ? "mapping-owner" : "plain"}
    </output>
  ),
}));

import type {
  DynamicFlowRuntimeCapabilities,
  DynamicFlowRuntimeInstanceOverview,
  DynamicFlowRuntimeRecovery,
  DynamicFlowRuntimeStepRow,
} from "../../src/api/dynamicFlowRuntimeApi";
import DynamicFlowRuntimePage from "../../src/pages/works/flowRuntime/DynamicFlowRuntimePage";
import { dynamicFlowRuntimePath } from "../../src/routes/dynamicFlowRoutes";

const noCapabilities: DynamicFlowRuntimeCapabilities = {
  canViewOverview: false,
  canViewTimeline: false,
  canViewAllBranches: false,
  canOpenAssignment: false,
  canOpenReport: false,
  canSubmitReport: false,
  canReviewReport: false,
  canRetry: false,
  canReconcile: false,
  canForward: false,
  canLaunchSubflow: false,
  canFinalize: false,
  canRollback: false,
  canTerminate: false,
  canRestart: false,
  expectedRevision: 7,
};

function makeRecovery(
  overrides: Partial<DynamicFlowRuntimeRecovery> = {},
): DynamicFlowRuntimeRecovery {
  return {
    state: "ACTIVE",
    recoveryRequired: false,
    statusText: "Không cần recovery",
    reasonCode: "",
    nextAction: "NONE",
    attemptCount: 0,
    lastAttemptAtUtc: null,
    nextAttemptAtUtc: null,
    reconcileStatus: "IDLE",
    expectedRevision: 7,
    revisionToken: "revision-token-7",
    canRetry: false,
    canReconcile: false,
    ...overrides,
  };
}

function makeOverview(
  capabilityOverrides: Partial<DynamicFlowRuntimeCapabilities> = {},
  overrides: Partial<DynamicFlowRuntimeInstanceOverview> = {},
): DynamicFlowRuntimeInstanceOverview {
  return {
    workId: "work-1",
    flowInstanceId: "instance-1",
    flowTemplateId: "flow-family-1",
    flowTemplateVersionId: "flow-version-12",
    flowTemplateVersionNo: 12,
    archetypeId: "FLOW-T03",
    definitionRevision: "definition-revision-12",
    topologySnapshotHash: "topology-hash-12",
    executionEpoch: 1,
    entryFlowStepId: "step-definition-1",
    periodKey: "2026-07",
    scheduleIdentityHash: "schedule-hash",
    participantSnapshotId: "participant-snapshot-1",
    parentInstanceId: null,
    parentStepInstanceId: null,
    rootInstanceId: null,
    ancestryPath: [],
    state: "ACTIVE",
    revision: 7,
    runtimeRecoveryEpoch: 1,
    revisionToken: "revision-token-7",
    visibleStepCount: 1,
    gateways: [],
    updatedAtUtc: "2026-07-24T03:00:00Z",
    visibilityScopes: ["REPORTER"],
    capabilities: { ...noCapabilities, ...capabilityOverrides },
    recovery: makeRecovery(),
    ...overrides,
  };
}

function makeStep(
  overrides: Partial<DynamicFlowRuntimeStepRow> = {},
): DynamicFlowRuntimeStepRow {
  return {
    workId: "work-1",
    flowInstanceId: "instance-1",
    flowStepDefinitionId: "step-definition-1",
    flowStepCode: "REPORT",
    stepOrder: 1,
    executionEpoch: 1,
    definitionRevision: "definition-revision-12",
    stepInstanceId: "step-instance-1",
    branchId: "branch-unit-a",
    parentBranchId: null,
    attemptNo: 1,
    reviewCycleNo: 1,
    maxReviewCycles: null,
    previousAttemptStepInstanceId: null,
    previousAttemptAssignmentId: null,
    supersededByStepInstanceId: null,
    isCanonicalAttempt: true,
    childInstanceId: null,
    childFlowTemplateId: null,
    childFlowVersionId: null,
    childState: null,
    childOutcomeCode: null,
    childLinkedAtUtc: null,
    activatedByTransitionId: null,
    gatewayInstanceId: null,
    gatewayVersion: null,
    contributionId: null,
    nextNodeIds: ["step-definition-2"],
    isTerminalNode: false,
    resultOwnerIdentity: "result-owner:step-definition-1",
    statisticOwnerIdentity: "statistics-owner:step-definition-1",
    targetUnitId: "unit-a",
    assignmentId: "assignment-1",
    reportId: "report-open",
    reportIds: ["report-open", "report-submit", "report-review"],
    submitReportId: "report-submit",
    reviewReportId: "report-review",
    formNodeId: "form-node-1",
    formFamilyId: "form-family-1",
    formVersionId: "form-version-3",
    formVersionNo: 3,
    formSchemaHash: "schema-hash",
    formSnapshotHash: "snapshot-hash",
    state: "ASSIGNED",
    revision: 4,
    revisionToken: "step-revision-4",
    updatedAtUtc: "2026-07-24T03:00:00Z",
    visibilityScopes: ["REPORTER"],
    capabilities: { ...noCapabilities },
    recovery: makeRecovery(),
    ...overrides,
  };
}

function renderPage(initialEntry: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/works/:workId/flow-instances/:instanceId/:tab?",
        element: <DynamicFlowRuntimePage />,
      },
      { path: "/works/:workId", element: <div>work detail</div> },
    ],
    { initialEntries: [initialEntry] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

beforeEach(() => {
  mocks.overviewData = makeOverview({ canViewOverview: true });
  mocks.overviewError = undefined;
  mocks.overviewLoading = false;
  mocks.recoveryData = makeRecovery();
  mocks.recoveryError = undefined;
  mocks.recoveryLoading = false;
  mocks.stepsData = { items: [], total: 0, limit: 25, hasMore: false, nextCursor: null };
  mocks.stepsError = undefined;
  mocks.stepsLoading = false;
  mocks.timelineData = { items: [], total: 0, limit: 25, hasMore: false, nextCursor: null };
  mocks.timelineError = undefined;
  mocks.timelineLoading = false;
  mocks.overviewHook.mockClear();
  mocks.recoveryHook.mockClear();
  mocks.stepsHook.mockClear();
  mocks.timelineHook.mockClear();
  mocks.overviewRefetch.mockClear();
  mocks.recoveryRefetch.mockClear();
  mocks.stepsRefetch.mockClear();
  mocks.timelineRefetch.mockClear();
  mocks.forwardStep.mockReset();
  mocks.forwardResult = undefined;
  mocks.forwardError = undefined;
  mocks.forwardLoading = false;
  mocks.forwardReset.mockClear();
  mocks.launchSubflow.mockReset();
  mocks.subflowResult = undefined;
  mocks.subflowError = undefined;
  mocks.subflowLoading = false;
  mocks.subflowReset.mockClear();
  mocks.addSupplemental.mockReset();
  mocks.addSupplementalResult = undefined;
  mocks.addSupplementalError = undefined;
  mocks.addSupplementalLoading = false;
  mocks.addSupplementalReset.mockClear();
  mocks.cancelSupplemental.mockReset();
  mocks.cancelSupplementalResult = undefined;
  mocks.cancelSupplementalError = undefined;
  mocks.cancelSupplementalLoading = false;
  mocks.cancelSupplementalReset.mockClear();
  mocks.executeEpoch.mockReset();
  mocks.epochResult = undefined;
  mocks.epochError = undefined;
  mocks.epochLoading = false;
  mocks.epochReset.mockClear();
  mocks.completeAssignment.mockReset();
  mocks.completeReset.mockClear();
});

describe("DynamicFlowRuntimePage", () => {
  it("renders a normalized forbidden state without leaking runtime details", () => {
    mocks.overviewData = undefined;
    mocks.overviewError = { status: 403 };

    renderPage("/works/work-1/flow-instances/instance-hidden/overview");

    expect(screen.getByText(/không có quyền xem tài nguyên Flow/i)).toBeInTheDocument();
    expect(screen.queryByText("participant-snapshot-1")).not.toBeInTheDocument();
    expect(screen.queryByText("flow-version-12")).not.toBeInTheDocument();
  });

  it("shows empty work-to-do without inventing actor affordances", () => {
    renderPage("/works/work-1/flow-instances/instance-1/work-to-do");

    expect(screen.getByText(/không có bước Flow hiển thị cho actor/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mở báo cáo|cần gửi|cần duyệt/i })).not.toBeInTheDocument();
  });

  it("shows RETRYING as server-owned state but exposes no retry, reconcile, or launch-new mutation", () => {
    mocks.overviewData = makeOverview(
      { canViewOverview: true, canRetry: true, canReconcile: true },
      { state: "RETRYING" },
    );
    mocks.recoveryData = makeRecovery({
      state: "RETRYING",
      recoveryRequired: true,
      statusText: "Đang thử lại cùng lệnh",
      nextAction: "WAIT_FOR_RETRY",
      attemptCount: 2,
      canRetry: true,
      canReconcile: true,
    });

    renderPage("/works/work-1/flow-instances/instance-1/overview");

    expect(screen.getAllByRole("status").some((node) => node.textContent?.includes("RETRYING"))).toBe(true);
    expect(screen.getByText(/máy chủ không công khai mutation retry\/reconcile/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry|reconcile|launch mới|khởi chạy mới/i })).not.toBeInTheDocument();
  });

  it("renders JOIN ALL collecting state and exact missing contributors", () => {
    mocks.overviewData = makeOverview(
      { canViewOverview: true },
      {
        archetypeId: "FLOW-T05",
        gateways: [
          {
            gatewayNodeId: "join-j",
            gatewayInstanceId: "gateway-1",
            gatewayVersion: 1,
            gatewayKind: "JOIN_ALL",
            state: "COLLECTING",
            revision: 2,
            downstreamNodeId: "final",
            expectedContributionIds: ["contribution-b", "contribution-c"],
            arrivedContributionIds: ["contribution-b"],
            missingContributionIds: ["contribution-c"],
            requiredContributionCount: 2,
            cancelledContributionIds: [],
            lateContributionIds: [],
            winnerContributionId: null,
            releasedAtUtc: null,
            updatedAtUtc: "2026-07-24T03:00:00Z",
          },
        ],
      },
    );

    renderPage("/works/work-1/flow-instances/instance-1/overview");

    expect(screen.getByTestId("p6-t05-join-all")).toHaveTextContent(/JOIN_ALL.*COLLECTING/i);
    expect(screen.getByTestId("p6-t05-missing-contributors")).toHaveTextContent(
      /Missing contributors \(1\).*contribution-c/i,
    );
  });

  it("renders quorum progress, winner, cancelled, late and impossible state", () => {
    mocks.overviewData = makeOverview(
      { canViewOverview: true },
      {
        archetypeId: "FLOW-T06",
        gateways: [
          {
            gatewayNodeId: "join-j",
            gatewayInstanceId: "gateway-1",
            gatewayVersion: 1,
            gatewayKind: "JOIN_ANY",
            state: "IMPOSSIBLE",
            revision: 4,
            downstreamNodeId: "final",
            expectedContributionIds: ["contribution-b", "contribution-c"],
            arrivedContributionIds: ["contribution-b"],
            missingContributionIds: [],
            requiredContributionCount: 1,
            cancelledContributionIds: ["contribution-c"],
            lateContributionIds: ["contribution-c"],
            winnerContributionId: "contribution-b",
            releasedAtUtc: "2026-07-24T03:00:00Z",
            updatedAtUtc: "2026-07-24T03:01:00Z",
          },
        ],
      },
    );

    renderPage("/works/work-1/flow-instances/instance-1/overview");

    expect(screen.getByTestId("p6-t06-join-quorum")).toHaveTextContent(
      /JOIN_ANY.*IMPOSSIBLE/i,
    );
    expect(screen.getByTestId("p6-t06-quorum-progress")).toHaveTextContent(
      /1\/1/i,
    );
    expect(screen.getByTestId("p6-t06-cancelled-contributors")).toHaveTextContent(
      /contribution-c/i,
    );
    expect(screen.getByTestId("p6-t06-late-contributors")).toHaveTextContent(
      /contribution-c/i,
    );
  });

  it("renders only the persisted typed conditional outcome and audit metadata", () => {
    mocks.overviewData = makeOverview(
      { canViewOverview: true },
      {
        archetypeId: "FLOW-T07",
        gateways: [
          {
            gatewayNodeId: "condition-g",
            gatewayInstanceId: "gateway-condition-1",
            gatewayVersion: 1,
            gatewayKind: "CONDITION",
            state: "SATISFIED",
            revision: 1,
            downstreamNodeId: "branch-approved",
            expectedContributionIds: [],
            arrivedContributionIds: [],
            missingContributionIds: [],
            requiredContributionCount: 1,
            cancelledContributionIds: [],
            lateContributionIds: [],
            winnerContributionId: null,
            inputSnapshotHash: "a".repeat(64),
            evaluatorVersion: "P6-TYPED-AST-1",
            selectedEdgeId: "edge-approved",
            decisionReasonCode: "DYNAMIC_FLOW_CONDITION_MATCHED",
            releasedAtUtc: "2026-07-27T03:00:00Z",
            updatedAtUtc: "2026-07-27T03:00:00Z",
          },
        ],
      },
    );

    renderPage("/works/work-1/flow-instances/instance-1/overview");

    const decision = screen.getByTestId("p6-t07-conditional-decision");
    expect(decision).toHaveTextContent(/CONDITION.*SATISFIED/i);
    expect(decision).toHaveTextContent(/P6-TYPED-AST-1.*edge-approved.*DYNAMIC_FLOW_CONDITION_MATCHED/i);
    expect(decision).toHaveTextContent("a".repeat(64));
    expect(decision).not.toHaveTextContent(/assignment\.|report\.|fact value/i);
  });

  it("renders T08 attempt lineage and keeps a superseded attempt readonly", async () => {
    const historical = makeStep({
      attemptNo: 1,
      reviewCycleNo: 1,
      maxReviewCycles: 3,
      supersededByStepInstanceId: "step-instance-2",
      isCanonicalAttempt: false,
      state: "RETURNED",
      capabilities: {
        ...noCapabilities,
        canOpenReport: true,
        canSubmitReport: true,
        canReviewReport: true,
      },
    });
    mocks.overviewData = makeOverview(
      { canViewOverview: true },
      { archetypeId: "FLOW-T08" },
    );
    mocks.stepsData = {
      items: [historical],
      total: 1,
      limit: 25,
      hasMore: false,
      nextCursor: null,
    };

    renderPage(dynamicFlowRuntimePath("work-1", "instance-1", "work-to-do", {
      stepInstanceId: historical.stepInstanceId,
      branchId: historical.branchId,
      attemptNo: historical.attemptNo,
      assignmentId: historical.assignmentId,
    }));

    expect(await screen.findByTestId("p6-t08-review-cycle")).toHaveTextContent(
      /1\/3.*attempt 1.*Readonly history.*step-instance-2.*Initial review attempt/i,
    );
    expect(
      screen.queryByRole("button", { name: /bÃ¡o cÃ¡o cáº§n gá»­i|bÃ¡o cÃ¡o cáº§n duyá»‡t/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("p3-report-renderer")).not.toBeInTheDocument();
  });

  it("renders exact T11 supplemental identity, policy, and server cancel capability", async () => {
    const supplemental = makeStep({
      isSupplemental: true,
      supplementalStepId: "supplemental-step-1",
      requestedByUserId: "coordinator-1",
      completionRequired: true,
      isSupplementalCancelled: false,
      capabilities: {
        ...noCapabilities,
        canCancelSupplemental: true,
        expectedRevision: 4,
      },
    });
    mocks.overviewData = makeOverview(
      {
        canViewOverview: true,
        canManageSupplemental: true,
        expectedRevision: 7,
      },
      { archetypeId: "FLOW-T11" },
    );
    mocks.stepsData = {
      items: [supplemental],
      total: 1,
      limit: 25,
      hasMore: false,
      nextCursor: null,
    };

    renderPage(
      dynamicFlowRuntimePath("work-1", "instance-1", "work-to-do", {
        stepInstanceId: supplemental.stepInstanceId,
        branchId: supplemental.branchId,
        attemptNo: supplemental.attemptNo,
        assignmentId: supplemental.assignmentId,
      }),
    );

    expect(
      await screen.findByTestId("p6-t11-supplemental-identity"),
    ).toHaveTextContent(
      /supplemental-step-1.*Required.*coordinator-1.*Active/i,
    );
    expect(screen.getByTestId("p6-t11-cancel")).toBeEnabled();
    expect(screen.queryByTestId("p6-t11-add-required")).not.toBeInTheDocument();
  });

  it("keeps the T11 stale-CAS message visible when the mutation hook exposes no retained error", async () => {
    const supplemental = makeStep({
      isSupplemental: true,
      supplementalStepId: "supplemental-step-1",
      requestedByUserId: "coordinator-1",
      completionRequired: true,
      isSupplementalCancelled: false,
      capabilities: {
        ...noCapabilities,
        canCancelSupplemental: true,
        expectedRevision: 4,
      },
    });
    mocks.overviewData = makeOverview(
      {
        canViewOverview: true,
        canManageSupplemental: true,
        expectedRevision: 7,
      },
      { archetypeId: "FLOW-T11" },
    );
    mocks.stepsData = {
      items: [supplemental],
      total: 1,
      limit: 25,
      hasMore: false,
      nextCursor: null,
    };
    mocks.cancelSupplemental.mockImplementation(() => ({
      unwrap: async () => Promise.reject({ status: 409 }),
    }));

    renderPage(
      dynamicFlowRuntimePath("work-1", "instance-1", "work-to-do", {
        stepInstanceId: supplemental.stepInstanceId,
        branchId: supplemental.branchId,
        attemptNo: supplemental.attemptNo,
        assignmentId: supplemental.assignmentId,
      }),
    );

    fireEvent.click(await screen.findByTestId("p6-t11-cancel"));

    expect(await screen.findByTestId("p6-t11-cancel-conflict")).toHaveTextContent(
      /Dữ liệu Flow đã cũ hoặc xung đột phiên bản/i,
    );
  });

  it("renders T12 epoch history and retries rollback with one exact CAS identity", async () => {
    mocks.overviewData = makeOverview(
      {
        canViewOverview: true,
        canRollback: true,
        expectedRevision: 11,
      },
      {
        archetypeId: "FLOW-T12",
        executionEpoch: 2,
        entryFlowStepId: "entry",
        epochs: [
          {
            epochId: "epoch-1",
            executionEpoch: 1,
            state: "ROLLED_BACK",
            isCanonical: false,
            checkpointNodeId: "entry",
            openedByCommandId: "launch-1",
            closedByCommandId: "rollback-1",
            terminalEventId: "event-1",
            replacedByExecutionEpoch: 2,
            openedAtUtc: "2026-07-27T01:00:00Z",
            closedAtUtc: "2026-07-27T02:00:00Z",
          },
          {
            epochId: "epoch-2",
            executionEpoch: 2,
            state: "ACTIVE",
            isCanonical: true,
            checkpointNodeId: "entry",
            openedByCommandId: "rollback-1",
            closedByCommandId: null,
            terminalEventId: null,
            replacedByExecutionEpoch: null,
            openedAtUtc: "2026-07-27T02:00:00Z",
            closedAtUtc: null,
          },
        ],
      },
    );
    mocks.executeEpoch
      .mockImplementationOnce(() => ({
        unwrap: async () => Promise.reject({ status: 503 }),
      }))
      .mockImplementationOnce((args: { body: { commandId: string } }) => ({
        unwrap: async () => ({
          commandId: args.body.commandId,
          action: "EPOCH_ROLLBACK",
          flowInstanceId: "instance-1",
          previousExecutionEpoch: 2,
          executionEpoch: 3,
          instanceRevision: 12,
          instanceState: "ACTIVE",
          eventId: "event-2",
          rebuildIntentId: "intent-2",
          invalidatedStepCount: 1,
          invalidatedGatewayCount: 0,
          invalidatedAssignmentCount: 1,
          invalidatedReportCount: 0,
          businessWritePerformed: true,
          replayed: false,
        }),
      }));

    renderPage("/works/work-1/flow-instances/instance-1/overview");

    expect(screen.getByTestId("p6-t12-epoch-1")).toHaveTextContent(
      /Epoch 1.*Invalidated history.*entry.*event-1.*2/i,
    );
    expect(screen.getByTestId("p6-t12-epoch-2")).toHaveTextContent(
      /Epoch 2.*Canonical.*entry/i,
    );
    const rollback = screen.getByRole("button", {
      name: /Rollback to allowed ancestor/i,
    });
    fireEvent.click(rollback);
    await waitFor(() => expect(mocks.executeEpoch).toHaveBeenCalledTimes(1));
    const firstRequest = mocks.executeEpoch.mock.calls[0][0];
    fireEvent.click(rollback);
    await waitFor(() => expect(mocks.executeEpoch).toHaveBeenCalledTimes(2));

    expect(mocks.executeEpoch.mock.calls[1][0]).toEqual(firstRequest);
    expect(firstRequest).toEqual({
      workId: "work-1",
      instanceId: "instance-1",
      action: "rollback",
      body: {
        commandId: expect.stringMatching(/^epoch-rollback:/),
        expectedExecutionEpoch: 2,
        expectedInstanceRevision: 11,
        checkpointNodeId: "entry",
      },
    });
    expect(screen.queryByRole("button", { name: /Finalize epoch/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Terminate current scope/i })).not.toBeInTheDocument();
  });

  it("retries FLOW-T09 launch with one command identity and exact parent CAS", async () => {
    const parent = makeStep({
      state: "APPROVED",
      capabilities: {
        ...noCapabilities,
        canLaunchSubflow: true,
        expectedRevision: 4,
      },
    });
    mocks.overviewData = makeOverview(
      { canViewOverview: true, expectedRevision: 7 },
      { archetypeId: "FLOW-T09" },
    );
    mocks.stepsData = {
      items: [parent],
      total: 1,
      limit: 25,
      hasMore: false,
      nextCursor: null,
    };
    mocks.launchSubflow
      .mockImplementationOnce(() => ({
        unwrap: async () => Promise.reject({ status: 503 }),
      }))
      .mockImplementationOnce((args: { body: { commandId: string } }) => ({
        unwrap: async () => ({
          commandId: args.body.commandId,
          status: "MATERIALIZED",
          businessWritePerformed: true,
          replayed: true,
          parentInstanceId: "instance-1",
          parentStepInstanceId: parent.stepInstanceId,
          childInstanceId: "child-instance-1",
          childFlowTemplateId: "child-family-1",
          childFlowVersionId: "child-version-3",
          ancestryDepth: 1,
          parentState: "WAITING_CHILD",
          childState: "ACTIVE",
          eventId: "event-child-1",
        }),
      }));

    renderPage(dynamicFlowRuntimePath(
      "work-1",
      "instance-1",
      "work-to-do",
      {
        stepInstanceId: parent.stepInstanceId,
        branchId: parent.branchId,
        attemptNo: parent.attemptNo,
        assignmentId: parent.assignmentId,
      },
    ));

    const launchButton = await screen.findByTestId("p6-t09-launch-subflow");
    fireEvent.click(launchButton);
    await waitFor(() => expect(mocks.launchSubflow).toHaveBeenCalledTimes(1));
    const firstRequest = mocks.launchSubflow.mock.calls[0][0];

    fireEvent.click(launchButton);
    await waitFor(() => expect(mocks.launchSubflow).toHaveBeenCalledTimes(2));

    expect(mocks.launchSubflow.mock.calls[1][0]).toEqual(firstRequest);
    expect(firstRequest).toEqual({
      workId: "work-1",
      parentInstanceId: "instance-1",
      parentStepInstanceId: parent.stepInstanceId,
      body: {
        commandId: expect.stringMatching(/^flow-runtime-/),
        expectedParentInstanceRevision: 7,
        expectedParentStepRevision: 4,
      },
    });
  });

  it("shows exact child lineage and opens only the persisted child instance", async () => {
    const waiting = makeStep({
      state: "WAITING_CHILD",
      childInstanceId: "child-instance-1",
      childFlowTemplateId: "child-family-1",
      childFlowVersionId: "child-version-3",
      childState: "ACTIVE",
      childOutcomeCode: null,
      childLinkedAtUtc: "2026-07-27T03:00:00Z",
    });
    mocks.overviewData = makeOverview(
      { canViewOverview: true },
      { archetypeId: "FLOW-T09" },
    );
    mocks.stepsData = {
      items: [waiting],
      total: 1,
      limit: 25,
      hasMore: false,
      nextCursor: null,
    };
    const { router } = renderPage(dynamicFlowRuntimePath(
      "work-1",
      "instance-1",
      "work-to-do",
      {
        stepInstanceId: waiting.stepInstanceId,
        branchId: waiting.branchId,
        attemptNo: waiting.attemptNo,
      },
    ));

    expect(await screen.findByTestId("p6-t09-child-lineage")).toHaveTextContent(
      /child-instance-1.*child-family-1.*child-version-3.*ACTIVE/i,
    );
    fireEvent.click(screen.getByTestId("p6-t09-open-child"));
    await waitFor(() =>
      expect(router.state.location.pathname).toContain(
        "/flow-instances/child-instance-1/overview",
      ),
    );
  });

  it("uses independent submit and review report ids with the existing P3 renderer", async () => {
    const step = makeStep({
      capabilities: {
        ...noCapabilities,
        canOpenAssignment: true,
        canOpenReport: true,
        canSubmitReport: true,
        canReviewReport: true,
      },
    });
    mocks.stepsData = { items: [step], total: 1, limit: 25, hasMore: false, nextCursor: null };

    const submitPath = dynamicFlowRuntimePath("work-1", "instance-1", "work-to-do", {
      stepInstanceId: step.stepInstanceId,
      branchId: step.branchId,
      attemptNo: step.attemptNo,
      reportId: "report-submit",
    });
    const first = renderPage(submitPath);

    expect(await screen.findByTestId("p3-report-renderer")).toHaveTextContent(
      "work-1:report-submit:writable:mapping-owner",
    );
    expect(screen.getByRole("button", { name: /báo cáo cần gửi/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /báo cáo cần duyệt/i })).toBeInTheDocument();
    first.unmount();

    const reviewPath = dynamicFlowRuntimePath("work-1", "instance-1", "work-to-do", {
      stepInstanceId: step.stepInstanceId,
      branchId: step.branchId,
      attemptNo: step.attemptNo,
      reportId: "report-review",
    });
    renderPage(reviewPath);

    expect(await screen.findByTestId("p3-report-renderer")).toHaveTextContent(
      "work-1:report-review:readonly:mapping-owner",
    );
  });

  it("rejects a report deep-link when the exact report id is not actor-authorized", () => {
    const step = makeStep({
      reportIds: ["report-open"],
      submitReportId: "report-submit",
      capabilities: { ...noCapabilities, canSubmitReport: true },
    });
    mocks.stepsData = { items: [step], total: 1, limit: 25, hasMore: false, nextCursor: null };

    renderPage(dynamicFlowRuntimePath("work-1", "instance-1", "work-to-do", {
      stepInstanceId: step.stepInstanceId,
      branchId: step.branchId,
      attemptNo: step.attemptNo,
      reportId: "report-submit",
    }));

    expect(screen.getByText(/Report deep link.*fail-closed/i)).toBeInTheDocument();
    expect(screen.queryByTestId("p3-report-renderer")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /báo cáo cần gửi/i })).not.toBeInTheDocument();
  });

  it("does not query or render timeline when the server denies canViewTimeline", () => {
    mocks.overviewData = makeOverview({ canViewTimeline: false });
    mocks.timelineData = undefined;

    renderPage("/works/work-1/flow-instances/instance-1/timeline");

    expect(screen.getByText(/không cấp canViewTimeline.*fail-closed/i)).toBeInTheDocument();
    expect(mocks.timelineHook).toHaveBeenLastCalledWith(
      expect.objectContaining({ workId: "work-1", instanceId: "instance-1" }),
      { skip: true },
    );
  });

  it("fails closed when a deep link carries the wrong assignment identity", async () => {
    const step = makeStep({
      capabilities: {
        ...noCapabilities,
        canForward: true,
        expectedRevision: 4,
      },
    });
    mocks.stepsData = { items: [step], total: 1, limit: 25, hasMore: false, nextCursor: null };

    renderPage(dynamicFlowRuntimePath("work-1", "instance-1", "work-to-do", {
      stepInstanceId: step.stepInstanceId,
      branchId: step.branchId,
      attemptNo: step.attemptNo,
      assignmentId: "assignment-wrong",
    }));

    expect(
      await screen.findByText(/Deep-link step\/branch\/attempt\/assignment/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("p6-t03-forward")).not.toBeInTheDocument();
    expect(mocks.forwardStep).not.toHaveBeenCalled();
  });

  it("retries FLOW-T03 forward with the exact same command and CAS revisions", async () => {
    const step = makeStep({
      flowStepCode: "A",
      capabilities: {
        ...noCapabilities,
        canForward: true,
        expectedRevision: 4,
      },
    });
    mocks.overviewData = makeOverview(
      { canViewOverview: true, expectedRevision: 7 },
      { archetypeId: "FLOW-T03" },
    );
    mocks.stepsData = { items: [step], total: 1, limit: 25, hasMore: false, nextCursor: null };
    mocks.forwardStep
      .mockImplementationOnce(() => ({
        unwrap: async () => Promise.reject({ status: 503 }),
      }))
      .mockImplementationOnce((args: { body: { commandId: string } }) => ({
        unwrap: async () => ({
          commandId: args.body.commandId,
          status: "ACCEPTED_PENDING_MATERIALIZATION",
          businessWritePerformed: true,
          replayed: false,
          flowInstanceId: "instance-1",
          executionEpoch: 1,
          instanceRevision: 8,
          stepInstanceId: step.stepInstanceId,
          nextStepInstanceId: "step-instance-2",
          nextAssignmentId: "assignment-2",
          activatedTransitionId: "transition-a-b",
          eventId: "event-a-b",
        }),
      }));

    renderPage(dynamicFlowRuntimePath("work-1", "instance-1", "work-to-do", {
      stepInstanceId: step.stepInstanceId,
      branchId: step.branchId,
      attemptNo: step.attemptNo,
    }));

    const forwardButton = await screen.findByTestId("p6-t03-forward");
    fireEvent.click(forwardButton);
    await waitFor(() => expect(mocks.forwardStep).toHaveBeenCalledTimes(1));
    const firstRequest = mocks.forwardStep.mock.calls[0][0];

    fireEvent.click(forwardButton);
    await waitFor(() => expect(mocks.forwardStep).toHaveBeenCalledTimes(2));

    expect(mocks.forwardStep.mock.calls[1][0]).toEqual(firstRequest);
    expect(firstRequest).toEqual({
      workId: "work-1",
      instanceId: "instance-1",
      assignmentId: "assignment-1",
      body: {
        commandId: expect.stringMatching(/^flow-runtime-/),
        expectedInstanceRevision: 7,
        expectedStepRevision: 4,
      },
    });
  });

  it("navigates only after the exact forwarded child identity is materialized", async () => {
    const parent = makeStep({
      flowStepCode: "A",
      capabilities: {
        ...noCapabilities,
        canForward: true,
        expectedRevision: 4,
      },
    });
    const child = makeStep({
      flowStepDefinitionId: "step-definition-2",
      flowStepCode: "B",
      stepOrder: 2,
      stepInstanceId: "step-instance-2",
      branchId: parent.branchId,
      attemptNo: 1,
      assignmentId: "assignment-2",
      activatedByTransitionId: "transition-a-b",
      capabilities: { ...noCapabilities },
    });
    mocks.overviewData = makeOverview(
      { canViewOverview: true, expectedRevision: 7 },
      { archetypeId: "FLOW-T03" },
    );
    mocks.stepsData = {
      items: [parent],
      total: 1,
      limit: 25,
      hasMore: false,
      nextCursor: null,
    };
    mocks.stepsRefetch.mockResolvedValueOnce({
      data: {
        items: [parent, child],
        total: 2,
        limit: 25,
        hasMore: false,
        nextCursor: null,
      },
    });
    mocks.forwardStep.mockImplementation((args: { body: { commandId: string } }) => ({
      unwrap: async () => ({
        commandId: args.body.commandId,
        status: "ACCEPTED_PENDING_MATERIALIZATION",
        businessWritePerformed: true,
        replayed: false,
        flowInstanceId: "instance-1",
        executionEpoch: 1,
        instanceRevision: 8,
        stepInstanceId: parent.stepInstanceId,
        nextStepInstanceId: child.stepInstanceId,
        nextAssignmentId: child.assignmentId,
        activatedTransitionId: "transition-a-b",
        eventId: "event-a-b",
      }),
    }));

    const { router } = renderPage(dynamicFlowRuntimePath(
      "work-1",
      "instance-1",
      "work-to-do",
      {
        stepInstanceId: parent.stepInstanceId,
        branchId: parent.branchId,
        attemptNo: parent.attemptNo,
      },
    ));

    fireEvent.click(await screen.findByTestId("p6-t03-forward"));

    await waitFor(() => {
      expect(router.state.location.search).toContain(
        `stepInstanceId=${child.stepInstanceId}`,
      );
      expect(router.state.location.search).toContain(
        `assignmentId=${child.assignmentId}`,
      );
    });
    expect(mocks.stepsRefetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("p6-t03-forward-pending")).not.toBeInTheDocument();
  });

  it("keeps the parent deep-link while forwarded materialization remains pending", async () => {
    const parent = makeStep({
      flowStepCode: "A",
      capabilities: {
        ...noCapabilities,
        canForward: true,
        expectedRevision: 4,
      },
    });
    mocks.stepsData = {
      items: [parent],
      total: 1,
      limit: 25,
      hasMore: false,
      nextCursor: null,
    };
    mocks.stepsRefetch.mockResolvedValue({
      data: {
        items: [parent],
        total: 1,
        limit: 25,
        hasMore: false,
        nextCursor: null,
      },
    });
    mocks.forwardStep.mockImplementation((args: { body: { commandId: string } }) => ({
      unwrap: async () => ({
        commandId: args.body.commandId,
        status: "ACCEPTED_PENDING_MATERIALIZATION",
        businessWritePerformed: true,
        replayed: false,
        flowInstanceId: "instance-1",
        executionEpoch: 1,
        instanceRevision: 8,
        stepInstanceId: parent.stepInstanceId,
        nextStepInstanceId: "step-instance-2",
        nextAssignmentId: "assignment-2",
        activatedTransitionId: "transition-a-b",
        eventId: "event-a-b",
      }),
    }));

    const { router } = renderPage(dynamicFlowRuntimePath(
      "work-1",
      "instance-1",
      "work-to-do",
      {
        stepInstanceId: parent.stepInstanceId,
        branchId: parent.branchId,
        attemptNo: parent.attemptNo,
        assignmentId: parent.assignmentId,
      },
    ));

    fireEvent.click(await screen.findByTestId("p6-t03-forward"));

    expect(await screen.findByTestId("p6-t03-forward-pending")).toBeInTheDocument();
    await waitFor(
      () => expect(mocks.stepsRefetch).toHaveBeenCalledTimes(6),
      { timeout: 2500 },
    );
    expect(router.state.location.search).toContain(
      `stepInstanceId=${parent.stepInstanceId}`,
    );
    expect(router.state.location.search).toContain(
      `assignmentId=${parent.assignmentId}`,
    );
    expect(router.state.location.search).not.toContain("stepInstanceId=step-instance-2");
  });

  it("renders many long branch identities without dropping the requested deep-link selection", async () => {
    const items = Array.from({ length: 40 }, (_, index) =>
      makeStep({
        stepInstanceId: `step-instance-${index}`,
        branchId: `branch-with-a-very-long-stable-identity-${index}`,
        attemptNo: index + 1,
        targetUnitId: `target-unit-${index}`,
      }),
    );
    mocks.stepsData = { items, total: 40, limit: 25, hasMore: false, nextCursor: null };
    const selected = items[39];

    renderPage(dynamicFlowRuntimePath("work-1", "instance-1", "work-to-do", {
      stepInstanceId: selected.stepInstanceId,
      branchId: selected.branchId,
      attemptNo: selected.attemptNo,
    }));

    expect(await screen.findByText(new RegExp(selected.branchId))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Step instance: ${selected.stepInstanceId}`))).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/không nằm trong trang dữ liệu/i)).not.toBeInTheDocument();
    });
  });
});
