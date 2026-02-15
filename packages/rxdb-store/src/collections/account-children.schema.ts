import type { RxJsonSchema } from 'rxdb';

/**
 * Account Children Document Type
 *
 * Universal child collection for all child tables belonging to account entity:
 * - account_communication
 * - kennel_pet (from kennel_pet_with_details view)
 * - kennel_offspring (from kennel_offspring_with_pet view)
 *
 * Design pattern (same as ContactChildrenDocument):
 * - Core fields: id, tableType, parentId
 * - All table-specific fields stored in 'additional' JSON object
 * - Flexible schema without bloat from union of all possible fields
 */
export interface AccountChildrenDocument {
  // Core fields (required)
  id: string;
  tableType: string;
  parentId: string;  // account_id reference

  // Additional fields (optional JSON object)
  additional?: Record<string, any>;

  // Cache metadata
  cachedAt: number;  // Unix timestamp for TTL cleanup
}

/**
 * RxDB Schema for account_children collection
 */
export const accountChildrenSchema: RxJsonSchema<AccountChildrenDocument> = {
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
 * Migration strategies for account_children collection
 */
export const accountChildrenMigrationStrategies = {
  // No migrations needed yet (version 0)
};
