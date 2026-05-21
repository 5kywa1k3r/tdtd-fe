import { Box, Stack, Typography } from "@mui/material";
import type {
  DashboardMindMapBucket,
  DashboardStackedBarDto,
} from "../../../types/dashboardMindMap";
import { getDashboardMindMapBucketLabel } from "../../../utils/dashboardUi";

type StatusStackedBarProps = {
  title: string;
  helperText?: string;
  bar?: DashboardStackedBarDto | null;
  activeBucket?: DashboardMindMapBucket | null;
  onSegmentClick?: (bucket: DashboardMindMapBucket) => void;
};

function normalizeBucket(key: string): DashboardMindMapBucket | null {
  const upper = key.toUpperCase();
  const buckets: DashboardMindMapBucket[] = [
    "ALL",
    "TODO",
    "DONE",
    "PENDING",
    "DRAFT",
    "SUBMITTED",
    "APPROVED",
    "OVERDUE",
  ];

  if (buckets.includes(upper as DashboardMindMapBucket)) {
    return upper as DashboardMindMapBucket;
  }

  return null;
}

export default function StatusStackedBar(props: StatusStackedBarProps) {
  const { title, helperText, bar, activeBucket, onSegmentClick } = props;
  const total = Math.max(bar?.total ?? 0, 0);

  return (
    <Stack spacing={1.1}>
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="subtitle2" fontWeight={800}>
            {title}
          </Typography>
          {helperText ? (
            <Typography variant="caption" color="text.secondary">
              {helperText}
            </Typography>
          ) : null}
        </Box>
        <Typography variant="body2" fontWeight={700} color="text.secondary">
          {total} mục
        </Typography>
      </Stack>

      <Stack
        direction="row"
        sx={{
          overflow: "hidden",
          minHeight: 18,
          borderRadius: 999,
          border: "1px solid rgba(148,163,184,0.25)",
          bgcolor: "rgba(226,232,240,0.35)",
        }}
      >
        {(bar?.segments ?? []).map((segment) => {
          const bucket = normalizeBucket(segment.key);
          const segmentLabel = bucket
            ? getDashboardMindMapBucketLabel(bucket)
            : segment.label || "Không xác định";
          const widthPercent = total > 0 ? (segment.value / total) * 100 : 0;
          const isActive = bucket != null && activeBucket === bucket;
          const isClickable = bucket != null && segment.value > 0;

          return (
            <Box
              key={segment.key}
              component={isClickable ? "button" : "div"}
              onClick={isClickable ? () => onSegmentClick?.(bucket) : undefined}
              sx={{
                flexBasis: `${Math.max(widthPercent, segment.value > 0 ? 8 : 0)}%`,
                flexGrow: segment.value,
                minWidth: segment.value > 0 ? 18 : 0,
                bgcolor: segment.color,
                border: 0,
                p: 0,
                cursor: isClickable ? "pointer" : "default",
                opacity: isActive ? 1 : 0.92,
                transition: "transform 160ms ease, opacity 160ms ease, filter 160ms ease",
                filter: isActive ? "saturate(1.12)" : "none",
                "&:hover": isClickable
                  ? {
                      opacity: 1,
                      filter: "brightness(0.98) saturate(1.08)",
                    }
                  : undefined,
              }}
              title={`${segmentLabel}: ${segment.value}`}
            />
          );
        })}
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {(bar?.segments ?? []).map((segment) => {
          const bucket = normalizeBucket(segment.key);
          const segmentLabel = bucket
            ? getDashboardMindMapBucketLabel(bucket)
            : segment.label || "Không xác định";
          const isActive = bucket != null && activeBucket === bucket;
          const isClickable = bucket != null && segment.value > 0;

          return (
            <Stack
              key={`${segment.key}_legend`}
              direction="row"
              spacing={0.8}
              alignItems="center"
              onClick={isClickable ? () => onSegmentClick?.(bucket) : undefined}
              sx={{
                px: 1,
                py: 0.6,
                borderRadius: 999,
                border: "1px solid",
                borderColor: isActive ? segment.color : "rgba(148,163,184,0.25)",
                bgcolor: isActive ? "rgba(15,23,42,0.03)" : "transparent",
                cursor: isClickable ? "pointer" : "default",
                transition: "all 160ms ease",
                "&:hover": isClickable
                  ? {
                      borderColor: segment.color,
                      bgcolor: "rgba(15,23,42,0.02)",
                    }
                  : undefined,
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: segment.color,
                }}
              />
              <Typography variant="caption" fontWeight={700}>
                {segmentLabel}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {segment.value}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}
