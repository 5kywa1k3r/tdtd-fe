// src/api/workFilesApi.ts
import { baseApi } from './base/baseApi';

export type WorkFileRow = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAtUtc: string;
};

export type CreateWorkUploadSessionReq = {
  fileName: string;
  size: number;
  mime?: string | null;
};

export type CreateWorkUploadSessionResp = {
  endpoint: string;
  uploadToken: string;
  chunkSize: number;
  maxSize: number;
};

export const workFilesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listWorkFiles: build.query<WorkFileRow[], string>({
      query: (workId) => ({
        url: `works/${workId}/files`,
        method: 'GET',
      }),
      providesTags: (_r, _e, workId) => [{ type: 'WorkFile' as const, id: workId }],
    }),

    createWorkUploadSession: build.mutation<CreateWorkUploadSessionResp, { workId: string; data: CreateWorkUploadSessionReq }>({
      query: ({ workId, data }) => ({
        url: `works/${workId}/files/upload-session`,
        method: 'POST',
        data,
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'WorkFile' as const, id: arg.workId }],
    }),

    deleteWorkFile: build.mutation<void, { workId: string; fileId: string }>({
      query: ({ workId, fileId }) => ({
        url: `works/${workId}/files/${fileId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'WorkFile' as const, id: arg.workId }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListWorkFilesQuery,
  useCreateWorkUploadSessionMutation,
  useDeleteWorkFileMutation,
} = workFilesApi;