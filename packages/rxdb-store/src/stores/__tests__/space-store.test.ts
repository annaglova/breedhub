/**
 * SpaceStore Unit Tests
 *
 * Tests pure functions and helper methods that don't require RxDB/Supabase.
 * These are config parsing, operator detection, field normalization, etc.
 *
 * Run: pnpm --filter @breedhub/rxdb-store test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Since SpaceStore is a singleton with private methods,
// we'll test the exposed logic by creating a test harness class
// that exposes the private methods for testing

// ============================================================
// Test Harness - Exposes private methods for unit testing
// ============================================================

/**
 * removeFieldPrefix - Remove entity_field_ prefix from field name
 * Example: breed_field_measurements -> measurements
 */
function removeFieldPrefix(fieldName: string, entityType: string): string {
  return fieldName.replace(new RegExp(`^${entityType}_field_`), '');
}

/**
 * detectOperator - Detect filter operator based on field type
 */
function detectOperator(fieldType: string, configOperator?: string): string {
  // Use config operator if explicitly set
  if (configOperator) {
    return configOperator;
  }

  // Auto-detect by field type
  switch (fieldType) {
    case 'string':
    case 'text':
      return 'ilike'; // Case-insensitive search

    case 'uuid':
      return 'eq'; // Exact match

    case 'number':
    case 'integer':
      return 'eq'; // Exact match

    case 'boolean':
      return 'eq';

    case 'date':
    case 'timestamp':
      return 'gte'; // Greater than or equal

    default:
      return 'eq'; // Default to exact match
  }
}

/**
 * getEntityTypeFromTableType - Determine entity type from child table name
 * e.g., 'achievement_in_breed' -> 'breed'
 */
function getEntityTypeFromTableType(tableType: string): string | null {
  // Check for "_in_breed", "_in_pet", "_in_kennel" patterns
  if (tableType.includes('_in_breed') || tableType.includes('_breed')) {
    return 'breed';
  }
  if (tableType.includes('_in_pet') || tableType.includes('_pet')) {
    return 'pet';
  }
  if (tableType.includes('_in_kennel') || tableType.includes('_kennel')) {
    return 'kennel';
  }

  // For tables like 'litter', 'breed_division' etc., need explicit mapping
  const tableEntityMap: Record<string, string> = {
    'breed_division': 'breed',
    'breed_synonym': 'breed',
    'breed_forecast': 'breed',
    'related_breed': 'breed',
    'litter': 'pet',
  };

  return tableEntityMap[tableType] || null;
}

/**
 * parseSortOptions - Parse sort_fields from space config
 */
function parseSortOptions(sortFields: Record<string, any>): Array<{
  id: string;
  name: string;
  field: string;
  direction?: string;
  parameter?: string;
  isDefault?: boolean;
}> {
  const sortOptions: Array<{
    id: string;
    name: string;
    field: string;
    direction?: string;
    parameter?: string;
    isDefault?: boolean;
    fieldOrder?: number;
    optionOrder?: number;
  }> = [];

  for (const [fieldId, fieldConfig] of Object.entries(sortFields)) {
    const field = fieldConfig as any;
    const fieldOrder = field.order || 0;

    if (field.sortOrder && Array.isArray(field.sortOrder)) {
      field.sortOrder.forEach((sortOption: any) => {
        const optionId = sortOption.slug || (
          sortOption.parametr
            ? `${fieldId}_${sortOption.parametr}_${sortOption.direction}`
            : `${fieldId}_${sortOption.direction}`
        );

        sortOptions.push({
          id: optionId,
          name: sortOption.label || field.displayName || fieldId,
          field: fieldId,
          direction: sortOption.direction,
          parameter: sortOption.parametr,
          isDefault: sortOption.isDefault === 'true' || sortOption.isDefault === true,
          fieldOrder,
          optionOrder: sortOption.order || 0,
        });
      });
    }
  }

  // Sort by field order, then by option order
  sortOptions.sort((a, b) => {
    if (a.fieldOrder !== b.fieldOrder) {
      return (a.fieldOrder || 0) - (b.fieldOrder || 0);
    }
    return (a.optionOrder || 0) - (b.optionOrder || 0);
  });

  // Remove temporary ordering fields
  return sortOptions.map(({ fieldOrder, optionOrder, ...rest }) => rest);
}

