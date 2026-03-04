// src/components/common/MantineDateHierarchyFilter.tsx
import React, { useMemo, useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';

import {
  Select,
  Popover,
  TextInput,
  Group,
  Button,
  Card,
  Text,
  Stack,
  SegmentedControl,
} from '@mantine/core';

import {
  DatePicker,
  MonthPickerInput,
  YearPickerInput,
} from '@mantine/dates';

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

export type DateHierarchyLevel = 'year' | 'quarter' | 'month' | 'day';

export interface DateHierarchyFilterValue {
  level: DateHierarchyLevel;
  from: Dayjs;
  to: Dayjs;
}

interface MantineDateHierarchyFilterProps {
  value?: DateHierarchyFilterValue;
  onChange?: (v: DateHierarchyFilterValue) => void;
}

const YEARS_AROUND = 10;

const getQuarterFromDate = (d: Dayjs): number =>
  Math.floor(d.month() / 3) + 1;

const ensureOrder = (from: Dayjs, to: Dayjs): [Dayjs, Dayjs] =>
  from.isAfter(to) ? [to, from] : [from, to];

export const MantineDateHierarchyFilter: React.FC<MantineDateHierarchyFilterProps> = ({
  value,
  onChange,
}) => {
  const today = dayjs();
  const baseFrom = value?.from ?? today;
  const baseTo = value?.to ?? today;

  const [opened, setOpened] = useState(false);
  const [level, setLevel] = useState<DateHierarchyLevel>(value?.level ?? 'month');

  const currentYear = today.year();
  const years = useMemo(
    () =>
      Array.from(
        { length: YEARS_AROUND * 2 + 1 },
        (_, i) => currentYear - YEARS_AROUND + i
      ),
    [currentYear]
  );

  // ===== NĂM (YearPickerInput v8: string | null) =====
  const [yearFrom, setYearFrom] = useState<number | null>(baseFrom.year());
  const [yearTo, setYearTo] = useState<number | null>(baseTo.year());

  // ===== QUÝ =====
  const [qFromYear, setQFromYear] = useState<number | null>(baseFrom.year());
  const [qToYear, setQToYear] = useState<number | null>(baseTo.year());
  const [qFrom, setQFrom] = useState<string>(String(getQuarterFromDate(baseFrom)));
  const [qTo, setQTo] = useState<string>(String(getQuarterFromDate(baseTo)));

  // ===== THÁNG (string | null) =====
  const [mFrom, setMFrom] = useState<string | null>(
    baseFrom.startOf('month').format('YYYY-MM-DD')
  );
  const [mTo, setMTo] = useState<string | null>(
    baseTo.startOf('month').format('YYYY-MM-DD')
  );

  // ===== NGÀY (string | null) =====
  const [dayFrom, setDayFrom] = useState<string | null>(
    baseFrom.startOf('day').format('YYYY-MM-DD')
  );
  const [dayTo, setDayTo] = useState<string | null>(
    baseTo.startOf('day').format('YYYY-MM-DD')
  );

  const computeRange = (): DateHierarchyFilterValue => {
    let from: Dayjs;
    let to: Dayjs;

    switch (level) {
      case 'year': {
        const yf = yearFrom ?? currentYear;
        const yt = yearTo ?? yf;
        const f = dayjs().year(yf).startOf('year');
        const t = dayjs().year(yt).endOf('year');
        [from, to] = ensureOrder(f, t);
        break;
      }

      case 'quarter': {
        const yf = qFromYear ?? currentYear;
        const yt = qToYear ?? yf;
        const qf = Number(qFrom || 1);
        const qt = Number(qTo || qf);

        const fromMonth = (qf - 1) * 3;
        const toMonth = (qt - 1) * 3 + 2;

        const f = dayjs().year(yf).month(fromMonth).startOf('month');
        const t = dayjs().year(yt).month(toMonth).endOf('month');
        [from, to] = ensureOrder(f, t);
        break;
      }

      case 'month': {
        const f = mFrom ? dayjs(mFrom).startOf('month') : today.startOf('month');
        const t = mTo ? dayjs(mTo).endOf('month') : f.endOf('month');
        [from, to] = ensureOrder(f, t);
        break;
      }

      case 'day':
      default: {
        const f = dayFrom ? dayjs(dayFrom).startOf('day') : today.startOf('day');
        const t = dayTo ? dayjs(dayTo).endOf('day') : f.endOf('day'); // ✅ inclusive
        [from, to] = ensureOrder(f, t);
        break;
      }
    }

    return { level, from, to };
  };

  const formatLabel = (v: DateHierarchyFilterValue): string => {
    const { level: lv, from, to } = v;

    switch (lv) {
      case 'year': {
        const y1 = from.year();
        const y2 = to.year();
        if (y1 === y2) return `Trong năm ${y1}`;
        return `Từ năm ${y1} đến năm ${y2}`;
      }
      case 'quarter': {
        const q1 = getQuarterFromDate(from);
        const q2 = getQuarterFromDate(to);
        const y1 = from.year();
        const y2 = to.year();
        if (q1 === q2 && y1 === y2) return `Trong quý ${q1} năm ${y1}`;
        return `Từ quý ${q1} ${y1} đến quý ${q2} ${y2}`;
      }
      case 'month': {
        const m1 = from.month() + 1;
        const m2 = to.month() + 1;
        const y1 = from.year();
        const y2 = to.year();
        if (m1 === m2 && y1 === y2) return `Trong tháng ${m1}/${y1}`;
        return `Từ ${m1}/${y1} đến ${m2}/${y2}`;
      }
      case 'day':
      default: {
        if (from.isSame(to, 'day')) return `Ngày ${from.format('DD/MM/YYYY')}`;
        return `Từ ${from.format('DD/MM/YYYY')} đến ${to.format('DD/MM/YYYY')}`;
      }
    }
  };

  const currentValue = computeRange();
  const label = formatLabel(currentValue);

  useEffect(() => {
    onChange?.(currentValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    level,
    yearFrom,
    yearTo,
    qFromYear,
    qToYear,
    qFrom,
    qTo,
    mFrom,
    mTo,
    dayFrom,
    dayTo,
  ]);

  // helper convert year -> string 'YYYY-MM-DD'
  const yearToStr = (year: number | null): string | null =>
    year != null ? dayjs().year(year).startOf('year').format('YYYY-MM-DD') : null;

  const renderYear = () => (
    <Group align="flex-start" grow>
      <Card shadow="xs" radius="md" withBorder>
        <Text size="xs" fw={500} c="dimmed" mb={4}>
          Từ năm
        </Text>
        <YearPickerInput
          value={yearToStr(yearFrom)}
          onChange={(val) => {
            if (!val) return setYearFrom(null);
            setYearFrom(dayjs(val).year());
          }}
          placeholder="Chọn năm"
          label={null}
          valueFormat="YYYY"
          clearable
        />
      </Card>

      <Card shadow="xs" radius="md" withBorder>
        <Text size="xs" fw={500} c="dimmed" mb={4}>
          Đến năm
        </Text>
        <YearPickerInput
          value={yearToStr(yearTo)}
          onChange={(val) => {
            if (!val) return setYearTo(null);
            setYearTo(dayjs(val).year());
          }}
          placeholder="Chọn năm"
          label={null}
          valueFormat="YYYY"
          clearable
        />
      </Card>
    </Group>
  );

  const renderQuarter = () => (
    <Group align="flex-start" grow>
      <Card shadow="xs" radius="md" withBorder>
        <Text size="xs" fw={500} c="dimmed" mb={4}>
          Từ quý
        </Text>
        <Stack gap="xs">
          <Select
            label="Năm"
            placeholder="Chọn năm"
            data={years.map((y) => ({ value: String(y), label: String(y) }))}
            value={qFromYear ? String(qFromYear) : null}
            onChange={(v) => setQFromYear(v ? Number(v) : null)}
          />
          <SegmentedControl
            fullWidth
            value={qFrom}
            onChange={setQFrom}
            data={[
              { value: '1', label: 'Q1' },
              { value: '2', label: 'Q2' },
              { value: '3', label: 'Q3' },
              { value: '4', label: 'Q4' },
            ]}
          />
        </Stack>
      </Card>

      <Card shadow="xs" radius="md" withBorder>
        <Text size="xs" fw={500} c="dimmed" mb={4}>
          Đến quý
        </Text>
        <Stack gap="xs">
          <Select
            label="Năm"
            placeholder="Chọn năm"
            data={years.map((y) => ({ value: String(y), label: String(y) }))}
            value={qToYear ? String(qToYear) : null}
            onChange={(v) => setQToYear(v ? Number(v) : null)}
          />
          <SegmentedControl
            fullWidth
            value={qTo}
            onChange={setQTo}
            data={[
              { value: '1', label: 'Q1' },
              { value: '2', label: 'Q2' },
              { value: '3', label: 'Q3' },
              { value: '4', label: 'Q4' },
            ]}
          />
        </Stack>
      </Card>
    </Group>
  );

  const renderMonth = () => (
    <Group align="flex-start" grow>
      <Card shadow="xs" radius="md" withBorder>
        <Text size="xs" fw={500} c="dimmed" mb={4}>
          Từ tháng
        </Text>
        <MonthPickerInput
          label={null}
          placeholder="Chọn tháng"
          value={mFrom}
          onChange={setMFrom} // ✅ giờ đúng type (string | null)
          locale="vi"
          valueFormat="MM/YYYY"
          clearable
        />
      </Card>

      <Card shadow="xs" radius="md" withBorder>
        <Text size="xs" fw={500} c="dimmed" mb={4}>
          Đến tháng
        </Text>
        <MonthPickerInput
          label={null}
          placeholder="Chọn tháng"
          value={mTo}
          onChange={setMTo} // ✅ đúng type
          locale="vi"
          valueFormat="MM/YYYY"
          clearable
        />
      </Card>
    </Group>
  );

  const renderDay = () => (
    <Group align="flex-start" grow>
      <Card shadow="xs" radius="md" withBorder>
        <Text size="xs" fw={500} c="dimmed" mb={4}>
          Từ ngày
        </Text>
        <DatePicker value={dayFrom} onChange={setDayFrom} locale="vi" />
      </Card>

      <Card shadow="xs" radius="md" withBorder>
        <Text size="xs" fw={500} c="dimmed" mb={4}>
          Đến ngày
        </Text>
        <DatePicker
          value={dayTo}
          onChange={setDayTo}
          locale="vi"
          minDate={dayFrom ?? undefined}
        />
      </Card>
    </Group>
  );

  const renderByLevel = () => {
    switch (level) {
      case 'year':
        return renderYear();
      case 'quarter':
        return renderQuarter();
      case 'month':
        return renderMonth();
      case 'day':
      default:
        return renderDay();
    }
  };

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
          value={label}
          rightSection={<IconCalendar size={20} />}
          onClick={() => setOpened((o) => !o)}
          styles={inputStyles}
        />
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="sm">
          <Group gap="xs" align="center">
            <Text size="sm" fw={500}>
              Cấp thời gian:
            </Text>
            <SegmentedControl
              value={level}
              onChange={(v) => setLevel(v as DateHierarchyLevel)}
              data={[
                { label: 'Năm', value: 'year' },
                { label: 'Quý', value: 'quarter' },
                { label: 'Tháng', value: 'month' },
                { label: 'Ngày', value: 'day' },
              ]}
            />
          </Group>

          {renderByLevel()}

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