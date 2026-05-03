import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

import { useGetDynamicFormQuery } from "../../api/dynamicFormApi";
import DynamicFormEditor from "../../features/dynamicForms/builder/DynamicFormEditor";
import { buildEditorValue } from "../../features/dynamicForms/dynamicFormSchema";

export default function DynamicFormViewPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const query = useGetDynamicFormQuery({ id: id ?? "" }, { skip: !id });

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
    <Stack spacing={1.5}>
      {!query.data.isPublished && (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/dynamic-forms/${query.data.id}/edit`)}
          >
            Edit
          </Button>
        </Box>
      )}
      <DynamicFormEditor
        key={query.data.id}
        mode="view"
        initialValue={initialValue}
        onBack={() => navigate("/dynamic-forms")}
      />
    </Stack>
  );
}
