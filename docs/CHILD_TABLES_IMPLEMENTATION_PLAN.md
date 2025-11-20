# Child Tables Implementation Plan

## Overview

This document outlines the phased implementation plan for child tables support in the BreedHub application. Child tables (e.g., breed_division, breed_in_kennel) are loaded on-demand for specific entities with quantity limits determined by page configuration.

**IMPORTANT CLARIFICATION**: Tabs in UI can display TWO types of data:
1. **Child tables** (breed_division, breed_in_kennel) - records that belong to parent entity
2. **Main entities with filter** (Top Kennels, Top Pets) - main entity records filtered by parent

This plan focuses on **child tables infrastructure**. Main entity filtering uses existing SpaceStore collections with query filters. Tab configuration strategy will be defined during Phase 4 (UI Integration).

## Architecture Decisions

### Storage Strategy: Variant C - Per-Entity Child Collections

- **breed_children** - All child records for breed entities
- **pet_children** - All child records for pet entities
- **kennel_children** - All child records for kennel entities
- **Total ObjectStores**: 25-35 (within browser ~100 limit)

### Union Schema Structure

```typescript
{
  // Meta fields for identification
  _table_type: 'breed_division' | 'breed_in_kennel' | 'litter' | ...,
  _parent_id: string,  // Reference to parent breed/pet/kennel

  // Explicit fields from all possible child tables
  // breed_division fields
  division_id?: string,
  division_name?: string,

  // breed_in_kennel fields
  kennel_id?: string,
  kennel_name?: string,

  // litter fields
  dam_id?: string,
  sire_id?: string,
  birth_date?: string,

  // ... more fields
}
```

### Store Architecture

**SpaceStore** handles both main and child entities:
- No separate ChildStore (avoids circular dependencies)
- Universal CRUD methods work for all entity types
- Dynamic collection creation on-demand
- Configuration-driven approach

## Configuration Structure

### 1. Extension Config (Space-Level)

**Location**: `apps/config-admin/src/data/entities/extensions/breed_children.json`

Defines available child table schemas for breed entities:

```json
{
  "entity": "breed",
  "childCollectionName": "breed_children",
  "childTables": [
    {
      "tableName": "breed_division",
      "fields": [
        { "name": "id", "type": "string", "required": true },
        { "name": "breed_id", "type": "string", "required": true },
        { "name": "division_id", "type": "string", "required": true },
        { "name": "division_name", "type": "string", "required": true },
        { "name": "created_at", "type": "date", "required": true }
      ]
    },
    {
      "tableName": "breed_in_kennel",
      "fields": [
        { "name": "id", "type": "string", "required": true },
        { "name": "breed_id", "type": "string", "required": true },
        { "name": "kennel_id", "type": "string", "required": true },
        { "name": "kennel_name", "type": "string", "required": true },
        { "name": "pet_count", "type": "number" },
        { "name": "created_at", "type": "date", "required": true }
      ]
    }
  ],
  "metadata": {
    "generatedAt": "2025-01-20T10:00:00.000Z",
    "totalChildTables": 2
  }
}
```

### 2. Page Config (UI-Level)

**Location**: In breed page config blocks

Specifies which child tables to load and quantity limits:

```json
{
  "blockType": "tabs",
  "blockId": "breed-tabs-1",
  "config": {
    "tabs": [
      {
        "label": "Divisions",
        "component": "DivisionsTabOutlet",
        "childTable": "breed_division",
        "dataConfig": {
          "limit": 50,
          "orderBy": "division_name",
          "preload": true
        }
      },
      {
        "label": "Kennels",
        "component": "KennelsTabOutlet",
        "childTable": "breed_in_kennel",
        "dataConfig": {
          "limit": 20,
          "orderBy": "pet_count DESC",
          "preload": false
        }
      }
    ]
  }
}
```

## Implementation Phases

### Phase 0: Preparation (Setup)

**Goal**: Create extension config structure and generation tooling

#### Tasks:

1. **Create extension config directory structure**
   ```
   apps/config-admin/src/data/entities/extensions/
   ├── breed_children.json
   ├── pet_children.json
   └── kennel_children.json
   ```

