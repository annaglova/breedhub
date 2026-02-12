import type { RxJsonSchema } from 'rxdb';

/**
 * Contact Children Document Type
 *
 * Universal child collection for all child tables belonging to contact entity:
 * - contact_communication
 * - contact_language
 *
 * Design pattern (same as LitterChildrenDocument):
 * - Core fields: id, tableType, parentId
 * - All table-specific fields stored in 'additional' JSON object
 * - Flexible schema without bloat from union of all possible fields
 */
export interface ContactChildrenDocument {
  // Core fields (required)
  id: string;
  tableType: string;
  parentId: string;  // contact_id reference

  // Additional fields (optional JSON object)
  additional?: Record<string, any>;

  // Cache metadata
  cachedAt: number;  // Unix timestamp for TTL cleanup
}

/**
 * RxDB Schema for contact_children collection
 */
export const contactChildrenSchema: RxJsonSchema<ContactChildrenDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    tableType: {
      type: 'string',
      maxLength: 100
    },
    parentId: {
      type: 'string',
      maxLength: 36
    },
    additional: {
      type: 'object'
    },
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
 * Migration strategies for contact_children collection
 */
export const contactChildrenMigrationStrategies = {
  // No migrations needed yet (version 0)
};
