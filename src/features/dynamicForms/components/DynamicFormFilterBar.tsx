import React from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
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
import { ListPageToolbar, listToolbarButtonSx } from "../../../components/common/ListPageToolbar";
import { UITextKey, uiText } from '../../../constants/uiText';

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

  const filters = (
    <>
      <TextField
        size="small"
        label={uiText(UITextKey.TextMa2)}
        value={value.code}
        onChange={(e) => emit({ code: e.target.value })}
        onKeyDown={onEnterSearch}
        sx={{ minWidth: 150, flex: "0 1 170px" }}
      />

      <TextField
        size="small"
        label={uiText(UITextKey.TextTen2)}
        value={value.name}
        onChange={(e) => emit({ name: e.target.value })}
        onKeyDown={onEnterSearch}
        sx={{ minWidth: 200, flex: "1 1 230px" }}
      />

      <Select
        size="small"
        value={value.status}
        onChange={(event: SelectChangeEvent) =>
          emit({ status: event.target.value as DynamicFormFilterValue["status"] })
        }
        sx={{ minWidth: 132, flex: "0 0 132px" }}
      >
        <MenuItem value="ALL">{uiText(UITextKey.TextTatCa3)}</MenuItem>
        <MenuItem value="DRAFT">{uiText(UITextKey.TextDraft)}</MenuItem>
        <MenuItem value="PUBLISHED">{uiText(UITextKey.TextPublished)}</MenuItem>
      </Select>

      <Select
        size="small"
        value={value.active}
        onChange={(event: SelectChangeEvent) =>
          emit({ active: event.target.value as DynamicFormFilterValue["active"] })
        }
        sx={{ minWidth: 142, flex: "0 0 142px" }}
      >
        <MenuItem value="ALL">{uiText(UITextKey.TextMoiTrangThai)}</MenuItem>
        <MenuItem value="ACTIVE">{uiText(UITextKey.TextActive)}</MenuItem>
        <MenuItem value="INACTIVE">{uiText(UITextKey.TextInactive)}</MenuItem>
      </Select>

      <Box sx={{ minWidth: 280, flex: "1 1 300px" }}>
        <MantineDateRangeFilter
          value={value.dateRange}
          onChange={(next) => emit({ dateRange: next })}
          placeholder={uiText(UITextKey.TextKhoangNgayTao)}
        />
      </Box>
    </>
  );

  return (
    <ListPageToolbar
      sx={{ mb: 2 }}
      filters={filters}
      filterActions={
        <>
          <Button variant="contained" startIcon={<SearchIcon />} onClick={onSearch} sx={listToolbarButtonSx}>
            {uiText(UITextKey.TextTimKiem)}
          </Button>
          <Button variant="outlined" startIcon={<ClearIcon />} onClick={onReset} sx={listToolbarButtonSx}>
            Xóa lọc
          </Button>
        </>
      }
      primaryActions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate} sx={listToolbarButtonSx}>
          {uiText(UITextKey.CommonCreate)}
        </Button>
      }
    />
  );
}
