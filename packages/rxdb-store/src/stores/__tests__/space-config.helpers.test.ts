import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildEntitySchemasMap,
  findMissingRequiredFilters,
  getSupabaseSource,
  getEntityFieldsSchema,
  parseSpaceConfigurations,
} from "../space-config.helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("space-config.helpers", () => {
  it("builds entity schemas map keyed by entitySchemaName", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const entitySchemas = buildEntitySchemasMap({
      entities: {
        config_schema_pet: {
          entitySchemaName: "pet",
          fields: {},
        },
        config_schema_breed: {
          entitySchemaName: "breed",
          fields: {},
        },
        ignored: {
          fields: {},
        },
      },
    });

    expect(Array.from(entitySchemas.keys())).toEqual(["pet", "breed"]);
    expect(logSpy).toHaveBeenCalled();
  });

  it("normalizes entity field schema names and preserves schema-critical config", () => {
    const fields = getEntityFieldsSchema(
      {
        fields: {
          pet_field_name: {
            fieldType: "string",
            displayName: "Name",
            required: true,
            isUnique: true,
            component: "TextInput",
          },
          pet_field_breed_id: {
            fieldType: "uuid",
            displayName: "Breed",
          },
        },
      },
      "pet",
    );

    expect(fields.get("name")).toEqual({
      fieldType: "string",
      displayName: "Name",
      required: true,
      isSystem: false,
      isUnique: true,
      isPrimaryKey: false,
      maxLength: undefined,
      validation: undefined,
      permissions: undefined,
      defaultValue: undefined,
      component: "TextInput",
      originalConfigKey: "pet_field_name",
    });
    expect(fields.get("breed_id")?.originalConfigKey).toBe("pet_field_breed_id");
  });

  it("parses space configurations with normalized sort and filter field keys", () => {
    const parsed = parseSpaceConfigurations({
      entities: {
        config_schema_pet: {
          entitySchemaName: "pet",
          fields: {
            pet_field_name: {
              fieldType: "string",
              displayName: "Name",
            },
          },
          partition: {
            keyField: "breed_id",
            childFilterField: "pet_breed_id",
          },
        },
      },
      workspaces: {
        main: {
          spaces: {
            pets: {
              id: "pets",
              label: "Pets",
              entitySchemaName: "pet",
              entitySchemaModel: "show_pet",
              sort_fields: {
                pet_field_name: {
                  displayName: "Name",
                },
              },
              filter_fields: {
                pet_field_name: {
                  displayName: "Name",
                  component: "TextInput",
                  fieldType: "string",
                },
              },
              canAdd: true,
            },
          },
        },
      },
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.entityTypes).toEqual(["pet"]);
    expect(parsed?.entitySchemas.get("pet")?.partition?.keyField).toBe("breed_id");
    expect(parsed?.spaceConfigs.get("pet")).toMatchObject({
      id: "pets",
      label: "Pets",
      entitySchemaName: "pet",
      entitySchemaModel: "show_pet",
      canAdd: true,
      canEdit: false,
      canDelete: false,
      sort_fields: {
        name: {
          displayName: "Name",
        },
      },
      filter_fields: {
        name: {
          displayName: "Name",
          component: "TextInput",
          fieldType: "string",
        },
      },
    });
    expect(parsed?.spaceConfigs.get("pet")?.fields?.name?.originalConfigKey).toBe(
      "pet_field_name",
    );
  });

  it("falls back to the base entity name when no VIEW source is configured", () => {
    expect(getSupabaseSource("pet")).toBe("pet");
  });

  it("returns null and warns when workspaces are missing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(parseSpaceConfigurations({ entities: {} })).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith("[SpaceStore] No workspaces found in app config");
  });

  describe("findMissingRequiredFilters", () => {
    const fieldConfigs = {
      breed_id: { required: true },
      pet_type_id: { required: true },
      country_id: { required: false },
      sex: {},
    };

    it("returns empty array when all required filters are filled", () => {
      const filters = { breed_id: "abc", pet_type_id: "dog", country_id: "" };
      expect(findMissingRequiredFilters(filters, fieldConfigs)).toEqual([]);
    });

    it("flags required fields that are undefined or absent", () => {
      const filters = { breed_id: "abc" };
      expect(findMissingRequiredFilters(filters, fieldConfigs)).toEqual([
        "pet_type_id",
      ]);
    });

    it("flags required fields whose value is null, empty string, or empty array", () => {
      expect(
        findMissingRequiredFilters(
          { breed_id: null, pet_type_id: "" },
          fieldConfigs,
        ),
      ).toEqual(["breed_id", "pet_type_id"]);

      expect(
        findMissingRequiredFilters(
          { breed_id: [], pet_type_id: "dog" },
          fieldConfigs,
        ),
      ).toEqual(["breed_id"]);
    });

    it("ignores fields without required: true", () => {
      const filters = { breed_id: "abc", pet_type_id: "dog" };
      expect(findMissingRequiredFilters(filters, fieldConfigs)).toEqual([]);
    });

    it("treats falsy non-empty values (0, false) as filled", () => {
      const cfg = { active: { required: true }, count: { required: true } };
      expect(
        findMissingRequiredFilters({ active: false, count: 0 }, cfg),
      ).toEqual([]);
    });

    it("ignores main filter (search) inputs even when required:true", () => {
      // The breed/pet space configs mark the search field (name) as
      // required + mainFilterField=true. That flag means "validate the
      // search submit", not "block list until user types". The gate must
      // skip it so the list can load with only partition keys filled.
      const cfg = {
        name: { required: true, mainFilterField: true, fieldType: "string" },
        pet_type_id: { required: true, fieldType: "uuid" },
      };
      expect(
        findMissingRequiredFilters({ pet_type_id: "abc" }, cfg),
      ).toEqual([]);
      expect(findMissingRequiredFilters({}, cfg)).toEqual(["pet_type_id"]);
    });
  });
});
