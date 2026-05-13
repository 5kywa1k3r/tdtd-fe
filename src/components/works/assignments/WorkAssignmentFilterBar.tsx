import { Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import { UITextKey, uiText } from '../../../constants/uiText';

export type WorkAssignmentFilterValue = {
  q: string;
  assignmentType: "ALL" | "ONCE" | "PERIODIC_REPORT";
  isActive: "ALL" | "ACTIVE" | "INACTIVE";
  progressStatus: "ALL" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "AT_RISK" | "OVERDUE";
};

type Props = {
  value: WorkAssignmentFilterValue;
  onChange: (value: WorkAssignmentFilterValue) => void;
  onReset: () => void;
  onReload: () => void;
  loading?: boolean;
};

const fieldSx = {
  flex: { xs: "1 1 100%", sm: "1 1 180px", lg: "0 1 178px" },
  minWidth: 0,
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    bgcolor: "#fff",
  },
};

export default function WorkAssignmentFilterBar({
  value,
  onChange,
  onReset,
  onReload,
  loading,
}: Props) {
  const emit = (patch: Partial<WorkAssignmentFilterValue>) => onChange({ ...value, ...patch });

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, md: 2 },
        borderRadius: "8px",
        borderColor: "#e2e8f0",
        boxShadow: "0 10px 26px rgba(15, 23, 42, 0.04)",
        bgcolor: "rgba(255,255,255,0.96)",
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", lg: "center" }}
          justifyContent="space-between"
        >
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 850, color: "#0f172a" }}>
              Bộ lọc tìm kiếm
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tìm nhanh theo biểu mẫu, người được giao và trạng thái thực hiện.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="outlined"
              onClick={onReset}
              disabled={loading}
              startIcon={<RestartAltOutlinedIcon />}
              sx={{ minWidth: 116, borderRadius: "8px", bgcolor: "#fff", borderColor: "#dbe4f0" }}
            >
              Đặt lại
            </Button>

            <Button
              variant="outlined"
              onClick={onReload}
              disabled={loading}
              startIcon={<RefreshOutlinedIcon />}
              sx={{ minWidth: 116, borderRadius: "8px", bgcolor: "#fff", borderColor: "#dbe4f0" }}
            >
              Làm mới
            </Button>
          </Stack>
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <TextField
            size="small"
            label={uiText(UITextKey.TextTimTheoBieuMauNguoiDuocGiao)}
            value={value.q}
            onChange={(e) => emit({ q: e.target.value })}
            sx={{ ...fieldSx, flex: { xs: "1 1 100%", lg: "1 1 300px" } }}
          />

          <TextField
            select
            size="small"
            label={uiText(UITextKey.TextLoaiGiao)}
            value={value.assignmentType}
            onChange={(e) =>
              emit({ assignmentType: e.target.value as WorkAssignmentFilterValue["assignmentType"] })
            }
            sx={fieldSx}
          >
            <MenuItem value="ALL">{uiText(UITextKey.TextTatCa)}</MenuItem>
            <MenuItem value="ONCE">{uiText(UITextKey.TextMotLan)}</MenuItem>
            <MenuItem value="PERIODIC_REPORT">{uiText(UITextKey.TextDinhKy)}</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label={uiText(UITextKey.TextHieuLuc)}
            value={value.isActive}
            onChange={(e) =>
              emit({ isActive: e.target.value as WorkAssignmentFilterValue["isActive"] })
            }
            sx={fieldSx}
          >
            <MenuItem value="ALL">{uiText(UITextKey.TextTatCa)}</MenuItem>
            <MenuItem value="ACTIVE">{uiText(UITextKey.TextDangHieuLuc)}</MenuItem>
            <MenuItem value="INACTIVE">{uiText(UITextKey.TextNgungHieuLuc)}</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label={uiText(UITextKey.TextTienDo)}
            value={value.progressStatus}
            onChange={(e) =>
              emit({
                progressStatus: e.target.value as WorkAssignmentFilterValue["progressStatus"],
              })
            }
            sx={fieldSx}
          >
            <MenuItem value="ALL">{uiText(UITextKey.TextTatCa)}</MenuItem>
            <MenuItem value="NOT_STARTED">{uiText(UITextKey.TextChuaBatDau)}</MenuItem>
            <MenuItem value="IN_PROGRESS">{uiText(UITextKey.TextDangThucHien)}</MenuItem>
            <MenuItem value="COMPLETED">{uiText(UITextKey.TextHoanThanh)}</MenuItem>
            <MenuItem value="AT_RISK">{uiText(UITextKey.TextCoRuiRo)}</MenuItem>
            <MenuItem value="OVERDUE">{uiText(UITextKey.TextQuaHan)}</MenuItem>
          </TextField>
        </Stack>
      </Stack>
    </Paper>
  );
}
