import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  decodeDynamicFlowPermissionMetadata,
  decodeDynamicFlowTemplateVersionDetail,
  DynamicFlowResponseContractError,
  type DynamicFlowPermissionMetadata,
} from "../../src/api/dynamicFlowTemplateApi";
import {
  DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_SHA256,
  DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_VERSION,
} from "../../src/generated/dynamicFormFlowCapabilityCatalog.generated";
import { DynamicFlowEligibilityBadges } from "../../src/pages/dynamicFlows/DynamicFlowEligibilityBadges";

const blockedMetadata = {
  canRead: true,
  canManage: false,
  executeGrant: true,
  definitionLockable: true,
  executionEligibility: "BLOCKED_UNTIL_TARGET_PHASE",
  executionBlockedReason: "TARGET_PHASE_NOT_IMPLEMENTED",
  blockedUntilPhase: "P5",
  canExecute: false,
} satisfies DynamicFlowPermissionMetadata;

describe("dynamic Flow P4 eligibility", () => {
  it("renders permission dimensions and an explicit target-phase blocked badge", () => {
    render(<DynamicFlowEligibilityBadges metadata={blockedMetadata} />);

    expect(screen.getByText("Có quyền xem")).toBeInTheDocument();
    expect(screen.getByText("Chỉ đọc")).toBeInTheDocument();
    expect(screen.getByText("Có cấp quyền thực thi")).toBeInTheDocument();
    expect(screen.getByText("Snapshot khóa đã được xác nhận")).toBeInTheDocument();
    expect(screen.getByText("Thực thi bị chặn đến P5")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /khởi chạy|thực thi quy trình/i })).not.toBeInTheDocument();
  });

  it("describes a missing lock attestation as a server check, not a lock denial", () => {
    render(
      <DynamicFlowEligibilityBadges
        metadata={{ ...blockedMetadata, definitionLockable: false }}
      />,
    );

    expect(screen.getByText("Khóa sẽ được backend kiểm tra")).toBeInTheDocument();
    expect(screen.queryByText("Định nghĩa chưa thể khóa")).not.toBeInTheDocument();
  });

  it("decodes the server-derived blocked shape and rejects a fail-open canExecute value", () => {
    expect(decodeDynamicFlowPermissionMetadata(blockedMetadata)).toEqual(blockedMetadata);
    const p7Metadata = { ...blockedMetadata, blockedUntilPhase: "P7" } as const;
    expect(decodeDynamicFlowPermissionMetadata(p7Metadata)).toEqual(p7Metadata);
    expect(() =>
      decodeDynamicFlowPermissionMetadata({ ...blockedMetadata, canExecute: true }),
    ).toThrowError(DynamicFlowResponseContractError);
  });

  it("accepts exact current and historical locked pins, but rejects any catalog hash drift", () => {
    const catalogHash =
      "e8a0b15bb5c7cab81ed49ec5c213105366a1194faa2d78168a46226d9cc505cf";
    const formSchemaHash = "b".repeat(64);
    const formSnapshotHash = "c".repeat(64);
    const response = {
      id: "version-1",
      templateId: "family-1",
      familyId: "family-1",
      rootDynamicFormTemplateId: "form-version-1",
      dynamicFormTemplateId: "form-version-1",
      versionNo: 1,
      status: "LOCKED",
      draftRevision: 2,
      schemaVersion: 2,
      adapterVersion: 1,
      catalogVersion: "1.1",
      catalogSemanticHash: catalogHash,
      lineage: { originFamilyId: null, originVersionId: null },
      payload: {
        schemaVersion: 2,
        archetypeId: "FLOW-T01",
        entryStepId: "step-1",
        rootDynamicFormTemplateId: "form-version-1",
        resultOwnerStepId: null,
        resultOwnerFormNodeId: null,
        statisticsOwnerStepId: null,
        statisticsOwnerFormNodeId: null,
        catalogVersion: "1.1",
        catalogSemanticHash: catalogHash,
        formNodes: [
          {
            formNodeId: "form-node-1",
            role: "ROOT",
            dynamicFormTemplateId: "form-version-1",
            dynamicFormFamilyId: "form-family-1",
            dynamicFormVersionNo: 3,
            dynamicFormSchemaHash: formSchemaHash,
            dynamicFormSnapshotHash: formSnapshotHash,
          },
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
        rollbackPolicy: {},
        finalResultPolicy: {},
        statisticProfile: {},
      },
      payloadHash: "d".repeat(64),
      contributionPolicy: null,
      contributionPolicyHash: null,
      contributionWarning: null,
      isUsed: false,
      ...blockedMetadata,
      migrationState: "CANONICAL",
      lockedAtUtc: "2026-07-23T00:00:00Z",
      lockedByUserId: "owner-1",
      archivedAtUtc: null,
      archivedByUserId: null,
      createdAtUtc: "2026-07-23T00:00:00Z",
      updatedAtUtc: "2026-07-23T00:00:00Z",
    };

    expect(decodeDynamicFlowTemplateVersionDetail(response)).toBe(response);

    const v12Hash =
      "b26549d5de7a3d93bd6fc9bab7bfdfbdaffb66a01347039b2c3629692b60068f";
    const v12Response = {
      ...response,
      catalogVersion: "1.2",
      catalogSemanticHash: v12Hash,
      payload: {
        ...response.payload,
        catalogVersion: "1.2",
        catalogSemanticHash: v12Hash,
      },
    };
    expect(decodeDynamicFlowTemplateVersionDetail(v12Response)).toBe(v12Response);

    const currentResponse = {
      ...response,
      catalogVersion: DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_VERSION,
      catalogSemanticHash: DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_SHA256,
      payload: {
        ...response.payload,
        catalogVersion: DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_VERSION,
        catalogSemanticHash: DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_SHA256,
      },
    };
    expect(decodeDynamicFlowTemplateVersionDetail(currentResponse)).toBe(currentResponse);

    const currentReviewerResponse = {
      ...currentResponse,
      payload: {
        ...currentResponse.payload,
        formNodes: [
          ...currentResponse.payload.formNodes,
          {
            formNodeId: "form-node-reviewer",
            role: "REVIEWER",
            dynamicFormTemplateId: "form-version-reviewer",
            dynamicFormFamilyId: "form-family-reviewer",
            dynamicFormVersionNo: 4,
            dynamicFormSchemaHash: "6".repeat(64),
            dynamicFormSnapshotHash: "7".repeat(64),
          },
        ],
      },
    };
    expect(decodeDynamicFlowTemplateVersionDetail(currentReviewerResponse))
      .toBe(currentReviewerResponse);

    const driftedResponse = {
      ...currentResponse,
      catalogSemanticHash: `0${DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_SHA256.slice(1)}`,
      payload: {
        ...currentResponse.payload,
        catalogSemanticHash: `0${DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_SHA256.slice(1)}`,
      },
    };
    expect(() => decodeDynamicFlowTemplateVersionDetail(driftedResponse)).toThrowError(
      DynamicFlowResponseContractError,
    );
  });

  it("reads a REQUIRES_REVIEW legacy snapshot without trusting nullable catalog pins", () => {
    const response = {
      id: "legacy-version-1",
      templateId: "legacy-family-1",
      familyId: "legacy-family-1",
      rootDynamicFormTemplateId: "legacy-form-1",
      dynamicFormTemplateId: "legacy-form-1",
      versionNo: 1,
      status: "LOCKED",
      draftRevision: 1,
      schemaVersion: null,
      adapterVersion: null,
      catalogVersion: null,
      catalogSemanticHash: null,
      lineage: { originFamilyId: null, originVersionId: null },
      payload: {
        schemaVersion: null,
        archetypeId: "LEGACY_UNKNOWN",
        entryStepId: "legacy-step-1",
        rootDynamicFormTemplateId: "legacy-form-1",
        resultOwnerStepId: null,
        resultOwnerFormNodeId: null,
        statisticsOwnerStepId: null,
        statisticsOwnerFormNodeId: null,
        catalogVersion: null,
        catalogSemanticHash: null,
        formNodes: [
          {
            formNodeId: "legacy-form-node-1",
            role: "ROOT",
            dynamicFormTemplateId: "legacy-form-1",
            dynamicFormFamilyId: null,
            dynamicFormVersionNo: null,
            dynamicFormSchemaHash: null,
            dynamicFormSnapshotHash: null,
          },
        ],
        nodes: [
          {
            nodeId: "legacy-step-1",
            nodeCode: "LEGACY_STEP_1",
            nodeKind: "FORM_STEP",
            name: null,
            formNodeId: "legacy-form-node-1",
            declaredRoles: ["ASSIGNEE"],
            gateway: null,
          },
        ],
        edges: [],
        actorPolicies: [],
        fieldPolicies: [],
        tableColumnPolicies: [],
        mappingRules: [],
        rollbackPolicy: {},
        finalResultPolicy: {},
        statisticProfile: {},
      },
      payloadHash: "e".repeat(64),
      contributionPolicy: null,
      contributionPolicyHash: null,
      contributionWarning: null,
      isUsed: false,
      ...blockedMetadata,
      migrationState: "REQUIRES_REVIEW",
      lockedAtUtc: "2026-07-23T00:00:00Z",
      lockedByUserId: "owner-1",
      archivedAtUtc: null,
      archivedByUserId: null,
      createdAtUtc: "2026-07-23T00:00:00Z",
      updatedAtUtc: "2026-07-23T00:00:00Z",
    };

    expect(decodeDynamicFlowTemplateVersionDetail(response)).toBe(response);
    expect(() =>
      decodeDynamicFlowTemplateVersionDetail({ ...response, migrationState: "CANONICAL" }),
    ).toThrowError(DynamicFlowResponseContractError);
  });
});
