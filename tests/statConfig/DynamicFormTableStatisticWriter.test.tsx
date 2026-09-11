import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type {
  DynamicFormEditorSubmit,
  DynamicFormEditorValue,
} from "../../src/features/dynamicForms/dynamicForm.types";
import {
  getTableStatisticAggregateOperationOptions,
  normalizeTableStatisticAggregateOps,
  normalizeTableStatisticDataType,
  type DynamicFormTableStatisticDataType,
} from "../../src/features/dynamicForms/dynamicFormSchema";

vi.mock("../../src/components/labels/LabelPicker", () => ({
  default: ({
    value = [],
    usage,
    label,
    allowedDataTypes,
    disabled,
    onChange,
  }: {
    value?: string[];
    usage?: string;
    label?: string;
    allowedDataTypes?: string[];
    disabled?: boolean;
    onChange: (codes: string[], rows: never[]) => void;
  }) => (
    <button
      type="button"
      data-testid="label-picker"
      data-usage={usage}
      data-types={allowedDataTypes?.join(",")}
      disabled={disabled}
      onClick={() =>
        onChange(
          [
            ...value,
            label?.startsWith("Nhãn dòng") ? "row.unit" : "planned.amount",
          ],
          [],
        )
      }
    >
      {label}
    </button>
  ),
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

function tableBlock(patch: Record<string, unknown> = {}) {
  return {
    blockId: "budget-grid",
    sectionId: "main",
    dynamicExcelName: "Budget grid",
    dynamicExcelTemplateId: "excel-template-1",
    tableMode: "FIXED_GRID",
    defaultDataType: "NUMBER",
    indexMap: [
      {
        index: 0,
        rowKey: "budget",
        columnKey: "planned",
        metricKey: "planned",
      },
    ],
    metricRules: [
      {
        metricKey: "planned",
        label: "Planned amount",
        dataType: "NUMBER",
        aggregateOps: ["SUM"],
      },
    ],
    metricLabelTargets: [],
    allowedRowLabelCodes: [],
    statisticsDisabled: false,
    ...patch,
  };
}

function editorValue(block: Record<string, unknown>, canonical: boolean): DynamicFormEditorValue {
  const blockJson = JSON.stringify(block);
  return {
    code: "DF-P8-TABLE",
    name: "Table statistic form",
    description: null,
    tagCodes: [],
    schemaVersion: 1,
    isActive: true,
    sections,
    fields: [],
    excelBlockJson: blockJson,
    blocksJson: canonical ? JSON.stringify([block]) : null,
  };
}

function renderTableEditor(
  block: Record<string, unknown>,
  options: { canonical?: boolean } = {},
) {
  const onSave = vi.fn<(payload: DynamicFormEditorSubmit) => Promise<void>>()
    .mockResolvedValue(undefined);
  const router = createMemoryRouter(
    [
      {
        path: "/dynamic-forms/:id/edit",
        element: (
          <DynamicFormEditor
            mode="edit"
            locked
            allowStatisticConfigEdit
            initialValue={editorValue(block, options.canonical ?? true)}
            onBack={vi.fn()}
            onSave={onSave}
          />
        ),
      },
    ],
    { initialEntries: ["/dynamic-forms/form-1/edit"] },
  );
  render(<RouterProvider router={router} />);
  return { onSave };
}

describe("Dynamic Form table statistic writer", () => {
  it("freezes the exact P8 operation matrix by table dataType", () => {
    const expected: Record<DynamicFormTableStatisticDataType, string[]> = {
      NUMBER: ["COUNT", "SUM", "MIN", "MAX", "AVERAGE"],
      SHORT_TEXT: ["COUNT", "BUCKET_COUNT"],
      MULTI_SELECT: ["COUNT", "BUCKET_COUNT"],
      BOOLEAN: ["COUNT", "TRUE_COUNT", "FALSE_COUNT"],
      DATE: ["COUNT", "EARLIEST", "LATEST"],
      FULL_DATE: ["COUNT", "EARLIEST", "LATEST"],
    };

    for (const [dataType, operations] of Object.entries(expected)) {
      expect(
        getTableStatisticAggregateOperationOptions(
          dataType as DynamicFormTableStatisticDataType,
        ).map((option) => option.value),
      ).toEqual(operations);
    }
    expect(normalizeTableStatisticDataType("fullDate")).toBe("FULL_DATE");
    expect(normalizeTableStatisticDataType("RICH_TEXT")).toBeNull();
    expect(
      normalizeTableStatisticAggregateOps("NUMBER", [
        "sum",
        "avg",
        "maximum",
        "bucket_count",
        "SUM",
      ]),
    ).toEqual(["SUM", "AVERAGE", "MAX"]);
  });

  it("writes only typed metric methods and TABLE_TARGET scopes into canonical blocksJson", async () => {
    const { onSave } = renderTableEditor(tableBlock());

    const operationPicker = await screen.findByRole("combobox", {
      name: /planned$/,
    });
    fireEvent.mouseDown(operationPicker);
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Trung bình")).toBeInTheDocument();
    expect(within(listbox).queryByText("Đếm theo nhóm")).not.toBeInTheDocument();
    fireEvent.click(within(listbox).getByText("Trung bình"));
    fireEvent.keyDown(listbox, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());

    const tableTargetPickers = screen
      .getAllByTestId("label-picker")
      .filter((element) => element.dataset.usage === "tableTarget");
    expect(tableTargetPickers).toHaveLength(2);
    expect(tableTargetPickers.every((element) => element.dataset.types === "NUMBER")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Nhãn chỉ tiêu · planned" }));
    fireEvent.click(screen.getByRole("button", { name: "Nhãn dòng được phép" }));

    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0]?.[0];
    const blocks = JSON.parse(payload?.blocksJson ?? "[]") as Array<Record<string, unknown>>;
    expect(blocks[0]?.metricRules).toEqual([
      expect.objectContaining({
        metricKey: "planned",
        dataType: "NUMBER",
        aggregateOps: ["SUM", "AVERAGE"],
      }),
    ]);
    expect(blocks[0]?.metricLabelTargets).toEqual([
      {
        targetKind: "METRIC",
        metricKey: "planned",
        statisticLabelCode: "planned.amount",
        dataType: "NUMBER",
      },
    ]);
    expect(blocks[0]?.allowedRowLabelCodes).toEqual(["row.unit"]);
  });

  it("resolves an indexMap metric dataType before the block default", async () => {
    renderTableEditor(
      tableBlock({
        defaultDataType: "NUMBER",
        metricRules: [],
        indexMap: [
          {
            index: 0,
            rowKey: "budget",
            columnKey: "planned",
            metricKey: "planned",
            label: "Planned text",
            dataType: "SHORT_TEXT",
          },
        ],
      }),
    );

    const operationPicker = await screen.findByRole("combobox", {
      name: /planned$/,
    });
    fireEvent.mouseDown(operationPicker);
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Đếm theo nhóm")).toBeInTheDocument();
    expect(within(listbox).queryByText("Tổng")).not.toBeInTheDocument();
    fireEvent.keyDown(listbox, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());

    const metricLabelPicker = screen.getByRole("button", {
      name: "Nhãn chỉ tiêu · planned",
    });
    expect(metricLabelPicker.dataset.types).toBe("SHORT_TEXT");
  });

  it("keeps legacy ExcelBlock-only tables and RANGE label targets read-only", async () => {
    const legacyRender = renderTableEditor(tableBlock(), { canonical: false });
    expect(await screen.findByText(/blocksJson/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /planned$/ })).not.toBeInTheDocument();
    expect(legacyRender.onSave).not.toHaveBeenCalled();
  });

  it("does not allow reactivating a table once the persisted disable reason exists", async () => {
    renderTableEditor(
      tableBlock({
        statisticsDisabled: true,
        statisticsDisabledReason: "P8_STATISTIC_CONFIG_DISABLED",
      }),
    );

    const toggle = await screen.findByRole("switch", {
      name: "Tắt thống kê nền cho bảng",
    });
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
  });
});
