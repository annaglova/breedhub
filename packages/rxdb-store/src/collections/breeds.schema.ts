import { RxJsonSchema } from 'rxdb';
import { BreedDocType } from '../types/breed.types';

export const breedSchema: RxJsonSchema<BreedDocType> = {
  version: 4,
  title: 'Breed Schema',
  description: 'Schema for dog breeds',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string',
      maxLength: 200
    },
    description: {
      type: ['string', 'null'],
      maxLength: 1000
    },
    workspaceId: {
      type: ['string', 'null'],
      maxLength: 100
    },
    spaceId: {
      type: ['string', 'null'],
      maxLength: 100
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 30
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 30
    },
    _deleted: {
      type: 'boolean',
      default: false
    }
  },
  required: ['id', 'name', 'createdAt', 'updatedAt'],
  indexes: [
    'name',
    'updatedAt'
  ]
};

// Migration strategies
export const breedMigrationStrategies = {
  1: function(oldDoc: any) {
    // Migration from v0 to v1
    // Ensure required fields exist
    return {
      ...oldDoc,
      createdAt: oldDoc.createdAt || new Date().toISOString(),
      updatedAt: oldDoc.updatedAt || new Date().toISOString()
    };
  },
  2: function(oldDoc: any) {
    // Migration from v1 to v2
    // Remove traits, colors, lifespan fields
    const { traits, colors, lifespan, ...newDoc } = oldDoc;
    return newDoc;
  },
  3: function(oldDoc: any) {
    // Migration from v2 to v3
    // Ensure null values for optional fields
    return {
      ...oldDoc,
      description: oldDoc.description || null,
      origin: oldDoc.origin || null,
      size: oldDoc.size || 'medium',
      image: oldDoc.image || null,
      workspaceId: oldDoc.workspaceId || null,
      spaceId: oldDoc.spaceId || null
    };
  },
  4: function(oldDoc: any) {
    // Migration from v3 to v4
    // Remove origin, size, image fields
    const { origin, size, image, ...newDoc } = oldDoc;
    return {
      ...newDoc,
      description: newDoc.description || null,
      workspaceId: newDoc.workspaceId || null,
      spaceId: newDoc.spaceId || null
    };
  }
};