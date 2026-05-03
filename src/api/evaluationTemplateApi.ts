import { baseApi } from './base/baseApi';
import type {
  CreateEvaluationTemplateRequest,
  EvaluationTemplateDto,
  UpdateEvaluationTemplateRequest,
} from '../types/evaluationTemplate';

export type EvaluationTemplateSearchRequest = {
  q?: string;
  includeInactive?: boolean;
  isActive?: boolean | null;
};

export const evaluationTemplateApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getEvaluationTemplates: build.query<EvaluationTemplateDto[], EvaluationTemplateSearchRequest | void>({
      query: (arg) => ({
        url: 'evaluation-templates',
        method: 'GET',
        params: {
          q: arg?.q?.trim() || undefined,
          includeInactive: arg?.includeInactive ?? (arg?.isActive === false ? true : undefined),
        },
      }),
    }),

    getEvaluationTemplateById: build.query<EvaluationTemplateDto, string>({
      query: (id) => ({
        url: `evaluation-templates/${id}`,
        method: 'GET',
      }),
    }),

    createEvaluationTemplate: build.mutation<EvaluationTemplateDto, CreateEvaluationTemplateRequest>({
      query: (data) => ({
        url: 'evaluation-templates',
        method: 'POST',
        data,
      }),
    }),

    updateEvaluationTemplate: build.mutation<
      EvaluationTemplateDto,
      { id: string; data: UpdateEvaluationTemplateRequest }
    >({
      query: ({ id, data }) => ({
        url: `evaluation-templates/${id}`,
        method: 'PUT',
        data,
      }),
    }),

    deactivateEvaluationTemplate: build.mutation<void, string>({
      query: (id) => ({
        url: `evaluation-templates/${id}/deactivate`,
        method: 'POST',
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetEvaluationTemplatesQuery,
  useLazyGetEvaluationTemplatesQuery,
  useGetEvaluationTemplateByIdQuery,
  useCreateEvaluationTemplateMutation,
  useUpdateEvaluationTemplateMutation,
  useDeactivateEvaluationTemplateMutation,
} = evaluationTemplateApi;
