import type { ReactElement } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ApiErrorCode } from "../../src/constants/errorCodes";
import type { DynamicFormEditorValue } from "../../src/features/dynamicForms/dynamicForm.types";

vi.mock("../../src/components/labels/LabelPicker", () => ({
  default: ({
    value = [],
    usage,
    allowedDataTypes,
    disabled,
    onChange,
  }: {
    value?: string[];
    usage?: string;
    allowedDataTypes?: string[];
    disabled?: boolean;
    onChange: (
      codes: string[],
      rows: Array<{ code: string; usage: "STATISTIC"; dataType: "NUMBER" }>,
    ) => void;
  }) => (
    <div
      data-testid={usage === "statistic" ? "statistic-label-picker" : "label-picker"}
      data-usage={usage}
      data-types={allowedDataTypes?.join(",")}
      data-value={value.join(",")}
    >
      {["metric.primary", "metric.paging"].map((code) => (
        <button
          key={code}
          type="button"
          aria-label={"Chọn nhãn " + code}
          disabled={disabled}
          onClick={() => onChange([code], [{ code, usage: "STATISTIC", dataType: "NUMBER" }])}
        >
          {code}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../../src/components/labels/LabelManagerDialog", () => ({
  default: () => null,
}));

vi.mock("../../src/components/works/assignments/DynamicExcelPicker", () => ({
  DynamicExcelPicker: ({
    disabled,
    onChange,
  }: {
    disabled?: boolean;
    onChange: (item: { id: string }) => void;
  }) => (
    <button
      type="button"
      aria-label="Nhập bảng Excel động"
      disabled={disabled}
      onClick={() => onChange({ id: "excel-1" })}
    >
      Nhập bảng
    </button>
  ),
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

const initialValue: DynamicFormEditorValue = {
  code: "DF-SAFE",
  name: "Biểu mẫu an toàn",
  description: null,
  tagCodes: [],
  schemaVersion: 1,
  isActive: true,
  sections: [{ id: "main", title: "Phần chính", order: 0 }],
  fields: [],
  excelBlockJson: null,
  blocksJson: null,
};

function renderRoutedEditor(editor: (onBack: () => void) => ReactElement) {
  let navigateBack = () => undefined;
  const router = createMemoryRouter(
    [
      {
        path: "/edit",
        element: editor(() => navigateBack()),
      },
      { path: "/target", element: <div>Trang đích</div> },
    ],
    { initialEntries: ["/edit"] },
  );
  navigateBack = () => void router.navigate("/target");
  render(<RouterProvider router={router} />);
  return router;
}

describe("DynamicFormEditor unsaved and revision safety", () => {
  it("guards unsaved work and blocks publish/import with clear UI copy", async () => {
    const onBack = vi.fn();
    const onPublish = vi.fn().mockResolvedValue(undefined);
    const onImport = vi.fn().mockResolvedValue(initialValue);

    const router = renderRoutedEditor((navigateBack) => (
      <DynamicFormEditor
        mode="edit"
        initialValue={initialValue}
        onBack={() => {
          onBack();
          navigateBack();
        }}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onPublish={onPublish}
        onImportDynamicExcelBlock={onImport}
      />
    ));

    fireEvent.change(screen.getByRole("textbox", { name: "Tên biểu mẫu" }), {
      target: { value: "Biểu mẫu đã sửa" },
    });

    await waitFor(() => expect(screen.getByText("Chưa lưu")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Công bố" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nhập bảng Excel động" })).toBeDisabled();
    expect(screen.getByText(/không ghi đè thay đổi chưa lưu/i)).toBeInTheDocument();

    const beforeUnload = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(beforeUnload)).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(router.state.location.pathname).toBe("/edit");
    expect(screen.getByText(/biểu mẫu đang có thay đổi chưa lưu/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Đóng không lưu" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/target"));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onPublish).not.toHaveBeenCalled();
    expect(onImport).not.toHaveBeenCalled();
  });

  it("shows a dedicated revision-conflict action that reloads the latest form", async () => {
    const onReload = vi.fn().mockResolvedValue(undefined);
    const onSave = vi.fn().mockRejectedValue({
      errorCode: ApiErrorCode.DynamicFormRevisionConflict,
      message: "Biểu mẫu đã thay đổi ở nơi khác.",
    });

    renderRoutedEditor(() => (
      <DynamicFormEditor
        mode="edit"
        initialValue={initialValue}
        onBack={vi.fn()}
        onReload={onReload}
        onSave={onSave}
      />
    ));

    const nameInput = screen.getByRole("textbox", { name: "Tên biểu mẫu" });
    fireEvent.change(nameInput, { target: { value: "Bản local chưa lưu" } });
    fireEvent.blur(nameInput);
    await waitFor(() => expect(screen.getByText("Chưa lưu")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await screen.findByText(/biểu mẫu đã được thay đổi ở nơi khác/i);
    expect(nameInput).toHaveValue("Bản local chưa lưu");
    expect(screen.getByText("Chưa lưu")).toBeInTheDocument();
    expect(onReload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Tải bản mới" }));
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce());
  });

  it("keeps distinct statistic labels mapped after disabling and re-enabling a field", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const multiSectionValue: DynamicFormEditorValue = {
      ...initialValue,
      sections: [
        { id: "empty", title: "Phần 1", order: 0 },
        { id: "metrics", title: "Phần 2", order: 1 },
      ],
      fields: [
        {
          id: "primary",
          sectionId: "metrics",
          name: "Giá trị P11",
          type: "number",
          required: false,
          colSpan: 12,
          minHeight: 72,
          order: 0,
          isStatistic: false,
        },
        {
          id: "paging",
          sectionId: "metrics",
          name: "Giá trị P11 phụ",
          type: "number",
          required: false,
          colSpan: 12,
          minHeight: 72,
          order: 1,
          isStatistic: false,
        },
      ],
    };

    renderRoutedEditor(() => (
      <DynamicFormEditor
        mode="edit"
        initialValue={multiSectionValue}
        locked
        allowStatisticConfigEdit
        onBack={vi.fn()}
        onSave={onSave}
      />
    ));

    expect(screen.getByRole("textbox", { name: "Tiêu đề phần" })).toHaveValue("Phần 2");
    expect(screen.getByRole("textbox", { name: "Tên trường dữ liệu" })).toHaveValue(
      "Giá trị P11",
    );

    fireEvent.click(screen.getByRole("switch", { name: "Bật làm chỉ số tổng hợp" }));
    const primaryLabelPicker = screen.getByTestId("statistic-label-picker");
    expect(primaryLabelPicker.dataset.usage).toBe("statistic");
    expect(primaryLabelPicker.dataset.types).toBe("NUMBER");
    fireEvent.click(within(primaryLabelPicker).getByRole("button", { name: "Chọn nhãn metric.primary" }));
    await waitFor(() => expect(primaryLabelPicker.dataset.value).toBe("metric.primary"));

    fireEvent.click(screen.getAllByText("Giá trị P11 phụ")[0]!);

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Tên trường dữ liệu" })).toHaveValue(
        "Giá trị P11 phụ",
      ),
    );
    fireEvent.click(screen.getByRole("switch", { name: "Bật làm chỉ số tổng hợp" }));
    fireEvent.click(
      within(screen.getByTestId("statistic-label-picker")).getByRole("button", {
        name: "Chọn nhãn metric.paging",
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("statistic-label-picker").dataset.value).toBe("metric.paging"),
    );

    fireEvent.click(screen.getByRole("switch", { name: "Bật làm chỉ số tổng hợp" }));
    await waitFor(() => expect(screen.getByTestId("statistic-label-picker").dataset.value).toBe(""));
    expect(
      within(screen.getByTestId("statistic-label-picker")).getByRole("button", {
        name: "Chọn nhãn metric.paging",
      }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("switch", { name: "Bật làm chỉ số tổng hợp" }));
    expect(screen.getByTestId("statistic-label-picker").dataset.value).toBe("");
    fireEvent.click(
      within(screen.getByTestId("statistic-label-picker")).getByRole("button", {
        name: "Chọn nhãn metric.paging",
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("statistic-label-picker").dataset.value).toBe("metric.paging"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const payload = onSave.mock.calls[0]?.[0] as { fieldsJson?: string } | undefined;
    const savedFields = JSON.parse(payload?.fieldsJson ?? "[]") as Array<{
      id: string;
      isStatistic: boolean;
      statisticLabelCodes: string[];
    }>;
    expect(savedFields.find((field) => field.id === "primary")).toMatchObject({
      isStatistic: true,
      statisticLabelCodes: ["metric.primary"],
    });
    expect(savedFields.find((field) => field.id === "paging")).toMatchObject({
      isStatistic: true,
      statisticLabelCodes: ["metric.paging"],
    });
  });
});
