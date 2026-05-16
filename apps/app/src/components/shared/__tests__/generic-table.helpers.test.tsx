import { beforeEach, describe, expect, it, vi } from "vitest";

const getDictionaryMock = vi.hoisted(() => vi.fn());

vi.mock("@ui/components/data-table", () => ({
  DataTableColumnHeader: () => null,
}));

vi.mock("@breedhub/rxdb-store", () => ({
  dictionaryStore: {
    getDictionary: getDictionaryMock,
  },
  extractFieldName: (fieldId: string) => {
    if (fieldId.startsWith("field_")) return fieldId.substring(6);
    const parts = fieldId.split("_field_");
    return parts.length > 1 ? parts[1] : fieldId;
  },
  getChildField: <T = unknown>(
    record: Record<string, unknown> | null | undefined,
    name: string,
  ): T | undefined => {
    if (!record) return undefined;
    const top = record[name];
    if (top !== undefined && top !== null) return top as T;
    const additional = record.additional;
    if (additional && typeof additional === "object") {
      const value = (additional as Record<string, unknown>)[name];
      if (value !== undefined && value !== null) return value as T;
    }
    return undefined;
  },
}));

import {
  buildColumns,
  enrichRecords,
  formatCellValue,
  getForeignKeyFields,
} from "../generic-table.helpers";

describe("formatCellValue", () => {
  it("formats nullish and empty values as an empty string", () => {
    expect(formatCellValue(null)).toBe("");
    expect(formatCellValue(undefined)).toBe("");
    expect(formatCellValue("")).toBe("");
  });

  it("formats booleans as Yes or No", () => {
    expect(formatCellValue(true)).toBe("Yes");
    expect(formatCellValue(false)).toBe("No");
    expect(formatCellValue(1, "boolean")).toBe("Yes");
    expect(formatCellValue(0, "boolean")).toBe("No");
  });

  it("formats date and datetime values with locale formatting", () => {
    const value = "2024-01-02T12:34:56.000Z";
    const date = new Date(value);

    expect(formatCellValue(value, "date")).toBe(date.toLocaleDateString());
    expect(formatCellValue(value, "datetime")).toBe(date.toLocaleString());
  });

  it("falls back to String(value) for bad dates, numbers, and strings", () => {
    expect(formatCellValue("not-a-date", "date")).toBe("not-a-date");
    expect(formatCellValue(42)).toBe("42");
    expect(formatCellValue("Rex")).toBe("Rex");
  });
});

describe("getForeignKeyFields", () => {
  it("returns an empty array when fields are undefined or empty", () => {
    expect(getForeignKeyFields(undefined)).toEqual([]);
    expect(getForeignKeyFields({})).toEqual([]);
  });

  it("filters foreign keys and strips field prefixes", () => {
    const fields = {
      pet_field_breed_id: {
        displayName: "Breed",
        fieldType: "select",
        isForeignKey: true,
        referencedTable: "breed",
        referencedFieldName: "display_name",
      },
      field_owner_id: {
        displayName: "Owner",
        fieldType: "select",
        isForeignKey: true,
        referencedTable: "person",
      },
      pet_field_name: {
        displayName: "Name",
        fieldType: "text",
        isForeignKey: false,
      },
    };

    expect(getForeignKeyFields(fields)).toEqual([
      {
        fieldName: "breed_id",
        referencedTable: "breed",
        referencedFieldName: "display_name",
      },
      {
        fieldName: "owner_id",
        referencedTable: "person",
        referencedFieldName: "name",
      },
    ]);
  });
});

describe("buildColumns", () => {
  const fields = {
    pet_field_name: {
      displayName: "Name",
      fieldType: "text",
      order: 2,
      searchable: true,
      showInTable: true,
    },
    pet_field_breed_id: {
      displayName: "Breed",
      fieldType: "text",
      sortOrder: 1,
      searchable: false,
      showInTable: false,
    },
    pet_field_status: {
      displayName: "Status",
      fieldType: "text",
    },
  };

  it("builds one column per field by default, sorted by order metadata", () => {
    const columns = buildColumns(fields);

    expect(columns).toHaveLength(3);
    expect(columns.map((column) => column.id)).toEqual([
      "status",
      "breed_id",
      "name",
    ]);
    expect(columns.map((column) => column.enableGlobalFilter)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("keeps only fields marked showInTable when requested", () => {
    const columns = buildColumns(fields, { showInTableOnly: true });

    expect(columns).toHaveLength(1);
    expect(columns[0].id).toBe("name");
    expect(columns[0].enableGlobalFilter).toBe(true);
  });
});

describe("enrichRecords", () => {
  beforeEach(() => {
    getDictionaryMock.mockReset();
  });

  it("returns the original records unchanged when there are no FK fields", async () => {
    const records = [{ id: "pet-1", name: "Rex" }];
    const fields = {
      pet_field_name: {
        displayName: "Name",
        fieldType: "text",
      },
    };

    await expect(enrichRecords(records, fields)).resolves.toBe(records);
    expect(getDictionaryMock).not.toHaveBeenCalled();
  });

  it("resolves FK UUIDs from top-level and additional values", async () => {
    getDictionaryMock.mockImplementation(async (tableName: string) => {
      if (tableName === "breed") {
        return {
          records: [
            { id: "breed-1", display_name: "Affenpinscher" },
            { id: "breed-2", display_name: "Basenji" },
          ],
        };
      }
      return {
        records: [
          { id: "owner-1", name: "Anna" },
          { id: "owner-2", name: "Bohdan" },
        ],
      };
    });

    const records = [
      { id: "pet-1", breed_id: "breed-1", owner_id: "owner-1" },
      {
        id: "pet-2",
        additional: {
          breed_id: "breed-2",
          owner_id: "owner-2",
        },
      },
    ];
    const fields = {
      pet_field_breed_id: {
        displayName: "Breed",
        fieldType: "select",
        isForeignKey: true,
        referencedTable: "breed",
        referencedFieldName: "display_name",
      },
      pet_field_owner_id: {
        displayName: "Owner",
        fieldType: "select",
        isForeignKey: true,
        referencedTable: "owner",
      },
    };

    await expect(enrichRecords(records, fields)).resolves.toEqual([
      {
        id: "pet-1",
        breed_id: "Affenpinscher",
        owner_id: "Anna",
      },
      {
        id: "pet-2",
        additional: {
          breed_id: "Basenji",
          owner_id: "Bohdan",
        },
      },
    ]);
    expect(getDictionaryMock).toHaveBeenCalledTimes(2);
    expect(getDictionaryMock).toHaveBeenCalledWith("breed", {
      nameField: "display_name",
      filterByIds: ["breed-1", "breed-2"],
      limit: 2,
    });
    expect(getDictionaryMock).toHaveBeenCalledWith("owner", {
      nameField: "name",
      filterByIds: ["owner-1", "owner-2"],
      limit: 2,
    });
  });
});
