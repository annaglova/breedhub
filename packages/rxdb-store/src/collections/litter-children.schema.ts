import type { RxJsonSchema } from 'rxdb';

/**
 * Litter Children Document Type
 *
 * Universal child collection for all child tables belonging to litter entity:
 * - pet_in_litter (junction table linking litter to its children pets)
 *
 * Design pattern (same as PetChildrenDocument):
 * - Core fields: id, tableType, parentId
 * - All table-specific fields stored in 'additional' JSON object
 * - Flexible schema without bloat from union of all possible fields
 */
export interface LitterChildrenDocument {
  // Core fields (required)
  id: string;
  tableType: string;
  parentId: string;  // litter_id reference

  // Additional fields (optional JSON object)
  // Stores all table-specific fields like:
  // - pet_id, pet_breed_id (for pet_in_litter)
  additional?: Record<string, any>;

  // Cache metadata
  cachedAt: number;  // Unix timestamp for TTL cleanup
}

/**
 * RxDB Schema for litter_children collection
 *
 * Design (same pattern as pet_children):
 * - Core fields: id, tableType, parentId, cachedAt
 * - All table-specific fields in 'additional' JSON object
 * - Indexed by [parentId, tableType] for efficient parent queries
 */
export const litterChildrenSchema: RxJsonSchema<LitterChildrenDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    // 1. Primary key
    id: {
      type: 'string',
      maxLength: 100
    },

    // 2. Child table type
    tableType: {
      type: 'string',
      maxLength: 100
    },

    // 3. Parent entity ID (litter_id)
    parentId: {
      type: 'string',
      maxLength: 36
    },

    // 4. Additional fields (optional JSON object)
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
 * Migration strategies for litter_children collection
 */
export const litterChildrenMigrationStrategies = {
  // No migrations needed yet (version 0)
};
