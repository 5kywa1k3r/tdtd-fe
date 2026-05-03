import React from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  TextField,
  type SelectChangeEvent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

import {
  MantineDateRangeFilter,
  type DateRangeFilterValue,
} from "../../../components/common/dateRanger/MantineDateRangeFilter";

export type DynamicFormFilterValue = {
  code: string;
  name: string;
  status: "ALL" | "DRAFT" | "PUBLISHED";
  active: "ALL" | "ACTIVE" | "INACTIVE";
  dateRange: DateRangeFilterValue;
};

type Props = {
  value: DynamicFormFilterValue;
  onChange: (value: DynamicFormFilterValue) => void;
  onSearch: () => void;
  onReset: () => void;
  onCreate: () => void;
};

export default function DynamicFormFilterBar({
  value,
  onChange,
  onSearch,
  onReset,
  onCreate,
}: Props) {
  const emit = (patch: Partial<DynamicFormFilterValue>) => onChange({ ...value, ...patch });

  const onEnterSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSearch();
  };

  return (
    <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap alignItems="center">
      <TextField
        size="small"
        label="Ma"
        value={value.code}
        onChange={(e) => emit({ code: e.target.value })}
        onKeyDown={onEnterSearch}
        sx={{ minWidth: 180, flex: "1 1 200px" }}
      />

      <TextField
        size="small"
        label="Ten"
        value={value.name}
        onChange={(e) => emit({ name: e.target.value })}
        onKeyDown={onEnterSearch}
        sx={{ minWidth: 220, flex: "1 1 260px" }}
      />

      <Select
        size="small"
        value={value.status}
        onChange={(event: SelectChangeEvent) =>
          emit({ status: event.target.value as DynamicFormFilterValue["status"] })
        }
        sx={{ minWidth: 150 }}
      >
        <MenuItem value="ALL">Tat ca</MenuItem>
        <MenuItem value="DRAFT">Draft</MenuItem>
        <MenuItem value="PUBLISHED">Published</MenuItem>
      </Select>

      <Select
        size="small"
        value={value.active}
        onChange={(event: SelectChangeEvent) =>
          emit({ active: event.target.value as DynamicFormFilterValue["active"] })
        }
        sx={{ minWidth: 150 }}
      >
        <MenuItem value="ALL">Moi trang thai</MenuItem>
        <MenuItem value="ACTIVE">Active</MenuItem>
        <MenuItem value="INACTIVE">Inactive</MenuItem>
      </Select>

      <Box sx={{ minWidth: 300, flex: "1 1 340px" }}>
        <MantineDateRangeFilter
          value={value.dateRange}
          onChange={(next) => emit({ dateRange: next })}
          placeholder="Khoang ngay tao"
        />
      </Box>

      <Button
        variant="contained"
        startIcon={<SearchIcon />}
        onClick={onSearch}
        sx={{ height: 40, flexShrink: 0, px: 2, whiteSpace: "nowrap" }}
      >
        Tim
      </Button>

      <Button
        variant="outlined"
        startIcon={<ClearIcon />}
        onClick={onReset}
        sx={{ height: 40, flexShrink: 0, px: 2, whiteSpace: "nowrap" }}
      >
        Reset
      </Button>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onCreate}
        sx={{ height: 40, flexShrink: 0, whiteSpace: "nowrap" }}
      >
        Tao
      </Button>
    </Stack>
  );
}
