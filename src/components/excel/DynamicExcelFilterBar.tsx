import React from "react";
import { Box, Button, Stack, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

import {
  MantineDateRangeFilter,
  type DateRangeFilterValue,
} from "../common/dateRanger/MantineDateRangeFilter";

export type DynamicExcelFilterValue = {
  code: string;
  name: string;
  dateRange: DateRangeFilterValue;
};

type Props = {
  value: DynamicExcelFilterValue;
  onChange: (value: DynamicExcelFilterValue) => void;
  onSearch: () => void;
  onReset: () => void;
  onCreate: () => void;
};

export default function DynamicExcelFilterBar({
  value,
  onChange,
  onSearch,
  onReset,
  onCreate,
}: Props) {
  const emit = (patch: Partial<DynamicExcelFilterValue>) => onChange({ ...value, ...patch });

  const onEnterSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSearch();
  };

  return (
    <Stack
      direction="row"
      spacing={1}
      mb={2}
      flexWrap="wrap"
      useFlexGap
      alignItems="center"
    >
      <TextField
        size="small"
        label="Mã"
        value={value.code}
        onChange={(e) => emit({ code: e.target.value })}
        onKeyDown={onEnterSearch}
        sx={{ minWidth: 180, flex: "1 1 200px" }}
      />

      <TextField
        size="small"
        label="Tên"
        value={value.name}
        onChange={(e) => emit({ name: e.target.value })}
        onKeyDown={onEnterSearch}
        sx={{ minWidth: 220, flex: "1 1 260px" }}
      />

      <Box sx={{ minWidth: 320, flex: "1 1 360px" }}>
        <MantineDateRangeFilter
          value={value.dateRange}
          onChange={(next) => emit({ dateRange: next })}
          placeholder="Chọn khoảng ngày"
        />
      </Box>

      <Button
        variant="contained"
        startIcon={<SearchIcon />}
        onClick={onSearch}
        sx={{ height: 40, flexShrink: 0, px: 2, whiteSpace: "nowrap" }}
      >
        Tìm kiếm
      </Button>

      <Button
        variant="outlined"
        startIcon={<ClearIcon />}
        onClick={onReset}
        sx={{ height: 40, flexShrink: 0, px: 2, whiteSpace: "nowrap" }}
      >
        Xóa lọc
      </Button>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onCreate}
        sx={{ height: 40, flexShrink: 0, whiteSpace: "nowrap" }}
      >
        Tạo mới
      </Button>
    </Stack>
  );
}
