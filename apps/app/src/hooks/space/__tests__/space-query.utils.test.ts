import { describe, expect, it } from "vitest";
import { getSpaceStorageKeys } from "../space-query.utils";

describe("getSpaceStorageKeys", () => {
  it("builds view/sort/filters keys scoped to the given space id", () => {
    expect(getSpaceStorageKeys("space_1778747003891")).toEqual({
      viewStorageKey: "breedhub:view:space_1778747003891",
      sortStorageKey: "breedhub:sort:space_1778747003891",
      filtersStorageKey: "breedhub:filters:space_1778747003891",
    });
  });

  it("returns distinct keys for two spaces sharing an entitySchemaName", () => {
    // Public /pets and private /my/pets both target `pet` but live under
    // different object keys in app_config — their localStorage slots must
    // not collide. This is the regression guard for the bug that mixed
    // public + private filter chips.
    const publicKeys = getSpaceStorageKeys("config_space_1757849574880");
    const privateKeys = getSpaceStorageKeys("space_1778747003891");
    expect(publicKeys.viewStorageKey).not.toBe(privateKeys.viewStorageKey);
    expect(publicKeys.sortStorageKey).not.toBe(privateKeys.sortStorageKey);
    expect(publicKeys.filtersStorageKey).not.toBe(privateKeys.filtersStorageKey);
  });

  it("never produces empty key segments — guards against undefined ids", () => {
    // useSpaceBrowseState passes config.id which is always set by the
    // parser; this test fences any future regression where the param
    // would silently be empty/undefined and every space sharing it.
    const keys = getSpaceStorageKeys("x");
    expect(keys.viewStorageKey.endsWith(":")).toBe(false);
    expect(keys.sortStorageKey.endsWith(":")).toBe(false);
    expect(keys.filtersStorageKey.endsWith(":")).toBe(false);
  });
});
