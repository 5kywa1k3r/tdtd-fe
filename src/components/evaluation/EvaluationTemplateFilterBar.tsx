import { Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";

export type EvaluationTemplateFilterValue = {
  q: string;
  isActive: "all" | "1" | "0";
};

type Props = {
  value: EvaluationTemplateFilterValue;
  onChange: (value: EvaluationTemplateFilterValue) => void;
  onReset: () => void;
  onReload: () => void;
  onCreate?: () => void;
  canManage: boolean;
  loading?: boolean;
};

export default function EvaluationTemplateFilterBar({
  value,
  onChange,
  onReset,
  onReload,
  onCreate,
  canManage,
  loading,
}: Props) {
  const emit = (patch: Partial<EvaluationTemplateFilterValue>) => onChange({ ...value, ...patch });
  const actionButtonSx = { height: 36, minWidth: 116, borderRadius: 2 };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", xl: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", xl: "center" }}
          justifyContent="space-between"
        >
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" fontWeight={700}>
              Bộ lọc bộ đánh giá
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tìm nhanh theo mã đại diện, tên bộ và trạng thái đang dùng.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={onReset}
              disabled={loading}
              startIcon={<RestartAltOutlinedIcon />}
              sx={actionButtonSx}
            >
              Đặt lại
            </Button>

            <Button
              size="small"
              variant="outlined"
              onClick={onReload}
              disabled={loading}
              startIcon={<RefreshOutlinedIcon />}
              sx={actionButtonSx}
            >
              Làm mới
            </Button>

            {canManage && (
              <Button
                size="small"
                variant="contained"
                startIcon={<AddOutlinedIcon />}
                onClick={onCreate}
                sx={{ ...actionButtonSx, minWidth: 130 }}
              >
                Thêm mới
              </Button>
            )}
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
          <TextField
            size="small"
            label="Tìm theo mã hoặc tên bộ"
            value={value.q}
            onChange={(e) => emit({ q: e.target.value })}
            fullWidth
          />

          <TextField
            select
            size="small"
            label="Trạng thái"
            value={value.isActive}
            onChange={(e) => emit({ isActive: e.target.value as EvaluationTemplateFilterValue["isActive"] })}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="1">Đang dùng</MenuItem>
            <MenuItem value="0">Ngừng dùng</MenuItem>
            <MenuItem value="all">Tất cả</MenuItem>
          </TextField>
        </Stack>
      </Stack>
    </Paper>
  );
}
