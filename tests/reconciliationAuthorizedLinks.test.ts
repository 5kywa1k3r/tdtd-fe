import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EvidenceArtifact } from '../src/api/reconciliationApi';

const artifact: EvidenceArtifact = {
  id: 'evidence-01', reconciliationId: 'rec-01', generationId: 'gen-01',
  format: 'JSON', detailLevel: 'REDACTED', fileName: 'evidence.json',
  contentType: 'application/json', manifestSha256: 'm'.repeat(64),
  contentSha256: 'c'.repeat(64), contentLength: 20,
  createdAtUtc: '2026-08-31T00:00:00Z', expiresAtUtc: '2026-09-01T00:00:00Z',
  links: [
    { rel: 'READBACK', method: 'GET', href: '/api/works/w/statistics/s/reconciliations/r/evidence-exports/e' },
    { rel: 'DOWNLOAD', method: 'GET', href: '/api/works/w/statistics/s/reconciliations/r/evidence-exports/e/download' },
  ],
};

function response(config: InternalAxiosRequestConfig, data: unknown) {
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

async function setup(baseURL: string, handle: AxiosAdapter) {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', baseURL);
  const adapter = vi.fn<AxiosAdapter>(handle);
  const create = axios.create.bind(axios);
  vi.spyOn(axios, 'create').mockImplementation(config => create({ ...config, adapter }));
  const { api } = await import('../src/api/base/axios');
  const links = await import('../src/api/reconciliationApi');
  sessionStorage.setItem('tdtd_access_token', 'local-test-token');
  const createObjectURL = vi.fn(() => 'blob:local-authorized-test');
  const revokeObjectURL = vi.fn();
  const NativeURL = URL;
  vi.stubGlobal('URL', class extends NativeURL {
    static createObjectURL = createObjectURL;
    static revokeObjectURL = revokeObjectURL;
  });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  return { api, links, adapter, createObjectURL, revokeObjectURL, click };
}

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('P11 authorized evidence href transport', () => {
  it.each(['/api', 'https://localhost:7232/api'])(
    'uses exactly one API prefix and bearer for baseURL %s', async baseURL => {
      const blob = new Blob(['{"authorized":true}'], { type: 'application/json' });
      const test = await setup(baseURL, async config => response(config,
        config.responseType === 'blob' ? blob : artifact));
      await expect(test.links.readEvidenceArtifact(artifact)).resolves.toEqual(artifact);
      await test.links.downloadEvidenceExport(artifact);
      expect(test.adapter).toHaveBeenCalledTimes(2);
      const origin = new URL(baseURL, window.location.origin).origin;
      test.adapter.mock.calls.forEach(([config], index) => {
        expect(test.api.getUri(config)).toBe(origin + artifact.links[index].href);
        expect(test.api.getUri(config)).not.toContain('/api/api/');
        expect(test.api.getUri(config)).not.toContain('access_token');
        expect(config.method).toBe('get');
        expect(config.headers.Authorization).toBe('Bearer local-test-token');
      });
      expect(test.createObjectURL).toHaveBeenCalledExactlyOnceWith(blob);
      expect(test.click).toHaveBeenCalledOnce();
      expect(test.click.mock.instances[0]).toHaveProperty('download', 'evidence.json');
      expect(test.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:local-authorized-test');
    },
  );

  it.each([
    'https://untrusted.invalid/api/evidence',
    '//untrusted.invalid/api/evidence',
    'http://localhost:7232/api/evidence',
    'javascript:alert(1)',
    'data:text/plain,evidence',
    'https://user:password@localhost:7232/api/evidence',
  ])('rejects an unsafe href before the bearer client: %s', async href => {
    const test = await setup('https://localhost:7232/api', async config => response(config, artifact));
    const unsafe = { ...artifact, links: artifact.links.map(link => ({ ...link, href })) };
    await expect(test.links.readEvidenceArtifact(unsafe)).rejects.toThrow('not authorized');
    await expect(test.links.downloadEvidenceExport(unsafe)).rejects.toThrow('not authorized');
    await expect(test.links.readAuthorizedReconciliationLink({
      rel: 'SOURCE_DETAIL', method: 'GET', href,
    })).rejects.toThrow('not authorized');
    expect(test.adapter).not.toHaveBeenCalled();
    expect(test.createObjectURL).not.toHaveBeenCalled();
    expect(test.click).not.toHaveBeenCalled();
  });

  it('refuses to treat POST metadata as a GET request', async () => {
    const test = await setup('/api', async config => response(config, artifact));
    await expect(test.links.readAuthorizedReconciliationLink({
      rel: 'EVIDENCE_EXPORT', href: '/api/evidence-exports', method: 'POST',
    })).rejects.toThrow('not authorized');
    expect(test.adapter).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404])(
    'preserves denied download status %s without creating a Blob or clicking a download',
    async status => {
      const test = await setup('/api', async config => {
        if (config.url === '/auth/refresh') {
          return response(config, {
            accessToken: 'renewed-local-test-token', user: { id: 'reviewer', roles: [] },
          });
        }
        throw new AxiosError('Denied', 'ERR_BAD_REQUEST', config, undefined, {
          data: { message: 'Denied' }, status, statusText: 'Denied', headers: {}, config,
        });
      });
      await expect(test.links.downloadEvidenceExport(artifact)).rejects.toMatchObject({ status });
      const downloads = test.adapter.mock.calls
        .map(([config]) => config).filter(config => config.url?.endsWith('/download'));
      expect(downloads).toHaveLength(status === 401 ? 2 : 1);
      const refreshes = test.adapter.mock.calls
        .map(([config]) => config).filter(config => config.url === '/auth/refresh');
      expect(refreshes).toHaveLength(status === 401 ? 1 : 0);
      expect(test.createObjectURL).not.toHaveBeenCalled();
      expect(test.revokeObjectURL).not.toHaveBeenCalled();
      expect(test.click).not.toHaveBeenCalled();
    },
  );
});
