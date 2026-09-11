import { api } from "./base/axios";

export type StatRunCapabilityId =
  | "DIRECT_FIELD_TABLE_LABEL"
  | "BASIC_SUMMARY"
  | "ADVANCED_SUMMARY"
  | "DIFF"
  | "FLOW_SCOPES";

export type StatRunResultKind =
  | "DIRECT_FIELD"
  | "DIRECT_TABLE"
  | "DIRECT_LABEL"
  | "BASIC"
  | "ADVANCED"
  | "DIFF"
  | "FLOW";

export type StatRunFlowScopeMode =
  | "FLOW_BRANCH"
  | "FLOW_STEP"
  | "FLOW_EFFECTIVE_PATH"
  | "FLOW_FINAL";

export type StatRunPeriod = {
  periodKey: string;
  periodInstanceKey: string;
  periodKind: string;
  periodStart?: string | null;
  periodEnd?: string | null;
};

export type StatRunCreateRequest = {
  commandId: string;
  workId: string;
  scopeType: string;
  scopeId?: string | null;
  sourceReportId: string;
  dynamicFormTemplateId: string;
  expectedConfigRevision: number;
  expectedConfigHash: string;
  expectedSourceRevision: number;
  expectedSourceHash: string;
  expectedLifecycleRevision: number;
  period: StatRunPeriod;
};

