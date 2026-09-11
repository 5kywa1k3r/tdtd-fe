import { api, resolveAuthorizedApiHref } from './base/axios';

export const RECONCILIATION_REVIEW_GATES = [
  'FORM', 'FLOW', 'ASSIGNMENT', 'MAPPING', 'STATISTICS',
] as const;

export type ReconciliationReviewGate =
  (typeof RECONCILIATION_REVIEW_GATES)[number];
export type ReconciliationReviewDecision = 'APPROVE' | 'REJECT';

export type ReconciliationSummary = {
  reconciliationId: string;
  workId: string;
  scopeAssignmentId: string;
  p9ResultKind: string;
  status: string;
  stateRevision: number;
  stateHash: string;
  diagnosticCode?: string | null;
  hasPendingGeneration: boolean;
  hasCurrentGeneration: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
  presentation: ReconciliationPresentation;
};

export type ReconciliationPresentationColumn =
  'Identity' | 'Config' | 'Expected' | 'Actual' | 'Delta' |
  'Freshness' | 'Permission' | 'Verdict';

export type ReconciliationPresentationColumns = Record<
  ReconciliationPresentationColumn, string>;

export type ReconciliationPresentationLink = {
  rel: string;
  href: string;
  method: 'GET' | 'POST';
};

export type ReconciliationPresentationMetadata = {
  total: number;
  rootCause: string;
  rowCountBeforeRedaction: number;
  rowCountAfterRedaction: number;
  permissionCodes: string[];
  evidenceLinks: ReconciliationPresentationLink[];
  sourceLinks: ReconciliationPresentationLink[];
};

export type ReconciliationPresentationRow = {
  id: string;
  columns: ReconciliationPresentationColumns;
  metadata: ReconciliationPresentationMetadata;
};

export type ReconciliationPresentation = {
  schemaVersion: 'P10_RECONCILIATION_PRESENTATION_V1';
  detailLevel: 'REDACTED' | 'OPERATOR';
  // Base eligibility is a server hint; the command still validates successor/CAS.
  recheck?: { baseEligible: boolean; inProgress: boolean };
  rows: ReconciliationPresentationRow[];
};

export type ReconciliationDetail = ReconciliationSummary & {
  permissionCodes: string[];
  authorizationSnapshotHash: string;
  immutableIdentityHash: string;
  p9ResultId: string;
  p9CapabilityId?: string | null;
  p9RouteId?: string | null;
  p9RunId: string;
  p9GenerationId: string;
  p9GenerationHash: string;
  sourceReportId: string;
  sourcePayloadRevision: number;
  sourcePayloadHash: string;
  sourceLifecycleRevision: number;
  sourceLifecycleHash: string;
  dynamicFormVersionId: string;
  dynamicFormFamilyId?: string | null;
  dynamicFormVersionNo?: number | null;
  flowTemplateId?: string | null;
  flowTemplateVersionId?: string | null;
  flowInstanceId?: string | null;
  flowStepInstanceId?: string | null;
  flowBranchId?: string | null;
  flowStepId?: string | null;
  p8ConfigId?: string | null;
  p8ConfigVersionId?: string | null;
  p8ConfigRevision?: number | null;
  p8ConfigHash?: string | null;
  p8ConfigBundleHash: string;
  periodKey: string;
  periodKind?: string | null;
  periodInstanceKey: string;
  conceptKey: string;
  grain: string;
  currentGenerationId?: string | null;
  currentGenerationHash?: string | null;
};

