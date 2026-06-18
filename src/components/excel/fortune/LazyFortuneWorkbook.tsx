import React from "react";
import "@fortune-sheet/react/dist/index.css";

const FortuneWorkbook = React.lazy(async () => {
  const module = await import("@fortune-sheet/react");
  return { default: module.Workbook };
});

type LazyFortuneWorkbookProps = Record<string, any> & {
  fallback?: React.ReactNode;
};

const LazyFortuneWorkbook = React.forwardRef<any, LazyFortuneWorkbookProps>(function LazyFortuneWorkbook({
  fallback = null,
  ...props
}, ref) {
  const WorkbookComponent = FortuneWorkbook as React.ComponentType<any>;

  return (
    <React.Suspense fallback={fallback}>
      <WorkbookComponent ref={ref} {...props} />
    </React.Suspense>
  );
});

export default LazyFortuneWorkbook;
