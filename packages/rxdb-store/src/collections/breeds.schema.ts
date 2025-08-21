import { RxJsonSchema } from 'rxdb';
import { BreedDocType } from '../types/breed.types';

export const breedSchema: RxJsonSchema<BreedDocType> = {
  version: 1,
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
      type: 'string',
      maxLength: 1000
    },
    origin: {
      type: 'string',
      maxLength: 100
    },
    size: {
      type: 'string',
      enum: ['toy', 'small', 'medium', 'large', 'giant'],
      default: 'medium'
    },
    lifespan: {
      type: 'object',
      properties: {
        min: { type: 'number' },
        max: { type: 'number' }
      }
    },
    traits: {
      type: 'array',
      items: {
        type: 'string'
      },
      default: []
    },
    colors: {
      type: 'array',
      items: {
        type: 'string'
      },
      default: []
    },
    image: {
      type: 'string',
      maxLength: 500
    },
    workspaceId: {
      type: 'string',
      maxLength: 100
    },
    spaceId: {
      type: 'string',
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
  }
};