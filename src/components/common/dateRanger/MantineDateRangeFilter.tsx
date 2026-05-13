import React from "react";
import { Dayjs } from "dayjs";
import {
  type HierarchyRangeValue,
  normalizeRange,
} from "./rangeUtils";
import { MantineDateHierarchyFilter } from "./MantineDateHierarchyFilter";

export interface DateRangeFilterValue {
  from: Dayjs | null;
  to: Dayjs | null;
}

interface Props {
  value?: DateRangeFilterValue;
  onChange?: (v: DateRangeFilterValue) => void;
  placeholder?: string;
  inputHeight?: number;
  dropdownWidth?: number;
  zIndex?: number;
  disabled?: boolean;
  name?: string;
  id?: string;
}

export const MantineDateRangeFilter: React.FC<Props> = ({
  value,
  onChange,
  placeholder = "Chọn khoảng thời gian",
  inputHeight,
  dropdownWidth,
  zIndex,
  disabled,
  name,
  id,
}) => {
  const mappedValue: HierarchyRangeValue = {
    type: "day",
    from: value?.from ?? null,
    to: value?.to ?? null,
  };

  return (
    <MantineDateHierarchyFilter
      value={mappedValue}
      onChange={(v) => {
        const normalized = normalizeRange("day", v.from, v.to);
        onChange?.({
          from: normalized.from,
          to: normalized.to,
        });
      }}
      allowedTypes={["day"]}
      placeholder={placeholder}
      inputHeight={inputHeight}
      dropdownWidth={dropdownWidth}
      zIndex={zIndex}
      disabled={disabled}
      name={name}
      id={id}
    />
  );
};
