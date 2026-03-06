import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";

type Props = {
  label: string;
  options: number[];
  value: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
  maxVisible?: number;
  emptyText?: string;
};

export const NumberChipMultiSelect: React.FC<Props> = ({
  label,
  options,
  value,
  onChange,
  disabled,
  maxVisible = 120,
  emptyText = "Không có lựa chọn hợp lệ trong khoảng thời gian hiện tại.",
}) => {
  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const shown = options.slice(0, maxVisible);

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
        {label}
      </Typography>

      {shown.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          {emptyText}
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {shown.map((n) => {
            const checked = selectedSet.has(n);
            return (
              <Chip
                key={n}
                label={String(n)}
                size="small"
                clickable={!disabled}
                color={checked ? "primary" : "default"}
                variant={checked ? "filled" : "outlined"}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  const next = checked
                    ? value.filter((x) => x !== n)
                    : [...value, n];
                  onChange(Array.from(new Set(next)).sort((a, b) => a - b));
                }}
              />
            );
          })}
        </Stack>
      )}
    </Box>
  );
};