import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  beginReconciliationRecheck,
  createDirectReconciliation,
  createEvidenceExport,
  downloadEvidenceExport,
  listReconciliations,
  preflightDirectReconciliationCapturePlan,
  readReconciliation,
  readAuthorizedReconciliationLink,
  RECONCILIATION_REVIEW_GATES,
  submitReviewDecision,
  supersedeReconciliationReview,
  type EvidenceArtifact,
  type DirectReconciliationCapturePlanPreflightRequest,
  type EvidenceArtifactPage,
  type ReconciliationDetail,
  type ReconciliationPresentation,
  type ReconciliationPresentationLink,
  type ReconciliationPresentationRow,
  type ReconciliationReviewDecision,
  type ReconciliationReviewGate,
  type ReconciliationSummary,
  type ReviewRead,
} from '../../../api/reconciliationApi';
import { resolveAuthorizedApiHref } from '../../../api/base/axios';

import DomainContextStrip from '../../../components/navigation/DomainContextStrip';
import { dynamicFormPath } from '../../../routes/dynamicFormRoutes';
import { dynamicFlowRuntimePath, dynamicFlowVersionPath } from '../../../routes/dynamicFlowRoutes';
import { statRunResultPath } from '../statisticsRun/statRunUiModel';
export const RECONCILIATION_COLUMNS = [
  'Identity', 'Config', 'Expected', 'Actual', 'Delta',
  'Freshness', 'Permission', 'Verdict',
] as const;

export type ReconciliationUiState =
  | 'LOADING' | 'READY' | 'EMPTY' | 'PENDING' | 'REVIEW_RECOVERY' | 'STALE'
  | 'FORBIDDEN' | 'NOT_FOUND' | 'ERROR' | 'RETRYING';

export type ReconciliationCreateState =
  | 'IDLE' | 'PREFLIGHTING' | 'CREATING' | 'FORBIDDEN' | 'ERROR';

function exactWorkspaceParameter(
  searchParams: URLSearchParams,
  key: string,
) {
  const value = searchParams.get(key);
  if (!value || value !== value.trim() ||
      [...value].some(character => character.charCodeAt(0) < 32)) return null;
  return value;
}

export function directReconciliationWorkspaceBinding(
  searchParams: URLSearchParams,
): DirectReconciliationCapturePlanPreflightRequest | null {
  if (searchParams.get('p9ResultKind') !== 'DIRECT' ||
      searchParams.has('bucketKey')) return null;
  const p9ResultId = exactWorkspaceParameter(searchParams, 'p9ResultId');
  const p9RunId = exactWorkspaceParameter(searchParams, 'p9RunId');
  const conceptKey = exactWorkspaceParameter(searchParams, 'conceptKey');
  const grain = exactWorkspaceParameter(searchParams, 'grain');
  const periodInstanceKey =
    exactWorkspaceParameter(searchParams, 'periodInstanceKey');
  const fieldId = exactWorkspaceParameter(searchParams, 'fieldId');
  const fieldKey = exactWorkspaceParameter(searchParams, 'fieldKey');
  const periodKey = exactWorkspaceParameter(searchParams, 'periodKey');
  const exportId = exactWorkspaceParameter(searchParams, 'exportId');
  if (!p9ResultId || !p9RunId || p9ResultId !== p9RunId ||
      !/^[a-f0-9]{24}$/i.test(p9RunId) ||
      !conceptKey || !grain || grain !== grain.toUpperCase() ||
      !periodInstanceKey || !fieldId || !fieldKey || !periodKey ||
      !exportId) return null;
  return {
    p9ResultKind: 'DIRECT',
    p9ResultId,
    p9RunId,
    conceptKey,
    grain,
    filter: {
      periodInstanceKey,
      fieldId,
      fieldKey,
      bucketKey: null,
      periodKey,
    },
    exportId,
  };
}
export type ReconciliationEightColumnRow = {
  presentation: ReconciliationPresentation;
  row: ReconciliationPresentationRow;
  detailPath: string;
};

export type ReviewPendingAction = {
  gate: ReconciliationReviewGate;
  decision: ReconciliationReviewDecision;
};

export type ReviewFeedback = {
  kind: 'SUCCESS' | 'STALE' | 'FORBIDDEN' | 'ERROR';
  message: string;
};

export type ReconciliationLifecycleAction =
  | 'RECHECK' | 'SUPERSEDE' | null;

const RECHECK_TERMINAL_STATUSES = new Set([
  'MATCHED', 'MISMATCHED', 'STALE', 'FAILED',
]);

export function canBeginReconciliationRecheck(
  summary: ReconciliationSummary,
) {
  return summary.presentation?.recheck?.baseEligible === true &&
    summary.presentation.recheck.inProgress === false &&
    RECHECK_TERMINAL_STATUSES.has(summary.status.toUpperCase()) &&
    summary.stateRevision > 0 &&
    /^[a-f0-9]{64}$/i.test(summary.stateHash) &&
    summary.hasCurrentGeneration &&
    !summary.hasPendingGeneration;
}

function loadedReconciliationUiState(
  value: Awaited<ReturnType<typeof readReconciliation>>,
): ReconciliationUiState {
  if (value.phase === 'PENDING_GENERATION') return 'PENDING';
  if (value.phase === 'REVIEW_RECOVERY') return 'REVIEW_RECOVERY';
  return 'READY';
}

function authorizedGetLink(
  links: ReadonlyArray<ReconciliationPresentationLink>,
  rel: string,
) {
  return links.find(link => link.rel === rel && link.method === 'GET');
}

function requestStatus(error: unknown): number | undefined {
  const value = error as { status?: number; response?: { status?: number } } | null;
  return value?.status ?? value?.response?.status;
}

