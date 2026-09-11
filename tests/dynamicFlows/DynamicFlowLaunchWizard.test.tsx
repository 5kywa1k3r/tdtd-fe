import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actorId: "issuer-1" as string | null,
  preflight: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("../../src/stores/authStorage", () => ({
  getMeSnapshot: () => (mocks.actorId ? { id: mocks.actorId } : null),
}));

vi.mock("../../src/api/dynamicFlowRuntimeApi", async () => {
  const actual = await vi.importActual<typeof import("../../src/api/dynamicFlowRuntimeApi")>(
    "../../src/api/dynamicFlowRuntimeApi",
  );
  return {
    ...actual,
    usePreflightDynamicFlowRuntimeMutation: () => [
      mocks.preflight,
      { isLoading: false },
    ],
    useConfirmDynamicFlowRuntimeMutation: () => [
      mocks.confirm,
      { isLoading: false },
    ],
  };
});

vi.mock("../../src/components/common/LazyUnitMultiSelect", () => ({
  LazyUnitMultiSelect: ({
    id,
    label,
    value,
    onChange,
  }: {
    id?: string;
    label?: string;
    value: string[];
    onChange: (value: string[]) => void;
  }) => (
    <button
      id={id}
      type="button"
      aria-label={label}
      onClick={() => onChange(["unit-a", "unit-b"])}
    >
      {value.length ? value.join(",") : "Chọn đơn vị"}
    </button>
  ),
}));

import DynamicFlowLaunchWizard from "../../src/components/works/flowRuntime/DynamicFlowLaunchWizard";

function setMediaQueryMatches(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

function preview(commandId: string, archetypeId: "FLOW-T01" | "FLOW-T03" = "FLOW-T01") {
  return {
    workId: "work-1",
    workType: "TASK",
    commandId,
    issuerUserId: "issuer-1",
    issuerUnitId: "issuer-unit",
    commandIdentityHash: "command-hash",
    requestHash: "request-hash",
    snapshotToken: "snapshot-token-1",
    eligibility: "ELIGIBLE_CANDIDATE",
    blockedUntilPhase: null,
    flowPin: {
      flowTemplateId: "flow-family-1",
      flowTemplateVersionId: "flow-version-12",
      flowTemplateVersionNo: 12,
      payloadHash: "payload-hash",
      catalogVersion: "1.2",
      catalogSemanticHash: "catalog-hash",
      archetypeId,
      definitionRevision: "definition-revision-12",
      topologyHash: "topology-hash-12",
    },
    entryStep: {
      stepId: "step-definition-1",
      stepCode: "REPORT",
      stepOrder: 1,
      formNodeId: "form-node-1",
      nextStepIds: archetypeId === "FLOW-T03" ? ["step-definition-2"] : [],
      isTerminalNode: archetypeId !== "FLOW-T03",
    },
    formPins: [
      {
        formNodeId: "form-node-1",
        dynamicFormTemplateId: "form-version-3",
        dynamicFormFamilyId: "form-family-1",
        dynamicFormVersionNo: 3,
        dynamicFormSchemaHash: "schema-hash",
        dynamicFormSnapshotHash: "snapshot-hash",
      },
    ],
    targets: [
      {
        targetUnitId: "unit-a",
        assigneeUserIds: ["reporter-1"],
        participants: [
          {
            userId: "reporter-1",
            username: "reporter",
            fullName: "Reporter One",
            unitId: "unit-a",
            unitSymbol: "A",
            unitShortName: "A",
            unitName: "Unit A",
            positionCode: null,
            positionName: null,
          },
        ],
      },
    ],
    targetTotal: 1,
    targetLimit: 25,
    targetHasMore: false,
    targetNextCursor: null,
    periodKey: "2026-07",
    scheduleIdentityJson: "{}",
    scheduleIdentityHash: "schedule-hash",
  } as const;
}

async function reachPreview(archetypeId: "FLOW-T01" | "FLOW-T03" = "FLOW-T01") {
  fireEvent.change(screen.getByLabelText(/Exact locked Flow version id/i), {
    target: { value: "flow-version-12" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/i }));
  fireEvent.click(screen.getByRole("button", { name: /Đơn vị đích/i }));
  fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/i }));
  fireEvent.change(screen.getByLabelText(/Period key/i), {
    target: { value: "2026-07" },
  });
  mocks.preflight.mockImplementationOnce((args: { body: { commandId: string } }) => ({
    unwrap: async () => preview(args.body.commandId, archetypeId),
  }));
  fireEvent.click(screen.getByRole("button", { name: /Xem trước từ server/i }));
  await screen.findByRole("region", { name: /Xem trước exact Flow/i });
}

