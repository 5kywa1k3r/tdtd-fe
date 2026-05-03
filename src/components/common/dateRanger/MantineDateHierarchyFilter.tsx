import React, { useEffect, useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/vi";

import {
  Button,
  Divider,
  Group,
  Popover,
  SegmentedControl,
  Stack,
  TextInput,
} from "@mantine/core";
import { IconCalendar } from "@tabler/icons-react";

import { DayRangePanel } from "./DayRangePanel";
import { MonthRangePanel } from "./MonthRangePanel";
import { QuarterRangePanel } from "./QuarterRangePanel";
import { YearRangePanel } from "./YearRangePanel";
import {
  formatRangeLabel,
  type HierarchyRangeType,
  type HierarchyRangeValue,
  isAfterByType,
  normalizeRange,
} from "./rangeUtils";

dayjs.locale("vi");

interface Props {
  value?: HierarchyRangeValue;
  onChange?: (v: HierarchyRangeValue) => void;
  placeholder?: string;
  inputHeight?: number;
  dropdownWidth?: number;
  zIndex?: number;
  disabled?: boolean;
  allowedTypes?: HierarchyRangeType[];
}

export type DateHierarchyType = "day" | "month" | "quarter" | "year";

export interface DateHierarchyFilterValue {
  type: DateHierarchyType;
  from: Dayjs | null;
  to: Dayjs | null;
}

const defaultValue: HierarchyRangeValue = {
  type: "day",
  from: null,
  to: null,
};

export const MantineDateHierarchyFilter: React.FC<Props> = ({
  value,
  onChange,
  placeholder = "Chọn thời gian",
  inputHeight = 40,
  dropdownWidth = 680,
  zIndex = 2000,
  disabled,
  allowedTypes = ["day", "month", "quarter", "year"],
}) => {
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState<HierarchyRangeValue>(value ?? defaultValue);

  useEffect(() => {
    setDraft(value ?? defaultValue);
  }, [value]);

  const label = useMemo(() => formatRangeLabel(value), [value]);

  const applyDraft = (next: HierarchyRangeValue) => {
    const normalized = normalizeRange(next.type, next.from, next.to);
    setDraft(normalized);
    onChange?.(normalized);
  };

  const handleInnerChange = (next: { from: dayjs.Dayjs | null; to: dayjs.Dayjs | null }) => {
    const from = next.from;
    let to = next.to;

    if (isAfterByType(draft.type, from, to)) {
      to = from;
    }

    applyDraft({
      ...draft,
      from,
      to,
    });
  };

  const clearAll = () => {
    applyDraft({
      ...draft,
      from: null,
      to: null,
    });
  };

  const typeOptions = [
    { label: "Ngày", value: "day" },
    { label: "Tháng", value: "month" },
    { label: "Quý", value: "quarter" },
    { label: "Năm", value: "year" },
  ].filter((x) => allowedTypes.includes(x.value as HierarchyRangeType));

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      withArrow
      shadow="md"
      closeOnClickOutside={false}
      withinPortal
      zIndex={zIndex}
      width={dropdownWidth}
    >
      <Popover.Target>
        <TextInput
          readOnly
          disabled={disabled}
          placeholder={placeholder}
          value={label}
          rightSection={<IconCalendar size={18} />}
          onClick={() => {
            if (!disabled) setOpened((o) => !o);
          }}
          styles={{
            input: {
              height: inputHeight,
              paddingTop: 8,
              paddingBottom: 8,
              fontSize: 16,
              cursor: disabled ? "not-allowed" : "pointer",
            },
          }}
        />
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="sm">
          <SegmentedControl
            fullWidth
            value={draft.type}
            onChange={(type) =>
              applyDraft({
                type: type as HierarchyRangeType,
                from: null,
                to: null,
              })
            }
            data={typeOptions}
          />

          <Divider />

          {draft.type === "day" && (
            <DayRangePanel from={draft.from} to={draft.to} onChange={handleInnerChange} />
          )}

          {draft.type === "month" && (
            <MonthRangePanel from={draft.from} to={draft.to} onChange={handleInnerChange} />
          )}

          {draft.type === "quarter" && (
            <QuarterRangePanel from={draft.from} to={draft.to} onChange={handleInnerChange} />
          )}

          {draft.type === "year" && (
            <YearRangePanel from={draft.from} to={draft.to} onChange={handleInnerChange} />
          )}

          <Group justify="space-between">
            <Button variant="subtle" color="gray" size="xs" onClick={clearAll}>
              Xóa
            </Button>

            <Button variant="subtle" size="xs" onClick={() => setOpened(false)}>
              Đóng
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
