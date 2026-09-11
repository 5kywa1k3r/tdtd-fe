import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.resolve(process.cwd(), "src/components/works/review/WorkReviewTab.tsx"),
  "utf8",
);

function getActionButtonSource(testId: string) {
  const markerIndex = source.indexOf(`data-testid="${testId}"`);
  expect(markerIndex, `missing ${testId}`).toBeGreaterThanOrEqual(0);
  const start = source.lastIndexOf("<IconButton", markerIndex);
  const end = source.indexOf("</IconButton>", markerIndex);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(markerIndex);
  return source.slice(start, end);
}

describe("WorkReviewTab automation selectors", () => {
  it.each([
    ["review-report-approve-button", "handleApprove(row)"],
    ["review-report-return-button", 'openActionDialog("return", row)'],
    ["review-report-recall-approved-button", 'openActionDialog("recallApproved", row)'],
    ["review-report-deactivate-button", 'openActionDialog("deactivate", row)'],
    ["review-report-reactivate-button", 'openActionDialog("reactivate", row)'],
  ])("binds %s to a report-scoped accessible action", (testId, handler) => {
    const buttonSource = getActionButtonSource(testId);
    expect(buttonSource).toContain("aria-label=");
    expect(buttonSource).toContain("data-report-id={row.reportId || undefined}");
    expect(buttonSource).toContain(handler);
  });
});
