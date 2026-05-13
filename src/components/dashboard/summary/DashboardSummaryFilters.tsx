import React from "react";
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import SearchIcon from "@mui/icons-material/Search";

import { LazyUnitMultiSelect } from "../../common/LazyUnitMultiSelect";
import { MantineDateRangeFilter } from "../../common/dateRanger/MantineDateRangeFilter";
import type {
  DashboardOverviewMode,
  DashboardPageFilters,
  DashboardReportAssignmentOptionsRequest,
} from "../../../types/dashboard";
import {
  dayjsToDateInput,
  filtersToDateRange,
} from "../../../utils/dashboardUi";
import ReportAssignmentSelect from "./ReportAssignmentSelect";
import { UITextKey, uiText } from '../../../constants/uiText';

const MODE_OPTIONS: { value: DashboardOverviewMode; label: string }[] = [
  { value: "WORK_TASK", label: "Nhiệm vụ" },
  { value: "WORK_TARGET", label: "Chỉ tiêu" },
  { value: "ASSIGNMENT_RECEIVED", label: "Công việc được giao" },
  { value: "ASSIGNMENT_CREATED", label: "Công việc đã giao" },
  { value: "REPORT", label: "Báo cáo" },
];

type Props = {
  value: DashboardPageFilters;
  loading?: boolean;
  assignmentRequest: DashboardReportAssignmentOptionsRequest;
  onChange: (value: DashboardPageFilters) => void;
  onApply: () => void;
  onReset: () => void;
  onOpenMindMap?: () => void;
};

export default function DashboardSummaryFilters({
  value,
  loading = false,
  assignmentRequest,
  onChange,
  onApply,
  onReset,
  onOpenMindMap,
}: Props) {
  const rangeValue = React.useMemo(
    () => filtersToDateRange(value.fromDate, value.toDate),
    [value.fromDate, value.toDate]
  );

  const isReportMode = value.mode === "REPORT";

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>
          Bộ lọc
        </Typography>

        <Stack
          direction={{ xs: "column", xl: "row" }}
          spacing={1.5}
          useFlexGap
          flexWrap="wrap"
          alignItems={{ xs: "stretch", xl: "flex-start" }}
        >
          <TextField
            select
            size="small"
            label={uiText(UITextKey.TextNoiDungTongHop)}
            value={value.mode}
            onChange={(e) =>
              onChange({
                ...value,
                mode: e.target.value as DashboardOverviewMode,
                assignmentId: e.target.value === "REPORT" ? value.assignmentId : "",
              })
            }
            sx={{ minWidth: 240 }}
          >
            {MODE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ minWidth: 280 }}>
            <MantineDateRangeFilter
              value={rangeValue}
              onChange={(next) =>
                onChange({
                  ...value,
                  fromDate: dayjsToDateInput(next.from),
                  toDate: dayjsToDateInput(next.to),
                })
              }
              placeholder={uiText(UITextKey.TextChonKhoangNgay)}
              inputHeight={40}
              dropdownWidth={360}
            />
          </Box>

          <Box sx={{ minWidth: 320, flex: 1 }}>
            <LazyUnitMultiSelect
              label={uiText(UITextKey.TextDonVi)}
              value={value.unitIds}
              onChange={(unitIds) => onChange({ ...value, unitIds })}
              mode="multiple"
            />
          </Box>

          {isReportMode ? (
            <ReportAssignmentSelect
              value={value.assignmentId}
              request={assignmentRequest}
              onChange={(assignmentId) => onChange({ ...value, assignmentId })}
              disabled={loading}
            />
          ) : null}

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{
              ml: { xl: "auto" },
              alignSelf: { xs: "stretch", xl: "center" },
            }}
          >
            {onOpenMindMap ? (
              <Button
                variant="outlined"
                startIcon={<AccountTreeOutlinedIcon />}
                onClick={onOpenMindMap}
                disabled={loading}
              >
                Mở sơ đồ
              </Button>
            ) : null}

            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={onApply}
              disabled={loading}
            >
              Áp dụng
            </Button>

            <Button variant="text" onClick={onReset} disabled={loading}>
              Đặt lại
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
