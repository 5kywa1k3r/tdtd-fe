import { baseApi } from "./base/baseApi";
import { type PagedResult } from "../types/pagedResult";

export type DynamicFormRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  labels: string[];
  schemaVersion: number;
  versionNo: number;
  isActive: boolean;
  isPublished: boolean;
  createdByUsername: string;
  createdAtUtc: string;
};

export type DynamicFormDetail = DynamicFormRow & {
  updatedAtUtc: string;
  publishedAtUtc?: string | null;
  sectionsJson: string;
  fieldsJson: string;
  excelBlockJson?: string | null;
  excelBlockDynamicExcelTemplateId?: string | null;
};

export type DynamicFormSearchReq = {
  q?: string;
  code?: string;
  name?: string;
  createdBy?: string;
  createdFromUtc?: string | null;
  createdToUtc?: string | null;
  labels?: string[] | null;
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
  labels?: string[] | null;
  schemaVersion?: number | null;
  sectionsJson?: string | null;
  fieldsJson?: string | null;
  excelBlockJson?: string | null;
  isActive?: boolean;
};

export type CreateDynamicFormReq = SaveDynamicFormReq & {
  code?: string | null;
};

export type UpdateDynamicFormReq = SaveDynamicFormReq;

export type CloneDynamicFormReq = {
  code?: string | null;
  name?: string | null;
};

export type WrapDynamicExcelAsFormReq = {
  dynamicExcelTemplateId: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  labels?: string[] | null;
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

    deleteDynamicForm: b.mutation<void, { id: string }>({
      query: ({ id }) => ({
        url: `/dynamic-forms/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "DynamicForm", id: "SEARCH" }],
    }),
  }),
});

export const {
  useSearchDynamicFormsMutation,
  useGetDynamicFormQuery,
  useNextDynamicFormCodeQuery,
  useCreateDynamicFormMutation,
  useUpdateDynamicFormMutation,
  usePublishDynamicFormMutation,
  useCloneDynamicFormMutation,
  useWrapDynamicExcelAsFormMutation,
  useDeleteDynamicFormMutation,
} = dynamicFormApi;
