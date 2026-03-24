import type { RxJsonSchema } from 'rxdb';

export interface AccountChildrenDocument {
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

export const accountChildrenSchema: RxJsonSchema<AccountChildrenDocument> = {
  version: 1,
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

export const accountChildrenMigrationStrategies = {
  1: (oldDoc: any) => oldDoc,
};
