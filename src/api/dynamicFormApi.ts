import { baseApi } from "./base/baseApi";
import { type PagedResult } from "../types/pagedResult";
import type { UserRefDTO } from "../types/userRefDto";

export type DynamicFormRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  tagCodes: string[];
  schemaVersion: number;
  versionNo: number;
  isActive: boolean;
  isPublished: boolean;
  createdByUserId?: string | null;
  createdByUsername: string;
  createdAtUtc: string;
  canMutate?: boolean;
  canClone?: boolean;
  canViewByCloneGrant?: boolean;
};

export type DynamicFormDetail = DynamicFormRow & {
  updatedAtUtc: string;
  publishedAtUtc?: string | null;
  sectionsJson: string;
  fieldsJson: string;
  excelBlockJson?: string | null;
  blocksJson?: string | null;
  excelBlockDynamicExcelTemplateId?: string | null;
  statisticConfigUpdatedAtUtc?: string | null;
  statisticConfigUpdatedByUserId?: string | null;
  statisticConfigUpdateMonthKey?: string | null;
};

export type DynamicFormCloneRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type DynamicFormCloneRequestRow = {
  id: string;
  workId: string;
  workAssignmentId: string;
  assignmentCode: string;
  dynamicFormTemplateId: string;
  dynamicFormTemplateCode?: string | null;
  dynamicFormTemplateName?: string | null;
  requester?: UserRefDTO | null;
  assignmentOwner?: UserRefDTO | null;
  status: DynamicFormCloneRequestStatus;
  requestReason?: string | null;
  reviewComment?: string | null;
  reviewedAtUtc?: string | null;
  reviewedByUserId?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type DynamicFormCloneRequestSearchReq = {
  status?: DynamicFormCloneRequestStatus | null;
  page: number;
  pageSize: number;
};

export type DynamicFormSearchReq = {
  q?: string;
  code?: string;
  name?: string;
  createdBy?: string;
  createdFromUtc?: string | null;
  createdToUtc?: string | null;
  tagCodes?: string[] | null;
  isActive?: boolean | null;
  isPublished?: boolean | null;
  page: number;
  pageSize: number;
  sortField?: "code" | "name" | "createdAtUtc" | "updatedAtUtc" | "createdByUsername" | "versionNo";
  sortDirection?: "asc" | "desc";
};

export type NextCodeResp = { prefix: string; year: number; nextSeq: number; nextCode: string };

export type SaveDynamicFormReq = {
  name: string;
  description?: string | null;
  tagCodes?: string[] | null;
  schemaVersion?: number | null;
  sectionsJson?: string | null;
  fieldsJson?: string | null;
  excelBlockJson?: string | null;
  blocksJson?: string | null;
  isActive?: boolean;
};

export type CreateDynamicFormReq = SaveDynamicFormReq & {
  code?: string | null;
};

export type UpdateDynamicFormReq = SaveDynamicFormReq;

export type UpdateDynamicFormStatisticConfigReq = {
  fieldsJson?: string | null;
  excelBlockJson?: string | null;
  blocksJson?: string | null;
};

export type DynamicFormStatisticConfigUpdateResp = {
  template: DynamicFormDetail;
  statisticRebuildJobId: string;
  queuedReportCount: number;
  statisticRebuildScheduledAtUtc?: string | null;
  statisticRebuildRunsImmediately: boolean;
  statisticConfigUpdatedAtUtc?: string | null;
  statisticConfigUpdatedByUserId?: string | null;
  statisticConfigUpdateMonthKey?: string | null;
};

export type CloneDynamicFormReq = {
  code?: string | null;
  name?: string | null;
};

export type WrapDynamicExcelAsFormReq = {
  dynamicExcelTemplateId: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  tagCodes?: string[] | null;
};

export type ImportDynamicExcelBlockReq = {
  dynamicExcelTemplateId: string;
  sectionId?: string | null;
};

export const dynamicFormApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    searchDynamicForms: b.mutation<PagedResult<DynamicFormRow>, DynamicFormSearchReq>({
      query: (data) => ({
        url: "/dynamic-forms/search",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "DynamicForm", id: "SEARCH" }],
    }),

    getDynamicForm: b.query<DynamicFormDetail, { id: string }>({
      query: ({ id }) => ({
        url: `/dynamic-forms/${id}`,
        method: "GET",
      }),
      providesTags: (_r, _e, arg) => [{ type: "DynamicForm", id: arg.id }],
    }),

    nextDynamicFormCode: b.query<NextCodeResp, { year?: number }>({
      query: ({ year }) => ({
        url: "/dynamic-forms/next-code",
        method: "GET",
        params: year ? { year } : undefined,
      }),
    }),

    createDynamicForm: b.mutation<DynamicFormDetail, CreateDynamicFormReq>({
      query: (data) => ({
        url: "/dynamic-forms",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "DynamicForm", id: "SEARCH" }],
    }),

    updateDynamicForm: b.mutation<DynamicFormDetail, { id: string; body: UpdateDynamicFormReq }>({
      query: ({ id, body }) => ({
        url: `/dynamic-forms/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "DynamicForm", id: "SEARCH" },
        { type: "DynamicForm", id: arg.id },
      ],
    }),

    updateDynamicFormStatisticConfig: b.mutation<
      DynamicFormStatisticConfigUpdateResp,
      { id: string; body: UpdateDynamicFormStatisticConfigReq }
    >({
      query: ({ id, body }) => ({
        url: `/dynamic-forms/${id}/statistics`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "DynamicForm", id: "SEARCH" },
        { type: "DynamicForm", id: arg.id },
      ],
    }),

    publishDynamicForm: b.mutation<DynamicFormDetail, { id: string }>({
      query: ({ id }) => ({
        url: `/dynamic-forms/${id}/publish`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "DynamicForm", id: "SEARCH" },
        { type: "DynamicForm", id: arg.id },
      ],
    }),

    cloneDynamicForm: b.mutation<DynamicFormDetail, { id: string; body: CloneDynamicFormReq }>({
      query: ({ id, body }) => ({
        url: `/dynamic-forms/${id}/clone`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: [{ type: "DynamicForm", id: "SEARCH" }],
    }),

    wrapDynamicExcelAsForm: b.mutation<DynamicFormDetail, WrapDynamicExcelAsFormReq>({
      query: (data) => ({
        url: "/dynamic-forms/wrap-dynamic-excel",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "DynamicForm", id: "SEARCH" }],
    }),

    importDynamicExcelBlock: b.mutation<
      DynamicFormDetail,
      { id: string; body: ImportDynamicExcelBlockReq }
    >({
      query: ({ id, body }) => ({
        url: `/dynamic-forms/${id}/blocks/import-dynamic-excel`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "DynamicForm", id: "SEARCH" },
        { type: "DynamicForm", id: arg.id },
      ],
    }),

    deleteDynamicForm: b.mutation<void, { id: string }>({
      query: ({ id }) => ({
        url: `/dynamic-forms/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "DynamicForm", id: "SEARCH" }],
    }),

    createDynamicFormCloneRequest: b.mutation<
      DynamicFormCloneRequestRow,
      { assignmentId: string; reason?: string | null }
    >({
      query: ({ assignmentId, reason }) => ({
        url: `/work-assignments/${assignmentId}/dynamic-form-clone-requests`,
        method: "POST",
        data: { reason: reason ?? null },
      }),
      invalidatesTags: [{ type: "DynamicFormCloneRequest", id: "LIST" }],
    }),

    searchMyDynamicFormCloneRequests: b.mutation<
      PagedResult<DynamicFormCloneRequestRow>,
      { workId: string; req: DynamicFormCloneRequestSearchReq }
    >({
      query: ({ workId, req }) => ({
        url: `/works/${workId}/dynamic-form-clone-requests/my`,
        method: "POST",
        data: req,
      }),
      invalidatesTags: [{ type: "DynamicFormCloneRequest", id: "LIST" }],
    }),

    searchPendingDynamicFormCloneRequests: b.mutation<
      PagedResult<DynamicFormCloneRequestRow>,
      { workId: string; req: DynamicFormCloneRequestSearchReq }
    >({
      query: ({ workId, req }) => ({
        url: `/works/${workId}/dynamic-form-clone-requests/pending-approval`,
        method: "POST",
        data: req,
      }),
      invalidatesTags: [{ type: "DynamicFormCloneRequest", id: "LIST" }],
    }),

    approveDynamicFormCloneRequest: b.mutation<
      DynamicFormCloneRequestRow,
      { id: string; comment?: string | null }
    >({
      query: ({ id, comment }) => ({
        url: `/dynamic-form-clone-requests/${id}/approve`,
        method: "POST",
        data: { comment: comment ?? null },
      }),
      invalidatesTags: [
        { type: "DynamicFormCloneRequest", id: "LIST" },
        { type: "DynamicForm", id: "SEARCH" },
      ],
    }),

    rejectDynamicFormCloneRequest: b.mutation<
      DynamicFormCloneRequestRow,
      { id: string; comment?: string | null }
    >({
      query: ({ id, comment }) => ({
        url: `/dynamic-form-clone-requests/${id}/reject`,
        method: "POST",
        data: { comment: comment ?? null },
      }),
      invalidatesTags: [{ type: "DynamicFormCloneRequest", id: "LIST" }],
    }),
  }),
});

export const {
  useSearchDynamicFormsMutation,
  useGetDynamicFormQuery,
  useNextDynamicFormCodeQuery,
  useCreateDynamicFormMutation,
  useUpdateDynamicFormMutation,
  useUpdateDynamicFormStatisticConfigMutation,
  usePublishDynamicFormMutation,
  useCloneDynamicFormMutation,
  useWrapDynamicExcelAsFormMutation,
  useImportDynamicExcelBlockMutation,
  useDeleteDynamicFormMutation,
  useCreateDynamicFormCloneRequestMutation,
  useSearchMyDynamicFormCloneRequestsMutation,
  useSearchPendingDynamicFormCloneRequestsMutation,
  useApproveDynamicFormCloneRequestMutation,
  useRejectDynamicFormCloneRequestMutation,
} = dynamicFormApi;
