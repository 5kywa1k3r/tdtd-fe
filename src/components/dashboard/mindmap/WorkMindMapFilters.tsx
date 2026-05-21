import React from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import { LazyUnitMultiSelect } from "../../common/LazyUnitMultiSelect";
import { MantineDateRangeFilter } from "../../common/dateRanger/MantineDateRangeFilter";
import type { DashboardMindMapFilters } from "../../../types/dashboardMindMap";
import { dayjsToDateInput, filtersToDateRange } from "../../../utils/dashboardUi";
import { UITextKey, uiText } from '../../../constants/uiText';

type WorkMindMapFiltersProps = {
  value: DashboardMindMapFilters;
  loading?: boolean;
  onChange: (value: DashboardMindMapFilters) => void;
  onApply: () => void;
  onReset: () => void;
};

export default function WorkMindMapFilters(props: WorkMindMapFiltersProps) {
  const { value, loading = false, onChange, onApply, onReset } = props;

  const rangeValue = React.useMemo(
    () => filtersToDateRange(value.fromDate, value.toDate),
    [value.fromDate, value.toDate],
  );

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 4 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" fontWeight={800}>
          Bộ lọc phạm vi
        </Typography>

        <Stack
          direction={{ xs: "column", xl: "row" }}
          spacing={1.5}
          useFlexGap
          flexWrap="wrap"
          alignItems={{ xs: "stretch", xl: "flex-start" }}
        >
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
              placeholder={uiText(UITextKey.TextChonKhoangNgay2)}
              inputHeight={40}
              dropdownWidth={360}
            />
          </Box>

          <Box sx={{ minWidth: 320, flex: 1 }}>
            <LazyUnitMultiSelect
              label={uiText(UITextKey.TextDonVi2)}
              value={value.unitIds}
              onChange={(unitIds) => onChange({ ...value, unitIds })}
              mode="multiple"
            />
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              ml: { xl: "auto" },
              alignSelf: { xs: "stretch", xl: "center" },
            }}
          >
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
