import React from "react";
import dayjs from "dayjs";
import { Typography, type TypographyProps } from "@mui/material";

export interface CommonDateTextProps {
  value?: string | Date | null;
  withTime?: boolean;
  emptyLabel?: string;
  variant?: TypographyProps["variant"];
  color?: TypographyProps["color"];
  noWrap?: boolean;
}

function getFormattedDate(
  value?: string | Date | null,
  withTime = false,
  emptyLabel = "-"
) {
  if (!value) return emptyLabel;

  const parsed = dayjs(value);
  if (!parsed.isValid()) return emptyLabel;

  return parsed.format(withTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY");
}

export const CommonDateText: React.FC<CommonDateTextProps> = ({
  value,
  withTime = false,
  emptyLabel = "-",
  variant = "body2",
  color,
  noWrap = false,
}) => {
  const label = getFormattedDate(value, withTime, emptyLabel);

  return (
    <Typography variant={variant} color={color} noWrap={noWrap} title={label}>
      {label}
    </Typography>
  );
};

export default CommonDateText;
