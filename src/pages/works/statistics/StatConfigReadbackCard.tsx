import { Chip, Divider, Paper, Stack, Typography } from "@mui/material";

import { compactConfigHash } from "./statisticsConfigurationModel";

export type StatConfigReadbackIdentity = {
  ownerKind: string;
  ownerId: string;
  configId: string;
  versionId: string;
  versionNo: number;
  revision: number;
  status: string;
  configHash: string;
  dependencyPins: readonly string[];
};

export function StatConfigReadbackCard({
  identity,
  runtimeEligibility,
  receiptId,
}: {
  identity: StatConfigReadbackIdentity;
  runtimeEligibility?: string | null;
  receiptId?: string | null;
}) {
  return (
    <Paper
      component="section"
      variant="outlined"
      aria-label={`Readback ${identity.ownerKind}`}
      sx={{ p: 2, minWidth: 0 }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ sm: "center" }}
        >
          <Typography fontWeight={800}>{identity.ownerKind}</Typography>
          <Chip size="small" label={identity.status} color={identity.status === "LOCKED" ? "success" : "default"} />
          {runtimeEligibility ? <Chip size="small" variant="outlined" label={runtimeEligibility} /> : null}
        </Stack>
        <Divider />
        <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 0.75, md: 3 }} useFlexGap flexWrap="wrap">
          <Typography variant="body2"><strong>Version:</strong> {identity.versionNo} · {identity.versionId}</Typography>
          <Typography variant="body2"><strong>Revision:</strong> {identity.revision}</Typography>
          <Typography variant="body2" title={identity.configHash}><strong>Hash:</strong> {compactConfigHash(identity.configHash)}</Typography>
          <Typography variant="body2"><strong>Config:</strong> {identity.configId}</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
          Dependency pins: {identity.dependencyPins.length ? identity.dependencyPins.join(" · ") : "Không có"}
          {receiptId ? ` · Receipt: ${receiptId}` : ""}
        </Typography>
      </Stack>
    </Paper>
  );
}
