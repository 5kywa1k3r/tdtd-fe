import { AxiosError, type AxiosAdapter } from 'axios';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../src/api/base/axios';
import { clearAuthStorage, setTokenToActiveStorage } from '../src/stores/authStorage';
import {
  beginReconciliationRecheck,
  createDirectReconciliation,
  downloadEvidenceExport,
  preflightDirectReconciliationCapturePlan,
  readReconciliation,
  supersedeReconciliationReview,
} from '../src/api/reconciliationApi';
import type {
  EvidenceArtifact,
  ReconciliationDetail,
  ReconciliationPresentation,
  ReconciliationSummary,
  ReviewRead,
} from '../src/api/reconciliationApi';
import {
  RECONCILIATION_COLUMNS,
  ReconciliationDetailPanel,
  ReconciliationStateView,
  ReconciliationTable,
  StatisticsReconciliationDetailPage,
  StatisticsReconciliationsPage,
  canBeginReconciliationRecheck,
  directReconciliationWorkspaceBinding,
  serverPresentationRows,
} from '../src/pages/works/reconciliation/ReconciliationPages';
import { StatisticsResultPage } from '../src/pages/works/statisticsRun/StatisticsRunPages';

const presentationRow = {
  id: 'rec-01',
  columns: {
    Identity: 'WIRE_IDENTITY', Config: 'WIRE_CONFIG', Expected: 'WIRE_EXPECTED',
    Actual: 'WIRE_ACTUAL', Delta: 'WIRE_DELTA', Freshness: 'WIRE_FRESHNESS',
    Permission: 'WIRE_PERMISSION', Verdict: 'WIRE_VERDICT',
  },
  metadata: {
    total: 12, rootCause: 'SOURCE_DRIFT', rowCountBeforeRedaction: 1,
    rowCountAfterRedaction: 1, permissionCodes: ['STAT_RECONCILIATION_REVIEW'],
    evidenceLinks: [{ rel: 'REVIEW', href: '/api/review', method: 'GET' as const }],
    sourceLinks: [],
  },
};
const redactedPresentation = {
  schemaVersion: 'P10_RECONCILIATION_PRESENTATION_V1',
    recheck: { baseEligible: true, inProgress: false },
  detailLevel: 'REDACTED', rows: [presentationRow],
} satisfies ReconciliationPresentation;
const operatorPresentation = {
  schemaVersion: 'P10_RECONCILIATION_PRESENTATION_V1',
    recheck: { baseEligible: true, inProgress: false },
  detailLevel: 'OPERATOR',
  rows: [{
    ...presentationRow,
    columns: { ...presentationRow.columns, Permission: 'OPERATOR_PERMISSION' },
    metadata: {
      ...presentationRow.metadata,
      sourceLinks: [{ rel: 'SOURCE_DETAIL', href: '/api/source', method: 'GET' }],
    },
  }],
} satisfies ReconciliationPresentation;
const summary = {
  reconciliationId: 'rec-01', workId: 'work-01', scopeAssignmentId: 'scope-01',
  p9ResultKind: 'BASIC', status: 'COMPLETED', stateRevision: 7,
  stateHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  diagnosticCode: 'SERVER_DELTA', hasPendingGeneration: false,
  hasCurrentGeneration: true, createdAtUtc: '2026-08-13T10:00:00Z',
  updatedAtUtc: '2026-08-13T10:05:00Z', presentation: redactedPresentation,
} satisfies ReconciliationSummary;
const operatorSummary = { ...summary, presentation: operatorPresentation };const detail = {
  ...operatorSummary, permissionCodes: [], authorizationSnapshotHash: 'auth',
  immutableIdentityHash: 'identity', p9ResultId: 'result', p9RunId: 'run',
  p9GenerationId: 'gen', p9GenerationHash: 'gen-sha', sourceReportId: 'report-secret',
  sourcePayloadRevision: 3, sourcePayloadHash: 'payload', sourceLifecycleRevision: 4,
  sourceLifecycleHash: 'lifecycle', dynamicFormVersionId: 'form-version',
  dynamicFormVersionNo: 4, flowTemplateId: 'flow-family',
  flowTemplateVersionId: 'flow-version', flowInstanceId: 'flow-instance',
  flowBranchId: 'flow-branch', flowStepId: 'flow-step',
  flowStepInstanceId: 'flow-step-instance',
  p8ConfigId: 'config-id', p8ConfigVersionId: 'config-version', p8ConfigRevision: 8,
  p8ConfigBundleHash: 'config', periodKey: '2026', periodKind: 'SCHEDULED',
  periodInstanceKey: 'period', conceptKey: 'concept', grain: 'YEAR',
  currentGenerationId: 'current', currentGenerationHash: 'current-sha',
} satisfies ReconciliationDetail;
const gateStates = {
  FORM: 'APPROVE',
  FLOW: 'APPROVE',
  ASSIGNMENT: 'PENDING',
  MAPPING: 'PENDING',
  STATISTICS: 'PENDING',
};
const redactedReview = {
  summary: { reconciliationId: 'rec-01', generationId: 'gen', approved: false,
    approvedGateCount: 2, rejectedGateCount: 0, gateStates },
  operatorDetail: null,
  actions: {
    canSubmit: true,
    expectedStateRevision: 7,
    availableGates: ['ASSIGNMENT', 'MAPPING', 'STATISTICS'],
    canSupersede: false,
    supersessionGenerationIds: [],
  },
} satisfies ReviewRead;
const operatorReview = {
  ...redactedReview,
  operatorDetail: { auditRecords: [] },
} satisfies ReviewRead;
const sodReview = {
  ...redactedReview,
  actions: {
    canSubmit: false,
    expectedStateRevision: 7,
    availableGates: [],
    canSupersede: false,
    supersessionGenerationIds: [],
  },
} satisfies ReviewRead;
const row = serverPresentationRows(summary)[0];
const evidenceArtifact = {
  id: 'evidence-01', reconciliationId: 'rec-01', generationId: 'gen',
  format: 'JSON', detailLevel: 'REDACTED', fileName: 'evidence.json',
  contentType: 'application/json', manifestSha256: 'm'.repeat(64),
  contentSha256: 'c'.repeat(64), contentLength: 42,
  createdAtUtc: '2026-08-13T10:06:00Z',
  expiresAtUtc: '2026-09-13T10:06:00Z',
  links: [
    { rel: 'READBACK', href: '/api/server-owned/evidence-01', method: 'GET' },
    { rel: 'DOWNLOAD', href: '/api/server-owned/evidence-01/download', method: 'GET' },
  ],
} satisfies EvidenceArtifact;
const state = (value: Parameters<typeof ReconciliationStateView>[0]['state'], retry?: () => void) =>
  render(<ReconciliationStateView state={value} onRetry={retry} />);