2. **Create extension config generator script**
   - `scripts/generate-child-table-configs.cjs`
   - Reads child table schemas from database
   - Generates extension configs for each main entity
   - Similar to `generate-entity-configs.cjs` but for child tables

3. **Add extension config to config regeneration workflow**
   - Update RegenerateButton.tsx instructions
   - Add to 4-step config regeneration process

#### Success Criteria:
- Extension configs auto-generated from database
- Config regeneration includes child table schemas
- All child table fields properly typed

---

### Phase 1: Schema Generation (Foundation)

**Goal**: Generate RxDB union schemas from extension configs

#### Tasks:

1. **Create ChildCollectionSchemaGenerator utility**
   - Location: `apps/rxdb-store/src/generators/ChildCollectionSchemaGenerator.ts`
   - Reads extension config (e.g., breed_children.json)
   - Generates union RxDB schema with all fields
   - Adds meta fields: `_table_type`, `_parent_id`

2. **Update RxDB schema structure**
   - Add indexes on `_parent_id` and `_table_type`
   - Ensure proper field typing (nullable vs required)
   - Add compound index: `['_parent_id', '_table_type']`

3. **Extend SchemaManager**
   - Add `getChildCollectionSchema(entityType)` method
   - Cache generated schemas
   - Handle schema updates on config changes

#### Code Example:

```typescript
// apps/rxdb-store/src/generators/ChildCollectionSchemaGenerator.ts
export class ChildCollectionSchemaGenerator {
  static generate(extensionConfig: ExtensionConfig): RxJsonSchema {
    const allFields = this.mergeAllFields(extensionConfig.childTables);

    return {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string', maxLength: 100 },
        _table_type: { type: 'string' },
        _parent_id: { type: 'string' },
        ...allFields
      },
      required: ['id', '_table_type', '_parent_id'],
      indexes: ['_parent_id', '_table_type', ['_parent_id', '_table_type']]
    };
  }

  private static mergeAllFields(childTables: ChildTableConfig[]): Record<string, any> {
    const merged: Record<string, any> = {};

    for (const table of childTables) {
      for (const field of table.fields) {
        if (!['id', 'breed_id', 'pet_id', 'kennel_id'].includes(field.name)) {
          merged[field.name] = this.toRxDBType(field);
        }
      }
    }

    return merged;
  }
}
```

#### Success Criteria:
- Union schema generated from extension config
- All child table fields included
- Meta fields properly indexed
- Schema validation passes

---

### Phase 2: Collection Management (Infrastructure)

**Goal**: Lazy collection creation on-demand

#### Tasks:

1. **Extend SpaceStore with child collection support**
   - Add `ensureChildCollection(entityType)` method
   - Lazy creation: only create when first accessed
   - Track created collections to avoid duplicate creation

2. **Add collection lifecycle management**
   - Create collection when first child data requested
   - Keep collection in memory during session
   - Handle schema updates/migrations

3. **Update SpaceInitializer**
   - Do NOT create child collections on init
   - Only create main entity collections (breed, pet, kennel)
   - Child collections created on-demand

#### Code Example:

```typescript
// apps/rxdb-store/src/store/SpaceStore.ts
export class SpaceStore {
  private childCollections = new Map<string, RxCollection>();

  async ensureChildCollection(entityType: string): Promise<RxCollection> {
    const collectionName = `${entityType}_children`;

    // Check if already created
    if (this.childCollections.has(collectionName)) {
      return this.childCollections.get(collectionName)!;
    }

    // Check if RxDB collection exists
    const existingCollection = this.database.collections[collectionName];
    if (existingCollection) {
      this.childCollections.set(collectionName, existingCollection);
      return existingCollection;
    }

    // Create new collection
    const schema = SchemaManager.getChildCollectionSchema(entityType);
    const collection = await this.database.addCollections({
      [collectionName]: { schema }
    });

    this.childCollections.set(collectionName, collection[collectionName]);
    return collection[collectionName];
  }
}
```

#### Success Criteria:
- Child collections created only when needed
- No duplicate collection creation
- Collections persist during session
- Main collections unaffected

---

### Phase 3: Data Loading (API Layer)

**Goal**: Load child data for specific entity with limits

#### Tasks:

1. **Add child data loading methods to SpaceStore**
   - `loadChildRecords(parentId, tableType, options)` - Load from Supabase
   - `getChildRecords(parentId, tableType, options)` - Query from RxDB
   - `syncChildRecords(parentId, tableType, options)` - Sync with server

