import type { RxJsonSchema } from 'rxdb';

// Base interface for Dog entity
export interface Dog {
  id: string;
  name: string;
  breedId?: string;
  birthDate?: string;
  gender?: 'male' | 'female';
  color?: string;
  microchip?: string;
  registrationNumber?: string;
  ownerId?: string;
  kennelId?: string;
  updatedAt: string;
  createdAt: string;
  _deleted?: boolean;
}

// RxDB Schema for Dog collection
export const dogSchema: RxJsonSchema<Dog> = {
  version: 0,
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
    breedId: {
      type: 'string',
      maxLength: 100
    },
    birthDate: {
      type: 'string',
      format: 'date-time'
    },
    gender: {
      type: 'string',
      maxLength: 10
    },
    color: {
      type: 'string',
      maxLength: 100
    },
    microchip: {
      type: 'string',
      maxLength: 50
    },
    registrationNumber: {
      type: 'string',
      maxLength: 100
    },
    ownerId: {
      type: 'string',
      maxLength: 100
    },
    kennelId: {
      type: 'string',
      maxLength: 100
    },
    updatedAt: {
      type: 'string',
      format: 'date-time'
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    _deleted: {
      type: 'boolean'
    }
  },
  required: ['id', 'name', 'updatedAt', 'createdAt'],
  indexes: [
    'name',
    'updatedAt'
    // Removed indexes on optional fields to avoid DXE1 error
  ]
};