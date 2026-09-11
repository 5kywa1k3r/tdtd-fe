import { describe, expect, it } from "vitest";

import { buildDynamicFormSchemaPayload } from "../../src/api/contracts/dynamicFormSchemaContract";

describe("Dynamic Form typed schema companion", () => {
  it("converts normalized editor JSON into the typed wire payload", () => {
    const schema = buildDynamicFormSchemaPayload({
      sectionsJson: JSON.stringify([{ id: "main", title: "Main", order: 1 }]),
      fieldsJson: JSON.stringify([
        {
          id: "amount",
          sectionId: "main",
          type: "number",
          required: true,
          customRenderer: "currency",
        },
      ]),
      blocksJson: JSON.stringify([
        { blockId: "table-1", sectionId: "main", tableMode: "APPEND_ROWS", w: 4, h: 10 },
      ]),
    });

    expect(schema.sections).toHaveLength(1);
    expect(schema.fields[0]).toMatchObject({ type: "number", customRenderer: "currency" });
    expect(schema.blocks[0]).toMatchObject({ tableMode: "APPEND_ROWS", w: 4 });
  });

  it("uses the legacy primary block only when blocksJson is absent", () => {
    const schema = buildDynamicFormSchemaPayload({
      sectionsJson: "[]",
      fieldsJson: "[]",
      excelBlockJson: JSON.stringify({ blockId: "legacy", tableMode: "FIXED_GRID" }),
    });

    expect(schema.blocks).toEqual([{ blockId: "legacy", tableMode: "FIXED_GRID" }]);
  });

  it("rejects a non-array legacy collection before sending the request", () => {
    expect(() =>
      buildDynamicFormSchemaPayload({
        sectionsJson: "{}",
        fieldsJson: "[]",
      }),
    ).toThrow("sectionsJson must be a JSON object array");
  });
});
