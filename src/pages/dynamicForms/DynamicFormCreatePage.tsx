import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  useCreateDynamicFormMutation,
  useNextDynamicFormCodeQuery,
} from "../../api/dynamicFormApi";
import {
  type DynamicExcelDetail,
  useLazyGetDynamicExcelQuery,
} from "../../api/dynamicExcelApi";
import DynamicFormEditor from "../../features/dynamicForms/builder/DynamicFormEditor";
import { buildEditorValue } from "../../features/dynamicForms/dynamicFormSchema";

export default function DynamicFormCreatePage() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const nextCodeQ = useNextDynamicFormCodeQuery({ year });
  const [create, createState] = useCreateDynamicFormMutation();
  const [loadDynamicExcel] = useLazyGetDynamicExcelQuery();

  const initialValue = useMemo(
    () =>
      buildEditorValue({
        code: nextCodeQ.data?.nextCode ?? "",
        name: "",
        description: "",
        tagCodes: [],
        schemaVersion: 1,
        isActive: true,
        sectionsJson: "[]",
        fieldsJson: "[]",
        excelBlockJson: null,
        blocksJson: null,
      }),
    [nextCodeQ.data?.nextCode],
  );

  return (
    <DynamicFormEditor
      mode="create"
      initialValue={initialValue}
      busy={createState.isLoading}
      onBack={() => navigate("/dynamic-forms")}
      onBuildDynamicExcelBlock={async (dynamicExcelTemplateId, sectionId) => {
        const detail = await loadDynamicExcel({ id: dynamicExcelTemplateId }).unwrap();
        return buildDynamicExcelBlockJson(detail, sectionId);
      }}
      onSave={async (payload) => {
        await create({
          code: payload.code,
          name: payload.name,
          description: payload.description,
          tagCodes: payload.tagCodes,
          schemaVersion: payload.schemaVersion,
          sectionsJson: payload.sectionsJson,
          fieldsJson: payload.fieldsJson,
          excelBlockJson: payload.excelBlockJson,
          blocksJson: payload.blocksJson,
          isActive: payload.isActive,
        }).unwrap();
        navigate("/dynamic-forms");
      }}
    />
  );
}

function buildDynamicExcelBlockJson(
  detail: DynamicExcelDetail,
  sectionId?: string | null,
) {
  const blockId = `excel_${detail.id}`;
  const width = Math.max(0, Number(detail.w ?? 0));
  const height = Math.max(0, Number(detail.h ?? 0));
  const specMetadata = readExcelSpecMetadata(detail.specJson);
  const tableMode = detail.tableMode || "FIXED_GRID";

  const block = {
    dynamicExcelTemplateId: detail.id,
    dynamicExcelCode: detail.code,
    dynamicExcelName: detail.name,
    dataRect: detail.dataRect,
    w: width,
    h: height,
    blockId,
    sectionId: sectionId || null,
    tableMode,
    indexMap: [],
    excelSpecKind: specMetadata.kind ?? detail.headerKind ?? null,
    defaultDataType: specMetadata.defaultDataType,
    defaultOptions: specMetadata.defaultOptions,
    dataTypeOverrides: specMetadata.dataTypeOverrides,
  };

  return JSON.stringify(block);
}

function readExcelSpecMetadata(specJson?: string | null): {
  kind: "TOP" | "LEFT" | "MATRIX" | null;
  defaultDataType: string;
  defaultOptions: unknown[];
  dataTypeOverrides: unknown[];
} {
  try {
    const parsed = specJson ? JSON.parse(specJson) : null;
    const kind = typeof parsed?.kind === "string" ? parsed.kind.trim().toUpperCase() : "";
    return {
      kind: kind === "TOP" || kind === "LEFT" || kind === "MATRIX" ? kind : null,
      defaultDataType: normalizeExcelDataType(parsed?.defaultDataType),
      defaultOptions: Array.isArray(parsed?.defaultOptions)
        ? parsed.defaultOptions.filter((item: unknown) => isPlainObject(item) || typeof item === "string")
        : [],
      dataTypeOverrides: Array.isArray(parsed?.dataTypeOverrides)
        ? parsed.dataTypeOverrides.filter(isPlainObject)
        : [],
    };
  } catch {
    return { kind: null, defaultDataType: "NUMBER", defaultOptions: [], dataTypeOverrides: [] };
  }
}

function normalizeExcelDataType(value: unknown) {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (raw === "STRINGLIST" || raw === "STRING_LIST" || raw === "TEXT" || raw === "STRING" || raw === "SHORTTEXT") return "SHORT_TEXT";
  if (raw === "MULTISELECT" || raw === "MULTI_SELECT") return "MULTI_SELECT";
  if (raw === "FULLDATE" || raw === "STRICT_DATE") return "FULL_DATE";
  if (raw === "DATE" || raw === "FULL_DATE" || raw === "BOOLEAN" || raw === "SHORT_TEXT" || raw === "MULTI_SELECT") {
    return raw;
  }
  return "NUMBER";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
