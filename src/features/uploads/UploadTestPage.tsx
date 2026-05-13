import * as React from 'react';
import {
  Box, Button, Card, CardContent, Divider, LinearProgress, Stack, TextField, Typography
} from '@mui/material';
import {
  useCreateUploadSessionMutation,
  useLazyVerifyUploadQuery,
  useLazyPresignDownloadQuery,
} from '../../api/uploadApi';
import { useTusUpload } from './useTusUpload';
import { UITextKey, uiText } from '../../constants/uiText';

export default function UploadTestPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [sourceType, setSourceType] = React.useState('WORK');
  const [sourceId, setSourceId] = React.useState<string>('');

  const [createSession, createSessionState] = useCreateUploadSessionMutation();
  const [verify, verifyState] = useLazyVerifyUploadQuery();
  const [presign, presignState] = useLazyPresignDownloadQuery();

  const { state: tusState, start, cancel } = useTusUpload();

  const uploadId =
    tusState.status === 'uploading' ? tusState.uploadId :
    tusState.status === 'success' ? tusState.uploadId :
    tusState.status === 'error' ? tusState.uploadId :
    undefined;

  const fileId =
    verifyState.data && verifyState.data.ok ? verifyState.data.fileId : undefined;

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const onStartUpload = async () => {
    if (!file) return;

    const st = sourceType.trim() || 'WORK';
    const sid = sourceId.trim();

    const sess = await createSession({
      sourceType: st,
      sourceId: sid ? sid : null,
      fileName: file.name,
      mimeType: file.type || null,
      size: file.size,
    }).unwrap();

    console.log('upload session resp:', sess);

    if (!sess.uploadToken) {
      throw new Error('Thiếu thông tin xác nhận tải lên.');
    }

    if (file.size > sess.maxSize) {
      alert(`Tệp quá lớn. Dung lượng tối đa: ${sess.maxSize} byte.`);
      return;
    }

    await start({
      file,
      endpoint: sess.endpoint,
      uploadToken: sess.uploadToken,
      chunkSize: sess.chunkSize,
    });
  };

  const onVerify = async () => {
    if (!uploadId || !file) return;
    await verify({ uploadId, fileName: file.name }, true);
  };

  const onPresign = async () => {
    if (!fileId) return;
    const r = await presign({ fileId }, true);
    if (r.data?.ok && r.data.url) {
      window.open(r.data.url, '_blank', 'noopener,noreferrer');
    }
  };

  React.useEffect(() => {
    if (tusState.status === 'success' && uploadId && file) {
      void verify({ uploadId, fileName: file.name }, true);
    }
  }, [tusState.status, uploadId, verify]);

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ maxWidth: 900, mx: 'auto' }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800}>
            Kiểm tra tải tệp lên
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Loại dữ liệu liên quan"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                fullWidth
              />
              <TextField
                label="Mã liên quan (không bắt buộc)"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Button variant="outlined" component="label">
                Chọn tệp
                <input hidden type="file" onChange={onPickFile} />
              </Button>

              <Typography variant="body2" sx={{ flex: 1, opacity: 0.85 }}>
                {file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : 'Chưa chọn tệp'}
              </Typography>

              <Button
                variant="contained"
                disabled={!file || createSessionState.isLoading || tusState.status === 'uploading'}
                onClick={onStartUpload}
              >
                Tải lên
              </Button>

              <Button
                variant="text"
                disabled={tusState.status !== 'uploading'}
                onClick={cancel}
              >
                Hủy
              </Button>
            </Stack>

            {createSessionState.isError && (
              <Typography color="error" variant="body2">
                Không chuẩn bị được lượt tải lên. Vui lòng thử lại hoặc kiểm tra kết nối.
              </Typography>
            )}

            {(tusState.status === 'uploading') && (
              <Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Đang tải lên... {tusState.progress}%</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.75 }}>
                    {tusState.bytesUploaded} / {tusState.bytesTotal}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={tusState.progress} />
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Mã lượt tải lên: {tusState.uploadId ?? '(chưa có)'}
                </Typography>
              </Box>
            )}

            {(tusState.status === 'error') && (
              <Box>
                <Typography color="error" fontWeight={700}>{uiText(UITextKey.TextUploadError)}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>{tusState.error}</Typography>
              </Box>
            )}

            <Divider />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Button
                variant="outlined"
                disabled={!uploadId || verifyState.isFetching}
                onClick={onVerify}
              >
                Kiểm tra
              </Button>

              <Typography variant="body2" sx={{ flex: 1, opacity: 0.85 }}>
                Kết quả kiểm tra: {verifyState.data ? JSON.stringify(verifyState.data) : '(chưa kiểm tra)'}
              </Typography>


            </Stack>
            <Button
                variant="contained"
                disabled={!fileId || presignState.isFetching}
                onClick={onPresign}
            >
              Mở tệp
            </Button>
            {fileId && (
              <Typography variant="body2" fontWeight={800}>
                Mã tệp: {fileId}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
