import type { RxCollection, RxDocument } from 'rxdb';

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
