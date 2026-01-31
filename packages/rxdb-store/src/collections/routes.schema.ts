import type { RxJsonSchema } from 'rxdb';

/**
 * Route Document
 *
 * Maps URL slugs to entity information for fullscreen pages.
 * Used for URLs like /affenpinscher → { entity: 'breed', entity_id: 'uuid', model: 'breed' }
 */
export interface RouteDocument {
  slug: string;           // Primary key - unique URL slug (e.g., 'affenpinscher')
  entity: string;         // Table name: 'breed', 'pet', 'account', 'contact'
  entity_id: string;      // UUID of the entity
  entity_partition_id?: string; // Partition key for partitioned tables (e.g., breed_id for pet)
  model: string;          // Rendering model: 'breed', 'kennel', 'club', 'federation'
  cachedAt: number;       // Unix timestamp for TTL cleanup
}

/**
 * RxDB schema for routes collection
 *
 * Design:
 * - slug is primary key (unique, indexed by default)
 * - Lazy loading: routes are fetched on-demand when URL is accessed
 * - TTL cleanup: routes expire after 14 days (same as dictionaries)
 * - Local-first: check RxDB first, fallback to Supabase, cache result
 */
export const routesSchema: RxJsonSchema<RouteDocument> = {
  version: 1,
  primaryKey: 'slug',
  type: 'object',
  properties: {
    slug: {
      type: 'string',
      maxLength: 255
    },
    entity: {
      type: 'string',
      maxLength: 50
    },
    entity_id: {
      type: 'string',
      maxLength: 36  // UUID length
    },
    entity_partition_id: {
      type: 'string',
      maxLength: 36  // UUID length (optional - only for partitioned tables)
    },
    model: {
      type: 'string',
      maxLength: 50
    },
    cachedAt: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999
    }
  },
  required: ['slug', 'entity', 'entity_id', 'model', 'cachedAt'],
  indexes: [
    'entity',
    'entity_id',
    'cachedAt'
  ]
};
