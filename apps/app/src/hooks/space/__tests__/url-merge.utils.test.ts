import { describe, expect, it } from "vitest";

import {
  mergeDefaultSortParam,
  mergeDefaultViewParam,
  mergeFilterParamsIntoLiveSearch,
} from "../url-merge.utils";

describe("mergeDefaultViewParam", () => {
  it("sets view when currentSearch is empty and a mode is set", () => {
    expect(mergeDefaultViewParam("", "list")?.toString()).toBe("view=list");
  });

  it("returns null when currentSearch already has view", () => {
    expect(mergeDefaultViewParam("?view=grid", "list")).toBeNull();
  });

  it("returns null when mode is not set", () => {
    expect(mergeDefaultViewParam("", null)).toBeNull();
  });

  it("preserves other params while adding view", () => {
    expect(mergeDefaultViewParam("?pet_type_id=cat", "list")?.toString()).toBe(
      "pet_type_id=cat&view=list",
    );
  });
});

describe("mergeDefaultSortParam", () => {
  it("sets sort when currentSearch is empty and a sort id is set", () => {
    expect(mergeDefaultSortParam("", "rating")?.toString()).toBe("sort=rating");
  });

  it("returns null when currentSearch already has sort", () => {
    expect(mergeDefaultSortParam("?sort=name", "rating")).toBeNull();
  });

  it("returns null when sort id is not set", () => {
    expect(mergeDefaultSortParam("", undefined)).toBeNull();
  });

  it("preserves other params while adding sort", () => {
    expect(
      mergeDefaultSortParam("?pet_type_id=cat", "rating")?.toString(),
    ).toBe("pet_type_id=cat&sort=rating");
  });
});

describe("mergeFilterParamsIntoLiveSearch", () => {
  it("adds filter params when currentSearch is empty", () => {
    const result = mergeFilterParamsIntoLiveSearch(
      "",
      new URLSearchParams("pet_type_id=cat"),
    );

    expect(result.toString()).toBe("pet_type_id=cat");
  });

  it("preserves live view and sort while adding filter params", () => {
    const result = mergeFilterParamsIntoLiveSearch(
      "?view=list&sort=rating",
      new URLSearchParams("pet_type_id=cat"),
    );

    expect(result.toString()).toBe("view=list&sort=rating&pet_type_id=cat");
  });

  it("lets filter params override existing live keys", () => {
    const result = mergeFilterParamsIntoLiveSearch(
      "?pet_type_id=dog",
      new URLSearchParams("pet_type_id=cat"),
    );

    expect(result.toString()).toBe("pet_type_id=cat");
  });
});
