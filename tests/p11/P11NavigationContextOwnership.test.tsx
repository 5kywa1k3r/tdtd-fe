import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryRouter,
  matchRoutes,
  MemoryRouter,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { describe, expect, it } from "vitest";

import DomainContextStrip from "../../src/components/navigation/DomainContextStrip";
import { appRoutes } from "../../src/routes/appRoutes";
import {
  DYNAMIC_FORM_LIST_PATH,
  dynamicFormPath,
  LegacyDynamicFormsRedirect,
} from "../../src/routes/dynamicFormRoutes";
import {
  dynamicFlowRuntimePath,
  dynamicFlowVersionPath,
} from "../../src/routes/dynamicFlowRoutes";
import { ReconciliationStateView } from "../../src/pages/works/reconciliation/ReconciliationPages";
import { canTriggerDirectReconciliation } from "../../src/pages/works/statisticsRun/statRunUiModel";

function route(path: string) {
  return matchRoutes(appRoutes, path);
}

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current-location">{location.pathname}{location.search}{location.hash}</output>;
}

function renderContext(label: string, items: Array<{ label: string; value: string }>) {
  render(
    <MemoryRouter>
      <DomainContextStrip
        ariaLabel={`Ngữ cảnh ${label}`}
        breadcrumbs={[
          { label: "Công việc", to: "/works/work-01" },
          { label },
        ]}
        items={items}
      />
    </MemoryRouter>,
  );
}

describe("P11-NAV canonical route ownership", () => {
  it("P11-ROUTE-01 mounts one canonical Form route and encodes exact identity", () => {
    const matches = route("/design/forms/form%20version/edit");
    expect(DYNAMIC_FORM_LIST_PATH).toBe("/design/forms");
    expect(dynamicFormPath("form version", "edit")).toBe("/design/forms/form%20version/edit");
    expect(matches?.at(-1)?.route.path).toBe(":id/edit");
    expect(matches?.at(-1)?.params.id).toBe("form version");
  });

  it("P11-ROUTE-02 preserves exact Flow family/version/tab identity", () => {
    const path = dynamicFlowVersionPath("family / 1", "version / 2", "mapping-metadata");
    expect(path).toBe("/design/flows/family%20%2F%201/versions/version%20%2F%202/mapping-metadata");
    expect(route(path)?.at(-1)?.params).toMatchObject({
      familyId: "family / 1",
      versionId: "version / 2",
      tab: "mapping-metadata",
    });
  });

  it("P11-ROUTE-03 preserves runtime work/instance/assignment/report deep-link identity", () => {
    const path = dynamicFlowRuntimePath("work-01", "instance-01", "work-to-do", {
      stepInstanceId: "step-01",
      branchId: "branch-01",
      attemptNo: 2,
      assignmentId: "assignment-01",
      reportId: "report-01",
    });
    expect(route(path)?.at(-1)?.params).toMatchObject({
      workId: "work-01",
      instanceId: "instance-01",
      tab: "work-to-do",
    });
    expect(path).toContain("assignmentId=assignment-01");
    expect(path).toContain("reportId=report-01");
  });

  it("P11-ROUTE-04 matches Statistics config, run, and result owners", () => {
    expect(route("/works/work-01/statistics/scope-01/config/readiness")?.at(-1)?.route.path)
      .toBe(":workId/statistics/:scopeAssignmentId/config/:tab?");
    expect(route("/works/work-01/statistics/scope-01/runs/run-01")?.at(-1)?.route.path)
      .toBe(":workId/statistics/:scopeAssignmentId/runs/:runId");
    expect(route("/works/work-01/statistics/scope-01/results/DIRECT_FIELD/result-01")?.at(-1)?.route.path)
      .toBe(":workId/statistics/:scopeAssignmentId/results/:resultKind/:resultId");
  });

  it("P11-ROUTE-05 matches Reconciliation list/detail owners without a competing route", () => {
    expect(route("/works/work-01/statistics/scope-01/reconciliations")?.at(-1)?.route.path)
      .toBe(":workId/statistics/:scopeAssignmentId/reconciliations");
    expect(route("/works/work-01/statistics/scope-01/reconciliations/rec-01")?.at(-1)?.route.path)
      .toBe(":workId/statistics/:scopeAssignmentId/reconciliations/:reconciliationId");
  });

  it("P11-ROUTE-06 redirects legacy Form deep links once and preserves suffix/query/hash", async () => {
    const router = createMemoryRouter([
      { path: "/dynamic-forms/*", element: <LegacyDynamicFormsRedirect /> },
      { path: "/design/forms/*", element: <LocationProbe /> },
    ], { initialEntries: ["/dynamic-forms/form%201/edit?tab=stats#field-2"] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.pathname).toBe("/design/forms/form%201/edit"));
    expect(screen.getByLabelText("current-location")).toHaveTextContent(
      "/design/forms/form%201/edit?tab=stats#field-2",
    );
  });
});

