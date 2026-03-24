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
  id: string;
  tableType: string;
  parentId: string;
  updated_at?: string;
  created_at?: string;
  created_by?: string;
  updated_by?: string;
  additional?: Record<string, any>;
  cachedAt: number;
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
  version: 2,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    tableType: { type: 'string', maxLength: 100 },
    parentId: { type: 'string', maxLength: 36 },
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
 * Migration strategies for breed_children collection
 *
 * Version 0 → 1: Migrate from union schema to 'additional' field pattern
 * - Move all table-specific fields into 'additional' object
 * - Add cachedAt timestamp
 */
export const breedChildrenMigrationStrategies = {
  1: (oldDoc: any) => {
    const { id, tableType, parentId, created_at, created_by, updated_at, updated_by, ...rest } = oldDoc;
    const additional: Record<string, any> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== null) additional[key] = value;
    }
    return { id, tableType, parentId, additional: Object.keys(additional).length > 0 ? additional : undefined, cachedAt: Date.now() };
  },
  2: (oldDoc: any) => oldDoc, // v1→v2: added service fields as top-level
};
