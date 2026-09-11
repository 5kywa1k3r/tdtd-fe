import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ReportAppendAxisControls,
  ReportSectionTablePreviews,
  buildReportAppendAxisState,
  buildTableValuesBlock,
  buildTableValuesJson,
  clearReportAppendAxisValues,
  swapReportAppendAxisValues,
  type ReportAppendAxisState,
  type ReportExcelBlockRuntime,
} from "../../src/pages/works/report/WorkReportEditorPage";

function buildBlock(
  tableMode: "FIXED_GRID" | "APPEND_ROWS" | "APPEND_COLUMNS" | "MATRIX" | "SUMMARY_TEMPLATE",
  blockId = tableMode.toLowerCase(),
): ReportExcelBlockRuntime {
  const dataRect = { r0: 1, c0: 0, r1: 2, c1: 1 };
  const spec = {
    kind: tableMode === "APPEND_COLUMNS" ? "LEFT" : tableMode === "MATRIX" ? "MATRIX" : "TOP",
    topRows: 1,
    topCols: 2,
    dataRows: 2,
    leftRows: 2,
    leftCols: 1,
    dataCols: 2,
    defaultDataType: "NUMBER",
  };

  return {
    key: `${blockId}:0`,
    index: 0,
    blockId,
    label: blockId,
    dynamicExcelTemplateId: `${blockId}-excel`,
    blockJson: JSON.stringify({ blockId, tableMode, dataRect, w: 2, h: 2 }),
    excelBlock: { blockId, tableMode, dataRect, w: 2, h: 2 },
    spec,
    templateWorkbookData: [],
    dataRect,
    w: 2,
    h: 2,
  };
}

function asRecord(value: unknown) {
  return value as Record<string, unknown>;
}

describe("work report canonical table runtime", () => {
  it("keeps FIXED_GRID value slots and MATRIX sparse coordinates", () => {
    const fixed = asRecord(buildTableValuesBlock(buildBlock("FIXED_GRID"), [1, 2, 3, 4]));
    expect(fixed.tableMode).toBe("FIXED_GRID");
    expect(fixed.values1D).toEqual([1, 2, 3, 4]);
    expect(fixed.valueSlots).toEqual([
      expect.objectContaining({ index: 0, rowKey: "row_1", columnKey: "col_1" }),
      expect.objectContaining({ index: 1, rowKey: "row_1", columnKey: "col_2" }),
      expect.objectContaining({ index: 2, rowKey: "row_2", columnKey: "col_1" }),
      expect.objectContaining({ index: 3, rowKey: "row_2", columnKey: "col_2" }),
    ]);
    expect(fixed).not.toHaveProperty("rows");
    expect(fixed).not.toHaveProperty("columns");
    expect(fixed).not.toHaveProperty("cells");

    const matrix = asRecord(buildTableValuesBlock(buildBlock("MATRIX"), [1, null, 0, 4]));
    expect(matrix.tableMode).toBe("MATRIX");
    expect(matrix.cells).toEqual([
      expect.objectContaining({ rowKey: "row_1", columnKey: "col_1", value: 1 }),
      expect.objectContaining({ rowKey: "row_2", columnKey: "col_1", value: 0 }),
      expect.objectContaining({ rowKey: "row_2", columnKey: "col_2", value: 4 }),
    ]);
    expect(matrix).not.toHaveProperty("rows");
    expect(matrix).not.toHaveProperty("columns");
  });

  it("round-trips APPEND_ROWS stable IDs, order and cells independently of row identity", () => {
    const block = buildBlock("APPEND_ROWS", "rows-block");
    const state: ReportAppendAxisState = {
      mode: "APPEND_ROWS",
      instanceIds: ["row-instance-b", "row-instance-a"],
    };
    const payload = asRecord(buildTableValuesBlock(block, [10, 11, 20, 21], undefined, state));

    expect(payload.rows).toEqual([
      expect.objectContaining({
        rowInstanceId: "row-instance-b",
        rowOrder: 1,
        cells: { col_1: 10, col_2: 11 },
      }),
      expect.objectContaining({
        rowInstanceId: "row-instance-a",
        rowOrder: 2,
        cells: { col_1: 20, col_2: 21 },
      }),
    ]);
    expect(payload).not.toHaveProperty("columns");
    expect(payload).not.toHaveProperty("cells");

    const restored = buildReportAppendAxisState(
      block,
      JSON.stringify({ blocks: [payload] }),
      [10, 11, 20, 21],
    );
    expect(restored).toEqual(state);
    expect(swapReportAppendAxisValues(block, [10, 11, 20, 21], "APPEND_ROWS", 0, 1))
      .toEqual([20, 21, 10, 11]);
    expect(clearReportAppendAxisValues(block, [10, 11, 20, 21], "APPEND_ROWS", 1))
      .toEqual([10, 11, null, null]);
  });

  it("round-trips APPEND_COLUMNS stable IDs, order and cells", () => {
    const block = buildBlock("APPEND_COLUMNS", "columns-block");
    const state: ReportAppendAxisState = {
      mode: "APPEND_COLUMNS",
      instanceIds: ["column-instance-a", "column-instance-b"],
    };
    const payload = asRecord(buildTableValuesBlock(block, [10, 11, 20, 21], undefined, state));

    expect(payload.columns).toEqual([
      expect.objectContaining({
        columnInstanceId: "column-instance-a",
        columnOrder: 1,
        cells: { row_1: 10, row_2: 20 },
      }),
      expect.objectContaining({
        columnInstanceId: "column-instance-b",
        columnOrder: 2,
        cells: { row_1: 11, row_2: 21 },
      }),
    ]);
    expect(payload).not.toHaveProperty("rows");
    expect(payload).not.toHaveProperty("cells");

    const restored = buildReportAppendAxisState(
      block,
      JSON.stringify({ blocks: [payload] }),
      [10, 11, 20, 21],
    );
    expect(restored).toEqual(state);
    expect(swapReportAppendAxisValues(block, [10, 11, 20, 21], "APPEND_COLUMNS", 0, 1))
      .toEqual([11, 10, 21, 20]);
    expect(clearReportAppendAxisValues(block, [10, 11, 20, 21], "APPEND_COLUMNS", 0))
      .toEqual([null, 11, null, 21]);
  });

  it("treats SUMMARY_TEMPLATE as output-only and excludes it from draft/submit table JSON", () => {
    const fixed = buildBlock("FIXED_GRID", "fixed-source");
    const summary = buildBlock("SUMMARY_TEMPLATE", "summary-output");
    expect(buildTableValuesBlock(summary, [99, 98, 97, 96])).toBeNull();

    const detail = {
      dynamicFormTemplateId: "form-1",
      dynamicFormTemplateCode: "FORM_1",
      dynamicFormTemplateName: "Form 1",
      tableValuesJson: JSON.stringify({
        blocks: [{ blockId: "summary-output", tableMode: "SUMMARY_TEMPLATE", values1D: [99] }],
      }),
    } as Parameters<typeof buildTableValuesJson>[0];
    const form = {} as NonNullable<Parameters<typeof buildTableValuesJson>[1]>;
    const json = buildTableValuesJson(
      detail,
      form,
      [fixed, summary],
      { "fixed-source": [1, 2, 3, 4], "summary-output": [99, 98, 97, 96] },
      {},
    );
    const parsed = JSON.parse(json ?? "{}") as { blocks?: Array<Record<string, unknown>> };

    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks?.[0]).toMatchObject({ blockId: "fixed-source", tableMode: "FIXED_GRID" });
    expect(JSON.stringify(parsed)).not.toContain("summary-output");
    expect(JSON.stringify(parsed)).not.toContain("SUMMARY_TEMPLATE");
  });
});

