import type { RxJsonSchema } from 'rxdb';

/**
 * Pet Children Document Type
 *
 * Universal child collection for all child tables belonging to pet entity:
 * - title_in_pet (pet titles/championships)
 * - title_in_pet_with_details (VIEW with joined title + country)
 * - health_exam_in_pet
 * - measurement_in_pet
 * - pedigree_in_pet
 * - litter (pet as parent/offspring)
 * - pet_service_in_pet
 * - media_in_pet
 *
 * Design pattern (same as BreedChildrenDocument):
 * - Core fields: id, tableType, parentId
 * - All table-specific fields stored in 'additional' JSON object
 * - Flexible schema without bloat from union of all possible fields
 */
export interface PetChildrenDocument {
  // Core fields (required)
  id: string;
  tableType: string;
  parentId: string;  // pet_id reference

  // Additional fields (optional JSON object)
  // Stores all table-specific fields like:
  // - title_id, country_id, date (for title_in_pet)
  // - title_name, title_rating, country_code (for title_in_pet_with_details VIEW)
  // - health_exam_id, result, date (for health_exam_in_pet)
  // - etc.
  additional?: Record<string, any>;

  // Cache metadata
  cachedAt: number;  // Unix timestamp for TTL cleanup
}

/**
 * RxDB Schema for pet_children collection
 *
 * Design (same pattern as breed_children):
 * - Core fields: id, tableType, parentId, cachedAt
 * - All table-specific fields in 'additional' JSON object
 * - Indexed by [parentId, tableType] for efficient parent queries
 * - No indexing on additional fields (not needed for this pattern)
 */
export const petChildrenSchema: RxJsonSchema<PetChildrenDocument> = {
  version: 0,
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
      maxLength: 100  // Flexible for VIEW names like 'title_in_pet_with_details'
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
 * Migration strategies for pet_children collection
 */
export const petChildrenMigrationStrategies = {
  // No migrations needed yet (version 0)
};
