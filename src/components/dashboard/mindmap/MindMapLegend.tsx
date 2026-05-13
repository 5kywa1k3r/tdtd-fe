import { Box, Chip, Divider, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import { UITextKey, uiText } from '../../../constants/uiText';

type MindMapLegendProps = {
  statusColorEnabled: boolean;
  onStatusColorEnabledChange: (enabled: boolean) => void;
};

const ENTITY_ITEMS = [
  { label: "Đầu việc", color: "rgba(20,184,166,0.42)" },
  { label: "Công việc", color: "rgba(148,163,184,0.42)" },
  { label: "Biểu mẫu", color: "rgba(245,158,11,0.42)" },
  { label: "Người dùng", color: "rgba(59,130,246,0.34)" },
  { label: "Báo cáo", color: "rgba(34,197,94,0.28)" },
  { label: "Chưa có dữ liệu", color: "rgba(148,163,184,0.16)" },
  { label: "Tải thêm", color: "rgba(148,163,184,0.28)" },
];

const STATUS_ITEMS = [
  { label: "Chưa thực hiện / Chưa bắt đầu", color: "#94a3b8" },
  { label: "Đang thực hiện / Bản nháp", color: "#0ea5e9" },
  { label: "Đã gửi", color: "#2563eb" },
  { label: "Hoàn thành / Đã duyệt", color: "#22c55e" },
  { label: "Nguy cơ / Quá hạn đã làm", color: "#f59e0b" },
  { label: "Quá hạn", color: "#ef4444" },
];

function LegendChip(props: { label: string; color: string }) {
  return (
    <Chip
      size="small"
      label={props.label}
      variant="outlined"
      icon={<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: props.color }} />}
      sx={{
        bgcolor: "rgba(255,255,255,0.66)",
        "& .MuiChip-icon": { ml: 1 },
      }}
    />
  );
}

export default function MindMapLegend(props: MindMapLegendProps) {
  const { statusColorEnabled, onStatusColorEnabledChange } = props;

  return (
    <Stack
      spacing={1}
      sx={{
        width: 310,
        p: 1.25,
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(148,163,184,0.25)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="caption" fontWeight={900} sx={{ letterSpacing: 0.4 }}>
          LEGEND
        </Typography>
        <FormControlLabel
          label={uiText(UITextKey.TextMauTrangThai)}
          control={(
            <Switch
              size="small"
              checked={statusColorEnabled}
              onChange={(event) => onStatusColorEnabledChange(event.target.checked)}
            />
          )}
          sx={{
            m: 0,
            "& .MuiFormControlLabel-label": {
              fontSize: 12,
              color: "text.secondary",
            },
          }}
        />
      </Stack>

      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
        {ENTITY_ITEMS.map((item) => (
          <LegendChip key={item.label} label={item.label} color={item.color} />
        ))}
      </Stack>

      {statusColorEnabled ? (
        <>
          <Divider />
          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            {STATUS_ITEMS.map((item) => (
              <LegendChip key={item.label} label={item.label} color={item.color} />
            ))}
          </Stack>
        </>
      ) : null}

      <Typography variant="caption" color="text.secondary">
        Màu trạng thái chỉ dùng viền/nền nhẹ cho đầu việc, công việc và báo cáo.
      </Typography>
    </Stack>
  );
}
