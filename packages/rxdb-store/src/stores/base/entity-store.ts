import { signal, computed, batch, Signal, ReadonlySignal } from '@preact/signals-react';

/**
 * Base EntityStore class implementing the Entity Management pattern
 * Similar to NgRx withEntities feature
 * 
 * @template T - Entity type that must have an id property
 */
export class EntityStore<T extends { id: string }> {
  // Core state - normalized storage
  protected ids = signal<string[]>([]);
  protected entities = signal<Map<string, T>>(new Map());
  
  // Loading and error states
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  // Computed values for easy access
  /**
   * Get all entities as a Map
   */
  entityMap: ReadonlySignal<Map<string, T>> = computed(() => this.entities.value);
  
  /**
   * Get all entities as an array
   */
  entityList: ReadonlySignal<T[]> = computed(() => 
    this.ids.value
      .map(id => this.entities.value.get(id))
      .filter((entity): entity is T => entity !== undefined)
  );
  
  /**
   * Get total count of entities
   */
  total: ReadonlySignal<number> = computed(() => this.ids.value.length);
  
  /**
   * Check if store has any entities
   */
  isEmpty: ReadonlySignal<boolean> = computed(() => this.ids.value.length === 0);
  
  // Entity Management Methods (withEntities pattern)
  
  /**
   * Replace all entities with new ones
   */
  setAll(entities: T[]): void {
    batch(() => {
      const newEntities = new Map<string, T>();
      const newIds: string[] = [];
      
      entities.forEach(entity => {
        if (entity && entity.id) {
          newEntities.set(entity.id, entity);
          newIds.push(entity.id);
        }
      });
      
      this.entities.value = newEntities;
      this.ids.value = newIds;
    });
  }
  
  /**
   * Set a single entity (replaces all others)
   */
  setOne(entity: T): void {
    if (!entity || !entity.id) return;
    
    batch(() => {
      this.entities.value = new Map([[entity.id, entity]]);
      this.ids.value = [entity.id];
    });
  }
  
  /**
   * Add a single entity
   */
  addOne(entity: T): void {
    if (!entity || !entity.id) return;
    
    batch(() => {
      const newEntities = new Map(this.entities.value);
      newEntities.set(entity.id, entity);
      
      this.entities.value = newEntities;
      
      if (!this.ids.value.includes(entity.id)) {
        this.ids.value = [...this.ids.value, entity.id];
      }
    });
  }
  
  /**
   * Add multiple entities
   */
  addMany(entities: T[]): void {
    if (!entities || entities.length === 0) return;
    
    batch(() => {
      const newEntities = new Map(this.entities.value);
      const newIds = [...this.ids.value];
      
      entities.forEach(entity => {
        if (entity && entity.id && !newEntities.has(entity.id)) {
          newEntities.set(entity.id, entity);
          newIds.push(entity.id);
        }
      });
      
      this.entities.value = newEntities;
      this.ids.value = newIds;
    });
  }
  
  /**
   * Update a single entity
   */
  updateOne(id: string, changes: Partial<T>): void {
    const entity = this.entities.value.get(id);
    if (!entity) return;
    
    const newEntities = new Map(this.entities.value);
    newEntities.set(id, { ...entity, ...changes });
    this.entities.value = newEntities;
  }
  
  /**
   * Update multiple entities
   */
  updateMany(updates: Array<{ id: string; changes: Partial<T> }>): void {
    if (!updates || updates.length === 0) return;
    
    batch(() => {
      const newEntities = new Map(this.entities.value);
      
      updates.forEach(({ id, changes }) => {
        const entity = newEntities.get(id);
        if (entity) {
          newEntities.set(id, { ...entity, ...changes });
        }
      });
      
      this.entities.value = newEntities;
    });
  }
  
  /**
   * Upsert a single entity (update if exists, add if not)
   */
  upsertOne(entity: T): void {
    if (!entity || !entity.id) return;
    
    batch(() => {
      const newEntities = new Map(this.entities.value);
      const exists = newEntities.has(entity.id);
      
      newEntities.set(entity.id, entity);
      this.entities.value = newEntities;
      
      if (!exists) {
        this.ids.value = [...this.ids.value, entity.id];
      }
    });
  }
  
  /**
   * Upsert multiple entities
   */
  upsertMany(entities: T[]): void {
    if (!entities || entities.length === 0) return;
    
    batch(() => {
      const newEntities = new Map(this.entities.value);
      const newIds = [...this.ids.value];
      
      entities.forEach(entity => {
        if (entity && entity.id) {
          const exists = newEntities.has(entity.id);
          newEntities.set(entity.id, entity);
          
          if (!exists) {
            newIds.push(entity.id);
          }
        }
      });
      
      this.entities.value = newEntities;
      this.ids.value = newIds;
    });
  }
  
  /**
   * Remove a single entity
   */
  removeOne(id: string): void {
    batch(() => {
      const newEntities = new Map(this.entities.value);
      newEntities.delete(id);
      
      this.entities.value = newEntities;
      this.ids.value = this.ids.value.filter(existingId => existingId !== id);
    });
  }
  
  /**
   * Remove multiple entities
   */
  removeMany(ids: string[]): void {
    if (!ids || ids.length === 0) return;
    
    batch(() => {
      const newEntities = new Map(this.entities.value);
      ids.forEach(id => newEntities.delete(id));
      
      this.entities.value = newEntities;
      this.ids.value = this.ids.value.filter(id => !ids.includes(id));
    });
  }
  
  /**
   * Remove all entities
   */
  removeAll(): void {
    batch(() => {
      this.entities.value = new Map();
      this.ids.value = [];
    });
  }
  
  // Selector methods
  
  /**
   * Select entity by ID
   */
  selectById(id: string): T | undefined {
    return this.entities.value.get(id);
  }
  
  /**
   * Select multiple entities by IDs
   */
  selectByIds(ids: string[]): T[] {
    return ids
      .map(id => this.entities.value.get(id))
      .filter((entity): entity is T => entity !== undefined);
  }
  
  /**
   * Select entities matching a predicate
   */
  selectWhere(predicate: (entity: T) => boolean): T[] {
    return this.entityList.value.filter(predicate);
  }
  
  /**
   * Check if entity exists
   */
  hasEntity(id: string): boolean {
    return this.entities.value.has(id);
  }
  
  // Utility methods
  
  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.loading.value = loading;
  }
  
  /**
   * Set error state
   */
  setError(error: string | null): void {
    this.error.value = error;
  }
  
  /**
   * Clear error state
   */
  clearError(): void {
    this.error.value = null;
  }
  
  /**
   * Reset store to initial state
   */
  reset(): void {
    batch(() => {
      this.removeAll();
      this.loading.value = false;
      this.error.value = null;
    });
  }
}

// Export type for convenience
export type EntityStoreInstance<T extends { id: string }> = EntityStore<T>;