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
 * - pet_service_feature_in_pet
 * - pet_identifier (microchips, registrations)
 * - media_in_pet
 *
 * Design pattern (same as BreedChildrenDocument):
 * - Core fields: id, tableType, parentId, partitionId (optional)
 * - All table-specific fields stored in 'additional' JSON object
 * - Flexible schema without bloat from union of all possible fields
 * - partitionId enables partition pruning for PostgreSQL queries
 */
export interface PetChildrenDocument {
  // Core fields (required)
  id: string;
  tableType: string;
  parentId: string;  // pet_id reference

  // Partition key (optional)
  partitionId?: string;

  // Service fields (from Supabase)
  updated_at?: string;
  created_at?: string;
  created_by?: string;
  updated_by?: string;

  // Additional fields (optional JSON object) — table-specific data only
  additional?: Record<string, any>;

  // Cache metadata
  cachedAt: number;
}

/**
 * RxDB Schema for pet_children collection
 *
 * Design (same pattern as breed_children):
 * - Core fields: id, tableType, parentId, partitionId, cachedAt
 * - All table-specific fields in 'additional' JSON object
 * - Indexed by [parentId, tableType] for efficient parent queries
 * - partitionId stores breed_id for partition pruning (pet table is partitioned)
 */
export const petChildrenSchema: RxJsonSchema<PetChildrenDocument> = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    tableType: { type: 'string', maxLength: 100 },
    parentId: { type: 'string', maxLength: 36 },
    partitionId: { type: 'string', maxLength: 36 },
    updated_at: { type: 'string' },
    created_at: { type: 'string' },
    created_by: { type: 'string', maxLength: 36 },
    updated_by: { type: 'string', maxLength: 36 },
    additional: { type: 'object' },
    cachedAt: { type: 'number', multipleOf: 1, minimum: 0, maximum: 9999999999999 }
  },
  required: ['id', 'tableType', 'parentId', 'cachedAt'],
  indexes: [['parentId', 'tableType']]
};

/**
 * Migration strategies for pet_children collection
 */
export const petChildrenMigrationStrategies = {
  1: (oldDoc: any) => oldDoc, // v0→v1: added service fields (updated_at, created_at, etc.)
};
