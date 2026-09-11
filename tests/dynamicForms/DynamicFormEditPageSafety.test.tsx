import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  DynamicFormActionCapabilities,
  DynamicFormDetail,
} from "../../src/api/dynamicFormApi";
import type { DynamicFormEditorSubmit } from "../../src/features/dynamicForms/dynamicForm.types";

type EditorProps = {
  mode: "create" | "edit" | "view";
  allowStatisticConfigEdit?: boolean;
  onReload?: () => Promise<unknown> | unknown;
  onSave?: (payload: DynamicFormEditorSubmit) => Promise<void>;
  onPublish?: () => Promise<void>;
  onImportDynamicExcelBlock?: (
    dynamicExcelId: string,
    sectionId?: string | null,
  ) => Promise<unknown>;
};

const mocks = vi.hoisted(() => ({
  editorProps: null as unknown,
  navigate: vi.fn(),
  refetch: vi.fn(),
  statisticRefetch: vi.fn(),
  query: null as unknown,
  statisticQuery: null as unknown,
  update: vi.fn(),
  updateStatistics: vi.fn(),
  publish: vi.fn(),
  importBlock: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ id: "form-1" }),
}));

vi.mock("../../src/api/dynamicFormApi", () => ({
  buildDynamicFormSchemaPayload: () => ({ sections: [], fields: [], blocks: [] }),
  useGetDynamicFormQuery: () => mocks.query,
  useUpdateDynamicFormMutation: () => [mocks.update, { isLoading: false }],
  usePublishDynamicFormMutation: () => [mocks.publish, { isLoading: false }],
  useImportDynamicExcelBlockMutation: () => [mocks.importBlock, { isLoading: false }],
}));

vi.mock("../../src/api/statConfigApi", () => ({
  useGetP8DynamicFormStatisticsQuery: () => mocks.statisticQuery,
  usePutP8DynamicFormStatisticsMutation: () => [
    mocks.updateStatistics,
    { isLoading: false },
  ],
}));
vi.mock("../../src/features/dynamicForms/builder/DynamicFormEditor", () => ({
  default: (props: unknown) => {
    mocks.editorProps = props;
    return <div data-testid="dynamic-form-editor" />;
  },
}));

import DynamicFormEditPage from "../../src/pages/dynamicForms/DynamicFormEditPage";

function actionCapabilities(
  overrides: Partial<DynamicFormActionCapabilities> = {},
): DynamicFormActionCapabilities {
  return {
    canRead: true,
    canUpdate: true,
    canDelete: true,
    canPublish: true,
    canCreateVersion: false,
    canViewHistory: true,
    canClone: true,
    canImport: true,
    canUpdateStatistics: true,
    ...overrides,
  };
}

function detail(overrides: Partial<DynamicFormDetail> = {}): DynamicFormDetail {
  return {
    id: "form-1",
    code: "DF-001",
    name: "Biểu mẫu an toàn",
    description: null,
    tagCodes: [],
    schemaVersion: 1,
    versionNo: 1,
    familyId: "family-1",
    previousVersionId: null,
    clonedFromVersionId: null,
    lineageStatus: "ROOT",
    revision: 7,
    isActive: true,
    isPublished: false,
    createdByUserId: "owner-1",
    createdByUsername: "owner",
    createdAtUtc: "2026-07-22T00:00:00Z",
    updatedAtUtc: "2026-07-22T00:00:00Z",
    publishedAtUtc: null,
    schema: { sections: [], fields: [], blocks: [] },
    sectionsJson: '[{"id":"main","title":"Phần chính","order":0}]',
    fieldsJson: "[]",
    excelBlockJson: null,
    blocksJson: null,
    canMutate: true,
    canClone: true,
    canViewByCloneGrant: false,
    publishedSchemaHash: null,
    publishedSchemaSnapshotJson: null,
    actions: actionCapabilities(),
    ...overrides,
  };
}

function statisticReadback(overrides: Record<string, unknown> = {}) {
  return {
    ownerKind: "DYNAMIC_FORM",
    ownerId: "form-1",
    configId: "form-stat-config-1",
    versionId: "form-stat-version-1",
    versionNo: 1,
    revision: 4,
    status: "DRAFT",
    configHash: "a".repeat(64),
    dependencyPins: [],
    permissions: {
      canReadConfig: true,
      canManageDraft: true,
      canLockVersion: false,
      canViewResult: false,
      canReadDiagnostics: false,
    },
    fields: [],
    tableConfig: [],
    fieldSectionHash: "b".repeat(64),
    tableSectionHash: "c".repeat(64),
    versions: [],
    ...overrides,
  };
}
const submitPayload: DynamicFormEditorSubmit = {
  code: "DF-001",
  name: "Biểu mẫu an toàn",
  description: null,
  tagCodes: [],
  schemaVersion: 1,
  isActive: true,
  sectionsJson: '[{"id":"main","title":"Phần chính","order":0}]',
  fieldsJson: JSON.stringify([
    { id: "notes", sectionId: "main", type: "shortText", isStatistic: false },
  ]),
  excelBlockJson: null,
  blocksJson: null,
};