export type ReconciliationPage = {
  rows: ReconciliationSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type DirectReconciliationFilter = {
  periodInstanceKey: string;
  fieldId: string;
  fieldKey: string;
  bucketKey: string | null;
  periodKey: string;
};

export type DirectReconciliationBinding = {
  p9ResultKind: 'DIRECT';
  p9ResultId: string;
  p9RunId: string;
  conceptKey: string;
  grain: string;
  filter: DirectReconciliationFilter;
};

export type DirectReconciliationCapturePlanPreflightRequest =
  DirectReconciliationBinding & {
    exportId: string;
  };

export type DirectReconciliationCapturePlanPreflight = {
  schemaVersion: 'P10_CAPTURE_PLAN_PREFLIGHT_V1';
  capturePlanToken: string;
  planSha256: string;
  expiresAtUtc: string;
};

export type DirectReconciliationCreateRequest =
  DirectReconciliationBinding & {
    commandId: string;
    capturePlanToken: string;
  };

export type ReviewRead = {
  summary: {
    reconciliationId: string;
    generationId: string;
    approved: boolean;
    approvedGateCount: number;
    rejectedGateCount: number;
    gateStates: Record<ReconciliationReviewGate, string>;
  };
  operatorDetail?: { auditRecords: Array<Record<string, unknown>> } | null;
  actions: {
    canSubmit: boolean;
    expectedStateRevision: number;
    availableGates: ReconciliationReviewGate[];
    canSupersede: boolean;
    supersessionGenerationIds: string[];
  };
};

export type ReviewDecisionCommand = {
  commandId: string;
  gate: ReconciliationReviewGate;
  decision: ReconciliationReviewDecision;
  expectedStateRevision: number;
};

export type ReviewSubmission = {
  replayed: boolean;
  reconciliationId: string;
  generationId: string;
  gate: ReconciliationReviewGate;
  decision: ReconciliationReviewDecision;
  status: string;
};

export type EvidenceArtifact = {
  id: string;
  reconciliationId: string;
  generationId: string;
  format: 'JSON' | 'CSV';
  detailLevel: 'REDACTED' | 'OPERATOR';
  fileName: string;
  contentType: string;
  manifestSha256: string;
  contentSha256: string;
  contentLength: number;
  createdAtUtc: string;
  expiresAtUtc: string;
  links: ReconciliationPresentationLink[];
};

export type EvidenceArtifactPage = {
  rows: EvidenceArtifact[];
  total: number;
  page: number;
  pageSize: number;
};

export type ReconciliationRead =
  | {
    phase: 'PENDING_GENERATION';
    summary: ReconciliationSummary;
    detail: null;
    review: null;
    evidence: null;
  }
  | {
    phase: 'READY';
    summary: ReconciliationSummary;
    detail: ReconciliationDetail | null;
    review: ReviewRead;
    evidence: EvidenceArtifactPage;
  }
  | {
    phase: 'REVIEW_RECOVERY';
    summary: ReconciliationSummary;
    detail: null;
    review: null;
    evidence: EvidenceArtifactPage | null;
    reviewStatus: 409 | 412;
    reviewCode: 'P10_REVIEW_TARGET_NOT_SIGNABLE';
  };

export type ReconciliationRecheckResponse = {
  isReplay: boolean;
  reconciliationId: string;
  recheckMarkerId: string;
  status: string;
  stateRevision: number;
  stateHash: string;
};

export type ReviewSupersession = {
  reconciliationId: string;
  previousGenerationId: string;
  newGenerationId: string;
  supersededApprovalCount: number;
};

function root(workId: string, scopeAssignmentId: string) {
  return `works/${encodeURIComponent(workId)}/statistics/` +
    `${encodeURIComponent(scopeAssignmentId)}/reconciliations`;
}

export async function preflightDirectReconciliationCapturePlan(
  workId: string,
  scopeAssignmentId: string,
  request: DirectReconciliationCapturePlanPreflightRequest,
) {
  return (await api.post<DirectReconciliationCapturePlanPreflight>(
    `${root(workId, scopeAssignmentId)}/capture-plan-preflight`,
    request,
  )).data;
}

export async function createDirectReconciliation(
  workId: string,
  scopeAssignmentId: string,
  request: DirectReconciliationCreateRequest,
) {
  return (await api.post<ReconciliationSummary>(
    root(workId, scopeAssignmentId),
    request,
  )).data;
}

export async function listReconciliations(workId: string,
  scopeAssignmentId: string, page = 1, pageSize = 25) {
  return (await api.get<ReconciliationPage>(root(workId, scopeAssignmentId),
    { params: { page, pageSize } })).data;
}

export async function readReconciliation(workId: string,
  scopeAssignmentId: string, reconciliationId: string): Promise<ReconciliationRead> {
  const base = `${root(workId, scopeAssignmentId)}/${encodeURIComponent(reconciliationId)}`;
  const summary = (await api.get<ReconciliationSummary>(base)).data;
  const status = summary.status.toUpperCase();
  if (!summary.hasCurrentGeneration || summary.hasPendingGeneration ||
      summary.presentation?.recheck?.inProgress === true ||
      status === 'QUEUED' || status === 'RUNNING') {
    return {
      phase: 'PENDING_GENERATION',
      summary,
      detail: null,
      review: null,
      evidence: null,
    };
  }

  const [review, evidence] = await Promise.allSettled([
    api.get<ReviewRead>(`${base}/review-decisions`),
    api.get<EvidenceArtifactPage>(`${base}/evidence-exports`,
      { params: { page: 1, pageSize: 25 } }),
  ]);
  if (review.status === 'rejected') {
    const rejected = review.reason as {
      status?: number;
      errorCode?: string;
      response?: {
        status?: number;
        data?: { code?: string };
      };
    } | null;
    const reviewStatus = rejected?.status ?? rejected?.response?.status;
    const reviewCode = rejected?.errorCode ?? rejected?.response?.data?.code;
    if ((reviewStatus === 409 || reviewStatus === 412) &&
        reviewCode === 'P10_REVIEW_TARGET_NOT_SIGNABLE') {
      return {
        phase: 'REVIEW_RECOVERY',
        summary,
        detail: null,
        review: null,
        evidence: evidence.status === 'fulfilled' ? evidence.value.data : null,
        reviewStatus,
        reviewCode,
      };
    }
    throw review.reason;
  }
  if (evidence.status === 'rejected') throw evidence.reason;
  const detail = review.value.data.operatorDetail == null
    ? null
    : (await api.get<ReconciliationDetail>(`${base}/detail`)).data;
  return {
    phase: 'READY',
    summary,
    detail,
    review: review.value.data,
    evidence: evidence.value.data,
  };
}

export async function submitReviewDecision(workId: string,
  scopeAssignmentId: string, reconciliationId: string,
  command: ReviewDecisionCommand) {
  return (await api.post<ReviewSubmission>(
    `${root(workId, scopeAssignmentId)}/${encodeURIComponent(reconciliationId)}/review-decisions`,
    command)).data;
}

export async function beginReconciliationRecheck(workId: string,
  scopeAssignmentId: string, reconciliationId: string,
  summary: Pick<ReconciliationSummary, 'stateRevision' | 'stateHash'>) {
  return (await api.post<ReconciliationRecheckResponse>(
    `${root(workId, scopeAssignmentId)}/${encodeURIComponent(reconciliationId)}/recheck`,
    {
      commandId: crypto.randomUUID(),
      expectedStateRevision: summary.stateRevision,
      expectedStateHash: summary.stateHash,
    })).data;
}

export async function supersedeReconciliationReview(workId: string,
  scopeAssignmentId: string, reconciliationId: string,
  previousGenerationId: string, expectedStateRevision: number) {
  return (await api.post<ReviewSupersession>(
    `${root(workId, scopeAssignmentId)}/${encodeURIComponent(reconciliationId)}/review-supersessions`,
    {
      commandId: crypto.randomUUID(),
      previousGenerationId,
      expectedStateRevision,
    })).data;
}

export async function listEvidenceArtifacts(workId: string,
  scopeAssignmentId: string, reconciliationId: string,
  page = 1, pageSize = 25) {
  return (await api.get<EvidenceArtifactPage>(
    `${root(workId, scopeAssignmentId)}/${encodeURIComponent(reconciliationId)}/evidence-exports`,
    { params: { page, pageSize } })).data;
}

export async function readEvidenceArtifact(artifact: EvidenceArtifact) {
  const readback = artifact.links.find(link =>
    link.rel === 'READBACK' && link.method === 'GET');
  if (!readback) throw new Error('Evidence readback link is not authorized.');
  return readAuthorizedReconciliationLink<EvidenceArtifact>(readback);
}

function authorizedReadHref(link: ReconciliationPresentationLink) {
  const href = link.method === 'GET' ? resolveAuthorizedApiHref(link.href) : null;
  if (!href) throw new Error('Reconciliation read link is not authorized.');
  return href;
}

export async function readAuthorizedReconciliationLink<T = unknown>(
  link: ReconciliationPresentationLink,
): Promise<T> {
  // Resolve before entering the authenticated client. Server root-relative
  // links must not be appended to an Axios baseURL that already contains /api.
  return (await api.get<T>(authorizedReadHref(link))).data;
}

export async function createEvidenceExport(workId: string,
  scopeAssignmentId: string, reconciliationId: string,
  format: 'JSON' | 'CSV', includeOperatorDetail: boolean) {
  const commandId = crypto.randomUUID();
  return (await api.post<EvidenceArtifact>(
    `${root(workId, scopeAssignmentId)}/${encodeURIComponent(reconciliationId)}/evidence-exports`,
    { commandId, format, includeOperatorDetail })).data;
}

export async function downloadEvidenceExport(artifact: EvidenceArtifact) {
  const download = artifact.links.find(link =>
    link.rel === 'DOWNLOAD' && link.method === 'GET');
  if (!download) throw new Error('Evidence download link is not authorized.');
  const response = await api.get<Blob>(
    authorizedReadHref(download),
    { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = artifact.fileName;
    anchor.rel = 'noopener';
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
