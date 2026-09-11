import { baseApi } from "./base/baseApi";

export type Nq57JsonRow = Record<string, unknown>;

export type Nq57UnitTextDto = {
  unitId?: string | null;
  unitName?: string | null;
  html?: string | null;
  text?: string | null;
};

export type Nq57SectionAggregationDto = {
  idxId?: string | null;
  idxCode?: string | null;
  units: Nq57UnitTextDto[];
};

export type Nq57BuildSavePayloadRequest = {
  templateRows: Nq57JsonRow[];
  sections: Nq57SectionAggregationDto[];
  preserveTemplateWhenEmpty?: boolean;
  generatedBy?: string | null;
};

export type Nq57BuildSavePayloadResponse = {
  rows: Nq57JsonRow[];
  rowCount: number;
  mappedSectionCount: number;
  unitCount: number;
};

export type Nq57PushRequest = {
  url?: string | null;
  baseUrl?: string | null;
  method?: "POST" | "PUT" | "PATCH" | "GET";
  grantId?: number | null;
  action?: string | null;
  cookie?: string | null;
  bearerToken?: string | null;
  headers?: Record<string, string> | null;
  payload: unknown;
};

export type Nq57PushResponse = {
  statusCode: number;
  success: boolean;
  reasonPhrase?: string | null;
  requestUrl: string;
  bodyPreview: string;
  elapsedMs: number;
};

export const nq57Api = baseApi.injectEndpoints({
  endpoints: (b) => ({
    buildNq57SavePayload: b.mutation<Nq57BuildSavePayloadResponse, Nq57BuildSavePayloadRequest>({
      query: (data) => ({
        url: "/nq57/build-save-payload",
        method: "POST",
        data,
      }),
    }),
    pushNq57Payload: b.mutation<Nq57PushResponse, Nq57PushRequest>({
      query: (data) => ({
        url: "/nq57/push",
        method: "POST",
        data,
      }),
    }),
  }),
});

export const {
  useBuildNq57SavePayloadMutation,
  usePushNq57PayloadMutation,
} = nq57Api;