2. **Implement PostgREST query builder for child tables**
   - Build queries with parent_id filter
   - Apply limit, orderBy from page config
   - Handle pagination if needed

3. **Add data transformation layer**
   - Transform child table row to union schema format
   - Add `_table_type` and `_parent_id` fields
   - Validate data before inserting to RxDB

#### Code Example:

```typescript
// apps/rxdb-store/src/store/SpaceStore.ts
export class SpaceStore {
  async loadChildRecords(
    parentId: string,
    tableType: string,
    options: { limit?: number; orderBy?: string } = {}
  ): Promise<void> {
    const entityType = this.getEntityTypeFromTableType(tableType);
    const collection = await this.ensureChildCollection(entityType);

    // Build PostgREST query
    const query = this.supabase
      .from(tableType)
      .select('*')
      .eq(`${entityType}_id`, parentId)
      .limit(options.limit || 50);

    if (options.orderBy) {
      const [field, direction] = options.orderBy.split(' ');
      query.order(field, { ascending: direction !== 'DESC' });
    }

    const { data, error } = await query;
    if (error) throw error;

    // Transform and insert
    const records = data.map(row => ({
      ...row,
      _table_type: tableType,
      _parent_id: parentId
    }));

    await collection.bulkInsert(records);
  }

  async getChildRecords(
    parentId: string,
    tableType: string,
    options: { limit?: number; orderBy?: string } = {}
  ): Promise<any[]> {
    const entityType = this.getEntityTypeFromTableType(tableType);
    const collection = await this.ensureChildCollection(entityType);

    let query = collection.find({
      selector: {
        _parent_id: parentId,
        _table_type: tableType
      },
      limit: options.limit || 50
    });

    if (options.orderBy) {
      const [field, direction] = options.orderBy.split(' ');
      query = query.sort({ [field]: direction === 'DESC' ? 'desc' : 'asc' });
    }

    const results = await query.exec();
    return results.map(doc => doc.toJSON());
  }
}
```

#### Success Criteria:
- Child data loads only for selected entity
- Limit and orderBy from config applied
- Data properly transformed with meta fields
- Queries perform efficiently with indexes

---

### Phase 4: UI Integration (Components)

**Goal**: Connect child data loading to UI components

**Note**: This phase will also define tab configuration strategy for both child tables and main entity filtering.

#### Tasks:

1. **Create useChildRecords React hook**
   - Location: `apps/app/src/hooks/useChildRecords.ts`
   - Takes parentId, tableType, dataConfig from page config
   - Loads data on mount or when tab selected
   - Subscribes to RxDB changes

2. **Define tab configuration strategy** (OPEN QUESTION)
   - How to distinguish child tables vs main entities in config?
   - Should we use `sourceType: 'child_table' | 'main_entity'`?
   - Or auto-detect based on table name?
   - What config structure for filters on main entities?

3. **Update TabOutlet components**
   - Read childTable config from block config
   - Use useChildRecords hook to load data
   - Pass records to child component (e.g., DivisionsList)

4. **Add loading states**
   - Show skeleton while loading
   - Handle errors gracefully
   - Show empty state if no records

#### Code Example:

```typescript
// apps/app/src/hooks/useChildRecords.ts
export function useChildRecords(
  parentId: string | undefined,
  tableType: string,
  dataConfig: { limit?: number; orderBy?: string; preload?: boolean }
) {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!parentId || !tableType) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Check if data already in RxDB
        const existingRecords = await spaceStore.getChildRecords(
          parentId,
          tableType,
          dataConfig
        );

        if (existingRecords.length === 0) {
          // Load from Supabase if not cached
          await spaceStore.loadChildRecords(parentId, tableType, dataConfig);
        }

        // Subscribe to RxDB changes
        const subscription = await spaceStore.subscribeToChildRecords(
          parentId,
          tableType,
          (updatedRecords) => setRecords(updatedRecords)
        );

        return () => subscription.unsubscribe();
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    if (dataConfig.preload) {
      loadData();
    }
  }, [parentId, tableType, dataConfig]);

  return { records, isLoading, error };
}

// apps/app/src/components/template/DivisionsTabOutlet.tsx
export function DivisionsTabOutlet({ entity, blockConfig }: OutletProps) {
  const childTable = blockConfig?.config?.childTable || 'breed_division';
  const dataConfig = blockConfig?.config?.dataConfig || { limit: 50 };

  const { records, isLoading, error } = useChildRecords(
    entity?.id,
    childTable,
    dataConfig
  );

  if (isLoading) return <DivisionsSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (records.length === 0) return <EmptyState />;

  return <DivisionsList divisions={records} />;
}
```

