import React from "react";
import dayjs, { Dayjs } from "dayjs";
import { Stack } from "@mantine/core";
import { MonthPickerInput } from "@mantine/dates";

type Props = {
  from: Dayjs | null;
  to: Dayjs | null;
  onChange: (next: { from: Dayjs | null; to: Dayjs | null }) => void;
};

export const MonthRangePanel: React.FC<Props> = ({ from, to, onChange }) => {
  return (
    <Stack gap="sm">
      <MonthPickerInput
        label="Từ tháng"
        locale="vi"
        valueFormat="MM/YYYY"
        placeholder="Chọn tháng bắt đầu"
        value={from ? from.toDate() : null}
        clearable
        onChange={(d) =>
          onChange({
            from: d ? dayjs(d) : null,
            to,
          })
        }
      />

      <MonthPickerInput
        label="Đến tháng"
        locale="vi"
        valueFormat="MM/YYYY"
        placeholder="Chọn tháng kết thúc"
        value={to ? to.toDate() : null}
        clearable
        minDate={from ? from.toDate() : undefined}
        onChange={(d) =>
          onChange({
            from,
            to: d ? dayjs(d) : null,
          })
        }
      />
    </Stack>
  );
};