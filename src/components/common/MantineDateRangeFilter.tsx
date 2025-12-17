// src/components/common/MantineDateRangeFilter.tsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';

import {
  Popover,
  TextInput,
  Group,
  Button,
  Card,
  Text,
  Stack,
} from '@mantine/core';

import { DatePicker } from '@mantine/dates';
import { IconCalendar } from '@tabler/icons-react';

dayjs.locale('vi');

const inputStyles = {
  input: {
    height: 40,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 16,
  },
};

export interface DateRangeFilterValue {
  from: Dayjs | null;
  to: Dayjs | null;
}

interface MantineDateRangeFilterProps {
  value?: DateRangeFilterValue;
  onChange?: (v: DateRangeFilterValue) => void;
  placeholder?: string;
}

export const MantineDateRangeFilter: React.FC<MantineDateRangeFilterProps> = ({
  value,
  onChange,
  placeholder = 'Chọn khoảng thời gian',
}) => {
  const [opened, setOpened] = useState(false);

  // Mantine DatePicker v8 đang dùng string | null
  const [fromStr, setFromStr] = useState<string | null>(
    value?.from ? value.from.startOf('day').format('YYYY-MM-DD') : null
  );
  const [toStr, setToStr] = useState<string | null>(
    value?.to ? value.to.endOf('day').format('YYYY-MM-DD') : null
  );

  // sync khi value từ ngoài đổi (chỉ đồng bộ state local, KHÔNG gọi onChange ở đây)
  useEffect(() => {
    const nextFrom = value?.from
      ? value.from.startOf('day').format('YYYY-MM-DD')
      : null;
    const nextTo = value?.to
      ? value.to.endOf('day').format('YYYY-MM-DD')
      : null;

    // tránh setState thừa
    if (nextFrom !== fromStr) {
      setFromStr(nextFrom);
    }
    if (nextTo !== toStr) {
      setToStr(nextTo);
    }
  }, [value?.from, value?.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const fromDayjs = useMemo(
    () => (fromStr ? dayjs(fromStr).startOf('day') : null),
    [fromStr]
  );
  const toDayjs = useMemo(
    () => (toStr ? dayjs(toStr).endOf('day') : null),
    [toStr]
  );

  const label = useMemo(() => {
    const from = fromDayjs;
    const to = toDayjs;

    if (!from && !to) return '';
    if (from && !to) return `Từ ${from.format('DD/MM/YYYY')}`;
    if (!from && to) return `Đến ${to.format('DD/MM/YYYY')}`;
    if (from && to && from.isSame(to, 'day')) {
      return `Ngày ${from.format('DD/MM/YYYY')}`;
    }
    if (from && to) {
      return `Từ ${from.format('DD/MM/YYYY')} đến ${to.format('DD/MM/YYYY')}`;
    }
    return '';
  }, [fromDayjs, toDayjs]);

  // ✅ Chỉ dùng hàm này khi user thao tác (trong onChange của DatePicker)
  const emitChange = useCallback(
    (fromStrVal: string | null, toStrVal: string | null) => {
      if (!onChange) return;

      const from = fromStrVal ? dayjs(fromStrVal).startOf('day') : null;
      const to = toStrVal ? dayjs(toStrVal).endOf('day') : null;

      onChange({
        from,
        to,
      });
    },
    [onChange]
  );

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={520}
      position="bottom-start"
      withArrow
      shadow="md"
      closeOnClickOutside={false}
    >
      <Popover.Target>
        <TextInput
          readOnly
          placeholder={placeholder}
          value={label}
          rightSection={<IconCalendar size={20} />}
          onClick={() => setOpened((o) => !o)}
          styles={inputStyles}
        />
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="sm">
          <Group align="flex-start" grow>
            <Card shadow="xs" radius="md" withBorder>
              <Text size="xs" fw={500} c="dimmed" mb={4}>
                Từ ngày
              </Text>
              <DatePicker
                value={fromStr}
                onChange={(val) => {
                  // val: string | null
                  let nextFromStr = val;
                  let nextToStr = toStr;

                  // nếu to < from thì reset to
                  if (
                    nextFromStr &&
                    nextToStr &&
                    dayjs(nextToStr).isBefore(dayjs(nextFromStr), 'day')
                  ) {
                    nextToStr = null;
                  }

                  setFromStr(nextFromStr);
                  setToStr(nextToStr);

                  emitChange(nextFromStr, nextToStr);
                }}
                locale="vi"
              />
            </Card>

            <Card shadow="xs" radius="md" withBorder>
              <Text size="xs" fw={500} c="dimmed" mb={4}>
                Đến ngày
              </Text>
              <DatePicker
                value={toStr}
                onChange={(val) => {
                  const nextToStr = val;
                  setToStr(nextToStr);
                  emitChange(fromStr, nextToStr);
                }}
                locale="vi"
                // ✅ Xám toàn bộ ngày < from (dùng cùng kiểu string)
                minDate={fromStr ?? undefined}
              />
            </Card>
          </Group>

          <Group justify="flex-end" mt="xs">
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setOpened(false)}
            >
              Đóng
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
