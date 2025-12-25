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

  // Server metadata
  totalFromServer = signal<number | null>(null); // Total count from Supabase

  // Selection state
  protected selectedId = signal<string | null>(null);
  
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
  
  /**
   * Get currently selected entity
   */
  selectedEntity: ReadonlySignal<T | null> = computed(() => {
    const id = this.selectedId.value;
    return id ? this.entities.value.get(id) || null : null;
  });
  
  /**
   * Check if any entity is selected
   */
  hasSelection: ReadonlySignal<boolean> = computed(() => this.selectedId.value !== null);
  
  // Entity Management Methods (withEntities pattern)
  
  /**
   * Replace all entities with new ones
   */
  setAll(entities: T[], autoSelectFirst = false): void {
    console.log(`[EntityStore] setAll called with ${entities.length} entities`);

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
      
      // Auto-select first entity if requested and no current selection
      if (autoSelectFirst && newIds.length > 0 && !this.selectedId.value) {
        this.selectedId.value = newIds[0];
      }
      // Clear selection if selected entity was removed
      else if (this.selectedId.value && !newEntities.has(this.selectedId.value)) {
        this.selectedId.value = null;
      }
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

    const alreadyExists = this.ids.value.includes(entity.id);
    if (alreadyExists) {
      return;
    }

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
   * Set total count from server (from replication metadata)
   */
  setTotalFromServer(total: number): void {
    this.totalFromServer.value = total;
  }

  /**
   * Initialize totalFromServer from localStorage cache (synchronous)
   * Called immediately on EntityStore creation for instant UI feedback
   */
  initTotalFromCache(entityType: string): void {
    const TOTAL_COUNT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
    try {
      const cached = localStorage.getItem(`totalCount_${entityType}`);
      if (cached) {
        // Try JSON format first (new format with TTL)
        try {
          const parsed = JSON.parse(cached);
          if (typeof parsed === 'object' && parsed.value && parsed.timestamp) {
            const age = Date.now() - parsed.timestamp;
            if (age < TOTAL_COUNT_TTL_MS && parsed.value > 0) {
              this.totalFromServer.value = parsed.value;
              console.log(`[EntityStore-${entityType}] ⚡ Instant totalFromServer from cache: ${parsed.value} (age: ${Math.round(age / 1000 / 60 / 60)}h)`);
              return;
            }
            // Cache expired - don't use it
            console.log(`[EntityStore-${entityType}] ⏰ Cache expired, will fetch fresh`);
            return;
          }
        } catch {
          // Legacy format (plain number string) - migrate it
          const count = parseInt(cached, 10);
          if (!isNaN(count) && count > 0) {
            const cacheData = { value: count, timestamp: Date.now() };
            localStorage.setItem(`totalCount_${entityType}`, JSON.stringify(cacheData));
            this.totalFromServer.value = count;
            console.log(`[EntityStore-${entityType}] ⚡ Migrated legacy cache: ${count}`);
          }
        }
      }
    } catch (e) {
      console.warn(`[EntityStore-${entityType}] Failed to read cache:`, e);
    }
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
      
      // Clear selection if the removed entity was selected
      if (this.selectedId.value === id) {
        this.selectedId.value = null;
      }
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
      
      // Clear selection if the selected entity was removed
      if (this.selectedId.value && ids.includes(this.selectedId.value)) {
        this.selectedId.value = null;
      }
    });
  }
  
  /**
   * Remove all entities
   */
  removeAll(): void {
    batch(() => {
      this.entities.value = new Map();
      this.ids.value = [];
      this.selectedId.value = null;
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
      this.selectedId.value = null;
    });
  }
  
  // Selection methods
  
  /**
   * Select an entity by ID
   *
   * Note: Sets selectedId even if entity is not yet loaded in the store.
   * This allows selecting entities from pretty URLs (SlugResolver) before
   * the entity data is fetched. The UI will render the entity once it loads.
   */
  selectEntity(id: string | null): void {
    if (id === null) {
      this.selectedId.value = null;
      return;
    }

    // Always set selectedId - entity may not be loaded yet (e.g., from pretty URL)
    // The UI will display the entity once it's fetched
    this.selectedId.value = id;
  }
  
  /**
   * Select the first entity in the list
   */
  selectFirst(): void {
    const firstId = this.ids.value[0];
    if (firstId) {
      this.selectedId.value = firstId;
    }
  }
  
  /**
   * Select the last entity in the list
   */
  selectLast(): void {
    const lastId = this.ids.value[this.ids.value.length - 1];
    if (lastId) {
      this.selectedId.value = lastId;
    }
  }
  
  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectedId.value = null;
  }
  
  /**
   * Get the currently selected entity ID
   */
  getSelectedId(): string | null {
    return this.selectedId.value;
  }
}

// Export type for convenience
export type EntityStoreInstance<T extends { id: string }> = EntityStore<T>;