import React from "react";
import dayjs, { Dayjs } from "dayjs";
import { Stack } from "@mantine/core";
import { YearPickerInput } from "@mantine/dates";
import { UITextKey, uiText } from '../../../constants/uiText';

type Props = {
  from: Dayjs | null;
  to: Dayjs | null;
  onChange: (next: { from: Dayjs | null; to: Dayjs | null }) => void;
};

export const YearRangePanel: React.FC<Props> = ({ from, to, onChange }) => {
  return (
    <Stack gap="sm">
      <YearPickerInput
        label={uiText(UITextKey.TextTuNam)}
        placeholder={uiText(UITextKey.TextChonNamBatDau)}
        value={from ? from.toDate() : null}
        clearable
        onChange={(d) =>
          onChange({
            from: d ? dayjs(d) : null,
            to,
          })
        }
      />

      <YearPickerInput
        label={uiText(UITextKey.TextDenNam)}
        placeholder={uiText(UITextKey.TextChonNamKetThuc)}
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