import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  create: vi.fn(),
  clone: vi.fn(),
  archive: vi.fn(),
  meRoles: ["DYNAMIC_FLOW_MANAGER"] as string[],
  meUnitId: "unit-42",
  searchResult: null as Record<string, unknown> | null,
  createResult: null as Record<string, unknown> | null,
  searchError: null as Record<string, unknown> | null,
}));

vi.mock("../../src/api/dynamicFlowTemplateApi", () => ({
  useSearchDynamicFlowTemplateFamiliesMutation: () => [mocks.search, { isLoading: false }],
  useCreateDynamicFlowTemplateFamilyMutation: () => [mocks.create, { isLoading: false }],
  useCloneDynamicFlowTemplateFamilyMutation: () => [mocks.clone, { isLoading: false }],
  useArchiveDynamicFlowTemplateFamilyMutation: () => [mocks.archive, { isLoading: false }],
}));

vi.mock("../../src/api/base/meApi", () => ({
  useGetMeQuery: () => ({
    data: { id: "actor-1", roles: mocks.meRoles, unitId: mocks.meUnitId },
  }),
}));

import DynamicFlowFamilyListPage from "../../src/pages/dynamicFlows/DynamicFlowFamilyListPage";

const permissions = {
  canRead: true,
  canManage: true,
  executeGrant: false,
  definitionLockable: true,
  executionEligibility: "BLOCKED_UNTIL_TARGET_PHASE",
  executionBlockedReason: "TARGET_PHASE_NOT_IMPLEMENTED",
  blockedUntilPhase: "P5",
  canExecute: false,
};