describe("P11-NAV cross-domain context continuity", () => {
  it("P11-CONTEXT-01 renders Form family/version/status/permission with canonical breadcrumb", () => {
    renderContext("Biểu mẫu", [
      { label: "Họ", value: "family-01" },
      { label: "Phiên bản", value: "v2" },
      { label: "Trạng thái", value: "Đã công bố" },
      { label: "Quyền", value: "Chỉ đọc" },
    ]);
    expect(screen.getByLabelText("Ngữ cảnh Biểu mẫu")).toHaveTextContent("Họ: family-01");
    expect(source("src/pages/dynamicForms/DynamicFormViewPage.tsx")).toContain("Ngữ cảnh biểu mẫu");
  });

  it("P11-CONTEXT-02 renders Flow family/version/status/permission continuity", () => {
    renderContext("Quy trình", [
      { label: "Family", value: "flow-family" },
      { label: "Phiên bản", value: "flow-v3" },
      { label: "Trạng thái", value: "LOCKED" },
      { label: "Quyền", value: "Có thể quản lý" },
    ]);
    expect(screen.getByLabelText("Ngữ cảnh Quy trình")).toHaveTextContent("Trạng thái: LOCKED");
    expect(source("src/pages/dynamicFlows/DynamicFlowVersionWorkspacePage.tsx")).toContain("Ngữ cảnh quy trình");
  });

  it("P11-CONTEXT-03 renders runtime work/instance/period/capability continuity", () => {
    renderContext("Flow runtime", [
      { label: "Work", value: "work-01" },
      { label: "Instance", value: "instance-01" },
      { label: "Kỳ", value: "2026" },
      { label: "Quyền", value: "Chỉ đọc" },
    ]);
    expect(screen.getByLabelText("Ngữ cảnh Flow runtime")).toHaveTextContent("Instance: instance-01");
    expect(source("src/pages/works/flowRuntime/DynamicFlowRuntimePage.tsx")).toContain("Ngữ cảnh Flow runtime");
  });

  it("P11-CONTEXT-04 renders Statistics work/scope/config permission continuity", () => {
    renderContext("Thống kê", [
      { label: "Work", value: "work-01" },
      { label: "Scope assignment", value: "scope-01" },
      { label: "Trạng thái", value: "Đã xác thực phạm vi" },
      { label: "Quyền", value: "Theo permission response" },
    ]);
    expect(screen.getByLabelText("Ngữ cảnh Thống kê")).toHaveTextContent("Scope assignment: scope-01");
    expect(source("src/pages/works/statistics/StatisticsConfigurationPage.tsx")).toContain("Ngữ cảnh cấu hình thống kê");
  });

  it("P11-CONTEXT-05 renders run/result identity and downstream Reconciliation navigation", () => {
    renderContext("Kết quả", [
      { label: "Work", value: "work-01" },
      { label: "Scope assignment", value: "scope-01" },
      { label: "Bề mặt", value: "Kết quả DIRECT_FIELD" },
      { label: "Quyền", value: "Dữ liệu và CTA do máy chủ quyết định" },
    ]);
    const runSource = source("src/pages/works/statisticsRun/StatisticsRunPages.tsx");
    expect(screen.getByLabelText("Ngữ cảnh Kết quả")).toHaveTextContent("Bề mặt: Kết quả DIRECT_FIELD");
    expect(runSource).toContain("Ngữ cảnh thống kê");
    expect(runSource).toContain("reconciliations");
  });

  it("P11-CONTEXT-06 renders Reconciliation/generation/review and navigable Evidence continuity", () => {
    renderContext("Đối soát và bằng chứng", [
      { label: "Reconciliation", value: "rec-01" },
      { label: "Generation", value: "7" },
      { label: "Trạng thái", value: "COMPLETED" },
      { label: "Quyền", value: "Có thể review" },
    ]);
    const reconciliationSource = source("src/pages/works/reconciliation/ReconciliationPages.tsx");
    expect(screen.getByLabelText("Ngữ cảnh Đối soát và bằng chứng")).toHaveTextContent("Generation: 7");
    expect(reconciliationSource).toContain("Mở bằng chứng được máy chủ cấp");
    expect(reconciliationSource).toContain("Mở nguồn được máy chủ cấp");
  });
});

