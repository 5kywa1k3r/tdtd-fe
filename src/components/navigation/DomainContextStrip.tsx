import { Breadcrumbs, Chip, Link, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export type DomainBreadcrumb = {
  label: string;
  to?: string;
};

export type DomainContextItem = {
  label: string;
  value: string | number | null | undefined;
  color?: "default" | "primary" | "success" | "warning" | "error" | "info";
};

export function DomainContextStrip({
  breadcrumbs,
  items,
  ariaLabel = "Ngữ cảnh điều hướng",
}: {
  breadcrumbs: readonly DomainBreadcrumb[];
  items: readonly DomainContextItem[];
  ariaLabel?: string;
}) {
  const visibleItems = items.filter((item) => item.value !== null && item.value !== undefined && item.value !== "");

  return (
    <Paper
      component="section"
      variant="outlined"
      data-testid="domain-context-strip"
      aria-label={ariaLabel}
      sx={{ px: { xs: 1.25, sm: 1.5 }, py: 1, minWidth: 0 }}
    >
      <Stack spacing={0.75}>
        <Breadcrumbs aria-label="Breadcrumb" maxItems={6}>
          {breadcrumbs.map((item, index) => item.to ? (
            <Link
              key={`${item.label}:${item.to}`}
              component={RouterLink}
              to={item.to}
              underline="hover"
              color="inherit"
            >
              {item.label}
            </Link>
          ) : (
            <Typography key={`${item.label}:${index}`} color="text.primary" fontWeight={700}>
              {item.label}
            </Typography>
          ))}
        </Breadcrumbs>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          {visibleItems.map((item) => (
            <Chip
              key={`${item.label}:${String(item.value)}`}
              size="small"
              variant="outlined"
              color={item.color ?? "default"}
              label={`${item.label}: ${item.value}`}
              sx={{ maxWidth: "100%", "& .MuiChip-label": { overflowWrap: "anywhere" } }}
            />
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default DomainContextStrip;
