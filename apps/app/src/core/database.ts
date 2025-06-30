import Dexie, { Table } from 'dexie';

// Базовий інтерфейс для всіх сутностей
interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

// Приклади інтерфейсів для основних сутностей (будуть розширені під час міграції)
export interface Breed extends BaseEntity {
  name: string;
  description?: string;
  origin?: string;
}

export interface Pet extends BaseEntity {
  name: string;
  breed_id?: string;
  birth_date?: string;
  gender?: 'male' | 'female';
}

// Клас для локальної БД
export class LocalDatabase extends Dexie {
  breeds!: Table<Breed>;
  pets!: Table<Pet>;

  constructor() {
    super('BreedHubDB');
    
    // Версія 1 схеми БД
    this.version(1).stores({
      breeds: 'id, name, synced',
      pets: 'id, name, breed_id, synced'
    });
  }
}

// Експорт інстансу БД
export const db = new LocalDatabase();