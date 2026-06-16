import React from "react";
import { MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { PeriodScopeMode } from "../../../types/aggregateTypes";
import { UITextKey, uiText } from '../../../constants/uiText';
import SingleDayKeyField, {
  dayKeyToIsoDate,
  isoDateToDayKey,
} from "../../common/SingleDayKeyField";

const PERIOD_SCOPE_GUIDES: Record<
  PeriodScopeMode,
  {
    helper: string;
    tooltip: string;
    example: string;
  }
> = {
  SINGLE_PERIOD: {
    helper: "Chỉ lấy báo cáo nguồn có đúng kỳ được chọn.",
    tooltip: "Một kỳ dùng khi cần xem hoặc ghi tổng hợp cho một ngày/kỳ báo cáo cụ thể.",
    example: "Ví dụ: chọn 22/05/2026 để chỉ lấy báo cáo kỳ 22/05/2026.",
  },
  PERIOD_RANGE: {
    helper: "Lấy các báo cáo có kỳ nằm trong khoảng từ ngày đến ngày.",
    tooltip: "Khoảng kỳ dùng khi cần cộng nhiều kỳ liên tiếp, thường là tuần, tháng hoặc một đợt kiểm tra.",
    example: "Ví dụ: chọn 01/05/2026 - 31/05/2026 để tổng hợp các kỳ trong tháng 05/2026.",
  },
  CUMULATIVE_TO_PERIOD: {
    helper: "Lấy các báo cáo từ đầu phạm vi dữ liệu đến kỳ kết thúc đã chọn.",
    tooltip: "Lũy kế đến kỳ dùng khi báo cáo cấp trên cần số cộng dồn đến một mốc.",
    example: "Ví dụ: chọn 31/05/2026 để cộng lũy kế đến hết kỳ 31/05/2026.",
  },
  ALL_PERIODS: {
    helper: "Không lọc ngày/kỳ; lấy toàn bộ báo cáo đã duyệt trong phạm vi công việc.",
    tooltip: "Toàn bộ kỳ phù hợp khi cần rà soát hoặc xuất toàn bộ dữ liệu nguồn đã có.",
    example: "Ví dụ: dùng khi kiểm tra nhanh tất cả kỳ đã phát sinh báo cáo.",
  },
};

export type AggregatePeriodPickerProps = {
  periodScopeMode: PeriodScopeMode;
  periodDate: string;
  periodDateFrom: string;
  periodDateTo: string;
  onPeriodScopeModeChange: (value: PeriodScopeMode) => void;
  onPeriodDateChange: (value: string) => void;
  onPeriodDateFromChange: (value: string) => void;
  onPeriodDateToChange: (value: string) => void;
};

const AggregatePeriodPicker: React.FC<AggregatePeriodPickerProps> = ({
  periodScopeMode,
  periodDate,
  periodDateFrom,
  periodDateTo,
  onPeriodScopeModeChange,
  onPeriodDateChange,
  onPeriodDateFromChange,
  onPeriodDateToChange,
}) => {
  const handlePeriodDateFromChange = (nextFrom: string) => {
    onPeriodDateFromChange(nextFrom);
    if (nextFrom && periodDateTo && periodDateTo < nextFrom) {
      onPeriodDateToChange(nextFrom);
    }
  };

  const handlePeriodDateToChange = (nextTo: string) => {
    if (periodDateFrom && nextTo && nextTo < periodDateFrom) {
      onPeriodDateToChange(periodDateFrom);
      return;
    }

    onPeriodDateToChange(nextTo);
  };
  const periodScopeGuide = PERIOD_SCOPE_GUIDES[periodScopeMode];
  const periodDateDayKey = isoDateToDayKey(periodDate);
  const periodDateFromDayKey = isoDateToDayKey(periodDateFrom);
  const periodDateToDayKey = isoDateToDayKey(periodDateTo);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Typography variant="subtitle2">{uiText(UITextKey.TextPhamViKy)}</Typography>
        <Tooltip
          arrow
          placement="right"
          title={
            <Stack spacing={0.75} sx={{ maxWidth: 380 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Chọn kỳ để xác định báo cáo nguồn nào được đưa vào tổng hợp
              </Typography>
              {Object.entries(PERIOD_SCOPE_GUIDES).map(([mode, guide]) => (
                <Typography key={mode} variant="caption" component="div">
                  <b>{formatPeriodScopeGuideLabel(mode as PeriodScopeMode)}:</b> {guide.tooltip} {guide.example}
                </Typography>
              ))}
            </Stack>
          }
        >
          <InfoOutlinedIcon fontSize="small" color="action" />
        </Tooltip>
      </Stack>

      <TextField
        select
        label={uiText(UITextKey.TextPhamViKy)}
        size="small"
        value={periodScopeMode}
        onChange={(e) => onPeriodScopeModeChange(e.target.value as PeriodScopeMode)}
        sx={{ minWidth: 190 }}
        helperText={`${periodScopeGuide.helper} ${periodScopeGuide.example}`}
      >
        <MenuItem value="SINGLE_PERIOD">{uiText(UITextKey.TextMotNgayKy)}</MenuItem>
        <MenuItem value="PERIOD_RANGE">{uiText(UITextKey.TextTuNgayDenNgay2)}</MenuItem>
        <MenuItem value="CUMULATIVE_TO_PERIOD">{uiText(UITextKey.TextLuyKeDenNgayKy)}</MenuItem>
        <MenuItem value="ALL_PERIODS">{uiText(UITextKey.TextToanBoKy)}</MenuItem>
      </TextField>

      {periodScopeMode === "SINGLE_PERIOD" && (
        <SingleDayKeyField
          label={uiText(UITextKey.TextNgayKy)}
          value={periodDateDayKey}
          onChange={(next) => onPeriodDateChange(dayKeyToIsoDate(next))}
          helperText="Ngày/kỳ này phải khớp kỳ báo cáo nguồn cần tổng hợp."
          fullWidth
        />
      )}

      {periodScopeMode === "PERIOD_RANGE" && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <SingleDayKeyField
            label={uiText(UITextKey.TextTuNgay2)}
            value={periodDateFromDayKey}
            onChange={(next) => handlePeriodDateFromChange(dayKeyToIsoDate(next))}
            maxDayKey={periodDateToDayKey || undefined}
            helperText="Ngày đầu của khoảng kỳ cần tổng hợp."
            fullWidth
          />
          <SingleDayKeyField
            label={uiText(UITextKey.TextDenNgay2)}
            value={periodDateToDayKey}
            onChange={(next) => handlePeriodDateToChange(dayKeyToIsoDate(next))}
            minDayKey={periodDateFromDayKey || undefined}
            helperText="Ngày cuối của khoảng kỳ cần tổng hợp."
            fullWidth
          />
        </Stack>
      )}

      {periodScopeMode === "CUMULATIVE_TO_PERIOD" && (
        <SingleDayKeyField
          label={uiText(UITextKey.TextLuyKeDenNgayKy)}
          value={periodDateToDayKey}
          onChange={(next) => onPeriodDateToChange(dayKeyToIsoDate(next))}
          helperText="Hệ thống lấy các báo cáo từ đầu phạm vi đến hết kỳ này."
          fullWidth
        />
      )}
    </Stack>
  );
};

function formatPeriodScopeGuideLabel(mode: PeriodScopeMode) {
  if (mode === "SINGLE_PERIOD") return uiText(UITextKey.TextMotNgayKy);
  if (mode === "PERIOD_RANGE") return uiText(UITextKey.TextTuNgayDenNgay2);
  if (mode === "CUMULATIVE_TO_PERIOD") return uiText(UITextKey.TextLuyKeDenNgayKy);
  return uiText(UITextKey.TextToanBoKy);
}

export default AggregatePeriodPicker;
