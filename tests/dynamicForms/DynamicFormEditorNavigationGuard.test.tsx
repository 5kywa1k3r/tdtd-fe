import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryRouter,
  RouterProvider,
  useNavigate,
} from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type {
  DynamicFormEditorSubmit,
  DynamicFormEditorValue,
} from "../../src/features/dynamicForms/dynamicForm.types";

const { createDynamicFormRequest, createDynamicFormTrigger } = vi.hoisted(() => {
  const request = vi.fn();
  return {
    createDynamicFormRequest: request,
    createDynamicFormTrigger: vi.fn((body: unknown) => ({
      unwrap: () => request(body),
    })),
  };
});

vi.mock("../../src/api/dynamicFormApi", () => ({
  buildDynamicFormSchemaPayload: vi.fn(() => ({ sections: [], fields: [] })),
  useCreateDynamicFormMutation: () => [
    createDynamicFormTrigger,
    { isLoading: false },
  ],
  useNextDynamicFormCodeQuery: () => ({ data: { nextCode: "DF-NEW" } }),
}));

vi.mock("../../src/api/dynamicExcelApi", () => ({
  useLazyGetDynamicExcelQuery: () => [vi.fn()],
}));

vi.mock("../../src/api/base/meApi", () => ({
  useGetMeQuery: () => ({ data: { roles: [] } }),
}));

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
import { Sidebar } from "../../src/layouts/Sidebar";
import DynamicFormCreatePage from "../../src/pages/dynamicForms/DynamicFormCreatePage";

const initialValue: DynamicFormEditorValue = {
  code: "DF-NAV",
  name: "Biểu mẫu điều hướng",
  description: null,
  tagCodes: [],
  schemaVersion: 1,
  isActive: true,
  sections: [{ id: "main", title: "Phần chính", order: 0 }],
  fields: [],
  excelBlockJson: null,
  blocksJson: null,
};

function EditorRoute({
  onSave,
  editorValue,
}: {
  onSave: (value: DynamicFormEditorSubmit) => Promise<void>;
  editorValue: DynamicFormEditorValue;
}) {
  const navigate = useNavigate();
  return (
    <>
      <Sidebar />
      <DynamicFormEditor
        mode="edit"
        initialValue={editorValue}
        onBack={() => void navigate("/design/forms")}
        onSave={onSave}
      />
    </>
  );
}

function renderGuardedRouter(
  onSave: (value: DynamicFormEditorSubmit) => Promise<void>,
  initialEntries: string[] = ["/design/forms/form-1/edit"],
  initialIndex = initialEntries.length - 1,
  editorValue = initialValue,
) {
  const router = createMemoryRouter(
    [
      {
        path: "/design/forms/:id/edit",
        element: <EditorRoute onSave={onSave} editorValue={editorValue} />,
      },
      { path: "/design/forms", element: <div>Danh sách biểu mẫu</div> },
      { path: "/design/flows", element: <div>Danh sách quy trình</div> },
      { path: "/previous", element: <div>Trang trước</div> },
    ],
    { initialEntries, initialIndex },
  );
  render(<RouterProvider router={router} />);
  return router;
}

async function makeEditorDirty(name: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Tên biểu mẫu" }), {
    target: { value: name },
  });
  await waitFor(() => expect(screen.getByText("Chưa lưu")).toBeInTheDocument());
}

