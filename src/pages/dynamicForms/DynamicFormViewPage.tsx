import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, CircularProgress, Stack, Tab, Tabs, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";

import { useGetDynamicFormQuery } from "../../api/dynamicFormApi";
import DynamicFormEditor from "../../features/dynamicForms/builder/DynamicFormEditor";
import DynamicFormPreview from "../../features/dynamicForms/components/DynamicFormPreview";
import { buildEditorValue } from "../../features/dynamicForms/dynamicFormSchema";
import { UITextKey, uiText } from '../../constants/uiText';

type DetailTab = "DETAIL" | "PREVIEW";

export default function DynamicFormViewPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const query = useGetDynamicFormQuery({ id: id ?? "" }, { skip: !id });
  const [tab, setTab] = useState<DetailTab>("DETAIL");

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
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={1}
      >
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value as DetailTab)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab value="DETAIL" label="Chi tiết" />
          <Tab value="PREVIEW" label="Xem trước" />
        </Tabs>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/dynamic-forms")}
          >
            Quay lại
          </Button>

          {!query.data.isPublished && query.data.canMutate !== false && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/dynamic-forms/${query.data.id}/edit`)}
            >
              Sửa
            </Button>
          )}
        </Box>
      </Stack>

      {tab === "DETAIL" ? (
        <DynamicFormEditor
          key={query.data.id}
          mode="view"
          initialValue={initialValue}
          onBack={() => navigate("/dynamic-forms")}
        />
      ) : (
        <Box sx={{ p: 2 }}>
          <DynamicFormPreview detail={query.data} />
        </Box>
      )}
    </Stack>
  );
}
