import type { RxCollection, RxDocument } from 'rxdb';

export async function findDocumentById<T>(
  collection: RxCollection<T>,
  id: string,
): Promise<RxDocument<T> | null> {
  const doc = await collection.findOne(id).exec();
  return doc ?? null;
}

export async function findDocumentDataById<T>(
  collection: RxCollection<T>,
  id: string,
): Promise<T | null> {
  const doc = await findDocumentById(collection, id);
  return doc ? (doc.toJSON() as T) : null;
}
