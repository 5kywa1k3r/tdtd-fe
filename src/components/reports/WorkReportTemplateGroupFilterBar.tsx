import { Button, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";

export type WorkReportTemplateGroupFilterValue = {
  q: string;
};

type Props = {
  value: WorkReportTemplateGroupFilterValue;
  onChange: (value: WorkReportTemplateGroupFilterValue) => void;
  onSearch: () => void;
  onReset: () => void;
  onReload: () => void;
  loading?: boolean;
};

export default function WorkReportTemplateGroupFilterBar({
  value,
  onChange,
  onSearch,
  onReset,
  onReload,
  loading,
}: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, md: 2 },
        borderRadius: 3,
        bgcolor: "background.paper",
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", xl: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", xl: "center" }}
          justifyContent="space-between"
        >
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" fontWeight={700}>
              Tra cứu biểu mẫu báo cáo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tìm nhanh theo mã hoặc tên biểu mẫu, sau đó mở từng nhóm để xem các kỳ báo cáo.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <Button
              variant="contained"
              onClick={onSearch}
              startIcon={<SearchOutlinedIcon />}
              sx={{ minWidth: 130, borderRadius: 2, px: 2.5 }}
            >
              Tìm kiếm
            </Button>

            <Button
              variant="outlined"
              onClick={onReset}
              startIcon={<RestartAltOutlinedIcon />}
              sx={{ minWidth: 120, borderRadius: 2 }}
            >
              Đặt lại
            </Button>

            <Button
              variant="outlined"
              onClick={onReload}
              disabled={loading}
              startIcon={<RefreshOutlinedIcon />}
              sx={{ minWidth: 120, borderRadius: 2 }}
            >
              Làm mới
            </Button>
          </Stack>
        </Stack>

        <TextField
          size="small"
          placeholder="Tìm mã / tên biểu mẫu"
          value={value.q}
          onChange={(e) => onChange({ q: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
          fullWidth
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: "background.default",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon color="action" fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Stack>
    </Paper>
  );
}
