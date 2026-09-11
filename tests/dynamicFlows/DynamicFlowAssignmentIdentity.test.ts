import { describe, expect, it } from "vitest";

import { toAssignmentRow } from "../../src/components/works/assignments/AssignmentBranchTree";
import type { WorkAssignmentListResponse } from "../../src/types/workAssignment";

describe("dynamic Flow assignment identity mapper", () => {
  it("preserves the complete server-owned Flow identity without deriving capabilities", () => {
    const source = {
      id: "assignment-1",
      workId: "work-1",
      name: "Nhánh báo cáo",
      dynamicExcelId: "",
      dynamicExcelCode: "",
      dynamicExcelName: "",
      assignmentType: "ONCE",
      aggregationType: "MATRIX",
      assignees: [],
      isActive: true,
      createdAtUtc: "2026-07-24T00:00:00Z",
      updatedAtUtc: "2026-07-24T00:01:00Z",
      progressStatus: 0,
      hasAnyDuePeriod: false,
      hasOverduePeriod: false,
      rootAssignmentId: "assignment-1",
      level: 0,
      code: "ASN-1",
      path: "/assignment-1",
      flowTemplateId: "flow-family-1",
      flowTemplateVersionNo: 12,
      flowInstanceId: "flow-instance-1",
      flowStepId: "flow-step-definition-1",
      flowStepCode: "REPORT",
      flowStepOrder: 3,
      flowBranchId: "branch-unit-1",
      parentFlowBranchId: "branch-root",
      flowAttemptNo: 2,
      flowRole: "ASSIGNEE",
      flowEffectiveStatus: "EFFECTIVE",
      issuedByUnitId: "issuer-unit-1",
      targetUnitIds: ["target-unit-1", "target-unit-2"],
      allowSubFlow: false,
      isFlowFinalNode: true,
      invalidatedByFlowEventId: "event-9",
    } as WorkAssignmentListResponse;

    const mapped = toAssignmentRow(source) as unknown as Record<string, unknown>;

    expect(mapped).toMatchObject({
      flowTemplateId: "flow-family-1",
      flowTemplateVersionNo: 12,
      flowInstanceId: "flow-instance-1",
      flowStepId: "flow-step-definition-1",
      flowStepCode: "REPORT",
      flowStepOrder: 3,
      flowBranchId: "branch-unit-1",
      parentFlowBranchId: "branch-root",
      flowAttemptNo: 2,
      flowRole: "ASSIGNEE",
      flowEffectiveStatus: "EFFECTIVE",
      issuedByUnitId: "issuer-unit-1",
      targetUnitIds: ["target-unit-1", "target-unit-2"],
      allowSubFlow: false,
      isFlowFinalNode: true,
      invalidatedByFlowEventId: "event-9",
    });
    expect(mapped).not.toHaveProperty("canExecute");
    expect(mapped).not.toHaveProperty("capabilities");
  });
});
