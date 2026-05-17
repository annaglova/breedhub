import { describe, expect, it } from "vitest";

import { computeSpaceBasePath } from "../space-base-path";

describe("computeSpaceBasePath", () => {
  it("returns the workspace-mounted space base for an entity path", () => {
    expect(computeSpaceBasePath("/my/pets/test-pet", "pets")).toBe("/my/pets");
  });

  it("returns the workspace-mounted space base when the pathname is already the base", () => {
    expect(computeSpaceBasePath("/my/pets", "pets")).toBe("/my/pets");
  });

  it("returns the root-mounted space base for an entity path", () => {
    expect(computeSpaceBasePath("/pets/foo", "pets")).toBe("/pets");
  });

  it("returns the root-mounted space base when the pathname is already the base", () => {
    expect(computeSpaceBasePath("/pets", "pets")).toBe("/pets");
  });

  it("returns undefined when slug is missing", () => {
    expect(computeSpaceBasePath("/my/pets/test-pet", undefined)).toBeUndefined();
  });

  it("returns undefined when the slug is not present in the pathname", () => {
    expect(computeSpaceBasePath("/my/notes/123", "pets")).toBeUndefined();
  });

  it("requires the slug to end on a path segment boundary", () => {
    expect(computeSpaceBasePath("/my/petstore/foo", "pets")).toBeUndefined();
  });

  it("requires the next character after the slug to be a slash or end of string", () => {
    expect(computeSpaceBasePath("/my/petsfoo", "pets")).toBeUndefined();
  });
});
