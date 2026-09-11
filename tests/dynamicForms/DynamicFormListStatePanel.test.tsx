import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DynamicFormListStatePanel } from "../../src/features/dynamicForms/components/DynamicFormListStatePanel";

describe("DynamicFormListStatePanel", () => {
  it("announces the loading state", () => {
    render(<DynamicFormListStatePanel state="loading" />);

    expect(screen.getByRole("status", { name: "Đang tải danh sách biểu mẫu" })).toBeInTheDocument();
    expect(screen.getByText("Đang tải danh sách biểu mẫu...")).toBeInTheDocument();
  });

  it("renders a distinct empty state instead of an empty table", () => {
    render(<DynamicFormListStatePanel state="empty" />);

    expect(screen.getByRole("status")).toHaveTextContent("Chưa có biểu mẫu phù hợp");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps forbidden separate from a generic load error", () => {
    render(<DynamicFormListStatePanel state="forbidden" />);

    expect(screen.getByRole("alert")).toHaveTextContent("không có quyền xem danh sách biểu mẫu");
  });

  it("offers an explicit retry for recoverable errors", () => {
    const onRetry = vi.fn();
    render(<DynamicFormListStatePanel state="error" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Không tải được danh sách biểu mẫu");
  });
});
