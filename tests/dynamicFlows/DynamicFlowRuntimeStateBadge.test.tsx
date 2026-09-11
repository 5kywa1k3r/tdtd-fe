import { render, screen } from "@testing-library/react";
import { getContrastRatio } from "@mui/material/styles";
import { describe, expect, it } from "vitest";

import DynamicFlowRuntimeStateBadge from "../../src/components/works/flowRuntime/DynamicFlowRuntimeStateBadge";
import { runtimeStateTextColor } from "../../src/components/works/flowRuntime/dynamicFlowRuntimeModel";

describe("DynamicFlowRuntimeStateBadge", () => {
  it.each([
    ["ASSIGNED", "ASSIGNED \u2014 \u0110\u00e3 giao"],
    ["IN_PROGRESS", "IN_PROGRESS \u2014 \u0110ang th\u1ef1c hi\u1ec7n"],
    ["RETURNED", "RETURNED \u2014 B\u1ecb tr\u1ea3 l\u1ea1i"],
    ["SUBMITTED", "SUBMITTED \u2014 \u0110\u00e3 g\u1eedi"],
  ])("renders inbox state %s with its code and understandable label", (state, label) => {
    render(<DynamicFlowRuntimeStateBadge state={state} />);

    expect(screen.getByRole("status")).toHaveTextContent(label);
  });

  it.each([
    ["PARTIAL", "WarningAmberOutlinedIcon"],
    ["RETRYING", "AutorenewOutlinedIcon"],
    ["RECONCILED", "PublishedWithChangesOutlinedIcon"],
    ["FAILED", "ErrorOutlineOutlinedIcon"],
    ["COMPLETED", "CheckCircleOutlineOutlinedIcon"],
  ])("renders %s with status text and a non-color icon", (state, iconTestId) => {
    render(<DynamicFlowRuntimeStateBadge state={state} />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(state);
    expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
  });

  it.each(["PARTIAL", "RETRYING", "RECONCILED", "FAILED", "COMPLETED"])(
    "keeps %s status text at WCAG AA contrast on the paper surface",
    (state) => {
      expect(getContrastRatio(runtimeStateTextColor(state), "#ffffff")).toBeGreaterThanOrEqual(4.5);
    },
  );
});
