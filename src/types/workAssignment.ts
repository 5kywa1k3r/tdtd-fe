import type { UserRefDTO } from "./userRefDto";

export type AssignmentType = "ONCE" | "PERIODIC_REPORT";
export type AggregationType = "MATRIX" | "UNIT_ROW_COL";

export type ReportCycleType =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMI_ANNUAL";

export type ComputationType = "SUM" | "MEAN" | "MAX" | "MIN";

export type QuarterDayRuleDto = {
  quarter: number;
  days: number[];
};

export type SemiAnnualDayRuleDto = {
  half: number;
  days: number[];
};

export type AssignmentScheduleDto = {
  cycleType?: ReportCycleType | null;
  startDate?: string | null;
  weekDays?: number[] | null;
  monthDays?: number[] | null;
  quarterDays?: QuarterDayRuleDto[] | null;
  semiAnnualDays?: SemiAnnualDayRuleDto[] | null;
  note?: string | null;
};

export type WorkAssignmentAssigneeRef = {
  userId: string;
  username?: string | null;
  fullName?: string | null;
  unitId?: string | null;
  unitSymbol?: string | null;
  unitShortName?: string | null;
  unitName?: string | null;
  positionCode?: string | null;
  positionName?: string | null;
};

export type WorkAssignmentResponse = {
  id: string;
  workId: string;

  dynamicExcelId: string;
  dynamicExcelCode: string;
  dynamicExcelName: string;

  workType: string;
  assignmentType: AssignmentType;
  aggregationType: AggregationType;
  computationType?: ComputationType | null;

  schedule?: AssignmentScheduleDto | null;

  assignees: WorkAssignmentAssigneeRef[];

  leaderWatcherUserIds?: string[] | null;
  leaderWatchers?: UserRefDTO[] | null;

  description?: string | null;
  isActive: boolean;

  createdAtUtc: string;
  updatedAtUtc: string;

  // BE nên bổ sung 2 field này nếu muốn FE lock template đúng nghiệp vụ
  hasData?: boolean;
  templateLocked?: boolean;
};

export type SaveWorkAssignmentReq = {
  dynamicExcelId: string;
  assignmentType: AssignmentType;
  aggregationType: AggregationType;
  computationType?: ComputationType | null;
  schedule?: AssignmentScheduleDto | null;
  assigneeUserIds: string[];
  leaderWatcherUserIds?: string[];
  description?: string | null;
  isActive?: boolean;
};

export type AssignmentDraft = {
  localId: string;
  id?: string;
  workId?: string;

  dynamicExcelId: string;
  dynamicExcelCode?: string;
  dynamicExcelName?: string;

  assignmentType: AssignmentType;
  aggregationType: AggregationType;
  computationType: ComputationType;
  schedule: AssignmentScheduleDto | null;

  assigneeUserIds: string[];
  assigneeRefs?: WorkAssignmentAssigneeRef[];

  leaderWatcherUserIds: string[];
  leaderWatcherRefs?: UserRefDTO[];

  description?: string | null;
  isActive: boolean;

  mode: "create" | "edit" | "view";
  isDirty?: boolean;

  templateLocked?: boolean;
  hasData?: boolean;

  createdAtUtc?: string;
  updatedAtUtc?: string;
};

export function emptyAssignmentDraft(): AssignmentDraft {
  return {
    localId: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    dynamicExcelId: "",
    dynamicExcelCode: "",
    dynamicExcelName: "",
    assignmentType: "ONCE",
    aggregationType: "MATRIX",
    computationType: "SUM",
    schedule: null,
    assigneeUserIds: [],
    assigneeRefs: [],
    leaderWatcherUserIds: [],
    leaderWatcherRefs: [],
    description: "",
    isActive: true,
    mode: "create",
    isDirty: true,
    templateLocked: false,
    hasData: false,
  };
}

export function toAssignmentDraft(x: WorkAssignmentResponse): AssignmentDraft {
  return {
    localId: `assignment_${x.id}`,
    id: x.id,
    workId: x.workId,

    dynamicExcelId: x.dynamicExcelId,
    dynamicExcelCode: x.dynamicExcelCode,
    dynamicExcelName: x.dynamicExcelName,

    assignmentType: x.assignmentType,
    aggregationType: x.aggregationType,
    computationType: x.computationType ?? "SUM",
    schedule: x.schedule ?? null,

    assigneeUserIds: (x.assignees ?? []).map((a) => a.userId).filter(Boolean),
    assigneeRefs: x.assignees ?? [],

    leaderWatcherUserIds: Array.from(
      new Set(
        [
          ...(x.leaderWatcherUserIds ?? []),
          ...((x.leaderWatchers ?? []).map((u) => u.userId).filter(Boolean) as string[]),
        ].filter(Boolean)
      )
    ),
    leaderWatcherRefs: x.leaderWatchers ?? [],

    description: x.description ?? "",
    isActive: x.isActive,

    mode: "view",
    isDirty: false,

    templateLocked: x.templateLocked ?? x.hasData ?? false,
    hasData: x.hasData ?? false,

    createdAtUtc: x.createdAtUtc,
    updatedAtUtc: x.updatedAtUtc,
  };
}

export function toSaveReq(draft: AssignmentDraft): SaveWorkAssignmentReq {
  return {
    dynamicExcelId: draft.dynamicExcelId,
    assignmentType: draft.assignmentType,
    aggregationType: draft.aggregationType,
    computationType: draft.computationType,
    schedule: draft.assignmentType === "PERIODIC_REPORT" ? draft.schedule : null,
    assigneeUserIds: Array.from(new Set((draft.assigneeUserIds ?? []).filter(Boolean))),
    leaderWatcherUserIds: Array.from(
      new Set((draft.leaderWatcherUserIds ?? []).filter(Boolean))
    ),
    description: draft.description?.trim() || null,
    isActive: draft.isActive,
  };
}