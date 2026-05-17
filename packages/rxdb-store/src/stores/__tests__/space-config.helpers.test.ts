import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildEntitySchemasMap,
  findMissingRequiredFilters,
  getSpacesForEntityType,
  getSupabaseSource,
  getEntityFieldsSchema,
  parseSpaceConfigurations,
  resolveSpaceConfig,
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
    expect(parsed?.spaceConfigs.get("pets")).toMatchObject({
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
    expect(parsed?.spaceConfigs.get("pets")?.fields?.name?.originalConfigKey).toBe(
      "pet_field_name",
    );
  });

  it("keys space configurations by workspace space object key so same-entity spaces coexist", () => {
    const parsed = parseSpaceConfigurations({
      entities: {
        config_schema_pet: {
          entitySchemaName: "pet",
          fields: {},
        },
      },
      workspaces: {
        public: {
          spaces: {
            config_space_111: {
              id: "pets",
              slug: "pets",
              entitySchemaName: "pet",
            },
          },
        },
        private: {
          spaces: {
            space_222: {
              id: "pets",
              slug: "pets",
              entitySchemaName: "pet",
            },
          },
        },
      },
    });

    expect(Array.from(parsed?.spaceConfigs.keys() ?? [])).toEqual([
      "config_space_111",
      "space_222",
    ]);
    expect(parsed?.spaceConfigs.get("config_space_111")).toMatchObject({
      id: "config_space_111",
      slug: "pets",
      entitySchemaName: "pet",
    });
    expect(parsed?.spaceConfigs.get("space_222")).toMatchObject({
      id: "space_222",
      slug: "pets",
      entitySchemaName: "pet",
    });
    expect(parsed?.spaceConfigs.has("pet")).toBe(false);
    expect(parsed?.spaceConfigs.has("pets")).toBe(false);
  });

  it("uses the workspace space object key as the map key instead of space.id", () => {
    const parsed = parseSpaceConfigurations({
      entities: {
        config_schema_pet: {
          entitySchemaName: "pet",
          fields: {},
        },
      },
      workspaces: {
        main: {
          spaces: {
            config_space_111: {
              id: "pets",
              slug: "pets",
              entitySchemaName: "pet",
            },
          },
        },
      },
    });

    expect(parsed?.spaceConfigs.has("config_space_111")).toBe(true);
    expect(parsed?.spaceConfigs.has("pets")).toBe(false);
  });

  it("mirrors the map key into SpaceConfig.id", () => {
    const parsed = parseSpaceConfigurations({
      entities: {
        config_schema_breed: {
          entitySchemaName: "breed",
          fields: {},
        },
      },
      workspaces: {
        main: {
          spaces: {
            config_space_breeds: {
              id: "breeds",
              slug: "breeds",
              entitySchemaName: "breed",
            },
          },
        },
      },
    });

    const config = parsed?.spaceConfigs.get("config_space_breeds");
    expect(config?.id).toBe("config_space_breeds");
    expect(parsed?.spaceConfigs.get(config?.id ?? "")).toBe(config);
  });

  it("parses a single-space configuration keyed by its object key", () => {
    const parsed = parseSpaceConfigurations({
      entities: {
        config_schema_breed: {
          entitySchemaName: "breed",
          fields: {},
        },
      },
      workspaces: {
        main: {
          spaces: {
            config_space_breeds: {
              id: "breeds",
              slug: "breeds",
              entitySchemaName: "breed",
            },
          },
        },
      },
    });

    expect(parsed?.entityTypes).toEqual(["breed"]);
    expect(parsed?.spaceConfigs.get("config_space_breeds")).toMatchObject({
      id: "config_space_breeds",
      slug: "breeds",
      entitySchemaName: "breed",
    });
  });

  it("gets all spaces for an entity type case-insensitively", () => {
    const spaceConfigs = new Map([
      [
        "config_space_111",
        { id: "config_space_111", entitySchemaName: "pet", label: "Pets" },
      ],
      [
        "space_222",
        { id: "space_222", entitySchemaName: "PET", label: "My Pets" },
      ],
      [
        "space_breeds",
        { id: "space_breeds", entitySchemaName: "breed", label: "Breeds" },
      ],
    ]);

    expect(getSpacesForEntityType(spaceConfigs, "PeT")).toEqual([
      { id: "config_space_111", entitySchemaName: "pet", label: "Pets" },
      { id: "space_222", entitySchemaName: "PET", label: "My Pets" },
    ]);
  });

  it("returns no spaces for an unknown entity type or empty map", () => {
    const spaceConfigs = new Map([
      ["space_breeds", { id: "space_breeds", entitySchemaName: "breed" }],
    ]);

    expect(getSpacesForEntityType(spaceConfigs, "pet")).toEqual([]);
    expect(getSpacesForEntityType(new Map(), "pet")).toEqual([]);
  });

  it("resolves space config by space id with a case-insensitive fallback", () => {
    const exact = { id: "config_space_111", entitySchemaName: "pet" };
    const legacy = { id: "Pets", entitySchemaName: "pet" };
    const spaceConfigs = new Map([
      ["config_space_111", exact],
      ["Pets", legacy],
    ]);

    expect(resolveSpaceConfig(spaceConfigs, "config_space_111")).toBe(exact);
    expect(resolveSpaceConfig(spaceConfigs, "pets")).toBe(legacy);
    expect(resolveSpaceConfig(spaceConfigs, "missing")).toBeUndefined();
  });

  it("falls back to the base entity name when no VIEW source is configured", () => {
    expect(getSupabaseSource("pet")).toBe("pet");
  });

  it("returns null and warns when workspaces are missing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(parseSpaceConfigurations({ entities: {} })).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith("[SpaceStore] No workspaces found in app config");
  });

  describe("parseSpaceConfigurations isPublic propagation", () => {
    const entities = {
      config_schema_pet: {
        entitySchemaName: "pet",
        fields: {},
      },
      config_schema_breed: {
        entitySchemaName: "breed",
        fields: {},
      },
      config_schema_owner: {
        entitySchemaName: "owner",
        fields: {},
      },
      config_schema_litter: {
        entitySchemaName: "litter",
        fields: {},
      },
    };

    it("defaults to public when workspace and space isPublic are undefined", () => {
      const parsed = parseSpaceConfigurations({
        entities,
        workspaces: {
          main: {
            spaces: {
              pets: {
                entitySchemaName: "pet",
              },
            },
          },
        },
      });

      expect(parsed?.spaceConfigs.get("pets")?.isPublic).toBe(true);
    });

    it("inherits private visibility from the workspace", () => {
      const parsed = parseSpaceConfigurations({
        entities,
        workspaces: {
          my: {
            isPublic: false,
            spaces: {
              pets: {
                entitySchemaName: "pet",
              },
              breeds: {
                entitySchemaName: "breed",
              },
            },
          },
        },
      });

      expect(parsed?.spaceConfigs.get("pets")?.isPublic).toBe(false);
      expect(parsed?.spaceConfigs.get("breeds")?.isPublic).toBe(false);
    });

    it("allows a space to override a public workspace as private", () => {
      const parsed = parseSpaceConfigurations({
        entities,
        workspaces: {
          main: {
            isPublic: true,
            spaces: {
              pets: {
                entitySchemaName: "pet",
                isPublic: false,
              },
              breeds: {
                entitySchemaName: "breed",
              },
            },
          },
        },
      });

      expect(parsed?.spaceConfigs.get("pets")?.isPublic).toBe(false);
      expect(parsed?.spaceConfigs.get("breeds")?.isPublic).toBe(true);
    });

    it("allows a space to override a private workspace as public", () => {
      const parsed = parseSpaceConfigurations({
        entities,
        workspaces: {
          my: {
            isPublic: false,
            spaces: {
              pets: {
                entitySchemaName: "pet",
                isPublic: true,
              },
              breeds: {
                entitySchemaName: "breed",
              },
            },
          },
        },
      });

      expect(parsed?.spaceConfigs.get("pets")?.isPublic).toBe(true);
      expect(parsed?.spaceConfigs.get("breeds")?.isPublic).toBe(false);
    });

    it("tags spaces according to their parent workspace across mixed workspaces", () => {
      const parsed = parseSpaceConfigurations({
        entities,
        workspaces: {
          my: {
            isPublic: false,
            spaces: {
              pets: {
                entitySchemaName: "pet",
              },
              breeds: {
                entitySchemaName: "breed",
              },
            },
          },
          public: {
            spaces: {
              owners: {
                entitySchemaName: "owner",
              },
              litters: {
                entitySchemaName: "litter",
                isPublic: false,
              },
            },
          },
        },
      });

      expect(parsed?.spaceConfigs.get("pets")?.isPublic).toBe(false);
      expect(parsed?.spaceConfigs.get("breeds")?.isPublic).toBe(false);
      expect(parsed?.spaceConfigs.get("owners")?.isPublic).toBe(true);
      expect(parsed?.spaceConfigs.get("litters")?.isPublic).toBe(false);
    });
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
