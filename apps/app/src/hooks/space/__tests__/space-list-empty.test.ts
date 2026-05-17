import { describe, expect, it } from "vitest";

import { isListEmpty } from "../space-list-empty";

describe("isListEmpty", () => {
  it("returns false for the initial mount defaults", () => {
    expect(
      isListEmpty({
        isInitialLoad: true,
        isLoading: true,
        entitiesCount: 0,
      }),
    ).toBe(false);
  });

  it("returns false while loading", () => {
    expect(
      isListEmpty({
        isInitialLoad: false,
        isLoading: true,
        entitiesCount: 0,
      }),
    ).toBe(false);
  });

  it("returns false before the first fetch resolves", () => {
    expect(
      isListEmpty({
        isInitialLoad: true,
        isLoading: false,
        entitiesCount: 0,
      }),
    ).toBe(false);
  });

  it("returns true when the settled list is empty", () => {
    expect(
      isListEmpty({
        isInitialLoad: false,
        isLoading: false,
        entitiesCount: 0,
      }),
    ).toBe(true);
  });

  it("returns false when settled data is present", () => {
    expect(
      isListEmpty({
        isInitialLoad: false,
        isLoading: false,
        entitiesCount: 3,
      }),
    ).toBe(false);
  });
});
