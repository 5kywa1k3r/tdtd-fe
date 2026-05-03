import { Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";

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

const fieldSx = { flex: { xs: "1 1 100%", sm: "1 1 220px", xl: "0 1 220px" }, minWidth: 0 };

export default function WorkAssignmentFilterBar({
  value,
  onChange,
  onReset,
  onReload,
  loading,
}: Props) {
  const emit = (patch: Partial<WorkAssignmentFilterValue>) => onChange({ ...value, ...patch });

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
              Lọc danh sách assignment
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
              sx={{ minWidth: 116, borderRadius: 2 }}
            >
              Đặt lại
            </Button>

            <Button
              variant="outlined"
              onClick={onReload}
              disabled={loading}
              startIcon={<RefreshOutlinedIcon />}
              sx={{ minWidth: 116, borderRadius: 2 }}
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
            label="Tìm theo biểu mẫu / người được giao"
            value={value.q}
            onChange={(e) => emit({ q: e.target.value })}
            sx={{ ...fieldSx, flex: { xs: "1 1 100%", lg: "1 1 320px" } }}
          />

          <TextField
            select
            size="small"
            label="Loại giao"
            value={value.assignmentType}
            onChange={(e) =>
              emit({ assignmentType: e.target.value as WorkAssignmentFilterValue["assignmentType"] })
            }
            sx={fieldSx}
          >
            <MenuItem value="ALL">Tất cả</MenuItem>
            <MenuItem value="ONCE">Một lần</MenuItem>
            <MenuItem value="PERIODIC_REPORT">Định kỳ</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Hiệu lực"
            value={value.isActive}
            onChange={(e) =>
              emit({ isActive: e.target.value as WorkAssignmentFilterValue["isActive"] })
            }
            sx={fieldSx}
          >
            <MenuItem value="ALL">Tất cả</MenuItem>
            <MenuItem value="ACTIVE">Đang hiệu lực</MenuItem>
            <MenuItem value="INACTIVE">Ngừng hiệu lực</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Tiến độ"
            value={value.progressStatus}
            onChange={(e) =>
              emit({
                progressStatus: e.target.value as WorkAssignmentFilterValue["progressStatus"],
              })
            }
            sx={fieldSx}
          >
            <MenuItem value="ALL">Tất cả</MenuItem>
            <MenuItem value="NOT_STARTED">Chưa bắt đầu</MenuItem>
            <MenuItem value="IN_PROGRESS">Đang thực hiện</MenuItem>
            <MenuItem value="COMPLETED">Hoàn thành</MenuItem>
            <MenuItem value="AT_RISK">Có rủi ro</MenuItem>
            <MenuItem value="OVERDUE">Quá hạn</MenuItem>
          </TextField>
        </Stack>
      </Stack>
    </Paper>
  );
}
