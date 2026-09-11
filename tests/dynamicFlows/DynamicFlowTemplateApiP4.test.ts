import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, it, vi } from "vitest";

const { baseQueryMock } = vi.hoisted(() => ({ baseQueryMock: vi.fn() }));

vi.mock("../../src/api/base/axiosBaseQuery", () => ({
  axiosBaseQuery: () => (request: unknown) => baseQueryMock(request),
}));

import { baseApi } from "../../src/api/base/baseApi";
import {
  decodeFlowDefinitionSnapshotV2,
  dynamicFlowTemplateApi,
  DynamicFlowResponseContractError,
  type FlowDefinitionPayloadV2,
} from "../../src/api/dynamicFlowTemplateApi";

const payload = {
  schemaVersion: 2,
  archetypeId: "LINEAR_REVIEW",
  entryStepId: "step-1",
  formNodes: [
    { formNodeId: "form-node-1", role: "ROOT", dynamicFormTemplateId: "form-version-1" },
  ],
  nodes: [
    {
      nodeId: "step-1",
      nodeCode: "STEP_1",
      nodeKind: "FORM_STEP",
      name: null,
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

const validFieldPolicy = {
  policyId: "field-policy-1",
  dynamicFormTemplateId: "form-version-1",
  stepId: "step-1",
  stepCode: "STEP_1",
  actorRole: "ASSIGNEE",
  fieldId: null,
  fieldKey: "total",
  read: true,
  write: null,
  required: null,
  hidden: false,
  locked: null,
  lockedAfterSubmit: null,
};

const validMappingEndpoint = {
  kind: "FIELD",
  dynamicFormTemplateId: "form-version-1",
  stepId: "step-1",
  stepCode: "STEP_1",
  sectionId: null,
  sectionCode: null,
  fieldId: null,
  fieldKey: "total",
  blockId: null,
  columnKey: null,
  rowKey: null,
  dataType: "NUMBER",
};

const validMappingRule = {
  mappingId: "mapping-total",
  mappingVersion: 1,
  mappingKind: "FIELD",
  inputs: [{
    inputKey: "source",
    source: validMappingEndpoint,
    dataType: "NUMBER",
    cardinality: "ONE",
    nullPolicy: "KEEP_NULL",
    constantValue: null,
  }],
  target: validMappingEndpoint,
  calculation: {
    kind: "DIRECT",
    operation: null,
    resultDataType: "NUMBER",
    expression: null,
    functionCode: null,
    functionVersion: null,
    arguments: null,
    defaultValue: null,
  },
  conceptCode: "TOTAL",
  evaluationGrain: "SOURCE_REPORT",
  errorPolicy: "BLOCK_APPLY",
};

function withoutKey(record: Record<string, unknown>, key: string) {
  return Object.fromEntries(Object.entries(record).filter(([field]) => field !== key));
}

function decodeDraftSnapshot(overrides: Record<string, unknown>) {
  return decodeFlowDefinitionSnapshotV2(
    {
      ...payload,
      catalogVersion: null,
      catalogSemanticHash: null,
      formNodes: payload.formNodes.map((form) => ({
        ...form,
        dynamicFormFamilyId: null,
        dynamicFormVersionNo: null,
        dynamicFormSchemaHash: null,
        dynamicFormSnapshotHash: null,
      })),
      ...overrides,
    },
    "response.payload",
    true,
  );
}

function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  });
}

afterEach(() => {
  baseQueryMock.mockReset();
});

