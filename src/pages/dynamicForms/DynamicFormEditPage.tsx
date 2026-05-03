import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";

import {
  useGetDynamicFormQuery,
  usePublishDynamicFormMutation,
  useUpdateDynamicFormMutation,
} from "../../api/dynamicFormApi";
import DynamicFormEditor from "../../features/dynamicForms/builder/DynamicFormEditor";
import { buildEditorValue } from "../../features/dynamicForms/dynamicFormSchema";

export default function DynamicFormEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const query = useGetDynamicFormQuery({ id: id ?? "" }, { skip: !id });
  const [update, updateState] = useUpdateDynamicFormMutation();
  const [publish, publishState] = usePublishDynamicFormMutation();

  const initialValue = useMemo(() => {
    if (!query.data) return null;
    return buildEditorValue({
      code: query.data.code,
      name: query.data.name,
      description: query.data.description,
      labels: query.data.labels,
      schemaVersion: query.data.schemaVersion,
      isActive: query.data.isActive,
      sectionsJson: query.data.sectionsJson,
      fieldsJson: query.data.fieldsJson,
      excelBlockJson: query.data.excelBlockJson,
    });
  }, [query.data]);

  if (!id) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography fontWeight={800}>Missing id</Typography>
      </Box>
    );
  }

  if (query.isLoading) {
    return (
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={18} />
        <Typography>Loading form...</Typography>
      </Box>
    );
  }

  if (query.isError || !query.data || !initialValue) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography fontWeight={800}>Cannot load form</Typography>
        <Typography variant="body2" color="text.secondary">
          id: {id}
        </Typography>
      </Box>
    );
  }

  return (
    <DynamicFormEditor
      key={query.data.id}
      mode="edit"
      initialValue={initialValue}
      locked={query.data.isPublished}
      busy={updateState.isLoading || publishState.isLoading}
      onBack={() => navigate("/dynamic-forms")}
      onSave={async (payload) => {
        await update({
          id,
          body: {
            name: payload.name,
            description: payload.description,
            labels: payload.labels,
            schemaVersion: payload.schemaVersion,
            sectionsJson: payload.sectionsJson,
            fieldsJson: payload.fieldsJson,
            excelBlockJson: payload.excelBlockJson,
            isActive: payload.isActive,
          },
        }).unwrap();
        navigate("/dynamic-forms");
      }}
      onPublish={
        query.data.isPublished
          ? undefined
          : async () => {
              await publish({ id }).unwrap();
              navigate("/dynamic-forms");
            }
      }
    />
  );
}
