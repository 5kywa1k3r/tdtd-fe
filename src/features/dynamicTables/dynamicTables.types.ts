export type DataRectDto = { r: number; c: number; w: number; h: number };

export type DynamicTableTemplateResp = {
  id: string;
  workNodeId: string;
  name: string;
  rawWorkbookDataJson: string;
  specJson: string;
  dataRect: DataRectDto;
  w: number;
  h: number;
  updatedAtUtc: string;
};

export type DynamicTableTemplateCreateReq = {
  workNodeId: string;
  name: string;
  rawWorkbookDataJson: string;
  specJson: string;
  dataRect: DataRectDto;
  w: number;
  h: number;
};

export type DynamicTableTemplateUpdateReq = {
  name: string;
  rawWorkbookDataJson: string;
  specJson: string;
  dataRect: DataRectDto;
  w: number;
  h: number;
};

export type DynamicTableSubmissionUpsertReq = {
  workNodeId: string;
  templateId: string;
  assigneeUnitId: string;
  periodKey: string;
  w: number;
  h: number;
  values1D: Array<number | null>;
};

export type DynamicTableSubmissionResp = {
  id: string;
  workNodeId: string;
  templateId: string;
  assigneeUnitId: string;
  periodKey: string;
  w: number;
  h: number;
  values1D: Array<number | null>;
  updatedAtUtc: string;
};

export type AggregateMode = "SUM_CELL" | "STACK_ROWS" | "SUM_ROWS" | "STACK_COLS" | "SUM_COLS";

export type DynamicTableAggregateResp = {
  workNodeId: string;
  templateId: string;
  periodKey: string;
  mode: AggregateMode;
  w: number;
  h: number;
  values1D: Array<number | null>;
  sourceCount: number;
};