import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, type Mock } from "vitest";

import type {
  DynamicFormActionCapabilities,
  DynamicFormRow,
} from "../../src/api/dynamicFormApi";
import { DynamicFormListTable } from "../../src/features/dynamicForms/components/DynamicFormListTable";

const actions = (
  overrides: Partial<DynamicFormActionCapabilities> = {},
): DynamicFormActionCapabilities => ({
  canRead: true,
  canUpdate: true,
  canDelete: true,
  canPublish: true,
  canCreateVersion: false,
  canViewHistory: true,
  canClone: true,
  canImport: true,
  canUpdateStatistics: true,
  ...overrides,
});

const makeRow = (overrides: Partial<DynamicFormRow> = {}): DynamicFormRow => ({
  id: "form-1",
  code: "FORM_01",
  name: "Biểu mẫu kiểm thử",
  tagCodes: [],
  schemaVersion: 1,
  versionNo: 1,
  familyId: "family-1",
  previousVersionId: null,
  clonedFromVersionId: null,
  lineageStatus: "ROOT",
  revision: 1,
  isActive: true,
  isPublished: false,
  createdByUserId: "owner-1",
  createdByUsername: "owner",
  createdAtUtc: "2026-07-21T00:00:00.000Z",
  canMutate: true,
  canClone: true,
  canViewByCloneGrant: false,
  publishedSchemaHash: null,
  actions: actions(),
  ...overrides,
});

type RenderHandlers = {
  onPreview: Mock<(row: DynamicFormRow) => void>;
  onView: Mock<(row: DynamicFormRow) => void>;
  onEdit: Mock<(row: DynamicFormRow) => void>;
  onPublish: Mock<(row: DynamicFormRow) => void>;
  onClone: Mock<(row: DynamicFormRow) => void>;
  onDelete: Mock<(row: DynamicFormRow) => void>;
};

function renderTable(row: DynamicFormRow): RenderHandlers {
  const handlers: RenderHandlers = {
    onPreview: vi.fn(),
    onView: vi.fn(),
    onEdit: vi.fn(),
    onPublish: vi.fn(),
    onClone: vi.fn(),
    onDelete: vi.fn(),
  };

  render(
    <DynamicFormListTable
      rows={[row]}
      total={1}
      page={0}
      pageSize={10}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      sortField="createdAtUtc"
      sortDirection="desc"
      onSortChange={vi.fn()}
      {...handlers}
    />,
  );

  return handlers;
}

function actionButton(action: string, code: string) {
  return screen.getByRole("button", { name: `${action} biểu mẫu ${code}` });
}

function openActionMenu(code: string) {
  fireEvent.click(actionButton("Thao tác khác", code));
}

function menuAction(action: string, code: string) {
  const accessibleName = action.includes("biểu mẫu")
    ? `${action} ${code}`
    : `${action} biểu mẫu ${code}`;
  return screen.getByRole("menuitem", { name: accessibleName });
}

describe("DynamicFormListTable action permissions", () => {
  it("locks mutating actions for a published form while keeping view and clone available", () => {
    const row = makeRow({
      code: "FORM_PUBLISHED",
      isPublished: true,
      actions: actions({
        canUpdate: false,
        canDelete: false,
        canPublish: false,
        canCreateVersion: true,
        canImport: false,
      }),
    });
    renderTable(row);

    expect(actionButton("Nhập thử", row.code)).toBeEnabled();
    expect(actionButton("Xem", row.code)).toBeEnabled();
    expect(actionButton("Sửa", row.code)).toBeDisabled();
    openActionMenu(row.code);
    expect(menuAction("Công bố", row.code)).toHaveAttribute("aria-disabled", "true");
    expect(menuAction("Sao chép thành biểu mẫu mới", row.code)).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(menuAction("Xóa", row.code)).toHaveAttribute("aria-disabled", "true");
  });

  it("allows cloning a clone-granted draft without granting owner mutation rights", () => {
    const row = makeRow({
      code: "FORM_CLONE_GRANT",
      canMutate: false,
      canClone: true,
      canViewByCloneGrant: true,
      actions: actions({
        canUpdate: false,
        canDelete: false,
        canPublish: false,
        canCreateVersion: false,
        canViewHistory: false,
        canImport: false,
        canUpdateStatistics: false,
      }),
    });
    renderTable(row);

    expect(actionButton("Nhập thử", row.code)).toBeEnabled();
    expect(actionButton("Xem", row.code)).toBeEnabled();
    expect(actionButton("Sửa", row.code)).toBeDisabled();
    openActionMenu(row.code);
    expect(menuAction("Công bố", row.code)).toHaveAttribute("aria-disabled", "true");
    expect(menuAction("Sao chép thành biểu mẫu mới", row.code)).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(menuAction("Xóa", row.code)).toHaveAttribute("aria-disabled", "true");
  });

  it("enables owner actions for an unpublished draft and dispatches the selected row", () => {
    const row = makeRow({ code: "FORM_OWNER_DRAFT" });
    const handlers = renderTable(row);

    const edit = actionButton("Sửa", row.code);
    expect(edit).toBeEnabled();
    fireEvent.click(edit);

    openActionMenu(row.code);
    const publish = menuAction("Công bố", row.code);
    const clone = menuAction("Sao chép thành biểu mẫu mới", row.code);
    const remove = menuAction("Xóa", row.code);
    expect(publish).not.toHaveAttribute("aria-disabled", "true");
    expect(clone).not.toHaveAttribute("aria-disabled", "true");
    expect(remove).not.toHaveAttribute("aria-disabled", "true");
    fireEvent.click(publish);

    openActionMenu(row.code);
    fireEvent.click(menuAction("Sao chép thành biểu mẫu mới", row.code));

    openActionMenu(row.code);
    fireEvent.click(menuAction("Xóa", row.code));

    expect(handlers.onEdit).toHaveBeenCalledWith(row);
    expect(handlers.onPublish).toHaveBeenCalledWith(row);
    expect(handlers.onClone).toHaveBeenCalledWith(row);
    expect(handlers.onDelete).toHaveBeenCalledWith(row);
  });

  it("keeps runtime read-only users on view/preview and fail-closes every mutation", () => {
    const row = makeRow({
      code: "FORM_RUNTIME_READONLY",
      canMutate: false,
      canClone: false,
      actions: actions({
        canUpdate: false,
        canDelete: false,
        canPublish: false,
        canCreateVersion: false,
        canViewHistory: false,
        canClone: false,
        canImport: false,
        canUpdateStatistics: false,
      }),
    });

    renderTable(row);

    expect(actionButton("Nhập thử", row.code)).toBeEnabled();
    expect(actionButton("Xem", row.code)).toBeEnabled();
    expect(actionButton("Sửa", row.code)).toBeDisabled();
    expect(actionButton("Thao tác khác", row.code)).toBeDisabled();
  });

  it("fail-closes an outsider-shaped row even if legacy flags are accidentally true", () => {
    const row = makeRow({
      code: "FORM_OUTSIDER",
      canMutate: true,
      canClone: true,
      actions: actions({
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canPublish: false,
        canCreateVersion: false,
        canViewHistory: false,
        canClone: false,
        canImport: false,
        canUpdateStatistics: false,
      }),
    });

    renderTable(row);

    expect(actionButton("Nhập thử", row.code)).toBeDisabled();
    expect(actionButton("Xem", row.code)).toBeDisabled();
    expect(actionButton("Sửa", row.code)).toBeDisabled();
    expect(actionButton("Thao tác khác", row.code)).toBeDisabled();
  });
});
