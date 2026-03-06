import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import type { WorkDetail, WorkPriorityCore, WorkTypeCore } from "../../../../types/work";
import { WORK_TYPE } from "../../../../types/work";
import type { WorkUpdateReq, WorkCreateReq } from "../../../../api/workApi";

type WorkUiType = "TASK" | "INDICATOR";

export type WorkFormState = {
  autoCode: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  priority: WorkPriorityCore;
  type: WorkTypeCore;

  leaderDirectiveUserId: string;
  leaderWatchUserIds: string[];

  note: string;
};

const toYmd = (iso: string | null | undefined, fallback: string) =>
  iso ? dayjs(iso).format("YYYY-MM-DD") : fallback;

const isoOrNull = (ymd?: string) => (ymd ? new Date(ymd).toISOString() : null);

const mapUiTypeToCore = (type: WorkUiType): WorkTypeCore =>
  type === "TASK" ? WORK_TYPE.TASK : WORK_TYPE.INDICATOR;

export function useWorkFormState(initialData?: WorkDetail, formType?: WorkUiType) {
  const hydratedRef = useRef<string | null>(null);

  const [state, setState] = useState<WorkFormState>(() => ({
    autoCode: "",
    name: "",
    description: "",
    startDate: dayjs().format("YYYY-MM-DD"),
    endDate: dayjs().add(7, "day").format("YYYY-MM-DD"),
    dueDate: "",
    priority: 2 as WorkPriorityCore,
    type: mapUiTypeToCore(formType ?? "TASK"),

    leaderDirectiveUserId: "",
    leaderWatchUserIds: [],

    note: "",
  }));

  useEffect(() => {
    if (!initialData?.id) {
      setState((s) => ({
        ...s,
        type: mapUiTypeToCore(formType ?? "TASK"),
      }));
      return;
    }

    if (hydratedRef.current === initialData.id) return;
    hydratedRef.current = initialData.id;

    setState((s) => ({
      ...s,
      autoCode: initialData.autoCode ?? "",
      name: initialData.name ?? "",
      description: initialData.description ?? "",
      startDate: toYmd(initialData.startDate, dayjs().format("YYYY-MM-DD")),
      endDate: toYmd(initialData.endDate, dayjs().add(7, "day").format("YYYY-MM-DD")),
      dueDate: initialData.dueDate ? dayjs(initialData.dueDate).format("YYYY-MM-DD") : "",
      leaderDirectiveUserId: initialData.leaderDirectiveUserId ?? "",
      leaderWatchUserIds: initialData.leaderWatchUserIds ?? [],
      priority: (initialData.priority ?? 2) as WorkPriorityCore,
      type: (initialData.type ?? mapUiTypeToCore(formType ?? "TASK")) as WorkTypeCore,
      note: initialData.note ?? "",
    }));
  }, [initialData, formType]);

  const dateValue = useMemo(
    () => ({
      from: state.startDate ? dayjs(state.startDate).startOf("day") : null,
      to: state.endDate ? dayjs(state.endDate).endOf("day") : null,
    }),
    [state.startDate, state.endDate]
  );

  const validate = (nameLabel: string) => {
    if (!state.name.trim()) return `${nameLabel} không được để trống.`;
    if (!state.type) return "Vui lòng chọn loại công việc.";
    if (!state.startDate || !state.endDate) return "Vui lòng chọn Từ ngày/Đến ngày.";
    if (dayjs(state.endDate).isBefore(dayjs(state.startDate), "day")) {
      return '"Đến ngày" phải >= "Từ ngày".';
    }
    if (!state.leaderDirectiveUserId.trim()) return "Vui lòng chọn Lãnh đạo chỉ đạo.";
    if (state.dueDate && dayjs(state.dueDate).isBefore(dayjs(state.startDate), "day")) {
      return '"Hạn" phải >= "Từ ngày".';
    }
    return null;
  };

  const buildCreatePayload = (): WorkCreateReq => ({
    name: state.name.trim(),
    description: state.description.trim() ? state.description.trim() : null,
    note: state.note.trim() ? state.note.trim() : null,
    leaderDirectiveUserId: state.leaderDirectiveUserId.trim(),
    leaderWatchUserIds: state.leaderWatchUserIds,
    startDate: isoOrNull(state.startDate),
    endDate: isoOrNull(state.endDate),
    dueDate: isoOrNull(state.dueDate),
    priority: state.priority ?? null,
    type: state.type,
  });

  const buildUpdatePayload = (): WorkUpdateReq => ({
    name: state.name.trim(),
    description: state.description.trim() ? state.description.trim() : null,
    note: state.note.trim() ? state.note.trim() : null,
    leaderDirectiveUserId: state.leaderDirectiveUserId.trim(),
    leaderWatchUserIds: state.leaderWatchUserIds,
    startDate: isoOrNull(state.startDate),
    endDate: isoOrNull(state.endDate),
    dueDate: isoOrNull(state.dueDate),
    priority: state.priority ?? null,
  });

  return {
    state,
    setState,
    dateValue,
    validate,
    buildCreatePayload,
    buildUpdatePayload,
  };
}