describe("dynamic Flow P4 API requests", () => {
  it.each([
    ["empty field policy", { fieldPolicies: [{}] }, "response.payload.fieldPolicies[0].policyId"],
    ["null field policy", { fieldPolicies: [null] }, "response.payload.fieldPolicies[0]"],
    [
      "missing tri-state decision",
      { fieldPolicies: [withoutKey(validFieldPolicy, "write")] },
      "response.payload.fieldPolicies[0].write",
    ],
    [
      "unknown policy actor role",
      { fieldPolicies: [{ ...validFieldPolicy, actorRole: "ADMINISTRATOR" }] },
      "response.payload.fieldPolicies[0].actorRole",
    ],
    ["empty mapping rule", { mappingRules: [{}] }, "response.payload.mappingRules[0].mappingId"],
    ["null mapping rule", { mappingRules: [null] }, "response.payload.mappingRules[0]"],
    [
      "malformed mapping input",
      { mappingRules: [{ ...validMappingRule, inputs: [{}] }] },
      "response.payload.mappingRules[0].inputs[0].inputKey",
    ],
    [
      "null mapping source",
      {
        mappingRules: [{
          ...validMappingRule,
          inputs: [{ ...validMappingRule.inputs[0], source: null }],
        }],
      },
      "response.payload.mappingRules[0].inputs[0].source",
    ],
    [
      "unknown mapping endpoint kind",
      {
        mappingRules: [{
          ...validMappingRule,
          target: { ...validMappingEndpoint, kind: "BOGUS" },
        }],
      },
      "response.payload.mappingRules[0].target.kind",
    ],
  ])("fails closed on malformed definition %s", (_label, overrides, expectedPath) => {
    try {
      decodeDraftSnapshot(overrides);
      throw new Error("Expected malformed definition response to be rejected.");
    } catch (error) {
      expect(error).toBeInstanceOf(DynamicFlowResponseContractError);
      expect((error as DynamicFlowResponseContractError).path).toBe(expectedPath);
    }
  });

  it("accepts exact policy and structured mapping response shapes", () => {
    expect(() => decodeDraftSnapshot({
      fieldPolicies: [validFieldPolicy],
      mappingRules: [validMappingRule],
    })).not.toThrow();
  });

  it("sends strict command and CAS tokens to canonical family/version endpoints", async () => {
    baseQueryMock.mockResolvedValue({
      error: { status: 409, errorCode: "DYNAMIC_FLOW_REVISION_CONFLICT", message: "stale" },
    });
    const store = makeStore();

    const requests = [
      store.dispatch(
        dynamicFlowTemplateApi.endpoints.createDynamicFlowTemplateFamily.initiate({
          commandId: "command-create-0001",
          code: "FLOW_A",
          name: "Flow A",
          payload,
        }),
      ),
      store.dispatch(
        dynamicFlowTemplateApi.endpoints.archiveDynamicFlowTemplateFamily.initiate({
          familyId: "family-1",
          body: { commandId: "command-archive-0001", expectedFamilyRevision: 7 },
        }),
      ),
      store.dispatch(
        dynamicFlowTemplateApi.endpoints.saveDynamicFlowTemplateVersionDraftP4.initiate({
          familyId: "family-1",
          versionId: "version-2",
          body: {
            commandId: "command-save-0001",
            expectedDraftRevision: 4,
            expectedPayloadHash: "payload-hash-4",
            payload,
          },
        }),
      ),
      store.dispatch(
        dynamicFlowTemplateApi.endpoints.lockDynamicFlowTemplateVersionP4.initiate({
          familyId: "family-1",
          versionId: "version-2",
          body: {
            commandId: "command-lock-0001",
            expectedFamilyRevision: 7,
            expectedDraftRevision: 4,
            expectedPayloadHash: "payload-hash-4",
          },
        }),
      ),
      store.dispatch(
        dynamicFlowTemplateApi.endpoints.diffDynamicFlowTemplateVersions.initiate({
          familyId: "family-1",
          body: { fromVersionId: "version-1", toVersionId: "version-2" },
        }),
      ),
    ];

    await Promise.all(requests.map((request) => expect(request.unwrap()).rejects.toMatchObject({ status: 409 })));

    expect(baseQueryMock.mock.calls.map(([request]) => request)).toEqual([
      {
        url: "/dynamic-flow-templates",
        method: "POST",
        data: { commandId: "command-create-0001", code: "FLOW_A", name: "Flow A", payload },
        headers: { "Idempotency-Key": "command-create-0001" },
      },
      {
        url: "/dynamic-flow-templates/family-1/archive",
        method: "POST",
        data: { commandId: "command-archive-0001", expectedFamilyRevision: 7 },
      },
      {
        url: "/dynamic-flow-templates/family-1/versions/version-2/draft",
        method: "PUT",
        data: {
          commandId: "command-save-0001",
          expectedDraftRevision: 4,
          expectedPayloadHash: "payload-hash-4",
          payload,
        },
      },
      {
        url: "/dynamic-flow-templates/family-1/versions/version-2/lock",
        method: "POST",
        data: {
          commandId: "command-lock-0001",
          expectedFamilyRevision: 7,
          expectedDraftRevision: 4,
          expectedPayloadHash: "payload-hash-4",
        },
      },
      {
        url: "/dynamic-flow-templates/family-1/versions/diff",
        method: "POST",
        data: { fromVersionId: "version-1", toVersionId: "version-2" },
      },
    ]);
  });
});
