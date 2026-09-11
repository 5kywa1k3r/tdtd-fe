import { describe, expect, it } from "vitest";

import type {
  DynamicFormDetail,
  DynamicFormSchemaTableMode,
} from "../../src/api/dynamicFormApi";
import type { WorkAssignmentReportResponse } from "../../src/types/report";
import {
  buildRebasedRuntimeCommandState,
  createPendingRuntimeCommand,
  decodeDynamicFormRuntimeSchema,
  decodeWorkReportRuntimeDetail,
  hasPendingLifecycleProjection,
  isPersistedReportDraft,
  resolveWorkReportRuntimeCapabilities,
  validateWorkReportPayloadAgainstSchema,
} from "../../src/pages/works/report/WorkReportEditorPage";

function buildPublishedInlineBlock(
  blockId: string,
  tableMode: DynamicFormSchemaTableMode,
  extra: Record<string, unknown> = {},
) {
  return {
    blockId,
    sectionId: "main",
    tableMode,
    dataRect: { r0: 0, c0: 0, r1: 0, c1: 0 },
    w: 1,
    h: 1,
    defaultDataType: "NUMBER",
    indexMap: [{ index: 0, rowKey: "row_1", columnKey: "col_1", metricKey: "metric_1" }],
    ...extra,
  };
}

function buildForm(overrides: Partial<DynamicFormDetail> = {}): DynamicFormDetail {
  const schema = overrides.schema ?? {
    sections: [{ id: "main", title: "Phần chính", order: 0 }],
    fields: [
      {
        id: "notes",
        sectionId: "main",
        name: "Nội dung",
        type: "longText" as const,
        required: false,
        valueSource: { sourceType: "NONE" as never },
      },
    ],
    blocks: [buildPublishedInlineBlock("table-1", "FIXED_GRID")],
  };
  return {
    id: "form-1",
    code: "FORM_1",
    name: "Biểu mẫu 1",
    tagCodes: [],
    description: null,
    schemaVersion: 3,
    versionNo: 1,
    familyId: "family-1",
    lineageStatus: "ROOT",
    revision: 1,
    isActive: true,
    isPublished: true,
    publishedSchemaHash: "schema-hash-1",
    createdByUsername: "owner",
    createdAtUtc: "2026-07-22T00:00:00.000Z",
    updatedAtUtc: "2026-07-22T00:00:00.000Z",
    schema,
    sectionsJson: JSON.stringify(schema.sections),
    fieldsJson: JSON.stringify(schema.fields),
    excelBlockJson: schema.blocks[0] ? JSON.stringify(schema.blocks[0]) : null,
    blocksJson: JSON.stringify(schema.blocks),
    actions: {
      canRead: true,
      canUpdate: false,
      canDelete: false,
      canPublish: false,
      canCreateVersion: false,
      canViewHistory: true,
      canClone: false,
      canImport: false,
      canUpdateStatistics: false,
    },
    ...overrides,
  };
}

function buildReport(overrides: Partial<WorkAssignmentReportResponse> = {}) {
  return {
    id: "report-1",
    dynamicFormTemplateId: "form-1",
    dynamicFormTemplateCode: "FORM_1",
    dynamicFormTemplateName: "Biểu mẫu 1",
    dynamicFormFamilyId: "family-1",
    dynamicFormVersionNo: 1,
    dynamicFormSchemaHash: "schema-hash-1",
    dynamicExcelTemplateId: null,
    templateSnapshotJson: "",
    specJson: "",
    values1DJson: "[]",
    fieldValuesJson: JSON.stringify({
      dynamicFormTemplateId: "form-1",
      schemaVersion: 3,
      values: { notes: "bản nháp" },
    }),
    tableValuesJson: JSON.stringify({
      dynamicFormTemplateId: "form-1",
      blocks: [{ blockId: "table-1", tableMode: "FIXED_GRID", values1D: [], valueSlots: [] }],
    }),
    payloadRevision: 4,
    lifecycleRevision: 2,
    canEditPayload: true,
    canSubmit: true,
    canWithdraw: false,
    dataRectR0: 0,
    dataRectC0: 0,
    dataRectR1: 0,
    dataRectC1: 0,
    w: 1,
    h: 1,
    status: 0,
    isLateSubmission: false,
    versionNo: 1,
    isCurrent: true,
    isActive: true,
    ...overrides,
  } as unknown as WorkAssignmentReportResponse;
}

