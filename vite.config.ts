import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function manualChunks(id: string) {
  const normalizedId = id.replace(/\\/g, "/");
  if (!normalizedId.includes("/node_modules/")) return undefined;
  const fileName = normalizedId.split("/").pop() ?? "";

  if (normalizedId.includes("/@fortune-sheet/") || fileName.startsWith("@fortune-sheet_")) {
    return "vendor-fortune-sheet";
  }
  if (
    normalizedId.includes("/reactflow/") ||
    normalizedId.includes("/@reactflow/") ||
    normalizedId.includes("/zustand/") ||
    fileName.includes("reactflow") ||
    fileName.includes("@reactflow") ||
    fileName.includes("zustand")
  ) {
    return "vendor-mindmap";
  }
  if (
    normalizedId.includes("/recharts/") ||
    normalizedId.includes("/d3-") ||
    fileName.includes("recharts") ||
    fileName.startsWith("d3-")
  ) {
    return "vendor-charts";
  }
  if (
    normalizedId.includes("/@mantine/") ||
    normalizedId.includes("/@tabler/") ||
    fileName.includes("@mantine") ||
    fileName.includes("@tabler")
  ) {
    return "vendor-mantine";
  }
  if (
    normalizedId.includes("/@mui/") ||
    normalizedId.includes("/@emotion/") ||
    normalizedId.includes("/@floating-ui/") ||
    normalizedId.includes("/@popperjs/") ||
    normalizedId.includes("/@base-ui/") ||
    fileName.includes("@mui") ||
    fileName.includes("@emotion")
  ) {
    return "vendor-mui";
  }
  if (
    normalizedId.includes("/react/") ||
    normalizedId.includes("/react-dom/") ||
    normalizedId.includes("/react-router/") ||
    normalizedId.includes("/react-router-dom/") ||
    normalizedId.includes("/scheduler/") ||
    fileName.startsWith("react") ||
    fileName.includes("react-router") ||
    fileName.includes("scheduler")
  ) {
    return "vendor-react";
  }
  if (
    normalizedId.includes("/@reduxjs/") ||
    normalizedId.includes("/react-redux/") ||
    normalizedId.includes("/redux/") ||
    normalizedId.includes("/axios/") ||
    fileName.includes("@reduxjs") ||
    fileName.includes("react-redux") ||
    fileName.includes("axios")
  ) {
    return "vendor-data";
  }
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
    return "vendor-date";
  }
  if (normalizedId.includes("/lodash/") || normalizedId.includes("/lodash-es/")) return "vendor-lodash";

  return "vendor-misc";
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
      },
    },
  },
});
