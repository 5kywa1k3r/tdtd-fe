import React from "react";
import "@fortune-sheet/react/dist/index.css";

const FortuneWorkbook = React.lazy(async () => {
  const module = await import("@fortune-sheet/react");
  return { default: module.Workbook };
});

type LazyFortuneWorkbookProps = Record<string, any> & {
  fallback?: React.ReactNode;
};

export default function LazyFortuneWorkbook({
  fallback = null,
  ...props
}: LazyFortuneWorkbookProps) {
  const WorkbookComponent = FortuneWorkbook as React.ComponentType<any>;

  return (
    <React.Suspense fallback={fallback}>
      <WorkbookComponent {...props} />
    </React.Suspense>
  );
}
