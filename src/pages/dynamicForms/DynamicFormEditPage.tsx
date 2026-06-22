import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";

import {
  useGetDynamicFormQuery,
  useImportDynamicExcelBlockMutation,
  usePublishDynamicFormMutation,
  useUpdateDynamicFormStatisticConfigMutation,
  useUpdateDynamicFormMutation,
} from "../../api/dynamicFormApi";
import DynamicFormEditor from "../../features/dynamicForms/builder/DynamicFormEditor";
import { buildEditorValue } from "../../features/dynamicForms/dynamicFormSchema";
import { UITextKey, uiText } from '../../constants/uiText';

export default function DynamicFormEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const query = useGetDynamicFormQuery({ id: id ?? "" }, { skip: !id });
  const [update, updateState] = useUpdateDynamicFormMutation();
  const [updateStatisticConfig, updateStatisticConfigState] =
    useUpdateDynamicFormStatisticConfigMutation();
  const [publish, publishState] = usePublishDynamicFormMutation();
  const [importDynamicExcelBlock, importDynamicExcelBlockState] =
    useImportDynamicExcelBlockMutation();

  const initialValue = useMemo(() => {
    if (!query.data) return null;
    return buildEditorValue({
      code: query.data.code,
      name: query.data.name,
      description: query.data.description,
      tagCodes: query.data.tagCodes,
      schemaVersion: query.data.schemaVersion,
      isActive: query.data.isActive,
      sectionsJson: query.data.sectionsJson,
      fieldsJson: query.data.fieldsJson,
      excelBlockJson: query.data.excelBlockJson,
      blocksJson: query.data.blocksJson,
    });
  }, [query.data]);

  if (!id) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography fontWeight={800}>{uiText(UITextKey.TextMissingId)}</Typography>
      </Box>
    );
  }

  if (query.isLoading) {
    return (
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={18} />
        <Typography>{uiText(UITextKey.TextLoadingForm)}</Typography>
      </Box>
    );
  }

  if (query.isError || !query.data || !initialValue) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography fontWeight={800}>{uiText(UITextKey.TextCannotLoadForm)}</Typography>
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
      dynamicFormTemplateId={query.data.id}
      initialValue={initialValue}
      locked={query.data.isPublished}
      allowStatisticConfigEdit={query.data.isPublished}
      busy={
        updateState.isLoading ||
        updateStatisticConfigState.isLoading ||
        publishState.isLoading ||
        importDynamicExcelBlockState.isLoading
      }
      onBack={() => navigate("/dynamic-forms")}
      onSave={async (payload) => {
        if (query.data.isPublished) {
          await updateStatisticConfig({
            id,
            body: {
              fieldsJson: payload.fieldsJson,
              excelBlockJson: payload.excelBlockJson,
              blocksJson: payload.blocksJson,
            },
          }).unwrap();
          navigate("/dynamic-forms");
          return;
        }

        await update({
          id,
          body: {
            name: payload.name,
            description: payload.description,
            tagCodes: payload.tagCodes,
            schemaVersion: payload.schemaVersion,
            sectionsJson: payload.sectionsJson,
            fieldsJson: payload.fieldsJson,
            excelBlockJson: payload.excelBlockJson,
            blocksJson: payload.blocksJson,
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
      onImportDynamicExcelBlock={async (dynamicExcelTemplateId, sectionId) => {
        const next = await importDynamicExcelBlock({
          id,
          body: { dynamicExcelTemplateId, sectionId },
        }).unwrap();

        return buildEditorValue({
          code: next.code,
          name: next.name,
          description: next.description,
          tagCodes: next.tagCodes,
          schemaVersion: next.schemaVersion,
          isActive: next.isActive,
          sectionsJson: next.sectionsJson,
          fieldsJson: next.fieldsJson,
          excelBlockJson: next.excelBlockJson,
          blocksJson: next.blocksJson,
        });
      }}
    />
  );
}
