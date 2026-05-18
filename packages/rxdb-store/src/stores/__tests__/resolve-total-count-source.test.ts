import { describe, expect, it } from "vitest";
import {
  resolveTotalCountSource,
  type SpaceConfig,
} from "../space-config.helpers";

function createSpaceConfig(overrides: Partial<SpaceConfig> = {}): SpaceConfig {
  return {
    id: "pets",
    entitySchemaName: "pet",
    ...overrides,
  } as SpaceConfig;
}

describe("resolveTotalCountSource", () => {
  it("prefers the active quick-filter mode table over totalSource", () => {
    const spaceConfig = createSpaceConfig({
      totalSource: {
        table: "pet_total_source",
        parentField: "owner_id",
      },
      quickFilters: {
        component: "PetOwnerBreederFilter",
        parentIdSource: "currentContactId",
        modes: {
          owned: {
            slug: "owned",
            table: "pet_in_contact",
            parentField: "contact_id",
            entityIdField: "pet_id",
          },
        },
      },
    });

    expect(resolveTotalCountSource(spaceConfig, "owned")).toEqual({
      table: "pet_in_contact",
      parentField: "contact_id",
      parentIdSource: "currentContactId",
      parentValue: undefined,
    });
  });

  it("falls back to totalSource when there is no active scope", () => {
    const spaceConfig = createSpaceConfig({
      totalSource: {
        table: "pet_total_source",
        parentField: "owner_id",
      },
      quickFilters: {
        component: "PetOwnerBreederFilter",
        parentIdSource: "currentContactId",
        modes: {
          owned: {
            slug: "owned",
            table: "pet_in_contact",
            parentField: "contact_id",
            entityIdField: "pet_id",
          },
        },
      },
    });

    expect(resolveTotalCountSource(spaceConfig, null)).toEqual({
      table: "pet_total_source",
      parentField: "owner_id",
      parentIdSource: undefined,
      parentValue: undefined,
    });
  });

  it("falls back to totalSource when activeScope is not in quick-filter modes", () => {
    const spaceConfig = createSpaceConfig({
      totalSource: {
        table: "pet_total_source",
        parentField: "owner_id",
      },
      quickFilters: {
        component: "PetOwnerBreederFilter",
        parentIdSource: "currentContactId",
        modes: {
          owned: {
            slug: "owned",
            table: "pet_in_contact",
            parentField: "contact_id",
            entityIdField: "pet_id",
          },
        },
      },
    });

    expect(resolveTotalCountSource(spaceConfig, "bred")).toEqual({
      table: "pet_total_source",
      parentField: "owner_id",
      parentIdSource: undefined,
      parentValue: undefined,
    });
  });

  it("falls back to totalSource when quickFilters is undefined", () => {
    const spaceConfig = createSpaceConfig({
      totalSource: {
        table: "pet_total_source",
        parentField: "owner_id",
      },
    });

    expect(resolveTotalCountSource(spaceConfig, "owned")).toEqual({
      table: "pet_total_source",
      parentField: "owner_id",
      parentIdSource: undefined,
      parentValue: undefined,
    });
  });

  it("falls back to totalSource when quickFilters modes is empty", () => {
    const spaceConfig = createSpaceConfig({
      totalSource: {
        table: "pet_total_source",
        parentField: "owner_id",
      },
      quickFilters: {
        component: "PetOwnerBreederFilter",
        parentIdSource: "currentContactId",
        modes: {},
      },
    });

    expect(resolveTotalCountSource(spaceConfig, "owned")).toEqual({
      table: "pet_total_source",
      parentField: "owner_id",
      parentIdSource: undefined,
      parentValue: undefined,
    });
  });

  it("returns null when no quick-filter mode or totalSource can resolve", () => {
    expect(resolveTotalCountSource(createSpaceConfig(), "owned")).toBeNull();
  });

  it("returns null when spaceConfig is undefined", () => {
    expect(resolveTotalCountSource(undefined, "owned")).toBeNull();
  });

  it("resolves parentValue from userStore for currentContactId parent sources", () => {
    const spaceConfig = createSpaceConfig({
      totalSource: {
        table: "pet_total_source",
        parentField: "contact_id",
        parentIdSource: "currentContactId",
      },
    });

    expect(
      resolveTotalCountSource(spaceConfig, undefined, {
        currentContactId: { value: "contact-1" },
      }),
    ).toEqual({
      table: "pet_total_source",
      parentField: "contact_id",
      parentIdSource: "currentContactId",
      parentValue: "contact-1",
    });
  });

  it("leaves parentValue undefined when no parent source is configured", () => {
    const spaceConfig = createSpaceConfig({
      totalSource: {
        table: "pet_total_source",
        parentField: "contact_id",
      },
    });

    expect(
      resolveTotalCountSource(spaceConfig, undefined, {
        currentContactId: { value: "contact-1" },
      }),
    ).toEqual({
      table: "pet_total_source",
      parentField: "contact_id",
      parentIdSource: undefined,
      parentValue: undefined,
    });
  });

  it("leaves parentValue undefined when userStore is not passed", () => {
    const spaceConfig = createSpaceConfig({
      totalSource: {
        table: "pet_total_source",
        parentField: "contact_id",
        parentIdSource: "currentContactId",
      },
    });

    expect(resolveTotalCountSource(spaceConfig, undefined)).toEqual({
      table: "pet_total_source",
      parentField: "contact_id",
      parentIdSource: "currentContactId",
      parentValue: undefined,
    });
  });

  it("preserves null currentContactId values from userStore", () => {
    const spaceConfig = createSpaceConfig({
      totalSource: {
        table: "pet_total_source",
        parentField: "contact_id",
        parentIdSource: "currentContactId",
      },
    });

    expect(
      resolveTotalCountSource(spaceConfig, undefined, {
        currentContactId: { value: null },
      }),
    ).toEqual({
      table: "pet_total_source",
      parentField: "contact_id",
      parentIdSource: "currentContactId",
      parentValue: null,
    });
  });
});
