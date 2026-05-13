import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function manualChunks(id: string) {
  const normalizedId = id.replace(/\\/g, "/");
  if (!normalizedId.includes("/node_modules/")) return undefined;
  const fileName = normalizedId.split("/").pop() ?? "";

  // Keep React and React-based UI packages in Rollup's natural graph. Forcing
  // React 19 or React wrappers into separate manual chunks can create circular
  // production imports and fail while exporting React.Activity.
  if (normalizedId.includes("/react/") || fileName.startsWith("react_")) return undefined;
  if (normalizedId.includes("/react-dom/") || fileName.startsWith("react-dom_")) return undefined;
  if (normalizedId.includes("/react-router/") || normalizedId.includes("/react-router-dom/")) return undefined;
  if (normalizedId.includes("/scheduler/") || fileName.includes("scheduler")) return undefined;
  if (normalizedId.includes("/@mui/") || normalizedId.includes("/@emotion/")) return undefined;
  if (normalizedId.includes("/@mantine/") || normalizedId.includes("/@tabler/")) return undefined;
  if (normalizedId.includes("/recharts/") || fileName.includes("recharts")) return undefined;
  if (normalizedId.includes("/reactflow/") || normalizedId.includes("/@reactflow/")) return undefined;
  if (normalizedId.includes("/@fortune-sheet/")) return undefined;
  if (normalizedId.includes("/react-redux/") || fileName.includes("react-redux")) return undefined;
  if (normalizedId.includes("/@reduxjs/") || normalizedId.includes("/redux/")) return undefined;
  if (normalizedId.includes("/axios/")) return undefined;

  if (normalizedId.includes("/d3-") || fileName.startsWith("d3-")) return "vendor-charts";
  if (
    normalizedId.includes("/exceljs/") ||
    normalizedId.includes("/jszip/") ||
    normalizedId.includes("/fast-csv/") ||
    normalizedId.includes("/archiver/") ||
    normalizedId.includes("/file-saver/") ||
    fileName.includes("exceljs") ||
    fileName.includes("file-saver")
  ) {
    return "vendor-excel-export";
  }
  if (
    normalizedId.includes("/tus-js-client/") ||
    normalizedId.includes("/js-base64/") ||
    fileName.includes("tus-js-client")
  ) {
    return "vendor-upload";
  }
  if (normalizedId.includes("/dayjs/") || normalizedId.includes("/date-fns/") || fileName.includes("dayjs")) {
    return undefined;
  }
  if (normalizedId.includes("/lodash/") || normalizedId.includes("/lodash-es/")) return "vendor-lodash";

  return undefined;
}

export default defineConfig({
  plugins: [react()],
  build: {
    // Fortune Sheet ships its core as one large ESM bundle. We isolate it behind lazy routes
    // and keep the warning threshold aligned with that unavoidable lazy vendor chunk.
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks,
        onlyExplicitManualChunks: true,
      },
    },
  },
});
