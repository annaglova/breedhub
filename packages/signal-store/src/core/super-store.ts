import { Entity, SuperStore, SuperStoreConfig, CollectionState, FilterState, EntityId } from '../types';
import { createInitialCollectionState } from '../features/with-entities';
import { createInitialFilterState } from '../features/with-filtering';

/**
 * Super Store Factory - Creates hierarchical stores with parent-child relationships
 * Similar to NgRx super-store pattern
 */
export class SuperStoreFactory<T extends Entity = Entity> {
  private stores = new Map<string, SuperStore<T>>();
  private eventHandlers = new Map<string, Set<Function>>();

  /**
   * Create a new super store
   */
  createStore(config: SuperStoreConfig<T>): SuperStore<T> {
    // Check if store already exists
    if (this.stores.has(config.id)) {
      console.warn(`Store with id "${config.id}" already exists`);
      return this.stores.get(config.id)!;
    }

    // Create initial state
    const initialState = {
      ...createInitialCollectionState<T>(),
      ...createInitialFilterState<T>(),
    };

    // Create store instance
    const store: SuperStore<T> = {
      id: config.id,
      parentId: config.parentId,
      config,
      state: initialState,
      children: new Map(),
      parent: undefined,
    };

    // Set parent relationship
    if (config.parentId) {
      const parentStore = this.stores.get(config.parentId);
      if (parentStore) {
        store.parent = parentStore;
        parentStore.children.set(config.id, store);
      }
    }

    // Store in registry
    this.stores.set(config.id, store);

    // Create child stores if configured
    if (config.children) {
      config.children.forEach(childConfig => {
        this.createStore({
          ...childConfig,
          parentId: config.id,
        });
      });
    }

    // Emit store created event
    this.emit('store:created', { storeId: config.id, store });

    return store;
  }

  /**
   * Get store by ID
   */
  getStore(id: string): SuperStore<T> | undefined {
    return this.stores.get(id);
  }

  /**
   * Get all stores
   */
  getAllStores(): SuperStore<T>[] {
    return Array.from(this.stores.values());
  }

  /**
   * Get root stores (stores without parents)
   */
  getRootStores(): SuperStore<T>[] {
    return Array.from(this.stores.values()).filter(store => !store.parentId);
  }

  /**
   * Get store hierarchy as tree
   */
  getStoreTree(rootId?: string): SuperStore<T>[] {
    if (rootId) {
      const root = this.stores.get(rootId);
      return root ? [root] : [];
    }
    return this.getRootStores();
  }

  /**
   * Update store state
   */
  updateStore(id: string, updater: (state: CollectionState<T> & FilterState<T>) => void): void {
    const store = this.stores.get(id);
    if (!store) {
      console.error(`Store with id "${id}" not found`);
      return;
    }

    // Create draft state and apply updates
    const draft = { ...store.state };
    updater(draft);
    store.state = draft;

    // Emit update event
    this.emit('store:updated', { storeId: id, state: draft });

    // Propagate to children if needed
    this.propagateToChildren(id, draft);
  }

  /**
   * Propagate state changes to child stores
   */
  private propagateToChildren(parentId: string, parentState: any): void {
    const parentStore = this.stores.get(parentId);
    if (!parentStore) return;

    parentStore.children.forEach(childStore => {
      // Apply inheritance rules
      if (this.shouldInheritState(childStore.config)) {
        // Merge parent state with child state
        childStore.state = {
          ...childStore.state,
          // Inherit specific properties based on configuration
          ...(this.getInheritedState(parentState, childStore.config)),
        };

        // Recursively propagate to grandchildren
        this.propagateToChildren(childStore.id, childStore.state);
      }
    });
  }

  /**
   * Determine if child should inherit state from parent
   */
  private shouldInheritState(config: SuperStoreConfig<T>): boolean {
    // Can be configured per store
    return true; // Default: always inherit
  }

  /**
   * Get inherited state properties
   */
  private getInheritedState(parentState: any, childConfig: SuperStoreConfig<T>): any {
    // Define which properties to inherit
    // This can be customized based on requirements
    return {
      // Example: inherit filters but not entities
      filters: parentState.filters,
      sortBy: parentState.sortBy,
      sortOrder: parentState.sortOrder,
    };
  }

  /**
   * Clone a store (create a child with same config)
   */
  cloneStore(sourceId: string, newId: string, parentId?: string): SuperStore<T> | undefined {
    const sourceStore = this.stores.get(sourceId);
    if (!sourceStore) {
      console.error(`Source store with id "${sourceId}" not found`);
      return undefined;
    }

    const clonedConfig: SuperStoreConfig<T> = {
      ...sourceStore.config,
      id: newId,
      parentId: parentId || sourceStore.parentId,
    };

    return this.createStore(clonedConfig);
  }

  /**
   * Destroy a store and its children
   */
  destroyStore(id: string): void {
    const store = this.stores.get(id);
    if (!store) return;

    // Destroy children first
    store.children.forEach(childStore => {
      this.destroyStore(childStore.id);
    });

    // Remove from parent's children
    if (store.parent) {
      store.parent.children.delete(id);
    }

    // Remove from registry
    this.stores.delete(id);

    // Emit destroy event
    this.emit('store:destroyed', { storeId: id });
  }

  /**
   * Event emitter
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Subscribe to events
   */
  on(event: string, handler: Function): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Clear all stores
   */
  clear(): void {
    this.stores.clear();
    this.eventHandlers.clear();
  }
}

/**
 * Global super store factory instance
 */
export const superStoreFactory = new SuperStoreFactory();

/**
 * React hook for using super store
 */
export function useSuperStore<T extends Entity>(storeId: string) {
  const [store, setStore] = React.useState<SuperStore<T> | undefined>(
    () => superStoreFactory.getStore(storeId) as SuperStore<T>
  );

  React.useEffect(() => {
    // Subscribe to store updates
    const unsubscribe = superStoreFactory.on('store:updated', ({ storeId: id, state }) => {
      if (id === storeId) {
        setStore(prev => prev ? { ...prev, state } : undefined);
      }
    });

    return unsubscribe;
  }, [storeId]);

  const updateState = React.useCallback((updater: (state: CollectionState<T> & FilterState<T>) => void) => {
    superStoreFactory.updateStore(storeId, updater);
  }, [storeId]);

  return {
    store,
    updateState,
    factory: superStoreFactory,
  };
}

// Import React for hook
import * as React from 'react';