import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  DynamicFlowMappingPreviewResponse,
  DynamicFlowPolicyEvaluationResult,
  WorkAssignmentReportResponse,
} from "../../src/types/report";

const mocks = vi.hoisted(() => ({
  previewImpl: (_arg: unknown) => Promise.resolve(null as unknown),
  applyImpl: (_arg: unknown) => Promise.resolve(null as unknown),
  previewTrigger: vi.fn(),
  applyTrigger: vi.fn(),
}));

vi.mock("../../src/api/reportApi", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../src/api/reportApi")
  >();
  return {
    ...actual,
    usePreviewDynamicFlowMappingDraftMutation: () => [
      mocks.previewTrigger,
      { isLoading: false },
    ],
    useApplyDynamicFlowMappingDraftMutation: () => [
      mocks.applyTrigger,
      { isLoading: false },
    ],
  };
});

import DynamicFlowMappingRuntimePanel, {
  buildDynamicFlowMappingApplyRequest,
  canApplyDynamicFlowMappingPreview,
  classifyDynamicFlowMappingError,
  sanitizeDynamicFlowMappingPreview,
} from "../../src/components/works/flowRuntime/DynamicFlowMappingRuntimePanel";

const permissions: DynamicFlowPolicyEvaluationResult = {
  fields: {
    total: {
      targetKey: "total",
      fieldKey: "total",
      read: true,
      write: true,
    },
  },
  tableColumns: {},
  denyAllFields: false,
  denyAllTableColumns: true,
};

function makePreview(
  overrides: Partial<DynamicFlowMappingPreviewResponse> = {},
): DynamicFlowMappingPreviewResponse {
  return {
    targetReportId: "report-1",
    targetAssignmentId: "assignment-1",
    flowFamilyId: "flow-family-1",
    flowVersionId: "flow-version-1",
    flowPayloadHash: "a".repeat(64),
    catalogVersion: "1.0",
    catalogSemanticHash: "b".repeat(64),
    mappingRuleSetHash: "c".repeat(64),
    evaluatorVersion: "eval-1",
    functionRegistryVersion: "functions-1",
    functionRegistryHash: "d".repeat(64),
    flowInstanceId: "flow-instance-1",
    executionEpoch: 2,
    stepInstanceId: "step-instance-2",
    stepId: "step-target",
    branchId: "branch-main",
    attemptNo: 1,
    formFamilyId: "form-family-1",
    formVersionId: "form-version-3",
    formVersionNo: 3,
    formSchemaHash: "e".repeat(64),
    targetPayloadRevision: 4,
    targetPayloadHash: "f".repeat(64),
    targetLifecycleRevision: 2,
    sourceSignature: "1".repeat(64),
    resultSemanticHash: "2".repeat(64),
    previewToken: "signed-preview-token",
    previewIssuedAtUtc: "2026-07-30T00:00:00.000Z",
    previewExpiresAtUtc: "2099-07-30T00:05:00.000Z",
    mappingCapability: "ALLOWED",
    mappingCapabilityReason: "DYNAMIC_FLOW_MAPPING_CAPABILITY_ALLOWED",
    canPreview: true,
    canApply: true,
    freshness: "FRESH",
    applyState: null,
    receiptId: null,
    commandId: null,
    dataOrigin: "PARTIAL_MAPPING",
    cumulativeContributionMode: "INCLUDE",
    cumulativeContributionPolicyJson: null,
    summarySourceJson: null,
    fieldValuesJson: null,
    tableValuesJson: null,
    sourceReports: [
      {
        reportId: null,
        workAssignmentId: null,
        identityRedacted: true,
      },
    ],
    changes: [
      {
        mappingId: "mapping-total",
        mappingVersion: 1,
        targetKind: "FIELD",
        targetKey: "total",
        sourceReportId: null,
        sourceKey: null,
        previousValueJson: "10",
        nextValueJson: "15",
        status: "CHANGED",
        reason: null,
        conceptCode: "TOTAL",
        contributionPolicy: null,
        sources: [
          {
            inputKey: "source",
            sourceReportId: null,
            sourceKey: null,
            valueJson: "\"TOP SECRET SOURCE VALUE\"",
          },
        ],
      },
    ],
    hasBlockingConflicts: false,
    ...overrides,
  };
}

