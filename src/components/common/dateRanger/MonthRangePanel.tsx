import React from "react";
import dayjs, { Dayjs } from "dayjs";
import { Stack } from "@mantine/core";
import { MonthPickerInput } from "@mantine/dates";
import { UITextKey, uiText } from '../../../constants/uiText';

type Props = {
  from: Dayjs | null;
  to: Dayjs | null;
  onChange: (next: { from: Dayjs | null; to: Dayjs | null }) => void;
};

export const MonthRangePanel: React.FC<Props> = ({ from, to, onChange }) => {
  return (
    <Stack gap="sm">
      <MonthPickerInput
        label={uiText(UITextKey.TextTuThang)}
        locale="vi"
        valueFormat="MM/YYYY"
        placeholder={uiText(UITextKey.TextChonThangBatDau)}
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
        label={uiText(UITextKey.TextDenThang)}
        locale="vi"
        valueFormat="MM/YYYY"
        placeholder={uiText(UITextKey.TextChonThangKetThuc)}
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