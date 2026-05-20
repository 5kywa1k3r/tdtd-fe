import { baseApi } from "./base/baseApi";

export type WorkDocumentScope = "WORK" | "ASSIGNMENT_BRANCH";

export type WorkDocumentRow = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAtUtc: string;
  scope: WorkDocumentScope | string;
  sourceType: string;
  workId?: string | null;
  assignmentId?: string | null;
  assignmentCode?: string | null;
  assignmentPath?: string | null;
  createdByUserId?: string | null;
  createdByName?: string | null;
  canUpdate: boolean;
  canDelete: boolean;
};

export type WorkDocumentUploadTarget = {
  assignmentId: string;
  code: string;
  path: string;
  label: string;
};

export type WorkDocumentUploadOptions = {
  canUploadWork: boolean;
  assignmentTargets: WorkDocumentUploadTarget[];
};

export type CreateWorkDocumentUploadSessionReq = {
  fileName: string;
  size: number;
  mime?: string | null;
};

export type CreateWorkDocumentUploadSessionResp = {
  endpoint: string;
  uploadToken: string;
  chunkSize: number;
  maxSize: number;
};

export type UpdateWorkDocumentReq = {
  originalName?: string | null;
  scope?: WorkDocumentScope | string | null;
  assignmentId?: string | null;
};

export type ListWorkDocumentsArgs = {
  workId: string;
  scope?: "ALL" | "WORK" | "ASSIGNMENT_BRANCH";
  assignmentId?: string | null;
  keyword?: string | null;
};

export const workDocumentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listWorkDocuments: build.query<WorkDocumentRow[], ListWorkDocumentsArgs>({
      query: ({ workId, scope = "ALL", assignmentId, keyword }) => ({
        url: `works/${workId}/documents`,
        method: "GET",
        params: {
          scope,
          assignmentId: assignmentId || undefined,
          keyword: keyword?.trim() || undefined,
        },
      }),
      providesTags: (_result, _error, arg) => [{ type: "WorkDocument" as const, id: arg.workId }],
    }),

    getWorkDocumentUploadOptions: build.query<WorkDocumentUploadOptions, string>({
      query: (workId) => ({
        url: `works/${workId}/documents/upload-options`,
        method: "GET",
      }),
      providesTags: (_result, _error, workId) => [{ type: "WorkDocument" as const, id: `UPLOAD_OPTIONS_${workId}` }],
    }),

    createWorkDocumentUploadSession: build.mutation<
      CreateWorkDocumentUploadSessionResp,
      { workId: string; data: CreateWorkDocumentUploadSessionReq }
    >({
      query: ({ workId, data }) => ({
        url: `works/${workId}/documents/upload-session`,
        method: "POST",
        data,
      }),
    }),

    createAssignmentDocumentUploadSession: build.mutation<
      CreateWorkDocumentUploadSessionResp,
      { workId: string; assignmentId: string; data: CreateWorkDocumentUploadSessionReq }
    >({
      query: ({ workId, assignmentId, data }) => ({
        url: `works/${workId}/assignments/${assignmentId}/documents/upload-session`,
        method: "POST",
        data,
      }),
    }),

    deleteWorkDocument: build.mutation<void, { workId: string; fileId: string }>({
      query: ({ workId, fileId }) => ({
        url: `works/${workId}/documents/${fileId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: "WorkDocument" as const, id: arg.workId }],
    }),

    updateWorkDocument: build.mutation<
      WorkDocumentRow,
      { workId: string; fileId: string; data: UpdateWorkDocumentReq }
    >({
      query: ({ workId, fileId, data }) => ({
        url: `works/${workId}/documents/${fileId}`,
        method: "PATCH",
        data,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: "WorkDocument" as const, id: arg.workId }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListWorkDocumentsQuery,
  useGetWorkDocumentUploadOptionsQuery,
  useCreateWorkDocumentUploadSessionMutation,
  useCreateAssignmentDocumentUploadSessionMutation,
  useDeleteWorkDocumentMutation,
  useUpdateWorkDocumentMutation,
} = workDocumentsApi;