function makeFamily(overrides: Record<string, unknown> = {}) {
  const version = {
    id: "version-draft-2",
    templateId: "family-1",
    familyId: "family-1",
    versionNo: 2,
    status: "DRAFT",
    draftRevision: 4,
    payloadHash: "d".repeat(64),
    ...permissions,
  };
  return {
    id: "family-1",
    familyId: "family-1",
    code: "FLOW_A",
    name: "Quy trình A",
    description: null,
    rootDynamicFormTemplateId: "form-1",
    dynamicFormTemplateId: "form-1",
    status: "DRAFT",
    familyRevision: 7,
    ownerUserId: "owner-1",
    ownerUnitId: null,
    lineage: { originFamilyId: null, originVersionId: null },
    currentVersionId: null,
    currentVersionNo: null,
    currentVersionHash: null,
    currentVersion: null,
    draftVersion: version,
    versions: [version],
    hasLockedVersion: false,
    archivedAtUtc: null,
    archivedByUserId: null,
    isDeleted: false,
    createdAtUtc: "2026-07-22T00:00:00Z",
    updatedAtUtc: "2026-07-23T00:00:00Z",
    ...permissions,
    ...overrides,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="location">{location.pathname}{location.search}</output>;
}

function renderList(initialEntry = "/design/flows") {
  const router = createMemoryRouter(
    [
      { path: "/design/flows", element: <DynamicFlowFamilyListPage /> },
      { path: "/design/flows/:familyId/versions/:versionId/:tab", element: <LocationProbe /> },
    ],
    { initialEntries: [initialEntry] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

beforeEach(() => {
  mocks.search.mockReset();
  mocks.create.mockReset();
  mocks.clone.mockReset();
  mocks.archive.mockReset();
  mocks.meRoles = ["DYNAMIC_FLOW_MANAGER"];
  mocks.meUnitId = "unit-42";
  mocks.searchError = null;
  mocks.searchResult = { rows: [makeFamily()], totalRows: 237, page: 3, pageSize: 20 };
  mocks.createResult = makeFamily();
  mocks.search.mockImplementation(() => ({
    unwrap: async () => {
      if (mocks.searchError) throw mocks.searchError;
      return mocks.searchResult;
    },
  }));
  mocks.create.mockImplementation(() => ({ unwrap: async () => mocks.createResult }));
  mocks.clone.mockImplementation(() => ({ unwrap: async () => makeFamily() }));
  mocks.archive.mockImplementation(() => ({ unwrap: async () => makeFamily({ status: "ARCHIVED" }) }));
});

describe("DynamicFlowFamilyListPage", () => {
  it("hydrates URL filters into one server-paged request and opens an exact version route", async () => {
    const { router } = renderList(
      "/design/flows?q=FLOW&status=DRAFT&sort=name&direction=ASC&page=3&pageSize=20",
    );

    expect(await screen.findByText("FLOW_A")).toBeInTheDocument();
    expect(mocks.search).toHaveBeenCalledWith({
      query: "FLOW",
      status: "DRAFT",
      sortBy: "name",
      sortDirection: "ASC",
      page: 3,
      pageSize: 20,
    });
    expect(screen.getByText(/237/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mở version" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        "/design/flows/family-1/versions/version-draft-2/overview",
      );
    });
  });

  it("keeps search state in the URL and requests page zero without a client-side collection cap", async () => {
    const { router } = renderList("/design/flows?pageSize=100&page=5");
    await screen.findByText("FLOW_A");

    fireEvent.change(screen.getByLabelText("Tìm theo mã hoặc tên"), {
      target: { value: "quy trinh moi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tìm" }));

    await waitFor(() => {
      expect(router.state.location.search).toContain("q=quy+trinh+moi");
      expect(router.state.location.search).toContain("page=0");
    });
    await waitFor(() => {
      expect(mocks.search).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: "quy trinh moi", page: 0, pageSize: 100 }),
      );
    });
  });

  it("creates a strict minimal draft from an exact root Form version without sending server pins", async () => {
    const { router } = renderList();
    await screen.findByText("FLOW_A");
    fireEvent.click(screen.getByRole("button", { name: "Tạo family" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^Mã family/), { target: { value: "flow_new" } });
    fireEvent.change(within(dialog).getByLabelText(/^Tên family/), { target: { value: "Quy trình mới" } });
    fireEvent.change(within(dialog).getByLabelText(/^ID phiên bản biểu mẫu gốc đã phát hành/), {
      target: { value: "form-version-42" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Tạo và mở draft" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const request = mocks.create.mock.calls[0][0];
    expect(request).toMatchObject({
      code: "FLOW_NEW",
      name: "Quy trình mới",
      rootDynamicFormTemplateId: "form-version-42",
      dynamicFormTemplateId: "form-version-42",
      payload: {
        schemaVersion: 2,
        archetypeId: "FLOW-T01",
        rootDynamicFormTemplateId: "form-version-42",
      },
    });
    expect(request.commandId).toMatch(/^flow-create-/);
    expect(request.payload.formNodes[0]).toEqual({
      formNodeId: "form-node-root",
      role: "ROOT",
      dynamicFormTemplateId: "form-version-42",
    });
    expect(request.payload.actorPolicies[0]).toMatchObject({
      stepId: "step-root",
      stepCode: "*",
      actorRole: "ASSIGNEE",
    });
    expect(request.payload).not.toHaveProperty("catalogVersion");
    expect(request.payload.formNodes[0]).not.toHaveProperty("dynamicFormVersionNo");
    await waitFor(() => expect(router.state.location.pathname).toContain("/versions/version-draft-2/overview"));
  });

  it("renders explicit error and empty states", async () => {
    mocks.searchError = { status: 503, message: "Danh sách tạm thời không sẵn sàng" };
    const first = renderList();
    expect(await screen.findByText("Danh sách tạm thời không sẵn sàng")).toBeInTheDocument();
    first.unmount();

    mocks.searchError = null;
    mocks.searchResult = { rows: [], totalRows: 0, page: 0, pageSize: 20 };
    renderList();
    expect(await screen.findByText("Không có family phù hợp")).toBeInTheDocument();
  });

  it.each([
    ["participant", ["USER"]],
    ["outsider", []],
  ])("hides definition create/clone/archive actions for %s roles", async (_label, roles) => {
    mocks.meRoles = roles;
    mocks.searchResult = {
      rows: [makeFamily({ canManage: false })],
      totalRows: 1,
      page: 0,
      pageSize: 20,
    };
    renderList();

    await screen.findByText("FLOW_A");
    expect(screen.queryByRole("button", { name: "Tạo family" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sao chép" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lưu trữ" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở version" })).toBeInTheDocument();
  });

  it("uses own-unit scoped manager semantics for create and clone affordances", async () => {
    mocks.meRoles = ["MANAGER_UNIT:unit-42"];
    renderList();

    await screen.findByText("FLOW_A");
    expect(screen.getByRole("button", { name: "Tạo family" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sao chép" })).toBeInTheDocument();
  });

  it("does not offer create or clone to an unscoped or cross-unit manager role", async () => {
    mocks.meRoles = ["MANAGER_UNIT:unit-99", "MANAGER_UNIT"];
    mocks.searchResult = {
      rows: [makeFamily({ canManage: true })],
      totalRows: 1,
      page: 0,
      pageSize: 20,
    };
    renderList();

    await screen.findByText("FLOW_A");
    expect(screen.queryByRole("button", { name: "Tạo family" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sao chép" })).not.toBeInTheDocument();
    // Archive is a family-manage action and does not require create-family permission.
    expect(screen.getByRole("button", { name: "Lưu trữ" })).toBeInTheDocument();
  });

  it("clones a manageable family with family CAS and opens the new draft", async () => {
    const cloned = makeFamily({
      id: "family-clone",
      familyId: "family-clone",
      code: "FLOW_A_COPY",
    });
    mocks.clone.mockImplementation(() => ({ unwrap: async () => cloned }));
    const { router } = renderList();
    await screen.findByText("FLOW_A");

    fireEvent.click(screen.getByRole("button", { name: "Sao chép" }));
    const dialog = await screen.findByRole("dialog", { name: "Sao chép flow family" });
    fireEvent.change(within(dialog).getByLabelText(/^Mã family bản sao/), { target: { value: "flow_clone" } });
    fireEvent.change(within(dialog).getByLabelText(/^Tên family bản sao/), { target: { value: "Flow clone" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Tạo bản sao và mở draft" }));

    await waitFor(() => expect(mocks.clone).toHaveBeenCalledTimes(1));
    expect(mocks.clone.mock.calls[0][0]).toMatchObject({
      familyId: "family-1",
      body: {
        expectedFamilyRevision: 7,
        sourceVersionId: "version-draft-2",
        sourceDraftRevision: 4,
        sourcePayloadHash: "d".repeat(64),
        code: "FLOW_CLONE",
        name: "Flow clone",
      },
    });
    expect(mocks.clone.mock.calls[0][0].body.commandId).toMatch(/^flow-clone-/);
    await waitFor(() => expect(router.state.location.pathname).toBe(
      "/design/flows/family-clone/versions/version-draft-2/overview",
    ));
  });

  it("archives a manageable family only after confirmation", async () => {
    renderList();
    await screen.findByText("FLOW_A");

    fireEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));
    const dialog = await screen.findByRole("dialog", { name: "Lưu trữ flow family" });
    expect(mocks.archive).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận lưu trữ" }));

    await waitFor(() => expect(mocks.archive).toHaveBeenCalledTimes(1));
    expect(mocks.archive.mock.calls[0][0]).toMatchObject({
      familyId: "family-1",
      body: { expectedFamilyRevision: 7 },
    });
    expect(mocks.archive.mock.calls[0][0].body.commandId).toMatch(/^flow-archive-/);
  });
});
