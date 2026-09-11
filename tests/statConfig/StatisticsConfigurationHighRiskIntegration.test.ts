import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const panels = readFileSync(
  path.resolve(process.cwd(), "src/pages/works/statistics/StatisticsConfigurationPanels.tsx"),
  "utf8",
);
const page = readFileSync(
  path.resolve(process.cwd(), "src/pages/works/statistics/StatisticsConfigurationPage.tsx"),
  "utf8",
);

const section = (start: string, end: string) => {
  const from = panels.indexOf(start);
  const to = panels.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return panels.slice(from, to);
};

describe("P8 high-risk panel integration boundaries", () => {
  it("binds Overview to the canonical Basic EMPTY owner without a false pins claim", () => {
    const overview = section("export function StatisticsOverviewPanel", "export function LabelsAndFormPanel");
    expect(overview).toContain("canonicalBasicOwnerId");
    expect(overview).toMatch(/EMPTY bundle/i);
    expect(overview).not.toMatch(/exact pins/i);
    expect(page).toContain("<StatisticsOverviewPanel route={route}");
  });

  it("uses only pinned form snapshots and permission-aware form links", () => {
    const labels = section("export function LabelsAndFormPanel", "function defaultBasicPayload");
    expect(panels).not.toContain("useSearchLabelsMutation");
    expect(labels).toContain("pinnedLabelLayers");
    expect(labels).toContain("dynamicFormClassificationCodes");
    expect(labels).toContain("useGetDynamicFormQuery");
    expect(labels).toContain("canManageDraft");
    expect(labels).toMatch(/Xem biểu mẫu \(chỉ đọc\)/);
    expect(labels).toMatch(/pinned snapshot/i);
  });

  it("integrates schema-dependent Basic and Advanced controls", () => {
    const basic = section("export function BasicConfigPanel", "function defaultAdvancedPayload");
    const advanced = section("export function AdvancedConfigPanel", "export function DiffConfigPanel");
    expect(basic).toContain("SourceScopeFields");
    expect(basic).toContain("basicPeriodForMode");
    expect(basic).toContain("isBoundedIdentity(draft.periodRule.periodKey, 256)");
    expect(basic).toContain("GROUPING_OPTIONS");
    expect(basic).toContain("operationOptionsForDataType");
    expect(basic).toContain("isVirtualEmpty={data.isVirtualEmpty}");

    expect(advanced).toContain("SourceScopeFields");
    expect(advanced).toContain("advancedTargetForDataType");
    expect(advanced).toContain("TARGET_${index + 1}_FIELD_ID_INVALID");
    expect(advanced).toContain("GROUPING_OPTIONS");
    expect(advanced).toContain("availableOrderingFieldIds");
    expect(advanced).toContain("syncOrderingAfterTargetRename");
    expect(advanced).toContain("ORDERING_DIRECTIONS");
    expect(advanced).toContain("allowNextFromArchived");
  });

  it("hydrates, synchronizes and validates Diff before mutation", () => {
    const diff = section("export function DiffConfigPanel", "export function ReadinessPanel");
    expect(diff).toContain("hydrateDiffPayload");
    expect(diff).toContain("setDiffSharedSelector");
    expect(diff).toContain("setDiffSharedPeriodMode");
    expect(diff).toContain("setDiffSharedSourceScope");
    expect(diff).toContain("diffDraftValidationIssues");
    expect(diff).toContain('contract="DIFF"');
    expect(diff).toContain("saveDisabled=");
    expect(diff).toContain("isVirtualEmpty={data.isVirtualEmpty}");
  });

  it("gates readiness to persisted SYSTEM_ADMIN state and stops terminal polling", () => {
    const readiness = panels.slice(panels.indexOf("export function ReadinessPanel"));
    expect(readiness).toContain("useGetMeQuery");
    expect(readiness).toContain("Role.SYSTEM_ADMIN");
    expect(readiness).toContain("isDynamicFormVirtualReadback");
    expect(readiness).toContain("isReadinessTerminal");
    expect(readiness).toContain("readinessSurfaceState");
    expect(readiness).toContain("statusQuery.currentData?.jobId === jobId");
    expect(readiness).toContain("setJobId(\"\")");
    expect(readiness).toMatch(/pollingInterval:.*terminal/s);
  });

  it("gates lock, next and archive by persisted exact status", () => {
    const actions = section("function ConfigActions", "function VersionStrip");
    expect(actions).toContain("isVirtualEmpty");
    expect(actions).toContain("allowNextFromArchived");
    expect(actions).toContain("(!dirty && !isVirtualEmpty)");
    expect(actions).toMatch(/status === "LOCKED"/);
    expect(actions).toMatch(/status === "ARCHIVED"/);
  });
});
