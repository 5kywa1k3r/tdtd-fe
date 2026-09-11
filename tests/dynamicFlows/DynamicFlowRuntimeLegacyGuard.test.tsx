import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WorkAssignmentTable, {
  type AssignmentTableRow,
} from "../../src/components/works/assignments/WorkAssignmentTable";

describe("Flow runtime assignment legacy guard", () => {
  it("disables every legacy mutation affordance with exact P7/P8/server-capability reasons", () => {
    const callbacks = {
      onViewDetail: vi.fn(),
      onPreviewTemplate: vi.fn(),
      onEvaluate: vi.fn(),
      onOpenAggregate: vi.fn(),
      onConfigureSourceRules: vi.fn(),
      onConfigureAutoApprove: vi.fn(),
      onComplete: vi.fn(),
      onToggleActive: vi.fn(),
    };
    const row: AssignmentTableRow = {
      id: "assignment-runtime-1",
      code: "FLOW-A-1",
      name: "Runtime assignment",
      flowInstanceId: "instance-1",
      flowStepId: "step-definition-1",
      flowBranchId: "branch-1",
      flowAttemptNo: 1,
      dynamicFormTemplateId: "form-version-1",
      evaluationTemplateId: "evaluation-1",
      isActive: true,
    };

    render(<WorkAssignmentTable rows={[row]} {...callbacks} />);

    const assignmentRow = screen.getByText("Runtime assignment").closest("tr");
    expect(assignmentRow).not.toBeNull();
    const actionButtons = within(assignmentRow as HTMLElement).getAllByRole("button");
    expect(actionButtons).toHaveLength(8);
    actionButtons.forEach((button) => {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    });

    const p7Button = screen
      .getAllByLabelText(/mapping\/source rules bị khóa đến P7/i)
      .find((element) => element.tagName === "BUTTON");
    const p8Button = screen
      .getAllByLabelText(/statistics\/aggregation bị khóa đến P8/i)
      .find((element) => element.tagName === "BUTTON");
    expect(p7Button).toBeDisabled();
    expect(p8Button).toBeDisabled();
    expect(
      screen.getAllByLabelText(/chỉ server capability tại canonical Flow route/i),
    ).not.toHaveLength(0);
    Object.values(callbacks).forEach((callback) => expect(callback).not.toHaveBeenCalled());
  });
});
