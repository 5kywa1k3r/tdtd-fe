import React from "react";
import dayjs, { Dayjs } from "dayjs";
import { Card, Group, Text } from "@mantine/core";
import { DatePicker } from "@mantine/dates";

type Props = {
  from: Dayjs | null;
  to: Dayjs | null;
  onChange: (next: { from: Dayjs | null; to: Dayjs | null }) => void;
};

export const DayRangePanel: React.FC<Props> = ({ from, to, onChange }) => {
  return (
    <Group align="flex-start" grow wrap="nowrap">
      <Card withBorder radius="md" p="sm" style={{ flex: 1 }}>
        <Text size="sm" fw={600} mb="xs">
          Từ ngày
        </Text>
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