describe("append-axis controls", () => {
  it("provides accessible add/remove/reorder actions for APPEND_ROWS", () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    const onMove = vi.fn();
    render(
      <ReportAppendAxisControls
        blockLabel="Chi tiết"
        state={{ mode: "APPEND_ROWS", instanceIds: ["row-a", "row-b", null] }}
        availableSlots={[0, 1, 2]}
        canEdit
        busy={false}
        onAdd={onAdd}
        onRemove={onRemove}
        onMove={onMove}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Thêm dòng dữ liệu" }));
    fireEvent.click(screen.getByRole("button", { name: "Chuyển dòng 1 xuống sau" }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa dòng 2" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(0, 1);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("exposes a horizontally scrollable, read-only APPEND_COLUMNS order region", () => {
    render(
      <ReportAppendAxisControls
        blockLabel="Theo kỳ"
        state={{ mode: "APPEND_COLUMNS", instanceIds: ["column-a", "column-b"] }}
        availableSlots={[0, 1]}
        canEdit={false}
        busy={false}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
      />,
    );

    expect(screen.getByRole("region", { name: "Thứ tự cột dữ liệu" })).toBeInTheDocument();
    expect(screen.getByText(/vuốt ngang vùng điều khiển và bảng/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm cột dữ liệu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Xóa cột/ })).not.toBeInTheDocument();
  });

  it("renders SUMMARY_TEMPLATE as a per-block output action even when the report is editable", () => {
    const onOpenBlock = vi.fn();
    const summary = buildBlock("SUMMARY_TEMPLATE", "summary-output");
    render(
      <ReportSectionTablePreviews
        blocks={[summary]}
        rowLabelsByBlock={{}}
        canEdit
        busy={false}
        onOpenBlock={onOpenBlock}
      />,
    );

    expect(screen.getByText("Kết quả chỉ đọc")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mở nhập liệu" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xem kết quả" }));
    expect(onOpenBlock).toHaveBeenCalledWith(summary);
  });
});
