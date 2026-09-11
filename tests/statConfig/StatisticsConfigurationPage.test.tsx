import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  assignment: null as Record<string, unknown> | null,
  assignmentError: null as unknown,
  basic: null as Record<string, unknown> | null,
  putBasic: vi.fn(),
  lockBasic: vi.fn(),
  nextBasic: vi.fn(),
  validateBundle: vi.fn(),
}));

vi.mock("../../src/api/workAssignmentApi", () => ({
  useGetWorkAssignmentByIdQuery: () => ({
    data: mocks.assignment,
    error: mocks.assignmentError,
    isLoading: false,
    isFetching: false,
    isError: Boolean(mocks.assignmentError),
  }),
}));

vi.mock("../../src/api/labelApi", () => ({
  useSearchLabelsMutation: () => [
    vi.fn(() => ({ unwrap: async () => ({ rows: [], page: 0, pageSize: 50, totalRows: 0 }) })),
    { isLoading: false },
  ],
}));

vi.mock("../../src/api/statConfigApi", () => {
  const emptyQuery = { data: undefined, error: undefined, isLoading: false, isFetching: false, isError: false };
  const idleMutation = () => [vi.fn(() => ({ unwrap: async () => undefined })), { isLoading: false }];
  return {
    useGetEmptyStatConfigBundleQuery: () => ({
      ...emptyQuery,
      data: {
        schemaVersion: "p8-v1",
        ownerKind: "BASIC_SUMMARY",
        ownerId: "assignment-1",
        isEmpty: true,
        pins: [],
        eligibility: {
          configuration: "READY",
          futureResult: "BLOCKED_UNTIL_P9",
          executor: "BLOCKED_UNTIL_P9",
          targetPhase: "P9",
        },
        freshness: "CURRENT",
        canonicalJson: "{}",
        bundleHash: "b".repeat(64),
      },
    }),
    useValidateStatConfigBundleMutation: () => [mocks.validateBundle, { isLoading: false }],
    useGetP8DynamicFormStatisticsQuery: () => emptyQuery,
    useGetP8BasicSummaryConfigQuery: () => ({ ...emptyQuery, data: mocks.basic }),
    usePutP8BasicSummaryConfigMutation: () => [mocks.putBasic, { isLoading: false }],
    useLockP8BasicSummaryConfigMutation: () => [mocks.lockBasic, { isLoading: false }],
    useCreateNextP8BasicSummaryDraftMutation: () => [mocks.nextBasic, { isLoading: false }],
    useGetP8AdvancedSummaryConfigQuery: () => emptyQuery,
    usePutP8AdvancedSummaryConfigMutation: idleMutation,
    useLockP8AdvancedSummaryConfigMutation: idleMutation,
    useCreateNextP8AdvancedSummaryDraftMutation: idleMutation,
    useArchiveP8AdvancedSummaryConfigMutation: idleMutation,
    useGetP8DiffConfigQuery: () => emptyQuery,
    usePutP8DiffConfigMutation: idleMutation,
    useLockP8DiffConfigMutation: idleMutation,
    useCreateNextP8DiffDraftMutation: idleMutation,
    useEnqueueStatConfigReadinessMutation: idleMutation,
    useGetStatConfigReadinessQuery: () => emptyQuery,
  };
});

import StatisticsConfigurationPage from "../../src/pages/works/statistics/StatisticsConfigurationPage";

const identity = {
  ownerKind: "BASIC_SUMMARY",
  ownerId: "assignment-1:form-1",
  configId: "basic-config-1",
  versionId: "basic-version-1",
  versionNo: 1,
  revision: 7,
  status: "DRAFT",
  configHash: "a".repeat(64),
  dependencyPins: ["DYNAMIC_FORM:form-1:v3"],
};

const permissions = {
  canReadConfig: true,
  canManageDraft: true,
  canLockVersion: true,
  canViewResult: false,
  canReadDiagnostics: false,
};

function makeBasic() {
  return {
    identity,
    payload: {
      sourceScope: {
        mode: "DIRECT_CHILDREN_OR_SELF",
        flowInstanceId: null,
        flowStepId: null,
        flowBranchId: null,
        flowEffectiveStatus: null,
      },
      periodRule: { mode: "ALL_PERIODS" },
      groupingHints: [],
      detailHints: { includeSourceRows: false, maxTextChars: 12000 },
      targets: [],
    },
    permissions,
    runtimeEligibility: "BLOCKED_UNTIL_P9",
    isVirtualEmpty: false,
    previousVersionId: null,
    meanContract: { formula: "sum/numericValueCount", metadataOnly: true },
    versions: [],
    receiptId: null,
  };
}

