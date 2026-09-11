import { matchRoutes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { appRoutes } from "../../src/routes/appRoutes";
import {
  dynamicFlowRuntimePath,
  normalizeDynamicFlowRuntimeTab,
  readDynamicFlowRuntimeDeepLink,
} from "../../src/routes/dynamicFlowRoutes";

describe("P7 mapping and policy canonical route ownership", () => {
  it("keeps definition authoring on the existing mapping-metadata workspace tab", () => {
    const matches = matchRoutes(
      appRoutes,
      "/design/flows/family-1/versions/version-3/mapping-metadata",
    );

    expect(matches?.at(-1)?.route.path).toBe(
      ":familyId/versions/:versionId/:tab?",
    );
    expect(matches?.at(-1)?.params).toMatchObject({
      familyId: "family-1",
      versionId: "version-3",
      tab: "mapping-metadata",
    });
  });

  it("keeps runtime mapping on work-to-do with the exact canonical report identity", () => {
    const path = dynamicFlowRuntimePath(
      "work-1",
      "flow-instance-1",
      "work-to-do",
      {
        stepInstanceId: "step-instance-2",
        branchId: "branch-main",
        attemptNo: 1,
        assignmentId: "assignment-target",
        reportId: "report-target",
      },
    );
    const matches = matchRoutes(appRoutes, path);

    expect(matches?.at(-1)?.route.path).toBe(
      ":workId/flow-instances/:instanceId/:tab?",
    );
    expect(matches?.at(-1)?.params.tab).toBe("work-to-do");
    expect(readDynamicFlowRuntimeDeepLink(path.split("?")[1])).toEqual({
      stepInstanceId: "step-instance-2",
      branchId: "branch-main",
      attemptNo: 1,
      assignmentId: "assignment-target",
      reportId: "report-target",
    });
  });

  it("does not introduce a second mapping editor or a legacy /steps route", () => {
    const legacyMatches = matchRoutes(
      appRoutes,
      "/works/work-1/flow-instances/flow-instance-1/steps/step-instance-2",
    );
    const secondEditorMatches = matchRoutes(
      appRoutes,
      "/works/work-1/flow-instances/flow-instance-1/mapping/report-target",
    );

    expect(legacyMatches?.at(-1)?.route.path).toBe("*");
    expect(secondEditorMatches?.at(-1)?.route.path).toBe("*");
    expect(
      legacyMatches?.some(({ route }) => route.path?.includes("steps")),
    ).toBe(false);
    expect(
      secondEditorMatches?.some(({ route }) => route.path?.includes("mapping")),
    ).toBe(false);
    expect(normalizeDynamicFlowRuntimeTab("mapping")).toBe("overview");
    expect(normalizeDynamicFlowRuntimeTab("steps")).toBe("overview");
  });
});
