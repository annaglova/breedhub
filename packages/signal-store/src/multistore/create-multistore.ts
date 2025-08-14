/**
 * MultiStore Implementation
 * 
 * CRITICAL FOR AI: This is the main MultiStore implementation.
 * It combines all features into a single, unified store for all entity types.
 * Read MULTISTORE_ARCHITECTURE.md before making changes.
 */

import { createSignalStore } from '../create-signal-store';
import { withEntities } from '../features/with-entities';
import { withFiltering, withFilteredEntities } from '../features/with-filtering';
import { withRequestStatus } from '../features/with-request-status';
import { withRelationships } from './features/with-relationships';
import type { BaseEntity, AnyEntity, EntityType } from './types';
import { 
  validateEntity, 
  validateParentChild, 
  validateParentChange,
  ValidationError 
} from './validators';

/**
 * MultiStore state interface
 */
export interface MultiStoreState {
  // All entities stored by ID
  entities: Map<string, AnyEntity>;
  
  // Metadata for the store itself
  storeMetadata: {
    version: string;
    lastSync: Date | null;
    isDirty: boolean;
    entityCount: number;
  };
}

/**
 * MultiStore methods interface
 */
export interface MultiStoreMethods {
  // Entity CRUD operations
  addEntity: (entity: Partial<AnyEntity>) => void;
  updateEntity: (id: string, updates: Partial<AnyEntity>) => void;
  removeEntity: (id: string, cascade?: boolean) => void;
  getEntity: (id: string) => AnyEntity | undefined;
  
  // Batch operations
  addEntities: (entities: Partial<AnyEntity>[]) => void;
  updateEntities: (updates: Array<{ id: string; changes: Partial<AnyEntity> }>) => void;
  removeEntities: (ids: string[], cascade?: boolean) => void;
  
  // Query operations
  getEntitiesByType: (type: EntityType) => AnyEntity[];
  getEntitiesByParent: (parentId: string) => AnyEntity[];
  findEntities: (predicate: (entity: AnyEntity) => boolean) => AnyEntity[];
  
  // Hierarchy operations
  getHierarchy: (entityId: string) => HierarchyNode | undefined;
  moveEntity: (entityId: string, newParentId: string) => void;
  
  // Active entity management
  setActiveEntity: (entityId: string) => void;
  getActiveEntity: (type: EntityType) => AnyEntity | undefined;
  
  // Store operations
  clearStore: () => void;
  exportStore: () => string;
  importStore: (data: string) => void;
  
  // Validation
  validateStore: () => ValidationResult;
}

/**
 * Hierarchy node for tree representation
 */
