import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, it, vi } from "vitest";

const { baseQueryMock } = vi.hoisted(() => ({
  baseQueryMock: vi.fn(),
}));

vi.mock("../../src/api/base/axiosBaseQuery", () => ({
  axiosBaseQuery: () => (request: unknown) => baseQueryMock(request),
}));

import { baseApi } from "../../src/api/base/baseApi";
import { dynamicFormApi } from "../../src/api/dynamicFormApi";
import { ApiErrorCode } from "../../src/constants/errorCodes";
import { normalizeApiError } from "../../src/utils/apiError";

function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
}

afterEach(() => {
  baseQueryMock.mockReset();
});

describe("dynamic form rejected mutation invalidation safety", () => {
  it("catalogs active default-wrap reuse collisions as a stable 409", () => {
    expect(
      normalizeApiError({
        status: 409,
        errorCode: ApiErrorCode.DynamicFormWrapReuseConflict,
        message: "backend fallback",
      }),
    ).toMatchObject({
      status: 409,
      errorCode: ApiErrorCode.DynamicFormWrapReuseConflict,
      message:
        "Không thể kích hoạt bản nháp bọc Excel này vì đã có một bản nháp đang hoạt động.",
    });
  });

  it("does not invalidate/refetch the subscribed detail after editor mutations reject with 409", async () => {
    baseQueryMock.mockImplementation(async (request: { method?: string; url: string }) => {
      if ((request.method ?? "GET") === "GET") {
        return {
          data: {
            id: "form-1",
            familyId: "family-1",
            name: "Bản đang sửa",
            revision: 7,
          },
        };
      }
      return {
        error: {
          status: 409,
          errorCode: "DYNAMIC_FORM_REVISION_CONFLICT",
          message: "Biểu mẫu đã thay đổi ở nơi khác.",
        },
      };
    });

    const store = makeStore();
    const detailSubscription = store.dispatch(
      dynamicFormApi.endpoints.getDynamicForm.initiate({ id: "form-1" }),
    );
    await detailSubscription.unwrap();

    const rejectedMutations = [
      store.dispatch(
        dynamicFormApi.endpoints.updateDynamicForm.initiate({
          id: "form-1",
          body: { name: "Bản local chưa lưu", expectedRevision: 7 },
        }),
      ),
      store.dispatch(
        dynamicFormApi.endpoints.publishDynamicForm.initiate({
          id: "form-1",
          expectedRevision: 7,
        }),
      ),
      store.dispatch(
        dynamicFormApi.endpoints.importDynamicExcelBlock.initiate({
          id: "form-1",
          body: { dynamicExcelTemplateId: "excel-1", expectedRevision: 7 },
        }),
      ),
    ];

    for (const mutation of rejectedMutations) {
      await expect(mutation.unwrap()).rejects.toMatchObject({
        status: 409,
        errorCode: "DYNAMIC_FORM_REVISION_CONFLICT",
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    const detailGets = baseQueryMock.mock.calls.filter(([request]) => {
      const apiRequest = request as { method?: string; url?: string };
      return (
        (apiRequest.method ?? "GET") === "GET" &&
        apiRequest.url === "/dynamic-forms/form-1"
      );
    });
    expect(detailGets).toHaveLength(1);
    expect(
      dynamicFormApi.endpoints.getDynamicForm.select({ id: "form-1" })(
        store.getState(),
      ).data,
    ).toMatchObject({ name: "Bản đang sửa", revision: 7 });

    detailSubscription.unsubscribe();
  });
});
