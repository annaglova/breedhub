import { signal, computed, Signal, ReadonlySignal } from '@preact/signals-react';
import { 
  RxCollection, 
  RxDocument, 
  MangoQuery,
  RxChangeEvent
} from 'rxdb';

/**
 * Base Collection Service Pattern inspired by ngx-odm
 * Provides unified CRUD interface with Signals integration
 */
export abstract class CollectionService<T> {
  // Reactive state with Signals
  protected _items = signal<T[]>([]);
  protected _loading = signal(false);
  protected _error = signal<Error | null>(null);
  protected _selectedId = signal<string | null>(null);
  
  // Public readonly signals
  readonly items: ReadonlySignal<T[]> = this._items;
  readonly loading: ReadonlySignal<boolean> = this._loading;
  readonly error: ReadonlySignal<Error | null> = this._error;
  readonly selectedId: ReadonlySignal<string | null> = this._selectedId;
  
  // Computed values
  readonly count = computed(() => this._items.value.length);
  readonly hasError = computed(() => this._error.value !== null);
  readonly isEmpty = computed(() => this._items.value.length === 0);
  readonly selectedItem = computed(() => 
    this._items.value.find((item: any) => item.id === this._selectedId.value) || null
  );
  
  // Subscription cleanup
  private subscriptions: Array<() => void> = [];
  
  constructor(protected collection: RxCollection<T>) {
    this.initializeSubscriptions();
  }
  
  /**
   * Initialize real-time subscriptions to collection changes
   */
  private initializeSubscriptions(): void {
    // Subscribe to all documents
    const sub = this.collection.find().$.subscribe({
      next: (docs) => {
        this._items.value = docs.map(doc => doc.toJSON());
        this._loading.value = false;
      },
      error: (err) => {
        this._error.value = err;
        this._loading.value = false;
      }
    });
    
    // Store subscription for cleanup
    this.subscriptions.push(() => sub.unsubscribe());
    
    // Listen to collection events for optimistic updates
    const changesSub = this.collection.$.subscribe((changeEvent: RxChangeEvent<T>) => {
      this.handleCollectionChange(changeEvent);
    });
    
    this.subscriptions.push(() => changesSub.unsubscribe());
  }
  
  /**
   * Handle collection change events for optimistic UI updates
   */
  protected handleCollectionChange(event: RxChangeEvent<T>): void {
    // Override in child classes for custom handling
    console.log('Collection change:', event.operation);
  }
  
  /**
   * Insert one or more documents
   */
  async insert(docs: T | T[]): Promise<void> {
    this._loading.value = true;
    this._error.value = null;
    
    try {
      const docsArray = Array.isArray(docs) ? docs : [docs];
      
      if (docsArray.length === 1) {
        await this.collection.insert(docsArray[0]);
      } else {
        await this.collection.bulkInsert(docsArray);
      }
    } catch (error) {
      this._error.value = error as Error;
      throw error;
    } finally {
      this._loading.value = false;
    }
  }
  
  /**
   * Update a document by ID
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    this._loading.value = true;
    this._error.value = null;
    
    try {
      const doc = await this.collection.findOne(id).exec();
      if (!doc) {
        throw new Error(`Document with id ${id} not found`);
      }
      
      await doc.patch(data);
    } catch (error) {
      this._error.value = error as Error;
      throw error;
    } finally {
      this._loading.value = false;
    }
  }
  
  /**
   * Delete a document by ID
   */
  async remove(id: string): Promise<void> {
    this._loading.value = true;
    this._error.value = null;
    
    try {
      const doc = await this.collection.findOne(id).exec();
      if (!doc) {
        throw new Error(`Document with id ${id} not found`);
      }
      
      await doc.remove();
    } catch (error) {
      this._error.value = error as Error;
      throw error;
    } finally {
      this._loading.value = false;
    }
  }
  
  /**
   * Find documents by query
   */
  async find(query?: MangoQuery<T>): Promise<T[]> {
    this._loading.value = true;
    this._error.value = null;
    
    try {
      const result = query 
        ? await this.collection.find(query).exec()
        : await this.collection.find().exec();
      
      return result.map(doc => doc.toJSON());
    } catch (error) {
      this._error.value = error as Error;
      throw error;
    } finally {
      this._loading.value = false;
    }
  }
  
  /**
   * Find one document by ID
   */
  async findOne(id: string): Promise<T | null> {
    this._loading.value = true;
    this._error.value = null;
    
    try {
      const doc = await this.collection.findOne(id).exec();
      return doc ? doc.toJSON() : null;
    } catch (error) {
      this._error.value = error as Error;
      throw error;
    } finally {
      this._loading.value = false;
    }
  }
  
  /**
   * Find documents and return as reactive signal
   */
  findReactive(query?: MangoQuery<T>): ReadonlySignal<T[]> {
    const result = signal<T[]>([]);
    
    const sub = query
      ? this.collection.find(query).$.subscribe(docs => {
          result.value = docs.map(doc => doc.toJSON());
        })
      : this.collection.find().$.subscribe(docs => {
          result.value = docs.map(doc => doc.toJSON());
        });
    
    this.subscriptions.push(() => sub.unsubscribe());
    
    return result;
  }
  
  /**
   * Get document count
   */
  async getCount(query?: MangoQuery<T>): Promise<number> {
    try {
      const result = query 
        ? await this.collection.find(query).exec()
        : await this.collection.find().exec();
      
      return result.length;
    } catch (error) {
      this._error.value = error as Error;
      return 0;
    }
  }
  
  /**
   * Select an item by ID
   */
  select(id: string | null): void {
    this._selectedId.value = id;
  }
  
  /**
   * Clear selection
   */
  clearSelection(): void {
    this._selectedId.value = null;
  }
  
  /**
   * Clear all errors
   */
  clearError(): void {
    this._error.value = null;
  }
  
  /**
   * Reset the service state
   */
  reset(): void {
    this._items.value = [];
    this._loading.value = false;
    this._error.value = null;
    this._selectedId.value = null;
  }
  
  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];
    this.reset();
  }
}

/**
 * Factory function to create typed collection services
 */
export function createCollectionService<T>(
  collection: RxCollection<T>
): CollectionService<T> {
  return new class extends CollectionService<T> {
    constructor() {
      super(collection);
    }
  }();
}