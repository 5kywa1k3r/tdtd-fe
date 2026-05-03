export interface EvaluationTemplateItemDto {
  code: string;
  label: string;
  order: number;
  isActive?: boolean;
}

export interface EvaluationTemplateDto {
  id: string;
  representativeCode: string;
  representativeLabel: string;
  isActive: boolean;
  unitCodeScope?: string | null;
  items: EvaluationTemplateItemDto[];
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
}

export interface EvaluationTemplateItemRequest {
  code: string;
  label: string;
  order: number;
  isActive?: boolean;
}

export interface CreateEvaluationTemplateRequest {
  representativeCode: string;
  representativeLabel: string;
  unitCodeScope?: string | null;
  items: EvaluationTemplateItemRequest[];
}

export interface UpdateEvaluationTemplateRequest {
  representativeLabel: string;
  isActive?: boolean;
  unitCodeScope?: string | null;
  items: EvaluationTemplateItemRequest[];
}
