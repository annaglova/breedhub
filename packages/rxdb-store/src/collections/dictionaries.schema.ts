import type { RxJsonSchema } from 'rxdb';

/**
 * Universal dictionary document
 * Stores normalized data from any dictionary table
 * with composite key: table_name::id
 */
export interface DictionaryDocument {
  // Composite primary key components
  composite_id: string;  // "pet_type::uuid-123" or "country::UA"
  table_name: string;    // "pet_type", "country", etc.
  id: string;            // UUID, code, or any identifier from source table

  // Display data
  name: string;          // Display name from source table

  // Cache metadata
  cachedAt: number;      // Unix timestamp for TTL cleanup
}

/**
 * RxDB schema for universal dictionaries collection
 *
 * Design:
 * - ONE collection for ALL dictionary tables (120+ tables)
 * - Composite key prevents collisions between tables
 * - Minimal fields: only what's needed for dropdowns/lookups
 * - Config-driven: referencedFieldID and referencedFieldName determine source fields
 *
 * Examples:
 * - pet_type.id + pet_type.name → {id, name}
 * - country.code + country.name → {id: code, name}
 * - breed.id + breed.admin_name → {id, name: admin_name}
 */
export const dictionariesSchema: RxJsonSchema<DictionaryDocument> = {
  version: 0,
  primaryKey: {
    // Composite key: combines table_name and id
    key: 'composite_id',
    fields: ['table_name', 'id'],
    separator: '::'
  },
  type: 'object',
  properties: {
    // 1. Composite Primary Key
    // RxDB automatically creates this from table_name + '::' + id
    composite_id: {
      type: 'string',
      maxLength: 100  // table_name (50) + '::' (2) + id (36 for UUID)
    },

    // 2. Table identifier (part of composite key)
    table_name: {
      type: 'string',
      maxLength: 50
    },

    // 3. Record ID (part of composite key)
    // Can be: UUID, code, number, etc. - depends on source table
    id: {
      type: 'string',
      maxLength: 100  // Flexible length for different ID types
    },

    // 4. Display name
    // From config.referencedFieldName (usually 'name')
    name: {
      type: 'string',
      maxLength: 250
    },

    // 5. Cache timestamp for TTL
    cachedAt: {
      type: 'number'
    }
  },
  required: ['composite_id', 'table_name', 'id', 'name', 'cachedAt'],

  // Indexes for fast queries
  indexes: [
    'table_name',              // Find all records from specific table
    ['table_name', 'name'],    // Search by name within table
    'cachedAt'                 // TTL cleanup queries
  ],
  attachments: {}
};
