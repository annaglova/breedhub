import { describe, expect, it } from "vitest";
import { generateSchemaForEntity } from "../schema-builder";

describe("generateSchemaForEntity", () => {
  it("returns null when spaceConfig is missing", () => {
    expect(generateSchemaForEntity("breed", null as any)).toBeNull();
  });

  it("emits string type and adds to required for required fields", () => {
    const schema = generateSchemaForEntity("note", {
      fields: {
        text: { fieldType: "text", required: true },
      },
    });

    expect(schema?.properties.text).toEqual({ type: "string" });
    expect(schema?.required).toContain("text");
  });

  it("emits [string, null] for nullable uuid fields", () => {
    const schema = generateSchemaForEntity("note", {
      fields: {
        entity_id: { fieldType: "uuid", required: false },
      },
    });

    expect(schema?.properties.entity_id.type).toEqual(["string", "null"]);
    expect(schema?.properties.entity_id.maxLength).toBe(36);
    expect(schema?.required).not.toContain("entity_id");
  });

  it("emits [boolean, null] for nullable boolean fields", () => {
    const schema = generateSchemaForEntity("pet", {
      fields: {
        is_verified: { fieldType: "boolean", required: false },
      },
    });

    expect(schema?.properties.is_verified.type).toEqual(["boolean", "null"]);
  });

  it("emits [number, null] for nullable number fields", () => {
    const schema = generateSchemaForEntity("pet", {
      fields: {
        rating: { fieldType: "number", required: false },
      },
    });

    expect(schema?.properties.rating.type).toEqual(["number", "null"]);
  });

  it("emits single string type for primary key (never null)", () => {
    const schema = generateSchemaForEntity("note", {
      fields: {
        id: { fieldType: "uuid", isPrimaryKey: true },
      },
    });

    expect(schema?.properties.id.type).toBe("string");
    expect(schema?.required).toContain("id");
  });

  it("preserves maxLength on string field that is nullable", () => {
    const schema = generateSchemaForEntity("breed", {
      fields: {
        slug: { fieldType: "string", required: false, maxLength: 250 },
      },
    });

    expect(schema?.properties.slug.type).toEqual(["string", "null"]);
    expect(schema?.properties.slug.maxLength).toBe(250);
  });

  it("treats json fields as untyped (no nullable wrapping)", () => {
    const schema = generateSchemaForEntity("post", {
      fields: {
        metadata: { fieldType: "json", required: false },
      },
    });

    expect(schema?.properties.metadata).toEqual({});
  });

  it("ensures id, audit fields, _deleted, cachedAt exist by default", () => {
    const schema = generateSchemaForEntity("note", { fields: {} });

    expect(schema?.properties.id).toEqual({ type: "string", maxLength: 36 });
    expect(schema?.properties.created_at).toBeDefined();
    expect(schema?.properties.updated_at).toBeDefined();
    expect(schema?.properties.created_by).toBeDefined();
    expect(schema?.properties.updated_by).toBeDefined();
    expect(schema?.properties._deleted).toEqual({ type: "boolean" });
    expect(schema?.properties.cachedAt.type).toBe("number");
    expect(schema?.required).toEqual(["id"]);
  });

  it("does not wrap fields already declared via system defaults", () => {
    const schema = generateSchemaForEntity("note", {
      fields: {
        id: { fieldType: "uuid", isPrimaryKey: true },
      },
    });

    expect(schema?.properties.id.type).toBe("string");
    expect(schema?.required).toContain("id");
  });
});
