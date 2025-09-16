# Universal Store Implementation Plan

## Overview
This document outlines the implementation plan for the Universal Store - a configuration-driven store architecture that eliminates the need for writing separate stores for each entity. Instead, stores are dynamically generated from app_config configurations.

## Related Documentation
- [Store Creation Guide](/Users/annaglova/projects/breedhub/docs/STORE_CREATION_GUIDE.md) - Current approach and future vision
- [Property-Based Config Architecture](/Users/annaglova/projects/breedhub/docs/PROPERTY_BASED_CONFIG_ARCHITECTURE.md) - Configuration system
- [Local-First Roadmap](/Users/annaglova/projects/breedhub/docs/LOCAL_FIRST_ROADMAP.md) - Phase 3: Universal Store Implementation

## Core Concept

Instead of creating individual stores for each entity:
```typescript
// OLD: Separate stores
class BreedStore { /* specific code */ }
class PetStore { /* specific code */ }
class ContactStore { /* specific code */ }
```

We will have a single Universal Store configured dynamically:
```typescript
// NEW: Universal Store
const breedStore = new UniversalStore(breedConfig);
const petStore = new UniversalStore(petConfig);
const contactStore = new UniversalStore(contactConfig);
```

## Architecture

### 1. Configuration Structure
Configurations from app_config will define everything:

```typescript
interface EntityConfig {
  // Basic Information
  id: string;
  collection: string;        // Supabase table name
  primaryKey: string;        // Usually 'id'
  
  // Fields Configuration
  fields: FieldConfig[];     // From fields configs in app_config
  
  // Store Features
  features: {
    softDelete: boolean;     // Use _deleted field
    sync: boolean;          // Enable Supabase sync
    versioning: boolean;    // Track versions
    audit: boolean;         // Track changes
    realtime: boolean;      // Enable real-time updates
  };
  
  // Sort Configuration
  sortConfig?: {
    fields: Array<{
      field: string;
      direction: 'asc' | 'desc';
      order: number;
    }>;
  };
  
  // Filter Configuration  
  filterConfig?: {
    fields: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
  
  // Business Logic Hooks
  hooks?: {
    beforeCreate?: (data: any) => any;
    afterCreate?: (data: any) => void;
    beforeUpdate?: (data: any) => any;
    afterUpdate?: (data: any) => void;
    beforeDelete?: (id: string) => boolean;
    afterDelete?: (id: string) => void;
  };
  
  // Computed Fields
  computed?: {
    [key: string]: (entity: any) => any;
  };
  
  // Validations
  validations?: ValidationRule[];
}
```

### 2. Universal Store Class

```typescript
class UniversalStore<T> {
  // Core properties
  private config: EntityConfig;
  private collection: RxCollection<T>;
  private supabase: SupabaseClient;
  
  // Reactive signals
  items = signal<Map<string, T>>(new Map());
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  syncEnabled = signal<boolean>(false);
  
  // Computed values
  itemsList = computed(() => {
    const itemsMap = this.items.value;
    return this.applySort(
      this.applyFilter(
        Array.from(itemsMap.values())
      )
    );
  });
  
  constructor(config: EntityConfig) {
    this.config = config;
    this.initialize();
  }
  
  // Initialization
  private async initialize() {
    await this.createRxDBSchema();
    await this.setupCollection();
    await this.setupSync();
    await this.loadInitialData();
    this.setupReactivity();
  }
  
  // Dynamic RxDB Schema Generation
  private createRxDBSchema() {
    return {
      version: 0,
      primaryKey: this.config.primaryKey,
      type: 'object',
      properties: this.generateSchemaProperties(),
      required: this.getRequiredFields(),
      indexes: this.getIndexedFields()
    };
  }
  
  // CRUD Operations (generated from config)
  async create(data: Partial<T>): Promise<T> {
    // Apply hooks
    if (this.config.hooks?.beforeCreate) {
      data = this.config.hooks.beforeCreate(data);
    }
    
    // Validate
    await this.validate(data);
    
    // Create in RxDB
    const doc = await this.collection.insert(data);
    
    // Sync to Supabase
    if (this.config.features.sync && this.syncEnabled.value) {
      await this.syncToSupabase(doc);
    }
    
    // After hook
    if (this.config.hooks?.afterCreate) {
      this.config.hooks.afterCreate(doc);
    }
    
    return doc;
  }
  
  // Similar for update, delete, query...
}
```

## Implementation Steps

### Phase 1: Core Universal Store (Week 1)

#### Day 1-2: Config Loader Service
```typescript
// packages/rxdb-store/src/services/config-loader.service.ts
export class ConfigLoaderService {
  async loadEntityConfig(entityName: string): Promise<EntityConfig> {
    // 1. Load from app_config table
    const configs = await supabase
      .from('app_config')
      .select('*')
      .or(`id.eq.${entityName}_fields,id.eq.${entityName}_sort,id.eq.${entityName}_filter`);
    
    // 2. Merge configurations
    return this.mergeConfigs(configs);
  }
  
  private mergeConfigs(configs: any[]): EntityConfig {
    // Combine fields, sort, filter configs into single EntityConfig
  }
}
```

