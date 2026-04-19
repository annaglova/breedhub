import { describe, expect, it } from "vitest";
import { prepareFiltersWithDefaults } from "../space-filter.helpers";

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
});
