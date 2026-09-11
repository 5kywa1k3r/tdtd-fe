import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../src/api/base/axios';
import { readReconciliation, type ReconciliationSummary } from '../src/api/reconciliationApi';
import {
  canBeginReconciliationRecheck,
  ReconciliationReviewRecoveryPanel,
  StatisticsReconciliationDetailPage,
} from '../src/pages/works/reconciliation/ReconciliationPages';

const base = 'works/work-01/statistics/scope-01/reconciliations/rec-01';
const summary: ReconciliationSummary = {
  reconciliationId: 'rec-01', workId: 'work-01', scopeAssignmentId: 'scope-01',
  p9ResultKind: 'DIRECT', status: 'STALE', stateRevision: 17, stateHash: 'a'.repeat(64),
  hasCurrentGeneration: true, hasPendingGeneration: false,
  createdAtUtc: '2026-09-07T00:00:00Z', updatedAtUtc: '2026-09-07T00:01:00Z',
  presentation: {
    schemaVersion: 'P10_RECONCILIATION_PRESENTATION_V1', detailLevel: 'REDACTED',
    recheck: { baseEligible: true, inProgress: false }, rows: [],
  },
};
const originalAdapter = api.defaults.adapter;
function projected(status: string, baseEligible: boolean, inProgress = false): ReconciliationSummary {
  return { ...summary, status, presentation: { ...summary.presentation, recheck: { baseEligible, inProgress } } };
}
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { config, data, status, statusText: 'OK', headers: {} };
}
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('server-projected recheck eligibility and supersession completion', () => {
  it.each(['MATCHED', 'MISMATCHED', 'STALE', 'FAILED'])(
    'keeps %s action closed when its current base is unsupported', status => {
      expect(canBeginReconciliationRecheck(projected(status, false))).toBe(false);
    },
  );

  it('requires explicit server eligibility and rejects an active marker even with a terminal tuple', () => {
    expect(canBeginReconciliationRecheck(summary)).toBe(true);
    expect(canBeginReconciliationRecheck({
      ...summary, presentation: { ...summary.presentation, recheck: undefined },
    })).toBe(false);
    expect(canBeginReconciliationRecheck(projected('STALE', true, true))).toBe(false);
    expect(canBeginReconciliationRecheck({ ...summary, hasCurrentGeneration: false })).toBe(false);
  });

  it.each(['MATCHED', 'STALE'])(
    'reads only summary while terminal %s has an active supersession marker', async status => {
      const adapter = vi.fn<AxiosAdapter>(async config => {
        if (config.method !== 'get' || config.url !== base) throw new Error('Dependent read before marker completion');
        return response(config, projected(status, false, true));
      });
      api.defaults.adapter = adapter;
      const value = await readReconciliation('work-01', 'scope-01', 'rec-01');
      expect(value).toMatchObject({ phase: 'PENDING_GENERATION', detail: null, review: null, evidence: null });
      expect(adapter).toHaveBeenCalledOnce();
    },
  );

  it('polls terminal supersession until marker clears without posting another command', async () => {
    vi.useFakeTimers();
    let reads = 0;
    const adapter = vi.fn<AxiosAdapter>(async config => {
      if (config.method === 'get' && config.url === base) {
        reads += 1;
        return response(config, reads === 1
          ? projected('STALE', false, true)
          : { ...summary, stateRevision: 18, stateHash: 'b'.repeat(64) });
      }
      if (config.method === 'get' && config.url === base + '/review-decisions') {
        throw new AxiosError('Not signable', 'ERR_BAD_REQUEST', config, undefined,
          response(config, { status: 409, code: 'P10_REVIEW_TARGET_NOT_SIGNABLE' }, 409));
      }
      if (config.method === 'get' && config.url === base + '/evidence-exports') {
        return response(config, { rows: [], total: 0, page: 1, pageSize: 25 });
      }
      throw new Error('Unexpected operation during terminal supersession');
    });
    api.defaults.adapter = adapter;
    await act(async () => {
      render(<MemoryRouter initialEntries={['/' + base]}>
        <Routes>
          <Route path="/works/:workId/statistics/:scopeAssignmentId/reconciliations/:reconciliationId"
            element={<StatisticsReconciliationDetailPage />} />
        </Routes>
      </MemoryRouter>);
    });
    expect(screen.getByTestId('reconciliation-pending')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Queue recheck' })).toBeNull();
    expect(adapter).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(screen.getByTestId('reconciliation-review-recovery')).toHaveAttribute('data-state-revision', '18');
    expect(screen.getByRole('button', { name: 'Queue recheck' })).toBeEnabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(reads).toBe(2);
    expect(adapter.mock.calls.map(([config]) => config.method + ' ' + config.url)).toEqual([
      'get ' + base,
      'get ' + base,
      'get ' + base + '/review-decisions',
      'get ' + base + '/evidence-exports',
    ]);
  });

  it('does not tell the user to queue an unsupported STALE recheck', () => {
    render(<ReconciliationReviewRecoveryPanel
      summary={projected('STALE', false)} evidence={null}
      reviewStatus={409} reviewCode="P10_REVIEW_TARGET_NOT_SIGNABLE" />);
    expect(screen.queryByRole('button', { name: 'Queue recheck' })).toBeNull();
    expect(screen.getByRole('note')).toHaveTextContent('chưa xác nhận generation này đủ điều kiện recheck');
  });
});
