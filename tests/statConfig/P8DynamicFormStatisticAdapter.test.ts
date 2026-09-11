import { describe, expect, it } from "vitest";

import type { DynamicFormEditorSubmit } from "../../src/features/dynamicForms/dynamicForm.types";
import {
  P8DynamicFormStatisticAdapterError,
  buildP8DynamicFormStatisticMutationEnvelope,
  buildP8DynamicFormStatisticMutationPlan,
} from "../../src/pages/dynamicForms/p8DynamicFormStatisticAdapter";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function submit(fields: unknown[], blocks: unknown[] | null): DynamicFormEditorSubmit {
  return {
    code: "FORM-01",
    name: "P8 form",
    description: null,
    tagCodes: [],
    schemaVersion: 1,
    isActive: true,
    sectionsJson: JSON.stringify([{ id: "main", title: "Main", order: 0 }]),
    fieldsJson: JSON.stringify(fields),
    excelBlockJson: blocks?.[0] ? JSON.stringify(blocks[0]) : null,
    blocksJson: blocks ? JSON.stringify(blocks) : null,
  };
}

describe("P8 Dynamic Form statistic adapter", () => {
  it("maps editor fields into exact typed P8 field mutations", () => {
    const plan = buildP8DynamicFormStatisticMutationPlan(
      submit(
        [
          {
            id: "amount",
            sectionId: "main",
            type: "number",
            isStatistic: true,
            statisticLabelCodes: [" Revenue.Total ", "revenue.total"],
            statistic: {
              aggregateOps: ["count", "sum", "average"],
              bucketMode: "none",
              showInDetail: true,
              showInTree: false,
            },
          },
          {
            id: "notes",
            sectionId: "main",
            type: "richText",
            isStatistic: false,
            statisticLabelCodes: ["must.be.cleared"],
            statistic: { aggregateOps: ["count"] },
          },
        ],
        [],
      ),
    );

    expect(plan.tableSource).toBe("CANONICAL_BLOCKS");
    expect(plan.steps).toEqual([
      {
        kind: "FIELDS",
        payload: {
          fields: [
            {
              fieldId: "amount",
              isStatistic: true,
              statistic: {
                aggregateOps: ["COUNT", "SUM", "AVG"],
                bucketMode: "NONE",
                showInDetail: true,
                showInTree: false,
              },
              statisticLabelCodes: ["revenue.total"],
            },
            {
              fieldId: "notes",
              isStatistic: false,
              statistic: null,
              statisticLabelCodes: [],
            },
          ],
        },
      },
    ]);
    expect(plan.steps[0]?.payload).not.toHaveProperty("fieldsJson");
    expect(plan.steps[0]?.payload).not.toHaveProperty("blocksJson");
  });

  it("builds a separate typed table step with metricKey targets and the row-label allowlist", () => {
    const plan = buildP8DynamicFormStatisticMutationPlan(
      submit(
        [
          {
            id: "status",
            sectionId: "main",
            type: "singleSelect",
            isStatistic: false,
          },
        ],
        [
          {
            blockId: "budget-grid",
            sectionId: "main",
            tableMode: "FIXED_GRID",
            statisticsDisabled: false,
            rowLabelDataType: "NUMBER",
            defaultDataType: "NUMBER",
            metricRules: [
              { metricKey: "planned", dataType: "NUMBER", aggregateOps: ["sum", "avg"] },
              { metricKey: "actual", dataType: "NUMBER", aggregateOps: ["count", "maximum"] },
              { metricKey: "not-selected", dataType: "NUMBER", aggregateOps: [] },
            ],
            metricLabelTargets: [
              { targetKind: "METRIC", metricKey: "actual", statisticLabelCode: " Actual.Amount ", dataType: "NUMBER" },
              { targetKind: "METRIC", metricKey: "planned", statisticLabelCode: "planned.amount", dataType: "NUMBER" },
            ],
            allowedRowLabelCodes: [" Row.Unit ", "row.account"],
          },
          {
            blockId: "summary-output",
            sectionId: "main",
            tableMode: "SUMMARY_TEMPLATE",
            metricRules: [{ metricKey: "must-not-run", aggregateOps: ["SUM"] }],
          },
        ],
      ),
    );

    expect(plan.steps.map((step) => step.kind)).toEqual(["FIELDS", "TABLES"]);
    expect(plan.steps[1]).toEqual({
      kind: "TABLES",
      payload: {
        tables: [
          {
            blockId: "budget-grid",
            tableMode: "FIXED_GRID",
            statisticsDisabled: false,
            metrics: [
              { metricKey: "planned", dataType: "NUMBER", aggregateOps: ["SUM", "AVERAGE"] },
              { metricKey: "actual", dataType: "NUMBER", aggregateOps: ["COUNT", "MAX"] },
            ],
            metricLabelTargets: [
              { metricKey: "actual", statisticLabelCode: "actual.amount" },
              { metricKey: "planned", statisticLabelCode: "planned.amount" },
            ],
            allowedRowLabelCodes: ["row.account", "row.unit"],
          },
        ],
      },
    });
  });

  it("rejects range labels and labels whose metricKey is not configured", () => {
    const baseBlock = {
      blockId: "grid",
      tableMode: "FIXED_GRID",
      defaultDataType: "NUMBER",
      metricRules: [{ metricKey: "total", dataType: "NUMBER", aggregateOps: ["SUM"] }],
      allowedRowLabelCodes: [],
    };

    expect(() =>
      buildP8DynamicFormStatisticMutationPlan(
        submit([], [
          {
            ...baseBlock,
            metricLabelTargets: [
              { targetKind: "RANGE", range: { r0: 0, c0: 0, r1: 0, c1: 0 }, statisticLabelCode: "total" },
            ],
          },
        ]),
      ),
    ).toThrowError(expect.objectContaining({ code: "P8_METRIC_KEY_TARGET_REQUIRED" }));

    expect(() =>
      buildP8DynamicFormStatisticMutationPlan(
        submit([], [
          {
            ...baseBlock,
            metricLabelTargets: [{ metricKey: "missing", statisticLabelCode: "total" }],
          },
        ]),
      ),
    ).toThrowError(expect.objectContaining({ code: "TABLE_METRIC_LABEL_TARGET_NOT_CONFIGURED" }));
  });

  it("rejects C1 control characters in structural identities", () => {
    expect(() =>
      buildP8DynamicFormStatisticMutationPlan(
        submit(
          [{ id: "amount\u0085", type: "number", isStatistic: false }],
          [],
        ),
      ),
    ).toThrowError(expect.objectContaining({ code: "IDENTITY_INVALID" }));
  });

  it("marks an excelBlock-only schema read-only and never creates a legacy table mutation", () => {
    const value = submit(
      [{ id: "amount", type: "number", isStatistic: false }],
      null,
    );
    value.excelBlockJson = JSON.stringify({
      blockId: "legacy-grid",
      tableMode: "FIXED_GRID",
      metricRules: [{ metricKey: "legacy", dataType: "NUMBER", aggregateOps: ["SUM"] }],
    });

    const plan = buildP8DynamicFormStatisticMutationPlan(value);

    expect(plan.tableSource).toBe("LEGACY_READ_ONLY");
    expect(plan.steps.map((step) => step.kind)).toEqual(["FIELDS"]);
  });

  it("creates each strict CAS envelope from the latest readback", () => {
    const plan = buildP8DynamicFormStatisticMutationPlan(
      submit(
        [{ id: "amount", type: "number", isStatistic: false }],
        [{ blockId: "grid", tableMode: "FIXED_GRID", metricRules: [], allowedRowLabelCodes: [] }],
      ),
    );
    const fields = plan.steps[0];
    const tables = plan.steps[1];
    if (!fields || !tables) throw new Error("fixture must create two P8 steps");

    const first = buildP8DynamicFormStatisticMutationEnvelope(
      fields,
      { revision: 7, configHash: HASH_A.toUpperCase() },
      "form-save-01:fields",
    );
    const second = buildP8DynamicFormStatisticMutationEnvelope(
      tables,
      { revision: 8, configHash: HASH_B },
      "form-save-01:tables",
    );

    expect(first).toMatchObject({ expectedRevision: 7, expectedConfigHash: HASH_A });
    expect(second).toMatchObject({ expectedRevision: 8, expectedConfigHash: HASH_B });
    expect(first.payload).toHaveProperty("fields");
    expect(first.payload).not.toHaveProperty("tables");
    expect(second.payload).toHaveProperty("tables");
    expect(second.payload).not.toHaveProperty("fields");

    expect(() =>
      buildP8DynamicFormStatisticMutationEnvelope(fields, { revision: 7, configHash: "legacy" }, "bad id"),
    ).toThrow(P8DynamicFormStatisticAdapterError);
  });
});
