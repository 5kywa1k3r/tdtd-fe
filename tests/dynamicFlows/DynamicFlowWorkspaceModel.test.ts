import { afterEach, describe, expect, it } from "vitest";

import type {
  DynamicFlowTemplateFamilyDto,
  DynamicFlowTemplateVersionDetailDto,
  FlowDefinitionPayloadV2,
  FlowDefinitionSnapshotV2,
} from "../../src/api/dynamicFlowTemplateApi";
import { ApiErrorCode } from "../../src/constants/errorCodes";
import { normalizeApiError } from "../../src/utils/apiError";
import {
  clearDynamicFlowDraft,
  canCreateDynamicFlowDefinition,
  DYNAMIC_FLOW_WORKSPACE_TABS,
  dynamicFlowDraftStorageKey,
  getDynamicFlowWorkspaceAccessState,
  mergeDynamicFlowPayload,
  readDynamicFlowDraft,
  resolveDynamicFlowMergeConflicts,
  resolveDynamicFlowValidationTarget,
  toEditableDynamicFlowPayload,
  validateDynamicFlowWorkspacePayload,
  writeDynamicFlowDraft,
} from "../../src/pages/dynamicFlows/dynamicFlowWorkspaceModel";

const payload = {
  schemaVersion: 2,
  archetypeId: "FLOW-T01",
  entryStepId: "step-1",
  rootDynamicFormTemplateId: "form-version-1",
  formNodes: [
    { formNodeId: "form-node-1", role: "ROOT", dynamicFormTemplateId: "form-version-1" },
  ],
  nodes: [
    {
      nodeId: "step-1",
      nodeCode: "STEP_1",
      nodeKind: "FORM_STEP",
      name: "Bước một",
      formNodeId: "form-node-1",
      declaredRoles: ["ASSIGNEE"],
      gateway: null,
    },
  ],
  edges: [],
  actorPolicies: [],
  fieldPolicies: [],
  tableColumnPolicies: [],
  mappingRules: [],
  resultOwnerStepId: null,
  resultOwnerFormNodeId: null,
  statisticsOwnerStepId: null,
  statisticsOwnerFormNodeId: null,
  rollbackPolicy: {},
  finalResultPolicy: {},
  statisticProfile: {},
} satisfies FlowDefinitionPayloadV2;

afterEach(() => localStorage.clear());

