import * as React from 'react';
import * as tus from 'tus-js-client';

type TusState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number; bytesUploaded: number; bytesTotal: number; uploadId?: string }
  | { status: 'success'; uploadId: string }
  | { status: 'error'; error: string; uploadId?: string };

function b64(s: string) {
  // tus metadata expects base64
  return btoa(unescape(encodeURIComponent(s)));
}

function extractUploadId(uploadUrl?: string | null) {
  if (!uploadUrl) return undefined;
  const parts = uploadUrl.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

export function useTusUpload() {
  const uploadRef = React.useRef<tus.Upload | null>(null);
  const [state, setState] = React.useState<TusState>({ status: 'idle' });

  const cancel = React.useCallback(async () => {
    const u = uploadRef.current;
    if (!u) return;
    try {
      await u.abort(true); // true: terminate? (keeps partial info handled by tus-js-client)
    } finally {
      uploadRef.current = null;
      setState({ status: 'idle' });
    }
  }, []);

  const start = React.useCallback(async (args: {
    file: File;
    endpoint: string;     // from /upload-sessions resp
    uploadToken: string;  // from /upload-sessions resp
    chunkSize: number;
  }) => {
    const { file, endpoint, uploadToken, chunkSize } = args;

    // reset previous upload instance
    if (uploadRef.current) {
      try { await uploadRef.current.abort(); } catch {}
      uploadRef.current = null;
    }

    const u = new tus.Upload(file, {
      endpoint,
      chunkSize,
      retryDelays: [0, 1000, 3000, 5000],
      removeFingerprintOnSuccess: true,

      onBeforeRequest: (req) => {
        // req.setHeader('Tus-Resumable', '1.0.0');   // ✅ chỉ 1 lần
        req.setHeader('Upload-Token', uploadToken);
      },

      metadata: {
        filename: file.name,
        mime: file.type || 'application/octet-stream',
      },

      onError: (err) => {
        const uploadId = extractUploadId(u.url);
        setState({ status: 'error', error: err?.message || 'Upload error', uploadId });
      },

      onProgress: (bytesUploaded, bytesTotal) => {
        const progress = bytesTotal > 0 ? Math.floor((bytesUploaded / bytesTotal) * 100) : 0;
        const uploadId = extractUploadId(u.url);
        setState({ status: 'uploading', progress, bytesUploaded, bytesTotal, uploadId });
      },

      onSuccess: () => {
        const uploadId = extractUploadId(u.url);
        if (!uploadId) {
          setState({ status: 'error', error: 'Cannot extract uploadId from tus url.' });
          return;
        }
        setState({ status: 'success', uploadId });
      },
    });

    uploadRef.current = u;

    // resume support: find previous uploads for same file fingerprint
    const prev = await u.findPreviousUploads();
    if (prev && prev.length > 0) {
      u.resumeFromPreviousUpload(prev[0]);
    }

    setState({ status: 'uploading', progress: 0, bytesUploaded: 0, bytesTotal: file.size });
    u.start();
  }, []);

  return { state, start, cancel };
}