import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { getStatRunJob, type StatRunJob } from "../../src/api/statRunApi";
import { StatisticsRunDetailPage } from "../../src/pages/works/statisticsRun/StatisticsRunPages";

vi.mock("../../src/api/statRunApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api/statRunApi")>();
  return { ...actual, getStatRunJob: vi.fn() };
});

function readyJob(generationId: string): StatRunJob {
  return {
    jobId: "job-01",
    runId: "run-01",
    receiptId: "receipt-01",
    commandId: "command-01",
    capabilityId: "DIRECT_FIELD_TABLE_LABEL",
    runKind: "FOUNDATION_ONLY",
    status: "DONE",
    stateRevision: 3,
    stateHash: "a".repeat(64),
    isReplay: false,
    workId: "work-01",
    scopeType: "ASSIGNMENT",
    scopeId: "scope-01",
    sourceReportId: "report-01",
    sourceRevision: 7,
    sourceHash: "b".repeat(64),
    lifecycleRevision: 4,
    dynamicFormTemplateId: "form-01",
    configId: "config-01",
    configVersionId: "config-version-01",
    configVersionNo: 2,
    configRevision: 2,
    configHash: "c".repeat(64),
    catalogVersion: "1.6",
    catalogRawSha256: "d".repeat(64),
    catalogSemanticSha256: "e".repeat(64),
    schemaRawSha256: "f".repeat(64),
    schemaSemanticSha256: "1".repeat(64),
    stageLockSha256: "2".repeat(64),
    candidateChainId: "p9_chain_01",
    periodKey: "2026-08-P11-03",
    periodInstanceKey: "2026-08-P11-03",
    periodKind: "SCHEDULED",
    retryCount: 0,
    startedAtUtc: "2026-09-02T07:51:19Z",
    computedAtUtc: "2026-09-02T07:51:20Z",
    completedAtUtc: "2026-09-02T07:51:20Z",
    generationId,
    generationHash: "3".repeat(64),
    projectionRunId: "507f1f77bccd799439799439011",
    freshnessState: "FRESH",
    createdAtUtc: "2026-09-02T07:51:18Z",
    updatedAtUtc: "2026-09-02T07:51:20Z",
  };
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current-location">{location.pathname}{location.search}</output>;
}

describe("P11 statistics result navigation control", () => {
  it("renders the DONE/FRESH result CTA as a link and navigates through that UI control", async () => {
    const generationId = "6".repeat(64);
    vi.mocked(getStatRunJob).mockResolvedValue(readyJob(generationId));

    const router = createMemoryRouter([
      {
        path: "/works/:workId/statistics/:scopeAssignmentId/runs/:runId",
        element: <StatisticsRunDetailPage />,
      },
      {
        path: "/works/:workId/statistics/:scopeAssignmentId/results/:resultKind/:resultId",
        element: <LocationProbe />,
      },
    ], {
      initialEntries: ["/works/work-01/statistics/scope-01/runs/job-01"],
    });
    render(<RouterProvider router={router} />);

    const resultLink = await screen.findByRole("link", { name: "Mở kết quả" });
    expect(screen.queryByRole("button", { name: "Mở kết quả" })).not.toBeInTheDocument();
    expect(resultLink).toHaveAttribute(
      "href",
      expect.stringContaining(`/results/DIRECT_FIELD/${generationId}`),
    );

    const href = new URL(resultLink.getAttribute("href")!, "http://localhost");
    expect(Object.fromEntries(href.searchParams)).toMatchObject({
      dynamicFormTemplateId: "form-01",
      scopeType: "ASSIGNMENT",
      periodKey: "2026-08-P11-03",
      periodInstanceKey: "2026-08-P11-03",
      resultHash: "3".repeat(64),
      configHash: "c".repeat(64),
      sourceHash: "b".repeat(64),
      lifecycleRevision: "4",
    });
    fireEvent.click(resultLink);
    await waitFor(() => expect(router.state.location.pathname).toBe(
      `/works/work-01/statistics/scope-01/results/DIRECT_FIELD/${generationId}`,
    ));
    expect(screen.getByLabelText("current-location")).toHaveTextContent(
      `/works/work-01/statistics/scope-01/results/DIRECT_FIELD/${generationId}`,
    );
  });
});