export type StatRunJob = {
  jobId: string;
  runId: string;
  receiptId: string;
  commandId: string;
  capabilityId: StatRunCapabilityId | string;
  runKind: string;
  status: string;
  stateRevision: number;
  stateHash: string;
  isReplay: boolean;
  workId: string;
  scopeType: string;
  scopeId?: string | null;
  sourceReportId: string;
  sourceRevision: number;
  sourceHash: string;
  lifecycleRevision: number;
  dynamicFormTemplateId: string;
  configId: string;
  configVersionId: string;
  configVersionNo: number;
  configRevision: number;
  configHash: string;
  catalogVersion: string;
  catalogRawSha256: string;
  catalogSemanticSha256: string;
  schemaRawSha256: string;
  schemaSemanticSha256: string;
  stageLockSha256: string;
  candidateChainId: string;
  flowTemplateId?: string | null;
  flowTemplateVersionId?: string | null;
  flowInstanceId?: string | null;
  flowBranchId?: string | null;
  flowStepId?: string | null;
  flowAttemptNo?: number | null;
  flowStepInstanceId?: string | null;
  periodKey: string;
  periodInstanceKey: string;
  periodKind: string;
  retryCount: number;
  nextRetryAtUtc?: string | null;
  leaseUntilUtc?: string | null;
  lastHeartbeatAtUtc?: string | null;
  deadlineAtUtc?: string | null;
  startedAtUtc?: string | null;
  completedAtUtc?: string | null;
  computedAtUtc?: string | null;
  generationId?: string | null;
  generationHash?: string | null;
  projectionRunId?: string | null;
  freshnessState: string;
  staleReason?: string | null;
  diagnosticCode?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type StatRunResultQuery = {
  resultKind: StatRunResultKind;
  resultId: string;
  workId: string;
  scopeAssignmentId: string;
  page: number;
  pageSize: number;
  dynamicFormTemplateId?: string | null;
  scopeType?: string | null;
  periodKey?: string | null;
  periodInstanceKey?: string | null;
  fieldId?: string | null;
  fieldKey?: string | null;
  blockId?: string | null;
  metricKey?: string | null;
  labelCode?: string | null;
  bucketKey?: string | null;
  startDayKey?: string | null;
  endDayKey?: string | null;
  advancedConfigId?: string | null;
  sourceScopeMode?: StatRunFlowScopeMode | null;
  sourceFlowInstanceId?: string | null;
  sourceFlowStepId?: string | null;
  sourceFlowBranchId?: string | null;
  sourceFlowEffectiveStatus?: string | null;
};

export type StatRunCanonicalResult = Record<string, unknown>;

export type StatRunExportFilter = {
  dynamicFormTemplateId?: string | null;
  fieldId?: string | null;
  fieldKey?: string | null;
  blockId?: string | null;
  metricKey?: string | null;
  labelCode?: string | null;
  periodKey?: string | null;
  bucketKey?: string | null;
};

export type StatRunExportCreateRequest = {
  commandId: string;
  format: "CSV" | "XLSX";
  resultKind: StatRunResultKind;
  workId: string;
  scopeType: string;
  scopeId: string;
  periodInstanceKey?: string | null;
  resultId: string;
  expectedResultHash: string;
  expectedConfigHash: string;
  expectedSourceHash: string;
  expectedLifecycleRevision: number;
  filters: StatRunExportFilter;
};

export type StatRunExport = {
  exportId: string;
  receiptId: string;
  commandId: string;
  requestHash: string;
  isReplay: boolean;
  status: string;
  capabilityId: string;
  resultKind: string;
  format: string;
  workId: string;
  scopeType: string;
  scopeId: string;
  periodInstanceKey?: string | null;
  resultId: string;
  resultHash: string;
  configHash: string;
  sourceHash: string;
  lifecycleRevision: number;
  fileName: string;
  contentType: string;
  contentHash: string;
  byteCount: number;
  rowCount: number;
  columnCount: number;
  completedAtUtc: string;
  expiresAtUtc: string;
  downloadUrl: string;
};

export async function createStatRun(capabilityId: StatRunCapabilityId, request: StatRunCreateRequest) {
  const response = await api.post<StatRunJob>(
    `stat-runs/${encodeURIComponent(capabilityId)}/jobs`,
    request,
  );
  return response.data;
}

export async function getStatRunJob(jobId: string) {
  const response = await api.get<StatRunJob>(`stat-runs/jobs/${encodeURIComponent(jobId)}`);
  return response.data;
}

function directBody(query: StatRunResultQuery) {
  return {
    generationId: query.resultId,
    workId: query.workId,
    scopeType: query.scopeType || "ASSIGNMENT",
    scopeId: query.scopeAssignmentId,
    dynamicFormTemplateId: query.dynamicFormTemplateId || undefined,
    periodKey: query.periodKey || undefined,
    periodInstanceKey: query.periodInstanceKey || undefined,
    fieldId: query.fieldId || undefined,
    fieldKey: query.fieldKey || undefined,
    blockId: query.blockId || undefined,
    metricKey: query.metricKey || undefined,
    labelCode: query.labelCode || undefined,
    bucketKey: query.bucketKey || undefined,
    includeDrilldown: true,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getStatRunResult(query: StatRunResultQuery): Promise<StatRunCanonicalResult> {
  if (query.resultKind === "DIRECT_FIELD") {
    return (await api.post("work-report-field-statistics/summary", directBody(query))).data;
  }
  if (query.resultKind === "DIRECT_TABLE") {
    return (await api.post("work-report-table-statistics/summary", directBody(query))).data;
  }
  if (query.resultKind === "DIRECT_LABEL") {
    return (await api.post("work-report-label-statistics/summary", directBody(query))).data;
  }
  if (query.resultKind === "BASIC" || query.resultKind === "FLOW") {
    return (await api.post("work-assignment-basic-summary/summary", {
      scopeAssignmentId: query.scopeAssignmentId,
      dynamicFormTemplateId: query.dynamicFormTemplateId || undefined,
      periodScopeMode: query.periodKey ? "SINGLE_PERIOD" : "ALL_PERIODS",
      periodKey: query.periodKey || undefined,
      sourceScopeMode: query.sourceScopeMode || undefined,
      sourceFlowInstanceId: query.sourceFlowInstanceId || undefined,
      sourceFlowStepId: query.sourceFlowStepId || undefined,
      sourceFlowBranchId: query.sourceFlowBranchId || undefined,
      sourceFlowEffectiveStatus: query.sourceFlowEffectiveStatus || undefined,
      includeSourceRows: true,
      sourceView: { page: query.page, pageSize: query.pageSize },
    })).data;
  }
  if (query.resultKind === "ADVANCED") {
    return (await api.post(
      `work-assignment-advanced-summary/configs/${encodeURIComponent(query.advancedConfigId || query.resultId)}/hierarchy/query`,
      {
        startDayKey: query.startDayKey || query.periodKey || "",
        endDayKey: query.endDayKey || query.periodKey || "",
        enqueueMissing: false,
      },
    )).data;
  }
  return (await api.get(
    `work-report-statistic-diffs/assignments/${encodeURIComponent(query.scopeAssignmentId)}` +
      `/templates/${encodeURIComponent(query.dynamicFormTemplateId || "")}` +
      `/results/${encodeURIComponent(query.resultId)}`,
    { params: { page: query.page, pageSize: query.pageSize } },
  )).data;
}

export async function createStatRunExport(request: StatRunExportCreateRequest) {
  const response = await api.post<StatRunExport>("stat-runs/exports", request);
  return response.data;
}

export async function getStatRunExport(
  exportId: string,
  context: Pick<StatRunExportCreateRequest, "workId" | "scopeType" | "scopeId"> & { capabilityId: string },
) {
  const response = await api.get<StatRunExport>(`stat-runs/exports/${encodeURIComponent(exportId)}`, {
    params: context,
  });
  return response.data;
}

export async function downloadStatRunExport(exportRow: StatRunExport) {
  const response = await api.get(
    `stat-runs/exports/${encodeURIComponent(exportRow.exportId)}/download`,
    {
      params: {
        workId: exportRow.workId,
        scopeType: exportRow.scopeType,
        scopeId: exportRow.scopeId,
        capabilityId: exportRow.capabilityId,
      },
      responseType: "blob",
    },
  );
  return response.data as Blob;
}
