import { MenuItem, TextField } from '@mui/material';
import { useListPositionsQuery } from '../../api/adminCatalogApi';

type Props = {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  size?: 'small' | 'medium';
  disabled?: boolean;
  unitTypeCode?: string | null;
  unitCode?: string | null;
  allowEmpty?: boolean;
};

export function PositionSelect(props: Props) {
  const {
    value,
    onChange,
    label = 'Chức vụ',
    size = 'small',
    disabled,
    unitTypeCode,
    allowEmpty = true,
  } = props;

  const { data: options = [], isFetching } = useListPositionsQuery({
    unitTypeCode: unitTypeCode || undefined,
    isDeleted: false,
  });

  return (
    <TextField
      select
      fullWidth
      size={size}
      label={label}
      value={value ?? ''}
      disabled={disabled || isFetching}
      onChange={(e) => onChange(e.target.value)}
    >
      {allowEmpty && <MenuItem value="">-- Tất cả --</MenuItem>}
      {!allowEmpty && <MenuItem value="">-- Chọn chức vụ --</MenuItem>}
      {options.map((p) => (
        <MenuItem key={p.code} value={p.code}>
          {p.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function formatUserLabel(username: string, fullName: string, positionCode?: string | null) {
  if (!positionCode) return `${username} - ${fullName}`;
  return `${username} - ${positionCode}`;
}
