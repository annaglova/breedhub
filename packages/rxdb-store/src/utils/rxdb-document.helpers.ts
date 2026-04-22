import type { RxCollection, RxDocument } from 'rxdb';

export interface RxDBDocumentSchema {
  properties?: Record<string, { type?: string | readonly string[] }>;
}

const RXDB_ONLY_FIELDS = new Set([
  '_deleted',
  'cachedAt',
  '_meta',
  '_attachments',
  '_rev',
]);

function allowsNull(fieldSchema: { type?: string | readonly string[] } | undefined): boolean {
  if (!fieldSchema) {
    return false;
  }

  return Array.isArray(fieldSchema.type) && fieldSchema.type.includes('null');
}

export function buildSupabaseSelectFromRxDBSchema(
  jsonSchema: RxDBDocumentSchema | null | undefined,
): string {
  const properties = jsonSchema?.properties;
  if (!properties || Object.keys(properties).length === 0) {
    return '*';
  }

  const selectFields: string[] = [];

  for (const fieldName of Object.keys(properties)) {
    if (fieldName === '_deleted') {
      selectFields.push('deleted');
      continue;
    }

    if (RXDB_ONLY_FIELDS.has(fieldName)) {
      continue;
    }

    selectFields.push(fieldName);
  }

  return selectFields.length > 0 ? selectFields.join(', ') : '*';
}

export function mapSupabaseToRxDBDoc(
  supabaseDoc: any,
  jsonSchema: RxDBDocumentSchema | null | undefined,
  now: number = Date.now(),
): any {
  const mapped: any = {};

  if (jsonSchema?.properties) {
    for (const fieldName in jsonSchema.properties) {
      if (fieldName === '_deleted') {
        mapped._deleted = Boolean(supabaseDoc.deleted);
      } else if (Object.prototype.hasOwnProperty.call(supabaseDoc, fieldName)) {
        const value = supabaseDoc[fieldName];
        const fieldSchema = jsonSchema.properties[fieldName];

        if (value === null && !allowsNull(fieldSchema)) {
          continue;
        }

        mapped[fieldName] = value;
      }
    }
  } else {
    const serviceFields = ['_meta', '_attachments', '_rev'];

    for (const key in supabaseDoc) {
      if (serviceFields.includes(key)) {
        continue;
      }

      if (supabaseDoc[key] === null) {
        continue;
      }

      if (key === 'deleted') {
        mapped._deleted = Boolean(supabaseDoc.deleted);
      } else {
        mapped[key] = supabaseDoc[key];
      }
    }
  }

  mapped.id = mapped.id || supabaseDoc.id;
  mapped.created_at = mapped.created_at || supabaseDoc.created_at;
  mapped.updated_at = mapped.updated_at || supabaseDoc.updated_at;
  mapped.cachedAt = now;

  delete mapped._meta;
  delete mapped._attachments;
  delete mapped._rev;

  return mapped;
}

export async function findDocumentByPrimaryKey<T>(
  collection: RxCollection<T>,
  primaryKey: string,
): Promise<RxDocument<T> | null> {
  const doc = await collection.findOne(primaryKey).exec();
  return doc ?? null;
}

export async function findDocumentById<T>(
  collection: RxCollection<T>,
  id: string,
): Promise<RxDocument<T> | null> {
  return findDocumentByPrimaryKey(collection, id);
}

export async function findDocumentDataById<T>(
  collection: RxCollection<T>,
  id: string,
): Promise<T | null> {
  const doc = await findDocumentByPrimaryKey(collection, id);
  return doc ? (doc.toJSON() as T) : null;
}