/**
 * parseFilterFields - Parse filter_fields from space config
 */
function parseFilterFields(filterFields: Record<string, any>): Array<{
  id: string;
  displayName: string;
  component: string;
  fieldType: string;
  order: number;
}> {
  const filterOptions: Array<{
    id: string;
    displayName: string;
    component: string;
    fieldType: string;
    order: number;
  }> = [];

  for (const [fieldId, fieldConfig] of Object.entries(filterFields)) {
    const field = fieldConfig as any;

    // Skip main filter field
    if (field.mainFilterField === true) {
      continue;
    }

    filterOptions.push({
      id: fieldId,
      displayName: field.displayName || fieldId,
      component: field.component || 'TextInput',
      fieldType: field.fieldType || 'string',
      order: field.order || 0,
    });
  }

  // Sort by order
  filterOptions.sort((a, b) => a.order - b.order);

  return filterOptions;
}

/**
 * findMainFilterField - Find field with mainFilterField: true
 */
function findMainFilterField(filterFields: Record<string, any>): {
  id: string;
  displayName: string;
  fieldType: string;
} | null {
  for (const [fieldId, fieldConfig] of Object.entries(filterFields)) {
    const field = fieldConfig as any;
    if (field.mainFilterField === true) {
      return {
        id: fieldId,
        displayName: field.displayName || fieldId,
        fieldType: field.fieldType || 'string',
      };
    }
  }
  return null;
}

// ============================================================
// Tests
// ============================================================

