import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../src/api/base/axios';
import { beginReconciliationRecheck, type ReconciliationSummary } from '../src/api/reconciliationApi';
import { StatisticsReconciliationDetailPage } from '../src/pages/works/reconciliation/ReconciliationPages';
import { clearAuthStorage } from '../src/stores/authStorage';

const base = 'works/work-01/statistics/scope-01/reconciliations/rec-01';
const recoverySummary = {
  reconciliationId: 'rec-01', workId: 'work-01', scopeAssignmentId: 'scope-01',
  p9ResultKind: 'DIRECT', status: 'MATCHED', stateRevision: 11,
  stateHash: 'c'.repeat(64), hasCurrentGeneration: true, hasPendingGeneration: false,
  createdAtUtc: '2026-09-07T00:00:00Z', updatedAtUtc: '2026-09-07T00:00:00Z',
  presentation: {
    schemaVersion: 'P10_RECONCILIATION_PRESENTATION_V1',
    recheck: { baseEligible: true, inProgress: false }, detailLevel: 'REDACTED', rows: [],
  },
} satisfies ReconciliationSummary;
const refreshedSummary = {
  ...recoverySummary, stateRevision: 12, stateHash: 'd'.repeat(64),
} satisfies ReconciliationSummary;
const pendingSummary = {
  ...refreshedSummary, status: 'QUEUED', stateRevision: 13,
  stateHash: 'e'.repeat(64), hasPendingGeneration: true,
} satisfies ReconciliationSummary;
const firstCommandId = '00000000-0000-4000-8000-000000000039';
const secondCommandId = '00000000-0000-4000-8000-000000000040';
const originalAdapter = api.defaults.adapter;

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { config, data, status, statusText: status === 202 ? 'Accepted' : 'OK', headers: {} };
}
function rejectProblem(config: InternalAxiosRequestConfig, status: number, code: string): never {
  throw new AxiosError('Request rejected', 'ERR_BAD_REQUEST', config, undefined, {
    ...response(config, { status, code, title: 'Synthetic command rejected' }, status),
    statusText: 'Rejected',
  });
}
function mountDetail() {
  return render(<MemoryRouter initialEntries={['/' + base]}>
    <Routes>
      <Route path="/works/:workId/statistics/:scopeAssignmentId/reconciliations/:reconciliationId"
        element={<StatisticsReconciliationDetailPage />} />
    </Routes>
  </MemoryRouter>);
}
function recoveryReads(config: InternalAxiosRequestConfig, summary: ReconciliationSummary) {
  if (config.method === 'get' && config.url === base) return response(config, summary);
  if (config.method === 'get' && config.url === base + '/review-decisions') {
    return rejectProblem(config, 409, 'P10_REVIEW_TARGET_NOT_SIGNABLE');
  }
  if (config.method === 'get' && config.url === base + '/evidence-exports') {
    return response(config, { rows: [], total: 0, page: 1, pageSize: 25 });
  }
  throw new Error('Unexpected request: ' + config.method + ' ' + config.url);
}
function accepted(config: InternalAxiosRequestConfig) {
  return response(config, {
    isReplay: false, reconciliationId: 'rec-01', recheckMarkerId: 'f'.repeat(64),
    status: pendingSummary.status, stateRevision: pendingSummary.stateRevision,
    stateHash: pendingSummary.stateHash,
  }, 202);
}
function postCalls(adapter: ReturnType<typeof vi.fn<AxiosAdapter>>) {
  return adapter.mock.calls.map(([config]) => config).filter(config => config.method === 'post');
}
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  clearAuthStorage();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('P11 attempt039 recovery recheck failures through the real Axios interceptor', () => {
  it('preserves HTTP 400 and its exact problem code at the API boundary', async () => {
    const adapter = vi.fn<AxiosAdapter>(async config =>
      rejectProblem(config, 400, 'P10_RECHECK_COMMAND_INVALID'));
    api.defaults.adapter = adapter;
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(firstCommandId);

    await expect(beginReconciliationRecheck('work-01', 'scope-01', 'rec-01', recoverySummary))
      .rejects.toMatchObject({ status: 400, errorCode: 'P10_RECHECK_COMMAND_INVALID' });
    expect(JSON.parse(String(postCalls(adapter)[0].data))).toEqual({
      commandId: firstCommandId, expectedStateRevision: 11, expectedStateHash: 'c'.repeat(64),
    });
  });

  it('keeps recovery and exposes a recheck error after 400 without polling or dependent reads, then allows a fresh user retry', async () => {
    let rejected = false;
    let queued = false;
    const adapter = vi.fn<AxiosAdapter>(async config => {
      if (config.method === 'post' && config.url === base + '/recheck') {
        if (!rejected) {
          rejected = true;
          return rejectProblem(config, 400, 'P10_RECHECK_COMMAND_INVALID');
        }
        queued = true;
        return accepted(config);
      }
      return recoveryReads(config, queued ? pendingSummary : recoverySummary);
    });
    api.defaults.adapter = adapter;
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(firstCommandId).mockReturnValueOnce(secondCommandId);
    mountDetail();
    const recovery = await screen.findByTestId('reconciliation-review-recovery');
    const requestsBeforeClick = adapter.mock.calls.length;
    fireEvent.click(screen.getByTestId('reconciliation-recheck'));

    const error = await screen.findByRole('alert');
    expect(error).toHaveAttribute('data-recheck-error-kind', 'ERROR');
    expect(error).toHaveTextContent(/recheck/i);
    expect(recovery).toHaveAttribute('data-review-recovery-reason', 'REVIEW_TARGET_NOT_SIGNABLE');
    expect(recovery).toHaveAttribute('data-state-revision', '11');
    expect(screen.queryByTestId('reconciliation-pending')).toBeNull();
    expect(screen.getByTestId('reconciliation-recheck')).toBeEnabled();
    vi.useFakeTimers();
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(adapter.mock.calls.slice(requestsBeforeClick).map(([config]) => config.method + ' ' + config.url))
      .toEqual(['post ' + base + '/recheck']);

    await act(async () => {
      fireEvent.click(screen.getByTestId('reconciliation-recheck'));
      await Promise.resolve();
    });
    expect(screen.getByTestId('reconciliation-pending')).toBeVisible();
    expect(postCalls(adapter)).toHaveLength(2);
    expect(JSON.parse(String(postCalls(adapter)[1].data))).toEqual({
      commandId: secondCommandId, expectedStateRevision: 11, expectedStateHash: 'c'.repeat(64),
    });
    const requestsAfterAcceptance = adapter.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(adapter.mock.calls.slice(requestsAfterAcceptance).map(([config]) => config.method + ' ' + config.url))
      .toEqual(['get ' + base, 'get ' + base]);
    expect(screen.queryByTestId('reconciliation-review-recovery')).toBeNull();
    expect(document.querySelector('[data-review-actions]')).toBeNull();
  });

  it.each([409, 412])('refreshes stale pins after recheck %s and only retries when the user clicks again', async status => {
    let postCount = 0;
    const adapter = vi.fn<AxiosAdapter>(async config => {
      if (config.method === 'post' && config.url === base + '/recheck') {
        postCount += 1;
        if (postCount === 1) return rejectProblem(config, status, 'P10_RECHECK_STATE_MISMATCH');
        return accepted(config);
      }
      return recoveryReads(config, postCount === 0 ? recoverySummary
        : postCount === 1 ? refreshedSummary : pendingSummary);
    });
    api.defaults.adapter = adapter;
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(firstCommandId).mockReturnValueOnce(secondCommandId);
    mountDetail();
    await screen.findByTestId('reconciliation-review-recovery');
    fireEvent.click(screen.getByTestId('reconciliation-recheck'));

    await waitFor(() => expect(screen.getByTestId('reconciliation-review-recovery'))
      .toHaveAttribute('data-state-revision', '12'));
    expect(screen.getByRole('alert')).toHaveAttribute('data-recheck-error-kind', 'STALE');
    expect(screen.getByTestId('reconciliation-review-recovery')).toHaveAttribute('data-state-hash', 'd'.repeat(64));
    expect(postCalls(adapter)).toHaveLength(1);
    expect(screen.queryByTestId('reconciliation-pending')).toBeNull();
    fireEvent.click(screen.getByTestId('reconciliation-recheck'));
    await screen.findByTestId('reconciliation-pending');
    expect(postCalls(adapter)).toHaveLength(2);
    expect(JSON.parse(String(postCalls(adapter)[1].data))).toEqual({
      commandId: secondCommandId, expectedStateRevision: 12, expectedStateHash: 'd'.repeat(64),
    });
    expect(adapter.mock.calls.map(([config]) => config.url)).not.toContain(base + '/detail');
  });

  it.each([403, 404, 500])('keeps a rejected recheck %s out of pending without extra reads', async status => {
    const adapter = vi.fn<AxiosAdapter>(async config => {
      if (config.method === 'post' && config.url === base + '/recheck') {
        return rejectProblem(config, status, 'P10_RECHECK_REJECTED');
      }
      return recoveryReads(config, recoverySummary);
    });
    api.defaults.adapter = adapter;
    mountDetail();
    await screen.findByTestId('reconciliation-review-recovery');
    const before = adapter.mock.calls.length;
    fireEvent.click(screen.getByTestId('reconciliation-recheck'));
    const error = await screen.findByRole('alert');
    expect(error).toHaveAttribute('data-recheck-error-kind', status === 500 ? 'ERROR' : 'FORBIDDEN');
    expect(screen.queryByTestId('reconciliation-pending')).toBeNull();
    expect(screen.getByTestId('reconciliation-recheck')).toBeEnabled();
    expect(adapter.mock.calls.slice(before).map(([config]) => config.method + ' ' + config.url))
      .toEqual(['post ' + base + '/recheck']);
  });

  it('disables a double click while 202 is unresolved and polls only summary after acceptance', async () => {
    let acceptRequest: (() => void) | undefined;
    let queued = false;
    const adapter = vi.fn<AxiosAdapter>(async config => {
      if (config.method === 'post' && config.url === base + '/recheck') {
        await new Promise<void>(resolve => { acceptRequest = resolve; });
        queued = true;
        return accepted(config);
      }
      return recoveryReads(config, queued ? pendingSummary : recoverySummary);
    });
    api.defaults.adapter = adapter;
    mountDetail();
    await screen.findByTestId('reconciliation-review-recovery');
    const before = adapter.mock.calls.length;
    const recheck = screen.getByTestId('reconciliation-recheck');
    fireEvent.click(recheck);
    fireEvent.click(recheck);
    await waitFor(() => expect(postCalls(adapter)).toHaveLength(1));
    expect(recheck).toBeDisabled();
    expect(screen.queryByTestId('reconciliation-pending')).toBeNull();
    expect(adapter.mock.calls.slice(before)).toHaveLength(1);
    vi.useFakeTimers();
    await act(async () => {
      acceptRequest?.();
      await Promise.resolve();
    });
    expect(screen.getByTestId('reconciliation-pending')).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(postCalls(adapter)).toHaveLength(1);
    expect(adapter.mock.calls.slice(before + 1).map(([config]) => config.method + ' ' + config.url))
      .toEqual(['get ' + base, 'get ' + base, 'get ' + base]);
  });
  it.each([403, 404, 500])('removes stale command controls when the refresh after a CAS conflict fails with %s', async refreshStatus => {
    let staleRejected = false;
    const adapter = vi.fn<AxiosAdapter>(async config => {
      if (config.method === 'post' && config.url === base + '/recheck') {
        staleRejected = true;
        return rejectProblem(config, 409, 'P10_RECHECK_STATE_MISMATCH');
      }
      if (staleRejected && config.method === 'get' && config.url === base) {
        return rejectProblem(config, refreshStatus, 'SYNTHETIC_REFRESH_FAILURE');
      }
      return recoveryReads(config, recoverySummary);
    });
    api.defaults.adapter = adapter;
    mountDetail();
    await screen.findByTestId('reconciliation-review-recovery');
    const before = adapter.mock.calls.length;
    fireEvent.click(screen.getByTestId('reconciliation-recheck'));
    await waitFor(() => expect(screen.queryByTestId('reconciliation-review-recovery')).toBeNull());
    expect(screen.queryByTestId('reconciliation-recheck')).toBeNull();
    expect(screen.queryByTestId('reconciliation-pending')).toBeNull();
    expect(screen.queryByText(/dữ liệu mới nhất đã được tải lại/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeEnabled();
    expect(adapter.mock.calls.slice(before).map(([config]) => config.method + ' ' + config.url))
      .toEqual(['post ' + base + '/recheck', 'get ' + base]);
    expect(postCalls(adapter)).toHaveLength(1);
  });

  it('keeps the one POST guard while a stale refresh is delayed and accepts a pending state discovered by that refresh', async () => {
    let staleRejected = false;
    let releaseRefresh: (() => void) | undefined;
    const adapter = vi.fn<AxiosAdapter>(async config => {
      if (config.method === 'post' && config.url === base + '/recheck') {
        staleRejected = true;
        return rejectProblem(config, 412, 'P10_RECHECK_STATE_MISMATCH');
      }
      if (staleRejected && config.method === 'get' && config.url === base) {
        await new Promise<void>(resolve => { releaseRefresh = resolve; });
        return response(config, pendingSummary);
      }
      return recoveryReads(config, recoverySummary);
    });
    api.defaults.adapter = adapter;
    mountDetail();
    await screen.findByTestId('reconciliation-review-recovery');
    const recheck = screen.getByTestId('reconciliation-recheck');
    fireEvent.click(recheck);
    await waitFor(() => expect(releaseRefresh).toBeTypeOf('function'));
    fireEvent.click(recheck);
    expect(recheck).toBeDisabled();
    expect(postCalls(adapter)).toHaveLength(1);
    await act(async () => { releaseRefresh?.(); });
    expect(screen.getByTestId('reconciliation-pending')).toBeVisible();
    expect(screen.queryByTestId('reconciliation-recheck')).toBeNull();
    expect(postCalls(adapter)).toHaveLength(1);
  });

  it('does not treat a failed read after accepted 202 as a rejected POST or issue another recheck', async () => {
    let acceptedPost = false;
    let afterQueueReads = 0;
    const adapter = vi.fn<AxiosAdapter>(async config => {
      if (config.method === 'post' && config.url === base + '/recheck') {
        acceptedPost = true;
        return accepted(config);
      }
      if (acceptedPost && config.method === 'get' && config.url === base) {
        afterQueueReads += 1;
        if (afterQueueReads === 1) return rejectProblem(config, 409, 'SYNTHETIC_OBSERVER_CONFLICT');
        return response(config, pendingSummary);
      }
      return recoveryReads(config, recoverySummary);
    });
    api.defaults.adapter = adapter;
    mountDetail();
    await screen.findByTestId('reconciliation-review-recovery');
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(screen.getByTestId('reconciliation-recheck'));
      await Promise.resolve();
    });
    expect(screen.getByTestId('reconciliation-pending')).toBeVisible();
    expect(afterQueueReads).toBe(1);
    expect(postCalls(adapter)).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(afterQueueReads).toBe(2);
    expect(postCalls(adapter)).toHaveLength(1);
    expect(screen.getByTestId('reconciliation-pending')).toBeVisible();
  });

});