const panel = (review: ReviewRead,
  props: Partial<Parameters<typeof ReconciliationDetailPanel>[0]> = {}) => {
  const operator = review.operatorDetail != null;
  return render(<MemoryRouter><ReconciliationDetailPanel
    summary={operator ? operatorSummary : summary}
    detail={operator ? detail : null} review={review} {...props} /></MemoryRouter>);
};
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-location">{location.pathname}</output>;
}
const defaultAdapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = defaultAdapter;
  clearAuthStorage();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('P10-UI state matrix', () => {
  it('P10-UISTATE-01 loading is explicit', () => {
    state('LOADING'); expect(screen.getByRole('status')).toHaveTextContent('Đang tải');
  });
  it('P10-UISTATE-02 ready renders exact server wire without legacy derivation', () => {
    const view = render(<MemoryRouter><ReconciliationTable rows={[row]} /></MemoryRouter>);
    expect(screen.getByText('WIRE_DELTA')).toBeInTheDocument();
    expect(screen.queryByText('SERVER_DELTA')).not.toBeInTheDocument();
    expect(view.container.querySelector('tr[data-reconciliation-id="rec-01"]'))
      .toHaveAttribute('data-total', '12');
    expect(view.container.querySelector('tr[data-reconciliation-id="rec-01"]'))
      .toHaveAttribute('data-root-cause', 'SOURCE_DRIFT');
    expect(view.container.querySelector('[data-reconciliation-table]'))
      .toHaveAttribute('data-reconciliation-column-count', '8');
    expect(view.container.querySelectorAll('td[data-column-index]'))
      .toHaveLength(8);
  });  it('P10-UISTATE-03 empty is explicit', () => {
    state('EMPTY'); expect(screen.getByRole('status')).toHaveTextContent('Chưa có');
  });
  it('P10-UISTATE-04 stale is explicit', () => {
    state('STALE'); expect(screen.getByRole('status')).toHaveTextContent('đã cũ');
  });
  it('P10-UISTATE-05 forbidden is non-disclosing', () => {
    state('FORBIDDEN'); expect(screen.getByRole('status')).not.toHaveTextContent('rec-01');
  });
  it('P10-UISTATE-06 not found is explicit', () => {
    state('NOT_FOUND'); expect(screen.getByRole('status')).toHaveTextContent('Không tìm thấy');
  });
  it('P10-UISTATE-07 error is explicit', () => {
    state('ERROR'); expect(screen.getByRole('status')).toHaveTextContent('Không thể tải');
  });
  it('P10-UISTATE-08 retry is user controlled', () => {
    const retry = vi.fn(); state('ERROR', retry);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' })); expect(retry).toHaveBeenCalledOnce();
  });
});

