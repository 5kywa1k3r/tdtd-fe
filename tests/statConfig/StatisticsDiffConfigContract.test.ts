import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("P8-10 Diff configuration contract", () => {
  const fullSource = fs.readFileSync(
    path.resolve(
      process.cwd(),
      "src/pages/works/statistics/StatisticsConfigurationPanels.tsx",
    ),
    "utf8",
  );

  const modelSource = fs.readFileSync(
    path.resolve(process.cwd(), "src/pages/works/statistics/statisticsConfigurationPanelModel.ts"),
    "utf8",
  );
  const source = [
    modelSource.slice(modelSource.indexOf("function defaultDiffSide")),
    fullSource.slice(fullSource.indexOf("export function DiffConfigPanel")),
  ].join("\\n");
  it("uses only backend-supported period and comparison policy values", () => {
    expect(source).toContain('mode: "EXACT"');
    expect(source).toContain('"LEFT_TO_RIGHT", "RIGHT_TO_LEFT"');
    expect(source).toContain('"REJECT", "INCLUDE", "AS_ZERO"');
    expect(source).toContain('"REJECT", "INCLUDE", "AS_MISSING"');

    expect(source).not.toContain("SINGLE_PERIOD");
    expect(source).not.toContain("BIDIRECTIONAL");
    expect(source).not.toContain("KEEP_MISSING");
    expect(source).not.toContain("TREAT_AS_ZERO");
    expect(source).not.toContain("DISTINGUISH_EMPTY");
    expect(source).not.toContain("EMPTY_AS_MISSING");
    expect(source).not.toContain("EMPTY_AS_ZERO");
  });
});
