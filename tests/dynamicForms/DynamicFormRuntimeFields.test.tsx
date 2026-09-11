import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  DynamicFormField,
  DynamicFormSection,
} from "../../src/features/dynamicForms/dynamicForm.types";
import DynamicFormRuntimeFields, {
  type DynamicFormRuntimeFieldsProps,
} from "../../src/features/dynamicForms/runtime/DynamicFormRuntimeFields";

const pickerMocks = vi.hoisted(() => ({
  enumOptions: vi.fn(),
  positions: vi.fn(),
  unitTypes: vi.fn(),
  units: vi.fn(),
  users: vi.fn(),
}));

vi.mock("../../src/api/pickersApi", () => ({
  useLazySearchPickerLabelEnumOptionsQuery: () => [pickerMocks.enumOptions],
  useLazySearchPickerPositionsQuery: () => [pickerMocks.positions],
  useLazySearchPickerUnitTypesQuery: () => [pickerMocks.unitTypes],
  useLazySearchPickerUnitsByCodeQuery: () => [pickerMocks.units],
  useLazySearchPickerUsersQuery: () => [pickerMocks.users],
}));

const section: DynamicFormSection = {
  id: "section-1",
  title: "Thông tin",
  order: 0,
};

function createField(overrides: Partial<DynamicFormField> = {}): DynamicFormField {
  return {
    id: "field-1",
    sectionId: section.id,
    name: "Nội dung",
    type: "longText",
    required: false,
    colSpan: 12,
    minHeight: 80,
    order: 0,
    isStatistic: false,
    ...overrides,
  };
}

function pagedResult(rows: unknown[] = []) {
  return {
    rows,
    totalRows: rows.length,
    page: 0,
    pageSize: 50,
  };
}

function successfulTrigger(rows: unknown[] = []) {
  return {
    unwrap: () => Promise.resolve(pagedResult(rows)),
  };
}

function renderRuntime(
  field: DynamicFormField,
  props: Partial<Omit<DynamicFormRuntimeFieldsProps, "sections" | "fields">> = {},
) {
  return render(
    <DynamicFormRuntimeFields
      sections={[section]}
      fields={[field]}
      values={{}}
      onChange={vi.fn()}
      {...props}
    />,
  );
}