#### Success Criteria:
- Child records load when tab selected
- Loading states work properly
- RxDB subscriptions update UI automatically
- No unnecessary re-renders

---

### Phase 5: Testing (Validation)

**Goal**: Validate implementation with real child tables

#### Tasks:

1. **Test with breed_division table**
   - Configure in page config
   - Load for specific breed
   - Verify limit and orderBy work
   - Test RxDB queries and indexes

2. **Test with breed_in_kennel table**
   - Test different limit values
   - Verify ordering by pet_count
   - Test preload vs lazy loading

3. **Performance testing**
   - Measure collection creation time
   - Measure query performance with indexes
   - Test with large datasets (1000+ records)
   - Monitor memory usage

4. **Error handling**
   - Test with missing extension config
   - Test with invalid data
   - Test network errors during loading

#### Success Criteria:
- Both test tables work correctly
- Performance acceptable (<100ms queries)
- No memory leaks
- Errors handled gracefully

---

### Phase 6: Rollout (Incremental)

**Goal**: Add more child tables gradually

#### Rollout Order:

1. **Wave 1**: Simple child tables (no complex relationships)
   - breed_division
   - breed_in_kennel

2. **Wave 2**: Child tables with relationships
   - litter (has dam_id, sire_id references)
   - pet_profile_in_competition

3. **Wave 3**: Complex child tables
   - breed_standard_section (nested structure)
   - breeding_program_registration

#### Per-Wave Tasks:

1. Add table schema to extension config
2. Regenerate config
3. Create outlet component
4. Add to page config
5. Test thoroughly
6. Deploy

#### Success Criteria:
- Each wave completes without breaking previous tables
- Performance remains acceptable
- No schema conflicts

---

### Phase 7: Optimization (Polish)

**Goal**: Fine-tune performance and UX

#### Tasks:

1. **Smart preloading**
   - Preload first tab on page load
   - Lazy load other tabs on selection
   - Cache loaded data between tab switches

2. **Batch loading**
   - Load multiple child tables in single request if needed
   - Use PostgREST batch queries

3. **Pagination support**
   - Add pagination if limit > 50 records
   - Implement infinite scroll or load more button

4. **Offline support**
   - Keep loaded child data in RxDB
   - Sync when coming back online
   - Show stale data indicator

#### Success Criteria:
- Page loads feel instant
- Tab switches smooth
- Data stays fresh
- Works offline

---

## Key Decision Points

### 1. When to Create Collections?

**Answer**: After main collection created, but only when first accessed

- **Main collections** (breed, pet, kennel): Created on SpaceInitializer.init()
- **Child collections** (breed_children, pet_children): Created on first call to ensureChildCollection()

### 2. When to Load Data?

**Answer**: Only when UI needs it, with limits from config

- **Preload tabs**: Load on page mount (preload: true in config)
- **Lazy tabs**: Load on tab selection (preload: false)
- **Limits**: Always apply limit from page config (default 50)

### 3. Where Does Schema Come From?

**Answer**: Space extension config → ChildCollectionSchemaGenerator → RxDB schema

- **Source**: Extension config (breed_children.json)
- **Generator**: ChildCollectionSchemaGenerator.generate()
- **Output**: Union RxDB schema with all fields + meta fields

### 4. Where Does Data Quantity Come From?

**Answer**: Page config block dataConfig

```json
{
  "dataConfig": {
    "limit": 50,
    "orderBy": "name ASC",
    "preload": true
  }
}
```

---

## Migration Strategy

### From Current State to Phase 1

1. Create extension config structure
2. Generate first extension config (breed_children.json)
3. Implement ChildCollectionSchemaGenerator
4. Test schema generation

**No breaking changes** - main collections unchanged

