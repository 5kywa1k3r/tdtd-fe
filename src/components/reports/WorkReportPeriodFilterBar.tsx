import { Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import { UITextKey, uiText } from '../../constants/uiText';

export type WorkReportPeriodFilterValue = {
  statusBucket: "ALL" | "PENDING" | "SUBMITTED" | "OVERDUE" | "RETURNED";
};

type Props = {
  value: WorkReportPeriodFilterValue;
  onChange: (value: WorkReportPeriodFilterValue) => void;
  onReset: () => void;
};

export default function WorkReportPeriodFilterBar({ value, onChange, onReset }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" fontWeight={700}>
            Lọc kỳ báo cáo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Lọc theo nhóm trạng thái, còn sắp xếp và phân trang do bảng xử lý trực tiếp.
          </Typography>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <TextField
            select
            size="small"
            label={uiText(UITextKey.TextTrangThai)}
            value={value.statusBucket}
            onChange={(e) =>
              onChange({
                statusBucket: e.target.value as WorkReportPeriodFilterValue["statusBucket"],
              })
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="ALL">{uiText(UITextKey.TextTatCa)}</MenuItem>
            <MenuItem value="PENDING">{uiText(UITextKey.TextChuaLam)}</MenuItem>
            <MenuItem value="SUBMITTED">{uiText(UITextKey.TextDaNop)}</MenuItem>
            <MenuItem value="OVERDUE">{uiText(UITextKey.TextQuaHan)}</MenuItem>
            <MenuItem value="RETURNED">{uiText(UITextKey.TextBiTuChoi)}</MenuItem>
          </TextField>

          <Button
            variant="outlined"
            onClick={onReset}
            startIcon={<RestartAltOutlinedIcon />}
            sx={{ minWidth: 116, borderRadius: 2 }}
          >
            Đặt lại
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
