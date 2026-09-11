import { baseApi } from "./base/baseApi";
import { type PagedResult } from "../types/pagedResult";
import type { UserRefDTO } from "../types/userRefDto";
import type { DynamicFormSchema } from "./contracts/dynamicFormSchemaContract";

export {
  buildDynamicFormSchemaPayload,
} from "./contracts/dynamicFormSchemaContract";
export type {
  DynamicFormLegacySchemaPayload,
  DynamicFormSchema,
  DynamicFormSchemaBlock,
  DynamicFormSchemaField,
  DynamicFormSchemaFieldType,
  DynamicFormSchemaOption,
  DynamicFormSchemaSection,
  DynamicFormSchemaTableMode,
  DynamicFormSchemaValueSource,
  DynamicFormSchemaValueSourceType,
} from "./contracts/dynamicFormSchemaContract";

export type DynamicFormLineageStatus =
  | "ROOT"
  | "VERSION"
  | "CLONE"
  | "WRAPPED"
  | "LEGACY"
  | (string & {});

export type DynamicFormActionCapabilities = {
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canCreateVersion: boolean;
  canViewHistory: boolean;
  canClone: boolean;
  canImport: boolean;
  canUpdateStatistics: boolean;
};

export type DynamicFormRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  tagCodes: string[];
  schemaVersion: number;
  versionNo: number;
  familyId: string;
  previousVersionId?: string | null;
  clonedFromVersionId?: string | null;
  lineageStatus: DynamicFormLineageStatus;
  revision: number;
  isActive: boolean;
  isPublished: boolean;
  createdByUserId?: string | null;
  createdByUsername: string;
  createdAtUtc: string;
  canMutate?: boolean;
  canClone?: boolean;
  canViewByCloneGrant?: boolean;
  publishedSchemaHash?: string | null;
  actions: DynamicFormActionCapabilities;
};

export type DynamicFormDetail = DynamicFormRow & {
  updatedAtUtc: string;
  publishedAtUtc?: string | null;
  schema: DynamicFormSchema;
  /** @deprecated Use schema.sections. */
  sectionsJson: string;
  /** @deprecated Use schema.fields. */
  fieldsJson: string;
  /** @deprecated Use schema.blocks[0]. */
  excelBlockJson?: string | null;
  /** @deprecated Use schema.blocks. */
  blocksJson?: string | null;
  excelBlockDynamicExcelTemplateId?: string | null;
  statisticConfigUpdatedAtUtc?: string | null;
  statisticConfigUpdatedByUserId?: string | null;
  statisticConfigUpdateMonthKey?: string | null;
  publishedSchemaSnapshotJson?: string | null;
};

export type DynamicFormVersionHistoryResp = {
  familyId: string;
  code: string;
  versions: DynamicFormRow[];
};

export type CreateDynamicFormVersionReq = {
  expectedRevision: number;
  name?: string | null;
  description?: string | null;
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
  schema?: DynamicFormSchema | null;
  /** @deprecated Use schema.sections. */
  sectionsJson?: string | null;
  /** @deprecated Use schema.fields. */
  fieldsJson?: string | null;
  /** @deprecated Use schema.blocks[0]. */
  excelBlockJson?: string | null;
  /** @deprecated Use schema.blocks. */
  blocksJson?: string | null;
  isActive?: boolean;
};

export type CreateDynamicFormReq = SaveDynamicFormReq & {
  code?: string | null;
};

export type UpdateDynamicFormReq = SaveDynamicFormReq & {
  expectedRevision: number;
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
  expectedRevision: number;
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

    getDynamicFormVersionHistory: b.query<DynamicFormVersionHistoryResp, { id: string }>({
      query: ({ id }) => ({
        url: `/dynamic-forms/${id}/versions`,
        method: "GET",
      }),
      providesTags: (result, _error, arg) => [
        { type: "DynamicForm", id: `VERSIONS:${result?.familyId ?? arg.id}` },
      ],
    }),

    createDynamicFormVersion: b.mutation<
      DynamicFormDetail,
      { id: string; body: CreateDynamicFormVersionReq }
    >({
      query: ({ id, body }) => ({
        url: `/dynamic-forms/${id}/versions`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result, _error, arg) => [
        { type: "DynamicForm", id: "SEARCH" },
        { type: "DynamicForm", id: arg.id },
        { type: "DynamicForm", id: `VERSIONS:${result?.familyId ?? arg.id}` },
      ],
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
      invalidatesTags: (result, _e, arg) => result
        ? [
            { type: "DynamicForm", id: "SEARCH" },
            { type: "DynamicForm", id: arg.id },
            { type: "DynamicForm", id: `VERSIONS:${result.familyId}` },
          ]
        : [],
    }),

    publishDynamicForm: b.mutation<
      DynamicFormDetail,
      { id: string; expectedRevision: number }
    >({
      query: ({ id, expectedRevision }) => ({
        url: `/dynamic-forms/${id}/publish`,
        method: "POST",
        data: { expectedRevision },
      }),
      invalidatesTags: (result, _e, arg) => result
        ? [
            { type: "DynamicForm", id: "SEARCH" },
            { type: "DynamicForm", id: arg.id },
            { type: "DynamicForm", id: `VERSIONS:${result.familyId}` },
          ]
        : [],
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
      invalidatesTags: (result, _e, arg) => result
        ? [
            { type: "DynamicForm", id: "SEARCH" },
            { type: "DynamicForm", id: arg.id },
            { type: "DynamicForm", id: `VERSIONS:${result.familyId}` },
          ]
        : [],
    }),

    deleteDynamicForm: b.mutation<void, { id: string; expectedRevision: number }>({
      query: ({ id, expectedRevision }) => ({
        url: `/dynamic-forms/${id}`,
        method: "DELETE",
        params: { expectedRevision },
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
  useLazyGetDynamicFormQuery,
  useGetDynamicFormVersionHistoryQuery,
  useCreateDynamicFormVersionMutation,
  useNextDynamicFormCodeQuery,
  useCreateDynamicFormMutation,
  useUpdateDynamicFormMutation,
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
