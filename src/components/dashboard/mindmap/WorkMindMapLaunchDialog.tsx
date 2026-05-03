import { startTransition, useDeferredValue, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";

import { useSearchWorksQuery } from "../../../api/workApi";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import {
  setSelectedWork,
  setSelectedWorkType,
} from "../../../stores/dashboardMindMapSlice";
import type { WorkListRow, WorkTypeCore } from "../../../types/work";
import { WORK_TYPE, WORK_TYPE_OPTIONS } from "../../../types/work";
import { getWorkStatusChipColor, getWorkStatusLabel } from "../../../utils/dashboardUi";
import type { WorkMindMapOption } from "./WorkMindMapToolbar";

type WorkMindMapLaunchDialogProps = {
  open: boolean;
  onClose: () => void;
  onOpenCanvas: () => void;
};

function mapWorkOptionFromListRow(row: WorkListRow): WorkMindMapOption {
  return {
    id: row.id,
    code: row.code || row.autoCode,
    name: row.name,
    status: row.status,
    type: row.type,
  };
}

export default function WorkMindMapLaunchDialog(props: WorkMindMapLaunchDialogProps) {
  const { open, onClose, onOpenCanvas } = props;
  const dispatch = useAppDispatch();
  const { selectedWorkType } = useAppSelector((state) => state.dashboardMindMap);
  const [draftWorkType, setDraftWorkType] = useState<WorkTypeCore>(selectedWorkType);
  const [draftWork, setDraftWork] = useState<WorkMindMapOption | null>(null);
  const [workSearchText, setWorkSearchText] = useState("");
  const deferredWorkSearchText = useDeferredValue(workSearchText.trim());

  const { data: worksResponse, isFetching } = useSearchWorksQuery(
    {
      type: draftWorkType,
      q: deferredWorkSearchText || undefined,
      status: null,
      priority: null,
      leaderDirectiveUserId: null,
      page: 0,
      pageSize: 20,
      sortField: "createdAtUtc",
      sortDirection: "desc",
    },
    { skip: !open },
  );

  const workOptions = useMemo(
    () => (worksResponse?.rows ?? []).map(mapWorkOptionFromListRow),
    [worksResponse?.rows],
  );

  const handleOpenCanvas = () => {
    if (!draftWork) return;

    startTransition(() => {
      dispatch(setSelectedWorkType(draftWorkType));
      dispatch(setSelectedWork(draftWork.id));
      onOpenCanvas();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ pb: 0.75 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={1.2}
        >
          <Box>
            <Typography variant="h5" fontWeight={900}>
              Dashboard Mind Map
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45, maxWidth: 900 }}>
              Chon mot work de bat dau tu node work. Owner se thay root, user thuc hien se thay assignment dau vao trong nhanh duoc phan.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
            <Chip size="small" label="0 assignment dang hien thi" />
            <Chip size="small" color="primary" variant="outlined" label="1 node da nap" />
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <ToggleButtonGroup
              exclusive
              value={draftWorkType}
              onChange={(_event, value) => {
                if (value == null) return;
                setDraftWorkType(value as WorkTypeCore);
                setDraftWork(null);
                setWorkSearchText("");
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
              value={draftWork}
              loading={isFetching}
              filterOptions={(options) => options}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => `${option.code} - ${option.name}`}
              onChange={(_event, value) => setDraftWork(value)}
              inputValue={workSearchText}
              onInputChange={(_event, value) => setWorkSearchText(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={draftWorkType === WORK_TYPE.TASK ? "Chon nhiem vu" : "Chon chi tieu"}
                  placeholder="Nhap ma hoac ten work..."
                  size="small"
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Stack spacing={0.35}>
                    <Typography variant="body2" fontWeight={800}>
                      {option.code} - {option.name}
                    </Typography>
                    <Chip
                      size="small"
                      color={getWorkStatusChipColor(option.status)}
                      label={getWorkStatusLabel(option.status)}
                      sx={{ width: "fit-content" }}
                    />
                  </Stack>
                </Box>
              )}
              sx={{ flex: 1, minWidth: { xs: "100%", md: 520 } }}
            />
          </Stack>

          {draftWork ? (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip color="error" label="Huy" onClick={() => setDraftWork(null)} />
              <Chip size="small" label={draftWorkType === WORK_TYPE.TASK ? "Nhiem vu" : "Chi tieu"} />
              <Typography variant="body2" color="text.secondary">
                {draftWork.code} - {draftWork.name}
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Huy</Button>
        <Button
          variant="contained"
          startIcon={<AccountTreeOutlinedIcon />}
          onClick={handleOpenCanvas}
          disabled={!draftWork}
        >
          Mo mind map canvas
        </Button>
      </DialogActions>
    </Dialog>
  );
}
