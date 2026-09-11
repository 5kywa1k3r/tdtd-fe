import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import type { StatRunJob } from "../../src/api/statRunApi";
import { CanonicalResultPanel } from "../../src/pages/works/statisticsRun/StatRunResultPanels";
import { StatRunStateView } from "../../src/pages/works/statisticsRun/StatRunStateView";
import {
  canTriggerDirectReconciliation,
  canonicalDirectReconciliationIdentity,
  directReconciliationWorkspacePath,
  canonicalDrilldownRows,
  canonicalRows,
  resultKindForJob,
  serverTotals,
  stateFromError,
  stateFromJob,
  stateFromResult,
  statRunJobPath,
  statRunResultPath,
} from "../../src/pages/works/statisticsRun/statRunUiModel";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const fieldDeclaration = (page: string, label: string) =>
  page.split(/\r?\n/).find((line) => line.includes(`label="${label}"`)) ?? "";

function job(status: string, freshnessState = "CURRENT", generationId: string | null = null): StatRunJob {
  return {
    jobId: "job-1", runId: "run-1", receiptId: "receipt-1", commandId: "command-1",
    capabilityId: "DIRECT_FIELD_TABLE_LABEL", runKind: "DIRECT", status,
    stateRevision: 1, stateHash: "a".repeat(64), isReplay: false,
    workId: "work-1", scopeType: "ASSIGNMENT", scopeId: "scope-1",
    sourceReportId: "report-1", sourceRevision: 2, sourceHash: "b".repeat(64), lifecycleRevision: 3,
    dynamicFormTemplateId: "form-1", configId: "config-1", configVersionId: "version-1",
    configVersionNo: 1, configRevision: 2, configHash: "c".repeat(64),
    catalogVersion: "1.6", catalogRawSha256: "d".repeat(64), catalogSemanticSha256: "e".repeat(64),
    schemaRawSha256: "f".repeat(64), schemaSemanticSha256: "1".repeat(64),
    stageLockSha256: "2".repeat(64), candidateChainId: "p9_chain",
    periodKey: "2026", periodInstanceKey: "2026", periodKind: "YEAR",
    retryCount: 0, generationId, generationHash: generationId ? "3".repeat(64) : null,
    freshnessState, createdAtUtc: "2026-08-05T00:00:00Z", updatedAtUtc: "2026-08-05T00:00:00Z",
  };
}