describe("work report runtime fail-closed contract", () => {
  it("accepts canonical NONE/no-source and rejects unknown field types", () => {
    expect(() => decodeDynamicFormRuntimeSchema(buildForm(), "form-1")).not.toThrow();

    const invalid = buildForm();
    invalid.schema = {
      ...invalid.schema,
      fields: [{ ...invalid.schema.fields[0], type: "futureType" as never }],
    };
    invalid.fieldsJson = JSON.stringify(invalid.schema.fields);
    expect(() => decodeDynamicFormRuntimeSchema(invalid, "form-1"))
      .toThrow(/không được hỗ trợ/i);
  });

  it("rejects unknown table modes instead of falling back to FIXED_GRID", () => {
    const invalid = buildForm();
    invalid.schema = {
      ...invalid.schema,
      blocks: [{ ...invalid.schema.blocks[0], tableMode: "FUTURE_GRID" as never }],
    };
    invalid.blocksJson = JSON.stringify(invalid.schema.blocks);
    invalid.excelBlockJson = JSON.stringify(invalid.schema.blocks[0]);
    expect(() => decodeDynamicFormRuntimeSchema(invalid, "form-1"))
      .toThrow(/table mode không được hỗ trợ/i);
  });

  it("accepts the canonical five-block inline P3 fixture without Dynamic Excel ids", () => {
    const blocks = [
      buildPublishedInlineBlock("p3_fixed", "FIXED_GRID", { dynamicExcelTemplateId: null }),
      buildPublishedInlineBlock("p3_append_rows", "APPEND_ROWS", { dynamicExcelTemplateId: null }),
      buildPublishedInlineBlock("p3_append_columns", "APPEND_COLUMNS", {
        sectionId: "details",
        dynamicExcelTemplateId: null,
      }),
      buildPublishedInlineBlock("p3_matrix", "MATRIX", {
        sectionId: "details",
        dynamicExcelTemplateId: null,
      }),
      buildPublishedInlineBlock("p3_summary", "SUMMARY_TEMPLATE", {
        sectionId: "details",
        dynamicExcelTemplateId: null,
        sourceBlockId: "p3_matrix",
        groupBy: [],
        rowLayout: [{ rowsPerUnit: 1, metrics: ["metric_1"] }],
      }),
    ];
    const base = buildForm();
    const sections = [
      ...base.schema.sections,
      { id: "details", title: "Chi tiết", order: 1 },
    ];
    const fixture = buildForm({
      schema: { ...base.schema, sections, blocks },
      sectionsJson: JSON.stringify(sections),
      blocksJson: JSON.stringify(blocks),
      excelBlockJson: JSON.stringify(blocks[0]),
    });

    expect(() => decodeDynamicFormRuntimeSchema(fixture, "form-1")).not.toThrow();
  });

  it("fails closed for incomplete inline and external published blocks", () => {
    const base = buildForm();
    const incompleteInline = buildPublishedInlineBlock("table-1", "FIXED_GRID");
    delete (incompleteInline as { indexMap?: unknown }).indexMap;
    const inlineForm = buildForm({
      schema: { ...base.schema, blocks: [incompleteInline] },
      blocksJson: JSON.stringify([incompleteInline]),
      excelBlockJson: JSON.stringify(incompleteInline),
    });
    expect(() => decodeDynamicFormRuntimeSchema(inlineForm, "form-1"))
      .toThrow(/indexMap/i);

    const incompleteExternal = {
      blockId: "table-1",
      sectionId: "main",
      tableMode: "FIXED_GRID" as const,
      dynamicExcelTemplateId: "excel-1",
    };
    const externalForm = buildForm({
      schema: { ...base.schema, blocks: [incompleteExternal] },
      blocksJson: JSON.stringify([incompleteExternal]),
      excelBlockJson: JSON.stringify(incompleteExternal),
    });
    expect(() => decodeDynamicFormRuntimeSchema(externalForm, "form-1"))
      .toThrow(/dataRect\/w\/h/i);
  });

  it("allows a Dynamic-Form-only report only after immutable published provenance matches", () => {
    const publishedForm = buildForm();
    const report = buildReport();
    const runtime = decodeDynamicFormRuntimeSchema(publishedForm, "form-1");

    expect(() => decodeWorkReportRuntimeDetail(report)).not.toThrow();
    expect(() => validateWorkReportPayloadAgainstSchema(report, runtime, publishedForm)).not.toThrow();
    expect(() => validateWorkReportPayloadAgainstSchema(
      { ...report, dynamicFormSchemaHash: "different-hash" },
      runtime,
      publishedForm,
    )).toThrow(/Hash schema/i);
  });

  it("rejects malformed nested field values and table envelopes", () => {
    const publishedForm = buildForm();
    const form = decodeDynamicFormRuntimeSchema(publishedForm, "form-1");
    const wrongFieldKind = buildReport({
      fieldValuesJson: JSON.stringify({
        dynamicFormTemplateId: "form-1",
        schemaVersion: 3,
        values: { notes: { silently: "discarded before P3" } },
      }),
    });
    expect(() => validateWorkReportPayloadAgainstSchema(wrongFieldKind, form, publishedForm))
      .toThrow(/không đúng kiểu/i);

    const malformedTable = buildReport({
      tableValuesJson: JSON.stringify({
        dynamicFormTemplateId: "form-1",
        blocks: [{ blockId: "table-1", tableMode: "FIXED_GRID", values1D: "not-an-array" }],
      }),
    });
    expect(() => validateWorkReportPayloadAgainstSchema(malformedTable, form, publishedForm))
      .toThrow(/values1D/i);
  });

  it("rejects malformed report JSON before permissive parsers can replace it with empty data", () => {
    expect(() => decodeWorkReportRuntimeDetail(buildReport({ fieldValuesJson: "{broken" })))
      .toThrow(/JSON không hợp lệ/i);
    expect(() => decodeWorkReportRuntimeDetail(buildReport({ values1DJson: "{}" })))
      .toThrow(/không được hỗ trợ/i);
  });
});

