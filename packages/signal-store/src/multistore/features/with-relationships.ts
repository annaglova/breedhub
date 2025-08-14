/**
 * Relationships Feature for MultiStore
 * 
 * CRITICAL FOR AI: This feature manages parent-child relationships between entities.
 * It provides methods to navigate the hierarchy and maintain referential integrity.
 */

import { createStoreFeature } from '../../core/create-store-feature';
import type { StoreFeature } from '../../types';
import type { BaseEntity, EntityType } from '../types';
import { PARENT_CHILD_RULES, validateParentChild } from '../validators';

export interface RelationshipsState {
  // Maps for fast lookups
  childrenMap: Map<string, Set<string>>;     // parentId -> Set of childIds
  parentMap: Map<string, string>;            // childId -> parentId
  typeMap: Map<EntityType, Set<string>>;     // entityType -> Set of entityIds
  
  // Active entity tracking
  activeByType: Map<EntityType, string>;     // entityType -> active entityId
}

export interface RelationshipMethods {
  // Relationship management
  registerEntity: (entity: BaseEntity) => void;
  unregisterEntity: (entityId: string) => void;
  updateParent: (entityId: string, newParentId: string | undefined) => void;
  
  // Queries
  getChildren: (parentId: string) => string[];
  getParent: (entityId: string) => string | undefined;
  getSiblings: (entityId: string) => string[];
  getAncestors: (entityId: string) => string[];
  getDescendants: (entityId: string) => string[];
  getEntitiesByType: (type: EntityType) => string[];
  
  // Hierarchy navigation
  getPath: (entityId: string) => string[];
  getDepth: (entityId: string) => number;
  isAncestor: (ancestorId: string, descendantId: string) => boolean;
  isDescendant: (descendantId: string, ancestorId: string) => boolean;
  
  // Active entity management
  setActive: (entityId: string, type: EntityType) => void;
  getActive: (type: EntityType) => string | undefined;
  clearActive: (type: EntityType) => void;
  
  // Validation
  canSetParent: (entityId: string, newParentId: string, entities: Map<string, BaseEntity>) => boolean;
  wouldCreateCycle: (entityId: string, newParentId: string) => boolean;
}

/**
 * Feature for managing entity relationships and hierarchy
 */
