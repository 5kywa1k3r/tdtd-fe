import { act, render, screen } from "@testing-library/react";
import {
  createMemoryRouter,
  matchRoutes,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { describe, expect, it } from "vitest";

import { appRoutes } from "../../src/routes/appRoutes";
import {
  dynamicFlowRuntimePath,
  normalizeDynamicFlowRuntimeTab,
  readDynamicFlowRuntimeDeepLink,
} from "../../src/routes/dynamicFlowRoutes";

function LocationProbe() {
  const location = useLocation();
  const identity = readDynamicFlowRuntimeDeepLink(location.search);
  return (
    <>
      <output aria-label="runtime-location">{location.pathname}{location.search}</output>
      <output aria-label="runtime-identity">{JSON.stringify(identity)}</output>
    </>
  );
}

function makeRouter(initialEntry: string) {
  return createMemoryRouter(
    [
      {
        path: "/works/:workId/flow-instances/:instanceId/:tab?",
        element: <LocationProbe />,
      },
      { path: "/works/:workId", element: <div>work</div> },
    ],
    { initialEntries: ["/works/work-1", initialEntry], initialIndex: 1 },
  );
}

describe("dynamic Flow runtime canonical routes", () => {
  it("matches the exact runtime identity in the real application route tree", () => {
    const matches = matchRoutes(
      appRoutes,
      "/works/work-1/flow-instances/instance-1/work-to-do?stepInstanceId=step-1",
    );

    expect(matches?.at(-1)?.route.path).toBe(
      ":workId/flow-instances/:instanceId/:tab?",
    );
    expect(matches?.at(-1)?.params).toMatchObject({
      workId: "work-1",
      instanceId: "instance-1",
      tab: "work-to-do",
    });
  });

  it("encodes the full work/instance/step/branch/attempt identity", () => {
    const path = dynamicFlowRuntimePath("work / 1", "instance / 1", "timeline", {
      stepInstanceId: "step / 3",
      branchId: "branch / unit-a",
      attemptNo: 2,
      assignmentId: "assignment / 4",
      reportId: "report / 5",
    });

    expect(path).toBe(
      "/works/work%20%2F%201/flow-instances/instance%20%2F%201/timeline" +
      "?stepInstanceId=step+%2F+3&branchId=branch+%2F+unit-a&attemptNo=2" +
      "&assignmentId=assignment+%2F+4&reportId=report+%2F+5",
    );
    expect(readDynamicFlowRuntimeDeepLink(path.split("?")[1])).toEqual({
      stepInstanceId: "step / 3",
      branchId: "branch / unit-a",
      attemptNo: 2,
      assignmentId: "assignment / 4",
      reportId: "report / 5",
    });
  });

  it("normalizes unsupported tabs and invalid attempt identities fail closed", () => {
    expect(normalizeDynamicFlowRuntimeTab("overview")).toBe("overview");
    expect(normalizeDynamicFlowRuntimeTab("work-to-do")).toBe("work-to-do");
    expect(normalizeDynamicFlowRuntimeTab("timeline")).toBe("timeline");
    expect(normalizeDynamicFlowRuntimeTab("statistics")).toBe("overview");
    expect(normalizeDynamicFlowRuntimeTab(undefined)).toBe("overview");
    expect(readDynamicFlowRuntimeDeepLink("?stepInstanceId=%20&attemptNo=0")).toEqual({
      stepInstanceId: null,
      branchId: null,
      attemptNo: null,
      assignmentId: null,
      reportId: null,
    });
  });

  it("keeps deep-link identity through tab navigation, browser back, and refresh remount", async () => {
    const overview = dynamicFlowRuntimePath("work-1", "instance-1", "overview", {
      stepInstanceId: "step-1",
      branchId: "branch-1",
      attemptNo: 3,
    });
    const timeline = dynamicFlowRuntimePath("work-1", "instance-1", "timeline", {
      stepInstanceId: "step-1",
      branchId: "branch-1",
      attemptNo: 3,
    });
    const router = makeRouter(overview);
    const first = render(<RouterProvider router={router} />);

    expect(screen.getByLabelText("runtime-location")).toHaveTextContent(overview);
    expect(screen.getByLabelText("runtime-identity")).toHaveTextContent(
      '"stepInstanceId":"step-1"',
    );

    await act(async () => {
      await router.navigate(timeline);
    });
    expect(screen.getByLabelText("runtime-location")).toHaveTextContent(timeline);

    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByLabelText("runtime-location")).toHaveTextContent(overview);

    const refreshEntry = `${router.state.location.pathname}${router.state.location.search}`;
    first.unmount();
    const refreshed = makeRouter(refreshEntry);
    render(<RouterProvider router={refreshed} />);
    expect(screen.getByLabelText("runtime-location")).toHaveTextContent(overview);
    expect(screen.getByLabelText("runtime-identity")).toHaveTextContent(
      '"attemptNo":3',
    );
  });
});