describe('P10-UI actor and source visibility', () => {
  it('P10-UIACTOR-01 redacted reviewer sees notice without provenance', () => {
    panel(redactedReview);
    expect(screen.getByRole('note')).toHaveTextContent('đã được máy chủ ẩn');
    expect(screen.queryByText('Source report')).not.toBeInTheDocument();
    expect(document.querySelector('[data-source-link]')).toBeNull();
    expect(document.querySelector('[data-presentation-metadata]'))
      .toHaveAttribute('data-presentation-detail-level', 'REDACTED');
  });
  it('P10-UIACTOR-02 operator signal fetches detail and renders source drilldown', async () => {
    const view = panel(operatorReview);
    expect(view.container.querySelector('#source-provenance')).not.toBeNull();
    expect(view.container.querySelector('[data-source-link="SOURCE_DETAIL"]'))
      .toHaveAttribute('data-source-link-href', '/api/source');
    expect(screen.getByRole('button', { name: 'report-secret' }))
      .toBeEnabled();
    expect(view.container.querySelector('a[href="https://localhost:7232/api/source"]'))
      .toBeNull();
    expect(view.container.querySelector('[data-presentation-permission]')?.textContent)
      .toBe('STAT_RECONCILIATION_REVIEW - 1/1');
    const getSpy = vi.spyOn(api, 'get').mockImplementation(async url => {
      const path = String(url);
      if (path.endsWith('/review-decisions')) return { data: operatorReview } as never;
      if (path.endsWith('/detail')) return { data: detail } as never;
      return { data: operatorSummary } as never;
    });
    const result = await readReconciliation('work-01', 'scope-01', 'rec-01');
    expect(result.detail?.sourceReportId).toBe('report-secret');
    expect(getSpy.mock.calls.map(call => String(call[0])))
      .toContain('works/work-01/statistics/scope-01/reconciliations/rec-01/detail');
  });
  it('P11-UIACTOR-IDENTITY links canonical domain identities', () => {
    const view = panel(operatorReview);
    expect(view.container.querySelector('[data-domain-link="dynamic-form-version"]'))
      .toHaveAttribute('href', '/design/forms/form-version');
    expect(view.container.querySelector('[data-domain-link="dynamic-flow-version"]'))
      .toHaveAttribute('href', '/design/flows/flow-family/versions/flow-version');
    expect(view.container.querySelector('[data-domain-link="dynamic-flow-instance"]'))
      .toHaveAttribute('href', expect.stringContaining('/works/work-01/flow-instances/flow-instance/overview'));
    expect(view.container.querySelector('[data-domain-link="dynamic-flow-step"]'))
      .toHaveAttribute('href', expect.stringContaining('stepInstanceId=flow-step-instance'));
    expect(view.container.querySelector('[data-domain-kind="dynamic-flow-step"]'))
      .toHaveTextContent('flow-step-instance');
    expect(view.container.querySelector('[data-domain-kind="source-report"]'))
      .toHaveTextContent('report-secret');
    const statisticsResultHref = view.container
      .querySelector('[data-domain-link="statistics-run"]')?.getAttribute('href');
    expect(statisticsResultHref)
      .toContain('/works/work-01/statistics/scope-01/results/DIRECT_FIELD/gen?');
    expect(view.container.querySelector('[data-domain-link="statistics-result"]'))
      .toHaveAttribute('href', statisticsResultHref);
    expect(view.container.querySelector('[data-domain-link="statistics-result-generation"]'))
      .toHaveAttribute('href', statisticsResultHref);
    expect(view.container.querySelector('[data-domain-link="reconciliation-generation"]'))
      .toHaveAttribute('href', expect.stringContaining('#review-actions-title'));
  });
  it('P11-UIACTOR-IDENTITY opens the exact inner publication through the DIRECT_FIELD result loader', async () => {
    const p9RunId = '507f1f77bcf86cd799439011';
    const generationId = '6'.repeat(64);
    const generationHash = '7'.repeat(64);
    const directSummary = {
      ...operatorSummary,
      p9ResultKind: 'DIRECT',
    } satisfies ReconciliationSummary;
    const directDetail = {
      ...detail,
      ...directSummary,
      p9ResultId: p9RunId,
      p9RunId,
      p9GenerationId: generationId,
      p9GenerationHash: generationHash,
      p9CapabilityId: 'DIRECT_FIELD_TABLE_LABEL',
      p9RouteId: 'P9_LFC_DIRECT_PROJECTOR',
      dynamicFormVersionId: 'form-01',
      periodKey: '2026-08',
      periodInstanceKey: 'MONTH:2026-08',
    } satisfies ReconciliationDetail;
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        metadata: {
          state: 'READY',
          freshness: 'FRESH',
          publications: [{ runId: p9RunId, generationId, generationHash }],
        },
        rows: [],
        totalRows: 0,
      },
    });
    const expectedPath =
      '/works/work-01/statistics/scope-01/results/DIRECT_FIELD/' + generationId;

    const view = render(<MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ReconciliationDetailPanel
          summary={directSummary}
          detail={directDetail}
          review={operatorReview}
        />} />
        <Route
          path="/works/:workId/statistics/:scopeAssignmentId/results/:resultKind/:resultId"
          element={<><LocationProbe /><StatisticsResultPage /></>}
        />
      </Routes>
    </MemoryRouter>);

    const identityLinks = [
      'statistics-run',
      'statistics-result',
      'statistics-result-generation',
    ].map(kind => view.container.querySelector(
      `[data-domain-link="${kind}"]`,
    ) as HTMLAnchorElement);
    const runLink = identityLinks[0];
    const target = new URL(runLink.getAttribute('href')!, 'http://localhost');
    expect(target.pathname).toBe(expectedPath);
    expect(Object.fromEntries(target.searchParams)).toEqual({
      dynamicFormTemplateId: 'form-01',
      scopeType: 'ASSIGNMENT',
      periodKey: '2026-08',
      periodInstanceKey: 'MONTH:2026-08',
    });
    expect(identityLinks.map(link => link.getAttribute('href')))
      .toEqual([target.pathname + target.search, target.pathname + target.search,
        target.pathname + target.search]);
    expect(screen.getByText('Statistics run (run)', { selector: 'dt' }))
      .toBeInTheDocument();
    expect(screen.getByText('Statistics result (result)', { selector: 'dt' }))
      .toBeInTheDocument();
    expect(screen.getByText('Statistics result generation', { selector: 'dt' }))
      .toBeInTheDocument();

    fireEvent.click(runLink);

    expect(await screen.findByTestId('current-location')).toHaveTextContent(expectedPath);
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith(
      'work-report-field-statistics/summary',
      expect.objectContaining({
        generationId,
        workId: 'work-01',
        scopeType: 'ASSIGNMENT',
        scopeId: 'scope-01',
        dynamicFormTemplateId: 'form-01',
        periodKey: '2026-08',
        periodInstanceKey: 'MONTH:2026-08',
      }),
    ));
  });

  it('P10-UIACTOR-03 review and stale feedback are explicit', () => {
    panel(redactedReview, {
      reviewFeedback: {
        kind: 'STALE',
        message: 'Trạng thái review đã thay đổi; dữ liệu mới nhất đã được tải lại.',
      },
    });
    expect(screen.getByText(/2\/5 cổng/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveAttribute('data-review-error-kind', 'STALE');
  });
  it('P10-UIACTOR-04 redacted reviewer can submit an available gate', () => {
    const onReview = vi.fn();
    panel(redactedReview, { onReview });
    expect(screen.getByRole('button', { name: 'Phê duyệt FORM' })).toBeDisabled();
    const button = screen.getByRole('button', { name: 'Phê duyệt ASSIGNMENT' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onReview).toHaveBeenCalledWith('ASSIGNMENT', 'APPROVE', 7);
  });
  it('P10-UIACTOR-05 server-derived SoD disables every review action', () => {
    const view = panel(sodReview);
    expect(view.container.querySelector('[data-review-actions]'))
      .toHaveAttribute('data-can-submit', 'false');
    expect(screen.getByRole('button', { name: 'Phê duyệt ASSIGNMENT' })).toBeDisabled();
    expect(view.container.querySelector('[data-review-action-blocked]'))
      .toHaveTextContent('Máy chủ không cho phép');
  });
  it('P10-UIACTOR-06 click reaches API helper with exact gate/revision and refreshes', async () => {
    const refreshedReview = {
      ...redactedReview,
      summary: {
        ...redactedReview.summary,
        approvedGateCount: 3,
        gateStates: { ...gateStates, ASSIGNMENT: 'APPROVE' },
      },
      actions: {
        canSubmit: true,
        expectedStateRevision: 8,
        availableGates: ['MAPPING', 'STATISTICS'],
        canSupersede: false,
        supersessionGenerationIds: [],
      },
    } satisfies ReviewRead;
    let reviewReads = 0;
    const getSpy = vi.spyOn(api, 'get').mockImplementation(async url => {
      const path = String(url);
      if (path.endsWith('/review-decisions')) {
        reviewReads += 1;
        return { data: reviewReads === 1 ? redactedReview : refreshedReview } as never;
      }

      return { data: { ...summary, stateRevision: reviewReads > 1 ? 8 : 7 } } as never;
    });
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        replayed: false,
        reconciliationId: 'rec-01',
        generationId: 'gen',
        gate: 'ASSIGNMENT',
        decision: 'APPROVE',
        status: 'ACTIVE',
      },
    } as never);
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001');

    render(<MemoryRouter initialEntries={[
      '/works/work-01/statistics/scope-01/reconciliations/rec-01',
    ]}>
      <Routes>
        <Route path="/works/:workId/statistics/:scopeAssignmentId/reconciliations/:reconciliationId"
          element={<StatisticsReconciliationDetailPage />} />
      </Routes>
    </MemoryRouter>);

    const button = await screen.findByRole('button', { name: 'Phê duyệt ASSIGNMENT' });
    fireEvent.click(button);
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith(
      'works/work-01/statistics/scope-01/reconciliations/rec-01/review-decisions',
      {
        commandId: '00000000-0000-4000-8000-000000000001',
        gate: 'ASSIGNMENT',
        decision: 'APPROVE',
        expectedStateRevision: 7,
      }));
    await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(6));
    expect(getSpy.mock.calls.map(call => String(call[0])))
      .not.toContain('works/work-01/statistics/scope-01/reconciliations/rec-01/detail');
    expect(document.querySelector('[data-review-feedback]'))
      .toHaveAttribute('data-review-feedback-kind', 'SUCCESS');
  });
});