describe("P9-UI exact state cases", () => {
  it("P9-UI-STATE-01 announces loading without stale content", () => {
    render(<StatRunStateView state="LOADING" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Đang tải")).toBeInTheDocument();
  });

  it("P9-UI-STATE-02 preserves authoritative ready for a zero-row result", () => {
    expect(stateFromResult({ metadata: { state: "READY" }, totalRows: 0, rows: [] })).toBe("READY");
  });

  it("P9-UI-STATE-02A preserves authoritative ready for a page outside the result range", () => {
    expect(stateFromResult({ metadata: { state: "READY" }, totalRows: 12, rows: [] })).toBe("READY");
  });

  it("P9-UI-STATE-02B distinguishes authoritative empty", () => {
    expect(stateFromResult({ metadata: { state: "EMPTY" }, totalRows: 0, rows: [] })).toBe("EMPTY");
  });

  it("P9-UI-STATE-03 maps queued from the server status", () => {
    expect(stateFromJob(job("QUEUED"))).toBe("QUEUED");
  });

  it("P9-UI-STATE-04 maps running/building from the server status", () => {
    expect(stateFromJob(job("RUNNING"))).toBe("RUNNING");
    expect(stateFromResult({ status: "BUILDING" })).toBe("RUNNING");
  });

  it("P9-UI-STATE-05 maps retry wait without a client timer decision", () => {
    expect(stateFromJob(job("RETRY_WAIT"))).toBe("RETRYING");
  });

  it("P9-UI-STATE-06 presents done only with a canonical generation", () => {
    expect(stateFromJob(job("COMPLETED", "CURRENT", "generation-1"))).toBe("READY");
    expect(stateFromJob(job("COMPLETED"))).toBe("EMPTY");
  });

  it("P9-UI-STATE-07 keeps failed and cancelled terminal states distinct", () => {
    expect(stateFromJob(job("FAILED"))).toBe("FAILED");
    expect(stateFromJob(job("CANCELLED"))).toBe("CANCELLED");
  });

  it("P9-UI-STATE-08 keeps forbidden separate from generic API errors", () => {
    expect(stateFromError({ status: 403, message: "forbidden" })).toBe("FORBIDDEN");
    expect(stateFromError({ status: 500, message: "failed" })).toBe("ERROR");
  });

  it("P9-UI-STATE-09 blocks stale/dirty data from ready presentation", () => {
    expect(stateFromJob(job("COMPLETED", "DIRTY", "generation-1"))).toBe("STALE");
    expect(stateFromResult({ status: "READY", isDirty: true, rows: [{ value: 1 }] })).toBe("STALE");
  });

  it("P9-UI-STATE-10 covers conflict, source-gone and unsupported", () => {
    expect(stateFromError({ status: 409, errorCode: "STAT_RUN_CONFIG_STALE", message: "conflict" })).toBe("CONFLICT");
    expect(stateFromError({ status: 404, message: "gone" })).toBe("SOURCE_GONE");
    expect(stateFromError({ status: 400, errorCode: "STAT_RUN_ROUTE_NOT_PROVEN", message: "blocked" })).toBe("UNSUPPORTED");
  });
});

describe("P9-UI exact actor and ownership cases", () => {
  it("P9-UI-ACTOR-01 preserves the single P8 config owner and adds sibling P9 routes", () => {
    const routes = source("../../src/routes/appRoutes.tsx");
    expect(routes.match(/:workId\/statistics\/:scopeAssignmentId\/config\/:tab\?/g)).toHaveLength(1);
    expect(routes).toContain(":workId/statistics/:scopeAssignmentId/runs");
    expect(routes).toContain(":workId/statistics/:scopeAssignmentId/runs/:runId");
    expect(routes).toContain(":workId/statistics/:scopeAssignmentId/results/:resultKind/:resultId");
  });

  it("P9-UI-ACTOR-02 uses only authorized stat-run and canonical result endpoints", () => {
    const api = source("../../src/api/statRunApi.ts");
    expect(api).toContain("stat-runs/${encodeURIComponent(capabilityId)}/jobs");
    expect(api).toContain("stat-runs/jobs/${encodeURIComponent(jobId)}");
    expect(api).toContain("work-report-statistic-diffs/assignments/");
    expect(api).toContain("includeDrilldown: true");
    expect(api).not.toContain("FLOW_ACTIVE_BRANCH");
    expect(api).toContain("query.advancedConfigId || query.resultId");
  });

  it("P9-UI-ACTOR-02A preserves nullable report period bounds and keeps every other pin required", () => {
    const page = source("../../src/pages/works/statisticsRun/StatisticsRunPages.tsx");
    expect(page).toContain('periodStart: form.periodStart.trim() || null');
    expect(page).toContain('periodEnd: form.periodEnd.trim() || null');

    const optionalPeriodBounds = ["Period start UTC", "Period end UTC"];
    for (const label of optionalPeriodBounds) {
      const field = fieldDeclaration(page, label);
      expect(field).toContain(`<TextField label="${label}"`);
      expect(field).not.toMatch(/\brequired\b/);
    }

    const requiredPins = [
      "Source report ID",
      "Dynamic Form template ID",
      "Config revision",
      "Config SHA-256",
      "Source revision",
      "Source SHA-256",
      "Lifecycle revision",
      "Period kind",
      "Period key",
      "Period instance key",
    ];
    for (const label of requiredPins) {
      expect(fieldDeclaration(page, label)).toMatch(/<TextField\s+required\b/);
    }
  });

  it("P9-UI-ACTOR-03 relies on the shared authenticated API client for every request", () => {
    const api = source("../../src/api/statRunApi.ts");
    expect(api).toContain('import { api } from "./base/axios"');
    expect(api).not.toMatch(/axios\.create|localStorage|sessionStorage/);
  });

  it("P9-UI-ACTOR-04 does not expose privileged job mutation calls on business routes", () => {
    const api = source("../../src/api/statRunApi.ts");
    expect(api).not.toMatch(/operations\/jobs.*(retry|reset|cancel|requeue)/s);
  });

  it("P9-UI-ACTOR-05 displays totals supplied by the server and never page-row totals", () => {
    const result = { totalRows: 99, totalSum: 125, rows: [{ totalRows: 1 }, { totalRows: 1 }] };
    expect(serverTotals(result)).toEqual([["totalRows", 99], ["totalSum", 125]]);
    expect(canonicalRows(result)).toHaveLength(2);
  });

  it("P9-UI-ACTOR-06 requests and downloads server artifacts without spreadsheet libraries", () => {
    const api = source("../../src/api/statRunApi.ts");
    const panel = source("../../src/pages/works/statisticsRun/StatRunResultPanels.tsx");
    expect(api).toContain('api.post<StatRunExport>("stat-runs/exports", request)');
    expect(panel).not.toMatch(/exceljs|file-saver|Workbook|csv-stringify/i);
  });

  it("P9-UI-ACTOR-07 keeps deep-link identity encoded and capability mapping deterministic", () => {
    expect(statRunJobPath("work/a", "scope b", "job#1")).toBe("/works/work%2Fa/statistics/scope%20b/runs/job%231");
    expect(statRunResultPath("w", "s", "DIFF", "r")).toBe("/works/w/statistics/s/results/DIFF/r");
    expect(resultKindForJob({ ...job("DONE", "CURRENT", "g"), capabilityId: "FLOW_SCOPES" })).toBe("FLOW");
  });

  it("P11-UI-RECON-01 exposes reconciliation only for ready DIRECT results with exact identity", () => {
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
    expect(canTriggerDirectReconciliation("DIRECT_TABLE", "READY", identity)).toBe(true);
    expect(canTriggerDirectReconciliation("DIRECT_LABEL", "READY", identity)).toBe(true);
    expect(canTriggerDirectReconciliation("BASIC", "READY", identity)).toBe(false);
    expect(canTriggerDirectReconciliation("DIRECT_FIELD", "STALE", identity)).toBe(false);
    expect(canTriggerDirectReconciliation("DIRECT_FIELD", "READY", {
      ...identity,
      p9RunId: "not-an-object-id",
    })).toBe(false);
    expect(canTriggerDirectReconciliation("DIRECT_FIELD", "READY", null)).toBe(false);
  });

  it("P11-UI-RECON-02 accepts only the exact server publication identity", () => {
    const generationId = "8".repeat(64);
    const generationHash = "9".repeat(64);
    const canonical = {
      status: "READY",
      rows: [{ fieldKey: "amount", periodInstanceKey: "MONTH:2026-08" }],
      metadata: {
        state: "READY",
        publications: [{
          runId: "507f1f77bcf86cd799439011",
          generationId,
          generationHash,
        }],
        reconciliationIdentity: {
          p9RunId: "507f1f77bcf86cd799439011",
          p9ResultId: "507f1f77bcf86cd799439011",
          generationId,
          generationHash,
          conceptKey: "amount",
          periodKey: "2026-08",
          grain: "MONTH",
        },
      },
    };
    expect(canonicalDirectReconciliationIdentity(canonical, generationId))
      .toEqual(canonical.metadata.reconciliationIdentity);
    expect(canonicalDirectReconciliationIdentity({
      ...canonical,
      metadata: {
        ...canonical.metadata,
        reconciliationIdentity: {
          ...canonical.metadata.reconciliationIdentity,
          p9RunId: "507f1f77bcf86cd799439012",
        },
      },
    }, generationId)).toBeNull();
    expect(canonicalDirectReconciliationIdentity(canonical, "a".repeat(64))).toBeNull();
  });

  it("P11-UI-RECON-03 routes to the reconciliation owner without importing its mutation API", () => {
    const generationId = "8".repeat(64);
    const identity = {
      p9RunId: "507f1f77bcf86cd799439011",
      p9ResultId: "507f1f77bcf86cd799439011",
      generationId,
      generationHash: "9".repeat(64),
      conceptKey: "field-amount",
      periodKey: "2026-08",
      grain: "MONTH",
    };
    const href = directReconciliationWorkspacePath(
      "work-01",
      "scope-01",
      "DIRECT_FIELD",
      identity,
      {
        periodInstanceKey: "MONTH:2026-08",
        fieldId: "field-01",
        fieldKey: "amount",
        bucketKey: null,
        periodKey: "2026-08",
      },
      "507f1f77bcf86cd799439099",
    );
    expect(href).not.toBeNull();
    const url = new URL(href!, "http://localhost");
    expect(url.pathname).toBe(
      "/works/work-01/statistics/scope-01/reconciliations",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      p9ResultKind: "DIRECT",
      p9ResultId: identity.p9ResultId,
      p9RunId: identity.p9RunId,
      conceptKey: identity.conceptKey,
      grain: identity.grain,
      periodInstanceKey: "MONTH:2026-08",
      fieldId: "field-01",
      fieldKey: "amount",
      periodKey: "2026-08",
      exportId: "507f1f77bcf86cd799439099",
    });
    expect(url.searchParams.has("capturePlanToken")).toBe(false);
    expect(url.searchParams.has("actualCapturePlan")).toBe(false);

    const pages = source("../../src/pages/works/statisticsRun/StatisticsRunPages.tsx");
    expect(pages).not.toContain("api/reconciliationApi");
    expect(pages).not.toContain("createDirectReconciliation");
    expect(pages).not.toContain("preflightDirectReconciliationCapturePlan");
    expect(pages).toContain("directReconciliationWorkspacePath");
    expect(pages).toContain("component={RouterLink}");
    expect(pages).toContain("Mở workspace đối soát");
  });
});