### From Phase 1 to Phase 2

1. Add ensureChildCollection() to SpaceStore
2. Update SpaceInitializer to skip child collections
3. Test lazy creation

**No breaking changes** - main collections still work

### From Phase 2 to Phase 3

1. Add loadChildRecords() and getChildRecords() to SpaceStore
2. Test data loading independently
3. Verify transformations work

**No breaking changes** - no UI changes yet

### From Phase 3 to Phase 4

1. Create useChildRecords hook
2. Create first outlet component (DivisionsTabOutlet)
3. Add to page config
4. Test in dev

**First visible change** - tabs start showing child data

---

## Risk Mitigation

### Risk 1: Schema Conflicts

**Risk**: Different child tables have same field name with different types

**Mitigation**:
- Prefix fields with table name if conflict detected
- Document conflicts in extension config
- Use TypeScript unions for ambiguous fields

### Risk 2: Performance Degradation

**Risk**: Loading too many records slows down UI

**Mitigation**:
- Enforce strict limits in page config (max 100)
- Add pagination for large datasets
- Monitor query performance in production
- Use RxDB indexes effectively

### Risk 3: Memory Issues

**Risk**: Too many child collections consume memory

**Mitigation**:
- Limit total child collections to 25-35
- Clear unused collections after timeout
- Monitor memory usage in browser DevTools
- Use RxDB memory mode for temporary data

### Risk 4: Config Complexity

**Risk**: Extension configs become too complex to maintain

**Mitigation**:
- Keep extension configs auto-generated
- Document config structure clearly
- Add validation in config-admin
- Use TypeScript types for config

---

## Success Metrics

### Phase Completion Metrics

- **Phase 1**: Schema generation works for 2+ child tables
- **Phase 2**: Collections created on-demand without errors
- **Phase 3**: Data loads correctly with limits
- **Phase 4**: UI shows child data in tabs
- **Phase 5**: Tests pass for 2+ child tables
- **Phase 6**: 10+ child tables rolled out
- **Phase 7**: Performance optimizations complete

### Performance Metrics

- Collection creation: < 100ms
- Data loading (50 records): < 500ms
- Query performance: < 100ms
- Memory usage: < 50MB per child collection
- Tab switch time: < 200ms

### Quality Metrics

- Zero schema conflicts
- 100% test coverage for child store methods
- Zero memory leaks
- Graceful error handling

---

## Timeline Estimate

- **Phase 0**: 1 day (config structure)
- **Phase 1**: 2 days (schema generation)
- **Phase 2**: 1 day (collection management)
- **Phase 3**: 2 days (data loading)
- **Phase 4**: 2 days (UI integration)
- **Phase 5**: 2 days (testing)
- **Phase 6**: Ongoing (1 day per wave)
- **Phase 7**: 2 days (optimization)

**Total initial implementation**: ~12 days

**Per child table rollout**: ~0.5 days after Phase 6

---

## Open Questions

### Data Architecture Questions

1. Should we support nested child tables (e.g., breed_division → division_pets)?
2. Do we need real-time sync for child data or periodic refresh is enough?
3. Should child data expire after timeout or persist indefinitely?
4. Do we need separate permissions for child tables?

### Tab Configuration Questions (to be answered in Phase 4)

5. **How to distinguish child tables vs main entities in tab config?**
   - Option A: Explicit `sourceType: 'child_table' | 'main_entity'`
   - Option B: Auto-detect based on table name lookup
   - Option C: Different config properties (`childTable` vs `entity`)

6. **Filter configuration for main entities in tabs?**
   - How to specify filters like `breed_id = {{entity.id}}`?
   - Support for complex filters (OR, IN, nested)?
   - Template syntax for dynamic values?

7. **Preload strategy for main entity tabs?**
   - Should "Top Kennels" preload on page mount?
   - Or lazy load when tab selected?
   - How many records to show (20? 50?)?

8. **Sorting and pagination for main entity tabs?**
   - Always sort by rating DESC for "Top X"?
   - Support custom sorting from config?
   - Pagination or fixed limit?

---

## Next Steps

1. Review this plan with team
2. Create Phase 0 tasks in todo list
3. Start with extension config generation script
4. Proceed through phases incrementally
5. Document learnings and adjust plan as needed