export interface HierarchyNode {
  entity: AnyEntity;
  children: HierarchyNode[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Creates a MultiStore instance
 */
export function createMultiStore(name = 'multiStore') {
  // Create the base store with all features
  const useStore = createSignalStore<AnyEntity>(name, [
    withEntities<AnyEntity>(),
    withFiltering<AnyEntity>(),
    withFilteredEntities<AnyEntity>(),
    withRequestStatus(),
    withRelationships(),
  ]);
  
  return () => {
    const store = useStore();
    
    // Enhanced methods for MultiStore
    const multiStore = {
      ...store,
      
      // Override addEntity to include validation and relationship registration
      addEntity: (entity: Partial<AnyEntity>) => {
        // Generate ID if not provided
        if (!entity.id) {
          entity.id = generateEntityId(entity._type!);
        }
        
        // Add metadata if not present
        if (!entity._metadata) {
          entity._metadata = {
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          };
        }
        
        // Validate entity
        validateEntity(entity);
        
        // If entity has parent, validate parent exists and relationship is valid
        if (entity._parentId) {
          const parent = store.computed.entities.get(entity._parentId);
          if (!parent) {
            throw new ValidationError(
              `Parent entity ${entity._parentId} not found`,
              entity._type!,
              '_parentId',
              entity._parentId
            );
          }
          validateParentChild(parent._type, entity._type!);
        }
        
        // Add to store
        store.addEntity(entity as AnyEntity);
        
        // Register in relationships
        store.registerEntity(entity as BaseEntity);
        
        // Mark store as dirty
        markStoreDirty();
      },
      
      // Override updateEntity to include validation
      updateEntity: (id: string, updates: Partial<AnyEntity>) => {
        const existing = store.computed.entities.get(id);
        if (!existing) {
          throw new ValidationError(
            `Entity ${id} not found`,
            'unknown',
            'id',
            id
          );
        }
        
        // Prevent type changes
        if (updates._type && updates._type !== existing._type) {
          throw new ValidationError(
            'Cannot change entity type',
            existing._type,
            '_type',
            updates._type
          );
        }
        
        // Handle parent changes
        if (updates._parentId !== undefined && updates._parentId !== existing._parentId) {
          if (updates._parentId) {
            validateParentChange(existing, updates._parentId, store.computed.entities);
          }
          store.updateParent(id, updates._parentId);
        }
        
        // Update metadata
        updates._metadata = {
          ...existing._metadata,
          ...updates._metadata,
          updatedAt: new Date(),
          version: (existing._metadata?.version || 0) + 1,
        };
        
        // Validate updated entity
        const updated = { ...existing, ...updates };
        validateEntity(updated);
        
        // Apply update
        store.updateEntity(id, updates);
        
        // Mark store as dirty
        markStoreDirty();
      },
      
      // Override removeEntity to handle cascading deletes
      removeEntity: (id: string, cascade = true) => {
        const entity = store.computed.entities.get(id);
        if (!entity) return;
        
        if (cascade) {
          // Get all descendants
          const descendants = store.getDescendants(id);
          
          // Remove descendants first (bottom-up)
          descendants.reverse().forEach(descendantId => {
            store.removeEntity(descendantId);
            store.unregisterEntity(descendantId);
          });
        }
        
        // Remove the entity itself
        store.removeEntity(id);
        store.unregisterEntity(id);
        
        // Mark store as dirty
        markStoreDirty();
      },
      
      // Batch operations
      addEntities: (entities: Partial<AnyEntity>[]) => {
        // Sort by hierarchy level to ensure parents are added before children
        const sorted = sortEntitiesByHierarchy(entities);
        
        for (const entity of sorted) {
          multiStore.addEntity(entity);
        }
      },
      
      updateEntities: (updates: Array<{ id: string; changes: Partial<AnyEntity> }>) => {
        for (const { id, changes } of updates) {
          multiStore.updateEntity(id, changes);
        }
      },
      
      removeEntities: (ids: string[], cascade = true) => {
        for (const id of ids) {
          multiStore.removeEntity(id, cascade);
        }
      },
      
      // Query operations
      getEntity: (id: string) => {
        return store.computed.entities.get(id);
      },
      
      getEntitiesByType: (type: EntityType) => {
        const ids = store.getEntitiesByType(type);
        return ids.map(id => store.computed.entities.get(id)!).filter(Boolean);
      },
      
      getEntitiesByParent: (parentId: string) => {
        const childIds = store.getChildren(parentId);
        return childIds.map(id => store.computed.entities.get(id)!).filter(Boolean);
      },
      
      findEntities: (predicate: (entity: AnyEntity) => boolean) => {
        return Array.from(store.computed.entities.values()).filter(predicate);
      },
      
      // Hierarchy operations
      getHierarchy: (entityId: string): HierarchyNode | undefined => {
        const entity = store.computed.entities.get(entityId);
        if (!entity) return undefined;
        
        const children = store.getChildren(entityId);
        const childNodes = children
          .map(childId => multiStore.getHierarchy(childId))
          .filter(Boolean) as HierarchyNode[];
        
        return {
          entity,
          children: childNodes,
        };
      },
      
      moveEntity: (entityId: string, newParentId: string) => {
        const entity = store.computed.entities.get(entityId);
        if (!entity) {
          throw new ValidationError(
            `Entity ${entityId} not found`,
            'unknown',
            'id',
            entityId
          );
        }
        
        multiStore.updateEntity(entityId, { _parentId: newParentId });
      },
      
      // Active entity management
      setActiveEntity: (entityId: string) => {
        const entity = store.computed.entities.get(entityId);
        if (!entity) {
          throw new ValidationError(
            `Entity ${entityId} not found`,
            'unknown',
            'id',
            entityId
          );
        }
        
        store.setActive(entityId, entity._type);
      },
      
      getActiveEntity: (type: EntityType) => {
        const activeId = store.getActive(type);
        return activeId ? store.computed.entities.get(activeId) : undefined;
      },
      
      // Store operations
      clearStore: () => {
        store.setAllEntities([]);
        // Clear relationships
        store.computed.entities.forEach((entity) => {
          store.unregisterEntity(entity.id);
        });
        markStoreDirty();
      },
      
      exportStore: () => {
        const data = {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          entities: Array.from(store.computed.entities.values()),
        };
        return JSON.stringify(data, null, 2);
      },
      
      importStore: (data: string) => {
        try {
          const parsed = JSON.parse(data);
          
          // Validate version
          if (parsed.version !== '1.0.0') {
            throw new Error(`Unsupported version: ${parsed.version}`);
          }
          
          // Clear existing data
          multiStore.clearStore();
          
          // Import entities
          multiStore.addEntities(parsed.entities);
          
        } catch (error) {
          throw new Error(`Failed to import store: ${error}`);
        }
      },
      
      // Validation
      validateStore: (): ValidationResult => {
        const errors: ValidationError[] = [];
        const warnings: string[] = [];
        
        // Validate each entity
        store.computed.entities.forEach((entity) => {
          try {
            validateEntity(entity);
          } catch (error) {
            if (error instanceof ValidationError) {
              errors.push(error);
            }
          }
          
          // Check parent exists
          if (entity._parentId) {
            const parent = store.computed.entities.get(entity._parentId);
            if (!parent) {
              errors.push(
                new ValidationError(
                  `Parent ${entity._parentId} not found for entity ${entity.id}`,
                  entity._type,
                  '_parentId',
                  entity._parentId
                )
              );
            }
          }
        });
        
        // Check for orphaned relationships
        const registeredIds = new Set<string>();
        store.computed.entities.forEach(entity => {
          registeredIds.add(entity.id);
        });
        
        // Add warnings for common issues
        const workspaces = multiStore.getEntitiesByType('workspace');
        if (workspaces.length === 0) {
          warnings.push('No workspace found. Consider adding a default workspace.');
        }
        if (workspaces.length > 1) {
          warnings.push('Multiple workspaces found. Consider marking one as active.');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
    };
    
    // Helper to mark store as dirty (needs sync)
    const markStoreDirty = () => {
      // This would trigger sync logic
      // For now, just log
      console.debug('Store marked as dirty');
    };
    
    return multiStore;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generates a unique ID for an entity
 */
function generateEntityId(type: EntityType): string {
  const prefix = type.substring(0, 3);
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Sorts entities by hierarchy level (parents before children)
 */
function sortEntitiesByHierarchy(entities: Partial<AnyEntity>[]): Partial<AnyEntity>[] {
  const typeOrder: EntityType[] = [
    'workspace',
    'space',
    'view',
    'filter',
    'sort',
    'breed',
    'pet',
    'kennel',
    'contact',
  ];
  
  return entities.sort((a, b) => {
    const aIndex = typeOrder.indexOf(a._type!);
    const bIndex = typeOrder.indexOf(b._type!);
    return aIndex - bIndex;
  });
}

/**
 * Creates a default workspace if none exists
 */
export function createDefaultWorkspace(): Partial<AnyEntity> {
  return {
    _type: 'workspace',
    name: 'Default Workspace',
    visibility: 'public',
    permissions: {
      read: [],
      write: [],
      admin: [],
    },
    settings: {
      theme: 'light',
      locale: 'en-US',
    },
  } as any;
}

/**
 * Creates a default space for a collection type
 */
export function createDefaultSpace(
  workspaceId: string,
  collection: 'breeds' | 'pets' | 'kennels' | 'contacts'
): Partial<AnyEntity> {
  return {
    _type: 'space',
    _parentId: workspaceId,
    name: collection.charAt(0).toUpperCase() + collection.slice(1),
    collection,
    permissions: {
      inherit: true,
    },
  } as any;
}