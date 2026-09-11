import { describe, expect, it } from "vitest";

import {
  createStatConfigEnvelope,
  isNonEmptyStatisticProfile,
  isStatisticsConfigurationTab,
  resolveStatConfigSurfaceState,
  statisticsConfigurationPath,
} from "../../src/pages/works/statistics/statisticsConfigurationModel";

describe("P8 statistics configuration model", () => {
  it("builds only the frozen canonical configuration route", () => {
    expect(statisticsConfigurationPath("work/1", "scope 1", "advanced")).toBe(
      "/works/work%2F1/statistics/scope%201/config/advanced",
    );
    expect(isStatisticsConfigurationTab("readiness")).toBe(true);
    expect(isStatisticsConfigurationTab("results")).toBe(false);
    expect(isStatisticsConfigurationTab("reconciliation")).toBe(false);
  });

  it.each([
    ["LOADING", { loading: true }],
    ["EMPTY", { empty: true }],
    ["ERROR", { errorStatus: 500 }],
    ["FORBIDDEN", { errorStatus: 403 }],
    ["READONLY", { canManageDraft: false }],
    ["LOCKED", { locked: true, canManageDraft: false }],
    ["STALE_CONFLICT", { staleConflict: true }],
    ["SUCCESS", { success: true }],
    ["RETRYING", { retrying: true }],
    ["UNSUPPORTED", { unsupported: true }],
  ] as const)("resolves the %s surface", (expected, input) => {
    expect(resolveStatConfigSurfaceState(input)).toBe(expected);
  });

  it("creates the exact CAS mutation envelope", () => {
    const envelope = createStatConfigEnvelope(
      "basic-put",
      { revision: 17, configHash: "a".repeat(64) },
      { targets: [] },
    );

    expect(envelope.commandId).toMatch(/^p8-ui-basic-put-/);
    expect(envelope.expectedRevision).toBe(17);
    expect(envelope.expectedConfigHash).toBe("a".repeat(64));
    expect(envelope.payload).toEqual({ targets: [] });
  });

  it("matches the backend empty statisticProfile normalization", () => {
    expect(isNonEmptyStatisticProfile({})).toBe(false);
    expect(isNonEmptyStatisticProfile({ diffMode: "NONE" })).toBe(false);
    expect(isNonEmptyStatisticProfile({ diffMode: "  " })).toBe(false);
    expect(isNonEmptyStatisticProfile({ diffMode: "DELTA" })).toBe(true);
    expect(isNonEmptyStatisticProfile({ fields: ["x"] })).toBe(true);
  });
});
