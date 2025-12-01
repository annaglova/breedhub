# Child Tables Architecture

**Reference Document** - архітектурні рішення для child tables в BreedHub

---

## Overview

Child tables (e.g., breed_division, breed_in_kennel) - це записи, що належать до parent entity. Вони завантажуються on-demand з лімітами, визначеними в page config.

**Два типи даних в табах:**
1. **Child tables** (breed_division, breed_in_kennel) - записи, що належать parent entity
2. **Main entities with filter** (Top Kennels, Top Pets) - main entity records з фільтром по parent

---

## Storage Strategy: Variant C - Per-Entity Child Collections

### Чому цей варіант?

**Browser IndexedDB Limits:**
- Chrome: ~100 ObjectStores per database
- Firefox: ~100 ObjectStores
- Safari: ~50-80 ObjectStores

**Наша ситуація:**
- Main entities: 10-15 collections
- Child tables: 120+ типів
- Якщо 1 collection per child table = 130-150 ObjectStores = ❌ Browser crash!

### Обране рішення

```
db.breed                    // Main entity
db.breed_children           // ВСІ child tables для breed

db.pet                      // Main entity
db.pet_children             // ВСІ child tables для pet

db.kennel                   // Main entity
db.kennel_children          // ВСІ child tables для kennel
```

**Total ObjectStores: 25-35** ✅ (в межах browser limits)

---

## Union Schema Structure

Child collections використовують union schema - всі поля з усіх child tables в одній схемі:

```typescript
{
  // Meta fields for identification
  id: string,
  _table_type: 'breed_division' | 'breed_in_kennel' | 'achievement_in_breed' | ...,
  _parent_id: string,  // Reference to parent breed/pet/kennel

  // Union of all child table fields
  // breed_division fields
  division_id?: string,
  division_name?: string,

  // breed_in_kennel fields
  kennel_id?: string,
  kennel_name?: string,
  pet_count?: number,

  // achievement_in_breed fields
  achievement_id?: string,
  progress?: number,

  // System fields
  created_at: string,
  updated_at: string,
  _deleted: boolean
}
```

### Indexes

```typescript
indexes: [
  '_table_type',
  '_parent_id',
  ['_table_type', '_parent_id'],  // Compound index - критично!
  'name',
  'created_at',
  'updated_at'
]
```

---

## Store Architecture

### SpaceStore handles both main and child entities

**Чому не окремий ChildStore?**

```
SpaceStore → викликає → ChildStore
     ↑                      ↓
     └──────── викликає ────┘  = Circular Dependency!
```

**Рішення:** Child Records = Regular Entities з meta fields → все в SpaceStore

| Операція | Main Entity | Child Entity |
|----------|-------------|--------------|
| **Query** | `find({ pet_type_id: 'cat' })` | `find({ _table_type: 'X', _parent_id: 'Y' })` |
| **Pagination** | ID-First ✅ | ID-First ✅ |
| **Sorting** | Native RxDB ✅ | Native RxDB ✅ |
| **Filtering** | `applyFilters()` ✅ | `applyFilters()` ✅ |
| **Lazy loading** | On-demand ✅ | On-demand ✅ |

### SpaceStore API for Child Records

```typescript
class SpaceStore {
  // Ensure child collection exists (lazy creation)
  async ensureChildCollection(entityType: string): Promise<RxCollection>

  // Load child records from Supabase
  async loadChildRecords(
    parentId: string,
    tableType: string,
    options: { limit?: number; orderBy?: string }
  ): Promise<void>

  // Query child records from RxDB
  async getChildRecords(
    parentId: string,
    tableType: string,
    options: { limit?: number; orderBy?: string }
  ): Promise<any[]>

  // Subscribe to child record changes
  async subscribeToChildRecords(
    parentId: string,
    tableType: string,
    callback: (records: any[]) => void
  ): Promise<Subscription>
}
```

---

## Configuration Structure

### 1. Extension Config (Space-Level)

**Location**: `apps/config-admin/src/data/extensions/breed_children.json`

Defines available child table schemas:

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
        { "name": "division_name", "type": "string", "required": true }
      ]
    },
    {
      "tableName": "achievement_in_breed",
      "fields": [
        { "name": "id", "type": "string", "required": true },
        { "name": "breed_id", "type": "string", "required": true },
        { "name": "achievement_id", "type": "string", "required": true },
        { "name": "progress", "type": "number" }
      ]
    }
  ]
}
```

### 2. Page Config (UI-Level)

**Location**: In page config blocks (tabs)

Specifies which child tables to load and limits:

```json
{
  "tabs": {
    "config_tab_achievements": {
      "slug": "achievements",
      "label": "Achievements",
      "component": "BreedAchievementsTab",
      "childTable": "achievement_in_breed",
      "dataConfig": {
        "limit": 20,
        "orderBy": "progress DESC",
        "preload": false
      }
    }
  }
}
```

---

## Key Decision Points

### 1. When to Create Collections?

- **Main collections** (breed, pet, kennel): Created on SpaceInitializer.init()
- **Child collections** (breed_children): Created on first call to ensureChildCollection()

### 2. When to Load Data?

- **Preload tabs** (preload: true): Load on page mount
- **Lazy tabs** (preload: false): Load on tab selection
- **Limits**: Always apply limit from page config (default 50)

### 3. Schema Source

```
Extension config (breed_children.json)
        ↓
ChildCollectionSchemaGenerator.generate()
        ↓
Union RxDB schema with all fields + meta fields
```

---

## Risk Mitigation

### Risk 1: Schema Conflicts
Different child tables have same field name with different types

**Mitigation:**
- Prefix fields with table name if conflict detected
- Use TypeScript unions for ambiguous fields

### Risk 2: Performance Degradation
Loading too many records slows down UI

**Mitigation:**
- Enforce strict limits in page config (max 100)
- Add pagination for large datasets
- Use RxDB indexes effectively

### Risk 3: Memory Issues
Too many child collections consume memory

**Mitigation:**
- Limit total child collections to 25-35
- Clear unused collections after timeout
- Monitor memory usage

---

## Performance Metrics

| Metric | Target |
|--------|--------|
| Collection creation | < 100ms |
| Data loading (50 records) | < 500ms |
| Query performance | < 100ms |
| Memory per child collection | < 50MB |
| Tab switch time | < 200ms |

---

## Files

**Schema:**
- `/packages/rxdb-store/src/collections/breed-children.schema.ts`

**Config:**
- `/apps/config-admin/src/data/extensions/breed_children.json`

---

## Related Documents

- [SPACE_STORE_ARCHITECTURE.md](./SPACE_STORE_ARCHITECTURE.md) - Store architecture
- [CHILD_TABLES_TODO.md](./CHILD_TABLES_TODO.md) - Implementation checklist
