import { baseApi } from '../../api/base/baseApi';
import type { CreateUploadSessionResp, VerifyUploadResp, PresignResp } from './upload.type';

export type CreateUploadSessionReq = {
  sourceType: string;      
  sourceId?: string | null;
  fileName: string;       
  mimeType?: string | null;
  size?: number | null;
};

export const uploadApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    createUploadSession: b.mutation<CreateUploadSessionResp, CreateUploadSessionReq>({
      query: (data) => ({
        url: `/upload-sessions`,
        method: 'POST',
        data, // ✅ axios dùng data
        headers: { 'Content-Type': 'application/json' }, // cho chắc
      }),
    }),

    verifyUpload: b.query<VerifyUploadResp, { uploadId: string, fileName: string }>({
      query: ({ uploadId, fileName }) => ({
        url: `/uploads/verify`,
        method: 'GET',
        params: { uploadId, fileName },
      }),
    }),

    presignDownload: b.query<PresignResp, { fileId: string }>({
      query: ({ fileId }) => ({
        url: `/uploads/presign`,
        method: 'GET',
        params: { fileId },
      }),
    }),
  }),
});

export const {
  useCreateUploadSessionMutation,
  useLazyVerifyUploadQuery,
  useLazyPresignDownloadQuery,
} = uploadApi;