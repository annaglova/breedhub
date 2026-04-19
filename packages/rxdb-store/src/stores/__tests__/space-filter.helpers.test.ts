import { describe, expect, it } from "vitest";
import {
  buildHybridSearchPlan,
  buildRxdbCountSelector,
  prepareFiltersWithDefaults,
} from "../space-filter.helpers";

describe("space-filter.helpers", () => {
  it("merges default filters and injects eq field configs for missing default keys", () => {
    expect(
      prepareFiltersWithDefaults(
        { country_id: "ua" },
        { type_id: "kennel" },
        { country_id: { fieldType: "uuid", operator: "eq" } },
      ),
    ).toEqual({
      filters: {
        type_id: "kennel",
        country_id: "ua",
      },
      fieldConfigs: {
        country_id: { fieldType: "uuid", operator: "eq" },
        type_id: { fieldType: "uuid", operator: "eq" },
      },
    });
  });

  it("preserves explicit filter overrides and existing field configs", () => {
    expect(
      prepareFiltersWithDefaults(
        { type_id: "federation" },
        { type_id: "kennel" },
        { type_id: { fieldType: "string", operator: "contains" } },
      ),
    ).toEqual({
      filters: { type_id: "federation" },
      fieldConfigs: {
        type_id: { fieldType: "string", operator: "contains" },
      },
    });
  });

  it("does not mutate input objects", () => {
    const filters = { country_id: "ua" };
    const defaultFilters = { type_id: "kennel" };
    const baseFieldConfigs = {
      country_id: { fieldType: "uuid", operator: "eq" },
    };

    const result = prepareFiltersWithDefaults(
      filters,
      defaultFilters,
      baseFieldConfigs,
    );

    expect(result.filters).not.toBe(filters);
    expect(result.fieldConfigs).not.toBe(baseFieldConfigs);
    expect(filters).toEqual({ country_id: "ua" });
    expect(defaultFilters).toEqual({ type_id: "kennel" });
    expect(baseFieldConfigs).toEqual({
      country_id: { fieldType: "uuid", operator: "eq" },
    });
  });

  it("builds count selector with exact-match string filters by default", () => {
    expect(
      buildRxdbCountSelector(
        { name: "Alpha" },
        { name: { fieldType: "string", operator: "eq" } },
      ),
    ).toEqual({
      _deleted: false,
      name: "Alpha",
    });
  });

  it("builds count selector with search-style string filters when preferred", () => {
    expect(
      buildRxdbCountSelector(
        { name: "Alpha" },
        { name: { fieldType: "string", operator: "eq" } },
        { preferStringSearchOperator: true },
      ),
    ).toEqual({
      _deleted: false,
      name: { $regex: "Alpha", $options: "i" },
    });
  });

  it("builds hybrid search plan for OR search fields sharing the same value", () => {
    expect(
      buildHybridSearchPlan(
        {
          father_name: "John",
          mother_name: "John",
          status: "active",
        },
        {
          father_name: { fieldType: "string", operator: "contains" },
          mother_name: { fieldType: "string", operator: "contains" },
          status: { fieldType: "string", operator: "eq" },
        },
        10,
      ),
    ).toEqual({
      searchValue: "John",
      orSearchFields: ["father_name", "mother_name"],
      isOrSearch: true,
      otherFilters: {
        status: "active",
      },
      startsWithLimit: 7,
    });
  });

  it("keeps non-grouped search filters in hybrid plan otherFilters", () => {
    expect(
      buildHybridSearchPlan(
        {
          title: "Alpha",
          subtitle: "Beta",
          country_id: "ua",
        },
        {
          title: { fieldType: "string", operator: "contains" },
          subtitle: { fieldType: "string", operator: "contains" },
          country_id: { fieldType: "uuid", operator: "eq" },
        },
        9,
      ),
    ).toEqual({
      searchValue: "Alpha",
      orSearchFields: ["title"],
      isOrSearch: false,
      otherFilters: {
        subtitle: "Beta",
        country_id: "ua",
      },
      startsWithLimit: 7,
    });
  });

  it("returns null when there are no search-operator string filters", () => {
    expect(
      buildHybridSearchPlan(
        { status: "active", country_id: "ua" },
        {
          status: { fieldType: "string", operator: "eq" },
          country_id: { fieldType: "uuid", operator: "eq" },
        },
        10,
      ),
    ).toBeNull();
  });
});
