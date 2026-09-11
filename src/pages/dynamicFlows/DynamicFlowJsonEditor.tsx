import { useEffect, useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";

type DynamicFlowJsonEditorProps<T> = {
  editorId: string;
  label: string;
  description?: string;
  value: T;
  disabled?: boolean;
  rows?: number;
  expect?: "array" | "object";
  onChange: (value: T) => void;
  onValidityChange?: (editorId: string, valid: boolean) => void;
  onRawDirtyChange?: (editorId: string, dirty: boolean) => void;
  rawText?: string;
  onRawTextChange?: (editorId: string, text: string | null) => void;
};

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function DynamicFlowJsonEditor<T>({
  editorId,
  label,
  description,
  value,
  disabled = false,
  rows = 10,
  expect,
  onChange,
  onValidityChange,
  onRawDirtyChange,
  rawText,
  onRawTextChange,
}: DynamicFlowJsonEditorProps<T>) {
  const formattedValue = formatJson(value);
  const [text, setText] = useState(rawText ?? formattedValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rawText !== undefined) {
      setText(rawText);
      onRawDirtyChange?.(editorId, rawText !== formattedValue);
      try {
        const parsed = JSON.parse(rawText);
        const validShape =
          (expect !== "array" || Array.isArray(parsed)) &&
          (expect !== "object" || (Boolean(parsed) && typeof parsed === "object" && !Array.isArray(parsed)));
        setError(validShape ? null : expect === "array"
          ? "Giá trị phải là một mảng JSON."
          : "Giá trị phải là một object JSON.");
        onValidityChange?.(editorId, validShape);
      } catch {
        setError("JSON không hợp lệ.");
        onValidityChange?.(editorId, false);
      }
      return;
    }
    if (error) return;
    setText(formattedValue);
    onValidityChange?.(editorId, true);
    onRawDirtyChange?.(editorId, false);
  }, [editorId, error, expect, formattedValue, onRawDirtyChange, onValidityChange, rawText]);

  const apply = () => {
    try {
      const parsed = JSON.parse(text) as T;
      if (expect === "array" && !Array.isArray(parsed)) {
        throw new Error("Giá trị phải là một mảng JSON.");
      }
      if (
        expect === "object" &&
        (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      ) {
        throw new Error("Giá trị phải là một object JSON.");
      }
      setError(null);
      onValidityChange?.(editorId, true);
      onChange(parsed);
      setText(formatJson(parsed));
      onRawTextChange?.(editorId, null);
      onRawDirtyChange?.(editorId, false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "JSON không hợp lệ.";
      setError(message);
      onValidityChange?.(editorId, false);
      onRawDirtyChange?.(editorId, true);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        gap={1}
        sx={{ mb: 1 }}
      >
        <Box>
          <Typography fontWeight={800}>{label}</Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          ) : null}
        </Box>
        {!disabled ? (
          <Stack direction="row" gap={1}>
            {rawText !== undefined || text !== formattedValue ? (
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  setText(formattedValue);
                  setError(null);
                  onValidityChange?.(editorId, true);
                  onRawTextChange?.(editorId, null);
                  onRawDirtyChange?.(editorId, false);
                }}
              >
                Hoàn tác JSON
              </Button>
            ) : null}
            <Button size="small" variant="outlined" onClick={apply}>
              Áp dụng JSON
            </Button>
          </Stack>
        ) : null}
      </Stack>
      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}
      <TextField
        id={`dynamic-flow-json-editor-${editorId}`}
        data-dynamic-flow-editor={editorId}
        fullWidth
        multiline
        minRows={rows}
        maxRows={Math.max(rows, 22)}
        value={text}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          setError(null);
          onRawTextChange?.(editorId, next);
          try {
            const parsed = JSON.parse(next);
            const validShape =
              (expect !== "array" || Array.isArray(parsed)) &&
              (expect !== "object" || (Boolean(parsed) && typeof parsed === "object" && !Array.isArray(parsed)));
            onValidityChange?.(editorId, validShape);
          } catch {
            onValidityChange?.(editorId, false);
          }
          onRawDirtyChange?.(editorId, next !== formattedValue);
        }}
        onBlur={() => {
          if (!disabled && text !== formattedValue) apply();
        }}
        inputProps={{
          "aria-label": label,
          spellCheck: false,
          style: { fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: 13 },
        }}
      />
    </Box>
  );
}
