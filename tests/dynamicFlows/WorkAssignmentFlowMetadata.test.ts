import { describe, expect, it } from "vitest";

import { toAssignmentRow } from "../../src/components/works/assignments/AssignmentBranchTree";
import {
  toAssignmentDraft,
  type WorkAssignmentFlowMetadataFields,
  type WorkAssignmentListResponse,
  type WorkAssignmentResponse,
} from "../../src/types/workAssignment";

const flowMetadata = {
  flowTemplateId: "flow-template-1",
  flowTemplateVersionNo: 12,
  flowInstanceId: "flow-instance-1",
  flowStepId: "flow-step-1",
  flowStepCode: "STEP_01",
  flowStepOrder: 3,
  flowBranchId: "flow-branch-1",
  parentFlowBranchId: "flow-branch-parent",
  flowAttemptNo: 2,
  flowRole: "REVIEWER",
  flowEffectiveStatus: "EFFECTIVE",
  issuedByUnitId: "unit-issuer",
  targetUnitIds: ["unit-a", "unit-b"],
  allowSubFlow: false,
  isFlowFinalNode: true,
  invalidatedByFlowEventId: "flow-event-1",
} satisfies WorkAssignmentFlowMetadataFields;

const commonAssignment = {
  id: "assignment-1",
  workId: "work-1",
  name: "Flow assignment",
  dynamicExcelId: "",
  dynamicExcelCode: "",
  dynamicExcelName: "",
  assignmentType: "ONCE",
  aggregationType: "MATRIX",
  assignees: [],
  isActive: true,
  createdAtUtc: "2026-07-24T00:00:00.000Z",
  updatedAtUtc: "2026-07-24T01:00:00.000Z",
  rootAssignmentId: "assignment-1",
  level: 0,
  code: "ASN-1",
  path: "assignment-1",
  progressStatus: 1,
  hasAnyDuePeriod: false,
  hasOverduePeriod: false,
} satisfies Omit<WorkAssignmentListResponse, keyof WorkAssignmentFlowMetadataFields>;

describe("work assignment Flow metadata", () => {
  it("preserves exact Flow identity through list DTO to table/tree rows", () => {
    const response = {
      ...commonAssignment,
      ...flowMetadata,
    } satisfies WorkAssignmentListResponse;

    expect(toAssignmentRow(response)).toMatchObject(flowMetadata);
  });

  it("preserves exact Flow identity, role and effective status in detail drafts", () => {
    const response = {
      ...commonAssignment,
      ...flowMetadata,
      workType: "TASK",
    } satisfies WorkAssignmentResponse;

    expect(toAssignmentDraft(response)).toMatchObject(flowMetadata);
  });
});
