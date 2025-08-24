import { RxDocument, RxCollection } from 'rxdb';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  genre?: string | null;
  year?: number | null;
  pages?: number | null;
  rating?: number | null;
  available: boolean;
  description?: string | null;
  tags: string[];
  metadata: Record<string, any>;
  accountId?: string | null;
  spaceId?: string | null;
  createdAt: string;
  updatedAt: string;
  _deleted?: boolean;
}

export type BookDocument = RxDocument<Book>;
export type BookCollection = RxCollection<Book>;

export interface BookSupabase {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  genre?: string | null;
  year?: number | null;
  pages?: number | null;
  rating?: number | null;
  available: boolean;
  description?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, any> | null;
  account_id?: string | null;
  space_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}