export function withRelationships(): StoreFeature<RelationshipsState, RelationshipMethods> {
  return createStoreFeature({
    initialState: {
      childrenMap: new Map(),
      parentMap: new Map(),
      typeMap: new Map(),
      activeByType: new Map(),
    },
    
    computed: {
      // Get root entities (no parent)
      rootEntities: (state) => {
        const roots: string[] = [];
        state.typeMap.forEach((ids, type) => {
          if (type === 'workspace') {
            roots.push(...ids);
          }
        });
        return roots;
      },
      
      // Get all leaf entities (no children)
      leafEntities: (state) => {
        const leaves: string[] = [];
        state.parentMap.forEach((parentId, childId) => {
          const children = state.childrenMap.get(childId);
          if (!children || children.size === 0) {
            leaves.push(childId);
          }
        });
        return leaves;
      },
      
      // Get entity count by type
      entityCountByType: (state) => {
        const counts: Record<EntityType, number> = {} as any;
        state.typeMap.forEach((ids, type) => {
          counts[type] = ids.size;
        });
        return counts;
      },
      
      // Get active workspace
      activeWorkspace: (state) => state.activeByType.get('workspace'),
      
      // Get active space
      activeSpace: (state) => state.activeByType.get('space'),
      
      // Get active view
      activeView: (state) => state.activeByType.get('view'),
    },
    
    methods: (state, set, get) => ({
      // Register a new entity in the relationship maps
      registerEntity: (entity: BaseEntity) => {
        set((draft) => {
          // Add to type map
          if (!draft.typeMap.has(entity._type)) {
            draft.typeMap.set(entity._type, new Set());
          }
          draft.typeMap.get(entity._type)!.add(entity.id);
          
          // Add to parent/children maps if has parent
          if (entity._parentId) {
            // Add to parent map
            draft.parentMap.set(entity.id, entity._parentId);
            
            // Add to children map
            if (!draft.childrenMap.has(entity._parentId)) {
              draft.childrenMap.set(entity._parentId, new Set());
            }
            draft.childrenMap.get(entity._parentId)!.add(entity.id);
          }
          
          return draft;
        });
      },
      
      // Unregister an entity from relationship maps
      unregisterEntity: (entityId: string) => {
        set((draft) => {
          // Get entity type from type map
          let entityType: EntityType | undefined;
          draft.typeMap.forEach((ids, type) => {
            if (ids.has(entityId)) {
              entityType = type;
              ids.delete(entityId);
            }
          });
          
          // Remove from parent map and update children map
          const parentId = draft.parentMap.get(entityId);
          if (parentId) {
            draft.parentMap.delete(entityId);
            draft.childrenMap.get(parentId)?.delete(entityId);
          }
          
          // Remove as parent from children map
          draft.childrenMap.delete(entityId);
          
          // Clear active if this was active
          if (entityType && draft.activeByType.get(entityType) === entityId) {
            draft.activeByType.delete(entityType);
          }
          
          return draft;
        });
      },
      
      // Update parent relationship
      updateParent: (entityId: string, newParentId: string | undefined) => {
        set((draft) => {
          const oldParentId = draft.parentMap.get(entityId);
          
          // Remove from old parent's children
          if (oldParentId) {
            draft.childrenMap.get(oldParentId)?.delete(entityId);
          }
          
          // Update parent map
          if (newParentId) {
            draft.parentMap.set(entityId, newParentId);
            
            // Add to new parent's children
            if (!draft.childrenMap.has(newParentId)) {
              draft.childrenMap.set(newParentId, new Set());
            }
            draft.childrenMap.get(newParentId)!.add(entityId);
          } else {
            draft.parentMap.delete(entityId);
          }
          
          return draft;
        });
      },
      
      // Get direct children of an entity
      getChildren: (parentId: string) => {
        const currentState = get();
        return Array.from(currentState.childrenMap.get(parentId) || []);
      },
      
      // Get parent of an entity
      getParent: (entityId: string) => {
        const currentState = get();
        return currentState.parentMap.get(entityId);
      },
      
      // Get siblings (entities with same parent)
      getSiblings: (entityId: string) => {
        const currentState = get();
        const parentId = currentState.parentMap.get(entityId);
        if (!parentId) return [];
        
        const siblings = Array.from(currentState.childrenMap.get(parentId) || []);
        return siblings.filter(id => id !== entityId);
      },
      
      // Get all ancestors (parent, grandparent, etc.)
      getAncestors: (entityId: string) => {
        const ancestors: string[] = [];
        let currentId = entityId;
        
        while (true) {
          const parentId = get().parentMap.get(currentId);
          if (!parentId) break;
          
          ancestors.push(parentId);
          currentId = parentId;
          
          // Prevent infinite loop in case of circular reference
          if (ancestors.length > 100) {
            console.error('Possible circular reference detected');
            break;
          }
        }
        
        return ancestors;
      },
      
      // Get all descendants (children, grandchildren, etc.)
      getDescendants: (entityId: string) => {
        const descendants: string[] = [];
        const queue = [entityId];
        const visited = new Set<string>();
        
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          
          // Skip if already visited (prevent cycles)
          if (visited.has(currentId)) continue;
          visited.add(currentId);
          
          const children = get().childrenMap.get(currentId);
          if (children) {
            const childArray = Array.from(children);
            descendants.push(...childArray);
            queue.push(...childArray);
          }
        }
        
        return descendants;
      },
      
      // Get all entities of a specific type
      getEntitiesByType: (type: EntityType) => {
        return Array.from(get().typeMap.get(type) || []);
      },
      
      // Get path from root to entity
      getPath: (entityId: string) => {
        const path = [entityId];
        let currentId = entityId;
        
        while (true) {
          const parentId = get().parentMap.get(currentId);
          if (!parentId) break;
          
          path.unshift(parentId);
          currentId = parentId;
          
          // Prevent infinite loop
          if (path.length > 100) {
            console.error('Possible circular reference detected');
            break;
          }
        }
        
        return path;
      },
      
      // Get depth in hierarchy (0 for root)
      getDepth: (entityId: string) => {
        let depth = 0;
        let currentId = entityId;
        
        while (true) {
          const parentId = get().parentMap.get(currentId);
          if (!parentId) break;
          
          depth++;
          currentId = parentId;
          
          // Prevent infinite loop
          if (depth > 100) {
            console.error('Possible circular reference detected');
            return -1;
          }
        }
        
        return depth;
      },
      
      // Check if one entity is ancestor of another
      isAncestor: (ancestorId: string, descendantId: string) => {
        let currentId = descendantId;
        
        while (true) {
          const parentId = get().parentMap.get(currentId);
          if (!parentId) return false;
          if (parentId === ancestorId) return true;
          
          currentId = parentId;
          
          // Prevent infinite loop
          const depth = state.getDepth(currentId);
          if (depth === -1) return false;
        }
      },
      
      // Check if one entity is descendant of another
      isDescendant: (descendantId: string, ancestorId: string) => {
        return state.isAncestor(ancestorId, descendantId);
      },
      
      // Set active entity for a type
      setActive: (entityId: string, type: EntityType) => {
        set((draft) => {
          draft.activeByType.set(type, entityId);
          return draft;
        });
      },
      
      // Get active entity for a type
      getActive: (type: EntityType) => {
        return get().activeByType.get(type);
      },
      
      // Clear active entity for a type
      clearActive: (type: EntityType) => {
        set((draft) => {
          draft.activeByType.delete(type);
          return draft;
        });
      },
      
      // Check if parent can be set without violating rules
      canSetParent: (entityId: string, newParentId: string, entities: Map<string, BaseEntity>) => {
        const entity = entities.get(entityId);
        const newParent = entities.get(newParentId);
        
        if (!entity || !newParent) return false;
        
        // Check parent-child type compatibility
        try {
          validateParentChild(newParent._type, entity._type);
        } catch {
          return false;
        }
        
        // Check for circular reference
        if (state.wouldCreateCycle(entityId, newParentId)) {
          return false;
        }
        
        return true;
      },
      
      // Check if setting parent would create a cycle
      wouldCreateCycle: (entityId: string, newParentId: string) => {
        // Check if newParentId is a descendant of entityId
        return state.isDescendant(newParentId, entityId);
      },
    }),
  });
}