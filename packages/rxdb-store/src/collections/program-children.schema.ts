import type { RxJsonSchema } from 'rxdb';

/**
 * Program Children Document Type
 *
 * Universal child collection for all child tables belonging to program entity:
 * - program_result (pet_in_program viewed by program)
 *
 * Design pattern (same as other child collections):
 * - Core fields: id, tableType, parentId
 * - All table-specific fields stored in 'additional' JSON object
 * - Flexible schema without bloat from union of all possible fields
 */
export interface ProgramChildrenDocument {
  // Core fields (required)
  id: string;
  tableType: 'program_result';
  parentId: string;  // program_id reference

  // Additional fields (optional JSON object)
  // Stores all table-specific fields like:
  // - pet_id, pet_name, pet_slug (for program_result)
  // - breed_name, breed_slug, class_name
  // - number, result, judge_name, judge_slug, web_link
  additional?: Record<string, any>;

  // Cache metadata
  cachedAt: number;  // Unix timestamp for TTL cleanup
}

/**
 * RxDB Schema for program_children collection
 *
 * Design (same pattern as other child collections):
 * - Core fields: id, tableType, parentId, cachedAt
 * - All table-specific fields in 'additional' JSON object
 * - Indexed by [parentId, tableType] for efficient parent queries
 */
export const programChildrenSchema: RxJsonSchema<ProgramChildrenDocument> = {
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
      enum: [
        'program_result'
      ],
      maxLength: 50
    },

    // 3. Parent entity ID
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
    ['parentId', 'tableType']
  ]
};

/**
 * Migration strategies for program_children collection
 */
export const programChildrenMigrationStrategies = {
  // No migrations needed for version 0
};
