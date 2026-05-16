import { describe, expect, it } from "vitest";
import { computeSpaceBasePath } from "../view-changer.helpers";

describe("computeSpaceBasePath", () => {
  it("keeps the prefixed workspace path up to the space slug", () => {
    expect(
      computeSpaceBasePath("/my/pets/dreamberry-harry-potter", "pets"),
    ).toBe("/my/pets");
  });

  it("keeps a root space path up to the space slug", () => {
    expect(computeSpaceBasePath("/pets/rosalago", "pets")).toBe("/pets");
  });

  it("returns the pathname unchanged when already at the space root", () => {
    expect(computeSpaceBasePath("/my/pets", "pets")).toBe("/my/pets");
  });

  it("returns the pathname unchanged when no spaceSlug is provided", () => {
    expect(computeSpaceBasePath("/my/pets/foo")).toBe("/my/pets/foo");
  });

  it("returns the pathname unchanged when the slug isn't in the pathname", () => {
    expect(computeSpaceBasePath("/my/breeds/affenpinscher", "pets")).toBe(
      "/my/breeds/affenpinscher",
    );
  });

  it("supports deeper workspace prefixes", () => {
    expect(
      computeSpaceBasePath("/org/team/pets/some-pet", "pets"),
    ).toBe("/org/team/pets");
  });

  it("matches the first occurrence of the slug segment", () => {
    // Entity slug colliding with space slug — first occurrence (the space
    // boundary) wins, so the deeper "pets" entity slug is stripped.
    expect(computeSpaceBasePath("/my/pets/pets", "pets")).toBe("/my/pets");
  });
});
