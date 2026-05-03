import React from "react";
import dayjs, { Dayjs } from "dayjs";
import { Group, Select, Stack } from "@mantine/core";
import { quarterStart } from "./rangeUtils";

type Props = {
  from: Dayjs | null;
  to: Dayjs | null;
  onChange: (next: { from: Dayjs | null; to: Dayjs | null }) => void;
};

const quarterOptions = [
  { value: "1", label: "Quý 1" },
  { value: "2", label: "Quý 2" },
  { value: "3", label: "Quý 3" },
  { value: "4", label: "Quý 4" },
];

function buildYearOptions(center = dayjs().year(), spread = 5) {
  return Array.from({ length: spread * 2 + 1 }, (_, i) => {
    const y = center - spread + i;
    return { value: String(y), label: String(y) };
  });
}

export const QuarterRangePanel: React.FC<Props> = ({ from, to, onChange }) => {
  const yearOptions = buildYearOptions();

  return (
    <Stack gap="md">
      <Group grow>
        <Select
          label="Từ năm"
          data={yearOptions}
          value={from ? String(from.year()) : null}
          onChange={(year) => {
            const q = from ? from.quarter() : 1;
            onChange({
              from: year ? quarterStart(Number(year), q) : null,
              to,
            });
          }}
        />

        <Select
          label="Từ quý"
          data={quarterOptions}
          value={from ? String(from.quarter()) : null}
          onChange={(quarter) => {
            const y = from ? from.year() : dayjs().year();
            onChange({
              from: quarter ? quarterStart(y, Number(quarter)) : null,
              to,
            });
          }}
        />
      </Group>

      <Group grow>
        <Select
          label="Đến năm"
          data={yearOptions}
          value={to ? String(to.year()) : null}
          onChange={(year) => {
            const q = to ? to.quarter() : 1;
            onChange({
              from,
              to: year ? quarterStart(Number(year), q) : null,
            });
          }}
        />

        <Select
          label="Đến quý"
          data={quarterOptions}
          value={to ? String(to.quarter()) : null}
          onChange={(quarter) => {
            const y = to ? to.year() : dayjs().year();
            onChange({
              from,
              to: quarter ? quarterStart(y, Number(quarter)) : null,
            });
          }}
        />
      </Group>
    </Stack>
  );
};