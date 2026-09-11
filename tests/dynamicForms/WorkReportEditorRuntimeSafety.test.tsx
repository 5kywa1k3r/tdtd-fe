import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DynamicFormDetail } from "../../src/api/dynamicFormApi";
import type { WorkbookDataGridHandle } from "../../src/components/excel/fortune/WorkbookDataGrid";
import type { WorkAssignmentReportResponse } from "../../src/types/report";

const mocks = vi.hoisted(() => {
  const state = {
    report: null as WorkAssignmentReportResponse | null,
    latestReport: null as WorkAssignmentReportResponse | null,
    form: null as DynamicFormDetail | null,
    saveImpl: (_arg: unknown) => Promise.resolve(null as unknown),
    submitImpl: (_arg: unknown) => Promise.resolve(null as unknown),
    withdrawImpl: (_arg: unknown) => Promise.resolve(null as unknown),
  };
  return {
    state,
    saveTrigger: vi.fn((arg: unknown) => ({ unwrap: () => state.saveImpl(arg) })),
    savePatchTrigger: vi.fn((arg: unknown) => ({ unwrap: () => state.saveImpl(arg) })),
    submitTrigger: vi.fn((arg: unknown) => ({ unwrap: () => state.submitImpl(arg) })),
    withdrawTrigger: vi.fn((arg: unknown) => ({ unwrap: () => state.withdrawImpl(arg) })),
    refetchReport: vi.fn(() => Promise.resolve({ data: state.latestReport ?? state.report })),
    refetchSections: vi.fn(() => Promise.resolve({ data: [] })),
    refetchForm: vi.fn(() => Promise.resolve({ data: state.form })),
  };
});

