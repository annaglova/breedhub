import type { RxJsonSchema } from 'rxdb';

// Base interface for Breed entity
export interface Breed {
  id: string;
  name: string;
  description?: string;
  traits: string[];
  origin?: string;
  size?: 'small' | 'medium' | 'large' | 'giant';
  temperament?: string[];
  lifeSpan?: string;
  updatedAt: string;
  createdAt: string;
  _deleted?: boolean;
}

// RxDB Schema for Breed collection
export const breedSchema: RxJsonSchema<Breed> = {
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
    description: {
      type: 'string'
    },
    traits: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    origin: {
      type: 'string'
    },
    size: {
      type: 'string',
      enum: ['small', 'medium', 'large', 'giant']
    },
    temperament: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    lifeSpan: {
      type: 'string'
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
  required: ['id', 'name', 'traits', 'updatedAt', 'createdAt'],
  indexes: [
    'name',
    'updatedAt'
  ]
};

// Collection methods
export const breedMethods = {
  // Instance methods
  getDisplayName(this: Breed): string {
    return this.name;
  },
  
  isLargeBreed(this: Breed): boolean {
    return this.size === 'large' || this.size === 'giant';
  }
};

// Static methods
export const breedStatics = {
  // Collection-level methods
  findBySize(this: any, size: Breed['size']) {
    return this.find({
      selector: {
        size: { $eq: size }
      }
    });
  },
  
  findByName(this: any, name: string) {
    return this.find({
      selector: {
        name: { $regex: new RegExp(name, 'i') }
      }
    });
  }
};