describe('P11 mounted reconciliation continuity', () => {
  const matchedSummary = {
    ...operatorSummary,
    status: 'MATCHED',
    stateHash: 'b'.repeat(64),
    hasCurrentGeneration: true,
    hasPendingGeneration: false,
  } satisfies ReconciliationSummary;

  it.each([
    { status: 'QUEUED' as const, hasPendingGeneration: false },
    { status: 'RUNNING' as const, hasPendingGeneration: false },
    { status: 'QUEUED' as const, hasPendingGeneration: true },
  ])(
    'waits for a current generation for $status/$hasPendingGeneration/false',
    async ({ status, hasPendingGeneration }) => {
    vi.useFakeTimers();
    const pendingSummary = {
      ...matchedSummary,
      status,
      stateRevision: 1,
      hasPendingGeneration,
      hasCurrentGeneration: false,
    } satisfies ReconciliationSummary;
    let summaryReads = 0;
    const summaryPath = 'works/work-01/statistics/scope-01/reconciliations/rec-01';
    const getSpy = vi.spyOn(api, 'get').mockImplementation(async url => {
      const path = String(url);
      if (path.endsWith('/review-decisions')) {
        if (summaryReads === 1) throw { status: 409 };
        return { data: redactedReview } as never;
      }
      if (path.endsWith('/evidence-exports')) {
        return { data: { rows: [], total: 0, page: 1, pageSize: 25 } } as never;
      }
      summaryReads += 1;
      return { data: summaryReads === 1 ? pendingSummary : matchedSummary } as never;
    });

    render(<MemoryRouter initialEntries={[
      '/works/work-01/statistics/scope-01/reconciliations/rec-01',
    ]}>
      <Routes>
        <Route path="/works/:workId/statistics/:scopeAssignmentId/reconciliations/:reconciliationId"
          element={<StatisticsReconciliationDetailPage />} />
      </Routes>
    </MemoryRouter>);

    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText(/đang tạo generation/)).toBeVisible();
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy.mock.calls.map(call => String(call[0]))).toEqual([summaryPath]);

    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(screen.getByRole('button', { name: 'Phê duyệt ASSIGNMENT' })).toBeEnabled();
    expect(getSpy.mock.calls.map(call => String(call[0])))
      .toContain('works/work-01/statistics/scope-01/reconciliations/rec-01/review-decisions');
    },
  );

  it.each([409, 412])(
    'enters safe review recovery through the Axios interceptor on exact non-signable %s and queues one 202 recheck',
    async reviewStatus => {
    const recoverySummary = {
      ...matchedSummary,
      stateRevision: 11,
      stateHash: 'c'.repeat(64),
    } satisfies ReconciliationSummary;
    const pendingAfterRecheck = {
      ...recoverySummary,
      status: 'QUEUED',
      stateRevision: 12,
      stateHash: 'd'.repeat(64),
      hasPendingGeneration: false,
      hasCurrentGeneration: true,
    } satisfies ReconciliationSummary;
    const summaryPath =
      'works/work-01/statistics/scope-01/reconciliations/rec-01';
    let summaryReads = 0;
    const adapter = vi.fn<AxiosAdapter>(async config => {
      const path = String(config.url);
      const method = String(config.method).toLowerCase();
      if (method === 'get' && path === summaryPath) {
        summaryReads += 1;
        return {
          data: summaryReads === 1 ? recoverySummary : pendingAfterRecheck,
          status: 200, statusText: 'OK', headers: {}, config,
        };
      }
      if (method === 'get' && path.endsWith('/review-decisions')) {
        throw new AxiosError(
          'Review target is not signable',
          'ERR_BAD_REQUEST',
          config,
          undefined,
          {
            data: {
              title: 'Review target is not signable',
              status: reviewStatus,
              code: 'P10_REVIEW_TARGET_NOT_SIGNABLE',
            },
            status: reviewStatus,
            statusText: reviewStatus === 409 ? 'Conflict' : 'Precondition Failed',
            headers: {},
            config,
          },
        );
      }
      if (method === 'get' && path.endsWith('/evidence-exports')) {
        return {
          data: { rows: [evidenceArtifact], total: 1, page: 1, pageSize: 25 },
          status: 200, statusText: 'OK', headers: {}, config,
        };
      }
      if (method === 'post' && path === summaryPath + '/recheck') {
        return {
          status: 202,
          statusText: 'Accepted',
          headers: {},
          config,
          data: {
            isReplay: false,
            reconciliationId: 'rec-01',
            recheckMarkerId: 'e'.repeat(64),
            status: 'QUEUED',
            stateRevision: 12,
            stateHash: 'd'.repeat(64),
          },
        };
      }
      throw new Error('Unexpected reconciliation request: ' + method + ' ' + path);
    });
    api.defaults.adapter = adapter;
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000035');

    render(<MemoryRouter initialEntries={[
      '/works/work-01/statistics/scope-01/reconciliations/rec-01',
    ]}>
      <Routes>
        <Route path="/works/:workId/statistics/:scopeAssignmentId/reconciliations/:reconciliationId"
          element={<StatisticsReconciliationDetailPage />} />
      </Routes>
    </MemoryRouter>);

    const recovery = await screen.findByTestId(
      'reconciliation-review-recovery');
    expect(recovery).toHaveAttribute(
      'data-reconciliation-phase', 'REVIEW_RECOVERY');
    expect(recovery).toHaveAttribute(
      'data-review-recovery-reason', 'REVIEW_TARGET_NOT_SIGNABLE');
    expect(recovery).toHaveAttribute(
      'data-review-error-code', 'P10_REVIEW_TARGET_NOT_SIGNABLE');
    expect(recovery).toHaveAttribute(
      'data-review-http-status', String(reviewStatus));
    expect(recovery).toHaveAttribute('data-state-revision', '11');
    expect(recovery).toHaveAttribute('data-state-hash', 'c'.repeat(64));
    expect(within(recovery).getByRole('note'))
      .toHaveTextContent('Review tạm thời không khả dụng');
    expect(within(recovery).getByText(/Evidence artifact: evidence-01/))
      .toBeVisible();
    expect(recovery.querySelector('[data-review-actions]')).toBeNull();
    expect(recovery.querySelector('[data-domain-identities]')).toBeNull();
    expect(screen.queryByText('Phê duyệt độc lập')).not.toBeInTheDocument();
    expect(adapter.mock.calls.map(([config]) => String(config.url)))
      .not.toContain(summaryPath + '/detail');

    const recheck = within(recovery).getByRole('button', {
      name: 'Queue recheck',
    });
    expect(recheck).toHaveAttribute(
      'data-testid', 'reconciliation-recheck');
    fireEvent.click(recheck);
    fireEvent.click(recheck);

    const pending = await screen.findByTestId('reconciliation-pending');
    expect(pending).toHaveAttribute(
      'data-reconciliation-phase', 'PENDING_GENERATION');
    expect(pending).toHaveTextContent('đang tạo generation');
    const rechecks = adapter.mock.calls
      .map(([config]) => config)
      .filter(config => config.method === 'post' &&
        config.url === summaryPath + '/recheck');
    expect(rechecks).toHaveLength(1);
    expect(JSON.parse(String(rechecks[0].data))).toEqual({
      commandId: '00000000-0000-4000-8000-000000000035',
      expectedStateRevision: 11,
      expectedStateHash: 'c'.repeat(64),
    });
    expect(adapter.mock.calls.map(([config]) => String(config.url)))
      .not.toContain(summaryPath + '/detail');
  });
  it.each([
    { reviewStatus: 409, reviewCode: 'P10_UNEXPECTED_REVIEW_CONFLICT' },
    { reviewStatus: 409, reviewCode: undefined },
    { reviewStatus: 412, reviewCode: 'P10_UNEXPECTED_REVIEW_CONFLICT' },
    { reviewStatus: 412, reviewCode: undefined },
    { reviewStatus: 400, reviewCode: 'P10_REVIEW_TARGET_NOT_SIGNABLE' },
  ])(
    'fails closed after interceptor normalization for review status $reviewStatus and code $reviewCode',
    async ({ reviewStatus, reviewCode }) => {
      const summaryPath =
        'works/work-01/statistics/scope-01/reconciliations/rec-01';
      const adapter = vi.fn<AxiosAdapter>(async config => {
        const path = String(config.url);
        const method = String(config.method).toLowerCase();
        if (method === 'get' && path === summaryPath) {
          return {
            data: matchedSummary,
            status: 200, statusText: 'OK', headers: {}, config,
          };
        }
        if (method === 'get' && path.endsWith('/review-decisions')) {
          throw new AxiosError(
            'Review request rejected',
            'ERR_BAD_REQUEST',
            config,
            undefined,
            {
              data: reviewCode == null
                ? { status: reviewStatus }
                : { status: reviewStatus, code: reviewCode },
              status: reviewStatus,
              statusText: 'Rejected',
              headers: {},
              config,
            },
          );
        }
        if (method === 'get' && path.endsWith('/evidence-exports')) {
          return {
            data: { rows: [], total: 0, page: 1, pageSize: 25 },
            status: 200, statusText: 'OK', headers: {}, config,
          };
        }
        throw new Error('Unexpected reconciliation request: ' + method + ' ' + path);
      });
      api.defaults.adapter = adapter;

      const rejected = await readReconciliation(
        'work-01', 'scope-01', 'rec-01').catch(error => error);
      expect(rejected).toMatchObject({ status: reviewStatus });
      expect(rejected.errorCode).toBe(reviewCode);
      expect(adapter.mock.calls.map(([config]) => String(config.url)))
        .not.toContain(summaryPath + '/detail');
    },
  );
  it.each([409, 412])(
    'reloads after normalized stale review %s and retries with the new revision',
    async status => {
    const initialSummary = {
      ...summary,
      stateRevision: 4,
    } satisfies ReconciliationSummary;
    const refreshedSummary = {
      ...summary,
      stateRevision: 5,
    } satisfies ReconciliationSummary;
    const initialReview = {
      ...redactedReview,
      summary: {
        ...redactedReview.summary,
        approvedGateCount: 1,
        gateStates: { ...gateStates, FLOW: 'PENDING' },
      },
      actions: {
        ...redactedReview.actions,
        expectedStateRevision: 4,
        availableGates: ['FLOW'],
      },
    } satisfies ReviewRead;
    const refreshedReview = {
      ...initialReview,
      actions: {
        ...initialReview.actions,
        expectedStateRevision: 5,
      },
    } satisfies ReviewRead;
    let summaryReads = 0;
    vi.spyOn(api, 'get').mockImplementation(async url => {
      const path = String(url);
      if (path.endsWith('/review-decisions')) {
        return { data: summaryReads === 1 ? initialReview : refreshedReview } as never;
      }
      if (path.endsWith('/evidence-exports')) {
        return { data: { rows: [], total: 0, page: 1, pageSize: 25 } } as never;
      }
      summaryReads += 1;
      return { data: summaryReads === 1 ? initialSummary : refreshedSummary } as never;
    });
    const postSpy = vi.spyOn(api, 'post')
      .mockRejectedValueOnce({ status })
      .mockResolvedValueOnce({ data: {
        replayed: false,
        reconciliationId: 'rec-01',
        generationId: 'gen',
        gate: 'FLOW',
        decision: 'APPROVE',
        status: 'ACTIVE',
      } } as never);
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000003');

    render(<MemoryRouter initialEntries={[
      '/works/work-01/statistics/scope-01/reconciliations/rec-01',
    ]}>
      <Routes>
        <Route path="/works/:workId/statistics/:scopeAssignmentId/reconciliations/:reconciliationId"
          element={<StatisticsReconciliationDetailPage />} />
      </Routes>
    </MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Phê duyệt FLOW' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    expect(alert).toHaveAttribute('data-review-error-kind', 'STALE');
    expect(document.querySelector('[data-review-feedback]'))
      .toHaveAttribute('data-review-feedback-kind', 'STALE');
    expect(document.querySelector('[data-review-actions]'))
      .toHaveAttribute('data-expected-state-revision', '5');

    const retry = screen.getByRole('button', { name: 'Phê duyệt FLOW' });
    expect(retry).toBeEnabled();
    fireEvent.click(retry);
    await waitFor(() => expect(postSpy).toHaveBeenCalledTimes(2));
    expect(postSpy).toHaveBeenNthCalledWith(2,
      'works/work-01/statistics/scope-01/reconciliations/rec-01/review-decisions', {
        commandId: '00000000-0000-4000-8000-000000000003',
        gate: 'FLOW',
        decision: 'APPROVE',
        expectedStateRevision: 5,
      });
    },
  );

  it('gates recheck to terminal server-pinned generations', () => {
    expect(canBeginReconciliationRecheck(matchedSummary)).toBe(true);
    expect(canBeginReconciliationRecheck({ ...matchedSummary, status: 'RUNNING' }))
      .toBe(false);
    expect(canBeginReconciliationRecheck({ ...matchedSummary, stateHash: 'client-state' }))
      .toBe(false);
    expect(canBeginReconciliationRecheck({ ...matchedSummary, hasPendingGeneration: true }))
      .toBe(false);
  });

  it('renders the recheck CTA without adding a second create CTA', () => {
    const onRecheck = vi.fn();
    panel(operatorReview, { summary: matchedSummary, onRecheck });
    fireEvent.click(screen.getByRole('button', { name: 'Queue recheck' }));
    expect(onRecheck).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: /create reconciliation/i }))
      .not.toBeInTheDocument();
  });

  it('renders matched successor review supersession from server actions', () => {
    const onSupersede = vi.fn();
    const successorReview = {
      ...operatorReview,
      summary: { ...operatorReview.summary, generationId: 'successor-generation' },
      actions: {
        ...operatorReview.actions,
        canSupersede: true,
        supersessionGenerationIds: ['previous-generation'],
      },
    } satisfies ReviewRead;
    panel(successorReview, { summary: matchedSummary, onSupersede });
    fireEvent.click(screen.getByRole('button', {
      name: 'Supersede review generation previous-generation',
    }));
    expect(onSupersede).toHaveBeenCalledWith('previous-generation', 7);
    expect(screen.getAllByText(/successor-generation/)).toHaveLength(2);
  });

  it('distinguishes domain identity labels', () => {
    panel(operatorReview);
    for (const label of [
      'Statistics configuration (config)',
      'Statistics configuration version (version)',
      'Dynamic Form version (version)',
      'Dynamic Flow instance (instance)',
      'Dynamic Flow step instance (step)',
      'Work assignment (assignment)',
      'Statistics run (run)',
      'Statistics result (result)',
      'Statistics result generation',
      'Reconciliation generation',
      'Source report (report)',
      'Evidence artifact list',
    ]) expect(screen.getAllByText(label).length)
      .toBeGreaterThan(0);
  });

  it('posts recheck and review supersession only to canonical production routes', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000002');
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never);
    await beginReconciliationRecheck('work-01', 'scope-01', 'rec-01',
      matchedSummary);
    await supersedeReconciliationReview('work-01', 'scope-01', 'rec-01',
      'previous-generation', 7);
    expect(postSpy).toHaveBeenNthCalledWith(1,
      'works/work-01/statistics/scope-01/reconciliations/rec-01/recheck', {
        commandId: '00000000-0000-4000-8000-000000000002',
        expectedStateRevision: 7,
        expectedStateHash: 'b'.repeat(64),
      });
    expect(postSpy).toHaveBeenNthCalledWith(2,
      'works/work-01/statistics/scope-01/reconciliations/rec-01/review-supersessions', {
        commandId: '00000000-0000-4000-8000-000000000002',
        previousGenerationId: 'previous-generation',
        expectedStateRevision: 7,
      });
    expect(postSpy.mock.calls.flatMap(call => String(call[0])))
      .not.toContain('/api/testing/');
  });
});

