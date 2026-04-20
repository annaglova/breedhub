import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildEntitySchemasMap,
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
});