function AuthorizedReadButton({ link, label, domainKind }: {
  link: ReconciliationPresentationLink;
  label: string;
  domainKind?: string;
}) {
  const href = link.method === 'GET' ? resolveAuthorizedApiHref(link.href) : null;
  const [readback, setReadback] = useState<{
    href: string; loading: boolean; content?: string; error?: string;
  } | null>(null);
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, [href]);
  const current = readback?.href === href ? readback : null;
  const read = async () => {
    if (!href || current?.loading) return;
    const requestId = ++request.current;
    setReadback({ href, loading: true });
    try {
      const value = await readAuthorizedReconciliationLink(link);
      if (requestId === request.current) {
        setReadback({ href, loading: false,
          content: JSON.stringify(value, null, 2) ?? 'null' });
      }
    } catch (error) {
      if (requestId !== request.current) return;
      const status = requestStatus(error);
      setReadback({ href, loading: false,
        error: status === 401
          ? 'Phiên đăng nhập không còn hợp lệ; không thể đọc dữ liệu.'
          : status === 403 || status === 404
            ? 'Máy chủ không cho phép đọc dữ liệu này.'
            : 'Không thể tải dữ liệu do máy chủ cấp.' });
    }
  };
  if (!href) return <span>Liên kết không hợp lệ</span>;
  return <>
    <button type="button" data-domain-link={domainKind}
      disabled={current?.loading} aria-expanded={current?.content !== undefined}
      onClick={() => void read()}>{label}</button>
    {current?.loading ? <span role="status">Đang tải dữ liệu được cấp…</span> : null}
    {current?.error ? <p role="alert">{current.error}</p> : null}
    {current?.content !== undefined ? <section aria-label={'Dữ liệu do máy chủ cấp: ' + label}>
      <pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        {current.content}
      </pre>
    </section> : null}
  </>;
}

function AuthorizedPresentationLink({ link, label }: {
  link: ReconciliationPresentationLink;
  label: string;
}) {
  if (!resolveAuthorizedApiHref(link.href)) return <span>Liên kết không hợp lệ</span>;
  if (link.method === 'GET') return <AuthorizedReadButton link={link} label={label} />;
  // Metadata describes a command; navigation only focuses the existing export
  // controls. It must neither issue a GET to a POST URL nor submit a command.
  return link.method === 'POST' && link.rel === 'EVIDENCE_EXPORT'
    ? <a href="#evidence-export-title">Chọn định dạng xuất bằng chứng</a>
    : <span>Thao tác này chưa có điều khiển được hỗ trợ.</span>;
}

function DomainIdentityValue({ kind, label, value, to }: {
  kind: string;
  label: string;
  value: string | number | null | undefined;
  to?: string | null;
}) {
  const shown = value === null || value === undefined || value === ''
    ? 'Not applicable' : String(value);
  return <>
    <dt>{label}</dt>
    <dd data-domain-kind={kind} data-domain-id={shown}>
      {to && shown !== 'Not applicable'
        ? <Link to={to} data-domain-link={kind}>{shown}</Link>
        : shown}
    </dd>
  </>;
}

export function serverPresentationRows(value: ReconciliationSummary):
  ReconciliationEightColumnRow[] {
  return value.presentation.rows.map(row => ({
    presentation: value.presentation,
    row,
    detailPath: '/works/' + encodeURIComponent(value.workId) + '/statistics/' +
      encodeURIComponent(value.scopeAssignmentId) + '/reconciliations/' + encodeURIComponent(row.id),
  }));
}
export function ReconciliationStateView({ state, onRetry }: {
  state: Exclude<ReconciliationUiState, 'READY'>;
  onRetry?: () => void;
}) {
  const messages: Record<Exclude<ReconciliationUiState, 'READY'>, string> = {
    LOADING: 'Đang tải đối soát…', EMPTY: 'Chưa có lần đối soát.',
    PENDING: 'Đối soát đang tạo generation; trạng thái sẽ tự động được tải lại.',
    REVIEW_RECOVERY: 'Review tạm thời không khả dụng; cần queue recheck.',
    STALE: 'Dữ liệu đã cũ; cần tải lại.', FORBIDDEN: 'Bạn không có quyền xem phạm vi này.',
    NOT_FOUND: 'Không tìm thấy đối soát.', ERROR: 'Không thể tải dữ liệu đối soát.',
    RETRYING: 'Đang thử tải lại…',
  };
  return <section role="status" aria-live="polite" tabIndex={-1}
    data-testid={state === 'PENDING' ? 'reconciliation-pending' : undefined}
    data-reconciliation-phase={state === 'PENDING'
      ? 'PENDING_GENERATION' : undefined}>
    <p>{messages[state]}</p>
    {onRetry && state !== 'LOADING' && state !== 'PENDING' && state !== 'RETRYING'
      ? <button type="button" onClick={onRetry}>Thử lại</button> : null}
  </section>;
}