beforeEach(() => {
  sessionStorage.clear();
  setMediaQueryMatches(false);
  mocks.actorId = "issuer-1";
  mocks.preflight.mockReset();
  mocks.confirm.mockReset();
});

describe("DynamicFlowLaunchWizard", () => {
  it("retries an uncertain confirm with the exact same command and snapshot", async () => {
    const onOpenedInstance = vi.fn();
    mocks.confirm
      .mockImplementationOnce(() => ({
        unwrap: async () => Promise.reject({ status: 503 }),
      }))
      .mockImplementationOnce((args: { body: { commandId: string; snapshotToken: string } }) => ({
        unwrap: async () => ({
          commandId: args.body.commandId,
          requestHash: "request-hash",
          snapshotToken: args.body.snapshotToken,
          status: "MATERIALIZING",
          businessWritePerformed: true,
          flowInstanceId: "instance-1",
          instanceState: "MATERIALIZING",
          stepInstanceIds: [],
          assignmentIds: [],
        }),
      }));

    render(
      <DynamicFlowLaunchWizard
        open
        workId="work-1"
        onClose={vi.fn()}
        onOpenedInstance={onOpenedInstance}
      />,
    );
    await reachPreview();
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/i }));

    expect(screen.getByLabelText(/Command id/i)).toHaveAttribute("readonly");
    expect(screen.getByLabelText(/Snapshot token/i)).toHaveValue("snapshot-token-1");
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận snapshot/i }));
    const retryButton = await screen.findByRole("button", { name: /Thử lại cùng lệnh/i });
    const firstRequest = mocks.confirm.mock.calls[0][0];

    expect(retryButton).toBeEnabled();
    fireEvent.click(retryButton);
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(2), { timeout: 5_000 });
    await waitFor(() => expect(onOpenedInstance).toHaveBeenCalledWith("instance-1"), {
      timeout: 5_000,
    });
    expect(mocks.confirm).toHaveBeenCalledTimes(2);
    expect(mocks.confirm.mock.calls[1][0]).toEqual(firstRequest);
    expect(JSON.stringify(mocks.confirm.mock.calls[1][0])).toBe(JSON.stringify(firstRequest));
    expect(screen.queryByRole("button", { name: /khởi chạy mới|launch mới/i })).not.toBeInTheDocument();
  });

  it("allows FLOW-T03 confirmation while keeping later topologies blocked", async () => {
    const onOpenedInstance = vi.fn();
    mocks.confirm.mockImplementationOnce((args: { body: { commandId: string; snapshotToken: string } }) => ({
      unwrap: async () => ({
        commandId: args.body.commandId,
        requestHash: "request-hash",
        snapshotToken: args.body.snapshotToken,
        status: "MATERIALIZING",
        businessWritePerformed: true,
        flowInstanceId: "instance-t03",
        instanceState: "MATERIALIZING",
        stepInstanceIds: [],
        assignmentIds: [],
      }),
    }));
    render(
      <DynamicFlowLaunchWizard
        open
        workId="work-1"
        onClose={vi.fn()}
        onOpenedInstance={onOpenedInstance}
      />,
    );
    await reachPreview("FLOW-T03");

    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/i }));
    expect(
      screen.getByText(/FLOW-T01\.\.T12.*catalog 1\.3.*Mapping\/source rules.*P7.*statistics\/aggregation.*P8/i),
    ).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: /Xác nhận snapshot/i });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onOpenedInstance).toHaveBeenCalledWith("instance-t03"));
  });

  it("requires stale snapshots to be preflighted again with the same command intent", async () => {
    mocks.confirm.mockImplementationOnce(() => ({
      unwrap: async () =>
        Promise.reject({
          status: 409,
          data: { errorCode: "DYNAMIC_FLOW_PREFLIGHT_STALE" },
        }),
    }));

    render(
      <DynamicFlowLaunchWizard
        open
        workId="work-1"
        onClose={vi.fn()}
        onOpenedInstance={vi.fn()}
      />,
    );
    await reachPreview();
    const originalCommandId = mocks.preflight.mock.calls[0][0].body.commandId;
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/i }));
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận snapshot/i }));

    await screen.findByText(/xung đột phiên bản/i);
    expect(screen.getByRole("button", { name: /Xác nhận snapshot/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Xem trước lại/i }));

    mocks.preflight.mockImplementationOnce((args: { body: { commandId: string } }) => ({
      unwrap: async () => ({
        ...preview(args.body.commandId),
        snapshotToken: "snapshot-token-2",
      }),
    }));
    fireEvent.click(screen.getByRole("button", { name: /Xem trước từ server/i }));
    await screen.findByText("snapshot-token-2");

    expect(mocks.preflight.mock.calls[1][0].body.commandId).toBe(originalCommandId);
    expect(mocks.preflight.mock.calls[1][0].body).toEqual(
      mocks.preflight.mock.calls[0][0].body,
    );
  });

  it("focuses the first invalid control and exposes the locked error state", async () => {
    render(
      <DynamicFlowLaunchWizard
        open
        workId="work-1"
        onClose={vi.fn()}
        onOpenedInstance={vi.fn()}
      />,
    );

    const versionInput = screen.getByLabelText(/Exact locked Flow version id/i);
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/i }));
    await waitFor(() => expect(versionInput).toHaveFocus());

    fireEvent.change(versionInput, { target: { value: "flow-version-locked" } });
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/i }));
    fireEvent.click(screen.getByRole("button", { name: /Đơn vị đích/i }));
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/i }));
    fireEvent.change(screen.getByLabelText(/Period key/i), {
      target: { value: "2026-07" },
    });
    mocks.preflight.mockImplementationOnce(() => ({
      unwrap: async () => Promise.reject({ status: 423, data: { errorCode: "LOCKED" } }),
    }));
    fireEvent.click(screen.getByRole("button", { name: /Xem trước từ server/i }));

    expect(await screen.findByText(/đang bị khóa và chỉ có thể xem/i)).toBeInTheDocument();
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("fails closed without an authenticated actor", () => {
    mocks.actorId = null;
    render(
      <DynamicFlowLaunchWizard
        open
        workId="work-1"
        onClose={vi.fn()}
        onOpenedInstance={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: /Flow runtime/i })).toHaveAttribute(
      "aria-describedby",
      "p5-runtime-launch-description",
    );
    expect(screen.getByRole("button", { name: /Tiếp tục/i })).toBeDisabled();
    expect(screen.getByText(/actor.*fail-closed/i)).toBeInTheDocument();
    expect(mocks.preflight).not.toHaveBeenCalled();
  });

  it("uses a full-screen dialog on the mobile breakpoint without losing identity fields", () => {
    setMediaQueryMatches(true);
    render(
      <DynamicFlowLaunchWizard
        open
        workId="work-mobile"
        onClose={vi.fn()}
        onOpenedInstance={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /Flow runtime/i });
    expect(dialog).toHaveClass("MuiDialog-paperFullScreen");
    expect(screen.getByLabelText(/Exact locked Flow version id/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tiếp tục/i })).toBeEnabled();
  });
});
