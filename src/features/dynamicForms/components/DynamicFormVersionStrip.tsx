import { Box, Chip, Paper, Stack, Tooltip, Typography } from "@mui/material";

import type { DynamicFormRow } from "../../../api/dynamicFormApi";

type VersionStripForm = Pick<
  DynamicFormRow,
  | "code"
  | "familyId"
  | "versionNo"
  | "revision"
  | "isPublished"
  | "lineageStatus"
  | "previousVersionId"
  | "clonedFromVersionId"
  | "publishedSchemaHash"
>;

export type DynamicFormVersionStripProps = {
  form: VersionStripForm;
  compact?: boolean;
};

function lineageLabel(value: string) {
  if (value === "ROOT") return "Biểu mẫu gốc";
  if (value === "VERSION") return "Phiên bản kế tiếp";
  if (value === "CLONE") return "Bản sao độc lập";
  if (value === "WRAPPED") return "Khởi tạo từ bảng động";
  if (value === "LEGACY") return "Dữ liệu cũ";
  return value || "Không xác định";
}

function shortIdentity(value: string | null | undefined, size = 12) {
  if (!value) return "—";
  return value.length <= size ? value : `${value.slice(0, size)}…`;
}

export function DynamicFormVersionStrip({
  form,
  compact = false,
}: DynamicFormVersionStripProps) {
  return (
    <Paper
      variant="outlined"
      data-testid="dynamic-form-version-strip"
      sx={{
        px: compact ? 1 : { xs: 1.25, sm: 1.5 },
        py: compact ? 0.75 : 1,
        borderRadius: 1,
        minWidth: 0,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip size="small" variant="outlined" label={form.code} />
          <Chip size="small" color="primary" label={`Phiên bản v${form.versionNo}`} />
          <Chip
            size="small"
            color={form.isPublished ? "success" : "warning"}
            variant={form.isPublished ? "filled" : "outlined"}
            label={form.isPublished ? "Đã công bố" : "Bản nháp"}
          />
          <Chip
            size="small"
            variant="outlined"
            label={lineageLabel(form.lineageStatus)}
          />
        </Stack>

        <Stack
          direction="row"
          spacing={{ xs: 1, sm: 1.5 }}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ minWidth: 0 }}
        >
          <VersionIdentity label="Họ phiên bản" value={form.familyId} />
          <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">
            Revision {form.revision}
          </Typography>
          <VersionIdentity
            label="Hash công bố"
            value={form.publishedSchemaHash}
            emptyLabel={form.isPublished ? "Chưa ghi nhận" : "Có sau khi công bố"}
          />
          {form.previousVersionId && (
            <VersionIdentity label="Bản trước" value={form.previousVersionId} />
          )}
          {form.clonedFromVersionId && (
            <VersionIdentity label="Sao chép từ" value={form.clonedFromVersionId} />
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

function VersionIdentity({
  label,
  value,
  emptyLabel = "—",
}: {
  label: string;
  value?: string | null;
  emptyLabel?: string;
}) {
  return (
    <Tooltip title={value ?? emptyLabel}>
      <Box sx={{ minWidth: 0, maxWidth: { xs: "100%", sm: 210 } }}>
        <Typography variant="caption" color="text.secondary" component="span">
          {label}:{" "}
        </Typography>
        <Typography
          variant="caption"
          component="span"
          fontFamily={value ? "monospace" : undefined}
          sx={{ overflowWrap: "anywhere" }}
        >
          {value ? shortIdentity(value) : emptyLabel}
        </Typography>
      </Box>
    </Tooltip>
  );
}

export default DynamicFormVersionStrip;