function renderPage(tab = "overview") {
  const router = createMemoryRouter(
    [
      {
        path: "/works/:workId/statistics/:scopeAssignmentId/config/:tab?",
        element: <StatisticsConfigurationPage />,
      },
      { path: "/works/:id", element: <div>Work detail</div> },
    ],
    { initialEntries: [`/works/work-1/statistics/assignment-1/config/${tab}`] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

beforeEach(() => {
  mocks.assignment = {
    id: "assignment-1",
    workId: "work-1",
    dynamicFormTemplateId: "form-1",
  };
  mocks.assignmentError = null;
  mocks.basic = makeBasic();
  mocks.putBasic.mockReset();
  mocks.lockBasic.mockReset();
  mocks.nextBasic.mockReset();
  mocks.validateBundle.mockReset();
  mocks.putBasic.mockImplementation(() => ({ unwrap: async () => mocks.basic }));
  mocks.lockBasic.mockImplementation(() => ({ unwrap: async () => mocks.basic }));
  mocks.nextBasic.mockImplementation(() => ({ unwrap: async () => mocks.basic }));
  mocks.validateBundle.mockImplementation(() => ({ unwrap: async () => undefined }));
});

describe("P8 canonical statistics configuration page", () => {
  it("owns the canonical deep link and exposes keyboard-labelled config tabs", async () => {
    const { router } = renderPage();

    expect(await screen.findByRole("heading", { name: "Cấu hình thống kê" })).toBeInTheDocument();
    const tablist = screen.getByRole("tablist", { name: "Các vùng cấu hình thống kê" });
    expect(within(tablist).getAllByRole("tab")).toHaveLength(6);

    fireEvent.click(within(tablist).getByRole("tab", { name: "Basic" }));
    await waitFor(() => expect(router.state.location.pathname).toBe(
      "/works/work-1/statistics/assignment-1/config/basic",
    ));
    expect(await screen.findByRole("region", { name: "Readback BASIC_SUMMARY" })).toBeInTheDocument();

    const forbidden = /run|export|reconcile|preview|hierarchy|materialize|rebuild/i;
    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toHaveAccessibleName(forbidden);
    }
  });

  it("uses only server permissions for a readonly actor", async () => {
    mocks.basic = {
      ...makeBasic(),
      permissions: {
        ...permissions,
        canManageDraft: false,
        canLockVersion: false,
      },
    };
    renderPage("basic");

    expect(await screen.findByText("Chỉ đọc")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lưu draft cấu hình" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Khóa version" })).not.toBeInTheDocument();
  });

  it("sends command/CAS and keeps local draft on STALE_CONFLICT", async () => {
    mocks.putBasic.mockImplementation(() => ({
      unwrap: async () => Promise.reject({
        status: 409,
        data: { errorCode: "STAT_CONFIG_CAS_CONFLICT" },
      }),
    }));
    renderPage("basic");

    const unitGrouping = await screen.findByRole("checkbox", { name: "UNIT" });
    const periodGrouping = screen.getByRole("checkbox", { name: "PERIOD" });
    fireEvent.click(unitGrouping);
    fireEvent.click(periodGrouping);
    fireEvent.click(screen.getByRole("button", { name: "Lưu draft cấu hình" }));

    await waitFor(() => expect(mocks.putBasic).toHaveBeenCalledTimes(1));
    const request = mocks.putBasic.mock.calls[0][0];
    expect(request.assignmentId).toBe("assignment-1");
    expect(request.dynamicFormTemplateId).toBe("form-1");
    expect(request.body.commandId).toMatch(/^p8-ui-basic-put-/);
    expect(request.body.expectedRevision).toBe(7);
    expect(request.body.expectedConfigHash).toBe("a".repeat(64));
    expect(request.body.payload.groupingHints).toEqual(["UNIT", "PERIOD"]);
    expect(await screen.findByText(/STALE_CONFLICT/)).toBeInTheDocument();
    expect(unitGrouping).toBeChecked();
    expect(periodGrouping).toBeChecked();
  });

  it("fails closed when the scope assignment belongs to another work", async () => {
    mocks.assignment = {
      id: "assignment-1",
      workId: "work-other",
      dynamicFormTemplateId: "form-1",
    };
    renderPage("basic");

    expect(await screen.findByText("Chưa được hỗ trợ")).toBeInTheDocument();
    expect(screen.getByText(/không tải owner để tránh lộ chéo dữ liệu/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Basic configuration")).not.toBeInTheDocument();
  });

  it("renders the FORBIDDEN state from the API without role inference", async () => {
    mocks.assignment = null;
    mocks.assignmentError = { status: 403, data: { errorCode: "COMMON_FORBIDDEN" } };
    renderPage("overview");

    expect(await screen.findByText("Không có quyền truy cập")).toBeInTheDocument();
    expect(screen.queryByLabelText("Canonical bundle readback")).not.toBeInTheDocument();
  });
});
