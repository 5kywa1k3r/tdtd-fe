import React from "react";
import {
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SingleDayKeyField from "../../common/SingleDayKeyField";
import type { ReviewStatusBucket } from "../../../types/reportReview";
import { UITextKey, uiText } from '../../../constants/uiText';

export type ReviewFilterOption = {
  id: string;
  label: string;
  subLabel?: string;
};

type Props = {
  unitId: string;
  onUnitIdChange: (value: string) => void;
  unitOptions: ReviewFilterOption[];

  userId: string;
  onUserIdChange: (value: string) => void;
  userOptions: ReviewFilterOption[];

  periodDayKey: string;
  onPeriodDayKeyChange: (value: string) => void;

  reviewStatusBucket: ReviewStatusBucket;
  onReviewStatusBucketChange: (value: ReviewStatusBucket) => void;

  loading?: boolean;
  disabled?: boolean;
  onSearch: () => void;
  onReset?: () => void;
  onReload?: () => void;
};

const STATUS_OPTIONS: Array<{ value: ReviewStatusBucket; label: string }> = [
  { value: "PENDING", label: "Chưa làm" },
  { value: "SUBMITTED", label: "Đã nộp" },
  { value: "OVERDUE", label: "Quá hạn" },
  { value: "RETURNED", label: "Bị từ chối" },
  { value: "ALL", label: "Tất cả" },
];

const fieldSx = { flex: { xs: "1 1 100%", sm: "1 1 220px", xl: "0 1 220px" }, minWidth: 0 };

const WorkReviewFilterBar: React.FC<Props> = ({
  unitId,
  onUnitIdChange,
  unitOptions,
  userId,
  onUserIdChange,
  userOptions,
  periodDayKey,
  onPeriodDayKeyChange,
  reviewStatusBucket,
  onReviewStatusBucketChange,
  loading,
  disabled,
  onSearch,
  onReset,
  onReload,
}) => {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", xl: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", xl: "center" }}
          justifyContent="space-between"
        >
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" fontWeight={700}>
              Bộ lọc duyệt báo cáo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lọc nhanh theo đơn vị, tài khoản, ngày kỳ và trạng thái cần duyệt.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              onClick={onSearch}
              disabled={loading || disabled}
              startIcon={<SearchOutlinedIcon />}
              sx={{ minWidth: 132, borderRadius: 2 }}
            >
              Tìm kiếm
            </Button>

            <Button
              variant="outlined"
              onClick={onReset}
              disabled={loading || disabled || !onReset}
              startIcon={<RestartAltOutlinedIcon />}
              sx={{ minWidth: 116, borderRadius: 2 }}
            >
              Đặt lại
            </Button>

            <Button
              variant="outlined"
              onClick={onReload ?? onSearch}
              disabled={loading || disabled}
              startIcon={<RefreshOutlinedIcon />}
              sx={{ minWidth: 116, borderRadius: 2 }}
            >
              Làm mới
            </Button>
          </Stack>
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <TextField
            select
            size="small"
            label={uiText(UITextKey.TextDonVi)}
            value={unitId}
            disabled={disabled}
            onChange={(e) => onUnitIdChange(e.target.value)}
            sx={fieldSx}
          >
            <MenuItem value="">{uiText(UITextKey.TextTatCaDonViDaGiao)}</MenuItem>
            {unitOptions.map((opt) => (
              <MenuItem key={opt.id} value={opt.id}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label={uiText(UITextKey.TextTaiKhoan)}
            value={userId}
            disabled={disabled}
            onChange={(e) => onUserIdChange(e.target.value)}
            sx={{ ...fieldSx, flex: { xs: "1 1 100%", sm: "1 1 260px", xl: "0 1 260px" } }}
          >
            <MenuItem value="">{uiText(UITextKey.TextTatCaTaiKhoanDaGiao)}</MenuItem>
            {userOptions.map((opt) => (
              <MenuItem key={opt.id} value={opt.id}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <SingleDayKeyField
            label={uiText(UITextKey.TextNgayKyBaoCao)}
            value={periodDayKey}
            onChange={onPeriodDayKeyChange}
            onEnterPress={onSearch}
            disabled={disabled}
            fullWidth
            sx={{ ...fieldSx, flex: { xs: "1 1 100%", sm: "1 1 180px", xl: "0 1 180px" } }}
          />

          <TextField
            select
            size="small"
            label={uiText(UITextKey.TextTrangThai)}
            value={reviewStatusBucket}
            disabled={disabled}
            onChange={(e) => onReviewStatusBucketChange(e.target.value as ReviewStatusBucket)}
            sx={{ ...fieldSx, flex: { xs: "1 1 100%", sm: "1 1 170px", xl: "0 1 170px" } }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default WorkReviewFilterBar;
