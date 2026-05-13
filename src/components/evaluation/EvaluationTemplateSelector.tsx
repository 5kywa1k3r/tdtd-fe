import { Autocomplete, Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { useMemo } from "react";
import type { EvaluationTemplateDto } from "../../types/evaluationTemplate";
import { useGetEvaluationTemplatesQuery } from "../../api/evaluationTemplateApi";
import { UITextKey, uiText } from '../../constants/uiText';

type Props = {
  value?: string | null;
  onChange: (next: string) => void;
  disabled?: boolean;
  allowCreate?: boolean;
  onCreateNew?: () => void;
};

export default function EvaluationTemplateSelector({
  value,
  onChange,
  disabled,
  allowCreate,
  onCreateNew,
}: Props) {
  const { data, isFetching } = useGetEvaluationTemplatesQuery({ includeInactive: false });
  const options = data ?? [];

  const selected = useMemo(
    () => options.find((x) => x.id === value) ?? null,
    [options, value]
  );

  const renderPreview = (template?: EvaluationTemplateDto | null) => {
    if (!template) return null;
    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {template.representativeCode} • {template.representativeLabel}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {template.items.map((item) => (
            <Chip key={item.code} size="small" label={`${item.label} (${item.code})`} />
          ))}
        </Stack>
      </Box>
    );
  };

  return (
    <Stack spacing={1}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
        <Autocomplete
          fullWidth
          loading={isFetching}
          options={options}
          value={selected}
          disabled={disabled}
          onChange={(_, next) => onChange(next?.id ?? "")}
          getOptionLabel={(option) => `${option.representativeLabel} (${option.representativeCode})`}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              label={uiText(UITextKey.TextBoMaDanhGia)}
              placeholder={uiText(UITextKey.TextChonBoMaDungChoDanhGiaThuCong)}
            />
          )}
        />
        {allowCreate && (
          <Button variant="outlined" onClick={onCreateNew} disabled={disabled}>
            Thêm mới
          </Button>
        )}
      </Stack>
      {renderPreview(selected)}
    </Stack>
  );
}
