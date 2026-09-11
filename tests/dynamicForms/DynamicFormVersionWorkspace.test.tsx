import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  DynamicFormActionCapabilities,
  DynamicFormDetail,
  DynamicFormRow,
} from "../../src/api/dynamicFormApi";
import { ApiErrorCode } from "../../src/constants/errorCodes";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  query: null as unknown,
  historyQuery: null as unknown,
  createVersion: vi.fn(),
  clone: vi.fn(),
  refetchHistory: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => ({ id: "form-v2" }),
    Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

vi.mock("../../src/api/dynamicFormApi", () => ({
  useGetDynamicFormQuery: () => mocks.query,
  useGetDynamicFormVersionHistoryQuery: () => mocks.historyQuery,
  useCreateDynamicFormVersionMutation: () => [mocks.createVersion, { isLoading: false }],
  useCloneDynamicFormMutation: () => [mocks.clone, { isLoading: false }],
}));

vi.mock("../../src/features/dynamicForms/builder/DynamicFormEditor", () => ({
  default: () => <div data-testid="readonly-form-editor" />,
}));

vi.mock("../../src/features/dynamicForms/components/DynamicFormPreview", () => ({
  default: () => <div data-testid="dynamic-form-preview" />,
}));

import DynamicFormViewPage from "../../src/pages/dynamicForms/DynamicFormViewPage";

function capabilities(
  overrides: Partial<DynamicFormActionCapabilities> = {},
): DynamicFormActionCapabilities {
  return {
    canRead: true,
    canUpdate: false,
    canDelete: false,
    canPublish: false,
    canCreateVersion: true,
    canViewHistory: true,
    canClone: true,
    canImport: false,
    canUpdateStatistics: true,
    ...overrides,
  };
}

function row(overrides: Partial<DynamicFormRow> = {}): DynamicFormRow {
  return {
    id: "form-v2",
    code: "DF-VERSION",
    name: "Biểu mẫu phiên bản",
    description: null,
    tagCodes: [],
    schemaVersion: 1,
    versionNo: 2,
    familyId: "family-version",
    previousVersionId: "form-v1",
    clonedFromVersionId: null,
    lineageStatus: "VERSION",
    revision: 4,
    isActive: true,
    isPublished: true,
    createdByUserId: "owner-1",
    createdByUsername: "owner",
    createdAtUtc: "2026-07-22T00:00:00Z",
    canMutate: true,
    canClone: true,
    canViewByCloneGrant: false,
    publishedSchemaHash: "abcdef0123456789abcdef0123456789",
    actions: capabilities(),
    ...overrides,
  };
}

function detail(overrides: Partial<DynamicFormDetail> = {}): DynamicFormDetail {
  return {
    ...row(),
    updatedAtUtc: "2026-07-22T01:00:00Z",
    publishedAtUtc: "2026-07-22T01:00:00Z",
    schema: { sections: [], fields: [], blocks: [] },
    sectionsJson: '[{"id":"main","title":"Phần chính","order":0}]',
    fieldsJson: "[]",
    excelBlockJson: null,
    blocksJson: null,
    publishedSchemaSnapshotJson: "{}",
    ...overrides,
  };
}

beforeEach(() => {
  const current = detail();
  mocks.query = { data: current, isLoading: false, isError: false };
  mocks.historyQuery = {
    data: {
      familyId: current.familyId,
      code: current.code,
      versions: [row(), row({ id: "form-v1", versionNo: 1, previousVersionId: null })],
    },
    isFetching: false,
    isError: false,
    refetch: mocks.refetchHistory,
  };
  mocks.createVersion.mockImplementation(() => ({
    unwrap: () => Promise.resolve(detail({ id: "form-v3", versionNo: 3, revision: 1, isPublished: false })),
  }));
  mocks.clone.mockImplementation(() => ({
    unwrap: () => Promise.resolve(detail({ id: "clone-v1", familyId: "clone-v1", versionNo: 1 })),
  }));
});