describe("dynamic Flow P4 workspace model", () => {
  it("exposes only the canonical version workspace tabs", () => {
    expect(DYNAMIC_FLOW_WORKSPACE_TABS).toEqual([
      "overview",
      "topology",
      "forms-policies",
      "mapping-metadata",
      "result-statistics",
      "validation",
    ]);
  });

  it("removes server-owned catalog and Form pins before saving a draft", () => {
    const snapshot = {
      ...payload,
      formNodes: [
        {
          ...payload.formNodes[0],
          dynamicFormFamilyId: "form-family-1",
          dynamicFormVersionNo: 3,
          dynamicFormSchemaHash: "a".repeat(64),
          dynamicFormSnapshotHash: "b".repeat(64),
        },
      ],
      catalogVersion: "1.1",
      catalogSemanticHash: "c".repeat(64),
    } satisfies FlowDefinitionSnapshotV2;

    const editable = toEditableDynamicFlowPayload(snapshot);

    expect(editable.formNodes[0]).toEqual(payload.formNodes[0]);
    expect(editable.formNodes[0]).not.toHaveProperty("dynamicFormVersionNo");
    expect(editable).not.toHaveProperty("catalogVersion");
    expect(editable).not.toHaveProperty("catalogSemanticHash");
  });

  it("scopes recoverable local drafts by actor, family, and exact version", () => {
    expect(dynamicFlowDraftStorageKey("actor-a", "family-a", "version-1")).not.toBe(
      dynamicFlowDraftStorageKey("actor-b", "family-a", "version-1"),
    );
    expect(dynamicFlowDraftStorageKey("actor-a", "family-a", "version-1")).not.toBe(
      dynamicFlowDraftStorageKey("actor-a", "family-a", "version-2"),
    );

    writeDynamicFlowDraft({
      schema: 1,
      actorId: "actor-a",
      familyId: "family-a",
      versionId: "version-1",
      baseDraftRevision: 4,
      basePayloadHash: "hash-4",
      basePayload: payload,
      savedAtUtc: "2026-07-23T00:00:00Z",
      payload,
      rawEditorTexts: { "mapping-rules": "{" },
    });

    expect(readDynamicFlowDraft("actor-a", "family-a", "version-1")?.payload).toEqual(payload);
    expect(readDynamicFlowDraft("actor-a", "family-a", "version-1")?.basePayload).toEqual(payload);
    expect(readDynamicFlowDraft("actor-a", "family-a", "version-1")?.rawEditorTexts).toEqual({
      "mapping-rules": "{",
    });
    expect(readDynamicFlowDraft("actor-b", "family-a", "version-1")).toBeNull();
    clearDynamicFlowDraft("actor-a", "family-a", "version-1");
    expect(readDynamicFlowDraft("actor-a", "family-a", "version-1")).toBeNull();
  });

  it("three-way merges non-overlapping local and remote edits without losing either side", () => {
    const base = structuredClone(payload);
    const local = {
      ...structuredClone(base),
      archetypeId: "FLOW-T02",
      nodes: [{ ...structuredClone(base.nodes[0]), name: "Local name" }],
    } satisfies FlowDefinitionPayloadV2;
    const remote = {
      ...structuredClone(base),
      statisticProfile: { remoteMode: "BASIC" },
      nodes: [{ ...structuredClone(base.nodes[0]), nodeCode: "REMOTE_CODE" }],
    } satisfies FlowDefinitionPayloadV2;

    const merged = mergeDynamicFlowPayload(base, local, remote);

    expect(merged.conflicts).toEqual([]);
    expect(merged.payload.archetypeId).toBe("FLOW-T02");
    expect(merged.payload.statisticProfile).toEqual({ remoteMode: "BASIC" });
    expect(merged.payload.nodes[0]).toMatchObject({
      name: "Local name",
      nodeCode: "REMOTE_CODE",
    });
  });

  it("merges stable-id array additions with remote edits to existing entries", () => {
    const base = structuredClone(payload);
    const local = {
      ...structuredClone(base),
      nodes: [
        ...structuredClone(base.nodes),
        {
          nodeId: "step-2",
          nodeCode: "STEP_2",
          nodeKind: "FINAL",
          name: "Local final",
          formNodeId: null,
          declaredRoles: [],
          gateway: null,
        },
      ],
    } satisfies FlowDefinitionPayloadV2;
    const remote = {
      ...structuredClone(base),
      nodes: [{ ...structuredClone(base.nodes[0]), name: "Remote rename" }],
    } satisfies FlowDefinitionPayloadV2;

    const merged = mergeDynamicFlowPayload(base, local, remote);

    expect(merged.conflicts).toEqual([]);
    expect(merged.payload.nodes).toHaveLength(2);
    expect(merged.payload.nodes[0].name).toBe("Remote rename");
    expect(merged.payload.nodes[1].nodeId).toBe("step-2");
  });

  it("reports overlapping merge paths and requires an explicit local or remote choice", () => {
    const base = structuredClone(payload);
    const local = { ...structuredClone(base), archetypeId: "FLOW-T02" };
    const remote = { ...structuredClone(base), archetypeId: "FLOW-T03" };

    const merged = mergeDynamicFlowPayload(base, local, remote);

    expect(merged.conflicts.map((item) => item.path)).toEqual(["archetypeId"]);
    expect(resolveDynamicFlowMergeConflicts(merged.payload, merged.conflicts, "local").archetypeId)
      .toBe("FLOW-T02");
    expect(resolveDynamicFlowMergeConflicts(merged.payload, merged.conflicts, "remote").archetypeId)
      .toBe("FLOW-T03");
  });

  it("maps structured backend validation paths to the canonical tab and exact control", () => {
    expect(resolveDynamicFlowValidationTarget(
      { path: "mappingRules[0].target.fieldId" },
      payload,
    )).toMatchObject({
      tab: "mapping-metadata",
      editorId: "mapping-rules",
      canonicalControlId: "dynamic-flow-mapping-rule-0-target-fieldId",
      control: "fieldId",
    });
    expect(resolveDynamicFlowValidationTarget(
      { path: "mappingRules[2].inputs[1].source.columnKey" },
      payload,
    )?.canonicalControlId).toBe(
      "dynamic-flow-mapping-rule-2-input-1-source-columnKey",
    );
    expect(resolveDynamicFlowValidationTarget(
      { path: "tableColumnPolicies[3].required" },
      payload,
    )).toMatchObject({
      tab: "forms-policies",
      editorId: "table-policies",
      canonicalControlId: "dynamic-flow-policy-table-3-required",
    });
    expect(resolveDynamicFlowValidationTarget(
      { path: "nodes[0].nodeCode" },
      payload,
    )).toMatchObject({
      tab: "topology",
      nodeId: "step-1",
      control: "nodeCode",
    });
    expect(resolveDynamicFlowValidationTarget(
      { path: "statisticProfile.diffMode", tab: "completion-statistics" },
      payload,
    )?.tab).toBe("result-statistics");
  });

  it("matches the backend create allow-list, including own-unit scoped manager semantics", () => {
    expect(canCreateDynamicFlowDefinition(["MANAGER_UNIT"], "unit-42")).toBe(false);
    expect(canCreateDynamicFlowDefinition(["manager_level"])).toBe(true);
    expect(canCreateDynamicFlowDefinition(["MANAGER_UNIT:unit-42"], "unit-42")).toBe(true);
    expect(canCreateDynamicFlowDefinition(["manager_unit:unit-42"], "unit-42")).toBe(true);
    expect(canCreateDynamicFlowDefinition(["MANAGER_UNIT:unit-42"], "unit-43")).toBe(false);
    expect(canCreateDynamicFlowDefinition(["MANAGER_UNIT:UNIT-42"], "unit-42")).toBe(false);
    expect(canCreateDynamicFlowDefinition(["DYNAMIC_FLOW_MANAGER:tenant-a"])).toBe(false);
  });

  it("derives fail-closed readonly states from server metadata", () => {
    const family = { status: "ACTIVE" } as DynamicFlowTemplateFamilyDto;
    const draft = {
      status: "DRAFT",
      canManage: true,
      migrationState: "CANONICAL",
    } as DynamicFlowTemplateVersionDetailDto;

    expect(getDynamicFlowWorkspaceAccessState(family, draft)).toBe("editable");
    expect(getDynamicFlowWorkspaceAccessState(family, { ...draft, canManage: false })).toBe("readonly");
    expect(getDynamicFlowWorkspaceAccessState(family, { ...draft, status: "LOCKED" })).toBe("locked");
    expect(
      getDynamicFlowWorkspaceAccessState(family, { ...draft, migrationState: "REQUIRES_REVIEW" }),
    ).toBe("unsupported");
    expect(
      getDynamicFlowWorkspaceAccessState({ ...family, status: "ARCHIVED" }, draft),
    ).toBe("archived");
  });

  it("reports structural errors without mutating or silently repairing the payload", () => {
    const invalid = {
      ...payload,
      entryStepId: "missing",
      nodes: [...payload.nodes, { ...payload.nodes[0] }],
      edges: [
        {
          transitionId: "transition-1",
          fromNodeId: "step-1",
          toNodeId: "step-1",
          condition: null,
        },
      ],
    } satisfies FlowDefinitionPayloadV2;
    const before = JSON.stringify(invalid);

    const issues = validateDynamicFlowWorkspacePayload(invalid);

    expect(issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["nodes[1].nodeId", "nodes[1].nodeCode", "entryStepId", "edges[0]"]),
    );
    expect(JSON.stringify(invalid)).toBe(before);
  });

  it("decodes new backend guards through the fail-closed FE error catalog", () => {
    expect(
      normalizeApiError({
        status: 400,
        errorCode: ApiErrorCode.DynamicFlowTablePolicyEndpointIncompatible,
        message: "backend text must not win",
      }).message,
    ).toBe("Chính sách cột bảng không tương thích với endpoint biểu mẫu đã khai báo.");
    expect(
      normalizeApiError({
        status: 409,
        errorCode: ApiErrorCode.DynamicFlowStatisticProfileNotExecutable,
        message: "backend text must not win",
      }).message,
    ).toContain("bị chặn đến P8");
  });
});
