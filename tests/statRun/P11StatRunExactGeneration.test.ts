import { afterEach, describe, expect, it, vi } from "vitest";

const { apiPostMock } = vi.hoisted(() => ({ apiPostMock: vi.fn() }));

vi.mock("../../src/api/base/axios", () => ({
  api: {
    post: apiPostMock,
  },
}));

import {
  getStatRunResult,
  type StatRunResultKind,
  type StatRunResultQuery,
} from "../../src/api/statRunApi";

afterEach(() => {
  apiPostMock.mockReset();
});

describe("P11 exact Direct result generation", () => {
  it.each([
    ["DIRECT_FIELD", "work-report-field-statistics/summary"],
    ["DIRECT_TABLE", "work-report-table-statistics/summary"],
    ["DIRECT_LABEL", "work-report-label-statistics/summary"],
  ] satisfies Array<[StatRunResultKind, string]>)(
    "pins %s reads to the generation carried by the result route",
    async (resultKind, endpoint) => {
      const generationId = "6".repeat(64);
      const query: StatRunResultQuery = {
        resultKind,
        resultId: generationId,
        workId: "work-01",
        scopeAssignmentId: "assignment-01",
        scopeType: "ASSIGNMENT",
        dynamicFormTemplateId: "form-01",
        periodKey: "2026-08-P11-03",
        periodInstanceKey: "2026-08-P11-03",
        page: 0,
        pageSize: 50,
      };
      apiPostMock.mockResolvedValue({
        data: {
          metadata: {
            state: "READY",
            freshness: "FRESH",
            publications: [{ generationId }],
          },
          rows: [{ fieldId: "field-01" }],
          totalRows: 1,
        },
      });

      await getStatRunResult(query);

      expect(apiPostMock).toHaveBeenCalledOnce();
      expect(apiPostMock).toHaveBeenCalledWith(endpoint, expect.objectContaining({
        generationId,
        workId: "work-01",
        scopeType: "ASSIGNMENT",
        scopeId: "assignment-01",
        dynamicFormTemplateId: "form-01",
        periodInstanceKey: "2026-08-P11-03",
      }));
    },
  );
});