describe("P11-NAV canonical owner and permission gates", () => {
  it("P11-OWNER-01 keeps one Form mutation owner and makes the legacy route redirect-only", () => {
    expect(route("/design/forms/form-01/edit")?.at(-1)?.route.path).toBe(":id/edit");
    expect(route("/dynamic-forms/form-01/edit")?.at(-1)?.route.path).toBe("dynamic-forms/*");
    const routesSource = source("src/routes/appRoutes.tsx");
    expect(routesSource.match(/path: "design\/forms"/g)).toHaveLength(1);
    expect(routesSource.match(/path: "dynamic-forms\/\*"/g)).toHaveLength(1);
  });

  it("P11-OWNER-02 exposes the Reconciliation CTA only for exact server-ready DIRECT identity", () => {
    const generationId = "6".repeat(64);
    const identity = {
      p9RunId: "507f1f77bcf86cd799439011",
      p9ResultId: "507f1f77bcf86cd799439011",
      generationId,
      generationHash: "7".repeat(64),
      conceptKey: "form-identity",
      periodKey: "2026",
      grain: "YEAR",
    };
    expect(canTriggerDirectReconciliation("DIRECT_FIELD", "READY", identity)).toBe(true);
    expect(canTriggerDirectReconciliation("DIRECT_FIELD", "FORBIDDEN", identity)).toBe(false);
    expect(canTriggerDirectReconciliation("BASIC", "READY", identity)).toBe(false);
    expect(canTriggerDirectReconciliation("DIRECT_FIELD", "READY", { ...identity, p9RunId: "client-id" })).toBe(false);
    expect(canTriggerDirectReconciliation("DIRECT_FIELD", "READY", null)).toBe(false);
  });

  it("P11-OWNER-03 keeps forbidden route state non-disclosing", () => {
    render(<ReconciliationStateView state="FORBIDDEN" />);
    expect(screen.getByRole("status")).toHaveTextContent("không có quyền");
    expect(screen.getByRole("status")).not.toHaveTextContent("work-01");
    expect(screen.getByRole("status")).not.toHaveTextContent("rec-01");
  });

  it("P11-OWNER-04 proves no internal legacy Form mutation link or orphan phase CTA remains", () => {
    const files = [
      "src/layouts/Sidebar.tsx",
      "src/pages/dynamicForms/DynamicFormListPage.tsx",
      "src/pages/dynamicForms/DynamicFormCreatePage.tsx",
      "src/pages/dynamicForms/DynamicFormViewPage.tsx",
      "src/pages/dynamicForms/DynamicFormEditPage.tsx",
      "src/pages/excel/DynamicExcelListPage.tsx",
      "src/pages/works/statistics/StatisticsConfigurationPanels.tsx",
    ];
    const combined = files.map(source).join("\n");
    expect(combined).not.toContain("/dynamic-forms");
    expect(source("src/pages/dynamicFlows/DynamicFlowVersionWorkspacePage.tsx"))
      .not.toMatch(/workspace P4|bị khóa đến P7|bị khóa đến P8/);
    expect(source("src/components/works/assignments/WorkAssignTab.tsx"))
      .not.toMatch(/bị khóa đến P7|bị khóa đến P8/);
  });
});
