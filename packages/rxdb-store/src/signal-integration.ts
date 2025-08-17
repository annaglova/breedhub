import { signal, computed, Signal } from '@preact/signals-react';
import type { RxCollection, RxDocument, MangoQuery } from 'rxdb';
import type { Subscription } from 'rxjs';

/**
 * RxDB + Signals Integration
 * Connects RxDB reactive queries with Preact signals for UI reactivity
 */
export class RxDBSignalStore<T> {
  private collection: RxCollection<T>;
  private subscriptions = new Map<string, Subscription>();
  
  // Core signals
  public readonly items = signal<T[]>([]);
  public readonly loading = signal(false);
  public readonly error = signal<Error | null>(null);
  public readonly lastUpdated = signal<Date | null>(null);
  
  // Computed values
  public readonly count = computed(() => this.items.value.length);
  public readonly isEmpty = computed(() => this.items.value.length === 0);
  public readonly hasError = computed(() => this.error.value !== null);
  
  constructor(collection: RxCollection<T>) {
    this.collection = collection;
    this.setupDefaultSubscription();
  }
  
  /**
   * Setup default subscription to all documents in collection
   */
  private setupDefaultSubscription(): void {
    const subscription = this.collection.$.subscribe({
      next: (docs) => {
        this.items.value = docs.map(doc => doc.toJSON());
        this.lastUpdated.value = new Date();
        this.error.value = null;
      },
      error: (err) => {
        this.error.value = err;
        console.error('RxDB collection error:', err);
      }
    });
    
    this.subscriptions.set('default', subscription);
  }
  
  /**
   * Create a reactive query with custom signal
   */
  createQuery<R = T>(
    query: MangoQuery<T>,
    signalName?: string
  ): Signal<R[]> {
    const querySignal = signal<R[]>([]);
    const key = signalName || `query_${Date.now()}`;
    
    const subscription = this.collection
      .find(query)
      .$.subscribe({
        next: (docs) => {
          querySignal.value = docs.map(doc => doc.toJSON() as R);
        },
        error: (err) => {
          this.error.value = err;
          console.error('RxDB query error:', err);
        }
      });
    
    this.subscriptions.set(key, subscription);
    return querySignal;
  }
  
  /**
   * CRUD Operations with optimistic updates
   */
  async create(data: Partial<T>): Promise<RxDocument<T> | null> {
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const doc = await this.collection.insert(data as T);
      return doc;
    } catch (err) {
      this.error.value = err as Error;
      console.error('Create error:', err);
      return null;
    } finally {
      this.loading.value = false;
    }
  }
  
  async update(id: string, updates: Partial<T>): Promise<boolean> {
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const doc = await this.collection.findOne(id).exec();
      if (doc) {
        await doc.patch(updates);
        return true;
      }
      return false;
    } catch (err) {
      this.error.value = err as Error;
      console.error('Update error:', err);
      return false;
    } finally {
      this.loading.value = false;
    }
  }
  
  async delete(id: string): Promise<boolean> {
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const doc = await this.collection.findOne(id).exec();
      if (doc) {
        await doc.remove();
        return true;
      }
      return false;
    } catch (err) {
      this.error.value = err as Error;
      console.error('Delete error:', err);
      return false;
    } finally {
      this.loading.value = false;
    }
  }
  
  async findById(id: string): Promise<T | null> {
    try {
      const doc = await this.collection.findOne(id).exec();
      return doc ? doc.toJSON() : null;
    } catch (err) {
      this.error.value = err as Error;
      return null;
    }
  }
  
  /**
   * Bulk operations
   */
  async bulkInsert(docs: T[]): Promise<number> {
    try {
      this.loading.value = true;
      const result = await this.collection.bulkInsert(docs);
      return result.success.length;
    } catch (err) {
      this.error.value = err as Error;
      return 0;
    } finally {
      this.loading.value = false;
    }
  }
  
  /**
   * Search functionality
   */
  search(searchTerm: string, fields: string[] = ['name']): Signal<T[]> {
    const searchQuery: MangoQuery<T> = {
      selector: {
        $or: fields.map(field => ({
          [field]: { $regex: new RegExp(searchTerm, 'i') }
        }))
      } as any
    };
    
    return this.createQuery(searchQuery, `search_${searchTerm}`);
  }
  
  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
  }
}

/**
 * Hook для використання RxDBSignalStore в React компонентах
 */
export function useRxDBStore<T>(collection: RxCollection<T>): RxDBSignalStore<T> {
  // В React компонентах можна використовувати useMemo для кешування
  return new RxDBSignalStore(collection);
}