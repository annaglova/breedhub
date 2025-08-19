import { RxJsonSchema } from 'rxdb';

/**
 * RxDB schema for breed collection
 * Based on actual PostgreSQL table structure
 */
export const breedSchema: RxJsonSchema<any> = {
  version: 0,
  title: 'breed',
  description: 'Breed registry',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 50
    },
    name: {
      type: 'string',
      maxLength: 250
    },
    admin_name: {
      type: 'string',
      maxLength: 250,
      default: ''
    },
    url: {
      type: 'string',
      maxLength: 500,
      default: ''
    },
    created_on: {
      type: 'string',
      maxLength: 100,
      default: ''
    },
    modified_on: {
      type: 'string',
      maxLength: 100,
      default: ''
    }
  },
  required: ['id', 'name'],
  indexes: ['name'] // Remove modified_on from indexes - it causes issues
};

/**
 * RxDB schema for pet collection
 * Single collection for all pets from all breed partitions
 */
export const petSchema: RxJsonSchema<any> = {
  version: 0,
  title: 'pet',
  description: 'All pets across all breeds',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      primary: true,
      maxLength: 50
    },
    breed_id: {
      type: 'string',
      maxLength: 50
    },
    name: {
      type: 'string',
      maxLength: 255
    },
    created_at: {
      type: 'string',
      format: 'date-time'
    },
    updated_at: {
      type: 'string',
      format: 'date-time'
    }
  },
  required: ['id', 'breed_id', 'name'],
  indexes: ['breed_id', 'name', 'updated_at']
};

/**
 * Collections configuration
 */
export const COLLECTIONS = {
  breed: breedSchema,
  pet: petSchema
};

/**
 * Helper to get partition table name
 */
export function getPetPartitionTable(breedName: string): string {
  // Convert breed name to partition suffix
  // e.g., "Akita Inu" -> "pet_akita_inu"
  const suffix = breedName.toLowerCase().replace(/\s+/g, '_');
  return `pet_${suffix}`;
}