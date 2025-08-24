import { RxDocument, RxCollection } from 'rxdb';

// Base breed document type
export interface BreedDocType {
  id: string;
  name: string;
  description?: string;
  workspaceId?: string;
  spaceId?: string;
  createdAt: string;
  updatedAt: string;
  _deleted?: boolean;
}

// RxDB document type
export type BreedDocument = RxDocument<BreedDocType>;

// RxDB collection type
export type BreedCollection = RxCollection<BreedDocType>;

// Methods for breed documents
export interface BreedDocMethods {
  getFullName(): string;
  getAgeRange(): string;
  isActive(): boolean;
}

// Statics for breed collection
export interface BreedCollectionMethods {
  findBySize(size: string): Promise<BreedDocument[]>;
  findByWorkspace(workspaceId: string): Promise<BreedDocument[]>;
  searchByName(query: string): Promise<BreedDocument[]>;
}

// Full typed collection
export type BreedCollectionTyped = RxCollection<
  BreedDocType,
  BreedDocMethods,
  BreedCollectionMethods
>;