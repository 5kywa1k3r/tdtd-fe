// src/components/common/MantineDateRangeFilter.tsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';

import { Popover, TextInput, Group, Button, Card, Text, Stack } from '@mantine/core';
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
  from: Dayjs | null; // startOf('day')
  to: Dayjs | null;   // endOf('day')
}

interface MantineDateRangeFilterProps {
  value?: DateRangeFilterValue;
  onChange?: (v: DateRangeFilterValue) => void;
  placeholder?: string;
}

const toStr = (d: Dayjs | null | undefined) =>
  d ? d.format('YYYY-MM-DD') : null;

const toDayStart = (s: string | null) =>
  s ? dayjs(s).startOf('day') : null;

const toDayEnd = (s: string | null) =>
  s ? dayjs(s).endOf('day') : null;

export const MantineDateRangeFilter: React.FC<MantineDateRangeFilterProps> = ({
  value,
  onChange,
  placeholder = 'Chọn khoảng thời gian',
}) => {
  const [opened, setOpened] = useState(false);

  // ✅ Mantine Dates (project của bệ hạ): string | null
  const [fromStr, setFromStr] = useState<string | null>(toStr(value?.from?.startOf('day') ?? null));
  const [toStrState, setToStrState] = useState<string | null>(toStr(value?.to?.endOf('day') ?? null));

  // sync khi value từ ngoài đổi (chỉ đồng bộ local state)
  useEffect(() => {
    const nextFrom = toStr(value?.from?.startOf('day') ?? null);
    const nextTo = toStr(value?.to?.endOf('day') ?? null);

    if (nextFrom !== fromStr) setFromStr(nextFrom);
    if (nextTo !== toStrState) setToStrState(nextTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.from, value?.to]);

  const fromDayjs = useMemo(() => toDayStart(fromStr), [fromStr]);
  const toDayjs = useMemo(() => toDayEnd(toStrState), [toStrState]);

  const label = useMemo(() => {
    const from = fromDayjs;
    const to = toDayjs;

    if (!from && !to) return '';
    if (from && !to) return `Từ ${from.format('DD/MM/YYYY')}`;
    if (!from && to) return `Đến ${to.format('DD/MM/YYYY')}`;
    if (from && to && from.isSame(to, 'day')) return `Ngày ${from.format('DD/MM/YYYY')}`;
    if (from && to) return `Từ ${from.format('DD/MM/YYYY')} đến ${to.format('DD/MM/YYYY')}`;
    return '';
  }, [fromDayjs, toDayjs]);

  const emitChange = useCallback(
    (f: string | null, t: string | null) => {
      if (!onChange) return;
      onChange({
        from: toDayStart(f),
        to: toDayEnd(t), // ✅ inclusive end-day
      });
    },
    [onChange]
  );

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={600}
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
                  let nextFrom = val;
                  let nextTo = toStrState;

                  // nếu to < from thì reset to
                  if (nextFrom && nextTo && dayjs(nextTo).isBefore(dayjs(nextFrom), 'day')) {
                    nextTo = null;
                  }

                  setFromStr(nextFrom);
                  setToStrState(nextTo);
                  emitChange(nextFrom, nextTo);
                }}
                locale="vi"
              />
            </Card>

            <Card shadow="xs" radius="md" withBorder>
              <Text size="xs" fw={500} c="dimmed" mb={4}>
                Đến ngày
              </Text>
              <DatePicker
                value={toStrState}
                onChange={(val) => {
                  const nextTo = val;
                  setToStrState(nextTo);
                  emitChange(fromStr, nextTo);
                }}
                locale="vi"
                // nếu DatePicker của bệ hạ hỗ trợ minDate là string:
                minDate={fromStr ?? undefined}
              />
            </Card>
          </Group>

          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" size="xs" onClick={() => setOpened(false)}>
              Đóng
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};