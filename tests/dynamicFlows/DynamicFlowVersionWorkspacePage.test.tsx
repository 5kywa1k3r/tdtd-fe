import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  family: null as Record<string, unknown> | null,
  version: null as Record<string, unknown> | null,
  currentVersion: undefined as Record<string, unknown> | null | undefined,
  familyError: null as Record<string, unknown> | null,
  versionError: null as Record<string, unknown> | null,
  save: vi.fn(),
  lock: vi.fn(),
  reopen: vi.fn(),
  diff: vi.fn(),
  refetchFamily: vi.fn(),
  refetchVersion: vi.fn(),
}));

vi.mock("reactflow", () => ({
  default: ({ nodes }: { nodes: unknown[] }) => <div data-testid="topology-canvas">{nodes.length} nodes</div>,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  BackgroundVariant: { Dots: "dots" },
  MarkerType: { ArrowClosed: "arrowclosed" },
}));

vi.mock("../../src/api/dynamicFlowTemplateApi", () => ({
  useGetDynamicFlowTemplateFamilyQuery: () => ({
    data: mocks.family,
    currentData: mocks.family,
    error: mocks.familyError,
    isError: Boolean(mocks.familyError),
    isLoading: false,
    isFetching: false,
    refetch: mocks.refetchFamily,
  }),
  useGetDynamicFlowTemplateVersionQuery: () => ({
    data: mocks.version,
    currentData: mocks.currentVersion === undefined ? mocks.version : mocks.currentVersion,
    error: mocks.versionError,
    isError: Boolean(mocks.versionError),
    isLoading: false,
    isFetching: false,
    refetch: mocks.refetchVersion,
  }),
  useSaveDynamicFlowTemplateVersionDraftP4Mutation: () => [mocks.save, { isLoading: false }],
  useLockDynamicFlowTemplateVersionP4Mutation: () => [mocks.lock, { isLoading: false }],
  useReopenDynamicFlowTemplateVersionMutation: () => [mocks.reopen, { isLoading: false }],
  useDiffDynamicFlowTemplateVersionsMutation: () => [mocks.diff, { isLoading: false }],
}));

import DynamicFlowVersionWorkspacePage from "../../src/pages/dynamicFlows/DynamicFlowVersionWorkspacePage";

const permissionMetadata = {
  canRead: true,
  canManage: true,
  executeGrant: false,
  definitionLockable: true,
  executionEligibility: "BLOCKED_UNTIL_TARGET_PHASE",
  executionBlockedReason: "TARGET_PHASE_NOT_IMPLEMENTED",
  blockedUntilPhase: "P5",
  canExecute: false,
};

function makeVersion(status: "DRAFT" | "LOCKED" | "ARCHIVED" = "DRAFT") {
  return {
    id: "version-1",
    templateId: "family-1",
    familyId: "family-1",
    rootDynamicFormTemplateId: "form-version-1",
    dynamicFormTemplateId: "form-version-1",
    versionNo: 1,
    status,
    draftRevision: 4,
    schemaVersion: 2,
    adapterVersion: 1,
    catalogVersion: "1.1",
    catalogSemanticHash: "a".repeat(64),
    payloadHash: "d".repeat(64),
    payload: {
      schemaVersion: 2,
      archetypeId: "FLOW-T01",
      entryStepId: "step-1",
      rootDynamicFormTemplateId: "form-version-1",
      formNodes: [
        {
          formNodeId: "form-node-1",
          role: "ROOT",
          dynamicFormTemplateId: "form-version-1",
          dynamicFormFamilyId: "form-family-1",
          dynamicFormVersionNo: 3,
          dynamicFormSchemaHash: "b".repeat(64),
          dynamicFormSnapshotHash: "c".repeat(64),
        },
      ],
      nodes: [
        {
          nodeId: "step-1",
          nodeCode: "STEP_1",
          nodeKind: "FORM_STEP",
          name: "Bước một",
          formNodeId: "form-node-1",
          declaredRoles: ["ASSIGNEE"],
          gateway: null,
        },
      ],
      edges: [],
      actorPolicies: [],
      fieldPolicies: [],
      tableColumnPolicies: [],
      mappingRules: [],
      resultOwnerStepId: null,
      resultOwnerFormNodeId: null,
      statisticsOwnerStepId: null,
      statisticsOwnerFormNodeId: null,
      rollbackPolicy: {},
      finalResultPolicy: {},
      statisticProfile: {},
      catalogVersion: "1.1",
      catalogSemanticHash: "a".repeat(64),
    },
    isUsed: false,
    lineage: { originFamilyId: null, originVersionId: null },
    migrationState: "CANONICAL",
    lockedAtUtc: status === "LOCKED" ? "2026-07-23T00:00:00Z" : null,
    lockedByUserId: status === "LOCKED" ? "owner-1" : null,
    archivedAtUtc: null,
    archivedByUserId: null,
    createdAtUtc: "2026-07-23T00:00:00Z",
    updatedAtUtc: "2026-07-23T00:00:00Z",
    ...permissionMetadata,
  };
}

