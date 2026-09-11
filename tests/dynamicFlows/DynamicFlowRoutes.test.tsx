import { render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryRouter,
  matchRoutes,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { describe, expect, it } from "vitest";

import { appRoutes } from "../../src/routes/appRoutes";
import {
  dynamicFlowVersionPath,
  LegacyDynamicFlowsRedirect,
} from "../../src/routes/dynamicFlowRoutes";

function LocationProbe() {
  const location = useLocation();
  return (
    <output aria-label="current-location">
      {location.pathname}
      {location.search}
      {location.hash}
    </output>
  );
}

describe("dynamic Flow canonical routes", () => {
  it("redirects the legacy route once while preserving query, hash, and deep-link suffix", async () => {
    const router = createMemoryRouter(
      [
        { path: "/dynamic-flows/*", element: <LegacyDynamicFlowsRedirect /> },
        { path: "/design/flows/*", element: <LocationProbe /> },
      ],
      {
        initialEntries: [
          "/dynamic-flows/family%201/versions/version%202/topology?query=quy%20trinh&page=3#node-4",
        ],
      },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        "/design/flows/family%201/versions/version%202/topology",
      );
    });
    expect(router.state.location.search).toBe("?query=quy%20trinh&page=3");
    expect(router.state.location.hash).toBe("#node-4");
    expect(screen.getByLabelText("current-location")).toHaveTextContent(
      "/design/flows/family%201/versions/version%202/topology?query=quy%20trinh&page=3#node-4",
    );
  });

  it("matches list and exact family/version/tab identities in the application route tree", () => {
    const listMatches = matchRoutes(appRoutes, "/design/flows?query=FLOW");
    const workspaceMatches = matchRoutes(
      appRoutes,
      "/design/flows/family-a/versions/version-2/topology",
    );

    expect(listMatches?.some((match) => match.route.path === "design/flows")).toBe(true);
    expect(workspaceMatches?.some((match) => match.route.path === "design/flows")).toBe(true);
    expect(workspaceMatches?.at(-1)?.route.path).toBe(
      ":familyId/versions/:versionId/:tab?",
    );
    expect(workspaceMatches?.at(-1)?.params).toMatchObject({
      familyId: "family-a",
      versionId: "version-2",
      tab: "topology",
    });
  });

  it("builds an encoded canonical version URL", () => {
    expect(dynamicFlowVersionPath("family / a", "version / 2", "validation")).toBe(
      "/design/flows/family%20%2F%20a/versions/version%20%2F%202/validation",
    );
  });
});
