# MultiStore Architecture Documentation

## For AI Agents: Critical Reading

**This document is designed for AI agents working on this codebase. Read this completely before making any changes to the MultiStore system.**

## Table of Contents
1. [Core Concept](#core-concept)
2. [Entity Types and Schemas](#entity-types-and-schemas)
3. [Hierarchy Rules](#hierarchy-rules)
4. [Operations Guide](#operations-guide)
5. [Validation and Safety](#validation-and-safety)
6. [Migration from Previous Architecture](#migration-from-previous-architecture)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

## Core Concept

The MultiStore is a **single, unified store** that manages all application state through typed entities. Instead of having separate stores for workspaces, spaces, views, and data, everything is an entity in one store.

```typescript
// OLD: Multiple stores with different interfaces
const workspaceStore = createWorkspaceStore();
const breedsStore = createSpaceStore<Breed>();
const viewStore = createViewStore();

// NEW: One store, multiple entity types
const multiStore = createMultiStore();
multiStore.addEntity({ _type: 'workspace', ... });
multiStore.addEntity({ _type: 'space', ... });
multiStore.addEntity({ _type: 'breed', ... });
```

## Entity Types and Schemas

### Base Entity Interface

**EVERY entity MUST have these fields:**

```typescript
interface BaseEntity {
  id: string;                    // Unique identifier
  _type: EntityType;             // Entity type discriminator
  _parentId?: string;            // Parent entity ID (for hierarchy)
  _metadata: {
    createdAt: Date;
    updatedAt: Date;
    syncedAt?: Date;
    version: number;
    tags?: string[];
  };
}
```

### Entity Type Definitions

```typescript
type EntityType = 
  | 'workspace'     // Top-level container
  | 'space'         // Collection container
  | 'view'          // Display configuration
  | 'filter'        // Filter configuration
  | 'sort'          // Sort configuration
  | 'breed'         // Data entity
  | 'pet'           // Data entity
  | 'kennel'        // Data entity
  | 'contact';      // Data entity
```

### Complete Entity Schemas

#### Workspace Entity
```typescript
interface WorkspaceEntity extends BaseEntity {
  _type: 'workspace';
  name: string;
  visibility: 'public' | 'private';
  owner?: string;
  permissions: {
    read: string[];   // User IDs
    write: string[];  // User IDs
    admin: string[];  // User IDs
  };
  settings: {
    defaultSpace?: string;
    theme?: 'light' | 'dark';
    locale?: string;
  };
}

// Example:
{
  id: 'ws_123',
  _type: 'workspace',
  name: 'My Breeding Business',
  visibility: 'private',
  _metadata: {
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: 1
  }
}
```

#### Space Entity
```typescript
interface SpaceEntity extends BaseEntity {
  _type: 'space';
  _parentId: string;  // MUST reference a workspace
  name: string;
  collection: 'breeds' | 'pets' | 'kennels' | 'contacts';
  icon?: string;
  color?: string;
  defaultView?: string;  // References a view entity
  permissions?: {
    inherit: boolean;  // Inherit from workspace
    overrides?: {
      read: string[];
      write: string[];
    };
  };
}
```

#### View Entity
```typescript
interface ViewEntity extends BaseEntity {
  _type: 'view';
  _parentId: string;  // MUST reference a space
  name: string;
  viewType: 'list' | 'grid' | 'table' | 'map' | 'calendar';
  viewMode: 'fullscreen' | 'drawer' | 'modal' | 'embedded';
  configuration: {
    // List view
    itemHeight?: number;
    showThumbnails?: boolean;
    
    // Grid view
    columns?: number;
    gap?: number;
    
    // Table view
    visibleColumns?: string[];
    columnWidths?: Record<string, number>;
    
    // Map view
    defaultZoom?: number;
    defaultCenter?: [number, number];
    
    // Calendar view
    defaultDate?: string;
    eventField?: string;
  };
  layout: {
    showFilters: boolean;
    showSearch: boolean;
    showSort: boolean;
    showPagination: boolean;
    showBulkActions: boolean;
  };
}
```

#### Filter Entity
```typescript
interface FilterEntity extends BaseEntity {
  _type: 'filter';
  _parentId: string;  // References a view
  name: string;
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 
            'gt' | 'gte' | 'lt' | 'lte' | 'between' |
            'in' | 'notIn' | 'isNull' | 'isNotNull';
  value: any;
  isActive: boolean;
  isUserDefined: boolean;  // vs system filter
}
```

#### Data Entities (Breed, Pet, Kennel, Contact)
```typescript
interface BreedEntity extends BaseEntity {
  _type: 'breed';
  _parentId: string;  // References a space with collection='breeds'
  name: string;
  origin: string;
  size: 'toy' | 'small' | 'medium' | 'large' | 'giant';
  temperament: string[];
  lifespan: string;
  description: string;
  imageUrl?: string;
  healthConcerns?: string[];
  exerciseNeeds: 'low' | 'moderate' | 'high' | 'very-high';
}

interface PetEntity extends BaseEntity {
  _type: 'pet';
  _parentId: string;  // References a space with collection='pets'
  name: string;
  breedId: string;    // References a breed entity
  birthDate: Date;
  gender: 'male' | 'female';
  status: 'available' | 'reserved' | 'sold' | 'retired';
  price?: number;
  ownerId?: string;   // References a contact entity
  kennelId?: string;  // References a kennel entity
  healthRecords?: {
    date: Date;
    type: string;
    description: string;
    vetId?: string;
  }[];
}
```

## Hierarchy Rules

### Strict Parent-Child Relationships

```
workspace
  └── space (collection='breeds')
        ├── view
        │     ├── filter
        │     └── sort
        └── breed (data)
  
  └── space (collection='pets')
        ├── view
        │     ├── filter
        │     └── sort
        └── pet (data)
```

### Validation Rules

1. **Parent Must Exist**: Before adding entity with `_parentId`, parent must exist
2. **Type Matching**: Parent-child types must be compatible
3. **No Orphans**: Deleting parent deletes all children (cascade)
4. **Single Parent**: Each entity has exactly one parent (except workspace)

## Operations Guide

### Adding Entities

```typescript
// ALWAYS validate before adding
const addEntity = (entity: BaseEntity) => {
  // 1. Validate entity schema
  validateEntitySchema(entity);
  
  // 2. Check parent exists (if _parentId provided)
  if (entity._parentId) {
    const parent = multiStore.getEntity(entity._parentId);
    if (!parent) throw new Error(`Parent ${entity._parentId} not found`);
    
    // 3. Validate parent-child relationship
    validateParentChild(parent._type, entity._type);
  }
  
  // 4. Add metadata
  entity._metadata = {
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...entity._metadata
  };
  
  // 5. Add to store
  multiStore.addEntity(entity);
};
```

### Querying Entities

```typescript
// Get all entities of a type
const getEntitiesByType = (type: EntityType) => {
  return multiStore.entities.filter(e => e._type === type);
};

// Get children of an entity
const getChildren = (parentId: string) => {
  return multiStore.entities.filter(e => e._parentId === parentId);
};

// Get full hierarchy
const getHierarchy = (entityId: string) => {
  const entity = multiStore.getEntity(entityId);
  const children = getChildren(entityId);
  const childrenWithHierarchy = children.map(child => 
    getHierarchy(child.id)
  );
  
  return {
    ...entity,
    children: childrenWithHierarchy
  };
};
```

### Updating Entities

```typescript
const updateEntity = (id: string, updates: Partial<BaseEntity>) => {
  // 1. Get existing entity
  const entity = multiStore.getEntity(id);
  if (!entity) throw new Error(`Entity ${id} not found`);
  
  // 2. Prevent type changes
  if (updates._type && updates._type !== entity._type) {
    throw new Error('Cannot change entity type');
  }
  
  // 3. Validate parent changes
  if (updates._parentId && updates._parentId !== entity._parentId) {
    validateParentChange(entity, updates._parentId);
  }
  
  // 4. Update metadata
  updates._metadata = {
    ...entity._metadata,
    updatedAt: new Date(),
    version: entity._metadata.version + 1
  };
  
  // 5. Apply update
  multiStore.updateEntity(id, updates);
};
```

### Deleting Entities

```typescript
const deleteEntity = (id: string, cascade = true) => {
  if (cascade) {
    // Delete all children first
    const children = getChildren(id);
    children.forEach(child => deleteEntity(child.id, true));
  }
  
  multiStore.removeEntity(id);
};
```

## Validation and Safety

### Schema Validators

```typescript
// Entity type validators (use Zod or similar in production)
const validators = {
  workspace: (entity: any) => {
    if (!entity.name) throw new Error('Workspace must have name');
    if (!['public', 'private'].includes(entity.visibility)) {
      throw new Error('Invalid visibility');
    }
  },
  
  space: (entity: any) => {
    if (!entity._parentId) throw new Error('Space must have parent workspace');
    if (!['breeds', 'pets', 'kennels', 'contacts'].includes(entity.collection)) {
      throw new Error('Invalid collection type');
    }
  },
  
  breed: (entity: any) => {
    if (!entity.name) throw new Error('Breed must have name');
    if (!['toy', 'small', 'medium', 'large', 'giant'].includes(entity.size)) {
      throw new Error('Invalid size');
    }
  }
  // ... more validators
};

const validateEntitySchema = (entity: BaseEntity) => {
  const validator = validators[entity._type];
  if (!validator) throw new Error(`No validator for type ${entity._type}`);
  validator(entity);
};
```

### Parent-Child Validation

```typescript
const parentChildRules: Record<EntityType, EntityType[]> = {
  workspace: ['space'],
  space: ['view', 'breed', 'pet', 'kennel', 'contact'],
  view: ['filter', 'sort'],
  filter: [],
  sort: [],
  breed: [],
  pet: [],
  kennel: [],
  contact: []
};

const validateParentChild = (parentType: EntityType, childType: EntityType) => {
  const allowedChildren = parentChildRules[parentType];
  if (!allowedChildren.includes(childType)) {
    throw new Error(`${parentType} cannot have ${childType} as child`);
  }
};
```

## Migration from Previous Architecture

### Mapping Old to New

```typescript
// Old architecture
const workspaceStore = createWorkspaceStore('workspace', 'public');
const breedsStore = createSpaceStore<Breed>('breeds', 'breeds');

// New architecture equivalent
multiStore.addEntity({
  id: 'ws_default',
  _type: 'workspace',
  name: 'Default Workspace',
  visibility: 'public',
  _metadata: { ... }
});

multiStore.addEntity({
  id: 'space_breeds',
  _type: 'space',
  _parentId: 'ws_default',
  name: 'Breeds',
  collection: 'breeds',
  _metadata: { ... }
});
```

### Migration Script Template

```typescript
const migrateToMultiStore = async () => {
  // 1. Create default workspace
  const workspaceId = 'ws_migrated';
  multiStore.addEntity({
    id: workspaceId,
    _type: 'workspace',
    name: 'Migrated Workspace',
    visibility: 'public',
    _metadata: { createdAt: new Date(), updatedAt: new Date(), version: 1 }
  });
  
  // 2. Migrate each space
  const spaces = ['breeds', 'pets', 'kennels', 'contacts'];
  for (const spaceName of spaces) {
    const spaceId = `space_${spaceName}`;
    multiStore.addEntity({
      id: spaceId,
      _type: 'space',
      _parentId: workspaceId,
      name: spaceName,
      collection: spaceName as any,
      _metadata: { createdAt: new Date(), updatedAt: new Date(), version: 1 }
    });
    
    // 3. Migrate data for this space
    const oldStore = getOldStore(spaceName);
    const entities = oldStore.getAllEntities();
    
    for (const entity of entities) {
      multiStore.addEntity({
        ...entity,
        _type: spaceName.slice(0, -1) as any, // 'breeds' -> 'breed'
        _parentId: spaceId,
        _metadata: { createdAt: new Date(), updatedAt: new Date(), version: 1 }
      });
    }
  }
};
```

## Common Patterns

### Pattern 1: Get Active Workspace and Space

```typescript
const getActiveContext = () => {
  // Get active workspace (usually only one)
  const workspace = multiStore.entities
    .find(e => e._type === 'workspace' && e.isActive);
  
  // Get active space in workspace
  const space = multiStore.entities
    .find(e => e._type === 'space' && 
           e._parentId === workspace.id && 
           e.isActive);
  
  // Get active view in space
  const view = multiStore.entities
    .find(e => e._type === 'view' && 
           e._parentId === space.id && 
           e.isActive);
  
  return { workspace, space, view };
};
```

### Pattern 2: Filtered Data Query

```typescript
const getFilteredData = (spaceId: string, filters: any[]) => {
  // Get all data entities in space
  let data = multiStore.entities
    .filter(e => e._parentId === spaceId && 
            ['breed', 'pet', 'kennel', 'contact'].includes(e._type));
  
  // Apply filters
  for (const filter of filters) {
    data = data.filter(item => 
      applyFilter(item, filter.field, filter.operator, filter.value)
    );
  }
  
  return data;
};
```

### Pattern 3: Batch Operations

```typescript
const batchAdd = (entities: BaseEntity[]) => {
  // Sort by hierarchy level (workspace -> space -> view -> data)
  const sorted = entities.sort((a, b) => {
    const order = ['workspace', 'space', 'view', 'filter', 'sort', 
                   'breed', 'pet', 'kennel', 'contact'];
    return order.indexOf(a._type) - order.indexOf(b._type);
  });
  
  // Add in order to ensure parents exist
  for (const entity of sorted) {
    addEntity(entity);
  }
};
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Parent not found"
```typescript
// Problem: Trying to add entity before parent
multiStore.addEntity({ _type: 'space', _parentId: 'ws_123', ... });
// Error: Parent ws_123 not found

// Solution: Ensure parent exists first
const parent = multiStore.getEntity('ws_123');
if (!parent) {
  // Create parent first
  multiStore.addEntity({ id: 'ws_123', _type: 'workspace', ... });
}
```

#### Issue: "Invalid parent-child relationship"
```typescript
// Problem: Wrong hierarchy
multiStore.addEntity({ 
  _type: 'breed', 
  _parentId: 'ws_123', // Workspace can't have breed as direct child
  ... 
});

// Solution: Create proper hierarchy
const spaceId = 'space_breeds';
multiStore.addEntity({ 
  id: spaceId,
  _type: 'space',
  _parentId: 'ws_123',
  collection: 'breeds',
  ...
});
multiStore.addEntity({ 
  _type: 'breed',
  _parentId: spaceId, // Now breed has proper parent
  ...
});
```

#### Issue: "Orphaned entities after deletion"
```typescript
// Problem: Deleted parent but children remain
multiStore.removeEntity('space_123');
// Now all breeds in that space are orphaned

// Solution: Use cascade delete
deleteEntity('space_123', true); // true = cascade delete children
```

## For Future AI Agents

When modifying this system:

1. **ALWAYS validate entity schemas** - Never trust input data
2. **ALWAYS check parent existence** - Prevent orphans
3. **ALWAYS update metadata** - Track versions and timestamps
4. **ALWAYS use transactions for batch operations** - Maintain consistency
5. **NEVER change entity types** - Create new, migrate, then delete
6. **NEVER break parent-child rules** - Hierarchy must be valid
7. **DOCUMENT new entity types** - Update this file immediately

Remember: The MultiStore is the single source of truth. Every piece of application state is an entity with a type, parent, and metadata. This uniformity makes the system predictable and maintainable.