vi.mock("../../src/api/reportApi", () => ({
  useGetWorkAssignmentReportQuery: () => ({
    data: mocks.state.report,
    isLoading: false,
    isError: false,
    error: null,
    refetch: mocks.refetchReport,
  }),
  useGetWorkAssignmentReportSectionsQuery: () => ({
    data: [],
    isError: false,
    error: null,
    refetch: mocks.refetchSections,
  }),
  useGetWorkAssignmentReportTemplateWorkbookQuery: () => ({
    data: undefined,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGetWorkAssignmentReportLogsQuery: () => ({
    data: [],
    isFetching: false,
    isError: false,
  }),
  useSaveWorkAssignmentReportDraftMutation: () => [mocks.saveTrigger, { isLoading: false }],
  useSaveWorkAssignmentReportDraftPatchMutation: () => [mocks.savePatchTrigger, { isLoading: false }],
  useSubmitWorkAssignmentReportMutation: () => [mocks.submitTrigger, { isLoading: false }],
  useWithdrawSubmittedReportMutation: () => [mocks.withdrawTrigger, { isLoading: false }],
}));

vi.mock("../../src/api/dynamicFormApi", () => ({
  useGetDynamicFormQuery: () => ({
    data: mocks.state.form,
    isFetching: false,
    isError: false,
    error: null,
    refetch: mocks.refetchForm,
  }),
}));

vi.mock("../../src/components/labels/LabelPicker", () => ({
  default: () => <div data-testid="label-picker" />,
}));

vi.mock("../../src/components/excel/fortune/WorkbookDataGrid", async () => {
  const ReactModule = await import("react");

  return {
    default: ReactModule.forwardRef<WorkbookDataGridHandle, Record<string, unknown>>(
      function MockWorkbookDataGrid(_props, ref) {
        ReactModule.useImperativeHandle(ref, () => ({
          commitChanges: () => ({
            rawWorkbookData: [],
            values1D: [null, null],
            valuesHash: "manual-null-2",
            validationIssues: [],
          }),
        }));
        return <div data-testid="mock-workbook-data-grid" />;
      },
    ),
  };
});

import WorkReportEditorPage from "../../src/pages/works/report/WorkReportEditorPage";

function buildForm(): DynamicFormDetail {
  const schema = {
    sections: [
      { id: "main", title: "Phần chính", order: 0 },
      { id: "secondary", title: "Phần phụ", order: 1 },
    ],
    fields: [
      {
        id: "notes",
        key: "notes",
        sectionId: "main",
        name: "Nội dung",
        type: "longText" as const,
        required: false,
        order: 0,
      },
      {
        id: "secondary-notes",
        key: "secondaryNotes",
        sectionId: "secondary",
        name: "Nội dung phụ",
        type: "longText" as const,
        required: false,
        order: 0,
      },
    ],
    blocks: [
      {
        blockId: "table-1",
        sectionId: "main",
        tableMode: "FIXED_GRID" as const,
        dynamicExcelTemplateId: null,
        dataRect: { r0: 0, c0: 0, r1: 0, c1: 0 },
        w: 1,
        h: 1,
        defaultDataType: "NUMBER",
        indexMap: [{ index: 0, rowKey: "row_1", columnKey: "col_1", metricKey: "metric_1" }],
      },
    ],
  };
  return {
    id: "form-1",
    code: "FORM_1",
    name: "Biểu mẫu runtime",
    description: null,
    tagCodes: [],
    schemaVersion: 3,
    versionNo: 1,
    familyId: "family-1",
    lineageStatus: "ROOT",
    revision: 1,
    isActive: true,
    isPublished: true,
    publishedSchemaHash: "schema-hash-1",
    createdByUsername: "owner",
    createdAtUtc: "2026-07-22T00:00:00.000Z",
    updatedAtUtc: "2026-07-22T00:00:00.000Z",
    schema,
    sectionsJson: JSON.stringify(schema.sections),
    fieldsJson: JSON.stringify(schema.fields),
    excelBlockJson: JSON.stringify(schema.blocks[0]),
    blocksJson: JSON.stringify(schema.blocks),
    actions: {
      canRead: true,
      canUpdate: false,
      canDelete: false,
      canPublish: false,
      canCreateVersion: false,
      canViewHistory: true,
      canClone: false,
      canImport: false,
      canUpdateStatistics: false,
    },
  };
}

function buildReport(overrides: Partial<WorkAssignmentReportResponse> = {}) {
  return {
    id: "report-1",
    workAssignmentId: "assignment-1",
    workReportPeriodId: "period-1",
    periodKey: "202607",
    dynamicFormTemplateId: "form-1",
    dynamicFormTemplateCode: "FORM_1",
    dynamicFormTemplateName: "Biểu mẫu runtime",
    dynamicFormFamilyId: "family-1",
    dynamicFormVersionNo: 1,
    dynamicFormSchemaHash: "schema-hash-1",
    dynamicExcelTemplateId: null,
    dynamicExcelTemplateCode: null,
    dynamicExcelTemplateName: null,
    templateSnapshotJson: "",
    specJson: "",
    values1DJson: "[]",
    fieldValuesJson: JSON.stringify({
      dynamicFormTemplateId: "form-1",
      schemaVersion: 3,
      values: { notes: "", "secondary-notes": "" },
    }),
    tableValuesJson: JSON.stringify({ dynamicFormTemplateId: "form-1", blocks: [] }),
    payloadRevision: 4,
    lifecycleRevision: 2,
    canEditPayload: true,
    canSubmit: true,
    canWithdraw: false,
    dataRectR0: 1,
    dataRectC0: 0,
    dataRectR1: 1,
    dataRectC1: 0,
    w: 1,
    h: 1,
    status: 0,
    periodStatus: 1,
    isLateSubmission: false,
    versionNo: 1,
    isCurrent: true,
    isActive: true,
    autoApproved: false,
    canEditCompletedDate: false,
    requiresCompletedDate: false,
    updatedAtUtc: "2026-07-22T00:00:00.000Z",
    ...overrides,
  } as unknown as WorkAssignmentReportResponse;
}

function renderEditor(report = buildReport(), form = buildForm()) {
  mocks.state.report = report;
  mocks.state.latestReport = report;
  mocks.state.form = form;
  const router = createMemoryRouter(
    [
      {
        path: "/report",
        element: (
          <WorkReportEditorPage
            workId="work-1"
            reportId="report-1"
            onBack={() => void 0}
          />
        ),
      },
      { path: "/next", element: <div>Trang kế tiếp</div> },
    ],
    { initialEntries: ["/report"] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  sessionStorage.clear();
  mocks.saveTrigger.mockClear();
  mocks.savePatchTrigger.mockClear();
  mocks.submitTrigger.mockClear();
  mocks.withdrawTrigger.mockClear();
  mocks.refetchReport.mockClear();
  mocks.refetchSections.mockClear();
  mocks.state.saveImpl = async () => buildReport({ payloadRevision: 5 });
  mocks.state.submitImpl = async () => buildReport({
    payloadRevision: 5,
    lifecycleRevision: 3,
    status: 1,
    canEditPayload: false,
    canSubmit: false,
    canWithdraw: true,
  });
  mocks.state.withdrawImpl = async () => buildReport();
});

describe("WorkReportEditorPage P3 runtime safety", () => {
  it("locks every write and offers retry when runtime schema is unsupported", () => {
    const form = buildForm();
    form.schema = {
      ...form.schema,
      fields: [{ ...form.schema.fields[0], type: "futureType" as never }],
    };
    form.fieldsJson = JSON.stringify(form.schema.fields);
    renderEditor(buildReport(), form);

    expect(screen.getByRole("alert")).toHaveTextContent(/không được hỗ trợ/i);
    expect(screen.queryByRole("button", { name: "Lưu nháp" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nộp báo cáo" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(mocks.refetchForm).toHaveBeenCalledOnce();
  });

  it("uses server capabilities even when status is Draft", () => {
    renderEditor(buildReport({ canEditPayload: false, canSubmit: false }));

    expect(screen.getByRole("textbox", { name: "Nội dung" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Lưu nháp" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nộp báo cáo" })).not.toBeInTheDocument();
  });

  it("persists the full session draft and debounces a server autosave", async () => {
    vi.useFakeTimers();
    try {
      renderEditor();
      fireEvent.change(screen.getByRole("textbox", { name: "Nội dung" }), {
        target: { value: "nội dung local" },
      });

      await act(async () => undefined);
      const persisted = JSON.parse(sessionStorage.getItem("tdtd:p3-report-draft:report-1") ?? "null");
      expect(persisted).toMatchObject({
        basePayloadRevision: 4,
        baseLifecycleRevision: 2,
        fieldValues: { notes: "nội dung local" },
        workbookValuesByBlock: {},
        rowLabelsByBlock: expect.any(Object),
        appendAxisStates: {},
        dataOrigin: "MANUAL_INPUT",
        cumulativeContributionMode: "INCLUDE",
        activeSectionId: "main",
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1201);
      });
      expect(mocks.saveTrigger).toHaveBeenCalledOnce();
      const request = mocks.saveTrigger.mock.calls[0]?.[0] as {
        data: { fieldValuesJson: string; expectedPayloadRevision: number };
      };
      expect(request.data.expectedPayloadRevision).toBe(4);
      expect(JSON.parse(request.data.fieldValuesJson).values.notes).toBe("nội dung local");
      await act(async () => undefined);
      expect(screen.getByText("Đã lưu")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("coalesces an explicit save with an autosave already entering the mutation", async () => {
    vi.useFakeTimers();
    try {
      let resolveSave: ((value: WorkAssignmentReportResponse) => void) | undefined;
      mocks.state.saveImpl = () => new Promise<WorkAssignmentReportResponse>((resolve) => {
        resolveSave = resolve;
      });

      renderEditor();
      fireEvent.change(screen.getByRole("textbox", { name: "Nội dung" }), {
        target: { value: "single in-flight save" },
      });

      await act(async () => {
        vi.advanceTimersByTime(1200);
        fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
      });
      expect(mocks.saveTrigger).toHaveBeenCalledOnce();

      await act(async () => {
        resolveSave?.(buildReport({ payloadRevision: 5 }));
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mocks.saveTrigger).toHaveBeenCalledOnce();

      fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
      expect(mocks.saveTrigger).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("restores a full local draft and keeps its active section", async () => {
    sessionStorage.setItem("tdtd:p3-report-active-section:report-1", "secondary");
    sessionStorage.setItem("tdtd:p3-report-draft:report-1", JSON.stringify({
      basePayloadRevision: 4,
      baseLifecycleRevision: 2,
      updatedAtUtc: "2026-07-22T00:01:00.000Z",
      fieldValues: { notes: "local main", "secondary-notes": "local secondary" },
      workbookValuesByBlock: {},
      workbookRawDataByBlock: {},
      rowLabelsByBlock: {},
      appendAxisStates: {},
      lateReason: "local late reason",
      completedDate: "",
      dataOrigin: "MANUAL_INPUT",
      cumulativeContributionMode: "INCLUDE",
      activeSectionId: "secondary",
    }));

    renderEditor();
    expect(await screen.findByRole("textbox", { name: "Nội dung phụ" })).toHaveValue("local secondary");
    expect(screen.getByText("Có thay đổi chưa lưu")).toBeInTheDocument();
  });

  it("keeps the published active section after save removes the local draft and the report reopens", async () => {
    renderEditor();
    const sectionSelect = screen.getByRole("combobox", { name: "Phần" });
    fireEvent.focus(sectionSelect);
    fireEvent.click(await screen.findByRole("option", { name: /Phần phụ/i }));

    const secondaryInput = await screen.findByRole("textbox", { name: "Nội dung phụ" });
    fireEvent.change(secondaryInput, { target: { value: "lưu ở phần phụ" } });
    await waitFor(() => {
      expect(sessionStorage.getItem("tdtd:p3-report-active-section:report-1")).toBe("secondary");
      expect(sessionStorage.getItem("tdtd:p3-report-draft:report-1")).not.toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
    await waitFor(() => expect(mocks.saveTrigger).toHaveBeenCalledOnce());
    await screen.findByText("Đã lưu");
    expect(screen.getByRole("textbox", { name: "Nội dung phụ" })).toHaveValue("lưu ở phần phụ");
    expect(sessionStorage.getItem("tdtd:p3-report-draft:report-1")).toBeNull();
    expect(sessionStorage.getItem("tdtd:p3-report-active-section:report-1")).toBe("secondary");

    cleanup();
    renderEditor();
    expect(await screen.findByRole("textbox", { name: "Nội dung phụ" })).toBeInTheDocument();
  });

  it("keeps saved APPEND_COLUMNS instance ids while the report query still holds its previous detail", async () => {
    const form = buildForm();
    const appendColumnsBlock = {
      blockId: "table-1",
      sectionId: "main",
      tableMode: "APPEND_COLUMNS" as const,
      dynamicExcelTemplateId: null,
      dataRect: { r0: 0, c0: 0, r1: 0, c1: 1 },
      w: 2,
      h: 1,
      defaultDataType: "NUMBER",
      indexMap: [
        { index: 0, rowKey: "row_1", columnKey: "col_1", metricKey: "metric_1" },
        { index: 1, rowKey: "row_1", columnKey: "col_2", metricKey: "metric_2" },
      ],
    };
    form.schema = { ...form.schema, blocks: [appendColumnsBlock] };
    form.excelBlockJson = JSON.stringify(appendColumnsBlock);
    form.blocksJson = JSON.stringify([appendColumnsBlock]);

    renderEditor(buildReport(), form);
    fireEvent.click(screen.getByRole("button", { name: "Mở nhập liệu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Thêm cột dữ liệu" }));
    fireEvent.click(screen.getByRole("button", { name: "Thêm cột dữ liệu" }));
    expect(screen.getByText(/2\/2 cột đang dùng/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp bảng này" }));
    await waitFor(() => expect(mocks.savePatchTrigger).toHaveBeenCalledOnce());
    await screen.findByText("Đã lưu");

    const request = mocks.savePatchTrigger.mock.calls[0]?.[0] as {
      data: { tableBlockPatches: Array<{ blockJson: string }> };
    };
    const savedBlock = JSON.parse(request.data.tableBlockPatches[0].blockJson);
    expect(savedBlock.columns).toHaveLength(2);
    expect(savedBlock.columns.map((column: { columnInstanceId: string }) => column.columnInstanceId))
      .toEqual(expect.arrayContaining([
        expect.stringMatching(/^table-1:column:/),
        expect.stringMatching(/^table-1:column:/),
      ]));
    expect(screen.getByText(/2\/2 cột đang dùng/i)).toBeInTheDocument();
  });

  it("rejects a stale active-section key that is absent from the current published schema", async () => {
    sessionStorage.setItem("tdtd:p3-report-active-section:report-1", "removed-section");

    renderEditor();
    expect(await screen.findByRole("textbox", { name: "Nội dung" })).toBeInTheDocument();
    await waitFor(() => {
      expect(sessionStorage.getItem("tdtd:p3-report-active-section:report-1")).toBe("main");
    });
  });

  it("blocks SPA navigation while the complete local draft is dirty", async () => {
    const router = renderEditor();
    fireEvent.change(screen.getByRole("textbox", { name: "Nội dung" }), {
      target: { value: "chưa lưu" },
    });

    await act(async () => {
      await router.navigate("/next");
    });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/report");
    fireEvent.click(screen.getByRole("button", { name: "Ở lại chỉnh sửa" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps local data on 409 and creates a new command only after explicit rebase", async () => {
    let saveAttempt = 0;
    mocks.state.saveImpl = async () => {
      saveAttempt += 1;
      if (saveAttempt === 1) {
        throw { status: 409, message: "revision conflict" };
      }
      return buildReport({ payloadRevision: 10, lifecycleRevision: 6 });
    };
    const latest = buildReport({ payloadRevision: 9, lifecycleRevision: 5 });
    renderEditor();
    mocks.state.latestReport = latest;
    fireEvent.change(screen.getByRole("textbox", { name: "Nội dung" }), {
      target: { value: "giữ nguyên local" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));

    expect(await screen.findByText("Xung đột phiên bản")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nội dung" })).toHaveValue("giữ nguyên local");
    fireEvent.click(screen.getByRole("button", { name: "Tải bản máy chủ để đối chiếu" }));
    await screen.findByText(/Bản máy chủ: payload revision 9/i);
    fireEvent.click(screen.getByRole("button", { name: "Rebase bản nháp lên revision này" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));

    await waitFor(() => expect(mocks.saveTrigger).toHaveBeenCalledTimes(2));
    const first = mocks.saveTrigger.mock.calls[0]?.[0] as { data: { commandId: string; expectedPayloadRevision: number } };
    const second = mocks.saveTrigger.mock.calls[1]?.[0] as { data: { commandId: string; expectedPayloadRevision: number } };
    expect(first.data.expectedPayloadRevision).toBe(4);
    expect(second.data.expectedPayloadRevision).toBe(9);
    expect(second.data.commandId).not.toBe(first.data.commandId);
  });

  it("maps server validation to an inline error and focuses the first field", async () => {
    mocks.state.saveImpl = async () => {
      throw {
        status: 400,
        message: "validation failed",
        details: { fieldErrors: { notes: "Nội dung bị từ chối bởi máy chủ." } },
      };
    };
    renderEditor();
    const input = screen.getByRole("textbox", { name: "Nội dung" });
    fireEvent.change(input, { target: { value: "invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));

    expect(await screen.findByText("Nội dung bị từ chối bởi máy chủ.")).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("treats committed-pending lifecycle response as success and offers projection polling", async () => {
    mocks.state.submitImpl = async () => buildReport({
      payloadRevision: 5,
      lifecycleRevision: 3,
      status: 1,
      canEditPayload: false,
      canSubmit: false,
      canWithdraw: true,
      lifecycleCommitState: "COMMITTED_PENDING_PROJECTION",
      lifecycleProjectionPending: true,
    });
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Nộp báo cáo" }));

    expect(await screen.findByText(/Báo cáo đã được commit; projection đang được hệ thống phục hồi/i))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kiểm tra lại" })).toBeInTheDocument();
    expect(mocks.submitTrigger).toHaveBeenCalledOnce();
  });
});
