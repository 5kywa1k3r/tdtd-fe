import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  DynamicFlowMappingRequest,
  WorkAssignmentReportResponse,
} from "../../src/types/report";

const { baseQueryMock } = vi.hoisted(() => ({ baseQueryMock: vi.fn() }));

vi.mock("../../src/api/base/axiosBaseQuery", () => ({
  axiosBaseQuery: () => (request: unknown) => baseQueryMock(request),
}));

import { baseApi } from "../../src/api/base/baseApi";
import { reportApi } from "../../src/api/reportApi";

function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
}

function makePinnedRequest(): DynamicFlowMappingRequest {
  return {
    expectedPayloadRevision: 4,
    expectedLifecycleRevision: 2,
    expectedPayloadHash: "a".repeat(64),
    commandId: "mapping-command-1",
    previewToken: "server-preview-token",
    sourceSignature: "b".repeat(64),
    resultSemanticHash: "c".repeat(64),
    flowFamilyId: "flow-family-1",
    flowVersionId: "flow-version-2",
    flowPayloadHash: "d".repeat(64),
    catalogVersion: "1.3",
    catalogSemanticHash: "e".repeat(64),
    mappingRuleSetHash: "f".repeat(64),
    evaluatorVersion: "mapping-evaluator-1",
    functionRegistryVersion: "mapping-functions-1",
    functionRegistryHash: "1".repeat(64),
    flowInstanceId: "flow-instance-1",
    executionEpoch: 2,
    stepInstanceId: "step-instance-target",
    stepId: "step-target",
    branchId: "branch-main",
    attemptNo: 1,
    targetAssignmentId: "assignment-target",
    targetReportId: "report-target",
    formFamilyId: "form-family-1",
    formVersionId: "form-version-3",
    formVersionNo: 3,
    formSchemaHash: "2".repeat(64),
  };
}

function makeCanonicalApplyResponse(
  request: DynamicFlowMappingRequest,
): WorkAssignmentReportResponse {
  return {
    id: "report-target",
    workId: "work-1",
    workAssignmentId: "assignment-target",
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
    payloadHash: "3".repeat(64),
    canEditPayload: true,
    canSubmit: true,
    canWithdraw: false,
    dynamicFlowMappingApplyState: "COMMITTED",
    dynamicFlowMappingReceiptId: "mapping-receipt-1",
    dynamicFlowMappingCommandId: request.commandId,
    dynamicFlowMappingResultSemanticHash: request.resultSemanticHash,
    dataOrigin: "PARTIAL_MAPPING",
    cumulativeContributionMode: "EXCLUDE",
    isLateSubmission: false,
    versionNo: 1,
    isCurrent: true,
    isActive: true,
    createdAtUtc: "2026-07-30T00:00:00.000Z",
    updatedAtUtc: "2026-07-30T00:00:01.000Z",
  };
}

afterEach(() => {
  baseQueryMock.mockReset();
});

describe("dynamic Flow mapping report API", () => {
  it("posts preview to the canonical report owner with only target CAS input", async () => {
    baseQueryMock.mockResolvedValue({
      data: {
        targetReportId: "report-target",
        sourceReports: [{ reportId: null, identityRedacted: true }],
        changes: [],
      },
    });
    const store = makeStore();
    const request: DynamicFlowMappingRequest = {
      expectedPayloadRevision: 4,
      expectedLifecycleRevision: 2,
      expectedPayloadHash: "a".repeat(64),
    };

    const response = await store.dispatch(
      reportApi.endpoints.previewDynamicFlowMappingDraft.initiate({
        id: "report-target",
        data: request,
      }),
    ).unwrap();

    expect(baseQueryMock).toHaveBeenCalledOnce();
    expect(baseQueryMock.mock.calls[0]?.[0]).toEqual({
      url: "work-assignment-reports/report-target/draft/preview-dynamic-flow-mapping",
      method: "POST",
      data: request,
    });
    expect(response.sourceReports[0]).toEqual({
      reportId: null,
      identityRedacted: true,
    });
    expect(request).not.toHaveProperty("actorRole");
    expect(request).not.toHaveProperty("capabilities");
    expect(request).not.toHaveProperty("mappingRules");
    expect(request).not.toHaveProperty("sourceReportIds");
  });

  it("sends apply with the exact server preview pins and never adds source values or permission claims", async () => {
    const request = makePinnedRequest();
    baseQueryMock.mockResolvedValue({
      data: makeCanonicalApplyResponse(request),
    });
    const store = makeStore();

    const response = await store.dispatch(
      reportApi.endpoints.applyDynamicFlowMappingDraft.initiate({
        id: "report-target",
        data: request,
      }),
    ).unwrap();

    expect(baseQueryMock).toHaveBeenCalledOnce();
    const apiRequest = baseQueryMock.mock.calls[0]?.[0] as {
      url: string;
      method: string;
      data: Record<string, unknown>;
    };
    expect(apiRequest).toEqual({
      url: "work-assignment-reports/report-target/draft/apply-dynamic-flow-mapping",
      method: "POST",
      data: request,
    });
    expect(apiRequest.data.commandId).toBe("mapping-command-1");
    expect(apiRequest.data.previewToken).toBe("server-preview-token");
    expect(apiRequest.data.sourceSignature).toBe("b".repeat(64));
    expect(apiRequest.data.targetReportId).toBe("report-target");
    expect(apiRequest.data).not.toHaveProperty("sourceReports");
    expect(apiRequest.data).not.toHaveProperty("fieldValuesJson");
    expect(apiRequest.data).not.toHaveProperty("tableValuesJson");
    expect(apiRequest.data).not.toHaveProperty("actorUserId");
    expect(apiRequest.data).not.toHaveProperty("capabilities");
    expect(response.dynamicFlowMappingCommandId).toBe("mapping-command-1");
    expect(response.payloadHash).toBe("3".repeat(64));
  });

  it("rejects a sparse apply 2xx response at the API boundary", async () => {
    baseQueryMock.mockResolvedValue({
      data: { id: "report-target" },
    });
    const store = makeStore();

    await expect(
      store.dispatch(
        reportApi.endpoints.applyDynamicFlowMappingDraft.initiate({
          id: "report-target",
          data: makePinnedRequest(),
        }),
      ).unwrap(),
    ).rejects.toBeDefined();
  });

  it.each([
    ["old payload revision", { payloadRevision: 4 }],
    ["changed lifecycle revision", { lifecycleRevision: 3 }],
  ] as const)(
    "rejects a well-shaped apply 2xx with %s at the API boundary",
    async (_label, revisionOverride) => {
      const request = makePinnedRequest();
      baseQueryMock.mockResolvedValue({
        data: {
          ...makeCanonicalApplyResponse(request),
          ...revisionOverride,
        },
      });
      const store = makeStore();

      await expect(
        store.dispatch(
          reportApi.endpoints.applyDynamicFlowMappingDraft.initiate({
            id: "report-target",
            data: request,
          }),
        ).unwrap(),
      ).rejects.toBeDefined();
    },
  );
});