#### Day 3-4: Universal Store Base Implementation
- Create UniversalStore class
- Implement dynamic schema generation
- Setup RxDB collection creation
- Basic CRUD operations

#### Day 5: Reactive State Management
- Signal-based state
- Computed values
- Auto-refresh on changes
- Subscription management

### Phase 2: Advanced Features (Week 2)

#### Day 1-2: Sort and Filter Implementation
- Apply sort configuration from override_data
- Dynamic filter application
- Support for multiple sort orders per field
- Complex filter operators

#### Day 3: Hooks and Validations
- Before/After hooks execution
- Field validations from properties
- Custom validation rules
- Error handling

#### Day 4: Computed Fields and Methods
- Dynamic computed field generation
- Custom methods injection
- Business logic execution

#### Day 5: Testing and Documentation
- Unit tests for Universal Store
- Integration tests with config
- Performance benchmarks
- Usage documentation

## Configuration Examples

### Minimal Breed Configuration
```javascript
{
  id: "breed-collection",
  type: "collection",
  data: {
    collection: "breed",
    primaryKey: "id",
    features: {
      softDelete: true,
      sync: true
    }
  },
  deps: ["breed-fields", "breed-sort"]
}
```

### Breed Fields Configuration
```javascript
{
  id: "breed-fields",
  type: "fields",
  data: {},
  deps: ["field:id", "field:name", "field:description", "field:created_at", "field:updated_at"],
  override_data: {
    "field:name": {
      required: true,
      validation: { maxLength: 255 }
    }
  }
}
```

### Breed Sort Configuration
```javascript
{
  id: "breed-sort",
  type: "sort",
  data: {},
  deps: ["field:name", "field:created_at"],
  override_data: {
    "field:name": {
      sortOrder: [
        { order: 1, direction: "asc", icon: "arrow-up", label: "A-Z" }
      ]
    },
    "field:created_at": {
      sortOrder: [
        { order: 2, direction: "desc", icon: "arrow-down", label: "Newest First" }
      ]
    }
  }
}
```

## Usage Example

```typescript
// Initialize Universal Store with config
const breedConfig = await configLoader.loadEntityConfig('breed');
const breedStore = new UniversalStore<Breed>(breedConfig);

// Use it like any other store
const breeds = breedStore.itemsList.value;
const loading = breedStore.loading.value;

// CRUD operations
await breedStore.create({ name: "Labrador", description: "Friendly dog" });
await breedStore.update(id, { name: "Golden Retriever" });
await breedStore.delete(id);

// Custom queries
const results = await breedStore.query({
  selector: { name: { $regex: 'Lab' } },
  sort: [{ name: 'asc' }]
});
```

## Benefits

1. **Zero-code for new entities** - Just configure, no coding
2. **Consistency** - All stores work the same way
3. **Maintainability** - One codebase to maintain
4. **Type Safety** - TypeScript generics ensure type safety
5. **Performance** - Optimizations apply to all stores
6. **Flexibility** - Easy to add new features globally
7. **Testing** - Test once, works everywhere

## Migration Strategy

### Step 1: Create Universal Store alongside existing stores
### Step 2: Test with one entity (breeds)
### Step 3: Gradually migrate other entities
### Step 4: Remove old individual stores

## Testing Plan

### Unit Tests
- Schema generation from config
- CRUD operations
- Hook execution
- Validation logic
- Sort/Filter application

### Integration Tests
- Config loading from app_config
- Supabase synchronization
- RxDB operations
- Real-time updates

### Performance Tests
- Load testing with 1000+ records
- Sync performance
- Query optimization
- Memory usage

## Next Steps

1. **Tomorrow**: Start with ConfigLoaderService implementation
2. **This Week**: Complete Phase 1 - Core Universal Store
3. **Next Week**: Add advanced features (Phase 2)
4. **Testing**: Comprehensive testing with breed entity
5. **Rollout**: Gradual migration of other entities

## Success Criteria

- ✅ Universal Store loads config from app_config
- ✅ Dynamic schema generation works
- ✅ CRUD operations function correctly
- ✅ Sort/Filter from config applied
- ✅ Hooks and validations work
- ✅ Sync with Supabase operational
- ✅ Performance meets requirements (<100ms operations)
- ✅ Zero code needed for new entities

## Notes

- Keep business logic in stores, NOT in components (critical principle)
- All configuration comes from app_config table
- Properties define field behavior
- Override_data customizes per context
- Cascade updates maintain consistency
- Universal Store adapts to any entity configuration