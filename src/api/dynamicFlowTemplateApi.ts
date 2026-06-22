import { baseApi } from "./base/baseApi";
import { type PagedResult } from "../types/pagedResult";

export type DynamicFlowTemplateStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type DynamicFlowTemplateVersionStatus = "DRAFT" | "LOCKED" | "ARCHIVED";

export type DynamicFlowTemplateSearchRequest = {
  query?: string | null;
  status?: DynamicFlowTemplateStatus | string | null;
  dynamicFormTemplateId?: string | null;
  page?: number;
  pageSize?: number;
};

export type DynamicFlowTemplateVersionDto = {
  id: string;
  templateId: string;
  dynamicFormTemplateId?: string | null;
  versionNo: number;
  status: DynamicFlowTemplateVersionStatus | string;
  draftRevision: number;
  payloadJson: string;
  payloadHash: string;
  isUsed: boolean;
  lockedAtUtc?: string | null;
  lockedByUserId?: string | null;
  archivedAtUtc?: string | null;
  archivedByUserId?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type DynamicFlowTemplateDto = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  dynamicFormTemplateId?: string | null;
  status: DynamicFlowTemplateStatus | string;
  currentVersionId?: string | null;
  currentVersionNo?: number | null;
  currentVersionHash?: string | null;
  currentVersion?: DynamicFlowTemplateVersionDto | null;
  draftVersion?: DynamicFlowTemplateVersionDto | null;
  versions: DynamicFlowTemplateVersionDto[];
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CreateDynamicFlowTemplateRequest = {
  code: string;
  name: string;
  description?: string | null;
  dynamicFormTemplateId?: string | null;
  payloadJson?: string | null;
};

export type UpdateDynamicFlowTemplateRequest = {
  code?: string | null;
  name?: string | null;
  description?: string | null;
  dynamicFormTemplateId?: string | null;
};

export type SaveDynamicFlowTemplateVersionDraftRequest = {
  payloadJson: string;
};

export const dynamicFlowTemplateApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    searchDynamicFlowTemplates: b.mutation<
      PagedResult<DynamicFlowTemplateDto>,
      DynamicFlowTemplateSearchRequest
    >({
      query: (data) => ({
        url: "/dynamic-flow-templates/search",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "DynamicFlowTemplate", id: "SEARCH" }],
    }),

    getDynamicFlowTemplate: b.query<DynamicFlowTemplateDto, { id: string }>({
      query: ({ id }) => ({
        url: `/dynamic-flow-templates/${id}`,
        method: "GET",
      }),
      providesTags: (_r, _e, arg) => [{ type: "DynamicFlowTemplate", id: arg.id }],
    }),

    createDynamicFlowTemplate: b.mutation<
      DynamicFlowTemplateDto,
      CreateDynamicFlowTemplateRequest
    >({
      query: (data) => ({
        url: "/dynamic-flow-templates",
        method: "POST",
        data,
      }),
      invalidatesTags: [{ type: "DynamicFlowTemplate", id: "SEARCH" }],
    }),

    updateDynamicFlowTemplate: b.mutation<
      DynamicFlowTemplateDto,
      { id: string; body: UpdateDynamicFlowTemplateRequest }
    >({
      query: ({ id, body }) => ({
        url: `/dynamic-flow-templates/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "DynamicFlowTemplate", id: "SEARCH" },
        { type: "DynamicFlowTemplate", id: arg.id },
      ],
    }),

    saveDynamicFlowTemplateVersionDraft: b.mutation<
      DynamicFlowTemplateVersionDto,
      { id: string; body: SaveDynamicFlowTemplateVersionDraftRequest }
    >({
      query: ({ id, body }) => ({
        url: `/dynamic-flow-templates/${id}/versions/draft`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "DynamicFlowTemplate", id: "SEARCH" },
        { type: "DynamicFlowTemplate", id: arg.id },
      ],
    }),

    lockDynamicFlowTemplateVersion: b.mutation<
      DynamicFlowTemplateVersionDto,
      { versionId: string }
    >({
      query: ({ versionId }) => ({
        url: `/dynamic-flow-templates/versions/${versionId}/lock`,
        method: "POST",
        data: {},
      }),
      invalidatesTags: [{ type: "DynamicFlowTemplate", id: "SEARCH" }],
    }),
  }),
});

export const {
  useSearchDynamicFlowTemplatesMutation,
  useLazyGetDynamicFlowTemplateQuery,
  useCreateDynamicFlowTemplateMutation,
  useUpdateDynamicFlowTemplateMutation,
  useSaveDynamicFlowTemplateVersionDraftMutation,
  useLockDynamicFlowTemplateVersionMutation,
} = dynamicFlowTemplateApi;