function makeFamily(version = makeVersion()) {
  const { payload: _payload, ...summary } = version;
  return {
    id: "family-1",
    familyId: "family-1",
    code: "FLOW_A",
    name: "Quy trình A",
    description: null,
    rootDynamicFormTemplateId: "form-version-1",
    dynamicFormTemplateId: "form-version-1",
    status: "ACTIVE",
    familyRevision: 7,
    ownerUserId: "owner-1",
    ownerUnitId: null,
    lineage: { originFamilyId: null, originVersionId: null },
    currentVersionId: version.status === "LOCKED" ? version.id : null,
    currentVersionNo: version.status === "LOCKED" ? version.versionNo : null,
    currentVersionHash: version.status === "LOCKED" ? version.payloadHash : null,
    currentVersion: version.status === "LOCKED" ? version : null,
    draftVersion: version.status === "DRAFT" ? version : null,
    versions: [summary],
    hasLockedVersion: version.status === "LOCKED",
    archivedAtUtc: null,
    archivedByUserId: null,
    isDeleted: false,
    createdAtUtc: "2026-07-23T00:00:00Z",
    updatedAtUtc: "2026-07-23T00:00:00Z",
    ...permissionMetadata,
  };
}

function renderWorkspace(tab = "overview", versionId = "version-1") {
  const router = createMemoryRouter(
    [
      {
        path: "/design/flows/:familyId/versions/:versionId/:tab?",
        element: <DynamicFlowVersionWorkspacePage />,
      },
      { path: "/design/flows", element: <div>Danh sách</div> },
    ],
    { initialEntries: [`/design/flows/family-1/versions/${versionId}/${tab}`] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  const version = makeVersion();
  mocks.version = version;
  mocks.currentVersion = undefined;
  mocks.family = makeFamily(version);
  mocks.familyError = null;
  mocks.versionError = null;
  mocks.save.mockReset();
  mocks.lock.mockReset();
  mocks.reopen.mockReset();
  mocks.diff.mockReset();
  mocks.refetchFamily.mockReset();
  mocks.refetchVersion.mockReset();
  mocks.refetchFamily.mockResolvedValue({ data: mocks.family });
  mocks.refetchVersion.mockResolvedValue({ data: mocks.version });
  mocks.save.mockImplementation(() => ({ unwrap: async () => mocks.version }));
  mocks.lock.mockImplementation(() => ({ unwrap: async () => makeVersion("LOCKED") }));
  mocks.reopen.mockImplementation(() => ({ unwrap: async () => makeVersion("DRAFT") }));
  mocks.diff.mockImplementation(() => ({
    unwrap: async () => ({
      familyId: "family-1",
      fromVersionId: "version-1",
      toVersionId: "version-2",
      fromPayloadHash: "1".repeat(64),
      toPayloadHash: "2".repeat(64),
      operations: [{ op: "REPLACE", path: "/archetypeId", fromValue: "FLOW-T01", toValue: "FLOW-T02" }],
    }),
  }));
});

describe("DynamicFlowVersionWorkspacePage", () => {
  it.each([
    ["owner", true],
    ["coordinator", true],
    ["reporter", false],
    ["reviewer", false],
    ["target-only", false],
    ["outsider", false],
  ])(
    "uses only the server definition capability for the %s actor",
    async (_actor, canManage) => {
      const version = { ...makeVersion(), canManage };
      mocks.version = version;
      mocks.family = { ...makeFamily(version), canManage };

      renderWorkspace("mapping-metadata");

      const addRule = await screen.findByRole("button", {
        name: "Thêm mapping rule",
      });
      const saveDraft = screen.getByRole("button", { name: "Lưu draft" });
      expect(addRule).toHaveProperty("disabled", !canManage);
      expect(saveDraft).toBeDisabled();

      if (canManage) {
        fireEvent.click(addRule);
        expect(screen.getByText("mapping-1")).toBeInTheDocument();
      } else {
        fireEvent.click(addRule);
        expect(screen.queryByText("mapping-1")).not.toBeInTheDocument();
      }
    },
  );

  it("synchronizes the builder gates for FLOW-T03 through FLOW-T08", async () => {
    const sequential = makeVersion();
    sequential.payload.archetypeId = "FLOW-T03";
    mocks.version = sequential;
    mocks.family = makeFamily(sequential);

    const first = renderWorkspace("topology");

    expect(await screen.findByTestId("p6-t03-builder-contract")).toHaveTextContent(
      /P6-01.*topology tuần tự.*FORM_STEP.*Form version đã khóa/i,
    );
    expect(screen.queryByText(/vẫn chỉ ở mức định nghĩa/i)).not.toBeInTheDocument();
    first.unmount();

    const parallel = makeVersion();
    parallel.payload.archetypeId = "FLOW-T04";
    mocks.version = parallel;
    mocks.family = makeFamily(parallel);
    const second = renderWorkspace("topology");

    expect(await screen.findByTestId("p6-t04-builder-contract")).toHaveTextContent(
      /P6-02.*FORK.*B\/C.*gateway.*contribution/i,
    );
    expect(screen.queryByText(/positive runtime.*prompt P6/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("p6-t03-builder-contract")).not.toBeInTheDocument();
    second.unmount();

    const joinAll = makeVersion();
    joinAll.payload.archetypeId = "FLOW-T05";
    mocks.version = joinAll;
    mocks.family = makeFamily(joinAll);
    const third = renderWorkspace("topology");

    expect(await screen.findByTestId("p6-t05-builder-contract")).toHaveTextContent(
      /P6-03.*JOIN ALL.*contribution.*release/i,
    );
    expect(screen.queryByText(/positive runtime.*prompt P6/i)).not.toBeInTheDocument();
    third.unmount();

    const joinQuorum = makeVersion();
    joinQuorum.payload.archetypeId = "FLOW-T06";
    mocks.version = joinQuorum;
    mocks.family = makeFamily(joinQuorum);
    const fourth = renderWorkspace("topology");

    expect(await screen.findByTestId("p6-t06-builder-contract")).toHaveTextContent(
      /P6-04.*JOIN ANY\/N_OF_M.*CAS winner.*CANCELLED_BY_GATEWAY.*LATE_IGNORED/i,
    );
    expect(screen.queryByText(/positive runtime.*prompt P6/i)).not.toBeInTheDocument();
    fourth.unmount();

    const conditional = makeVersion();
    conditional.payload.archetypeId = "FLOW-T07";
    mocks.version = conditional;
    mocks.family = makeFamily(conditional);
    const fifth = renderWorkspace("topology");

    expect(await screen.findByTestId("p6-t07-builder-contract")).toHaveTextContent(
      /P6-05.*điều kiện có kiểu.*snapshot fact.*AST.*TRUE.*hash.*evaluator.*edge/i,
    );
    expect(screen.queryByText(/positive runtime.*prompt P6/i)).not.toBeInTheDocument();
    fifth.unmount();

    const reviewLoop = makeVersion();
    reviewLoop.payload.archetypeId = "FLOW-T08";
    mocks.version = reviewLoop;
    mocks.family = makeFamily(reviewLoop);
    renderWorkspace("topology");

    expect(await screen.findByTestId("p6-t08-builder-contract")).toHaveTextContent(
      /P6-06.*review loop.*FORM_STEP.*attempt.*assignment.*maxReviewCycles.*1\.\.50/i,
    );
    expect(screen.queryByText(/positive runtime.*prompt P6/i)).not.toBeInTheDocument();
  }, 15_000);

  it("renders the canonical mapping metadata tab without P7 execution controls", async () => {
    renderWorkspace("mapping-metadata");

    expect(await screen.findByText("Quy trình A")).toBeInTheDocument();
    const definition = screen.getByTestId("dynamic-flow-mapping-definition");
    expect(definition).toHaveAttribute("data-readonly", "false");
    expect(definition).toHaveAttribute("aria-label", "Định nghĩa mapping canonical");
    expect(screen.getByTestId("dynamic-flow-mapping-definition-status")).toBeInTheDocument();
    expect(screen.getByTestId("dynamic-flow-mapping-definition-rules"))
      .toHaveAttribute("data-readonly", "false");
    expect(screen.getByTestId("dynamic-flow-mapping-definition-add-rule"))
      .toHaveAttribute("aria-controls", "dynamic-flow-mapping-definition-rule-editor");
    expect(screen.getByText(/không preview, apply, rerun/i)).toBeInTheDocument();
    expect(screen.getByText("Mapping rules")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm mapping rule" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Kết quả & thống kê" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /preview|apply|rerun|khởi chạy|thực thi/i })).not.toBeInTheDocument();
  });

  it("authors a typed mapping rule in the canonical master-detail workspace", async () => {
    renderWorkspace("mapping-metadata");

    fireEvent.click(await screen.findByRole("button", { name: "Thêm mapping rule" }));
    expect(screen.getByText("mapping-1")).toBeInTheDocument();
    expect(screen.getByTestId("dynamic-flow-mapping-definition-rule-0"))
      .toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("dynamic-flow-mapping-definition-rule-editor"))
      .toHaveAttribute("data-validation-errors", "2");
    expect(screen.getByTestId("dynamic-flow-mapping-definition-validation")).toBeInTheDocument();
    expect(screen.getByText(/2 lỗi ở rule đang chọn/i)).toBeInTheDocument();

    const fieldKeys = screen.getAllByLabelText("fieldKey");
    fireEvent.change(fieldKeys[0], { target: { value: "source_total" } });
    fireEvent.change(fieldKeys[1], { target: { value: "target_total" } });

    expect(await screen.findByText(/đủ cấu trúc client-side/i)).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "mappingKind" }));
    fireEvent.click(await screen.findByRole("option", { name: /APPEND_COLUMNS/ }));
    expect(await screen.findByText(/APPEND_COLUMNS target chưa thuộc capability được máy chủ hỗ trợ/i))
      .toBeInTheDocument();
    expect(screen.getByTestId("dynamic-flow-mapping-definition-rule-editor"))
      .toHaveAttribute("data-support", "BLOCKED");
    expect(screen.getByTestId("dynamic-flow-mapping-definition-support"))
      .toHaveTextContent("Intentional block");
    expect(screen.getByText("Intentional block")).toBeInTheDocument();
  }, 10_000);

  it("provides default-deny coverage, tri-state decisions and field/table focus", async () => {
    renderWorkspace("forms-policies");

    expect(await screen.findByText(/Policy coverage \(default deny\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Chưa có policy.*deny theo mặc định/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thêm field policy" }));

    expect(await screen.findByText(/1 lỗi định danh/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("fieldKey"), {
      target: { value: "total" },
    });
    expect(await screen.findByText(/0 lỗi định danh/i)).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "read" }));
    fireEvent.click(await screen.findByRole("option", { name: "Cho phép" }));
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "write" }));
    fireEvent.click(await screen.findByRole("option", { name: "Từ chối" }));
    expect(screen.getByText(/2\/6 quyết định explicit/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Preset deny-all" }));
    expect(await screen.findByText(/6\/6 quyết định explicit/i)).toBeInTheDocument();
  }, 15_000);

  it("preserves edited input and offers explicit rebase after a 409", async () => {
    mocks.save.mockImplementation(() => ({
      unwrap: async () => Promise.reject({
        status: 409,
        errorCode: "DYNAMIC_FLOW_REVISION_CONFLICT",
        message: "stale",
      }),
    }));
    renderWorkspace();
    const archetype = await screen.findByLabelText("Archetype catalog");

    fireEvent.change(archetype, { target: { value: "FLOW-T02" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu draft" }));

    await screen.findByText(/nội dung bạn đang nhập vẫn được giữ nguyên/i);
    expect(screen.getByLabelText("Archetype catalog")).toHaveValue("FLOW-T02");
    expect(screen.getByRole("button", { name: /rebase và giữ nội dung local/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bỏ local, nạp bản máy chủ/i })).toBeInTheDocument();
  });

  it("three-way rebases a 409 and preserves both local-only and remote-only edits", async () => {
    const fresh = {
      ...makeVersion(),
      draftRevision: 5,
      payloadHash: "e".repeat(64),
      payload: {
        ...makeVersion().payload,
        statisticProfile: { remoteMode: "BASIC" },
      },
    };
    mocks.refetchVersion.mockResolvedValue({ data: fresh });
    mocks.save
      .mockImplementationOnce(() => ({
        unwrap: async () => Promise.reject({
          status: 409,
          errorCode: "DYNAMIC_FLOW_REVISION_CONFLICT",
          message: "stale",
        }),
      }))
      .mockImplementation(() => ({ unwrap: async () => fresh }));
    renderWorkspace();

    fireEvent.change(await screen.findByLabelText("Archetype catalog"), {
      target: { value: "FLOW-T02" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu draft" }));
    fireEvent.click(await screen.findByRole("button", {
      name: /rebase và giữ nội dung local/i,
    }));

    expect(await screen.findByText(/rebase ba chiều/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lưu draft" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
    expect(mocks.save.mock.calls[1][0]).toMatchObject({
      body: {
        expectedDraftRevision: 5,
        expectedPayloadHash: "e".repeat(64),
        payload: {
          archetypeId: "FLOW-T02",
          statisticProfile: { remoteMode: "BASIC" },
        },
      },
    });
  });

  it("blocks Save on overlapping rebase edits until the user resolves the exact path", async () => {
    const fresh = {
      ...makeVersion(),
      draftRevision: 5,
      payloadHash: "e".repeat(64),
      payload: {
        ...makeVersion().payload,
        archetypeId: "FLOW-T03",
      },
    };
    mocks.refetchVersion.mockResolvedValue({ data: fresh });
    mocks.save.mockImplementation(() => ({
      unwrap: async () => Promise.reject({
        status: 409,
        errorCode: "DYNAMIC_FLOW_REVISION_CONFLICT",
        message: "stale",
      }),
    }));
    renderWorkspace();

    fireEvent.change(await screen.findByLabelText("Archetype catalog"), {
      target: { value: "FLOW-T02" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu draft" }));
    fireEvent.click(await screen.findByRole("button", {
      name: /rebase và giữ nội dung local/i,
    }));

    expect(await screen.findByText("archetypeId")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu draft" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", {
      name: /giữ local tại vùng xung đột/i,
    }));
    expect(screen.getByLabelText("Archetype catalog")).toHaveValue("FLOW-T02");
    expect(screen.getByRole("button", { name: "Lưu draft" })).toBeEnabled();
  });

  it("preserves invalid unapplied JSON across internal tabs and keeps Save blocked", async () => {
    renderWorkspace("mapping-metadata");
    const editor = await screen.findByLabelText("Mapping rules v2");
    fireEvent.change(editor, { target: { value: "{" } });

    fireEvent.click(screen.getByRole("tab", { name: "Tổng quan" }));
    expect(await screen.findByLabelText("Archetype catalog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Metadata ánh xạ" }));

    expect(await screen.findByLabelText("Mapping rules v2")).toHaveValue("{");
    expect(screen.getByText("JSON không hợp lệ.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu draft" })).toBeDisabled();
  });

  it("routes a structured backend validation path to its tab and focuses the exact canonical mapping control", async () => {
    mocks.save.mockImplementation(() => ({
      unwrap: async () => Promise.reject({
        status: 400,
        errorCode: "DYNAMIC_FLOW_MAPPING_DEFINITION_INVALID",
        message: "invalid mapping",
        details: { path: "mappingRules[0].target.fieldId" },
      }),
    }));
    const { router } = renderWorkspace("mapping-metadata");

    fireEvent.click(await screen.findByRole("button", { name: "Thêm mapping rule" }));
    fireEvent.click(screen.getByRole("button", { name: "Thêm mapping rule" }));
    expect(screen.getByText("mapping-2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lưu draft" }));

    const fieldIds = await screen.findAllByLabelText("fieldId");
    const targetField = fieldIds.find(
      (element) => element.id === "dynamic-flow-mapping-rule-0-target-fieldId",
    );
    expect(targetField).toBeDefined();
    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/\/mapping-metadata$/);
      expect(document.activeElement).toBe(targetField);
    });
    expect(document.activeElement).not.toBe(screen.getByLabelText("Mapping rules v2"));
  });

  it("selects and focuses the exact canonical table policy control from backend validation", async () => {
    mocks.save.mockImplementation(() => ({
      unwrap: async () => Promise.reject({
        status: 400,
        errorCode: "DYNAMIC_FLOW_TABLE_POLICY_ENDPOINT_INCOMPATIBLE",
        message: "invalid table policy",
        details: { path: "tableColumnPolicies[0].columnKey" },
      }),
    }));
    renderWorkspace("forms-policies");

    fireEvent.click(await screen.findByRole("button", { name: "Thêm table policy" }));
    fireEvent.click(screen.getByRole("button", { name: "Thêm field policy" }));
    expect(screen.getByLabelText("fieldKey")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lưu draft" }));

    const columnKey = await screen.findByLabelText("columnKey");
    await waitFor(() => expect(document.activeElement).toBe(columnKey));
    expect(columnKey).toHaveAttribute(
      "id",
      "dynamic-flow-policy-table-0-columnKey",
    );
  });

  it("waits for exact v2 currentData before hydrating and locking after reopen", async () => {
    const lockedV1 = {
      ...makeVersion("LOCKED"),
      draftRevision: 2,
      contributionPolicy: "EXCLUDE",
      contributionPolicyHash: "f".repeat(64),
    };
    const draftV2 = {
      ...makeVersion("DRAFT"),
      id: "version-2",
      versionNo: 2,
      draftRevision: 1,
      payloadHash: lockedV1.payloadHash,
      lineage: {
        originFamilyId: "family-1",
        originVersionId: "version-1",
      },
    };
    const { payload: _v1Payload, ...lockedV1Summary } = lockedV1;
    const { payload: _v2Payload, ...draftV2Summary } = draftV2;
    const reopenedFamily = {
      ...makeFamily(),
      familyRevision: 3,
      currentVersionId: lockedV1.id,
      currentVersionNo: lockedV1.versionNo,
      currentVersionHash: lockedV1.payloadHash,
      currentVersion: lockedV1,
      draftVersion: draftV2,
      versions: [lockedV1Summary, draftV2Summary],
      hasLockedVersion: true,
    };

    mocks.version = lockedV1;
    mocks.family = {
      ...makeFamily(lockedV1),
      familyRevision: 2,
      versions: [lockedV1Summary],
    };
    mocks.reopen.mockImplementation(() => ({
      unwrap: async () => {
        mocks.currentVersion = null;
        mocks.family = reopenedFamily;
        return draftV2;
      },
    }));
    mocks.lock.mockImplementation(() => ({
      unwrap: async () => ({ ...draftV2, status: "LOCKED" }),
    }));

    const view = renderWorkspace();
    fireEvent.click(await screen.findByRole("button", {
      name: "Mở lại thành draft mới",
    }));

    await waitFor(() => expect(view.router.state.location.pathname)
      .toContain("/versions/version-2/overview"));
    expect(screen.getByLabelText("Đang tải workspace quy trình")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Khóa snapshot" })).not.toBeInTheDocument();

    mocks.currentVersion = draftV2;
    await view.router.navigate(
      "/design/flows/family-1/versions/version-2/result-statistics",
    );

    const casStrip = await screen.findByTestId("dynamic-flow-version-cas-strip");
    expect(casStrip).toHaveAttribute("data-family-id", "family-1");
    expect(casStrip).toHaveAttribute("data-family-revision", "3");
    expect(casStrip).toHaveAttribute("data-version-id", "version-2");
    expect(casStrip).toHaveAttribute("data-version-status", "DRAFT");
    expect(casStrip).toHaveAttribute(
      "data-workspace-identity",
      "family-1:version-2",
    );
    expect(casStrip).toHaveAttribute("data-base-draft-revision", "1");
    expect(casStrip).toHaveAttribute(
      "data-base-payload-hash",
      lockedV1.payloadHash,
    );

    fireEvent.click(await screen.findByLabelText(
      "V_INCLUDE — tính vào biểu mẫu đích",
    ));
    fireEvent.click(screen.getByLabelText(
      "Xác nhận cảnh báo INCLUDE",
    ));
    fireEvent.click(screen.getByRole("button", { name: "Khóa snapshot" }));

    await waitFor(() => expect(mocks.lock).toHaveBeenCalledWith({
      familyId: "family-1",
      versionId: "version-2",
      body: {
        commandId: expect.stringMatching(/^flow-lock-/),
        expectedFamilyRevision: 3,
        expectedDraftRevision: 1,
        expectedPayloadHash: lockedV1.payloadHash,
        contributionPolicy: "INCLUDE",
        acknowledgeContributionWarning: true,
      },
    }));
    expect(mocks.lock.mock.calls[0][0].body.expectedDraftRevision).not.toBe(2);
  });

  it("lets a clean manageable draft ask the backend to lock before lock attestation exists", async () => {
    const draft = { ...makeVersion(), definitionLockable: false };
    mocks.version = draft;
    mocks.family = { ...makeFamily(draft), definitionLockable: false };
    renderWorkspace();

    const lockButton = await screen.findByRole("button", { name: "Khóa snapshot" });
    expect(lockButton).toBeEnabled();
    fireEvent.click(lockButton);

    await waitFor(() => expect(mocks.lock).toHaveBeenCalledWith({
      familyId: "family-1",
      versionId: "version-1",
      body: {
        commandId: expect.stringMatching(/^flow-lock-/),
        expectedFamilyRevision: 7,
        expectedDraftRevision: 4,
        expectedPayloadHash: "d".repeat(64),
        contributionPolicy: "EXCLUDE",
        acknowledgeContributionWarning: false,
      },
    }));
  });

  it("does not misclassify the P8 statistic-profile lock barrier as a revision conflict", async () => {
    const draft = makeVersion();
    draft.payload.statisticProfile = { diffMode: "BASIC" };
    mocks.version = draft;
    mocks.family = makeFamily(draft);
    mocks.lock.mockImplementation(() => ({
      unwrap: async () => Promise.reject({
        status: 409,
        errorCode: "DYNAMIC_FLOW_STATISTIC_PROFILE_NOT_EXECUTABLE",
        message: "blocked until P8",
      }),
    }));
    renderWorkspace("result-statistics");

    expect(await screen.findByText("FLOW_STATISTIC_PROFILE_DISABLED")).toBeInTheDocument();
    const lockButton = screen.getByRole("button", { name: "Khóa snapshot" });
    expect(lockButton).toBeDisabled();
    fireEvent.click(lockButton);
    expect(mocks.lock).not.toHaveBeenCalled();
    expect(screen.queryByText(/xung đột revision/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rebase và giữ nội dung local/i })).not.toBeInTheDocument();
  });

  it("shows a generic 403 state without leaking family metadata", async () => {
    mocks.family = null;
    mocks.familyError = { status: 403, message: "forbidden" };
    renderWorkspace();

    expect(await screen.findByText("Không có quyền truy cập")).toBeInTheDocument();
    expect(screen.queryByText("FLOW_A")).not.toBeInTheDocument();
    expect(screen.queryByText("owner-1")).not.toBeInTheDocument();
  });

  it("renders locked snapshots readonly and exposes reopen, never launch", async () => {
    const locked = makeVersion("LOCKED");
    mocks.version = locked;
    mocks.family = makeFamily(locked);
    renderWorkspace();

    expect(await screen.findByText("Phiên bản đã khóa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở lại thành draft mới" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lưu draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /khởi chạy|thực thi/i })).not.toBeInTheDocument();
  });

  it("does not expose reopen for a locked version when its family is archived", async () => {
    const locked = makeVersion("LOCKED");
    mocks.version = locked;
    mocks.family = {
      ...makeFamily(locked),
      status: "ARCHIVED",
      archivedAtUtc: "2026-07-23T00:00:00Z",
      archivedByUserId: "owner-1",
    };
    renderWorkspace();

    expect(await screen.findByText("Định nghĩa đã lưu trữ")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mở lại thành draft mới" }))
      .not.toBeInTheDocument();
  });

  it("compares two exact readable versions without requiring manage permission", async () => {
    const current = { ...makeVersion(), id: "version-2", versionNo: 2, canManage: false };
    const previous = { ...makeVersion("LOCKED"), id: "version-1", versionNo: 1, canManage: false };
    const { payload: _currentPayload, ...currentSummary } = current;
    const { payload: _previousPayload, ...previousSummary } = previous;
    mocks.version = current;
    mocks.family = {
      ...makeFamily(current),
      canManage: false,
      versions: [previousSummary, currentSummary],
    };
    renderWorkspace("overview", "version-2");

    expect(await screen.findByText("So sánh version canonical")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "So sánh version" }));

    await waitFor(() => expect(mocks.diff).toHaveBeenCalledWith({
      familyId: "family-1",
      body: { fromVersionId: "version-1", toVersionId: "version-2" },
    }));
    expect(await screen.findByLabelText("Kết quả so sánh version canonical")).toHaveTextContent("/archetypeId");
    expect(screen.getByText(/from: "FLOW-T01"/)).toBeInTheDocument();
    expect(screen.getByText(/to: "FLOW-T02"/)).toBeInTheDocument();
  });

  it("keeps diff read-only when only one exact participant version is readable", async () => {
    const locked = { ...makeVersion("LOCKED"), canManage: false, executeGrant: true };
    mocks.version = locked;
    mocks.family = { ...makeFamily(locked), canManage: false, executeGrant: true };
    renderWorkspace();

    expect(await screen.findByText("Cần ít nhất hai version có quyền đọc để so sánh.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "So sánh version" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mở lại thành draft mới" })).not.toBeInTheDocument();
  });
});
