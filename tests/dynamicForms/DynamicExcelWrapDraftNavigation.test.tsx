import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DynamicExcelRow } from "../../src/api/dynamicExcelApi";

const excelRow: DynamicExcelRow = {
  id: "excel-source-1",
  code: "EXCEL_SOURCE_01",
  name: "Bảng nguồn",
  tableMode: "FIXED_GRID",
  contractVersion: 1,
  createdByUsername: "owner",
  createdAtUtc: "2026-07-22T00:00:00Z",
};

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  search: vi.fn(),
  deleteExcel: vi.fn(),
  wrap: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("../../src/api/dynamicExcelApi", () => ({
  useSearchDynamicExcelMutation: () => [
    mocks.search,
    { data: { rows: [excelRow], totalRows: 1 } },
  ],
  useDeleteDynamicExcelMutation: () => [mocks.deleteExcel],
}));

vi.mock("../../src/api/dynamicFormApi", () => ({
  useWrapDynamicExcelAsFormMutation: () => [mocks.wrap, { isLoading: false }],
}));

vi.mock("../../src/components/excel/DynamicExcelFilterBar", () => ({
  default: () => <div data-testid="excel-filter" />,
}));

vi.mock("../../src/components/excel/DynamicExcelListTable", () => ({
  DynamicExcelListTable: ({
    rows,
    onWrapAsForm,
  }: {
    rows: DynamicExcelRow[];
    onWrapAsForm: (row: DynamicExcelRow) => void;
  }) => (
    <button type="button" onClick={() => onWrapAsForm(rows[0])}>
      Chuyển thành biểu mẫu
    </button>
  ),
}));

vi.mock("../../src/components/common/ConfirmDialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    message,
    confirmText,
    onConfirm,
  }: {
    open: boolean;
    title?: string;
    message: ReactNode;
    confirmText?: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {message}
        <button type="button" onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    ) : null,
}));

import DynamicExcelListPage from "../../src/pages/excel/DynamicExcelListPage";

beforeEach(() => {
  mocks.wrap.mockImplementation(() => ({
    unwrap: () => Promise.resolve({ id: "wrapped-draft-1" }),
  }));
});

describe("Dynamic Excel wrapper draft-first navigation", () => {
  it("explains draft-first behavior and opens the wrapped form in edit mode", async () => {
    render(<DynamicExcelListPage />);

    fireEvent.click(screen.getByRole("button", { name: "Chuyển thành biểu mẫu" }));

    expect(screen.getByRole("dialog")).toHaveTextContent(/mở bản nháp/i);
    expect(screen.getByRole("dialog")).toHaveTextContent(/trước khi công bố/i);
    fireEvent.click(screen.getByRole("button", { name: "Mở bản nháp" }));

    await waitFor(() => {
      expect(mocks.wrap).toHaveBeenCalledWith({
        dynamicExcelTemplateId: "excel-source-1",
      });
    });
    expect(mocks.navigate).toHaveBeenCalledWith("/design/forms/wrapped-draft-1/edit");
  });
});
