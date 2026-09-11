import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, it, vi } from "vitest";

const { baseQueryMock } = vi.hoisted(() => ({ baseQueryMock: vi.fn() }));

vi.mock("../../src/api/base/axiosBaseQuery", () => ({
  axiosBaseQuery: () => (request: unknown) => baseQueryMock(request),
}));

import { baseApi } from "../../src/api/base/baseApi";
import { dynamicFlowTemplateApi } from "../../src/api/dynamicFlowTemplateApi";
import { statConfigApi } from "../../src/api/statConfigApi";

function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  });
}

async function expectConflicts(requests: Array<{ unwrap: () => Promise<unknown> }>) {
  const results = await Promise.allSettled(requests.map((request) => request.unwrap()));
  expect(results).toHaveLength(requests.length);
  results.forEach((result, index) => {
    expect(result.status, `request ${index}`).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toMatchObject({ status: 409 });
    }
  });
}

afterEach(() => {
  baseQueryMock.mockReset();
});

describe("P8 statistics configuration API contracts", () => {
  it("uses the canonical form, Basic, Advanced, and Diff routes with full CAS envelopes", async () => {
    baseQueryMock.mockResolvedValue({
      error: { status: 409, errorCode: "STAT_CONFIG_REVISION_CONFLICT", message: "stale" },
    });
    const store = makeStore();
    const route = { assignmentId: "assignment-1", dynamicFormTemplateId: "template-1" };
    const advancedRoute = { ...route, sectionId: "section-1" };
    const formBody = {
      commandId: "form-save-0001",
      expectedRevision: 1,
      expectedConfigHash: "form-hash-1",
      payload: { fields: [] },
    };
    const basicBody = {
      commandId: "basic-save-0001",
      expectedRevision: 2,
      expectedConfigHash: "basic-hash-2",
      payload: { targets: [] },
    };
    const basicLockBody = {
      commandId: "basic-lock-0001",
      expectedRevision: 2,
      expectedConfigHash: "basic-hash-2",
      payload: {},
    };
    const basicNextBody = {
      commandId: "basic-next-0001",
      expectedRevision: 3,
      expectedConfigHash: "basic-hash-3",
      payload: {},
    };
    const advancedBody = {
      commandId: "advanced-save-0001",
      expectedRevision: 4,
      expectedConfigHash: "advanced-hash-4",
      payload: { sections: [] },
    };
    const advancedLockBody = {
      commandId: "advanced-lock-0001",
      expectedRevision: 4,
      expectedConfigHash: "advanced-hash-4",
      payload: {},
    };
    const advancedNextBody = {
      commandId: "advanced-next-0001",
      expectedRevision: 5,
      expectedConfigHash: "advanced-hash-5",
      payload: {},
    };
    const advancedArchiveBody = {
      commandId: "advanced-archive-0001",
      expectedRevision: 5,
      expectedConfigHash: "advanced-hash-5",
      payload: {},
    };
    const diffBody = {
      commandId: "diff-save-0001",
      expectedRevision: 6,
      expectedConfigHash: "diff-hash-6",
      payload: { name: "Period delta" },
    };
    const diffLockBody = {
      commandId: "diff-lock-0001",
      expectedRevision: 6,
      expectedConfigHash: "diff-hash-6",
      payload: {},
    };
    const diffNextBody = {
      commandId: "diff-next-0001",
      expectedRevision: 7,
      expectedConfigHash: "diff-hash-7",
      payload: {},
    };

    const requests = [
      store.dispatch(statConfigApi.endpoints.getP8DynamicFormStatistics.initiate({ id: "form-1" })),
      store.dispatch(statConfigApi.endpoints.putP8DynamicFormStatistics.initiate({ id: "form-1", body: formBody })),
      store.dispatch(statConfigApi.endpoints.getP8BasicSummaryConfig.initiate(route)),
      store.dispatch(statConfigApi.endpoints.listP8BasicSummaryConfigVersions.initiate(route)),
      store.dispatch(statConfigApi.endpoints.getP8BasicSummaryConfigVersion.initiate({ ...route, versionNo: 2 })),
      store.dispatch(statConfigApi.endpoints.putP8BasicSummaryConfig.initiate({ ...route, body: basicBody })),
      store.dispatch(statConfigApi.endpoints.lockP8BasicSummaryConfig.initiate({ ...route, body: basicLockBody })),
      store.dispatch(statConfigApi.endpoints.createNextP8BasicSummaryDraft.initiate({ ...route, body: basicNextBody })),
      store.dispatch(statConfigApi.endpoints.getP8AdvancedSummaryConfig.initiate(advancedRoute)),
      store.dispatch(statConfigApi.endpoints.listP8AdvancedSummaryConfigVersions.initiate(advancedRoute)),
      store.dispatch(statConfigApi.endpoints.getP8AdvancedSummaryConfigVersion.initiate({ ...advancedRoute, versionNo: 2 })),
      store.dispatch(statConfigApi.endpoints.putP8AdvancedSummaryConfig.initiate({ ...advancedRoute, body: advancedBody })),
      store.dispatch(statConfigApi.endpoints.lockP8AdvancedSummaryConfig.initiate({ ...advancedRoute, body: advancedLockBody })),
      store.dispatch(statConfigApi.endpoints.createNextP8AdvancedSummaryDraft.initiate({ ...advancedRoute, body: advancedNextBody })),
      store.dispatch(statConfigApi.endpoints.archiveP8AdvancedSummaryConfig.initiate({ ...advancedRoute, body: advancedArchiveBody })),
      store.dispatch(statConfigApi.endpoints.getP8DiffConfig.initiate(route)),
      store.dispatch(statConfigApi.endpoints.listP8DiffConfigVersions.initiate(route)),
      store.dispatch(statConfigApi.endpoints.getP8DiffConfigVersion.initiate({ ...route, versionNo: 2 })),
      store.dispatch(statConfigApi.endpoints.putP8DiffConfig.initiate({ ...route, body: diffBody })),
      store.dispatch(statConfigApi.endpoints.lockP8DiffConfig.initiate({ ...route, body: diffLockBody })),
      store.dispatch(statConfigApi.endpoints.createNextP8DiffDraft.initiate({ ...route, body: diffNextBody })),
    ];

    await expectConflicts(requests);

    const basicPath = "/work-assignment-basic-summary/assignments/assignment-1/templates/template-1/config";
    const advancedPath = "/work-assignment-advanced-summary/assignments/assignment-1/templates/template-1/sections/section-1/config";
    const diffPath = "/work-report-statistic-diffs/assignments/assignment-1/templates/template-1/config";
    expect(baseQueryMock.mock.calls.map(([request]) => request)).toEqual([
      { url: "/dynamic-forms/form-1/statistics", method: "GET" },
      { url: "/dynamic-forms/form-1/statistics", method: "PATCH", data: formBody },
      { url: basicPath, method: "GET" },
      { url: `${basicPath}/versions`, method: "GET" },
      { url: `${basicPath}/versions/2`, method: "GET" },
      { url: basicPath, method: "PUT", data: basicBody },
      { url: `${basicPath}/lock`, method: "POST", data: basicLockBody },
      { url: `${basicPath}/next-draft`, method: "POST", data: basicNextBody },
      { url: advancedPath, method: "GET" },
      { url: `${advancedPath}/versions`, method: "GET" },
      { url: `${advancedPath}/versions/2`, method: "GET" },
      { url: advancedPath, method: "PUT", data: advancedBody },
      { url: `${advancedPath}/lock`, method: "POST", data: advancedLockBody },
      { url: `${advancedPath}/next-draft`, method: "POST", data: advancedNextBody },
      { url: `${advancedPath}/archive`, method: "POST", data: advancedArchiveBody },
      { url: diffPath, method: "GET" },
      { url: `${diffPath}/versions`, method: "GET" },
      { url: `${diffPath}/versions/2`, method: "GET" },
      { url: diffPath, method: "PUT", data: diffBody },
      { url: `${diffPath}/lock`, method: "POST", data: diffLockBody },
      { url: `${diffPath}/next-draft`, method: "POST", data: diffNextBody },
    ]);
  });

  it("uses the frozen readiness admin and bundle contracts", async () => {
    baseQueryMock.mockResolvedValue({
      error: { status: 409, errorCode: "STAT_CONFIG_REVISION_CONFLICT", message: "stale" },
    });
    const store = makeStore();
    const enqueueBody = {
      commandId: "readiness-enqueue-0001",
      expectedRevision: 8,
      expectedConfigHash: "config-hash-8",
      payload: { configId: "config-1", versionId: "version-1", versionNo: 1 },
    };
    const resetBody = {
      commandId: "readiness-reset-0001",
      expectedRevision: 9,
      expectedConfigHash: "config-hash-9",
      payload: { reason: "retry after dependency repair" },
    };
    const cancelBody = {
      commandId: "readiness-cancel-0001",
      expectedRevision: 10,
      expectedConfigHash: "config-hash-10",
      payload: { reason: "operator cancelled" },
    };
    const cleanupBody = {
      commandId: "readiness-cleanup-0001",
      expectedRevision: 11,
      expectedConfigHash: "config-hash-11",
      payload: { completedBeforeUtc: "2026-08-01T00:00:00Z", limit: 25, dryRun: true },
    };
    const bundleReadBody = {
      ownerKind: "WORK_ASSIGNMENT",
      ownerId: "assignment-1",
      dependencyPins: [{ kind: "BASIC", configId: "config-1", versionId: "version-1" }],
    };
    const bundleValidateBody = {
      commandId: "bundle-validate-0001",
      expectedBundleHash: "bundle-hash-1",
      bundle: bundleReadBody,
    };

    const requests = [
      store.dispatch(statConfigApi.endpoints.enqueueStatConfigReadiness.initiate({
        ownerKind: "WORK_ASSIGNMENT",
        ownerId: "assignment-1",
        body: enqueueBody,
      })),
      store.dispatch(statConfigApi.endpoints.getStatConfigReadiness.initiate({ jobId: "job-1" })),
      store.dispatch(statConfigApi.endpoints.searchStatConfigReadinessAdmin.initiate({
        status: "RETRYING",
        ownerKind: "WORK_ASSIGNMENT",
        q: "hash",
        page: 2,
        pageSize: 20,
      })),
      store.dispatch(statConfigApi.endpoints.getStatConfigReadinessAdmin.initiate({ jobId: "job-1" })),
      store.dispatch(statConfigApi.endpoints.processStatConfigReadinessAdmin.initiate({ maxJobs: 3 })),
      store.dispatch(statConfigApi.endpoints.resetStatConfigReadinessAdmin.initiate({ jobId: "job-1", body: resetBody })),
      store.dispatch(statConfigApi.endpoints.cancelStatConfigReadinessAdmin.initiate({ jobId: "job-2", body: cancelBody })),
      store.dispatch(statConfigApi.endpoints.cleanupStatConfigReadinessAdmin.initiate(cleanupBody)),
      store.dispatch(statConfigApi.endpoints.getStatConfigReadinessIndexes.initiate()),
      store.dispatch(statConfigApi.endpoints.getEmptyStatConfigBundle.initiate({
        ownerKind: "WORK_ASSIGNMENT",
        ownerId: "assignment-1",
      })),
      store.dispatch(statConfigApi.endpoints.readStatConfigBundle.initiate(bundleReadBody)),
      store.dispatch(statConfigApi.endpoints.validateStatConfigBundle.initiate(bundleValidateBody)),
    ];

    await expectConflicts(requests);

    const adminPath = "/admin/operations/job-runs/stat-config-readiness-jobs";
    expect(baseQueryMock.mock.calls.map(([request]) => request)).toEqual([
      {
        url: "/stat-config/owners/WORK_ASSIGNMENT/assignment-1/readiness-jobs",
        method: "POST",
        data: enqueueBody,
      },
      { url: "/stat-config/readiness/jobs/job-1", method: "GET" },
      {
        url: adminPath,
        method: "GET",
        params: {
          status: "RETRYING",
          ownerKind: "WORK_ASSIGNMENT",
          q: "hash",
          page: 2,
          pageSize: 20,
        },
      },
      { url: `${adminPath}/job-1`, method: "GET" },
      { url: `${adminPath}/process`, method: "POST", params: { maxJobs: 3 } },
      { url: `${adminPath}/job-1/reset`, method: "POST", data: resetBody },
      { url: `${adminPath}/job-2/cancel`, method: "POST", data: cancelBody },
      { url: `${adminPath}/cleanup`, method: "POST", data: cleanupBody },
      { url: `${adminPath}/indexes`, method: "GET" },
      {
        url: "/stat-config/bundle",
        method: "GET",
        params: { ownerKind: "WORK_ASSIGNMENT", ownerId: "assignment-1" },
      },
      { url: "/stat-config/bundle/readback", method: "POST", data: bundleReadBody },
      { url: "/stat-config/bundle/validate", method: "POST", data: bundleValidateBody },
    ]);
  });

  it("forwards flow contribution policy and explicit INCLUDE acknowledgement on lock", async () => {
    baseQueryMock.mockResolvedValue({
      error: { status: 409, errorCode: "DYNAMIC_FLOW_REVISION_CONFLICT", message: "stale" },
    });
    const store = makeStore();
    const body = {
      commandId: "flow-lock-0001",
      expectedFamilyRevision: 7,
      expectedDraftRevision: 4,
      expectedPayloadHash: "payload-hash-4",
      contributionPolicy: "INCLUDE" as const,
      acknowledgeContributionWarning: true,
    };

    const request = store.dispatch(
      dynamicFlowTemplateApi.endpoints.lockDynamicFlowTemplateVersionP4.initiate({
        familyId: "family-1",
        versionId: "version-2",
        body,
      }),
    );
    await expect(request.unwrap()).rejects.toMatchObject({ status: 409 });

    expect(baseQueryMock).toHaveBeenCalledWith({
      url: "/dynamic-flow-templates/family-1/versions/version-2/lock",
      method: "POST",
      data: body,
    });
  });
});
