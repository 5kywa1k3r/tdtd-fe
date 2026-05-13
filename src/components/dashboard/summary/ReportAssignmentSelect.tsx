import React from "react";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";

import { useGetDashboardReportAssignmentOptionsQuery } from "../../../api/dashboardApi";
import type {
  DashboardReportAssignmentOptionDto,
  DashboardReportAssignmentOptionsRequest,
} from "../../../types/dashboard";
import { UITextKey, uiText } from '../../../constants/uiText';

type Props = {
  value: string;
  request: DashboardReportAssignmentOptionsRequest;
  onChange: (assignmentId: string) => void;
  disabled?: boolean;
};

export default function ReportAssignmentSelect({
  value,
  request,
  onChange,
  disabled = false,
}: Props) {
  const { data = [], isFetching } = useGetDashboardReportAssignmentOptionsQuery(
    request,
    { skip: disabled }
  );

  const selected = React.useMemo(
    () => data.find((item) => item.assignmentId === value) ?? null,
    [data, value]
  );

  return (
    <Autocomplete<DashboardReportAssignmentOptionDto, false, false, false>
      size="small"
      options={data}
      value={selected}
      loading={isFetching}
      disabled={disabled}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, current) =>
        option.assignmentId === current.assignmentId
      }
      onChange={(_, next) => onChange(next?.assignmentId ?? "")}
      renderInput={(params) => (
        <TextField
          {...params}
          label={uiText(UITextKey.TextAssignmentBaoCao)}
          placeholder={uiText(UITextKey.TextChonAssignmentDeLocBaoCao)}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isFetching ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      noOptionsText="Không có công việc phù hợp"
      sx={{ minWidth: 360, flex: 1 }}
    />
  );
}
