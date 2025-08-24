import { RxJsonSchema } from 'rxdb';
import { BookDocument } from '../types/book.types';

export const booksSchema: RxJsonSchema<BookDocument> = {
  version: 0,
  title: 'Books Schema',
  description: 'Schema for books collection - test table for RxDB sync',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    title: {
      type: 'string',
      maxLength: 500
    },
    author: {
      type: 'string',
      maxLength: 200
    },
    isbn: {
      type: ['string', 'null'],
      maxLength: 20
    },
    genre: {
      type: ['string', 'null'],
      maxLength: 100
    },
    year: {
      type: ['number', 'null'],
      minimum: 0,
      maximum: 9999
    },
    pages: {
      type: ['number', 'null'],
      minimum: 0
    },
    rating: {
      type: ['number', 'null'],
      minimum: 0,
      maximum: 5
    },
    available: {
      type: 'boolean',
      default: true
    },
    description: {
      type: ['string', 'null'],
      maxLength: 5000
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 100
      },
      default: []
    },
    metadata: {
      type: 'object',
      default: {}
    },
    accountId: {
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
      maxLength: 100
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 100
    },
    _deleted: {
      type: 'boolean',
      default: false
    }
  },
  required: ['id', 'title', 'author', 'available', 'createdAt', 'updatedAt', '_deleted'],
  indexes: [
    'title',
    'author',
    'updatedAt',
    '_deleted'
  ]
};