describe("DynamicFormEditor router navigation guard", () => {
  it("leaves the create route after one successful save without opening the dirty dialog", async () => {
    createDynamicFormRequest.mockResolvedValueOnce({ id: "created-form" });
    const router = createMemoryRouter(
      [
        { path: "/design/forms/create", element: <DynamicFormCreatePage /> },
        { path: "/design/forms", element: <div>Danh sách biểu mẫu</div> },
      ],
      { initialEntries: ["/design/forms/create"] },
    );
    render(<RouterProvider router={router} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Tên biểu mẫu" }), {
      target: { value: "Biểu mẫu tạo mới" },
    });
    await waitFor(() => expect(screen.getByText("Chưa lưu")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(createDynamicFormRequest).toHaveBeenCalledOnce());
    expect(createDynamicFormTrigger).toHaveBeenCalledOnce();
    expect(createDynamicFormTrigger.mock.calls[0]?.[0]).toMatchObject({
      code: "DF-NEW",
      name: "Biểu mẫu tạo mới",
    });
    await screen.findByText("Danh sách biểu mẫu");
    expect(router.state.location.pathname).toBe("/design/forms");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("guards a real Sidebar route attempt, cancels in place, then discards and proceeds", async () => {
    const router = renderGuardedRouter(vi.fn().mockResolvedValue(undefined));
    await makeEditorDirty("Biểu mẫu đổi từ sidebar");

    fireEvent.click(screen.getByRole("button", { name: "Quy trình động" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/design/forms/form-1/edit");

    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục chỉnh sửa" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe("/design/forms/form-1/edit");

    fireEvent.click(screen.getByRole("button", { name: "Quy trình động" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Đóng không lưu" }));

    await screen.findByText("Danh sách quy trình");
    expect(router.state.location.pathname).toBe("/design/flows");
  });

  it("guards browser Back; cancel stays and save-confirm follows the original history target", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const router = renderGuardedRouter(
      onSave,
      ["/previous", "/design/forms/form-1/edit"],
      1,
    );
    await makeEditorDirty("Biểu mẫu lưu trước khi quay lại");

    await act(async () => {
      await router.navigate(-1);
    });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/design/forms/form-1/edit");

    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục chỉnh sửa" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe("/design/forms/form-1/edit");

    await act(async () => {
      await router.navigate(-1);
    });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lưu rồi đóng" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0]?.[0].name).toBe("Biểu mẫu lưu trước khi quay lại");
    await screen.findByText("Trang trước");
    expect(router.state.location.pathname).toBe("/previous");
  });

  it("blocks browser Back immediately after typing a debounced form name", async () => {
    const router = renderGuardedRouter(
      vi.fn().mockResolvedValue(undefined),
      ["/previous", "/design/forms/form-1/edit"],
      1,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Tên biểu mẫu" }), {
      target: { value: "Tên vừa gõ chưa kịp debounce" },
    });
    await act(async () => {
      await router.navigate(-1);
    });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/design/forms/form-1/edit");
    expect(screen.getByText("Chưa lưu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục chỉnh sửa" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("textbox", { name: "Tên biểu mẫu" })).toHaveValue(
      "Tên vừa gõ chưa kịp debounce",
    );
  });

  it("blocks browser Back for an unblurred choice option and save-confirm keeps the option", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const choiceValue: DynamicFormEditorValue = {
      ...initialValue,
      fields: [
        {
          id: "choice-1",
          sectionId: "main",
          name: "Mức độ",
          type: "singleSelect",
          required: false,
          colSpan: 12,
          minHeight: 72,
          order: 0,
          options: [{ code: "A", label: "Mức A" }],
          isStatistic: false,
        },
      ],
    };
    const router = renderGuardedRouter(
      onSave,
      ["/previous", "/design/forms/form-1/edit"],
      1,
      choiceValue,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Mã" }), {
      target: { value: "B-LOCAL" },
    });
    await act(async () => {
      await router.navigate(-1);
    });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/design/forms/form-1/edit");
    fireEvent.click(screen.getByRole("button", { name: "Lưu rồi đóng" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const fields = JSON.parse(onSave.mock.calls[0]?.[0].fieldsJson ?? "[]") as Array<{
      options?: Array<{ code: string; label: string }>;
    }>;
    expect(fields[0]?.options?.[0]).toMatchObject({ code: "B-LOCAL", label: "Mức A" });
    await screen.findByText("Trang trước");
    expect(router.state.location.pathname).toBe("/previous");
  });
});