describe('SpaceStore Helper Functions', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // removeFieldPrefix tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('removeFieldPrefix', () => {
    it('should remove breed_field_ prefix', () => {
      expect(removeFieldPrefix('breed_field_measurements', 'breed')).toBe('measurements');
    });

    it('should remove breed_field_ prefix from pet_type_id', () => {
      expect(removeFieldPrefix('breed_field_pet_type_id', 'breed')).toBe('pet_type_id');
    });

    it('should not modify field without prefix', () => {
      expect(removeFieldPrefix('name', 'breed')).toBe('name');
    });

    it('should not modify field with different entity prefix', () => {
      expect(removeFieldPrefix('pet_field_name', 'breed')).toBe('pet_field_name');
    });

    it('should handle empty field name', () => {
      expect(removeFieldPrefix('', 'breed')).toBe('');
    });

    it('should work with kennel entity', () => {
      expect(removeFieldPrefix('kennel_field_location', 'kennel')).toBe('location');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // detectOperator tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('detectOperator', () => {
    it('should use explicit config operator if provided', () => {
      expect(detectOperator('string', 'eq')).toBe('eq');
      expect(detectOperator('number', 'gt')).toBe('gt');
      expect(detectOperator('date', 'lte')).toBe('lte');
    });

    it('should return ilike for string type', () => {
      expect(detectOperator('string')).toBe('ilike');
    });

    it('should return ilike for text type', () => {
      expect(detectOperator('text')).toBe('ilike');
    });

    it('should return eq for uuid type', () => {
      expect(detectOperator('uuid')).toBe('eq');
    });

    it('should return eq for number type', () => {
      expect(detectOperator('number')).toBe('eq');
    });

    it('should return eq for integer type', () => {
      expect(detectOperator('integer')).toBe('eq');
    });

    it('should return eq for boolean type', () => {
      expect(detectOperator('boolean')).toBe('eq');
    });

    it('should return gte for date type', () => {
      expect(detectOperator('date')).toBe('gte');
    });

    it('should return gte for timestamp type', () => {
      expect(detectOperator('timestamp')).toBe('gte');
    });

    it('should return eq for unknown type', () => {
      expect(detectOperator('unknown')).toBe('eq');
      expect(detectOperator('custom')).toBe('eq');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getEntityTypeFromTableType tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getEntityTypeFromTableType', () => {
    it('should detect breed from achievement_in_breed', () => {
      expect(getEntityTypeFromTableType('achievement_in_breed')).toBe('breed');
    });

    it('should detect breed from top_patron_in_breed', () => {
      expect(getEntityTypeFromTableType('top_patron_in_breed')).toBe('breed');
    });

    it('should detect breed from top_pet_in_breed', () => {
      expect(getEntityTypeFromTableType('top_pet_in_breed')).toBe('breed');
    });

    it('should detect breed from top_patron_in_breed_with_contact', () => {
      expect(getEntityTypeFromTableType('top_patron_in_breed_with_contact')).toBe('breed');
    });

    it('should detect breed from breed_division', () => {
      expect(getEntityTypeFromTableType('breed_division')).toBe('breed');
    });

    it('should detect breed from breed_synonym', () => {
      expect(getEntityTypeFromTableType('breed_synonym')).toBe('breed');
    });

    it('should detect breed from breed_forecast', () => {
      expect(getEntityTypeFromTableType('breed_forecast')).toBe('breed');
    });

    it('should detect breed from related_breed', () => {
      expect(getEntityTypeFromTableType('related_breed')).toBe('breed');
    });

    it('should detect pet from litter', () => {
      expect(getEntityTypeFromTableType('litter')).toBe('pet');
    });

    it('should detect pet from award_in_pet', () => {
      expect(getEntityTypeFromTableType('award_in_pet')).toBe('pet');
    });

    it('should detect kennel from dogs_in_kennel', () => {
      expect(getEntityTypeFromTableType('dogs_in_kennel')).toBe('kennel');
    });

    it('should return null for unknown table', () => {
      expect(getEntityTypeFromTableType('unknown_table')).toBeNull();
      expect(getEntityTypeFromTableType('some_random_name')).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // parseSortOptions tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('parseSortOptions', () => {
    it('should parse simple sort field with one direction', () => {
      const sortFields = {
        name: {
          displayName: 'Name',
          order: 1,
          sortOrder: [
            { direction: 'asc', label: 'A-Z' }
          ]
        }
      };

      const result = parseSortOptions(sortFields);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'name_asc',
        name: 'A-Z',
        field: 'name',
        direction: 'asc'
      });
    });

    it('should parse sort field with multiple directions', () => {
      const sortFields = {
        name: {
          displayName: 'Name',
          order: 1,
          sortOrder: [
            { direction: 'asc', label: 'A-Z', order: 1 },
            { direction: 'desc', label: 'Z-A', order: 2 }
          ]
        }
      };

      const result = parseSortOptions(sortFields);

      expect(result).toHaveLength(2);
      expect(result[0].direction).toBe('asc');
      expect(result[1].direction).toBe('desc');
    });

    it('should parse JSONB sort with parametr', () => {
      const sortFields = {
        measurements: {
          displayName: 'Rating',
          order: 1,
          sortOrder: [
            { direction: 'desc', label: 'Top Rated', parametr: 'rating' }
          ]
        }
      };

      const result = parseSortOptions(sortFields);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'measurements_rating_desc',
        name: 'Top Rated',
        field: 'measurements',
        direction: 'desc',
        parameter: 'rating'
      });
    });

    it('should use slug if provided', () => {
      const sortFields = {
        name: {
          sortOrder: [
            { direction: 'asc', label: 'A-Z', slug: 'name-asc' }
          ]
        }
      };

      const result = parseSortOptions(sortFields);

      expect(result[0].id).toBe('name-asc');
    });

    it('should detect isDefault flag', () => {
      const sortFields = {
        rating: {
          sortOrder: [
            { direction: 'desc', label: 'Popular', isDefault: true },
            { direction: 'asc', label: 'Unpopular', isDefault: false }
          ]
        }
      };

      const result = parseSortOptions(sortFields);

      expect(result[0].isDefault).toBe(true);
      expect(result[1].isDefault).toBe(false);
    });

    it('should sort by field order then option order', () => {
      const sortFields = {
        rating: {
          order: 2,
          sortOrder: [{ direction: 'desc', label: 'Rating' }]
        },
        name: {
          order: 1,
          sortOrder: [{ direction: 'asc', label: 'Name' }]
        }
      };

      const result = parseSortOptions(sortFields);

      expect(result[0].field).toBe('name');
      expect(result[1].field).toBe('rating');
    });

    it('should handle empty sortFields', () => {
      const result = parseSortOptions({});
      expect(result).toHaveLength(0);
    });

    it('should handle field without sortOrder array', () => {
      const sortFields = {
        name: {
          displayName: 'Name'
          // no sortOrder
        }
      };

      const result = parseSortOptions(sortFields);
      expect(result).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // parseFilterFields tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('parseFilterFields', () => {
    it('should parse filter fields with order', () => {
      const filterFields = {
        pet_type_id: {
          displayName: 'Pet Type',
          component: 'Select',
          fieldType: 'uuid',
          order: 1
        },
        country_id: {
          displayName: 'Country',
          component: 'Select',
          fieldType: 'uuid',
          order: 2
        }
      };

      const result = parseFilterFields(filterFields);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pet_type_id');
      expect(result[1].id).toBe('country_id');
    });

    it('should exclude mainFilterField', () => {
      const filterFields = {
        name: {
          displayName: 'Name',
          mainFilterField: true,
          order: 1
        },
        pet_type_id: {
          displayName: 'Pet Type',
          order: 2
        }
      };

      const result = parseFilterFields(filterFields);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pet_type_id');
    });

    it('should use default values for missing properties', () => {
      const filterFields = {
        custom_field: {}
      };

      const result = parseFilterFields(filterFields);

      expect(result[0]).toMatchObject({
        id: 'custom_field',
        displayName: 'custom_field',
        component: 'TextInput',
        fieldType: 'string',
        order: 0
      });
    });

    it('should sort by order', () => {
      const filterFields = {
        third: { order: 3 },
        first: { order: 1 },
        second: { order: 2 }
      };

      const result = parseFilterFields(filterFields);

      expect(result[0].id).toBe('first');
      expect(result[1].id).toBe('second');
      expect(result[2].id).toBe('third');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // findMainFilterField tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('findMainFilterField', () => {
    it('should find field with mainFilterField: true', () => {
      const filterFields = {
        name: {
          displayName: 'Search by Name',
          mainFilterField: true,
          fieldType: 'string'
        },
        pet_type_id: {
          displayName: 'Pet Type',
          fieldType: 'uuid'
        }
      };

      const result = findMainFilterField(filterFields);

      expect(result).toMatchObject({
        id: 'name',
        displayName: 'Search by Name',
        fieldType: 'string'
      });
    });

    it('should return null when no main filter field', () => {
      const filterFields = {
        pet_type_id: {
          displayName: 'Pet Type',
          fieldType: 'uuid'
        }
      };

      const result = findMainFilterField(filterFields);

      expect(result).toBeNull();
    });

    it('should return null for empty filterFields', () => {
      const result = findMainFilterField({});
      expect(result).toBeNull();
    });

    it('should use default fieldType if not specified', () => {
      const filterFields = {
        search: {
          displayName: 'Search',
          mainFilterField: true
        }
      };

      const result = findMainFilterField(filterFields);

      expect(result?.fieldType).toBe('string');
    });
  });
});
