import React from "react";
import { Typography, type SxProps, type Theme, type TypographyProps } from "@mui/material";

export interface CommonLabelTextProps {
  text?: string | number | null;
  tooltip?: string | null;
  emptyLabel?: string;
  variant?: TypographyProps["variant"];
  color?: TypographyProps["color"];
  fontWeight?: TypographyProps["fontWeight"];
  maxLines?: number;
  sx?: SxProps<Theme>;
}

export const CommonLabelText: React.FC<CommonLabelTextProps> = ({
  text,
  tooltip,
  emptyLabel = "-",
  variant = "body2",
  color,
  fontWeight,
  maxLines = 1,
  sx,
}) => {
  const value = text == null || String(text).trim() === "" ? emptyLabel : String(text);
  const title = tooltip?.trim() || value;

  if (maxLines <= 1) {
    return (
      <Typography
        variant={variant}
        color={color}
        fontWeight={fontWeight}
        noWrap
        title={title}
        sx={sx}
      >
        {value}
      </Typography>
    );
  }

  return (
    <Typography
      variant={variant}
      color={color}
      fontWeight={fontWeight}
      title={title}
      sx={{
        display: "-webkit-box",
        overflow: "hidden",
        textOverflow: "ellipsis",
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: "vertical",
        ...sx,
      }}
    >
      {value}
    </Typography>
  );
};

export default CommonLabelText;