describe('P10-UI evidence export', () => {
  it('P10-UIEXPORT-01 JSON export is explicit', () => {
    const exportFn = vi.fn(); panel(operatorReview, { onExport: exportFn });
    fireEvent.click(screen.getByRole('button', { name: 'Tải JSON' }));
    expect(exportFn).toHaveBeenCalledWith('JSON', true);
  });
  it('P10-UIEXPORT-02 CSV export is explicit', () => {
    const exportFn = vi.fn(); panel(redactedReview, { onExport: exportFn });
    fireEvent.click(screen.getByRole('button', { name: 'Tải CSV' }));
    expect(exportFn).toHaveBeenCalledWith('CSV', false);
  });
  it('P10-UIEXPORT-03 exporting disables duplicate commands', () => {
    panel(operatorReview, { exporting: true });
    expect(screen.getByRole('button', { name: 'Tải JSON' })).toBeDisabled();
    expect(screen.getByText('Đang tạo tệp bằng chứng…')).toBeInTheDocument();
  });
  it('P10-UIEXPORT-04 export failure is announced', () => {
    panel(operatorReview, { exportError: 'Tải thất bại' });
    expect(screen.getByRole('alert')).toHaveTextContent('Tải thất bại');
  });
});

describe('P11 mounted evidence artifact continuity', () => {
  it('lists evidence identity only from server-authorized links', () => {
    const onDownload = vi.fn();
    panel(operatorReview, {
      evidence: { rows: [evidenceArtifact], total: 1, page: 1, pageSize: 25 },
      onDownload,
    });
    const artifact = document.querySelector('[data-evidence-artifact="evidence-01"]');
    expect(artifact).toHaveAttribute('data-reconciliation-generation', 'gen');
    expect(artifact).toHaveAttribute('data-manifest-sha256', 'm'.repeat(64));
    expect(artifact).toHaveAttribute('data-content-sha256', 'c'.repeat(64));
    expect(artifact?.querySelector('[data-evidence-lifecycle="created"]'))
      .toHaveAttribute('dateTime', evidenceArtifact.createdAtUtc);
    expect(artifact?.querySelector('[data-evidence-lifecycle="expires"]'))
      .toHaveAttribute('dateTime', evidenceArtifact.expiresAtUtc);
    expect(screen.getByRole('button', { name: 'evidence-01' }))
      .toHaveAttribute('data-domain-link', 'evidence-artifact');
    fireEvent.click(screen.getByRole('button', {
      name: 'Download evidence artifact evidence-01',
    }));
    expect(onDownload).toHaveBeenCalledWith(evidenceArtifact);
    expect(screen.queryByRole('button', { name: /revoke/i }))
      .not.toBeInTheDocument();
  });
  it('fails closed when the server does not authorize artifact navigation', () => {
    panel(operatorReview, {
      evidence: {
        rows: [{ ...evidenceArtifact, links: [] }],
        total: 1, page: 1, pageSize: 25,
      },
    });
    expect(screen.queryByRole('link', { name: 'evidence-01' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Download evidence artifact evidence-01',
    })).not.toBeInTheDocument();
  });
  it('fails closed when an authorized navigation link targets another origin', () => {
    panel(operatorReview, {
      evidence: {
        rows: [{
          ...evidenceArtifact,
          links: [{
            rel: 'READBACK',
            href: 'https://untrusted.invalid/api/evidence-01',
            method: 'GET',
          }],
        }],
        total: 1, page: 1, pageSize: 25,
      },
    });
    expect(screen.queryByRole('link', { name: 'evidence-01' }))
      .not.toBeInTheDocument();
  });
  it('re-uses the server download href and surfaces permission revocation', async () => {
    const denied = { response: { status: 404 } };
    const getSpy = vi.spyOn(api, 'get').mockRejectedValue(denied);
    await expect(downloadEvidenceExport(evidenceArtifact)).rejects.toBe(denied);
    expect(getSpy).toHaveBeenCalledWith(
      'https://localhost:7232/api/server-owned/evidence-01/download', { responseType: 'blob' });
  });
});