export function ReconciliationTable({ rows, caption = 'Danh s\u00e1ch \u0111\u1ed1i so\u00e1t' }: {
  rows: ReconciliationEightColumnRow[];
  caption?: string;
}) {
  return <div style={{ overflowX: 'auto' }}>
    <table data-reconciliation-table
      data-reconciliation-column-count={RECONCILIATION_COLUMNS.length}>
      <caption>{caption}</caption>
      <thead><tr>{RECONCILIATION_COLUMNS.map(column =>
        <th scope="col" key={column}>{column}</th>)}</tr></thead>
      <tbody>{rows.map(({ presentation, row, detailPath }) => <tr key={row.id}
        data-reconciliation-id={row.id}
        data-presentation-schema-version={presentation.schemaVersion}
        data-presentation-detail-level={presentation.detailLevel}
        data-total={row.metadata.total}
        data-root-cause={row.metadata.rootCause}
        data-row-count-before-redaction={row.metadata.rowCountBeforeRedaction}
        data-row-count-after-redaction={row.metadata.rowCountAfterRedaction}>
        {RECONCILIATION_COLUMNS.map((column, columnIndex) => <td key={column}
          data-column={column} data-column-index={columnIndex}>
          {column === 'Identity'
            ? <Link to={detailPath}>{row.columns[column]}</Link>
            : row.columns[column]}
        </td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}
export function ReconciliationDetailPanel({ summary, detail, review, evidence,
  exporting = false, exportError, reviewing = null, reviewFeedback,
  lifecycleAction = null, downloadingArtifactId = null,
  onExport, onReview, onRecheck, onSupersede, onDownload }: {
  summary: ReconciliationSummary;
  detail: ReconciliationDetail | null;
  review: ReviewRead;
  evidence?: EvidenceArtifactPage;
  exporting?: boolean;
  exportError?: string | null;
  reviewing?: ReviewPendingAction | null;
  reviewFeedback?: ReviewFeedback | null;
  lifecycleAction?: ReconciliationLifecycleAction;
  downloadingArtifactId?: string | null;
  onExport?: (format: 'JSON' | 'CSV', operator: boolean) => void;
  onReview?: (gate: ReconciliationReviewGate,
    decision: ReconciliationReviewDecision,
    expectedStateRevision: number) => void;
  onRecheck?: () => void;
  onSupersede?: (previousGenerationId: string,
    expectedStateRevision: number) => void;
  onDownload?: (artifact: EvidenceArtifact) => void;
}) {
  const operator = review.operatorDetail != null && detail != null &&
    summary.presentation.detailLevel === 'OPERATOR';
  const rows = serverPresentationRows(summary);
  const presentationRow = rows[0]?.row;
  const sourceIdentityLink = authorizedGetLink(
    presentationRow?.metadata.sourceLinks || [], 'SOURCE_DETAIL');
  const workPath = `/works/${encodeURIComponent(summary.workId)}`;
  const statisticsRoot = `${workPath}/statistics/${encodeURIComponent(summary.scopeAssignmentId)}`;
  const configPath = `${statisticsRoot}/config`;
  const formPath = detail ? dynamicFormPath(detail.dynamicFormVersionId) : null;
  const flowVersionPath = detail?.flowTemplateId && detail.flowTemplateVersionId
    ? dynamicFlowVersionPath(detail.flowTemplateId, detail.flowTemplateVersionId)
    : null;
  const flowRuntimePath = detail?.flowInstanceId
    ? dynamicFlowRuntimePath(summary.workId, detail.flowInstanceId, 'overview', {
      stepInstanceId: detail.flowStepInstanceId,
      branchId: detail.flowBranchId,
      assignmentId: summary.scopeAssignmentId,
      reportId: detail.sourceReportId,
    })
    : null;
  const statisticsResultPath = detail ? (() => {
    const params = new URLSearchParams({
      dynamicFormTemplateId: detail.dynamicFormVersionId,
      scopeType: 'ASSIGNMENT',
      periodKey: detail.periodKey,
      periodInstanceKey: detail.periodInstanceKey,
    });
    return statRunResultPath(
      summary.workId,
      summary.scopeAssignmentId,
      'DIRECT_FIELD',
      detail.p9GenerationId,
    ) + '?' + params.toString();
  })() : null;
  const reconciliationPath = `${statisticsRoot}/reconciliations/${encodeURIComponent(summary.reconciliationId)}`;
  const artifacts = evidence?.rows || [];
  const availableGates = new Set(review.actions.availableGates);
  const feedbackKind = reviewing ? 'SUBMITTING' : reviewFeedback?.kind || 'IDLE';
  const statusMessage = reviewing
    ? `Đang gửi ${reviewing.decision} cho cổng ${reviewing.gate}…`
    : reviewFeedback?.kind === 'SUCCESS' ? reviewFeedback.message : '';
  return <article aria-labelledby="reconciliation-detail-title">
    <h1 id="reconciliation-detail-title">Chi tiết đối soát</h1>
    <ReconciliationTable rows={rows} caption="Tám cột đối soát do máy chủ cung cấp" />
    {presentationRow ? <section aria-labelledby="presentation-metadata-title"
      data-presentation-metadata
      data-presentation-detail-level={summary.presentation.detailLevel}>
      <h2 id="presentation-metadata-title">Server evidence</h2>
      <dl>
        <dt>Evidence row total</dt>
        <dd data-presentation-total>{presentationRow.metadata.total}</dd>
        <dt>Root cause</dt>
        <dd data-presentation-root-cause>{presentationRow.metadata.rootCause}</dd>
        <dt>Permission and row counts</dt>
        <dd data-presentation-permission>
          {presentationRow.metadata.permissionCodes.join(', ')}{' - '}
          {presentationRow.metadata.rowCountBeforeRedaction}/
          {presentationRow.metadata.rowCountAfterRedaction}
        </dd>
      </dl>
      <ul aria-label="Evidence links">
        {presentationRow.metadata.evidenceLinks.map(link =>
          <li key={`${link.rel}:${link.href}`} data-presentation-link={link.rel}
            data-presentation-link-href={link.href}
            data-presentation-link-method={link.method}>
            {link.rel}: <AuthorizedPresentationLink link={link}
              label="Mở bằng chứng được máy chủ cấp" />
          </li>)}
      </ul>
    </section> : null}    <section aria-labelledby="actor-context-title">
      <h2 id="actor-context-title">Ngữ cảnh người xem</h2>
      <p><strong>Phạm vi:</strong> {operator ? 'Vận hành' : 'Đã ẩn dữ liệu vận hành'}</p>
      {!operator && <p role="note">Mã nguồn và provenance chi tiết đã được máy chủ ẩn.</p>}
      {operator && detail && <details id="source-provenance">
        <summary>{'Ngu\u1ed3n v\u00e0 provenance'}</summary>
        <dl><dt>Source report (report)</dt><dd>{sourceIdentityLink
          ? <AuthorizedReadButton link={sourceIdentityLink} label={detail.sourceReportId} />
          : 'No server-authorized source link'}</dd>
          <dt>Payload revision</dt><dd>{detail.sourcePayloadRevision}</dd>
          <dt>Lifecycle revision</dt><dd>{detail.sourceLifecycleRevision}</dd></dl>
        <ul aria-label="Source links">
          {presentationRow?.metadata.sourceLinks.map(link =>
            <li key={`${link.rel}:${link.href}`} data-source-link={link.rel}
              data-source-link-href={link.href}
              data-source-link-method={link.method}>
              {link.rel}: <AuthorizedPresentationLink link={link}
                label="Mở nguồn được máy chủ cấp" />
            </li>)}
        </ul>
      </details>}
    </section>
    {operator && detail ? <section aria-labelledby="domain-identities-title"
      data-domain-identities data-reconciliation-id={summary.reconciliationId}
      data-reconciliation-generation={review.summary.generationId}>
      <h2 id="domain-identities-title">Domain identities</h2>
      <dl>
        <DomainIdentityValue kind="statistics-config"
          label="Statistics configuration (config)"
          value={detail.p8ConfigId || detail.p8ConfigBundleHash}
          to={configPath} />
        <DomainIdentityValue kind="statistics-config-version"
          label="Statistics configuration version (version)"
          value={detail.p8ConfigVersionId || detail.p8ConfigRevision}
          to={configPath} />
        <DomainIdentityValue kind="dynamic-form-version"
          label="Dynamic Form version (version)"
          value={detail.dynamicFormVersionId} to={formPath} />
        <DomainIdentityValue kind="dynamic-flow-version"
          label="Dynamic Flow version (version)"
          value={detail.flowTemplateVersionId} to={flowVersionPath} />
        <DomainIdentityValue kind="dynamic-flow-instance"
          label="Dynamic Flow instance (instance)"
          value={detail.flowInstanceId} to={flowRuntimePath} />
        <DomainIdentityValue kind="dynamic-flow-step"
          label="Dynamic Flow step instance (step)"
          value={detail.flowStepInstanceId} to={flowRuntimePath} />
        <DomainIdentityValue kind="work-assignment"
          label="Work assignment (assignment)"
          value={summary.scopeAssignmentId} to={flowRuntimePath || workPath} />
        <DomainIdentityValue kind="source-report"
          label="Source report (report)"
          value={detail.sourceReportId} to={flowRuntimePath} />
        <DomainIdentityValue kind="statistics-run"
          label="Statistics run (run)"
          value={detail.p9RunId} to={statisticsResultPath} />
        <DomainIdentityValue kind="statistics-result"
          label="Statistics result (result)"
          value={detail.p9ResultId} to={statisticsResultPath} />
        <DomainIdentityValue kind="statistics-result-generation"
          label="Statistics result generation"
          value={detail.p9GenerationId} to={statisticsResultPath} />
        <DomainIdentityValue kind="reconciliation"
          label="Reconciliation (reconciliation)"
          value={summary.reconciliationId}
          to={`${reconciliationPath}#reconciliation-detail-title`} />
        <DomainIdentityValue kind="reconciliation-generation"
          label="Reconciliation generation"
          value={review.summary.generationId}
          to={`${reconciliationPath}#review-actions-title`} />
      </dl>
    </section> : null}
    <section aria-labelledby="review-actions-title"
      data-review-actions
      data-can-submit={String(review.actions.canSubmit)}
      data-expected-state-revision={review.actions.expectedStateRevision}>
      <h2 id="review-actions-title">Phê duyệt độc lập</h2>
      <p><strong>Review:</strong> {review.summary.approved ? 'Đã phê duyệt' : 'Chưa phê duyệt'} ·
        {review.summary.approvedGateCount}/5 cổng</p>
      {!review.actions.canSubmit && review.summary.approvedGateCount < 5
        ? <p role="note" data-review-action-blocked>
          Máy chủ không cho phép tài khoản hiện tại ký cổng ở revision này.
        </p> : null}
      <ul>
        {RECONCILIATION_REVIEW_GATES.map(gate => {
          const gateState = review.summary.gateStates[gate] || 'PENDING';
          const available = review.actions.canSubmit &&
            availableGates.has(gate) && gateState === 'PENDING';
          return <li key={gate} data-review-gate={gate} data-gate-state={gateState}>
            <span>{gate}: {gateState}</span>{' '}
            <button type="button" data-review-decision="APPROVE"
              disabled={!available || reviewing != null}
              onClick={() => onReview?.(gate, 'APPROVE',
                review.actions.expectedStateRevision)}>
              Phê duyệt {gate}
            </button>{' '}
            <button type="button" data-review-decision="REJECT"
              disabled={!available || reviewing != null}
              onClick={() => onReview?.(gate, 'REJECT',
                review.actions.expectedStateRevision)}>
              Từ chối {gate}
            </button>
          </li>;
        })}
      </ul>
      <span role="status" aria-live="polite" data-review-feedback
        data-review-feedback-kind={feedbackKind}>{statusMessage}</span>
      {reviewFeedback && reviewFeedback.kind !== 'SUCCESS'
        ? <p role="alert" data-review-error
          data-review-error-kind={reviewFeedback.kind}>{reviewFeedback.message}</p>
        : null}
      {review.actions.canSupersede ? <div data-review-supersession-actions>
        <h3>Matched successor generation</h3>
        <p>Reconciliation generation {review.summary.generationId} is the
          server-validated successor. Prior approvals remain append-only.</p>
        {review.actions.supersessionGenerationIds.map(previousGenerationId =>
          <button key={previousGenerationId} type="button"
            disabled={lifecycleAction != null}
            onClick={() => onSupersede?.(previousGenerationId,
              review.actions.expectedStateRevision)}>
            Supersede review generation {previousGenerationId}
          </button>)}
      </div> : null}
    </section>
    {canBeginReconciliationRecheck(summary) ? <section
      aria-labelledby="recheck-action-title" data-recheck-action>
      <h2 id="recheck-action-title">Reconciliation recheck</h2>
      <p>A recheck queues a new immutable reconciliation generation. The
        production owner performs capture and trusted finalization.</p>
      <button type="button" disabled={lifecycleAction != null}
        onClick={() => onRecheck?.()}>
        {lifecycleAction === 'RECHECK' ? 'Queueing recheck...' : 'Queue recheck'}
      </button>
    </section> : null}
    <section aria-labelledby="evidence-export-title">
      <h2 id="evidence-export-title">Xuất bằng chứng</h2>
      <button type="button" disabled={exporting}
        onClick={() => onExport?.('JSON', operator)}>Tải JSON</button>
      <button type="button" disabled={exporting}
        onClick={() => onExport?.('CSV', operator)}>Tải CSV</button>
      <span role="status" aria-live="polite">
        {exporting ? 'Đang tạo tệp bằng chứng…' : ''}
      </span>
      {exportError && <p role="alert">{exportError}</p>}
      <h3>Evidence artifact list</h3>
      {artifacts.length === 0 ? <p>No authorized evidence artifacts.</p>
        : <ul aria-label="Evidence artifact list">
          {artifacts.map(artifact => {
            const readback = authorizedGetLink(artifact.links, 'READBACK');
            const download = authorizedGetLink(artifact.links, 'DOWNLOAD');
            const readbackHref = readback ? resolveAuthorizedApiHref(readback.href) : null;
            const downloadHref = download ? resolveAuthorizedApiHref(download.href) : null;
            return <li key={artifact.id}
              data-domain-kind="evidence-artifact"
              data-evidence-artifact={artifact.id}
              data-reconciliation-generation={artifact.generationId}
              data-manifest-sha256={artifact.manifestSha256}
              data-content-sha256={artifact.contentSha256}>
              <span>Evidence artifact: </span>
              {readback && readbackHref
                ? <AuthorizedReadButton link={readback} label={artifact.id}
                    domainKind="evidence-artifact" />
                : <span>Unavailable</span>}
              {' | '}Reconciliation generation: {artifact.generationId}
              {' | '}Format: {artifact.format}
              {' | '}Created: <time data-evidence-lifecycle="created"
                dateTime={artifact.createdAtUtc}>{artifact.createdAtUtc}</time>
              {' | '}Expires: <time data-evidence-lifecycle="expires"
                dateTime={artifact.expiresAtUtc}>{artifact.expiresAtUtc}</time>
              {downloadHref ? <button type="button"
                disabled={downloadingArtifactId != null}
                onClick={() => onDownload?.(artifact)}>
                {downloadingArtifactId === artifact.id
                  ? 'Downloading evidence artifact...'
                  : `Download evidence artifact ${artifact.id}`}
              </button> : null}
            </li>;
          })}
        </ul>}
    </section>
  </article>;
}

export function ReconciliationReviewRecoveryPanel({
  summary,
  evidence,
  reviewStatus,
  reviewCode,
  lifecycleAction = null,
  reviewFeedback,
  onRecheck,
}: {
  summary: ReconciliationSummary;
  evidence: EvidenceArtifactPage | null;
  reviewStatus: 409 | 412;
  reviewCode: 'P10_REVIEW_TARGET_NOT_SIGNABLE';
  lifecycleAction?: ReconciliationLifecycleAction;
  reviewFeedback?: ReviewFeedback | null;
  onRecheck?: () => void;
}) {
  const artifacts = evidence?.rows || [];
  const canRecheck = canBeginReconciliationRecheck(summary);
  const feedbackKind = lifecycleAction === 'RECHECK'
    ? 'SUBMITTING' : reviewFeedback?.kind || 'IDLE';
  return <article
    aria-labelledby="reconciliation-review-recovery-title"
    data-testid="reconciliation-review-recovery"
    data-reconciliation-phase="REVIEW_RECOVERY"
    data-review-recovery-reason="REVIEW_TARGET_NOT_SIGNABLE"
    data-review-error-code={reviewCode}
    data-review-http-status={reviewStatus}
    data-reconciliation-id={summary.reconciliationId}
    data-state-revision={summary.stateRevision}
    data-state-hash={summary.stateHash}>
    <h1 id="reconciliation-review-recovery-title">
      {canRecheck ? 'Đối soát cần recheck' : 'Đối soát chưa thể review'}
    </h1>
    <p role="note" data-review-recovery-notice>
      Review tạm thời không khả dụng vì generation hiện tại không còn là
      target có thể ký. {canRecheck
        ? 'Queue recheck để máy chủ tạo và xác minh generation mới.'
        : 'Máy chủ chưa xác nhận generation này đủ điều kiện recheck.'}
    </p>
    <ReconciliationTable
      rows={serverPresentationRows(summary)}
      caption="Tóm tắt đối soát trong trạng thái recovery"
    />
    <section aria-labelledby="recovery-evidence-title"
      data-recovery-evidence data-evidence-count={artifacts.length}>
      <h2 id="recovery-evidence-title">Bằng chứng hiện có</h2>
      {artifacts.length === 0
        ? <p>Không có artifact bằng chứng đã tải được.</p>
        : <ul aria-label="Recovery evidence artifact list">
          {artifacts.map(artifact => <li key={artifact.id}
            data-evidence-artifact={artifact.id}
            data-reconciliation-generation={artifact.generationId}
            data-manifest-sha256={artifact.manifestSha256}
            data-content-sha256={artifact.contentSha256}>
            Evidence artifact: {artifact.id} | Generation: {artifact.generationId}
            {' | '}Format: {artifact.format}
          </li>)}
        </ul>}
    </section>
    {canRecheck ? <section
      aria-labelledby="recovery-recheck-action-title" data-recheck-action>
      <h2 id="recovery-recheck-action-title">Reconciliation recheck</h2>
      <p>Recheck tạo một immutable generation mới do production owner xử lý.</p>
      <button type="button"
        data-testid="reconciliation-recheck"
        disabled={lifecycleAction != null}
        onClick={() => onRecheck?.()}>
        {lifecycleAction === 'RECHECK' ? 'Queueing recheck...' : 'Queue recheck'}
      </button>
    </section> : null}
    <span role="status" aria-live="polite"
      data-recheck-feedback data-recheck-feedback-kind={feedbackKind}>
      {lifecycleAction === 'RECHECK' ? 'Đang queue recheck…'
        : reviewFeedback?.kind === 'SUCCESS' ? reviewFeedback.message : ''}
    </span>
    {reviewFeedback && reviewFeedback.kind !== 'SUCCESS'
      ? <p role="alert" data-recheck-error
        data-recheck-error-kind={reviewFeedback.kind}>{reviewFeedback.message}</p>
      : null}
  </article>;
}

export function StatisticsReconciliationsPage() {
  const { workId = '', scopeAssignmentId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<ReconciliationUiState>('LOADING');
  const [rows, setRows] = useState<ReconciliationEightColumnRow[]>([]);
  const [createState, setCreateState] =
    useState<ReconciliationCreateState>('IDLE');
  const stateRef = useRef<HTMLElement | null>(null);
  const launchBinding = directReconciliationWorkspaceBinding(searchParams);
  const load = async () => {
    setState(previous => previous === 'ERROR' ? 'RETRYING' : 'LOADING');
    try {
      const value = await listReconciliations(workId, scopeAssignmentId);
      setRows(value.rows.flatMap(serverPresentationRows));
      setState(value.rows.length ? 'READY' : 'EMPTY');
    } catch (error) { setState(errorState(error)); }
  };
  useEffect(() => { void load(); }, [workId, scopeAssignmentId]);
  useEffect(() => { stateRef.current?.focus(); }, [state]);

  const createFromServerCapturePlan = async () => {
    if (!launchBinding ||
        createState === 'PREFLIGHTING' || createState === 'CREATING') return;
    setCreateState('PREFLIGHTING');
    try {
      const preflight = await preflightDirectReconciliationCapturePlan(
        workId,
        scopeAssignmentId,
        launchBinding,
      );
      if (preflight.schemaVersion !== 'P10_CAPTURE_PLAN_PREFLIGHT_V1' ||
          !preflight.capturePlanToken ||
          !/^[a-f0-9]{64}$/i.test(preflight.planSha256) ||
          !Number.isFinite(Date.parse(preflight.expiresAtUtc))) {
        throw new Error('CAPTURE_PLAN_PREFLIGHT_INVALID');
      }
      setCreateState('CREATING');
      const created = await createDirectReconciliation(
        workId,
        scopeAssignmentId,
        {
          commandId: crypto.randomUUID(),
          p9ResultKind: launchBinding.p9ResultKind,
          p9ResultId: launchBinding.p9ResultId,
          p9RunId: launchBinding.p9RunId,
          conceptKey: launchBinding.conceptKey,
          grain: launchBinding.grain,
          filter: launchBinding.filter,
          capturePlanToken: preflight.capturePlanToken,
        },
      );
      navigate(
        '/works/' + encodeURIComponent(workId) + '/statistics/' +
        encodeURIComponent(scopeAssignmentId) + '/reconciliations/' +
        encodeURIComponent(created.reconciliationId),
      );
    } catch (error) {
      const status = requestStatus(error);
      setCreateState(status === 403 || status === 404
        ? 'FORBIDDEN'
        : 'ERROR');
    }
  };

  return <main aria-labelledby="reconciliations-title">
    <h1 id="reconciliations-title">Đối soát thống kê</h1>
    <DomainContextStrip
      ariaLabel="Ngữ cảnh danh sách đối soát"
      breadcrumbs={[
        { label: 'Công việc', to: '/works/' + encodeURIComponent(workId) },
        {
          label: 'Thống kê',
          to: '/works/' + encodeURIComponent(workId) + '/statistics/' +
            encodeURIComponent(scopeAssignmentId) + '/runs',
        },
        { label: 'Đối soát' },
      ]}
      items={[
        { label: 'Work identity', value: workId },
        { label: 'Work assignment', value: scopeAssignmentId },
        { label: 'Trạng thái', value: state },
        { label: 'Quyền', value: 'Theo presentation máy chủ' },
      ]}
    />
    {launchBinding ? <section
      aria-labelledby="reconciliation-create-title"
      data-reconciliation-create
      data-p9-result-id={launchBinding.p9ResultId}
      data-export-id={launchBinding.exportId}>
      <h2 id="reconciliation-create-title">Tạo đối soát từ kết quả DIRECT</h2>
      <p>
        Máy chủ sẽ xác minh exact P9 identity, filter và export trước khi cấp
        capture-plan token dùng một lần.
      </p>
      <button
        type="button"
        disabled={createState === 'PREFLIGHTING' || createState === 'CREATING'}
        onClick={() => void createFromServerCapturePlan()}>
        {createState === 'PREFLIGHTING'
          ? 'Đang chuẩn bị capture plan…'
          : createState === 'CREATING'
            ? 'Đang tạo đối soát…'
            : 'Tạo đối soát'}
      </button>
      {createState === 'FORBIDDEN' ? <p role="alert">
        Tài khoản hiện tại không có quyền tạo đối soát cho identity này.
      </p> : null}
      {createState === 'ERROR' ? <p role="alert">
        Máy chủ không thể cấp capture plan hoặc tạo đối soát. Hãy quay lại
        result, chọn export còn hiệu lực rồi thử lại.
      </p> : null}
    </section> : null}
    {state === 'READY' ? <ReconciliationTable rows={rows} />
      : <div ref={node => { stateRef.current = node; }} tabIndex={-1}>
        <ReconciliationStateView state={state} onRetry={load} />
      </div>}
  </main>;
}
export function StatisticsReconciliationDetailPage() {
  const { workId = '', scopeAssignmentId = '', reconciliationId = '' } = useParams();
  const [state, setState] = useState<ReconciliationUiState>('LOADING');
  const [data, setData] = useState<Awaited<ReturnType<typeof readReconciliation>> | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<ReviewPendingAction | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<ReviewFeedback | null>(null);
  const [lifecycleAction, setLifecycleAction] =
    useState<ReconciliationLifecycleAction>(null);
  const [downloadingArtifactId, setDownloadingArtifactId] =
    useState<string | null>(null);
  const pendingPollInFlight = useRef(false);
  const recheckInFlight = useRef(false);
  const load = useCallback(async (polling = false) => {
    if (polling && pendingPollInFlight.current) return;
    if (polling) pendingPollInFlight.current = true;
    if (!polling) {
      setState(previous => previous === 'ERROR' || previous === 'STALE' ||
        previous === 'REVIEW_RECOVERY' ? 'RETRYING' : 'LOADING');
    }
    setReviewFeedback(null);
    try {
      const value = await readReconciliation(workId, scopeAssignmentId,
        reconciliationId);
      setData(value);
      setState(loadedReconciliationUiState(value));
    } catch (error) {
      setState(errorState(error));
    } finally {
      if (polling) pendingPollInFlight.current = false;
    }
  }, [workId, scopeAssignmentId, reconciliationId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (state !== 'PENDING') return;
    const poll = window.setInterval(() => { void load(true); }, 1_000);
    return () => window.clearInterval(poll);
  }, [load, state]);
  const reviewDecision = async (gate: ReconciliationReviewGate,
    decision: ReconciliationReviewDecision, expectedStateRevision: number) => {
    if (reviewing) return;
    setReviewing({ gate, decision });
    setReviewFeedback(null);
    let nextFeedback: ReviewFeedback;
    try {
      await submitReviewDecision(workId, scopeAssignmentId, reconciliationId, {
        commandId: crypto.randomUUID(),
        gate,
        decision,
        expectedStateRevision,
      });
      nextFeedback = {
        kind: 'SUCCESS',
        message: `Đã ghi ${decision} cho cổng ${gate}.`,
      };
    } catch (error) {
      nextFeedback = reviewActionFeedback(error);
    }
    try {
      const value = await readReconciliation(workId, scopeAssignmentId,
        reconciliationId);
      setData(value);
      setState(loadedReconciliationUiState(value));
    } catch {
      nextFeedback = {
        kind: 'ERROR',
        message: 'Không thể tải lại trạng thái review sau thao tác.',
      };
    } finally {
      setReviewing(null);
      setReviewFeedback(nextFeedback);
    }
  };
  const beginRecheck = async () => {
    if (!data || lifecycleAction || recheckInFlight.current ||
      !canBeginReconciliationRecheck(data.summary)) return;
    recheckInFlight.current = true;
    let queueAccepted = false;
    setLifecycleAction('RECHECK');
    setReviewFeedback(null);
    try {
      const queued = await beginReconciliationRecheck(
        workId, scopeAssignmentId, reconciliationId, data.summary);
      queueAccepted = true;
      setData({
        phase: 'PENDING_GENERATION',
        summary: {
          ...data.summary,
          status: queued.status,
          stateRevision: queued.stateRevision,
          stateHash: queued.stateHash,
        },
        detail: null,
        review: null,
        evidence: null,
      });
      setState('PENDING');
      const value = await readReconciliation(workId, scopeAssignmentId,
        reconciliationId);
      setData(value);
      setState(loadedReconciliationUiState(value));
      setReviewFeedback({
        kind: 'SUCCESS',
        message: 'Recheck queued for the production reconciliation owner.',
      });
    } catch (error) {
      if (queueAccepted) {
        setReviewFeedback({
          kind: 'ERROR',
          message: 'Recheck đã được queue nhưng chưa thể tải trạng thái mới nhất.',
        });
        return;
      }
      const status = requestStatus(error);
      let feedback = recheckActionFeedback(error);
      if (status === 409 || status === 412) {
        try {
          const value = await readReconciliation(workId, scopeAssignmentId,
            reconciliationId);
          setData(value);
          setState(loadedReconciliationUiState(value));
        } catch (refreshError) {
          // A retry must not reuse the rejected CAS pins after a failed refresh.
          setData(null);
          setState(errorState(refreshError));
          feedback = {
            kind: 'ERROR',
            message: 'Không thể tải lại trạng thái đối soát sau lỗi recheck. Hãy thử tải lại.',
          };
        }
      }
      setReviewFeedback(feedback);
    } finally {
      recheckInFlight.current = false;
      setLifecycleAction(null);
    }
  };
  const supersedeReview = async (previousGenerationId: string,
    expectedStateRevision: number) => {
    if (lifecycleAction) return;
    setLifecycleAction('SUPERSEDE');
    setReviewFeedback(null);
    try {
      await supersedeReconciliationReview(workId, scopeAssignmentId,
        reconciliationId, previousGenerationId, expectedStateRevision);
      const value = await readReconciliation(workId, scopeAssignmentId,
        reconciliationId);
      setData(value);
      setState(loadedReconciliationUiState(value));
      setReviewFeedback({
        kind: 'SUCCESS',
        message: `Review generation ${previousGenerationId} was superseded append-only.`,
      });
    } catch (error) {
      setReviewFeedback(reviewActionFeedback(error));
    } finally {
      setLifecycleAction(null);
    }
  };
  const exportEvidence = async (format: 'JSON' | 'CSV', operator: boolean) => {
    setExporting(true); setExportError(null);
    try {
      const artifact = await createEvidenceExport(workId, scopeAssignmentId,
        reconciliationId, format, operator);
      await downloadEvidenceExport(artifact);
      const value = await readReconciliation(workId, scopeAssignmentId,
        reconciliationId);
      setData(value);
      setState(loadedReconciliationUiState(value));
    } catch { setExportError('Không thể tạo hoặc tải tệp bằng chứng.'); }
    finally { setExporting(false); }
  };
  const downloadEvidence = async (artifact: EvidenceArtifact) => {
    if (downloadingArtifactId) return;
    setDownloadingArtifactId(artifact.id);
    setExportError(null);
    try {
      await downloadEvidenceExport(artifact);
    } catch (error) {
      const status = requestStatus(error);
      setExportError(status === 401
        ? 'Evidence download requires a current authenticated session.'
        : status === 403 || status === 404
          ? 'Evidence download was denied after current assignment permission re-authorization.'
          : 'Evidence artifact download failed.');
    } finally {
      setDownloadingArtifactId(null);
    }
  };
  return <main aria-labelledby="reconciliation-page-title">
    <h1 id="reconciliation-page-title" className="sr-only">Đối soát</h1>
    <DomainContextStrip
      ariaLabel="Ngữ cảnh chi tiết đối soát và bằng chứng"
      breadcrumbs={[
        { label: 'Công việc', to: `/works/${encodeURIComponent(workId)}` },
        { label: 'Thống kê', to: `/works/${encodeURIComponent(workId)}/statistics/${encodeURIComponent(scopeAssignmentId)}/runs` },
        { label: 'Đối soát', to: `/works/${encodeURIComponent(workId)}/statistics/${encodeURIComponent(scopeAssignmentId)}/reconciliations` },
        { label: reconciliationId },
      ]}
      items={[
        { label: 'Reconciliation identity', value: reconciliationId },
        { label: 'Trạng thái', value: data?.summary.status ?? state },
        { label: 'Reconciliation generation', value: data?.review?.summary.generationId },
        { label: 'Quyền', value: data?.phase === 'REVIEW_RECOVERY'
          ? 'Review tạm thời không khả dụng'
          : data?.review
            ? data.review.actions.canSubmit ? 'Có thể review' : 'Chỉ đọc'
            : data ? 'Đang chờ generation' : 'Đang xác thực' },
      ]}
    />
    {state === 'READY' && data?.phase === 'READY'
      ? <ReconciliationDetailPanel summary={data.summary} detail={data.detail} review={data.review}
          evidence={data.evidence}
          exporting={exporting} exportError={exportError}
          reviewing={reviewing} reviewFeedback={reviewFeedback}
          lifecycleAction={lifecycleAction}
          downloadingArtifactId={downloadingArtifactId}
          onReview={reviewDecision} onExport={exportEvidence}
          onRecheck={beginRecheck} onSupersede={supersedeReview}
          onDownload={downloadEvidence} />
      : state === 'REVIEW_RECOVERY' && data?.phase === 'REVIEW_RECOVERY'
        ? <ReconciliationReviewRecoveryPanel
            summary={data.summary}
            evidence={data.evidence}
            reviewStatus={data.reviewStatus}
            reviewCode={data.reviewCode}
            lifecycleAction={lifecycleAction}
            reviewFeedback={reviewFeedback}
            onRecheck={beginRecheck}
          />
        : <ReconciliationStateView
            state={state === 'READY' || state === 'REVIEW_RECOVERY'
              ? 'LOADING' : state}
            onRetry={() => { void load(); }} />}
  </main>;
}

function recheckActionFeedback(error: unknown): ReviewFeedback {
  const status = requestStatus(error);
  if (status === 409 || status === 412) {
    return {
      kind: 'STALE',
      message: 'Trạng thái đối soát đã thay đổi; dữ liệu mới nhất đã được tải lại. Hãy kiểm tra trước khi queue recheck lần nữa.',
    };
  }
  if (status === 403 || status === 404) {
    return {
      kind: 'FORBIDDEN',
      message: 'Máy chủ từ chối thao tác recheck hiện tại.',
    };
  }
  return {
    kind: 'ERROR',
    message: 'Không thể queue recheck. Yêu cầu chưa được xác nhận; hãy kiểm tra trước khi thử lại.',
  };
}

function reviewActionFeedback(error: unknown): ReviewFeedback {
  const status = requestStatus(error);
  if (status === 409 || status === 412) {
    return {
      kind: 'STALE',
      message: 'Trạng thái review đã thay đổi; dữ liệu mới nhất đã được tải lại.',
    };
  }
  if (status === 403 || status === 404) {
    return {
      kind: 'FORBIDDEN',
      message: 'Máy chủ từ chối thao tác review hiện tại.',
    };
  }
  return {
    kind: 'ERROR',
    message: 'Không thể ghi quyết định review.',
  };
}

function errorState(error: unknown): ReconciliationUiState {
  const status = requestStatus(error);
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409 || status === 412) return 'STALE';
  return 'ERROR';
}

export default StatisticsReconciliationsPage;
