import type { RxJsonSchema } from 'rxdb';

/**
 * Breed Children Document Type
 *
 * Universal child collection for all child tables belonging to breed entity:
 * - achievement_in_breed
 * - breed_division
 * - breed_in_kennel
 * - coat_color_in_breed
 * - coat_type_in_breed
 * - pet_size_in_breed
 * - body_feature_in_breed
 * - health_exam_object_in_breed
 * - measurement_type_in_breed
 * - payment_in_breed
 * - top_patron_in_breed
 * - top_pet_in_breed
 * - related_breed
 * - breed_synonym
 * - breed_forecast
 * - breed_in_contact
 * - breed_in_account
 *
 * Design pattern (same as DictionaryDocument):
 * - Core fields: id, tableType, parentId
 * - All table-specific fields stored in 'additional' JSON object
 * - Flexible schema without bloat from union of all possible fields
 */
export interface BreedChildrenDocument {
  // Core fields (required)
  id: string;
  tableType: 'achievement_in_breed' | 'breed_division' | 'breed_in_kennel' | 'coat_color_in_breed' | 'coat_type_in_breed' | 'pet_size_in_breed' | 'body_feature_in_breed' | 'health_exam_object_in_breed' | 'measurement_type_in_breed' | 'payment_in_breed' | 'top_patron_in_breed' | 'top_pet_in_breed' | 'related_breed' | 'breed_synonym' | 'breed_forecast' | 'breed_in_contact' | 'breed_in_account';
  parentId: string;  // breed_id reference

  // Additional fields (optional JSON object)
  // Stores all table-specific fields like:
  // - achievement_id, date (for achievement_in_breed)
  // - division_id, division_name, description (for breed_division)
  // - kennel_id, kennel_name, pet_count (for breed_in_kennel)
  // - etc.
  additional?: Record<string, any>;

  // Cache metadata
  cachedAt: number;  // Unix timestamp for TTL cleanup
}

/**
 * RxDB Schema for breed_children collection
 *
 * Design (same pattern as dictionaries):
 * - Core fields: id, tableType, parentId, cachedAt
 * - All table-specific fields in 'additional' JSON object
 * - Indexed by [parentId, tableType] for efficient parent queries
 * - No indexing on additional fields (not needed for this pattern)
 */
export const breedChildrenSchema: RxJsonSchema<BreedChildrenDocument> = {
  version: 1,  // ⬆️ Bumped for 'additional' field refactor
  primaryKey: 'id',
  type: 'object',
  properties: {
    // 1. Primary key
    id: {
      type: 'string',
      maxLength: 100  // Flexible for different ID types
    },

    // 2. Child table type
    tableType: {
      type: 'string',
      enum: [
        'achievement_in_breed',
        'breed_division',
        'breed_in_kennel',
        'coat_color_in_breed',
        'coat_type_in_breed',
        'pet_size_in_breed',
        'body_feature_in_breed',
        'health_exam_object_in_breed',
        'measurement_type_in_breed',
        'payment_in_breed',
        'top_patron_in_breed',
        'top_pet_in_breed',
        'related_breed',
        'breed_synonym',
        'breed_forecast',
        'breed_in_contact',
        'breed_in_account'
      ],
      maxLength: 50
    },

    // 3. Parent entity ID
    parentId: {
      type: 'string',
      maxLength: 36
    },

    // 4. Additional fields (optional JSON object)
    // Stores all table-specific fields
    additional: {
      type: 'object'
    },

    // 5. Cache timestamp for TTL
    cachedAt: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999
    }
  },
  required: ['id', 'tableType', 'parentId', 'cachedAt'],
  indexes: [
    // Composite index for querying child records by parent and table type
    ['parentId', 'tableType']
  ]
};

/**
 * Migration strategies for breed_children collection
 *
 * Version 0 → 1: Migrate from union schema to 'additional' field pattern
 * - Move all table-specific fields into 'additional' object
 * - Add cachedAt timestamp
 */
export const breedChildrenMigrationStrategies = {
  // Version 0→1: Convert old union schema to new additional field pattern
  1: (oldDoc: any) => {
    const { id, tableType, parentId, created_at, created_by, updated_at, updated_by, ...rest } = oldDoc;

    // Build additional object with all remaining fields
    const additional: Record<string, any> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== null) {
        additional[key] = value;
      }
    }

    return {
      id,
      tableType,
      parentId,
      additional: Object.keys(additional).length > 0 ? additional : undefined,
      cachedAt: Date.now()
    };
  }
};
