import { beforeEach, describe, expect, it } from "vitest";

import {
  buildDynamicFlowConfirmRequest,
  buildDynamicFlowEpochCommandRequest,
  buildDynamicFlowPreflightRequest,
  buildDynamicFlowSubflowLaunchRequest,
  clearDynamicFlowLaunchIntent,
  dynamicFlowLaunchSessionKey,
  isRuntimeCapabilityEnabled,
  isSameDynamicFlowConfirmRequest,
  isSupportedRuntimeArchetype,
  loadDynamicFlowLaunchIntent,
  normalizeDynamicFlowLaunchDraft,
  runtimeErrorPresentation,
  runtimeStatePresentation,
  saveDynamicFlowLaunchIntent,
  type DynamicFlowLaunchIntent,
} from "../../src/components/works/flowRuntime/dynamicFlowRuntimeModel";

describe("dynamic Flow runtime UI model", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("keeps command and snapshot identity byte-stable across confirm retry", () => {
    const draft = normalizeDynamicFlowLaunchDraft({
      flowTemplateVersionId: "  version-locked-12  ",
      targetUnitIds: [" unit-b ", "unit-a", "unit-b", ""],
      periodKey: " 2026-07 ",
      scheduleIdentityJson: ' { "cycle": "MONTHLY", "day": 24 } ',
    });
    const preflight = buildDynamicFlowPreflightRequest(draft, "command-stable-1");
    const firstConfirm = buildDynamicFlowConfirmRequest(preflight, "snapshot-token-1");
    const retryConfirm = buildDynamicFlowConfirmRequest(preflight, "snapshot-token-1");

    expect(preflight).toEqual({
      flowTemplateVersionId: "version-locked-12",
      commandId: "command-stable-1",
      targetUnitIds: ["unit-b", "unit-a"],
      periodKey: "2026-07",
      scheduleIdentityJson: '{ "cycle": "MONTHLY", "day": 24 }',
    });
    expect(retryConfirm).toEqual(firstConfirm);
    expect(JSON.stringify(retryConfirm)).toBe(JSON.stringify(firstConfirm));
    expect(isSameDynamicFlowConfirmRequest(firstConfirm, retryConfirm)).toBe(true);

    expect(
      isSameDynamicFlowConfirmRequest(
        firstConfirm,
        buildDynamicFlowConfirmRequest(preflight, "different-snapshot"),
      ),
    ).toBe(false);
  });

  it("scopes a persisted retry intent to the exact actor and work", () => {
    const intent: DynamicFlowLaunchIntent = {
      workId: "work-1",
      actorUserId: "issuer-1",
      commandId: "command-stable-1",
      draft: {
        flowTemplateVersionId: "version-locked-12",
        targetUnitIds: ["unit-a"],
        periodKey: "2026-07",
        scheduleIdentityJson: "{}",
      },
      phase: "RETRYING",
      confirmRequest: {
        flowTemplateVersionId: "version-locked-12",
        commandId: "command-stable-1",
        targetUnitIds: ["unit-a"],
        periodKey: "2026-07",
        scheduleIdentityJson: "{}",
        snapshotToken: "snapshot-token-1",
      },
    };

    saveDynamicFlowLaunchIntent(sessionStorage, intent);

    expect(loadDynamicFlowLaunchIntent(sessionStorage, "work-1", "issuer-1")).toEqual(intent);
    expect(loadDynamicFlowLaunchIntent(sessionStorage, "work-1", "outsider-1")).toBeNull();
    expect(loadDynamicFlowLaunchIntent(sessionStorage, "work-2", "issuer-1")).toBeNull();
    expect(dynamicFlowLaunchSessionKey("work / 1", "actor / 1")).toBe(
      "p5-flow-runtime:actor%20%2F%201:work%20%2F%201",
    );

    clearDynamicFlowLaunchIntent(sessionStorage, "work-1", "issuer-1");
    expect(loadDynamicFlowLaunchIntent(sessionStorage, "work-1", "issuer-1")).toBeNull();
  });

  it("treats only literal server true as an enabled capability", () => {
    expect(isRuntimeCapabilityEnabled(true)).toBe(true);
    expect(isRuntimeCapabilityEnabled(false)).toBe(false);
    expect(isRuntimeCapabilityEnabled(undefined)).toBe(false);
    expect(isRuntimeCapabilityEnabled(null)).toBe(false);
    expect(isRuntimeCapabilityEnabled(1)).toBe(false);
    expect(isRuntimeCapabilityEnabled("true")).toBe(false);
  });

  it("opens positive runtime only for FLOW-T01 through FLOW-T12", () => {
    expect(isSupportedRuntimeArchetype("FLOW-T01")).toBe(true);
    expect(isSupportedRuntimeArchetype("FLOW-T02")).toBe(true);
    expect(isSupportedRuntimeArchetype("FLOW-T03")).toBe(true);
    expect(isSupportedRuntimeArchetype("FLOW-T04")).toBe(true);
    expect(isSupportedRuntimeArchetype("FLOW-T05")).toBe(true);
    expect(isSupportedRuntimeArchetype("FLOW-T06")).toBe(true);
    expect(isSupportedRuntimeArchetype("FLOW-T07")).toBe(true);
    expect(isSupportedRuntimeArchetype("FLOW-T08")).toBe(true);
    expect(isSupportedRuntimeArchetype("FLOW-T09")).toBe(true);
    expect(isSupportedRuntimeArchetype("FLOW-T10")).toBe(true);
    expect(isSupportedRuntimeArchetype("FLOW-T11")).toBe(true);
    expect(isSupportedRuntimeArchetype("FLOW-T12")).toBe(true);
    expect(isSupportedRuntimeArchetype("FLOW-T13")).toBe(false);
    expect(isSupportedRuntimeArchetype("flow-t01")).toBe(false);
    expect(isSupportedRuntimeArchetype(undefined)).toBe(false);
  });

  it("freezes execution epoch and instance CAS for finalize-family retry", () => {
    const first = buildDynamicFlowEpochCommandRequest(
      3,
      11,
      "entry",
      "epoch-command-1",
    );
    const retry = buildDynamicFlowEpochCommandRequest(
      3,
      11,
      "entry",
      "epoch-command-1",
    );

    expect(retry).toEqual(first);
    expect(first).toEqual({
      commandId: "epoch-command-1",
      expectedExecutionEpoch: 3,
      expectedInstanceRevision: 11,
      checkpointNodeId: "entry",
    });
    expect(() => buildDynamicFlowEpochCommandRequest(0, 11)).toThrow(
      "DYNAMIC_FLOW_EPOCH_INVALID",
    );
    expect(() => buildDynamicFlowEpochCommandRequest(3, -1)).toThrow(
      "DYNAMIC_FLOW_EPOCH_REVISION_INVALID",
    );
  });

  it("freezes the parent and step CAS revisions for a subflow retry", () => {
    const first = buildDynamicFlowSubflowLaunchRequest(7, 4, "subflow-command-1");
    const retry = buildDynamicFlowSubflowLaunchRequest(7, 4, "subflow-command-1");

    expect(retry).toEqual(first);
    expect(first).toEqual({
      commandId: "subflow-command-1",
      expectedParentInstanceRevision: 7,
      expectedParentStepRevision: 4,
    });
    expect(() => buildDynamicFlowSubflowLaunchRequest(-1, 4)).toThrow(
      "DYNAMIC_FLOW_SUBFLOW_INSTANCE_REVISION_INVALID",
    );
    expect(() => buildDynamicFlowSubflowLaunchRequest(7, -1)).toThrow(
      "DYNAMIC_FLOW_SUBFLOW_STEP_REVISION_INVALID",
    );
  });

  it.each([
    ["PARTIAL", "warning", "partial"],
    ["RETRYING", "info", "retrying"],
    ["RECONCILED", "success", "reconciled"],
    ["FAILED", "error", "failed"],
    ["COMPLETED", "success", "completed"],
    ["FINALIZED", "success", "completed"],
    ["INVALIDATED", "warning", "partial"],
    ["ROLLED_BACK", "warning", "partial"],
    ["RESTARTED", "info", "retrying"],
    ["TERMINATED", "neutral", "completed"],
    ["IMPOSSIBLE", "error", "failed"],
    ["CANCELLED_BY_GATEWAY", "warning", "partial"],
    ["COLLECTING", "info", "pending"],
    ["SATISFIED", "success", "completed"],
  ] as const)("gives recovery state %s both text tone and an icon identity", (state, tone, icon) => {
    const presentation = runtimeStatePresentation(state);

    expect(presentation.label).toContain(state);
    expect(presentation.tone).toBe(tone);
    expect(presentation.icon).toBe(icon);
  });

  it.each([
    [{ status: 403 }, "forbidden"],
    [{ status: 404 }, "missing"],
    [{ status: 409, errorCode: "DYNAMIC_FLOW_REVISION_CONFLICT" }, "stale"],
    [{ status: 423 }, "locked"],
    [{ status: 501, errorCode: "UNSUPPORTED" }, "unsupported"],
    [{ status: 500 }, "error"],
  ] as const)("maps API error %o to fail-closed UI state %s", (error, expectedKind) => {
    expect(runtimeErrorPresentation(error).kind).toBe(expectedKind);
  });

  it("uses command-neutral guidance for stale confirm and forward revisions", () => {
    const presentation = runtimeErrorPresentation({
      status: 409,
      errorCode: "DYNAMIC_FLOW_REVISION_CONFLICT",
    });

    expect(presentation).toEqual({
      kind: "stale",
      message: "Dữ liệu Flow đã cũ hoặc xung đột phiên bản. Hãy làm mới trạng thái trước khi tiếp tục.",
    });
    expect(presentation.message).not.toMatch(/xem trước|xác nhận/i);
  });
});
