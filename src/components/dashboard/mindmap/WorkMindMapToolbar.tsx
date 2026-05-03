import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded";
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded";
import type { WorkTypeCore } from "../../../types/work";
import { WORK_TYPE, WORK_TYPE_OPTIONS } from "../../../types/work";
import { getWorkStatusChipColor, getWorkStatusLabel } from "../../../utils/dashboardUi";

export type WorkMindMapOption = {
  id: string;
  code: string;
  name: string;
  status: number;
  type: WorkTypeCore;
};

type WorkMindMapToolbarProps = {
  workType: WorkTypeCore;
  selectedWork: WorkMindMapOption | null;
  workOptions: WorkMindMapOption[];
  workSearchText: string;
  visibleNodeCount: number;
  rootCount: number;
  loadingWorks?: boolean;
  onWorkTypeChange: (type: WorkTypeCore) => void;
  onWorkSearchTextChange: (value: string) => void;
  onWorkChange: (work: WorkMindMapOption | null) => void;
  onFitView: () => void;
  onCollapseAll: () => void;
  onResetWork: () => void;
};

export default function WorkMindMapToolbar(props: WorkMindMapToolbarProps) {
  const {
    workType,
    selectedWork,
    workOptions,
    workSearchText,
    visibleNodeCount,
    rootCount,
    loadingWorks = false,
    onWorkTypeChange,
    onWorkSearchTextChange,
    onWorkChange,
    onFitView,
    onCollapseAll,
    onResetWork,
  } = props;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 4,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", xl: "row" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Dashboard Mind Map
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, maxWidth: 860 }}>
              Chon mot work de bat dau tu node work. Owner se thay root, user thuc hien se thay assignment dau vao trong nhanh duoc phan.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${rootCount} assignment dang hien thi`} />
            <Chip size="small" color="primary" variant="outlined" label={`${visibleNodeCount} node đã nạp`} />
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", xl: "row" }} spacing={1.5}>
          <ToggleButtonGroup
            exclusive
            value={workType}
            onChange={(_event, value) => {
              if (value == null) return;
              onWorkTypeChange(value);
            }}
            size="small"
            sx={{ flexShrink: 0 }}
          >
            {WORK_TYPE_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Autocomplete<WorkMindMapOption, false, false, false>
            options={workOptions}
            value={selectedWork}
            loading={loadingWorks}
            filterOptions={(options) => options}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => `${option.code} - ${option.name}`}
            onChange={(_event, value) => onWorkChange(value)}
            inputValue={workSearchText}
            onInputChange={(_event, value) => onWorkSearchTextChange(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={workType === WORK_TYPE.TASK ? "Chọn nhiệm vụ" : "Chọn chỉ tiêu"}
                placeholder="Tìm theo mã hoặc tên work"
              />
            )}
            renderOption={(optionProps, option) => (
              <Box component="li" {...optionProps} key={option.id}>
                <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700}>
                    {option.code} - {option.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getWorkStatusLabel(option.status)}
                  </Typography>
                </Stack>
              </Box>
            )}
            sx={{ flex: 1, minWidth: 280 }}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<CenterFocusStrongRoundedIcon />} onClick={onFitView}>
              Fit view
            </Button>
            <Button variant="outlined" startIcon={<UnfoldLessRoundedIcon />} onClick={onCollapseAll}>
              Thu gọn
            </Button>
            <Button variant="outlined" startIcon={<RestartAltRoundedIcon />} onClick={onResetWork}>
              Đổi work
            </Button>
          </Stack>
        </Stack>

        {selectedWork ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              color={getWorkStatusChipColor(selectedWork.status)}
              label={getWorkStatusLabel(selectedWork.status)}
            />
            <Chip variant="outlined" label={WORK_TYPE_OPTIONS.find((x) => x.value === selectedWork.type)?.label ?? "Work"} />
            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
              {selectedWork.code} - {selectedWork.name}
            </Typography>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
