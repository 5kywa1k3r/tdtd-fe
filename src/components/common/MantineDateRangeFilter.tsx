// src/components/common/MantineDateRangeFilter.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/vi";

import { Popover, TextInput, Group, Button, Stack } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";

dayjs.locale("vi");

export interface DateRangeFilterValue {
  from: Dayjs | null; // startOf('day')
  to: Dayjs | null;   // endOf('day')
}

interface MantineDateRangeFilterProps {
  value?: DateRangeFilterValue;
  onChange?: (v: DateRangeFilterValue) => void;
  placeholder?: string;

  inputHeight?: number;   // default 40 (khớp MUI small)
  dropdownWidth?: number; // default 720
  zIndex?: number;        // default 20000
  disabled?: boolean;
}

const toDate = (d: Dayjs | null | undefined) => (d ? d.toDate() : null);
const toStart = (d: Date | null) => (d ? dayjs(d).startOf("day") : null);
const toEnd = (d: Date | null) => (d ? dayjs(d).endOf("day") : null);

export const MantineDateRangeFilter: React.FC<MantineDateRangeFilterProps> = ({
  value,
  onChange,
  placeholder = "Chọn khoảng thời gian",
  inputHeight = 40,
  dropdownWidth = 560,
  zIndex = 2000,
  disabled,
}) => {
  const [opened, setOpened] = useState(false);

  // DatePicker type="range" dùng tuple Date|null
  const [range, setRange] = useState<[Date | null, Date | null]>([
    toDate(value?.from),
    toDate(value?.to),
  ]);

  useEffect(() => {
    setRange([toDate(value?.from), toDate(value?.to)]);
  }, [value?.from, value?.to]);

  const label = useMemo(() => {
    const [f, t] = range;
    if (!f && !t) return "";
    if (f && !t) return `Từ ${dayjs(f).format("DD/MM/YYYY")}`;
    if (!f && t) return `Đến ${dayjs(t).format("DD/MM/YYYY")}`;
    return `${dayjs(f!).format("DD/MM/YYYY")} – ${dayjs(t!).format("DD/MM/YYYY")}`;
  }, [range]);

  const emit = useCallback(
    (r: [Date | null, Date | null]) => {
      onChange?.({
        from: toStart(r[0]),
        to: toEnd(r[1]),
      });
    },
    [onChange]
  );

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
            if (disabled) return;
            setOpened((o) => !o);
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
          <DatePicker
            type="range"
            locale="vi"
            numberOfColumns={2}
            allowSingleDateInRange
            value={range}
            onChange={(v) => {
              const r = (v ?? [null, null]) as [Date | null, Date | null];
              setRange(r);
              emit(r);
            }}
          />

          <Group justify="flex-end">
            <Button variant="subtle" size="xs" onClick={() => setOpened(false)}>
              Đóng
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};