import type { Anchor, HeaderSpec } from "./types";

export function getAnchors(spec: HeaderSpec): { topAnchor: Anchor; leftAnchor: Anchor } {
  if (spec.kind === "TOP") return { topAnchor: { r0: 0, c0: 0 }, leftAnchor: { r0: 0, c0: 0 } };
  if (spec.kind === "LEFT") return { topAnchor: { r0: 0, c0: 0 }, leftAnchor: { r0: 0, c0: 0 } };

  // MATRIX: data start row = topRows (0-index) => Excel row = topRows + 1
  return {
    topAnchor: { r0: 0, c0: spec.leftCols },
    leftAnchor: { r0: spec.topRows, c0: 0 },
  };
}
