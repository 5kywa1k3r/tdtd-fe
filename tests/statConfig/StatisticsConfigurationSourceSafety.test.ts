import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("P8 configuration source boundaries", () => {
  it("registers one canonical statistics config route", () => {
    const routes = readSource("../../src/routes/appRoutes.tsx");
    const matches = routes.match(/:workId\/statistics\/:scopeAssignmentId\/config\/:tab\?/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(routes).toContain("StatisticsConfigurationPage");
  });

  it("binds EXCLUDE/INCLUDE to the lock command and removes statisticProfile editing", () => {
    const workspace = readSource(
      "../../src/pages/dynamicFlows/DynamicFlowVersionWorkspacePage.tsx",
    );

    expect(workspace).toContain('useState<P8FlowContributionPolicy>("EXCLUDE")');
    expect(workspace).toContain("contributionPolicy,");
    expect(workspace).toContain("acknowledgeContributionWarning:");
    expect(workspace).toContain("DYNAMIC_FLOW_STATISTIC_CONTRIBUTION_INCLUDE_WARNING");
    expect(workspace).toContain("FLOW_STATISTIC_PROFILE_DISABLED");
    expect(workspace).not.toContain('editorId="statistic-profile"');
  });

  it("never imports the result-bearing legacy aggregation owners", () => {
    const page = readSource(
      "../../src/pages/works/statistics/StatisticsConfigurationPage.tsx",
    );
    const panels = readSource(
      "../../src/pages/works/statistics/StatisticsConfigurationPanels.tsx",
    );
    const combined = `${page}\n${panels}`;

    expect(combined).not.toMatch(/WorkAggregationTab|BasicSummaryPanel|StatisticDiffPanel/);
    expect(combined).not.toMatch(/use.*(?:Run|Export|Reconcile|Preview|Hierarchy|Materialize|Rebuild).*Hook/);
  });
});
