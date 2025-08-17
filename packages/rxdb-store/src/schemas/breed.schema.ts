import type { RxJsonSchema } from 'rxdb';

// Base interface for Breed entity
export interface Breed {
  id: string;
  name: string;
  description?: string;
  group?: string;
  traits?: string[];
  origin?: string;
  size?: 'small' | 'medium' | 'large' | 'giant';
  temperament?: string[];
  lifeSpan?: { min: number; max: number };
  weight?: { min: number; max: number };
  height?: { min: number; max: number };
  colors?: string[];
  imageUrl?: string;
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
      type: 'string',
      maxLength: 2000
    },
    group: {
      type: 'string',
      maxLength: 100,
      enum: [
        'Sporting',
        'Hound',
        'Working',
        'Terrier',
        'Toy',
        'Non-Sporting',
        'Herding',
        'Miscellaneous',
        'Foundation Stock Service'
      ]
    },
    traits: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 50
      },
      maxItems: 20
    },
    origin: {
      type: 'string',
      maxLength: 100
    },
    size: {
      type: 'string',
      enum: ['small', 'medium', 'large', 'giant']
    },
    temperament: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 50
      },
      maxItems: 10
    },
    lifeSpan: {
      type: 'object',
      properties: {
        min: { type: 'number', minimum: 1, maximum: 25 },
        max: { type: 'number', minimum: 1, maximum: 25 }
      }
    },
    weight: {
      type: 'object',
      properties: {
        min: { type: 'number', minimum: 1, maximum: 200 },
        max: { type: 'number', minimum: 1, maximum: 200 }
      }
    },
    height: {
      type: 'object',
      properties: {
        min: { type: 'number', minimum: 1, maximum: 50 },
        max: { type: 'number', minimum: 1, maximum: 50 }
      }
    },
    colors: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 50
      },
      maxItems: 20
    },
    imageUrl: {
      type: 'string',
      maxLength: 500
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
    'group',
    'size',
    'updatedAt',
    ['group', 'size'],
    ['name', 'group']
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