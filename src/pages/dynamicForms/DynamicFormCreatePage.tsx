import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  useCreateDynamicFormMutation,
  useNextDynamicFormCodeQuery,
} from "../../api/dynamicFormApi";
import DynamicFormEditor from "../../features/dynamicForms/builder/DynamicFormEditor";
import { buildEditorValue } from "../../features/dynamicForms/dynamicFormSchema";

export default function DynamicFormCreatePage() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const nextCodeQ = useNextDynamicFormCodeQuery({ year });
  const [create, createState] = useCreateDynamicFormMutation();

  const initialValue = useMemo(
    () =>
      buildEditorValue({
        code: nextCodeQ.data?.nextCode ?? "",
        name: "",
        description: "",
        labels: [],
        schemaVersion: 1,
        isActive: true,
        sectionsJson: "[]",
        fieldsJson: "[]",
        excelBlockJson: null,
      }),
    [nextCodeQ.data?.nextCode],
  );

  return (
    <DynamicFormEditor
      mode="create"
      initialValue={initialValue}
      busy={createState.isLoading}
      onBack={() => navigate("/dynamic-forms")}
      onSave={async (payload) => {
        await create({
          code: payload.code,
          name: payload.name,
          description: payload.description,
          labels: payload.labels,
          schemaVersion: payload.schemaVersion,
          sectionsJson: payload.sectionsJson,
          fieldsJson: payload.fieldsJson,
          excelBlockJson: payload.excelBlockJson,
          isActive: payload.isActive,
        }).unwrap();
        navigate("/dynamic-forms");
      }}
    />
  );
}
