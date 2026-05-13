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
  const isRecordTable = detail.tableKind === "RECORD_TABLE";
  const width = Math.max(0, Number(detail.w ?? 0));
  const height = Math.max(0, Number(detail.h ?? 0));

  const block = {
    dynamicExcelTemplateId: detail.id,
    dynamicExcelCode: detail.code,
    dynamicExcelName: detail.name,
    dataRect: detail.dataRect,
    w: width,
    h: height,
    blockId,
    sectionId: sectionId || null,
    tableMode: "FIXED_GRID",
    indexMap: isRecordTable ? [] : buildFixedGridIndexMap(blockId, width, height),
    excelSpecKind: readExcelSpecKind(detail.specJson),
    tableKind: detail.tableKind ?? "NUMERIC_GRID",
    recordTableSpecJson: detail.recordTableSpecJson ?? null,
  };

  return JSON.stringify(block);
}

function buildFixedGridIndexMap(blockId: string, width: number, height: number) {
  if (width <= 0 || height <= 0) return [];

  return Array.from({ length: width * height }, (_item, index) => {
    const rowKey = `row_${Math.floor(index / width) + 1}`;
    const columnKey = `col_${(index % width) + 1}`;
    return {
      index,
      rowKey,
      columnKey,
      metricKey: `table:${blockId}.row:${rowKey}.column:${columnKey}`,
    };
  });
}

function readExcelSpecKind(specJson?: string | null) {
  try {
    const parsed = specJson ? JSON.parse(specJson) : null;
    const kind = typeof parsed?.kind === "string" ? parsed.kind.trim().toUpperCase() : "";
    return kind === "TOP" || kind === "LEFT" || kind === "MATRIX" ? kind : null;
  } catch {
    return null;
  }
}
