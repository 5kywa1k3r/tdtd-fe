import { describe, expect, it } from "vitest";

import type {
  DynamicFormEditorValue,
  DynamicFormField,
  DynamicFormSection,
} from "../../src/features/dynamicForms/dynamicForm.types";
import {
  moveDynamicFormField,
  normalizeFields,
  toSubmit,
} from "../../src/features/dynamicForms/dynamicFormSchema";

const sections: DynamicFormSection[] = [
  { id: "section-a", title: "Phần A", order: 0 },
  { id: "section-b", title: "Phần B", order: 1 },
];

function field(
  id: string,
  sectionId: string,
  key: string,
  order: number,
): DynamicFormField {
  return {
    id,
    sectionId,
    key,
    name: `Chỉ tiêu ${id}`,
    type: "number",
    required: false,
    colSpan: 12,
    minHeight: 72,
    order,
    statisticLabelCodes: [],
    isStatistic: false,
  };
}

describe("Dynamic Form field identity and order safety", () => {
  it("keeps technical keys and the user's cross-section array order while reindexing each section", () => {
    const normalized = normalizeFields(
      [
        field("a-1", "section-a", " metric.a_1 ", 99),
        field("b-1", "section-b", "metric.b_1", 41),
        field("a-2", "section-a", "metric.a_2", 3),
      ],
      sections,
    );

    expect(normalized.map((item) => item.id)).toEqual(["a-1", "b-1", "a-2"]);
    expect(normalized.map((item) => item.order)).toEqual([0, 0, 1]);
    expect(normalized.map((item) => item.key)).toEqual([
      "metric.a_1",
      "metric.b_1",
      "metric.a_2",
    ]);
  });

  it("moves fields inside their section without disturbing another section", () => {
    const original = [
      field("a-1", "section-a", "metric.a_1", 0),
      field("b-1", "section-b", "metric.b_1", 0),
      field("a-2", "section-a", "metric.a_2", 1),
    ];

    const moved = moveDynamicFormField(original, "a-1", 1);

    expect(moved.map((item) => item.id)).toEqual(["a-2", "b-1", "a-1"]);
    expect(moved.map((item) => item.order)).toEqual([0, 0, 1]);
    expect(moved.find((item) => item.id === "b-1")).toMatchObject({
      key: "metric.b_1",
      order: 0,
    });
  });

  it("serializes field keys and the moved order into the save payload", () => {
    const fields = moveDynamicFormField(
      [
        field("a-1", "section-a", "metric.a_1", 0),
        field("a-2", "section-a", "metric.a_2", 1),
      ],
      "a-1",
      1,
    );
    const value: DynamicFormEditorValue = {
      code: "DF-ORDER",
      name: "Biểu mẫu kiểm tra thứ tự",
      description: null,
      tagCodes: [],
      schemaVersion: 1,
      isActive: true,
      sections,
      fields,
      excelBlockJson: null,
      blocksJson: null,
    };

    const payload = toSubmit(value);
    const serialized = JSON.parse(payload.fieldsJson) as Array<{
      id: string;
      key: string;
      order: number;
    }>;

    expect(serialized.map(({ id, key, order }) => ({ id, key, order }))).toEqual([
      { id: "a-2", key: "metric.a_2", order: 0 },
      { id: "a-1", key: "metric.a_1", order: 1 },
    ]);
  });
});