describe("P9-UI exact accessibility cases", () => {
  it("P9-UI-A11Y-01 uses polite status and assertive error announcements", () => {
    const view = render(<StatRunStateView state="QUEUED" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    view.rerender(<StatRunStateView state="FAILED" />);
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });

  it("P9-UI-A11Y-02 renders a semantic table with scoped headers", () => {
    render(<CanonicalResultPanel result={{ totalRows: 1, rows: [{ code: "A", value: 1 }] }} page={0} pageSize={50} onPageChange={vi.fn()} />);
    expect(screen.getByRole("table", { name: /canonical/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "code" })).toHaveAttribute("scope", "col");
  });

  it("P9-UI-A11Y-03 opens keyboard-focusable typed detail dialog", () => {
    const result = {
      totalRows: 1,
      rows: [{ state: "READY", value: 1 }],
      drilldownRows: [{
        stableIdentity: "field:source:bucket",
        workAssignmentReportId: "report-1",
        valueState: "NUMBER",
        numericValue: 12.5,
        redacted: false,
      }],
    };
    expect(canonicalDrilldownRows(result)).toHaveLength(1);
    render(<CanonicalResultPanel result={result} page={0} pageSize={50} onPageChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết hàng 1" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName(/typed\/redacted/);
    expect(screen.getByText("report-1")).toBeInTheDocument();
    expect(screen.getByText("12,5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đóng" })).toBeInTheDocument();
  });

  it("P11-STAT-05 exposes exact server paging metadata for DOM/API parity", () => {
    const view = render(<CanonicalResultPanel
      result={{ totalRows: 120, returnedRows: 50, rows: [{ code: "A" }] }}
      page={1} pageSize={50} onPageChange={vi.fn()} />);
    const paging = view.container.querySelector('[data-stat-run-paging]');
    expect(paging).toHaveAttribute("data-page", "1");
    expect(paging).toHaveAttribute("data-total-rows", "120");
    expect(paging).toHaveAttribute("data-returned-rows", "50");
    expect(paging).toHaveAttribute("data-has-previous", "true");
    expect(paging).toHaveAttribute("data-has-next", "true");
  });

  it("P9-UI-A11Y-04 freezes responsive one-column/mobile and multi-column/desktop layouts", () => {
    const page = source("../../src/pages/works/statisticsRun/StatisticsRunPages.tsx");
    expect(page).toContain('gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }');
    expect(page).toContain('direction={{ xs: "column", sm: "row" }}');
  });

  it("P9-UI-A11Y-05 labels navigation, forms, paging, dialogs and recovery controls", () => {
    const pages = source("../../src/pages/works/statisticsRun/StatisticsRunPages.tsx");
    const panels = source("../../src/pages/works/statisticsRun/StatRunResultPanels.tsx");
    expect(pages).toContain('aria-label="Điều hướng thống kê"');
    expect(pages).toContain('aria-labelledby="run-form-title"');
    expect(panels).toContain('aria-label="Kết quả thống kê canonical từ máy chủ"');
    expect(panels).toContain("autoFocus");
  });
});
