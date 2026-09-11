import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { WorkbookDataGridHandle } from "../../src/components/excel/fortune/WorkbookDataGrid";

vi.mock("../../src/api/pickersApi", () => ({
  useLazySearchPickerPositionsQuery: () => [vi.fn()],
  useLazySearchPickerLabelEnumOptionsQuery: () => [vi.fn()],
  useLazySearchPickerUnitTypesQuery: () => [vi.fn()],
  useLazySearchPickerUnitsByCodeQuery: () => [vi.fn()],
  useLazySearchPickerUsersQuery: () => [vi.fn()],
}));

vi.mock("../../src/components/excel/fortune/LazyFortuneWorkbook", async () => {
  const ReactModule = await import("react");

  return {
    default: ReactModule.forwardRef<Record<string, never>, Record<string, any>>(
      function MockFortuneWorkbook(props, ref) {
        ReactModule.useImperativeHandle(ref, () => ({}));

        return (
          <>
            <button
              type="button"
              onClick={() => props.onChange?.([
                {
                  id: "sheet-1",
                  index: "sheet-1",
                  name: "Sheet1",
                  order: 0,
                  status: 1,
                  row: 1,
                  column: 2,
                  config: { merge: {} },
                  data: [[null, null]],
                  celldata: [],
                },
              ])}
            >
              Emit unchanged workbook
            </button>
            <button
              type="button"
              onClick={() => props.onChange?.([
                {
                  id: "sheet-1",
                  index: "sheet-1",
                  name: "Sheet1",
                  order: 0,
                  status: 1,
                  row: 1,
                  column: 2,
                  config: { merge: {} },
                  data: [[
                    { v: 8, m: "8", ct: { t: "n" } },
                    { v: 9, m: "9", ct: { t: "n" } },
                  ]],
                  celldata: [],
                },
              ])}
            >
              Emit workbook change
            </button>
          </>
        );
      },
    ),
  };
});

import WorkbookDataGrid from "../../src/components/excel/fortune/WorkbookDataGrid";

describe("WorkbookDataGrid manual commit", () => {
  it("commits the cached Fortune change when the imperative workbook API is transient", async () => {
    const gridRef = React.createRef<WorkbookDataGridHandle>();
    const onDirty = vi.fn();
    const onChangeRaw = vi.fn();

    render(
      <WorkbookDataGrid
        ref={gridRef}
        initialSpec={null}
        initialWorkbookData={[
          {
            id: "sheet-1",
            name: "Sheet1",
            order: 0,
            status: 1,
            row: 1,
            column: 2,
            config: { merge: {} },
            data: [[null, null]],
            celldata: [],
          },
        ]}
        dataRect={{ r0: 0, c0: 0, r1: 0, c1: 1 }}
        previewHighlights={[]}
        excludedDataColumns={[]}
        lockedCellKeys={[]}
        embeddedFullscreen
        changeCommitMode="manual"
        onDirty={onDirty}
        onChangeRaw={onChangeRaw}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Emit workbook change" }));

    expect(onDirty).toHaveBeenCalledOnce();
    expect(onChangeRaw).not.toHaveBeenCalled();
    expect(gridRef.current?.commitChanges()?.values1D).toEqual([8, 9]);
  });

  it("does not mark an unchanged initial Fortune emission as dirty", async () => {
    const gridRef = React.createRef<WorkbookDataGridHandle>();
    const onDirty = vi.fn();

    render(
      <WorkbookDataGrid
        ref={gridRef}
        initialSpec={null}
        initialWorkbookData={[
          {
            id: "sheet-1",
            name: "Sheet1",
            order: 0,
            status: 1,
            row: 1,
            column: 2,
            config: { merge: {} },
            data: [[null, null]],
            celldata: [],
          },
        ]}
        dataRect={{ r0: 0, c0: 0, r1: 0, c1: 1 }}
        previewHighlights={[]}
        excludedDataColumns={[]}
        lockedCellKeys={[]}
        embeddedFullscreen
        changeCommitMode="manual"
        onDirty={onDirty}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Emit unchanged workbook" }));

    expect(onDirty).not.toHaveBeenCalled();
    expect(gridRef.current?.commitChanges()?.values1D).toEqual([null, null]);
  });
});