function editorProps() {
  return mocks.editorProps as EditorProps;
}

beforeEach(() => {
  const initial = detail();
  mocks.editorProps = null;
  mocks.query = {
    data: initial,
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
  };
  mocks.statisticQuery = {
    data: statisticReadback(),
    isError: false,
    isFetching: false,
    refetch: mocks.statisticRefetch,
  };
  mocks.statisticRefetch.mockResolvedValue({ data: statisticReadback() });
  mocks.refetch.mockResolvedValue({ data: initial });
  mocks.update.mockImplementation(() => ({
    unwrap: () => Promise.resolve(detail({ revision: 10 })),
  }));
  mocks.updateStatistics.mockImplementation(() => ({
    unwrap: () => Promise.resolve(statisticReadback({ revision: 5, configHash: "d".repeat(64) })),
  }));
  mocks.publish.mockImplementation(() => ({
    unwrap: () => Promise.resolve(detail({ revision: 9, isPublished: true })),
  }));
  mocks.importBlock.mockImplementation(() => ({
    unwrap: () => Promise.resolve(detail({ revision: 8 })),
  }));
});

describe("DynamicFormEditPage safety", () => {
  it("turns an unauthorized deep link into a read-only view", () => {
    mocks.query = {
      ...mocks.query as object,
      data: detail({
        canMutate: false,
        canClone: true,
        actions: actionCapabilities({
          canUpdate: false,
          canDelete: false,
          canPublish: false,
          canCreateVersion: false,
          canViewHistory: false,
          canImport: false,
          canUpdateStatistics: false,
        }),
      }),
    };

    render(<DynamicFormEditPage />);

    expect(screen.getByText(/chỉ có quyền xem biểu mẫu này/i)).toBeInTheDocument();
    expect(editorProps()).toMatchObject({
      mode: "view",
      allowStatisticConfigEdit: false,
      onSave: undefined,
      onPublish: undefined,
      onImportDynamicExcelBlock: undefined,
    });
  });

  it("carries the latest revision through import, publish and draft update requests", async () => {
    render(<DynamicFormEditPage />);
    const props = editorProps();

    await act(async () => {
      await props.onImportDynamicExcelBlock?.("excel-1", "main");
    });
    expect(mocks.importBlock).toHaveBeenCalledWith({
      id: "form-1",
      body: {
        dynamicExcelTemplateId: "excel-1",
        sectionId: "main",
        expectedRevision: 7,
      },
    });

    await act(async () => {
      await props.onPublish?.();
    });
    expect(mocks.publish).toHaveBeenCalledWith({ id: "form-1", expectedRevision: 8 });

    await act(async () => {
      await props.onSave?.(submitPayload);
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "form-1",
        body: expect.objectContaining({ expectedRevision: 9 }),
      }),
    );
  });

  it("sends revision when an authorized owner updates published statistics", async () => {
    mocks.query = {
      ...mocks.query as object,
      data: detail({
        revision: 12,
        isPublished: true,
        canMutate: true,
        actions: actionCapabilities({
          canUpdate: false,
          canDelete: false,
          canPublish: false,
          canCreateVersion: true,
          canImport: false,
        }),
      }),
    };

    render(<DynamicFormEditPage />);
    expect(editorProps()).toMatchObject({ mode: "edit", allowStatisticConfigEdit: true });

    await act(async () => {
      await editorProps().onSave?.(submitPayload);
    });

    expect(mocks.updateStatistics).toHaveBeenCalledWith({
      id: "form-1",
      body: {
        commandId: expect.stringMatching(/^p8-ui-form-.*-fields$/),
        expectedRevision: 4,
        expectedConfigHash: "a".repeat(64),
        payload: {
          fields: [
            {
              fieldId: "notes",
              isStatistic: false,
              statistic: null,
              statisticLabelCodes: [],
            },
          ],
        },
      },
    });
    expect(mocks.statisticRefetch).toHaveBeenCalled();
  });
});