describe("DynamicFormRuntimeFields", () => {
  beforeEach(() => {
    for (const mock of Object.values(pickerMocks)) {
      mock.mockReset();
      mock.mockImplementation(() => successfulTrigger());
    }
  });

  it("connects inline validation feedback and focuses the requested field", async () => {
    const field = createField({ name: "Nội dung báo cáo" });

    renderRuntime(field, {
      getFieldState: () => ({
        errorText: "Trường này bắt buộc.",
        focusTarget: true,
      }),
    });

    const input = screen.getByRole("textbox", { name: /Nội dung báo cáo/ });
    const feedback = screen.getByRole("alert");
    const group = screen.getByRole("group", { name: "Nội dung báo cáo" });

    expect(feedback).toHaveTextContent("Trường này bắt buộc.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", feedback.id);
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAttribute("data-runtime-field-focus-target", "true");
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("exposes helper text through aria-describedby without marking the field invalid", () => {
    const field = createField({ name: "Ghi chú" });

    renderRuntime(field, {
      getFieldState: () => ({ helperText: "Tối đa 500 ký tự." }),
    });

    const input = screen.getByRole("textbox", { name: /Ghi chú/ });
    const helper = screen.getByText("Tối đa 500 ký tự.");

    expect(input).toHaveAttribute("aria-describedby", helper.id);
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("connects rich-text validation and toolbar controls to accessible names", () => {
    const field = createField({ name: "Ná»™i dung phong phÃº", type: "richText", required: true });

    renderRuntime(field, {
      getFieldState: () => ({ errorText: "Ná»™i dung phong phÃº lÃ  báº¯t buá»™c." }),
    });

    const editor = screen.getByRole("textbox", { name: "Ná»™i dung phong phÃº" });
    const feedback = screen.getByRole("alert");
    expect(editor).toHaveAttribute("aria-required", "true");
    expect(editor).toHaveAttribute("aria-invalid", "true");
    expect(editor).toHaveAttribute("aria-describedby", feedback.id);
    expect(screen.getByRole("button", { name: /In đậm/i })).toBeInTheDocument();
  });

  it("renders all ten canonical field kinds with exact falsy/list values and readonly controls", () => {
    const fields: DynamicFormField[] = [
      createField({
        id: "short",
        name: "Short",
        type: "shortText",
        order: 0,
        valueSource: { sourceType: "FIXED_ENUM", options: [{ code: "S", label: "Short option" }] },
      }),
      createField({ id: "long", name: "Long", type: "longText", order: 1 }),
      createField({ id: "rich", name: "Rich", type: "richText", order: 2 }),
      createField({ id: "list", name: "List", type: "stringList", order: 3 }),
      createField({ id: "number", name: "Number", type: "number", order: 4 }),
      createField({ id: "date", name: "Date", type: "date", order: 5 }),
      createField({ id: "full-date", name: "Full date", type: "fullDate", order: 6 }),
      createField({
        id: "single",
        name: "Single",
        type: "singleSelect",
        order: 7,
        valueSource: { sourceType: "FIXED_ENUM", options: [{ code: "A", label: "Option A" }] },
      }),
      createField({
        id: "multi",
        name: "Multi",
        type: "multiSelect",
        order: 8,
        valueSource: {
          sourceType: "FIXED_ENUM",
          options: [
            { code: "A", label: "Option A" },
            { code: "B", label: "Option B" },
          ],
        },
      }),
      createField({ id: "boolean", name: "Boolean", type: "boolean", order: 9 }),
    ];

    render(
      <DynamicFormRuntimeFields
        sections={[section]}
        fields={fields}
        values={{
          short: "S",
          long: "long value",
          rich: "rich value",
          list: ["first", "second"],
          number: 0,
          date: "2026-07-22",
          "full-date": "2026-07-22",
          single: "A",
          multi: ["A", "B"],
          boolean: false,
        }}
        readOnly
        onChange={vi.fn()}
      />,
    );

    for (const field of fields) {
      expect(screen.getByRole("group", { name: field.name ?? field.id })).toBeInTheDocument();
    }
    expect(screen.getByRole("combobox", { name: "Short" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Long" })).toHaveValue("long value");
    expect(screen.getByRole("spinbutton", { name: "Number" })).toHaveValue(0);
    expect(screen.getByRole("textbox", { name: "Date" })).toHaveValue("22/07/2026");
    expect(screen.getByRole("textbox", { name: "Full date" })).toHaveValue("22/07/2026");
    expect(screen.getByRole("checkbox", { name: "Boolean" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Boolean" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Single" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Multi" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Thêm ý/ })).not.toBeInTheDocument();
  });

  it("marks a stored fixed-enum code as unavailable instead of adding a fake option", async () => {
    const field = createField({
      name: "Trạng thái",
      type: "singleSelect",
      valueSource: {
        sourceType: "FIXED_ENUM",
        options: [{ code: "ACTIVE", label: "Đang dùng" }],
      },
    });

    renderRuntime(field, { values: { [field.id]: "REMOVED" } });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Giá trị đã lưu không còn khả dụng trong nguồn hiện tại: REMOVED.",
    );

    const input = screen.getByRole("combobox", { name: /Trạng thái/ });
    fireEvent.mouseDown(input);
    await waitFor(() => expect(screen.getByRole("option", { name: "Đang dùng" })).toBeInTheDocument());
    expect(screen.queryByRole("option", { name: /REMOVED/ })).not.toBeInTheDocument();
  });

  it("keeps 403 distinct and retries the same picker contract", async () => {
    pickerMocks.enumOptions
      .mockImplementationOnce(() => ({
        unwrap: () => Promise.reject({ status: 403 }),
      }))
      .mockImplementationOnce(() => successfulTrigger([
        {
          id: "option-1",
          catalogId: "catalog-1",
          catalogCode: "STATUS",
          code: "ACTIVE",
          label: "Đang dùng",
          order: 0,
        },
      ]));
    const field = createField({
      name: "Trạng thái",
      type: "singleSelect",
      valueSource: {
        sourceType: "ENUM_CATALOG",
        catalogId: "catalog-1",
      },
    });

    renderRuntime(field);

    expect(screen.getByRole("status")).toHaveTextContent("Đang tải nguồn lựa chọn...");
    const forbidden = await screen.findByRole("alert", {}, { timeout: 2_000 });
    expect(forbidden).toHaveTextContent("Bạn không có quyền tải nguồn lựa chọn này.");

    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    await waitFor(() => expect(pickerMocks.enumOptions).toHaveBeenCalledTimes(2), { timeout: 2_000 });
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(pickerMocks.enumOptions).toHaveBeenLastCalledWith({
      catalogId: "catalog-1",
      q: "",
      page: 0,
      pageSize: 50,
    });
  });

  it("shows a generic recoverable message for non-403 picker failures", async () => {
    pickerMocks.enumOptions.mockImplementationOnce(() => ({
      unwrap: () => Promise.reject({ status: 500 }),
    }));
    const field = createField({
      name: "Trạng thái",
      type: "singleSelect",
      valueSource: {
        sourceType: "ENUM_CATALOG",
        catalogId: "catalog-1",
      },
    });

    renderRuntime(field);

    const alert = await screen.findByRole("alert", {}, { timeout: 2_000 });
    expect(alert).toHaveTextContent("Không tải được nguồn lựa chọn. Vui lòng thử lại.");
    expect(alert).not.toHaveTextContent("không có quyền");
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
  });

  it("verifies a stored external ID explicitly before declaring it stale", async () => {
    pickerMocks.units.mockImplementation((request: { code?: string }) =>
      request.code === "unit-51"
        ? successfulTrigger([{ id: "unit-51", fullName: "Unit 51", code: "DV51" }])
        : successfulTrigger(Array.from({ length: 50 }, (_, index) => ({
            id: `unit-${index + 1}`,
            fullName: `Unit ${index + 1}`,
            code: `DV${index + 1}`,
          }))),
    );
    const field = createField({
      id: "source-system-unit",
      name: "Unit",
      type: "singleSelect",
      valueSource: { sourceType: "SYSTEM_UNIT" },
    });

    renderRuntime(field, { values: { [field.id]: "unit-51" } });

    await waitFor(() => expect(pickerMocks.units).toHaveBeenCalledWith({
      code: "unit-51",
      page: 0,
      pageSize: 50,
    }));
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Unit" })).toHaveValue("Unit 51 - DV51"),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    {
      sourceType: "SYSTEM_UNIT" as const,
      mock: "units" as const,
      row: { id: "unit-1", fullName: "Đơn vị Một", code: "DV1" },
      label: "Đơn vị Một - DV1",
      expectedRequest: { code: "", page: 0, pageSize: 50 },
    },
    {
      sourceType: "SYSTEM_USER" as const,
      mock: "users" as const,
      row: { id: "user-1", fullName: "Người dùng Một", username: "user1" },
      label: "Người dùng Một - user1",
      expectedRequest: { q: "", page: 0, pageSize: 50 },
    },
    {
      sourceType: "SYSTEM_POSITION" as const,
      mock: "positions" as const,
      row: { code: "CV1", name: "Chức vụ Một" },
      label: "Chức vụ Một",
      expectedRequest: { q: "", page: 0, pageSize: 50 },
    },
    {
      sourceType: "SYSTEM_UNIT_TYPE" as const,
      mock: "unitTypes" as const,
      row: { code: "LOAI1", name: "Loại đơn vị Một" },
      label: "Loại đơn vị Một",
      expectedRequest: { q: "", page: 0, pageSize: 50 },
    },
  ])("loads the $sourceType canonical picker without substituting another source", async ({
    sourceType,
    mock,
    row,
    label,
    expectedRequest,
  }) => {
    pickerMocks[mock].mockImplementationOnce(() => successfulTrigger([row]));
    const field = createField({
      id: `source-${sourceType.toLowerCase()}`,
      name: sourceType,
      type: "singleSelect",
      valueSource: { sourceType },
    });

    renderRuntime(field);

    await waitFor(() => expect(pickerMocks[mock]).toHaveBeenCalledWith(expectedRequest), { timeout: 2_000 });
    const input = screen.getByRole("combobox", { name: sourceType });
    fireEvent.mouseDown(input);
    expect(await screen.findByRole("option", { name: label })).toBeInTheDocument();
  });
});
