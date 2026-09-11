import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type {
  DynamicFormEditorValue,
  DynamicFormField,
} from "../../src/features/dynamicForms/dynamicForm.types";
import {
  defaultAggregateOps,
  getStatisticAggregateOperationOptions,
  getStatisticBucketModeOptions,
  normalizeFields,
  normalizeStatisticAggregateOps,
  normalizeStatisticBucketMode,
  toSubmit,
} from "../../src/features/dynamicForms/dynamicFormSchema";

vi.mock("../../src/components/labels/LabelPicker", () => ({
  default: () => <div data-testid="label-picker" />,
}));

vi.mock("../../src/components/labels/LabelManagerDialog", () => ({
  default: () => null,
}));

vi.mock("../../src/components/works/assignments/DynamicExcelPicker", () => ({
  DynamicExcelPicker: () => null,
}));

vi.mock("../../src/api/labelEnumCatalogApi", () => ({
  useQuickCreateLabelEnumCatalogMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("../../src/components/excel/fortune/DynamicExcelConfigDialog", () => ({
  default: () => null,
}));

vi.mock("../../src/components/labels/labelUi", () => ({
  LabelEnumCatalogSelect: () => null,
}));

vi.mock(
  "../../src/features/dynamicForms/components/DynamicFormExcelBlockPreview",
  () => ({ default: () => null }),
);

import DynamicFormEditor from "../../src/features/dynamicForms/builder/DynamicFormEditor";

const sections = [{ id: "main", title: "Main section", order: 0 }];

function field(
  patch: Partial<DynamicFormField> & Pick<DynamicFormField, "id" | "name" | "type">,
): DynamicFormField {
  const { id, name, type, ...rest } = patch;
  return {
    id,
    sectionId: "main",
    name,
    type,
    required: false,
    colSpan: 12,
    minHeight: 72,
    order: 0,
    isStatistic: false,
    ...rest,
  };
}

function editorValue(targetField: DynamicFormField): DynamicFormEditorValue {
  return {
    code: "DF-P8-METHOD",
    name: "Statistic method form",
    description: null,
    tagCodes: [],
    schemaVersion: 1,
    isActive: true,
    sections,
    fields: [targetField],
    excelBlockJson: null,
    blocksJson: null,
  };
}

function renderEditor(targetField: DynamicFormField) {
  const router = createMemoryRouter(
    [
      {
        path: "/dynamic-forms/:id/edit",
        element: (
          <DynamicFormEditor
            mode="edit"
            initialValue={editorValue(targetField)}
            onBack={vi.fn()}
            onSave={vi.fn().mockResolvedValue(undefined)}
          />
        ),
      },
    ],
    { initialEntries: ["/dynamic-forms/form-1/edit"] },
  );
  render(<RouterProvider router={router} />);
}

describe("Dynamic Form typed statistic methods", () => {
  it("freezes backend-compatible defaults and choices by field type", () => {
    expect(defaultAggregateOps("shortText")).toEqual(["count", "latest"]);
    expect(defaultAggregateOps("richText")).toEqual([]);
    expect(getStatisticAggregateOperationOptions("shortText").map((item) => item.value)).toEqual([
      "count",
      "latest",
      "concat",
    ]);
    expect(getStatisticAggregateOperationOptions("number").map((item) => item.value)).toEqual([
      "count",
      "sum",
      "avg",
      "min",
      "max",
      "latest",
    ]);
    expect(getStatisticBucketModeOptions("singleSelect").map((item) => item.value)).toEqual([
      "none",
      "option",
    ]);
    expect(getStatisticBucketModeOptions("date").map((item) => item.value)).toEqual([
      "none",
      "date",
    ]);
    expect(getStatisticBucketModeOptions("shortText").map((item) => item.value)).toEqual(["none"]);
  });

  it("normalizes server casing, removes incompatible methods, and disables richText statistics", () => {
    expect(
      normalizeStatisticAggregateOps("shortText", [
        "COUNT",
        "BUCKET_COUNT",
        "CONCAT",
        "LATEST",
        "COUNT",
      ]),
    ).toEqual(["count", "concat", "latest"]);
    expect(normalizeStatisticBucketMode("shortText", "OPTION")).toBe("none");
    expect(normalizeStatisticBucketMode("date", "DATE")).toBe("date");

    const normalized = normalizeFields(
      [
        field({
          id: "summary",
          name: "Narrative summary",
          type: "shortText",
          isStatistic: true,
          statisticLabelCodes: ["summary.label"],
          statistic: {
            aggregateOps: ["COUNT", "BUCKET_COUNT", "LATEST"] as never,
            bucketMode: "OPTION" as never,
            showInDetail: true,
            showInTree: false,
          },
        }),
        field({
          id: "document",
          name: "Document body",
          type: "richText",
          isStatistic: true,
          statisticLabelCodes: ["document.label"],
          statistic: {
            aggregateOps: ["count"],
            bucketMode: "none",
            showInDetail: true,
            showInTree: true,
          },
        }),
      ],
      sections,
    );

    expect(normalized[0]).toMatchObject({
      isStatistic: true,
      statisticLabelCodes: ["summary.label"],
      statistic: { aggregateOps: ["count", "latest"], bucketMode: "none" },
    });
    expect(normalized[1]).toMatchObject({
      isStatistic: false,
      statisticLabelCodes: [],
      statistic: undefined,
    });
  });

  it("serializes only canonical editor methods and bucket modes", () => {
    const payload = toSubmit(
      editorValue(
        field({
          id: "period",
          name: "Reporting period",
          type: "date",
          isStatistic: true,
          statistic: {
            aggregateOps: ["COUNT", "MINIMUM", "LATEST"] as never,
            bucketMode: "DATE" as never,
            showInDetail: true,
            showInTree: false,
          },
        }),
      ),
    );
    const fields = JSON.parse(payload.fieldsJson) as Array<{
      statistic?: { aggregateOps?: string[]; bucketMode?: string };
    }>;

    expect(fields[0]?.statistic).toEqual({
      aggregateOps: ["count", "min", "latest"],
      bucketMode: "date",
      showInDetail: true,
      showInTree: false,
    });
  });

  it("renders the constrained shortText method and bucket pickers", async () => {
    renderEditor(
      field({
        id: "summary",
        name: "Narrative summary",
        type: "shortText",
        isStatistic: true,
        statistic: {
          aggregateOps: ["count", "latest"],
          bucketMode: "none",
          showInDetail: true,
          showInTree: false,
        },
      }),
    );

    const operationPicker = screen.getByRole("combobox", { name: "Phương pháp tổng hợp" });
    expect(operationPicker).toBeInTheDocument();
    fireEvent.mouseDown(operationPicker);

    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Đếm bản ghi")).toBeInTheDocument();
    expect(within(listbox).getByText("Giá trị mới nhất")).toBeInTheDocument();
    expect(within(listbox).getByText("Nối nội dung")).toBeInTheDocument();
    expect(within(listbox).queryByText("Đếm theo lựa chọn")).not.toBeInTheDocument();
    expect(within(listbox).queryByText("Tổng")).not.toBeInTheDocument();

    fireEvent.keyDown(listbox, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    const bucketPicker = screen.getByRole("combobox", { name: "Chế độ phân nhóm" });
    fireEvent.mouseDown(bucketPicker);
    const bucketListbox = await screen.findByRole("listbox");
    expect(within(bucketListbox).getByText("Không phân nhóm")).toBeInTheDocument();
    expect(within(bucketListbox).queryByText("Theo lựa chọn")).not.toBeInTheDocument();
    expect(within(bucketListbox).queryByText("Theo ngày/kỳ")).not.toBeInTheDocument();
  });
});
