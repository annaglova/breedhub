import { describe, expect, it, vi } from "vitest";

vi.mock("@breedhub/rxdb-store", () => ({
  routeStore: {
    saveRoute: vi.fn(),
  },
  spaceStore: {
    getSpaceConfig: vi.fn(),
  },
}));

import { resolveEntityRouteSelection } from "../entity-navigation";

describe("resolveEntityRouteSelection", () => {
  it("preserves the passed search and hash in redirectPath", () => {
    const result = resolveEntityRouteSelection({
      pathname: "/pets/stale-slug",
      search: "?view=list&pet_type_id=cat",
      hash: "#general",
      entities: [
        {
          id: "pet-1",
          name: "Current Pet",
          slug: "current-pet",
        },
      ],
      isLoading: false,
      currentSelectedId: "pet-1",
    });

    expect(result.redirectPath).toBe(
      "current-pet?view=list&pet_type_id=cat#general",
    );
  });
});
