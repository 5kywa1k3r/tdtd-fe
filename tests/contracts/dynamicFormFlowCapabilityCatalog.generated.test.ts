import { describe, expect, it } from "vitest";
import {
  DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_SHA256,
  DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_VERSION,
  DYNAMIC_FORM_FLOW_CAPABILITY_SCHEMA_SHA256,
  dynamicFormFlowCapabilityCatalogMetadata,
} from "../../src/generated/dynamicFormFlowCapabilityCatalog.generated";

const expectedIdentityByVersion = {
  "1.6": {
    catalogSha256: "39cdb98dda168f5901f48a94640fe5d50943c5bd78ed32d5e05e8b719b23d13b",
    schemaSha256: "da0c80f265845f24aaf282e0a0369272273b1986520dae07171cda85b28b3fed",
  },
  "1.7": {
    catalogSha256: "ccb28afafc068ac1b720c046a25276a35d9d828b14f9cc9c9bc690077ca204c1",
    schemaSha256: "5842baf176bf1eec453b718d07e50da55a417aa9036f4f097ccfbb6fc58c1978",
  },
} as const;
type PublishedCatalogVersion = keyof typeof expectedIdentityByVersion;

describe("generated Dynamic Form and Flow capability catalog", () => {
  it("keeps the published version and semantic hashes locked", () => {
    const catalogVersion = String(DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_VERSION);
    if (!(catalogVersion in expectedIdentityByVersion)) {
      throw new Error("Unknown catalog version '" + catalogVersion + "'.");
    }
    const expectedIdentity =
      expectedIdentityByVersion[catalogVersion as PublishedCatalogVersion];
    expect(DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_SHA256).toBe(
      expectedIdentity.catalogSha256,
    );
    expect(DYNAMIC_FORM_FLOW_CAPABILITY_SCHEMA_SHA256).toBe(
      expectedIdentity.schemaSha256,
    );
    expect(dynamicFormFlowCapabilityCatalogMetadata.catalogVersion).toBe(
      DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_VERSION,
    );
    expect(dynamicFormFlowCapabilityCatalogMetadata.catalogSha256).toBe(
      DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_SHA256,
    );
    expect(dynamicFormFlowCapabilityCatalogMetadata.schemaSha256).toBe(
      DYNAMIC_FORM_FLOW_CAPABILITY_SCHEMA_SHA256,
    );
  });

  it("exposes the complete locked capability domains", () => {
    const { domains } = dynamicFormFlowCapabilityCatalogMetadata;

    expect(domains.dynamicFormFieldTypes.map(({ id }) => id)).toEqual([
      "shortText",
      "longText",
      "richText",
      "stringList",
      "number",
      "date",
      "fullDate",
      "singleSelect",
      "multiSelect",
      "boolean",
    ]);
    expect(domains.dynamicFormValueSources.map(({ id }) => id)).toEqual([
      "FIXED_ENUM",
      "ENUM_CATALOG",
      "SYSTEM_UNIT",
      "SYSTEM_USER",
      "SYSTEM_POSITION",
      "SYSTEM_UNIT_TYPE",
    ]);
    expect(domains.dynamicFormTableModes.map(({ id }) => id)).toEqual([
      "FIXED_GRID",
      "APPEND_ROWS",
      "APPEND_COLUMNS",
      "MATRIX",
      "SUMMARY_TEMPLATE",
    ]);
    expect(domains.dynamicFormFieldTypes.every(({ status }) => status === "SUPPORTED")).toBe(true);
    expect(domains.dynamicFormValueSources.every(({ status }) => status === "SUPPORTED")).toBe(true);
    expect(domains.dynamicFormTableModes.every(({ status }) => status === "SUPPORTED")).toBe(true);
    expect(domains.dynamicFlowArchetypes.map(({ id }) => id)).toEqual(
      Array.from({ length: 12 }, (_, index) => `FLOW-T${String(index + 1).padStart(2, "0")}`),
    );
    expect(
      domains.dynamicFlowArchetypes.map(({ id, status, targetPhase }) => ({
        id,
        status,
        targetPhase,
      })),
    ).toEqual(
      Array.from({ length: 12 }, (_, index) => ({
        id: `FLOW-T${String(index + 1).padStart(2, "0")}`,
        status: "SUPPORTED",
        targetPhase: index < 2 ? "P5" : "P6",
      })),
    );
    expect(domains.statisticsCapabilities.map(({ id }) => id)).toEqual([
      "DIRECT_FIELD_TABLE_LABEL",
      "BASIC_SUMMARY",
      "ADVANCED_SUMMARY",
      "DIFF",
      "FLOW_SCOPES",
      "FLOW_STATISTIC_PROFILE",
    ]);
    expect(domains.statisticsConfigurationCapabilities.map(({ id }) => id)).toEqual([
      "LABEL_TAXONOMY_CONFIG",
      "FIELD_METADATA_CONFIG",
      "TABLE_METADATA_CONFIG",
      "BASIC_SUMMARY_CONFIG",
      "FLOW_SCOPE_CONFIG",
      "ADVANCED_SUMMARY_CONFIG",
      "DIFF_CONFIG",
      "FLOW_CONTRIBUTION_CONFIG",
      "FLOW_STATISTIC_PROFILE_BARRIER",
      "CONFIG_OPERATIONS_READINESS",
      "CONFIG_BUNDLE_READBACK",
    ]);
    expect(
      domains.statisticsConfigurationCapabilities.every(
        ({ status, targetPhase, notes }) => status === "SUPPORTED" && targetPhase === "P8" && notes.length > 0,
      ),
    ).toBe(true);

    const successorDomains = domains as typeof domains & {
      readonly statisticsReconciliationCapabilities?: readonly {
        readonly id: string;
        readonly name: string;
        readonly status: string;
        readonly targetPhase: string;
        readonly testPrefix: string;
        readonly uiSurface: string;
      }[];
    };
    const reconciliation =
      successorDomains.statisticsReconciliationCapabilities;
    const catalogVersion = String(
      DYNAMIC_FORM_FLOW_CAPABILITY_CATALOG_VERSION,
    );
    if (catalogVersion === "1.6") {
      expect(reconciliation).toBeUndefined();
    } else if (catalogVersion === "1.7") {
      expect(reconciliation).toEqual([
        {
          id: "SOURCE_TO_RESULT_RECONCILIATION",
          name: "Source-to-result statistics reconciliation",
          status: "SUPPORTED",
          targetPhase: "P10",
          testPrefix: "P10-RECONCILE",
          uiSurface: "STAT_RECONCILIATION",
        },
        {
          id: "EXPECTED_ACTUAL_DELTA",
          name: "Expected-versus-actual typed delta",
          status: "SUPPORTED",
          targetPhase: "P10",
          testPrefix: "P10-DELTA",
          uiSurface: "STAT_RECONCILIATION",
        },
        {
          id: "INDEPENDENT_REVIEW_SIGNOFF",
          name: "Independent reconciliation review sign-off",
          status: "SUPPORTED",
          targetPhase: "P10",
          testPrefix: "P10-REVIEW",
          uiSurface: "STAT_RECONCILIATION_REVIEW",
        },
        {
          id: "RECONCILIATION_EVIDENCE_EXPORT",
          name: "Deterministic reconciliation evidence export",
          status: "SUPPORTED",
          targetPhase: "P10",
          testPrefix: "P10-EVIDENCE",
          uiSurface: "STAT_RECONCILIATION_EVIDENCE",
        },
      ]);
    } else {
      throw new Error("Unknown catalog version '" + catalogVersion + "'.");
    }

    expect(
      domains.dynamicFlowMappingCapabilities.map(({ id, status, targetPhase }) => ({
        id,
        status,
        targetPhase,
      })),
    ).toEqual([
      { id: "FIELD_TYPED", status: "SUPPORTED", targetPhase: "P7" },
      { id: "FIXED_GRID", status: "SUPPORTED", targetPhase: "P7" },
      { id: "APPEND_ROWS", status: "SUPPORTED", targetPhase: "P7" },
      { id: "MATRIX_SPARSE", status: "SUPPORTED", targetPhase: "P7" },
      { id: "SOURCE_REPORT_GRAIN", status: "SUPPORTED", targetPhase: "P7" },
      { id: "GROUP_GRAIN", status: "INTENTIONAL_BLOCK", targetPhase: null },
      { id: "CUSTOM_JOIN_KEY", status: "INTENTIONAL_BLOCK", targetPhase: null },
      { id: "APPEND_COLUMNS_TARGET", status: "INTENTIONAL_BLOCK", targetPhase: null },
      { id: "SCALAR_TO_ROW", status: "INTENTIONAL_BLOCK", targetPhase: null },
      { id: "ROW_TO_REPORT", status: "INTENTIONAL_BLOCK", targetPhase: null },
    ]);
  });

  it("keeps lifecycle safety defaults and the statistic profile block", () => {
    const metadata = dynamicFormFlowCapabilityCatalogMetadata;
    expect(metadata.terminology).toEqual({
      flowScopeName: "BPMN_LITE_12_ARCHETYPES",
      fullBpmnClaimAllowed: false,
    });
    expect(metadata.defaults).toMatchObject({
      publishedFormSchemaMutable: false,
      assignmentBindsFormVersionId: true,
      emptyFlowPolicy: "DENY",
      runtimeRoleSource: "SERVER_DERIVED",
      rawSourceReportAccess: "EXPLICIT_PERMISSION_ONLY",
      mappedTargetStatisticContribution: "EXCLUDE",
      flowStatisticProfile: "INTENTIONAL_BLOCK",
    });
    expect(
      metadata.domains.statisticsCapabilities.find(({ id }) => id === "FLOW_STATISTIC_PROFILE"),
    ).toMatchObject({ status: "INTENTIONAL_BLOCK", targetPhase: null });
  });
});
