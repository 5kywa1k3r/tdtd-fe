import * as React from 'react';
import { MenuItem, TextField } from '@mui/material';
import { getPositionsByUnitCode, POSITION_NAME_BY_CODE, POSITIONS} from '../../constants/position';

type Props = {
  value: string; // positionCode | ''
  onChange: (code: string) => void;
  label?: string;
  size?: 'small' | 'medium';
  disabled?: boolean;

  /** dùng để lọc theo level (unitCode.length/3). Nếu không truyền -> show all */
  unitCode?: string | null;

  /** allow empty option */
  allowEmpty?: boolean;
};

export function PositionSelect({
  value,
  onChange,
  label = 'Chức vụ',
  size = 'small',
  disabled,
  unitCode,
  allowEmpty = true,
}: Props) {
  const options = React.useMemo(() => {
    if (unitCode != null) return getPositionsByUnitCode(unitCode);
    return POSITIONS;
  }, [unitCode]);

  return (
    <TextField
      select
      fullWidth
      size={size}
      label={label}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {allowEmpty && <MenuItem value="">-- Tất cả --</MenuItem>}
      {options.map((p) => (
        <MenuItem key={p.code} value={p.code}>
          {p.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** helper label: "username - chức vụ" */
export function formatUserLabel(username: string, fullName: string, positionCode?: string | null) {
  const posName = positionCode ? POSITION_NAME_BY_CODE[positionCode] : '';
  if (!posName) return `${username} - ${fullName}`;
  return `${username} - ${posName}`;
}