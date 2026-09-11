import { describe, expect, it } from "vitest";

import type {
  P8DiffConfigPayload,
  P8DynamicFormStatisticLabelSnapshot,
  P8DynamicFormStatisticsReadback,
} from "../../src/api/statConfigApi";
import {
  advancedTargetForDataType,
  availableOrderingFieldIds,
  basicPeriodForMode,
  canonicalBasicOwnerId,
  defaultDiffPayload,
  dynamicFormClassificationCodes,
  diffDraftValidationIssues,
  hydrateDiffPayload,
  isDynamicFormVirtualReadback,
  isReadinessTerminal,
  pinnedLabelLayers,
  readinessSurfaceState,
  setDiffSharedPeriodMode,
  setDiffSharedSelector,
  setDiffSharedSourceScope,
  sourceScopeForMode,
  sourceScopeValidationIssues,
  syncOrderingAfterTargetRename,
  toggleEnumValue,
} from "../../src/pages/works/statistics/statisticsConfigurationPanelModel";

describe("P8 high-risk configuration panel model", () => {
  it("binds the EMPTY bundle to the canonical Basic owner", () => {
    expect(canonicalBasicOwnerId("assignment-1", "form-1"))
      .toBe("assignment-1:form-1");
  });

  it("collects classification codes from canonical form, section, field and block tags", () => {
    expect(dynamicFormClassificationCodes({
      tagCodes: ["FORM", "dup"],
      schema: {
        sections: [{ tagCodes: ["SECTION", "DUP", ""] }],
        fields: [{ tagCodes: ["FIELD"] }],
        blocks: [{ tagCodes: ["BLOCK", "section"] }],
      },
    })).toEqual(["FORM", "dup", "SECTION", "FIELD", "BLOCK"]);
    expect(dynamicFormClassificationCodes(null)).toEqual([]);
  });
  it("clears inapplicable source-scope fields and applies contract-specific FLOW fields", () => {
    const stale = {
      mode: "FLOW_STEP",
      flowInstanceId: "0123456789abcdef01234567",
      flowStepId: "step-a",
      flowBranchId: "stale-branch",
      flowEffectiveStatus: "ANY",
    };

    expect(sourceScopeForMode(stale, "SELF", "BASIC")).toEqual({
      mode: "SELF",
      flowInstanceId: null,
      flowStepId: null,
      flowBranchId: null,
      flowEffectiveStatus: null,
    });
    expect(sourceScopeForMode(stale, "FLOW_BRANCH", "ADVANCED")).toEqual({
      mode: "FLOW_BRANCH",
      flowInstanceId: "0123456789abcdef01234567",
      flowStepId: null,
      flowBranchId: "",
      flowEffectiveStatus: "ANY",
    });
    expect(sourceScopeForMode(stale, "FLOW_FINAL", "DIFF")).toEqual({
      mode: "FLOW_FINAL",
      flowInstanceId: "0123456789abcdef01234567",
      flowStepId: null,
      flowBranchId: null,
      flowEffectiveStatus: null,
    });

    expect(sourceScopeValidationIssues({
      mode: "FLOW_STEP",
      flowInstanceId: "flow-instance",
      flowStepId: "x".repeat(257),
      flowBranchId: null,
      flowEffectiveStatus: "EFFECTIVE",
    }, "BASIC")).toContain("FLOW_STEP_ID_INVALID");

    expect(sourceScopeValidationIssues({
      mode: "FLOW_STEP",
      flowInstanceId: "flow-instance",
      flowStepId: "step\u009f",
      flowBranchId: null,
      flowEffectiveStatus: "EFFECTIVE",
    }, "BASIC")).toContain("FLOW_STEP_ID_INVALID");

    expect(sourceScopeValidationIssues(
      { mode: "FLOW_BRANCH", flowInstanceId: "not-object-id", flowBranchId: "", flowEffectiveStatus: "EFFECTIVE" },
      "ADVANCED",
    )).toEqual(expect.arrayContaining([
      "FLOW_INSTANCE_ID_OBJECT_ID_REQUIRED",
      "FLOW_BRANCH_ID_REQUIRED",
    ]));
  });

  it("clears stale Basic period fields for every period mode", () => {
    expect(basicPeriodForMode("ALL_PERIODS")).toEqual({
      mode: "ALL_PERIODS",
      periodKey: null,
      periodKeyFrom: null,
      periodKeyTo: null,
    });
    expect(basicPeriodForMode("SINGLE_PERIOD")).toEqual({
      mode: "SINGLE_PERIOD",
      periodKey: "",
      periodKeyFrom: null,
      periodKeyTo: null,
    });
    expect(basicPeriodForMode("PERIOD_RANGE")).toEqual({
      mode: "PERIOD_RANGE",
      periodKey: null,
      periodKeyFrom: "",
      periodKeyTo: "",
    });
  });

  it("keeps grouping unique and resets typed operations/orderings safely", () => {
    expect(toggleEnumValue(["UNIT"], "PERIOD")).toEqual(["UNIT", "PERIOD"]);
    expect(toggleEnumValue(["UNIT", "PERIOD"], "UNIT")).toEqual(["PERIOD"]);
    expect(advancedTargetForDataType(
      { fieldId: "amount", dataType: "NUMBER", operation: "SUM" },
      "DATE",
    )).toEqual({ fieldId: "amount", dataType: "DATE", operation: "COUNT" });

    expect(syncOrderingAfterTargetRename(
      [{ fieldId: "amount", direction: "ASC" }],
      "amount",
      "total",
    )).toEqual([{ fieldId: "total", direction: "ASC" }]);
    expect(syncOrderingAfterTargetRename(
      [{ fieldId: "amount", direction: "ASC" }],
      "amount",
      "",
    )).toEqual([]);
    expect(availableOrderingFieldIds(
      [{ fieldId: "a" }, { fieldId: "b" }, { fieldId: "a" }, { fieldId: "" }],
      [{ fieldId: "a", direction: "ASC" }],
    )).toEqual(["b"]);
  });

  it("hydrates virtual Diff with a schema-shaped draft and synchronizes shared fields", () => {
    const virtual = hydrateDiffPayload(
      { name: null, left: null, right: null, direction: null, missingPolicy: null, emptyPolicy: null },
      true,
    );
    expect(virtual).toEqual(defaultDiffPayload());
    expect(virtual.left?.sourceScope).toEqual({
      mode: "DIRECT_CHILDREN_OR_SELF",
      flowInstanceId: null,
      flowStepId: null,
      flowBranchId: null,
      flowEffectiveStatus: null,
    });

    let draft: P8DiffConfigPayload = { ...virtual, missingPolicy: "AS_ZERO" };
    draft = setDiffSharedSelector(draft, "conceptKind", "FIELD");
    draft = setDiffSharedSelector(draft, "conceptCode", "shared.code");
    draft = setDiffSharedSelector(draft, "dataType", "TEXT");
    expect(draft.left?.selector?.dataType).toBe("TEXT");
    expect(draft.right?.selector?.dataType).toBe("TEXT");
    expect(draft.missingPolicy).toBe("REJECT");

    draft = setDiffSharedPeriodMode(draft, "RANGE");
    expect(draft.left?.period).toEqual({
      mode: "RANGE",
      periodKey: null,
      periodKeyFrom: "",
      periodKeyTo: "",
    });
    expect(draft.right?.period).toEqual(draft.left?.period);

    const scope = sourceScopeForMode(undefined, "FLOW_FINAL", "DIFF");
    scope.flowInstanceId = "0123456789abcdef01234567";
    draft = setDiffSharedSourceScope(draft, scope);
    expect(draft.right?.sourceScope).toEqual(draft.left?.sourceScope);
    expect(draft.left?.sourceScope?.flowEffectiveStatus).toBeNull();
  });

  it("blocks incomplete/incompatible Diff drafts before mutation", () => {
    const incomplete = defaultDiffPayload();
    expect(diffDraftValidationIssues(incomplete)).toEqual(expect.arrayContaining([
      "NAME_REQUIRED",
      "LEFT_CONCEPT_KEY_REQUIRED",
      "RIGHT_CONCEPT_KEY_REQUIRED",
      "LEFT_PERIOD_KEY_REQUIRED",
      "RIGHT_PERIOD_KEY_REQUIRED",
    ]));

    let valid = defaultDiffPayload();
    valid = {
      ...valid,
      name: "Month comparison",
      left: {
        ...valid.left,
        selector: { ...valid.left?.selector, conceptKey: "field-a", conceptCode: "shared.code" },
        period: { mode: "EXACT", periodKey: "2026-07", periodKeyFrom: null, periodKeyTo: null },
      },
      right: {
        ...valid.right,
        selector: { ...valid.right?.selector, conceptKey: "field-b", conceptCode: "shared.code" },
        period: { mode: "EXACT", periodKey: "2026-08", periodKeyFrom: null, periodKeyTo: null },
      },
    };
    expect(diffDraftValidationIssues(valid)).toEqual([]);

    expect(diffDraftValidationIssues({ ...valid, name: "x".repeat(201) }))
      .toContain("NAME_INVALID");
    expect(diffDraftValidationIssues({
      ...valid,
      left: {
        ...valid.left!,
        selector: { ...valid.left!.selector, conceptKey: `bad${String.fromCharCode(1)}key` },
        period: { mode: "EXACT", periodKey: "p".repeat(129), periodKeyFrom: null, periodKeyTo: null },
      },
    })).toEqual(expect.arrayContaining([
      "LEFT_CONCEPT_KEY_INVALID",
      "LEFT_PERIOD_KEY_INVALID",
    ]));

    const incompatible = setDiffSharedSelector(valid, "dataType", "TEXT");
    incompatible.missingPolicy = "AS_ZERO";
    expect(diffDraftValidationIssues(incompatible)).toContain("DIFF_MISSING_POLICY_INCOMPATIBLE");
  });

  it("maps readiness lifecycle exactly and stops only terminal polling", () => {
    expect(readinessSurfaceState("QUEUED")).toBe("LOADING");
    expect(readinessSurfaceState("RUNNING")).toBe("LOADING");
    expect(readinessSurfaceState("RETRYING")).toBe("RETRYING");
    expect(readinessSurfaceState("RESET")).toBe("RETRYING");
    expect(readinessSurfaceState("DONE")).toBe("SUCCESS");
    expect(readinessSurfaceState("FAILED")).toBe("ERROR");
    expect(readinessSurfaceState("CANCELLED")).toBe("ERROR");
    expect(readinessSurfaceState("future-state")).toBe("UNSUPPORTED");

    expect(isReadinessTerminal("DONE")).toBe(true);
    expect(isReadinessTerminal("FAILED")).toBe(true);
    expect(isReadinessTerminal("CANCELLED")).toBe(true);
    expect(isReadinessTerminal("RESET")).toBe(false);
  });

  it("distinguishes virtual Dynamic Form state and derives three statistic layers from pinned snapshots", () => {
    const snapshot = (
      code: string,
      usage: string,
    ): P8DynamicFormStatisticLabelSnapshot => ({
      labelId: `label-${code}`,
      code,
      dataType: "TEXT",
      usage,
      scopeType: "GLOBAL",
      scopeId: null,
      isActive: true,
      versionNo: 1,
      versionId: `version-${code}`,
      configHash: code.padEnd(64, "a").slice(0, 64),
    });
    const form: P8DynamicFormStatisticsReadback = {
      ownerKind: "DYNAMIC_FORM",
      ownerId: "form-1",
      configId: "form-1",
      versionId: "form-1",
      versionNo: 1,
      revision: 1,
      status: "DRAFT",
      configHash: "a".repeat(64),
      dependencyPins: [],
      permissions: {
        canReadConfig: true,
        canManageDraft: false,
        canLockVersion: false,
        canViewResult: false,
        canReadDiagnostics: false,
      },
      fields: [{
        fieldId: "field-1",
        fieldType: "TEXT",
        isStatistic: true,
        statistic: { aggregateOps: ["COUNT"] },
        statisticLabelCodes: ["field-label"],
        labelSnapshots: [snapshot("field-label", "STATISTIC")],
        structureHash: "b".repeat(64),
      }],
      tableConfig: [{
        blockId: "table-1",
        tableMode: "DYNAMIC_ROWS",
        statisticsDisabled: false,
        rowLabelDataType: "TEXT",
        metrics: [],
        metricLabelTargets: [{
          metricKey: "metric-1",
          statisticLabelCode: "metric-label",
          dataType: "NUMBER",
          labelSnapshot: snapshot("metric-label", "TABLE_TARGET"),
        }],
        allowedRowLabelCodes: ["row-label"],
        rowLabelSnapshots: [snapshot("row-label", "TABLE_TARGET")],
        structureHash: "c".repeat(64),
        schemaSource: "FORM",
      }],
      fieldSectionHash: "d".repeat(64),
      tableSectionHash: "e".repeat(64),
      versions: [],
      receiptId: null,
    };

    expect(isDynamicFormVirtualReadback(form)).toBe(true);
    const layers = pinnedLabelLayers(form);
    expect(layers).not.toHaveProperty("classification");
    expect(layers.field.map((item) => item.code)).toEqual(["field-label"]);
    expect(layers.metric.map((item) => item.code)).toEqual(["metric-label"]);
    expect(layers.row.map((item) => item.code)).toEqual(["row-label"]);
  });
});