function makeAppliedReport(
  commandId = "mapping-command-1",
  resultSemanticHash = "2".repeat(64),
  overrides: Partial<WorkAssignmentReportResponse> = {},
): WorkAssignmentReportResponse {
  return {
    id: "report-1",
    workId: "work-1",
    workAssignmentId: "assignment-1",
    workReportPeriodId: "period-1",
    periodKey: "2026-07",
    status: 0,
    specJson: "{}",
    dataRectR0: 0,
    dataRectC0: 0,
    dataRectR1: 0,
    dataRectC1: 0,
    w: 1,
    h: 1,
    payloadRevision: 5,
    lifecycleRevision: 2,
    lifecycleCommitState: "COMMITTED",
    lifecycleProjectionPending: false,
    payloadHash: "1".repeat(64),
    canEditPayload: true,
    canSubmit: true,
    canWithdraw: false,
    dynamicFlowMappingApplyState: "COMMITTED",
    dynamicFlowMappingReceiptId: "mapping-receipt-1",
    dynamicFlowMappingCommandId: commandId,
    dynamicFlowMappingResultSemanticHash: resultSemanticHash,
    dataOrigin: "PARTIAL_MAPPING",
    cumulativeContributionMode: "EXCLUDE",
    isLateSubmission: false,
    versionNo: 1,
    isCurrent: true,
    isActive: true,
    createdAtUtc: "2026-07-30T00:00:00.000Z",
    updatedAtUtc: "2026-07-30T00:00:00.000Z",
    ...overrides,
  };
}

function readApplyRequest(arg: unknown) {
  return (arg as {
    data: {
      commandId: string;
      resultSemanticHash: string;
    };
  }).data;
}

function renderPanel(overrides: Partial<React.ComponentProps<typeof DynamicFlowMappingRuntimePanel>> = {}) {
  const onRefreshCanonical = vi.fn(async () => undefined);
  const onApplied = vi.fn(async () => undefined);
  render(
    <DynamicFlowMappingRuntimePanel
      reportId="report-1"
      assignmentId="assignment-1"
      reportStatus={0}
      payloadRevision={4}
      lifecycleRevision={2}
      payloadHash={"f".repeat(64)}
      permissions={permissions}
      localDraftState="clean"
      onRefreshCanonical={onRefreshCanonical}
      onApplied={onApplied}
      {...overrides}
    />,
  );
  return { onRefreshCanonical, onApplied };
}

beforeEach(() => {
  mocks.previewTrigger.mockReset();
  mocks.applyTrigger.mockReset();
  mocks.previewImpl = async () => makePreview();
  mocks.applyImpl = async (arg) => {
    const request = readApplyRequest(arg);
    return makeAppliedReport(request.commandId, request.resultSemanticHash);
  };
  mocks.previewTrigger.mockImplementation((arg: unknown) => ({
    unwrap: () => mocks.previewImpl(arg),
  }));
  mocks.applyTrigger.mockImplementation((arg: unknown) => ({
    unwrap: () => mocks.applyImpl(arg),
  }));
});

