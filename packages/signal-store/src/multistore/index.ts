/**
 * MultiStore Public API
 * 
 * CRITICAL FOR AI: This is the public API for the MultiStore system.
 * All MultiStore functionality should be accessed through these exports.
 */

// Core exports
export { createMultiStore, createDefaultWorkspace, createDefaultSpace } from './create-multistore';
export type { MultiStoreState, MultiStoreMethods, HierarchyNode, ValidationResult } from './create-multistore';

// Type exports
export * from './types';

// Validator exports
export { 
  validateEntity,
  validateEntities,
  validateParentChild,
  validateParentChange,
  ValidationError,
  PARENT_CHILD_RULES,
  REQUIRES_PARENT
} from './validators';

// Feature exports
export { withRelationships } from './features/with-relationships';
export type { RelationshipsState, RelationshipMethods } from './features/with-relationships';