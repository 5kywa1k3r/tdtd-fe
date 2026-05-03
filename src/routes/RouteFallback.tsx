import { Box, CircularProgress } from "@mui/material";

export default function RouteFallback() {
  return (
    <Box sx={{ display: "grid", minHeight: 240, placeItems: "center" }}>
      <CircularProgress size={28} />
    </Box>
  );
}
