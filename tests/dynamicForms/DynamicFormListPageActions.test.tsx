import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DynamicFormRow } from "../../src/api/dynamicFormApi";
import { ApiErrorCode } from "../../src/constants/errorCodes";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  search: vi.fn(),
  searchState: null as unknown,
  publish: vi.fn(),
  publishState: { isLoading: false },
  clone: vi.fn(),
  cloneState: { isLoading: false },
  del: vi.fn(),
  deleteState: { isLoading: false },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("../../src/api/dynamicFormApi", () => ({
  useSearchDynamicFormsMutation: () => [mocks.search, mocks.searchState],
  usePublishDynamicFormMutation: () => [mocks.publish, mocks.publishState],
  useCloneDynamicFormMutation: () => [mocks.clone, mocks.cloneState],
  useDeleteDynamicFormMutation: () => [mocks.del, mocks.deleteState],
  useGetDynamicFormQuery: () => ({ isFetching: false, isError: false, data: undefined }),
}));

vi.mock("../../src/features/dynamicForms/components/DynamicFormFilterBar", () => ({
  default: () => <div data-testid="filter-bar" />,
}));

vi.mock("../../src/features/dynamicForms/components/DynamicFormListTable", () => ({
  DynamicFormListTable: ({
    rows,
    onPublish,
    onClone,
    onDelete,
  }: {
    rows: DynamicFormRow[];
    onPublish?: (row: DynamicFormRow) => void;
    onClone?: (row: DynamicFormRow) => void;
    onDelete?: (row: DynamicFormRow) => void;
  }) => (
    <div>
      <button onClick={() => onPublish?.(rows[0])}>Mở xác nhận công bố</button>
      <button onClick={() => onClone?.(rows[0])}>Sao chép lỗi</button>
      <button onClick={() => onDelete?.(rows[0])}>Mở xác nhận xóa</button>
    </div>
  ),
}));

vi.mock("../../src/features/dynamicForms/components/DynamicFormListStatePanel", () => ({
  DynamicFormListStatePanel: () => <div data-testid="list-state" />,
}));

vi.mock("../../src/features/dynamicForms/components/DynamicFormPreview", () => ({
  default: () => <div data-testid="preview" />,
}));

vi.mock("../../src/components/common/ConfirmDialog", () => ({
  ConfirmDialog: ({
    open,
    confirmLoading,
    onConfirm,
  }: {
    open: boolean;
    confirmLoading?: boolean;
    onConfirm: () => void;
  }) =>
    open ? (
      <button disabled={confirmLoading} onClick={onConfirm}>
        Xác nhận thao tác
      </button>
    ) : null,
}));

import DynamicFormListPage from "../../src/pages/dynamicForms/DynamicFormListPage";

const ownerDraft: DynamicFormRow = {
  id: "form-draft-1",
  code: "DF-LIST-ACTION",
  name: "Biểu mẫu thao tác danh sách",
  description: null,
  tagCodes: [],
  schemaVersion: 1,
  versionNo: 1,
  familyId: "form-draft-1",
  previousVersionId: null,
  clonedFromVersionId: null,
  lineageStatus: "ROOT",
  revision: 5,
  isActive: true,
  isPublished: false,
  createdByUserId: "owner-1",
  createdByUsername: "owner",
  createdAtUtc: "2026-07-22T00:00:00Z",
  canMutate: true,
  canClone: true,
  canViewByCloneGrant: false,
  publishedSchemaHash: null,
  actions: {
    canRead: true,
    canUpdate: true,
    canDelete: true,
    canPublish: true,
    canCreateVersion: false,
    canViewHistory: true,
    canClone: true,
    canImport: true,
    canUpdateStatistics: true,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  const searchData = { rows: [ownerDraft], totalRows: 1, page: 0, pageSize: 10 };
  mocks.searchState = {
    data: searchData,
    isUninitialized: false,
    isLoading: false,
    isError: false,
    error: undefined,
  };
  mocks.search.mockResolvedValue({ data: searchData });
  mocks.publish.mockImplementation(() => ({ unwrap: () => Promise.resolve() }));
  mocks.clone.mockImplementation(() => ({ unwrap: () => Promise.resolve(ownerDraft) }));
  mocks.del.mockImplementation(() => ({ unwrap: () => Promise.resolve() }));
});

describe("Dynamic Form list action errors", () => {
  it("shows the catalogued revision conflict and refreshes instead of leaking a rejected promise", async () => {
    mocks.publish.mockImplementation(() => ({
      unwrap: () =>
        Promise.reject({
          status: 409,
          errorCode: ApiErrorCode.DynamicFormRevisionConflict,
          message: "stale revision",
        }),
    }));

    render(<DynamicFormListPage />);
    fireEvent.click(screen.getByRole("button", { name: "Mở xác nhận công bố" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận thao tác" }));

    expect(
      await screen.findByText("Biểu mẫu đã được thay đổi ở nơi khác. Hãy tải bản mới nhất."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xác nhận thao tác" })).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.search).toHaveBeenCalledTimes(2));
  });

  it("surfaces clone failures and does not navigate to an invalid editor", async () => {
    mocks.clone.mockImplementation(() => ({
      unwrap: () =>
        Promise.reject({
          status: 403,
          errorCode: ApiErrorCode.DynamicFormCloneForbidden,
          message: "forbidden",
        }),
    }));

    render(<DynamicFormListPage />);
    fireEvent.click(screen.getByRole("button", { name: "Sao chép lỗi" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/không có quyền sao chép/i);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("sends the visible row revision when deleting a draft", async () => {
    render(<DynamicFormListPage />);
    fireEvent.click(screen.getByRole("button", { name: "Mở xác nhận xóa" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận thao tác" }));

    await waitFor(() =>
      expect(mocks.del).toHaveBeenCalledWith({
        id: ownerDraft.id,
        expectedRevision: ownerDraft.revision,
      }),
    );
  });
});
