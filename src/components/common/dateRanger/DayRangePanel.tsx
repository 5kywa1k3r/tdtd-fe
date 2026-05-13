import React from "react";
import dayjs, { Dayjs } from "dayjs";
import { Card, Group, Text, TextInput } from "@mantine/core";
import { DatePicker } from "@mantine/dates";

type Props = {
  from: Dayjs | null;
  to: Dayjs | null;
  onChange: (next: { from: Dayjs | null; to: Dayjs | null }) => void;
};

type DayTextInputProps = {
  value: Dayjs | null;
  label: string;
  name: string;
  onCommit: (value: Dayjs | null) => void;
};

function formatDigits(value: string) {
  const clean = value.replace(/\D/g, "").slice(0, 8);
  if (clean.length <= 2) return clean;
  if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
}

function parseDisplayDate(value: string) {
  const clean = value.replace(/\D/g, "").slice(0, 8);
  if (clean.length !== 8) return null;

  const day = Number(clean.slice(0, 2));
  const month = Number(clean.slice(2, 4));
  const year = Number(clean.slice(4, 8));
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return dayjs(date);
}

const DayTextInput = React.memo(function DayTextInput({
  value,
  label,
  name,
  onCommit,
}: DayTextInputProps) {
  const [display, setDisplay] = React.useState(value ? value.format("DD/MM/YYYY") : "");
  const id = React.useId();

  React.useEffect(() => {
    setDisplay(value ? value.format("DD/MM/YYYY") : "");
  }, [value]);

  return (
    <TextInput
      id={`${name}-${id}`}
      name={name}
      size="xs"
      label={label}
      placeholder="dd/MM/yyyy"
      value={display}
      inputMode="numeric"
      maxLength={10}
      mb="sm"
      onChange={(e) => {
        const next = formatDigits(e.currentTarget.value);
        setDisplay(next);

        if (!next) {
          onCommit(null);
          return;
        }

        const parsed = parseDisplayDate(next);
        if (parsed) onCommit(parsed);
      }}
      onBlur={() => {
        const parsed = parseDisplayDate(display);
        setDisplay(parsed ? parsed.format("DD/MM/YYYY") : value ? value.format("DD/MM/YYYY") : "");
      }}
    />
  );
});

export const DayRangePanel: React.FC<Props> = ({ from, to, onChange }) => {
  return (
    <Group align="flex-start" grow wrap="nowrap">
      <Card withBorder radius="md" p="sm" style={{ flex: 1 }}>
        <Text size="sm" fw={600} mb="xs">
          Từ ngày
        </Text>
        <DayTextInput
          label="Nhập từ ngày"
          name="startDate"
          value={from}
          onCommit={(nextFrom) =>
            onChange({
              from: nextFrom,
              to,
            })
          }
        />
        <DatePicker
          locale="vi"
          value={from ? from.toDate() : null}
          maxDate={to ? to.toDate() : undefined}
          onChange={(d) =>
            onChange({
              from: d ? dayjs(d) : null,
              to,
            })
          }
        />
      </Card>

      <Card withBorder radius="md" p="sm" style={{ flex: 1 }}>
        <Text size="sm" fw={600} mb="xs">
          Đến ngày
        </Text>
        <DayTextInput
          label="Nhập đến ngày"
          name="endDate"
          value={to}
          onCommit={(nextTo) =>
            onChange({
              from,
              to: nextTo,
            })
          }
        />
        <DatePicker
          locale="vi"
          value={to ? to.toDate() : null}
          minDate={from ? from.toDate() : undefined}
          onChange={(d) =>
            onChange({
              from,
              to: d ? dayjs(d) : null,
            })
          }
        />
      </Card>
    </Group>
  );
};