describe("Dynamic Form version workspace", () => {
  it("shows owner/admin capability actions and creates a version with the current revision", async () => {
    render(<DynamicFormViewPage />);

    expect(screen.getByTestId("dynamic-form-version-strip")).toHaveTextContent("Phiên bản v2");
    expect(screen.getByRole("button", { name: "Cập nhật thống kê" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Tạo phiên bản mới" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Tạo phiên bản mới" }));
    await waitFor(() => {
      expect(mocks.createVersion).toHaveBeenCalledWith({
        id: "form-v2",
        body: { expectedRevision: 4 },
      });
    });
    expect(mocks.navigate).toHaveBeenCalledWith("/design/forms/form-v3/edit");
  });

  it("renders history and opens only versions with canRead", () => {
    mocks.historyQuery = {
      ...mocks.historyQuery as object,
      data: {
        familyId: "family-version",
        code: "DF-VERSION",
        versions: [
          row(),
          row({
            id: "hidden-v1",
            versionNo: 1,
            actions: capabilities({ canRead: false }),
          }),
        ],
      },
    };

    render(<DynamicFormViewPage />);
    fireEvent.click(screen.getByRole("tab", { name: "Lịch sử phiên bản" }));

    expect(screen.getByRole("button", { name: "Mở phiên bản v2 hiện tại" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Mở phiên bản v1" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("disables create-version on an old published version when a newer draft exists", () => {
    mocks.historyQuery = {
      ...mocks.historyQuery as object,
      data: {
        familyId: "family-version",
        code: "DF-VERSION",
        versions: [
          row({ id: "form-v3", versionNo: 3, revision: 1, isPublished: false }),
          row(),
        ],
      },
    };

    render(<DynamicFormViewPage />);

    expect(screen.getByRole("button", { name: "Tạo phiên bản mới" })).toBeDisabled();
    expect(mocks.createVersion).not.toHaveBeenCalled();
  });

  it("lets a clone-granted actor clone into a new family without exposing history or edit", async () => {
    mocks.query = {
      data: detail({
        canMutate: false,
        canViewByCloneGrant: true,
        actions: capabilities({
          canCreateVersion: false,
          canViewHistory: false,
          canUpdateStatistics: false,
        }),
      }),
      isLoading: false,
      isError: false,
    };
    mocks.historyQuery = {
      data: undefined,
      isFetching: false,
      isError: false,
      refetch: mocks.refetchHistory,
    };

    render(<DynamicFormViewPage />);

    expect(screen.queryByRole("tab", { name: "Lịch sử phiên bản" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cập nhật thống kê" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sao chép thành biểu mẫu mới" }));

    await waitFor(() => expect(mocks.clone).toHaveBeenCalledOnce());
    expect(mocks.navigate).toHaveBeenCalledWith("/design/forms/clone-v1/edit");
  });

  it("fail-closes runtime-readonly and outsider capability shapes", () => {
    mocks.query = {
      data: detail({
        actions: capabilities({
          canCreateVersion: false,
          canViewHistory: false,
          canClone: false,
          canUpdateStatistics: false,
        }),
      }),
      isLoading: false,
      isError: false,
    };
    render(<DynamicFormViewPage />);

    expect(screen.queryByRole("button", { name: "Tạo phiên bản mới" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sao chép thành biểu mẫu mới" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cập nhật thống kê" })).not.toBeInTheDocument();
  });

  it("surfaces a server version conflict caused by a concurrent draft", async () => {
    mocks.createVersion.mockImplementation(() => ({
      unwrap: () =>
        Promise.reject({
          errorCode: ApiErrorCode.DynamicFormVersionConflict,
          message: "Concurrent draft",
        }),
    }));

    render(<DynamicFormViewPage />);
    fireEvent.click(screen.getByRole("button", { name: "Tạo phiên bản mới" }));

    expect(
      await screen.findByText(/họ biểu mẫu đã có phiên bản mới hơn hoặc bản nháp kế tiếp/i),
    ).toBeInTheDocument();
  });
});
