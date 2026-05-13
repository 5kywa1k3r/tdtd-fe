import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type ListPageToolbarProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  filters?: ReactNode;
  filterActions?: ReactNode;
  secondaryActions?: ReactNode;
  primaryActions?: ReactNode;
  sx?: SxProps<Theme>;
};

export const listToolbarButtonSx = {
  height: 40,
  px: 1.5,
  whiteSpace: "nowrap",
  flexShrink: 0,
  minWidth: "max-content",
} satisfies SxProps<Theme>;

export const listToolbarIconButtonSx = {
  width: 40,
  height: 40,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1,
  flexShrink: 0,
} satisfies SxProps<Theme>;

export function ListPageToolbar({
  title,
  subtitle,
  filters,
  filterActions,
  secondaryActions,
  primaryActions,
  sx,
}: ListPageToolbarProps) {
  const hasHeading = Boolean(title || subtitle);

  return (
    <Box sx={[{ width: "100%" }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      {hasHeading && (
        <Box sx={{ mb: 1.5, minWidth: 0 }}>
          {title && (
            <Typography variant="h6" fontWeight={800}>
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          flexWrap: { xs: "wrap", lg: "nowrap" },
          alignItems: "center",
          gap: 1,
          width: "100%",
          minWidth: 0,
        }}
      >
        {filters && (
          <Box
            sx={{
              display: "flex",
              flexWrap: { xs: "wrap", lg: "nowrap" },
              alignItems: "center",
              gap: 1,
              flex: "1 1 auto",
              minWidth: 0,
            }}
          >
            {filters}
          </Box>
        )}

        {filterActions && (
          <Stack direction="row" spacing={1} flexWrap="nowrap" sx={{ flexShrink: 0 }}>
            {filterActions}
          </Stack>
        )}

        {(secondaryActions || primaryActions) && (
          <Stack
            direction="row"
            spacing={1}
            flexWrap="nowrap"
            sx={{ flexShrink: 0, ml: { xs: 0, lg: "auto" } }}
          >
            {secondaryActions}
            {primaryActions}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
