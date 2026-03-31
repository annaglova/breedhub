import type { RxJsonSchema } from 'rxdb';

// --- Entity Sync Queue ---

export interface EntitySyncQueueDocument {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  payload: Record<string, any>;
  onConflict: string;
  retries: number;
  createdAt: number;
  status?: string;
  error?: string;
}

export const entitySyncQueueSchema: RxJsonSchema<EntitySyncQueueDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    entityType: { type: 'string', maxLength: 50 },
    entityId: { type: 'string', maxLength: 36 },
    operation: { type: 'string', maxLength: 10 },
    payload: { type: 'object' },
    onConflict: { type: 'string', maxLength: 100 },
    retries: { type: 'number', minimum: 0, maximum: 100, multipleOf: 1 },
    createdAt: { type: 'number', minimum: 0, maximum: 9999999999999, multipleOf: 1 },
    status: { type: 'string', maxLength: 10 },
    error: { type: 'string', maxLength: 500 },
  },
  required: ['id', 'entityType', 'entityId', 'operation', 'payload', 'onConflict', 'retries', 'createdAt'],
  indexes: ['entityId', 'createdAt'],
};

// --- Child Sync Queue ---

export interface ChildSyncQueueDocument {
  id: string;
  entityType: string;
  tableType: string;
  recordId: string;
  operation: string;
  payload: Record<string, any>;
  onConflict: string;
  retries: number;
  createdAt: number;
  status?: string;
  error?: string;
}

export const childSyncQueueSchema: RxJsonSchema<ChildSyncQueueDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    entityType: { type: 'string', maxLength: 50 },
    tableType: { type: 'string', maxLength: 100 },
    recordId: { type: 'string', maxLength: 36 },
    operation: { type: 'string', maxLength: 10 },
    payload: { type: 'object' },
    onConflict: { type: 'string', maxLength: 100 },
    retries: { type: 'number', minimum: 0, maximum: 100, multipleOf: 1 },
    createdAt: { type: 'number', minimum: 0, maximum: 9999999999999, multipleOf: 1 },
    status: { type: 'string', maxLength: 10 },
    error: { type: 'string', maxLength: 500 },
  },
  required: ['id', 'entityType', 'tableType', 'recordId', 'operation', 'payload', 'onConflict', 'retries', 'createdAt'],
  indexes: ['recordId', 'createdAt'],
};

// --- Dictionary Sync Queue (future use) ---

export interface DictionarySyncQueueDocument {
  id: string;
  tableName: string;
  recordId: string;
  operation: string;
  payload: Record<string, any>;
  onConflict: string;
  retries: number;
  createdAt: number;
  status?: string;
  error?: string;
}

export const dictionarySyncQueueSchema: RxJsonSchema<DictionarySyncQueueDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    tableName: { type: 'string', maxLength: 100 },
    recordId: { type: 'string', maxLength: 36 },
    operation: { type: 'string', maxLength: 10 },
    payload: { type: 'object' },
    onConflict: { type: 'string', maxLength: 100 },
    retries: { type: 'number', minimum: 0, maximum: 100, multipleOf: 1 },
    createdAt: { type: 'number', minimum: 0, maximum: 9999999999999, multipleOf: 1 },
    status: { type: 'string', maxLength: 10 },
    error: { type: 'string', maxLength: 500 },
  },
  required: ['id', 'tableName', 'recordId', 'operation', 'payload', 'onConflict', 'retries', 'createdAt'],
  indexes: ['recordId', 'createdAt'],
};
