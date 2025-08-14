import { Entity, EntityId, CollectionState, StoreFeature, CollectionMethods } from '../types';
import { createStoreFeature } from '../core/create-store-feature';

/**
 * Creates initial collection state
 */
export function createInitialCollectionState<T extends Entity>(): CollectionState<T> {
  return {
    entities: new Map<EntityId, T>(),
    ids: [],
    selectedId: null,
    selectedIds: new Set<EntityId>(),
    requestStatus: {
      status: 'idle',
      error: null,
    },
  };
}

/**
 * Feature for entity CRUD operations
 * Similar to NgRx withEntities
 */
export function withEntities<T extends Entity>(config?: {
  selectId?: (entity: T) => EntityId;
}): StoreFeature<CollectionState<T>, Partial<CollectionMethods<T>>> {
  const selectId = config?.selectId || ((entity: T) => entity.id);

  return createStoreFeature<CollectionState<T>, Partial<CollectionMethods<T>>>({
    initialState: createInitialCollectionState<T>(),
    
    computed: {
      // Array of all entities
      allEntities: (state) => Array.from(state.entities.values()),
      
      // Selected entity
      selectedEntity: (state) => 
        state.selectedId ? state.entities.get(state.selectedId) : undefined,
      
      // Multiple selected entities
      selectedEntities: (state) => 
        Array.from(state.selectedIds).map(id => state.entities.get(id)).filter(Boolean) as T[],
      
      // Count
      totalCount: (state) => state.entities.size,
      
      // Loading state
      isLoading: (state) => state.requestStatus.status === 'pending',
      
      // Error state
      hasError: (state) => state.requestStatus.status === 'error',
    },
    
    methods: (state, set) => ({
      // Add single entity
      addEntity: (entity: T) => {
        set((draft) => {
          const id = selectId(entity);
          draft.entities.set(id, entity);
          if (!draft.ids.includes(id)) {
            draft.ids.push(id);
          }
          return draft;
        });
      },
      
      // Add multiple entities
      addEntities: (entities: T[]) => {
        set((draft) => {
          entities.forEach(entity => {
            const id = selectId(entity);
            draft.entities.set(id, entity);
            if (!draft.ids.includes(id)) {
              draft.ids.push(id);
            }
          });
          return draft;
        });
      },
      
      // Update entity
      updateEntity: (id: EntityId, changes: Partial<T>) => {
        set((draft) => {
          const entity = draft.entities.get(id);
          if (entity) {
            draft.entities.set(id, { ...entity, ...changes });
          }
          return draft;
        });
      },
      
      // Update multiple entities
      updateEntities: (updates: Array<{ id: EntityId; changes: Partial<T> }>) => {
        set((draft) => {
          updates.forEach(({ id, changes }) => {
            const entity = draft.entities.get(id);
            if (entity) {
              draft.entities.set(id, { ...entity, ...changes });
            }
          });
          return draft;
        });
      },
      
      // Remove entity
      removeEntity: (id: EntityId) => {
        set((draft) => {
          draft.entities.delete(id);
          draft.ids = draft.ids.filter(entityId => entityId !== id);
          if (draft.selectedId === id) {
            draft.selectedId = null;
          }
          draft.selectedIds.delete(id);
          return draft;
        });
      },
      
      // Remove multiple entities
      removeEntities: (ids: EntityId[]) => {
        set((draft) => {
          ids.forEach(id => {
            draft.entities.delete(id);
            draft.selectedIds.delete(id);
          });
          draft.ids = draft.ids.filter(id => !ids.includes(id));
          if (draft.selectedId && ids.includes(draft.selectedId)) {
            draft.selectedId = null;
          }
          return draft;
        });
      },
      
      // Set all entities (replace)
      setAllEntities: (entities: T[]) => {
        set((draft) => {
          draft.entities.clear();
          draft.ids = [];
          entities.forEach(entity => {
            const id = selectId(entity);
            draft.entities.set(id, entity);
            draft.ids.push(id);
          });
          // Clear selection if selected entity doesn't exist anymore
          if (draft.selectedId && !draft.entities.has(draft.selectedId)) {
            draft.selectedId = null;
          }
          // Clear multi-selection for non-existing entities
          draft.selectedIds = new Set(
            Array.from(draft.selectedIds).filter(id => draft.entities.has(id))
          );
          return draft;
        });
      },
      
      // Clear all entities
      clearEntities: () => {
        set((draft) => {
          draft.entities.clear();
          draft.ids = [];
          draft.selectedId = null;
          draft.selectedIds.clear();
          return draft;
        });
      },
    }),
  });
}

/**
 * Feature for entity selection
 */
export function withSelection<T extends Entity>(): StoreFeature<
  CollectionState<T>,
  Pick<CollectionMethods<T>, 'selectEntity' | 'selectEntities' | 'toggleEntitySelection' | 'clearSelection'>
> {
  return createStoreFeature({
    methods: (state, set) => ({
      // Select single entity
      selectEntity: (id: EntityId) => {
        set((draft) => {
          draft.selectedId = id;
          return draft;
        });
      },
      
      // Select multiple entities
      selectEntities: (ids: EntityId[]) => {
        set((draft) => {
          draft.selectedIds = new Set(ids);
          return draft;
        });
      },
      
      // Toggle entity selection
      toggleEntitySelection: (id: EntityId) => {
        set((draft) => {
          if (draft.selectedIds.has(id)) {
            draft.selectedIds.delete(id);
          } else {
            draft.selectedIds.add(id);
          }
          return draft;
        });
      },
      
      // Clear selection
      clearSelection: () => {
        set((draft) => {
          draft.selectedId = null;
          draft.selectedIds.clear();
          return draft;
        });
      },
    }),
  });
}

/**
 * Feature for selecting first entity by default
 * Similar to NgRx selected-entity-with-first-default
 */
export function withFirstAsDefault<T extends Entity>(): StoreFeature<CollectionState<T>, {}> {
  return createStoreFeature({
    computed: {
      // Override selectedEntity to return first if none selected
      selectedEntityOrFirst: (state) => {
        if (state.selectedId) {
          return state.entities.get(state.selectedId);
        }
        // Return first entity if available
        const firstId = state.ids[0];
        return firstId ? state.entities.get(firstId) : undefined;
      },
    },
  });
}