describe("work report runtime commands and client authority", () => {
  it("uses server capabilities and lets forceReadOnly only tighten them", () => {
    expect(resolveWorkReportRuntimeCapabilities({
      canEditPayload: false,
      canSubmit: false,
      canWithdraw: false,
    }, false, false)).toEqual({ canEdit: false, canSubmit: false, canWithdraw: false });

    expect(resolveWorkReportRuntimeCapabilities({
      canEditPayload: true,
      canSubmit: true,
      canWithdraw: true,
    }, true, false)).toEqual({ canEdit: false, canSubmit: false, canWithdraw: false });
  });

  it("recognizes a typed 202 committed-pending body as committed", () => {
    expect(hasPendingLifecycleProjection({
      lifecycleCommitState: "COMMITTED_PENDING_PROJECTION",
      lifecycleProjectionPending: true,
    })).toBe(true);
    expect(hasPendingLifecycleProjection({
      lifecycleCommitState: "COMMITTED",
      lifecycleProjectionPending: false,
    })).toBe(false);
  });

  it("rebases onto explicit server revisions, clears replay state and creates a new command", () => {
    const oldCommand = createPendingRuntimeCommand(4, 2);
    const rebased = buildRebasedRuntimeCommandState({ payloadRevision: 8, lifecycleRevision: 5 });
    const newCommand = createPendingRuntimeCommand(rebased.payloadRevision, rebased.lifecycleRevision);

    expect(rebased.pendingCommands).toEqual({});
    expect(newCommand).toMatchObject({ expectedPayloadRevision: 8, expectedLifecycleRevision: 5 });
    expect(newCommand.commandId).not.toBe(oldCommand.commandId);
  });

  it("accepts only the full P3 session draft envelope", () => {
    const fullDraft = {
      basePayloadRevision: 4,
      baseLifecycleRevision: 2,
      updatedAtUtc: "2026-07-22T00:00:00.000Z",
      fieldValues: { notes: "local" },
      workbookValuesByBlock: { "table-1": [1, null] },
      workbookRawDataByBlock: { "table-1": [] },
      rowLabelsByBlock: { "table-1": [] },
      appendAxisStates: {},
      lateReason: "",
      completedDate: "",
      dataOrigin: "MANUAL_INPUT",
      cumulativeContributionMode: "INCLUDE",
      activeSectionId: "main",
    };
    expect(isPersistedReportDraft(fullDraft)).toBe(true);
    expect(isPersistedReportDraft({
      basePayloadRevision: 4,
      updatedAtUtc: fullDraft.updatedAtUtc,
      fieldValues: fullDraft.fieldValues,
    })).toBe(false);
  });
});
