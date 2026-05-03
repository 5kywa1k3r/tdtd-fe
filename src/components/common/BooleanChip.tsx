import React from "react";
import { Chip, type ChipProps } from "@mui/material";

export interface BooleanChipProps {
  value?: boolean | null;
  trueLabel: string;
  falseLabel: string;
  trueColor?: ChipProps["color"];
  falseColor?: ChipProps["color"];
  trueVariant?: ChipProps["variant"];
  falseVariant?: ChipProps["variant"];
  size?: ChipProps["size"];
}

export const BooleanChip: React.FC<BooleanChipProps> = ({
  value,
  trueLabel,
  falseLabel,
  trueColor = "success",
  falseColor = "default",
  trueVariant = "filled",
  falseVariant = "outlined",
  size = "small",
}) => {
  const isTrue = !!value;

  return (
    <Chip
      size={size}
      color={isTrue ? trueColor : falseColor}
      variant={isTrue ? trueVariant : falseVariant}
      label={isTrue ? trueLabel : falseLabel}
    />
  );
};

export default BooleanChip;