describe("DynamicFlowMappingRuntimePanel", () => {
  it("exposes stable browser selectors with accessible runtime state", async () => {
    renderPanel();

    const root = screen.getByTestId("dynamic-flow-mapping-runtime");
    const status = screen.getByTestId("dynamic-flow-mapping-status");
    const previewButton = screen.getByTestId("dynamic-flow-mapping-preview-button");
    const applyButton = screen.getByTestId("dynamic-flow-mapping-apply-button");

    expect(root).toHaveAttribute("data-state", "empty");
    expect(root).toHaveAttribute("aria-labelledby", "dynamic-flow-mapping-runtime-title");
    expect(status).toHaveAttribute("data-state", "empty");
    expect(previewButton).toHaveAttribute("aria-controls", "dynamic-flow-mapping-preview");
    expect(applyButton).toHaveAttribute("aria-controls", "dynamic-flow-mapping-preview");
    expect(screen.getByTestId("dynamic-flow-mapping-freshness"))
      .toHaveAttribute("data-freshness", "UNKNOWN");
    expect(screen.queryByTestId("dynamic-flow-mapping-preview")).not.toBeInTheDocument();

    fireEvent.click(previewButton);

    expect(await screen.findByTestId("dynamic-flow-mapping-preview")).toBeInTheDocument();
    expect(root).toHaveAttribute("data-state", "success");
    expect(status).toHaveAttribute("data-state", "success");
    expect(screen.getByTestId("dynamic-flow-mapping-freshness"))
      .toHaveAttribute("data-freshness", "FRESH");
    expect(screen.getByTestId("dynamic-flow-mapping-provenance")).toBeInTheDocument();
    expect(screen.getByTestId("dynamic-flow-mapping-provenance-source-0")).toBeInTheDocument();
    expect(screen.getByTestId("dynamic-flow-mapping-diff")).toBeInTheDocument();
    expect(screen.getByTestId("dynamic-flow-mapping-diff-item-0"))
      .toHaveAttribute("data-mapping-id", "mapping-total");
    expect(screen.getByTestId("dynamic-flow-mapping-diff-item-0"))
      .toHaveAttribute("data-status", "CHANGED");
    expect(screen.queryByTestId("dynamic-flow-mapping-conflict")).not.toBeInTheDocument();
  });

  it.each([
    ["owner", permissions, true, false],
    ["coordinator", permissions, true, false],
    ["reporter", permissions, false, true],
    ["reviewer", permissions, true, false],
    ["target-only", permissions, true, false],
    ["outsider", null, false, false],
  ] as const)(
    "uses only server policy/readiness for the %s runtime actor",
    (_actor, actorPermissions, forceReadOnly, canPreview) => {
      renderPanel({
        permissions: actorPermissions,
        forceReadOnly,
      });

      const previewButton = screen.getByRole("button", {
        name: "Xem trước mapping",
      });
      const applyButton = screen.getByRole("button", {
        name: "Áp dụng mapping",
      });
      expect(previewButton).toHaveProperty("disabled", !canPreview);
      expect(applyButton).toBeDisabled();

      if (!canPreview) {
        fireEvent.click(previewButton);
        expect(mocks.previewTrigger).not.toHaveBeenCalled();
      }
    },
  );

  it("fails closed while policy readiness is missing", () => {
    renderPanel({ permissions: null });

    expect(screen.getByText("Chỉ đọc")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xem trước mapping" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Áp dụng mapping" })).toBeDisabled();
    expect(mocks.previewTrigger).not.toHaveBeenCalled();
  });

  it("renders a deterministic redacted diff and applies only the server preview pins", async () => {
    const { onApplied } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Xem trước mapping" }));
    expect(await screen.findByText("Bản xem trước sẵn sàng")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Source signature: ${"1".repeat(64)}`, "i"))).toBeInTheDocument();
    expect(screen.getByText(/danh tính đã ẩn theo quyền truy cập/i)).toBeInTheDocument();
    expect(screen.getByText(/source: nguồn đã ẩn theo quyền truy cập/i)).toBeInTheDocument();
    expect(screen.queryByText(/TOP SECRET SOURCE VALUE/i)).not.toBeInTheDocument();

    const applyButton = screen.getByRole("button", { name: "Áp dụng mapping" });
    expect(applyButton).toBeEnabled();
    fireEvent.click(applyButton);

    await waitFor(() => expect(mocks.applyTrigger).toHaveBeenCalledOnce());
    const applyArg = mocks.applyTrigger.mock.calls[0]?.[0] as {
      id: string;
      data: Record<string, unknown>;
    };
    expect(applyArg.id).toBe("report-1");
    expect(applyArg.data).toMatchObject({
      expectedPayloadRevision: 4,
      expectedLifecycleRevision: 2,
      expectedPayloadHash: "f".repeat(64),
      previewToken: "signed-preview-token",
      sourceSignature: "1".repeat(64),
      resultSemanticHash: "2".repeat(64),
      targetReportId: "report-1",
      targetAssignmentId: "assignment-1",
      flowInstanceId: "flow-instance-1",
      executionEpoch: 2,
    });
    expect(applyArg.data).not.toHaveProperty("sourceReportIds");
    expect(applyArg.data).not.toHaveProperty("mappingRules");
    expect(applyArg.data).not.toHaveProperty("mappingRulesJson");
    await waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Áp dụng mapping" })).toBeDisabled();
  });

  it("keeps the old diff, refreshes canonical state, and never reapplies on a stale conflict", async () => {
    mocks.applyImpl = async () => Promise.reject({
      status: 409,
      errorCode: "DYNAMIC_FLOW_MAPPING_SOURCE_SIGNATURE_CONFLICT",
      details: { reason: "DYNAMIC_FLOW_MAPPING_SOURCE_SIGNATURE_CONFLICT" },
      message: "stale",
    });
    const { onRefreshCanonical, onApplied } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Xem trước mapping" }));
    await screen.findByText("Bản xem trước sẵn sàng");
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng mapping" }));

    expect(await screen.findByText("Bản xem trước đã cũ")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(onRefreshCanonical).toHaveBeenCalledOnce();
    expect(onApplied).not.toHaveBeenCalled();
    expect(mocks.applyTrigger).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Áp dụng mapping" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Làm mới bản xem trước" })).toBeEnabled();
    expect(screen.getByTestId("dynamic-flow-mapping-runtime")).toHaveAttribute("data-state", "stale-conflict");
    expect(screen.getByTestId("dynamic-flow-mapping-status")).toHaveAttribute("data-state", "stale-conflict");
    expect(screen.getByTestId("dynamic-flow-mapping-conflict"))
      .toContainElement(screen.getByTestId("dynamic-flow-mapping-status"));
    expect(screen.getByRole("status")).toHaveFocus();
  });

  it("uses the same command id for an explicit apply retry after a transient error", async () => {
    let attempt = 0;
    mocks.applyImpl = async (arg) => {
      attempt += 1;
      if (attempt === 1) {
        throw { status: 500, message: "temporary failure" };
      }
      const request = readApplyRequest(arg);
      return makeAppliedReport(request.commandId, request.resultSemanticHash);
    };
    const { onApplied } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Xem trước mapping" }));
    await screen.findByText("Bản xem trước sẵn sàng");
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng mapping" }));
    expect(await screen.findByText("Không tạo được mapping")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Thử lại áp dụng" }));
    await waitFor(() => expect(mocks.applyTrigger).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onApplied).toHaveBeenCalledOnce());

    const firstCommand = (mocks.applyTrigger.mock.calls[0]?.[0] as {
      data: { commandId: string };
    }).data.commandId;
    const secondCommand = (mocks.applyTrigger.mock.calls[1]?.[0] as {
      data: { commandId: string };
    }).data.commandId;
    expect(secondCommand).toBe(firstCommand);
  });

  it("rejects a sparse apply 2xx and retries explicitly with the same command", async () => {
    mocks.applyImpl = async () => ({ id: "report-1" });
    const { onApplied } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Xem trước mapping" }));
    await screen.findByText("Bản xem trước sẵn sàng");
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng mapping" }));

    expect(await screen.findByText("Không tạo được mapping")).toBeInTheDocument();
    expect(screen.getByText("Mã ổn định: DYNAMIC_FLOW_MAPPING_APPLY_RESPONSE_INVALID")).toBeInTheDocument();
    expect(onApplied).not.toHaveBeenCalled();
    expect(mocks.applyTrigger).toHaveBeenCalledOnce();
    const firstCommand = readApplyRequest(
      mocks.applyTrigger.mock.calls[0]?.[0],
    ).commandId;

    mocks.applyImpl = async (arg) => {
      const request = readApplyRequest(arg);
      return makeAppliedReport(request.commandId, request.resultSemanticHash);
    };
    fireEvent.click(screen.getByRole("button", { name: "Thử lại áp dụng" }));

    await waitFor(() => expect(mocks.applyTrigger).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
    const retryCommand = readApplyRequest(
      mocks.applyTrigger.mock.calls[1]?.[0],
    ).commandId;
    expect(retryCommand).toBe(firstCommand);
  });

  it.each([
    ["old payload revision", { payloadRevision: 4 }],
    ["changed lifecycle revision", { lifecycleRevision: 3 }],
  ] as const)(
    "rejects a well-shaped apply 2xx with %s",
    async (_label, revisionOverride) => {
      mocks.applyImpl = async (arg) => {
        const request = readApplyRequest(arg);
        return makeAppliedReport(
          request.commandId,
          request.resultSemanticHash,
          revisionOverride,
        );
      };
      const { onApplied } = renderPanel();

      fireEvent.click(screen.getByRole("button", { name: "Xem trước mapping" }));
      await screen.findByText("Bản xem trước sẵn sàng");
      fireEvent.click(screen.getByRole("button", { name: "Áp dụng mapping" }));

      expect(await screen.findByText("Không tạo được mapping")).toBeInTheDocument();
      expect(screen.getByText(/DYNAMIC_FLOW_MAPPING_APPLY_RESPONSE_INVALID/)).toBeInTheDocument();
      expect(onApplied).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Thử lại áp dụng" })).toBeEnabled();
    },
  );

  it("requires every capability, freshness, token and target pin before apply", () => {
    const preview = makePreview();
    const snapshot = {
      reportId: "report-1",
      assignmentId: "assignment-1",
      payloadRevision: 4,
      lifecycleRevision: 2,
      payloadHash: "f".repeat(64),
    };
    expect(canApplyDynamicFlowMappingPreview(preview, snapshot)).toBe(true);
    expect(canApplyDynamicFlowMappingPreview({ ...preview, freshness: "STALE" }, snapshot)).toBe(false);
    expect(canApplyDynamicFlowMappingPreview({ ...preview, canApply: false }, snapshot)).toBe(false);
    expect(canApplyDynamicFlowMappingPreview({ ...preview, previewToken: null }, snapshot)).toBe(false);
    expect(canApplyDynamicFlowMappingPreview({ ...preview, sourceSignature: "" }, snapshot)).toBe(false);
    expect(canApplyDynamicFlowMappingPreview(preview, { ...snapshot, payloadRevision: 5 })).toBe(false);

    const request = buildDynamicFlowMappingApplyRequest(preview, "command-1");
    expect(request.commandId).toBe("command-1");
    expect(request.mappingRuleSetHash).toBe("c".repeat(64));
  });

  it("maps the exact public P7 stable codes to fail-closed UI states", () => {
    expect(classifyDynamicFlowMappingError({
      status: 409,
      errorCode: "DYNAMIC_FLOW_MAPPING_PREVIEW_TOKEN_CONFLICT",
      message: "conflict",
    }).state).toBe("stale-conflict");
    expect(classifyDynamicFlowMappingError({
      status: 503,
      errorCode: "DYNAMIC_FLOW_MAPPING_POLICY_UNAVAILABLE",
      message: "unavailable",
    }).state).toBe("readonly");
    expect(classifyDynamicFlowMappingError({
      status: 403,
      errorCode: "DYNAMIC_FLOW_MAPPING_FIELD_WRITE_FORBIDDEN",
      message: "forbidden",
    }).state).toBe("forbidden");
    expect(classifyDynamicFlowMappingError({
      status: 403,
      errorCode: "DYNAMIC_FLOW_MAPPING_TABLE_COLUMN_WRITE_FORBIDDEN",
      message: "forbidden",
    }).state).toBe("forbidden");
    expect(classifyDynamicFlowMappingError({
      status: 409,
      errorCode: "DYNAMIC_FLOW_MAPPING_SOURCE_SIGNATURE_CONFLICT",
      message: "conflict",
    }).state).toBe("stale-conflict");
  });

  it("strips raw values and inconsistent source identities before preview state can render", () => {
    const sanitized = sanitizeDynamicFlowMappingPreview(makePreview({
      unknownPreviewSecret: "TOP SECRET PREVIEW",
      sourceReports: [
        {
          reportId: "secret-report",
          workAssignmentId: "secret-assignment",
          flowStepCode: "SECRET_STEP",
          identityRedacted: true,
          unknownSourceSecret: "TOP SECRET SOURCE",
        },
      ],
      changes: [
        {
          ...makePreview().changes[0],
          unknownChangeSecret: "TOP SECRET CHANGE",
          sourceReportId: "secret-report",
          sourceKey: "secret-field",
          sources: [
            {
              inputKey: "secret-input",
              sourceReportId: "secret-report",
              sourceStepCode: "SECRET_STEP",
              sourceKey: "secret-field",
              valueJson: "\"TOP SECRET SOURCE VALUE\"",
              unknownProvenanceSecret: "TOP SECRET PROVENANCE",
            },
          ],
        },
      ],
    } as unknown as Partial<DynamicFlowMappingPreviewResponse>));

    expect(sanitized).not.toBeNull();
    expect(sanitized?.sourceReports).toEqual([{ identityRedacted: true }]);
    expect(sanitized?.changes[0]).toMatchObject({
      sourceReportId: null,
      sourceKey: null,
      sources: [
        {
          inputKey: "secret-input",
          sourceReportId: null,
          valueJson: null,
        },
      ],
    });
    expect(JSON.stringify(sanitized)).not.toContain("TOP SECRET");
    expect(JSON.stringify(sanitized)).not.toContain("secret-report");
    expect(JSON.stringify(sanitized)).not.toContain("SECRET_STEP");
  });

  it("rejects hostile diff scalars and preserves the prior preview as readonly context", async () => {
    const { onRefreshCanonical, onApplied } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Xem trước mapping" }));
    await screen.findByText("Bản xem trước sẵn sàng");
    expect(screen.getByText("15")).toBeInTheDocument();

    const hostilePreview = {
      ...makePreview(),
      changes: [
        {
          ...makePreview().changes[0],
          previousValueJson: { secret: "HOSTILE SCALAR VALUE" },
        },
      ],
    } as unknown;
    expect(sanitizeDynamicFlowMappingPreview(hostilePreview)).toBeNull();
    mocks.previewImpl = async () => hostilePreview;

    fireEvent.click(screen.getByRole("button", { name: "Làm mới bản xem trước" }));

    expect(await screen.findByText("Chỉ đọc")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.queryByText(/HOSTILE SCALAR VALUE/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Áp dụng mapping" })).toBeDisabled();
    expect(onRefreshCanonical).not.toHaveBeenCalled();
    expect(onApplied).not.toHaveBeenCalled();
    expect(mocks.applyTrigger).not.toHaveBeenCalled();
  });
});