describe('P10-UI accessibility', () => {
  it('P10-UIA11Y-01 detail article has an accessible heading', () => {
    panel(operatorReview); expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chi tiết');
  });
  it('P10-UIA11Y-02 exactly eight column headers are exposed', () => {
    render(<MemoryRouter><ReconciliationTable rows={[row]} /></MemoryRouter>);
    const headers = screen.getAllByRole('columnheader'); expect(headers).toHaveLength(8);
    expect(headers.map(value => value.textContent)).toEqual(RECONCILIATION_COLUMNS);
  });
  it('P10-UIA11Y-03 reconciliation table has a caption', () => {
    render(<MemoryRouter><ReconciliationTable rows={[row]} /></MemoryRouter>);
    expect(screen.getByText('Danh sách đối soát')).toBeInTheDocument();
  });
  it('P10-UIA11Y-04 async states use polite live regions', () => {
    state('RETRYING'); expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
  it('P10-UIA11Y-05 controls use native keyboard buttons', () => {
    panel(operatorReview); expect(screen.getByRole('button', { name: 'Tải JSON' }).tagName).toBe('BUTTON');
  });
  it('P10-UIA11Y-06 source disclosure has an accessible summary', () => {
    panel(operatorReview); const details = screen.getByText('Nguồn và provenance').closest('details');
    expect(details).not.toBeNull();
    expect(within(details!).getByText('Source report (report)')).toBeInTheDocument();
  });
});

describe('P11 reconciliation production trigger contract', () => {
  const query = new URLSearchParams({
    p9ResultKind: 'DIRECT',
    p9ResultId: '507f1f77bcf86cd799439011',
    p9RunId: '507f1f77bcf86cd799439011',
    conceptKey: 'field-amount',
    grain: 'MONTH',
    periodInstanceKey: 'MONTH:2026-08',
    fieldId: 'field-01',
    fieldKey: 'amount',
    periodKey: '2026-08',
    exportId: '507f1f77bcf86cd799439099',
  });
  const binding = {
    p9ResultKind: 'DIRECT' as const,
    p9ResultId: '507f1f77bcf86cd799439011',
    p9RunId: '507f1f77bcf86cd799439011',
    conceptKey: 'field-amount',
    grain: 'MONTH',
    filter: {
      periodInstanceKey: 'MONTH:2026-08',
      fieldId: 'field-01',
      fieldKey: 'amount',
      bucketKey: null,
      periodKey: '2026-08',
    },
    exportId: '507f1f77bcf86cd799439099',
  };

  it('binds the exact DIRECT_FIELD filter and export selected on the P9 result', () => {
    expect(directReconciliationWorkspaceBinding(query)).toEqual(binding);
    expect(directReconciliationWorkspaceBinding(new URLSearchParams({
      ...Object.fromEntries(query),
      p9RunId: '507f1f77bcf86cd799439012',
    }))).toBeNull();
    expect(directReconciliationWorkspaceBinding(new URLSearchParams({
      ...Object.fromEntries(query),
      bucketKey: 'client-injected',
    }))).toBeNull();
  });

  it('owns the preflight then create sequence in the canonical workspace', async () => {
    const created = { ...summary, p9ResultKind: 'DIRECT' };
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { rows: [], total: 0, page: 1, pageSize: 25 },
    });
    const postSpy = vi.spyOn(api, 'post')
      .mockResolvedValueOnce({
        data: {
          schemaVersion: 'P10_CAPTURE_PLAN_PREFLIGHT_V1',
          capturePlanToken: 'opaque-single-use-token',
          planSha256: 'a'.repeat(64),
          expiresAtUtc: '2099-08-13T10:06:00Z',
        },
      })
      .mockResolvedValueOnce({ data: created });

    const root = '/works/work-01/statistics/scope-01/reconciliations';
    render(<MemoryRouter initialEntries={[root + '?' + query]}>
      <Routes>
        <Route
          path="/works/:workId/statistics/:scopeAssignmentId/reconciliations"
          element={<StatisticsReconciliationsPage />}
        />
        <Route
          path="/works/:workId/statistics/:scopeAssignmentId/reconciliations/:reconciliationId"
          element={<LocationProbe />}
        />
      </Routes>
    </MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', {
      name: 'Tạo đối soát',
    }));
    await waitFor(() => expect(postSpy).toHaveBeenCalledTimes(2));
    expect(postSpy.mock.calls[0]).toEqual([
      'works/work-01/statistics/scope-01/reconciliations/capture-plan-preflight',
      binding,
    ]);
    expect(postSpy.mock.calls[1][0]).toBe(
      'works/work-01/statistics/scope-01/reconciliations',
    );
    expect(postSpy.mock.calls[1][1]).toEqual({
      commandId: expect.any(String),
      p9ResultKind: 'DIRECT',
      p9ResultId: binding.p9ResultId,
      p9RunId: binding.p9RunId,
      conceptKey: binding.conceptKey,
      grain: binding.grain,
      filter: binding.filter,
      capturePlanToken: 'opaque-single-use-token',
    });
    expect(postSpy.mock.calls[1][1]).not.toHaveProperty('actualCapturePlan');
    expect(postSpy.mock.calls[1][1]).not.toHaveProperty('exportId');
    expect(postSpy.mock.calls[1][1]).not.toHaveProperty('actor');
    expect(await screen.findByTestId('current-location')).toHaveTextContent(
      root + '/rec-01',
    );
  });

  it('API helpers use only the canonical production routes', async () => {
    const postSpy = vi.spyOn(api, 'post')
      .mockResolvedValueOnce({
        data: {
          schemaVersion: 'P10_CAPTURE_PLAN_PREFLIGHT_V1',
          capturePlanToken: 'opaque-single-use-token',
          planSha256: 'a'.repeat(64),
          expiresAtUtc: '2099-08-13T10:06:00Z',
        },
      })
      .mockResolvedValueOnce({ data: { ...summary, p9ResultKind: 'DIRECT' } });
    await preflightDirectReconciliationCapturePlan(
      'work-01',
      'scope-01',
      binding,
    );
    await createDirectReconciliation('work-01', 'scope-01', {
      commandId: 'p11-reconcile-command',
      p9ResultKind: 'DIRECT',
      p9ResultId: binding.p9ResultId,
      p9RunId: binding.p9RunId,
      conceptKey: binding.conceptKey,
      grain: binding.grain,
      filter: binding.filter,
      capturePlanToken: 'opaque-single-use-token',
    });
    expect(postSpy.mock.calls.map(call => String(call[0]))).toEqual([
      'works/work-01/statistics/scope-01/reconciliations/capture-plan-preflight',
      'works/work-01/statistics/scope-01/reconciliations',
    ]);
    expect(postSpy.mock.calls.some(call =>
      String(call[0]).includes('/api/testing/'))).toBe(false);
  });
});
describe('P11 authenticated evidence navigation regression', () => {
  it('loads source readback inside the page with bearer authentication', async () => {
    setTokenToActiveStorage('local-test-token');
    const adapter = vi.fn(async config => ({
      data: { sourceReportId: 'authorized-report', sourcePayloadRevision: 4 },
      status: 200, statusText: 'OK', headers: {}, config,
    }));
    api.defaults.adapter = adapter;
    const view = panel(operatorReview);
    fireEvent.click(screen.getByRole('button', { name: 'report-secret' }));
    expect(await screen.findByRole('region', {
      name: 'Dữ liệu do máy chủ cấp: report-secret',
    })).toHaveTextContent('authorized-report');
    const config = adapter.mock.calls[0][0];
    expect(config.method).toBe('get');
    expect(api.getUri(config)).toBe('https://localhost:7232/api/source');
    expect(config.headers.Authorization).toBe('Bearer local-test-token');
    expect(view.container.querySelector('a[href^="https://localhost:7232/api"]')).toBeNull();
  });

  it('loads artifact readback through the authenticated client, not document navigation', async () => {
    setTokenToActiveStorage('local-test-token');
    const adapter = vi.fn(async config => ({
      data: evidenceArtifact, status: 200, statusText: 'OK', headers: {}, config,
    }));
    api.defaults.adapter = adapter;
    panel(operatorReview, {
      evidence: { rows: [evidenceArtifact], total: 1, page: 1, pageSize: 25 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'evidence-01' }));
    expect(await screen.findByRole('region', {
      name: 'Dữ liệu do máy chủ cấp: evidence-01',
    })).toHaveTextContent(evidenceArtifact.manifestSha256);
    const config = adapter.mock.calls[0][0];
    expect(config.method).toBe('get');
    expect(api.getUri(config)).toBe('https://localhost:7232/api/server-owned/evidence-01');
    expect(config.headers.Authorization).toBe('Bearer local-test-token');
  });

  it('POST metadata only navigates to the existing explicit export controls', () => {
    const get = vi.spyOn(api, 'get');
    const post = vi.spyOn(api, 'post');
    const onExport = vi.fn();
    const postSummary = {
      ...operatorSummary,
      presentation: {
        ...operatorPresentation,
        rows: [{
          ...operatorPresentation.rows[0],
          metadata: {
            ...operatorPresentation.rows[0].metadata,
            evidenceLinks: [{
              rel: 'EVIDENCE_EXPORT', href: '/api/evidence-exports', method: 'POST' as const,
            }],
          },
        }],
      },
    };
    panel(operatorReview, { summary: postSummary, onExport });
    const commandLink = screen.getByRole('link', { name: 'Chọn định dạng xuất bằng chứng' });
    expect(commandLink).toHaveAttribute('href', '#evidence-export-title');
    fireEvent.click(commandLink);
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    expect(onExport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tải JSON' }));
    expect(onExport).toHaveBeenCalledExactlyOnceWith('JSON', true);
  });

  it.each([401, 403, 404])('clears a prior readback when re-authorization returns %s', async status => {
    const get = vi.spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { proof: 'previously-authorized-readback' } })
      .mockRejectedValueOnce({ status });
    panel(operatorReview, {
      evidence: { rows: [evidenceArtifact], total: 1, page: 1, pageSize: 25 },
    });
    const read = screen.getByRole('button', { name: 'evidence-01' });
    fireEvent.click(read);
    expect(await screen.findByRole('region', {
      name: 'Dữ liệu do máy chủ cấp: evidence-01',
    })).toHaveTextContent('previously-authorized-readback');
    fireEvent.click(read);
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent(status === 401
      ? 'Phiên đăng nhập không còn hợp lệ' : 'Máy chủ không cho phép đọc');
    expect(screen.queryByRole('region', {
      name: 'Dữ liệu do máy chủ cấp: evidence-01',
    })).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403, 404])('shows the correct download denial for status %s without a Blob', async status => {
    const createObjectURL = vi.fn();
    const revokeObjectURL = vi.fn();
    const NativeURL = URL;
    vi.stubGlobal('URL', class extends NativeURL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });
    vi.spyOn(api, 'get').mockImplementation(async url => {
      const path = String(url);
      if (path.endsWith('/download')) throw { status };
      if (path.endsWith('/review-decisions')) return { data: redactedReview } as never;
      if (path.endsWith('/evidence-exports')) return { data: {
        rows: [evidenceArtifact], total: 1, page: 1, pageSize: 25,
      } } as never;
      return { data: summary } as never;
    });
    render(<MemoryRouter initialEntries={[
      '/works/work-01/statistics/scope-01/reconciliations/rec-01',
    ]}><Routes><Route
      path="/works/:workId/statistics/:scopeAssignmentId/reconciliations/:reconciliationId"
      element={<StatisticsReconciliationDetailPage />}
    /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', {
      name: 'Download evidence artifact evidence-01',
    }));
    expect(await screen.findByRole('alert')).toHaveTextContent(status === 401
      ? 'requires a current authenticated session' : 'permission re-authorization');
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it('does not expose read or download controls for an external artifact href', () => {
    const get = vi.spyOn(api, 'get');
    panel(operatorReview, {
      evidence: { rows: [{
        ...evidenceArtifact,
        links: [
          { rel: 'READBACK', href: 'https://untrusted.invalid/api/read', method: 'GET' },
          { rel: 'DOWNLOAD', href: 'https://untrusted.invalid/api/download', method: 'GET' },
        ],
      }], total: 1, page: 1, pageSize: 25 },
    });
    expect(screen.queryByRole('button', { name: 'evidence-01' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Download evidence artifact evidence-01',
    })).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });
});

describe('P11 canonical reconciliation table navigation', () => {
  function Location() {
    return <output data-testid="current-route">{useLocation().pathname}</output>;
  }
  const root = '/works/work-01/statistics/scope-01/reconciliations';
  it.each([root, root + '/rec-01'])('keeps the same record when opened from %s', initialEntry => {
    render(<MemoryRouter initialEntries={[initialEntry]}>
      <Location />
      <Routes>
        <Route path="/works/:workId/statistics/:scopeAssignmentId/reconciliations"
          element={<ReconciliationTable rows={[row]} />} />
        <Route path="/works/:workId/statistics/:scopeAssignmentId/reconciliations/:reconciliationId"
          element={<ReconciliationTable rows={[row]} />} />
      </Routes>
    </MemoryRouter>);
    const identity = screen.getByRole('link', { name: 'WIRE_IDENTITY' });
    expect(identity).toHaveAttribute('href', root + '/rec-01');
    fireEvent.click(identity);
    expect(screen.getByTestId('current-route')).toHaveTextContent(root + '/rec-01');
    expect(screen.getByTestId('current-route').textContent).not.toContain('/rec-01/rec-01');
  });
});
